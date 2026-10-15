/**
 * Gaussian integers a + bi and Gaussian primes; sums of two squares.
 */
import { isPrime } from './primality';
import { isqrt, modPow } from './arith';

export type Gaussian = [number, number];

export const norm = ([a, b]: Gaussian): number => a * a + b * b;

/**
 * a + bi is a Gaussian prime iff
 *  - one of a, b is 0 and the other is ± a rational prime ≡ 3 (mod 4), or
 *  - both are non-zero and a² + b² is a rational prime.
 */
export function isGaussianPrime(a: number, b: number): boolean {
  a = Math.abs(a);
  b = Math.abs(b);
  if (a === 0) return isPrime(b) && b % 4 === 3;
  if (b === 0) return isPrime(a) && a % 4 === 3;
  return isPrime(a * a + b * b);
}

/** Write a prime p ≡ 1 (mod 4) (or p = 2) as a² + b² with a ≥ b > 0 (Hermite–Serret / Cornacchia). */
export function twoSquares(p: number): [number, number] | undefined {
  if (p === 2) return [1, 1];
  if (p % 4 !== 1 || !isPrime(p)) return undefined;
  // A square root of −1 mod p: c^((p−1)/4) for a quadratic non-residue c.
  let x = 0;
  for (let c = 2; c < p; c++) {
    if (modPow(c, (p - 1) / 2, p) === p - 1) {
      x = modPow(c, (p - 1) / 4, p);
      break;
    }
  }
  // Euclid on (p, x) until the remainder drops below √p.
  let [r0, r1] = [p, x];
  const limit = isqrt(p);
  while (r1 > limit) [r0, r1] = [r1, r0 % r1];
  const a = r1;
  const b = isqrt(p - a * a);
  return a >= b ? [a, b] : [b, a];
}

/** All representations n = a² + b² with a ≥ b ≥ 0. */
export function sumsOfTwoSquares(n: number): [number, number][] {
  const out: [number, number][] = [];
  for (let b = 0; 2 * b * b <= n; b++) {
    const a2 = n - b * b;
    const a = isqrt(a2);
    if (a * a === a2) out.push([a, b]);
  }
  return out;
}

/** Zagier's involution on the triples (x, y, z) with x² + 4yz = p (the "one-sentence proof"). */
export function zagier([x, y, z]: [number, number, number]): [number, number, number] {
  if (x < y - z) return [x + 2 * z, z, y - x - z];
  if (x < 2 * y) return [2 * y - x, y, x - y + z];
  return [x - 2 * y, x - y + z, y];
}

/** All triples (x, y, z) of positive integers with x² + 4yz = p. */
export function zagierTriples(p: number): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (let x = 1; x * x < p; x++) {
    const r = p - x * x;
    if (r % 4) continue;
    const m = r / 4;
    for (let y = 1; y <= m; y++) if (m % y === 0) out.push([x, y, m / y]);
  }
  return out;
}
