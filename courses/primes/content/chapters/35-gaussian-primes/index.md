---
number: 35
title: Gaussian primes
summary: "Primes in the Gaussian integers ℤ[i]: unique factorisation, the three kinds of Gaussian primes, Fermat’s two-squares theorem twice (via ℤ[i] and via Zagier’s one-sentence proof), how many ways n is a sum of two squares, why L(1, χ₋₄) = π/4, and the open problem of the Gaussian moat."
duration: About 1¼ hours
prerequisites: [unique-factorisation, quadratic-residues, dirichlet]
theorems: ["ℤ[i] has unique factorisation", "Classification of Gaussian primes", "Fermat’s two-squares theorem", "r₂(n) = 4 Σ χ₋₄(d)", "L(1", "χ₋₄) = π/4"]
techniques: [Euclidean domains, norms, involutions, lattice point counting]
---

Fermat claimed in a letter to Mersenne on Christmas Day 1640 that every prime $p \equiv 1 \pmod 4$ is a sum of two squares: $5 = 1^2 + 2^2$, $13 = 2^2 + 3^2$, $17 = 1^2 + 4^2$. Euler found the first proof in 1749, after years of effort. This chapter gives two proofs: one through the Gaussian integers, which explains *why* the theorem is true by showing that $p$ stops being prime in a larger number system, and one of a single sentence.

## The Gaussian integers

The **Gaussian integers** are the complex numbers $a + bi$ with $a, b \in \Z$. They form a ring $\Z[i]$, a square grid in the complex plane. The **norm** $N(a + bi) = a^2 + b^2 = |a + bi|^2$ is multiplicative, $N(\alpha\beta) = N(\alpha)N(\beta)$, and the **units** (elements with an inverse) are those of norm $1$: $\pm1$ and $\pm i$. Two elements that differ by a unit factor are **associates**. A **Gaussian prime** is a non-unit $\pi$ whose only divisors are units and associates of $\pi$.

:::theorem{status=proved}
$\Z[i]$ has division with remainder: for $\alpha, \beta \in \Z[i]$ with $\beta \ne 0$ there are $\kappa, \rho$ with $\alpha = \kappa\beta + \rho$ and $N(\rho) < N(\beta)$. Consequently $\Z[i]$ has a Euclidean algorithm, Bézout’s identity, and unique factorisation into Gaussian primes (up to order and units).
:::

:::proof
Compute $\alpha/\beta = x + yi \in \C$ and round each coordinate to a nearest integer: $\kappa = m + ni$ with $|x - m|, |y - n| \le \frac12$. Then $\rho = \alpha - \kappa\beta = \beta\big((x - m) + (y - n)i\big)$ has $N(\rho) \le N(\beta)\left(\frac14 + \frac14\right) < N(\beta)$. Since the norm is a positive integer that decreases at each step, the Euclidean algorithm terminates, and the proofs of Chapters 2 and 3 go through unchanged: Bézout, then Euclid’s lemma ($\pi \mid \alpha\beta \Rightarrow \pi \mid \alpha$ or $\pi \mid \beta$), then unique factorisation.
:::

## Which Gaussian integers are prime?

::gaussian-primes

:::theorem{name="The Gaussian primes" status=proved}
Up to associates, the Gaussian primes are:
1. $1 + i$, of norm $2$; and $2 = -i(1 + i)^2$;
2. the rational primes $q \equiv 3 \pmod 4$, which stay prime in $\Z[i]$ (they are **inert**);
3. for each rational prime $p \equiv 1 \pmod 4$, the two conjugates $a + bi$ and $a - bi$, where $p = a^2 + b^2$; then $p = (a + bi)(a - bi)$ **splits**.
:::

:::proof
Let $\pi$ be a Gaussian prime. It divides $N(\pi) = \pi\bar\pi$, a product of rational primes, so by Euclid’s lemma in $\Z[i]$ it divides some rational prime $p$. Then $N(\pi)$ divides $N(p) = p^2$, so $N(\pi)$ is $p$ or $p^2$. In the second case $\pi$ is an associate of $p$, and $p$ itself is a Gaussian prime. In the first case $\pi\bar\pi = p$ and $p$ is a sum of two squares. So the question is: for which $p$ is $p$ itself a Gaussian prime?

- $p \equiv 3 \pmod 4$: squares are $0$ or $1 \pmod 4$, so $a^2 + b^2 \equiv 3$ is impossible; no $\pi$ has norm $p$, and $p$ is a Gaussian prime.
- $p \equiv 1 \pmod 4$: $-1$ is a square modulo $p$ (Chapter 9), say $p \mid r^2 + 1 = (r + i)(r - i)$. But $p$ divides neither factor, since $\frac{r}{p} \pm \frac{i}{p} \notin \Z[i]$. So $p$ is not a Gaussian prime, and it has a factor $\pi$ with $N(\pi) = p$. Writing $\pi = a + bi$ gives $p = a^2 + b^2$.
- $p = 2 = (1 + i)(1 - i)$, and $1 - i = -i(1 + i)$.
:::

The middle case is **Fermat’s two-squares theorem**: an odd prime is a sum of two squares if and only if it is $\equiv 1 \pmod 4$. The proof turns a fact about $p$ (that $-1$ is a square modulo $p$) into a factorisation in a larger ring. The same idea, applied to other rings like $\Z[\sqrt{-2}]$ and $\Z[\omega]$ with $\omega = e^{2\pi i/3}$, gives $p = a^2 + 2b^2$ for $p \equiv 1, 3 \pmod 8$ and $p = a^2 + ab + b^2$ for $p \equiv 1 \pmod 3$. When the ring lacks unique factorisation, the story becomes class field theory.

```code
id: gaussian/two-squares
title: Find the two squares
prompt: |
  Write `twoSquares(p)` for a prime $p \equiv 1 \pmod 4$ below $10^9$, returning `[a, b]` with $a^2 + b^2 = p$ and $a > b > 0$. Use the method in the proof: find $r$ with $r^2 \equiv -1 \pmod p$ (take $r = c^{(p-1)/4} \bmod p$ for any $c$ with $c^{(p-1)/2} \equiv -1$), then run the Euclidean algorithm on $(p, r)$ and stop at the first remainder below $\sqrt p$: that remainder is $a$ (this is the Hermite–Serret, or Cornacchia, algorithm). Use `modPow` from the library to avoid overflow.
starter: |
  import { modPow } from 'primes';

  export function twoSquares(p: number): [number, number] {
    return [0, 0];
  }
tests: |
  import { test, expect } from 'test';
  import { twoSquares } from 'solution';
  import { primesUpTo, isPrime } from 'primes';

  test('small primes', () => {
    expect(twoSquares(5)).toEqual([2, 1]);
    expect(twoSquares(13)).toEqual([3, 2]);
    expect(twoSquares(97)).toEqual([9, 4]);
  });
  test('every p ≡ 1 (mod 4) below 20,000', () => {
    for (const p of primesUpTo(20000)) {
      if (p % 4 !== 1) continue;
      const [a, b] = twoSquares(p);
      expect(a * a + b * b).toBe(p);
      expect(a > b && b > 0).toBe(true);
    }
  });
  test('a large prime', () => {
    let q = 999999001;
    while (!(isPrime(q) && q % 4 === 1)) q += 2;
    const [a, b] = twoSquares(q);
    expect(BigInt(a) ** 2n + BigInt(b) ** 2n).toBe(BigInt(q));
  });
solution: |
  import { modPow } from 'primes';

  export function twoSquares(p: number): [number, number] {
    let r = 0;
    for (let c = 2; ; c++) {
      if (modPow(c, (p - 1) / 2, p) === p - 1) {
        r = modPow(c, (p - 1) / 4, p);
        break;
      }
    }
    let x = p;
    let y = r;
    while (y * y > p) [x, y] = [y, x % y];
    const a = y;
    const b = Math.round(Math.sqrt(p - a * a));
    return a > b ? [a, b] : [b, a];
  }
hints:
  - Half of all $c$ are non-residues, so the search for $c$ ends quickly.
  - The remainders of the Euclidean algorithm on $(p, r)$ decrease; the first one with square less than $p$ is $a$, and then $p - a^2$ is a perfect square.
```

## A proof in one sentence

In 1990 Don Zagier published a proof of Fermat’s theorem consisting of a single (long) sentence, distilled from an argument of Roger Heath-Brown.:cite[zagier1990] For a prime $p \equiv 1 \pmod 4$, let
$$S = \{(x, y, z) \in \N^3 : x^2 + 4yz = p\}.$$
It is a finite set. The map
$$(x, y, z) \mapsto \begin{cases}(x + 2z,\ z,\ y - x - z) & \text{if } x < y - z,\\ (2y - x,\ y,\ x - y + z) & \text{if } y - z < x < 2y,\\ (x - 2y,\ x - y + z,\ y) & \text{if } x > 2y\end{cases}$$
sends $S$ to itself and is an **involution** (applying it twice gives back the input); this is a direct check. An involution pairs up the elements it does not fix, so $|S|$ has the same parity as its number of fixed points. A fixed point must be in the middle case with $x = y$, so $p = x(x + 4z)$, forcing $x = 1$ and $z = \frac{p-1}{4}$: exactly one fixed point. So $|S|$ is odd. But the simpler involution $(x, y, z) \mapsto (x, z, y)$ also acts on $S$, so it too has an odd number of fixed points, hence at least one: a triple with $y = z$, and then $p = x^2 + 4y^2 = x^2 + (2y)^2$.

::zagier-proof

The proof is not constructive, and it does not say why the theorem is true in the way the Gaussian proof does; but it is short enough to check in a minute, and it shows that parity arguments can do real work.

## How many ways to be a sum of two squares

Let $r_2(n)$ be the number of pairs $(a, b) \in \Z^2$ with $a^2 + b^2 = n$ (signs and order count, so $r_2(5) = 8$). Each such pair is a Gaussian integer of norm $n$, and unique factorisation counts them.

:::theorem{name="Jacobi’s two-squares formula" status=sketched}
$r_2(n) = 4\sum_{d \mid n}\chi_{-4}(d)$, where $\chi_{-4}$ is the non-principal character modulo $4$: four times the number of divisors $\equiv 1 \pmod 4$ minus the number $\equiv 3 \pmod 4$.
:::

The idea: factor $n = 2^e\prod p_j^{a_j}\prod q_k^{b_k}$ with $p_j \equiv 1$ and $q_k \equiv 3 \pmod 4$. An element of norm $n$ must contain each inert $q_k$ to the power $b_k/2$ (so if some $b_k$ is odd there are none), has a forced power of $1 + i$, and for each split $p_j = \pi_j\bar\pi_j$ can choose how many of the $a_j$ factors are $\pi_j$ and how many $\bar\pi_j$: $a_j + 1$ ways. Times $4$ units. And $\sum_{d \mid n}\chi_{-4}(d)$ is multiplicative with the same values: $a_j + 1$ at $p_j^{a_j}$, $1$ or $0$ at $q_k^{b_k}$ according to the parity of $b_k$, and $1$ at $2^e$.

Now add up. The number of lattice points in the disc of radius $\sqrt x$ is $\sum_{n \le x}r_2(n) = \pi x + O(\sqrt x)$ (each lattice point owns a unit square, and the squares cover the disc up to a boundary strip). On the other side,
$$\sum_{n \le x}4\sum_{d \mid n}\chi_{-4}(d) = 4\sum_{d \le x}\chi_{-4}(d)\left\lfloor\frac xd\right\rfloor = 4x\sum_{d \le x}\frac{\chi_{-4}(d)}{d} + O(\sqrt x)$$
(with a little care, using the hyperbola method). Comparing, $L(1, \chi_{-4}) = \sum_{d \ge 1}\frac{\chi_{-4}(d)}{d} = 1 - \frac13 + \frac15 - \cdots = \frac\pi4$. This is Leibniz’s series, here as the simplest case of Dirichlet’s **class number formula**: the value of $L(1, \chi)$ counts lattice points, which is why it cannot be zero (Chapter 33).

## Open questions

**The Gaussian moat.** Can you walk from the origin to infinity stepping only on Gaussian primes, with steps of bounded length? Since rational primes have arbitrarily large gaps, you cannot along the real axis, but in the plane there is much more room. It is believed that you cannot: Gethner, Wagon and Wick showed in 1998 that steps of length $\sqrt{26}$ are not enough.:cite[gww1998] The widget’s “reachable” mode shows the walks for small steps being trapped. For general step lengths, the problem is open.

**Primes of special forms.** Every prime $p \equiv 1 \pmod 4$ is $a^2 + b^2$, but can we also ask $b$ to be special? Friedlander and Iwaniec proved in 1998 that there are infinitely many primes of the form $a^2 + b^4$, and Heath-Brown in 2001 that there are infinitely many of the form $a^3 + 2b^3$. Whether there are infinitely many primes $n^2 + 1$ (the case $b = 1$) is one of Landau’s four problems, still open (Chapter 38).

:::key
- $\Z[i]$ has a norm $a^2 + b^2$, division with remainder, and unique factorisation.
- Gaussian primes: $1 + i$; rational $q \equiv 3 \pmod 4$ (inert); and $a \pm bi$ with $a^2 + b^2 = p \equiv 1 \pmod 4$ (split).
- Fermat’s two-squares theorem follows: $-1$ is a square mod $p$, so $p \mid (r + i)(r - i)$ without dividing either factor. Zagier’s involution gives a one-sentence proof.
- $r_2(n) = 4\sum_{d \mid n}\chi_{-4}(d)$; counting lattice points in a circle gives $L(1, \chi_{-4}) = \pi/4$.
- Open: whether a bounded-step walk on Gaussian primes can reach infinity (the Gaussian moat).
:::

:::exercises
1. Factor $5$, $13$, $65$ and $3 + 4i$ into Gaussian primes.
2. Show that $n$ is a sum of two squares if and only if every prime $q \equiv 3 \pmod 4$ divides $n$ to an even power.
3. Check that Zagier’s map is an involution on $S$ and that it maps $S$ to $S$.
4. Compute $r_2(25)$ and $r_2(325)$ from the formula, and list the representations.
5. Give a Euclid-style proof that there are infinitely many Gaussian primes, and explain why that also follows from the classification and Dirichlet’s theorem.
:::
