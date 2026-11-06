/**
 * Syntactic unification (Martelli and Montanari's rules), with an optional trace for the stepper.
 */
import { apply, compose, equal, occurs, renameVars, show, vars, type Subst, type Term } from './term';

export type UnifyRule = 'delete' | 'decompose' | 'orient' | 'eliminate' | 'clash' | 'occurs';

export interface UnifyStep {
  rule: UnifyRule;
  /** The equation the rule acted on. */
  eq: [Term, Term];
  /** The unsolved equations after the step. */
  problem: [Term, Term][];
  /** The solved part after the step. */
  solved: Subst;
  note: string;
}

/**
 * A most general unifier of the pairs, or `null`. The result is idempotent: no variable it binds
 * occurs in the terms it binds to.
 */
export function unifyAll(pairs: readonly (readonly [Term, Term])[], trace?: UnifyStep[]): Subst | null {
  let problem: [Term, Term][] = pairs.map(([a, b]) => [a, b]);
  let solved: Subst = new Map();
  const log = (rule: UnifyRule, eq: [Term, Term], note: string) => trace?.push({ rule, eq, problem: problem.slice(), solved: new Map(solved), note });
  while (problem.length) {
    const eq = problem.shift()!;
    const [s, t] = eq;
    if (equal(s, t)) {
      log('delete', eq, 'both sides are equal');
      continue;
    }
    if (s.type === 'fn' && t.type === 'fn') {
      if (s.name !== t.name || s.args.length !== t.args.length) {
        problem.unshift(eq);
        log('clash', eq, `${s.name} ≠ ${t.name}: no unifier`);
        return null;
      }
      problem = [...s.args.map((a, i): [Term, Term] => [a, t.args[i]!]), ...problem];
      log('decompose', eq, `same symbol ${s.name}: unify the arguments pairwise`);
      continue;
    }
    if (s.type === 'fn' && t.type === 'var') {
      problem.unshift([t, s]);
      log('orient', eq, 'put the variable on the left');
      continue;
    }
    // s is a variable.
    const x = s.type === 'var' ? s.name : '';
    if (occurs(x, t)) {
      problem.unshift(eq);
      log('occurs', eq, `${x} occurs in ${show(t)}: no finite unifier`);
      return null;
    }
    const bind: Subst = new Map([[x, t]]);
    problem = problem.map(([a, b]) => [apply(bind, a), apply(bind, b)]);
    solved = compose(bind, solved);
    log('eliminate', eq, `bind ${x} ↦ ${show(t)} and substitute it everywhere`);
  }
  return solved;
}

export const unify = (s: Term, t: Term, trace?: UnifyStep[]): Subst | null => unifyAll([[s, t]], trace);
export const unifiable = (s: Term, t: Term): boolean => unify(s, t) !== null;

/** Rename the variables of `t` apart from those in `avoid` by adding primes. */
export function renameApart(t: Term, avoid: Iterable<string>, suffix = "'"): Term {
  const taken = new Set(avoid);
  const map = new Map<string, string>();
  for (const x of vars(t)) {
    let y = x;
    while (taken.has(y)) y += suffix;
    map.set(x, y);
    taken.add(y);
  }
  return renameVars(t, (x) => map.get(x) ?? x);
}

/** Fresh-variable renaming of a list of terms that share variables (e.g. both sides of a rule). */
export function renameApartAll(ts: readonly Term[], avoid: Iterable<string>, suffix = "'"): Term[] {
  const taken = new Set(avoid);
  const map = new Map<string, string>();
  for (const t of ts)
    for (const x of vars(t)) {
      if (map.has(x)) continue;
      let y = x;
      while (taken.has(y)) y += suffix;
      map.set(x, y);
      taken.add(y);
    }
  return ts.map((t) => renameVars(t, (x) => map.get(x) ?? x));
}

/** Are two terms variants (equal up to a bijective renaming of variables)? */
export function variant(s: Term, t: Term): boolean {
  const m1 = new Map<string, string>(), m2 = new Map<string, string>();
  const go = (a: Term, b: Term): boolean => {
    if (a.type === 'var' && b.type === 'var') {
      const x = m1.get(a.name), y = m2.get(b.name);
      if (x === undefined && y === undefined) {
        m1.set(a.name, b.name);
        m2.set(b.name, a.name);
        return true;
      }
      return x === b.name && y === a.name;
    }
    if (a.type !== 'fn' || b.type !== 'fn' || a.name !== b.name || a.args.length !== b.args.length) return false;
    return a.args.every((x, i) => go(x, b.args[i]!));
  };
  return go(s, t);
}
