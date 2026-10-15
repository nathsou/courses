---
number: 19
title: Euler’s product
summary: Dirichlet series and how to multiply them, the Euler product that turns unique factorisation into analysis, ζ(2) = π²/6 and the chance that two numbers are coprime, Möbius inversion, the series −ζ′/ζ whose coefficients are Λ(n), and the proof that Mertens’ constant is e^(−γ).
duration: About 1½ hours
prerequisites: [unique-factorisation, mertens]
theorems: [The Euler product, ζ(2) = π²/6, Möbius inversion, −ζ′(s)/ζ(s) = Σ Λ(n) n^(−s), Mertens’ third theorem (the constant)]
techniques: [Dirichlet series, Dirichlet convolution, multiplicative functions, Abel summation]
---

Part III attacked the primes with elementary estimates: Chebyshev’s bounds, Mertens’ theorems. They pin $\pi(x)$ down to within a constant factor, but no further. The rest of the course follows a different strategy, invented by Euler and perfected by Riemann: encode the primes in a function, and study the function.

The function is the **zeta function**,
$$\zeta(s) = \sum_{n=1}^\infty \frac1{n^s} = 1 + \frac1{2^s} + \frac1{3^s} + \cdots,$$
and the encoding is Euler’s product formula of 1737,:cite[euler1744] which is unique factorisation (Chapter 3) written as an identity between functions. In this chapter $s$ is a real number greater than $1$. Chapter 20 lets $s$ be complex; everything proved here stays true for complex $s$ with real part greater than $1$, with the same proofs.

## Dirichlet series

:::definition
An **arithmetic function** is any function $f : \N_{\ge 1} \to \C$. Its **Dirichlet series** is
$$F(s) = \sum_{n=1}^\infty \frac{f(n)}{n^s}.$$
:::

If $f$ is bounded, the series converges absolutely for $s > 1$, by comparison with $\sum n^{-s}$. If $|f(n)| \le C n^k$, it converges absolutely for $s > k + 1$. The three examples that matter most:

| $f(n)$ | Dirichlet series |
| --- | --- |
| $1$ | $\zeta(s)$ |
| $n$ | $\sum n \cdot n^{-s} = \zeta(s - 1)$ |
| $\log n$ | $\sum \log n \cdot n^{-s} = -\zeta'(s)$ |

The last line is term-by-term differentiation, since $\frac{d}{ds} n^{-s} = -\log n \cdot n^{-s}$. That is allowed because the differentiated series $\sum \log n \cdot n^{-s}$ converges uniformly on every half-line $s \ge \sigma_0 > 1$.

The coefficients of a Dirichlet series are determined by the function, so identities between functions give identities between coefficients.

:::lemma{name="Uniqueness" status=proved}
If $\sum f(n) n^{-s} = \sum g(n) n^{-s}$ for all large $s$, both series converging absolutely, then $f = g$.
:::

:::proof
Let $h = f - g$, so $\sum h(n) n^{-s} = 0$. Suppose $h \ne 0$ and let $m$ be the smallest $n$ with $h(n) \ne 0$. Multiply by $m^s$: $h(m) = -\sum_{n > m} h(n) (m/n)^s$. Each term tends to $0$ as $s \to \infty$, and the sum is dominated by $\sum_{n > m}|h(n)|(m/n)^{s_0}$ for $s \ge s_0$, so the right-hand side tends to $0$. Hence $h(m) = 0$, a contradiction.
:::

## Multiplying series: Dirichlet convolution

Multiply two Dirichlet series and collect the terms with the same denominator:
$$\left(\sum_m \frac{f(m)}{m^s}\right)\left(\sum_k \frac{g(k)}{k^s}\right) = \sum_{m, k}\frac{f(m) g(k)}{(mk)^s} = \sum_n \frac1{n^s}\sum_{mk = n} f(m) g(k).$$
Absolute convergence allows the rearrangement. The inner sum has a name.

:::definition
The **Dirichlet convolution** of $f$ and $g$ is
$$(f * g)(n) = \sum_{d \mid n} f(d)\, g\!\left(\frac nd\right).$$
:::

So **convolving coefficients multiplies series**. Convolution is commutative and associative (because multiplication of series is), and its identity is $\varepsilon$, the function with $\varepsilon(1) = 1$ and $\varepsilon(n) = 0$ for $n > 1$, whose series is the constant $1$.

::convolution-lab

Some convolutions are old friends:

- $(1 * 1)(n) = \sum_{d \mid n} 1 = d(n)$, the number of divisors. So $\sum d(n) n^{-s} = \zeta(s)^2$.
- $(\mathrm{id} * 1)(n) = \sigma(n)$, the sum of divisors. So $\sum \sigma(n) n^{-s} = \zeta(s)\zeta(s - 1)$.
- $(\Lambda * 1)(n) = \sum_{d \mid n}\Lambda(d) = \log n$ (Chapter 16, exercise 1). This one deserves its own section.

```quiz
q: 'What is the Dirichlet series of $f * f$, where $f$ has series $F(s)$?'
options:
  - text: $F(s)^2$
    correct: true
    why: Convolving coefficients multiplies series.
  - text: $F(2s)$
    why: '$F(2s) = \sum f(n) n^{-2s}$ has the coefficient $f(m)$ at $n = m^2$ and $0$ elsewhere; that is not a convolution.'
  - text: $F(s) * F(s)$
    why: The convolution acts on the coefficients; on the series it becomes ordinary multiplication.
```

## The Euler product

A function $f$ is **multiplicative** if $f(1) = 1$ and $f(mn) = f(m) f(n)$ whenever $\gcd(m, n) = 1$. It is then determined by its values on prime powers: $f(p_1^{a_1}\cdots p_k^{a_k}) = f(p_1^{a_1})\cdots f(p_k^{a_k})$. All the functions in the widget except $\log$ and $\Lambda$ are multiplicative, and the convolution of two multiplicative functions is multiplicative (exercise 2).

:::theorem{name="Euler product" who="Euler" year=1737 status=proved}
If $f$ is multiplicative and $\sum |f(n)| n^{-s}$ converges, then
$$\sum_{n=1}^\infty \frac{f(n)}{n^s} = \prod_p \left(1 + \frac{f(p)}{p^s} + \frac{f(p^2)}{p^{2s}} + \cdots\right),$$
the product over all primes converging to the sum. In particular, for $s > 1$,
$$\zeta(s) = \prod_p \frac{1}{1 - p^{-s}}.$$
:::

::::zoom{levels="Idea, Proof"}
:::level[Idea]
Expand the product over the primes up to $P$. Each term picks one power $p^{a_p}$ from each factor and multiplies them, giving $f\big(\prod p^{a_p}\big)/\big(\prod p^{a_p}\big)^s$. By unique factorisation, every $n$ whose prime factors are all at most $P$ appears exactly once. As $P$ grows, every $n$ eventually appears.
:::
:::level[Proof]
Each factor $E_p = \sum_{a \ge 0} f(p^a) p^{-as}$ converges absolutely, since its terms are among those of $\sum |f(n)| n^{-s}$. A finite product of absolutely convergent series can be multiplied out term by term in any order, so
$$\prod_{p \le P} E_p = \sum_{(a_p)_{p \le P}} \prod_{p \le P}\frac{f(p^{a_p})}{p^{a_p s}} = \sum_{n \in S_P}\frac{f(n)}{n^s},$$
where $S_P$ is the set of $n \ge 1$ with every prime factor at most $P$. The second equality uses multiplicativity, $\prod f(p^{a_p}) = f(\prod p^{a_p})$, and unique factorisation: the map from exponent vectors $(a_p)$ to $n = \prod p^{a_p}$ is a bijection onto $S_P$. Every $n \le P$ is in $S_P$, so
$$\left|\sum_{n=1}^\infty \frac{f(n)}{n^s} - \prod_{p \le P} E_p\right| = \left|\sum_{n \notin S_P}\frac{f(n)}{n^s}\right| \le \sum_{n > P}\frac{|f(n)|}{n^s},$$
the tail of a convergent series, which tends to $0$ as $P \to \infty$. For $\zeta$, take $f = 1$: $E_p = \sum_a p^{-as} = (1 - p^{-s})^{-1}$, a geometric series.
:::
::::

Read in reverse, the product is a sieve. Multiplying $\zeta(s)$ by $(1 - 2^{-s})$ subtracts $2^{-s}\zeta(s) = \sum (2n)^{-s}$, which deletes every even term. Multiplying by $(1 - 3^{-s})$ then deletes the terms divisible by $3$. After all the primes up to $P$, only $1$ and the terms with prime factors larger than $P$ remain: this is the sieve of Eratosthenes (Chapter 7), applied to a series.

::euler-sieve

Euler used the product to prove, again, that there are infinitely many primes: if there were finitely many, the product at $s = 1$ would be finite, while $\sum 1/n$ diverges. Chapter 4 turned this into a proof that $\sum_p 1/p$ diverges. Here are two further consequences.

**The Möbius function.** The reciprocal of the Euler product is
$$\frac1{\zeta(s)} = \prod_p\left(1 - \frac1{p^s}\right) = \sum_{n=1}^\infty \frac{\mu(n)}{n^s},$$
by the theorem applied to the multiplicative function $\mu$ with $\mu(p) = -1$ and $\mu(p^a) = 0$ for $a \ge 2$. This is the **Möbius function** of Chapter 17: $\mu(n) = (-1)^k$ if $n$ is a product of $k$ distinct primes, and $0$ if $n$ has a square factor. Since $\zeta(s) \cdot \frac1{\zeta(s)} = 1$, uniqueness gives $\mu * 1 = \varepsilon$:
$$\sum_{d \mid n}\mu(d) = \begin{cases} 1 & n = 1, \\ 0 & n > 1. \end{cases}$$
(This can also be checked directly: for $n > 1$ with $k$ distinct prime factors, the square-free divisors with an even number of primes and those with an odd number are equally many, $2^{k-1}$ each.) In particular **$\zeta(s) \ne 0$ for $s > 1$**: it has a multiplicative inverse. The same holds for complex $s$ with $\operatorname{Re} s > 1$, and that is the first fact about the zeros of zeta.

**Möbius inversion.** Convolving with $\mu$ undoes summing over divisors.

:::theorem{name="Möbius inversion" who="Möbius" year=1832 status=proved}
For arithmetic functions $f$ and $g$:
$$g(n) = \sum_{d \mid n} f(d) \text{ for all } n \quad\Longleftrightarrow\quad f(n) = \sum_{d \mid n}\mu(d)\, g\!\left(\frac nd\right) \text{ for all } n.$$
:::

:::proof
The left side says $g = f * 1$. Convolve with $\mu$: $g * \mu = f * (1 * \mu) = f * \varepsilon = f$, which is the right side. Conversely, if $f = g * \mu$ then $f * 1 = g * (\mu * 1) = g$. Only associativity and $\mu * 1 = \varepsilon$ are used, and both hold without any convergence.
:::

For example, $\sum_{d \mid n}\varphi(d) = n$ (Chapter 6) inverts to $\varphi = \mu * \mathrm{id}$, that is $\varphi(n) = \sum_{d \mid n}\mu(d)\frac nd = n\prod_{p \mid n}(1 - 1/p)$, and in series $\sum \varphi(n) n^{-s} = \zeta(s - 1)/\zeta(s)$.

## ζ(2) = π²/6

What is $\zeta(2) = 1 + \frac14 + \frac19 + \cdots$? Pietro Mengoli asked in 1650; the question became known as the Basel problem after the home town of Jacob Bernoulli, who publicised it and could not solve it. Euler found the answer in 1735, with an argument that treated $\frac{\sin x}{x}$ as a polynomial with roots $\pm\pi, \pm 2\pi, \ldots$:cite[euler-basel]. Here is a rigorous proof that uses only trigonometry; it goes back to Cauchy’s *Cours d’analyse* of 1821.

:::theorem{name="The Basel problem" who="Euler" year=1735 status=proved}
$$\zeta(2) = \sum_{n=1}^\infty \frac1{n^2} = \frac{\pi^2}{6}.$$
:::

::::zoom{levels="Idea, Proof"}
:::level[Idea]
For $0 < x < \pi/2$, $\cot^2 x < 1/x^2 < 1 + \cot^2 x$. Apply this at the angles $x_k = \frac{k\pi}{2m+1}$, $k = 1, \ldots, m$. The numbers $\cot^2 x_k$ are the roots of an explicit polynomial (from de Moivre’s formula), so their sum is known exactly: $\frac{m(2m-1)}{3}$. That squeezes $\sum_{k \le m} 1/k^2$ between two expressions that both tend to $\pi^2/6$.
:::
:::level[Proof]
Let $n = 2m + 1$. By de Moivre, $\cos nx + i\sin nx = (\cos x + i\sin x)^n$. Expand by the binomial theorem and keep the imaginary part:
$$\sin nx = \sum_{j=0}^m (-1)^j\binom{n}{2j+1}\cos^{n-2j-1}x\,\sin^{2j+1}x = \sin^n x\sum_{j=0}^m(-1)^j\binom{n}{2j+1}\cot^{2(m-j)}x.$$
For $x_k = k\pi/n$ with $1 \le k \le m$, $\sin n x_k = 0$ and $\sin x_k \ne 0$, so $t_k = \cot^2 x_k$ is a root of
$$P(t) = \binom n1 t^m - \binom n3 t^{m-1} + \binom n5 t^{m-2} - \cdots.$$
The $x_k$ lie in $(0, \pi/2)$, where $\cot^2$ is strictly decreasing, so $t_1, \ldots, t_m$ are $m$ distinct roots of a polynomial of degree $m$: they are all its roots. Their sum is minus the ratio of the two leading coefficients:
$$\sum_{k=1}^m\cot^2 x_k = \frac{\binom n3}{\binom n1} = \frac{(2m+1)(2m)(2m-1)/6}{2m+1} = \frac{m(2m-1)}{3}.$$
Now, for $0 < x < \pi/2$, $0 < \sin x < x < \tan x$, so $\cot^2 x < \frac1{x^2} < \frac1{\sin^2 x} = 1 + \cot^2 x$. At $x = x_k$, with $\frac{1}{x_k^2} = \frac{n^2}{\pi^2k^2}$, summing over $k$ gives
$$\frac{m(2m-1)}{3} < \frac{(2m+1)^2}{\pi^2}\sum_{k=1}^m\frac1{k^2} < m + \frac{m(2m-1)}{3}.$$
Multiply by $\frac{\pi^2}{(2m+1)^2}$ and let $m \to \infty$: both bounds tend to $\frac{\pi^2}{6}$ (they are $\frac{\pi^2}{6}\cdot\frac{2m(2m-1)}{(2m+1)^2}$ and $\frac{\pi^2}{6}\cdot\frac{2m(2m+2)}{(2m+1)^2}$).
:::
::::

Euler went on to find $\zeta(4) = \pi^4/90$, $\zeta(6) = \pi^6/945$, and in general $\zeta(2k)$ is a rational multiple of $\pi^{2k}$, involving the Bernoulli numbers of Appendix B. Chapter 21 explains why: they come from the values of $\zeta$ at negative integers, through the functional equation. The odd values are mysterious. Roger Apéry proved in 1978 that $\zeta(3)$ is irrational,:cite[apery1979] and nobody knows whether $\zeta(5)$ is.

### The probability that two numbers are coprime

Choose two large random integers. The chance that both are divisible by a prime $p$ is $1/p^2$, so the chance that they have no common prime factor “should” be
$$\prod_p\left(1 - \frac1{p^2}\right) = \frac1{\zeta(2)} = \frac{6}{\pi^2} \approx 0.6079.$$
Chapter 17 warned that such independence arguments can fail. This one is correct, and Möbius inversion proves it.

::coprime-orchard

:::theorem{status=proved}
The number of pairs $(a, b)$ with $1 \le a, b \le N$ and $\gcd(a, b) = 1$ is $\frac{6}{\pi^2}N^2 + O(N\log N)$.
:::

:::proof
By $\mu * 1 = \varepsilon$, the indicator of $\gcd(a, b) = 1$ is $\sum_{d \mid \gcd(a, b)}\mu(d)$. So the count is
$$\sum_{a, b \le N}\ \sum_{d \mid a,\ d \mid b}\mu(d) = \sum_{d \le N}\mu(d)\left\lfloor\frac Nd\right\rfloor^2.$$
Write $\lfloor N/d\rfloor^2 = N^2/d^2 + O(N/d)$. The error terms add up to $O(N\sum_{d \le N} 1/d) = O(N\log N)$, and the main term is $N^2\sum_{d \le N}\mu(d)/d^2 = N^2\left(\frac1{\zeta(2)} + O\left(\frac1N\right)\right)$, since the tail $\sum_{d > N}|\mu(d)|/d^2$ is less than $1/N$.
:::

```numeric
id: euler-product/three-coprime
prompt: Three integers are chosen independently and uniformly at random from $1, \ldots, N$, with $N$ very large. To four decimal places, what is the limit of the probability that they have no common factor greater than $1$? (The library function `zetaReal` evaluates $\zeta$.)
answer: 0.8319
tolerance: 0.0002
hints:
  - The argument above, with three numbers, gives $\prod_p (1 - p^{-3})$.
  - That is $1/\zeta(3)$, and $\zeta(3) = 1.2020569\ldots$
```

## The series that encodes the primes

Here is the identity that the rest of the course is built on. Convolving the von Mangoldt function with $1$ gives $\log$ (Chapter 16): $\sum_{d \mid n}\Lambda(d) = \log n$, which is unique factorisation in logarithmic form. In series, $\left(\sum \Lambda(n) n^{-s}\right)\zeta(s) = \sum \log n\cdot n^{-s} = -\zeta'(s)$.

:::theorem{status=proved}
For $s > 1$,
$$-\frac{\zeta'(s)}{\zeta(s)} = \sum_{n=1}^\infty\frac{\Lambda(n)}{n^s} = \sum_p \frac{\log p}{p^s} + \sum_p\frac{\log p}{p^{2s}} + \cdots, \qquad \log\zeta(s) = \sum_p\sum_{k \ge 1}\frac{1}{k\,p^{ks}}.$$
:::

:::proof
The first identity is the convolution identity above, divided by $\zeta(s)$, which is nonzero. For the second, take logarithms in the Euler product and use $-\log(1 - x) = \sum_{k \ge 1}x^k/k$ for $|x| < 1$; the logarithm of a convergent product of positive numbers is the sum of their logarithms. (Differentiating the second identity term by term gives the first again.)
:::

Both identities extend to complex $s$ with $\operatorname{Re} s > 1$ (Chapter 20), where the double sum serves as the definition of $\log\zeta(s)$.

Why does this matter? The coefficients of $-\zeta'/\zeta$ are $\Lambda(n)$, and their running total is Chebyshev’s function $\psi(x) = \sum_{n \le x}\Lambda(n)$ (Chapter 16). Analysis can extract running totals of coefficients from a Dirichlet series: Chapter 23 does it with a contour integral. So everything about $\psi(x)$, and hence about $\pi(x)$, is hidden in the function $\zeta'/\zeta$. Two features of $\zeta$ control it:

- **The pole at $s = 1$.** As $s \to 1^+$, $\zeta(s)$ behaves like $\frac1{s-1}$ (proved below), so $-\zeta'/\zeta$ behaves like $\frac{1}{s-1}$. That is also the behaviour of $\sum n^{-s}$, whose coefficients add up to $x$. This is the prime number theorem, $\psi(x) \sim x$, seen from a distance.
- **The zeros of $\zeta$.** Each zero $\rho$ of $\zeta$ is a pole of $\zeta'/\zeta$, and each will contribute a wave to $\psi(x)$. That is Riemann’s explicit formula (Chapter 23).

But $\zeta$ has no zeros with $s > 1$, and there the series defines it. To see zeros we need to go further left, into the complex plane, which is the subject of Chapter 20.

## Near s = 1

The pole at $s = 1$ can be described exactly. Abel summation (Appendix B) with $a_n = 1$, $A(t) = \lfloor t \rfloor$ and $f(t) = t^{-s}$ gives, for $s > 1$,
$$\zeta(s) = s\int_1^\infty \frac{\lfloor t\rfloor}{t^{s+1}}\,dt = \frac{s}{s-1} - s\int_1^\infty\frac{\{t\}}{t^{s+1}}\,dt,$$
where $\{t\} = t - \lfloor t\rfloor$. (The boundary term $\lfloor x\rfloor x^{-s}$ tends to $0$, and $\int_1^\infty t \cdot t^{-s-1}dt = \frac{1}{s-1}$.)

:::proposition{status=proved}
$\zeta(s) = \frac1{s-1} + \gamma + O(s - 1)$ as $s \to 1^+$, where $\gamma = 1 - \int_1^\infty\{t\}t^{-2}\,dt$ is Euler’s constant. In particular $(s-1)\zeta(s) \to 1$, and $\frac{1}{s-1} < \zeta(s) < \frac{s}{s-1}$ for $s > 1$.
:::

:::proof
Write $\frac{s}{s-1} = 1 + \frac1{s-1}$. The integral $\int_1^\infty \{t\}t^{-s-1}dt$ is a continuous, decreasing function of $s \ge 1$ (dominated by $\int t^{-2}dt$), and its derivative is bounded, so $s\int_1^\infty\{t\}t^{-s-1}dt = \int_1^\infty\{t\}t^{-2}dt + O(s - 1)$. The bounds: $0 < s\int_1^\infty\{t\}t^{-s-1}dt < s\int_1^\infty t^{-s-1}dt = 1$.
:::

The formula $\zeta(s) = \frac{s}{s-1} - s\int_1^\infty \{t\} t^{-s-1}dt$ is better than it looks. The integral converges for every complex $s$ with $\operatorname{Re} s > 0$, so the right-hand side defines $\zeta$ well beyond the region where the series converges. Chapter 20 starts from here.

## Mertens’ constant, at last

Chapter 17 proved that $\prod_{p \le x}(1 - 1/p) = e^{-(M + C)}/\log x \cdot (1 + O(1/\log x))$, where $M$ is the Meissel–Mertens constant of the second theorem and $C = \sum_p\sum_{k \ge 2}\frac{1}{kp^k}$, and promised that $M + C = \gamma$. The proof compares two ways of computing $\log\zeta(s)$ as $s \to 1^+$.

:::theorem{name="Mertens’ third theorem, the constant" status=proved}
$M + C = \gamma$. Consequently $\prod_{p \le x}\left(1 - \frac1p\right) \sim \frac{e^{-\gamma}}{\log x}$.
:::

::::zoom{levels="Idea, Proof"}
:::level[Idea]
$\log\zeta(s) = \sum_p\sum_k \frac{1}{kp^{ks}}$. Write $s = 1 + \delta$: this is $\sum_n b_n n^{-\delta}$, where $b_n = \frac{1}{kp^k}$ when $n = p^k$. By Mertens’ second theorem, the running total of the $b_n$ is $\log\log t + (M + C) + o(1)$. Abel summation turns this into $\log\zeta(1 + \delta) = \log\frac1\delta + (M + C) + \int_0^\infty e^{-v}\log v\,dv + o(1)$. But $\zeta(1 + \delta) \approx 1/\delta$, so the constants must cancel. The integral is $-\gamma$ (a lemma about the exponential function), so $M + C = \gamma$.
:::
:::level[Proof]
**Step 1: an integral.** We show $I = \int_0^\infty e^{-v}\log v\,dv = -\gamma$. Integrate by parts on $[0, 1]$ with the antiderivative $1 - e^{-v}$ of $e^{-v}$, and on $[1, \infty)$ with $-e^{-v}$:
$$I = \Big[(1 - e^{-v})\log v\Big]_0^1 - \int_0^1\frac{1 - e^{-v}}{v}\,dv + \Big[-e^{-v}\log v\Big]_1^\infty + \int_1^\infty\frac{e^{-v}}{v}\,dv.$$
The boundary terms vanish (at $v = 0$ because $0 \le 1 - e^{-v} \le v$ and $v\log v \to 0$), so $I = \int_1^\infty\frac{e^{-v}}{v}dv - \int_0^1\frac{1 - e^{-v}}{v}dv$. Now start from $H_n = \sum_{k=1}^n\frac1k = \int_0^1(1 + w + \cdots + w^{n-1})\,dw = \int_0^1\frac{1 - w^n}{1 - w}dw$ and substitute $w = 1 - v/n$:
$$H_n = \int_0^n\frac{1 - (1 - v/n)^n}{v}\,dv, \qquad H_n - \log n = \int_0^1\frac{1 - (1 - v/n)^n}{v}\,dv - \int_1^n\frac{(1 - v/n)^n}{v}\,dv.$$
For fixed $v$, $(1 - v/n)^n$ increases with $n$ (once $n \ge v$) to the limit $e^{-v}$. The first integrand lies between $0$ and $1$ (Bernoulli’s inequality $(1 - v/n)^n \ge 1 - v$) and tends to $\frac{1 - e^{-v}}{v}$; the second increases to $\frac{e^{-v}}{v}$. By dominated and monotone convergence, as $n \to \infty$, $\gamma = \int_0^1\frac{1 - e^{-v}}{v}dv - \int_1^\infty\frac{e^{-v}}{v}dv = -I$.

**Step 2: the running total.** Let $b_n = \frac{1}{kp^k}$ if $n = p^k$ is a prime power and $b_n = 0$ otherwise, and $S(t) = \sum_{n \le t}b_n$. Then
$$S(t) = \sum_{p \le t}\frac1p + \sum_{\substack{p^k \le t\\ k \ge 2}}\frac{1}{kp^k} = \log\log t + M + C + E(t), \qquad |E(t)| \le \frac{K}{\log t} \text{ for } t \ge 2,$$
by Mertens’ second theorem and the tail estimate $\sum_{p^k > t,\, k \ge 2}\frac{1}{kp^k} \le \sum_{m > \sqrt t}\frac{1}{m(m-1)} = O(t^{-1/2})$.

**Step 3: Abel summation.** For $\delta > 0$, $\log\zeta(1 + \delta) = \sum_n b_n n^{-\delta}$, by the theorem of the previous section. Abel summation with $f(t) = t^{-\delta}$, letting $x \to \infty$ (the boundary term $S(x)x^{-\delta}$ tends to $0$, since $S$ grows like $\log\log x$), gives
$$\log\zeta(1 + \delta) = \delta\int_2^\infty S(t)\,t^{-1-\delta}\,dt.$$
Substitute $S(t) = \log\log t + M + C + E(t)$ and treat the three parts separately, using $t = e^u$, $dt/t = du$:

- $\delta\int_2^\infty (M + C)\,t^{-1-\delta}dt = (M + C)\,2^{-\delta} \to M + C$.
- $\left|\delta\int_2^\infty E(t)\,t^{-1-\delta}dt\right| \le \delta K\int_{\log 2}^\infty\frac{e^{-\delta u}}{u}du \le \delta K\int_{\log 2}^{1/\delta}\frac{du}{u} + \delta^2 K\int_{1/\delta}^\infty e^{-\delta u}du = \delta K\left(\log\tfrac1\delta + O(1)\right) \to 0$.
- $\delta\int_2^\infty\log\log t\;t^{-1-\delta}dt = \delta\int_{\log 2}^\infty \log u\;e^{-\delta u}du$. Substitute $v = \delta u$: this is $\int_{\delta\log 2}^\infty\left(\log v + \log\tfrac1\delta\right)e^{-v}dv = 2^{-\delta}\log\tfrac1\delta + \int_{\delta\log 2}^\infty e^{-v}\log v\,dv = \log\tfrac1\delta + I + o(1)$, because $(1 - 2^{-\delta})\log\frac1\delta = O(\delta\log\frac1\delta)$.

So $\log\zeta(1 + \delta) = \log\frac1\delta + M + C + I + o(1)$ as $\delta \to 0^+$.

**Step 4: compare.** By the proposition of the previous section, $\delta\,\zeta(1 + \delta) \to 1$, so $\log\zeta(1 + \delta) = \log\frac1\delta + o(1)$. Comparing, $M + C + I = 0$, and by step 1, $M + C = -I = \gamma$.
:::
::::

Mertens’ theorem therefore links the primes to Euler’s constant through $\zeta$, exactly as Chapter 17 announced.

:::key
- A Dirichlet series $\sum f(n)n^{-s}$ determines its coefficients. Multiplying series convolves coefficients: $(f * g)(n) = \sum_{d \mid n}f(d)g(n/d)$.
- Euler product: for multiplicative $f$, $\sum f(n)n^{-s} = \prod_p\sum_a f(p^a)p^{-as}$; for $\zeta$, $\zeta(s) = \prod_p(1 - p^{-s})^{-1}$. It is unique factorisation written analytically, and a sieve.
- $1/\zeta(s) = \sum\mu(n)n^{-s}$, so $\mu * 1 = \varepsilon$, Möbius inversion holds, and $\zeta(s) \ne 0$ for $\operatorname{Re} s > 1$.
- $\zeta(2) = \pi^2/6$, and two random integers are coprime with probability $6/\pi^2$.
- $-\zeta'(s)/\zeta(s) = \sum\Lambda(n)n^{-s}$: the primes are encoded in the logarithmic derivative of $\zeta$. Its pole at $s = 1$ predicts $\psi(x) \sim x$; its other poles, the zeros of $\zeta$, will produce the fluctuations.
- $\zeta(s) = \frac1{s-1} + \gamma + O(s-1)$, and comparing with $\log\zeta$ shows that Mertens’ product constant is $e^{-\gamma}$.
:::

```code
id: euler-product/convolve
title: Dirichlet convolution
prompt: |
  Write `convolve(f, g)`. The inputs are arrays of the same length $N + 1$ holding $f(1), \ldots, f(N)$ and $g(1), \ldots, g(N)$ at indices $1$ to $N$ (index $0$ is unused and holds $0$). Return the array $h$ of the same length with $h[n] = (f * g)(n)$ for $1 \le n \le N$ and $h[0] = 0$. For $N = 10^5$ it should take well under a second: rather than finding the divisors of each $n$, loop over pairs $(d, m)$ with $dm \le N$ and add $f(d)g(m)$ to $h[dm]$. That takes about $N\log N$ steps.
starter: |
  export function convolve(f: number[], g: number[]): number[] {
    const h = new Array(f.length).fill(0);
    // Your code here.
    return h;
  }
tests: |
  import { test, expect } from 'test';
  import { convolve } from 'solution';
  import { mobiusTable, mangoldtTable, totientTable } from 'primes';

  const N = 2000;
  const table = (fn: (n: number) => number) => Array.from({ length: N + 1 }, (_, n) => (n === 0 ? 0 : fn(n)));
  const one = table(() => 1);
  const id = table((n) => n);
  const mu = Array.from(mobiusTable(N));
  const phi = Array.from(totientTable(N));
  const lambda = Array.from(mangoldtTable(N));

  test('1 * 1 is the number of divisors', () => {
    const d = convolve(one, one);
    expect([d[1], d[2], d[6], d[12], d[360], d[1024]]).toEqual([1, 2, 4, 6, 24, 11]);
  });
  test('μ * 1 = ε', () => {
    const e = convolve(mu, one);
    expect(e[1]).toBe(1);
    for (let n = 2; n <= N; n++) expect(e[n]).toBe(0);
  });
  test('μ * id = φ', () => {
    const h = convolve(mu, id);
    for (let n = 1; n <= N; n++) expect(h[n]).toBe(phi[n]);
  });
  test('Λ * 1 = log', () => {
    const h = convolve(lambda, one);
    for (let n = 1; n <= N; n++) expect(h[n]).toBeCloseTo(Math.log(n), 9);
  });
  test('N = 100,000 is fast', () => {
    const big = Array.from({ length: 100001 }, (_, n) => (n === 0 ? 0 : 1));
    const t = performance.now();
    const d = convolve(big, big);
    expect(d[83160]).toBe(128);
    expect(performance.now() - t).toBeLessThan(1500);
  });
solution: |
  export function convolve(f: number[], g: number[]): number[] {
    const N = f.length - 1;
    const h = new Array(f.length).fill(0);
    for (let d = 1; d <= N; d++) {
      if (f[d] === 0) continue;
      for (let m = 1; d * m <= N; m++) h[d * m] += f[d] * g[m];
    }
    return h;
  }
hints:
  - 'For each $d$ from $1$ to $N$, the multiples $dm \le N$ are $d, 2d, 3d, \ldots$; there are $\lfloor N/d \rfloor$ of them, and $\sum_d N/d \approx N\log N$.'
  - Skipping the $d$ with $f(d) = 0$ is a cheap speed-up when $f = \mu$ or $f = \Lambda$.
```

:::exercises
1. Show that $\sum_{n=1}^\infty \frac{d(n)}{n^s} = \zeta(s)^2$ and $\sum_{n=1}^\infty\frac{2^{\omega(n)}}{n^s} = \frac{\zeta(s)^2}{\zeta(2s)}$, where $\omega(n)$ is the number of distinct prime factors of $n$. (Compare the Euler factors.)
2. Prove that if $f$ and $g$ are multiplicative, so is $f * g$. (If $\gcd(m, n) = 1$, every divisor of $mn$ is uniquely $d_1d_2$ with $d_1 \mid m$, $d_2 \mid n$.)
3. The **Liouville function** is $\lambda(n) = (-1)^{\Omega(n)}$, where $\Omega(n)$ counts prime factors with multiplicity. Show that $\sum\lambda(n)n^{-s} = \zeta(2s)/\zeta(s)$, and deduce that $\sum_{d \mid n}\lambda(d)$ is $1$ if $n$ is a perfect square and $0$ otherwise. Check it in the widget.
4. Show that the probability that a random integer is square-free is $6/\pi^2$: the number of square-free $n \le N$ is $\frac{6}{\pi^2}N + O(\sqrt N)$. (Use $|\mu(n)| = \sum_{d^2 \mid n}\mu(d)$.)
5. Use the Euler product to show that $\zeta(s) > 1$ for $s > 1$ and that $\log\zeta(s) \le \sum_p p^{-s} + \frac{1}{2}\sum_p\frac{p^{-2s}}{1 - p^{-s}}$. Deduce again that $\sum_p 1/p$ diverges, using $\zeta(s) > \frac1{s - 1}$.
6. Euler’s heuristic: if $\frac{\sin \pi x}{\pi x} = \prod_{n \ge 1}\left(1 - \frac{x^2}{n^2}\right)$ (which is true, and proved in Appendix D), compare the coefficients of $x^2$ on both sides to get $\zeta(2) = \pi^2/6$.
:::
