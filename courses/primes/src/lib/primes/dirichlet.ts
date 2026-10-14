/**
 * Dirichlet characters modulo q and their L-functions.
 *
 * A character χ mod q is a function on the integers that is periodic mod q, completely multiplicative,
 * and vanishes on numbers sharing a factor with q. For prime q the group of units is cyclic, generated
 * by a primitive root g, and the φ(q) characters are χ_j(g^k) = e^{2πi jk/(q−1)}. For general q the
 * characters are built from the decomposition of (ℤ/qℤ)^× into cyclic factors given by the Chinese
 * remainder theorem.
 */
import { add, c, fromPolar, mul, powReal, type Complex } from './complex';
import { gcd, mod, mulMod, totient } from './arith';

/** A character as its table of values on 0..q−1. */
export interface Character {
  q: number;
  /** values[a] = χ(a) for 0 ≤ a < q. */
  values: Complex[];
  /** True for the principal character (1 on units). */
  principal: boolean;
  /** True when every value is real (±1 or 0). */
  real: boolean;
  label: string;
}

/** The smallest primitive root modulo a prime p. */
export function primitiveRoot(p: number): number {
  if (p === 2) return 1;
  const phi = p - 1;
  const factors: number[] = [];
  let m = phi;
  for (let d = 2; d * d <= m; d++) {
    if (m % d === 0) {
      factors.push(d);
      while (m % d === 0) m /= d;
    }
  }
  if (m > 1) factors.push(m);
  for (let g = 2; g < p; g++) {
    if (factors.every((f) => powMod(g, phi / f, p) !== 1)) return g;
  }
  throw new Error(`no primitive root mod ${p}`);
}

function powMod(b: number, e: number, m: number): number {
  let r = 1;
  b = mod(b, m);
  while (e > 0) {
    if (e & 1) r = mulMod(r, b, m);
    b = mulMod(b, b, m);
    e = Math.floor(e / 2);
  }
  return r;
}

/**
 * Independent generators of (ℤ/qℤ)^× and their orders, via the Chinese remainder theorem: for each prime
 * power p^k ∥ q the units mod p^k are cyclic (odd p: a primitive root mod p^k; 4: −1) or, for 2^k with
 * k ≥ 3, the product of ⟨−1⟩ and ⟨5⟩. Each local generator is lifted to be ≡ 1 modulo the other factors.
 */
function unitBasis(q: number): { gens: number[]; orders: number[] } {
  const gens: number[] = [];
  const orders: number[] = [];
  let m = q;
  const parts: [number, number][] = [];
  for (let p = 2; p * p <= m; p++) {
    if (m % p) continue;
    let k = 0;
    while (m % p === 0) {
      m /= p;
      k++;
    }
    parts.push([p, k]);
  }
  if (m > 1) parts.push([m, 1]);
  for (const [p, k] of parts) {
    const pk = p ** k;
    const rest = q / pk;
    const lift = (g: number) => {
      // x ≡ g (mod p^k), x ≡ 1 (mod rest).
      for (let x = mod(g, pk); x < q; x += pk) if (x % rest === 1 % rest) return x;
      throw new Error('lift failed');
    };
    if (p === 2) {
      if (k === 1) continue;
      gens.push(lift(-1));
      orders.push(2);
      if (k >= 3) {
        gens.push(lift(5));
        orders.push(2 ** (k - 2));
      }
    } else {
      let g = primitiveRoot(p);
      if (k > 1 && powMod(g, p - 1, p * p) === 1) g += p;
      gens.push(lift(g));
      orders.push((p - 1) * p ** (k - 1));
    }
  }
  return { gens, orders };
}

/** All φ(q) Dirichlet characters modulo q, the principal one first. */
export function characters(q: number): Character[] {
  if (q === 1) return [{ q, values: [c(1)], principal: true, real: true, label: 'χ₀' }];
  const { gens, orders } = unitBasis(q);
  // Express each unit as g1^e1 · g2^e2 ⋯ (unique, because the generators are independent).
  const exps = new Map<number, number[]>();
  const walk = (i: number, value: number, e: number[]) => {
    if (i === gens.length) {
      exps.set(value, e);
      return;
    }
    let x = value;
    for (let k = 0; k < orders[i]!; k++) {
      walk(i + 1, x, [...e, k]);
      x = mulMod(x, gens[i]!, q);
    }
  };
  walk(0, 1 % q, []);
  const total = orders.reduce((a, b) => a * b, 1);
  if (total !== totient(q)) throw new Error(`character basis failed for q = ${q}`);
  const out: Character[] = [];
  const index = (i: number, j: number[]) => {
    if (i === gens.length) {
      const values: Complex[] = [];
      let real = true;
      for (let a = 0; a < q; a++) {
        const e = exps.get(a);
        if (!e) {
          values.push(c(0));
          continue;
        }
        let angle = 0;
        for (let k = 0; k < e.length; k++) angle += (2 * Math.PI * j[k]! * e[k]!) / orders[k]!;
        const v = fromPolar(1, angle);
        const clean = c(Math.abs(v.re) < 1e-12 ? 0 : v.re, Math.abs(v.im) < 1e-12 ? 0 : v.im);
        if (clean.im !== 0) real = false;
        values.push(clean);
      }
      const principal = j.every((x) => x === 0);
      out.push({ q, values, principal, real, label: `χ${subscript(out.length)}` });
      return;
    }
    for (let k = 0; k < orders[i]!; k++) index(i + 1, [...j, k]);
  };
  index(0, []);
  return out;
}

const SUB = '₀₁₂₃₄₅₆₇₈₉';
const subscript = (n: number) => String(n).replace(/\d/g, (d) => SUB[Number(d)]!);

/** χ(n) for any integer n. */
export function chi(ch: Character, n: number): Complex {
  return ch.values[mod(n, ch.q)]!;
}

/**
 * L(s, χ) for Re s > 0 (non-principal χ) by partial summation over complete periods:
 * L(s, χ) = Σ_{n ≥ 1} χ(n) n^{−s}, summed to N terms with Euler–Maclaurin-free averaging of the last
 * period (the partial sums of χ are bounded, so the tail is O(N^{−σ})). Good to ~1e-6 for N = 2·10^5 at s = 1.
 */
export function lFunction(ch: Character, s: Complex, N = 200_000): Complex {
  let sum = c(0);
  // Sum whole periods, then average over one extra period to cancel the oscillating tail to first order.
  const periods = Math.max(1, Math.floor(N / ch.q));
  const limit = periods * ch.q;
  for (let n = 1; n <= limit; n++) {
    const v = ch.values[n % ch.q]!;
    if (v.re === 0 && v.im === 0) continue;
    sum = add(sum, mul(v, powReal(n, s)));
  }
  let avg = c(0);
  let partial = sum;
  for (let n = limit + 1; n <= limit + ch.q; n++) {
    const v = ch.values[n % ch.q]!;
    if (!(v.re === 0 && v.im === 0)) partial = add(partial, mul(v, powReal(n, s)));
    avg = add(avg, partial);
  }
  return { re: avg.re / ch.q, im: avg.im / ch.q };
}

/** π(x; q, a): the number of primes p ≤ x with p ≡ a (mod q), for every residue a, from a list of primes. */
export function primesByResidue(primes: readonly number[], q: number): number[] {
  const counts = new Array<number>(q).fill(0);
  for (const p of primes) counts[p % q]!++;
  return counts;
}
