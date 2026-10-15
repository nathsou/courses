/**
 * A small seeded random number generator (mulberry32), so every simulation in the course is reproducible.
 */
export interface Rng {
  /** Uniform in [0, 1). */
  next(): number;
  /** Uniform integer in [lo, hi]. */
  int(lo: number, hi: number): number;
  /** Standard normal (Box–Muller). */
  normal(): number;
}

export function rng(seed = 1): Rng {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    normal: () => {
      const u = 1 - next();
      const v = next();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
  };
}

/**
 * Cramér's model: a random set containing each n ≥ 3 independently with probability 1/log n
 * (and 2 always). Returns the "pseudo-primes" up to n.
 */
export function cramerPrimes(n: number, seed = 1): number[] {
  const r = rng(seed);
  const out = n >= 2 ? [2] : [];
  for (let k = 3; k <= n; k++) if (r.next() < 1 / Math.log(k)) out.push(k);
  return out;
}

/**
 * Eigenvalues of an n×n GUE matrix are hard to compute without a linear-algebra library; the course instead
 * samples the Wigner surmise p(s) = (32/π²) s² e^{−4s²/π} for unitary-ensemble spacings.
 */
export function wignerGUE(s: number): number {
  return (32 / (Math.PI * Math.PI)) * s * s * Math.exp((-4 * s * s) / Math.PI);
}

/** Poisson spacing density e^{−s}, for comparison with GUE. */
export function poissonSpacing(s: number): number {
  return Math.exp(-s);
}

/** Montgomery's pair-correlation density 1 − (sin πu / πu)². */
export function pairCorrelation(u: number): number {
  if (u === 0) return 0;
  const x = Math.PI * u;
  return 1 - (Math.sin(x) / x) ** 2;
}

/** A uniformly random bigint with exactly `bits` bits (top bit set), from a seeded generator. */
export function randomBits(bits: number, r: Rng): bigint {
  let v = 1n;
  for (let i = 1; i < bits; i++) v = (v << 1n) | (r.next() < 0.5 ? 1n : 0n);
  return v;
}
