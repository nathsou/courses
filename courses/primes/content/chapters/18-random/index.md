---
number: 18
title: Are the primes random?
summary: Cramér’s model of the primes as a random set, what it predicts about counts and gaps, where it fails, and the Hardy–Littlewood conjectures that repair it. With twin primes counted to ten billion, and Maier’s warning about short intervals.
duration: About 1¼ hours
prerequisites: [gauss, mertens]
theorems: [Cramér’s model predicts π(x) = Li(x) + O(√x log x), The Hardy–Littlewood twin prime conjecture (open), Maier’s theorem]
techniques: [probabilistic models, singular series, heuristics versus proofs]
---

The primes are completely determined: there is nothing random about whether $1{,}000{,}003$ is prime. Yet many of their statistical properties look exactly like those of a random sequence with density $1/\log n$, and some of the best conjectures in the subject come from taking that resemblance seriously. This chapter builds the simplest random model, tests it, finds where it breaks, and repairs it. Nothing here is a theorem about primes (except at the end); it is the art of making good guesses.

## Cramér’s model

In 1936 Harald Cramér proposed a precise probabilistic model.:cite[cramer1936]

:::definition
**Cramér's model**: a random set $\mathcal{C}$ of integers in which each $n \ge 3$ belongs to $\mathcal{C}$ independently with probability $1/\log n$.
:::

Questions about primes become questions about $\mathcal{C}$, which can be answered with probability theory. Then one conjectures that the primes behave like a typical outcome. Some predictions:

**Counts.** The expected number of elements of $\mathcal{C}$ up to $x$ is $\sum_{3 \le n \le x} \frac1{\log n} = \operatorname{Li}(x) + O(1)$, and the variance is at most the same, so by Chebyshev's inequality the count is $\operatorname{Li}(x) + O(\sqrt{x}\log x)$ with high probability (and, by a finer argument, almost surely for all large $x$). For the actual primes, that error bound is equivalent to the **Riemann Hypothesis** (Chapter 28). The model predicts it and gives a reason to believe it.

**Gaps.** The gap after an element near $x$ is approximately a geometric random variable with mean $\log x$. In units of $\log x$, gaps should follow the exponential distribution $e^{-t}\,dt$. The **largest** gap below $x$ should be about $(\log x)^2$; Cramér conjectured that $\limsup \frac{p_{n+1} - p_n}{(\log p_n)^2} = 1$.

::gap-histogram

The histogram matches the exponential curve well, apart from one feature: real gaps are all even, so in units of $\log x$ they land on a comb of values spaced $2/\log x$ apart, and the smallest gap, $2$, appears more often than the model predicts. The largest known values of $g/(\log p)^2$ are around $0.92$, for the gap of $1132$ after the prime $1{,}693{,}182{,}318{,}746{,}371$, found by Bertil Nyman in 1999.:cite[nicely-gaps]

## Where the model fails

Try to tell the real primes from the model:

::prime-turing-test

Cramér's model fails the test immediately: it includes even numbers. That is not a small defect. For a property that involves divisibility by small primes, the model's predictions are off by constant factors. The clearest example is twin primes. In the model, $n$ and $n + 2$ are independent, so the expected number of twin pairs up to $x$ is about $\sum 1/\log^2 n \approx \int_2^x dt/\log^2 t$, which is $\sim x/\log^2 x$. The truth, in the chart below, is about $1.32$ times as many.

The fix is to account for small primes. In 1995 Andrew Granville proposed a refined model: first discard the multiples of small primes (up to some slowly growing bound), then keep each survivor with a probability raised just enough to restore the density $1/\log n$.:cite[granville1995] It passes the test above much more convincingly. It also makes a surprising prediction: the largest gaps should occasionally reach $2e^{-\gamma}(\log x)^2 \approx 1.12(\log x)^2$, so Cramér's constant $1$ is probably too small.

## The Hardy–Littlewood conjectures

Thirteen years before Cramér, G. H. Hardy and J. E. Littlewood had already made the corrected predictions, using a different heuristic based on their "circle method" (Chapter 37).:cite[hardy-littlewood1923] For twin primes the heuristic goes like this. For a random pair $(n, n + 2)$, the "probability" that neither is divisible by a given odd prime $p$ is $1 - \frac2p$ (two residues out of $p$ are bad), whereas for two independent numbers it would be $\left(1 - \frac1p\right)^2$. For $p = 2$ it is $\frac12$ (both odd, or neither), against $\frac14$. Multiplying the correction factors,
$$\frac{1/2}{1/4} \prod_{p > 2} \frac{1 - 2/p}{(1 - 1/p)^2} = 2\prod_{p > 2}\left(1 - \frac{1}{(p-1)^2}\right) = 2C_2,$$
where $C_2 = 0.6601618158\ldots$ is the **twin prime constant**.

:::conjecture{name="Hardy–Littlewood, twin primes" year=1923}
The number of primes $p \le x$ with $p + 2$ also prime is
$$\pi_2(x) \sim 2C_2 \int_2^x \frac{dt}{(\log t)^2} \sim 2C_2\frac{x}{(\log x)^2}.$$
:::

::twin-count

The agreement is remarkable: below $10^{10}$ there are $27{,}412{,}679$ twin pairs and the prediction is $27{,}411{,}417$, an error of $0.005\%$. Nobody can prove even that there are infinitely many twin primes, though the bounded gaps theorems of Chapter 36 come close.

The same reasoning applies to any pattern. For a set of shifts $\mathcal{H} = \{h_1, \ldots, h_k\}$, the **prime $k$-tuples conjecture** says that the number of $n \le x$ with $n + h_1, \ldots, n + h_k$ all prime is
$$\sim \mathfrak{S}(\mathcal{H}) \int_2^x \frac{dt}{(\log t)^k}, \qquad \mathfrak{S}(\mathcal{H}) = \prod_p \frac{1 - \nu_p(\mathcal H)/p}{(1 - 1/p)^k},$$
where $\nu_p(\mathcal{H})$ is the number of residues modulo $p$ occupied by $h_1, \ldots, h_k$. The **singular series** $\mathfrak{S}$ is zero exactly when some prime $p$ has all its residues occupied, which makes the pattern impossible (for example $n, n + 2, n + 4$, one of which is always divisible by $3$). It is positive otherwise, and the conjecture says such **admissible** patterns occur infinitely often. Analogous conjectures (Bateman and Horn, 1962) predict how often polynomials such as $n^2 + 1$ are prime.

```quiz
q: Which pattern can occur infinitely often among primes, according to the prime $k$-tuples conjecture?
options:
  - text: $n, n + 2, n + 6$
    correct: true
    why: 'Modulo $2$ the shifts occupy one residue; modulo $3$ they occupy $0, 2, 0$, that is two residues out of three; for larger $p$ there is always a free residue. So the pattern is admissible. Examples: $5, 7, 11$ and $11, 13, 17$.'
  - text: $n, n + 2, n + 4$
    why: 'The shifts $0, 2, 4$ cover all three residues modulo $3$, so one of the three numbers is always divisible by $3$. Only $3, 5, 7$ escapes.'
  - text: $n, n + 1$
    why: One of two consecutive numbers is even. Only $2, 3$ escapes.
```

:::note
**A stopping point.** The last section explains a surprising failure of Cramér's model, and why the subject treats random models as guides rather than truths.
:::

## Maier’s warning

For decades it seemed that Cramér's model, perhaps with Granville's correction, would be reliable for questions about primes in intervals. In particular it predicts that for any fixed $\lambda > 1$, the number of primes in $(x, x + (\log x)^\lambda]$ is asymptotic to the expected $(\log x)^{\lambda - 1}$. In 1985 Helmut Maier proved this false.:cite[maier1985]

:::theorem{name="Maier" year=1985 status=stated}
For each $\lambda > 1$ there is $\delta > 0$ such that
$$\frac{\pi\big(x + (\log x)^\lambda\big) - \pi(x)}{(\log x)^{\lambda - 1}}$$
is greater than $1 + \delta$ for arbitrarily large $x$, and less than $1 - \delta$ for arbitrarily large $x$.
:::

The proof compares intervals starting at multiples of a product of many small primes, where the small primes conspire to make primes more or less likely than average, and the effect does not wash out. The moral is that the influence of small primes is subtle and long-range. Random models are an excellent source of conjectures, and the Hardy–Littlewood predictions have survived every numerical test. But each prediction needs checking, and none of them is a proof.

:::key
- Cramér's model includes each $n$ with probability $1/\log n$, independently. It predicts $\pi(x) = \operatorname{Li}(x) + O(\sqrt x\log x)$ (the Riemann Hypothesis), exponentially distributed gaps, and maximal gaps near $(\log x)^2$.
- It ignores divisibility by small primes and so gets twin primes wrong by the factor $2C_2 \approx 1.32$. Hardy and Littlewood's singular series corrects this, and their twin prime prediction matches the data to $0.005\%$ at $10^{10}$.
- Admissible patterns $n + h_1, \ldots, n + h_k$ should all occur infinitely often (prime $k$-tuples conjecture). None is proved.
- Maier showed that Cramér's model is wrong in short intervals of length $(\log x)^\lambda$.
:::

:::exercises
1. Compute the singular series for the pattern $\{0, 2, 6\}$ to two decimal places, and use it to predict the number of prime triplets $(p, p + 2, p + 6)$ below $10^6$. Count them with a sieve and compare.
2. Show that in Cramér's model the expected number of $n \le x$ with both $n$ and $n + 2$ in $\mathcal{C}$ is $\sim x/\log^2 x$.
3. Show that $\{0, 2, 6, 8, 12\}$ is admissible but $\{0, 2, 4, 6, 8\}$ is not. What is the smallest prime that rules out a pattern of $k$ consecutive even shifts $\{0, 2, \ldots, 2(k-1)\}$?
4. Why does the twin prime constant involve $(p - 1)^2$? Derive $\frac{1 - 2/p}{(1 - 1/p)^2} = 1 - \frac{1}{(p-1)^2}$.
:::
