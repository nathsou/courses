---
number: 23
title: Riemann’s explicit formula
summary: "Perron’s formula recovers ψ(x) from −ζ′/ζ as a contour integral. Moving the contour to the left collects one residue per zero, and the result is an exact formula: the primes are a smooth curve plus a sum of waves, one for each zero of ζ. With the course’s flagship figure, and the duality read in both directions."
duration: About 1½ hours
prerequisites: [zeros]
theorems: [Perron’s formula, The explicit formula for ψ(x), Riemann’s formula for π(x), Zeros and error terms are equivalent]
techniques: [contour integration, residues, Möbius inversion]
---

This is the chapter the course has been building towards since the prologue. Chapter 19 showed that the primes are encoded in the function $-\zeta'/\zeta$; Chapters 20 to 22 found that function's poles. Here the encoding is decoded. The result, found by Riemann in 1859 for $\pi(x)$ and proved by Hans von Mangoldt in 1895 in the cleaner form for $\psi(x)$,:cite[vonmangoldt1895] is an exact formula for the prime staircase in terms of the zeros of $\zeta$.

:::theorem{name="The explicit formula" who="Riemann; von Mangoldt" year=1895 status=sketched}
For $x > 1$,
$$\psi_0(x) = x - \sum_\rho\frac{x^\rho}{\rho} - \log 2\pi - \tfrac12\log\!\left(1 - x^{-2}\right),$$
where $\psi_0(x)$ is $\psi(x)$ except at prime powers, where it is the average of the values just before and just after the jump, and the sum runs over the nontrivial zeros $\rho$ of $\zeta$, counted with multiplicity, in order of increasing $|\operatorname{Im}\rho|$.
:::

Every term has a meaning. The $x$ comes from the pole of $\zeta$ at $s = 1$: it is the prime number theorem's prediction. Each nontrivial zero $\rho$ contributes a correction $-x^\rho/\rho$. The constant $\log 2\pi = \zeta'(0)/\zeta(0)$ comes from $s = 0$, and the last term collects the trivial zeros. Before the proof, see what it does.

::explicit-formula

## Waves

Pair each zero $\rho = \beta + i\gamma$ with its conjugate $\bar\rho = \beta - i\gamma$. Since $x^{\bar\rho}/\bar\rho$ is the complex conjugate of $x^\rho/\rho$,
$$\frac{x^\rho}{\rho} + \frac{x^{\bar\rho}}{\bar\rho} = 2\operatorname{Re}\frac{x^\rho}{\rho} = \frac{2x^\beta}{|\rho|}\cos\big(\gamma\log x - \arg\rho\big).$$
So each pair is a wave in the variable $\log x$, with frequency $\gamma$ and amplitude $2x^\beta/|\rho|$. If the zero is on the critical line, $\beta = \frac12$ and the amplitude is $2\sqrt x/|\rho|$. The low zeros make the slow, large waves, and the high zeros make the fast, small ones. Turn on "show the K-th wave" in the widget to see one at a time.

Adding the waves is like adding the terms of a Fourier series. Few terms give a smooth curve; many terms reproduce the jumps of the staircase, with the small overshoot near each jump (the Gibbs phenomenon) that every truncated Fourier series of a step function has. With $10{,}000$ pairs the reconstruction of $\psi(x)$ up to $2000$ is visually perfect. The button "Hear the zeros" plays the first thirty waves as tones: each pair becomes a sine wave with a pitch proportional to $\gamma$ (the first zero sounds as the note A at $110$ Hz) and loudness proportional to $1/|\rho|$. This is the sense of the phrase "the music of the primes", the title of Marcus du Sautoy's book about the Riemann Hypothesis.

```numeric
id: explicit-formula/first-wave
prompt: Assuming the first zero is $\rho = \frac12 + 14.134725\ldots i$, what is the amplitude $2\sqrt x/|\rho|$ of its wave at $x = 10^6$? Give the nearest integer.
answer: 141
tolerance: 0
hints:
  - '$|\rho| = \sqrt{\frac14 + 14.134725^2} \approx 14.1436$.'
```

## Perron’s formula

The decoding tool is an integral that detects whether a number is bigger or smaller than $1$.

:::lemma{name="Perron" status=proved}
Let $c > 0$ and $y > 0$. Then
$$\frac1{2\pi i}\int_{c - i\infty}^{c + i\infty}\frac{y^s}{s}\,ds = \begin{cases}1 & y > 1,\\ \frac12 & y = 1,\\ 0 & y < 1,\end{cases}$$
where the integral is the limit as $T \to \infty$ of the integral over the segment from $c - iT$ to $c + iT$. More precisely, if $I(y, T)$ is the integral over that segment and $\delta(y)$ is the right side, then for $y \ne 1$,
$$|I(y, T) - \delta(y)| < \frac{y^c}{\pi T|\log y|}.$$
:::

:::proof
Take $y > 1$, so $|y^s| = y^\sigma$ is small when $\sigma$ is very negative. Close the segment into a rectangle by going left to the line $\sigma = -U$. The integrand has one pole inside, at $s = 0$, with residue $y^0 = 1$. On the horizontal sides $|s| \ge T$, so their contribution is at most $\frac1{2\pi}\int_{-U}^c\frac{y^\sigma}{T}d\sigma < \frac{y^c}{2\pi T\log y}$ each. On the left side the integral is at most $\frac{y^{-U}}{2\pi}\cdot\frac{2T}{U}$, which tends to $0$ as $U \to \infty$. By the residue theorem (Appendix A), $I(y, T) = 1 + (\text{error})$ with the stated bound. For $y < 1$, close the rectangle to the right instead: there are no poles, and the same estimates (now with $\sigma \to +\infty$) give $|I(y, T)| < \frac{y^c}{\pi T|\log y|}$. The case $y = 1$ is a direct computation: $\frac1{2\pi}\int_{-T}^T\frac{dt}{c + it} = \frac1\pi\arctan\frac Tc \to \frac12$.
:::

Now apply the lemma to every term of a Dirichlet series. For $c > 1$ and $x$ not an integer,
$$\frac1{2\pi i}\int_{c - i\infty}^{c + i\infty}\left(\sum_n\frac{\Lambda(n)}{n^s}\right)\frac{x^s}{s}\,ds = \sum_n\Lambda(n)\cdot\frac1{2\pi i}\int_{c - i\infty}^{c + i\infty}\frac{(x/n)^s}{s}\,ds = \sum_{n < x}\Lambda(n) = \psi(x),$$
because the inner integral is $1$ for $n < x$ and $0$ for $n > x$. (At a prime power $x = n$ it is $\frac12$, which is why $\psi_0$ appears.) Exchanging sum and integral needs care, since the integral converges only conditionally; the error bound in the lemma handles it, and gives a version with a finite segment that is used in practice:

:::theorem{name="Perron’s formula for ψ" status=sketched}
For $x \ge 2$, $T \ge 2$ and $c = 1 + \frac1{\log x}$,
$$\psi(x) = \frac1{2\pi i}\int_{c - iT}^{c + iT}\left(-\frac{\zeta'(s)}{\zeta(s)}\right)\frac{x^s}{s}\,ds + O\!\left(\frac{x\log^2 x}{T} + \log x\right).$$
:::

Summing the lemma's error bound $\frac{(x/n)^c}{\pi T|\log(x/n)|}$ against $\Lambda(n)n^{-c}$ gives the error term; the only delicate part is $n$ close to $x$, where $|\log(x/n)|$ is small, and there are few prime powers there.

## Moving the line

The integrand $-\frac{\zeta'(s)}{\zeta(s)}\frac{x^s}{s}$ is meromorphic on the whole plane. Push the segment from $\sigma = c$ to the left, to $\sigma = -U$ for a large odd integer $U$, and keep track of the poles crossed. Each one contributes its residue:

| Pole | Why | Residue of $-\frac{\zeta'}{\zeta}\frac{x^s}{s}$ |
| --- | --- | --- |
| $s = 1$ | $\zeta$ has a simple pole, so $\frac{\zeta'}{\zeta}$ has residue $-1$ | $x$ |
| $s = \rho$, a zero of order $m$ | $\frac{\zeta'}{\zeta}$ has residue $m$ | $-m\frac{x^\rho}{\rho}$ |
| $s = 0$ | the factor $\frac1s$ | $-\frac{\zeta'(0)}{\zeta(0)} = -\log 2\pi$ |
| $s = -2n$, a trivial zero | $\frac{\zeta'}{\zeta}$ has residue $1$ | $\frac{x^{-2n}}{2n}$ |

(The value $\zeta'(0)/\zeta(0) = \log 2\pi$ is exercise 3 of Chapter 21.) The trivial zeros add up to $\sum_{n \ge 1}\frac{x^{-2n}}{2n} = -\frac12\log(1 - x^{-2})$. So, as long as the integrals over the three new sides of the rectangle tend to $0$,
$$\psi(x) = x - \sum_{|\operatorname{Im}\rho| < T}\frac{x^\rho}{\rho} - \log 2\pi - \tfrac12\log\!\left(1 - x^{-2}\right) + (\text{error} \to 0).$$

::::zoom{levels="Idea, Sketch"}
:::level[Idea]
The residue theorem turns the vertical integral into a sum of residues plus the integrals along the top, bottom and far-left sides of a rectangle. The far-left side vanishes because $x^s$ is tiny there. The top and bottom sides vanish as $T \to \infty$ provided $\zeta'/\zeta$ is not too large on them, which is arranged by choosing $T$ to stay away from the ordinates of zeros.
:::
:::level[Sketch]
Two estimates are needed, both consequences of the Hadamard product (Chapter 21) and of the zero count $N(T + 1) - N(T) = O(\log T)$ (Chapter 22).

1. For $-1 \le \sigma \le 2$, $\frac{\zeta'}{\zeta}(s) = \sum_{|\gamma - t| < 1}\frac{1}{s - \rho} + O(\log|t|)$. In each interval $[T, T + 1]$ one can therefore choose a height $T'$ at distance at least $\frac{c}{\log T}$ from every $\gamma$, and on the horizontal segment at height $T'$, $\left|\frac{\zeta'}{\zeta}(s)\right| = O(\log^2 T)$.
2. For $\sigma \le -1$, away from the trivial zeros, the functional equation gives $\left|\frac{\zeta'}{\zeta}(s)\right| = O(\log|s|)$.

On the horizontal sides the integrand is then $O\!\left(\frac{x^\sigma\log^2 T}{T}\right)$, whose integral over $\sigma \le c$ is $O\!\left(\frac{x\log^2 T}{T\log x}\right)$. On the left side it is $O\!\left(\frac{x^{-U}\log U}{U}\right)T$, which vanishes as $U \to \infty$. Combined with Perron's formula, $\psi(x) = x - \sum_{|\gamma| < T}\frac{x^\rho}{\rho} - \log 2\pi - \frac12\log(1 - x^{-2}) + O\!\left(\frac{x\log^2(xT)}{T} + \log x\right)$, and letting $T \to \infty$ gives the explicit formula at points of continuity. Davenport's book, chapter 17, gives every detail.:cite[davenport]
:::
::::

The truncated form is the useful one: it says how many zeros are needed to compute $\psi(x)$ to a given accuracy.

```code
id: explicit-formula/psi
title: The explicit formula
prompt: |
  Write `explicitPsi(x, gammas)`, which evaluates the right side of the explicit formula using the zeros $\rho = \frac12 \pm i\gamma$ for each $\gamma$ in the array `gammas` (all on the critical line). Pair each zero with its conjugate: the pair contributes $2\operatorname{Re}(x^\rho/\rho)$, where $x^\rho = \sqrt x\,(\cos(\gamma\log x) + i\sin(\gamma\log x))$ and $\frac1\rho = \frac{\frac12 - i\gamma}{\frac14 + \gamma^2}$.
starter: |
  export function explicitPsi(x: number, gammas: readonly number[]): number {
    let s = x - Math.log(2 * Math.PI) - 0.5 * Math.log(1 - 1 / (x * x));
    // Subtract the contribution of each pair of zeros.
    return s;
  }
tests: |
  import { test, expect } from 'test';
  import { explicitPsi } from 'solution';
  import { ZEROS, psiExact } from 'primes';

  test('no zeros: the smooth term', () => {
    expect(explicitPsi(10, [])).toBeCloseTo(10 - Math.log(2 * Math.PI) - 0.5 * Math.log(0.99), 10);
  });
  test('one pair of zeros', () => {
    expect(explicitPsi(10, [14.134725141734693])).toBeCloseTo(7.7561, 3);
  });
  test('100 zeros reproduce ψ(x) between prime powers', () => {
    for (const [x, tol] of [[10.5, 0.05], [20.5, 0.1], [50.5, 0.1], [75.5, 0.1]]) {
      expect(Math.abs(explicitPsi(x, ZEROS) - psiExact(x))).toBeLessThan(tol);
    }
  });
  test('more zeros, smaller error', () => {
    const xs = [12.5, 24.5, 36.5, 48.5, 60.5, 72.5, 84.5, 96.5];
    const err = (k) => xs.reduce((s, x) => s + Math.abs(explicitPsi(x, ZEROS.slice(0, k)) - psiExact(x)), 0);
    expect(err(100)).toBeLessThan(err(10));
    expect(err(10)).toBeLessThan(err(0));
  });
solution: |
  export function explicitPsi(x: number, gammas: readonly number[]): number {
    let s = x - Math.log(2 * Math.PI) - 0.5 * Math.log(1 - 1 / (x * x));
    const L = Math.log(x);
    const r = Math.sqrt(x);
    for (const g of gammas) {
      // x^ρ/ρ = √x (cos + i sin)(½ − iγ)/(¼ + γ²); its real part, doubled.
      s -= (2 * r * (0.5 * Math.cos(g * L) + g * Math.sin(g * L))) / (0.25 + g * g);
    }
    return s;
  }
hints:
  - '$\operatorname{Re}\big[(\cos\phi + i\sin\phi)(\frac12 - i\gamma)\big] = \frac12\cos\phi + \gamma\sin\phi$, with $\phi = \gamma\log x$.'
```

## Riemann’s formula for π(x)

Riemann worked with $\pi(x)$ directly, through the weighted count
$$J(x) = \sum_{p^k \le x}\frac1k = \pi(x) + \tfrac12\pi(x^{1/2}) + \tfrac13\pi(x^{1/3}) + \cdots,$$
whose Dirichlet series is $\log\zeta(s) = \sum_{p, k}\frac{1}{k}p^{-ks}$ (Chapter 19). Perron's formula with $\log\zeta$ in place of $-\zeta'/\zeta$, and the same contour shift (now with logarithmic singularities, handled by integrating by parts first), gives the formula Riemann wrote down in 1859:
$$J(x) = \operatorname{li}(x) - \sum_\rho\operatorname{li}(x^\rho) - \log 2 + \int_x^\infty\frac{dt}{t(t^2 - 1)\log t}.$$
Here $\operatorname{li}$ is the logarithmic integral (Chapter 14), and $\operatorname{li}(x^\rho)$ means $\operatorname{Ei}(\rho\log x)$, the analytic continuation. Then Möbius inversion (Chapter 19) recovers $\pi$ from $J$: since $J(x) = \sum_n\frac1n\pi(x^{1/n})$,
$$\pi(x) = \sum_{n \ge 1}\frac{\mu(n)}{n}J(x^{1/n}),$$
a finite sum because $J(y) = 0$ for $y < 2$. Applying the same inversion to the main term $\operatorname{li}(x)$ alone gives **Riemann's function**
$$R(x) = \sum_{n \ge 1}\frac{\mu(n)}{n}\operatorname{li}(x^{1/n}),$$
a remarkably good smooth approximation to $\pi(x)$: $\pi(10^{20}) \approx 2.22 \times 10^{18}$, and $R(10^{20})$ is within about $4.9 \times 10^{6}$ of it, while $\operatorname{Li}(10^{20})$ is off by about $2.2 \times 10^{8}$. Switch the widget to $\pi(x)$ to see $R(x)$ (dashed) and the waves added to it.

## The duality

The explicit formula is a two-way street.

**From zeros to primes.** If we knew the zeros, we would know the primes: the widget above does exactly that.

**From primes to zeros.** If we know the primes, we can find the zeros. The sum $\sum_{n \le X}\Lambda(n)n^{-1/2 - it}$ is a partial sum of $-\frac{\zeta'}{\zeta}(\frac12 + it)$, which has a pole at each zero $\frac12 + i\gamma$. Smoothed and with the pole at $s = 1$ removed, it spikes at the heights $\gamma$:

::prime-spectrum

The zeros are the frequencies present in the primes, and the primes are the spectrum of the zeros. One side is arithmetic, the other analytic, and the explicit formula is the dictionary.

## Zeros control the error

The size of each wave is $2x^\beta/|\rho|$. So the largest real part $\beta$ among the zeros controls how far $\psi(x)$ can stray from $x$.

:::theorem{status=sketched}
Let $\Theta = \sup\operatorname{Re}\rho$ over all nontrivial zeros, so $\frac12 \le \Theta \le 1$. Then for every $\varepsilon > 0$,
$$\psi(x) = x + O_\varepsilon\!\left(x^{\Theta + \varepsilon}\right),$$
and $\Theta$ is the smallest exponent for which this holds. In particular the Riemann Hypothesis ($\Theta = \frac12$) is equivalent to $\psi(x) = x + O(x^{1/2 + \varepsilon})$ for every $\varepsilon > 0$.
:::

One direction is the truncated explicit formula: with $T = x$, the sum over the $O(T\log T)$ zeros with $|\gamma| < T$ is at most $\sum\frac{2x^\Theta}{|\rho|} = O(x^\Theta\log^2 x)$. (Under the Riemann Hypothesis this gives the classical bound $\psi(x) = x + O(\sqrt x\log^2 x)$ of Helge von Koch, 1901.) The other direction is exercise 4: an error term $O(x^{\Theta'})$ makes $-\zeta'/\zeta$ analytic for $\sigma > \Theta'$, leaving no room for zeros there.

So the Riemann Hypothesis is a statement about primes: it says that the prime staircase hugs its smooth curve as tightly as a random walk would. Part VI is about that statement. But first, Part V uses the same ideas with much less information about the zeros (only that none lies on the line $\sigma = 1$) to prove that $\psi(x) \sim x$: the prime number theorem.

:::key
- Perron's formula: $\frac1{2\pi i}\int_{(c)}\frac{y^s}{s}ds$ is $1$ for $y > 1$ and $0$ for $y < 1$, so $\psi(x) = \frac1{2\pi i}\int_{(c)}\left(-\frac{\zeta'}{\zeta}(s)\right)\frac{x^s}{s}ds$.
- Moving the line left collects residues: $x$ from the pole, $-x^\rho/\rho$ from each zero, $-\log 2\pi$ from $s = 0$, and the trivial zeros. Result: $\psi_0(x) = x - \sum_\rho\frac{x^\rho}{\rho} - \log 2\pi - \frac12\log(1 - x^{-2})$.
- Each pair of zeros is a wave of frequency $\gamma$ in $\log x$ and amplitude $2x^\beta/|\rho|$. Enough waves rebuild the staircase exactly; conversely the primes, as a sum of waves $n^{-it}$, resonate at the zeros.
- Riemann's form: $J(x) = \operatorname{li}(x) - \sum_\rho\operatorname{li}(x^\rho) - \log 2 + \int_x^\infty\frac{dt}{t(t^2-1)\log t}$, and $\pi(x) = \sum\frac{\mu(n)}{n}J(x^{1/n})$.
- $\psi(x) - x = O(x^{\Theta + \varepsilon})$ exactly when no zero has real part above $\Theta$. RH is the case $\Theta = \frac12$.
:::

:::exercises
1. Show that the trivial zeros contribute $\sum_{n \ge 1}\frac{x^{-2n}}{2n} = -\frac12\log(1 - x^{-2})$, and that this is less than $0.07$ for $x \ge 4$.
2. Show that $\sum_\rho\frac{1}{|\rho|}$ diverges but $\sum_\rho\frac1{|\rho|^2}$ converges, using $N(T) \sim \frac{T}{2\pi}\log T$. What does this say about the convergence of the explicit formula?
3. Using the explicit formula with only the first pair of zeros, estimate $\psi(10)$ and compare with the exact value $\psi(10) = \log(2^3\cdot3^2\cdot5\cdot7) = \log 2520 \approx 7.832$.
4. Show that $-\frac{\zeta'(s)}{\zeta(s)} = s\int_1^\infty\psi(x)x^{-s-1}dx$ for $\sigma > 1$, and hence $-\frac{\zeta'(s)}{\zeta(s)} = \frac{s}{s-1} + s\int_1^\infty(\psi(x) - x)x^{-s-1}dx$. Deduce that if $\psi(x) - x = O(x^{\Theta})$ then $\zeta$ has no zeros with $\sigma > \Theta$.
5. In the prime spectrum widget, why do the peaks get sharper as $X$ grows? Estimate their width in terms of $\log X$. (A sum of $\cos(t\log n)$ over $n \le X$ cannot resolve frequencies closer than about $2\pi/\log X$.)
:::
