---
number: 14
title: Gauss’s guess
summary: The density of primes near x is about 1/log x. Tables, Legendre’s and Gauss’s formulas, the language of asymptotics (~, O, o), why Li(x) and x/log x are asymptotically the same yet very differently accurate, and the n-th prime.
duration: About 1¼ hours
prerequisites: [staircase, sieves]
theorems: [Li(x) ~ x / log x, π(x) ~ x/log x iff p_n ~ n log n]
techniques: [asymptotic notation, integration by parts, inverting asymptotics]
---

Part III asks the question of the prologue in earnest: how many primes are there up to $x$? This chapter states the answer that Gauss and Legendre guessed around 1800, makes it precise, and sets up the notation for the rest of the course. Chapters 16 and 17 prove the first real theorems about $\pi(x)$, and Part V proves the guess.

## The density of primes

Gauss's observation, recalled in his 1849 letter to Encke, was that primes near $x$ occur with frequency about $1/\log x$.:cite[gauss1849] Test it yourself anywhere up to $10^{15}$: count the primes among $100{,}000$ consecutive numbers and compare.

::density-window

At $x = 10^6$ there are about $7200$ primes per $100{,}000$ numbers, one in $13.8$; at $10^{15}$, about $2900$, one in $34.5$. The ratio of actual to predicted hovers within a few per cent of $1$ everywhere. The fluctuations are real (the count in a window is not determined by its position) but small.

If the probability that a number near $t$ is prime is $1/\log t$, then the expected number of primes up to $x$ is roughly the sum, or integral, of that density:

$$\operatorname{Li}(x) = \int_2^x \frac{dt}{\log t}.$$

Some authors prefer $\operatorname{li}(x) = \int_0^x \frac{dt}{\log t}$, defined as a principal value because of the singularity at $t = 1$; the two differ by the constant $\operatorname{li}(2) \approx 1.045$, which is irrelevant for large $x$.

Adrien-Marie Legendre, independently and in print (1798, refined in the 1808 edition of his *Essai sur la théorie des nombres*), proposed instead
$$\pi(x) \approx \frac{x}{\log x - 1.08366},$$
with the constant fitted to the tables available to him, which went up to $400{,}000$.:cite[goldstein1973]

## Asymptotic notation

To say precisely how good such approximations are, we need the standard notation for comparing functions as $x \to \infty$. Appendix B has more examples and the tools for manipulating it.

| Notation | Meaning | Example |
| --- | --- | --- |
| $f \sim g$ | $f(x)/g(x) \to 1$ | $\operatorname{Li}(x) \sim x/\log x$ |
| $f = O(g)$, or $f \ll g$ | $\lvert f(x)\rvert \le C g(x)$ for some constant $C$ and all large $x$ | $\sin x = O(1)$ |
| $f = o(g)$ | $f(x)/g(x) \to 0$ | $\log x = o(x^{0.01})$ |
| $f \asymp g$ | $f \ll g$ and $g \ll f$ | $\pi(x) \asymp x/\log x$ (Chapter 16) |

Two warnings. First, $\sim$ is about *ratios*: $f \sim g$ allows $f - g$ to be huge. $x^2 + x \sim x^2$, although the difference grows without bound. Second, $O$ hides a constant, which may be large or unknown. "$\pi(x) = O(x/\log x)$" says nothing about the constant, and Chapter 16 works to make it explicit.

In this notation, Gauss's guess is the **prime number theorem**:

$$\pi(x) \sim \frac{x}{\log x}.$$

## Li(x) and x/log x

Here is the first surprise: Gauss's and Legendre's formulas, and the plain $x/\log x$, are all asymptotically the same.

:::theorem{status=proved}
$\operatorname{Li}(x) = \dfrac{x}{\log x} + O\!\left(\dfrac{x}{(\log x)^2}\right)$. In particular $\operatorname{Li}(x) \sim x/\log x$.
:::

:::proof
Integrate by parts, with $u = 1/\log t$ and $dv = dt$, so that $du = -dt/(t\log^2 t)$:
$$\operatorname{Li}(x) = \left[\frac{t}{\log t}\right]_2^x + \int_2^x \frac{dt}{\log^2 t} = \frac{x}{\log x} - \frac{2}{\log 2} + \int_2^x \frac{dt}{\log^2 t}.$$
To bound the last integral, split it at $\sqrt x$. On $[2, \sqrt x]$ the integrand is at most $1/\log^2 2$, so that part is at most $\sqrt x / \log^2 2$. On $[\sqrt x, x]$ the integrand is at most $1/\log^2 \sqrt{x} = 4/\log^2 x$, so that part is at most $4x/\log^2 x$. Since $\sqrt{x} = O(x/\log^2 x)$, the whole integral is $O(x / \log^2 x)$.
:::

Integrating by parts again and again gives an **asymptotic expansion**
$$\operatorname{Li}(x) = \frac{x}{\log x}\left(1 + \frac{1!}{\log x} + \frac{2!}{\log^2 x} + \cdots + \frac{(K-1)!}{\log^{K-1} x}\right) + O_K\!\left(\frac{x}{\log^{K+1} x}\right).$$
The series does not converge (the factorials win eventually), but for each fixed $K$ the error is smaller than the last term kept. Note what the first two terms say: $\operatorname{Li}(x) \approx \frac{x}{\log x}\left(1 + \frac{1}{\log x}\right) \approx \frac{x}{\log x - 1}$. So Legendre's form $x/(\log x - A)$ matches $\operatorname{Li}(x)$ to second order only when $A = 1$. His $1.08366$ fitted the tables of his day, but it is not the right constant as $x \to \infty$; Chebyshev pointed this out in 1849.:cite[goldstein1973]

If all three formulas are asymptotically equal, why does it matter which one you use? Because asymptotic equality is a statement about ratios, and the ratios converge at very different speeds.

::ratio-chart

The ratio $\pi(x)/(x/\log x)$ is still $1.019$ at $10^{24}$: it approaches $1$ like $1 + 1/\log x$, which is painfully slow. The ratio $\pi(x)/\operatorname{Li}(x)$ is $1$ to nine decimal places at $10^{20}$. Switch to the second view: the error $\operatorname{Li}(x) - \pi(x)$, measured in units of $\sqrt{x}/\log x$, stays between about $0.8$ and $2$ across the whole table. Part VI explains why: the typical size of the error is governed by the zeros of the zeta function, and the Riemann Hypothesis is equivalent to a bound of the form $O(\sqrt{x} \log x)$.

```quiz
q: Which of these statements is true?
options:
  - text: $\operatorname{Li}(x) - \dfrac{x}{\log x} \to \infty$ as $x \to \infty$, even though $\operatorname{Li}(x) \sim \dfrac{x}{\log x}$.
    correct: true
    why: The difference is about $x/\log^2 x$, which tends to infinity. Asymptotic equivalence only says the *ratio* tends to $1$.
  - text: If $f \sim g$ then $f - g = O(1)$.
    why: '$x^2 + x \sim x^2$ but the difference $x$ is unbounded.'
  - text: '$\pi(x) = O(x)$ is a deep theorem.'
    why: It is trivial, since $\pi(x) \le x$. The content of the prime number theorem is the precise constant and the $\log x$.
```

## The $n$-th prime

The prime number theorem can be restated as a formula for the $n$-th prime $p_n$. The two statements are equivalent, and the proof is a nice exercise in handling $\sim$.

:::theorem{status=proved}
$\pi(x) \sim x / \log x$ if and only if $p_n \sim n \log n$.
:::

:::proof
($\Rightarrow$) Put $x = p_n$, so $\pi(x) = n$ and $n \sim p_n / \log p_n$. Taking logarithms, $\log n = \log p_n - \log\log p_n + o(1) \sim \log p_n$, because $\log\log p_n = o(\log p_n)$. Hence $p_n \sim n \log p_n \sim n \log n$.

($\Leftarrow$) Given $x$, let $n = \pi(x)$, so $p_n \le x < p_{n+1}$. From $p_n \sim n \log n$ and $p_{n+1} \sim (n+1)\log(n+1) \sim n \log n$, we get $x \sim n \log n$, so $\log x \sim \log n$ and $n \sim x / \log n \sim x / \log x$. (Here $n \to \infty$ as $x \to \infty$, because there are infinitely many primes.)
:::

So the millionth prime should be near $10^6 \log 10^6 \approx 13.8$ million. It is $15{,}485{,}863$: the estimate is $11\%$ low, the same slow convergence as $x / \log x$. A better estimate, from the expansion of $\operatorname{Li}$, is $p_n \approx n(\log n + \log\log n - 1)$, which gives $15.4$ million.

```numeric
id: gauss/pi-ten-million
title: Estimate a count
prompt: 'Use $x / (\log x - 1)$ to estimate $\pi(10^7)$. (Use $\log 10^7 \approx 16.118$; an answer within 0.3% counts.)'
answer: 661460
tolerance: 0.003
explain: '$10^7 / 15.118 \approx 661{,}460$. The true value is $664{,}579$, so $x / (\log x - 1)$ is about $0.5\%$ low, while $x / \log x \approx 620{,}421$ is $6.6\%$ low.'
```

:::key
- Near $x$, about one number in $\log x$ is prime. Summing the density gives $\operatorname{Li}(x) = \int_2^x dt/\log t$.
- Notation: $\sim$ (ratio $\to 1$), $O$ and $\ll$ (bounded by a constant multiple), $o$ (ratio $\to 0$), $\asymp$ (same order).
- $\operatorname{Li}(x) = \frac{x}{\log x} + O\left(\frac{x}{\log^2 x}\right)$, so all the classical formulas are asymptotically equal, but $\operatorname{Li}(x)$ is far more accurate: its error appears to be about $\sqrt{x}/\log x$.
- The prime number theorem $\pi(x) \sim x/\log x$ is equivalent to $p_n \sim n \log n$.
:::

:::exercises
1. Show that $\frac{x}{\log x - 1} = \frac{x}{\log x} + \frac{x}{\log^2 x} + O\left(\frac{x}{\log^3 x}\right)$, and compare with the expansion of $\operatorname{Li}(x)$.
2. Prove that if $f \sim g$ and $g \to \infty$, then $\log f \sim \log g$. Give an example showing that $f \sim g$ does not imply $e^f \sim e^g$.
3. Assuming the prime number theorem, show that for every $\varepsilon > 0$ there is a prime between $x$ and $(1 + \varepsilon)x$ for all large $x$. (Chapter 16 proves the case $\varepsilon = 1$ without the prime number theorem.)
4. Assuming the prime number theorem, show that $\sum_{p \le x} \log p \sim x$. (This is the form in which Part V proves it.)
:::
