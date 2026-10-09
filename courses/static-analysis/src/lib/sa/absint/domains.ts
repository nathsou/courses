/**
 * Small non-relational numeric domains (chapters 23 and 24): signs, parity, constants and intervals, each with its
 * abstraction of a set of integers, its concretisation (restricted to a window of integers, so it can be drawn),
 * and abstract arithmetic. Expressions are tiny trees over one variable `x`, evaluated compositionally: that is
 * how an analysis evaluates them, and why `x - x` is not always 0 in the abstract.
 */

export interface Domain<A> {
  key: string;
  name: string;
  bottom: A;
  top: A;
  leq(a: A, b: A): boolean;
  join(a: A, b: A): A;
  meet(a: A, b: A): A;
  /** The abstraction of a single integer. */
  of(n: number): A;
  /** Does the abstract value include this integer? (γ, one value at a time.) */
  has(a: A, n: number): boolean;
  format(a: A): string;
  neg(a: A): A;
  add(a: A, b: A): A;
  mul(a: A, b: A): A;
}

export function alpha<A>(d: Domain<A>, values: Iterable<number>): A {
  let a = d.bottom;
  for (const n of values) a = d.join(a, d.of(n));
  return a;
}

export function gamma<A>(d: Domain<A>, a: A, window: readonly number[]): number[] {
  return window.filter((n) => d.has(a, n));
}

// Signs: ⊥, −, 0, +, ⊤.
export type Sign = 'bot' | 'neg' | 'zero' | 'pos' | 'top';
const signOf = (n: number): Sign => (n < 0 ? 'neg' : n === 0 ? 'zero' : 'pos');
export const signs: Domain<Sign> = {
  key: 'signs',
  name: 'Signs',
  bottom: 'bot',
  top: 'top',
  leq: (a, b) => a === 'bot' || b === 'top' || a === b,
  join: (a, b) => (a === 'bot' ? b : b === 'bot' ? a : a === b ? a : 'top'),
  meet: (a, b) => (a === 'top' ? b : b === 'top' ? a : a === b ? a : 'bot'),
  of: signOf,
  has: (a, n) => a === 'top' || (a !== 'bot' && a === signOf(n)),
  format: (a) => ({ bot: '⊥', neg: '−', zero: '0', pos: '+', top: '⊤' })[a],
  neg: (a) => (a === 'neg' ? 'pos' : a === 'pos' ? 'neg' : a),
  add: (a, b) => {
    if (a === 'bot' || b === 'bot') return 'bot';
    if (a === 'zero') return b;
    if (b === 'zero') return a;
    return a === b ? a : 'top';
  },
  mul: (a, b) => {
    if (a === 'bot' || b === 'bot') return 'bot';
    if (a === 'zero' || b === 'zero') return 'zero';
    if (a === 'top' || b === 'top') return 'top';
    return a === b ? 'pos' : 'neg';
  },
};

// Parity: ⊥, even, odd, ⊤.
export type Parity = 'bot' | 'even' | 'odd' | 'top';
const parityOf = (n: number): Parity => (Math.abs(n) % 2 === 0 ? 'even' : 'odd');
export const parity: Domain<Parity> = {
  key: 'parity',
  name: 'Parity',
  bottom: 'bot',
  top: 'top',
  leq: (a, b) => a === 'bot' || b === 'top' || a === b,
  join: (a, b) => (a === 'bot' ? b : b === 'bot' ? a : a === b ? a : 'top'),
  meet: (a, b) => (a === 'top' ? b : b === 'top' ? a : a === b ? a : 'bot'),
  of: parityOf,
  has: (a, n) => a === 'top' || (a !== 'bot' && a === parityOf(n)),
  format: (a) => ({ bot: '⊥', even: 'even', odd: 'odd', top: '⊤' })[a],
  neg: (a) => a,
  add: (a, b) => (a === 'bot' || b === 'bot' ? 'bot' : a === 'top' || b === 'top' ? 'top' : a === b ? 'even' : 'odd'),
  mul: (a, b) => (a === 'bot' || b === 'bot' ? 'bot' : a === 'even' || b === 'even' ? 'even' : a === 'top' || b === 'top' ? 'top' : 'odd'),
};

// Constants: ⊥, a number, ⊤.
export type Constant = { kind: 'bot' } | { kind: 'const'; value: number } | { kind: 'top' };
const BOT_C: Constant = { kind: 'bot' };
const TOP_C: Constant = { kind: 'top' };
const lift = (f: (x: number, y: number) => number) => (a: Constant, b: Constant): Constant =>
  a.kind === 'bot' || b.kind === 'bot' ? BOT_C : a.kind === 'const' && b.kind === 'const' ? { kind: 'const', value: f(a.value, b.value) } : TOP_C;
export const constants: Domain<Constant> = {
  key: 'constants',
  name: 'Constants',
  bottom: BOT_C,
  top: TOP_C,
  leq: (a, b) => a.kind === 'bot' || b.kind === 'top' || (a.kind === 'const' && b.kind === 'const' && a.value === b.value),
  join: (a, b) => (a.kind === 'bot' ? b : b.kind === 'bot' ? a : a.kind === 'const' && b.kind === 'const' && a.value === b.value ? a : TOP_C),
  meet: (a, b) => (a.kind === 'top' ? b : b.kind === 'top' ? a : a.kind === 'const' && b.kind === 'const' && a.value === b.value ? a : BOT_C),
  of: (n) => ({ kind: 'const', value: n }),
  has: (a, n) => a.kind === 'top' || (a.kind === 'const' && a.value === n),
  format: (a) => (a.kind === 'bot' ? '⊥' : a.kind === 'top' ? '⊤' : String(a.value)),
  neg: (a) => (a.kind === 'const' ? { kind: 'const', value: -a.value } : a),
  // 0 times anything is 0, even ⊤: a small precision gain over plain lifting.
  mul: (a, b) => (a.kind === 'bot' || b.kind === 'bot' ? BOT_C : (a.kind === 'const' && a.value === 0) || (b.kind === 'const' && b.value === 0) ? { kind: 'const', value: 0 } : lift((x, y) => x * y)(a, b)),
  add: lift((x, y) => x + y),
};

// Intervals, with the arithmetic of the interval analysis.
export type Range = { lo: number; hi: number } | null;
const mulBound = (a: number, b: number) => (a === 0 || b === 0 ? 0 : a * b);
export const ranges: Domain<Range> = {
  key: 'intervals',
  name: 'Intervals',
  bottom: null,
  top: { lo: -Infinity, hi: Infinity },
  leq: (a, b) => !a || (!!b && b.lo <= a.lo && a.hi <= b.hi),
  join: (a, b) => (!a ? b : !b ? a : { lo: Math.min(a.lo, b.lo), hi: Math.max(a.hi, b.hi) }),
  meet: (a, b) => {
    if (!a || !b) return null;
    const lo = Math.max(a.lo, b.lo);
    const hi = Math.min(a.hi, b.hi);
    return lo > hi ? null : { lo, hi };
  },
  of: (n) => ({ lo: n, hi: n }),
  has: (a, n) => !!a && a.lo <= n && n <= a.hi,
  format: (a) => {
    if (!a) return '⊥';
    const f = (n: number) => (n === Infinity ? '+∞' : n === -Infinity ? '−∞' : String(n));
    return a.lo === a.hi ? `[${f(a.lo)}]` : `[${f(a.lo)}, ${f(a.hi)}]`;
  },
  neg: (a) => a && { lo: -a.hi, hi: -a.lo },
  add: (a, b) => a && b && { lo: a.lo + b.lo, hi: a.hi + b.hi },
  mul: (a, b) => {
    if (!a || !b) return null;
    const p = [mulBound(a.lo, b.lo), mulBound(a.lo, b.hi), mulBound(a.hi, b.lo), mulBound(a.hi, b.hi)];
    return { lo: Math.min(...p), hi: Math.max(...p) };
  },
};

export const DOMAINS = { signs, parity, constants, intervals: ranges } as const;
export type DomainKey = keyof typeof DOMAINS;

/** Expressions over one variable `x`. */
export type Expr = { op: 'x' } | { op: 'const'; value: number } | { op: 'neg'; e: Expr } | { op: 'add' | 'sub' | 'mul'; l: Expr; r: Expr };

export function evalConcrete(e: Expr, x: number): number {
  switch (e.op) {
    case 'x': return x;
    case 'const': return e.value;
    case 'neg': return -evalConcrete(e.e, x);
    case 'add': return evalConcrete(e.l, x) + evalConcrete(e.r, x);
    case 'sub': return evalConcrete(e.l, x) - evalConcrete(e.r, x);
    case 'mul': return evalConcrete(e.l, x) * evalConcrete(e.r, x);
  }
}

/** The analysis's evaluation: each operation's abstract version applied to its operands' abstract values. */
export function evalAbstract<A>(d: Domain<A>, e: Expr, x: A): A {
  switch (e.op) {
    case 'x': return x;
    case 'const': return d.of(e.value);
    case 'neg': return d.neg(evalAbstract(d, e.e, x));
    case 'add': return d.add(evalAbstract(d, e.l, x), evalAbstract(d, e.r, x));
    case 'sub': return d.add(evalAbstract(d, e.l, x), d.neg(evalAbstract(d, e.r, x)));
    case 'mul': return d.mul(evalAbstract(d, e.l, x), evalAbstract(d, e.r, x));
  }
}

/** The best transformer, α ∘ f ∘ γ, computed over the window: the most precise sound result the domain can express. */
export function evalBest<A>(d: Domain<A>, e: Expr, x: A, window: readonly number[]): A {
  return alpha(d, gamma(d, x, window).map((n) => evalConcrete(e, n)));
}

/** Parses a tiny expression language: x, integers, unary minus, + - * and parentheses. */
export function parseExpr(source: string): Expr {
  const tokens = source.match(/\d+|[x()+\-*]/g) ?? [];
  if (tokens.join('') !== source.replace(/\s+/g, '')) throw new Error(`Cannot parse ${source}`);
  let i = 0;
  const peek = () => tokens[i];
  const sum = (): Expr => {
    let l = product();
    while (peek() === '+' || peek() === '-') {
      const op = tokens[i++] === '+' ? 'add' : 'sub';
      l = { op, l, r: product() };
    }
    return l;
  };
  const product = (): Expr => {
    let l = unary();
    while (peek() === '*') {
      i++;
      l = { op: 'mul', l, r: unary() };
    }
    return l;
  };
  const unary = (): Expr => {
    const t = tokens[i++];
    if (t === '-') return { op: 'neg', e: unary() };
    if (t === 'x') return { op: 'x' };
    if (t === '(') {
      const e = sum();
      if (tokens[i++] !== ')') throw new Error('Expected )');
      return e;
    }
    if (t && /^\d+$/.test(t)) return { op: 'const', value: Number(t) };
    throw new Error(`Unexpected ${t ?? 'end'}`);
  };
  const e = sum();
  if (i !== tokens.length) throw new Error(`Unexpected ${tokens[i]}`);
  return e;
}
