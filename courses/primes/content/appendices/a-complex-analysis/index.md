---
number: A
title: Complex analysis, again
summary: "A refresher of everything Parts IV to VII use: complex exponentials and logarithms, holomorphic functions, contour integrals, Cauchy’s theorem and integral formula, uniform limits, the identity theorem and analytic continuation, poles and residues, the argument principle, Jensen’s formula and Hadamard products."
duration: About 1½ hours
---

This appendix is for a reader who once took a course in complex analysis and has forgotten most of it. It states every result the course uses, proves the short ones, and points to where each is needed. A standard text such as Stein and Shakarchi’s *Complex Analysis* has the full story.:cite[stein-shakarchi]

## Complex numbers, exponentials and logarithms

A complex number is $z = x + iy$ with $x, y$ real and $i^2 = -1$; $|z| = \sqrt{x^2 + y^2}$ and $\bar z = x - iy$, so $|z|^2 = z\bar z$. The exponential $e^z = \sum_{n \ge 0}z^n/n!$ satisfies $e^{z + w} = e^ze^w$ and **Euler’s formula**
$$e^{i\theta} = \cos\theta + i\sin\theta,$$
so every nonzero $z$ can be written $z = re^{i\theta}$ with $r = |z|$ and $\theta$ an **argument** of $z$, determined up to multiples of $2\pi$. The **principal argument** $\operatorname{Arg} z$ is the one in $(-\pi, \pi]$.

A logarithm of $z \ne 0$ is any $w$ with $e^w = z$: $w = \log|z| + i\theta$ for any argument $\theta$. There is no continuous choice on all of $\C \setminus \{0\}$ (going once round the origin adds $2\pi i$), which is why the course always says how an argument is chosen: usually “by continuous variation along a path”. For a positive real $a$ and complex $s$, $a^s$ always means $e^{s\log a}$ with the real logarithm, so $|a^s| = a^{\operatorname{Re}s}$.

## Holomorphic functions

:::definition
A function $f$ on an open set $U \subseteq \C$ is **holomorphic** if the limit
$$f'(z) = \lim_{h \to 0}\frac{f(z + h) - f(z)}{h}$$
exists at every $z \in U$, where $h$ tends to $0$ through complex values, from every direction. A function holomorphic on all of $\C$ is **entire**.
:::

Writing $f = u + iv$ and letting $h$ approach along the real and imaginary axes gives the **Cauchy–Riemann equations** $u_x = v_y$, $u_y = -v_x$. Polynomials, $e^z$, $\sin z$, $\cos z$ are entire; $1/z$ is holomorphic on $\C \setminus\{0\}$; $n^{-s} = e^{-s\log n}$ is entire in $s$. Sums, products, quotients (where the denominator is nonzero) and compositions of holomorphic functions are holomorphic. The function $\bar z$ is not: along the real axis the difference quotient is $1$, along the imaginary axis it is $-1$.

**Power series.** A series $\sum a_n(z - z_0)^n$ converges absolutely in a disc $|z - z_0| < R$ (its **radius of convergence**, possibly $0$ or $\infty$) and diverges outside it. Inside, it is holomorphic and can be differentiated term by term. The geometric series $\sum z^n = \frac1{1-z}$ has $R = 1$.

## Contour integrals and Cauchy’s theorem

For a piecewise smooth path $\gamma : [a, b] \to \C$, $\int_\gamma f(z)\,dz = \int_a^b f(\gamma(t))\gamma'(t)\,dt$. The basic estimate, used constantly, is
$$\left|\int_\gamma f(z)\,dz\right| \le \operatorname{length}(\gamma)\cdot\max_{\gamma}|f|.$$

:::lemma{status=proved}
For the circle $|z - z_0| = r$ traversed once anticlockwise and an integer $n$, $\displaystyle\oint (z - z_0)^n\,dz = \begin{cases}2\pi i & n = -1,\\ 0 & \text{otherwise.}\end{cases}$
:::

:::proof
With $z = z_0 + re^{it}$, $dz = ire^{it}dt$, the integral is $ir^{n+1}\int_0^{2\pi}e^{i(n+1)t}dt$, which is $2\pi i$ if $n = -1$ and $0$ otherwise.
:::

:::theorem{name="Cauchy’s theorem" status=stated}
If $f$ is holomorphic on an open set containing a closed path $\gamma$ and everything inside it (for example, a rectangle or a disc with its boundary), then $\oint_\gamma f(z)\,dz = 0$.
:::

So integrals of holomorphic functions depend only on the endpoints, and a path can be deformed freely as long as it does not cross a point where $f$ fails to be holomorphic. That is what “moving the line of integration” means in Chapter 23.

:::theorem{name="Cauchy’s integral formula" status=proved}
Under the same hypotheses, for $z_0$ inside the circle $\gamma$: $\displaystyle f(z_0) = \frac{1}{2\pi i}\oint_\gamma\frac{f(z)}{z - z_0}\,dz$.
:::

:::proof
By Cauchy’s theorem the circle can be shrunk to a small circle of radius $\varepsilon$ round $z_0$. There $\frac{f(z)}{z - z_0} = \frac{f(z_0)}{z - z_0} + \frac{f(z) - f(z_0)}{z - z_0}$. The first term integrates to $2\pi i f(z_0)$ by the lemma; the second is bounded (by $|f'(z_0)| + 1$, for small $\varepsilon$) on a path of length $2\pi\varepsilon$, so its integral tends to $0$.
:::

Expanding $\frac{1}{z - z_0}$ in the integral formula as a geometric series gives the main consequences:

- A holomorphic function is infinitely differentiable, and equals its Taylor series in every disc inside its domain.
- **Cauchy’s estimates:** if $|f| \le M$ on the circle $|z - z_0| = r$, then $|f^{(n)}(z_0)| \le n!\,M/r^n$.
- **Liouville:** a bounded entire function is constant (take $n = 1$ and $r \to \infty$).

## Limits and integrals of holomorphic functions

Most functions in the course are defined by series or integrals, and these two facts make them holomorphic.

:::theorem{name="Weierstrass" status=proved}
If $f_n$ are holomorphic on $U$ and $f_n \to f$ uniformly on every compact subset of $U$, then $f$ is holomorphic on $U$ and $f_n' \to f'$ uniformly on compact subsets.
:::

:::proof
On a small circle inside $U$, the integral formula for $f_n$ passes to the limit, so $f$ satisfies the integral formula, and a function given by the integral formula is holomorphic (differentiate under the integral sign). The same formula for the derivative, $f'(z_0) = \frac{1}{2\pi i}\oint\frac{f(z)}{(z - z_0)^2}dz$, together with the basic estimate, gives the convergence of derivatives.
:::

For a series $\sum f_n$, uniform convergence on compact sets follows from the **M-test**: $|f_n| \le M_n$ there with $\sum M_n < \infty$. This is how Chapter 20 shows that $\zeta(s) = \sum n^{-s}$ is holomorphic for $\operatorname{Re}s > 1$.

**Integrals.** If $g(x, s)$ is continuous, holomorphic in $s$ for each $x$, and $|g(x, s)| \le G(x)$ with $\int G < \infty$ for $s$ in each compact set, then $F(s) = \int g(x, s)\,dx$ is holomorphic. (Integrate $F$ round a small triangle and swap the integrals: the result is $0$, so $F$ is holomorphic by **Morera’s theorem**, the converse of Cauchy’s.) This covers $\Gamma(s) = \int_0^\infty e^{-x}x^{s-1}dx$, the integral $\int_1^\infty\{t\}t^{-s-1}dt$ of Chapter 20 and the theta integral of Chapter 21.

## Zeros and analytic continuation

If $f$ is holomorphic near $z_0$, not identically $0$ there, and $f(z_0) = 0$, the Taylor series starts at some power: $f(z) = (z - z_0)^m g(z)$ with $g(z_0) \ne 0$ and $m \ge 1$, the **order** of the zero. Since $g$ is nonzero near $z_0$, the zeros of $f$ are **isolated**.

:::theorem{name="Identity theorem" status=proved}
If $f$ and $g$ are holomorphic on a connected open set $U$ and $f = g$ on a set with a limit point in $U$ (for example, a segment or a small disc), then $f = g$ on all of $U$.
:::

:::proof
$h = f - g$ has non-isolated zeros at the limit point, so its Taylor series there is zero, and $h$ vanishes on a disc. The set of points near which $h$ vanishes identically is open, and by the same argument closed in $U$; it is nonempty, so it is all of $U$ since $U$ is connected.
:::

**Analytic continuation.** If $f$ is holomorphic on $U$ and $F$ is holomorphic on a larger connected set $V \supseteq U$ with $F = f$ on $U$, then $F$ is called the analytic continuation of $f$ to $V$, and by the identity theorem it is unique. Any formula that works gives the same answer. Two consequences used for $\zeta$: identities between holomorphic functions persist under continuation (if $f(s) = g(s)$ for $\operatorname{Re}s > 1$, they agree wherever both continue); and if $f$ is real on a real interval, then $f(\bar z) = \overline{f(z)}$ throughout (both sides are holomorphic in $z$ and agree on the interval).

## Poles and residues

A point $z_0$ where $f$ is holomorphic nearby but not at $z_0$ is an isolated singularity. If $(z - z_0)^m f(z)$ is holomorphic and nonzero at $z_0$ for some $m \ge 1$, then $z_0$ is a **pole** of order $m$, and $f$ has a **Laurent expansion**
$$f(z) = \frac{c_{-m}}{(z - z_0)^m} + \cdots + \frac{c_{-1}}{z - z_0} + c_0 + c_1(z - z_0) + \cdots$$
The coefficient $c_{-1}$ is the **residue** $\operatorname{Res}_{z_0}f$. A function that is holomorphic except for poles is **meromorphic**. Two rules cover almost every residue in the course:

- At a simple pole, $\operatorname{Res}_{z_0}f = \lim_{z \to z_0}(z - z_0)f(z)$. For example, $\operatorname{Res}_1\zeta = 1$ and $\operatorname{Res}_0\frac{x^s}{s} = 1$.
- **Logarithmic derivatives.** If $f$ has a zero of order $m$ at $z_0$, then $\frac{f'}{f}$ has a simple pole there with residue $m$; if $f$ has a pole of order $m$, the residue of $\frac{f'}{f}$ is $-m$. (Write $f = (z - z_0)^{\pm m}g$; then $\frac{f'}{f} = \frac{\pm m}{z - z_0} + \frac{g'}{g}$.)

:::theorem{name="Residue theorem" status=proved}
If $f$ is meromorphic on an open set containing a closed path $\gamma$ and its inside, with no poles on $\gamma$, then
$$\frac{1}{2\pi i}\oint_\gamma f(z)\,dz = \sum_{\text{poles } z_k \text{ inside } \gamma}\operatorname{Res}_{z_k}f.$$
:::

:::proof
Subtract from $f$ the principal part $\sum_{j \ge 1}c_{-j}(z - z_k)^{-j}$ at each pole inside. What remains is holomorphic inside $\gamma$, so its integral is $0$ by Cauchy’s theorem. The integral of each principal part is $2\pi i\,c_{-1}$ by the lemma (deforming $\gamma$ to a small circle round $z_k$).
:::

## The argument principle

Combine the residue theorem with the rule for logarithmic derivatives.

:::theorem{name="Argument principle" status=proved}
Let $f$ be meromorphic on and inside a closed path $\gamma$, with no zeros or poles on $\gamma$. Then
$$\frac{1}{2\pi i}\oint_\gamma\frac{f'(z)}{f(z)}\,dz = Z - P,$$
the number of zeros minus the number of poles inside $\gamma$, counted with multiplicity. The left side is also $\frac1{2\pi}$ times the total change of $\arg f(z)$ as $z$ goes once round $\gamma$: the number of times the curve $f(\gamma)$ winds round $0$.
:::

:::proof
The first statement is the residue theorem applied to $f'/f$. For the second, $\frac{f'}{f} = (\log f)'$ along the path, with any continuous choice of $\log f(z(t))$, so the integral equals the change of $\log f = \log|f| + i\arg f$ along $\gamma$. The real part returns to its starting value; the imaginary part changes by $2\pi$ times the winding number.
:::

::argument-principle

Chapter 22 uses this to count zeros of $\xi$ in a rectangle, and Chapter 25 uses the related fact that a zero of $\zeta$ at $1 + it$ would make $\zeta'/\zeta$ have a pole there.

## Jensen’s formula and products

**Jensen’s formula.** If $f$ is holomorphic on $|z| \le R$ with $f(0) \ne 0$, and $a_1, \ldots, a_n$ are its zeros in $|z| < R$, then
$$\log|f(0)| + \sum_{k=1}^n\log\frac{R}{|a_k|} = \frac{1}{2\pi}\int_0^{2\pi}\log|f(Re^{i\theta})|\,d\theta.$$
(For $f$ without zeros, this is the mean value property of the harmonic function $\log|f|$; each zero is then divided out by a factor that has modulus $1$ on $|z| = R$.) The consequence used in the course: if $|f| \le M$ on $|z| = R$, the number of zeros in $|z| \le r < R$ is at most $\frac{\log(M/|f(0)|)}{\log(R/r)}$, since each such zero contributes at least $\log\frac Rr$ to the sum. Applied to $\zeta$ on discs of fixed size at height $T$, where $|\zeta|$ grows polynomially in $T$, it shows that $\zeta$ has $O(\log T)$ zeros with imaginary part in $[T, T + 1]$.

**Entire functions and their zeros.** An entire function has **order** at most $\alpha$ if $|f(z)| \le Ce^{|z|^{\alpha + \varepsilon}}$ for every $\varepsilon > 0$. Jensen’s formula shows that such a function has $O(r^{\alpha + \varepsilon})$ zeros in $|z| \le r$, and **Hadamard’s factorisation theorem** (1893) says that a function of order at most $1$ is determined by its zeros $a_k$ up to an exponential factor:
$$f(z) = z^me^{A + Bz}\prod_k\left(1 - \frac{z}{a_k}\right)e^{z/a_k}.$$
The function $\xi$ of Chapter 21 has order $1$, and its product formula comes from this theorem.

:::key
- Holomorphic means complex differentiable; such functions are infinitely differentiable and equal their power series.
- Cauchy: integrals over closed paths vanish, so paths can be moved; the integral formula gives values and derivative bounds from boundary values.
- Uniform limits of holomorphic functions, and integrals of holomorphic families, are holomorphic: this is why Dirichlet series and the Gamma integral are holomorphic.
- Zeros are isolated, and the identity theorem makes analytic continuation unique.
- Residue theorem: $\oint f = 2\pi i\sum\operatorname{Res}$. For $f'/f$ it counts zeros minus poles (argument principle). Jensen’s formula bounds the number of zeros by the growth of $f$.
:::

:::exercises
1. Show that $\overline{z}$ and $|z|^2$ fail the Cauchy–Riemann equations, except at $z = 0$ for the second.
2. Compute $\oint_{|z|=2}\frac{e^z}{z(z - 1)}dz$ with the residue theorem.
3. Show that the residue of $\frac{\zeta'(s)}{\zeta(s)}\cdot\frac{x^s}{s}$ at $s = 1$ is $-x$, and at a simple zero $\rho$ of $\zeta$ it is $\frac{x^\rho}{\rho}$.
4. Use Cauchy’s estimates to show that an entire function with $|f(z)| \le C(1 + |z|)^k$ is a polynomial of degree at most $k$.
5. In the widget, place the circle so that it contains exactly one zero and the pole. What winding number do you expect, and what does the curve $f(\gamma)$ look like?
:::
