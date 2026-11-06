/**
 * Knuth–Bendix completion and unfailing (ordered) completion, with a log of inference steps.
 */
import type { Equation, Rule } from './parse';
import { apply, equal, f, fnPositions, at, replaceAt, show, size, vars, type Term } from './term';
import { matchInto } from './match';
import { renameApartAll, unify, variant } from './unify';
import type { Order } from './orders';

export type CompletionRule = 'orient' | 'delete' | 'simplify' | 'compose' | 'collapse' | 'deduce' | 'fail';

export interface CompletionStep {
  rule: CompletionRule;
  note: string;
  E: [Term, Term][];
  R: [Term, Term][];
}

export interface CompletionResult {
  status: 'success' | 'failed' | 'gave up';
  rules: Rule[];
  steps: CompletionStep[];
  /** The equation that could not be oriented, when the status is `failed`. */
  stuck?: [Term, Term];
}

type Pair = [Term, Term];

/** Rewrite `t` to normal form with rules (innermost, syntactic). */
export function normalizeWith(R: readonly Pair[], t: Term, fuel = { left: 100_000 }): Term {
  const go = (u: Term): Term => {
    for (;;) {
      if (u.type === 'var') return u;
      let changed = false;
      const args = u.args.map((a) => {
        const b = go(a);
        if (b !== a) changed = true;
        return b;
      });
      if (changed) u = f(u.name, ...args);
      let next: Term | null = null;
      for (const [l, r] of R) {
        const s = new Map<string, Term>();
        if (matchInto(l, u, s)) {
          next = apply(s, r);
          break;
        }
      }
      if (!next) return u;
      if (--fuel.left < 0) throw new RangeError('normalisation did not terminate');
      u = next;
    }
  };
  return go(t);
}

/** Does some rule rewrite `t` (anywhere)? */
function reducible(R: readonly Pair[], t: Term): boolean {
  for (const p of fnPositions(t)) {
    const u = at(t, p);
    for (const [l] of R) if (matchInto(l, u, new Map())) return true;
  }
  return false;
}

/** Critical pairs between two oriented pairs (the inner one renamed apart). */
export function overlaps(outer: Pair, inner0: Pair, sameRule: boolean): Pair[] {
  const [l1, r1] = outer;
  const [l2, r2] = renameApartAll(inner0, [...vars(l1), ...vars(r1)]) as [Term, Term];
  const out: Pair[] = [];
  for (const p of fnPositions(l1)) {
    if (sameRule && p.length === 0) continue;
    const mgu = unify(at(l1, p), l2);
    if (!mgu) continue;
    out.push([apply(mgu, replaceAt(l1, p, r2)), apply(mgu, r1)]);
  }
  return out;
}

const pairSize = ([a, b]: Pair) => size(a) + size(b);

const NAMES = ['x', 'y', 'z', 'u', 'v', 'w'];
/** Rename a pair's variables to x, y, z, … in order of first occurrence (rules are independent of their variable names). */
export function canonical([a, b]: Pair): Pair {
  const map = new Map<string, string>();
  for (const x of [...vars(a), ...vars(b)]) if (!map.has(x)) map.set(x, NAMES[map.size] ?? `x${map.size + 1}`);
  const ren = (t: Term): Term => (t.type === 'var' ? { type: 'var', name: map.get(t.name)! } : f(t.name, ...t.args.map(ren)));
  return [ren(a), ren(b)];
}
const showPair = ([a, b]: Pair, sep: string) => `${show(a)} ${sep} ${show(b)}`;

/**
 * Knuth–Bendix completion (Huet's strategy): orient equations with `gt`, keep the rules
 * inter-reduced, and add critical pairs of each rule once. Fails if an equation cannot be oriented.
 */
export function complete(equations: readonly (Equation | Pair)[], gt: Order, opts: { maxSteps?: number; maxRules?: number; log?: boolean; timeMs?: number } = {}): CompletionResult {
  const { maxSteps = 2000, maxRules = 60, log = true, timeMs = 4000 } = opts;
  const deadline = Date.now() + timeMs;
  let E: Pair[] = equations.map((e) => (Array.isArray(e) ? [e[0], e[1]] : [e.left, e.right]) as Pair);
  let R: { pair: Pair; marked: boolean }[] = [];
  const steps: CompletionStep[] = [];
  const snap = (rule: CompletionRule, note: string) => {
    if (log) steps.push({ rule, note, E: E.map((e) => [e[0], e[1]]), R: R.map((r) => [r.pair[0], r.pair[1]]) });
  };
  const rules = () => R.map((r) => r.pair);
  let count = 0;
  for (;;) {
    if (++count > maxSteps || R.length > maxRules || Date.now() > deadline) return { status: 'gave up', rules: toRules(rules()), steps };
    if (E.length) {
      // Pick the smallest equation.
      E.sort((a, b) => pairSize(a) - pairSize(b));
      const [s0, t0] = E.shift()!;
      let s: Term, t: Term;
      try {
        s = normalizeWith(rules(), s0);
        t = normalizeWith(rules(), t0);
      } catch {
        return { status: 'gave up', rules: toRules(rules()), steps };
      }
      if (!equal(s, s0) || !equal(t, t0)) snap('simplify', `${showPair([s0, t0], '=')} simplifies to ${showPair([s, t], '=')}`);
      if (equal(s, t)) {
        snap('delete', `${show(s)} = ${show(t)} is trivial`);
        continue;
      }
      let rule: Pair;
      if (gt(s, t)) rule = canonical([s, t]);
      else if (gt(t, s)) rule = canonical([t, s]);
      else {
        E.unshift([s, t]);
        snap('fail', `cannot orient ${showPair([s, t], '=')}`);
        return { status: 'failed', rules: toRules(rules()), steps, stuck: [s, t] };
      }
      const newRules: typeof R = [];
      const single: Pair[] = [rule];
      for (const r of R) {
        const [g, d] = r.pair;
        if (reducible(single, g)) {
          E.push([g, d]);
          snap('collapse', `${showPair(r.pair, '→')} has a left-hand side that ${showPair(rule, '→')} rewrites; it becomes an equation again`);
        } else {
          const d2 = normalizeWith([...rules(), rule], d);
          if (!equal(d, d2)) snap('compose', `${showPair(r.pair, '→')} becomes ${showPair([g, d2], '→')}`);
          newRules.push({ pair: [g, d2], marked: r.marked });
        }
      }
      R = [...newRules, { pair: rule, marked: false }];
      snap('orient', `orient ${showPair(rule, '→')}`);
      continue;
    }
    const next = R.filter((r) => !r.marked).sort((a, b) => pairSize(a.pair) - pairSize(b.pair))[0];
    if (!next) {
      snap('delete', 'no equations left and every critical pair has been computed: the rules are convergent');
      return { status: 'success', rules: toRules(rules()), steps };
    }
    next.marked = true;
    const cps: Pair[] = [];
    for (const r of R) {
      if (!r.marked) continue;
      cps.push(...overlaps(next.pair, r.pair, r === next));
      if (r !== next) cps.push(...overlaps(r.pair, next.pair, false));
    }
    E.push(...cps);
    snap('deduce', `${cps.length} critical pair${cps.length === 1 ? '' : 's'} of ${showPair(next.pair, '→')} with the processed rules`);
  }
}

const toRules = (R: readonly Pair[]): Rule[] => R.map(([lhs, rhs]) => ({ lhs, rhs }));

// ───────────── unfailing completion ─────────────

/** Ordered rewriting: rules always apply; an equation applies in whichever direction decreases the instance. */
export function orderedNormalize(R: readonly Pair[], E: readonly Pair[], gt: Order, t: Term, fuel = { left: 20_000 }): Term {
  const go = (u: Term): Term => {
    for (;;) {
      if (u.type === 'var') return u;
      let changed = false;
      const args = u.args.map((a) => {
        const b = go(a);
        if (b !== a) changed = true;
        return b;
      });
      if (changed) u = f(u.name, ...args);
      let next: Term | null = null;
      for (const [l, r] of R) {
        const s = new Map<string, Term>();
        if (matchInto(l, u, s)) {
          next = apply(s, r);
          break;
        }
      }
      if (!next)
        outer: for (const [a, b] of E)
          for (const [l, r] of [
            [a, b],
            [b, a],
          ] as const) {
            const s = new Map<string, Term>();
            if (!matchInto(l, u, s)) continue;
            const rr = apply(s, r);
            if (gt(u, rr)) {
              next = rr;
              break outer;
            }
          }
      if (!next) return u;
      if (--fuel.left < 0) throw new RangeError('ordered rewriting did not terminate');
      u = next;
    }
  };
  return go(t);
}

export interface ProofResult {
  status: 'proved' | 'disproved' | 'gave up';
  /** The goal sides after rewriting. */
  goal: [Term, Term];
  rules: Rule[];
  equations: [Term, Term][];
  iterations: number;
}

/** Replace the variables of a goal by fresh constants (Skolemisation of ∀x. s = t). */
export function skolemize(t: Term, names = new Map<string, string>()): Term {
  if (t.type === 'var') {
    if (!names.has(t.name)) names.set(t.name, `$${t.name}`);
    return f(names.get(t.name)!);
  }
  return f(t.name, ...t.args.map((a) => skolemize(a, names)));
}

/**
 * Prove an equation from axioms by unfailing completion: saturate the axioms, using unorientable
 * equations for ordered rewriting, until the goal's two sides rewrite to the same term.
 * `gt` should be total on ground terms (e.g. LPO with a total precedence that includes the Skolem constants).
 */
export function prove(axioms: readonly (Equation | Pair)[], goal: Pair, gt: Order, opts: { maxIterations?: number; maxSize?: number; timeMs?: number } = {}): ProofResult {
  const { maxIterations = 400, maxSize = 40, timeMs = 5000 } = opts;
  const deadline = Date.now() + timeMs;
  const names = new Map<string, string>();
  const g: Pair = [skolemize(goal[0], names), skolemize(goal[1], names)];
  let R: Pair[] = [];
  let Eq: Pair[] = [];
  const passive: Pair[] = axioms.map((e) => (Array.isArray(e) ? [e[0], e[1]] : [e.left, e.right]) as Pair);
  const known = (p: Pair) => [...R, ...Eq].some((q) => (variant(q[0], p[0]) && variant(q[1], p[1])) || (variant(q[0], p[1]) && variant(q[1], p[0])));
  const goalNow = (): [Term, Term] => [orderedNormalize(R, Eq, gt, g[0]), orderedNormalize(R, Eq, gt, g[1])];
  let iterations = 0;
  let discarded = false;
  try {
    while (iterations++ < maxIterations && Date.now() < deadline) {
      const cur = goalNow();
      if (equal(cur[0], cur[1])) return { status: 'proved', goal: cur, rules: toRules(R), equations: Eq, iterations };
      // Saturated: if nothing was discarded, the goal is not a consequence of the axioms.
      if (!passive.length) return { status: discarded ? 'gave up' : 'disproved', goal: cur, rules: toRules(R), equations: Eq, iterations };
      passive.sort((a, b) => pairSize(a) - pairSize(b));
      const [s0, t0] = passive.shift()!;
      const s = orderedNormalize(R, Eq, gt, s0), t = orderedNormalize(R, Eq, gt, t0);
      if (equal(s, t)) continue;
      if (pairSize([s, t]) > maxSize) {
        discarded = true;
        continue;
      }
      const p: Pair = canonical(gt(s, t) ? [s, t] : gt(t, s) ? [t, s] : [s, t]);
      if (known(p)) continue;
      const oriented = gt(p[0], p[1]);
      // Interreduce: rules and equations whose sides the new one rewrites go back to passive.
      const keepR: Pair[] = [], keepE: Pair[] = [];
      const single = oriented ? [p] : [];
      for (const r of R) (oriented && reducible(single, r[0]) ? passive : keepR).push(r);
      for (const e of Eq) (oriented && (reducible(single, e[0]) || reducible(single, e[1])) ? passive : keepE).push(e);
      R = keepR;
      Eq = keepE;
      if (oriented) R.push(p);
      else Eq.push(p);
      // Critical pairs with everything active (equations in both directions).
      const active: Pair[] = [...R, ...Eq, ...Eq.map(([a, b]) => [b, a] as Pair)];
      const mine: Pair[] = oriented ? [p] : [p, [p[1], p[0]]];
      for (const a of mine)
        for (const b of active) {
          passive.push(...overlaps(a, b, a === b));
          if (a !== b) passive.push(...overlaps(b, a, false));
        }
    }
  } catch {
    return { status: 'gave up', goal: g, rules: toRules(R), equations: Eq, iterations };
  }
  return { status: 'gave up', goal: goalNow(), rules: toRules(R), equations: Eq, iterations };
}
