/**
 * Polynomials with integer coefficients over named variables, for polynomial interpretations.
 * A polynomial is a map from monomials (sorted "x^2*y" keys; "" for the constant) to coefficients.
 */

export type Poly = ReadonlyMap<string, number>;

type Mono = Map<string, number>;

function monoKey(m: Mono): string {
  return [...m.entries()]
    .filter(([, e]) => e > 0)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([x, e]) => (e === 1 ? x : `${x}^${e}`))
    .join('*');
}

function parseMono(k: string): Mono {
  const m: Mono = new Map();
  if (!k) return m;
  for (const part of k.split('*')) {
    const [x, e] = part.split('^');
    m.set(x!, (m.get(x!) ?? 0) + (e ? Number(e) : 1));
  }
  return m;
}

function clean(p: Map<string, number>): Poly {
  for (const [k, c] of p) if (c === 0) p.delete(k);
  return p;
}

export const constant = (n: number): Poly => clean(new Map([['', n]]));
export const variable = (x: string): Poly => new Map([[x, 1]]);
export const ZERO: Poly = new Map();

export function add(...ps: Poly[]): Poly {
  const out = new Map<string, number>();
  for (const p of ps) for (const [k, c] of p) out.set(k, (out.get(k) ?? 0) + c);
  return clean(out);
}

export function scale(p: Poly, n: number): Poly {
  const out = new Map<string, number>();
  for (const [k, c] of p) out.set(k, c * n);
  return clean(out);
}

export const sub = (p: Poly, q: Poly): Poly => add(p, scale(q, -1));

export function mul(p: Poly, q: Poly): Poly {
  const out = new Map<string, number>();
  for (const [k1, c1] of p)
    for (const [k2, c2] of q) {
      const m = parseMono(k1);
      for (const [x, e] of parseMono(k2)) m.set(x, (m.get(x) ?? 0) + e);
      const k = monoKey(m);
      out.set(k, (out.get(k) ?? 0) + c1 * c2);
    }
  return clean(out);
}

/** Replace each variable by a polynomial. */
export function substitute(p: Poly, env: ReadonlyMap<string, Poly>): Poly {
  let out: Poly = ZERO;
  for (const [k, c] of p) {
    let term: Poly = constant(c);
    for (const [x, e] of parseMono(k)) {
      const val = env.get(x) ?? variable(x);
      for (let i = 0; i < e; i++) term = mul(term, val);
    }
    out = add(out, term);
  }
  return out;
}

export function evalPoly(p: Poly, env: ReadonlyMap<string, number>): number {
  let s = 0;
  for (const [k, c] of p) {
    let t = c;
    for (const [x, e] of parseMono(k)) t *= (env.get(x) ?? 0) ** e;
    s += t;
  }
  return s;
}

export const constantPart = (p: Poly): number => p.get('') ?? 0;

/**
 * Over the natural numbers, `p > 0` for all values of the variables if the constant is at least 1
 * and no coefficient is negative (absolute positiveness: sufficient, not necessary).
 */
export const positive = (p: Poly): boolean => constantPart(p) >= 1 && [...p.values()].every((c) => c >= 0);
export const nonNegative = (p: Poly): boolean => [...p.values()].every((c) => c >= 0);

export function showPoly(p: Poly): string {
  if (p.size === 0) return '0';
  const entries = [...p.entries()].sort(([a], [b]) => {
    const da = degree(a), db = degree(b);
    return db - da || (a < b ? -1 : a > b ? 1 : 0);
  });
  let s = '';
  for (const [k, c] of entries) {
    const abs = Math.abs(c);
    const body = k === '' ? String(abs) : abs === 1 ? k.replaceAll('*', '·') : `${abs}·${k.replaceAll('*', '·')}`;
    if (!s) s = c < 0 ? `−${body}` : body;
    else s += c < 0 ? ` − ${body}` : ` + ${body}`;
  }
  return s;
}

const degree = (k: string) => (k ? [...parseMono(k).values()].reduce((a, b) => a + b, 0) : 0);

/**
 * Parse a polynomial: sums of products of integers and variables, with `^` powers and parentheses,
 * e.g. `2*x + y^2 + 1`, `(x + 1)*(y + 1)` or `2x + 1`.
 */
export function parsePoly(src: string): Poly {
  let i = 0;
  const s = src.replace(/\s+/g, '');
  const peek = () => s[i];
  const expr = (): Poly => {
    let p = termP();
    while (peek() === '+' || peek() === '-') {
      const op = s[i++];
      const q = termP();
      p = op === '+' ? add(p, q) : sub(p, q);
    }
    return p;
  };
  const termP = (): Poly => {
    let p = factor();
    for (;;) {
      if (peek() === '*' || peek() === '·') {
        i++;
        p = mul(p, factor());
      } else if (peek() !== undefined && /[A-Za-z(]/.test(peek()!)) p = mul(p, factor());
      else break;
    }
    return p;
  };
  const factor = (): Poly => {
    let base: Poly;
    const ch = peek();
    if (ch === '(') {
      i++;
      base = expr();
      if (s[i++] !== ')') throw new Error('expected “)” in polynomial');
    } else if (ch !== undefined && /\d/.test(ch)) {
      let j = i;
      while (j < s.length && /\d/.test(s[j]!)) j++;
      base = constant(Number(s.slice(i, j)));
      i = j;
    } else if (ch !== undefined && /[A-Za-z]/.test(ch)) {
      let j = i;
      while (j < s.length && /[A-Za-z0-9_']/.test(s[j]!)) j++;
      base = variable(s.slice(i, j));
      i = j;
    } else if (ch === '-') {
      i++;
      return scale(factor(), -1);
    } else throw new Error(`unexpected “${ch ?? 'end'}” in polynomial`);
    if (peek() === '^') {
      i++;
      let j = i;
      while (j < s.length && /\d/.test(s[j]!)) j++;
      const e = Number(s.slice(i, j));
      i = j;
      let out: Poly = constant(1);
      for (let k = 0; k < e; k++) out = mul(out, base);
      return out;
    }
    return base;
  };
  const p = expr();
  if (i < s.length) throw new Error(`unexpected “${s[i]}” in polynomial`);
  return p;
}

export function variablesOf(p: Poly): string[] {
  const out = new Set<string>();
  for (const k of p.keys()) for (const x of parseMono(k).keys()) out.add(x);
  return [...out];
}
