---
number: F
title: The primes library
summary: "Reference for every function that code exercises can import from primes, and that the course’s widgets are built on: arithmetic, sieves, primality, factoring, counting, complex numbers, Gamma and zeta, characters, Gaussian integers, elliptic curves, the explicit formula and random models."
duration: Reference
---

Every widget in this course runs on a small TypeScript library written for it, and the code exercises can use the same library. Import what you need from `primes`:

```ts
import { sieve, modPow, isPrime, zeta, complex } from 'primes';
```

Numbers are JavaScript `number`s unless a function says `bigint`. Functions on `number` are exact for integers below $2^{53} \approx 9 \times 10^{15}$. Complex numbers are plain objects `{ re, im }`, and their arithmetic lives in the `complex` namespace. The library’s source and tests are in the course repository (`src/lib/primes`).

## Arithmetic

| Function | What it does |
| --- | --- |
| `gcd(a, b)`, `gcdBig(a, b)` | Greatest common divisor (Chapter 2). |
| `lcm(a, b)` | Least common multiple. |
| `extendedGcd(a, b)`, `extendedGcdBig(a, b)` | `[g, x, y]` with $ax + by = g = \gcd(a, b)$. |
| `euclidSteps(a, b)` | The rows of Euclid’s algorithm, for display. |
| `mod(a, m)`, `modBig(a, m)` | The least non-negative residue of $a$ modulo $m$. |
| `mulMod(a, b, m)` | $ab \bmod m$, exact for $m < 2^{53}$. |
| `modPow(b, e, m)`, `modPowBig(b, e, m)` | $b^e \bmod m$ by repeated squaring (Chapter 5). |
| `modInverse(a, m)`, `modInverseBig(a, m)` | $a^{-1} \bmod m$, or `undefined` if $\gcd(a, m) \ne 1$. |
| `isqrt(n)`, `isqrtBig(n)`, `iroot(n, k)` | $\lfloor\sqrt n\rfloor$ and $\lfloor n^{1/k}\rfloor$. |
| `crt(residues, moduli)` | Chinese remainder theorem: `{ x, m }`, or `undefined` if the moduli are not coprime. |
| `totient(n)` | Euler’s $\varphi(n)$. |
| `order(a, n)` | The multiplicative order of $a$ modulo $n$. |
| `digits(n)` | Number of decimal digits of a bigint. |

## Sieves and tables

| Function | What it does |
| --- | --- |
| `sieve(n)` | A `Uint8Array` with `1` at the primes in $0..n$ (Chapter 7). |
| `primesUpTo(n)`, `firstPrimes(count)`, `nthPrime(n)` | Lists of primes. |
| `primePiTable(n)` | $\pi(k)$ for every $k \le n$. |
| `primesInRange(lo, hi)`, `countPrimesInRange(lo, hi)` | Segmented sieve: primes in $[lo, hi]$ with small memory, up to about $10^{15}$. |
| `linearSieve(n)` | Smallest prime factors `spf` and the list of primes. |
| `factorWithSpf(k, spf)` | Factor $k$ with a smallest-prime-factor table. |
| `mobiusTable(n)`, `mertensTable(n)` | $\mu(k)$ and $M(k) = \sum_{j \le k}\mu(j)$ (Chapters 19, 29). |
| `totientTable(n)`, `sigmaTable(n)`, `mangoldtTable(n)` | $\varphi(k)$, $\sigma(k)$ and $\Lambda(k)$ for all $k \le n$. |

## Primality

| Function | What it does |
| --- | --- |
| `isPrime(n)` | For numbers and bigints; deterministic below $3.3 \times 10^{24}$, Miller–Rabin with many bases above (Chapter 8). |
| `isPrimeTrial(n)`, `smallestFactor(n)` | Trial division. |
| `nextPrime(n)` | The next prime $\ge n$ (bigint). |
| `fermatTest(n, a)`, `fermatTestBig(n, a)` | $a^{n-1} \equiv 1 \pmod n$? |
| `decompose(n)` | $n - 1 = 2^sd$ with $d$ odd. |
| `strongProbablePrime(n, a)`, `millerRabinTrace(n, a)` | One Miller–Rabin round, and the sequence it inspects. |
| `eulerProbablePrime(n, a)` | One Solovay–Strassen round. |
| `liars(n)` | The Fermat, strong and Euler liars for a small odd composite $n$. |
| `isCarmichael(n)` | Korselt’s criterion. |
| `legendre(a, p)`, `jacobi(a, n)` | Legendre and Jacobi symbols (Chapter 9). |
| `lucasLehmer(p)`, `lucasLehmerTrace(p)` | The Lucas–Lehmer test for $2^p - 1$ (Chapter 10). |

## Factoring

| Function | What it does |
| --- | --- |
| `factor(n)` | Complete factorisation of a bigint: `[prime, exponent]` pairs (Chapter 11). |
| `factorWithin(n, ms)` | The same, giving up with `null` after `ms` milliseconds. |
| `factorTrial(n)` | Factorisation by trial division. |
| `fermatFactor(n)` | Fermat’s difference-of-squares method. |
| `pollardRho(n, x0, c)`, `rhoSequence(n, x0, c, length)` | Pollard’s $\rho$ with Floyd cycle detection, and its sequence. |
| `pollardPMinus1(n, B)` | Pollard’s $p - 1$ with smoothness bound $B$. |
| `divisors(n)`, `isSmooth(n, B)`, `formatFactors(fs)` | Divisors, smoothness test, pretty-printing. |
| `dickmanRho(u)` | Dickman’s $\rho(u)$, the density of smooth numbers (Chapter 12). |

## Counting primes

| Function | What it does |
| --- | --- |
| `primePi(x)` | $\pi(x)$ in $O(x^{3/4})$ time (Chapter 15). |
| `primePiLegendre(x)`, `legendrePhi(x, a, primes)` | Legendre’s formula and $\varphi(x, a)$. |
| `PI_POWERS_OF_TEN` | $\pi(10^k)$ for $k \le 25$, as bigints. |
| `li(x)`, `Li(x)`, `riemannR(x)` | $\operatorname{li}$, $\operatorname{Li}$ and Riemann’s $R$ (Chapters 14, 23). |
| `chebyshev(x)` | `{ theta, psi }` (Chapter 16). |
| `EULER_GAMMA`, `LI2` | $\gamma$ and $\operatorname{li}(2)$. |

## Complex numbers, Gamma and zeta

| Function | What it does |
| --- | --- |
| `complex.c(re, im)` | A complex number; also `ZERO`, `ONE`, `I`. |
| `complex.add`, `sub`, `mul`, `div`, `scale`, `neg`, `conj` | Arithmetic. |
| `complex.abs`, `arg`, `exp`, `log`, `pow`, `sqrt`, `sin`, `cos`, `fromPolar`, `format` | Functions (principal branches). |
| `complex.powReal(n, s)` | $n^{-s}$ for real $n > 0$ (note the sign). |
| `gamma(z)`, `lnGamma(z)`, `gammaReal(x)` | $\Gamma$ and $\log\Gamma$ (Appendix D). |
| `zeta(s)`, `zetaReal(s)` | $\zeta$ anywhere, by Euler–Maclaurin and the functional equation (Chapter 20). |
| `eta(s)`, `zetaPartial(s, N)`, `etaPartial(s, N)` | $\eta$ and partial sums. |
| `xi(s)` | The completed function $\xi$ (Chapter 21). |
| `theta(t)`, `hardyZ(t)`, `zetaOnLine(t)` | $\theta(t)$, $Z(t)$ and $\zeta(\frac12 + it)$ (Chapter 22). |
| `riemannSiegelZ(t, terms)`, `c0(p)` | The Riemann–Siegel formula. |
| `gramPoint(n)`, `findZeros(T)`, `zeroCountSmooth(T)` | Gram points, zeros up to height $T$, and $\theta(T)/\pi + 1$. |
| `refineRoot(f, a, b)`, `lambertW(x)` | Root refinement, Lambert’s $W$. |
| `ZEROS` | The first $100$ ordinates $\gamma$. |

## L-functions, Gaussian integers and curves

| Function | What it does |
| --- | --- |
| `characters(q)`, `chi(ch, n)` | All Dirichlet characters modulo $q$ (Chapter 33). |
| `lFunction(ch, s)` | $L(s, \chi)$ for non-principal $\chi$ and $\operatorname{Re}s > 0$. |
| `primesByResidue(primes, q)` | $\pi(x; q, a)$ for every $a$. |
| `primitiveRoot(p)` | The smallest primitive root modulo $p$. |
| `isGaussianPrime(a, b)`, `norm([a, b])` | Gaussian primes (Chapter 35). |
| `twoSquares(p)`, `sumsOfTwoSquares(n)` | Writing numbers as $a^2 + b^2$. |
| `zagier(t)`, `zagierTriples(p)` | Zagier’s involution. |
| `countPoints(a, b, p)`, `points(a, b, p)`, `traceOfFrobenius(a, b, p)`, `discriminant(a, b)` | Elliptic curves modulo $p$ (Chapter 32). |

## The explicit formula and random models

| Function | What it does |
| --- | --- |
| `psiExplicit(x, zeros)`, `zeroPairTerm(x, gamma)` | $\psi_0(x)$ from zeros, and one pair’s wave (Chapter 23). |
| `piExplicit(x, zeros)` | Riemann’s formula for $\pi(x)$. |
| `psiExact(x)`, `psiSteps(xMax)` | $\psi(x)$ exactly. |
| `rng(seed)` | A seeded generator with `next()`, `int(lo, hi)`, `normal()`. |
| `randomBits(bits, r)` | A random bigint with exactly `bits` bits. |
| `cramerPrimes(n, seed)` | A sample of Cramér’s random model (Chapter 18). |
| `gueEigenvalues(n, r)` | Eigenvalues of a random GUE matrix (Chapter 31). |
| `wignerGUE(s)`, `poissonSpacing(s)`, `pairCorrelation(u)` | Spacing and correlation densities. |
