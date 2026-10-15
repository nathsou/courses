---
number: 30
title: When Li(x) falls behind
summary: "li(x) is larger than π(x) for every x anyone has computed, and for every x up to 10¹⁹. Yet Littlewood proved in 1914 that the order is reversed infinitely often. Why li has a bias, Landau’s oscillation theorem, Skewes’ enormous numbers, the region near 1.397 × 10³¹⁶ where the first reversal probably lies, and logarithmic density."
duration: About 1¼ hours
prerequisites: [explicit-formula, riemann-hypothesis]
theorems: [ψ(x) − x changes sign infinitely often, Littlewood’s theorem, Rubinstein–Sarnak on logarithmic density]
techniques: [Landau’s theorem on Dirichlet integrals, Dirichlet’s approximation theorem, logarithmic density]
---

Look at any table of $\pi(x)$ and $\operatorname{li}(x)$ (Chapter 14): $\operatorname{li}(x)$ is always larger. Gauss and Riemann both seem to have believed this holds for all $x \ge 2$, and the computational evidence is overwhelming: Jan Büthe proved in 2018 that $\pi(x) < \operatorname{li}(x)$ for every $2 \le x \le 10^{19}$.:cite[buthe2018] Nevertheless:

:::theorem{name="Littlewood" year=1914 status=sketched}
$\pi(x) - \operatorname{li}(x)$ changes sign infinitely often. More precisely, there is a constant $c > 0$ such that each of
$$\pi(x) - \operatorname{li}(x) > c\,\frac{\sqrt x\,\log\log\log x}{\log x}, \qquad \pi(x) - \operatorname{li}(x) < -c\,\frac{\sqrt x\,\log\log\log x}{\log x}$$
holds for arbitrarily large $x$.
:::

This chapter explains why $\operatorname{li}$ is biased, why the bias must eventually be overcome, and how far one has to go.

## The bias

Riemann's formula (Chapter 23) is cleanest for $J(x) = \pi(x) + \frac12\pi(x^{1/2}) + \frac13\pi(x^{1/3}) + \cdots$, which counts prime powers $p^k$ with weight $\frac1k$:
$$J(x) = \operatorname{li}(x) - \sum_\rho\operatorname{li}(x^\rho) + (\text{small}).$$
So $\operatorname{li}(x)$ is an unbiased estimate of $J(x)$, not of $\pi(x)$. Subtracting the prime squares,
$$\pi(x) = \operatorname{li}(x) - \tfrac12\operatorname{li}(\sqrt x) - \sum_\rho\operatorname{li}(x^\rho) + (\text{smaller}).$$
The term $\frac12\operatorname{li}(\sqrt x) \approx \frac{\sqrt x}{\log x}$ is a systematic deficit of the same order as the waves from the zeros. With $\operatorname{li}(x^\rho) \approx \frac{x^\rho}{\rho\log x}$, and assuming RH so that $x^\rho = \sqrt x\,x^{i\gamma}$,
$$\frac{\pi(x) - \operatorname{li}(x)}{\sqrt x/\log x} \approx -1 - \sum_{\gamma > 0}2\operatorname{Re}\frac{x^{i\gamma}}{\rho}.$$
The waves average to zero, so the left side hovers around $-1$.

::li-bias

Riemann's function $R(x) = \sum\frac{\mu(n)}{n}\operatorname{li}(x^{1/n})$ removes the bias (its $n = 2$ term is $-\frac12\operatorname{li}(\sqrt x)$), and $\pi(x) - R(x)$ changes sign often.

## Why the bias must lose

The sum over zeros has amplitudes $\frac{2}{|\rho|} \approx \frac2\gamma$, and $\sum\frac1\gamma$ diverges (there are about $\frac{T}{2\pi}\log T$ zeros up to $T$). If many of the phases $\gamma\log x$ could be made close to the values that make every wave positive, the sum would exceed $1$ and overcome the bias. Dirichlet's approximation theorem says that for any $N$ real numbers one can find large integers $q$ making all of $q\gamma_1/2\pi, \ldots, q\gamma_N/2\pi$ simultaneously close to integers. That is the heart of Littlewood's proof: choose $\log x$ to align the first $N$ waves, at the cost of making $x$ enormous. The gain is $\sum_{\gamma < T}\frac1\gamma \approx \frac{1}{4\pi}\log^2T$, and balancing it against the size of $x$ needed gives the $\log\log\log x$.

The weaker statement for $\psi$ has a short proof, with no alignment needed.

:::theorem{status=proved}
$\psi(x) - x$ takes both signs for arbitrarily large $x$.
:::

:::proof
We use **Landau's theorem**: if $A(x) \ge 0$ for all large $x$, and $F(s) = \int_1^\infty A(x)x^{-s-1}dx$ converges for $\operatorname{Re}s > \sigma_c$ but not for $\operatorname{Re}s < \sigma_c$, then $F$ cannot be continued holomorphically to a neighbourhood of the real point $\sigma_c$. (If it could, its Taylor series at a real point $a > \sigma_c$ would converge at some real $b < \sigma_c$. The derivatives are $F^{(k)}(a) = \int A(x)(-\log x)^kx^{-a-1}dx$, so the Taylor series at $b$ is $\int A(x)x^{-a-1}\sum_k\frac{((a - b)\log x)^k}{k!}dx$, a series of nonnegative terms; exchanging sum and integral shows that $\int A(x)x^{-b-1}dx$ converges, a contradiction.)

Suppose $x - \psi(x) \ge 0$ for all $x \ge x_0$. For $\operatorname{Re}s > 1$,
$$F(s) = \int_1^\infty\big(x - \psi(x)\big)x^{-s-1}\,dx = \frac{1}{s - 1} + \frac{1}{s}\cdot\frac{\zeta'(s)}{\zeta(s)}.$$
The right side is holomorphic at $s = 1$ (the poles cancel), and on the whole real interval $(0, 1]$, since $\zeta$ has no zeros there (it is negative on $(0, 1)$, Chapter 20). Changing $A$ on $[1, x_0]$ only adds an entire function, so Landau's theorem applies: the integral converges, and $F$ is holomorphic, for all $\operatorname{Re}s > 0$. But $\frac{\zeta'}{\zeta}$ has a pole at the first zero $\frac12 + 14.13\ldots i$, which has real part $\frac12 > 0$. Contradiction. The case $\psi(x) - x \ge 0$ eventually is the same with signs reversed.
:::

The same argument shows that $\psi(x) - x$ is not $o(x^{1/2})$ in either direction, since the real parts of the zeros are not all less than $\frac12$.

## Skewes’ numbers

Littlewood's proof does not say how large $x$ must be. His student Stanley Skewes made it explicit. Assuming RH, he showed in 1933 that the first sign change occurs below
$$e^{e^{e^{79}}} \approx 10^{10^{10^{34}}},$$
a number G. H. Hardy called the largest that had ever served a definite purpose in mathematics. In 1955 Skewes removed RH, at the cost of $10^{10^{10^{964}}}$.:cite[skewes1933] Later work brought the bound down to earth, or at least to something writable:

| Year | Who | First sign change below |
| --- | --- | --- |
| 1966 | Lehman | $1.65 \times 10^{1165}$ |
| 1987 | te Riele | $6.66 \times 10^{370}$ |
| 2000 | Bays and Hudson | near $1.398 \times 10^{316}$ |
| 2010 | Saouter and Demichel | near $1.3972 \times 10^{316}$ |

The modern method is exactly the formula above: compute $-1 - \sum 2\operatorname{Re}(x^{i\gamma}/\rho)$ with many zeros, find a region where it is clearly positive, and bound the error from the omitted zeros rigorously.:cite[saouter-demichel2010] Try it:

::skewes-hunt

Near $\log x \approx 727.95$ the first zeros nearly align. Zoom in: with $1000$ zeros the peak is at $-0.020$, with $3000$ at $-0.034$ (adding zeros does not help steadily), and with all $10{,}000$ it reaches about $+0.002$ at $\log x \approx 727.952$, a hair above zero. A rigorous proof needs many more zeros and a bound on the rest (Bays and Hudson used a million), but this is the place. Whether this is the *first* sign change is not known for certain, but every search so far points that way.

## How often does π(x) win?

Once one knows the sign changes infinitely often, a natural question is: for what proportion of $x$ is $\pi(x) > \operatorname{li}(x)$? The ordinary proportion $\frac1X|\{x \le X : \pi(x) > \operatorname{li}(x)\}|$ may not converge, because the sum over zeros is a function of $\log x$. The right notion is the **logarithmic density**
$$\delta(S) = \lim_{X \to \infty}\frac{1}{\log X}\int_{\substack{2 \le x \le X\\ x \in S}}\frac{dx}{x},$$
which measures a set by how much of the $\log x$ axis it occupies.

:::theorem{name="Rubinstein–Sarnak" year=1994 status=stated}
Assume RH and that the positive ordinates $\gamma$ of the zeros are linearly independent over $\Q$. Then the set of $x$ with $\pi(x) > \operatorname{li}(x)$ has logarithmic density $\delta \approx 0.00000026$.
:::

So $\pi(x)$ is ahead of $\operatorname{li}(x)$ on about one part in four million of the $\log x$ axis.:cite[rubinstein-sarnak1994] Chapter 34 applies the same ideas to "prime races" between residue classes, where the bias is much milder and visible in everyday ranges.

```quiz
q: 'Why does $\pi(x) - \operatorname{li}(x)$ hover around $-\sqrt x/\log x$ rather than around $0$?'
options:
  - text: Because $\operatorname{li}(x)$ approximates $\pi(x) + \frac12\pi(\sqrt x) + \cdots$, which counts prime squares too.
    correct: true
    why: 'The term $\frac12\pi(\sqrt x) \approx \sqrt x/\log x$ is the bias.'
  - text: Because of the trivial zeros of $\zeta$.
    why: Their contribution is tiny, $O(1/x^2\log x)$.
  - text: Because the Riemann Hypothesis is false.
    why: The bias appears in Riemann's formula whatever the zeros are; RH only fixes the size of the oscillations around it.
```

:::key
- $\operatorname{li}(x) > \pi(x)$ for all $2 \le x \le 10^{19}$, because $\operatorname{li}$ estimates the count of prime powers with weights, and the prime squares add $\approx\sqrt x/\log x$.
- The waves from the zeros have amplitudes $2/|\rho|$ whose sum diverges; aligning their phases (Dirichlet approximation) beats the bias, so the sign changes infinitely often (Littlewood, 1914).
- For $\psi(x) - x$, Landau's theorem gives a short proof: one-signed would force no zeros with positive real part.
- Skewes (1933, on RH): first change below $10^{10^{10^{34}}}$. Today: very likely near $1.397 \times 10^{316}$. Logarithmic density of $\{\pi > \operatorname{li}\}$: about $2.6 \times 10^{-7}$ (Rubinstein–Sarnak, conditionally).
:::

:::exercises
1. Show that $\frac12\operatorname{li}(\sqrt x) \sim \frac{\sqrt x}{\log x}$.
2. Using $N(T) \approx \frac{T}{2\pi}\log\frac{T}{2\pi}$, show that $\sum_{0 < \gamma < T}\frac{1}{\gamma} \sim \frac{1}{4\pi}\log^2T$. How many zeros are needed for the amplitudes $2/\gamma$ to add up to $1$?
3. Show that a set $S$ of real numbers that is a union of intervals $[a^k, a^{k+1/2}]$ (for fixed $a > 1$ and all $k \ge 1$) has logarithmic density $\frac12$, but its ordinary density $\lim\frac1X|S \cap [0, X]|$ does not exist.
4. In the widget, follow the peak near $\log x = 727.95$ as you add zeros from $10$ to $10{,}000$. Why can adding more zeros make it go down?
:::
