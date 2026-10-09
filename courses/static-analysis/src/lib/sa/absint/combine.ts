/**
 * Combining abstract domains (chapter 24): a parity analysis, the product of two analyses (each runs on its own,
 * a check is proven if either proves it), the reduced product of intervals and parity (each component tightens
 * the other after every step), and a bounded disjunctive domain, the simplest form of trace partitioning (facts
 * from different branches are kept apart instead of joined, up to a bound and except at loop heads).
 */
import type estree from 'estree';
import type { Cfg, CfgNode } from '../flow/cfg.js';
import type { Lattice } from '../flow/dataflow.js';
import { assertion, checksWith, type Check, type CheckingAnalysis } from './checks.js';
import { parity as P, type Parity } from './domains.js';
import { intervals, type IntervalEnv, type Interval } from './intervals.js';

// ---------------------------------------------------------------------------------------------------------------
// Parity

export type ParityEnv = Readonly<Record<string, Parity>>;
const parityBottom: ParityEnv = Object.freeze({});

/** Parity of `x % k`: the parity of `x` when `k` is even (x = qk + r with qk even), unknown otherwise. */
export function evalParity(e: estree.Node | null | undefined, env: ParityEnv): Parity {
  if (!e) return 'top';
  switch (e.type) {
    case 'Literal':
      return typeof e.value === 'number' && Number.isInteger(e.value) ? P.of(e.value) : 'top';
    case 'Identifier':
      return env[e.name] ?? 'top';
    case 'UnaryExpression':
      return e.operator === '-' || e.operator === '+' ? evalParity(e.argument, env) : 'top';
    case 'BinaryExpression': {
      const a = evalParity(e.left as estree.Node, env);
      const b = evalParity(e.right, env);
      if (a === 'bot' || b === 'bot') return 'bot';
      if (e.operator === '+' || e.operator === '-') return P.add(a, b);
      if (e.operator === '*') return P.mul(a, b);
      if (e.operator === '%' && e.right.type === 'Literal' && typeof e.right.value === 'number' && e.right.value % 2 === 0 && e.right.value !== 0) return a;
      return 'top';
    }
    default:
      return 'top';
  }
}

const isNum = (e: estree.Node, n?: number): e is estree.Literal => e.type === 'Literal' && typeof e.value === 'number' && (n === undefined || e.value === n);

/** `x % 2 === c` and `x % 2 !== c`, the idiom parity understands best. */
function moduloTwo(e: estree.Node): string | undefined {
  return e.type === 'BinaryExpression' && e.operator === '%' && e.left.type === 'Identifier' && isNum(e.right, 2) ? e.left.name : undefined;
}

export function refineParity(test: estree.Node, outcome: boolean, env: ParityEnv): ParityEnv {
  if (env === parityBottom) return env;
  if (test.type === 'UnaryExpression' && test.operator === '!') return refineParity(test.argument, !outcome, env);
  if (test.type === 'LogicalExpression') {
    if ((test.operator === '&&' && outcome) || (test.operator === '||' && !outcome)) return refineParity(test.right, outcome, refineParity(test.left, outcome, env));
    return env;
  }
  if (test.type !== 'BinaryExpression' || !['===', '==', '!==', '!='].includes(test.operator)) return env;
  const equal = test.operator.startsWith('=') === outcome;
  const set = (name: string, p: Parity): ParityEnv => {
    const next = P.meet(env[name] ?? 'top', p);
    return next === 'bot' ? parityBottom : { ...env, [name]: next };
  };
  const left = test.left as estree.Node;
  const right = test.right;
  // x % 2 === 0 / 1 (either side).
  for (const [m, c] of [[left, right], [right, left]] as const) {
    const x = moduloTwo(m);
    if (x && isNum(c) && (c.value === 0 || c.value === 1)) {
      const isEven = (c.value === 0) === equal;
      return set(x, isEven ? 'even' : 'odd');
    }
  }
  if (!equal) return env;
  let out = env;
  if (left.type === 'Identifier') out = set(left.name, evalParity(right, env));
  if (out !== parityBottom && right.type === 'Identifier') {
    const next = P.meet(out[right.name] ?? 'top', evalParity(left, out));
    out = next === 'bot' ? parityBottom : { ...out, [right.name]: next };
  }
  if (out !== parityBottom && P.meet(evalParity(left, out), evalParity(right, out)) === 'bot') return parityBottom;
  return out;
}

const formatEnv = <A>(env: Readonly<Record<string, A>>, cfg: Cfg, show: (a: A) => string, isTop: (a: A) => boolean) => {
  const known = cfg.variables.filter((v) => v in env && !isTop(env[v]!)).map((v) => `${v} ${show(env[v]!)}`);
  return known.join(', ') || '(nothing known)';
};

export const parityAnalysis: CheckingAnalysis<ParityEnv> = {
  name: 'Parity',
  direction: 'forward',
  lattice: {
    bottom: parityBottom,
    join: (a, b) => {
      if (a === parityBottom) return b;
      if (b === parityBottom) return a;
      const out: Record<string, Parity> = {};
      for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) out[k] = P.join(a[k] ?? 'bot', b[k] ?? 'bot');
      return out;
    },
    equal: (a, b) => (a === parityBottom) === (b === parityBottom) && [...new Set([...Object.keys(a), ...Object.keys(b)])].every((k) => a[k] === b[k]),
    format: (env, cfg) => (env === parityBottom ? '⊥ (unreachable)' : formatEnv(env, cfg, (p) => `is ${p}`, (p) => p === 'top')),
  },
  boundary: (cfg) => Object.fromEntries(cfg.params.map((p) => [p, 'top' as Parity])),
  transfer: (node, env) => {
    if (env === parityBottom || node.kind === 'entry') return env;
    const condition = assertion(node);
    if (condition) return refineParity(condition, true, env);
    if (!node.defs.length) return env;
    const out: Record<string, Parity> = { ...env };
    if (node.kind === 'assign' && node.value && node.defs.length === 1) out[node.defs[0]!] = evalParity(node.value, env);
    else for (const d of node.defs) out[d] = 'top';
    return out;
  },
  edge: (from, to, env) => {
    if (from.kind !== 'cond' || !from.test || from.succ.length !== 2 || from.succ[0] === from.succ[1]) return env;
    return refineParity(from.test, to === from.succ[0], env);
  },
  checks: (node, env, cfg) =>
    checksWith(
      {
        isBottom: (e) => e === parityBottom,
        // An odd number is never zero.
        divisor: (e, env) => {
          const p = evalParity(e, env);
          return { nonZero: p === 'odd' || p === 'bot', value: p === 'top' ? 'may be even or odd' : `is ${P.format(p)}` };
        },
        refine: (c, o, env) => refineParity(c, o, env),
      },
      node,
      env,
      cfg,
    ),
};

// ---------------------------------------------------------------------------------------------------------------
// Products

export type Pair<A, B> = { readonly a: A; readonly b: B } | null;

const isBot = <T>(l: Lattice<T>, x: T) => l.equal(x, l.bottom);

/**
 * The product of two analyses. With `reduce`, it is a reduced product: after every step, each component is
 * tightened with what the other knows.
 */
export function product<A, B>(A: CheckingAnalysis<A>, B: CheckingAnalysis<B>, options: { name?: string; reduce?: (a: A, b: B) => [A, B] } = {}): CheckingAnalysis<Pair<A, B>> {
  const make = (a: A, b: B): Pair<A, B> => {
    if (isBot(A.lattice, a) || isBot(B.lattice, b)) return null;
    if (!options.reduce) return { a, b };
    const [ra, rb] = options.reduce(a, b);
    return isBot(A.lattice, ra) || isBot(B.lattice, rb) ? null : { a: ra, b: rb };
  };
  return {
    name: options.name ?? `${A.name} × ${B.name}`,
    direction: 'forward',
    lattice: {
      bottom: null,
      join: (x, y) => (!x ? y : !y ? x : { a: A.lattice.join(x.a, y.a), b: B.lattice.join(x.b, y.b) }),
      equal: (x, y) => (!x || !y ? x === y : A.lattice.equal(x.a, y.a) && B.lattice.equal(x.b, y.b)),
      format: (x, cfg) => (!x ? '⊥ (unreachable)' : `${A.lattice.format(x.a, cfg)}; ${B.lattice.format(x.b, cfg)}`),
    },
    boundary: (cfg) => make(A.boundary(cfg), B.boundary(cfg)),
    transfer: (node, x, cfg) => {
      if (!x) return null;
      const input = make(x.a, x.b);
      return input && make(A.transfer(node, input.a, cfg), B.transfer(node, input.b, cfg));
    },
    edge: (from, to, x, cfg) => (x ? make(A.edge ? A.edge(from, to, x.a, cfg) : x.a, B.edge ? B.edge(from, to, x.b, cfg) : x.b) : null),
    // No reduction after widening: it could undo the widening and break termination.
    widen: (x, y) => (!x ? y : !y ? x : { a: A.widen ? A.widen(x.a, y.a) : A.lattice.join(x.a, y.a), b: B.widen ? B.widen(x.b, y.b) : B.lattice.join(x.b, y.b) }),
    narrow: (x, y) => (!x || !y ? y : { a: A.narrow ? A.narrow(x.a, y.a) : y.a, b: B.narrow ? B.narrow(x.b, y.b) : y.b }),
    checks: (node, x, cfg) => {
      if (!x) return [];
      const input = make(x.a, x.b);
      if (!input) return [];
      return mergeChecks([A.checks(node, input.a, cfg), B.checks(node, input.b, cfg)], 'any');
    },
  };
}

/** Combines the checks of several facts: proven by any of them (a product), or by all of them (a disjunction). */
export function mergeChecks(lists: Check[][], mode: 'any' | 'all'): Check[] {
  const byKey = new Map<string, Check[]>();
  for (const list of lists) for (const c of list) byKey.set(c.key, [...(byKey.get(c.key) ?? []), c]);
  return [...byKey.values()].map((cs) => {
    const proven = mode === 'any' ? cs.some((c) => c.proven) : cs.every((c) => c.proven);
    const witness = (mode === 'any' ? cs.find((c) => c.proven) : cs.find((c) => !c.proven)) ?? cs[0]!;
    return { ...witness, proven, detail: [...new Set(cs.map((c) => c.detail))].join(mode === 'any' ? ' and ' : ', or ') };
  });
}

/** Tightens an interval so that its bounds have the given parity; null if nothing is left. */
export function reduceInterval(i: Interval, p: Parity): Interval {
  if (!i || p === 'bot') return null;
  if (p === 'top') return i;
  const want = p === 'even' ? 0 : 1;
  const ok = (n: number) => !Number.isFinite(n) || Math.abs(n) % 2 === want;
  const lo = ok(i.lo) ? i.lo : i.lo + 1;
  const hi = ok(i.hi) ? i.hi : i.hi - 1;
  return lo > hi ? null : { lo, hi };
}

/** The reduction between intervals and parity, variable by variable. */
export function reduceIntervalParity(iv: IntervalEnv, pe: ParityEnv): [IntervalEnv, ParityEnv] {
  if (iv === intervals.lattice.bottom || pe === parityBottom) return [intervals.lattice.bottom, parityBottom];
  const outI: Record<string, Interval> = { ...iv };
  const outP: Record<string, Parity> = { ...pe };
  for (const v of new Set([...Object.keys(iv), ...Object.keys(pe)])) {
    if (!(v in iv)) continue;
    const r = reduceInterval(iv[v]!, pe[v] ?? 'top');
    if (!r) return [intervals.lattice.bottom, parityBottom];
    outI[v] = r;
    // A single value has a known parity.
    if (r.lo === r.hi && Number.isFinite(r.lo)) outP[v] = P.of(r.lo);
  }
  return [outI, outP];
}

export const intervalsTimesParity = product(intervals, parityAnalysis, { name: 'Intervals × parity' });
export const intervalsReducedParity = product(intervals, parityAnalysis, { name: 'Intervals ⊗ parity (reduced)', reduce: reduceIntervalParity });

// ---------------------------------------------------------------------------------------------------------------
// Disjunctions: trace partitioning in its simplest form

/**
 * Keeps up to `limit` facts apart instead of joining them, so that what holds on one branch is not mixed with what
 * holds on the other. Loop heads still merge, through widening, so that the analysis terminates.
 */
export function partitioned<T>(A: CheckingAnalysis<T>, limit = 4): CheckingAnalysis<readonly T[]> {
  const l = A.lattice;
  const add = (list: readonly T[], x: T): readonly T[] => (isBot(l, x) || list.some((y) => l.equal(x, y)) ? list : [...list, x]);
  const collapse = (list: readonly T[]) => list.reduce((acc, x) => l.join(acc, x), l.bottom);
  const bound = (list: readonly T[]) => (list.length > limit ? add([], collapse(list)) : list);
  const map = (list: readonly T[], f: (x: T) => T) => bound(list.reduce<readonly T[]>((acc, x) => add(acc, f(x)), []));
  return {
    name: `${A.name}, partitioned`,
    direction: 'forward',
    lattice: {
      bottom: [],
      join: (x, y) => bound(y.reduce(add, x)),
      equal: (x, y) => x.length === y.length && x.every((a) => y.some((b) => l.equal(a, b))),
      format: (x, cfg) => (x.length === 0 ? '⊥ (unreachable)' : x.map((a) => (x.length > 1 ? `(${l.format(a, cfg)})` : l.format(a, cfg))).join(' ∨ ')),
    },
    boundary: (cfg) => add([], A.boundary(cfg)),
    transfer: (node: CfgNode, x, cfg) => map(x, (a) => A.transfer(node, a, cfg)),
    edge: (from, to, x, cfg) => (A.edge ? map(x, (a) => A.edge!(from, to, a, cfg)) : x),
    widen: (x, y) => add([], A.widen ? A.widen(collapse(x), collapse(y)) : l.join(collapse(x), collapse(y))),
    narrow: (x, y) => add([], A.narrow ? A.narrow(collapse(x), collapse(y)) : collapse(y)),
    checks: (node, x, cfg) => mergeChecks(x.map((a) => A.checks(node, a, cfg)), 'all'),
  };
}

export const intervalsPartitioned = partitioned(intervals);
