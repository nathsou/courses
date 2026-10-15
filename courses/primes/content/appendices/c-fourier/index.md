---
number: C
title: Fourier analysis and Poisson summation
summary: "Characters and orthogonality on ℤ/qℤ and on finite abelian groups; Fourier series of periodic functions and the Gibbs phenomenon; the Fourier transform on ℝ, the self-dual Gaussian and Poisson summation; and Mellin transforms, the multiplicative version that underlies Perron’s formula."
duration: About 1 hour
---

Fourier analysis decomposes a function into pure oscillations. It appears in the course in three guises: on the finite group $\Z/q\Z$ (Dirichlet characters in Chapter 33, the circle method in Chapter 37), on the circle $\R/\Z$ (the sawtooth function of Euler–Maclaurin, and the waves of the explicit formula), and on the line $\R$ (Poisson summation and the theta function in Chapter 21). This appendix treats all three, with proofs of the parts the course relies on.

## Fourier analysis on ℤ/qℤ

Write $e(x) = e^{2\pi ix}$, so $e(x + 1) = e(x)$ and $e(x + y) = e(x)e(y)$. For a fixed modulus $q$ and an integer $k$, the function $n \mapsto e(kn/q)$ is well defined on $\Z/q\Z$, and it turns addition into multiplication. These $q$ functions are the **additive characters** modulo $q$.

:::lemma{name="Orthogonality" status=proved}
$$\sum_{n=0}^{q-1}e\!\left(\frac{an}{q}\right) = \begin{cases}q & \text{if } q \mid a,\\ 0 & \text{otherwise.}\end{cases}$$
:::

:::proof
If $q \mid a$ every term is $1$. Otherwise $w = e(a/q) \ne 1$ is a $q$-th root of unity, and $\sum_{n=0}^{q-1}w^n = \frac{w^q - 1}{w - 1} = 0$.
:::

So every function $f : \Z/q\Z \to \C$ is a combination of characters. Define $\hat f(k) = \frac1q\sum_n f(n)e(-kn/q)$. Then
$$f(n) = \sum_{k=0}^{q-1}\hat f(k)\,e\!\left(\frac{kn}{q}\right), \qquad \frac1q\sum_n|f(n)|^2 = \sum_k|\hat f(k)|^2,$$
the **inversion formula** and **Parseval's identity**. Both follow by substituting the definition and using orthogonality. This is the discrete Fourier transform, which a computer evaluates with the fast Fourier transform.

**Characters of finite abelian groups.** The same idea works for any finite abelian group $G$, such as the multiplicative group $(\Z/q\Z)^\times$. A **character** is a homomorphism $\chi : G \to \C^\times$. Since $g^{|G|} = 1$, the values are roots of unity.

:::theorem{status=proved}
A finite abelian group $G$ has exactly $|G|$ characters. For a character $\chi$ and an element $g$,
$$\sum_{h \in G}\chi(h) = \begin{cases}|G| & \chi = \chi_0,\\ 0 & \text{otherwise,}\end{cases}\qquad \sum_\chi\chi(g) = \begin{cases}|G| & g = 1,\\ 0 & \text{otherwise,}\end{cases}$$
where $\chi_0$ is the trivial character, equal to $1$ everywhere.
:::

:::proof
**Counting.** A finite abelian group is a product of cyclic groups $C_{n_1}\times\cdots\times C_{n_r}$ (the structure theorem, stated in Appendix E). A character of a cyclic group $C_n$ with generator $g$ is determined by $\chi(g)$, which can be any $n$-th root of unity: $n$ characters. Characters of a product are products of characters of the factors, so there are $n_1\cdots n_r = |G|$ of them.

**First sum.** If $\chi \ne \chi_0$, pick $g$ with $\chi(g) \ne 1$. As $h$ runs over $G$ so does $gh$, so $S = \sum_h\chi(h) = \sum_h\chi(gh) = \chi(g)S$, forcing $S = 0$.

**Second sum.** If $g \ne 1$ there is a character with $\chi_1(g) \ne 1$ (in the product decomposition, $g$ has a coordinate that is not the identity, and a character of that cyclic factor separates it). As $\chi$ runs over the characters so does $\chi_1\chi$, and the same argument applies.
:::

The second relation is the one that matters for primes: to pick out the $n \equiv a \pmod q$ from a sum over all $n$ coprime to $q$, use
$$\frac{1}{\varphi(q)}\sum_\chi\overline{\chi(a)}\chi(n) = \begin{cases}1 & n \equiv a \pmod q,\\ 0 & \text{otherwise.}\end{cases}$$
That is how Dirichlet proved his theorem on primes in arithmetic progressions (Chapter 33).

## Fourier series

A function $f$ on $\R$ with period $1$ has **Fourier coefficients** $c_k = \int_0^1 f(t)e(-kt)\,dt$ for $k \in \Z$, and **Fourier series** $\sum_k c_ke(kt)$.

:::theorem{status=sketched}
1. If $f$ is continuous with period $1$ and $\sum|c_k| < \infty$, then $f(t) = \sum_k c_ke(kt)$ for every $t$, and the convergence is uniform. This holds in particular if $f$ is twice continuously differentiable, since integrating by parts twice gives $|c_k| \le \frac{C}{k^2}$.
2. If $f$ is piecewise smooth with jumps, the symmetric partial sums $\sum_{|k| \le N}c_ke(kt)$ converge to $f(t)$ where $f$ is continuous, and to the midpoint $\frac12(f(t^-) + f(t^+))$ at a jump.
:::

For the first part, the series converges uniformly to a continuous function $g$ with the same Fourier coefficients as $f$; then $f - g$ is continuous with all coefficients $0$, and such a function is $0$ (by Fejér's theorem: the averages of the partial sums of any continuous function converge to it uniformly). The second part is Dirichlet's theorem on Fourier series.

The sawtooth $\{t\} - \frac12$, which appears in Abel summation and Euler–Maclaurin (Appendix B), has $c_0 = 0$ and $c_k = \frac{i}{2\pi k}$ for $k \ne 0$, so
$$\{t\} - \frac12 = -\sum_{n \ge 1}\frac{\sin 2\pi nt}{\pi n}\qquad(t \notin \Z).$$

::fourier-series

Near a jump, the partial sums overshoot by about $9\%$ of the size of the jump, however many terms are taken: the overshoot just moves closer to the jump. This is the **Gibbs phenomenon**, and it is exactly what the explicit formula of Chapter 23 does near each prime power.

## The Fourier transform and Poisson summation

For an integrable function $f$ on $\R$, the **Fourier transform** is
$$\hat f(\xi) = \int_{-\infty}^\infty f(x)\,e(-x\xi)\,dx.$$
Shifting, scaling and differentiating behave simply: if $g(x) = f(x - a)$ then $\hat g(\xi) = e(-a\xi)\hat f(\xi)$; if $g(x) = f(\lambda x)$ then $\hat g(\xi) = \frac1{|\lambda|}\hat f(\xi/\lambda)$; and $\widehat{f'}(\xi) = 2\pi i\xi\hat f(\xi)$. A function that is narrow has a transform that is wide.

The Gaussian $g(x) = e^{-\pi x^2}$ is its own transform, $\hat g = g$ (proved in Chapter 21 by a differential equation). By scaling, $e^{-\pi tx^2}$ has transform $t^{-1/2}e^{-\pi\xi^2/t}$. The **inversion formula** $f(x) = \int\hat f(\xi)e(x\xi)\,d\xi$ holds whenever $f$ and $\hat f$ are both integrable and $f$ is continuous.

:::theorem{name="Poisson summation" status=proved}
Suppose $f$ is continuous, and $|f(x)| + |\hat f(x)| \le \frac{C}{(1 + |x|)^{1 + \delta}}$ for some $C, \delta > 0$. Then
$$\sum_{n \in \Z}f(n) = \sum_{k \in \Z}\hat f(k).$$
:::

:::proof
The periodisation $F(t) = \sum_n f(t + n)$ converges uniformly (by the decay of $f$), so it is continuous with period $1$. Its Fourier coefficients are
$$c_k = \int_0^1\sum_n f(t + n)e(-kt)\,dt = \sum_n\int_n^{n+1}f(u)e(-ku)\,du = \hat f(k),$$
using $e(-k(u - n)) = e(-ku)$. By the decay of $\hat f$, $\sum|c_k| < \infty$, so by the first part of the theorem on Fourier series $F(t) = \sum_k\hat f(k)e(kt)$. Put $t = 0$.
:::

For the Gaussian $e^{-\pi tx^2}$ this gives the theta transformation $\theta(1/t) = \sqrt t\,\theta(t)$, which Chapter 21 turns into the functional equation of $\zeta$. Poisson summation also gives exact formulas such as $\sum_{n \in \Z}\frac{1}{n^2 + a^2} = \frac{\pi}{a}\coth\pi a$ (exercise 3).

## Mellin transforms

The substitution $x = e^u$ turns the additive structure of $\R$ into the multiplicative structure of $(0, \infty)$, and the Fourier transform into the **Mellin transform**
$$\mathcal Mf(s) = \int_0^\infty f(x)\,x^{s-1}\,dx.$$
The Gamma function is the Mellin transform of $e^{-x}$, and Chapter 21 writes $\pi^{-s/2}\Gamma(s/2)\zeta(s)$ as the Mellin transform of $\omega(x) = \sum_{n \ge 1}e^{-\pi n^2x}$. Fourier inversion becomes **Mellin inversion**: under suitable conditions,
$$f(x) = \frac{1}{2\pi i}\int_{c - i\infty}^{c + i\infty}\mathcal Mf(s)\,x^{-s}\,ds.$$
Perron's formula (Chapter 23) is this for the step function equal to $1$ on $(0, 1)$ and $0$ on $(1, \infty)$, whose Mellin transform is $\frac1s$. Dirichlet series are Mellin transforms of step functions: $\sum a_nn^{-s} = s\int_1^\infty A(x)x^{-s-1}dx$ with $A(x) = \sum_{n \le x}a_n$, which is Abel summation once more.

:::key
- On $\Z/q\Z$: $\sum_n e(an/q)$ is $q$ or $0$; every function is a combination of the $q$ characters. On a finite abelian group the characters satisfy the same orthogonality, which isolates residue classes.
- Periodic functions are sums of their Fourier series (uniformly if the coefficients are summable); at jumps, partial sums converge to the midpoint and overshoot by about $9\%$.
- The Fourier transform exchanges narrow and wide; the Gaussian is self-dual. Poisson summation: $\sum f(n) = \sum\hat f(k)$.
- The Mellin transform is the Fourier transform in multiplicative form; Gamma, theta and Perron's formula are instances.
:::

:::exercises
1. Prove Parseval's identity on $\Z/q\Z$.
2. Compute the Fourier coefficients of the sawtooth $\{t\} - \frac12$ and check the series above at $t = \frac14$, where it gives Leibniz's series for $\frac\pi4$.
3. The function $f(x) = \frac{1}{x^2 + a^2}$ ($a > 0$) has $\hat f(\xi) = \frac{\pi}{a}e^{-2\pi a|\xi|}$. Apply Poisson summation to show $\sum_{n \in \Z}\frac{1}{n^2 + a^2} = \frac{\pi}{a}\coth\pi a$, and let $a \to 0$ to recover $\zeta(2) = \frac{\pi^2}6$.
4. List the four characters of $(\Z/5\Z)^\times$, which is cyclic with generator $2$, and check both orthogonality relations.
5. Show that the Mellin transform of $\frac{1}{e^x - 1}$ is $\Gamma(s)\zeta(s)$ for $\operatorname{Re}s > 1$. (Expand $\frac{1}{e^x - 1} = \sum_{n \ge 1}e^{-nx}$.) This was Riemann's first proof of the continuation of $\zeta$.
:::
