/**
 * Sieves: Eratosthenes (plain, odd-only, segmented), the linear sieve with smallest prime factors,
 * and sieves for the arithmetic functions μ, φ and Λ.
 */
import { isqrt } from './arith';

/** Primality flags for 0..n: the result r has r[k] = 1 exactly when k is prime. */
export function sieve(n: number): Uint8Array {
  const isPrime = new Uint8Array(n + 1);
  if (n < 2) return isPrime;
  isPrime.fill(1, 2);
  for (let p = 2; p * p <= n; p++) {
    if (!isPrime[p]) continue;
    for (let m = p * p; m <= n; m += p) isPrime[m] = 0;
  }
  return isPrime;
}

/** The primes ≤ n, in increasing order. */
export function primesUpTo(n: number): number[] {
  const flags = sieve(n);
  const out: number[] = [];
  for (let k = 2; k <= n; k++) if (flags[k]) out.push(k);
  return out;
}

/** The first `count` primes. */
export function firstPrimes(count: number): number[] {
  if (count <= 0) return [];
  // p_n < n (log n + log log n) for n ≥ 6 (Rosser).
  const bound = count < 6 ? 15 : Math.ceil(count * (Math.log(count) + Math.log(Math.log(count))));
  return primesUpTo(bound).slice(0, count);
}

/** The n-th prime (p_1 = 2). */
export function nthPrime(n: number): number {
  const ps = firstPrimes(n);
  return ps[n - 1]!;
}

/**
 * π(k) for every k in 0..n, as an Int32Array. Handy for plotting the staircase.
 */
export function primePiTable(n: number): Int32Array {
  const flags = sieve(n);
  const pi = new Int32Array(n + 1);
  let c = 0;
  for (let k = 0; k <= n; k++) {
    if (flags[k]) c++;
    pi[k] = c;
  }
  return pi;
}

/**
 * Segmented sieve: the primes in [lo, hi], using only O(√hi + (hi − lo)) memory.
 * Works for hi < 2^53 (in practice up to about 10^15 within a few seconds per million).
 */
export function primesInRange(lo: number, hi: number): number[] {
  if (hi < 2 || hi < lo) return [];
  lo = Math.max(lo, 2);
  const root = isqrt(hi);
  const small = primesUpTo(root);
  const size = hi - lo + 1;
  const composite = new Uint8Array(size);
  for (const p of small) {
    let start = Math.max(p * p, Math.ceil(lo / p) * p);
    for (let m = start; m <= hi; m += p) composite[m - lo] = 1;
  }
  const out: number[] = [];
  for (let i = 0; i < size; i++) if (!composite[i]) out.push(lo + i);
  return out;
}

/** Count the primes in [lo, hi] by segmented sieving (block by block, so memory stays small). */
export function countPrimesInRange(lo: number, hi: number, block = 1 << 16): number {
  if (hi < 2 || hi < lo) return 0;
  lo = Math.max(lo, 2);
  const small = primesUpTo(isqrt(hi));
  const composite = new Uint8Array(block);
  let count = 0;
  for (let start = lo; start <= hi; start += block) {
    const end = Math.min(start + block - 1, hi);
    composite.fill(0);
    for (const p of small) {
      if (p * p > end) break;
      let m = Math.max(p * p, Math.ceil(start / p) * p);
      for (; m <= end; m += p) composite[m - start] = 1;
    }
    for (let i = 0; i <= end - start; i++) if (!composite[i]) count++;
  }
  return count;
}

/**
 * The linear sieve (each composite is crossed out exactly once, by its smallest prime factor).
 * Returns spf with spf[k] = smallest prime factor of k (spf[0] = spf[1] = 0) and the list of primes.
 */
export function linearSieve(n: number): { spf: Int32Array; primes: number[] } {
  const spf = new Int32Array(n + 1);
  const primes: number[] = [];
  for (let i = 2; i <= n; i++) {
    if (spf[i] === 0) {
      spf[i] = i;
      primes.push(i);
    }
    for (const p of primes) {
      if (p > spf[i]! || i * p > n) break;
      spf[i * p] = p;
    }
  }
  return { spf, primes };
}

/** Factor k using a smallest-prime-factor table: a list of [prime, exponent] pairs. */
export function factorWithSpf(k: number, spf: Int32Array): [number, number][] {
  const out: [number, number][] = [];
  while (k > 1) {
    const p = spf[k]!;
    let e = 0;
    while (k % p === 0) {
      k /= p;
      e++;
    }
    out.push([p, e]);
  }
  return out;
}

/** The Möbius function μ(k) for k in 0..n (μ(0) is set to 0). */
export function mobiusTable(n: number): Int8Array {
  const mu = new Int8Array(n + 1);
  if (n >= 1) mu[1] = 1;
  const { spf } = linearSieve(n);
  for (let k = 2; k <= n; k++) {
    const p = spf[k]!;
    const m = k / p;
    mu[k] = m % p === 0 ? 0 : (-mu[m]! as number);
  }
  return mu;
}

/** Euler's φ(k) for k in 0..n. */
export function totientTable(n: number): Int32Array {
  const phi = new Int32Array(n + 1);
  for (let k = 0; k <= n; k++) phi[k] = k;
  for (let p = 2; p <= n; p++) {
    if (phi[p] !== p) continue;
    for (let m = p; m <= n; m += p) phi[m] = phi[m]! - phi[m]! / p;
  }
  return phi;
}

/** von Mangoldt Λ(k) for k in 0..n: log p if k is a power of the prime p, else 0. */
export function mangoldtTable(n: number): Float64Array {
  const L = new Float64Array(n + 1);
  const flags = sieve(n);
  for (let p = 2; p <= n; p++) {
    if (!flags[p]) continue;
    const lp = Math.log(p);
    for (let q = p; q <= n; q *= p) L[q] = lp;
  }
  return L;
}

/** Mertens function M(k) = Σ_{j ≤ k} μ(j) for k in 0..n. */
export function mertensTable(n: number): Int32Array {
  const mu = mobiusTable(n);
  const M = new Int32Array(n + 1);
  let s = 0;
  for (let k = 1; k <= n; k++) {
    s += mu[k]!;
    M[k] = s;
  }
  return M;
}

/** Sum of divisors σ(k) for k in 0..n. */
export function sigmaTable(n: number): Float64Array {
  const s = new Float64Array(n + 1);
  for (let d = 1; d <= n; d++) for (let m = d; m <= n; m += d) s[m] = s[m]! + d;
  return s;
}
