/**
 * The interval domain (chapter 22): for each numeric variable, a range [lo, hi] of the values it may hold, with
 * infinite bounds. Numbers are treated as integers. Conditions refine intervals along the branches they guard,
 * widening makes loops terminate, narrowing recovers some of the precision widening gave up, and two kinds of
 * alarms are checked: division by an interval that contains zero, and `assert(condition)` calls that the
 * intervals cannot prove.
 */
import type estree from 'estree';
import type { Cfg, CfgNode } from '../flow/cfg.js';
import type { Analysis } from '../flow/dataflow.js';

/** An interval, or null for ⊥ (no value: the point is unreachable for this variable). */
export type Interval = { lo: number; hi: number } | null;
export const TOP_INTERVAL: Interval = { lo: -Infinity, hi: Infinity };
/** Variables to intervals; a missing variable is ⊥. Non-numeric values are ⊤. */
export type IntervalEnv = Readonly<Record<string, Interval>>;

export const iv = (lo: number, hi: number): Interval => (lo > hi ? null : { lo, hi });

export function hull(a: Interval, b: Interval): Interval {
  if (!a) return b;
  if (!b) return a;
  return { lo: Math.min(a.lo, b.lo), hi: Math.max(a.hi, b.hi) };
}

export function meet(a: Interval, b: Interval): Interval {
  if (!a || !b) return null;
  return iv(Math.max(a.lo, b.lo), Math.min(a.hi, b.hi));
}

/** Widening: a bound that moved goes to infinity. */
export function widenInterval(old: Interval, next: Interval): Interval {
  if (!old) return next;
  if (!next) return old;
  return { lo: next.lo < old.lo ? -Infinity : old.lo, hi: next.hi > old.hi ? Infinity : old.hi };
}

/** Narrowing: an infinite bound may be replaced by a finite one; finite bounds stay. */
export function narrowInterval(old: Interval, next: Interval): Interval {
  if (!old || !next) return next;
  return iv(old.lo === -Infinity ? next.lo : old.lo, old.hi === Infinity ? next.hi : old.hi);
}

const fmtBound = (n: number) => (n === Infinity ? '+∞' : n === -Infinity ? '−∞' : String(n));
export const formatInterval = (a: Interval) => (a ? (a.lo === a.hi ? `${fmtBound(a.lo)}` : `[${fmtBound(a.lo)}, ${fmtBound(a.hi)}]`) : '⊥');

// Multiplication of bounds, with 0 × ∞ = 0 (the bound of an interval that contains 0 stays finite).
const mul = (a: number, b: number) => (a === 0 || b === 0 ? 0 : a * b);

export function add(a: Interval, b: Interval): Interval {
  return a && b ? { lo: a.lo + b.lo, hi: a.hi + b.hi } : null;
}
export function sub(a: Interval, b: Interval): Interval {
  return a && b ? { lo: a.lo - b.hi, hi: a.hi - b.lo } : null;
}
export function times(a: Interval, b: Interval): Interval {
  if (!a || !b) return null;
  const products = [mul(a.lo, b.lo), mul(a.lo, b.hi), mul(a.hi, b.lo), mul(a.hi, b.hi)];
  return { lo: Math.min(...products), hi: Math.max(...products) };
}
export function negate(a: Interval): Interval {
  return a ? { lo: -a.hi, hi: -a.lo } : null;
}

/** The interval of an expression in an environment. */
export function evalInterval(e: estree.Node | null | undefined, env: IntervalEnv): Interval {
  if (!e) return TOP_INTERVAL;
  switch (e.type) {
    case 'Literal':
      return typeof e.value === 'number' ? iv(e.value, e.value) : TOP_INTERVAL;
    case 'Identifier':
      return e.name in env ? env[e.name]! : TOP_INTERVAL;
    case 'UnaryExpression':
      return e.operator === '-' ? negate(evalInterval(e.argument, env)) : e.operator === '+' ? evalInterval(e.argument, env) : TOP_INTERVAL;
    case 'BinaryExpression': {
      const a = evalInterval(e.left as estree.Node, env);
      const b = evalInterval(e.right, env);
      if (e.operator === '+') return add(a, b);
      if (e.operator === '-') return sub(a, b);
      if (e.operator === '*') return times(a, b);
      if (e.operator === '%' && b && b.lo === b.hi && b.lo > 0) {
        const k = b.lo;
        if (!a) return null;
        return a.lo >= 0 ? iv(0, Math.min(k - 1, a.hi)) : iv(-(k - 1), k - 1);
      }
      if (!a || !b) return null;
      return TOP_INTERVAL;
    }
    case 'MemberExpression':
      return !e.computed && e.property.type === 'Identifier' && e.property.name === 'length' ? iv(0, Infinity) : TOP_INTERVAL;
    default:
      return TOP_INTERVAL;
  }
}

const isConst = (n: estree.Node) => n.type === 'Literal' && typeof n.value === 'number';
const FLIP: Record<string, string> = { '<': '>', '<=': '>=', '>': '<', '>=': '<=', '===': '===', '!==': '!==', '==': '==', '!=': '!=' };
const NEGATE: Record<string, string> = { '<': '>=', '<=': '>', '>': '<=', '>=': '<', '===': '!==', '!==': '===', '==': '!=', '!=': '==' };

/** Restricts `x` so that `x op bound` can hold. */
function restrict(x: Interval, op: string, bound: Interval): Interval {
  if (!x || !bound) return null;
  switch (op) {
    case '<':
      return meet(x, { lo: -Infinity, hi: bound.hi - 1 });
    case '<=':
      return meet(x, { lo: -Infinity, hi: bound.hi });
    case '>':
      return meet(x, { lo: bound.lo + 1, hi: Infinity });
    case '>=':
      return meet(x, { lo: bound.lo, hi: Infinity });
    case '===':
    case '==':
      return meet(x, bound);
    case '!==':
    case '!=':
      // Only an excluded end point can be removed from an interval.
      if (bound.lo !== bound.hi) return x;
      if (x.lo === bound.lo) return iv(x.lo + 1, x.hi);
      if (x.hi === bound.lo) return iv(x.lo, x.hi - 1);
      return x;
    default:
      return x;
  }
}

/** What taking the `outcome` branch of `test` says, as a refined environment. Returns null if impossible. */
export function refineIntervals(test: estree.Node, outcome: boolean, env: IntervalEnv): IntervalEnv | null {
  if (test.type === 'UnaryExpression' && test.operator === '!') return refineIntervals(test.argument, !outcome, env);
  if (test.type === 'LogicalExpression') {
    if ((test.operator === '&&' && outcome) || (test.operator === '||' && !outcome)) {
      const left = refineIntervals(test.left, outcome, env);
      return left && refineIntervals(test.right, outcome, left);
    }
    return env;
  }
  if (test.type === 'Literal') return Boolean(test.value) === outcome ? env : null;
  if (test.type !== 'BinaryExpression' || !(test.operator in FLIP)) return env;
  const op = outcome ? test.operator : NEGATE[test.operator]!;
  let out: Record<string, Interval> = { ...env };
  const left = test.left as estree.Node;
  const right = test.right;
  if (left.type === 'Identifier' && left.name in env) out[left.name] = restrict(env[left.name]!, op, evalInterval(right, env));
  if (right.type === 'Identifier' && right.name in env) out[right.name] = restrict(out[right.name]!, FLIP[op]!, evalInterval(left, out));
  if (isConst(left) && isConst(right)) {
    const a = (left as estree.Literal).value as number;
    const b = (right as estree.Literal).value as number;
    const holds = op === '<' ? a < b : op === '<=' ? a <= b : op === '>' ? a > b : op === '>=' ? a >= b : op.startsWith('!') ? a !== b : a === b;
    if (!holds) return null;
  }
  if (Object.values(out).some((v, i) => v === null && env[Object.keys(out)[i]!] !== null)) return null;
  return out;
}

function findDivisions(e: estree.Node | null | undefined, out: estree.BinaryExpression[]) {
  if (!e || typeof e !== 'object') return;
  if (e.type === 'BinaryExpression' && (e.operator === '/' || e.operator === '%')) out.push(e);
  for (const [k, v] of Object.entries(e)) {
    if (k === 'parent' || k === 'range' || k === 'loc') continue;
    if (Array.isArray(v)) v.forEach((c) => c && typeof c === 'object' && 'type' in c && findDivisions(c as estree.Node, out));
    else if (v && typeof v === 'object' && 'type' in v) findDivisions(v as estree.Node, out);
  }
}

function collectNames(e: estree.Node, out: Set<string>) {
  if (e.type === 'Identifier') out.add(e.name);
  else if (e.type === 'BinaryExpression' || e.type === 'LogicalExpression') {
    collectNames(e.left as estree.Node, out);
    collectNames(e.right, out);
  } else if (e.type === 'UnaryExpression') collectNames(e.argument, out);
}

const envBottom: IntervalEnv = {};

/** The condition of an `assert(condition)` statement. */
export function assertion(node: CfgNode): estree.Node | undefined {
  const e = node.kind === 'expr' ? node.expr : undefined;
  if (e?.type === 'CallExpression' && e.callee.type === 'Identifier' && e.callee.name === 'assert' && e.arguments[0]) return e.arguments[0] as estree.Node;
  return undefined;
}

export const intervals: Analysis<IntervalEnv> = {
  name: 'Intervals',
  direction: 'forward',
  lattice: {
    bottom: envBottom,
    join: (a, b) => {
      if (a === envBottom) return b;
      if (b === envBottom) return a;
      const out: Record<string, Interval> = {};
      for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) out[k] = hull(k in a ? a[k]! : null, k in b ? b[k]! : null);
      return out;
    },
    equal: (a, b) => {
      if ((a === envBottom) !== (b === envBottom)) return false;
      const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
      for (const k of keys) {
        const x = k in a ? a[k]! : null;
        const y = k in b ? b[k]! : null;
        if (x === y) continue;
        if (!x || !y || x.lo !== y.lo || x.hi !== y.hi) return false;
      }
      return true;
    },
    format: (env, cfg) => {
      if (env === envBottom) return '⊥ (unreachable)';
      const shown = cfg.variables.filter((v) => v in env && env[v] !== null && !(env[v]!.lo === -Infinity && env[v]!.hi === Infinity));
      const top = cfg.variables.filter((v) => v in env && env[v] !== null && env[v]!.lo === -Infinity && env[v]!.hi === Infinity);
      const parts = shown.map((v) => `${v}∈${formatInterval(env[v]!)}`);
      if (top.length) parts.push(`${top.join(',')}∈⊤`);
      return parts.join(' ') || '(no variables)';
    },
  },
  boundary: (cfg) => Object.fromEntries(cfg.params.map((p) => [p, TOP_INTERVAL])),
  transfer: (node: CfgNode, env) => {
    if (env === envBottom || node.kind === 'entry') return env;
    // After `assert(c)`, analysis continues on the executions where c holds (the others were reported).
    const condition = assertion(node);
    if (condition) return refineIntervals(condition, true, env) ?? envBottom;
    if (node.defs.length === 0) return env;
    const out: Record<string, Interval> = { ...env };
    if (node.kind === 'assign' && node.value && node.defs.length === 1) out[node.defs[0]!] = evalInterval(node.value, env);
    else for (const d of node.defs) out[d] = TOP_INTERVAL;
    return out;
  },
  edge: (from, to, env) => {
    if (env === envBottom || from.kind !== 'cond' || !from.test || from.succ.length !== 2 || from.succ[0] === from.succ[1]) return env;
    return refineIntervals(from.test, to === from.succ[0], env) ?? envBottom;
  },
  widen: (prev, next) => {
    if (prev === envBottom) return next;
    if (next === envBottom) return prev;
    const out: Record<string, Interval> = {};
    for (const k of new Set([...Object.keys(prev), ...Object.keys(next)])) out[k] = widenInterval(k in prev ? prev[k]! : null, k in next ? next[k]! : null);
    return out;
  },
  narrow: (prev, next) => {
    if (prev === envBottom || next === envBottom) return next;
    const out: Record<string, Interval> = {};
    for (const k of new Set([...Object.keys(prev), ...Object.keys(next)])) out[k] = narrowInterval(k in prev ? prev[k]! : null, k in next ? next[k]! : null);
    return out;
  },
  alarms: (node, env) => {
    if (env === envBottom) return [];
    const out: string[] = [];
    const divisions: estree.BinaryExpression[] = [];
    findDivisions(node.value ?? node.test ?? node.expr ?? null, divisions);
    for (const d of divisions) {
      const divisor = evalInterval(d.right, env);
      if (divisor && divisor.lo <= 0 && divisor.hi >= 0) out.push(`possible division by zero: the divisor is in ${formatInterval(divisor)}`);
    }
    const condition = assertion(node);
    if (condition) {
      const names = new Set<string>();
      collectNames(condition, names);
      const known = [...names].filter((v) => v in env).map((v) => `${v}∈${formatInterval(env[v]!)}`);
      const where = known.length ? ` (before it, ${known.join(', ')})` : '';
      if (!refineIntervals(condition, true, env)) out.push(`assertion always fails${where}`);
      else if (refineIntervals(condition, false, env)) out.push(`assertion may fail${where}`);
    }
    return out;
  },
};
