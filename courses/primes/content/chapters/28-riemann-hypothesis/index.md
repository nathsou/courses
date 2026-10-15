---
number: 28
title: The Riemann Hypothesis
summary: "The statement, its history, and why it is equivalent to the best possible error term for counting primes: π(x) = Li(x) + O(√x log x). What would follow from it, the evidence for it, the verified range, and the de Bruijn–Newman constant, which says that if it is true it is only just true."
duration: About 1¼ hours
prerequisites: [explicit-formula, error-terms]
theorems: [The Riemann Hypothesis (open), Zero-free half-planes ⇔ error terms, von Koch’s theorem, Cramér’s bound on prime gaps under RH, Rodgers–Tao (Λ ≥ 0)]
techniques: [Abel summation, the explicit formula, conditional results]
---

In his 1859 paper, after showing that the zeros of $\xi(\frac12 + it)$ (as a function of $t$) number about $\frac{T}{2\pi}\log\frac{T}{2\pi}$ up to height $T$, Riemann wrote that it is "very likely that all the roots are real", and added that he had set aside the search for a proof after some fleeting attempts, since it was not needed for his immediate purpose.:cite[riemann1859] In the language of this course:

:::conjecture{name="The Riemann Hypothesis" who="Riemann" year=1859}
Every nontrivial zero of $\zeta$ has real part $\frac12$.
:::

David Hilbert put it on his list of problems for the twentieth century in 1900 (problem 8). A century later the Clay Mathematics Institute made it one of its seven Millennium Prize Problems, with a prize of one million dollars.:cite[clay] It is widely regarded as the most important open problem in mathematics. This chapter explains what it says about primes, what would follow from it, and why most mathematicians believe it.

## What it says about primes

Chapter 23 showed that $\psi(x) - x$ is a sum of waves $-x^\rho/\rho$ over the zeros. The largest real part $\Theta$ of a zero controls the error. Here is the precise version, now for $\pi(x)$ as well.

:::theorem{status=sketched}
Let $\frac12 \le \Theta < 1$. The following are equivalent:
1. $\zeta$ has no zeros with real part greater than $\Theta$;
2. $\psi(x) = x + O(x^{\Theta + \varepsilon})$ for every $\varepsilon > 0$;
3. $\pi(x) = \operatorname{Li}(x) + O(x^{\Theta + \varepsilon})$ for every $\varepsilon > 0$.

In particular, **the Riemann Hypothesis is equivalent to $\pi(x) = \operatorname{Li}(x) + O(x^{1/2 + \varepsilon})$ for every $\varepsilon > 0$**, and in fact to $\pi(x) = \operatorname{Li}(x) + O(\sqrt x\log x)$ (von Koch, 1901).
:::

:::proof
**(1) ⇒ (2)** is the truncated explicit formula, as sketched in Chapter 27: with $T = x$, each zero contributes at most $x^\Theta/|\rho|$ and $\sum_{|\gamma| < x}\frac{1}{|\rho|} = O(\log^2x)$, so $\psi(x) - x = O(x^\Theta\log^2x)$.

**(2) ⇒ (1)**: for $\operatorname{Re}s > 1$, $-\frac{\zeta'(s)}{\zeta(s)} = \frac{s}{s-1} + s\int_1^\infty(\psi(x) - x)x^{-s-1}\,dx$ (Chapter 23, exercise 4). Under (2) the integral converges absolutely and locally uniformly for $\operatorname{Re}s > \Theta + \varepsilon$, so it is holomorphic there. Hence $\frac{\zeta'}{\zeta}$ has no poles with $\operatorname{Re}s > \Theta$ other than $s = 1$, and $\zeta$ has no zeros there.

**(2) ⇔ (3)**: by Abel summation (Chapter 24), $\theta(x) - x = (\pi(x) - \operatorname{Li}(x))\log x - \int_2^x\frac{\pi(t) - \operatorname{Li}(t)}{t}\,dt + O(1)$, because $x - 2 = \int_2^x\log t\,d\operatorname{Li}(t)$. So an error $O(x^{\Theta + \varepsilon})$ for $\pi - \operatorname{Li}$ gives one for $\theta - x$, and the reverse computation (dividing by $\log t$ instead of multiplying) gives the converse. Finally $\psi(x) - \theta(x) = O(\sqrt x\log x)$, which is within the error because $\Theta \ge \frac12$.
:::

So the Riemann Hypothesis is not an isolated statement about an analytic function. It says that the primes are distributed as regularly as they possibly can be: the error in Gauss's approximation is about the square root of the main term, like the fluctuations of a random walk. The exponent $\frac12$ cannot be lowered, since there are zeros on the critical line (Hardy, Chapter 22): $\pi(x) - \operatorname{Li}(x)$ is not $O(x^{1/2 - \varepsilon})$.

::error-slope

Schoenfeld's explicit form, already met in Chapter 27, is a clean equivalent: the Riemann Hypothesis holds if and only if
$$|\pi(x) - \operatorname{Li}(x)| < \frac{1}{8\pi}\sqrt x\log x \qquad\text{for all } x \ge 2657.$$
(One direction is Schoenfeld's theorem; the other follows from the equivalence above.) Every known value of $\pi(x)$ satisfies it with a large margin.

## What would follow

Thousands of published theorems begin "Assume the Riemann Hypothesis". A few in the course's territory:

- **Primes in short intervals.** Every interval $(x, x + C\sqrt x\log x]$ contains a prime for large $x$, and $p_{n+1} - p_n = O(\sqrt{p_n}\log p_n)$ (Cramér, 1920).:cite[cramer1920] Unconditionally, the best known is $O(p_n^{0.525})$ (Baker, Harman and Pintz, 2001).:cite[bhp2001]
- **Möbius sums.** $\sum_{n \le x}\mu(n) = O(x^{1/2 + \varepsilon})$, and this is again equivalent to RH (Chapter 29).
- **Growth of $\zeta$.** The **Lindelöf Hypothesis**, $\zeta(\frac12 + it) = O(|t|^\varepsilon)$, follows from RH.
- **Primality testing.** The *generalised* Riemann Hypothesis (for Dirichlet $L$-functions, Chapter 33) implies that Miller's test (Chapter 8) is deterministic if it checks every base $a \le 2\log^2n$ (Bach, 1990).:cite[bach1990]

## The evidence

**Computation.** All zeros up to height $3 \times 10^{12}$, more than twelve trillion of them, are on the line (Platt and Trudgian, Chapter 22). Andrew Odlyzko computed billions of zeros near the $10^{20}$-th and $10^{22}$-nd, all on the line, and found that their statistics match random matrix predictions (Chapter 31).:cite[odlyzko-zeros]

**Theorems.** Most zeros are near the line: for every $\varepsilon > 0$, all but $o(N(T))$ of the zeros up to height $T$ have $|\operatorname{Re}\rho - \frac12| < \varepsilon$ (Bohr and Landau, 1914). At least $41\%$ of them are exactly on it (Chapter 22). And the analogue of RH for curves over finite fields is a theorem (Weil, 1948; Deligne, 1974), discussed in Chapter 32.

**Heuristics.** Random models of the primes (Chapter 18) predict errors of size $\sqrt x$, and the Möbius function behaves like a random sequence of $\pm1$ (Chapter 29), which would also give square-root cancellation.

**Reasons for caution.** The fluctuating part $S(T)$ of the zero count grows like $\log T$ at most, and in practice grows extremely slowly: if the Riemann Hypothesis failed, the first counterexample might sit at a height far beyond computation, the way the first sign change of $\pi(x) - \operatorname{Li}(x)$ does (Chapter 30). Other plausible conjectures supported by enormous numerical evidence have turned out false: Mertens' conjecture (Chapter 29), and Pólya's conjecture that at least half of the numbers up to any $x \ge 2$ have an odd number of prime factors, disproved by Haselgrove in 1958 (the smallest counterexample is $906{,}150{,}257$).:cite[haselgrove1958]

```quiz
q: 'If someone found a zero of $\zeta$ at $\rho = 0.6 + i\gamma$, what would follow?'
options:
  - text: $\pi(x) - \operatorname{Li}(x)$ would be larger than $x^{0.59}$ for infinitely many $x$.
    correct: true
    why: By the equivalence, the error could not be $O(x^{0.6 - \varepsilon})$; in fact it would oscillate with amplitude about $x^{0.6}/|\rho|$.
  - text: The prime number theorem would be false.
    why: The PNT only needs no zeros on $\operatorname{Re}s = 1$, which is a theorem.
  - text: There would also be a zero at $0.4 + i\gamma$, but nothing else.
    why: There would be four zeros, $0.6 \pm i\gamma$ and $0.4 \pm i\gamma$, by the two symmetries of Chapter 21.
```

## Only just true?

There is a precise sense in which the Riemann Hypothesis, if true, is barely true. Write $\Xi(z) = \xi(\frac12 + iz)$; it is an even entire function, real on the real axis, and RH says all its zeros are real. Since $\Xi$ is the Fourier transform of a rapidly decaying function $\Phi(u)$, one can deform it: let $H_\lambda$ be the Fourier transform of $e^{\lambda u^2}\Phi(u)$. Nicolaas de Bruijn showed in 1950 that $H_\lambda$ has only real zeros for $\lambda \ge \frac12$, and Charles Newman showed in 1976 that there is a constant $\Lambda$ (now called the **de Bruijn–Newman constant**) such that $H_\lambda$ has only real zeros exactly when $\lambda \ge \Lambda$. The Riemann Hypothesis is the statement $\Lambda \le 0$.

Newman conjectured the opposite inequality $\Lambda \ge 0$, "a quantitative version of the dictum that the Riemann Hypothesis, if true, is only barely so". Brad Rodgers and Terence Tao proved it in 2018.:cite[rodgers-tao2020] So the Riemann Hypothesis is equivalent to $\Lambda = 0$. A Polymath project led by Tao showed $\Lambda \le 0.22$ in 2019. The Lehmer pairs of Chapter 22 are the reason: under the deformation with $\lambda < 0$, close pairs of zeros collide and leave the real line.

## Generalisations

The same hypothesis is expected for every $L$-function with an Euler product and a functional equation: Dirichlet $L$-functions (the **generalised Riemann Hypothesis**, Chapter 33), Dedekind zeta functions of number fields, $L$-functions of elliptic curves and modular forms. None is proved. In each case the hypothesis translates into the best possible error terms for counting the corresponding primes: primes in arithmetic progressions, prime ideals, or points on curves modulo $p$.

:::key
- RH: all nontrivial zeros have real part $\frac12$. Stated by Riemann in 1859; Hilbert's 8th problem; a Millennium Prize Problem.
- No zeros with real part $> \Theta$ ⇔ $\pi(x) = \operatorname{Li}(x) + O(x^{\Theta + \varepsilon})$. RH ⇔ $\pi(x) = \operatorname{Li}(x) + O(\sqrt x\log x)$: the primes are as regular as possible, with square-root fluctuations.
- Consequences include gaps $p_{n+1} - p_n = O(\sqrt{p_n}\log p_n)$ and Lindelöf; GRH makes Miller's test deterministic.
- Evidence: $3 \times 10^{12}$ heights verified; most zeros near the line; the finite field analogue proved. Caution: counterexamples to similar conjectures appeared only at enormous heights.
- De Bruijn–Newman: RH ⇔ $\Lambda \le 0$, and $\Lambda \ge 0$ is a theorem, so RH is "only just" true if true.
:::

:::exercises
1. Show that RH implies $\theta(x) = x + O(\sqrt x\log^2x)$, and deduce that for large $x$ there is a prime in every interval $(x, x + \sqrt x\log^3x]$.
2. Complete the proof of (3) ⇒ (2): if $\theta(x) = x + E(x)$, show $\pi(x) - \operatorname{Li}(x) = \frac{E(x)}{\log x} + \int_2^x\frac{E(t)}{t\log^2t}\,dt + O(1)$.
3. Use the table in the widget to check Schoenfeld's inequality at $x = 10^{10}$ and $10^{25}$. By what factor is it satisfied?
4. Pólya's conjecture concerns $L(x) = \sum_{n \le x}\lambda(n)$, where $\lambda(n) = (-1)^{\Omega(n)}$. Show that $\sum\lambda(n)n^{-s} = \zeta(2s)/\zeta(s)$ (Chapter 19), and explain why $L(x) = O(x^{1/2 + \varepsilon})$ is also equivalent to RH.
:::
