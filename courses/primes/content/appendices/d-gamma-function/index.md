---
number: D
title: The Gamma function
summary: "Euler’s Gamma function from its integral: the functional equation Γ(s + 1) = sΓ(s), continuation with poles at the non-positive integers, the Gaussian integral, the Beta function, Gauss’s limit and the Weierstrass product, reflection and duplication, the sine product, and Stirling’s formula in the complex plane."
duration: About 1 hour
---

The Gamma function is the second most important function in this course, after $\zeta$. It supplies the factor that makes the functional equation of $\zeta$ symmetric (Chapter 21), its Stirling expansion gives the Riemann–Siegel theta function (Chapter 22), and its poles explain the trivial zeros. This appendix proves everything those chapters use.

## Definition and functional equation

:::definition
For $\operatorname{Re}s > 0$, $\displaystyle\Gamma(s) = \int_0^\infty e^{-x}x^{s-1}\,dx$.
:::

The integral converges absolutely for $\sigma = \operatorname{Re}s > 0$ (near $0$, $|x^{s-1}| = x^{\sigma - 1}$ is integrable; near $\infty$, $e^{-x}$ wins), and defines a holomorphic function there (Appendix A, holomorphic integrals).

:::theorem{status=proved}
$\Gamma(s + 1) = s\,\Gamma(s)$ for $\operatorname{Re}s > 0$, and $\Gamma(n) = (n - 1)!$ for positive integers $n$.
:::

:::proof
Integrate by parts: $\int_0^\infty e^{-x}x^s\,dx = \big[-e^{-x}x^s\big]_0^\infty + s\int_0^\infty e^{-x}x^{s-1}\,dx$, and the boundary term vanishes. Since $\Gamma(1) = \int_0^\infty e^{-x}dx = 1$, induction gives $\Gamma(n) = (n-1)!$.
:::

::gamma-plot

## Continuation and poles

Rewrite the functional equation as $\Gamma(s) = \frac{\Gamma(s + 1)}{s}$, and more generally
$$\Gamma(s) = \frac{\Gamma(s + n)}{s(s + 1)\cdots(s + n - 1)}.$$
The right side is meromorphic on $\operatorname{Re}s > -n$, so this continues $\Gamma$ to the whole plane. The only possible poles are $s = 0, -1, -2, \ldots$, and they are simple: near $s = -k$,
$$\operatorname{Res}_{s = -k}\Gamma = \frac{\Gamma(1)}{(-k)(-k + 1)\cdots(-1)} = \frac{(-1)^k}{k!}.$$

## The Gaussian integral and Γ(½)

:::proposition{status=proved}
$\displaystyle\int_{-\infty}^\infty e^{-\pi x^2}dx = 1$, and $\Gamma(\tfrac12) = \sqrt\pi$.
:::

:::proof
Let $I = \int e^{-\pi x^2}dx$. Then $I^2 = \iint e^{-\pi(x^2 + y^2)}dx\,dy$, and in polar coordinates this is $\int_0^{2\pi}\int_0^\infty e^{-\pi r^2}r\,dr\,d\theta = 2\pi\cdot\frac{1}{2\pi} = 1$. Since $I > 0$, $I = 1$. For $\Gamma(\frac12) = \int_0^\infty e^{-x}x^{-1/2}dx$, substitute $x = \pi u^2$: $dx = 2\pi u\,du$ and $x^{-1/2} = \frac{1}{\sqrt\pi u}$, so $\Gamma(\frac12) = 2\sqrt\pi\int_0^\infty e^{-\pi u^2}du = \sqrt\pi$.
:::

## The Beta function

:::theorem{name="Euler’s Beta integral" status=proved}
For $\operatorname{Re}a, \operatorname{Re}b > 0$,
$$B(a, b) = \int_0^1 t^{a-1}(1 - t)^{b-1}\,dt = \frac{\Gamma(a)\Gamma(b)}{\Gamma(a + b)}.$$
:::

:::proof
$\Gamma(a)\Gamma(b) = \int_0^\infty\int_0^\infty e^{-x-y}x^{a-1}y^{b-1}\,dx\,dy$. Substitute $x = ut$, $y = u(1 - t)$ with $u > 0$, $0 < t < 1$; the Jacobian is $u$. The integral becomes $\int_0^\infty e^{-u}u^{a+b-1}du\cdot\int_0^1 t^{a-1}(1-t)^{b-1}dt = \Gamma(a + b)B(a, b)$.
:::

## Gauss’s limit and the Weierstrass product

:::theorem{name="Gauss" status=proved}
For every $s$ that is not $0, -1, -2, \ldots$,
$$\Gamma(s) = \lim_{n \to \infty}\frac{n!\,n^s}{s(s+1)\cdots(s+n)}.$$
:::

:::proof
For $\operatorname{Re}s > 0$, substitute $t = nu$ and use the Beta integral:
$$\int_0^n\left(1 - \frac tn\right)^n t^{s-1}dt = n^s B(s, n + 1) = n^s\frac{\Gamma(s)\,n!}{\Gamma(s + n + 1)} = \frac{n!\,n^s}{s(s+1)\cdots(s+n)}.$$
As $n \to \infty$, $(1 - t/n)^n\mathbf 1_{t \le n}$ increases to $e^{-t}$, so by dominated convergence the left side tends to $\Gamma(s)$. For other $s$, apply this to $s + m$ and use $\Gamma(s) = \Gamma(s + m)/(s(s+1)\cdots(s + m - 1))$; the extra factors match those in the limit.
:::

Write $n^{-s} = e^{-s\log n}$ and $\log n = H_n - \gamma + o(1)$ (Appendix B). Then
$$\frac{s(s+1)\cdots(s+n)}{n!\,n^s} = s\,e^{s(H_n - \log n)}\prod_{k=1}^n\left(1 + \frac sk\right)e^{-s/k},$$
and letting $n \to \infty$ gives the **Weierstrass product**
$$\frac{1}{\Gamma(s)} = s\,e^{\gamma s}\prod_{k=1}^\infty\left(1 + \frac sk\right)e^{-s/k}.$$
The product converges for every $s$, uniformly on compact sets, because $(1 + z)e^{-z} = 1 + O(|z|^2)$ and $\sum 1/k^2$ converges. Consequences:

- $1/\Gamma$ is entire, with simple zeros exactly at $0, -1, -2, \ldots$ In particular **$\Gamma$ is never zero**.
- Taking the logarithmic derivative, $-\frac{\Gamma'(s)}{\Gamma(s)} = \frac1s + \gamma + \sum_{k \ge 1}\left(\frac{1}{s + k} - \frac1k\right)$. At $s = 1$ the sum telescopes to $-1$, so $\Gamma'(1) = -\gamma$. This is the integral $\int_0^\infty e^{-x}\log x\,dx = -\gamma$ that Chapter 19 needed, proved there by a different route.

## Reflection and the sine product

:::theorem{name="Reflection formula" who="Euler" status=proved}
$\displaystyle\Gamma(s)\,\Gamma(1 - s) = \frac{\pi}{\sin\pi s}$ for all $s \notin \Z$.
:::

:::proof
By the identity theorem it suffices to take $0 < s < 1$. By the Beta integral with $a = s$, $b = 1 - s$, and the substitution $t = \frac{u}{1 + u}$,
$$\Gamma(s)\Gamma(1 - s) = B(s, 1 - s) = \int_0^\infty\frac{u^{s-1}}{1 + u}\,du = \int_{-\infty}^\infty\frac{e^{sx}}{1 + e^x}\,dx = I \quad (u = e^x).$$
Integrate $f(z) = \frac{e^{sz}}{1 + e^z}$ round the rectangle with corners $\pm R$ and $\pm R + 2\pi i$. On the top side $f(x + 2\pi i) = e^{2\pi is}f(x)$, so the top and bottom together give $(1 - e^{2\pi is})I$ in the limit. The vertical sides vanish as $R \to \infty$ because $0 < s < 1$. The only pole inside is at $z = \pi i$, with residue $\frac{e^{\pi is}}{e^{\pi i}} = -e^{\pi is}$. So $(1 - e^{2\pi is})I = -2\pi ie^{\pi is}$, and $I = \frac{2\pi i}{e^{\pi is} - e^{-\pi is}} = \frac{\pi}{\sin\pi s}$.
:::

Combining reflection with the Weierstrass product, using $\Gamma(1 - s) = -s\Gamma(-s)$:
$$\frac{\sin\pi s}{\pi} = \frac{1}{\Gamma(s)\Gamma(1 - s)} = \frac{-1}{s\,\Gamma(s)\Gamma(-s)} = s\prod_{k \ge 1}\left(1 - \frac{s^2}{k^2}\right),$$
because the factors $e^{\pm\gamma s}$ and $e^{\mp s/k}$ cancel in pairs. This is Euler's **sine product** $\sin\pi s = \pi s\prod_{k \ge 1}(1 - s^2/k^2)$, the formula behind his first solution of the Basel problem (Chapter 19, exercise 6).

## Duplication

:::theorem{name="Legendre duplication" status=proved}
$\Gamma(s)\,\Gamma(s + \tfrac12) = 2^{1 - 2s}\sqrt\pi\;\Gamma(2s)$.
:::

:::proof
For real $s > 0$, $B(s, s) = \int_0^1(t(1 - t))^{s-1}dt = 2\int_0^{1/2}(t(1-t))^{s-1}dt$. Substitute $u = 4t(1 - t)$, so $du = 4(1 - 2t)\,dt$ and $1 - 2t = \sqrt{1 - u}$:
$$B(s, s) = 2\int_0^1\left(\frac u4\right)^{s-1}\frac{du}{4\sqrt{1 - u}} = 2^{1-2s}B(s, \tfrac12).$$
In terms of Gamma: $\frac{\Gamma(s)^2}{\Gamma(2s)} = 2^{1-2s}\frac{\Gamma(s)\sqrt\pi}{\Gamma(s + \frac12)}$, which rearranges to the formula. The identity theorem extends it to all $s$.
:::

## Stirling’s formula

:::theorem{name="Stirling" status=sketched}
For $|\arg s| \le \pi - \delta$ and $|s| \to \infty$,
$$\log\Gamma(s) = \left(s - \tfrac12\right)\log s - s + \tfrac12\log 2\pi + \sum_{k=1}^{m}\frac{B_{2k}}{2k(2k-1)s^{2k-1}} + O_{m,\delta}\!\left(|s|^{-2m-1}\right),$$
with the principal branches of the logarithms. In particular, for fixed real $\sigma$ and $|t| \to \infty$,
$$|\Gamma(\sigma + it)| = \sqrt{2\pi}\,|t|^{\sigma - 1/2}e^{-\pi|t|/2}\left(1 + O\!\left(\tfrac{1}{|t|}\right)\right).$$
:::

The proof applies Euler–Maclaurin (Appendix B) to $\sum_{k=0}^n\log(s + k)$ in the logarithm of Gauss's limit; the Bernoulli numbers come from the correction terms, and the error is controlled as long as $s$ stays away from the negative real axis. That argument gives the formula with some unknown constant $C$ in place of $\frac12\log 2\pi$. Duplication identifies it: take logarithms of $\Gamma(s)\Gamma(s + \frac12) = 2^{1-2s}\sqrt\pi\,\Gamma(2s)$ and insert $\log\Gamma(s) = (s - \frac12)\log s - s + C + o(1)$ for real $s \to \infty$. Using $s\log(s + \frac12) = s\log s + \frac12 + o(1)$, the left side is $(2s - \frac12)\log s - 2s + 2C + o(1)$ and the right side is $(2s - \frac12)\log s - 2s + \frac12\log 2\pi + C + o(1)$, so $C = \frac12\log 2\pi$. For integers this is Stirling's formula for $n! = \Gamma(n + 1)$, with the constant left open in Appendix B.

The expansion of the Riemann–Siegel theta function $\theta(t) = \operatorname{Im}\log\Gamma(\frac14 + \frac{it}2) - \frac t2\log\pi$ in Chapter 22 comes from taking imaginary parts here.

::domain-colouring{fns="gamma" view="trivial" views="pole,trivial" lines=false}

In the complex plane, $\Gamma$ has its poles on the negative real axis (pale spots), no zeros anywhere, and it decays rapidly in the vertical direction, like $e^{-\pi|t|/2}$, which is why the factor $\Gamma(s/2)$ in $\xi(s)$ makes $\xi$ so small on the critical line.

:::key
- $\Gamma(s) = \int_0^\infty e^{-x}x^{s-1}dx$, $\Gamma(s + 1) = s\Gamma(s)$, $\Gamma(n) = (n-1)!$, $\Gamma(\frac12) = \sqrt\pi$.
- Meromorphic on $\C$ with simple poles at $-k$ (residue $(-1)^k/k!$); never zero, since $1/\Gamma(s) = se^{\gamma s}\prod(1 + s/k)e^{-s/k}$ is entire.
- Beta: $B(a, b) = \Gamma(a)\Gamma(b)/\Gamma(a + b)$. Reflection: $\Gamma(s)\Gamma(1 - s) = \pi/\sin\pi s$, giving $\sin\pi s = \pi s\prod(1 - s^2/k^2)$. Duplication: $\Gamma(s)\Gamma(s + \frac12) = 2^{1-2s}\sqrt\pi\,\Gamma(2s)$.
- Stirling: $\log\Gamma(s) = (s - \frac12)\log s - s + \frac12\log 2\pi + O(1/|s|)$ away from the negative axis; $|\Gamma(\sigma + it)| \approx \sqrt{2\pi}|t|^{\sigma - 1/2}e^{-\pi|t|/2}$.
:::

:::exercises
1. Show that $\Gamma(n + \frac12) = \frac{(2n)!}{4^nn!}\sqrt\pi$.
2. Use the reflection formula to show that $|\Gamma(\frac12 + it)|^2 = \frac{\pi}{\cosh\pi t}$, and compare with Stirling's formula.
3. Show that the volume of the unit ball in $\R^n$ is $\frac{\pi^{n/2}}{\Gamma(\frac n2 + 1)}$. (Compute $\int_{\R^n}e^{-\pi|x|^2}dx = 1$ in polar coordinates.)
4. Derive $\Gamma'(1) = -\gamma$ directly from Gauss's limit by differentiating its logarithm.
5. From $-\frac{\Gamma'}{\Gamma}(s) = \frac1s + \gamma + \sum_k\left(\frac1{s+k} - \frac1k\right)$, show that $\frac{\Gamma'}{\Gamma}(s) = \log s + O(1/|s|)$ for $\operatorname{Re}s \ge 1$. (This is the estimate behind $\frac{\zeta'}{\zeta}$ on the left of the critical strip in Chapter 23.)
:::
