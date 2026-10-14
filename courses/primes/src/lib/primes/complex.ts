/**
 * Complex numbers as plain objects { re, im }. Small and allocation-happy: clarity first, since the
 * hot loops (ζ on a grid) live in workers and stay well within a frame budget at course sizes.
 */
export interface Complex {
  re: number;
  im: number;
}

export const c = (re: number, im = 0): Complex => ({ re, im });
export const ZERO = c(0);
export const ONE = c(1);
export const I = c(0, 1);

export const add = (a: Complex, b: Complex): Complex => ({ re: a.re + b.re, im: a.im + b.im });
export const sub = (a: Complex, b: Complex): Complex => ({ re: a.re - b.re, im: a.im - b.im });
export const mul = (a: Complex, b: Complex): Complex => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re });
export const scale = (a: Complex, k: number): Complex => ({ re: a.re * k, im: a.im * k });
export const neg = (a: Complex): Complex => ({ re: -a.re, im: -a.im });
export const conj = (a: Complex): Complex => ({ re: a.re, im: -a.im });

export function div(a: Complex, b: Complex): Complex {
  // Smith's algorithm, robust against overflow.
  if (Math.abs(b.re) >= Math.abs(b.im)) {
    const r = b.im / b.re;
    const d = b.re + b.im * r;
    return { re: (a.re + a.im * r) / d, im: (a.im - a.re * r) / d };
  }
  const r = b.re / b.im;
  const d = b.re * r + b.im;
  return { re: (a.re * r + a.im) / d, im: (a.im * r - a.re) / d };
}

export const abs = (a: Complex): number => Math.hypot(a.re, a.im);
export const arg = (a: Complex): number => Math.atan2(a.im, a.re);

export function exp(a: Complex): Complex {
  const m = Math.exp(a.re);
  return { re: m * Math.cos(a.im), im: m * Math.sin(a.im) };
}

/** Principal logarithm. */
export function log(a: Complex): Complex {
  return { re: Math.log(abs(a)), im: arg(a) };
}

/** a^b with the principal branch (a ≠ 0). */
export function pow(a: Complex, b: Complex): Complex {
  if (a.re === 0 && a.im === 0) return ZERO;
  return exp(mul(b, log(a)));
}

/** n^(−s) for a positive real n: exp(−s log n). */
export function powReal(n: number, s: Complex): Complex {
  const L = Math.log(n);
  const m = Math.exp(-s.re * L);
  const ang = -s.im * L;
  return { re: m * Math.cos(ang), im: m * Math.sin(ang) };
}

export function sin(a: Complex): Complex {
  return { re: Math.sin(a.re) * Math.cosh(a.im), im: Math.cos(a.re) * Math.sinh(a.im) };
}

export function cos(a: Complex): Complex {
  return { re: Math.cos(a.re) * Math.cosh(a.im), im: -Math.sin(a.re) * Math.sinh(a.im) };
}

export function sqrt(a: Complex): Complex {
  const r = abs(a);
  const re = Math.sqrt((r + a.re) / 2);
  const im = Math.sign(a.im || 1) * Math.sqrt(Math.max(0, (r - a.re) / 2));
  return { re, im };
}

export const fromPolar = (r: number, theta: number): Complex => ({ re: r * Math.cos(theta), im: r * Math.sin(theta) });

export function format(a: Complex, digits = 4): string {
  const re = a.re.toFixed(digits);
  const im = Math.abs(a.im).toFixed(digits);
  return `${re} ${a.im < 0 ? '−' : '+'} ${im}i`;
}
