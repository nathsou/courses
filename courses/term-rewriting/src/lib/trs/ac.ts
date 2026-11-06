/**
 * Rewriting modulo associativity and commutativity (AC).
 *
 * Terms are kept flattened and sorted: `+(a, +(c, b))` becomes the variadic `+(a, b, c)`. Two terms
 * are AC-equal exactly when their flattened forms are syntactically equal. AC matching treats the
 * arguments of an AC symbol as a multiset; a pattern variable under an AC symbol can take several
 * of them at once.
 */
import type { Rule } from './parse';
import { apply, equal, f, key, type Fn, type Subst, type Term } from './term';
import { builtin } from './rewrite';

export type ACSymbols = ReadonlySet<string>;

const cmp = (a: Term, b: Term) => {
  const ka = key(a), kb = key(b);
  return ka < kb ? -1 : ka > kb ? 1 : 0;
};

/** Flatten nested AC symbols and sort their arguments. */
export function flatten(t: Term, ac: ACSymbols): Term {
  if (t.type === 'var') return t;
  const args = t.args.map((a) => flatten(a, ac));
  if (!ac.has(t.name)) return f(t.name, ...args);
  const flat: Term[] = [];
  for (const a of args) {
    if (a.type === 'fn' && a.name === t.name) flat.push(...a.args);
    else flat.push(a);
  }
  if (flat.length === 1) return flat[0]!;
  flat.sort(cmp);
  return f(t.name, ...flat);
}

/** Turn a flattened term back into binary applications (right-nested), for printing. */
export function unflatten(t: Term, ac: ACSymbols): Term {
  if (t.type === 'var') return t;
  const args = t.args.map((a) => unflatten(a, ac));
  if (!ac.has(t.name) || args.length <= 2) return f(t.name, ...args);
  return args.slice(0, -1).reduceRight<Term>((acc, a) => f(t.name, a, acc), args.at(-1)!);
}

export const acEqual = (s: Term, t: Term, ac: ACSymbols): boolean => equal(flatten(s, ac), flatten(t, ac));

/** Build an AC term from parts (flattening one level and sorting). */
function rebuild(name: string, parts: Term[], ac: ACSymbols): Term {
  return flatten(f(name, ...parts), ac);
}

/** All ways to split `items` into `k` non-empty groups (order of groups matters). */
function* distributions<T>(items: T[], k: number): Generator<T[][]> {
  if (k === 0) {
    if (items.length === 0) yield [];
    return;
  }
  if (items.length < k) return;
  // Choose a non-empty subset for the first group (by bitmask), recurse on the rest.
  const n = items.length;
  for (let mask = 1; mask < 1 << n; mask++) {
    const group: T[] = [], rest: T[] = [];
    for (let i = 0; i < n; i++) ((mask >> i) & 1 ? group : rest).push(items[i]!);
    if (rest.length < k - 1) continue;
    for (const d of distributions(rest, k - 1)) yield [group, ...d];
  }
}

export interface ACMatch {
  sigma: Subst;
  /** Arguments of the subject's AC root left over (extension match only). */
  rest: Term[];
}

/**
 * All AC matches of a (flattened) pattern against a (flattened) subject. With `extend`, a pattern
 * with an AC root may match just part of the subject's arguments; the others are returned in `rest`.
 */
export function* acMatch(p: Term, t: Term, ac: ACSymbols, sigma: Subst = new Map(), extend = false): Generator<ACMatch> {
  if (p.type === 'var') {
    const b = sigma.get(p.name);
    if (b === undefined) yield { sigma: new Map(sigma).set(p.name, t), rest: [] };
    else if (equal(b, t)) yield { sigma, rest: [] };
    return;
  }
  if (t.type === 'var' || t.name !== p.name) return;
  if (!ac.has(p.name)) {
    if (p.args.length !== t.args.length) return;
    yield* argsMatch(p.args, t.args, 0, ac, sigma);
    return;
  }
  // AC root: match the multiset of arguments.
  const fixed = p.args.filter((a) => a.type === 'fn');
  const varArgs = p.args.filter((a) => a.type === 'var').map((a) => (a as { name: string }).name);
  const subject = t.args.slice();
  function* matchFixed(i: number, remaining: Term[], s: Subst): Generator<ACMatch> {
    if (i === fixed.length) {
      yield* matchVars(0, remaining, s);
      return;
    }
    const tried = new Set<string>();
    for (let j = 0; j < remaining.length; j++) {
      const k = key(remaining[j]!);
      if (tried.has(k)) continue;
      tried.add(k);
      const rest = [...remaining.slice(0, j), ...remaining.slice(j + 1)];
      for (const m of acMatch(fixed[i]!, remaining[j]!, ac, s)) yield* matchFixed(i + 1, rest, m.sigma);
    }
  }
  function* matchVars(i: number, remaining: Term[], s: Subst): Generator<ACMatch> {
    // Bound variables first: remove their value from the remaining arguments.
    const unbound: string[] = [];
    const rem = remaining.slice();
    for (const x of varArgs.slice(i)) {
      const b = s.get(x);
      if (b === undefined) {
        unbound.push(x);
        continue;
      }
      const parts = b.type === 'fn' && b.name === p.name ? b.args : [b];
      for (const part of parts) {
        const j = rem.findIndex((r) => equal(r, part));
        if (j < 0) return;
        rem.splice(j, 1);
      }
    }
    const uniq = [...new Set(unbound)];
    if (uniq.length === 0) {
      if (rem.length === 0) yield { sigma: s, rest: [] };
      else if (extend) yield { sigma: s, rest: rem };
      return;
    }
    // With extension, some arguments may be left over: choose which ones participate.
    const choices: { used: Term[]; rest: Term[] }[] = [];
    if (extend) {
      const n = rem.length;
      for (let mask = 0; mask < 1 << n; mask++) {
        const used: Term[] = [], rest: Term[] = [];
        for (let b2 = 0; b2 < n; b2++) ((mask >> b2) & 1 ? used : rest).push(rem[b2]!);
        if (used.length >= uniq.length) choices.push({ used, rest });
      }
    } else choices.push({ used: rem, rest: [] });
    const counts = new Map<string, number>();
    for (const x of unbound) counts.set(x, (counts.get(x) ?? 0) + 1);
    for (const { used, rest } of choices) {
      for (const d of distributions(used, uniq.length)) {
        const s2 = new Map(s);
        let ok = true;
        uniq.forEach((x, k) => {
          let group = d[k]!;
          const c = counts.get(x) ?? 1;
          if (c > 1) {
            // x occurs c times: the group must be c copies of one multiset.
            const byKey = new Map<string, { t: Term; n: number }>();
            for (const g of group) {
              const e = byKey.get(key(g)) ?? { t: g, n: 0 };
              e.n++;
              byKey.set(key(g), e);
            }
            if ([...byKey.values()].some((e) => e.n % c !== 0)) {
              ok = false;
              return;
            }
            group = [...byKey.values()].flatMap((e) => Array.from({ length: e.n / c }, () => e.t));
          }
          s2.set(x, group.length === 1 ? group[0]! : rebuild(p.name, group, ac));
        });
        if (ok) yield { sigma: s2, rest };
      }
    }
  }
  if (!extend && subject.length < p.args.length) return;
  yield* matchFixed(0, subject, sigma);
}

function* argsMatch(ps: readonly Term[], ts: readonly Term[], i: number, ac: ACSymbols, sigma: Subst): Generator<ACMatch> {
  if (i === ps.length) {
    yield { sigma, rest: [] };
    return;
  }
  for (const m of acMatch(ps[i]!, ts[i]!, ac, sigma)) yield* argsMatch(ps, ts, i + 1, ac, m.sigma);
}

/** Instantiate and re-flatten. */
export const acApply = (sigma: Subst, t: Term, ac: ACSymbols): Term => flatten(apply(sigma, t), ac);

export interface ACSystem {
  rules: readonly Rule[];
  ac: ACSymbols;
}

const flatRules = (sys: ACSystem) => sys.rules.map((r) => ({ lhs: flatten(r.lhs, sys.ac), rhs: r.rhs }));

/** Rewrite at the root modulo AC, if some rule applies. */
export function acRootStep(sys: ACSystem, t: Term, rules = flatRules(sys)): Term | null {
  if (t.type === 'var') return null;
  const b = builtin(t);
  if (b) return flatten(b.result, sys.ac);
  for (const r of rules) {
    if (r.lhs.type !== 'fn' || r.lhs.name !== t.name) continue;
    for (const m of acMatch(r.lhs, t, sys.ac, new Map(), sys.ac.has(t.name))) {
      const out = acApply(m.sigma, r.rhs, sys.ac);
      return m.rest.length ? rebuild(t.name, [out, ...m.rest], sys.ac) : out;
    }
  }
  return null;
}

/** Innermost normalisation modulo AC. Returns the flattened normal form. */
export function acNormalize(sys: ACSystem, t: Term, fuel = 20_000): { term: Term; steps: number; normal: boolean } {
  const rules = flatRules(sys);
  let steps = 0;
  const go = (u: Term): Term => {
    for (;;) {
      if (u.type === 'var') return u;
      u = flatten(f(u.name, ...u.args.map(go)), sys.ac);
      if (u.type === 'var') return u;
      const next = acRootStep(sys, u, rules);
      if (!next) return u;
      if (++steps > fuel) throw new RangeError('out of fuel');
      u = next;
    }
  };
  try {
    return { term: go(flatten(t, sys.ac)), steps, normal: true };
  } catch (e) {
    if (e instanceof RangeError) return { term: t, steps, normal: false };
    throw e;
  }
}

/** Every one-step AC rewrite of `t` (all positions, all rules, all matches), deduplicated. */
export function acReducts(sys: ACSystem, t: Term, limit = 200): { term: Term; rule: number }[] {
  const rules = flatRules(sys);
  const out = new Map<string, { term: Term; rule: number }>();
  const add = (u: Term, rule: number) => {
    const fl = flatten(u, sys.ac);
    if (out.size < limit && !out.has(key(fl))) out.set(key(fl), { term: fl, rule });
  };
  const go = (u: Term, wrap: (x: Term) => Term) => {
    if (u.type === 'var') return;
    rules.forEach((r, i) => {
      if (r.lhs.type !== 'fn' || r.lhs.name !== u.name) return;
      for (const m of acMatch(r.lhs, u, sys.ac, new Map(), sys.ac.has(u.name))) {
        const res = acApply(m.sigma, r.rhs, sys.ac);
        add(wrap(m.rest.length ? rebuild(u.name, [res, ...m.rest], sys.ac) : res), i);
      }
    });
    (u as Fn).args.forEach((a, i) => go(a, (x) => wrap(f(u.name, ...u.args.slice(0, i), x, ...u.args.slice(i + 1)))));
  };
  go(flatten(t, sys.ac), (x) => x);
  return [...out.values()];
}

export interface SearchResult {
  found: Term | null;
  /** Path from the start to the found state. */
  path: Term[];
  explored: number;
  /** True when the whole reachable space was explored. */
  exhausted: boolean;
}

/** Breadth-first search for a reachable state matching `goal` (Maude's `search … =>* …`). */
export function searchStates(sys: ACSystem, start: Term, goal: (t: Term) => boolean, maxStates = 5000): SearchResult {
  const s0 = flatten(start, sys.ac);
  const parent = new Map<string, string | null>([[key(s0), null]]);
  const terms = new Map<string, Term>([[key(s0), s0]]);
  const queue = [s0];
  let explored = 0;
  while (queue.length) {
    const t = queue.shift()!;
    explored++;
    if (goal(t)) {
      const path: Term[] = [];
      let k: string | null = key(t);
      while (k) {
        path.unshift(terms.get(k)!);
        k = parent.get(k)!;
      }
      return { found: t, path, explored, exhausted: false };
    }
    if (terms.size >= maxStates) continue;
    for (const { term } of acReducts(sys, t)) {
      const k = key(term);
      if (parent.has(k)) continue;
      parent.set(k, key(t));
      terms.set(k, term);
      queue.push(term);
    }
  }
  return { found: null, path: [], explored, exhausted: terms.size < maxStates };
}

/** A goal predicate from a pattern (AC matching, with extension for AC roots). */
export function goalPattern(pattern: Term, ac: ACSymbols): (t: Term) => boolean {
  const p = flatten(pattern, ac);
  return (t) => {
    for (const _ of acMatch(p, t, ac, new Map(), p.type === 'fn' && ac.has(p.name))) return true;
    return false;
  };
}
