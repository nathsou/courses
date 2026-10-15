---
number: 24
title: The plan
summary: "What the prime number theorem says, its equivalent forms (θ(x) ~ x, ψ(x) ~ x, p_n ~ n log n), why everything hinges on ζ having no zeros on the line Re s = 1, and the whole proof in five steps, before Chapters 25 and 26 carry them out."
duration: About 1 hour
prerequisites: [explicit-formula, chebyshev]
theorems: [The prime number theorem (statement), π(x) ~ x/log x ⇔ θ(x) ~ x ⇔ ψ(x) ~ x, p_n ~ n log n]
techniques: [Abel summation, Tauberian arguments, proof architecture]
---

Gauss guessed it around 1792; Chebyshev proved in 1850 that it is right to within a constant factor (Chapter 16), and that if $\pi(x)\log x/x$ has a limit, the limit is $1$ (Chapter 17). Riemann showed in 1859 how the zeros of $\zeta$ control the primes, without proving it. The theorem itself was finally proved in 1896, independently and almost simultaneously, by Jacques Hadamard and Charles de la Vallée Poussin.:cite[hadamard1896,delavalleepoussin1896]

:::theorem{name="The prime number theorem" who="Hadamard; de la Vallée Poussin" year=1896 status=proved}
$$\pi(x) \sim \frac{x}{\log x}, \qquad\text{that is,}\qquad \lim_{x \to \infty}\frac{\pi(x)}{x/\log x} = 1.$$
:::

This part of the course proves it completely. This chapter sets out the plan and proves the easy reductions; Chapter 25 proves the key fact about $\zeta$; Chapter 26 finishes the proof, following Donald Newman’s short argument from 1980; and Chapter 27 discusses how good the error term is and the “elementary” proof that avoids complex analysis.

## Equivalent forms

Chebyshev’s functions (Chapter 16) are the natural objects for analysis:
$$\theta(x) = \sum_{p \le x}\log p, \qquad \psi(x) = \sum_{p^k \le x}\log p = \sum_{n \le x}\Lambda(n).$$

:::theorem{status=proved}
The following are equivalent:
1. $\pi(x) \sim x/\log x$;
2. $\theta(x) \sim x$;
3. $\psi(x) \sim x$.
:::

:::proof
**(2) ⇔ (3).** $\psi(x) - \theta(x) = \sum_{k \ge 2}\theta(x^{1/k})$. Only $k \le \log_2 x$ contribute, and each term is at most $\theta(\sqrt x) = O(\sqrt x)$ by Chebyshev, so $0 \le \psi(x) - \theta(x) = O(\sqrt x\log x)$, which is $o(x)$.

**(1) ⇒ (2).** Trivially $\theta(x) \le \pi(x)\log x$. For a lower bound, fix $0 < \varepsilon < 1$ and keep only the primes above $x^{1-\varepsilon}$, each of which has $\log p \ge (1 - \varepsilon)\log x$:
$$\theta(x) \ge (1 - \varepsilon)\log x\,\big(\pi(x) - \pi(x^{1-\varepsilon})\big) \ge (1 - \varepsilon)\log x\,\big(\pi(x) - x^{1-\varepsilon}\big).$$
Dividing by $x$ and using (1), $\liminf\theta(x)/x \ge 1 - \varepsilon$, and $\limsup \theta(x)/x \le \limsup\pi(x)\log x/x = 1$.

**(2) ⇒ (1).** Abel summation (Appendix B) with weights $1/\log t$:
$$\pi(x) = \sum_{p \le x}\frac{\log p}{\log p} = \frac{\theta(x)}{\log x} + \int_2^x\frac{\theta(t)}{t\log^2t}\,dt.$$
Since $\theta(t) = O(t)$, the integral is $O\left(\int_2^x\frac{dt}{\log^2t}\right) = O\left(\frac{x}{\log^2x}\right)$ (split the integral at $\sqrt x$). So $\pi(x) = \frac{\theta(x)}{\log x} + O\left(\frac{x}{\log^2x}\right)$, and (1) follows from (2).
:::

A fourth form says where the $n$-th prime is.

:::corollary{status=proved}
The prime number theorem is equivalent to $p_n \sim n\log n$.
:::

:::proof
If $\pi(x) \sim x/\log x$, put $x = p_n$: $n \sim p_n/\log p_n$. Taking logarithms, $\log n = \log p_n - \log\log p_n + o(1) \sim \log p_n$, so $p_n \sim n\log p_n \sim n\log n$. The converse is similar: for $p_n \le x < p_{n+1}$, $\pi(x) = n$ and $x \sim n\log n$, so $\frac{x}{\log x} \sim \frac{n\log n}{\log n + \log\log n} \sim n$.
:::

```quiz
q: 'Which statement does the prime number theorem *not* imply?'
options:
  - text: The proportion of primes among the integers up to $x$ tends to $0$.
    why: '$\pi(x)/x \sim 1/\log x \to 0$.'
  - text: $\pi(x) - \operatorname{Li}(x) = O(\sqrt x\log x)$.
    correct: true
    why: That error bound is equivalent to the Riemann Hypothesis (Chapter 28). The prime number theorem only says the ratio tends to $1$.
  - text: $\pi(2x) - \pi(x) \sim \pi(x)$.
    why: '$\frac{2x}{\log 2x} - \frac{x}{\log x} \sim \frac{x}{\log x}$.'
```

## Why the line σ = 1 is the crux

The explicit formula of Chapter 23 gives the shape of the proof away:
$$\frac{\psi(x)}{x} = 1 - \sum_\rho\frac{x^{\rho - 1}}{\rho} - \frac{\log 2\pi}{x} - \cdots$$
A zero $\rho = \beta + i\gamma$ contributes a term of size $x^{\beta - 1}/|\rho|$. If $\beta < 1$, that tends to $0$. If some zero had $\beta = 1$, it would contribute a wave $x^{i\gamma}/\rho$ whose size does not shrink at all, and $\psi(x)/x$ could not converge.

::what-if-zero

So the prime number theorem is “equivalent” to the statement that $\zeta$ has no zeros on the line $\operatorname{Re}s = 1$. (It cannot have zeros to the right, by the Euler product.) Making this rigorous through the explicit formula requires controlling infinitely many zeros at once, which is how Hadamard and de la Vallée Poussin proceeded, with a lot of work. Newman’s insight was that one can avoid the zeros entirely: a single complex-analytic lemma, applied to a suitable Laplace transform, converts “$\zeta$ has no zeros on $\sigma = 1$“ directly into ”$\psi(x) \sim x$”.

## The proof in five steps

The proof in Chapter 26 works with
$$\Phi(s) = \sum_p\frac{\log p}{p^s} \qquad (\operatorname{Re}s > 1),$$
a cousin of $-\zeta'/\zeta$ that sees only the primes, so that it is directly related to $\theta$.

1. **$\zeta$ near the line.** $(s - 1)\zeta(s)$ extends holomorphically to $\operatorname{Re}s > 0$ (Chapter 20). *Done.*
2. **$\theta(x) = O(x)$.** Chebyshev’s bound (Chapter 16). *Done.*
3. **No zeros on the line.** $\zeta(1 + it) \ne 0$ for all real $t$. Consequently $\Phi(s) - \frac{1}{s - 1}$ extends holomorphically to an open set containing $\operatorname{Re}s \ge 1$. *Chapter 25.*
4. **Newman’s analytic theorem.** If $f$ is bounded and its Laplace transform $\int_0^\infty f(t)e^{-zt}dt$ extends holomorphically to $\operatorname{Re}z \ge 0$, then $\int_0^\infty f(t)\,dt$ converges. Applied to $f(t) = \theta(e^t)e^{-t} - 1$, this shows that $\int_1^\infty\frac{\theta(x) - x}{x^2}\,dx$ converges. *Chapter 26.*
5. **A Tauberian step.** If $\theta(x) \ge \lambda x$ for some $\lambda > 1$ and arbitrarily large $x$, then, since $\theta$ is increasing, the integrand is large and positive on $[x, \lambda x]$, contradicting convergence. Similarly for $\lambda < 1$. So $\theta(x) \sim x$. *Chapter 26.*

Step 5 is where the monotonicity of $\theta$ is used, and it is typical of **Tauberian** arguments: information about an average (here, a convergent integral) is converted into information about the function itself, using some one-sided control. Without such control, averages can hide oscillations.

:::note
**Why not prove the explicit formula version?** It gives more (an error term, Chapter 27), but needs the Hadamard product, bounds for $\zeta'/\zeta$ on horizontal lines, and Perron’s formula with error terms. Newman’s route needs only Cauchy’s integral formula. It is the shortest complete proof known, and every step will be proved in full.
:::

:::key
- PNT: $\pi(x) \sim x/\log x$; equivalently $\theta(x) \sim x$, $\psi(x) \sim x$, or $p_n \sim n\log n$.
- A zero of $\zeta$ on $\operatorname{Re}s = 1$ would add a non-decaying wave to $\psi(x)/x$; zeros with $\operatorname{Re}\rho < 1$ only add waves that die out. So the crux is $\zeta(1 + it) \ne 0$.
- Plan: no zeros on the line (Chapter 25) ⇒ $\Phi(s) - \frac1{s-1}$ is holomorphic on $\operatorname{Re}s \ge 1$ ⇒ (Newman) $\int_1^\infty\frac{\theta(x) - x}{x^2}dx$ converges ⇒ (monotonicity) $\theta(x) \sim x$.
:::

:::exercises
1. Show that $\pi(x) = \frac{x}{\log x} + \frac{x}{\log^2x} + O\left(\frac{x}{\log^3x}\right)$ is implied by $\pi(x) = \operatorname{Li}(x) + O\left(\frac{x}{\log^3x}\right)$, and explain why $\operatorname{Li}(x)$ is a better approximation than $\frac{x}{\log x}$.
2. Assuming the prime number theorem, show that for every $\varepsilon > 0$ there is a prime between $x$ and $(1 + \varepsilon)x$ for all large $x$. (Bertrand’s postulate, Chapter 16, is the case $\varepsilon = 1$, proved without the PNT.)
3. Show that the prime number theorem implies $p_{n+1}/p_n \to 1$. Does it imply $p_{n+1} - p_n = o(p_n)$? Does it imply that $p_{n+1} - p_n$ is bounded?
4. Use the widget: with $\gamma = 6$, how close to $1$ must $\beta$ be for the extra wave to still have relative size $0.05$ at $x = 10^7$?
:::
