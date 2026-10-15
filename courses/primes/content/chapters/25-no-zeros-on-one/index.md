---
number: 25
title: No zeros on the line Re s = 1
summary: "The inequality 3 + 4 cos θ + cos 2θ ≥ 0, Mertens’ product inequality |ζ(σ)³ζ(σ + it)⁴ζ(σ + 2it)| ≥ 1, and the proof that ζ(1 + it) ≠ 0. Then the consequence Newman’s proof needs: Σ log p/p^s − 1/(s − 1) is holomorphic on Re s ≥ 1."
duration: About 1 hour
prerequisites: [pnt-plan]
theorems: [3 + 4 cos θ + cos 2θ ≥ 0, Mertens’ inequality, ζ(1 + it) ≠ 0, Φ(s) − 1/(s − 1) is holomorphic on Re s ≥ 1]
techniques: [positivity, the logarithm of the Euler product, orders of zeros and poles]
---

Chapter 24 reduced the prime number theorem to one fact about $\zeta$: it has no zeros on the line $\operatorname{Re}s = 1$. To the right of the line the Euler product forbids zeros, but on the line itself the product no longer converges, so a new idea is needed. Hadamard and de la Vallée Poussin both found one in 1896. Two years later Franz Mertens distilled it into a single inequality between cosines, which is what we use.:cite[mertens1898]

## The idea

On the line $\sigma > 1$, taking logarithms in the Euler product (Chapter 19),
$$\log|\zeta(\sigma + it)| = \operatorname{Re}\log\zeta(\sigma + it) = \sum_p\sum_{k \ge 1}\frac{\cos(kt\log p)}{k\,p^{k\sigma}}.$$
The dominant terms are $\sum_p\frac{\cos(t\log p)}{p^\sigma}$. Think of each prime as casting a vote $\cos(t\log p)$, weighted by $1/p^\sigma$. For $\zeta(1 + it)$ to be $0$, the sum would have to tend to $-\infty$ as $\sigma \to 1^+$: the primes would have to vote $-1$ (angle $t\log p$ close to $\pi$ modulo $2\pi$) in a strong majority. But then the doubled angles $2t\log p$ would be close to $0$, the votes at $2t$ would be close to $+1$, and $\log|\zeta(\sigma + 2it)|$ would tend to $+\infty$: $\zeta$ would have a pole at $1 + 2it$. It has only one pole, at $1$.

::prime-phases

## The inequality

Here is the trade-off made exact.

:::lemma{status=proved}
For every real $\theta$, $3 + 4\cos\theta + \cos 2\theta = 2(1 + \cos\theta)^2 \ge 0$.
:::

:::proof
$\cos 2\theta = 2\cos^2\theta - 1$, so $3 + 4\cos\theta + 2\cos^2\theta - 1 = 2(1 + 2\cos\theta + \cos^2\theta)$.
:::

:::theorem{name="Mertens’ inequality" who="Mertens" year=1898 status=proved}
For $\sigma > 1$ and real $t$,
$$\left|\zeta(\sigma)^3\,\zeta(\sigma + it)^4\,\zeta(\sigma + 2it)\right| \ge 1.$$
:::

:::proof
Take logarithms of the absolute value and use the series above for each factor:
$$3\log\zeta(\sigma) + 4\log|\zeta(\sigma + it)| + \log|\zeta(\sigma + 2it)| = \sum_p\sum_{k \ge 1}\frac{3 + 4\cos(kt\log p) + \cos(2kt\log p)}{k\,p^{k\sigma}}.$$
By the lemma with $\theta = kt\log p$, every term is $\ge 0$. So the left side is $\ge 0$, and exponentiating gives the inequality.
:::

The numbers $3, 4, 1$ are not special: any trigonometric polynomial $a_0 + a_1\cos\theta + a_2\cos 2\theta + \cdots$ that is nonnegative, with $a_1 > a_0 > 0$, would do. The one above is the simplest.

## The theorem

:::theorem{name="ζ has no zeros on Re s = 1" who="Hadamard; de la Vallée Poussin" year=1896 status=proved}
$\zeta(1 + it) \ne 0$ for every real $t \ne 0$.
:::

:::proof
Suppose $\zeta(1 + it_0) = 0$ for some $t_0 \ne 0$. We compare the three factors as $\sigma \to 1^+$.

- $\zeta(\sigma)$: from Chapter 19, $\zeta(\sigma) < \frac{\sigma}{\sigma - 1} \le \frac{2}{\sigma - 1}$ for $1 < \sigma \le 2$. So $\zeta(\sigma)^3 \le \frac{8}{(\sigma - 1)^3}$.
- $\zeta(\sigma + it_0)$: $\zeta$ is holomorphic near $1 + it_0$ (its only pole is at $1$) and vanishes there, so $|\zeta(\sigma + it_0)| \le C(\sigma - 1)$ for $\sigma$ close to $1$, by the Taylor expansion. So $|\zeta(\sigma + it_0)|^4 \le C^4(\sigma - 1)^4$.
- $\zeta(\sigma + 2it_0)$: since $2t_0 \ne 0$, $\zeta$ is holomorphic near $1 + 2it_0$, hence bounded there: $|\zeta(\sigma + 2it_0)| \le C'$.

Multiplying, $\left|\zeta(\sigma)^3\zeta(\sigma + it_0)^4\zeta(\sigma + 2it_0)\right| \le 8C^4C'(\sigma - 1)$, which tends to $0$ as $\sigma \to 1^+$. This contradicts Mertens' inequality.
:::

The exponent count is the whole proof: the pole of order $1$ at $s = 1$ appears with weight $3$, the putative zero (of order at least $1$) with weight $4$, and $4 > 3$. A pole at $1 + 2it_0$ would have spoiled it, but there is none.

::mertens-inequality

The top panel of the widget shows that $|\zeta(1 + it)|$ does get small: below $t = 200$ its minimum is about $0.326$, near $t \approx 14.1$, just below the height of the first zero on the critical line. The theorem says it never reaches $0$. Quantitatively, the same argument with more care gives $|\zeta(1 + it)| \gg 1/\log^7|t|$ for large $|t|$, and with much more care, a zero-free region extending a little to the left of the line (Chapter 27).

## What Newman’s proof needs

Recall $\Phi(s) = \sum_p\frac{\log p}{p^s}$, which converges absolutely for $\operatorname{Re}s > 1$.

:::corollary{status=proved}
$\Phi(s) - \frac{1}{s - 1}$ extends to a holomorphic function on an open set containing the closed half-plane $\operatorname{Re}s \ge 1$.
:::

:::proof
For $\operatorname{Re}s > 1$, separate the prime powers with $k \ge 2$ from the series for $-\zeta'/\zeta$ (Chapter 19):
$$-\frac{\zeta'(s)}{\zeta(s)} = \sum_p\sum_{k \ge 1}\frac{\log p}{p^{ks}} = \Phi(s) + \sum_p\frac{\log p}{p^s(p^s - 1)}.$$
The last sum converges absolutely and locally uniformly for $\operatorname{Re}s > \frac12$, since its terms are $O(\log p/p^{2\sigma})$; so it is holomorphic there.

Now look at $-\frac{\zeta'}{\zeta}(s) - \frac{1}{s-1}$. At $s = 1$, $\zeta$ has a simple pole, so $\frac{\zeta'}{\zeta}$ has a simple pole with residue $-1$ (Appendix A), and subtracting $\frac{1}{s - 1}$ removes it. At every other point of $\operatorname{Re}s \ge 1$, $\zeta$ is holomorphic and nonzero (by the theorem for $\operatorname{Re}s = 1$, by the Euler product for $\operatorname{Re}s > 1$), so $\frac{\zeta'}{\zeta}$ is holomorphic there. Each such point therefore has a small disc on which $-\frac{\zeta'}{\zeta} - \frac{1}{s-1}$ is holomorphic (zeros of $\zeta$ are isolated, and none is on the closed half-plane). The union of these discs is the required open set. Subtracting the holomorphic sum above shows the same for $\Phi(s) - \frac{1}{s-1}$.
:::

That is step 3 of the plan. Chapter 26 turns it into the prime number theorem.

```quiz
q: In the proof that $\zeta(1 + it_0) \ne 0$, which property of $\zeta$ at $1 + 2it_0$ is used?
options:
  - text: That $\zeta$ is holomorphic there, hence bounded nearby.
    correct: true
    why: If $\zeta$ had a pole at $1 + 2it_0$, the factor $\zeta(\sigma + 2it_0)$ could grow like $(\sigma - 1)^{-1}$ and cancel the gain from the zero.
  - text: That $\zeta(1 + 2it_0) \ne 0$.
    why: A zero there would only make the product smaller, which helps the contradiction. Nothing about its value is needed beyond boundedness.
  - text: That $|\zeta(1 + 2it_0)| \ge 1$.
    why: Mertens' inequality is applied at $\sigma > 1$ to the product of all three factors; no individual factor needs a lower bound.
```

:::key
- $\log|\zeta(\sigma + it)| = \sum_{p,k}\frac{\cos(kt\log p)}{kp^{k\sigma}}$: the primes vote with phases $p^{-it}$.
- $3 + 4\cos\theta + \cos 2\theta = 2(1 + \cos\theta)^2 \ge 0$ gives $|\zeta(\sigma)^3\zeta(\sigma + it)^4\zeta(\sigma + 2it)| \ge 1$ for $\sigma > 1$.
- A zero at $1 + it_0$ would make the product $O(\sigma - 1)$: the zero counts four times, the pole at $1$ only three. So $\zeta(1 + it) \ne 0$.
- Hence $-\frac{\zeta'}{\zeta}(s) - \frac1{s-1}$, and so $\Phi(s) - \frac1{s-1}$ with $\Phi(s) = \sum_p\frac{\log p}{p^s}$, are holomorphic on a neighbourhood of $\operatorname{Re}s \ge 1$.
:::

:::exercises
1. Where does the proof use $t_0 \ne 0$? What goes wrong at $t_0 = 0$?
2. Show that $5 + 8\cos\theta + 4\cos 2\theta + \cos 3\theta = (1 + \cos\theta)(1 + 2\cos\theta)^2 \ge 0$, and use it to give another proof that $\zeta(1 + it) \ne 0$. Which exponent now beats the pole's?
3. Let $\chi$ be a real Dirichlet character (Chapter 33) and $L(s, \chi) = \sum\chi(n)n^{-s}$. Adapt the argument to show $L(1 + it, \chi) \ne 0$ for $t \ne 0$. Why does it say nothing about $t = 0$?
4. Show that $\zeta(\sigma + it)$ has no zeros for $\sigma > 1$ directly from $\log|\zeta(s)| \ge -\sum_p\sum_k\frac{1}{kp^{k\sigma}} = -\log\zeta(\sigma)$, that is $|\zeta(\sigma + it)| \ge 1/\zeta(\sigma)$.
:::
