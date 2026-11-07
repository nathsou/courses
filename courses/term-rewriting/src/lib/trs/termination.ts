/**
 * Proving termination: polynomial interpretations, path orders with precedence search, the
 * dependency-pair method, and a loop finder for non-termination.
 */
import type { Rule } from './parse';
import * as P from './poly';
import { lpo, kbo, precedence, rpo, kboAdmissible, type Order, type Precedence } from './orders';
import { apply, at, equal, f, fnPositions, isFn, show, symbols, v, vars, type Fn, type Term } from './term';
import { renameApartAll, unify } from './unify';
import { match } from './match';
import { redexes, contract, system } from './rewrite';

/** The signature of a rule set: every function symbol with its arity. */
export function signature(rules: readonly Rule[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const r of rules) {
    symbols(r.lhs, out);
    symbols(r.rhs, out);
  }
  return out;
}

/** Defined symbols: the root symbols of left-hand sides. The others are constructors. */
export function defined(rules: readonly Rule[]): Set<string> {
  return new Set(rules.map((r) => (r.lhs as Fn).name));
}

// ───────────── polynomial interpretations ─────────────

/** An interpretation: for each symbol, a polynomial in the variables x1, …, xn (its arguments). */
export type Interpretation = ReadonlyMap<string, P.Poly>;

/** Parse an interpretation such as `{ '+': 'x1 + 2*x2', 'S': 'x1 + 1', '0': '1' }`. */
export function interpretation(spec: Record<string, string>): Interpretation {
  return new Map(Object.entries(spec).map(([k, s]) => [k, P.parsePoly(s)]));
}

/** `[t]`: the polynomial a term denotes. Symbols without an interpretation are read as sums of their arguments plus 1. */
export function interpret(I: Interpretation, t: Term): P.Poly {
  if (t.type === 'var') return P.variable(t.name);
  const args = t.args.map((a) => interpret(I, a));
  const p = I.get(t.name);
  if (!p) return P.add(P.constant(1), ...args);
  const env = new Map<string, P.Poly>(args.map((a, i) => [`x${i + 1}`, a]));
  return P.substitute(p, env);
}

export interface RuleCheck {
  rule: Rule;
  left: P.Poly;
  right: P.Poly;
  /** [l] − [r] */
  diff: P.Poly;
  ok: boolean;
}

/** Check that every rule strictly decreases: [l] − [r] > 0 for all natural-number values. */
export function checkInterpretation(I: Interpretation, rules: readonly Rule[], weak = false): { ok: boolean; rules: RuleCheck[]; monotone: string | null } {
  const checks = rules.map((rule) => {
    const left = interpret(I, rule.lhs), right = interpret(I, rule.rhs);
    const diff = P.sub(left, right);
    return { rule, left, right, diff, ok: weak ? P.nonNegative(diff) : P.positive(diff) };
  });
  return { ok: checks.every((c) => c.ok), rules: checks, monotone: monotonicityProblem(I, signature(rules)) };
}

/** Strict monotonicity over ℕ: each argument must occur with a positive coefficient. Returns a problem or null. */
export function monotonicityProblem(I: Interpretation, sig: ReadonlyMap<string, number>): string | null {
  for (const [name, n] of sig) {
    const p = I.get(name);
    if (!p) continue;
    if ([...p.values()].some((c) => c < 0)) return `[${name}] has a negative coefficient`;
    const vs = new Set(P.variablesOf(p));
    for (let i = 1; i <= n; i++) if (!vs.has(`x${i}`)) return `[${name}] ignores its argument x${i}, so it is not strictly monotone`;
    for (const x of vs) if (!/^x\d+$/.test(x) || Number(x.slice(1)) > n) return `[${name}] mentions ${x}, but ${name} has ${n} argument${n === 1 ? '' : 's'}`;
  }
  return null;
}

/**
 * Depth-first search over linear interpretations a0 + a1·x1 + … with coefficients in [lo, max]. Coefficients
 * are assigned one symbol at a time, and each constraint is checked as soon as every symbol it mentions has
 * been assigned, so most of the search space is pruned early. `accept` is called on complete assignments.
 */
function searchLinear<T>(
  sig: [string, number][],
  constraints: { rule: Rule; strict: boolean }[],
  opts: { max: number; limit: number; strictMonotone: boolean },
  accept: (I: Interpretation) => T | null,
): T | null {
  const symsOf = (r: Rule) => new Set([...symbols(r.lhs).keys(), ...symbols(r.rhs).keys()]);
  const order = sig.map(([s]) => s);
  const pos = new Map(order.map((s, i) => [s, i]));
  // Constraint c can be checked once the symbol at index readyAt[c] has been assigned.
  const readyAt = constraints.map((c) => Math.max(-1, ...[...symsOf(c.rule)].map((s) => pos.get(s) ?? -1)));
  const I = new Map<string, P.Poly>();
  let tried = 0;
  const holds = (c: { rule: Rule; strict: boolean }) => {
    const d = P.sub(interpret(I, c.rule.lhs), interpret(I, c.rule.rhs));
    return c.strict ? P.positive(d) : P.nonNegative(d);
  };
  const go = (k: number): T | null => {
    if (tried > opts.limit) return null;
    if (k === sig.length) {
      tried++;
      return accept(I);
    }
    const [sym, n] = sig[k]!;
    const coeffs = new Array(n + 1).fill(0);
    const assign = (i: number): T | null => {
      if (i > n) {
        let p: P.Poly = P.constant(coeffs[0]);
        for (let j = 1; j <= n; j++) p = P.add(p, P.scale(P.variable(`x${j}`), coeffs[j]));
        I.set(sym, p);
        tried++;
        for (let c = 0; c < constraints.length; c++) if (readyAt[c] === k && !holds(constraints[c]!)) return null;
        return go(k + 1);
      }
      const lo = opts.strictMonotone && i > 0 ? 1 : 0;
      for (let a = lo; a <= opts.max; a++) {
        coeffs[i] = a;
        const r = assign(i + 1);
        if (r !== null) return r;
        if (tried > opts.limit) return null;
      }
      return null;
    };
    const r = assign(0);
    I.delete(sym);
    return r;
  };
  return go(0);
}

/** Search linear interpretations a0 + a1·x1 + … with coefficients up to `max`. */
export function findLinearInterpretation(rules: readonly Rule[], opts: { max?: number; limit?: number; strictMonotone?: boolean } = {}): Interpretation | null {
  const { max = 2, limit = 300_000, strictMonotone = true } = opts;
  return searchLinear([...signature(rules)], rules.map((rule) => ({ rule, strict: true })), { max, limit, strictMonotone }, (I) => new Map(I));
}

// ───────────── precedence search ─────────────

function* permutations<T>(xs: T[]): Generator<T[]> {
  if (xs.length <= 1) {
    yield xs.slice();
    return;
  }
  for (let i = 0; i < xs.length; i++) {
    const rest = [...xs.slice(0, i), ...xs.slice(i + 1)];
    for (const p of permutations(rest)) yield [xs[i]!, ...p];
  }
}

export type PathOrderKind = 'lpo' | 'rpo' | 'kbo';

export function makeOrder(kind: PathOrderKind, prec: Precedence): Order {
  return kind === 'lpo' ? lpo(prec) : kind === 'rpo' ? rpo(prec) : kbo({ prec });
}

/** Find a total precedence (highest first) under which `kind` orients every rule left to right. */
export function findPrecedence(rules: readonly Rule[], kind: PathOrderKind = 'lpo', maxSymbols = 8): string[] | null {
  const sig = signature(rules);
  const syms = [...sig.keys()];
  if (syms.length > maxSymbols) return null;
  for (const perm of permutations(syms)) {
    const prec = precedence(perm);
    if (kind === 'kbo' && kboAdmissible({ prec }, sig)) continue;
    const gt = makeOrder(kind, prec);
    if (rules.every((r) => gt(r.lhs, r.rhs))) return perm;
  }
  return null;
}

// ───────────── dependency pairs ─────────────

export const mark = (name: string) => `${name}#`;

export interface DependencyPair {
  lhs: Fn;
  rhs: Fn;
  /** The rule it comes from. */
  from: number;
}

/** The dependency pairs: l# → u# for each subterm u of a right-hand side with a defined root (not a proper subterm of l). */
export function dependencyPairs(rules: readonly Rule[]): DependencyPair[] {
  const D = defined(rules);
  const out: DependencyPair[] = [];
  rules.forEach((r, from) => {
    const l = r.lhs as Fn;
    for (const p of fnPositions(r.rhs)) {
      const u = at(r.rhs, p) as Fn;
      if (!D.has(u.name)) continue;
      if (fnPositions(l).some((q) => q.length > 0 && equal(at(l, q), u))) continue;
      out.push({ lhs: f(mark(l.name), ...l.args), rhs: f(mark(u.name), ...u.args), from });
    }
  });
  return out;
}

let fresh = 0;
/** cap: replace subterms with a defined root by fresh variables. */
function cap(t: Term, D: ReadonlySet<string>): Term {
  if (t.type === 'var') return t;
  if (D.has(t.name)) return v(`_c${fresh++}`);
  return f(t.name, ...t.args.map((a) => cap(a, D)));
}
/** ren: rename every variable occurrence to a distinct fresh variable. */
function ren(t: Term): Term {
  if (t.type === 'var') return v(`_r${fresh++}`);
  return f(t.name, ...t.args.map(ren));
}

/** The estimated dependency graph: an edge from pair i to pair j when ren(cap(rhs_i)) unifies with lhs_j. */
export function dependencyGraph(rules: readonly Rule[], pairs: readonly DependencyPair[]): number[][] {
  const D = defined(rules);
  return pairs.map((p) => {
    const est = ren(cap(p.rhs, D));
    const out: number[] = [];
    pairs.forEach((q, j) => {
      const [l] = renameApartAll([q.lhs], vars(est));
      if (unify(est, l!)) out.push(j);
    });
    return out;
  });
}

/** Strongly connected components with at least one edge (Tarjan). */
export function sccs(graph: readonly number[][], nodes: readonly number[] = graph.map((_, i) => i)): number[][] {
  const inSet = new Set(nodes);
  const index = new Map<number, number>(), low = new Map<number, number>();
  const stack: number[] = [], onStack = new Set<number>();
  const out: number[][] = [];
  let n = 0;
  const visit = (u: number) => {
    index.set(u, n);
    low.set(u, n);
    n++;
    stack.push(u);
    onStack.add(u);
    for (const w of graph[u]!) {
      if (!inSet.has(w)) continue;
      if (!index.has(w)) {
        visit(w);
        low.set(u, Math.min(low.get(u)!, low.get(w)!));
      } else if (onStack.has(w)) low.set(u, Math.min(low.get(u)!, index.get(w)!));
    }
    if (low.get(u) === index.get(u)) {
      const comp: number[] = [];
      let w: number;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        comp.push(w);
      } while (w !== u);
      const cyclic = comp.length > 1 || graph[u]!.includes(u);
      if (cyclic) out.push(comp.sort((a, b) => a - b));
    }
  };
  for (const u of nodes) if (!index.has(u)) visit(u);
  return out;
}

export interface DpProofStep {
  scc: number[];
  method: 'subterm criterion' | 'interpretation';
  removed: number[];
  detail: string;
}

export interface DpProof {
  pairs: DependencyPair[];
  graph: number[][];
  steps: DpProofStep[];
  ok: boolean;
  /** SCCs that could not be solved. */
  open: number[][];
}

/** Subterm criterion: a projection π with π(s) ⊵ π(t) for all pairs, strictly for some. */
function subtermCriterion(pairs: readonly DependencyPair[], scc: number[]): { removed: number[]; detail: string } | null {
  const heads = [...new Set(scc.flatMap((i) => [pairs[i]!.lhs.name, pairs[i]!.rhs.name]))];
  const arity = new Map<string, number>();
  for (const i of scc) {
    arity.set(pairs[i]!.lhs.name, pairs[i]!.lhs.args.length);
    arity.set(pairs[i]!.rhs.name, pairs[i]!.rhs.args.length);
  }
  const choice = new Map<string, number>();
  const sub = (s: Term, t: Term) => equal(s, t) || properSub(s, t);
  const properSub = (s: Term, t: Term): boolean => s.type === 'fn' && s.args.some((a) => equal(a, t) || properSub(a, t));
  const go = (k: number): { removed: number[]; detail: string } | null => {
    if (k === heads.length) {
      const removed: number[] = [];
      for (const i of scc) {
        const p = pairs[i]!;
        const a = p.lhs.args[choice.get(p.lhs.name)!]!, b = p.rhs.args[choice.get(p.rhs.name)!]!;
        if (!sub(a, b)) return null;
        if (!equal(a, b)) removed.push(i);
      }
      if (!removed.length) return null;
      return { removed, detail: heads.map((h) => `π(${h}) = ${choice.get(h)! + 1}`).join(', ') };
    }
    const h = heads[k]!;
    for (let i = 0; i < (arity.get(h) ?? 0); i++) {
      choice.set(h, i);
      const r = go(k + 1);
      if (r) return r;
    }
    return null;
  };
  return go(0);
}

/** A reduction pair from linear interpretations: rules ≥, pairs ≥, some pair >. */
function interpretationProcessor(rules: readonly Rule[], pairs: readonly DependencyPair[], scc: number[], max = 2, limit = 200_000): { removed: number[]; detail: string } | null {
  const pairRules: Rule[] = scc.map((i) => ({ lhs: pairs[i]!.lhs, rhs: pairs[i]!.rhs }));
  const sig = [...signature([...rules, ...pairRules])];
  const constraints = [...rules, ...pairRules].map((rule) => ({ rule, strict: false }));
  return searchLinear(sig, constraints, { max, limit, strictMonotone: false }, (I) => {
    const removed = scc.filter((_, j) => P.positive(P.sub(interpret(I, pairRules[j]!.lhs), interpret(I, pairRules[j]!.rhs))));
    if (!removed.length) return null;
    return { removed, detail: [...I].map(([s, p]) => `[${s}] = ${P.showPoly(p)}`).join(', ') };
  });
}

/** The dependency-pair method with the estimated graph, the subterm criterion and linear interpretations. */
export function dpProve(rules: readonly Rule[]): DpProof {
  const pairs = dependencyPairs(rules);
  const graph = dependencyGraph(rules, pairs);
  const steps: DpProofStep[] = [];
  const open: number[][] = [];
  const work = sccs(graph);
  while (work.length) {
    const scc = work.shift()!;
    const sc = subtermCriterion(pairs, scc);
    const res = sc ? { ...sc, method: 'subterm criterion' as const } : (() => {
      const ip = interpretationProcessor(rules, pairs, scc);
      return ip ? { ...ip, method: 'interpretation' as const } : null;
    })();
    if (!res) {
      open.push(scc);
      continue;
    }
    steps.push({ scc, method: res.method, removed: res.removed, detail: res.detail });
    const rest = scc.filter((i) => !res.removed.includes(i));
    work.push(...sccs(graph, rest));
  }
  return { pairs, graph, steps, ok: open.length === 0, open };
}

// ───────────── non-termination ─────────────

export interface Loop {
  start: Term;
  /** Terms from start to a term containing an instance of start. */
  path: Term[];
  /** The position where the instance occurs, and the substitution. */
  instanceAt: number[];
}

/** Look for a loop: a term t that rewrites in a few steps to a term containing an instance of t. */
export function findLoop(rules: readonly Rule[], maxDepth = 6, maxTerms = 4000): Loop | null {
  const sys = system(rules);
  for (const r of rules) {
    const start = r.lhs;
    let frontier: Term[][] = [[start]];
    let seen = 0;
    for (let d = 0; d < maxDepth && frontier.length; d++) {
      const next: Term[][] = [];
      for (const path of frontier) {
        const t = path.at(-1)!;
        for (const rd of redexes(sys, t)) {
          const u = contract(t, rd);
          for (const p of fnPositions(u)) {
            if (match(start, at(u, p))) return { start, path: [...path, u], instanceAt: p as number[] };
          }
          if (++seen > maxTerms) break;
          next.push([...path, u]);
        }
      }
      frontier = next;
    }
  }
  return null;
}

// ───────────── the prover ─────────────

export type TerminationProof =
  | { result: 'terminating'; method: 'lpo' | 'kbo' | 'rpo'; precedence: string[] }
  | { result: 'terminating'; method: 'polynomial'; interpretation: Interpretation }
  | { result: 'terminating'; method: 'dependency pairs'; proof: DpProof }
  | { result: 'non-terminating'; loop: Loop }
  | { result: 'unknown' };

/** Try, in order: LPO, KBO and MPO, a short loop search, linear interpretations, dependency pairs, and a longer loop search. */
export function proveTermination(rules: readonly Rule[]): TerminationProof {
  const bad = rules.find((r) => vars(r.rhs).some((x) => !vars(r.lhs).includes(x)));
  if (bad) {
    return { result: 'non-terminating', loop: { start: bad.lhs, path: [bad.lhs, bad.rhs], instanceAt: [] } };
  }
  for (const kind of ['lpo', 'kbo', 'rpo'] as const) {
    const p = findPrecedence(rules, kind);
    if (p) return { result: 'terminating', method: kind, precedence: p };
  }
  // A short loop search is cheap and spares the interpretation searches on looping systems.
  const quickLoop = findLoop(rules, 3, 500);
  if (quickLoop) return { result: 'non-terminating', loop: quickLoop };
  const I = findLinearInterpretation(rules, { limit: 100_000 });
  if (I) return { result: 'terminating', method: 'polynomial', interpretation: I };
  const dp = dpProve(rules);
  if (dp.ok) return { result: 'terminating', method: 'dependency pairs', proof: dp };
  const loop = findLoop(rules);
  if (loop) return { result: 'non-terminating', loop };
  return { result: 'unknown' };
}

export function describeTermination(p: TerminationProof): string {
  if (p.result === 'unknown') return 'No proof found (termination is undecidable, so a tool must sometimes give up).';
  if (p.result === 'non-terminating') return `Not terminating: ${p.loop.path.map((t) => show(t)).join(' → ')} contains an instance of ${show(p.loop.start)}.`;
  if (p.method === 'polynomial') return `Terminating by the polynomial interpretation ${[...p.interpretation].map(([s, q]) => `[${s}] = ${P.showPoly(q)}`).join(', ')}.`;
  if (p.method === 'dependency pairs') return `Terminating by dependency pairs: ${p.proof.pairs.length} pairs, ${p.proof.steps.length} processor steps.`;
  return `Terminating by ${p.method.toUpperCase()} with precedence ${p.precedence.join(' > ')}.`;
}

export { apply, isFn };
