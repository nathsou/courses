---
number: 17
title: Mertens’ theorems
summary: Three precise statements about sums and products over primes, proved with Abel summation and log n!. The constants M and e^(−γ), why Chebyshev knew the limit of π(x)/(x/log x) must be 1 if it exists, and how many prime factors a typical number has.
duration: About 1½ hours
prerequisites: [chebyshev]
theorems: [Mertens’ first theorem, Mertens’ second theorem, Mertens’ third theorem, If π(x) log x / x has a limit it is 1, Hardy–Ramanujan on ω(n)]
techniques: [Abel (partial) summation, comparison with integrals, log n!]
---

Chebyshev’s bounds pin $\pi(x)$ down to within a constant factor. Franz Mertens showed in 1874 that some *weighted* sums over primes can be computed far more precisely, with bounded or even vanishing errors.:cite[mertens1874] His three theorems are the workhorses of elementary prime number theory: Chapter 7 used the second to analyse the sieve, Chapter 12 used it for smooth numbers, and here they will tell us how many prime factors a typical number has.

The main tool is **Abel summation** (also called partial summation), the discrete version of integration by parts. Appendix B states and proves it; here is the version we use.

:::lemma{name="Abel summation" status=proved}
Let $a_n$ be any sequence, $A(t) = \sum_{n \le t} a_n$, and $f$ continuously differentiable on $[1, x]$. Then
$$\sum_{n \le x} a_n f(n) = A(x) f(x) - \int_1^x A(t) f'(t)\, dt.$$
:::

:::proof
$A(t)$ is constant between integers, so for each $n \le x$, $a_n f(n) = a_n f(x) - a_n \int_n^x f'(t)\,dt$. Summing over $n \le x$ and exchanging the sum with the integral, $\sum_n a_n \int_n^x f'(t)dt = \int_1^x \left(\sum_{n \le t} a_n\right) f'(t)\,dt$.
:::

## Mertens’ first theorem

The starting point is $\log(n!)$, computed two ways. On one hand, comparing the sum $\sum_{m \le n}\log m$ with $\int_1^n \log t\,dt = n\log n - n + 1$ (the integrand is increasing, so the sum is between the integral and the integral plus $\log n$):
$$\log(n!) = n\log n - n + O(\log n).$$
On the other hand, $\log m = \sum_{d \mid m}\Lambda(d)$ (Chapter 16, exercise 1), so
$$\log(n!) = \sum_{m \le n}\sum_{d \mid m}\Lambda(d) = \sum_{d \le n}\Lambda(d)\left\lfloor \frac nd \right\rfloor,$$
since $d$ divides $\lfloor n/d \rfloor$ of the numbers up to $n$.

:::theorem{name="Mertens’ first theorem" year=1874 status=proved}
$$\sum_{p \le x}\frac{\log p}{p} = \log x + O(1).$$
:::

:::proof
Take $n = \lfloor x \rfloor$. Writing $\lfloor n/d \rfloor = n/d + O(1)$,
$$\sum_{d \le n}\Lambda(d)\left\lfloor\frac nd\right\rfloor = n\sum_{d \le n}\frac{\Lambda(d)}{d} + O(\psi(n)) = n\sum_{d \le n}\frac{\Lambda(d)}{d} + O(n),$$
using $\psi(n) = O(n)$ from Chapter 16. Comparing with $\log(n!) = n\log n - n + O(\log n)$ and dividing by $n$:
$$\sum_{d \le n}\frac{\Lambda(d)}{d} = \log n + O(1).$$
The prime powers $p^k$ with $k \ge 2$ contribute $\sum_p \log p\left(\frac1{p^2} + \frac1{p^3} + \cdots\right) = \sum_p \frac{\log p}{p(p-1)}$, a convergent series. Removing them changes the sum by $O(1)$. Finally $\log n = \log x + O(1/x)$.
:::

## Mertens’ second theorem

Now use Abel summation to pass from weights $\log p / p$ to weights $1/p$.

:::theorem{name="Mertens’ second theorem" year=1874 status=proved}
There is a constant $M$ such that
$$\sum_{p \le x}\frac1p = \log\log x + M + O\!\left(\frac{1}{\log x}\right).$$
Numerically, $M = 0.2614972128\ldots$ (the **Meissel–Mertens constant**).
:::

::::zoom{levels="Idea, Proof"}
:::level[Idea]
$\frac1p = \frac{\log p}{p}\cdot\frac{1}{\log p}$. The weights $\frac{\log p}{p}$ add up to $\log t + R(t)$ with $R$ bounded. Abel summation with $f(t) = 1/\log t$ turns $\log t$ into $\int \frac{dt}{t\log t} = \log\log x$, and the bounded error $R$ into a convergent integral plus a tail of size $1/\log x$.
:::
:::level[Proof]
Let $a_n = \frac{\log n}{n}$ if $n$ is prime and $0$ otherwise, so that $A(t) = \sum_{p \le t}\frac{\log p}{p} = \log t + R(t)$ with $|R(t)| \le C$ for $t \ge 2$ (first theorem). Apply Abel summation with $f(t) = 1/\log t$ on $[2, x]$ (no primes lie below $2$), using $f'(t) = -\frac{1}{t\log^2 t}$:
$$\sum_{p \le x}\frac1p = \frac{A(x)}{\log x} + \int_2^x \frac{A(t)}{t\log^2 t}\,dt = 1 + \frac{R(x)}{\log x} + \int_2^x\frac{dt}{t\log t} + \int_2^x\frac{R(t)}{t\log^2 t}\,dt.$$
The third term is $\log\log x - \log\log 2$. In the fourth, $\int_2^\infty \frac{|R(t)|}{t\log^2 t}dt \le C\int_2^\infty\frac{dt}{t\log^2 t} = \frac{C}{\log 2}$ converges, and its tail beyond $x$ is at most $\frac{C}{\log x}$. So
$$\sum_{p\le x}\frac1p = \log\log x + \underbrace{1 - \log\log 2 + \int_2^\infty\frac{R(t)}{t\log^2 t}dt}_{M} + O\!\left(\frac1{\log x}\right).$$
:::
::::

Compare Chapter 4, which showed $\sum_{p \le x} 1/p > \log\log x - 1$ with Euler’s product: now we know the sum to within $O(1/\log x)$.

## Mertens’ third theorem

Exponentiating the second theorem gives a product formula, the one that measured the fraction of numbers surviving a wheel in Chapter 7.

:::theorem{name="Mertens’ third theorem" year=1874 status=proved}
$$\prod_{p \le x}\left(1 - \frac1p\right) = \frac{e^{-\gamma}}{\log x}\left(1 + O\!\left(\frac1{\log x}\right)\right),$$
where $\gamma = 0.5772156649\ldots$ is the Euler–Mascheroni constant, so $e^{-\gamma} = 0.5614594835\ldots$
:::

:::proof
Take logarithms. For each prime, $\log(1 - 1/p) = -\frac1p - c_p$ with $c_p = \sum_{k \ge 2}\frac{1}{kp^k}$, and $0 < c_p \le \frac{1}{p(p-1)}$, so $C = \sum_p c_p$ converges and $\sum_{p > x} c_p = O(1/x)$. Hence
$$\log\prod_{p \le x}\left(1 - \frac1p\right) = -\sum_{p \le x}\frac1p - C + O\!\left(\frac1x\right) = -\log\log x - (M + C) + O\!\left(\frac1{\log x}\right).$$
Exponentiating, using $e^{O(\varepsilon)} = 1 + O(\varepsilon)$, the product is $\frac{e^{-(M + C)}}{\log x}\left(1 + O\left(\frac{1}{\log x}\right)\right)$. What remains is to show that $M + C = \gamma$. That identity has nothing to do with primes being rare or common; it comes from the behaviour of the zeta function near $s = 1$, and Chapter 19 proves it once $\zeta$ is available.
:::

There is something strange about $e^{-\gamma}$. A naive probabilistic argument says that a number is prime when it avoids all the primes $p \le \sqrt x$, each with probability $1 - 1/p$, independently; that would give a prime density of $\prod_{p \le \sqrt x}(1 - 1/p) \approx \frac{2e^{-\gamma}}{\log x} \approx \frac{1.123}{\log x}$, contradicting the true density $\frac{1}{\log x}$ by a factor of $2e^{-\gamma}$. The divisibility events for large primes are not independent, and the “probability” that a number is prime cannot be computed this way. This mismatch is a recurring warning in sieve theory; Chapter 36 returns to it.

::mertens-plot

## Chebyshev’s observation

Chebyshev could not prove that $\pi(x)/(x/\log x)$ has a limit, but he proved that if it does, the limit must be $1$. With Mertens’ second theorem this takes a few lines.

:::theorem{name="Chebyshev" year=1848 status=proved}
If $\pi(x) \sim c\,x/\log x$ for some constant $c$, then $c = 1$.
:::

:::proof
Abel summation with $a_n = 1$ on primes and $f(t) = 1/t$:
$$\sum_{p \le x}\frac1p = \frac{\pi(x)}{x} + \int_2^x\frac{\pi(t)}{t^2}\,dt.$$
If $\pi(t) = (c + o(1))\,t/\log t$, the first term tends to $0$ and the integral is $(c + o(1))\int_2^x \frac{dt}{t\log t} = (c + o(1))\log\log x$ (the $o(1)$ can be pulled out because the integral diverges). By Mertens’ second theorem the left side is $(1 + o(1))\log\log x$. So $c = 1$.
:::

The difficulty, which took another fifty years, is to show that the limit *exists*.

:::note
**A stopping point.** The last section applies Mertens’ theorems to the number of prime factors of a typical integer.
:::

## How many prime factors does a number have?

Let $\omega(n)$ be the number of distinct primes dividing $n$. It jumps around: $\omega(p) = 1$ but $\omega(30030) = 6$. On average, though, it is very regular.

:::theorem{status=proved}
$$\frac1x\sum_{n \le x}\omega(n) = \log\log x + M + O\!\left(\frac{1}{\log x}\right).$$
:::

:::proof
Swap the order of summation: $\sum_{n \le x}\omega(n) = \sum_{n \le x}\sum_{p \mid n} 1 = \sum_{p \le x}\left\lfloor \frac xp \right\rfloor = x\sum_{p \le x}\frac1p + O(\pi(x))$. Divide by $x$ and use Mertens’ second theorem and $\pi(x) = O(x/\log x)$.
:::

A number around $10^{100}$ has, on average, only about $\log\log 10^{100} + 0.26 \approx 5.7$ distinct prime factors. Hardy and Ramanujan showed more: almost all $n$ have $\omega(n)$ close to $\log\log n$.:cite[hardy-ramanujan1917] In 1940 Paul Erdős and Mark Kac proved that $\omega(n)$ is distributed like a normal (Gaussian) random variable with mean and variance $\log\log n$, a central limit theorem for prime factors.:cite[erdos-kac1940] Because $\log\log n$ grows so slowly, the convergence is hard to see in any range a computer can reach:

::erdos-kac

:::key
- Abel summation converts information about $\sum_{n \le t} a_n$ into information about $\sum a_n f(n)$.
- First theorem: $\sum_{p \le x}\frac{\log p}{p} = \log x + O(1)$, from $\log n! = \sum_d \Lambda(d)\lfloor n/d\rfloor$ and Stirling.
- Second theorem: $\sum_{p \le x}\frac1p = \log\log x + M + O(1/\log x)$, $M \approx 0.2615$.
- Third theorem: $\prod_{p \le x}(1 - 1/p) \sim e^{-\gamma}/\log x$; the constant comes from $\zeta$ (Chapter 19).
- If $\pi(x)\log x/x$ converges, the limit is $1$. A typical $n$ has about $\log\log n$ distinct prime factors, normally distributed (Erdős–Kac).
:::

:::exercises
1. Use Abel summation to show that $\sum_{n \le x} \frac1n = \log x + \gamma + O(1/x)$, where $\gamma = 1 - \int_1^\infty \frac{t - \lfloor t\rfloor}{t^2}dt$. (Appendix B does this in detail.)
2. Show that $\sum_{n \le x}\Omega(n) = x\log\log x + O(x)$ as well, where $\Omega(n)$ counts prime factors with multiplicity.
3. Show that the average of $\omega(n)$ over $n \le x$ minus $\log\log x$ tends to $M$, and explain why the widget’s window average behaves the same way.
4. Show that the variance $\frac1x\sum_{n \le x}(\omega(n) - \log\log x)^2$ is $O(\log\log x)$ (Turán, 1934). Deduce that for every $\varepsilon > 0$, the proportion of $n \le x$ with $|\omega(n) - \log\log n| > (\log\log n)^{1/2 + \varepsilon}$ tends to $0$.
:::
