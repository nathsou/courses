---
number: 20
title: Zeta in the complex plane
summary: "Complex powers n^(−s), the half-plane where Σ n^(−s) converges, and three ways to push ζ beyond it: the alternating series, an integral, and the Euler–Maclaurin formula. The result is a function on the whole plane with a single pole, and its first zeros."
duration: About 1½ hours
prerequisites: [euler-product]
theorems: [ζ is holomorphic for Re s > 1, Analytic continuation of ζ to the whole plane, ζ(−n) = −B_(n+1)/(n+1), The trivial zeros]
techniques: [complex powers, analytic continuation, Euler–Maclaurin summation, domain colouring]
---

So far $s$ has been a real number greater than $1$. Riemann's insight, in his 1859 paper on the primes,:cite[riemann1859] was to let $s$ be complex. Then $\zeta$ becomes a function on the plane, smooth in the strongest possible sense, and the tools of complex analysis apply to it. This chapter builds that function. Appendix A reviews the complex analysis it needs: if "holomorphic", "identity theorem" or "pole" are rusty, read its sections on holomorphic functions, on zeros and analytic continuation, and on poles and residues now.

Following Riemann, we write
$$s = \sigma + it, \qquad \sigma = \operatorname{Re} s,\quad t = \operatorname{Im} s.$$

## Complex powers

For a positive integer $n$, $n^{-s}$ is defined as $e^{-s\log n}$ with the real logarithm. Splitting $s$ into its parts,
$$n^{-s} = e^{-\sigma\log n}\,e^{-it\log n} = n^{-\sigma}\big(\cos(t\log n) - i\sin(t\log n)\big).$$
So $n^{-s}$ is a complex number of length $n^{-\sigma}$, pointing in the direction $-t\log n$. The real part of $s$ controls the size; the imaginary part makes the terms rotate, more slowly as $n$ grows, because $\log n$ grows slowly. The usual rules hold: $(mn)^{-s} = m^{-s}n^{-s}$ and $n^{-s-w} = n^{-s}n^{-w}$.

::partial-sums

The widget draws $\zeta(s) = \sum n^{-s}$ as a chain of arrows. Try the presets:

- At $s = 2$ the arrows all point right and shrink fast.
- At $s = 1.2 + 6i$ they turn and still converge, slowly.
- At $s = \frac12 + 6i$ the chain winds around in ever larger loops. The lengths $n^{-1/2}$ do not shrink fast enough, and the series diverges.

## Where the series converges

Since $|n^{-s}| = n^{-\sigma}$, the series $\sum n^{-s}$ converges absolutely exactly when $\sigma > 1$, and it diverges for $\sigma \le 1$ because its terms do not tend to $0$ fast enough (for $\sigma \le 0$ they do not tend to $0$ at all; for $0 < \sigma \le 1$ see exercise 1).

:::theorem{status=proved}
$\zeta(s) = \sum_{n \ge 1} n^{-s}$ is holomorphic on the half-plane $\sigma > 1$, and $\zeta'(s) = -\sum_{n \ge 1}\log n\cdot n^{-s}$ there. The Euler product $\zeta(s) = \prod_p(1 - p^{-s})^{-1}$ holds, and $\zeta(s) \ne 0$.
:::

:::proof
Fix $\sigma_0 > 1$. On the half-plane $\sigma \ge \sigma_0$, $|n^{-s}| \le n^{-\sigma_0}$ and $\sum n^{-\sigma_0}$ converges, so by the Weierstrass M-test the series converges uniformly there. Each term $e^{-s\log n}$ is holomorphic, and a uniform limit of holomorphic functions is holomorphic, with derivatives obtained term by term (Appendix A). The Euler product and $\zeta(s)\sum\mu(n)n^{-s} = 1$ have the same proofs as in Chapter 19, which only used absolute convergence.
:::

Every identity of Chapter 19 between Dirichlet series therefore holds for $\sigma > 1$. In particular
$$-\frac{\zeta'(s)}{\zeta(s)} = \sum_{n \ge 1}\frac{\Lambda(n)}{n^s} \qquad (\sigma > 1).$$

## Beyond the line σ = 1

The series stops at $\sigma = 1$, but the function need not. A familiar example: $1 + z + z^2 + \cdots$ converges only for $|z| < 1$, where it equals $\frac{1}{1 - z}$, and $\frac1{1-z}$ makes sense for every $z \ne 1$. The **identity theorem** (Appendix A) says that two holomorphic functions on a connected open set that agree on a small disc agree everywhere. So if some formula is holomorphic on a larger connected region and equals $\zeta(s)$ for $\sigma > 1$, it is the only possible extension of $\zeta$ there. This extension is called the **analytic continuation**. It does not depend on which formula we use to find it.

Here are three formulas, each reaching further left.

### The alternating series

Change the signs of the even terms:
$$\eta(s) = 1 - \frac1{2^s} + \frac1{3^s} - \frac1{4^s} + \cdots = \sum_{n \ge 1}\frac{(-1)^{n-1}}{n^s}.$$
For $\sigma > 1$, $\zeta(s) - \eta(s) = 2\sum_{n}(2n)^{-s} = 2^{1-s}\zeta(s)$, so
$$\eta(s) = \left(1 - 2^{1-s}\right)\zeta(s).$$
But $\eta(s)$ converges for $\sigma > 0$. Group the terms in pairs: $n^{-s} - (n+1)^{-s} = s\int_n^{n+1}u^{-s-1}\,du$, whose size is at most $|s|\,n^{-\sigma-1}$, and $\sum n^{-\sigma-1}$ converges. (The pairs converge uniformly on compact subsets of $\sigma > 0$, so $\eta$ is holomorphic there.) Switch the widget to the alternating series to watch it converge at $s = \frac12 + 6i$. Hence
$$\zeta(s) = \frac{\eta(s)}{1 - 2^{1-s}}$$
extends $\zeta$ to $\sigma > 0$, except where $2^{1-s} = 1$, that is at $s = 1 + \frac{2\pi i k}{\log 2}$ for integers $k$. At $s = 1$ there is a genuine pole: $\eta(1) = 1 - \frac12 + \frac13 - \cdots = \log 2$, while $1 - 2^{1-s}$ vanishes. At the other points $k \ne 0$ the formula is undefined, and the next formula shows that $\zeta$ is in fact holomorphic there (so $\eta$ must vanish at those points).

### An integral

Chapter 19 used Abel summation to write, for real $s > 1$,
$$\zeta(s) = \frac{s}{s-1} - s\int_1^\infty\frac{\{t\}}{t^{s+1}}\,dt, \qquad \{t\} = t - \lfloor t\rfloor.$$
The same computation works for complex $s$ with $\sigma > 1$. The integral converges absolutely for $\sigma > 0$, since $0 \le \{t\} < 1$ and $|t^{-s-1}| = t^{-\sigma-1}$, and it is holomorphic there (differentiate under the integral sign, Appendix A).

:::theorem{status=proved}
$\zeta$ extends to a holomorphic function on $\sigma > 0$ except for a simple pole at $s = 1$ with residue $1$:
$$\zeta(s) = \frac{1}{s-1} + \gamma + O(s - 1) \quad\text{near } s = 1.$$
:::

:::proof
The right-hand side above is holomorphic on $\sigma > 0$ except at $s = 1$, where $\frac{s}{s-1} = 1 + \frac{1}{s-1}$ has a simple pole with residue $1$. It agrees with $\zeta$ for $\sigma > 1$, so it is the continuation. The constant term is $1 - \int_1^\infty\{t\}t^{-2}\,dt = \gamma$, as in Chapter 19.
:::

### Everywhere: Euler–Maclaurin

The integral above is the first step of the Euler–Maclaurin formula (Appendix B), and taking more steps reaches further left. Apply the formula to $f(t) = t^{-s}$ on $[N, \infty)$ for $\sigma > 1$. The derivatives are $f^{(j)}(t) = (-1)^j s(s+1)\cdots(s+j-1)\,t^{-s-j}$, and everything can be written down:

:::theorem{name="Analytic continuation of ζ" who="Riemann" year=1859 status=proved}
For every integer $N \ge 1$ and $m \ge 1$,
$$\zeta(s) = \sum_{n=1}^{N-1}\frac1{n^s} + \frac{N^{1-s}}{s - 1} + \frac{N^{-s}}{2} + \sum_{k=1}^{m}\frac{B_{2k}}{(2k)!}\,s(s+1)\cdots(s + 2k - 2)\,N^{1-s-2k} + R_m(s),$$
$$R_m(s) = -\frac{s(s+1)\cdots(s + 2m - 1)}{(2m)!}\int_N^\infty B_{2m}(\{t\})\,t^{-s-2m}\,dt.$$
The integral converges for $\sigma > 1 - 2m$. Hence $\zeta$ extends to a function on the whole complex plane that is holomorphic except for a simple pole at $s = 1$.
:::

:::proof
For $\sigma > 1$ the formula is Euler–Maclaurin applied to $\sum_{n > N}n^{-s}$, plus the first $N$ terms. The periodic Bernoulli function $B_{2m}(\{t\})$ is bounded, so the integral converges absolutely and locally uniformly for $\sigma > 1 - 2m$, and defines a holomorphic function there. Every other term is holomorphic except $\frac{N^{1-s}}{s-1}$ at $s = 1$. The right-hand side therefore continues $\zeta$ to $\sigma > 1 - 2m$, and $m$ is arbitrary.
:::

This is also how $\zeta$ is computed in practice, and how the library behind every widget in this course does it. For $|s|$ of moderate size, take $N$ a little larger than $|s|/(2\pi)$; then each correction term is smaller than the previous one by a factor of about $\left(\frac{|s|}{2\pi N}\right)^2$, and a dozen of them give about ten correct digits.

```code
id: complex-zeta/euler-maclaurin
title: ζ anywhere
prompt: |
  Write `zetaEM(s, N)`, which evaluates $\zeta(s)$ at a complex number `s` (an object `{ re, im }`) with the formula above, using the terms $n < N$, the two boundary terms and the corrections $k = 1, \ldots, 6$ (ignore $R_6$). The Bernoulli numbers are $B_2, \ldots, B_{12} = \frac16, -\frac1{30}, \frac1{42}, -\frac1{30}, \frac5{66}, -\frac{691}{2730}$.

  The library's complex arithmetic is available as `complex`: `c(re, im)`, `add`, `sub`, `mul`, `div`, `scale(z, k)` (multiply by a real number) and `powReal(n, s)`, which returns $n^{-s}$ (note the minus sign).
starter: |
  import { complex } from 'primes';
  const { c, add, sub, mul, div, scale, powReal } = complex;

  export function zetaEM(s: { re: number; im: number }, N = 12) {
    let sum = c(0);
    // Your code here.
    return sum;
  }
tests: |
  import { test, expect } from 'test';
  import { zetaEM } from 'solution';
  import { complex } from 'primes';
  const { c } = complex;

  const close = (z, re, im, tol) => {
    expect(Math.abs(z.re - re)).toBeLessThan(tol);
    expect(Math.abs(z.im - im)).toBeLessThan(tol);
  };
  test('ζ(2) = π²/6', () => close(zetaEM(c(2, 0)), Math.PI ** 2 / 6, 0, 1e-10));
  test('ζ(½) = −1.4603545…', () => close(zetaEM(c(0.5, 0)), -1.4603545088095868, 0, 1e-10));
  test('ζ(0) = −½ and ζ(−1) = −1/12', () => {
    close(zetaEM(c(0, 0)), -0.5, 0, 1e-10);
    close(zetaEM(c(-1, 0)), -1 / 12, 0, 1e-10);
  });
  test('ζ(2 + 3i)', () => close(zetaEM(c(2, 3)), 0.7980219851, -0.1137443080, 1e-9));
  test('the first zero, ½ + 14.134725…i', () => {
    const z = zetaEM(c(0.5, 14.134725141734693));
    expect(Math.hypot(z.re, z.im)).toBeLessThan(1e-8);
  });
solution: |
  import { complex } from 'primes';
  const { c, add, sub, mul, div, scale, powReal } = complex;
  const B = [1 / 6, -1 / 30, 1 / 42, -1 / 30, 5 / 66, -691 / 2730];

  export function zetaEM(s: { re: number; im: number }, N = 12) {
    let sum = c(0);
    for (let n = 1; n < N; n++) sum = add(sum, powReal(n, s));
    const Ns = powReal(N, s); // N^{-s}
    sum = add(sum, div(scale(Ns, N), sub(s, c(1))));
    sum = add(sum, scale(Ns, 0.5));
    let rising = s; // s(s+1)…(s+2k−2)
    let Npow = scale(Ns, 1 / N); // N^{1−s−2k}
    let fact = 2; // (2k)!
    for (let k = 1; k <= 6; k++) {
      sum = add(sum, scale(mul(rising, Npow), B[k - 1] / fact));
      rising = mul(mul(rising, add(s, c(2 * k - 1))), add(s, c(2 * k)));
      Npow = scale(Npow, 1 / (N * N));
      fact *= (2 * k + 1) * (2 * k + 2);
    }
    return sum;
  }
hints:
  - '$N^{1-s} = N \cdot N^{-s}$, so `scale(powReal(N, s), N)`.'
  - 'Keep the rising product $s(s+1)\cdots(s+2k-2)$ and the power $N^{1-s-2k}$ in variables, and update both at the end of each round: multiply the product by $(s + 2k - 1)(s + 2k)$ and the power by $N^{-2}$.'
```

## Values at negative integers

Setting $N = 1$ in the formula gives
$$\zeta(s) = \frac{1}{s-1} + \frac12 + \sum_{k=1}^m\frac{B_{2k}}{(2k)!}\,s(s+1)\cdots(s+2k-2) + R_m(s).$$
At $s = 0$ every product contains the factor $s$, so $\zeta(0) = -1 + \frac12 = -\frac12$. At $s = -1$, the products with $k \ge 2$ contain $s + 1 = 0$, so $\zeta(-1) = -\frac12 + \frac12 + \frac{B_2}{2}\cdot(-1) = -\frac1{12}$. In general:

:::proposition{status=proved}
For every integer $n \ge 1$, $\zeta(-n) = -\dfrac{B_{n+1}}{n+1}$. In particular $\zeta(-2) = \zeta(-4) = \zeta(-6) = \cdots = 0$, while $\zeta(-1) = -\frac1{12}$, $\zeta(-3) = \frac1{120}$, $\zeta(-5) = -\frac1{252}$.
:::

:::proof
The Bernoulli numbers are defined by $B_0 = 1$ and the recursion $\sum_{j=0}^{n}\binom{n+1}{j}B_j = 0$ for $n \ge 1$; this gives $B_1 = -\frac12$, $B_2 = \frac16$, $B_3 = 0$, $B_4 = -\frac1{30}$, and $B_j = 0$ for odd $j \ge 3$ (exercise 4). Put $s = -n$ and take $2m > n$. The factor $s(s+1)\cdots(s + 2m - 1)$ in $R_m$ contains $s + n = 0$, and so does the product in every term with $2k - 2 \ge n$. The surviving terms have $2k \le n + 1$, and for those $s(s+1)\cdots(s + 2k - 2) = (-n)(-n+1)\cdots(-n+2k-2) = -\frac{n!}{(n + 1 - 2k)!}$. So
$$\zeta(-n) = -\frac{1}{n+1} + \frac12 - \sum_{2k \le n+1}\frac{B_{2k}}{(2k)!}\cdot\frac{n!}{(n+1-2k)!} = -\frac{1}{n+1}\left(1 - \frac{n+1}{2} + \sum_{2k \le n+1}\binom{n+1}{2k}B_{2k}\right).$$
The bracket is $\sum_{j=0}^{n+1}\binom{n+1}{j}B_j$ (the terms $j = 0, 1$ are $1$ and $-\frac{n+1}{2}$, and the odd $j \ge 3$ contribute nothing), which by the recursion equals $B_{n+1}$.
:::

The zeros at $-2, -4, -6, \ldots$ are called the **trivial zeros**. Chapter 21 explains where they come from.

:::warning
**Does $1 + 2 + 3 + \cdots = -\frac1{12}$?** No. The series $\sum n^{-s}$ at $s = -1$ is $1 + 2 + 3 + \cdots$, which diverges, and $\zeta(-1)$ is not its sum: it is the value at $-1$ of the analytic continuation of a function that the series defines only for $\sigma > 1$. What is true is that various regularisations of divergent sums (Ramanujan's, or smoothing with a cut-off and discarding the divergent part) assign $1 + 2 + 3 + \cdots$ the value $-\frac1{12}$, and that this value appears in physics, for instance in the Casimir effect. But no rearrangement or grouping of the actual partial sums $1, 3, 6, 10, \ldots$ gets anywhere near it.
:::

## A picture of ζ

A complex function of a complex variable needs four real dimensions to graph. **Domain colouring** uses two for the input and colour for the output: the point $s$ is painted with a colour that encodes $\zeta(s)$, its hue for the direction of $\zeta(s)$ and its brightness for the size.

::domain-colouring{fns="zeta" view="strip"}

Things to find in the picture:

- **The pole at $s = 1$** ("around s = 1" view): a pale spot where the hues go round once, in the opposite order to the hues around a zero. Near $s = 1$, $\zeta(s) \approx \frac{1}{s - 1}$.
- **The trivial zeros** ("left half-plane" view) at $-2, -4, -6, \ldots$, dark spots where all hues meet. Far to the left $\zeta$ grows enormous between them.
- **The nontrivial zeros** ("zeros up to 45" view), on the dashed line $\sigma = \frac12$, at heights $14.13$, $21.02$, $25.01$, $30.42$, $32.94$, $37.59$, $40.92$ and $43.33$. Hover over one to see $|\zeta(s)|$ drop to almost nothing.
- **Symmetry.** $\zeta(\bar s) = \overline{\zeta(s)}$, because the series has real coefficients and the continuation inherits the property (by the identity theorem). So the lower half-plane is the mirror image of the upper one, with the hues reflected, and zeros come in conjugate pairs $\rho, \bar\rho$. On the real axis $\zeta$ is real: red where positive and cyan where negative. It is negative on the whole interval $(-2, 1)$; for instance $\zeta(\frac12) = -1.4603545\ldots$
- **No zeros for $\sigma > 1$**, as the Euler product proved, and none on the line $\sigma = 1$ either: that is the subject of Chapter 25, and it is the key to the prime number theorem.

All the nontrivial zeros in these pictures lie exactly on the line $\sigma = \frac12$. The **Riemann Hypothesis** says that this is true for all of them. The next two chapters develop the tools to locate the zeros precisely and to count them.

:::key
- $n^{-s} = n^{-\sigma}e^{-it\log n}$: size from $\sigma$, rotation from $t$. The series $\sum n^{-s}$ converges for $\sigma > 1$, where $\zeta$ is holomorphic, has an Euler product, and is never $0$.
- Analytic continuation is unique (identity theorem). Three formulas continue $\zeta$: $\eta(s)/(1 - 2^{1-s})$ to $\sigma > 0$; $\frac{s}{s-1} - s\int_1^\infty\{t\}t^{-s-1}dt$ to $\sigma > 0$; Euler–Maclaurin to the whole plane.
- $\zeta$ is holomorphic on $\C$ except for a simple pole at $s = 1$ with residue $1$; it is also how $\zeta$ is computed.
- $\zeta(-n) = -B_{n+1}/(n+1)$: $\zeta(0) = -\frac12$, $\zeta(-1) = -\frac1{12}$, and trivial zeros at $-2, -4, \ldots$. The nontrivial zeros seen so far all lie on $\sigma = \frac12$.
:::

:::exercises
1. Show that $\sum n^{-s}$ diverges for $0 < \sigma \le 1$. (Compare $\sum_{n \le N} n^{-s}$ with $\int_1^N u^{-s}du = \frac{N^{1-s} - 1}{1 - s}$: the difference converges, but $N^{1-s}$ does not, unless $s = 1$, where the harmonic series diverges anyway.)
2. Show that $\eta(1) = \log 2$, and use $\eta(s) = (1 - 2^{1-s})\zeta(s)$ to find the residue of $\zeta$ at $s = 1$ again.
3. Explain why $\zeta(s)$ is real for real $s \ne 1$, and deduce that $\zeta(\bar s) = \overline{\zeta(s)}$ for all $s \ne 1$ from the identity theorem applied to $s \mapsto \overline{\zeta(\bar s)}$.
4. Compute $B_1, \ldots, B_8$ from the recursion $\sum_{j=0}^{n}\binom{n+1}{j}B_j = 0$. Prove that $\frac{x}{e^x - 1} = \sum_{j \ge 0}B_j\frac{x^j}{j!}$ satisfies the recursion, and that $\frac{x}{e^x - 1} + \frac x2$ is an even function; deduce $B_j = 0$ for odd $j \ge 3$.
5. Use the integral formula of the second continuation to show that $\zeta(\sigma) < 0$ for real $0 < \sigma < 1$. (Both terms of the formula are negative there.)
6. How many terms of the series would you need to compute $\zeta(2)$ to twelve decimal places directly? How many with Euler–Maclaurin and $N = 10$?
:::
