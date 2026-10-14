/**
 * Elementary arithmetic: gcd, Bézout, modular powers and inverses, integer square roots, the Chinese
 * remainder theorem. Functions come in a `number` flavour (exact below 2^53, and for modular arithmetic
 * with moduli below 2^26, where products stay exact) and a `bigint` flavour suffixed with `Big`.
 */

/** Greatest common divisor of two integers (always ≥ 0; gcd(0, 0) = 0). */
export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

export function gcdBig(a: bigint, b: bigint): bigint {
  if (a < 0n) a = -a;
  if (b < 0n) b = -b;
  while (b) [a, b] = [b, a % b];
  return a;
}

export function lcm(a: number, b: number): number {
  return a === 0 || b === 0 ? 0 : Math.abs((a / gcd(a, b)) * b);
}

/** Extended Euclid: returns [g, x, y] with a·x + b·y = g = gcd(a, b). */
export function extendedGcd(a: number, b: number): [number, number, number] {
  let [r0, r1] = [a, b];
  let [x0, x1] = [1, 0];
  let [y0, y1] = [0, 1];
  while (r1 !== 0) {
    const q = Math.floor(r0 / r1);
    [r0, r1] = [r1, r0 - q * r1];
    [x0, x1] = [x1, x0 - q * x1];
    [y0, y1] = [y1, y0 - q * y1];
  }
  if (r0 < 0) return [-r0, -x0, -y0];
  return [r0, x0, y0];
}

export function extendedGcdBig(a: bigint, b: bigint): [bigint, bigint, bigint] {
  let [r0, r1] = [a, b];
  let [x0, x1] = [1n, 0n];
  let [y0, y1] = [0n, 1n];
  while (r1 !== 0n) {
    const q = r0 / r1;
    [r0, r1] = [r1, r0 - q * r1];
    [x0, x1] = [x1, x0 - q * x1];
    [y0, y1] = [y1, y0 - q * y1];
  }
  if (r0 < 0n) return [-r0, -x0, -y0];
  return [r0, x0, y0];
}

/** One row of Euclid's algorithm, a = q·b + r, for visualisations. */
export interface EuclidStep {
  a: number;
  b: number;
  q: number;
  r: number;
}

export function euclidSteps(a: number, b: number): EuclidStep[] {
  const steps: EuclidStep[] = [];
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    const q = Math.floor(a / b);
    const r = a - q * b;
    steps.push({ a, b, q, r });
    [a, b] = [b, r];
  }
  return steps;
}

/** The least non-negative residue of a modulo m (m > 0). */
export function mod(a: number, m: number): number {
  const r = a % m;
  return r < 0 ? r + m : r;
}

export function modBig(a: bigint, m: bigint): bigint {
  const r = a % m;
  return r < 0n ? r + m : r;
}

/** a·b mod m, exact for any m < 2^53 (splits b into 16-bit pieces when the product could overflow). */
export function mulMod(a: number, b: number, m: number): number {
  a = mod(a, m);
  b = mod(b, m);
  if (a * b <= Number.MAX_SAFE_INTEGER) return (a * b) % m;
  return Number((BigInt(a) * BigInt(b)) % BigInt(m));
}

/** b^e mod m by repeated squaring (e ≥ 0, m ≥ 1). Exact for m < 2^53. */
export function modPow(b: number, e: number, m: number): number {
  if (m === 1) return 0;
  let result = 1;
  b = mod(b, m);
  while (e > 0) {
    if (e % 2 === 1) result = mulMod(result, b, m);
    b = mulMod(b, b, m);
    e = Math.floor(e / 2);
  }
  return result;
}

export function modPowBig(b: bigint, e: bigint, m: bigint): bigint {
  if (m === 1n) return 0n;
  let result = 1n;
  b = modBig(b, m);
  while (e > 0n) {
    if (e & 1n) result = (result * b) % m;
    b = (b * b) % m;
    e >>= 1n;
  }
  return result;
}

/** The inverse of a modulo m, or undefined when gcd(a, m) ≠ 1. */
export function modInverse(a: number, m: number): number | undefined {
  const [g, x] = extendedGcd(mod(a, m), m);
  return g === 1 ? mod(x, m) : undefined;
}

export function modInverseBig(a: bigint, m: bigint): bigint | undefined {
  const [g, x] = extendedGcdBig(modBig(a, m), m);
  return g === 1n ? modBig(x, m) : undefined;
}

/** ⌊√n⌋ for 0 ≤ n < 2^53. */
export function isqrt(n: number): number {
  if (n < 0) throw new RangeError('isqrt of a negative number');
  let r = Math.floor(Math.sqrt(n));
  while (r * r > n) r--;
  while ((r + 1) * (r + 1) <= n) r++;
  return r;
}

/** ⌊√n⌋ for any n ≥ 0 (Newton's method on bigints). */
export function isqrtBig(n: bigint): bigint {
  if (n < 0n) throw new RangeError('isqrt of a negative number');
  if (n < 2n) return n;
  let x = BigInt(Math.floor(Math.sqrt(Number(n))));
  // Newton from above converges to the floor.
  if (x * x > n || (x + 1n) * (x + 1n) <= n) {
    x = n;
    let y = (x + 1n) / 2n;
    while (y < x) {
      x = y;
      y = (x + n / x) / 2n;
    }
  }
  return x;
}

/** ⌊n^(1/k)⌋ for 0 ≤ n < 2^53. */
export function iroot(n: number, k: number): number {
  let r = Math.floor(Math.pow(n, 1 / k));
  while (r > 0 && Math.pow(r, k) > n) r--;
  while (Math.pow(r + 1, k) <= n) r++;
  return r;
}

/**
 * Chinese remainder theorem: the x in [0, M) with x ≡ residues[i] (mod moduli[i]) for all i, where
 * M is the product of the moduli. The moduli must be pairwise coprime; returns undefined otherwise.
 */
export function crt(residues: number[], moduli: number[]): { x: number; m: number } | undefined {
  let x = 0;
  let m = 1;
  for (let i = 0; i < moduli.length; i++) {
    const mi = moduli[i]!;
    const ri = mod(residues[i]!, mi);
    const inv = modInverse(m % mi, mi);
    if (inv === undefined) return undefined;
    // x + m·t ≡ ri (mod mi)  ⇒  t ≡ (ri − x)·m⁻¹
    const t = mulMod(mod(ri - x, mi), inv, mi);
    x = x + m * t;
    m = m * mi;
  }
  return { x: mod(x, m), m };
}

/** Euler's totient φ(n): how many of 1..n are coprime to n. */
export function totient(n: number): number {
  let result = n;
  let m = n;
  for (let p = 2; p * p <= m; p++) {
    if (m % p === 0) {
      while (m % p === 0) m /= p;
      result -= result / p;
    }
  }
  if (m > 1) result -= result / m;
  return result;
}

/** The multiplicative order of a modulo n (the least k ≥ 1 with a^k ≡ 1), or undefined if gcd(a, n) ≠ 1. */
export function order(a: number, n: number): number | undefined {
  if (gcd(a, n) !== 1) return undefined;
  if (n === 1) return 1;
  let k = 1;
  let x = mod(a, n);
  while (x !== 1) {
    x = mulMod(x, a, n);
    k++;
  }
  return k;
}

/** Number of decimal digits of a bigint. */
export function digits(n: bigint): number {
  return (n < 0n ? -n : n).toString().length;
}
