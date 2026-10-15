---
number: 32
title: The Riemann Hypothesis over finite fields
summary: "Where the analogue of the Riemann Hypothesis is a theorem. Polynomials over a finite field have a prime number theorem with a perfect error term; points on an elliptic curve modulo p obey Hasse’s bound |a_p| ≤ 2√p, which is exactly RH for the curve’s zeta function; and Weil and Deligne extended this to all curves and varieties."
duration: About 1½ hours
prerequisites: [riemann-hypothesis, fermat-euler]
theorems: ["The prime number theorem for F_q[T]", "Hasse’s theorem", "Hasse ⇔ RH for the zeta function of an elliptic curve", "Weil’s theorem (stated)", "Deligne’s theorem (stated)", "Sato–Tate (stated)"]
techniques: [zeta functions of curves, Frobenius, generating functions]
---

The Riemann Hypothesis is open for $\zeta$, but there is a parallel world where it is a theorem. Replace the integers by polynomials with coefficients in a finite field, or count solutions of equations modulo $p$, and the analogues of $\zeta$ have zeros that can be proved to lie on their critical lines. The proofs explain, by analogy, what kind of structure a proof for $\zeta$ might need.

## Primes among polynomials

Let $\F_q$ be a finite field with $q$ elements (for instance $\Z/p\Z$, Appendix E). The polynomial ring $\F_q[T]$ behaves like $\Z$: it has division with remainder, a Euclidean algorithm, and unique factorisation into **irreducible** polynomials, its primes. The size of a polynomial $f$ of degree $n$ is $|f| = q^n$, the number of residues modulo $f$. Its zeta function is
$$\zeta_{\F_q[T]}(s) = \sum_{f \text{ monic}}\frac{1}{|f|^s} = \sum_{n \ge 0}\frac{q^n}{q^{ns}} = \frac{1}{1 - q^{1-s}},$$
since there are $q^n$ monic polynomials of degree $n$. Unique factorisation gives an Euler product over monic irreducibles $P$, exactly as in Chapter 19: $\zeta_{\F_q[T]}(s) = \prod_P(1 - |P|^{-s})^{-1}$. This zeta function has a pole at $s = 1$ and **no zeros at all**. The prime number theorem that results is as good as it could be.

:::theorem{name="The prime number theorem for polynomials" who="Gauss" status=proved}
The number of monic irreducible polynomials of degree $n$ over $\F_q$ is
$$I_n = \frac1n\sum_{d \mid n}\mu(d)\,q^{n/d} = \frac{q^n}{n} + O\!\left(\frac{q^{n/2}}{n}\right).$$
:::

:::proof
Every monic polynomial of degree $n$ factors uniquely into monic irreducibles, so comparing the coefficients of $u^n$ in $\prod_P(1 - u^{\deg P})^{-1} = \sum_n q^nu^n$, after taking logarithmic derivatives and multiplying by $u$, gives
$$\sum_{d \mid n}d\,I_d = q^n$$
(the left side counts pairs $(P, k)$ with $k\deg P = n$, weighted by $\deg P$). By Möbius inversion (Chapter 19), $nI_n = \sum_{d \mid n}\mu(d)q^{n/d}$. The term $d = 1$ gives $q^n$; every other term has $d \ge 2$, so $|q^{n/d}| \le q^{n/2}$, and there are at most $n$ of them, giving an error $O(q^{n/2})$.
:::

With $X = q^n$ playing the role of $x$ and $n = \log_qX$ the role of $\log x$, this says $I_n = \frac{X}{\log_qX} + O\!\left(\frac{\sqrt X}{\log_qX}\right)$: the PNT with a square-root error, the analogue of the Riemann Hypothesis, with a two-line proof.

::polynomial-pnt

## Points on curves modulo p

A more interesting world comes from counting solutions of equations. Fix integers $a, b$ with $4a^3 + 27b^2 \ne 0$, and consider the **elliptic curve** $E : y^2 = x^3 + ax + b$. For a prime $p \ge 5$ not dividing $4a^3 + 27b^2$, let $N_p$ be the number of solutions $(x, y)$ modulo $p$, plus one “point at infinity”. Each $x$ gives $1 + \left(\frac{x^3 + ax + b}{p}\right)$ values of $y$ (Legendre symbol, Chapter 9), so
$$N_p = p + 1 + \sum_{x \bmod p}\left(\frac{x^3 + ax + b}{p}\right) = p + 1 - a_p.$$
The **trace of Frobenius** $a_p$ is a sum of $p$ signs. If they were random coin flips, $a_p$ would be of size about $\sqrt p$.

:::theorem{name="Hasse" year=1933 status=sketched}
$|a_p| \le 2\sqrt p$ for every prime $p$ of good reduction.
:::

::sato-tate

Square-root cancellation, with a sharp constant, for every single prime. Emil Artin had conjectured it in his 1924 thesis; Helmut Hasse proved it in 1933.:cite[hasse1933] Here is the structure of the proof, which is worth knowing because of what it says about $\zeta$.

::::zoom{levels="Idea, Sketch"}
:::level[Idea]
The points of $E$ with coordinates in the algebraic closure $\overline{\F_p}$ form a group. The map $\varphi(x, y) = (x^p, y^p)$ (the **Frobenius**) sends the curve to itself, and its fixed points are exactly the points with coordinates in $\F_p$. So $N_p$ is the number of fixed points of $\varphi$, that is, the size of the kernel of $1 - \varphi$. Maps of curves have a **degree**, and degrees behave like squared lengths: they form a positive definite quadratic form. Then $N_p = \deg(1 - \varphi) = 1 - a_p + p$, and positivity forces the “cross term” $a_p$ to satisfy the Cauchy–Schwarz inequality $|a_p| \le 2\sqrt{\deg 1\cdot\deg\varphi} = 2\sqrt p$.
:::
:::level[Sketch]
1. The endomorphisms of $E$ (group homomorphisms given by rational functions) form a ring, and each nonzero one has a degree: the number of points in a generic fibre. The degree is multiplicative, and $\deg(m) = m^2$ for multiplication by an integer $m$.
2. $\deg$ is a positive definite quadratic form on the endomorphism ring: $\deg(\alpha) \ge 0$, with equality only for $\alpha = 0$, and $\langle\alpha, \beta\rangle = \frac12(\deg(\alpha + \beta) - \deg\alpha - \deg\beta)$ is bilinear.
3. Frobenius has $\deg\varphi = p$, and $1 - \varphi$ is separable, so $\deg(1 - \varphi) = |\ker(1 - \varphi)| = N_p$.
4. Expanding, $N_p = \deg 1 + \deg\varphi - 2\langle 1, \varphi\rangle = 1 + p - 2\langle 1, \varphi\rangle$, so $a_p = 2\langle 1, \varphi\rangle$.
5. Cauchy–Schwarz for the positive form: $\langle 1, \varphi\rangle^2 \le \deg(1)\deg(\varphi) = p$. Hence $|a_p| \le 2\sqrt p$.
:::
::::

The whole proof rests on a **positivity**: a quantity that is a sum of squares, or a degree, cannot be negative. Positivity is also the shape of Weil’s criterion for the classical Riemann Hypothesis (Chapter 29): RH is equivalent to the positivity of a certain quadratic form built from the explicit formula. For curves over finite fields, geometry supplies that positivity; for $\zeta$ nobody knows where it would come from.

## The zeta function of a curve

Why call Hasse’s theorem a Riemann Hypothesis? Count points not only over $\F_p$ but over all its extensions $\F_{p^m}$: let $N_m$ be the number of points of $E$ (with the point at infinity) with coordinates in $\F_{p^m}$, and define
$$Z(E, u) = \exp\left(\sum_{m \ge 1}\frac{N_m}{m}u^m\right), \qquad \zeta_E(s) = Z(E, p^{-s}).$$
This is an Euler product over the “closed points” of $E$, the analogue of primes, in the same way that $\log\zeta(s) = \sum_{p,k}\frac{p^{-ks}}{k}$ (Chapter 19).

:::theorem{status=proved}
Let $\alpha, \beta$ be the roots of $u^2 - a_pu + p$, so that $\alpha + \beta = a_p$ and $\alpha\beta = p$. If $N_m = p^m + 1 - \alpha^m - \beta^m$ for all $m$ (which is true; it follows from the theory of Frobenius), then
$$Z(E, u) = \frac{(1 - \alpha u)(1 - \beta u)}{(1 - u)(1 - pu)} = \frac{1 - a_pu + pu^2}{(1 - u)(1 - pu)},$$
and the following are equivalent: (a) $|a_p| \le 2\sqrt p$; (b) $|\alpha| = |\beta| = \sqrt p$; (c) every zero of $\zeta_E(s)$ has real part $\frac12$.
:::

:::proof
Using $-\log(1 - cu) = \sum_m\frac{c^mu^m}{m}$,
$$\sum_m\frac{N_m}{m}u^m = -\log(1 - pu) - \log(1 - u) + \log(1 - \alpha u) + \log(1 - \beta u),$$
and exponentiating gives the formula for $Z$. For the equivalence: if $a_p^2 \le 4p$, the quadratic $u^2 - a_pu + p$ has complex conjugate roots (or a double real root), so $|\alpha|^2 = \alpha\bar\alpha = \alpha\beta = p$. Conversely if $|\alpha| = |\beta| = \sqrt p$ then $|a_p| = |\alpha + \beta| \le 2\sqrt p$. Finally, the zeros of $\zeta_E(s) = Z(E, p^{-s})$ come from $1 - \alpha p^{-s} = 0$ or $1 - \beta p^{-s} = 0$, that is $p^s = \alpha$ or $\beta$; taking absolute values, $p^{\operatorname{Re}s} = |\alpha|$ or $|\beta|$. So all zeros have real part $\frac12$ exactly when $|\alpha| = |\beta| = \sqrt p$.
:::

The parallels with $\zeta$ are exact. $\zeta_E$ has poles at $s = 0$ and $s = 1$ (from $\frac{1}{(1 - u)(1 - pu)}$), a functional equation $s \leftrightarrow 1 - s$ (because $\alpha\beta = p$), and its zeros are the eigenvalues of Frobenius: $\alpha$ and $\beta$ are the eigenvalues of $\varphi$ acting on a two-dimensional space (the $\ell$-adic Tate module of $E$). So for curves over finite fields, **the Hilbert–Pólya dream of Chapter 31 is literally true**: the zeros are eigenvalues of an operator, and its geometry forces them onto the critical line.

```code
id: finite-fields/hasse
title: Point counting and the Hasse bound
prompt: |
  Write `countPoints(a, b, p)`, the number of points of $y^2 = x^3 + ax + b$ over $\mathbb{F}_p$ for an odd prime $p$, including the point at infinity. Build a table `ys[r]` of how many $y$ have $y^2 \equiv r \pmod p$, then add up `ys[(x³ + ax + b) mod p]` over all $x$. (Careful with negative remainders in JavaScript: `((v % p) + p) % p`.) Then write `worstHasse(a, b, P)`, the largest value of $|a_p|/(2\sqrt p)$ over primes $5 \le p \le P$ not dividing $4a^3 + 27b^2$; it should be at most $1$.
starter: |
  import { primesUpTo } from 'primes';

  export function countPoints(a: number, b: number, p: number): number {
    return 0;
  }

  export function worstHasse(a: number, b: number, P: number): number {
    return 2;
  }
tests: |
  import { test, expect } from 'test';
  import { countPoints, worstHasse } from 'solution';

  test('small cases', () => {
    // y² = x³ + x + 1 over F_5 has 9 points; over F_7, 5 points.
    expect(countPoints(1, 1, 5)).toBe(9);
    expect(countPoints(1, 1, 7)).toBe(5);
    // y² = x³ − x over F_p has p + 1 points when p ≡ 3 (mod 4).
    for (const p of [7, 11, 19, 23, 31]) expect(countPoints(-1, 0, p)).toBe(p + 1);
  });
  test('Hasse holds up to 3000', () => {
    const w = worstHasse(1, 1, 3000);
    expect(w).toBeLessThanOrEqual(1);
    expect(w).toBeGreaterThan(0.95);
  });
solution: |
  import { primesUpTo } from 'primes';

  export function countPoints(a: number, b: number, p: number): number {
    const ys = new Uint8Array(p);
    for (let y = 0; y < p; y++) ys[(y * y) % p]++;
    let n = 1;
    for (let x = 0; x < p; x++) {
      const v = (((x * x) % p) * x + a * x + b) % p;
      n += ys[(v + p) % p];
    }
    return n;
  }

  export function worstHasse(a: number, b: number, P: number): number {
    const disc = 4 * a ** 3 + 27 * b ** 2;
    let worst = 0;
    for (const p of primesUpTo(P)) {
      if (p < 5 || disc % p === 0) continue;
      const ap = p + 1 - countPoints(a, b, p);
      worst = Math.max(worst, Math.abs(ap) / (2 * Math.sqrt(p)));
    }
    return worst;
  }
hints:
  - 'Each $x$ contributes $1 + \left(\frac{x^3 + ax + b}{p}\right)$ points, which is exactly the number of square roots of $x^3 + ax + b$ modulo $p$: $0$, $1$ or $2$.'
```

## Weil and Deligne

André Weil proved the analogue of the Riemann Hypothesis for every curve over a finite field in the 1940s (announced in 1940, with complete proofs in 1948): for a curve of genus $g$, $Z(C, u)$ is $\frac{P(u)}{(1 - u)(1 - qu)}$ with $P$ a polynomial of degree $2g$ whose roots all have absolute value $q^{-1/2}$. Equivalently, $|N_1 - (q + 1)| \le 2g\sqrt q$.:cite[weil1948] In 1949 he conjectured the same for varieties of any dimension: rationality of the zeta function, a functional equation, and a Riemann Hypothesis for each piece. These **Weil conjectures** shaped twentieth-century algebraic geometry. Bernard Dwork proved rationality in 1960, Alexander Grothendieck and his school built étale cohomology to provide the “space” on which Frobenius acts, and Pierre Deligne proved the Riemann Hypothesis part in 1974, for which he received the Fields Medal in 1978.:cite[deligne1974]

The finer distribution of the angles $\theta_p$ with $a_p = 2\sqrt p\cos\theta_p$, visible in the histogram above, is the **Sato–Tate conjecture**: for curves without complex multiplication, $\theta_p$ is distributed with density $\frac2\pi\sin^2\theta$, which makes $\cos\theta_p$ follow a semicircle. It was proved for elliptic curves over $\Q$ by Clozel, Harris, Shepherd-Barron and Taylor (2008) and Barnet-Lamb, Geraghty, Harris and Taylor (2011). The density $\frac2\pi\sin^2\theta$ is the distribution of eigenvalue angles of a random matrix in $SU(2)$: random matrices again.

## What the analogy teaches

| Integers | Polynomials over $\F_q$ / curves |
| --- | --- |
| $\zeta(s)$ | $\zeta_{\F_q[T]}(s) = \frac{1}{1 - q^{1-s}}$, $\zeta_E(s)$ |
| primes $p$ | irreducible polynomials, closed points |
| $\log p$ | $\deg P\cdot\log q$ |
| zeros on $\operatorname{Re}s = \frac12$? | zeros on $\operatorname{Re}s = \frac12$: **proved** |
| infinitely many zeros | finitely many (in $u = q^{-s}$) |
| operator? | Frobenius |
| positivity? | degrees, intersection numbers |

The function field proofs use a geometric object (the curve, its Frobenius, its intersection theory) that has no known counterpart for $\Z$. Finding the “curve” for which $\operatorname{Spec}\Z$ would be the analogue, sometimes called the “field with one element”, is one of the long-standing dreams of the subject.

:::key
- Over $\F_q[T]$: $\zeta(s) = 1/(1 - q^{1-s})$ has no zeros, and $I_n = \frac1n\sum_{d \mid n}\mu(d)q^{n/d} = \frac{q^n}{n} + O(\frac{q^{n/2}}{n})$, a PNT with square-root error.
- For $E: y^2 = x^3 + ax + b$, $N_p = p + 1 - a_p$ and Hasse: $|a_p| \le 2\sqrt p$, proved by positivity of the degree form and Cauchy–Schwarz for Frobenius.
- $Z(E, u) = \frac{1 - a_pu + pu^2}{(1 - u)(1 - pu)}$; Hasse’s bound is exactly the statement that the zeros of $\zeta_E(s) = Z(E, p^{-s})$ lie on $\operatorname{Re}s = \frac12$, and they are eigenvalues of Frobenius.
- Weil (curves, 1948) and Deligne (all varieties, 1974) proved the general finite field Riemann Hypothesis; Sato–Tate describes the angles. For $\zeta$ itself, the missing ingredient is the geometry that supplies positivity.
:::

:::exercises
1. List the monic irreducible polynomials of degree $1$, $2$ and $3$ over $\F_2$ and check $I_1 = 2$, $I_2 = 1$, $I_3 = 2$.
2. Show that $u\frac{d}{du}\log\prod_P(1 - u^{\deg P})^{-1} = \sum_n\Big(\sum_{d \mid n}dI_d\Big)u^n$, and complete the proof of $\sum_{d \mid n}dI_d = q^n$.
3. For $E: y^2 = x^3 - x$ and $p \equiv 3 \pmod 4$, show that $a_p = 0$. (The map $x \mapsto -x$ changes the sign of $x^3 - x$, and $-1$ is not a square modulo $p$.)
4. Using $N_m = p^m + 1 - \alpha^m - \beta^m$, compute the number of points of $y^2 = x^3 + x + 1$ over $\F_{25}$ from $N_1$ over $\F_5$. (You need $\alpha^2 + \beta^2 = a_p^2 - 2p$.)
5. Show that the functional equation $Z(E, \frac{1}{pu}) = Z(E, u)$ holds, and translate it into $\zeta_E(1 - s) = \zeta_E(s)$.
:::
