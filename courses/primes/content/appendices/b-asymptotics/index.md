---
number: B
title: Asymptotics and summation
summary: The notation O, o, ~, ≪ and how to calculate with it; comparing sums with integrals; Abel summation; the Euler–Maclaurin formula; harmonic numbers and Euler’s constant γ; Stirling’s formula.
duration: About 1 hour
---

Analytic number theory is mostly the art of estimating sums. This appendix collects the tools the course uses, with proofs of everything except the full Euler–Maclaurin formula and the constant in Stirling’s formula.

## Asymptotic notation

Throughout, $f$ and $g$ are real (or complex) functions defined for large $x$, and $g > 0$.

| Notation | Definition |
| --- | --- |
| $f = O(g)$ or $f \ll g$ | There are $C$ and $x_0$ with $\lvert f(x)\rvert \le C g(x)$ for $x \ge x_0$. |
| $f = o(g)$ | $f(x)/g(x) \to 0$. |
| $f \sim g$ | $f(x)/g(x) \to 1$, that is, $f = g + o(g)$. |
| $f \asymp g$ | $f \ll g$ and $g \ll f$ (for positive $f$). |
| $f = O_\varepsilon(g)$ | The constant $C$ may depend on $\varepsilon$. |

Rules that are used without comment:

- $O(f) + O(g) = O(f + g)$; $O(f)\,O(g) = O(fg)$; if $f \ll g$ then $O(f) + O(g) = O(g)$.
- $\int_a^x O(g(t))\,dt = O\left(\int_a^x g(t)\,dt\right)$ for positive $g$.
- $\frac{1}{1 + O(\varepsilon)} = 1 + O(\varepsilon)$ and $e^{O(\varepsilon)} = 1 + O(\varepsilon)$ when $\varepsilon \to 0$; $\log(1 + O(\varepsilon)) = O(\varepsilon)$.
- For every $\varepsilon > 0$ and $A$: $(\log x)^A = O_{A, \varepsilon}(x^\varepsilon)$, and $x^A = O_{A, \varepsilon}(e^{\varepsilon x})$.

An equation with $O$ on the right is read left to right: $\operatorname{Li}(x) = x/\log x + O(x/\log^2 x)$ means "the difference is $O(x / \log^2 x)$".

```quiz
q: Which statement is false?
options:
  - text: If $f \sim g$ then $f - g = o(g)$.
    why: This is the definition of $\sim$ rewritten.
  - text: If $f = O(g)$ and $g = O(f)$ then $f \sim g$.
    correct: true
    why: That is $f \asymp g$, which allows any bounded ratio, for example $f = 2g$.
  - text: $\log(x^2 + 1) \sim 2\log x$.
    why: '$\log(x^2 + 1) = 2\log x + \log(1 + x^{-2}) = 2\log x + O(x^{-2})$.'
```

## Sums and integrals

If $f$ is monotonic on $[a, b]$, a sum $\sum_{a < n \le b} f(n)$ differs from $\int_a^b f(t)\,dt$ by at most $\max(|f(a)|, |f(b)|)$: the sum is a Riemann sum with unit steps, and for a monotonic function the overestimates and underestimates are bounded by one term. For example:

- $\sum_{n \le x} \log n = x\log x - x + O(\log x)$ (Chapter 17).
- $\sum_{n \le x} n^{-\sigma} = \frac{x^{1 - \sigma}}{1 - \sigma} + O(1)$ for $0 < \sigma < 1$.
- $\sum_{n > x} n^{-\sigma} \le \frac{x^{1 - \sigma}}{\sigma - 1} + x^{-\sigma}$ for $\sigma > 1$.

## Abel summation

The most useful single tool in the course is the discrete analogue of integration by parts.

:::theorem{name="Abel summation" status=proved}
Let $(a_n)_{n \ge 1}$ be complex numbers, $A(t) = \sum_{n \le t} a_n$, and let $f$ be continuously differentiable on $[y, x]$ with $0 < y < x$. Then
$$\sum_{y < n \le x} a_n f(n) = A(x) f(x) - A(y) f(y) - \int_y^x A(t) f'(t)\,dt.$$
:::

:::proof
For each $n$ with $y < n \le x$, $f(n) = f(x) - \int_n^x f'(t)\,dt$. Multiply by $a_n$ and sum:
$$\sum_{y < n \le x} a_n f(n) = (A(x) - A(y)) f(x) - \int_y^x \Big(\sum_{y < n \le t} a_n\Big) f'(t)\,dt,$$
since $a_n$ contributes to the integrand exactly for $t \ge n$. The inner sum is $A(t) - A(y)$, and $\int_y^x A(y) f'(t)\,dt = A(y)(f(x) - f(y))$. Collecting terms gives the formula.
:::

The idea is that if you know how a sequence accumulates, $A(t)$, you can compute weighted sums of it. In the course: Mertens’ second theorem (weights $1/\log p$ on $\frac{\log p}{p}$), Chebyshev’s observation (weights $1/t$ on primes), Dirichlet series (Chapter 19, $f(t) = t^{-s}$), and bounds for $L$-functions (Chapter 33, where $A(t)$ is bounded and $f$ decreasing).

## Harmonic numbers and Euler’s constant

:::theorem{status=proved}
$H_x = \sum_{n \le x}\frac1n = \log x + \gamma + O\!\left(\frac1x\right)$, where
$$\gamma = 1 - \int_1^\infty \frac{\{t\}}{t^2}\,dt = 0.5772156649\ldots$$
is the **Euler–Mascheroni constant**, and $\{t\} = t - \lfloor t\rfloor$ is the fractional part.
:::

:::proof
Abel summation with $a_n = 1$, $A(t) = \lfloor t\rfloor = t - \{t\}$, $f(t) = 1/t$, from $y = 1^-$ (so that the term $n = 1$ is included):
$$\sum_{n \le x}\frac1n = \frac{\lfloor x\rfloor}{x} + \int_1^x \frac{\lfloor t\rfloor}{t^2}\,dt = 1 + O\!\left(\frac1x\right) + \int_1^x \frac{dt}{t} - \int_1^x\frac{\{t\}}{t^2}\,dt.$$
The last integral converges as $x \to \infty$ (the integrand is at most $1/t^2$), and its tail beyond $x$ is at most $1/x$.
:::

Nobody knows whether $\gamma$ is rational.

## The Euler–Maclaurin formula

Comparing a sum with an integral can be pushed to any order. Let $B_k$ be the **Bernoulli numbers** ($B_0 = 1$, $B_1 = -\frac12$, $B_2 = \frac16$, $B_4 = -\frac1{30}$, $B_6 = \frac1{42}$, and $B_k = 0$ for odd $k \ge 3$), and $B_k(t)$ the Bernoulli polynomials, extended periodically from $[0, 1)$.

:::theorem{name="Euler–Maclaurin" status=stated}
For integers $a < b$, a smooth function $f$ and $m \ge 1$,
$$\sum_{a < n \le b} f(n) = \int_a^b f(t)\,dt + \frac{f(b) - f(a)}{2} + \sum_{k=1}^{m}\frac{B_{2k}}{(2k)!}\left(f^{(2k-1)}(b) - f^{(2k-1)}(a)\right) + R_m,$$
with $R_m = -\frac{1}{(2m)!}\int_a^b B_{2m}(\{t\}) f^{(2m)}(t)\,dt$.
:::

The case $m = 0$, with remainder $\int_a^b (\{t\} - \tfrac12) f'(t)\,dt$, follows from Abel summation, and each further term comes from integrating by parts once more. The formula is how the course’s library evaluates $\zeta(s)$ anywhere in the complex plane (Chapter 20): with $f(t) = t^{-s}$, the integral and the correction terms can be written down exactly, and the remainder is tiny.

## Stirling’s formula

:::theorem{name="Stirling" status=proved}
$\log(n!) = n\log n - n + \tfrac12\log n + C + O\!\left(\frac1n\right)$ for some constant $C$; in fact $C = \tfrac12\log(2\pi)$, so $n! \sim \sqrt{2\pi n}\,(n/e)^n$.
:::

:::proof
Apply Euler–Maclaurin with $m = 0$ to $f(t) = \log t$ on $[1, n]$: $\sum_{1 < k \le n}\log k = \int_1^n \log t\,dt + \frac{\log n}{2} + \int_1^n \frac{\{t\} - \frac12}{t}\,dt$. The first integral is $n\log n - n + 1$. The last converges as $n \to \infty$, because $\int_N^{N+1}(\{t\} - \frac12)\,dt = 0$ makes it oscillate with shrinking amplitude (integrate by parts once more to see a tail of size $O(1/n)$). That gives the form with an unknown constant $C$. The value $C = \frac12\log 2\pi$ follows from Wallis’s product for $\pi$; the course needs it only through the Stirling series for $\log\Gamma$ (Chapters 21 and 22), and Appendix D derives it from the Gamma function.
:::

For complex arguments, Stirling’s formula becomes an asymptotic series for $\log\Gamma(z)$, which Appendix D states and the library uses.

:::key
- $O$, $o$, $\sim$, $\asymp$ compare growth; $\sim$ is about ratios, $O$ hides a constant.
- Monotonic sums differ from integrals by one term. Abel summation turns knowledge of $\sum_{n \le t} a_n$ into estimates of weighted sums.
- $H_x = \log x + \gamma + O(1/x)$; Euler–Maclaurin refines sum–integral comparisons to any order; Stirling: $\log n! = n\log n - n + \frac12\log(2\pi n) + O(1/n)$.
:::
