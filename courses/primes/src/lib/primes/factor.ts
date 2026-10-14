/**
 * Factoring: trial division, Fermat's difference of squares, Pollard's ρ (with Floyd's cycle finding)
 * and Pollard's p − 1, and a complete factoriser that combines them.
 */
import { gcdBig, isqrtBig, modBig, modPowBig } from './arith';
import { isPrime } from './primality';
import { primesUpTo } from './sieve';

/** Prime factorisation as [prime, exponent] pairs, by trial division (n < 2^53). */
export function factorTrial(n: number): [number, number][] {
  const out: [number, number][] = [];
  if (n < 2) return out;
  for (const p of [2, 3]) {
    if (n % p === 0) {
      let e = 0;
      while (n % p === 0) {
        n /= p;
        e++;
      }
      out.push([p, e]);
    }
  }
  for (let d = 5; d * d <= n; d += 6) {
    for (const p of [d, d + 2]) {
      if (n % p !== 0) continue;
      let e = 0;
      while (n % p === 0) {
        n /= p;
        e++;
      }
      out.push([p, e]);
    }
  }
  if (n > 1) out.push([n, 1]);
  return out;
}

/** Fermat's method for odd n: find a with a² − n a perfect square b², so n = (a − b)(a + b). */
export function fermatFactor(n: bigint, maxSteps = 1_000_000): { a: bigint; b: bigint; steps: number } | undefined {
  if (n % 2n === 0n) return { a: n / 2n + 1n, b: n / 2n - 1n, steps: 0 };
  let a = isqrtBig(n);
  if (a * a < n) a++;
  for (let steps = 0; steps < maxSteps; steps++) {
    const b2 = a * a - n;
    const b = isqrtBig(b2);
    if (b * b === b2) return { a, b, steps };
    a++;
  }
  return undefined;
}

/** The sequence x_{i+1} = x_i² + c mod n, which Pollard's ρ walks. */
export function rhoSequence(n: bigint, x0: bigint, c: bigint, length: number): bigint[] {
  const out = [modBig(x0, n)];
  for (let i = 1; i < length; i++) out.push(modBig(out[i - 1]! * out[i - 1]! + c, n));
  return out;
}

/**
 * Pollard's ρ with Floyd's tortoise and hare: returns a non-trivial factor of composite n, or
 * undefined if this choice of (x0, c) fails (try another c).
 */
export function pollardRho(n: bigint, x0 = 2n, c = 1n, maxSteps = 10_000_000): { factor: bigint; steps: number } | undefined {
  if (n % 2n === 0n) return { factor: 2n, steps: 0 };
  let x = x0;
  let y = x0;
  const f = (v: bigint) => (v * v + c) % n;
  for (let steps = 1; steps <= maxSteps; steps++) {
    x = f(x);
    y = f(f(y));
    const d = gcdBig(x > y ? x - y : y - x, n);
    if (d === n) return undefined;
    if (d > 1n) return { factor: d, steps };
  }
  return undefined;
}

/**
 * Pollard's p − 1 with smoothness bound B: computes a^(lcm(1..B)) and returns gcd(a^M − 1, n) when it
 * is a proper factor. Succeeds when some prime p | n has p − 1 B-smooth.
 */
export function pollardPMinus1(n: bigint, B: number, a = 2n): bigint | undefined {
  let x = a;
  for (const p of primesUpTo(B)) {
    let q = p;
    while (q * p <= B) q *= p;
    x = modPowBig(x, BigInt(q), n);
  }
  const d = gcdBig(x - 1n, n);
  return d > 1n && d < n ? d : undefined;
}

/** Complete factorisation of any positive bigint (trial division by small primes, then ρ recursively). */
export function factor(n: bigint): [bigint, number][] {
  const counts = new Map<bigint, number>();
  const add = (p: bigint) => counts.set(p, (counts.get(p) ?? 0) + 1);
  if (n < 1n) throw new RangeError('factor: n must be positive');
  for (const p of primesUpTo(1000)) {
    const P = BigInt(p);
    while (n % P === 0n) {
      add(P);
      n /= P;
    }
  }
  const stack = n > 1n ? [n] : [];
  while (stack.length) {
    const m = stack.pop()!;
    if (isPrime(m)) {
      add(m);
      continue;
    }
    const r = isqrtBig(m);
    if (r * r === m) {
      stack.push(r, r);
      continue;
    }
    let found: bigint | undefined;
    for (let c = 1n; !found; c++) found = pollardRho(m, 2n, c)?.factor;
    stack.push(found, m / found);
  }
  return [...counts.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
}

/** Render a factorisation like 2^3 · 3 · 5 (plain text). */
export function formatFactors(fs: [bigint | number, number][]): string {
  return fs.map(([p, e]) => (e === 1 ? `${p}` : `${p}^${e}`)).join(' · ');
}

/** The divisors of n (n < 2^53), sorted. */
export function divisors(n: number): number[] {
  const small: number[] = [];
  const large: number[] = [];
  for (let d = 1; d * d <= n; d++) {
    if (n % d !== 0) continue;
    small.push(d);
    if (d * d !== n) large.push(n / d);
  }
  return [...small, ...large.reverse()];
}

/** True when every prime factor of n is ≤ B. */
export function isSmooth(n: number, B: number): boolean {
  for (const p of primesUpTo(Math.min(B, n))) {
    while (n % p === 0) n /= p;
    if (n === 1) return true;
  }
  return n === 1;
}
