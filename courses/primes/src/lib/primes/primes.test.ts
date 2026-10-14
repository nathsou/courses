import { describe, expect, test } from 'vitest';
import {
  crt,
  extendedGcd,
  extendedGcdBig,
  gcd,
  isqrt,
  isqrtBig,
  modInverse,
  modPow,
  modPowBig,
  mulMod,
  order,
  totient,
} from './arith';
import { countPrimesInRange, linearSieve, mertensTable, mobiusTable, nthPrime, primePiTable, primesInRange, primesUpTo, sieve, totientTable } from './sieve';
import { eulerProbablePrime, isCarmichael, isPrime, isPrimeTrial, jacobi, legendre, liars, lucasLehmer, nextPrime, strongProbablePrime } from './primality';
import { divisors, factor, factorTrial, fermatFactor, isSmooth, pollardPMinus1, pollardRho } from './factor';
import { li, Li, PI_POWERS_OF_TEN, primePi, primePiLegendre, riemannR } from './count';
import { c } from './complex';
import { gamma, lnGamma } from './gamma';
import { eta, findZeros, gramPoint, hardyZ, riemannSiegelZ, theta, zeta, zetaReal } from './zeta';
import { characters, lFunction, primitiveRoot } from './dirichlet';
import { isGaussianPrime, twoSquares, zagier, zagierTriples } from './gaussian';
import { countPoints, traceOfFrobenius } from './curves';
import { piExplicit, psiExact, psiExplicit } from './explicit';
import { cramerPrimes } from './random';
import { ZEROS } from './zeros';

describe('arith', () => {
  test('gcd and Bézout', () => {
    expect(gcd(1071, 462)).toBe(21);
    expect(gcd(0, 0)).toBe(0);
    expect(gcd(-12, 18)).toBe(6);
    const [g, x, y] = extendedGcd(240, 46);
    expect(g).toBe(2);
    expect(240 * x + 46 * y).toBe(2);
    const [G, X, Y] = extendedGcdBig(10n ** 30n + 7n, 10n ** 20n + 3n);
    expect((10n ** 30n + 7n) * X + (10n ** 20n + 3n) * Y).toBe(G);
  });
  test('modular arithmetic', () => {
    expect(modPow(2, 10, 1000)).toBe(24);
    expect(modPow(3, 0, 7)).toBe(1);
    expect(mulMod(2 ** 40, 2 ** 40, 1_000_000_007)).toBe(Number((2n ** 80n) % 1_000_000_007n));
    expect(modPow(7, 1e15, 999_999_999_989)).toBe(Number(modPowBig(7n, 10n ** 15n, 999_999_999_989n)));
    expect(modInverse(3, 7)).toBe(5);
    expect(modInverse(4, 8)).toBeUndefined();
    expect(crt([2, 3, 2], [3, 5, 7])).toEqual({ x: 23, m: 105 });
    expect(totient(36)).toBe(12);
    expect(order(2, 7)).toBe(3);
    expect(order(3, 7)).toBe(6);
  });
  test('integer square roots', () => {
    for (const n of [0, 1, 2, 3, 4, 15, 16, 17, 2 ** 52 - 1, 2 ** 52]) expect(isqrt(n) ** 2 <= n && (isqrt(n) + 1) ** 2 > n).toBe(true);
    const big = 10n ** 40n + 12345n;
    const r = isqrtBig(big);
    expect(r * r <= big && (r + 1n) * (r + 1n) > big).toBe(true);
  });
});

describe('sieves', () => {
  test('small primes', () => {
    expect(primesUpTo(30)).toEqual([2, 3, 5, 7, 11, 13, 17, 19, 23, 29]);
    expect(nthPrime(1)).toBe(2);
    expect(nthPrime(1000)).toBe(7919);
    expect(nthPrime(10000)).toBe(104729);
    expect(primePiTable(100)[100]).toBe(25);
    const s = sieve(10);
    expect([...s]).toEqual([0, 0, 1, 1, 0, 1, 0, 1, 0, 0, 0]);
  });
  test('segmented sieve agrees with the plain sieve', () => {
    const plain = primesUpTo(200_000).filter((p) => p >= 150_000);
    expect(primesInRange(150_000, 200_000)).toEqual(plain);
    expect(countPrimesInRange(1, 1_000_000)).toBe(78498);
    expect(countPrimesInRange(1e9, 1e9 + 1e5)).toBe(primesInRange(1e9, 1e9 + 1e5).length);
  });
  test('linear sieve and arithmetic functions', () => {
    const { spf, primes } = linearSieve(100);
    expect(primes.length).toBe(25);
    expect(spf[91]).toBe(7);
    const mu = mobiusTable(30);
    expect([...mu.slice(1, 11)]).toEqual([1, -1, -1, 0, -1, 1, -1, 0, 0, 1]);
    expect(mertensTable(100)[100]).toBe(1);
    expect(totientTable(12)[12]).toBe(4);
  });
});

describe('primality', () => {
  test('agrees with trial division', () => {
    for (let n = 0; n < 5000; n++) expect(isPrime(n)).toBe(isPrimeTrial(n));
    for (let n = 1e9; n < 1e9 + 2000; n++) expect(isPrime(n)).toBe(isPrimeTrial(n));
  });
  test('large numbers', () => {
    expect(isPrime(2n ** 61n - 1n)).toBe(true);
    expect(isPrime(2n ** 67n - 1n)).toBe(false); // Cole, 1903
    expect(isPrime(2n ** 89n - 1n)).toBe(true);
    expect(isPrime(3317044064679887385961981n)).toBe(false); // the strong pseudoprime to the first 13 prime bases
    expect(isPrime(2n ** 127n - 1n)).toBe(true);
    expect(nextPrime(10n ** 20n)).toBe(10n ** 20n + 39n);
  });
  test('Carmichael numbers and liars', () => {
    const carmichael = [];
    for (let n = 3; n < 10000; n++) if (isCarmichael(n)) carmichael.push(n);
    expect(carmichael).toEqual([561, 1105, 1729, 2465, 2821, 6601, 8911]);
    const l = liars(561);
    expect(l.fermat.length).toBe(totient(561));
    expect(l.strong.length).toBeLessThanOrEqual(560 / 4);
    expect(strongProbablePrime(2047n, 2n)).toBe(true); // 2047 = 23 · 89, the smallest strong pseudoprime to base 2
    expect(strongProbablePrime(2047n, 3n)).toBe(false);
    // Monier–Rabin: at most φ(n)/4 strong liars for odd composite n > 9.
    for (const n of [9, 15, 21, 25, 45, 91, 121, 341, 561, 1105, 1729, 8911]) {
      const ls = liars(n);
      if (n > 9) expect(ls.strong.length).toBeLessThanOrEqual(totient(n) / 4);
      expect(ls.euler.length).toBeLessThanOrEqual(totient(n) / 2);
      // Every strong liar is an Euler liar.
      for (const a of ls.strong) expect(ls.euler.includes(a)).toBe(true);
    }
  });
  test('Jacobi and Legendre symbols', () => {
    for (const p of [3, 5, 7, 11, 13, 101]) for (let a = 0; a < p; a++) expect(jacobi(BigInt(a), BigInt(p))).toBe(legendre(a, p));
    expect(jacobi(1001n, 9907n)).toBe(-1);
    expect(eulerProbablePrime(101n, 5n)).toBe(true);
  });
  test('Lucas–Lehmer', () => {
    const exps = [];
    for (const p of primesUpTo(130)) if (lucasLehmer(p)) exps.push(p);
    expect(exps).toEqual([2, 3, 5, 7, 13, 17, 19, 31, 61, 89, 107, 127]);
  });
});

describe('factoring', () => {
  test('trial division and full factorisation', () => {
    expect(factorTrial(360)).toEqual([[2, 3], [3, 2], [5, 1]]);
    expect(factor(2n ** 67n - 1n)).toEqual([[193707721n, 1], [761838257287n, 1]]);
    expect(factor(600851475143n)).toEqual([[71n, 1], [839n, 1], [1471n, 1], [6857n, 1]]);
    expect(factor(2n ** 64n + 1n)).toEqual([[274177n, 1], [67280421310721n, 1]]);
    expect(factor(1n)).toEqual([]);
  });
  test('Fermat, Pollard ρ and p − 1', () => {
    expect(fermatFactor(5959n)).toMatchObject({ a: 80n, b: 21n });
    const r = pollardRho(8051n);
    expect(r && 8051n % r.factor === 0n && r.factor > 1n && r.factor < 8051n).toBe(true);
    // 1403 = 23 · 61; 23 − 1 = 2 · 11 is 11-smooth, 61 − 1 = 2² · 3 · 5 is 5-smooth.
    expect(pollardPMinus1(1403n, 5)).toBe(61n);
  });
  test('divisors and smoothness', () => {
    expect(divisors(28)).toEqual([1, 2, 4, 7, 14, 28]);
    expect(isSmooth(2 * 3 * 5 * 7 * 7, 7)).toBe(true);
    expect(isSmooth(22, 7)).toBe(false);
  });
});

describe('counting', () => {
  test('π(10^k) for k ≤ 10 by three methods', () => {
    for (let k = 1; k <= 7; k++) expect(BigInt(primePiLegendre(10 ** k))).toBe(PI_POWERS_OF_TEN[k]);
    for (let k = 1; k <= 10; k++) expect(BigInt(primePi(10 ** k))).toBe(PI_POWERS_OF_TEN[k]);
    for (let x = 0; x < 3000; x += 7) expect(primePi(x)).toBe(primePiTable(3000)[x]);
  });
  test('li, Li and R', () => {
    expect(li(2)).toBeCloseTo(1.04516378, 7);
    expect(Li(1e6)).toBeCloseTo(78626.5, 0); // Li(10^6) − π(10^6) ≈ 128.5
    expect(li(1e10)).toBeCloseTo(455055614.586, 1);
    expect(riemannR(1e6)).toBeCloseTo(78527.4, 0);
  });
});

describe('Gamma and zeta', () => {
  test('Gamma', () => {
    expect(gamma(c(5)).re).toBeCloseTo(24, 10);
    expect(gamma(c(0.5)).re).toBeCloseTo(Math.sqrt(Math.PI), 12);
    expect(gamma(c(-0.5)).re).toBeCloseTo(-2 * Math.sqrt(Math.PI), 12);
    const g = gamma(c(1, 1)); // Γ(1 + i) ≈ 0.4980156681 − 0.1549498283i
    expect(g.re).toBeCloseTo(0.4980156681, 9);
    expect(g.im).toBeCloseTo(-0.1549498283, 9);
    expect(lnGamma(c(10)).re).toBeCloseTo(Math.log(362880), 12);
  });
  test('zeta at known points', () => {
    expect(zetaReal(2)).toBeCloseTo(Math.PI ** 2 / 6, 13);
    expect(zetaReal(4)).toBeCloseTo(Math.PI ** 4 / 90, 13);
    expect(zetaReal(0)).toBeCloseTo(-0.5, 13);
    expect(zetaReal(-1)).toBeCloseTo(-1 / 12, 13);
    expect(zetaReal(-2)).toBeCloseTo(0, 12);
    expect(zetaReal(0.5)).toBeCloseTo(-1.4603545088095868, 12);
    expect(zetaReal(-13)).toBeCloseTo(-1 / 12, 10); // ζ(−13) = −B₁₄/14 = −(7/6)/14
    const z = zeta(c(0.5, 14.134725141734693));
    expect(Math.hypot(z.re, z.im)).toBeLessThan(1e-12);
    const e = eta(c(1.0000001));
    expect(e.re).toBeCloseTo(Math.LN2, 6);
  });
  test('functional equation holds numerically', () => {
    // ζ(s) = 2^s π^{s−1} sin(πs/2) Γ(1−s) ζ(1−s) at s = −2.5 + 3i.
    const s = c(-2.5, 3);
    const lhs = zeta(s);
    const one = c(1 - s.re, -s.im);
    const g = gamma(one);
    const z1 = zeta(one);
    // Assemble the right-hand side.
    const pow2 = { re: Math.exp(s.re * Math.LN2) * Math.cos(s.im * Math.LN2), im: Math.exp(s.re * Math.LN2) * Math.sin(s.im * Math.LN2) };
    const lp = Math.log(Math.PI);
    const powPi = { re: Math.exp((s.re - 1) * lp) * Math.cos(s.im * lp), im: Math.exp((s.re - 1) * lp) * Math.sin(s.im * lp) };
    const a = (Math.PI * s.re) / 2;
    const b = (Math.PI * s.im) / 2;
    const sn = { re: Math.sin(a) * Math.cosh(b), im: Math.cos(a) * Math.sinh(b) };
    const m = (x: { re: number; im: number }, y: { re: number; im: number }) => ({ re: x.re * y.re - x.im * y.im, im: x.re * y.im + x.im * y.re });
    const rhs = m(m(m(pow2, powPi), m(sn, g)), z1);
    expect(lhs.re).toBeCloseTo(rhs.re, 9);
    expect(lhs.im).toBeCloseTo(rhs.im, 9);
  });
  test('theta, Z and Gram points', () => {
    expect(theta(17.8455995405)).toBeCloseTo(0, 6); // g_0
    expect(gramPoint(0)).toBeCloseTo(17.8455995405, 8);
    expect(gramPoint(-1)).toBeCloseTo(9.6669080561, 8);
    expect(gramPoint(1)).toBeCloseTo(23.1702827012, 8);
    // Z changes sign at the first zero.
    expect(hardyZ(14) * hardyZ(14.3)).toBeLessThan(0);
    // Riemann–Siegel with one correction is close to the exact Z for moderate t.
    for (const t of [100, 500, 1000]) expect(Math.abs(riemannSiegelZ(t) - hardyZ(t))).toBeLessThan(0.02);
  });
  test('zeros agree with published values', () => {
    const known = [14.134725141734693, 21.022039638771555, 25.010857580145688, 30.424876125859513, 32.935061587739189, 37.586178158825671, 40.918719012147495, 43.327073280914999, 48.005150881167159, 49.773832477672302];
    const found = findZeros(50);
    expect(found.length).toBe(10);
    found.forEach((g, i) => expect(g).toBeCloseTo(known[i]!, 9));
    expect(ZEROS.length).toBeGreaterThanOrEqual(100);
    ZEROS.slice(0, 10).forEach((g, i) => expect(g).toBeCloseTo(known[i]!, 9));
    expect(ZEROS[99]).toBeCloseTo(236.524229665816, 8);
  });
});

describe('characters and L-functions', () => {
  test('character tables', () => {
    expect(primitiveRoot(7)).toBe(3);
    expect(primitiveRoot(41)).toBe(6);
    for (const q of [3, 4, 5, 7, 8, 9, 12, 15, 16, 20, 21, 24, 35]) {
      const chs = characters(q);
      expect(chs.length).toBe(totient(q));
      // Multiplicativity and orthogonality.
      for (const ch of chs) {
        for (let a = 0; a < q; a++)
          for (let b = 0; b < q; b++) {
            const x = ch.values[a]!;
            const y = ch.values[b]!;
            const z = ch.values[(a * b) % q]!;
            expect(Math.abs(x.re * y.re - x.im * y.im - z.re) + Math.abs(x.re * y.im + x.im * y.re - z.im)).toBeLessThan(1e-9);
          }
        const sum = ch.values.reduce((s, v) => s + v.re, 0);
        expect(Math.abs(sum - (ch.principal ? totient(q) : 0))).toBeLessThan(1e-9);
      }
    }
  });
  test('L(1, χ₄) = π/4', () => {
    const chi4 = characters(4).find((x) => !x.principal)!;
    expect(lFunction(chi4, c(1)).re).toBeCloseTo(Math.PI / 4, 6);
  });
});

describe('Gaussian integers and curves', () => {
  test('Gaussian primes and two squares', () => {
    expect(isGaussianPrime(3, 0)).toBe(true);
    expect(isGaussianPrime(5, 0)).toBe(false);
    expect(isGaussianPrime(2, 1)).toBe(true);
    expect(isGaussianPrime(1, 1)).toBe(true);
    for (const p of primesUpTo(2000)) {
      if (p % 4 !== 1) continue;
      const [a, b] = twoSquares(p)!;
      expect(a * a + b * b).toBe(p);
    }
  });
  test("Zagier's involution", () => {
    for (const p of [5, 13, 17, 29, 97, 101]) {
      const ts = zagierTriples(p);
      for (const t of ts) expect(zagier(zagier(t))).toEqual(t);
      const fixed = ts.filter((t) => zagier(t).every((v, i) => v === t[i]));
      expect(fixed).toEqual([[1, 1, (p - 1) / 4]]);
    }
  });
  test('Hasse bound', () => {
    for (const p of primesUpTo(400).slice(2)) {
      const a = traceOfFrobenius(-1, 1, p);
      expect(Math.abs(a)).toBeLessThanOrEqual(2 * Math.sqrt(p));
    }
    expect(countPoints(0, 7, 5)).toBe(6);
  });
});

describe('explicit formula', () => {
  test('ψ from 100 zeros tracks the true ψ', () => {
    for (const x of [50.5, 100.5, 500.5, 1000.5]) expect(Math.abs(psiExplicit(x, ZEROS.slice(0, 100)) - psiExact(x))).toBeLessThan(Math.max(3, 0.02 * x));
  });
  test('π from 100 zeros is within 1 of the truth on these points', () => {
    for (const x of [30.5, 100.5, 200.5]) expect(Math.abs(piExplicit(x, ZEROS.slice(0, 100)) - primePi(x))).toBeLessThan(1);
  });
});

describe('random models', () => {
  test('Cramér primes thin out like 1/log n', () => {
    const fake = cramerPrimes(100_000, 7);
    expect(Math.abs(fake.length - Li(100_000)) / Li(100_000)).toBeLessThan(0.05);
  });
});
