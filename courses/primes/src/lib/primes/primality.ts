/**
 * Primality: trial division, the Fermat and Miller–Rabin tests, Jacobi symbols and Solovay–Strassen,
 * Lucas–Lehmer for Mersenne numbers, and a deterministic `isPrime` for every n < 2^64 (and a
 * strong probable-prime test beyond).
 */
import { gcd, gcdBig, isqrt, modBig, modPow, modPowBig } from './arith';

/** Trial division by 2, 3 and then 6k ± 1 up to √n. Fine for n up to about 10^12. */
export function isPrimeTrial(n: number): boolean {
  if (!Number.isInteger(n) || n < 2) return false;
  if (n < 4) return true;
  if (n % 2 === 0 || n % 3 === 0) return false;
  const r = isqrt(n);
  for (let d = 5; d <= r; d += 6) if (n % d === 0 || n % (d + 2) === 0) return false;
  return true;
}

/** The smallest prime factor of n ≥ 2 by trial division. */
export function smallestFactor(n: number): number {
  if (n % 2 === 0) return 2;
  if (n % 3 === 0) return 3;
  const r = isqrt(n);
  for (let d = 5; d <= r; d += 6) {
    if (n % d === 0) return d;
    if (n % (d + 2) === 0) return d + 2;
  }
  return n;
}

/** Fermat test to base a: true when a^(n−1) ≡ 1 (mod n) ("n is a probable prime to base a"). */
export function fermatTest(n: number, a: number): boolean {
  return modPow(a, n - 1, n) === 1;
}

export function fermatTestBig(n: bigint, a: bigint): boolean {
  return modPowBig(a, n - 1n, n) === 1n;
}

/** Write n − 1 = 2^s · d with d odd. */
export function decompose(n: bigint): { s: number; d: bigint } {
  let d = n - 1n;
  let s = 0;
  while ((d & 1n) === 0n) {
    d >>= 1n;
    s++;
  }
  return { s, d };
}

/** The sequence a^d, a^(2d), …, a^(2^s d) mod n that the Miller–Rabin test inspects. */
export function millerRabinTrace(n: bigint, a: bigint): bigint[] {
  const { s, d } = decompose(n);
  const out: bigint[] = [];
  let x = modPowBig(a, d, n);
  out.push(x);
  for (let i = 0; i < s; i++) {
    x = (x * x) % n;
    out.push(x);
  }
  return out;
}

/**
 * One round of the Miller–Rabin test for odd n > 2: true when n is a strong probable prime to base a
 * (a is then a "strong liar" if n is composite); false when a is a witness that n is composite.
 */
export function strongProbablePrime(n: bigint, a: bigint): boolean {
  a = modBig(a, n);
  if (a === 0n) return true;
  const { s, d } = decompose(n);
  let x = modPowBig(a, d, n);
  if (x === 1n || x === n - 1n) return true;
  for (let i = 1; i < s; i++) {
    x = (x * x) % n;
    if (x === n - 1n) return true;
    if (x === 1n) return false;
  }
  return false;
}

const SMALL_PRIMES: bigint[] = (() => {
  const out: bigint[] = [];
  for (let k = 43; k < 1000; k += 2) if (isPrimeTrial(k)) out.push(BigInt(k));
  return out;
})();

/** The first thirteen primes as bases: deterministic for every n < 3.3 · 10^24 (Sorenson and Webster, 2015). */
const BASES = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n, 41n];

/**
 * Primality for numbers and bigints. Deterministic for n < 3.3 × 10^24; above that it is a
 * Miller–Rabin test with the first thirteen prime bases plus 20 pseudo-random ones (a composite survives with probability below 4^-20).
 */
export function isPrime(n: number | bigint): boolean {
  if (typeof n === 'number') {
    if (!Number.isInteger(n) || n < 2) return false;
    if (n < 1e6) return isPrimeTrial(n);
    n = BigInt(n);
  }
  if (n < 2n) return false;
  for (const p of BASES) {
    if (n === p) return true;
    if (n % p === 0n) return false;
  }
  // Cheap prefilter: about 92% of random candidates have a prime factor below 1000.
  if (n > 1_000_000n) for (const p of SMALL_PRIMES) if (n % p === 0n) return false;
  for (const a of BASES) if (!strongProbablePrime(n, a)) return false;
  if (n < 3317044064679887385961981n) return true;
  // Pseudo-random extra bases from a fixed linear congruential sequence (reproducible).
  let seed = 0x9e3779b97f4a7c15n;
  for (let i = 0; i < 20; i++) {
    seed = (seed * 6364136223846793005n + 1442695040888963407n) & 0xffffffffffffffffn;
    const a = 2n + (seed % (n - 3n));
    if (!strongProbablePrime(n, a)) return false;
  }
  return true;
}

/** The next prime ≥ n. */
export function nextPrime(n: bigint): bigint {
  if (n <= 2n) return 2n;
  let k = n % 2n === 0n ? n + 1n : n;
  while (!isPrime(k)) k += 2n;
  return k;
}

/** Korselt's criterion: n is a Carmichael number iff n is composite, squarefree, and p − 1 | n − 1 for every prime p | n. */
export function isCarmichael(n: number): boolean {
  if (n < 3 || n % 2 === 0 || isPrimeTrial(n)) return false;
  let m = n;
  let factors = 0;
  for (let p = 3; p * p <= m; p += 2) {
    if (m % p !== 0) continue;
    m /= p;
    if (m % p === 0) return false; // not squarefree
    if ((n - 1) % (p - 1) !== 0) return false;
    factors++;
  }
  if (m > 1) {
    if ((n - 1) % (m - 1) !== 0) return false;
    factors++;
  }
  return factors >= 2;
}

/** The Jacobi symbol (a/n) for odd n > 0. Equals the Legendre symbol when n is prime. */
export function jacobi(a: bigint, n: bigint): number {
  if (n <= 0n || n % 2n === 0n) throw new RangeError('jacobi: n must be odd and positive');
  a = modBig(a, n);
  let result = 1;
  while (a !== 0n) {
    while (a % 2n === 0n) {
      a /= 2n;
      const r = n % 8n;
      if (r === 3n || r === 5n) result = -result;
    }
    [a, n] = [n, a];
    if (a % 4n === 3n && n % 4n === 3n) result = -result;
    a %= n;
  }
  return n === 1n ? result : 0;
}

/** Legendre symbol (a/p) for an odd prime p, by Euler's criterion. */
export function legendre(a: number, p: number): number {
  const r = modPow(a, (p - 1) / 2, p);
  return r === p - 1 ? -1 : r;
}

/** One round of Solovay–Strassen: true when a^((n−1)/2) ≡ (a/n) (mod n) — an "Euler liar" if n is composite. */
export function eulerProbablePrime(n: bigint, a: bigint): boolean {
  if (gcdBig(a, n) !== 1n) return false;
  const j = jacobi(a, n);
  const x = modPowBig(a, (n - 1n) / 2n, n);
  return modBig(BigInt(j), n) === x;
}

/**
 * Lucas–Lehmer: for an odd prime p, M_p = 2^p − 1 is prime iff s_{p−2} ≡ 0 (mod M_p), where
 * s_0 = 4 and s_{k+1} = s_k² − 2.
 */
export function lucasLehmer(p: number): boolean {
  if (p === 2) return true;
  const M = (1n << BigInt(p)) - 1n;
  let s = 4n;
  for (let i = 0; i < p - 2; i++) {
    s = s * s - 2n;
    // Reduce modulo 2^p − 1 with shifts: s = (s mod 2^p) + (s >> p).
    s = (s & M) + (s >> BigInt(p));
    if (s >= M) s -= M;
  }
  return s === 0n;
}

/** The residues s_0, …, s_{p−2} of the Lucas–Lehmer sequence modulo M_p. */
export function lucasLehmerTrace(p: number): bigint[] {
  const M = (1n << BigInt(p)) - 1n;
  const out = [4n % M];
  let s = 4n;
  for (let i = 0; i < p - 2; i++) {
    s = modBig(s * s - 2n, M);
    out.push(s);
  }
  return out;
}

/** All bases a in [1, n−1] that are Fermat liars, strong liars and Euler liars for odd composite n (small n). */
export function liars(n: number): { fermat: number[]; strong: number[]; euler: number[] } {
  const fermat: number[] = [];
  const strong: number[] = [];
  const euler: number[] = [];
  const N = BigInt(n);
  for (let a = 1; a < n; a++) {
    if (gcd(a, n) === 1 && modPow(a, n - 1, n) === 1) fermat.push(a);
    if (strongProbablePrime(N, BigInt(a))) strong.push(a);
    if (eulerProbablePrime(N, BigInt(a))) euler.push(a);
  }
  return { fermat, strong, euler };
}
