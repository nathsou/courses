/**
 * Fuzzing and concolic testing (chapter 32), on the course's interpreter. The target is a function of integers;
 * coverage is the set of branch outcomes (a condition and the way it went); a bug is a failed `assert`.
 *
 * - **Random**: uniformly random 16-bit inputs.
 * - **Coverage-guided**, in the style of AFL: keep a corpus of inputs that reached new coverage, and mutate them
 *   (bit flips, small additions, interesting values, and optionally constants taken from the program, a
 *   dictionary). Inputs that reach new branch outcomes join the corpus.
 * - **Concolic**, in the style of DART and SAGE: run an input concretely while also computing the symbolic
 *   condition of each branch it takes; then, for each branch, ask the solver for an input that takes the same
 *   path up to it and the other way there. Operations the solver does not model (division, remainder, shifts) use
 *   their concrete values, so the conditions that depend on them cannot be steered.
 */
import type estree from 'estree';
import { buildCfg, type Cfg, type CfgNode } from '../flow/cfg.js';
import { interpret, InterpretError } from '../flow/interpret.js';
import { and, check, FALSE, int, not, TRUE, type BoolTerm, type IntTerm } from './bitblast.js';

export type Input = Record<string, number>;
const MIN = -32768;
const MAX = 32767;

export interface Execution {
  /** Branch outcomes: `${condNode}:${successor}`. */
  edges: string[];
  bug: boolean;
}

export function execute(cfg: Cfg, input: Input): Execution {
  try {
    const t = interpret(cfg, input, 5000);
    const edges: string[] = [];
    for (let i = 0; i + 1 < t.visits.length; i++) if (cfg.nodes[t.visits[i]!.node]!.kind === 'cond') edges.push(`${t.visits[i]!.node}:${t.visits[i + 1]!.node}`);
    return { edges, bug: t.outcome === 'assertion failed' };
  } catch (e) {
    if (e instanceof InterpretError) return { edges: [], bug: false };
    throw e;
  }
}

/** Every branch outcome of the function. */
export function allEdges(cfg: Cfg): string[] {
  return cfg.nodes.filter((n) => n.kind === 'cond').flatMap((n) => [...new Set(n.succ)].map((s) => `${n.id}:${s}`));
}

export interface RaceResult {
  name: string;
  executions: number;
  /** (execution, edges covered) each time coverage grew. */
  progress: [number, number][];
  covered: number;
  bug?: { execution: number; input: Input };
  solverQueries?: number;
}

/** A small deterministic generator, so that the race is the same for every reader. */
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 2 ** 32;
  };
}
const clamp = (v: number) => Math.max(MIN, Math.min(MAX, Math.trunc(v)));

function track(name: string) {
  const covered = new Set<string>();
  const progress: [number, number][] = [[0, 0]];
  const result: RaceResult = { name, executions: 0, progress, covered: 0 };
  return {
    result,
    record(ex: Execution, input: Input): boolean {
      result.executions++;
      let grew = false;
      for (const e of ex.edges) if (!covered.has(e)) covered.add(e), (grew = true);
      if (grew) progress.push([result.executions, covered.size]);
      result.covered = covered.size;
      if (ex.bug && !result.bug) result.bug = { execution: result.executions, input };
      return grew;
    },
  };
}

export function randomFuzz(cfg: Cfg, budget: number, seed = 1): RaceResult {
  const r = rng(seed);
  const t = track('Random');
  for (let i = 0; i < budget && !t.result.bug; i++) {
    const input = Object.fromEntries(cfg.params.map((p) => [p, clamp(MIN + r() * (MAX - MIN + 1))]));
    t.record(execute(cfg, input), input);
  }
  return t.result;
}

/** Integer constants compared or computed in the program: the fuzzer's dictionary. */
export function dictionary(cfg: Cfg): number[] {
  const out = new Set<number>();
  const visit = (n: unknown) => {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) return n.forEach(visit);
    const e = n as estree.Node;
    if (e.type === 'Literal' && typeof e.value === 'number' && Number.isInteger(e.value)) out.add(e.value);
    for (const [k, v] of Object.entries(e)) if (k !== 'range' && k !== 'loc' && k !== 'parent') visit(v);
  };
  for (const node of cfg.nodes) visit(node.test ?? node.value ?? node.expr);
  return [...out];
}

const INTERESTING = [0, 1, -1, 2, 7, 8, 16, 32, 64, 100, 127, 128, 255, 256, 512, 1000, 1024, 4096, 32767, -32768, -128, -129];

export function guidedFuzz(cfg: Cfg, budget: number, options: { seed?: number; dictionary?: boolean; hybrid?: boolean } = {}): RaceResult {
  const r = rng(options.seed ?? 2);
  const t = track(options.hybrid ? 'Hybrid (fuzzing, then the solver when stuck)' : options.dictionary ? 'Coverage-guided, with a dictionary' : 'Coverage-guided');
  let lastGrowth = 0;
  let queries = 0;
  const traced = new Set<Input>();
  const tried = new Set<string>();
  const dict = options.dictionary ? dictionary(cfg) : [];
  const pickInt = (k: number) => Math.floor(r() * k);
  const corpus: Input[] = [Object.fromEntries(cfg.params.map((p) => [p, 0]))];
  t.record(execute(cfg, corpus[0]!), corpus[0]!);
  while (t.result.executions < budget && !t.result.bug) {
    const parent = corpus[pickInt(corpus.length)]!;
    const child = { ...parent };
    // One to three mutations, each on a random parameter.
    for (let m = 1 + pickInt(3); m > 0; m--) {
      const p = cfg.params[pickInt(cfg.params.length)]!;
      const v = child[p]!;
      const kind = pickInt(dict.length ? 6 : 5);
      child[p] = clamp(
        kind === 0 ? v ^ (1 << pickInt(16)) : kind === 1 ? v + (pickInt(35) + 1) * (r() < 0.5 ? -1 : 1) : kind === 2 ? INTERESTING[pickInt(INTERESTING.length)]! : kind === 3 ? MIN + r() * (MAX - MIN + 1) : kind === 4 ? (child[cfg.params[pickInt(cfg.params.length)]!] ?? v) : dict[pickInt(dict.length)]! + (r() < 0.25 ? (r() < 0.5 ? 1 : -1) : 0),
      );
    }
    if (t.record(execute(cfg, child), child)) {
      corpus.push(child);
      lastGrowth = t.result.executions;
    }
    // Hybrid fuzzing: when mutation has found nothing new for a while, ask the solver to flip the branches of the
    // corpus's paths, as concolic testing does, and give the inputs it finds back to the fuzzer.
    if (options.hybrid && t.result.executions - lastGrowth > 300) {
      lastGrowth = t.result.executions;
      for (const seed of corpus.filter((c) => !traced.has(c))) {
        traced.add(seed);
        const trace = concolicTrace(cfg, seed);
        for (let i = 0; i < trace.length && !t.result.bug; i++) {
          const b = trace[i]!;
          if (!b.cond) continue;
          const key = `${trace.slice(0, i).map((x) => `${x.node}>${x.next}`).join(',')}|${b.node}!${b.next}`;
          if (tried.has(key)) continue;
          tried.add(key);
          queries++;
          const res = check([...trace.slice(0, i).flatMap((x) => (x.cond ? [x.cond] : [])), not(b.cond)]);
          if (!res.sat) continue;
          const found = Object.fromEntries(cfg.params.map((p) => [p, (res.model![p] as number | undefined) ?? seed[p] ?? 0]));
          if (t.record(execute(cfg, found), found)) corpus.push(found);
        }
      }
    }
  }
  if (options.hybrid) t.result.solverQueries = queries;
  return t.result;
}

// ---------------------------------------------------------------------------------------------------------------
// Concolic execution

type CV = { c: number | boolean | null | undefined; s?: IntTerm | BoolTerm; bool?: boolean };

const asInt = (v: CV): IntTerm => (v.s && !v.bool ? (v.s as IntTerm) : int(Number(v.c) | 0));
const asBool = (v: CV): BoolTerm => (v.bool && v.s ? (v.s as BoolTerm) : !v.bool && v.s && typeof v.c === 'number' ? not({ t: 'eq', a: v.s as IntTerm, b: int(0) }) : v.c ? TRUE : FALSE);

function evalCV(e: estree.Node, env: Map<string, CV>): CV {
  switch (e.type) {
    case 'Literal':
      return typeof e.value === 'boolean' ? { c: e.value, bool: true, s: e.value ? TRUE : FALSE } : { c: e.value as number };
    case 'Identifier':
      return env.get(e.name) ?? { c: undefined };
    case 'UnaryExpression': {
      const a = evalCV(e.argument, env);
      if (e.operator === '-') return { c: -(a.c as number), s: a.s ? { t: 'neg', a: asInt(a) } : undefined };
      if (e.operator === '!') return { c: !a.c, bool: true, s: a.s ? not(asBool(a)) : undefined };
      if (e.operator === '~') return { c: ~(a.c as number) };
      return a;
    }
    case 'LogicalExpression': {
      const a = evalCV(e.left, env);
      const b = evalCV(e.right, env);
      const c = e.operator === '&&' ? Boolean(a.c) && Boolean(b.c) : Boolean(a.c) || Boolean(b.c);
      const s = a.s || b.s ? (e.operator === '&&' ? and(asBool(a), asBool(b)) : not(and(not(asBool(a)), not(asBool(b))))) : undefined;
      return { c, bool: true, s };
    }
    case 'ConditionalExpression': {
      const t = evalCV(e.test, env);
      return t.c ? evalCV(e.consequent, env) : evalCV(e.alternate, env);
    }
    case 'BinaryExpression': {
      const a = evalCV(e.left as estree.Node, env);
      const b = evalCV(e.right, env);
      const x = a.c as number;
      const y = b.c as number;
      const sym = Boolean(a.s || b.s);
      const I = (c: number, t: IntTerm['t']): CV => ({ c, s: sym ? ({ t, a: asInt(a), b: asInt(b) } as IntTerm) : undefined });
      const B = (c: boolean, s: BoolTerm): CV => ({ c, bool: true, s: sym ? s : undefined });
      switch (e.operator) {
        case '+': return I(x + y, 'add');
        case '-': return I(x - y, 'sub');
        case '*': return I(x * y, 'mul');
        case '&': return I(x & y, 'band');
        case '|': return I(x | y, 'bor');
        case '^': return I(x ^ y, 'bxor');
        case '<': return B(x < y, { t: 'lt', a: asInt(a), b: asInt(b) });
        case '<=': return B(x <= y, { t: 'le', a: asInt(a), b: asInt(b) });
        case '>': return B(x > y, { t: 'lt', a: asInt(b), b: asInt(a) });
        case '>=': return B(x >= y, { t: 'le', a: asInt(b), b: asInt(a) });
        case '===': case '==': return B(x === y, { t: 'eq', a: asInt(a), b: asInt(b) });
        case '!==': case '!=': return B(x !== y, not({ t: 'eq', a: asInt(a), b: asInt(b) }));
        // Not modelled: the concrete value only (concretisation).
        case '%': return { c: x % y };
        case '/': return { c: x / y };
        case '<<': return { c: x << y };
        case '>>': return { c: x >> y };
        default: return { c: undefined };
      }
    }
    default:
      return { c: undefined };
  }
}

/** Runs an input concretely and symbolically: the branches taken, each with its symbolic condition (if any). */
export function concolicTrace(cfg: Cfg, input: Input): { node: number; cond?: BoolTerm; next: number }[] {
  const env = new Map<string, CV>(cfg.params.map((p) => [p, { c: input[p] ?? 0, s: { t: 'var', name: p } }]));
  const out: { node: number; cond?: BoolTerm; next: number }[] = [];
  let n = cfg.entry;
  for (let steps = 0; steps < 5000; steps++) {
    const node: CfgNode = cfg.nodes[n]!;
    if (node.kind === 'exit' || node.kind === 'return' || node.kind === 'throw') break;
    if (node.kind === 'assign' && node.defs.length === 1 && node.value) env.set(node.defs[0]!, evalCV(node.value, env));
    if (node.kind === 'declare') for (const d of node.defs) env.set(d, { c: undefined });
    if (node.kind === 'expr' && node.expr?.type === 'CallExpression' && node.expr.callee.type === 'Identifier' && node.expr.callee.name === 'assert') {
      const v = evalCV(node.expr.arguments[0] as estree.Node, env);
      // The assertion is a branch: hold or fail.
      out.push({ node: n, cond: v.s ? (v.c ? asBool(v) : not(asBool(v))) : undefined, next: v.c ? node.succ[0]! : -1 });
      if (!v.c) break;
    }
    if (node.kind === 'cond' && node.test) {
      const v = evalCV(node.test, env);
      const taken = v.c ? node.succ[0]! : (node.succ[1] ?? node.succ[0]!);
      out.push({ node: n, cond: v.s ? (v.c ? asBool(v) : not(asBool(v))) : undefined, next: taken });
      n = taken;
      continue;
    }
    if (node.succ.length !== 1) break;
    n = node.succ[0]!;
  }
  return out;
}

export function concolic(cfg: Cfg, budget: number, options: { seed?: number; maxQueries?: number } = {}): RaceResult {
  const r = rng(options.seed ?? 3);
  const t = track('Concolic');
  const maxQueries = options.maxQueries ?? 200;
  let queries = 0;
  const tried = new Set<string>();
  const queue: Input[] = [Object.fromEntries(cfg.params.map((p) => [p, 0]))];
  while (t.result.executions < budget && !t.result.bug) {
    const input = queue.shift() ?? Object.fromEntries(cfg.params.map((p) => [p, clamp(MIN + r() * (MAX - MIN + 1))]));
    t.record(execute(cfg, input), input);
    if (t.result.bug) break;
    const trace = concolicTrace(cfg, input);
    // Generational search: negate each branch of the trace in turn, keeping the prefix.
    for (let i = 0; i < trace.length && queries < maxQueries; i++) {
      const b = trace[i]!;
      if (!b.cond) continue;
      const prefix = trace.slice(0, i).flatMap((x) => (x.cond ? [x.cond] : []));
      const key = `${trace.slice(0, i).map((x) => `${x.node}>${x.next}`).join(',')}|${b.node}!${b.next}`;
      if (tried.has(key)) continue;
      tried.add(key);
      queries++;
      const res = check([...prefix, not(b.cond)]);
      if (res.sat) queue.push(Object.fromEntries(cfg.params.map((p) => [p, (res.model![p] as number | undefined) ?? input[p] ?? 0])));
    }
  }
  t.result.solverQueries = queries;
  return t.result;
}

export function race(source: string, options: { budget?: number } = {}): { cfg: Cfg; total: number; results: RaceResult[] } {
  const cfg = buildCfg(source);
  const budget = options.budget ?? 20000;
  return {
    cfg,
    total: allEdges(cfg).length,
    results: [randomFuzz(cfg, budget), guidedFuzz(cfg, budget), guidedFuzz(cfg, budget, { dictionary: true }), concolic(cfg, Math.min(budget, 400)), guidedFuzz(cfg, budget, { hybrid: true })],
  };
}
