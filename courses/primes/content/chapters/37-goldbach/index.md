---
number: 37
title: Goldbach and friends
summary: "Every even number above 2 is a sum of two primes: Goldbach’s conjecture, verified to 4 × 10¹⁸ and unproved. The comet, the Hardy–Littlewood circle method and why it handles three primes but not two, Vinogradov and Helfgott’s proof of the ternary conjecture, and Green and Tao’s arithmetic progressions of primes."
duration: About 1¼ hours
prerequisites: [random, twin-primes]
theorems: [Goldbach’s conjecture (open), Vinogradov’s theorem, Ternary Goldbach (Helfgott), Chen’s theorem (stated), Green–Tao theorem (stated)]
techniques: [the circle method, major and minor arcs, exponential sums]
---

On 7 June 1742 Christian Goldbach wrote to Leonhard Euler suggesting that every integer greater than $2$ is a sum of three primes (counting $1$ as a prime, as some did then). Euler replied that this would follow from a stronger statement, which he was sure was true but could not prove.:cite[goldbach1742]

:::conjecture{name="Goldbach’s conjecture" who="Goldbach; Euler" year=1742}
Every even integer $n \ge 4$ is the sum of two primes.
:::

The **ternary** (or "weak") Goldbach conjecture is that every odd $n \ge 7$ is a sum of three primes; it follows from the binary one (subtract $3$). The binary conjecture has been checked by computer for every even number up to $4 \times 10^{18}$ (Oliveira e Silva, Herzog and Pardi, 2014).:cite[oliveira2014] The ternary conjecture is now a theorem.

## The comet

Let $r(n)$ be the number of ordered pairs of primes $(p, q)$ with $p + q = n$. Plotting it gives a striking picture.

::goldbach-comet

The number of representations grows steadily, roughly like $n/\log^2n$, so a counterexample would have to be a dramatic outlier. The comet has distinct bands. They come from small primes, as in Chapter 18: if $3 \mid n$, then $p + q = n$ with $p, q \ne 3$ forces $q \equiv -p \pmod 3$, which is automatic among the two allowed classes, whereas for $3 \nmid n$ one of the two choices of $p \bmod 3$ is ruled out. Hardy and Littlewood's heuristic, the same singular series reasoning as for twin primes, predicts
$$r(n) \sim 2C_2\prod_{\substack{p \mid n\\ p > 2}}\frac{p - 1}{p - 2}\cdot\frac{n}{\log^2n},$$
with the twin prime constant $C_2 = 0.6601\ldots$ Dividing by this prediction collapses the comet onto a single band around $1$.

## The circle method

Hardy and Littlewood, and earlier Hardy and Ramanujan for partitions, developed a way to count solutions of additive equations with Fourier analysis on the circle $\R/\Z$ (Appendix C). Let $e(x) = e^{2\pi ix}$ and
$$S(\alpha) = \sum_{p \le n}(\log p)\,e(p\alpha).$$
By orthogonality, $\int_0^1e(m\alpha)\,d\alpha$ is $1$ if $m = 0$ and $0$ otherwise. So
$$\int_0^1S(\alpha)^2e(-n\alpha)\,d\alpha = \sum_{p, q \le n}\log p\log q\int_0^1e\big((p + q - n)\alpha\big)\,d\alpha = \sum_{p + q = n}\log p\log q,$$
a weighted count of Goldbach representations. Similarly $\int_0^1S(\alpha)^3e(-n\alpha)\,d\alpha$ counts representations as a sum of three primes.

The integrand is large only near rational numbers $\alpha = \frac aq$ with small denominator $q$. There $S(\alpha)$ is controlled by how the primes are distributed among residue classes modulo $q$ (Chapter 33), and those **major arcs** produce the main term, with the singular series as its arithmetic factor. Everywhere else, on the **minor arcs**, one needs $S(\alpha)$ to be small.

**Why three primes is easier than two.** On the minor arcs $\mathfrak m$,
$$\left|\int_{\mathfrak m}S(\alpha)^3e(-n\alpha)\,d\alpha\right| \le \max_{\alpha \in \mathfrak m}|S(\alpha)|\cdot\int_0^1|S(\alpha)|^2\,d\alpha = \max_{\mathfrak m}|S|\cdot\sum_{p \le n}\log^2p,$$
by Parseval. The last factor is about $n\log n$, while the main term is of size $n^2$. So it suffices to show $\max_{\mathfrak m}|S(\alpha)| = o(n/\log n)$: a little cancellation in a sum over primes. For two primes there is no spare factor of $S$ to take out; the minor arc integral $\int_{\mathfrak m}|S|^2$ is itself of size $n\log n$, the same as the main term $n$ up to logarithms, and no known estimate makes it smaller.

:::theorem{name="Vinogradov" year=1937 status=stated}
Every sufficiently large odd integer is a sum of three primes.
:::

Ivan Vinogradov proved the needed bound for $S(\alpha)$ on the minor arcs in 1937, unconditionally, by decomposing sums over primes into bilinear sums (a precursor of "Vaughan's identity").:cite[vinogradov1937] Hardy and Littlewood had done it in 1923 assuming GRH. "Sufficiently large" was at first ineffective, and later explicit but astronomical (Borozdkin gave $3^{3^{15}}$ in 1956, a number with about $6{,}846{,}169$ digits), far beyond any computer check.

:::theorem{name="Ternary Goldbach" who="Helfgott" year=2013 status=stated}
Every odd integer $n \ge 7$ is a sum of three primes. Consequently every even integer $n \ge 4$ is a sum of at most four primes.
:::

Harald Helfgott closed the gap in 2013 by sharpening every estimate in the circle method to the point where the "sufficiently large" threshold dropped to about $10^{27}$, and combining it with a computer verification below that bound (using the binary Goldbach verification to $4 \times 10^{18}$ and a ladder of primes).:cite[helfgott2013]

For the binary conjecture, the best results are of two kinds. **Almost all** even numbers are Goldbach numbers: the number of exceptions up to $x$ is $O(x^{1-\delta})$ for some $\delta > 0$ (Montgomery and Vaughan, 1975). And sieves give **almost primes**: Chen proved in 1973 that every sufficiently large even number is $p + P_2$, where $P_2$ is a prime or a product of two primes (Chapter 36).:cite[chen1973]

```code
id: goldbach/partitions
title: Verify Goldbach to a million
prompt: |
  Write `smallestPartition(n, flags)`, which for even $n \ge 4$ returns the smallest prime $p$ such that $n - p$ is also prime, given `flags` from `sieve(N)` with $N \ge n$. Then write `worstUpTo(N)`, which returns `[p, n]` for the even $n \le N$ whose smallest partition prime $p$ is largest (the first such $n$ if there are ties).
starter: |
  import { sieve } from 'primes';

  export function smallestPartition(n: number, flags: Uint8Array): number {
    return 0;
  }

  export function worstUpTo(N: number): [number, number] {
    return [0, 0];
  }
tests: |
  import { test, expect } from 'test';
  import { smallestPartition, worstUpTo } from 'solution';
  import { sieve } from 'primes';

  test('small cases', () => {
    const f = sieve(1000);
    expect(smallestPartition(4, f)).toBe(2);
    expect(smallestPartition(28, f)).toBe(5);
    expect(smallestPartition(98, f)).toBe(19);
  });
  test('every even n ≤ 10⁶ has a partition; the worst needs p = 523', () => {
    expect(worstUpTo(1000000)).toEqual([523, 503222]);
  });
solution: |
  import { sieve } from 'primes';

  export function smallestPartition(n: number, flags: Uint8Array): number {
    for (let p = 2; p <= n / 2; p++) if (flags[p] && flags[n - p]) return p;
    return -1;
  }

  export function worstUpTo(N: number): [number, number] {
    const flags = sieve(N);
    let best: [number, number] = [0, 0];
    for (let n = 4; n <= N; n += 2) {
      const p = smallestPartition(n, flags);
      if (p > best[0]) best = [p, n];
    }
    return best;
  }
hints:
  - Try $p = 2, 3, 5, 7, \ldots$ in order; the first $p$ with $n - p$ prime is the answer. It is always small, so this is fast.
```

## Arithmetic progressions of primes

A different kind of additive pattern: $3, 5, 7$ and $5, 11, 17, 23, 29$ are arithmetic progressions of primes. How long can they be?

::prime-progressions

:::theorem{name="Green–Tao" year=2004 status=stated}
For every $k$ there are infinitely many arithmetic progressions of $k$ primes.:cite[green-tao2008]
:::

Ben Green and Terence Tao proved this in 2004 by combining **Szemerédi's theorem** (every subset of the integers with positive upper density contains arbitrarily long progressions) with a "transference principle": the primes, though of density zero, sit inside a set of "pseudorandom" almost-primes in which they have positive relative density, and Szemerédi's theorem can be made to work relative to such a set. The proof gives no useful bound on where the progressions are. The longest known has $27$ terms (found in 2019 by a distributed computation).

The common difference of a progression of $k$ primes must be divisible by every prime $p \le k$, unless the progression starts at $p$: otherwise the terms cover all residues modulo $p$. The widget shows this happening: the shortest progressions of length $7$ to $10$ have differences $150$ and $210$.

:::key
- Goldbach (1742): every even $n \ge 4$ is $p + q$. Verified to $4 \times 10^{18}$; open. The number of representations grows like $2C_2\prod_{p \mid n}\frac{p-1}{p-2}\frac{n}{\log^2n}$, with bands from small primes.
- Circle method: $\int_0^1S(\alpha)^ke(-n\alpha)d\alpha$ counts representations as sums of $k$ primes. Major arcs give the main term; for $k = 3$ a bound $\max_{\text{minor}}|S| = o(n/\log n)$ suffices (Vinogradov, 1937), for $k = 2$ no such argument is known.
- Helfgott (2013): every odd $n \ge 7$ is a sum of three primes. Chen: even $n = p + P_2$. Almost all even numbers are Goldbach numbers.
- Green–Tao (2004): the primes contain arbitrarily long arithmetic progressions.
:::

:::exercises
1. Show that the binary Goldbach conjecture implies the ternary one, and that the ternary one implies every even $n \ge 4$ is a sum of at most four primes.
2. For $n = 30$ and $n = 32$, list the representations $n = p + q$ and compare with the factor $\prod_{p \mid n, p > 2}\frac{p - 1}{p - 2}$.
3. Prove the identity $\int_0^1S(\alpha)^2e(-n\alpha)\,d\alpha = \sum_{p + q = n}\log p\log q$, and the Parseval identity $\int_0^1|S(\alpha)|^2d\alpha = \sum_{p \le n}\log^2p$.
4. Show that an arithmetic progression of $k$ primes, none equal to $k$ or smaller primes, has common difference divisible by $\prod_{p \le k}p$.
:::
