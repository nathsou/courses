/**
 * Rewriting: redexes, one-step rewriting, strategies and normal forms.
 *
 * Two evaluators share one semantics:
 *  - the step engine (`redexes`, `step`, `normalize`) works with explicit positions and records a trace;
 *  - `evaluate` is a fast recursive innermost evaluator for running programs.
 *
 * Built-ins (both evaluators): `if(True, a, b) -> a`, `if(False, a, b) -> b` (branches are lazy), and
 * Girafe's externals on integer literals (`@add(2, 3)` → `5`, `@lt(2, 3)` → `True`, …).
 * Laziness: argument positions marked `?` on a left-hand side are not evaluated by innermost strategies,
 * and a right-hand side subterm `t?` is frozen until a match needs to look inside it.
 */
import { matchInto } from './match';
import type { Condition, Program, Rule } from './parse';
import { apply, at, equal, f, isPrefix, key, replaceAt, type Fn, type Position, type Subst, type Term } from './term';

export interface RewriteSystem {
  rules: readonly Rule[];
  /** First matching rule in order wins (Girafe semantics). */
  priority?: boolean;
  /** Lazy argument positions per symbol. */
  lazy?: ReadonlyMap<string, readonly boolean[]>;
}

export const system = (rules: readonly Rule[], opts: Omit<RewriteSystem, 'rules'> = {}): RewriteSystem => ({ rules, ...opts });
export const fromProgram = (p: Program): RewriteSystem => ({ rules: p.rules, priority: p.priority, lazy: p.lazy });

export type Strategy = 'innermost' | 'outermost' | 'rightmost-innermost' | 'parallel-outermost' | 'random';
export const STRATEGIES: Strategy[] = ['innermost', 'outermost', 'rightmost-innermost', 'parallel-outermost', 'random'];

/** What contracted a redex: a rule of the system, or a built-in. */
export type Cause = { kind: 'rule'; index: number; rule: Rule } | { kind: 'builtin'; name: string };

export interface Redex {
  pos: Position;
  cause: Cause;
  sigma: Subst;
  /** The term that replaces the redex. */
  result: Term;
}

export interface Step {
  before: Term;
  after: Term;
  /** One redex, or several for a parallel step. */
  redexes: Redex[];
}

// ───────────── built-ins ─────────────

const INT = /^-?\d+$/;
export const isInt = (t: Term): t is Fn => t.type === 'fn' && t.args.length === 0 && INT.test(t.name);
export const int = (n: number | bigint): Fn => f(String(n));
const bool = (b: boolean): Fn => f(b ? 'True' : 'False');

const ARITH: Record<string, (a: bigint, b: bigint) => bigint | boolean | undefined> = {
  add: (a, b) => a + b,
  sub: (a, b) => a - b,
  mul: (a, b) => a * b,
  mult: (a, b) => a * b,
  div: (a, b) => (b === 0n ? undefined : a / b),
  mod: (a, b) => (b === 0n ? undefined : ((a % b) + b) % b),
  pow: (a, b) => (b < 0n || b > 10_000n ? undefined : a ** b),
  lt: (a, b) => a < b,
  le: (a, b) => a <= b,
  gt: (a, b) => a > b,
  ge: (a, b) => a >= b,
  max: (a, b) => (a > b ? a : b),
  min: (a, b) => (a < b ? a : b),
};

/** Lazy positions of built-in symbols. */
const BUILTIN_LAZY: ReadonlyMap<string, readonly boolean[]> = new Map([['if', [false, true, true]]]);

function isLazyArg(sys: RewriteSystem, name: string, i: number): boolean {
  return !!(sys.lazy?.get(name)?.[i] ?? BUILTIN_LAZY.get(name)?.[i]);
}

/** Is `t` built from symbols only, with no frozen parts (so a built-in may inspect it)? */
function concrete(t: Term): boolean {
  if (t.type === 'var') return false;
  if (t.name === '?') return false;
  return t.args.every(concrete);
}

/** Apply a built-in at the root of `t`, if one applies. */
export function builtin(t: Term): { name: string; result: Term } | null {
  if (t.type !== 'fn') return null;
  if (t.name === 'if' && t.args.length === 3) {
    const c = t.args[0]!;
    if (c.type === 'fn' && c.args.length === 0 && (c.name === 'True' || c.name === 'False')) return { name: 'if', result: c.name === 'True' ? t.args[1]! : t.args[2]! };
    return null;
  }
  if (t.name[0] !== '@') return null;
  const op = t.name.slice(1);
  if ((op === 'equ' || op === 'eq') && t.args.length === 2) {
    const [a, b] = t.args as [Term, Term];
    if (!concrete(a) || !concrete(b)) return null;
    return { name: t.name, result: bool(equal(a, b)) };
  }
  if (op === 'neq' && t.args.length === 2) {
    const [a, b] = t.args as [Term, Term];
    if (!concrete(a) || !concrete(b)) return null;
    return { name: t.name, result: bool(!equal(a, b)) };
  }
  const fn = ARITH[op];
  if (fn && t.args.length === 2 && isInt(t.args[0]!) && isInt(t.args[1]!)) {
    const r = fn(BigInt(t.args[0].name), BigInt((t.args[1] as Fn).name));
    if (r === undefined) return null;
    return { name: t.name, result: typeof r === 'boolean' ? bool(r) : int(r) };
  }
  return null;
}

// ───────────── conditions ─────────────

const CONDITION_FUEL = 10_000;

/** Do a rule's conditions hold for the matched substitution (which they may extend)? */
export function conditionsHold(sys: RewriteSystem, conds: readonly Condition[] | undefined, sigma: Map<string, Term>): boolean {
  if (!conds || conds.length === 0) return true;
  for (const c of conds) {
    const left = evaluate(sys, apply(sigma, c.left), { fuel: CONDITION_FUEL }).term;
    if (c.kind === 'reach') {
      // `s ->* t`: the normal form of s must be an instance of t (t may bind fresh variables).
      if (!matchInto(c.right, left, sigma)) return false;
    } else {
      const right = evaluate(sys, apply(sigma, c.right), { fuel: CONDITION_FUEL }).term;
      if (!equal(left, right)) return false;
    }
  }
  return true;
}

// ───────────── redexes ─────────────

/** Match with frozen subterms treated as transparent; reports the first frozen position the match needed. */
function matchThroughFreeze(p: Term, t: Term, sigma: Map<string, Term>, path: number[], needs: { pos?: number[] }): boolean {
  if (p.type === 'var') {
    const bound = sigma.get(p.name);
    if (bound === undefined) {
      sigma.set(p.name, t);
      return true;
    }
    return equal(bound, t);
  }
  if (t.type === 'fn' && t.name === '?' && t.args.length === 1 && p.name !== '?') {
    // The pattern needs to see inside a frozen term: optimistically assume it matches once forced.
    needs.pos ??= path.slice();
    return true;
  }
  if (t.type === 'var' || t.name !== p.name || t.args.length !== p.args.length) return false;
  for (let i = 0; i < p.args.length; i++) {
    path.push(i);
    const ok = matchThroughFreeze(p.args[i]!, t.args[i]!, sigma, path, needs);
    path.pop();
    if (!ok) return false;
  }
  return true;
}

/**
 * The ways to contract the subterm `t` at its root. Without `#priority` every matching rule is
 * listed; with it, only the first. A match that has to look inside a frozen `t?` produces a
 * "force" redex at the frozen position instead (relative to `t`).
 */
export function rootRedexes(sys: RewriteSystem, t: Term): { rel: Position; cause: Cause; sigma: Subst; result: Term }[] {
  if (t.type === 'var') return [];
  const out: { rel: Position; cause: Cause; sigma: Subst; result: Term }[] = [];
  const b = builtin(t);
  if (b) return [{ rel: [], cause: { kind: 'builtin', name: b.name }, sigma: new Map(), result: b.result }];
  for (let i = 0; i < sys.rules.length; i++) {
    const rule = sys.rules[i]!;
    if (rule.lhs.type !== 'fn' || rule.lhs.name !== t.name || rule.lhs.args.length !== t.args.length) continue;
    const sigma = new Map<string, Term>();
    const needs: { pos?: number[] } = {};
    if (!matchThroughFreeze(rule.lhs, t, sigma, [], needs)) continue;
    if (needs.pos) {
      const frozen = at(t, needs.pos) as Fn;
      out.push({ rel: needs.pos, cause: { kind: 'builtin', name: 'force' }, sigma: new Map(), result: frozen.args[0]! });
      if (sys.priority) break;
      continue;
    }
    if (!conditionsHold(sys, rule.conditions, sigma)) continue;
    out.push({ rel: [], cause: { kind: 'rule', index: i, rule }, sigma, result: apply(sigma, rule.rhs) });
    if (sys.priority) break;
  }
  return out;
}

/** Every redex of `t`, with its position, in pre-order. */
export function redexes(sys: RewriteSystem, t: Term): Redex[] {
  const out: Redex[] = [];
  const go = (u: Term, p: number[]) => {
    for (const r of rootRedexes(sys, u)) out.push({ pos: [...p, ...r.rel], cause: r.cause, sigma: r.sigma, result: r.result });
    if (u.type === 'fn' && u.name !== '?') u.args.forEach((a, i) => go(a, [...p, i]));
  };
  go(t, []);
  return dedupe(out);
}

function dedupe(rs: Redex[]): Redex[] {
  const seen = new Set<string>();
  return rs.filter((r) => {
    const k = `${r.pos.join('.')}|${r.cause.kind === 'rule' ? r.cause.index : r.cause.name}|${key(r.result)}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Contract one redex. */
export function contract(t: Term, r: Redex): Term {
  return replaceAt(t, r.pos, r.result);
}

/** The leftmost-innermost redex: the first redex in post-order, skipping lazy argument positions. */
function innermost(sys: RewriteSystem, t: Term, rightmost: boolean): Redex | null {
  const go = (u: Term, p: number[]): Redex | null => {
    if (u.type === 'var') return null;
    if (u.name !== '?') {
      const idx = u.args.map((_, i) => i);
      if (rightmost) idx.reverse();
      for (const i of idx) {
        if (isLazyArg(sys, u.name, i)) continue;
        const r = go(u.args[i]!, [...p, i]);
        if (r) return r;
      }
    } else return null;
    const rs = rootRedexes(sys, u);
    if (rs.length) return { pos: [...p, ...rs[0]!.rel], cause: rs[0]!.cause, sigma: rs[0]!.sigma, result: rs[0]!.result };
    // Nothing else applies: lazy arguments are evaluated last.
    for (let i = 0; i < u.args.length; i++) {
      if (!isLazyArg(sys, u.name, i)) continue;
      const r = go(u.args[i]!, [...p, i]);
      if (r) return r;
    }
    return null;
  };
  return go(t, []);
}

/** The leftmost-outermost redex. */
function outermost(sys: RewriteSystem, t: Term): Redex | null {
  const go = (u: Term, p: number[]): Redex | null => {
    if (u.type === 'var') return null;
    const rs = rootRedexes(sys, u);
    if (rs.length) return { pos: [...p, ...rs[0]!.rel], cause: rs[0]!.cause, sigma: rs[0]!.sigma, result: rs[0]!.result };
    if (u.name === '?') return null;
    for (let i = 0; i < u.args.length; i++) {
      const r = go(u.args[i]!, [...p, i]);
      if (r) return r;
    }
    return null;
  };
  return go(t, []);
}

/** All outermost redexes (pairwise parallel), for parallel-outermost steps. */
function allOutermost(sys: RewriteSystem, t: Term): Redex[] {
  const out: Redex[] = [];
  const go = (u: Term, p: number[]) => {
    if (u.type === 'var') return;
    const rs = rootRedexes(sys, u);
    if (rs.length) {
      out.push({ pos: [...p, ...rs[0]!.rel], cause: rs[0]!.cause, sigma: rs[0]!.sigma, result: rs[0]!.result });
      return;
    }
    if (u.name === '?') return;
    u.args.forEach((a, i) => go(a, [...p, i]));
  };
  go(t, []);
  return out;
}

/** A small deterministic random generator (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** One step with a strategy, or `null` when `t` is a normal form. */
export function step(sys: RewriteSystem, t: Term, strategy: Strategy = 'innermost', random: () => number = Math.random): Step | null {
  if (strategy === 'parallel-outermost') {
    const rs = allOutermost(sys, t);
    if (!rs.length) return null;
    let after = t;
    for (const r of rs) after = contract(after, r);
    return { before: t, after, redexes: rs };
  }
  let r: Redex | null;
  if (strategy === 'random') {
    const all = redexes(sys, t);
    r = all.length ? all[Math.floor(random() * all.length)]! : null;
  } else if (strategy === 'outermost') r = outermost(sys, t);
  else r = innermost(sys, t, strategy === 'rightmost-innermost');
  if (!r) return null;
  return { before: t, after: contract(t, r), redexes: [r] };
}

export interface NormalizeResult {
  term: Term;
  /** The steps taken (at most `keepSteps` of them are kept). */
  steps: Step[];
  /** How many steps were taken. */
  count: number;
  /** False when the fuel ran out before a normal form was reached. */
  normal: boolean;
}

/** Rewrite until no strategy step applies, or `fuel` steps have been taken. */
export function normalize(sys: RewriteSystem, t: Term, opts: { strategy?: Strategy; fuel?: number; seed?: number; keepSteps?: number } = {}): NormalizeResult {
  const { strategy = 'innermost', fuel = 10_000, keepSteps = 2_000 } = opts;
  const random = rng(opts.seed ?? 1);
  const steps: Step[] = [];
  let cur = t;
  for (let i = 0; i < fuel; i++) {
    const s = step(sys, cur, strategy, random);
    if (!s) return { term: cur, steps, count: i, normal: true };
    if (steps.length < keepSteps) steps.push(s);
    cur = s.after;
  }
  return { term: cur, steps, count: fuel, normal: step(sys, cur, strategy, random) === null };
}

export const isNormalForm = (sys: RewriteSystem, t: Term): boolean => redexes(sys, t).length === 0;

/** Every one-step reduct of `t` (all redexes, all rules). */
export function reducts(sys: RewriteSystem, t: Term): { redex: Redex; term: Term }[] {
  return redexes(sys, t).map((r) => ({ redex: r, term: contract(t, r) }));
}

export interface ReductionGraph {
  nodes: Term[];
  /** Edges between node indices, with the redex contracted. */
  edges: { from: number; to: number; redex: Redex }[];
  /** True when the exploration stopped at the node limit. */
  truncated: boolean;
}

/** Explore all reducts breadth-first (up to `limit` distinct terms). */
export function reductionGraph(sys: RewriteSystem, t: Term, limit = 60): ReductionGraph {
  const nodes: Term[] = [t];
  const index = new Map<string, number>([[key(t), 0]]);
  const edges: ReductionGraph['edges'] = [];
  let truncated = false;
  for (let i = 0; i < nodes.length; i++) {
    for (const { redex, term } of reducts(sys, nodes[i]!)) {
      const k = key(term);
      let j = index.get(k);
      if (j === undefined) {
        if (nodes.length >= limit) {
          truncated = true;
          continue;
        }
        j = nodes.length;
        nodes.push(term);
        index.set(k, j);
      }
      edges.push({ from: i, to: j, redex });
    }
  }
  return { nodes, edges, truncated };
}

// ───────────── the fast evaluator ─────────────

export interface EvalResult {
  term: Term;
  /** Number of rule applications and built-ins. */
  steps: number;
  normal: boolean;
}

class OutOfFuel extends Error {}

/**
 * Innermost evaluation, recursively: evaluate the (non-lazy) arguments, then try the rules at the
 * root. Frozen terms are forced when a rule needs to see inside them. This is Girafe's semantics,
 * and it computes the same normal form as `normalize(…, 'innermost')`, much faster.
 */
export function evaluate(sys: RewriteSystem, t: Term, opts: { fuel?: number; depth?: number } = {}): EvalResult {
  const budget = { left: opts.fuel ?? 1_000_000 };
  const maxDepth = opts.depth ?? 20_000;
  const byHead = new Map<string, { rule: Rule; index: number }[]>();
  sys.rules.forEach((rule, index) => {
    if (rule.lhs.type !== 'fn') return;
    const list = byHead.get(rule.lhs.name) ?? [];
    list.push({ rule, index });
    byHead.set(rule.lhs.name, list);
  });
  let steps = 0;
  let depth = 0;

  const force = (u: Term): Term => (u.type === 'fn' && u.name === '?' && u.args.length === 1 ? norm(u.args[0]!) : u);

  // Match, forcing frozen subterms where the pattern needs a symbol. Mutates the term's arg array copies.
  const matchForce = (p: Term, u: Term, sigma: Map<string, Term>): Term | null => {
    if (p.type === 'var') {
      const b = sigma.get(p.name);
      if (b === undefined) {
        sigma.set(p.name, u);
        return u;
      }
      return equal(b, u) ? u : null;
    }
    if (u.type === 'fn' && u.name === '?' && p.name !== '?') u = force(u);
    if (u.type === 'var' || u.name !== p.name || u.args.length !== p.args.length) return null;
    let args: Term[] | null = null;
    for (let i = 0; i < p.args.length; i++) {
      const a = matchForce(p.args[i]!, u.args[i]!, sigma);
      if (!a) return null;
      if (a !== u.args[i]) (args ??= u.args.slice())[i] = a;
    }
    return args ? f(u.name, ...args) : u;
  };

  const norm = (u: Term): Term => {
    for (;;) {
      if (u.type === 'var' || u.name === '?') return u;
      if (++depth > maxDepth) {
        depth--;
        throw new RangeError('evaluation is too deep (is the system non-terminating?)');
      }
      try {
        let args: Term[] | null = null;
        for (let i = 0; i < u.args.length; i++) {
          if (isLazyArg(sys, u.name, i)) continue;
          const a = norm(u.args[i]!);
          if (a !== u.args[i]) (args ??= u.args.slice())[i] = a;
        }
        if (args) u = f(u.name, ...args);
        const b = builtin(u);
        if (b) {
          if (--budget.left < 0) throw new OutOfFuel();
          steps++;
          u = b.result;
          continue;
        }
        const candidates = byHead.get(u.name);
        let next: Term | null = null;
        if (candidates) {
          for (const { rule } of candidates) {
            if ((rule.lhs as Fn).args.length !== u.args.length) continue;
            const sigma = new Map<string, Term>();
            const forced = matchForce(rule.lhs, u, sigma);
            if (!forced) continue;
            u = forced as Fn;
            if (!conditionsHold(sys, rule.conditions, sigma)) continue;
            if (--budget.left < 0) throw new OutOfFuel();
            steps++;
            next = apply(sigma, rule.rhs);
            break;
          }
        }
        if (!next) {
          // Lazy arguments are evaluated once nothing else applies.
          let lazyArgs: Term[] | null = null;
          for (let i = 0; i < u.args.length; i++) {
            if (!isLazyArg(sys, u.name, i)) continue;
            const a = norm(force(u.args[i]!));
            if (a !== u.args[i]) (lazyArgs ??= u.args.slice())[i] = a;
          }
          if (lazyArgs) {
            u = f(u.name, ...lazyArgs);
            continue;
          }
          return u;
        }
        u = next;
      } finally {
        depth--;
      }
    }
  };

  try {
    const term = norm(t);
    return { term, steps, normal: true };
  } catch (e) {
    if (e instanceof OutOfFuel) return { term: t, steps, normal: false };
    throw e;
  }
}

/** Remove every lazy marker `t?` (for displaying final results). */
export function unfreeze(t: Term): Term {
  if (t.type === 'var') return t;
  if (t.name === '?' && t.args.length === 1) return unfreeze(t.args[0]!);
  return f(t.name, ...t.args.map(unfreeze));
}

/** Positions at which a step changed the term (for highlighting). */
export const changedPositions = (s: Step): Position[] => s.redexes.map((r) => r.pos);
export { isPrefix };

// ───────────── the reader's engine API ─────────────
// Small functions with simple signatures. Engine exercises implement exactly these, so that the
// reader's versions and the reference are interchangeable in `engine`.

/** Rewrite `t` at its root with the first rule (in order) whose left-hand side matches, or return null. */
export function rootRewrite(rules: readonly Rule[], t: Term): Term | null {
  for (const r of rules) {
    const sigma = new Map<string, Term>();
    if (matchInto(r.lhs, t, sigma)) return apply(sigma, r.rhs);
  }
  return null;
}

/** Every one-step reduct of `t`: positions in pre-order, and at each position the rules in order. */
export function allReducts(rules: readonly Rule[], t: Term): Term[] {
  const out: Term[] = [];
  const go = (u: Term, p: number[]) => {
    for (const r of rules) {
      const sigma = new Map<string, Term>();
      if (matchInto(r.lhs, u, sigma)) out.push(replaceAt(t, p, apply(sigma, r.rhs)));
    }
    if (u.type === 'fn') u.args.forEach((a, i) => go(a, [...p, i]));
  };
  go(t, []);
  return out;
}

/** The leftmost-innermost normal form (rules tried in order at each position). Throws after `fuel` steps. */
export function normalizeInnermost(rules: readonly Rule[], t: Term, fuel = 100_000): Term {
  const budget = { left: fuel };
  const go = (u: Term): Term => {
    for (;;) {
      if (u.type === 'var') return u;
      const args = u.args.map(go);
      u = f(u.name, ...args);
      const next = rootRewrite(rules, u);
      if (next === null) return u;
      if (--budget.left < 0) throw new RangeError('no normal form within the fuel');
      u = next;
    }
  };
  return go(t);
}

/** One leftmost-outermost step, or null at a normal form. */
export function outermostStep(rules: readonly Rule[], t: Term): Term | null {
  const here = rootRewrite(rules, t);
  if (here !== null) return here;
  if (t.type === 'var') return null;
  for (let i = 0; i < t.args.length; i++) {
    const r = outermostStep(rules, t.args[i]!);
    if (r !== null) return f(t.name, ...t.args.slice(0, i), r, ...t.args.slice(i + 1));
  }
  return null;
}

/** The leftmost-outermost normal form. Throws after `fuel` steps. */
export function normalizeOutermost(rules: readonly Rule[], t: Term, fuel = 100_000): Term {
  let cur = t;
  for (let i = 0; i < fuel; i++) {
    const next = outermostStep(rules, cur);
    if (next === null) return cur;
    cur = next;
  }
  throw new RangeError('no normal form within the fuel');
}
