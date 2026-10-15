---
number: 26
title: The proof in full
summary: "Newman’s analytic theorem with Zagier’s proof, the Laplace transform of θ(eᵗ)e⁻ᵗ − 1, the convergence of ∫(θ(x) − x)/x² dx, and the Tauberian step to θ(x) ~ x. With every step proved, the prime number theorem follows."
duration: About 1½ hours
prerequisites: [no-zeros-on-one]
theorems: [Newman’s analytic theorem, ∫₁^∞ (θ(x) − x)/x² dx converges, The prime number theorem]
techniques: [Laplace transforms, Cauchy’s integral formula with a weight, Tauberian arguments]
---

This chapter completes the proof of the prime number theorem. It follows Don Zagier’s exposition of Donald Newman’s 1980 argument,:cite[newman1980,zagier1997] which is short enough that every line can be checked. We use three facts already proved:

- **(I)** $\theta(x) = \sum_{p \le x}\log p = O(x)$ (Chebyshev, Chapter 16).
- **(II)** $\Phi(s) = \sum_p\frac{\log p}{p^s}$ converges for $\operatorname{Re}s > 1$, and $\Phi(s) - \frac{1}{s-1}$ extends holomorphically to a neighbourhood of $\operatorname{Re}s \ge 1$ (Chapter 25).
- **(III)** Cauchy’s integral formula (Appendix A).

## Step 1: Φ as a Laplace transform

:::lemma{status=proved}
For $\operatorname{Re}s > 1$, $\displaystyle\Phi(s) = s\int_1^\infty\frac{\theta(x)}{x^{s+1}}\,dx = s\int_0^\infty e^{-st}\,\theta(e^t)\,dt$.
:::

:::proof
Abel summation (Appendix B) with $a_p = \log p$ and $f(x) = x^{-s}$: $\sum_{p \le X}\frac{\log p}{p^s} = \frac{\theta(X)}{X^s} + s\int_1^X\frac{\theta(x)}{x^{s+1}}dx$. Since $\theta(X) = O(X)$ and $\operatorname{Re}s > 1$, the boundary term tends to $0$ as $X \to \infty$. The second form is the substitution $x = e^t$.
:::

## Step 2: Newman’s analytic theorem

:::theorem{name="Newman’s analytic theorem" who="Newman" year=1980 status=proved}
Let $f : [0, \infty) \to \R$ be bounded and locally integrable, and suppose its Laplace transform
$$g(z) = \int_0^\infty f(t)\,e^{-zt}\,dt \qquad (\operatorname{Re}z > 0)$$
extends to a holomorphic function on an open set containing $\operatorname{Re}z \ge 0$. Then $\int_0^\infty f(t)\,dt$ exists (as $\lim_{T \to \infty}\int_0^T$) and equals $g(0)$.
:::

The difficulty is that $g(0) = \int_0^\infty f(t)\,dt$ is exactly what we want, but the integral defining $g$ is only known to converge for $\operatorname{Re}z > 0$. The theorem says that analytic continuation to the boundary line forces convergence on it.

::::zoom{levels="Idea, Proof"}
:::level[Idea]
Compare $g$ with the truncations $g_T(z) = \int_0^T f(t)e^{-zt}dt$, which are entire. Write $g(0) - g_T(0)$ by Cauchy’s formula on a contour that bulges slightly to the left of the imaginary axis (where $g$ is holomorphic by hypothesis). To the right, $g - g_T$ is a tail integral, small because $f$ is bounded. To the left, the factor $e^{zT}$ is tiny for large $T$. A clever extra factor $1 + z^2/R^2$ kills the trouble at the two points where the contour crosses the imaginary axis.
:::
:::level[Proof]
Let $B = \sup|f|$. For $T > 0$ let $g_T(z) = \int_0^Tf(t)e^{-zt}dt$; it is entire (Appendix A). We show $\lim_{T \to \infty}g_T(0) = g(0)$.

Fix $R > 0$. Since $g$ is holomorphic on a neighbourhood of the compact segment $\{iy : |y| \le R\}$, there is $\delta = \delta(R) > 0$ such that $g$ is holomorphic on and inside the contour $C$: the boundary of $\{z : |z| \le R,\ \operatorname{Re}z \ge -\delta\}$. Let $C_+$ and $C_-$ be the parts of $C$ in $\operatorname{Re}z > 0$ and $\operatorname{Re}z < 0$. By Cauchy’s integral formula applied to the holomorphic function $(g(z) - g_T(z))e^{zT}\left(1 + \frac{z^2}{R^2}\right)$, which equals $g(0) - g_T(0)$ at $z = 0$,
$$g(0) - g_T(0) = \frac{1}{2\pi i}\oint_C\big(g(z) - g_T(z)\big)\,e^{zT}\left(1 + \frac{z^2}{R^2}\right)\frac{dz}{z}.$$

**On $C_+$.** Here $|z| = R$ and $x = \operatorname{Re}z > 0$, and
$$|g(z) - g_T(z)| = \left|\int_T^\infty f(t)e^{-zt}dt\right| \le B\int_T^\infty e^{-xt}dt = \frac{Be^{-xT}}{x}.$$
For $|z| = R$, $1 + \frac{z^2}{R^2} = \frac{z\bar z + z^2}{R^2} = \frac{z\cdot 2x}{R^2}$, so $\left|e^{zT}\left(1 + \frac{z^2}{R^2}\right)\frac1z\right| = e^{xT}\frac{2x}{R^2}$. The integrand is therefore at most $\frac{2B}{R^2}$, and the integral over $C_+$ (length $\pi R$, divided by $2\pi$) is at most $\frac{B}{R}$.

**On $C_-$, the $g_T$ part.** The function $g_T(z)e^{zT}(1 + z^2/R^2)/z$ is holomorphic except at $0$, so its integral over $C_-$ equals its integral over the left semicircle $C_-' = \{|z| = R, \operatorname{Re}z < 0\}$ (the region between them contains no singularity). There, with $x = \operatorname{Re}z < 0$,
$$|g_T(z)| = \left|\int_0^Tf(t)e^{-zt}dt\right| \le B\int_{-\infty}^Te^{-xt}dt = \frac{Be^{-xT}}{|x|},$$
and the same computation as on $C_+$ bounds this part by $\frac{B}{R}$.

**On $C_-$, the $g$ part.** The function $g(z)(1 + z^2/R^2)/z$ is continuous on $C_-$, hence bounded there, and does not depend on $T$. The factor $e^{zT}$ tends to $0$ as $T \to \infty$ at every point of $C_-$ with $\operatorname{Re}z < 0$, which is all of $C_-$ except its two endpoints, and $|e^{zT}| \le 1$ throughout. By dominated convergence this part tends to $0$.

So $\limsup_{T \to \infty}|g(0) - g_T(0)| \le \frac{2B}{R}$. Since $R$ was arbitrary, $g_T(0) \to g(0)$.
:::
::::

::newman-contour

## Step 3: the integral converges

:::theorem{status=proved}
$\displaystyle\int_1^\infty\frac{\theta(x) - x}{x^2}\,dx$ converges.
:::

:::proof
Let $f(t) = \theta(e^t)e^{-t} - 1$. By (I), $f$ is bounded, and it is locally integrable (piecewise continuous). For $\operatorname{Re}z > 0$, by Step 1 with $s = z + 1$,
$$g(z) = \int_0^\infty\big(\theta(e^t)e^{-t} - 1\big)e^{-zt}dt = \int_0^\infty\theta(e^t)e^{-(z+1)t}dt - \frac1z = \frac{\Phi(z + 1)}{z + 1} - \frac1z.$$
Rewrite this as
$$g(z) = \frac{1}{z+1}\left(\Phi(z + 1) - \frac1z\right) + \frac{1}{z(z+1)} - \frac1z = \frac{1}{z+1}\left(\Phi(z + 1) - \frac1z - 1\right).$$
By (II), $\Phi(z + 1) - \frac1z$ is holomorphic on a neighbourhood of $\operatorname{Re}z \ge 0$, and so is $\frac{1}{z+1}$. So $g$ extends holomorphically there, and Newman’s theorem says that $\int_0^\infty f(t)\,dt$ converges. Substituting $x = e^t$, that integral is $\int_1^\infty\left(\frac{\theta(x)}{x} - 1\right)\frac{dx}{x} = \int_1^\infty\frac{\theta(x) - x}{x^2}dx$.
:::

The value is $g(0)$. Using $\Phi(s) = -\frac{\zeta'}{\zeta}(s) - \sum_p\frac{\log p}{p^s(p^s - 1)}$ and $-\frac{\zeta'}{\zeta}(1 + z) = \frac1z - \gamma + O(z)$ (from $\zeta(1 + z) = \frac1z + \gamma + O(z)$, Chapter 19), one finds
$$\int_1^\infty\frac{\theta(x) - x}{x^2}\,dx = -1 - \gamma - \sum_p\frac{\log p}{p(p - 1)} = -2.33258\ldots$$

::running-integral

## Step 4: the Tauberian step

:::theorem{name="The prime number theorem" status=proved}
$\theta(x) \sim x$. Consequently $\psi(x) \sim x$ and $\pi(x) \sim \dfrac{x}{\log x}$.
:::

:::proof
Suppose that for some $\lambda > 1$ there are arbitrarily large $x$ with $\theta(x) \ge \lambda x$. For such $x$, since $\theta$ is increasing, $\theta(t) \ge \theta(x) \ge \lambda x$ for $t \in [x, \lambda x]$, so
$$\int_x^{\lambda x}\frac{\theta(t) - t}{t^2}\,dt \ge \int_x^{\lambda x}\frac{\lambda x - t}{t^2}\,dt = \int_1^\lambda\frac{\lambda - u}{u^2}\,du = \lambda - 1 - \log\lambda > 0,$$
substituting $t = xu$. The right side is a fixed positive number, and it is attained for arbitrarily large $x$. But a convergent integral has tails $\int_x^{\lambda x}$ that tend to $0$ (Cauchy’s criterion). Contradiction.

Similarly, if $\theta(x) \le \lambda x$ for some $\lambda < 1$ and arbitrarily large $x$, then $\theta(t) \le \lambda x$ on $[\lambda x, x]$ and
$$\int_{\lambda x}^x\frac{\theta(t) - t}{t^2}\,dt \le \int_\lambda^1\frac{\lambda - u}{u^2}\,du = 1 - \lambda + \log\lambda < 0,$$
again a contradiction. So for every $\varepsilon > 0$, $(1 - \varepsilon)x < \theta(x) < (1 + \varepsilon)x$ for all large $x$. The consequences are the equivalences of Chapter 24.
:::

That is the whole proof. Looking back, the ingredients were: Chebyshev’s elementary bound (to make $f$ bounded), the analytic continuation of $\zeta$ to a neighbourhood of $\operatorname{Re}s \ge 1$ with its pole at $1$, the absence of zeros on $\operatorname{Re}s = 1$, Cauchy’s integral formula, and the monotonicity of $\theta$.

```code
id: pnt-proof/integral
title: The integral, exactly
prompt: |
  Write `newmanIntegral(X)` for an integer $X \ge 2$, returning $\int_1^X\frac{\theta(x) - x}{x^2}dx$. On each interval $[n, n + 1)$, $\theta$ is constant, equal to $\theta(n)$, so the integral over it is exactly $\theta(n)\left(\frac1n - \frac1{n+1}\right) - \log\frac{n+1}{n}$. Use a sieve (`sieve(X)` from the library returns an array with `1` at the primes).
starter: |
  import { sieve } from 'primes';

  export function newmanIntegral(X: number): number {
    return 0;
  }
tests: |
  import { test, expect } from 'test';
  import { newmanIntegral } from 'solution';

  test('up to 2: θ = 0 on [1, 2)', () => {
    expect(newmanIntegral(2)).toBeCloseTo(-Math.log(2), 12);
  });
  test('known values', () => {
    expect(newmanIntegral(100)).toBeCloseTo(-2.072983215, 7);
    expect(newmanIntegral(10000)).toBeCloseTo(-2.309075906, 6);
  });
  test('a million: within 0.003 of the limit −2.33258', () => {
    expect(Math.abs(newmanIntegral(1000000) + 2.332582176)).toBeLessThan(0.003);
  });
solution: |
  import { sieve } from 'primes';

  export function newmanIntegral(X: number): number {
    const flags = sieve(X);
    let theta = 0;
    let total = 0;
    for (let n = 1; n < X; n++) {
      if (flags[n]) theta += Math.log(n);
      total += theta * (1 / n - 1 / (n + 1)) - Math.log1p(1 / n);
    }
    return total;
  }
hints:
  - Keep a running total of $\theta(n)$, adding $\log n$ whenever $n$ is prime, before using it for the interval $[n, n + 1)$.
```

:::key
- Newman’s analytic theorem: a bounded $f$ whose Laplace transform continues holomorphically across $\operatorname{Re}z = 0$ has a convergent integral, equal to the transform at $0$. Proof: Cauchy on a contour bulging left, with the weight $1 + z^2/R^2$.
- $\Phi(s) = s\int_0^\infty e^{-st}\theta(e^t)dt$, so $f(t) = \theta(e^t)e^{-t} - 1$ has transform $\frac{\Phi(z+1)}{z+1} - \frac1z$, holomorphic on $\operatorname{Re}z \ge 0$ because $\zeta(1 + it) \ne 0$.
- Hence $\int_1^\infty\frac{\theta(x) - x}{x^2}dx$ converges, and because $\theta$ is increasing, $\theta(x) \sim x$: the prime number theorem.
:::

:::exercises
1. Where exactly does the proof use that $\zeta(1 + it) \ne 0$? Where does it use that the pole of $\zeta$ at $1$ is simple, with residue $1$?
2. Verify the value $-1 - \gamma - \sum_p\frac{\log p}{p(p-1)}$ of the integral by expanding $g(z)$ near $z = 0$.
3. Newman’s theorem needs $f$ to be bounded. Show that $f(t) = e^t\sin(e^t)$ has a Laplace transform that extends to an entire function (substitute $u = e^t$, then integrate by parts repeatedly), although $\int_0^\infty f(t)\,dt$ diverges.
4. Let $M(x) = \sum_{n \le x}\mu(n)$. Apply Newman’s theorem to $f(t) = M(e^t)e^{-t}$, whose Laplace transform is $\frac{1}{(z + 1)\zeta(z + 1)}$, to show that $\int_1^\infty\frac{M(x)}{x^2}dx$ converges to $0$. Show also that $\int_1^X\frac{M(x)}{x^2}dx = \sum_{n \le X}\frac{\mu(n)}{n} - \frac{M(X)}{X}$.
:::
