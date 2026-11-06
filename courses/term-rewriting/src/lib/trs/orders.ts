/**
 * Reduction orders on terms: the subterm and embedding relations, the multiset extension, and the
 * path orders LPO, RPO and KBO, with explanations for the proof-tree widget.
 */
import { equal, isFn, occurs, show, varCounts, type Term } from './term';

/** A precedence: a rank per symbol; `f > g` when both are ranked and rank(f) > rank(g). */
export type Precedence = ReadonlyMap<string, number>;

/** Build a precedence from a list, highest first: `['I', '*', 'E']` gives I > * > E. Use an inner array for equal symbols. */
export function precedence(order: readonly (string | readonly string[])[]): Precedence {
  const m = new Map<string, number>();
  order.forEach((s, i) => {
    for (const x of typeof s === 'string' ? [s] : s) m.set(x, order.length - i);
  });
  return m;
}

export const precGreater = (p: Precedence, f: string, g: string): boolean => {
  const a = p.get(f), b = p.get(g);
  return a !== undefined && b !== undefined && a > b;
};
const precEqual = (p: Precedence, f: string, g: string): boolean => f === g || (p.get(f) !== undefined && p.get(f) === p.get(g));

export type Order = (s: Term, t: Term) => boolean;

/** `s ⊳ t`: t is a proper subterm of s. */
export function properSubterm(s: Term, t: Term): boolean {
  if (s.type === 'var') return false;
  return s.args.some((a) => equal(a, t) || properSubterm(a, t));
}

/** Homeomorphic embedding `s ⊵emb t`: t can be obtained from s by deleting symbols (Kruskal's relation). */
export function embeds(s: Term, t: Term): boolean {
  if (t.type === 'var') return s.type === 'var' ? s.name === t.name : occurs(t.name, s);
  if (s.type === 'var') return false;
  if (s.args.some((a) => embeds(a, t))) return true;
  return s.name === t.name && s.args.length === t.args.length && s.args.every((a, i) => embeds(a, t.args[i]!));
}

/** The multiset extension of `gt` (with `eq` as equality): M >mul N. */
export function multisetGreater<T>(M: readonly T[], N: readonly T[], gt: (a: T, b: T) => boolean, eq: (a: T, b: T) => boolean): boolean {
  const m = M.slice(), n = N.slice();
  for (let i = m.length - 1; i >= 0; i--) {
    const j = n.findIndex((y) => eq(m[i]!, y));
    if (j >= 0) {
      m.splice(i, 1);
      n.splice(j, 1);
    }
  }
  if (m.length === 0) return false;
  return n.every((y) => m.some((x) => gt(x, y)));
}

/** The lexicographic extension of `gt`. */
export function lexGreater<T>(a: readonly T[], b: readonly T[], gt: (x: T, y: T) => boolean, eq: (x: T, y: T) => boolean): boolean {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (eq(a[i]!, b[i]!)) continue;
    return gt(a[i]!, b[i]!);
  }
  return a.length > b.length;
}

// ───────────── LPO and RPO ─────────────

/** An explanation of a comparison `s > t`, for the proof-tree widget. */
export interface Why {
  s: Term;
  t: Term;
  holds: boolean;
  /** Which case of the definition decided it. */
  rule: string;
  children: Why[];
}

export type PathStatus = 'lex' | 'mul';

/**
 * The recursive path order with a status per symbol (lexicographic by default). With every status
 * `lex` this is the lexicographic path order (LPO); with every status `mul`, the multiset path order.
 */
export function rpoExplain(prec: Precedence, s: Term, t: Term, status: (f: string) => PathStatus = () => 'lex'): Why {
  const gt = (a: Term, b: Term) => rpoExplain(prec, a, b, status).holds;
  const ge = (a: Term, b: Term) => equal(a, b) || gt(a, b);
  if (t.type === 'var') {
    const holds = !equal(s, t) && occurs(t.name, s);
    return { s, t, holds, rule: holds ? `${t.name} occurs in the left term` : s.type === 'var' ? 'a variable is only greater than nothing' : `${t.name} does not occur in the left term`, children: [] };
  }
  if (s.type === 'var') return { s, t, holds: false, rule: 'a variable is never greater than a non-variable term', children: [] };
  // (1) Some argument of s is ≥ t.
  for (const si of s.args) {
    if (equal(si, t)) return { s, t, holds: true, rule: 'an argument of the left term equals the right term (subterm case)', children: [] };
  }
  for (const si of s.args) {
    const w = rpoExplain(prec, si, t, status);
    if (w.holds) return { s, t, holds: true, rule: 'an argument of the left term is greater (subterm case)', children: [w] };
  }
  const allArgs = (): Why[] => t.args.map((tj) => rpoExplain(prec, s, tj, status));
  // (2) Precedence.
  if (precGreater(prec, s.name, t.name)) {
    const ws = allArgs();
    const holds = ws.every((w) => w.holds);
    return { s, t, holds, rule: holds ? `${s.name} > ${t.name} in the precedence, and the left term is greater than every argument of the right` : `${s.name} > ${t.name}, but the left term is not greater than every argument of the right`, children: ws };
  }
  // (3) Same head.
  if (precEqual(prec, s.name, t.name)) {
    const st = status(s.name);
    if (st === 'mul' || s.args.length !== t.args.length) {
      const holds = multisetGreater(s.args, t.args, gt, equal);
      return { s, t, holds, rule: holds ? `same symbol ${s.name}: the arguments decrease as multisets` : `same symbol ${s.name}: the arguments do not decrease as multisets`, children: [] };
    }
    let i = 0;
    while (i < s.args.length && equal(s.args[i]!, t.args[i]!)) i++;
    if (i === s.args.length) return { s, t, holds: false, rule: 'the terms are equal', children: [] };
    const first = rpoExplain(prec, s.args[i]!, t.args[i]!, status);
    if (!first.holds) return { s, t, holds: false, rule: `same symbol ${s.name}: the first differing arguments (number ${i + 1}) do not decrease`, children: [first] };
    const rest = t.args.slice(i + 1).map((tj) => rpoExplain(prec, s, tj, status));
    const holds = rest.every((w) => w.holds);
    return { s, t, holds, rule: holds ? `same symbol ${s.name}: argument ${i + 1} decreases, and the left term is greater than the remaining arguments of the right` : `same symbol ${s.name}: argument ${i + 1} decreases, but the left term is not greater than every later argument`, children: [first, ...rest] };
  }
  void ge;
  return { s, t, holds: false, rule: precGreater(prec, t.name, s.name) ? `${t.name} > ${s.name} in the precedence, and no argument of the left term is big enough` : `${s.name} and ${t.name} are not comparable in the precedence, and no argument of the left term is big enough`, children: [] };
}

export const lpoExplain = (prec: Precedence, s: Term, t: Term) => rpoExplain(prec, s, t, () => 'lex');
export const lpo = (prec: Precedence) => (s: Term, t: Term): boolean => lpoExplain(prec, s, t).holds;
export const rpo = (prec: Precedence, status: (f: string) => PathStatus = () => 'mul') => (s: Term, t: Term): boolean => rpoExplain(prec, s, t, status).holds;

// ───────────── KBO ─────────────

export interface KboParams {
  prec: Precedence;
  /** Weight of each symbol (default 1). */
  weight?: ReadonlyMap<string, number>;
  /** Weight of every variable (default 1). */
  w0?: number;
}

export function weight(t: Term, p: KboParams): number {
  if (t.type === 'var') return p.w0 ?? 1;
  let w = p.weight?.get(t.name) ?? 1;
  for (const a of t.args) w += weight(a, p);
  return w;
}

/** The variable condition: every variable occurs at least as often in s as in t. */
export function varCondition(s: Term, t: Term): boolean {
  const cs = varCounts(s), ct = varCounts(t);
  for (const [x, n] of ct) if ((cs.get(x) ?? 0) < n) return false;
  return true;
}

/** The Knuth–Bendix order. */
export function kbo(p: KboParams): Order {
  const gt = (s: Term, t: Term): boolean => {
    if (!varCondition(s, t) || equal(s, t)) return false;
    const ws = weight(s, p), wt = weight(t, p);
    if (ws > wt) return true;
    if (ws < wt) return false;
    if (t.type === 'var') {
      // s = f(f(…f(t)…)) with f unary of weight 0.
      let u = s;
      while (u.type === 'fn' && u.args.length === 1) u = u.args[0]!;
      return u.type === 'var' && u.name === t.name && s.type === 'fn';
    }
    if (s.type === 'var') return false;
    if (precGreater(p.prec, s.name, t.name)) return true;
    if (s.name === t.name) return lexGreater(s.args, t.args, gt, equal);
    return false;
  };
  return gt;
}

/** Check KBO's admissibility conditions on the weights. Returns a problem, or `null`. */
export function kboAdmissible(p: KboParams, symbols: ReadonlyMap<string, number>): string | null {
  const w0 = p.w0 ?? 1;
  if (w0 <= 0) return 'the variable weight must be positive';
  for (const [f, n] of symbols) {
    const w = p.weight?.get(f) ?? 1;
    if (w < 0) return `${f} has a negative weight`;
    if (n === 0 && w < w0) return `the constant ${f} must weigh at least as much as a variable`;
    if (n === 1 && w === 0) {
      for (const g of symbols.keys()) if (g !== f && !precGreater(p.prec, f, g)) return `${f} is unary with weight 0, so it must be greater than every other symbol`;
    }
  }
  return null;
}

/** Orient a pair with an order: '>' (s > t), '<' (t > s) or null (incomparable or equal). */
export function orient(gt: Order, s: Term, t: Term): '>' | '<' | null {
  if (gt(s, t)) return '>';
  if (gt(t, s)) return '<';
  return null;
}

export const showWhy = (w: Why, indent = ''): string =>
  [`${indent}${w.holds ? '✓' : '✗'} ${show(w.s)} > ${show(w.t)}: ${w.rule}`, ...w.children.map((c) => showWhy(c, indent + '  '))].join('\n');

export { isFn };
