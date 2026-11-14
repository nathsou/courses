/**
 * Checking an `hdl` exercise: the reader's Weft is compiled by synth, run against hidden tests (the course's
 * test language, `$lib/weft/testbench.ts`), and compared with a reference design on synth's simulator. Pure
 * TypeScript over a `Synth` (no Svelte): `Hdl.svelte` runs it in synth's worker, the tests in Node.
 *
 * The equivalence check is exhaustive when the module's data inputs are few enough (`exhaustiveBits`, 16 by
 * default). A module with a clock is checked from power-up on every input sequence of a bounded length (when
 * that is few enough sequences), then on seeded random sequences; a combinational module wider than the bound
 * gets seeded random vectors. A mismatch is reported as a table of inputs, expected outputs and what the
 * reader's module gave: for a sequential module, the cycles that led up to the mismatch.
 */
import type { Diagnostic, SourceFile, Synth, TbOp, TbPort, TbStarted } from '$lib/synth/api';
import { analyze, tbRun, tbStart, tbStop, toBigInt } from '$lib/synth/api';
import { runTestSource } from '$lib/weft/testbench';
import { rng } from '../types';

export interface HdlInput {
  id: string;
  title?: string;
  prompt?: string;
  hints?: string[];
  explain?: string;
  /** The module the reader writes (and the hidden tests and the reference use). */
  top: string;
  /** What the editor starts with. Its `top` module gives the ports when there is no reference. */
  start: string;
  /** A hidden reference design: Weft source with a module named `top`. */
  reference?: string;
  /** Hidden tests, in the course's test language. */
  tests?: string;
  solution?: string;
  /** Equivalence options. `false` turns the comparison with the reference off (the tests alone decide). */
  equivalence?: false | EquivalenceOptions;
  /** Editor height, in lines (not `lines`: the compiler renders a field of that name as Markdown). */
  height?: number;
}

export interface EquivalenceOptions {
  /** Exhaustive up to this many data input bits (default 16). */
  exhaustiveBits?: number;
  /** Random vectors beyond that (default 4096); for a sequential module, random runs (default 64). */
  random?: number;
  /** Cycles of a random run (default 48). */
  cycles?: number;
  /** Exhaustive input sequences of up to this many cycles, when there are at most 2^13 of them (default 8). */
  depth?: number;
  seed?: number;
}

export interface Port {
  name: string;
  width: number;
  signed?: boolean;
}

export interface HiddenTestResult {
  name: string;
  passed: boolean;
  /** What failed, in a sentence (empty when it passed). */
  message: string;
}

/** One row of a counterexample table: values as text, by port name. */
export interface CounterRow {
  cycle?: number;
  phase?: 'before' | 'after';
  inputs: Record<string, string>;
  expected: Record<string, string>;
  got: Record<string, string>;
  differ: string[];
}

export interface Equivalence {
  pass: boolean;
  kind: 'exhaustive' | 'random' | 'sequences';
  vectors: number;
  inputs: Port[];
  outputs: Port[];
  rows: CounterRow[];
  mismatches: number;
  sequential: boolean;
}

export interface HdlOutcome {
  pass: boolean;
  /** Errors and warnings of the reader's source (synth's). */
  diagnostics: Diagnostic[];
  /** A plain reason why nothing was run ("there is no module named X", "the ports changed"). */
  problems: string[];
  tests: HiddenTestResult[];
  equivalence?: Equivalence;
  source: string;
}

/** `0b0101` for up to 8 bits, `0x…` for wider values. */
export function show(v: bigint, width: number): string {
  if (width === 1) return v.toString();
  if (width <= 8) return `0b${v.toString(2).padStart(width, '0')}`;
  return `0x${v.toString(16).toUpperCase().padStart(Math.ceil(width / 4), '0')}`;
}

const mapRow = (names: Port[], values: bigint[]): Record<string, string> => Object.fromEntries(names.map((p, i) => [p.name, show(values[i]!, p.width)]));

interface Built {
  id: number;
  inputs: Port[];
  outputs: Port[];
  clock: string | undefined;
}

const typeText = (p: TbPort | Port) => (p.width === 1 ? 'bool' : `${p.signed ? 'sint' : 'uint'}<${p.width}>`);

async function build(synth: Synth, files: SourceFile[], top: string): Promise<{ built?: Built; problem?: string; started?: TbStarted }> {
  const s = await tbStart(synth, { files, top });
  if (!s.ok) {
    const d = s.diagnostics?.find((x) => x.severity === 'error');
    if (d && /no module|top module/i.test(d.message)) return { problem: `There is no module named \`${top}\`. The exercise checks a module with exactly that name.` };
    return { problem: d ? (d.at ? `line ${d.at.line}: ${d.message}` : d.message) : s.error };
  }
  const data = s.ports.filter((p) => !p.clock && !p.added);
  return {
    started: s,
    built: {
      id: s.id,
      inputs: data.filter((p) => p.dir === 'in').map((p) => ({ name: p.name, width: p.width, signed: p.signed })),
      outputs: data.filter((p) => p.dir === 'out').map((p) => ({ name: p.name, width: p.width, signed: p.signed })),
      // A clock the testbench added to a combinational module is not part of the design.
      clock: s.state || s.ports.some((p) => p.clock && !p.added) ? s.clocks[0] : undefined,
    },
  };
}

const portText = (b: Built) => [...(b.clock ? [`in ${b.clock}: clock`] : []), ...b.inputs.map((p) => `in ${p.name}: ${typeText(p)}`), ...b.outputs.map((p) => `out ${p.name}: ${typeText(p)}`)].join(', ');

/** The ports that the reader's module must have, compared with the contract's. Empty when they match. */
function portProblems(mine: Built, want: Built): string[] {
  const same = (a: Port[], b: Port[]) => a.length === b.length && a.every((p, i) => p.name === b[i]!.name && p.width === b[i]!.width);
  if (!same(mine.inputs, want.inputs) || mine.clock !== want.clock || !same(mine.outputs, want.outputs)) {
    return [`The ports must not change. The exercise expects \`(${portText(want)})\`; your module has \`(${portText(mine)})\`.`];
  }
  return [];
}

// ── Equivalence ─────────────────────────────────────────────────────────────────

const MAX_ROWS = 6;
/** Input vectors per simulator request. */
const BATCH = 512;

async function compare(synth: Synth, a: Built, b: Built, o: Required<EquivalenceOptions>): Promise<Equivalence> {
  const { inputs, outputs } = a;
  const sequential = a.clock !== undefined;
  const totalBits = inputs.reduce((s, p) => s + p.width, 0);
  const random = rng(o.seed);
  const randBig = (w: number): bigint => {
    let v = 0n;
    for (let k = 0; k < w; k += 24) v = (v << 24n) | BigInt(Math.floor(random() * 0x1000000));
    return v & ((1n << BigInt(w)) - 1n);
  };
  const names = outputs.map((p) => p.name);
  const setOp = (vec: bigint[]): TbOp => ({ set: Object.fromEntries(inputs.map((p, i) => [p.name, vec[i]!.toString()])) });
  const decodeReads = (reads: { values?: Record<string, number | string> }[]) => reads.map((r) => outputs.map((p) => toBigInt(r.values?.[p.name] ?? 0, p.width)));
  /** Runs the same operations on both designs and returns what each read. */
  const both = async (ops: TbOp[]) => {
    const [ra, rb] = await Promise.all([tbRun(synth, a.id, ops), tbRun(synth, b.id, ops)]);
    if (!ra.ok) throw new Error(ra.error);
    if (!rb.ok) throw new Error(rb.error);
    return { got: decodeReads(ra.reads), want: decodeReads(rb.reads) };
  };
  const differ = (x: bigint[], y: bigint[]) => outputs.filter((_, i) => x[i] !== y[i]).map((p) => p.name);
  const row = (vec: bigint[], want: bigint[], got: bigint[], extra: Partial<CounterRow> = {}): CounterRow => ({
    ...extra,
    inputs: mapRow(inputs, vec),
    expected: mapRow(outputs, want),
    got: mapRow(outputs, got),
    differ: differ(want, got),
  });

  if (!sequential) {
    const exhaustive = totalBits <= o.exhaustiveBits;
    const count = exhaustive ? 2 ** totalBits : o.random;
    const rows: CounterRow[] = [];
    let mismatches = 0;
    const split = (n: number): bigint[] => {
      const vec: bigint[] = [];
      let shift = 0n;
      for (let i = inputs.length - 1; i >= 0; i--) {
        vec[i] = (BigInt(n) >> shift) & ((1n << BigInt(inputs[i]!.width)) - 1n);
        shift += BigInt(inputs[i]!.width);
      }
      return vec;
    };
    for (let start = 0; start < count; start += BATCH) {
      const vecs: bigint[][] = [];
      for (let n = start; n < Math.min(count, start + BATCH); n++) vecs.push(exhaustive ? split(n) : inputs.map((p) => randBig(p.width)));
      const { got, want } = await both(vecs.flatMap((v) => [setOp(v), { read: names }]));
      vecs.forEach((v, k) => {
        if (differ(want[k]!, got[k]!).length) {
          mismatches++;
          if (rows.length < MAX_ROWS) rows.push(row(v, want[k]!, got[k]!));
        }
      });
    }
    return { pass: mismatches === 0, kind: exhaustive ? 'exhaustive' : 'random', vectors: count, inputs, outputs, rows, mismatches, sequential };
  }

  // Sequential: from power-up, the same inputs to both, outputs compared before and after every clock edge.
  let vectors = 0;
  const runSeqs = async (seqs: bigint[][][]): Promise<CounterRow[] | undefined> => {
    const ops: TbOp[] = [];
    for (const seq of seqs) {
      ops.push({ restart: true });
      for (const vec of seq) ops.push(setOp(vec), { read: names }, { step: 1 }, { read: names });
    }
    const { got, want } = await both(ops);
    let k = 0;
    for (const seq of seqs) {
      const hist: { vec: bigint[]; want: bigint[]; got: bigint[] }[] = [];
      for (let c = 0; c < seq.length; c++) {
        vectors++;
        const vec = seq[c]!;
        const wb = want[k]!, gb = got[k]!, wa = want[k + 1]!, ga = got[k + 1]!;
        k += 2;
        if (differ(wb, gb).length) {
          hist.push({ vec, want: wb, got: gb });
          return rowsOf(hist, c, 'before');
        }
        hist.push({ vec, want: wa, got: ga });
        if (differ(wa, ga).length) return rowsOf(hist, c, 'after');
      }
    }
    return undefined;
  };
  const rowsOf = (hist: { vec: bigint[]; want: bigint[]; got: bigint[] }[], cycle: number, phase: 'before' | 'after'): CounterRow[] => {
    const from = Math.max(0, cycle - (MAX_ROWS - 1));
    return hist.slice(from, cycle + 1).map((h, k) => row(h.vec, h.want, h.got, { cycle: from + k, phase: from + k === cycle ? phase : 'after' }));
  };
  const vecBits = totalBits;
  let depth = 0;
  if (vecBits === 0) depth = 1;
  else while (depth < o.depth && vecBits * (depth + 1) <= 13) depth++;
  const vecCount = 2 ** vecBits;
  const exhaustiveCases = vecBits === 0 ? 1 : depth > 0 ? vecCount ** depth : 0;
  const decode = (vec: number): bigint[] => {
    const out: bigint[] = [];
    let rest = BigInt(vec);
    for (let i = inputs.length - 1; i >= 0; i--) {
      out[i] = rest & ((1n << BigInt(inputs[i]!.width)) - 1n);
      rest >>= BigInt(inputs[i]!.width);
    }
    return out;
  };
  const fail = (rows: CounterRow[]): Equivalence => ({ pass: false, kind: 'sequences', vectors, inputs, outputs, rows, mismatches: 1, sequential });
  if (depth > 0) {
    const per = Math.max(1, Math.floor(BATCH / Math.max(1, depth)));
    for (let start = 0; start < exhaustiveCases; start += per) {
      const seqs: bigint[][][] = [];
      for (let n = start; n < Math.min(exhaustiveCases, start + per); n++) {
        const seq: bigint[][] = [];
        let rest = n;
        for (let d = 0; d < depth; d++) {
          seq.push(vecBits === 0 ? [] : decode(rest % vecCount));
          rest = Math.floor(rest / vecCount);
        }
        seqs.push(seq);
      }
      const bad = await runSeqs(seqs);
      if (bad) return fail(bad);
    }
  }
  const per = Math.max(1, Math.floor(BATCH / o.cycles));
  for (let r = 0; r < o.random; r += per) {
    const seqs: bigint[][][] = [];
    for (let q = r; q < Math.min(o.random, r + per); q++) {
      const seq: bigint[][] = [];
      let cur = inputs.map((p) => randBig(p.width));
      for (let c = 0; c < o.cycles; c++) {
        if (random() < 0.45) cur = inputs.map((p) => randBig(p.width));
        seq.push(cur);
      }
      seqs.push(seq);
    }
    const bad = await runSeqs(seqs);
    if (bad) return fail(bad);
  }
  return { pass: true, kind: 'sequences', vectors, inputs, outputs, rows: [], mismatches: 0, sequential };
}

/** Compile and check the reader's source. */
export async function checkHdl(synth: Synth, input: HdlInput, source: string): Promise<HdlOutcome> {
  const file = `${input.top}.weft`;
  const files = [{ name: file, text: source }];
  const base: HdlOutcome = { pass: false, diagnostics: [], problems: [], tests: [], source };
  const a = await analyze(synth, files, { top: input.top });
  base.diagnostics = a.diagnostics;
  if (a.diagnostics.some((d) => d.severity === 'error')) return base;
  const mine = await build(synth, files, input.top);
  if (!mine.built) {
    if (mine.problem) base.problems.push(mine.problem);
    return base;
  }
  const contract = await build(synth, [{ name: 'reference.weft', text: input.reference ?? input.start }], input.top);
  try {
    if (contract.built) base.problems.push(...portProblems(mine.built, contract.built));
    if (base.problems.length) return base;

    if (input.tests) {
      const run = await runTestSource(synth, files, input.top, input.tests);
      if (!run.ok) base.problems.push(run.error ?? 'the tests did not run');
      base.tests = run.results.map((t) => ({
        name: t.name,
        passed: t.pass,
        message: t.pass ? '' : t.error ? t.error : t.failed ? `expected ${t.failed.text} (${Object.entries(t.failed.values).map(([k, v]) => `${k} = ${v}`).join(', ')}), at cycle ${t.failed.cycle}` : 'failed',
      }));
    }
    let eq: Equivalence | undefined;
    if (input.reference && input.equivalence !== false && contract.built) {
      const o = input.equivalence ?? {};
      eq = await compare(synth, mine.built, contract.built, {
        exhaustiveBits: o.exhaustiveBits ?? 16,
        random: o.random ?? (mine.built.clock ? 64 : 4096),
        cycles: o.cycles ?? 48,
        depth: o.depth ?? 8,
        seed: o.seed ?? 7,
      });
      base.equivalence = eq;
    }
    base.pass = base.problems.length === 0 && base.tests.every((t) => t.passed) && (eq ? eq.pass : true);
    return base;
  } finally {
    await tbStop(synth, mine.built.id);
    if (contract.built) await tbStop(synth, contract.built.id);
  }
}

/** The text of an outcome, for tests and for the screen reader. */
export function summary(o: HdlOutcome): string {
  if (o.pass) return 'All hidden tests pass and the design matches the reference.';
  const lines: string[] = [];
  for (const d of o.diagnostics.filter((x) => x.severity === 'error')) lines.push(`error: ${d.message}`);
  lines.push(...o.problems);
  for (const t of o.tests.filter((x) => !x.passed)) lines.push(`test "${t.name}": ${t.message}`);
  if (o.equivalence && !o.equivalence.pass) lines.push('The design differs from the reference.');
  return lines.join('\n');
}
