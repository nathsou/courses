---
number: 27
title: Beyond the main term
summary: "How wrong is x/log x? The zero-free region σ > 1 − c/log t and the error term x·exp(−c√log x); the Vinogradov–Korobov improvement; explicit bounds; what the Riemann Hypothesis would give; and Selberg’s symmetry formula, the heart of the 1949 elementary proof by Selberg and Erdős."
duration: About 1½ hours
prerequisites: [pnt-proof, explicit-formula]
theorems: [The de la Vallée Poussin zero-free region, ψ(x) = x + O(x exp(−c√log x)), Selberg’s symmetry formula, The elementary proof of the PNT]
techniques: [zero-free regions, the truncated explicit formula, Dirichlet convolution identities]
---

The prime number theorem says $\psi(x)/x \to 1$, but not how fast. For applications, and for understanding, the size of the error matters. This chapter surveys what is known, proving the parts that are short and sketching the rest, and ends with the other famous proof of the theorem: the "elementary" one, which uses no complex analysis at all.

## The error, measured

The explicit formula (Chapter 23) says that $\psi(x) - x$ is a sum of waves $-x^\rho/\rho$, each of size $x^{\operatorname{Re}\rho}/|\rho|$. If every zero has real part $\frac12$, the error should be roughly of size $\sqrt x$, up to logarithms. The data agree:

::error-terms

But we cannot prove anything like this. What we can prove depends on how far to the left of the line $\sigma = 1$ we know $\zeta$ has no zeros.

## A zero-free region

Chapter 25 showed that there are no zeros on the line $\sigma = 1$. The same inequality, applied to $\zeta'/\zeta$ instead of $\log\zeta$, pushes the zeros a little way off it.

:::theorem{name="Zero-free region" who="de la Vallée Poussin" year=1899 status=sketched}
There is a constant $c > 0$ such that $\zeta(\sigma + it) \ne 0$ whenever $\sigma \ge 1 - \dfrac{c}{\log(|t| + 2)}$.
:::

The sketch has four steps.

1. **Positivity.** By $3 + 4\cos\theta + \cos 2\theta \ge 0$ applied to $-\operatorname{Re}\frac{\zeta'}{\zeta}(s) = \sum\Lambda(n)n^{-\sigma}\cos(t\log n)$, for $\sigma > 1$:
$$3\left(-\frac{\zeta'}{\zeta}(\sigma)\right) + 4\left(-\operatorname{Re}\frac{\zeta'}{\zeta}(\sigma + it)\right) + \left(-\operatorname{Re}\frac{\zeta'}{\zeta}(\sigma + 2it)\right) \ge 0.$$
2. **The pole.** $-\frac{\zeta'}{\zeta}(\sigma) < \frac{1}{\sigma - 1} + O(1)$ as $\sigma \to 1^+$.
3. **The zeros.** The Hadamard product (Chapter 21) gives, for $1 < \sigma \le 2$ and $|t| \ge 2$, $-\operatorname{Re}\frac{\zeta'}{\zeta}(\sigma + it) = O(\log|t|) - \sum_\rho\operatorname{Re}\frac{1}{\sigma + it - \rho}$, and every term $\operatorname{Re}\frac{1}{s - \rho}$ is positive because $\operatorname{Re}(s - \rho) > 0$. Dropping all but one zero $\rho = \beta + it$ gives $-\operatorname{Re}\frac{\zeta'}{\zeta}(\sigma + it) \le -\frac{1}{\sigma - \beta} + O(\log|t|)$, and dropping all of them at $2t$ gives $-\operatorname{Re}\frac{\zeta'}{\zeta}(\sigma + 2it) \le O(\log|t|)$.
4. **Combine.** $\frac{3}{\sigma - 1} - \frac{4}{\sigma - \beta} + A\log|t| \ge 0$ for some constant $A$. Take $\sigma = 1 + \frac{a}{\log|t|}$ with $a$ small: this forces $1 - \beta \ge \frac{c}{\log|t|}$.

Step 4 is again "$4 > 3$": the zero, if it were too close to the line, would beat the pole.

## The error term

:::theorem{name="Error term in the PNT" who="de la Vallée Poussin" year=1899 status=sketched}
There is a constant $c > 0$ such that
$$\psi(x) = x + O\!\left(x\,e^{-c\sqrt{\log x}}\right), \qquad \pi(x) = \operatorname{Li}(x) + O\!\left(x\,e^{-c\sqrt{\log x}}\right).$$
:::

Start from the truncated explicit formula of Chapter 23: $\psi(x) = x - \sum_{|\gamma| < T}\frac{x^\rho}{\rho} + O\left(\frac{x\log^2(xT)}{T}\right)$. In the zero-free region, each zero with $|\gamma| < T$ has $x^{\operatorname{Re}\rho} \le x^{1 - c/\log T} = x\,e^{-c\log x/\log T}$, and $\sum_{|\gamma| < T}\frac{1}{|\rho|} = O(\log^2T)$. So
$$\psi(x) - x = O\!\left(x\log^2T\;e^{-c\log x/\log T} + \frac{x\log^2(xT)}{T}\right).$$
The choice $\log T = \sqrt{\log x}$ balances the two exponentials and gives the theorem (with a smaller $c$, to absorb the logarithms). For $\pi(x)$, Abel summation transfers the error, with $\operatorname{Li}(x)$ as the main term: this is why $\operatorname{Li}$ is the right approximation and $x/\log x$ is not (the difference is of size $x/\log^2x$, far larger than the error).

The error $x\,e^{-c\sqrt{\log x}}$ is smaller than $x/\log^Ax$ for every $A$, but larger than $x^{1 - \varepsilon}$ for every $\varepsilon$. Wider zero-free regions give better errors. The widest known, due to Vinogradov and Korobov (1958), is $\sigma \ge 1 - \frac{c}{(\log|t|)^{2/3}(\log\log|t|)^{1/3}}$, and it gives
$$\pi(x) = \operatorname{Li}(x) + O\!\left(x\exp\!\big(-c(\log x)^{3/5}(\log\log x)^{-1/5}\big)\right).$$
Apart from the value of $c$, this has not been improved in more than sixty years. Nobody can prove that $\zeta$ has no zeros with $\sigma > 0.9999$, say.

**If the Riemann Hypothesis is true**, every zero has $\operatorname{Re}\rho = \frac12$ and the same argument gives $\psi(x) = x + O(\sqrt x\log^2x)$ and $\pi(x) = \operatorname{Li}(x) + O(\sqrt x\log x)$ (von Koch, 1901).:cite[vonkoch1901] Lowell Schoenfeld made the constants explicit in 1976: on RH, $|\psi(x) - x| < \frac{1}{8\pi}\sqrt x\log^2x$ for $x \ge 73.2$ and $|\pi(x) - \operatorname{Li}(x)| < \frac{1}{8\pi}\sqrt x\log x$ for $x \ge 2657$.:cite[schoenfeld1976] These are the dashed curves in the widget.

**Explicit unconditional bounds** are needed when a proof must cover every $x$, not just large ones. A classic example, from Barkley Rosser and Schoenfeld in 1962::cite[rosser-schoenfeld1962]
$$\frac{x}{\log x} < \pi(x) \quad (x \ge 17), \qquad \pi(x) < 1.25506\,\frac{x}{\log x}\quad(x > 1).$$

```quiz
q: 'Which of these error terms for $\pi(x) - \operatorname{Li}(x)$ is currently *proved*?'
options:
  - text: $O\big(x\exp(-c\sqrt{\log x})\big)$
    correct: true
    why: De la Vallée Poussin, 1899, from the zero-free region $\sigma > 1 - c/\log|t|$.
  - text: $O(x^{0.99})$
    why: That would need a zero-free strip $\sigma > 0.99$, which nobody can prove.
  - text: $O(\sqrt x\log x)$
    why: That is equivalent to the Riemann Hypothesis.
```

## Selberg’s symmetry formula

For half a century the prime number theorem was believed to need complex analysis: it is "equivalent" to $\zeta$ having no zeros on $\sigma = 1$, a statement about a complex function. In 1948 Atle Selberg found an identity about primes that can be proved by elementary means (sums, Möbius inversion, and Chebyshev's estimates) and that contains enough information to imply the theorem.:cite[selberg1949]

The tool is a second von Mangoldt function. Define $\Lambda_2 = \mu * \log^2$, so that $\sum_{d \mid n}\Lambda_2(d) = \log^2n$, the analogue of $\sum_{d \mid n}\Lambda(d) = \log n$.

:::lemma{status=proved}
$\Lambda_2(n) = \Lambda(n)\log n + (\Lambda * \Lambda)(n)$. In particular $\Lambda_2(p) = \log^2p$, $\Lambda_2(pq) = 2\log p\log q$ for distinct primes $p, q$, and $\Lambda_2(n) = 0$ if $n$ has three or more distinct prime factors.
:::

:::proof
Multiplication by $\log$, written $L f(n) = f(n)\log n$, is a derivation for Dirichlet convolution: $L(f * g) = Lf * g + f * Lg$, because $\log n = \log d + \log\frac nd$. Write $1$ for the constant function. Then $\Lambda = \mu * L1$ (Möbius inversion of $\log = \Lambda * 1$) and $\Lambda_2 = \mu * L^21$. Applying $L$ to $\mu * 1 = \varepsilon$ gives $L\mu * 1 + \mu * L1 = L\varepsilon = 0$, so $L\mu = -\mu * L1 * \mu = -\Lambda * \mu$. Now
$$L\Lambda = L\mu * L1 + \mu * L^21 = -\Lambda * \mu * L1 + \Lambda_2 = -\Lambda * \Lambda + \Lambda_2.$$
The values follow: $(\Lambda * \Lambda)(n)$ is a sum over factorisations $n = ab$ with both $a$ and $b$ prime powers, so it vanishes if $n$ has three distinct prime factors, and for $n = pq$ it is $2\log p\log q$.
:::

:::theorem{name="Selberg’s symmetry formula" who="Selberg" year=1948 status=sketched}
$$\sum_{p \le x}\log^2p + \sum_{pq \le x}\log p\,\log q = 2x\log x + O(x),$$
where the second sum is over ordered pairs of primes. Equivalently, $\sum_{n \le x}\Lambda_2(n) = 2x\log x + O(x)$.
:::

The proof sums $\Lambda_2 = \mu * \log^2$ over $n \le x$:
$$\sum_{n \le x}\Lambda_2(n) = \sum_{d \le x}\mu(d)\,S\!\left(\frac xd\right), \qquad S(y) = \sum_{m \le y}\log^2m = y\log^2y - 2y\log y + 2y + O(\log^2y).$$
The error terms add up to $\sum_{d \le x}O(\log^2(x/d)) = O(x)$. The main terms need two estimates that come from Möbius inversion of the harmonic sums of Appendix B, and are elementary but fiddly: $\sum_{d \le x}\frac{\mu(d)}{d}\log\frac xd = O(1)$ and $\sum_{d \le x}\frac{\mu(d)}{d}\log^2\frac xd = 2\log x + O(1)$. With them, and $\sum_{d \le x}\frac{\mu(d)}{d} = O(1)$, the main terms combine to $2x\log x + O(x)$. The equivalence of the two forms of the theorem follows from the lemma: prime powers $p^k$ with $k \ge 2$, and products $p^aq^b$ other than $pq$, contribute only $O(x)$.

::selberg-formula

Why is it called a symmetry formula? It treats primes and products of two primes together: neither $\sum\log^2p$ nor $\sum\log p\log q$ is known elementarily to be asymptotic to $x\log x$, but their sum is $2x\log x$. If primes were scarce near some $x$, products of two primes would be plentiful there, and vice versa.

## The elementary proof

From Selberg's formula, both Selberg and Paul Erdős found ways to deduce $\psi(x) \sim x$ in 1948, and their papers appeared in 1949.:cite[selberg1949,erdos1949] The idea, in Selberg's version: write $R(x) = \psi(x) - x$. Selberg's formula and partial summation give an inequality of the form
$$|R(x)|\log x \le \sum_{n \le x}\Lambda(n)\left|R\!\left(\frac xn\right)\right| + O(x\log\log x),$$
which says that $|R(x)|$ is at most a weighted average of the values $|R(x/n)|$ at smaller arguments. If $|R(x)| \le \alpha x$ for large $x$ with some $\alpha > 0$, a careful averaging argument, using that $R$ cannot change too fast (because $\psi$ is increasing), shows that $|R(x)| \le \alpha'x$ with $\alpha' < \alpha$ for large $x$. Iterating gives $\limsup|R(x)|/x = 0$. The details take several pages, which is why we do not give them; chapter 22 of Hardy and Wright has a complete account.:cite[hardy-wright]

"Elementary" means without complex analysis, not easy. The elementary proof is longer and less transparent than Newman's, and it gives weaker error terms. Its importance was conceptual: it showed that the prime number theorem is not intrinsically analytic, and the ideas (Selberg's weights, his "Selberg sieve") went on to have a large influence in sieve theory. The circumstances of its discovery led to a bitter dispute about credit between Selberg and Erdős. Selberg received a Fields Medal in 1950, for this work and for his results on the zeros of $\zeta$.

:::key
- The error in the PNT depends on how far zeros stay from $\sigma = 1$. The 3–4–1 inequality applied to $\zeta'/\zeta$ gives no zeros with $\sigma \ge 1 - c/\log|t|$, hence $\psi(x) = x + O(xe^{-c\sqrt{\log x}})$ and $\pi(x) = \operatorname{Li}(x) + O(xe^{-c\sqrt{\log x}})$.
- Vinogradov–Korobov (1958) is the best known: error $x\exp(-c(\log x)^{3/5}(\log\log x)^{-1/5})$. On RH the error would be $O(\sqrt x\log x)$, and the data look like that.
- $\Lambda_2 = \mu * \log^2 = \Lambda\log + \Lambda * \Lambda$, and Selberg's formula $\sum_{n \le x}\Lambda_2(n) = 2x\log x + O(x)$ has an elementary proof. Selberg and Erdős deduced the PNT from it in 1949.
:::

:::exercises
1. Show that $x\,e^{-c\sqrt{\log x}} = o\!\left(\frac{x}{\log^Ax}\right)$ for every $A > 0$, but that $x^{1-\varepsilon} = o\!\left(x\,e^{-c\sqrt{\log x}}\right)$ for every $\varepsilon > 0$.
2. Show that $\operatorname{Li}(x) - \frac{x}{\log x} \sim \frac{x}{\log^2x}$, so the PNT with the error term of this chapter implies $\pi(x) - \frac{x}{\log x} \sim \frac{x}{\log^2x}$. In particular $\pi(x) > \frac{x}{\log x}$ for all large $x$.
3. Check the Rosser–Schoenfeld bounds at $x = 17$, $100$ and $10^6$.
4. Verify the lemma $\Lambda_2 = \Lambda\log + \Lambda * \Lambda$ by computing both sides at $n = 12$ and $n = 30$.
5. Explain why Selberg's formula is consistent with the PNT: if $\theta(x) \sim x$, show that each of $\sum_{p \le x}\log^2p$ and $\sum_{pq \le x}\log p\log q$ is $\sim x\log x$.
:::
