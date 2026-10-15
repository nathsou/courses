---
number: 29
title: Faces of the Riemann Hypothesis
summary: "The same conjecture in other clothes: the Möbius random walk, Mertens’ conjecture and how it fell, Redheffer’s matrix whose determinant is the Mertens function, and the elementary-looking inequalities of Robin and Lagarias about sums of divisors."
duration: About 1¼ hours
prerequisites: [riemann-hypothesis]
theorems: [RH ⇔ M(x) = O(x^(1/2+ε)), Mertens’ conjecture is false (Odlyzko–te Riele), det Redheffer = M(n), Robin’s criterion, Lagarias’ criterion]
techniques: [Dirichlet series and summatory functions, the matrix determinant lemma, extremal arithmetic functions]
---

The Riemann Hypothesis has an unusual number of equivalent formulations, some of which make no mention of complex numbers at all. This chapter collects the most striking ones. Each is a different window on the same fact, and some suggested lines of attack that turned out to be dead ends.

## The Möbius walk

Recall the Möbius function: $\mu(n) = (-1)^k$ if $n$ is a product of $k$ distinct primes, and $0$ if $n$ has a square factor. Its running total is the **Mertens function**
$$M(x) = \sum_{n \le x}\mu(n).$$
Think of it as a walk: at each square-free $n$ it steps up or down according to the parity of the number of prime factors, and it pauses at the other $n$. If the parities behaved like coin flips, the walk would wander a distance of about $\sqrt x$.

::mobius-walk

:::theorem{who="Littlewood" year=1912 status=sketched}
The Riemann Hypothesis is equivalent to $M(x) = O(x^{1/2 + \varepsilon})$ for every $\varepsilon > 0$. And the prime number theorem is equivalent to $M(x) = o(x)$.
:::

:::proof
By Abel summation, for $\operatorname{Re}s > 1$,
$$\frac{1}{\zeta(s)} = \sum_{n \ge 1}\frac{\mu(n)}{n^s} = s\int_1^\infty\frac{M(x)}{x^{s+1}}\,dx.$$
If $M(x) = O(x^{1/2 + \varepsilon})$ for every $\varepsilon$, the integral converges absolutely and locally uniformly for $\operatorname{Re}s > \frac12$, so $1/\zeta$ is holomorphic there, and $\zeta$ has no zeros with $\operatorname{Re}s > \frac12$. That is RH. The converse uses Perron’s formula for $M(x)$ with $1/\zeta(s)$, moving the line to $\operatorname{Re}s = \frac12 + \varepsilon$; it needs the bound $1/\zeta(\sigma + it) = O(|t|^\varepsilon)$ for $\sigma > \frac12$, which follows from RH by a convexity argument. The equivalence with the PNT is due to Landau (1899); Chapter 26, exercise 4, shows what Newman’s method gives for $M(x)$ directly.
:::

So RH says that the Möbius function is “as random as a coin”: its partial sums show square-root cancellation. This is one of the guiding principles of analytic number theory, sometimes called the **Möbius randomness principle**: $\mu$ should not correlate with any “simple” sequence. A recent conjecture of Peter Sarnak makes this precise for sequences of low complexity.

## Mertens’ conjecture

In 1897 Franz Mertens computed $M(x)$ up to $10{,}000$ and conjectured that
$$|M(x)| < \sqrt x \qquad\text{for all } x > 1.$$
This is stronger than RH (it would imply RH, by the theorem above), and the data in the widget support it: Greg Hurst checked in 2018 that $|M(x)| < 0.571\sqrt x$ for all $x \le 10^{16}$.:cite[hurst2018] Thomas Stieltjes had even claimed in 1885 that he could prove $M(x) = O(\sqrt x)$. He never published a proof.

:::theorem{name="Mertens’ conjecture is false" who="Odlyzko; te Riele" year=1985 status=stated}
$$\limsup_{x \to \infty}\frac{M(x)}{\sqrt x} > 1.06, \qquad \liminf_{x \to \infty}\frac{M(x)}{\sqrt x} < -1.009.$$
:::

Andrew Odlyzko and Herman te Riele proved this in 1985 without finding any $x$ where $|M(x)| > \sqrt x$.:cite[odlyzko-teriele1985] Hurst later improved the bounds to $1.826$ and $-1.837$. No counterexample is known; Pintz showed in 1987 that one exists below $\exp(3.21 \times 10^{64})$.

How can one disprove an inequality without a counterexample? Through the explicit formula. If all zeros of $\zeta$ are simple,
$$\frac{M(x)}{\sqrt x} \approx \sum_\gamma 2\operatorname{Re}\frac{x^{i\gamma}}{\rho\,\zeta'(\rho)}$$
plus small terms: an almost periodic function of $\log x$, a sum of waves with frequencies $\gamma$ and fixed amplitudes $\frac{2}{|\rho\zeta'(\rho)|}$. If the frequencies $\gamma$ are linearly independent over $\Q$ (which is expected, though unproved), then by Kronecker’s theorem the phases $\gamma\log x$ can be made to line up as closely as we like, and the sum gets as large as the sum of the amplitudes, which diverges. So $M(x)/\sqrt x$ should be unbounded. Ingham showed in 1942 that Mertens’ conjecture would force linear relations among the $\gamma$. Odlyzko and te Riele computed the first $2000$ zeros to high precision and used lattice basis reduction (the LLL algorithm) to find values of $\log x$ where the largest few dozen waves nearly align, which pushed the sum above $1$.

The moral, which also applies to Chapter 30: a quantity can obey an inequality for every $x$ we can compute, and still violate it eventually, because the waves that eventually align have frequencies whose common period, in $\log x$, is astronomically long.

## Redheffer’s matrix

Here is the Riemann Hypothesis as a statement about determinants of $0$–$1$ matrices. Ray Redheffer defined in 1977 the $n \times n$ matrix $A_n$ with entries
$$a_{ij} = \begin{cases}1 & \text{if } j = 1 \text{ or } i \mid j,\\ 0 & \text{otherwise.}\end{cases}$$

::redheffer

:::theorem{name="Redheffer" year=1977 status=proved}
$\det A_n = M(n)$. Hence RH is equivalent to $\det A_n = O(n^{1/2 + \varepsilon})$ for every $\varepsilon > 0$.
:::

:::proof
Let $D$ be the divisibility matrix, $d_{ij} = 1$ if $i \mid j$ and $0$ otherwise. It is upper triangular with ones on the diagonal, so $\det D = 1$, and Möbius inversion (Chapter 19) says its inverse is $D^{-1}_{ij} = \mu(j/i)$ when $i \mid j$ and $0$ otherwise. The first column of $D$ is $e_1$ (only $1$ divides $1$), while the first column of $A_n$ is all ones; elsewhere they agree. So $A_n = D + u\,e_1^{\mathsf T}$ with $u = \mathbf 1 - e_1$. By the **matrix determinant lemma**, $\det(D + ue_1^{\mathsf T}) = \det D\,(1 + e_1^{\mathsf T}D^{-1}u)$. The first row of $D^{-1}$ is $(\mu(1), \mu(2), \ldots, \mu(n))$, so $e_1^{\mathsf T}D^{-1}u = \mu(2) + \cdots + \mu(n) = M(n) - 1$, and $\det A_n = M(n)$.
:::

The determinant of a matrix whose entries are $0$ and $1$ in a simple pattern grows no faster than $n^{1/2 + \varepsilon}$, if and only if RH holds. Its spectrum has been studied in the hope of attacking RH this way: the eigenvalue $1$ has multiplicity $n - \lfloor\log_2n\rfloor - 1$ and the largest eigenvalue is about $\sqrt n$, but the remaining eigenvalues, which control the determinant, have resisted analysis.

## Sums of divisors: Robin and Lagarias

Let $\sigma(n)$ be the sum of the divisors of $n$. On average $\sigma(n)/n$ is about $\frac{\pi^2}{6}$, but for numbers with many small prime factors it is larger. Thomas Gronwall proved in 1913 that
$$\limsup_{n \to \infty}\frac{\sigma(n)}{n\log\log n} = e^\gamma \approx 1.781.$$
The extreme $n$ are products of the first few primes with decreasing exponents, like $5040 = 2^4\cdot3^2\cdot5\cdot7$. Their ratio $\frac{\sigma(n)}{n} = \prod_{p^k \| n}\frac{1 - p^{-k-1}}{1 - p^{-1}}$ is close to $\prod_{p \le y}\frac{1}{1 - 1/p} \approx e^\gamma\log y$ by Mertens’ third theorem (Chapter 19), which explains the constant.

:::theorem{name="Robin’s criterion" who="Robin" year=1984 status=stated}
The Riemann Hypothesis is true if and only if
$$\sigma(n) < e^\gamma\,n\log\log n \qquad\text{for every } n > 5040.$$
:::

::robin-plot

Guy Robin also proved, unconditionally, that $\sigma(n) < e^\gamma n\log\log n + \frac{0.6483\,n}{\log\log n}$ for $n \ge 3$.:cite[robin1984] If RH is false, there are infinitely many exceptions; the first would have to be enormous, since the inequality has been checked far beyond $10^{10}$ for the numbers most likely to violate it. In 2002 Jeffrey Lagarias rewrote the criterion with no constants at all, using the harmonic numbers $H_n = 1 + \frac12 + \cdots + \frac1n$.:cite[lagarias2002]

:::theorem{name="Lagarias’ criterion" who="Lagarias" year=2002 status=stated}
The Riemann Hypothesis is true if and only if, for every $n \ge 1$,
$$\sigma(n) \le H_n + e^{H_n}\log H_n,$$
with equality only for $n = 1$.
:::

An elementary inequality about divisor sums, checkable by a short program for any given $n$, is equivalent to the hardest problem in mathematics. (There is no contradiction: the difficulty is in "for every $n$".)

```code
id: faces/lagarias
title: Check Lagarias’ inequality
prompt: |
  Write `lagariasViolations(N)`, which returns the list of $n \le N$ with $\sigma(n) > H_n + e^{H_n}\log H_n$ (it should be empty), and `lagariasTightest(N)`, which returns the $n$ with $2 \le n \le N$ where the ratio $\sigma(n)/(H_n + e^{H_n}\log H_n)$ is largest. Compute $\sigma$ for all $n \le N$ at once with a divisor sieve: for each $d$, add $d$ to every multiple of $d$.
starter: |
  export function lagariasViolations(N: number): number[] {
    return [-1];
  }

  export function lagariasTightest(N: number): number {
    return 0;
  }
tests: |
  import { test, expect } from 'test';
  import { lagariasViolations, lagariasTightest } from 'solution';

  test('no violations up to 100,000', () => {
    expect(lagariasViolations(100000)).toEqual([]);
  });
  test('the tightest case up to 10,000 is a highly composite number', () => {
    const n = lagariasTightest(10000);
    expect([12, 60, 120, 360, 2520, 5040]).toContain(n);
  });
solution: |
  function sigmas(N: number): Float64Array {
    const s = new Float64Array(N + 1);
    for (let d = 1; d <= N; d++) for (let m = d; m <= N; m += d) s[m] += d;
    return s;
  }

  export function lagariasViolations(N: number): number[] {
    const s = sigmas(N);
    const out: number[] = [];
    let H = 0;
    for (let n = 1; n <= N; n++) {
      H += 1 / n;
      if (s[n] > H + Math.exp(H) * Math.log(H) + 1e-9) out.push(n);
    }
    return out;
  }

  export function lagariasTightest(N: number): number {
    const s = sigmas(N);
    let H = 1;
    let best = 0;
    let arg = 0;
    for (let n = 2; n <= N; n++) {
      H += 1 / n;
      const r = s[n] / (H + Math.exp(H) * Math.log(H));
      if (r > best) {
        best = r;
        arg = n;
      }
    }
    return arg;
  }
hints:
  - 'Keep a running harmonic number: $H_n = H_{n-1} + 1/n$.'
  - 'At $n = 1$ the two sides are equal ($\sigma(1) = 1 = H_1 + e\log 1$); compare with a small tolerance for rounding.'
```

## More faces

The list goes on. A few more, to show the variety:

- **Nyman–Beurling (1950, 1955).** RH holds if and only if the constant function $1$ on $(0, 1)$ can be approximated arbitrarily well, in the mean square sense, by combinations of the functions $x \mapsto \{\theta/x\}$ with $0 < \theta \le 1$.
- **Li’s criterion (1997).** RH holds if and only if the numbers $\lambda_n = \sum_\rho\left[1 - \left(1 - \frac1\rho\right)^n\right]$ are nonnegative for all $n \ge 1$.
- **Farey fractions (Franel and Landau, 1924).** RH holds if and only if the Farey fractions of order $N$ are spaced so evenly that the sum of their distances from the equally spaced points is $O(N^{1/2 + \varepsilon})$.
- **Weil’s positivity criterion**, and its relatives, phrase RH as positivity of a quadratic form built from the explicit formula. This is the template of the finite-field proofs of Chapter 32.

:::key
- $M(x) = \sum_{n \le x}\mu(n)$; $1/\zeta(s) = s\int M(x)x^{-s-1}dx$. RH ⇔ $M(x) = O(x^{1/2 + \varepsilon})$: the Möbius function cancels like random signs.
- Mertens’ conjecture $|M(x)| < \sqrt x$ is false (Odlyzko–te Riele, 1985), though no counterexample is known: the explicit formula makes $M(x)/\sqrt x$ an almost periodic sum of waves whose amplitudes have a divergent sum.
- Redheffer: $\det A_n = M(n)$ for a simple $0$–$1$ matrix, by the matrix determinant lemma and Möbius inversion.
- Robin: RH ⇔ $\sigma(n) < e^\gamma n\log\log n$ for $n > 5040$. Lagarias: RH ⇔ $\sigma(n) \le H_n + e^{H_n}\log H_n$ for all $n$.
:::

:::exercises
1. Compute $M(n)$ for $n \le 20$ by hand and check that $|M(n)| < \sqrt n$ for $2 \le n \le 20$.
2. Show that Mertens’ conjecture implies RH, and moreover that every zero of $\zeta$ is simple. (Use $\frac{1}{\zeta(s)} = s\int_1^\infty M(x)x^{-s-1}dx$ near a zero on the critical line.)
3. Prove the matrix determinant lemma $\det(D + uv^{\mathsf T}) = \det D\,(1 + v^{\mathsf T}D^{-1}u)$ for invertible $D$.
4. Show that $\frac{\sigma(n)}{n} = \sum_{d \mid n}\frac1d$, and deduce Gronwall’s lower bound: for $n = \prod_{p \le y}p^{k}$ with $k$ large, $\frac{\sigma(n)}{n}$ is close to $\prod_{p \le y}\frac{1}{1 - 1/p}$.
5. Find all $n \le 100$ for which $\sigma(n)/n$ is larger than $\sigma(m)/m$ for every $m < n$ (the **superabundant** numbers). Which of them appear in the widget’s list of exceptions?
:::
