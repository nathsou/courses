---
number: 15
title: Counting without listing
summary: How to compute π(x) without finding the primes. Legendre’s inclusion–exclusion, Meissel’s improvement and the hand computations it made possible, and an O(x^¾) algorithm you can write in twenty lines that counts the primes below 10¹⁰ in about a second.
duration: About 1½ hours
prerequisites: [sieves, gauss]
theorems: [Legendre’s formula, Meissel’s formula, ⌊x/n⌋ takes at most 2√x values]
techniques: [inclusion–exclusion, dynamic programming, memoisation]
---

The table in Chapter 0 lists $\pi(10^{24}) = 18{,}435{,}599{,}767{,}349{,}200{,}867{,}866$. Nobody has ever listed those primes: a sieve up to $10^{24}$ would take longer than the age of the universe. The value was computed by an algorithm that counts primes without finding them. This chapter develops the idea from Legendre’s 1808 formula to an algorithm that runs in $O(x^{3/4})$ time and $O(\sqrt{x})$ memory, which you will implement.

## Legendre’s formula

The sieve of Eratosthenes says: after removing the multiples of the primes up to $\sqrt{x}$, what remains in $[2, x]$ is the primes greater than $\sqrt x$. So we need to count what remains, not list it. Let
$$\varphi(x, a) = \#\{1 \le n \le x : n \text{ has no prime factor among } p_1, \ldots, p_a\},$$
where $p_1 = 2, p_2 = 3, \ldots$ are the primes in order. (This $\varphi$ has nothing to do with Euler’s totient; the notation is traditional.) The numbers counted by $\varphi(x, a)$ with $a = \pi(\sqrt x)$ are $1$ and the primes in $(\sqrt x, x]$, so
$$\pi(x) = \varphi(x, a) + a - 1, \qquad a = \pi(\sqrt x).$$

Inclusion–exclusion counts $\varphi$ directly. Let $P = p_1 p_2 \cdots p_a$.

:::theorem{name="Legendre’s formula" year=1808 status=proved}
$$\varphi(x, a) = \sum_{d \mid P} \mu(d) \left\lfloor \frac xd \right\rfloor,$$
where $\mu(d) = (-1)^k$ if $d$ is a product of $k$ distinct primes (and $\mu(1) = 1$).
:::

:::proof
Each $n \le x$ is counted on the right with weight $\sum_{d \mid \gcd(n, P)} \mu(d)$, since $\lfloor x/d \rfloor$ counts the $n \le x$ divisible by $d$. If $\gcd(n, P) = 1$ the weight is $\mu(1) = 1$. Otherwise $\gcd(n, P)$ is a product of $k \ge 1$ distinct primes, and its divisors are the $2^k$ products of subsets of them, so the weight is $\sum_{j=0}^{k} \binom kj (-1)^j = (1 - 1)^k = 0$.
:::

The formula has $2^a$ terms, which for $x = 10^{10}$ (with $a = 9592$) is absurd. But most terms vanish: $\lfloor x/d \rfloor = 0$ as soon as $d > x$. A better way to organise the computation is a recursion.

:::lemma{status=proved}
$\varphi(x, a) = \varphi(x, a - 1) - \varphi\left(\left\lfloor x/p_a \right\rfloor, a - 1\right)$, with $\varphi(x, 0) = \lfloor x \rfloor$.
:::

:::proof
$\varphi(x, a - 1)$ counts the $n \le x$ free of $p_1, \ldots, p_{a-1}$. Among them, those divisible by $p_a$ are $n = p_a m$ with $m \le x/p_a$ free of $p_1, \ldots, p_{a-1}$; there are $\varphi(\lfloor x/p_a\rfloor, a-1)$ of them. Removing them leaves exactly the $n$ free of $p_1, \ldots, p_a$.
:::

::phi-tree

Branches can be cut short: if $1 \le x < p_{a+1}$, the only number up to $x$ free of the first $a$ primes is $1$, so $\varphi(x, a) = 1$. With this pruning and memoisation the recursion is practical up to about $10^9$.

## Meissel’s improvement

Ernst Meissel noticed in 1870 that you do not need to sieve all the way to $\sqrt x$. Sieve only by the primes up to $y = x^{1/3}$, and count what is left by the number of prime factors.

:::theorem{name="Meissel’s formula" year=1870 status=proved}
Let $a = \pi(x^{1/3})$, and let $P_2(x, a)$ be the number of $n \le x$ that are products of exactly two primes (not necessarily distinct), both greater than $p_a$. Then
$$\pi(x) = \varphi(x, a) + a - 1 - P_2(x, a), \qquad P_2(x, a) = \sum_{x^{1/3} < p \le \sqrt x} \left(\pi\!\left(\frac xp\right) - \pi(p) + 1\right).$$
:::

:::proof
The numbers counted by $\varphi(x, a)$ have all their prime factors greater than $x^{1/3}$, so each is $1$, a prime greater than $x^{1/3}$, or a product of exactly two such primes (three would exceed $x$). That gives $\varphi(x, a) = 1 + (\pi(x) - a) + P_2(x, a)$. For $P_2$, write such a product as $pq$ with $x^{1/3} < p \le q$; then $p \le \sqrt x$ and $q$ ranges over the primes in $[p, x/p]$, of which there are $\pi(x/p) - \pi(p) + 1$.
:::

The values $\pi(x/p)$ needed in $P_2$ are all below $x^{2/3}$, so a sieve up to $x^{2/3}$ provides them. Meissel used his formula, by hand, to compute $\pi(10^8) = 5{,}761{,}455$ in 1871, and in 1885 he published $\pi(10^9) = 50{,}847{,}478$, which turned out to be $56$ too small. In 1959 Derrick Henry Lehmer extended the method (adding a $P_3$ term) and ran it on an early electronic computer to obtain $\pi(10^{10})$; his published value, $455{,}052{,}512$, was off by one.:cite[lehmer1959,deleglise-rivat] The correct values are in the table of Chapter 0.

## An $O(x^{3/4})$ algorithm

Here is a cleaner idea, which became popular after a post on the Project Euler forum by a user called Lucy_Hedgehog, though it is a version of the Legendre–Meissel approach organised as dynamic programming. Its starting point is a fact about integer division.

:::lemma{status=proved}
The numbers $\lfloor x/n \rfloor$ for $n = 1, 2, \ldots, \lfloor x \rfloor$ take at most $2\sqrt{x}$ distinct values. Moreover $\lfloor \lfloor x/m \rfloor / n \rfloor = \lfloor x/(mn) \rfloor$.
:::

:::proof
For $n \le \sqrt{x}$ there are at most $\sqrt x$ values. For $n > \sqrt x$, $\lfloor x/n \rfloor < \sqrt x$, so these values are among $0, 1, \ldots, \lfloor\sqrt x\rfloor$: at most $\sqrt{x} + 1$ more. For the second statement, write $x = qm + r$ with $0 \le r < m$; then $\lfloor x/m \rfloor = q$, and $\lfloor q / n \rfloor$ is the largest $k$ with $kn \le q$, which is the largest $k$ with $kmn \le qm$, equivalently (since $r < m$) with $kmn \le x$.
:::

For each of these values $v$ and each prime $p$, let $S(v, p)$ be the number of integers in $[2, v]$ that are prime or have no prime factor $\le p$; in other words, what survives in $[2, v]$ after sieving by the primes up to $p$. Then $S(v, 1) = v - 1$ and, once $p^2 > v$, $S(v, p) = \pi(v)$.

:::lemma{status=proved}
For a prime $p$ and $v \ge p^2$,
$$S(v, p) = S(v, p - 1) - \left(S\left(\left\lfloor v/p \right\rfloor, p - 1\right) - S(p - 1, p - 1)\right),$$
where $p - 1$ stands for the previous prime. For $v < p^2$, $S(v, p) = S(v, p - 1)$.
:::

:::proof
Going from $p - 1$ to $p$ removes the composite numbers in $[2, v]$ whose smallest prime factor is $p$. Each is $p m$ with $p \le m \le v/p$ and $m$ having no prime factor smaller than $p$. The numbers $m$ in $[2, v/p]$ with no prime factor below $p$, *or prime*, number $S(\lfloor v/p\rfloor, p - 1)$; among them, the primes smaller than $p$ (there are $S(p - 1, p - 1) = \pi(p - 1)$ of them) must be excluded, since they would make $pm$ have a smaller factor. If $v < p^2$, no composite $\le v$ has smallest prime factor $p$.
:::

So keep an array of $S(v)$ for the $2\sqrt x$ values $v = \lfloor x/n \rfloor$, and for each prime $p \le \sqrt x$, update the entries with $v \ge p^2$, largest first (so that the right-hand side still uses the old values). By the second part of the first lemma, $\lfloor v/p \rfloor$ is again one of the stored values. At the end, $S(x) = \pi(x)$.

::lucy-run

**Cost.** For each prime $p$, the update touches the values $v \ge p^2$. Summing over $p \le \sqrt x$ and over the two kinds of values ($v = \lfloor x/n \rfloor$ with $n \le x/p^2$, and small $v$) gives about
$$\sum_{p \le \sqrt x} \min\left(\frac{x}{p^2}, \sqrt x\right) + \sum_{p \le x^{1/4}} \sqrt{x} \approx \frac{x^{3/4}}{\log x}$$
operations, up to a constant (exercise 2). Memory is $O(\sqrt x)$.

```code
id: counting/lucy
title: Count the primes up to 10¹⁰
prompt: |
  Write `primeCount(x)` for integers $1 \le x \le 10^{10}$ using the algorithm above. Store $S$ in two arrays: `small[v]` for $v \le r = \lfloor\sqrt x\rfloor$ and `large[n]` for $S(\lfloor x/n \rfloor)$, $n \le r$. Initialise them to $v - 1$. For each $p = 2, \ldots, r$ with `small[p] > small[p - 1]` (so $p$ is prime), let `sp = small[p - 1]`; update `large[n]` for $n = 1, 2, \ldots$ while $x/n \ge p^2$, then `small[v]` for $v = r$ down to $p^2$. Use `Float64Array`s and `Math.floor`. The answer is `large[1]`.
starter: |
  export function primeCount(x: number): number {
    // Your code here.
    return 0;
  }
tests: |
  import { test, expect } from 'test';
  import { primeCount } from 'solution';
  import { primePiTable } from 'primes';

  test('small x agree with a sieve', () => {
    const table = primePiTable(5000);
    for (let x = 1; x <= 5000; x += 13) expect(primeCount(x)).toBe(table[x]);
    for (const x of [1, 2, 3, 4, 9, 25, 49, 121]) expect(primeCount(x)).toBe(table[x]);
  });
  test('powers of ten', () => {
    expect(primeCount(1e6)).toBe(78498);
    expect(primeCount(1e8)).toBe(5761455);
  });
  test('π(10¹⁰) = 455,052,511 in a few seconds', () => {
    const t = performance.now();
    expect(primeCount(1e10)).toBe(455052511);
    expect(performance.now() - t).toBeLessThan(8000);
  });
solution: |
  export function primeCount(x: number): number {
    if (x < 2) return 0;
    const r = Math.floor(Math.sqrt(x));
    const small = new Float64Array(r + 1);
    const large = new Float64Array(r + 1);
    for (let v = 1; v <= r; v++) small[v] = v - 1;
    for (let n = 1; n <= r; n++) large[n] = Math.floor(x / n) - 1;
    for (let p = 2; p <= r; p++) {
      if (small[p] === small[p - 1]) continue;
      const sp = small[p - 1];
      const p2 = p * p;
      const nMax = Math.min(r, Math.floor(x / p2));
      for (let n = 1; n <= nMax; n++) {
        const d = n * p;
        const v = d <= r ? large[d] : small[Math.floor(x / d)];
        large[n] -= v - sp;
      }
      for (let v = r; v >= p2; v--) small[v] -= small[Math.floor(v / p)] - sp;
    }
    return large[1];
  }
hints:
  - 'For `large[n]` (which holds $S(\lfloor x/n \rfloor)$), the value $\lfloor x/(np) \rfloor$ is `large[n * p]` when `n * p <= r`, and `small[Math.floor(x / (n * p))]` otherwise.'
  - Update `large` with $n$ increasing and `small` with $v$ decreasing, so that every right-hand side reads a value not yet updated for this $p$.
```

## The state of the art

The algorithm above is not the fastest. In 1985 Lagarias, Miller and Odlyzko refined Meissel and Lehmer’s method to run in $O(x^{2/3+\varepsilon})$ time, and Deléglise and Rivat (1996) and Gourdon (2001) improved the constants and memory use; Kim Walisch’s open-source *primecount* implements these and holds the records for computing $\pi(x)$ combinatorially.:cite[lmo1985,deleglise-rivat,primecount] There is also an entirely different, **analytic** method, proposed by Lagarias and Odlyzko in 1987, that computes $\pi(x)$ from an integral involving the zeta function in about $O(x^{1/2+\varepsilon})$ time. It is the subject of Part IV, in spirit: the explicit formula of Chapter 23 writes $\pi(x)$ in terms of the zeros of $\zeta$.

:::key
- Legendre: $\pi(x) = \varphi(x, a) + a - 1$ with $a = \pi(\sqrt x)$, and $\varphi(x, a)$ follows from inclusion–exclusion or the recursion $\varphi(x, a) = \varphi(x, a-1) - \varphi(x/p_a, a-1)$.
- Meissel: sieve only to $x^{1/3}$ and correct with $P_2$, the count of products of two large primes. Meissel and Lehmer reached $10^9$ and $10^{10}$ this way.
- The values $\lfloor x/n \rfloor$ take only $2\sqrt x$ values, so the sieve can be run on them alone: $O(x^{3/4})$ time, $O(\sqrt x)$ memory.
- Modern combinatorial methods run in about $x^{2/3}$ time; analytic methods use the zeros of $\zeta$.
:::

:::exercises
1. Compute $\pi(100)$ with Legendre’s formula by hand: $a = \pi(10) = 4$, so expand $\varphi(100, 4)$ over the divisors of $210$.
2. Show that the cost of the $O(x^{3/4})$ algorithm is dominated by the primes $p \le x^{1/4}$, and estimate it as $\sum_{p \le x^{1/4}} \sqrt x + \sum_{x^{1/4} < p \le \sqrt x} x/p^2 = O(x^{3/4}/\log x)$.
3. Modify the algorithm to compute $\sum_{p \le x} p$ instead of $\pi(x)$. (Initialise with $\frac{v(v+1)}{2} - 1$ and subtract $p$ times the corrections. Beware of floating-point precision for large $x$.)
4. Why does Meissel’s formula need only $\pi(v)$ for $v \le x^{2/3}$?
:::
