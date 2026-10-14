/**
 * Counting primes: π(x) by Legendre's formula and by the O(x^(3/4)) "Lucy" algorithm (a form of the
 * Legendre–Meissel–Lehmer idea), known values of π(10^k), and the smooth approximations x/log x,
 * li(x), Li(x) and Riemann's R(x).
 */
import { isqrt } from './arith';
import { primesUpTo } from './sieve';

/**
 * π(10^k) for k = 0..25 (OEIS A006880). Values up to 10^10 are re-computed by the tests; the larger
 * ones are quoted from the OEIS and the computations it cites.
 */
export const PI_POWERS_OF_TEN: readonly bigint[] = [
  0n,
  4n,
  25n,
  168n,
  1229n,
  9592n,
  78498n,
  664579n,
  5761455n,
  50847534n,
  455052511n,
  4118054813n,
  37607912018n,
  346065536839n,
  3204941750802n,
  29844570422669n,
  279238341033925n,
  2623557157654233n,
  24739954287740860n,
  234057667276344607n,
  2220819602560918840n,
  21127269486018731928n,
  201467286689315906290n,
  1925320391606803968923n,
  18435599767349200867866n,
  176846309399143769411680n,
];

/**
 * Legendre's φ(x, a): how many integers in [1, x] have no prime factor among the first a primes.
 * Uses φ(x, a) = φ(x, a − 1) − φ(⌊x / p_a⌋, a − 1). `primes` must contain at least a primes.
 */
export function legendrePhi(x: number, a: number, primes: number[], cache = new Map<string, number>()): number {
  if (a === 0) return Math.floor(x);
  if (x < 1) return 0;
  const p = primes[a - 1]!;
  if (x < p) return 1;
  const key = `${x},${a}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const v = legendrePhi(x, a - 1, primes, cache) - legendrePhi(Math.floor(x / p), a - 1, primes, cache);
  cache.set(key, v);
  return v;
}

/** Legendre's formula: π(x) = φ(x, a) + a − 1 with a = π(√x). */
export function primePiLegendre(x: number): number {
  if (x < 2) return 0;
  const ps = primesUpTo(isqrt(x));
  return legendrePhi(x, ps.length, ps) + ps.length - 1;
}

/**
 * π(x) in O(x^(3/4)) time and O(√x) memory (the algorithm popularised by "Lucy_Hedgehog" on
 * Project Euler; it is Legendre's sieve run on the √x distinct values ⌊x/n⌋ at once).
 * Exact for x < 2^53; practical up to about 10^12 in a browser.
 */
export function primePi(x: number): number {
  x = Math.floor(x);
  if (x < 2) return 0;
  const r = isqrt(x);
  // V holds the distinct values ⌊x/n⌋: x/1, x/2, …, x/r, then r−1 … 1 (when x/r > r, otherwise r … 1).
  const small = new Float64Array(r + 1); // S(v) for v ≤ r, indexed by v
  const large = new Float64Array(r + 1); // S(x/n) for n ≤ r, indexed by n
  for (let v = 1; v <= r; v++) small[v] = v - 1;
  for (let n = 1; n <= r; n++) large[n] = Math.floor(x / n) - 1;
  for (let p = 2; p <= r; p++) {
    if (small[p] === small[p - 1]) continue; // p is not prime
    const sp = small[p - 1]!; // number of primes < p
    const p2 = p * p;
    // Update large values x/n with x/n ≥ p².
    const nMax = Math.min(r, Math.floor(x / p2));
    for (let n = 1; n <= nMax; n++) {
      const d = n * p;
      const v = d <= r ? large[d]! : small[Math.floor(x / d)]!;
      large[n] = large[n]! - (v - sp);
    }
    // Update small values v ≥ p².
    for (let v = r; v >= p2; v--) small[v] = small[v]! - (small[Math.floor(v / p)]! - sp);
  }
  return large[1]!;
}

/** Euler–Mascheroni constant γ. */
export const EULER_GAMMA = 0.5772156649015329;

/** The logarithmic integral li(x) = PV ∫_0^x dt / log t, for x > 1 (series γ + log log x + Σ (log x)^n / (n · n!)). */
export function li(x: number): number {
  if (x === 1) return -Infinity;
  if (x <= 0) return NaN;
  const L = Math.log(x);
  let sum = 0;
  let term = 1;
  for (let n = 1; n < 400; n++) {
    term *= L / n;
    const add = term / n;
    sum += add;
    if (Math.abs(add) < 1e-17 * Math.abs(sum)) break;
  }
  return EULER_GAMMA + Math.log(Math.abs(L)) + sum;
}

/** li(2) ≈ 1.045. */
export const LI2 = 1.045163780117492784844588889194613136522615578151;

/** The offset logarithmic integral Li(x) = ∫_2^x dt / log t = li(x) − li(2). */
export function Li(x: number): number {
  return li(x) - LI2;
}

/** ζ(k) for integers k ≥ 2 (enough precision for the Gram series). */
function zetaInt(k: number): number {
  if (k === 2) return Math.PI ** 2 / 6;
  let s = 0;
  for (let n = 1; n <= 60; n++) {
    const t = n ** -k;
    s += t;
    if (t < 1e-18) break;
  }
  if (k < 8) {
    // Tail correction ∫_{60.5}^∞ t^-k dt.
    s += 60.5 ** (1 - k) / (k - 1);
  }
  return s;
}
const ZETA_INT = Array.from({ length: 200 }, (_, k) => (k >= 2 ? zetaInt(k) : NaN));

/** Riemann's R(x) = Σ μ(n)/n · li(x^(1/n)), computed with Gram's series 1 + Σ (log x)^k / (k · k! · ζ(k + 1)). */
export function riemannR(x: number): number {
  if (x <= 0) return NaN;
  const L = Math.log(x);
  let sum = 1;
  let term = 1;
  for (let k = 1; k < 199; k++) {
    term *= L / k;
    const add = term / (k * ZETA_INT[k + 1]!);
    sum += add;
    if (Math.abs(add) < 1e-17 * Math.abs(sum) && k > L) break;
  }
  return sum;
}

/** Chebyshev's θ(x) = Σ_{p ≤ x} log p and ψ(x) = Σ_{p^k ≤ x} log p, both for x up to a sieve bound. */
export function chebyshev(x: number): { theta: number; psi: number } {
  let theta = 0;
  let psi = 0;
  for (const p of primesUpTo(Math.floor(x))) {
    const lp = Math.log(p);
    theta += lp;
    for (let q = p; q <= x; q *= p) psi += lp;
  }
  return { theta, psi };
}
