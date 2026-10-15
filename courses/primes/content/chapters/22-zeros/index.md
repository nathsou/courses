---
number: 22
title: Finding the zeros
summary: "Hardy’s Z function turns zeros on the critical line into sign changes. The Riemann–Siegel formula computes it with √t terms, Gram points organise the search, and the argument principle counts the zeros exactly: N(T) = θ(T)/π + 1 + S(T). You write a zero finder."
duration: About 1½ hours
prerequisites: [functional-equation]
theorems: [Z(t) is real, The Riemann–Siegel formula, The Riemann–von Mangoldt formula, Hardy’s theorem]
techniques: [sign changes and bisection, the argument principle, Gram points, Turing’s method]
---

Chapter 21 showed that the nontrivial zeros lie in the critical strip, symmetric about the line $\sigma = \frac12$, and that $\xi$ is real on that line. This chapter turns that observation into an algorithm. By the end you will have found the first hundred zeros yourself and checked that there are no others below height $100$, anywhere in the strip.

## Hardy’s Z function

On the critical line, $\xi(\frac12 + it)$ is real but awkward: it decays like $e^{-\pi t/4}$. Divide out everything except $\zeta$ and a phase. Write
$$\pi^{-s/2}\,\Gamma\!\left(\tfrac s2\right) = \left|\pi^{-s/2}\,\Gamma\!\left(\tfrac s2\right)\right|e^{i\theta(t)} \quad\text{at } s = \tfrac12 + it,$$
so that $\theta(t) = \arg\Gamma(\frac14 + \frac{it}{2}) - \frac t2\log\pi$, with the argument chosen to vary continuously from $\theta(0) = 0$. This is the **Riemann–Siegel theta function**.

:::definition
**Hardy's Z function** is $Z(t) = e^{i\theta(t)}\,\zeta(\tfrac12 + it)$.
:::

:::proposition{status=proved}
$Z(t)$ is real for real $t$, and $|Z(t)| = |\zeta(\frac12 + it)|$. So the zeros of $\zeta$ on the critical line are exactly the real zeros of $Z$.
:::

:::proof
At $s = \frac12 + it$, $\frac12 s(s-1) = -\frac12(t^2 + \frac14)$, so
$$\xi(\tfrac12 + it) = -\tfrac12\left(t^2 + \tfrac14\right)\left|\pi^{-s/2}\Gamma(\tfrac s2)\right|\,e^{i\theta(t)}\zeta(\tfrac12 + it) = -\tfrac12\left(t^2 + \tfrac14\right)\left|\pi^{-s/2}\Gamma(\tfrac s2)\right| Z(t).$$
The left side is real (Chapter 21) and the factor in front of $Z(t)$ is real and nonzero, so $Z(t)$ is real. The modulus statement is clear since $|e^{i\theta}| = 1$.
:::

Stirling's formula for $\log\Gamma$ (Appendix D) gives a fast expansion:
$$\theta(t) = \frac t2\log\frac{t}{2\pi} - \frac t2 - \frac\pi8 + \frac{1}{48t} + \frac{7}{5760t^3} + \cdots$$

So a zero on the critical line is a sign change of a real function, and a sign change of a continuous real function certainly has a zero between. That is why zeros on the line can be *proved* to be exactly on it by finite computation: a sign change cannot be an approximation error once the computed values are known to be accurate to better than their size. A zero off the line, by contrast, would not show up as a sign change at all.

::z-plot

Hardy used $Z$ in 1914 to prove the first theorem about zeros on the line.:cite[hardy1914]

:::theorem{name="Hardy" year=1914 status=stated}
Infinitely many zeros of $\zeta$ lie on the critical line.
:::

The idea: if $Z(t)$ had constant sign for $t > T_0$, then $\int_T^{2T}Z(t)\,dt$ would be as large as $\int_T^{2T}|Z(t)|\,dt$; Hardy showed that the first integral is much smaller than the second, by computing integrals of $\zeta$ along vertical lines. Since then, the fraction of zeros known to lie on the line has grown: a positive proportion (Selberg, 1942), more than a third (Levinson, 1974), more than two-fifths (Conrey, 1989), and more than five-twelfths (Pratt, Robles, Zaharescu and Zeindler, 2020).:cite[pratt2020] The Riemann Hypothesis says the fraction is $1$.

## Computing Z quickly: Riemann–Siegel

The Euler–Maclaurin method of Chapter 20 needs about $|t|/(2\pi)$ terms to evaluate $\zeta(\frac12 + it)$. In 1932 Carl Ludwig Siegel, reading Riemann's unpublished notes in Göttingen, found that Riemann had used a far better formula, which he had never published.:cite[siegel1932]

:::theorem{name="Riemann–Siegel formula" who="Riemann; Siegel" year=1932 status=stated}
Let $a = \sqrt{t/2\pi}$, $N = \lfloor a\rfloor$ and $p = a - N$. Then
$$Z(t) = 2\sum_{n=1}^N\frac{\cos\big(\theta(t) - t\log n\big)}{\sqrt n} + (-1)^{N-1}a^{-1/2}\left(C_0(p) + \frac{C_1(p)}{a} + \cdots\right),\qquad C_0(p) = \frac{\cos 2\pi(p^2 - p - \frac1{16})}{\cos 2\pi p}.$$
The error after the $C_0$ term is $O(t^{-3/4})$.
:::

The main sum has only $\sqrt{t/2\pi}$ terms. At $t = 10^6$ that is $398$ terms instead of about $160{,}000$. The formula comes from the functional equation, which says that $\zeta(s)$ is the sum of its own series up to $\sqrt{t/2\pi}$ plus a reflected copy of the series for $\zeta(1 - s)$ up to the same point, with a correction found by a saddle-point integral. The toggle in the widget overlays the main sum on the exact $Z(t)$: it is already a good approximation, and the $C_0$ term makes it excellent.

```quiz
q: 'Roughly how many terms does the Riemann–Siegel main sum use at height $t = 10^{12}$?'
options:
  - text: About $400{,}000$
    correct: true
    why: '$\sqrt{10^{12}/2\pi} \approx 398{,}942$.'
  - text: About $160$ billion
    why: That is $t/2\pi$, the number of terms that Euler–Maclaurin would need.
  - text: About $28$
    why: 'That is about $\log t$ ($\log 10^{12} \approx 27.6$), not the number of terms.'
```

## Gram points

Where should one look for sign changes? The main sum's first term is $2\cos\theta(t)$, and the others oscillate faster and are smaller on average. So $Z(t)$ tends to have the sign of $\cos\theta(t)$, which is $(-1)^n$ at the points where $\theta(t) = n\pi$.

:::definition
The **Gram points** $g_n$ are the solutions of $\theta(g_n) = n\pi$ for $n = -1, 0, 1, 2, \ldots$ ($g_{-1} \approx 9.667$, $g_0 \approx 17.846$, $g_1 \approx 23.170$). **Gram's law** is the statement $(-1)^nZ(g_n) > 0$.
:::

If Gram's law holds at $g_{n-1}$ and $g_n$, then $Z$ changes sign between them, so there is a zero on the line in $(g_{n-1}, g_n)$. Gram's law holds for the first $126$ Gram points and then fails at $g_{126} \approx 282.455$, where $Z(g_{126}) \approx -0.028$ (the "Gram's law fails" preset). Higher up it fails more and more often, so it is a heuristic, not a law; but searching between Gram points, and looking harder in the rare intervals where the count comes out wrong, is how zeros are found in practice. Jørgen Gram used it in 1903 to locate the first $15$ zeros.

Most of the time the zeros are well separated: the average gap at height $t$ is $2\pi/\log(t/2\pi)$. But sometimes two zeros come very close and $Z$ barely crosses the axis between them. The "Lehmer's pair" preset shows the zeros at $t \approx 7005.0629$ and $7005.1006$, found by D. H. Lehmer in 1956, where $Z$ peaks at only about $0.004$ in between. **Lehmer pairs** are where the Riemann Hypothesis comes closest to failing: a small deformation of $\zeta$, in a sense made precise by de Bruijn and Newman, would push such a pair off the line.

```code
id: zeros/finder
title: Find the zeros
prompt: |
  Write `zerosUpTo(T)`, which returns the ordinates $\gamma$ of the zeros $\frac12 + i\gamma$ of $\zeta$ on the critical line with $0 < \gamma \le T$, in increasing order, to within $10^{-8}$. Use `hardyZ(t)` from the library: step along $[10, T]$ in steps of $0.1$, and refine each sign change by bisection (about $40$ halvings). There are no zeros below $14$.
starter: |
  import { hardyZ } from 'primes';

  export function zerosUpTo(T: number): number[] {
    const out: number[] = [];
    // Your code here.
    return out;
  }
tests: |
  import { test, expect } from 'test';
  import { zerosUpTo } from 'solution';
  import { ZEROS } from 'primes';

  test('the first zero is 14.134725…', () => {
    const z = zerosUpTo(20);
    expect(z).toHaveLength(1);
    expect(Math.abs(z[0] - 14.134725141734693)).toBeLessThan(1e-8);
  });
  test('29 zeros up to 100, in order, matching the table', () => {
    const z = zerosUpTo(100);
    expect(z).toHaveLength(29);
    for (let i = 0; i < 29; i++) expect(Math.abs(z[i] - ZEROS[i])).toBeLessThan(1e-8);
  });
  test('ten zeros up to 50', () => {
    expect(zerosUpTo(50)).toHaveLength(10);
  });
solution: |
  import { hardyZ } from 'primes';

  export function zerosUpTo(T: number): number[] {
    const out: number[] = [];
    let a = 10;
    let za = hardyZ(a);
    while (a < T) {
      const b = Math.min(a + 0.1, T);
      const zb = hardyZ(b);
      if (za * zb < 0) {
        let lo = a;
        let hi = b;
        let zlo = za;
        for (let i = 0; i < 40; i++) {
          const m = (lo + hi) / 2;
          const zm = hardyZ(m);
          if (zlo * zm <= 0) hi = m;
          else {
            lo = m;
            zlo = zm;
          }
        }
        out.push((lo + hi) / 2);
      }
      a = b;
      za = zb;
    }
    return out;
  }
hints:
  - 'Keep the previous point and its value $Z$; a sign change between $a$ and $b$ is `za * zb < 0`.'
  - 'Bisection: look at the midpoint $m$; if $Z(a)$ and $Z(m)$ have opposite signs, the zero is in $[a, m]$, otherwise in $[m, b]$.'
```

A step of $0.1$ is safe below $100$, where the closest zeros are more than $1$ apart. Higher up it is not: a fixed step can jump over a close pair, which is why serious searches step from Gram point to Gram point and check the total against an exact count. For that we need to count zeros without finding them.

## Counting zeros: the argument principle

Let $N(T)$ be the number of zeros $\rho$ of $\zeta$ (equivalently of $\xi$) with $0 < \operatorname{Im}\rho \le T$, counted with multiplicity. The **argument principle** (Appendix A) counts the zeros of a holomorphic function inside a closed curve: it is the number of times the image of the curve winds around $0$, that is $\frac1{2\pi}$ times the total change of the argument along the curve. The next widget shows a related picture: the image of the critical line itself, which passes through $0$ once for each zero on the line.

::critical-curve

:::theorem{name="Riemann–von Mangoldt formula" who="Riemann; von Mangoldt" year=1905 status=proved}
For $T > 0$ not the ordinate of a zero,
$$N(T) = \frac{\theta(T)}{\pi} + 1 + S(T), \qquad S(T) = \frac1\pi\arg\zeta(\tfrac12 + iT),$$
where the argument is obtained by continuous variation along the segments from $2$ to $2 + iT$ to $\frac12 + iT$, starting from $\arg\zeta(2) = 0$. Consequently
$$N(T) = \frac{T}{2\pi}\log\frac{T}{2\pi} - \frac{T}{2\pi} + \frac78 + S(T) + O\!\left(\frac1T\right).$$
:::

:::proof
Let $R$ be the rectangle with vertices $-1$, $2$, $2 + iT$, $-1 + iT$. The function $\xi$ is entire, has no zeros on the real axis ($\xi(\sigma) > 0$ for real $\sigma$: it is $\frac12$ at $0$ and $1$, and $\zeta(\sigma) < 0$ on $(0, 1)$, see Chapter 20, exercise 5), and none on the vertical sides (they are outside the critical strip). So by the argument principle, $N(T) = \frac1{2\pi}\Delta_{\partial R}\arg\xi$.

**Halving.** The symmetries $\xi(1 - s) = \xi(s)$ and $\xi(\bar s) = \overline{\xi(s)}$ give $\xi(1 - \bar s) = \overline{\xi(s)}$: reflecting in the critical line conjugates $\xi$. So the change of argument along the left half of $\partial R$ (from $\frac12 + iT$ to $-1 + iT$ to $-1$ to $\frac12$) equals the change along the right half (from $\frac12$ to $2$ to $2 + iT$ to $\frac12 + iT$). Along $[\frac12, 2]$, $\xi$ is real and positive, so it contributes nothing. Hence $N(T) = \frac1\pi\Delta_L\arg\xi$, where $L$ is the path $\frac12 \to 2 \to 2 + iT \to \frac12 + iT$.

**The factors.** Write $\xi(s) = \frac12\,s\,\cdot\,\pi^{-s/2}\Gamma(\frac s2)\,\cdot\,(s - 1)\zeta(s)$; each factor is holomorphic and nonzero along $L$, and positive at the starting point $\frac12$ ($(s - 1)\zeta(s) = -\frac12\zeta(\frac12) > 0$ there). Their changes of argument along $L$:
- $s$ goes from $\frac12$ to $\frac12 + iT$: its argument changes by $\arctan 2T = \frac\pi2 - \arctan\frac{1}{2T}$.
- $\pi^{-s/2}\Gamma(\frac s2)$: by definition of $\theta$, its argument changes by $\theta(T)$.
- $(s - 1)\zeta(s)$ is positive on $[\frac12, 2]$, so its argument only starts to change at $2$. From $2$ to $2 + iT$ to $\frac12 + iT$, the factor $s - 1$ moves from $1$ to $1 + iT$ to $-\frac12 + iT$ without passing through $0$, and its argument increases by $\frac\pi2 + \arctan\frac1{2T}$. The factor $\zeta$ contributes $\pi S(T)$, by the definition of $S$.

The arctangents cancel, so $\pi N(T) = \frac\pi2 + \theta(T) + \frac\pi2 + \pi S(T)$. The second formula follows from the expansion of $\theta$.
:::

So the count of zeros has a smooth main term and a fluctuating part $S(T)$, which is small.

:::theorem{name="von Mangoldt" year=1905 status=sketched}
$S(T) = O(\log T)$.
:::

The idea: $S(T)$ is the change of $\arg\zeta$ along the horizontal segment from $2 + iT$ to $\frac12 + iT$ (the vertical part contributes $O(1)$, since $\zeta$ stays near $1$ on the line $\sigma = 2$). That change is at most $\pi$ times one more than the number of zeros of $\operatorname{Re}\zeta(\sigma + iT)$ on the segment, and Jensen's formula (Appendix A) bounds that number by $O(\log T)$, because $\zeta$ grows only polynomially in $T$.

::zero-count

The counting function is the second staircase of the course. Its steps are the zeros, its smooth part is $\theta(T)/\pi + 1$, and its error $S(T)$ is tiny: below $T = 9870$ it never exceeds $1.45$ in absolute value. The average spacing of the zeros near height $T$ is $\frac{2\pi}{\log(T/2\pi)}$, so the zeros get denser as $T$ grows, but only logarithmically.

## Checking the Riemann Hypothesis up to a height

The two halves of the chapter combine into a verification method, devised by Alan Turing in 1953.:cite[turing1953]

1. Count sign changes of $Z$ on $(0, T]$, using Gram points to organise the search. Each sign change is a zero on the line.
2. Compute $N(T)$ exactly. Since $N(T)$ is an integer and $\theta(T)/\pi + 1$ is computable, it suffices to know $S(T)$ to within $\frac12$; Turing showed how to get this from bounds on the average $\int S(t)\,dt$ near $T$, using values of $Z$ alone.
3. If the two numbers agree, every zero up to height $T$ is on the critical line, and simple.

Applied to $T = 100$, the zero finder above finds $29$ sign changes, and $N(100) = 29$, so all zeros up to height $100$ are on the line. The current record, by Dave Platt and Tim Trudgian in 2021, verifies the Riemann Hypothesis rigorously for all zeros up to height $3 \times 10^{12}$, more than $12$ trillion zeros.:cite[platt-trudgian2021]

:::key
- $Z(t) = e^{i\theta(t)}\zeta(\frac12 + it)$ is real, with $|Z| = |\zeta|$ on the critical line. Zeros on the line are sign changes, so they can be certified by computation.
- Riemann–Siegel computes $Z(t)$ with $\sqrt{t/2\pi}$ terms. Gram points $\theta(g_n) = n\pi$ guide the search; Gram's law usually holds but first fails at $g_{126}$.
- The argument principle and the symmetries of $\xi$ give $N(T) = \theta(T)/\pi + 1 + S(T) = \frac{T}{2\pi}\log\frac{T}{2\pi} - \frac{T}{2\pi} + \frac78 + O(\log T)$.
- Turing's method compares sign changes with $N(T)$; the Riemann Hypothesis has been verified up to height $3 \times 10^{12}$.
:::

:::exercises
1. Use the formula for $N(T)$ to estimate the number of zeros up to height $T = 10^6$, and the average gap between consecutive zeros at that height.
2. Verify $g_0 \approx 17.846$ from the expansion $\theta(t) \approx \frac t2\log\frac{t}{2\pi} - \frac t2 - \frac\pi8$, using a few steps of Newton's method.
3. Show that $\theta(t)$ is increasing for $t > 6.29$ (it has a minimum near $t \approx 6.29$, where $\theta'(t) = 0$), so the Gram points $g_n$ for $n \ge -1$ are well defined.
4. Extend your zero finder to report the number of Gram intervals $(g_{n-1}, g_n]$ up to $T$ that contain no zero, one zero, and two zeros. What happens near $g_{126}$?
5. Explain why a double zero of $\zeta$ on the critical line would not produce a sign change of $Z$. How would Turing's method detect it?
:::
