---
number: 36
title: Twin primes and bounded gaps
summary: "What can be proved about twin primes: Brun’s theorem that the reciprocals of twin primes have a finite sum, sieve methods and the parity problem, Chen’s p + 2 = P₂, and the 2013 breakthroughs of Zhang and Maynard: infinitely many pairs of primes at most 246 apart."
duration: About 1½ hours
prerequisites: [random, dirichlet]
theorems: [Brun’s theorem, Selberg’s upper bound for twin primes, Chen’s theorem (stated), Zhang’s theorem (stated), Maynard–Tao (sketched)]
techniques: [sieve methods, the parity problem, admissible tuples, Maynard’s weights]
---

The **twin prime conjecture** says that there are infinitely many primes $p$ with $p + 2$ also prime. Chapter 18 showed the evidence: Hardy and Littlewood’s prediction $\pi_2(x) \sim 2C_2\int_2^x\frac{dt}{\log^2t}$ matches the counts to within $0.005\%$ at $10^{10}$. No one can prove even that there are infinitely many twin pairs. This chapter is about what *can* be proved, and it ends with one of the great results of this century.

## Brun’s theorem

In 1919 Viggo Brun proved the first nontrivial theorem about twin primes: they are rare enough that the sum of their reciprocals converges.:cite[brun1919]

:::theorem{name="Brun" year=1919 status=sketched}
There is a constant $C$ such that $\pi_2(x) \le C\dfrac{x}{\log^2x}$. Consequently
$$B = \left(\frac13 + \frac15\right) + \left(\frac15 + \frac17\right) + \left(\frac1{11} + \frac1{13}\right) + \cdots$$
converges.
:::

Compare $\sum_p\frac1p$, which diverges (Chapter 4). Brun’s original bound had an extra factor $(\log\log x)^2$; the sharp form is due to later refinements of his method. The deduction of convergence is short: grouping the twin pairs by dyadic ranges $[2^n, 2^{n+1})$, the sum is at most $\sum_n\frac{2\pi_2(2^{n+1})}{2^n} \le \sum_n\frac{4C}{(n\log 2)^2}$, which converges. The value of $B$, **Brun’s constant**, is about $1.90216$, but it is known only through extrapolation from computed twin primes, since the series converges far too slowly to sum.

::brun-sum

### Sieves

The upper bound comes from a **sieve**. To count $n \le x$ with $n$ and $n + 2$ both prime, start with all $n \le x$ and remove, for each prime $p \le z$, the $n$ with $n \equiv 0$ or $n \equiv -2 \pmod p$: two residue classes per odd prime, one for $p = 2$. The sieve of Eratosthenes with inclusion–exclusion (Legendre, Chapter 15) gives an exact formula,
$$S(x, z) = \sum_{d \mid P(z)}\mu(d)\,\#\{n \le x : n(n + 2) \equiv 0 \pmod d\} = x\prod_{2 < p \le z}\left(1 - \frac2p\right)\cdot\frac12 + (\text{error}),$$
where $P(z)$ is the product of the primes up to $z$. The main term is about $\frac{x}{\log^2z}$ by Mertens’ theorem. The trouble is the error: each of the $2^{\pi(z)}$ terms contributes an error of size up to $1$ or $2$, so the formula is useless unless $z$ is tiny. **Brun’s idea** was to truncate the inclusion–exclusion, keeping only the terms with few prime factors. Truncated sums of alternating series give upper and lower bounds (Bonferroni inequalities), and with careful choices the error becomes manageable with $z$ a small power of $x$. Since every twin prime $p > z$ survives sieving up to $z$, $\pi_2(x) \le S(x, z) + z$.

It would be tempting to sieve all the way to $z = \sqrt x$, where the survivors are exactly the twin primes, and use the main term as the answer. That gives the wrong constant. By Mertens’ theorem, $\prod_{2 < p \le z}(1 - \frac2p) \approx C_2\left(\frac{2e^{-\gamma}}{\log z}\right)^2$, so at $z = \sqrt x$ the main term is $(2e^{-\gamma})^2 \approx 1.26$ times the Hardy–Littlewood prediction: the same mismatch as in Chapter 17, where the “independent probabilities” of divisibility by large primes overcount. The error terms at $z = \sqrt x$ are not small, and they absorb the difference.

**Selberg’s sieve** (1947) replaces the Möbius function by optimised real weights $\lambda_d$ with $\lambda_1 = 1$, using the trivial inequality $\mathbf 1[n \text{ survives}] \le \left(\sum_{d \mid n(n+2),\, d \le \sqrt D}\lambda_d\right)^2$ and minimising a quadratic form. It gives $\pi_2(x) \le (8 + \varepsilon)C_2\frac{x}{\log^2x}$, four times the conjectured truth. Later work has reduced the factor to about $3.4$.

### The parity problem

Why do sieves give good upper bounds but no lower bounds? Selberg pointed out an obstruction. A sieve only uses information about how many numbers in a set are divisible by each $d$. That information is the same for the set of numbers with an even number of prime factors and the set with an odd number; it cannot distinguish them. Since primes have an odd number of prime factors and products of two primes an even number, a pure sieve cannot tell "$p + 2$ is prime“ from ”$p + 2$ is a product of two primes". The best that sieves alone can do is **almost-primes**:

:::theorem{name="Chen" year=1973 status=stated}
There are infinitely many primes $p$ such that $p + 2$ is either prime or a product of two primes.:cite[chen1973]
:::

## Bounded gaps

The twin prime conjecture says that $p_{n+1} - p_n = 2$ infinitely often. A weaker question: is $p_{n+1} - p_n$ bounded infinitely often? On average the gap is $\log p_n$, which grows. In 2005 Daniel Goldston, János Pintz and Cem Yıldırım proved that gaps can be arbitrarily small *compared with the average*: $\liminf\frac{p_{n+1} - p_n}{\log p_n} = 0$. Their method also showed that if the primes were slightly better distributed in arithmetic progressions than anyone could prove, bounded gaps would follow.

In April 2013 Yitang Zhang, then a lecturer at the University of New Hampshire, posted a paper that stunned the field.:cite[zhang2014]

:::theorem{name="Zhang" year=2013 status=stated}
There are infinitely many pairs of primes that differ by at most $70{,}000{,}000$.
:::

He proved the needed distribution in arithmetic progressions for smooth moduli, a delicate result beyond the Bombieri–Vinogradov theorem. Within months a Polymath project led by Terence Tao reduced $70{,}000{,}000$ to $4680$. Then in November 2013 James Maynard, and independently Tao, found a much simpler and stronger method.:cite[maynard2015]

:::theorem{name="Maynard; Tao" year=2013 status=sketched}
For every $m \ge 1$ there is a bound $H_m$ such that, infinitely often, some interval of length $H_m$ contains $m + 1$ primes. In particular $\liminf(p_{n+1} - p_n) \le 600$, improved by the Polymath project to $\le 246$.
:::

## Admissible tuples and Maynard’s sieve

The proofs look for many primes in a pattern. Fix shifts $\mathcal H = \{h_1, \ldots, h_k\}$. If every $n + h_i$ were prime infinitely often, the gaps between them would be bounded by the diameter of $\mathcal H$. That requires $\mathcal H$ to be **admissible** (Chapter 18): no prime $p$ sees every residue among the $h_i$.

::tuple-explorer

The idea of Goldston–Pintz–Yıldırım and Maynard is to prove something weaker: that infinitely often, **at least two** of the $n + h_i$ are prime. Choose nonnegative weights $w(n)$ and compare
$$S_1 = \sum_{N \le n < 2N}w(n), \qquad S_2 = \sum_{N \le n < 2N}w(n)\sum_{i=1}^k\mathbf 1[n + h_i \text{ prime}].$$
If $S_2 > S_1$, then for some $n$ the inner sum exceeds $1$: at least two of the $n + h_i$ are prime, and they differ by at most the diameter of $\mathcal H$. The art is the choice of $w$: they are squares of sieve-like sums, $w(n) = \left(\sum_{d_i \mid n + h_i}\lambda_{d_1, \ldots, d_k}\right)^2$, which are large when the $n + h_i$ have no small prime factors. GPY used one-dimensional weights depending on $d_1d_2\cdots d_k$ and narrowly failed to make $S_2/S_1 > 1$. Maynard let the weights depend on each $d_i$ separately, through a smooth function of $k$ variables. With these, the quantity that has to beat a fixed threshold grows like $\log k$ as $k$ increases, whereas with the one-dimensional weights it stays bounded. So for large $k$ it wins, using only the Bombieri–Vinogradov theorem (primes are well distributed in progressions to moduli up to about $\sqrt x$, on average). With $k = 50$ the computation works, and the narrowest admissible $50$-tuple has diameter $246$: that is where the number comes from.

Under the **Elliott–Halberstam conjecture** (good distribution up to moduli $x^{1 - \varepsilon}$) the same method gives gaps at most $12$, and under a generalised version at most $6$. Getting to $2$ needs a new idea, because of the parity problem.

```code
id: twin-primes/admissible
title: Is it admissible?
prompt: |
  Write `admissible(h)`, which returns `true` when the list of distinct non-negative integers `h` is an admissible tuple: for every prime $p$, the residues $h_i \bmod p$ do not cover all of $0, 1, \ldots, p - 1$. Only primes $p \le k$ (where $k$ is the length of the list) need to be checked. Then write `narrowest(k)`, the smallest diameter $\max h - \min h$ of an admissible tuple of size $k$, for $k \le 7$, by searching tuples with $h_1 = 0$ and increasing even entries.
starter: |
  export function admissible(h: number[]): boolean {
    return false;
  }

  export function narrowest(k: number): number {
    return 0;
  }
tests: |
  import { test, expect } from 'test';
  import { admissible, narrowest } from 'solution';

  test('small examples', () => {
    expect(admissible([0, 2])).toBe(true);
    expect(admissible([0, 2, 4])).toBe(false);
    expect(admissible([0, 2, 6])).toBe(true);
    expect(admissible([0, 1])).toBe(false);
    expect(admissible([0, 2, 6, 8, 12])).toBe(true);
    expect(admissible([0, 2, 6, 8, 12, 14])).toBe(false);
  });
  test('narrowest admissible tuples (OEIS A008407)', () => {
    expect([2, 3, 4, 5, 6, 7].map(narrowest)).toEqual([2, 6, 8, 12, 16, 20]);
  });
solution: |
  const SMALL_PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31];

  export function admissible(h: number[]): boolean {
    for (const p of SMALL_PRIMES) {
      if (p > h.length) break;
      const seen = new Set(h.map((x) => x % p));
      if (seen.size === p) return false;
    }
    return true;
  }

  export function narrowest(k: number): number {
    for (let d = 2; ; d += 2) {
      // Choose k − 2 interior even shifts strictly between 0 and d.
      const interior: number[] = [];
      for (let x = 2; x < d; x += 2) interior.push(x);
      const choose = (start: number, picked: number[]): boolean => {
        if (picked.length === k - 2) return admissible([0, ...picked, d]);
        for (let i = start; i < interior.length; i++) {
          if (choose(i + 1, [...picked, interior[i]])) return true;
        }
        return false;
      };
      if (choose(0, [])) return d;
    }
  }
hints:
  - 'For `narrowest`, try diameters $d = 2, 4, 6, \ldots$ in turn; for each, fix the endpoints $0$ and $d$ and try every way of choosing the $k - 2$ interior shifts among the even numbers between them.'
  - All shifts in an admissible tuple with $k \ge 2$ must have the same parity, or they would cover both residues modulo $2$.
```

## Large gaps

At the other extreme, gaps can be large: $p_{n+1} - p_n$ exceeds any fixed multiple of $\log p_n$ infinitely often (Westzynthius, 1931), and in 2014 Ford, Green, Konyagin, Maynard and Tao proved that the largest gap below $x$ is at least of order $\frac{\log x\,\log\log x\,\log\log\log\log x}{\log\log\log x}$, resolving a problem of Erdős. Cramér’s conjecture (Chapter 18) predicts gaps as large as $(\log x)^2$; the Riemann Hypothesis would bound them by $\sqrt x\log x$ (Chapter 28). The truth lies somewhere in between, and is unknown.

:::key
- Brun (1919): $\pi_2(x) = O(x/\log^2x)$ by a truncated sieve, so $\sum_{\text{twins}}\frac1p$ converges; Brun’s constant $\approx 1.90216$.
- Sieves give upper bounds; the parity problem blocks lower bounds. Chen (1973): infinitely many $p$ with $p + 2$ prime or a product of two primes.
- Zhang (2013): gaps $\le 7 \times 10^7$ infinitely often. Maynard and Tao (2013): $m + 1$ primes in bounded intervals for every $m$; gaps $\le 246$ (Polymath).
- The method: admissible tuples, weights $w(n) \ge 0$, and $S_2 > S_1$ forces two primes among $n + h_i$.
:::

:::exercises
1. Show that $\sum_{p \le x}\frac1p \ge \log\log x - 1$ (Chapter 4) is incompatible with $\pi(x) = O(x/\log^2x)$, and explain why Brun’s bound for twins is therefore a strong statement.
2. Check that $\{0, 2, 6, 8, 12\}$ is admissible and find the first few $n$ for which all of $n, n + 2, n + 6, n + 8, n + 12$ are prime.
3. In the sieve for twins, why is only one residue class removed for $p = 2$? Compute the main term $\frac x2\prod_{2 < p \le z}(1 - \frac2p)$ for $x = 10^6$, $z = 100$, and compare with the number of $n \le 10^6$ with $n(n + 2)$ having no prime factor up to $100$.
4. If $S_2 > mS_1$ for some integer $m \ge 1$, show that infinitely often at least $m + 1$ of the $n + h_i$ are prime.
:::
