/**
 * The zone domain (chapter 24): constraints of the form `x − y ≤ c` and `±x ≤ c` between the function's variables,
 * stored in a difference-bound matrix. Zones are a relational domain, the simplest of the weakly relational ones;
 * Miné's octagons add constraints `x + y ≤ c` on the same principles.
 *
 * Index 0 of the matrix is a variable fixed at 0, so `m[i][0] = c` bounds `vᵢ ≤ c` and `m[0][i] = c` bounds
 * `−vᵢ ≤ c`. In general `m[i][j]` bounds `vᵢ − vⱼ`. A matrix is closed when every bound is the tightest the others
 * imply (shortest paths), and empty when closure finds a negative cycle.
 */
import type estree from 'estree';
import type { Cfg, CfgNode } from '../flow/cfg.js';
import { assertion, checksWith, type CheckingAnalysis } from './checks.js';
import { evalInterval, formatInterval, type IntervalEnv, type Interval } from './intervals.js';

/** A difference-bound matrix over [0, ...cfg.variables], or null for ⊥. */
export type Zone = { readonly vars: readonly string[]; readonly m: readonly (readonly number[])[] } | null;

const copy = (m: readonly (readonly number[])[]) => m.map((r) => [...r]);

export function top(vars: readonly string[]): Zone {
  const n = vars.length + 1;
  return { vars, m: Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 0 : Infinity))) };
}

/** Floyd–Warshall: tightest bounds, or null if the constraints are contradictory. */
export function close(z: Zone): Zone {
  if (!z) return null;
  const m = copy(z.m);
  const n = m.length;
  for (let k = 0; k < n; k++)
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) if (m[i]![k]! + m[k]![j]! < m[i]![j]!) m[i]![j] = m[i]![k]! + m[k]![j]!;
  for (let i = 0; i < n; i++) if (m[i]![i]! < 0) return null;
  return { vars: z.vars, m };
}

const index = (z: NonNullable<Zone>, v: string | null) => (v === null ? 0 : z.vars.indexOf(v) + 1);

/** Adds `vᵢ − vⱼ ≤ c` (null for the zero variable) and closes. */
function constrain(z: Zone, i: string | null, j: string | null, c: number): Zone {
  if (!z) return null;
  const a = index(z, i);
  const b = index(z, j);
  if (a < 0 || b < 0) return z;
  if (c >= z.m[a]![b]!) return z;
  const m = copy(z.m);
  m[a]![b] = c;
  return close({ vars: z.vars, m });
}

/** Removes every constraint on `v`. */
function forget(z: Zone, v: string): Zone {
  if (!z) return null;
  const k = index(z, v);
  if (k <= 0) return z;
  const m = copy(close(z)!.m);
  for (let i = 0; i < m.length; i++) if (i !== k) (m[k]![i] = Infinity), (m[i]![k] = Infinity);
  return { vars: z.vars, m };
}

export function bounds(z: Zone, v: string): Interval {
  if (!z) return null;
  const k = index(z, v);
  if (k <= 0) return { lo: -Infinity, hi: Infinity };
  return { lo: -z.m[0]![k]!, hi: z.m[k]![0]! };
}

const asIntervals = (z: NonNullable<Zone>): IntervalEnv => Object.fromEntries(z.vars.map((v) => [v, bounds(z, v)]));

/** A linear expression: variables with coefficients, plus a constant. */
type Linear = { coef: Map<string, number>; c: number };

function linear(e: estree.Node, vars: readonly string[]): Linear | null {
  switch (e.type) {
    case 'Literal':
      return typeof e.value === 'number' && Number.isInteger(e.value) ? { coef: new Map(), c: e.value } : null;
    case 'Identifier':
      return vars.includes(e.name) ? { coef: new Map([[e.name, 1]]), c: 0 } : null;
    case 'UnaryExpression': {
      if (e.operator !== '-' && e.operator !== '+') return null;
      const a = linear(e.argument, vars);
      return a && (e.operator === '+' ? a : scale(a, -1));
    }
    case 'BinaryExpression': {
      if (e.operator !== '+' && e.operator !== '-') return null;
      const a = linear(e.left as estree.Node, vars);
      const b = linear(e.right, vars);
      return a && b && sum(a, e.operator === '+' ? b : scale(b, -1));
    }
    default:
      return null;
  }
}
const scale = (a: Linear, k: number): Linear => ({ coef: new Map([...a.coef].map(([v, x]) => [v, x * k])), c: a.c * k });
function sum(a: Linear, b: Linear): Linear {
  const coef = new Map(a.coef);
  for (const [v, x] of b.coef) coef.set(v, (coef.get(v) ?? 0) + x);
  for (const [v, x] of coef) if (x === 0) coef.delete(v);
  return { coef, c: a.c + b.c };
}

/** `p − n + c` with at most one variable of each sign (null for the zero variable), or null if not of that form. */
function difference(l: Linear): { p: string | null; n: string | null; c: number } | null {
  let p: string | null = null;
  let n: string | null = null;
  for (const [v, x] of l.coef) {
    if (x === 1 && p === null) p = v;
    else if (x === -1 && n === null) n = v;
    else return null;
  }
  return { p, n, c: l.c };
}

/** The range of an expression, using the relations when the expression is a difference of two variables. */
export function rangeOf(z: NonNullable<Zone>, e: estree.Node): Interval {
  const l = linear(e, z.vars);
  const d = l && difference(l);
  if (d) {
    const a = index(z, d.p);
    const b = index(z, d.n);
    return { lo: -z.m[b]![a]! + d.c, hi: z.m[a]![b]! + d.c };
  }
  return evalInterval(e, asIntervals(z));
}

export function refineZone(z: Zone, test: estree.Node, outcome: boolean): Zone {
  if (!z) return null;
  if (test.type === 'UnaryExpression' && test.operator === '!') return refineZone(z, test.argument, !outcome);
  if (test.type === 'LogicalExpression') {
    if ((test.operator === '&&' && outcome) || (test.operator === '||' && !outcome)) return refineZone(refineZone(z, test.left, outcome), test.right, outcome);
    return z;
  }
  if (test.type === 'Literal') return Boolean(test.value) === outcome ? z : null;
  if (test.type !== 'BinaryExpression') return z;
  const NEG: Record<string, string> = { '<': '>=', '<=': '>', '>': '<=', '>=': '<', '===': '!==', '!==': '===', '==': '!=', '!=': '==' };
  if (!(test.operator in NEG)) return z;
  const op = outcome ? test.operator : NEG[test.operator]!;
  const l = linear(test.left as estree.Node, z.vars);
  const r = linear(test.right, z.vars);
  const d = l && r && difference(sum(l, scale(r, -1)));
  if (!d) return z;
  // (p − n) + c op 0.
  const le = (zz: Zone, k: number) => constrain(zz, d.p, d.n, k); // p − n ≤ k
  const ge = (zz: Zone, k: number) => constrain(zz, d.n, d.p, -k); // p − n ≥ k
  switch (op) {
    case '<=': return le(z, -d.c);
    case '<': return le(z, -d.c - 1);
    case '>=': return ge(z, -d.c);
    case '>': return ge(z, -d.c + 1);
    case '===': case '==': return ge(le(z, -d.c), -d.c);
    default: {
      // p − n ≠ −c: only useful when the zone already pins p − n to −c.
      const c = close(z);
      if (!c) return null;
      const a = index(c, d.p);
      const b = index(c, d.n);
      return c.m[a]![b] === -d.c && -c.m[b]![a]! === -d.c ? null : z;
    }
  }
}

function assign(z: Zone, x: string, e: estree.Node | undefined): Zone {
  if (!z) return null;
  const l = e ? linear(e, z.vars) : null;
  const d = l && difference(l);
  if (d && d.n === null && d.p === x) {
    // x = x + c: shift every constraint on x.
    const k = index(z, x);
    const m = copy(close(z)!.m);
    for (let i = 0; i < m.length; i++) if (i !== k) (m[k]![i] = m[k]![i]! + d.c), (m[i]![k] = m[i]![k]! - d.c);
    return { vars: z.vars, m };
  }
  if (d && d.n === null) {
    // x = y + c, or x = c (y the zero variable).
    const out = forget(z, x);
    return constrain(constrain(out, x, d.p, d.c), d.p, x, -d.c);
  }
  const range = e ? rangeOf(z, e) : { lo: -Infinity, hi: Infinity };
  let out = forget(z, x);
  if (!range) return null;
  if (range.hi < Infinity) out = constrain(out, x, null, range.hi);
  if (range.lo > -Infinity) out = constrain(out, null, x, -range.lo);
  return out;
}

const fmt = (n: number) => (n === Infinity ? '+∞' : n === -Infinity ? '−∞' : String(n).replace('-', '−'));

export function formatZone(z: Zone): string {
  if (!z) return '⊥ (unreachable)';
  const parts: string[] = [];
  for (const v of z.vars) {
    const b = bounds(z, v)!;
    if (b.lo > -Infinity || b.hi < Infinity) parts.push(`${v}∈${formatInterval(b)}`);
  }
  for (let i = 1; i < z.m.length; i++) {
    for (let j = i + 1; j < z.m.length; j++) {
      const hi = z.m[i]![j]!;
      const lo = -z.m[j]![i]!;
      if (hi === Infinity && lo === -Infinity) continue;
      // Skip what the bounds already imply.
      const bi = bounds(z, z.vars[i - 1]!)!;
      const bj = bounds(z, z.vars[j - 1]!)!;
      if (hi >= bi.hi - bj.lo && lo <= bi.lo - bj.hi) continue;
      const name = `${z.vars[i - 1]}−${z.vars[j - 1]}`;
      parts.push(lo === hi ? `${name}=${fmt(lo)}` : `${name}∈[${fmt(lo)}, ${fmt(hi)}]`);
    }
  }
  return parts.join(' ') || '(nothing known)';
}

export const zones: CheckingAnalysis<Zone> = {
  name: 'Zones',
  direction: 'forward',
  lattice: {
    bottom: null,
    join: (a, b) => {
      if (!a) return b;
      if (!b) return a;
      const ca = close(a)!;
      const cb = close(b)!;
      return { vars: a.vars, m: ca.m.map((r, i) => r.map((x, j) => Math.max(x, cb.m[i]![j]!))) };
    },
    equal: (a, b) => {
      if (!a || !b) return a === b;
      const ca = close(a);
      const cb = close(b);
      if (!ca || !cb) return ca === cb;
      return ca.m.every((r, i) => r.every((x, j) => x === cb.m[i]![j]));
    },
    format: (z) => formatZone(close(z)),
  },
  boundary: (cfg: Cfg) => top(cfg.variables),
  transfer: (node: CfgNode, z) => {
    if (!z || node.kind === 'entry') return z;
    const condition = assertion(node);
    if (condition) return refineZone(close(z), condition, true);
    if (!node.defs.length) return z;
    if (node.kind === 'assign' && node.defs.length === 1) return assign(close(z), node.defs[0]!, node.value);
    return node.defs.reduce<Zone>((acc, d) => forget(acc, d), close(z));
  },
  edge: (from, to, z) => {
    if (!z || from.kind !== 'cond' || !from.test || from.succ.length !== 2 || from.succ[0] === from.succ[1]) return z;
    return refineZone(close(z), from.test, to === from.succ[0]);
  },
  // Standard widening: keep the bounds that held, drop the ones that grew. The result is deliberately not closed.
  widen: (a, b) => (!a ? b : !b ? a : { vars: a.vars, m: a.m.map((r, i) => r.map((x, j) => (b.m[i]![j]! > x ? Infinity : x))) }),
  narrow: (a, b) => (!a || !b ? b : { vars: a.vars, m: a.m.map((r, i) => r.map((x, j) => (x === Infinity ? b.m[i]![j]! : x))) }),
  checks: (node, z, cfg) =>
    checksWith<Zone>(
      {
        isBottom: (x) => !close(x),
        divisor: (e, x) => {
          const r = rangeOf(close(x)!, e);
          return { nonZero: !r || r.lo > 0 || r.hi < 0, value: r && r.lo === r.hi ? `is ${formatInterval(r)}` : `is in ${formatInterval(r)}` };
        },
        refine: (c, o, x) => refineZone(close(x), c, o),
      },
      node,
      z,
      cfg,
    ),
};
