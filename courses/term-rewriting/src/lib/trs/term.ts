/**
 * Terms, positions and substitutions: the data every other module of the engine is built on.
 *
 * A term is a variable or a function symbol applied to arguments. Constants are symbols with no
 * arguments. Terms are immutable values: every operation returns a new term and shares the parts
 * it did not change.
 */

export interface Var {
  readonly type: 'var';
  readonly name: string;
}

export interface Fn {
  readonly type: 'fn';
  readonly name: string;
  readonly args: readonly Term[];
}

export type Term = Var | Fn;

/** A position: the path of argument indices (0-based) from the root. The root is `[]`. */
export type Position = readonly number[];

/** A substitution maps variable names to terms. Variables it does not mention are left alone. */
export type Subst = ReadonlyMap<string, Term>;

export const v = (name: string): Var => ({ type: 'var', name });
export const f = (name: string, ...args: Term[]): Fn => ({ type: 'fn', name, args });
/** A constant (a symbol of arity 0). */
export const c = (name: string): Fn => ({ type: 'fn', name, args: [] });

export const isVar = (t: Term): t is Var => t.type === 'var';
export const isFn = (t: Term): t is Fn => t.type === 'fn';

/** Syntactic equality. */
export function equal(s: Term, t: Term): boolean {
  if (s === t) return true;
  if (s.type === 'var' || t.type === 'var') return s.type === t.type && s.name === t.name;
  if (s.name !== t.name || s.args.length !== t.args.length) return false;
  for (let i = 0; i < s.args.length; i++) if (!equal(s.args[i]!, t.args[i]!)) return false;
  return true;
}

/** The subterm at a position. Throws if the position does not exist. */
export function at(t: Term, p: Position): Term {
  let cur = t;
  for (const i of p) {
    if (cur.type === 'var' || i < 0 || i >= cur.args.length) throw new Error(`no position ${showPos(p)} in ${show(t)}`);
    cur = cur.args[i]!;
  }
  return cur;
}

/** `t[s]_p`: replace the subterm at `p` by `s`. */
export function replaceAt(t: Term, p: Position, s: Term, from = 0): Term {
  if (from === p.length) return s;
  if (t.type === 'var') throw new Error(`no position ${showPos(p)} in a variable`);
  const i = p[from]!;
  if (i < 0 || i >= t.args.length) throw new Error(`no position ${showPos(p)}`);
  const args = t.args.slice();
  args[i] = replaceAt(t.args[i]!, p, s, from + 1);
  return { type: 'fn', name: t.name, args };
}

/** All positions of `t`, in pre-order (root first, then arguments left to right). */
export function positions(t: Term): Position[] {
  const out: Position[] = [];
  const go = (u: Term, p: number[]) => {
    out.push(p);
    if (u.type === 'fn') u.args.forEach((a, i) => go(a, [...p, i]));
  };
  go(t, []);
  return out;
}

/** Positions of function symbols (non-variable positions), in pre-order. */
export function fnPositions(t: Term): Position[] {
  return positions(t).filter((p) => at(t, p).type === 'fn');
}

/** Is `p` a prefix of `q` (so the subterm at `q` lies inside the one at `p`)? */
export const isPrefix = (p: Position, q: Position): boolean => p.length <= q.length && p.every((x, i) => q[i] === x);
/** Positions are parallel when neither is a prefix of the other. */
export const parallel = (p: Position, q: Position): boolean => !isPrefix(p, q) && !isPrefix(q, p);

/** The variables of `t`, in order of first occurrence. */
export function vars(t: Term, out: string[] = []): string[] {
  if (t.type === 'var') {
    if (!out.includes(t.name)) out.push(t.name);
  } else for (const a of t.args) vars(a, out);
  return out;
}

/** How many times each variable occurs. */
export function varCounts(t: Term, out = new Map<string, number>()): Map<string, number> {
  if (t.type === 'var') out.set(t.name, (out.get(t.name) ?? 0) + 1);
  else for (const a of t.args) varCounts(a, out);
  return out;
}

/** A term is linear when no variable occurs twice. */
export const isLinear = (t: Term): boolean => [...varCounts(t).values()].every((n) => n === 1);
export const isGround = (t: Term): boolean => vars(t).length === 0;

/** Number of symbol and variable occurrences. */
export function size(t: Term): number {
  if (t.type === 'var') return 1;
  let n = 1;
  for (const a of t.args) n += size(a);
  return n;
}

export function depth(t: Term): number {
  if (t.type === 'var' || t.args.length === 0) return 0;
  return 1 + Math.max(...t.args.map(depth));
}

/** Function symbols with their arities, in order of first occurrence. */
export function symbols(t: Term, out = new Map<string, number>()): Map<string, number> {
  if (t.type === 'fn') {
    if (!out.has(t.name)) out.set(t.name, t.args.length);
    for (const a of t.args) symbols(a, out);
  }
  return out;
}

/** Does variable `x` occur in `t`? */
export function occurs(x: string, t: Term): boolean {
  if (t.type === 'var') return t.name === x;
  return t.args.some((a) => occurs(x, a));
}

// ───────────── substitutions ─────────────

export const emptySubst: Subst = new Map();

/** `tσ`: replace every variable of `t` that `sigma` maps. */
export function apply(sigma: Subst, t: Term): Term {
  if (sigma.size === 0) return t;
  if (t.type === 'var') return sigma.get(t.name) ?? t;
  if (t.args.length === 0) return t;
  let changed = false;
  const args = t.args.map((a) => {
    const b = apply(sigma, a);
    if (b !== a) changed = true;
    return b;
  });
  return changed ? { type: 'fn', name: t.name, args } : t;
}

/** `σ ∘ τ` in diagrammatic order: first `tau`, then `sigma` (so `apply(compose(σ, τ), t) = apply(σ, apply(τ, t))`). */
export function compose(sigma: Subst, tau: Subst): Subst {
  const out = new Map<string, Term>();
  for (const [x, t] of tau) out.set(x, apply(sigma, t));
  for (const [x, t] of sigma) if (!out.has(x)) out.set(x, t);
  return out;
}

export function substOf(entries: Record<string, Term>): Subst {
  return new Map(Object.entries(entries));
}

/** Rename every variable of `t` with `rename`. */
export function renameVars(t: Term, rename: (x: string) => string): Term {
  if (t.type === 'var') return v(rename(t.name));
  return { type: 'fn', name: t.name, args: t.args.map((a) => renameVars(a, rename)) };
}

// ───────────── printing ─────────────

/** How the printer writes infix symbols: name → [precedence, associativity]. */
export type Fixity = ReadonlyMap<string, { prec: number; assoc: 'left' | 'right' | 'none' }>;

/** Print a term in Girafe syntax. Symbols declared in `fixity` print infix. */
export function show(t: Term, fixity?: Fixity): string {
  // Guard against `terms.map(show)`, which passes the array index as the second argument.
  return showPrec(t, fixity instanceof Map ? fixity : undefined, 0);
}

function showPrec(t: Term, fixity: Fixity | undefined, ctx: number): string {
  if (t.type === 'var') return t.name;
  const fx = fixity?.get(t.name);
  if (fx && t.args.length === 2) {
    const [l, r] = t.args as [Term, Term];
    const lp = fx.assoc === 'left' ? fx.prec : fx.prec + 1;
    const rp = fx.assoc === 'right' ? fx.prec : fx.prec + 1;
    const s = `${showPrec(l, fixity, lp)} ${t.name} ${showPrec(r, fixity, rp)}`;
    return fx.prec < ctx ? `(${s})` : s;
  }
  if (t.name === '?' && t.args.length === 1) return `${showPrec(t.args[0]!, fixity, 100)}?`;
  if (t.args.length === 0) return t.name;
  return `${t.name}(${t.args.map((a) => showPrec(a, fixity, 0)).join(', ')})`;
}

export const showPos = (p: Position): string => (p.length === 0 ? 'ε' : p.map((i) => i + 1).join('.'));

export function showSubst(sigma: Subst, fixity?: Fixity): string {
  if (sigma.size === 0) return '{}';
  return `{${[...sigma].map(([x, t]) => `${x} ↦ ${show(t, fixity)}`).join(', ')}}`;
}

/** A stable string key for a term (useful in maps and sets). */
export function key(t: Term): string {
  if (t.type === 'var') return `?${t.name}`;
  if (t.args.length === 0) return t.name;
  return `${t.name}(${t.args.map(key).join(',')})`;
}
