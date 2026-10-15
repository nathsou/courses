---
number: 21
title: The functional equation
summary: "Riemann’s symmetry: the completed zeta function ξ(s) satisfies ξ(s) = ξ(1 − s). The Gamma function, the theta function and Poisson summation, Riemann’s proof in full, and what the symmetry says about the zeros."
duration: About 1½ hours
prerequisites: [complex-zeta]
theorems: [The theta transformation formula, The functional equation of ζ, The trivial zeros, The nontrivial zeros lie in the critical strip]
techniques: [Poisson summation, Mellin transforms, symmetry]
---

The domain colouring of Chapter 20 does not look symmetric. To the right of the line $\sigma = 1$, $\zeta$ is tame and close to $1$; to the left of $\sigma = 0$ it oscillates wildly and grows. Yet Riemann discovered that the two halves are mirror images, once $\zeta$ is multiplied by the right factor. This chapter proves his functional equation and draws the consequences for the zeros. It is the deepest structural fact about $\zeta$, and the reason the Riemann Hypothesis singles out the line $\sigma = \frac12$.

:::theorem{name="The functional equation" who="Riemann" year=1859 status=proved}
Let
$$\xi(s) = \tfrac12 s(s-1)\,\pi^{-s/2}\,\Gamma\!\left(\tfrac s2\right)\zeta(s).$$
Then $\xi$ is holomorphic on the whole plane (an **entire** function), and
$$\xi(s) = \xi(1 - s).$$
Equivalently, $\zeta(s) = 2^s\pi^{s-1}\sin\left(\frac{\pi s}{2}\right)\Gamma(1 - s)\,\zeta(1 - s)$.
:::

The factor $\pi^{-s/2}\Gamma(s/2)$ is the “missing Euler factor at infinity”, and $\frac12 s(s-1)$ removes two poles. The ingredients are the Gamma function and a function of Jacobi, the theta function, whose own symmetry comes from Fourier analysis. Riemann gave two proofs; this is the second.:cite[riemann1859]

## Ingredient 1: the Gamma function

Euler’s Gamma function extends the factorial. Appendix D proves everything stated here.

:::definition
For $\operatorname{Re} s > 0$, $\displaystyle\Gamma(s) = \int_0^\infty e^{-x}x^{s-1}\,dx$.
:::

- $\Gamma(s + 1) = s\Gamma(s)$ (integrate by parts) and $\Gamma(1) = 1$, so $\Gamma(n) = (n-1)!$.
- Using $\Gamma(s) = \Gamma(s + 1)/s$ repeatedly, $\Gamma$ extends to the whole plane with simple poles at $0, -1, -2, \ldots$ and no other singularities. It is never $0$, so $1/\Gamma$ is entire, with simple zeros at $0, -1, -2, \ldots$
- $\Gamma(\frac12) = \sqrt\pi$, the Gaussian integral.
- Reflection: $\Gamma(s)\Gamma(1 - s) = \dfrac{\pi}{\sin\pi s}$. Duplication: $\Gamma(s)\Gamma(s + \frac12) = 2^{1-2s}\sqrt\pi\,\Gamma(2s)$.

The one property used directly below is a change of variables. For $\operatorname{Re} s > 0$ and $a > 0$, substituting $x = au$:
$$\int_0^\infty e^{-au}u^{s-1}\,du = a^{-s}\,\Gamma(s).$$
So $\Gamma$ converts an exponential into a power. Taking $a = \pi n^2$ and replacing $s$ by $s/2$:
$$\pi^{-s/2}\,\Gamma\!\left(\tfrac s2\right)n^{-s} = \int_0^\infty e^{-\pi n^2 x}\,x^{s/2 - 1}\,dx. \qquad (1)$$

## Ingredient 2: the theta function

:::definition
For $x > 0$, $\displaystyle\theta(x) = \sum_{n=-\infty}^{\infty}e^{-\pi n^2 x} = 1 + 2e^{-\pi x} + 2e^{-4\pi x} + \cdots$
:::

When $x$ is large, $\theta(x)$ is barely more than $1$. When $x$ is small, many terms contribute, and the sum is roughly $\int_{-\infty}^\infty e^{-\pi u^2 x}du = 1/\sqrt x$. The theorem says that this approximation is nearly exact, and makes the error precise.

:::theorem{name="Theta transformation" who="Jacobi; Poisson" status=proved}
For every $x > 0$, $\theta(1/x) = \sqrt{x}\;\theta(x)$.
:::

The proof is an instance of **Poisson summation**: for a sufficiently nice function $f$ on $\R$ with Fourier transform $\hat f(v) = \int_{-\infty}^\infty f(u)e^{-2\pi i uv}\,du$,
$$\sum_{n \in \Z}f(n) = \sum_{n \in \Z}\hat f(n).$$

::poisson-theta

::::zoom{levels="Idea, Proof"}
:::level[Idea]
Wrap $f$ around a circle of circumference $1$: $F(u) = \sum_n f(u + n)$ is periodic, so it has a Fourier series $\sum_k c_k e^{2\pi iku}$. Its coefficients turn out to be $c_k = \hat f(k)$. Evaluating at $u = 0$ gives Poisson summation. For the Gaussian $f(u) = e^{-\pi xu^2}$, $\hat f(v) = x^{-1/2}e^{-\pi v^2/x}$, another Gaussian, and Poisson summation is exactly the theta transformation.
:::
:::level[Proof]
**The Fourier transform of a Gaussian.** Let $g(u) = e^{-\pi u^2}$ and $G(v) = \hat g(v) = \int e^{-\pi u^2}e^{-2\pi iuv}du$. Differentiating under the integral sign (allowed since $u e^{-\pi u^2}$ is integrable) and integrating by parts,
$$G'(v) = \int(-2\pi iu)e^{-\pi u^2}e^{-2\pi iuv}du = i\int \big(e^{-\pi u^2}\big)'e^{-2\pi iuv}du = -i\int e^{-\pi u^2}(-2\pi iv)e^{-2\pi iuv}du = -2\pi v\,G(v).$$
So $(G(v)e^{\pi v^2})' = 0$, and $G(v) = G(0)e^{-\pi v^2} = e^{-\pi v^2}$, because $G(0) = \int e^{-\pi u^2}du = 1$ (Appendix D). For $f(u) = g(\sqrt{x}\,u)$, substituting $u' = \sqrt x\,u$ gives $\hat f(v) = x^{-1/2}G(v/\sqrt x) = x^{-1/2}e^{-\pi v^2/x}$.

**Poisson summation for $f$.** $F(u) = \sum_n f(u + n)$ converges uniformly on $[0, 1]$, together with its derivatives (the Gaussian decays faster than any power), so $F$ is a smooth function of period $1$. Its Fourier coefficients are
$$c_k = \int_0^1 F(u)e^{-2\pi iku}du = \sum_n\int_0^1 f(u + n)e^{-2\pi iku}du = \sum_n\int_n^{n+1}f(u)e^{-2\pi iku}du = \hat f(k),$$
using $e^{-2\pi ik(u - n)} = e^{-2\pi iku}$. A smooth periodic function equals the sum of its Fourier series, which converges absolutely (Appendix C). At $u = 0$: $\sum_n f(n) = F(0) = \sum_k c_k = \sum_k\hat f(k)$.

**Conclusion.** With $f(u) = e^{-\pi xu^2}$, the left side is $\theta(x)$ and the right side is $x^{-1/2}\sum_k e^{-\pi k^2/x} = x^{-1/2}\theta(1/x)$.
:::
::::

Riemann works with the tail $\omega(x) = \sum_{n \ge 1}e^{-\pi n^2 x} = \frac{\theta(x) - 1}{2}$. The transformation formula becomes
$$\omega\!\left(\frac1x\right) = -\frac12 + \frac{\sqrt x}{2} + \sqrt x\,\omega(x). \qquad (2)$$
For $x \ge 1$, $\omega(x) \le \sum_{n \ge 1}e^{-\pi n x} = \frac{e^{-\pi x}}{1 - e^{-\pi x}} \le 1.05\,e^{-\pi x}$: the tail decays exponentially.

## Riemann’s proof

:::proof[Proof of the functional equation]
**Step 1: a Mellin transform.** For $\sigma > 1$, sum (1) over $n \ge 1$. All terms are positive when $s$ is real, so exchanging sum and integral is allowed, and for complex $s$ the absolute values give the same bound. Writing $\Lambda(s) = \pi^{-s/2}\Gamma(s/2)\zeta(s)$,
$$\Lambda(s) = \int_0^\infty \omega(x)\,x^{s/2 - 1}\,dx \qquad (\sigma > 1).$$

**Step 2: fold at $x = 1$.** Split the integral at $1$ and in the piece over $(0, 1)$ substitute $x \to 1/x$, which turns it into $\int_1^\infty\omega(1/x)\,x^{-s/2 - 1}dx$. Insert (2):
$$\int_1^\infty\left(-\frac12 + \frac{\sqrt x}{2} + \sqrt x\,\omega(x)\right)x^{-s/2-1}dx = -\frac1s + \frac{1}{s - 1} + \int_1^\infty\omega(x)\,x^{(1-s)/2 - 1}dx,$$
using $\int_1^\infty x^{-s/2-1}dx = \frac2s$ and $\int_1^\infty x^{-s/2 - 1/2}dx = \frac{2}{s-1}$ for $\sigma > 1$. Therefore, for $\sigma > 1$,
$$\Lambda(s) = \frac{1}{s - 1} - \frac1s + \int_1^\infty\omega(x)\left(x^{s/2 - 1} + x^{(1 - s)/2 - 1}\right)dx. \qquad (3)$$

**Step 3: read off everything.** Because $\omega(x)$ decays like $e^{-\pi x}$, the integral in (3) converges absolutely for every complex $s$, uniformly on compact sets, so it is an entire function of $s$. Hence (3) continues $\Lambda$ to the whole plane, with simple poles at $s = 1$ and $s = 0$ only. The right side of (3) is unchanged when $s$ is replaced by $1 - s$: the two powers swap, and so do $\frac1{s-1}$ and $-\frac1s$. So $\Lambda(s) = \Lambda(1 - s)$. Multiplying by $\frac12 s(s-1)$, which is also symmetric, gives
$$\xi(s) = \tfrac12 s(s - 1)\Lambda(s) = \frac12 + \frac{s(s-1)}{2}\int_1^\infty\omega(x)\left(x^{s/2 - 1} + x^{(1 - s)/2 - 1}\right)dx,$$
which is entire and satisfies $\xi(s) = \xi(1 - s)$.

**Step 4: the asymmetric form.** From $\Lambda(s) = \Lambda(1 - s)$, $\zeta(s) = \pi^{s - 1/2}\frac{\Gamma((1 - s)/2)}{\Gamma(s/2)}\zeta(1 - s)$. By reflection, $\frac{1}{\Gamma(s/2)} = \frac{\Gamma(1 - s/2)\sin(\pi s/2)}{\pi}$, and by duplication with $z = \frac{1-s}{2}$, $\Gamma(\frac{1-s}{2})\Gamma(1 - \frac s2) = 2^s\sqrt\pi\,\Gamma(1 - s)$. Substituting gives $\zeta(s) = 2^s\pi^{s - 1}\sin(\frac{\pi s}{2})\Gamma(1 - s)\zeta(1 - s)$.
:::

Formula (3) is a second, independent proof that $\zeta$ continues to the whole plane, since $\zeta(s) = \pi^{s/2}\Lambda(s)/\Gamma(s/2)$ and $1/\Gamma$ is entire.

## What the symmetry says

### The trivial zeros, explained

In $\zeta(s) = \pi^{s/2}\,\Lambda(s)\cdot\frac{1}{\Gamma(s/2)}$, the factor $\frac{1}{\Gamma(s/2)}$ vanishes at $s = 0, -2, -4, \ldots$ For $s = -2k$ with $k \ge 1$, $\Lambda(-2k) = \Lambda(1 + 2k)$ is finite and nonzero (the Euler product applies at $1 + 2k$), so $\zeta(-2k) = 0$, a simple zero. At $s = 0$, the zero of $1/\Gamma(s/2) \approx s/2$ cancels the pole $-1/s$ of $\Lambda$, and $\zeta(0) = -\frac12$. This matches Chapter 20, which found the same values from Euler–Maclaurin.

### Even zeta values

Setting $s = 2k$ in the asymmetric form (in the version with $s$ and $1 - s$ swapped: $\zeta(1 - s) = 2(2\pi)^{-s}\cos(\frac{\pi s}2)\Gamma(s)\zeta(s)$, exercise 2) and using $\zeta(1 - 2k) = -B_{2k}/(2k)$ from Chapter 20:
$$\zeta(2k) = \frac{(-1)^{k+1}B_{2k}\,(2\pi)^{2k}}{2\,(2k)!}, \qquad \zeta(2) = \frac{\pi^2}6,\quad\zeta(4) = \frac{\pi^4}{90},\quad\zeta(6) = \frac{\pi^6}{945}.$$
Euler’s values at the positive even integers are the mirror images of the values at the negative odd integers.

```numeric
id: functional-equation/zeta-8
prompt: Use the formula with $B_8 = -\frac1{30}$ to compute $\zeta(8)$. Give it to eight decimal places.
answer: 1.00407736
tolerance: 0.00000001
hints:
  - '$\zeta(8) = \frac{(-1)^{5}B_8(2\pi)^8}{2\cdot 8!} = \frac{(2\pi)^8}{30\cdot 2\cdot 40320} = \frac{\pi^8}{9450}$.'
```

### The critical strip

:::theorem{status=proved}
Apart from the trivial zeros, every zero $\rho$ of $\zeta$ satisfies $0 \le \operatorname{Re}\rho \le 1$. These **nontrivial zeros** are exactly the zeros of $\xi$, and they are symmetric under $\rho \mapsto \bar\rho$ and $\rho \mapsto 1 - \rho$.
:::

:::proof
For $\sigma > 1$, $\zeta(s) \ne 0$ (Euler product). For $\sigma < 0$, write $\zeta(s) = 2^s\pi^{s - 1}\sin(\frac{\pi s}{2})\Gamma(1 - s)\zeta(1 - s)$. Here $\operatorname{Re}(1 - s) > 1$, so $\zeta(1 - s) \ne 0$, and $\Gamma$ never vanishes; the only zeros come from $\sin(\pi s/2)$, at $s = -2, -4, \ldots$ In $\xi(s) = \frac12 s(s - 1)\pi^{-s/2}\Gamma(s/2)\zeta(s)$, the poles of $\Gamma(s/2)$ at $0, -2, -4, \ldots$ cancel the trivial zeros and the factor $s$; the factor $s - 1$ cancels the pole of $\zeta$; and $\pi^{-s/2}$ and $\Gamma$ never vanish. So the zeros of $\xi$ are the remaining zeros of $\zeta$. Finally $\xi(\bar s) = \overline{\xi(s)}$ (real coefficients) and $\xi(s) = \xi(1 - s)$.
:::

The region $0 \le \sigma \le 1$ is the **critical strip**, and its centre line $\sigma = \frac12$, the axis of symmetry, is the **critical line**. A zero off the line would come with three partners, $\bar\rho$, $1 - \rho$ and $1 - \bar\rho$, placed symmetrically around the point $\frac12$; a zero on the line has only one, $\bar\rho = 1 - \rho$. Chapter 25 will show that there are no zeros on the edges $\sigma = 0$ and $\sigma = 1$.

::domain-colouring{fns="xi,zeta" view="strip"}

Switch between $\xi$ and $\zeta$. The function $\xi$ has the same nontrivial zeros as $\zeta$ but none of its distractions: no pole, no trivial zeros, and a picture that is symmetric about the line $\sigma = \frac12$ (with hues reflected). On that line the colour of $\xi$ is only ever red or cyan: $\xi$ is real there.

:::proposition{status=proved}
$\xi(\frac12 + it)$ is real for every real $t$.
:::

:::proof
$\overline{\xi(\frac12 + it)} = \xi(\frac12 - it) = \xi(1 - (\frac12 + it)) = \xi(\frac12 + it)$, by the two symmetries.
:::

So zeros on the critical line are places where a real function changes sign, and they can be found the way one finds roots of any real function: by watching the sign. That is the method of Chapter 22, and the reason we can verify that billions of zeros lie exactly on the line, not merely close to it.

### The product over the zeros

A polynomial is determined, up to a constant, by its roots. Entire functions of moderate growth have the same property. Since $\xi$ grows at most like $e^{C|s|\log|s|}$, a theorem of Hadamard from 1893 gives a product formula.:cite[hadamard1893]

:::theorem{name="Hadamard product" who="Hadamard" year=1893 status=stated}
$$\xi(s) = \xi(0)\prod_\rho\left(1 - \frac s\rho\right),$$
the product over the nontrivial zeros $\rho$ of $\zeta$ (with multiplicity), taken over $|\operatorname{Im}\rho| < T$ as $T \to \infty$. Here $\xi(0) = \frac12$.
:::

Taking the logarithmic derivative of this product, and of the definition of $\xi$, links $\zeta'/\zeta$ to a sum over zeros. That link is the explicit formula of Chapter 23, the bridge from zeros back to primes.

:::key
- $\Gamma(s) = \int_0^\infty e^{-x}x^{s-1}dx$ turns exponentials into powers: $\int_0^\infty e^{-au}u^{s-1}du = a^{-s}\Gamma(s)$.
- Poisson summation $\sum f(n) = \sum\hat f(n)$, applied to a Gaussian, gives $\theta(1/x) = \sqrt x\,\theta(x)$.
- Riemann’s proof: $\pi^{-s/2}\Gamma(s/2)\zeta(s) = \int_0^\infty\omega(x)x^{s/2 - 1}dx$; folding at $x = 1$ with the theta formula gives a formula that is visibly symmetric under $s \leftrightarrow 1 - s$ and valid everywhere.
- $\xi(s) = \frac12 s(s-1)\pi^{-s/2}\Gamma(s/2)\zeta(s)$ is entire and $\xi(s) = \xi(1 - s)$. Trivial zeros come from the poles of $\Gamma(s/2)$; the nontrivial zeros lie in $0 \le \sigma \le 1$, symmetric about $\sigma = \frac12$ and the real axis.
- $\xi$ is real on the critical line, so zeros there are sign changes.
:::

:::exercises
1. Check the theta formula numerically at $x = 1/2$: compute $\theta(2)$ and $\theta(1/2)/\sqrt2$ by hand to four decimal places. How many terms does each need?
2. Derive $\zeta(1 - s) = 2(2\pi)^{-s}\cos\left(\frac{\pi s}{2}\right)\Gamma(s)\zeta(s)$ from the form in the theorem by replacing $s$ with $1 - s$ and using the reflection formula.
3. Use the functional equation to show that $\zeta'(0)/\zeta(0) = \log 2\pi$, so $\zeta'(0) = -\frac12\log 2\pi$. (Take logarithmic derivatives of the asymmetric form at $s = 0$, and use $\zeta(1 + \varepsilon) \approx 1/\varepsilon$ together with $\Gamma(1 - s)\sin(\pi s/2) \approx \frac{\pi s}{2}$.)
4. Show that $|\zeta(-\sigma + it)| \asymp |t|^{\frac12 + \sigma}|\zeta(1 + \sigma - it)|$ as $|t| \to \infty$ for fixed $\sigma$, using Stirling’s formula $|\Gamma(x + iy)| \sim \sqrt{2\pi}|y|^{x - 1/2}e^{-\pi|y|/2}$ (Appendix D). Deduce that $\zeta$ grows polynomially in $|t|$ on every vertical line.
5. Show that the zeros of $\xi$ in the critical strip are the same as those of $\zeta$, including multiplicities.
6. Poisson summation also holds for $f(u) = \frac{1}{1 + u^2}$, whose Fourier transform is $\hat f(v) = \pi e^{-2\pi|v|}$. Use it to find a closed form for $\sum_{n \in \Z}\frac{1}{1 + n^2}$, and check it numerically.
:::
