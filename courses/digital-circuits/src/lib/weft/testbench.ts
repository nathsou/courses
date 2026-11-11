/**
 * Tests for Weft designs. Weft has no testbench constructs (synth: docs/WEFT.md §19), so the course gives its
 * designs tests in a small language of its own, run on synth's simulator through testbench sessions
 * (`tb_start` / `tb_run`, synth: crates/synth-playground/src/tb.rs):
 *
 * ```
 * test "counts to nine and wraps" {
 *     set enable = true;
 *     for i in 0..9 {
 *         expect digit == i && !carry;
 *         step;
 *     }
 *     step 3;
 *     expect digit == 2;
 * }
 *
 * test "a shorter period" <PERIOD: 3> { … }     // generic arguments of the top module
 * ```
 *
 * - `set a = e, b = e;` drives inputs (the logic settles at once). `step;` and `step n;` run clock cycles.
 *   `expect e;` checks a condition on the design's signals: its ports, and its registers and wires by name
 *   (`value`, `uart.state`).
 * - `for i in a..b { … }` (or `a..=b`) repeats statements with `i` bound to each value.
 * - Expressions: integers (`42`, `0x2A`, `0b101`, `-3`), `true`, `false`, names, `( )`, and the operators
 *   `! ~ - * + - << >> & ^ | == != < <= > >= && ||` with Weft's precedence. Values are exact integers
 *   (signed ports read as negative numbers), `bool` signals are 0 or 1, and a condition is true when not 0.
 *
 * Each test starts from power-up. Nothing in a test depends on the design's values except whether its
 * `expect`s hold, so a test unrolls into one list of simulator operations, run in one request.
 */
import type { SourceFile, Synth, TbOp, TbPort, TbRead, TbValue } from '../synth/api';
import { tbRun, tbStart, tbStop, toBigInt } from '../synth/api';

// ── Syntax ───────────────────────────────────────────────────────────────────────────────────────────────

export type Expr =
  | { k: 'num'; v: bigint }
  | { k: 'name'; name: string; at: number }
  | { k: 'un'; op: string; e: Expr }
  | { k: 'bin'; op: string; a: Expr; b: Expr };

export type Stmt =
  | { k: 'set'; sets: { name: string; e: Expr }[]; line: number }
  | { k: 'step'; n: Expr; line: number }
  | { k: 'expect'; e: Expr; text: string; line: number }
  | { k: 'for'; v: string; from: Expr; to: Expr; inclusive: boolean; body: Stmt[]; line: number };

export interface TestCase {
  name: string;
  params: Record<string, string>;
  body: Stmt[];
  line: number;
}

export class TestSyntaxError extends Error {
  constructor(
    message: string,
    readonly line: number,
  ) {
    super(`line ${line}: ${message}`);
  }
}

type Tok = { t: string; v: string; at: number; line: number };

function lex(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  let line = 1;
  while (i < src.length) {
    const c = src.charAt(i);
    if (c === '\n') {
      line++;
      i++;
      continue;
    }
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (src.startsWith('//', i) || c === '#') {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }
    if (c === '"') {
      let j = i + 1;
      while (j < src.length && src[j] !== '"' && src[j] !== '\n') j++;
      if (src[j] !== '"') throw new TestSyntaxError('unterminated string', line);
      out.push({ t: 'str', v: src.slice(i + 1, j), at: i, line });
      i = j + 1;
      continue;
    }
    const num = /^(0x[0-9a-fA-F_]+|0b[01_]+|0o[0-7_]+|[0-9][0-9_]*)/.exec(src.slice(i));
    if (num) {
      out.push({ t: 'num', v: num[1]!, at: i, line });
      i += num[1]!.length;
      continue;
    }
    const id = /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*|\[[0-9]+\])*/.exec(src.slice(i));
    if (id) {
      out.push({ t: 'id', v: id[0], at: i, line });
      i += id[0].length;
      continue;
    }
    const op = ['..=', '&&', '||', '==', '!=', '<=', '>=', '<<', '>>', '..'].find((o) => src.startsWith(o, i)) ?? c;
    if (!'..=&&||==!=<=>=<<>>(){};,<>:=!~-+*&|^'.includes(op)) throw new TestSyntaxError(`unexpected \`${op}\``, line);
    out.push({ t: 'op', v: op, at: i, line });
    i += op.length;
  }
  out.push({ t: 'eof', v: '', at: src.length, line });
  return out;
}

const PREC: Record<string, number> = { '*': 7, '+': 6, '-': 6, '<<': 5, '>>': 5, '&': 4, '^': 3, '|': 2, '==': 1, '!=': 1, '<': 1, '<=': 1, '>': 1, '>=': 1, '&&': 0, '||': -1 };

/** Parses a test file. */
export function parseTests(src: string): TestCase[] {
  const toks = lex(src);
  let p = 0;
  const end = toks[toks.length - 1]!;
  const peek = (): Tok => toks[p] ?? end;
  const next = (): Tok => toks[p++] ?? end;
  const isOp = (v: string) => peek().t === 'op' && peek().v === v;
  const isId = (v: string) => peek().t === 'id' && peek().v === v;
  const expect = (v: string) => {
    const t = next();
    if ((t.t !== 'op' && t.t !== 'id') || t.v !== v) throw new TestSyntaxError(`expected \`${v}\`, found \`${t.v || 'the end'}\``, t.line);
    return t;
  };

  const primary = (): Expr => {
    const t = next();
    if (t.t === 'num') return { k: 'num', v: BigInt(t.v.replace(/_/g, '')) };
    if (t.t === 'id') {
      if (t.v === 'true') return { k: 'num', v: 1n };
      if (t.v === 'false') return { k: 'num', v: 0n };
      return { k: 'name', name: t.v, at: t.at };
    }
    if (t.t === 'op' && t.v === '(') {
      const e = expr(-1);
      expect(')');
      return e;
    }
    if (t.t === 'op' && (t.v === '!' || t.v === '~' || t.v === '-')) return { k: 'un', op: t.v, e: primary() };
    throw new TestSyntaxError(`expected a value, found \`${t.v || 'the end'}\``, t.line);
  };
  const expr = (min: number): Expr => {
    let a = primary();
    for (;;) {
      const t = peek();
      const prec = t.t === 'op' ? PREC[t.v] : undefined;
      if (prec === undefined || prec < min) return a;
      next();
      const b = expr(prec + 1);
      if (prec === 1 && t.t === 'op' && PREC[peek().v] === 1 && peek().t === 'op') throw new TestSyntaxError('comparisons do not chain', t.line);
      a = { k: 'bin', op: t.v, a, b };
    }
  };

  const block = (): Stmt[] => {
    expect('{');
    const body: Stmt[] = [];
    while (!isOp('}')) {
      if (peek().t === 'eof') throw new TestSyntaxError('missing `}`', peek().line);
      body.push(stmt());
    }
    next();
    return body;
  };

  const stmt = (): Stmt => {
    const t = next();
    if (t.t !== 'id') throw new TestSyntaxError(`expected \`set\`, \`step\`, \`expect\` or \`for\`, found \`${t.v}\``, t.line);
    if (t.v === 'set') {
      const sets: { name: string; e: Expr }[] = [];
      do {
        const n = next();
        if (n.t !== 'id') throw new TestSyntaxError('expected the name of an input', n.line);
        expect('=');
        sets.push({ name: n.v, e: expr(-1) });
      } while (isOp(',') && next());
      expect(';');
      return { k: 'set', sets, line: t.line };
    }
    if (t.v === 'step') {
      const n: Expr = isOp(';') ? { k: 'num', v: 1n } : expr(-1);
      expect(';');
      return { k: 'step', n, line: t.line };
    }
    if (t.v === 'expect') {
      const start = peek().at;
      const e = expr(-1);
      const end = peek().at;
      expect(';');
      return { k: 'expect', e, text: src.slice(start, end).trim(), line: t.line };
    }
    if (t.v === 'for') {
      const v = next();
      if (v.t !== 'id') throw new TestSyntaxError('expected a loop variable', v.line);
      expect('in');
      const from = expr(-1);
      const r = next();
      if (r.v !== '..' && r.v !== '..=') throw new TestSyntaxError('expected `..` or `..=`', r.line);
      const to = expr(-1);
      return { k: 'for', v: v.v, from, to, inclusive: r.v === '..=', body: block(), line: t.line };
    }
    throw new TestSyntaxError(`expected \`set\`, \`step\`, \`expect\` or \`for\`, found \`${t.v}\``, t.line);
  };

  const tests: TestCase[] = [];
  while (peek().t !== 'eof') {
    const t = next();
    if (t.t !== 'id' || t.v !== 'test') throw new TestSyntaxError(`expected \`test\`, found \`${t.v}\``, t.line);
    const name = next();
    if (name.t !== 'str') throw new TestSyntaxError('a test needs a name in quotes', name.line);
    const params: Record<string, string> = {};
    if (isOp('<')) {
      next();
      while (!isOp('>')) {
        const k = next();
        if (k.t !== 'id') throw new TestSyntaxError('expected a generic parameter', k.line);
        expect(':');
        const neg = isOp('-') ? (next(), '-') : '';
        const v = next();
        if (v.t !== 'num' && v.t !== 'id' && v.t !== 'str') throw new TestSyntaxError('expected a value', v.line);
        params[k.v] = v.t === 'str' ? JSON.stringify(v.v) : neg + v.v.replace(/_/g, '');
        if (isOp(',')) next();
      }
      next();
    }
    if (isId('{') || isOp('{')) tests.push({ name: name.v, params, body: block(), line: t.line });
    else throw new TestSyntaxError('expected `{`', peek().line);
  }
  return tests;
}

// ── Running ──────────────────────────────────────────────────────────────────────────────────────────────

type Env = Map<string, bigint>;

/** The names of signals an expression reads (loop variables excluded). */
function signalsOf(e: Expr, env: Env, out: Set<string>): Set<string> {
  if (e.k === 'name' && !env.has(e.name)) out.add(e.name);
  else if (e.k === 'un') signalsOf(e.e, env, out);
  else if (e.k === 'bin') {
    signalsOf(e.a, env, out);
    signalsOf(e.b, env, out);
  }
  return out;
}

function evaluate(e: Expr, env: Env, values?: (name: string) => bigint): bigint {
  switch (e.k) {
    case 'num':
      return e.v;
    case 'name': {
      const v = env.get(e.name);
      if (v !== undefined) return v;
      if (!values) throw new Error(`\`${e.name}\` is not a constant here`);
      return values(e.name);
    }
    case 'un': {
      const v = evaluate(e.e, env, values);
      return e.op === '!' ? (v === 0n ? 1n : 0n) : e.op === '-' ? -v : ~v;
    }
    case 'bin': {
      if (e.op === '&&') return evaluate(e.a, env, values) !== 0n && evaluate(e.b, env, values) !== 0n ? 1n : 0n;
      if (e.op === '||') return evaluate(e.a, env, values) !== 0n || evaluate(e.b, env, values) !== 0n ? 1n : 0n;
      const a = evaluate(e.a, env, values);
      const b = evaluate(e.b, env, values);
      const t = (x: boolean) => (x ? 1n : 0n);
      switch (e.op) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '<<': return a << b;
        case '>>': return a >> b;
        case '&': return a & b;
        case '|': return a | b;
        case '^': return a ^ b;
        case '==': return t(a === b);
        case '!=': return t(a !== b);
        case '<': return t(a < b);
        case '<=': return t(a <= b);
        case '>': return t(a > b);
        case '>=': return t(a >= b);
      }
      throw new Error(`unknown operator ${e.op}`);
    }
  }
}

interface Check {
  /** Index of the read that holds the values this check needs. */
  read: number;
  e: Expr;
  env: Env;
  text: string;
  line: number;
  cycle: number;
}

/** A row of the trace: the ports after a statement. */
export interface TraceRow {
  cycle: number;
  /** What the row follows: `set a = 1`, `step`, `expect …`. */
  after: string;
  line: number;
  values: Record<string, bigint>;
}

export interface CheckResult {
  text: string;
  line: number;
  cycle: number;
  pass: boolean;
  /** The values of the signals the condition read. */
  values: Record<string, bigint>;
}

export interface TestResult {
  name: string;
  pass: boolean;
  /** Why the test could not run (unknown signal, not an input, …). */
  error?: string;
  /** The first failing check, if any. */
  failed?: CheckResult;
  checks: CheckResult[];
  trace: TraceRow[];
  ports: TbPort[];
}

export interface TestRun {
  ok: boolean;
  /** The design does not compile: synth's first error. */
  error?: string;
  results: TestResult[];
}

/** Unrolls a test into simulator operations, the checks to make on what they read, and the trace rows. */
function unroll(test: TestCase, ports: TbPort[]) {
  const ops: TbOp[] = [];
  const checks: Check[] = [];
  const rows: { read: number; after: string; line: number }[] = [];
  const portNames = ports.filter((p) => !p.clock).map((p) => p.name);
  let reads = 0;
  let cycle = 0;
  const env: Env = new Map();
  const traceRead = (after: string, line: number) => {
    ops.push({ read: portNames });
    rows.push({ read: reads++, after, line });
  };
  const walk = (body: Stmt[]) => {
    for (const s of body) {
      if (s.k === 'set') {
        const set: Record<string, TbValue> = {};
        for (const { name, e } of s.sets) set[name] = evaluate(e, env).toString();
        ops.push({ set });
        traceRead(`set ${s.sets.map((x) => `${x.name} = ${evaluate(x.e, env)}`).join(', ')}`, s.line);
      } else if (s.k === 'step') {
        const n = Number(evaluate(s.n, env));
        if (n < 0) throw new Error(`line ${s.line}: cannot step back`);
        ops.push({ step: n });
        cycle += n;
        traceRead(n === 1 ? 'step' : `step ${n}`, s.line);
      } else if (s.k === 'expect') {
        const names = [...signalsOf(s.e, env, new Set())];
        ops.push({ read: names });
        checks.push({ read: reads++, e: s.e, env: new Map(env), text: s.text, line: s.line, cycle });
      } else {
        const from = evaluate(s.from, env);
        const to = evaluate(s.to, env) + (s.inclusive ? 1n : 0n);
        if (to - from > 100_000n) throw new Error(`line ${s.line}: a loop of more than 100,000 rounds`);
        if (env.has(s.v)) throw new Error(`line ${s.line}: \`${s.v}\` is already a loop variable`);
        for (let i = from; i < to; i++) {
          env.set(s.v, i);
          walk(s.body);
        }
        env.delete(s.v);
      }
    }
  };
  walk(test.body);
  return { ops, checks, rows };
}

/** Reads a value as an exact integer, by the signal's width and signedness. */
function decode(v: TbValue, width: number, signed: boolean): bigint {
  return toBigInt(v, width, signed);
}

/** Runs tests on a design. */
export async function runTests(synth: Synth, files: SourceFile[], top: string | undefined, tests: TestCase[]): Promise<TestRun> {
  const results: TestResult[] = [];
  for (const test of tests) {
    const s = await tbStart(synth, { files, top, params: test.params, signals: true });
    if (!s.ok) {
      const d = s.diagnostics?.find((x) => x.severity === 'error');
      if (results.length === 0 && Object.keys(test.params).length === 0) {
        return { ok: false, error: d ? (d.at ? `line ${d.at.line}: ${d.message}` : d.message) : s.error, results };
      }
      results.push({ name: test.name, pass: false, error: d?.message ?? s.error, checks: [], trace: [], ports: [] });
      continue;
    }
    const widths = new Map<string, { width: number; signed: boolean }>();
    for (const sig of s.signals ?? []) widths.set(sig.name, sig);
    for (const p of s.ports) widths.set(p.name, p);
    try {
      const { ops, checks, rows } = unroll(test, s.ports);
      const r = await tbRun(synth, s.id, ops);
      const values = (read: TbRead | undefined): Record<string, bigint> => {
        const out: Record<string, bigint> = {};
        for (const [k, v] of Object.entries(read?.values ?? {})) {
          const w = widths.get(k) ?? { width: 64, signed: false };
          out[k] = decode(v, w.width, w.signed);
        }
        return out;
      };
      const checked: CheckResult[] = [];
      for (const c of checks) {
        const read = r.reads[c.read];
        if (!read) break;
        const vals = values(read);
        const pass = evaluate(c.e, c.env, (n) => vals[n] ?? 0n) !== 0n;
        checked.push({ text: c.text, line: c.line, cycle: c.cycle, pass, values: vals });
      }
      const trace: TraceRow[] = [];
      for (const row of rows) {
        const read = r.reads[row.read];
        if (read) trace.push({ cycle: read.cycle, after: row.after, line: row.line, values: values(read) });
      }
      const failed = checked.find((c) => !c.pass);
      results.push({ name: test.name, pass: r.ok && !failed, error: r.ok ? undefined : r.error, failed, checks: checked, trace, ports: s.ports });
    } catch (e) {
      results.push({ name: test.name, pass: false, error: e instanceof Error ? e.message : String(e), checks: [], trace: [], ports: s.ports });
    } finally {
      await tbStop(synth, s.id);
    }
  }
  return { ok: true, results };
}

/** Parses and runs a test file; a syntax error comes back as the run's error. */
export async function runTestSource(synth: Synth, files: SourceFile[], top: string | undefined, tests: string): Promise<TestRun> {
  let parsed: TestCase[];
  try {
    parsed = parseTests(tests);
  } catch (e) {
    return { ok: false, error: `tests: ${e instanceof Error ? e.message : String(e)}`, results: [] };
  }
  return runTests(synth, files, top, parsed);
}

/** A value for display: decimal, with hexadecimal beside wide ones. */
export function showValue(v: bigint, width?: number): string {
  if (width === 1) return v === 0n ? '0' : '1';
  if (v >= 0n && v > 9n && (width ?? 0) >= 8) return `${v} (0x${v.toString(16)})`;
  return v.toString();
}
