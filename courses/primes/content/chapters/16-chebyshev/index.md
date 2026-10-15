---
number: 16
title: Chebyshev’s bounds
summary: The first real theorems about π(x). The weighted counting functions θ and ψ and the von Mangoldt function Λ; the central binomial coefficient; proofs that π(x) lies between constant multiples of x/log x; and Erdős’s proof of Bertrand’s postulate that there is always a prime between n and 2n.
duration: About 1½ hours
prerequisites: [gauss, unique-factorisation]
theorems: [The product of the primes up to x is less than 4^x, (log 2 − ε) x/log x < π(x) < (log 4 + ε) x/log x, Bertrand’s postulate]
techniques: [central binomial coefficients, Legendre’s formula for factorials, weighted counting]
---

Gauss’s guess was a guess. The first person to prove anything close to it was Pafnuty Chebyshev, in two papers around 1850.:cite[chebyshev1852] He showed that $\pi(x)$ is within about $10\%$ of $x/\log x$ for all large $x$, and that if $\pi(x)/(x/\log x)$ has a limit, the limit must be $1$. His tools were elementary: factorials and binomial coefficients. This chapter proves a slightly weaker version of his bounds by a neater route found by Paul Erdős, and then Erdős’s famous proof that there is always a prime between $n$ and $2n$.

## Weighting the primes

Counting each prime with weight $1$ is natural but awkward for proofs. Chebyshev weighted each prime by its logarithm.

:::definition
The **von Mangoldt function** is $\Lambda(n) = \log p$ if $n = p^k$ is a power of a prime $p$ ($k \ge 1$), and $\Lambda(n) = 0$ otherwise. The **Chebyshev functions** are
$$\theta(x) = \sum_{p \le x} \log p, \qquad \psi(x) = \sum_{n \le x} \Lambda(n) = \sum_{p^k \le x} \log p.$$
:::

The weights are chosen so that unique factorisation becomes a sum: $\log n = \sum_{d \mid n} \Lambda(d)$ (each prime power $p^k$ dividing $n$ contributes $\log p$, and there are $v_p(n)$ of them). And $\theta(x) = \log \prod_{p \le x} p$, the logarithm of the product of the primes up to $x$. The prime number theorem in the form Part V proves it is $\psi(x) \sim x$.

How do these relate to $\pi(x)$? The prime powers $p^k$ with $k \ge 2$ are rare, and each prime has weight about $\log x$ if it is near $x$.

:::lemma{status=proved}
1. $\psi(x) = \theta(x) + O(\sqrt x \log x)$.
2. $\theta(x) \le \pi(x) \log x$, and $\pi(x) \le \dfrac{\theta(x)}{\log x} + O\!\left(\dfrac{x}{\log^2 x}\right)$.

Consequently, $\pi(x) \sim x/\log x$, $\theta(x) \sim x$ and $\psi(x) \sim x$ are all equivalent.
:::

:::proof
1. $\psi(x) - \theta(x) = \sum_{k \ge 2} \theta(x^{1/k})$, where the sum stops once $x^{1/k} < 2$, that is, after at most $\log_2 x$ terms. Each $\theta(y) \le y \log y$, so the sum is at most $\sqrt x \log x + \log_2 x \cdot x^{1/3} \log x = O(\sqrt x \log x)$.
2. Each prime up to $x$ has $\log p \le \log x$, giving the first inequality. For the second, let $y = x/\log^2 x$. The primes up to $y$ number at most $y$, and each prime in $(y, x]$ has $\log p > \log y$, so
$$\pi(x) \le y + \frac{\theta(x)}{\log y} = \frac{x}{\log^2 x} + \frac{\theta(x)}{\log x - 2\log\log x}.$$
Since $\theta(x) = O(x)$ (proved below) and $\frac{1}{\log x - 2\log\log x} = \frac{1}{\log x} + O\left(\frac{\log\log x}{\log^2 x}\right)$, this is $\frac{\theta(x)}{\log x} + O\left(\frac{x \log\log x}{\log^2 x}\right)$. (With a little more care the $\log\log x$ disappears; we will not need it.)
:::

So from now on we can study whichever of $\pi$, $\theta$, $\psi$ is most convenient, and translate.

## The central binomial coefficient

Everything in this chapter comes from one number: $\binom{2n}{n} = \frac{(2n)!}{(n!)^2}$. Two of its properties are easy.

**Its size.** $\binom{2n}{n}$ is the largest of the $2n + 1$ binomial coefficients $\binom{2n}{k}$, which sum to $2^{2n} = 4^n$. So
$$\frac{4^n}{2n + 1} \le \binom{2n}{n} \le 4^n.$$

**Its prime factorisation.** The exponent of a prime $p$ in $m!$ is given by **Legendre’s formula**,
$$v_p(m!) = \left\lfloor \frac mp \right\rfloor + \left\lfloor \frac m{p^2} \right\rfloor + \left\lfloor \frac m{p^3} \right\rfloor + \cdots,$$
because $\lfloor m/p^k \rfloor$ counts the multiples of $p^k$ up to $m$, and each multiple of $p^j$ but not $p^{j+1}$ is counted exactly $j$ times. Therefore
$$v_p\binom{2n}{n} = \sum_{k \ge 1} \left( \left\lfloor \frac{2n}{p^k} \right\rfloor - 2\left\lfloor \frac{n}{p^k} \right\rfloor \right).$$
Each bracket is $0$ or $1$ (since $\lfloor 2y \rfloor - 2\lfloor y \rfloor \in \{0, 1\}$ for every real $y$), and it is $0$ once $p^k > 2n$. Three consequences:

1. $p^{v_p} \le 2n$: every prime power dividing $\binom{2n}{n}$ is at most $2n$.
2. Every prime $p$ with $n < p \le 2n$ divides $\binom{2n}{n}$ exactly once (it divides $(2n)!$ once and $n!$ not at all).
3. No prime $p$ with $\frac{2n}{3} < p \le n$ (and $p > 2$) divides it: then $\lfloor 2n/p \rfloor = 2$ and $\lfloor n/p \rfloor = 1$, and $p^2 > 2n$ for $n \ge 5$.

See all three in the factorisation below.

::central-binomial

## Upper and lower bounds

:::theorem{name="Erdős" status=proved}
For every $x \ge 1$, $\prod_{p \le x} p < 4^x$. Equivalently, $\theta(x) < x \log 4$.
:::

:::proof
It suffices to prove it for integers $n \ge 1$, by strong induction. For $n = 1$ and $n = 2$ it is clear. For even $n > 2$, $n$ is not prime, so the product is the same as for $n - 1$. For odd $n = 2m + 1$: every prime $p$ with $m + 2 \le p \le 2m + 1$ divides $\binom{2m+1}{m} = \frac{(2m+1)!}{m!\,(m+1)!}$ (it divides the numerator but not the denominator). This coefficient appears twice among the coefficients of $(1 + 1)^{2m+1}$ (as $\binom{2m+1}{m}$ and $\binom{2m+1}{m+1}$), so it is at most $\frac12 \cdot 2^{2m+1} = 4^m$. Hence
$$\prod_{p \le 2m+1} p = \prod_{p \le m+1} p \cdot \prod_{m+2 \le p \le 2m+1} p < 4^{m+1} \cdot 4^m = 4^{2m+1},$$
using the induction hypothesis for $m + 1 < n$.
:::

For the lower bound, combine consequence 1 with the size of $\binom{2n}{n}$. Every prime factor of $\binom{2n}{n}$ is at most $2n$ and contributes at most $2n$, so
$$\frac{4^n}{2n+1} \le \binom{2n}{n} \le (2n)^{\pi(2n)}, \qquad\text{so}\qquad \pi(2n) \ge \frac{n \log 4 - \log(2n+1)}{\log 2n}.$$

:::theorem{name="Chebyshev-type bounds" status=proved}
For every $\varepsilon > 0$ and all sufficiently large $x$,
$$(\log 2 - \varepsilon) \frac{x}{\log x} < \pi(x) < (\log 4 + \varepsilon) \frac{x}{\log x}.$$
In particular $\pi(x) \asymp x / \log x$.
:::

:::proof
*Lower bound.* For even $x = 2n$ the displayed inequality gives $\pi(x) \ge \frac{x \log 2}{\log x} - \frac{\log(x+1)}{\log x}$, and the last term is bounded, so it is $(\log 2 - \varepsilon)x/\log x$ or more once $x$ is large. For odd $x$, use $\pi(x) \ge \pi(x - 1)$ and $\frac{x - 1}{\log(x-1)} \ge (1 - \varepsilon)\frac{x}{\log x}$ for large $x$.

*Upper bound.* By the lemma, $\pi(x) \le \frac{\theta(x)}{\log x} + O\left(\frac{x\log\log x}{\log^2 x}\right) < \frac{x \log 4}{\log x} + O\left(\frac{x\log\log x}{\log^2 x}\right)$, and the error term is eventually smaller than $\varepsilon x/\log x$.
:::

The constants $\log 2 \approx 0.693$ and $\log 4 \approx 1.386$ bracket the truth, $1$. Chebyshev, with a cleverer choice than $\binom{2n}{n}$ (the ratio $\frac{(30n)!\,n!}{(15n)!\,(10n)!\,(6n)!}$), obtained $0.92129$ and $1.10555$.:cite[chebyshev1852,hardy-wright]

::chebyshev-functions

```quiz
q: Why do primes between $2n/3$ and $n$ not divide $\binom{2n}{n}$?
options:
  - text: Each divides $(2n)!$ exactly twice (as $p$ and $2p$) and $(n!)^2$ exactly twice (once in each $n!$), so the powers cancel.
    correct: true
    why: For $2n/3 < p \le n$ we have $p \le n < 2p \le 2n < 3p$, and $p^2 > 2n$ when $n \ge 5$. So $v_p((2n)!) = 2$ and $v_p(n!) = 1$.
  - text: Because they are larger than $\sqrt{2n}$.
    why: Primes in $(\sqrt{2n}, 2n/3]$ are also larger than $\sqrt{2n}$, and some of them do divide $\binom{2n}{n}$.
  - text: Because $\binom{2n}{n}$ is even.
    why: Being even says nothing about odd primes.
```

:::note
**A stopping point.** You now have the order of magnitude of $\pi(x)$. The last section uses the same coefficient to prove that there is always a prime between $n$ and $2n$.
:::

## Bertrand’s postulate

In 1845 Joseph Bertrand conjectured, and checked up to three million, that for every $n \ge 1$ there is a prime $p$ with $n < p \le 2n$. Chebyshev proved it in 1852. Erdős, at nineteen, found the proof below in 1932; it was his first paper.:cite[erdos1932,aigner-ziegler]

:::theorem{name="Bertrand’s postulate" who="Chebyshev; this proof by Erdős" year=1932 status=proved}
For every integer $n \ge 1$ there is a prime $p$ with $n < p \le 2n$.
:::

::::zoom{levels="Idea, Proof"}
:::level[Idea]
If there were no prime in $(n, 2n]$, then all the prime factors of $\binom{2n}{n}$ would be at most $2n/3$, by consequence 3. Small primes contribute little because their powers are capped at $2n$, and the product of the primes up to $2n/3$ is less than $4^{2n/3}$. That makes $\binom{2n}{n}$ much smaller than $4^n/(2n+1)$ once $n$ is large. Small $n$ are checked by hand.
:::
:::level[Proof]
*Small $n$.* The primes $2, 3, 5, 7, 13, 23, 43, 83, 163, 317, 631$ each are less than twice the previous one. For any $n \le 630$, let $q$ be the smallest of them larger than $n$, and $q'$ the previous one; then $q' \le n$, so $n < q < 2q' \le 2n$.

*Large $n$.* Suppose $n \ge 631$ and no prime lies in $(n, 2n]$. By consequence 3, every prime factor of $\binom{2n}{n}$ is at most $2n/3$. Split them:

- primes $p \le \sqrt{2n}$: there are fewer than $\sqrt{2n}$ of them, and each contributes $p^{v_p} \le 2n$ (consequence 1), so together at most $(2n)^{\sqrt{2n}}$;
- primes $\sqrt{2n} < p \le 2n/3$: here $p^2 > 2n$, so $v_p \le 1$, and together they contribute at most $\prod_{p \le 2n/3} p < 4^{2n/3}$.

Hence
$$\frac{4^n}{2n+1} \le \binom{2n}{n} < (2n)^{\sqrt{2n}} \cdot 4^{2n/3}, \qquad\text{so}\qquad 4^{n/3} < (2n+1)(2n)^{\sqrt{2n}} < (2n)^{\sqrt{2n} + 2}.$$
Taking logarithms, $\frac{n}{3}\log 4 < (\sqrt{2n} + 2)\log(2n)$. The left side grows like $n$ and the right like $\sqrt{n}\log n$, and a computation shows that the inequality already fails for every $n \ge 507$ (at $n = 507$ the two sides are about $234.28$ and $234.25$, and the gap only widens). This contradicts $n \ge 631$.
:::
::::

Bertrand’s postulate is a statement about gaps: $p_{k+1} < 2p_k$. The prime number theorem gives much more ($p_{k+1}/p_k \to 1$). How short an interval $(x, x + h]$ is guaranteed to contain a prime is a hard question. The best unconditional result is that $h = x^{0.525}$ works for large $x$ (Baker, Harman and Pintz, 2001); the Riemann Hypothesis would give about $\sqrt{x}\log x$; and **Legendre’s conjecture**, that there is always a prime between $n^2$ and $(n + 1)^2$, is still open.:cite[bhp2001]

:::key
- $\Lambda(n) = \log p$ on prime powers; $\theta(x) = \sum_{p \le x}\log p$ and $\psi(x) = \sum_{n \le x}\Lambda(n)$. The statements $\pi(x) \sim x/\log x$, $\theta(x) \sim x$, $\psi(x) \sim x$ are equivalent.
- $\binom{2n}{n}$ is between $4^n/(2n+1)$ and $4^n$; its prime powers are at most $2n$; primes in $(n, 2n]$ divide it once; primes in $(2n/3, n]$ never.
- Hence $\prod_{p \le x} p < 4^x$ and $(\log 2 - \varepsilon)\frac{x}{\log x} < \pi(x) < (\log 4 + \varepsilon)\frac{x}{\log x}$.
- Bertrand’s postulate: there is always a prime in $(n, 2n]$.
:::

```prove
id: chebyshev/primes-n-2n
title: Many primes between n and 2n
prompt: Using $\prod_{n < p \le 2n} p \le \binom{2n}{n}$ in the other direction, show that the number of primes in $(n, 2n]$ is at most $\frac{n \log 4}{\log n}$. (So these primes are not too numerous; combined with the lower bound, there are roughly $n/\log n$ of them.)
hints:
  - Each prime in $(n, 2n]$ is greater than $n$.
  - So their product is greater than $n^k$, where $k$ is their number.
rubric:
  - You used that every prime in $(n, 2n]$ divides $\binom{2n}{n}$, so their product is at most $4^n$.
  - You bounded the product below by $n^k$.
  - You took logarithms to get $k \le n \log 4 / \log n$.
solution: |
  Let $k = \pi(2n) - \pi(n)$. The primes in $(n, 2n]$ all divide $\binom{2n}{n} \le 4^n$, and each exceeds $n$, so $n^k < \prod_{n < p \le 2n} p \le 4^n$. Taking logarithms, $k \log n < n \log 4$.
```

:::exercises
1. Show that $\log n = \sum_{d \mid n} \Lambda(d)$, and deduce that $\log(n!) = \sum_{m \le n} \Lambda(m) \lfloor n/m \rfloor$. Chapter 17 starts from this identity.
2. Show that $\lfloor 2y \rfloor - 2\lfloor y \rfloor \in \{0, 1\}$ for every real $y$.
3. Show that $p_{k+1} < 2p_k$ for every $k \ge 1$, and deduce that $p_k \le 2^k$.
4. Use Bertrand’s postulate to show that $H_n = 1 + \frac12 + \cdots + \frac1n$ is not an integer for $n \ge 2$.
:::
