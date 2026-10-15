/**
 * The Riemann zeta function.
 *
 * - `zeta(s)`: Euler–Maclaurin summation for Re s ≥ −1, the functional equation further left; accurate to
 *   about 1e-12 in the regions the widgets draw.
 * - `eta(s)` and partial sums, for the chapters that build ζ up step by step.
 * - `theta(t)`, `hardyZ(t)`: the Riemann–Siegel θ function and Hardy's Z(t) = e^{iθ(t)} ζ(½ + it), which
 *   is real, so zeros on the critical line are sign changes.
 * - `riemannSiegelZ(t)`: the Riemann–Siegel main sum with its first correction term (for teaching).
 * - `gramPoint(n)`, `findZeros(T)`: locating zeros on the critical line.
 */
import { add, c, div, mul, powReal, scale, sub, type Complex } from './complex';
import { gamma, lnGamma } from './gamma';
import { sin as csin } from './complex';

/** a^s for real a > 0. */
const cpow = (a: number, s: Complex): Complex => powReal(a, c(-s.re, -s.im));

/** B_{2k} for k = 1..12. */
const B2K = [1 / 6, -1 / 30, 1 / 42, -1 / 30, 5 / 66, -691 / 2730, 7 / 6, -3617 / 510, 43867 / 798, -174611 / 330, 854513 / 138, -236364091 / 2730];
const FACT2K = (() => {
  const out: number[] = [];
  let f = 1;
  for (let k = 1; k <= 12; k++) {
    f *= (2 * k - 1) * (2 * k);
    out.push(f);
  }
  return out;
})();

/**
 * ζ(s) by Euler–Maclaurin:
 *   ζ(s) = Σ_{n<N} n^{−s} + N^{1−s}/(s−1) + N^{−s}/2 + Σ_{k=1}^{m} B_{2k}/(2k)! · s(s+1)⋯(s+2k−2) · N^{1−s−2k} + E.
 * With m = 12 and N ≈ 0.4|s| + 12, successive correction terms shrink by a factor of about (2π · 0.4)² ≈ 6,
 * so the remainder is below 1e-10 of the first correction.
 */
export function zeta(s: Complex, N?: number): Complex {
  if (s.re === 1 && s.im === 0) return c(Infinity, 0);
  // Far left the partial sums cancel catastrophically (N^{1−σ} ≫ 1); use the functional equation
  // ζ(s) = 2^s π^{s−1} sin(πs/2) Γ(1 − s) ζ(1 − s) instead.
  if (s.re < -1 && N === undefined) {
    const one = c(1 - s.re, -s.im);
    const factor = mul(mul(cpow(2, s), cpow(Math.PI, c(s.re - 1, s.im))), csin(scale(s, Math.PI / 2)));
    return mul(mul(factor, gamma(one)), zeta(one));
  }
  const absS = Math.hypot(s.re, s.im);
  N ??= Math.ceil(0.4 * absS + 12);
  let sum = c(0);
  for (let n = 1; n < N; n++) sum = add(sum, powReal(n, s));
  const Ns = powReal(N, s); // N^{−s}
  sum = add(sum, div(scale(Ns, N), sub(s, c(1)))); // N^{1−s}/(s−1)
  sum = add(sum, scale(Ns, 0.5));
  // Rising products s(s+1)…(s+2k−2) times N^{1−s−2k}.
  let rising = s; // s for k = 1
  let Npow = scale(Ns, 1 / N); // N^{−s−1}
  for (let k = 1; k <= 12; k++) {
    sum = add(sum, scale(mul(rising, Npow), B2K[k - 1]! / FACT2K[k - 1]!));
    rising = mul(mul(rising, add(s, c(2 * k - 1))), add(s, c(2 * k)));
    Npow = scale(Npow, 1 / (N * N));
  }
  return sum;
}

/** ζ for real s ≠ 1. */
export function zetaReal(s: number): number {
  return zeta(c(s)).re;
}

/** The Dirichlet eta function η(s) = Σ (−1)^{n−1} n^{−s} = (1 − 2^{1−s}) ζ(s). */
export function eta(s: Complex): Complex {
  const factor = sub(c(1), scale(powReal(2, s), 2)); // 1 − 2·2^{−s}
  return mul(factor, zeta(s));
}

/** Partial sum Σ_{n ≤ N} n^{−s} (the series that only converges for Re s > 1). */
export function zetaPartial(s: Complex, N: number): Complex {
  let sum = c(0);
  for (let n = 1; n <= N; n++) sum = add(sum, powReal(n, s));
  return sum;
}

/** Partial sum of η: Σ_{n ≤ N} (−1)^{n−1} n^{−s}. */
export function etaPartial(s: Complex, N: number): Complex {
  let sum = c(0);
  for (let n = 1; n <= N; n++) {
    const t = powReal(n, s);
    sum = n % 2 ? add(sum, t) : sub(sum, t);
  }
  return sum;
}

/** Riemann–Siegel θ(t) = arg Γ(1/4 + it/2) − (t/2) log π (continuous branch, θ(0) = 0). */
export function theta(t: number): number {
  if (Math.abs(t) > 20) {
    // Asymptotic series, accurate to ~1e-13 for |t| > 20.
    const a = Math.abs(t);
    const v = (a / 2) * Math.log(a / (2 * Math.PI)) - a / 2 - Math.PI / 8 + 1 / (48 * a) + 7 / (5760 * a ** 3) + 31 / (80640 * a ** 5);
    return Math.sign(t) * v;
  }
  return lnGamma(c(0.25, t / 2)).im - (t / 2) * Math.log(Math.PI);
}

/** Hardy's Z(t) = e^{iθ(t)} ζ(½ + it), a real-valued function with |Z(t)| = |ζ(½ + it)|. */
export function hardyZ(t: number): number {
  const z = zeta(c(0.5, t));
  const th = theta(t);
  return z.re * Math.cos(th) - z.im * Math.sin(th);
}

/** ζ(½ + it), the value on the critical line. */
export function zetaOnLine(t: number): Complex {
  return zeta(c(0.5, t));
}

/**
 * The Riemann–Siegel formula: Z(t) ≈ 2 Σ_{n ≤ N} n^{−½} cos(θ(t) − t log n) + R(t), N = ⌊√(t/2π)⌋,
 * with R(t) ≈ (−1)^{N−1} (t/2π)^{−¼} C₀(p), p = √(t/2π) − N, C₀(p) = cos 2π(p² − p − 1/16) / cos 2πp.
 * `terms` = 0 gives the main sum only; 1 adds the C₀ correction. Error O(t^{−3/4}) with the correction.
 */
export function riemannSiegelZ(t: number, terms: 0 | 1 = 1): number {
  const a = Math.sqrt(t / (2 * Math.PI));
  const N = Math.floor(a);
  const th = theta(t);
  let sum = 0;
  for (let n = 1; n <= N; n++) sum += Math.cos(th - t * Math.log(n)) / Math.sqrt(n);
  sum *= 2;
  if (terms === 0) return sum;
  const p = a - N;
  return sum + (N % 2 === 1 ? 1 : -1) * Math.pow(a, -0.5) * c0(p);
}

/** C₀(p) = cos 2π(p² − p − 1/16) / cos 2πp, with its removable singularities at p = ¼, ¾ filled in. */
export function c0(p: number): number {
  const den = Math.cos(2 * Math.PI * p);
  if (Math.abs(den) < 1e-7) return (c0(p - 1e-5) + c0(p + 1e-5)) / 2;
  return Math.cos(2 * Math.PI * (p * p - p - 1 / 16)) / den;
}

/** The n-th Gram point g_n: the solution of θ(g_n) = nπ (g_{−1} ≈ 9.67, g_0 ≈ 17.85, g_1 ≈ 23.17). */
export function gramPoint(n: number): number {
  // Newton on θ(t) − nπ, θ'(t) ≈ ½ log(t/2π).
  let t = 2 * Math.PI * Math.exp(1 + lambertW((8 * n + 1) / (8 * Math.E)));
  for (let i = 0; i < 50; i++) {
    const f = theta(t) - n * Math.PI;
    const d = 0.5 * Math.log(t / (2 * Math.PI));
    const step = f / d;
    t -= step;
    if (Math.abs(step) < 1e-13 * t) break;
  }
  return t;
}

/** Principal branch of the Lambert W function for x ≥ −1/e. */
export function lambertW(x: number): number {
  let w: number;
  if (x >= 0) {
    // Winitzki's approximation.
    const L = Math.log1p(x);
    w = L * (1 - Math.log1p(L) / (2 + L));
  } else {
    // Series about the branch point x = −1/e.
    const p = Math.sqrt(Math.max(0, 2 * (Math.E * x + 1)));
    w = -1 + p - (p * p) / 3;
  }
  for (let i = 0; i < 100; i++) {
    const ew = Math.exp(w);
    const f = w * ew - x;
    const step = f / (ew * (w + 1) - ((w + 2) * f) / (2 * w + 2));
    w -= step;
    if (Math.abs(step) < 1e-15 * (1 + Math.abs(w))) break;
  }
  return w;
}

/** Refine a sign change of f on [a, b] by bisection then Illinois-style regula falsi. */
export function refineRoot(f: (t: number) => number, a: number, b: number, fa = f(a), fb = f(b), tol = 1e-11): number {
  let side = 0;
  for (let i = 0; i < 200 && b - a > tol; i++) {
    const m = (a * fb - b * fa) / (fb - fa);
    const fm = f(m);
    if (fm === 0) return m;
    if (Math.sign(fm) === Math.sign(fb)) {
      b = m;
      fb = fm;
      if (side === -1) fa /= 2;
      side = -1;
    } else {
      a = m;
      fa = fm;
      if (side === 1) fb /= 2;
      side = 1;
    }
  }
  return (a + b) / 2;
}

/**
 * The ordinates of the zeros of ζ on the critical line with 0 < t ≤ T, found as sign changes of Z(t) on
 * a grid fine enough for the course's ranges (step ≤ a quarter of the average gap 2π / log(t/2π)), then refined.
 * Close pairs (Lehmer's phenomenon) can need a finer step; `step` overrides.
 */
export function findZeros(T: number, step?: number, Z: (t: number) => number = hardyZ): number[] {
  const out: number[] = [];
  let tPrev = NaN;
  let zPrev = NaN;
  let t = 10;
  let zt = Z(t);
  while (t < T) {
    const h = step ?? Math.min(0.5, (2 * Math.PI) / Math.log(Math.max(t, 20) / (2 * Math.PI)) / 8);
    const t2 = Math.min(t + h, T);
    const z2 = Z(t2);
    if (Math.sign(z2) !== Math.sign(zt) && z2 !== 0) out.push(refineRoot(Z, t, t2, zt, z2));
    else if (Math.sign(zPrev) === Math.sign(zt) && Math.abs(zt) < Math.abs(zPrev) && Math.abs(zt) < Math.abs(z2)) {
      // |Z| dips without changing sign: a close pair of zeros may hide between the samples. Look closer.
      out.push(...closePair(Z, tPrev, t2));
    }
    tPrev = t;
    zPrev = zt;
    t = t2;
    zt = z2;
  }
  return out.sort((a, b) => a - b);
}

/** Search [a, b] on a fine grid for sign changes of Z (used where a coarse grid may have stepped over two zeros). */
function closePair(Z: (t: number) => number, a: number, b: number): number[] {
  const out: number[] = [];
  const n = 64;
  let t = a;
  let zt = Z(t);
  for (let i = 1; i <= n; i++) {
    const t2 = a + ((b - a) * i) / n;
    const z2 = Z(t2);
    if (Math.sign(z2) !== Math.sign(zt) && z2 !== 0) out.push(refineRoot(Z, t, t2, zt, z2));
    t = t2;
    zt = z2;
  }
  return out;
}

/**
 * The Riemann–von Mangoldt formula: the number of zeros with 0 < Im ρ ≤ T is
 * N(T) = θ(T)/π + 1 + S(T), with S(T) small; this returns the smooth part θ(T)/π + 1.
 */
export function zeroCountSmooth(T: number): number {
  return theta(T) / Math.PI + 1;
}

/** ξ(s) = ½ s (s − 1) π^{−s/2} Γ(s/2) ζ(s), the completed zeta function (for Re s > 0). */
export function xi(s: Complex): Complex {
  const lg = lnGamma(scale(s, 0.5));
  const factor = mul(scale(mul(s, sub(s, c(1))), 0.5), expC(sub(lg, scale(s, Math.log(Math.PI) / 2))));
  return mul(factor, zeta(s));
}

function expC(a: Complex): Complex {
  const m = Math.exp(a.re);
  return { re: m * Math.cos(a.im), im: m * Math.sin(a.im) };
}
