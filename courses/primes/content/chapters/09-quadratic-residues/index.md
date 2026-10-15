---
number: 9
title: Squares modulo p
summary: Which numbers are squares modulo a prime? Euler’s criterion, the Legendre and Jacobi symbols, infinitely many primes 4k + 1, quadratic reciprocity with Eisenstein’s lattice-point proof, the Solovay–Strassen test and square roots modulo p.
duration: About 2 hours
prerequisites: [fermat-euler]
theorems: [Euler’s criterion, −1 is a square mod p iff p ≡ 1 (mod 4), Infinitely many primes 4k + 1, Gauss’s lemma, The law of quadratic reciprocity]
techniques: [primitive roots, pairing arguments, counting lattice points]
---

Modulo $7$, the squares of $1, 2, \ldots, 6$ are $1, 4, 2, 2, 4, 1$. Only half the non-zero residues are squares: $1, 2, 4$. Which half, for a given prime, turns out to be one of the richest questions in elementary number theory. Gauss called its answer, the law of **quadratic reciprocity**, the *theorema aureum*, the golden theorem, and proved it eight different ways.

The course needs squares modulo $p$ for practical reasons too. Chapter 4 promised a proof that there are infinitely many primes of the form $4k + 1$; it is here. The Solovay–Strassen test, a cousin of Miller–Rabin, is built on squares; the quadratic sieve (Chapter 12) and Shor’s algorithm discussion (Chapter 13) need square roots modulo $p$; and the characters of Chapter 33 generalise the symbol defined below.

## Quadratic residues

:::definition
Let $p$ be an odd prime and $p \nmid a$. Then $a$ is a **quadratic residue** modulo $p$ if $a \equiv x^2 \pmod p$ for some $x$, and a **quadratic non-residue** otherwise.
:::

::squares-clock

:::lemma{status=proved}
Modulo an odd prime $p$, exactly $(p - 1)/2$ of the non-zero residues are quadratic residues.
:::

:::proof
$x^2 \equiv y^2$ means $p \mid (x - y)(x + y)$, so $y \equiv \pm x$ (Euclid’s lemma). So the $p - 1$ non-zero residues pair off as $\{x, -x\}$ (different, since $p$ is odd), and each pair has the same square, while different pairs have different squares. That gives $(p-1)/2$ squares.
:::

The **Legendre symbol** packages this:
$$\left(\frac ap\right) = \begin{cases} 0 & p \mid a, \\ +1 & a \text{ is a quadratic residue mod } p, \\ -1 & a \text{ is a non-residue mod } p.\end{cases}$$

### Euler’s criterion

How do you tell whether $a$ is a square without listing all the squares? Fermat’s little theorem says $a^{p-1} \equiv 1$, so $a^{(p-1)/2}$ is a square root of $1$, which modulo a prime means $\pm 1$. Euler noticed which sign you get.

:::theorem{name="Euler’s criterion" who="Leonhard Euler" year=1748 status=proved}
For an odd prime $p$ and any integer $a$,
$$\left(\frac ap\right) \equiv a^{(p-1)/2} \pmod p.$$
:::

:::proof
If $p \mid a$, both sides are $0$. Otherwise let $g$ be a primitive root modulo $p$ (Chapter 6) and write $a \equiv g^k$. The squares are exactly the even powers of $g$: $(g^j)^2 = g^{2j}$, and the $(p - 1)/2$ even powers $g^0, g^2, \ldots, g^{p-3}$ are distinct, so by the lemma they are all the squares. Now $g^{(p-1)/2}$ is a square root of $1$ that is not $1$ (the order of $g$ is $p - 1$), so it is $-1$. Hence
$$a^{(p-1)/2} = g^{k(p-1)/2} = \left(g^{(p-1)/2}\right)^k \equiv (-1)^k,$$
which is $+1$ exactly when $k$ is even, that is, when $a$ is a square.
:::

Two consequences follow at once. The symbol is **multiplicative**, $\left(\frac{ab}{p}\right) = \left(\frac ap\right)\left(\frac bp\right)$ (multiply the right-hand sides of Euler’s criterion): the product of two non-residues is a residue. And it can be computed with one modular exponentiation.

### When is $-1$ a square?

Put $a = -1$ in Euler’s criterion: $\left(\frac{-1}{p}\right) = (-1)^{(p-1)/2}$, which is $+1$ exactly when $(p - 1)/2$ is even.

:::corollary{status=proved}
$-1$ is a square modulo an odd prime $p$ if and only if $p \equiv 1 \pmod 4$.
:::

Chapter 4 proved that there are infinitely many primes $4k + 3$ and promised the other case. Here it is.

:::theorem{status=proved}
There are infinitely many primes of the form $4k + 1$.
:::

:::proof
Let $p_1, \ldots, p_n$ be any finite list of primes of the form $4k+1$, and let $N = (2p_1 \cdots p_n)^2 + 1$. Let $q$ be any prime factor of $N$. Then $q$ is odd (since $N$ is odd), and $(2p_1 \cdots p_n)^2 \equiv -1 \pmod q$, so $-1$ is a square modulo $q$, and therefore $q \equiv 1 \pmod 4$. If $q$ were some $p_i$, it would divide $N$ and $N - 1$, hence $1$. So $q$ is a new prime of the form $4k + 1$.
:::

The same fact is the key to Fermat’s theorem that every prime $p \equiv 1 \pmod 4$ is a sum of two squares (Chapter 35): if $x^2 \equiv -1 \pmod p$, then $p$ divides $x^2 + 1 = (x + i)(x - i)$, and that factorisation in the Gaussian integers does the rest.

```quiz
q: Is $3$ a quadratic residue modulo $13$?
options:
  - text: Yes
    correct: true
    why: '$4^2 = 16 \equiv 3 \pmod{13}$. Or by Euler: $3^6 = 729 = 56 \cdot 13 + 1 \equiv 1$.'
  - text: No
    why: 'Check the squares mod $13$: $1, 4, 9, 3, 12, 10$. $3$ is among them ($4^2 = 16$).'
```

## The law of quadratic reciprocity

Given an odd prime $q$, for which primes $p$ is $q$ a square modulo $p$? The answer is astonishing: it depends only on $p$ modulo $4q$, and it is tied to whether $p$ is a square modulo $q$.

:::theorem{name="The law of quadratic reciprocity" who="conjectured by Euler and Legendre; proved by Gauss" year=1796 status=proved}
For distinct odd primes $p$ and $q$,
$$\left(\frac pq\right)\left(\frac qp\right) = (-1)^{\frac{p-1}{2} \cdot \frac{q-1}{2}}.$$
Equivalently: $\left(\frac pq\right) = \left(\frac qp\right)$, unless $p \equiv q \equiv 3 \pmod 4$, in which case $\left(\frac pq\right) = -\left(\frac qp\right)$. Together with the **supplementary laws**
$$\left(\frac{-1}{p}\right) = (-1)^{(p-1)/2}, \qquad \left(\frac 2p\right) = (-1)^{(p^2-1)/8},$$
it determines $\left(\frac ap\right)$ for every $a$.
:::

Euler found it empirically in the 1740s; Legendre published a flawed proof in 1785 and gave the symbol its name; Gauss, aged eighteen, found the first complete proof in April 1796 and published it in the *Disquisitiones*. He later gave seven more. Today there are well over three hundred published proofs.:cite[lemmermeyer,gauss1801]

Before proving it, watch it work. Is $5$ a square modulo $103$? Since $5 \equiv 1 \pmod 4$, $\left(\frac{5}{103}\right) = \left(\frac{103}{5}\right) = \left(\frac{3}{5}\right)$, and the squares modulo $5$ are $1$ and $4$, so the answer is $-1$: no. Reciprocity turns a question about a large modulus into one about a small modulus, exactly like a step of Euclid’s algorithm.

### Gauss’s lemma and the case $a = 2$

The proof goes through a lemma that counts signs.

:::lemma{name="Gauss’s lemma" status=proved}
Let $p$ be an odd prime and $p \nmid a$. Reduce the numbers $a, 2a, \ldots, \frac{p-1}{2}a$ modulo $p$ into the interval $\left(-\frac p2, \frac p2\right)$, and let $\mu$ be how many of them are negative. Then $\left(\frac ap\right) = (-1)^\mu$.
:::

:::proof
Write the reduced values as $\pm r_k$ with $1 \le r_k \le \frac{p-1}{2}$. The $r_k$ are all different: if $ia \equiv \pm ja$ then $i \equiv \pm j$, and for $1 \le i, j \le \frac{p-1}{2}$ that forces $i = j$. So $r_1, \ldots, r_{(p-1)/2}$ is a rearrangement of $1, \ldots, \frac{p-1}{2}$. Multiplying all the congruences $ka \equiv \pm r_k$:
$$a^{(p-1)/2} \left(\tfrac{p-1}{2}\right)! \equiv (-1)^\mu \left(\tfrac{p-1}{2}\right)! \pmod p.$$
Cancel the factorial and apply Euler’s criterion.
:::

For $a = 2$ the numbers $2, 4, \ldots, p - 1$ are easy to sort: those above $p/2$ become negative. Counting them for each $p \bmod 8$ gives the second supplementary law: $2$ is a square modulo $p$ exactly when $p \equiv \pm 1 \pmod 8$ (exercise 1).

### Eisenstein’s proof

Gotthold Eisenstein turned Gauss’s lemma into a count of lattice points in 1844.:cite[eisenstein1844] Here is the picture: draw the rectangle of lattice points with $1 \le x \le \frac{p-1}{2}$ and $1 \le y \le \frac{q-1}{2}$, and the diagonal $y = \frac qp x$.

::lattice-count

::::zoom{levels="Idea, Sketch, Proof"}
:::level[Idea]
The number of lattice points below the diagonal has the same parity as Gauss’s $\mu$ for $\left(\frac qp\right)$; the number above has the parity of $\mu$ for $\left(\frac pq\right)$. Together they fill the rectangle, which has $\frac{p-1}{2} \cdot \frac{q-1}{2}$ points.
:::
:::level[Sketch]
(1) *Eisenstein’s lemma*: for odd $a$, $\mu \equiv \sum_{k=1}^{(p-1)/2} \lfloor ka/p \rfloor \pmod 2$, by summing $ka = p\lfloor ka/p\rfloor + (\text{remainder})$ over $k$ and reducing modulo $2$. (2) With $a = q$, the sum counts the lattice points under the diagonal, column by column. (3) Symmetrically, $\left(\frac pq\right) = (-1)^{\text{points above}}$. (4) No lattice point lies on the diagonal, since $p \nmid qx$ for $x < p$. So the two counts add up to the size of the rectangle.
:::
:::level[Proof]
*Step 1 (Eisenstein’s lemma).* Let $a$ be odd, $p \nmid a$, and $m = \frac{p-1}{2}$. For $k = 1, \ldots, m$ write $ka = p \lfloor ka/p \rfloor + t_k$ with $0 < t_k < p$. In Gauss’s lemma, $ka$ reduces to a negative number exactly when $t_k > p/2$; there are $\mu$ such $k$, and for them the absolute value is $p - t_k$. As shown in the proof of Gauss’s lemma, the numbers $\{t_k : t_k < p/2\} \cup \{p - t_k : t_k > p/2\}$ are exactly $1, \ldots, m$. So, writing $L = \sum_{t_k > p/2} t_k$,
$$\sum_{k=1}^m k = \sum_{t_k < p/2} t_k + \sum_{t_k > p/2} (p - t_k) = \sum_{k=1}^m t_k - 2L + \mu p.$$
Summing the defining equations, $a \sum_k k = pT + \sum_k t_k$ with $T = \sum_{k=1}^m \lfloor ka/p \rfloor$. Subtract:
$$(a - 1)\sum_{k=1}^m k = pT - \mu p + 2L.$$
Modulo $2$, the left side is $0$ (as $a$ is odd) and $p \equiv 1$, so $T \equiv \mu$. By Gauss’s lemma, $\left(\frac ap\right) = (-1)^T$.

*Step 2.* With $a = q$, $T = \sum_{x=1}^{(p-1)/2} \lfloor qx/p \rfloor$. For each column $x$, the lattice points $(x, y)$ with $1 \le y < qx/p$ number $\lfloor qx/p \rfloor$, and they lie in the rectangle because $qx/p < q/2$. So $T$ is the number of lattice points of the rectangle strictly below the diagonal.

*Step 3.* By the same argument with the roles of $p$ and $q$ (and $x$ and $y$) exchanged, $\left(\frac pq\right) = (-1)^{T'}$, where $T'$ is the number of lattice points strictly above the diagonal.

*Step 4.* A lattice point on the diagonal would have $py = qx$ with $1 \le x < p$, so $p \mid qx$, impossible. So every one of the $\frac{p-1}{2} \cdot \frac{q-1}{2}$ points is either below or above, $T + T' = \frac{p-1}{2}\cdot\frac{q-1}{2}$, and
$$\left(\frac qp\right)\left(\frac pq\right) = (-1)^{T + T'} = (-1)^{\frac{p-1}{2}\cdot\frac{q-1}{2}}.$$
:::
::::

:::bridge
Proofcraft, Chapter 10, builds the same proof step by step as a proof-writing exercise, with more emphasis on how one might discover it.
:::

## The Jacobi symbol

To use reciprocity like Euclid’s algorithm, you would have to factor the numbers that appear along the way into primes. Jacobi removed that need in 1837. For odd $n = p_1 p_2 \cdots p_k$ (primes, possibly repeated), define

$$\left(\frac an\right) = \left(\frac{a}{p_1}\right)\left(\frac{a}{p_2}\right) \cdots \left(\frac{a}{p_k}\right).$$

The **Jacobi symbol** satisfies the same reciprocity law and supplementary laws for any odd positive $m, n$ (they follow from the prime case by multiplying, since $(-1)^{(m-1)/2}$ is multiplicative in odd $m$; exercise 3). So you can compute it like a gcd, without factoring: reduce $a$ modulo $n$, pull out factors of $2$ with the supplementary law, flip with reciprocity, repeat. It costs $O(\log n)$ steps, like Euclid.

:::warning
For composite $n$, $\left(\frac an\right) = 1$ does **not** mean $a$ is a square modulo $n$. For example $\left(\frac{2}{15}\right) = \left(\frac 23\right)\left(\frac 25\right) = (-1)(-1) = 1$, but $2$ is not a square modulo $15$ (it is not even a square modulo $3$). The Jacobi symbol is a computational device; its value $-1$ does certify a non-square.
:::

```code
id: residues/jacobi
title: The Jacobi symbol
prompt: |
  Write `jacobi(a, n)` for bigints with $n$ odd and positive, returning $-1$, $0$ or $1$ as a number. Use the Euclid-like algorithm: reduce $a$ modulo $n$; while $a \neq 0$, remove factors of $2$ from $a$ (each flips the sign when $n \equiv 3$ or $5 \pmod 8$), then swap $a$ and $n$ (flipping the sign when both are $\equiv 3 \pmod 4$) and reduce again. At the end, the answer is the accumulated sign if $n = 1$, and $0$ otherwise.
starter: |
  export function jacobi(a: bigint, n: bigint): number {
    let result = 1;
    // Your code here.
    return result;
  }
tests: |
  import { test, expect } from 'test';
  import { jacobi } from 'solution';
  import { jacobi as reference, legendre, primesUpTo } from 'primes';

  test('agrees with Euler’s criterion for primes', () => {
    for (const p of primesUpTo(200).slice(1)) for (let a = 0; a < p; a++) expect(jacobi(BigInt(a), BigInt(p))).toBe(legendre(a, p));
  });
  test('composite moduli, negative and large a', () => {
    for (let n = 1n; n < 200n; n += 2n) for (let a = -50n; a < 250n; a += 7n) expect(jacobi(a, n)).toBe(reference(a, n));
  });
  test('the examples from the text', () => {
    expect(jacobi(2n, 15n)).toBe(1);
    expect(jacobi(5n, 103n)).toBe(-1);
    expect(jacobi(1001n, 9907n)).toBe(-1);
  });
  test('huge inputs', () => {
    const n = 2n ** 127n - 1n;
    expect(jacobi(3n ** 80n + 1n, n)).toBe(reference(3n ** 80n + 1n, n));
  });
solution: |
  export function jacobi(a: bigint, n: bigint): number {
    a = ((a % n) + n) % n;
    let result = 1;
    while (a !== 0n) {
      while (a % 2n === 0n) {
        a /= 2n;
        const r = n % 8n;
        if (r === 3n || r === 5n) result = -result;
      }
      [a, n] = [n, a];
      if (a % 4n === 3n && n % 4n === 3n) result = -result;
      a %= n;
    }
    return n === 1n ? result : 0;
  }
hints:
  - The second supplementary law says $\left(\frac 2n\right) = -1$ exactly when $n \equiv 3$ or $5 \pmod 8$.
  - After the swap, the new modulus is the old $a$, which is odd because you removed all its factors of $2$.
```

## The Solovay–Strassen test

Euler’s criterion holds for every prime. For a composite odd $n$, compare $a^{(n-1)/2} \bmod n$ with the Jacobi symbol $\left(\frac an\right)$; if they differ, $n$ is certainly composite. A composite $n$ for which they agree is an **Euler pseudoprime** to base $a$, and $a$ is an **Euler liar**.

:::theorem{name="Solovay–Strassen" year=1977 status=sketched}
For odd composite $n$, at most half of the units modulo $n$ are Euler liars.
:::

*Sketch.* The Euler liars form a subgroup of the units (both sides of the test are multiplicative in $a$). It is proper: if $p^2 \mid n$ for some prime $p$, an element of order $p$ modulo $p^2$ (lifted by the Chinese remainder theorem) breaks it; if $n = p m$ is squarefree, choose $a$ to be a non-residue modulo $p$ and $1$ modulo $m$, so that $\left(\frac an\right) = -1$ while $a^{(n-1)/2} \equiv 1 \pmod m$, which rules out $a^{(n-1)/2} \equiv -1 \pmod n$. Lagrange’s theorem gives the bound.:cite[solovay-strassen]

Robert Solovay and Volker Strassen published this in 1977, and it was the first randomised primality test to be widely noticed. Miller–Rabin has since replaced it in practice, because every strong liar is an Euler liar (Chapter 8, exercise 3) and strong liars are at most a quarter of the bases, not a half.

:::note
**A stopping point.** The last section, on computing square roots modulo $p$, is needed in Chapter 12.
:::

## Square roots modulo $p$

If $a$ is a quadratic residue, how do you find $x$ with $x^2 \equiv a$? For half of all primes it is a single exponentiation.

:::theorem{status=proved}
If $p \equiv 3 \pmod 4$ and $a$ is a quadratic residue modulo $p$, then $x = a^{(p+1)/4}$ satisfies $x^2 \equiv a \pmod p$.
:::

:::proof
$(p + 1)/4$ is an integer, and $x^2 = a^{(p+1)/2} = a \cdot a^{(p-1)/2} \equiv a \cdot 1$ by Euler’s criterion.
:::

For $p \equiv 1 \pmod 4$ there is no such formula, but there are efficient algorithms. The **Tonelli–Shanks algorithm** (Tonelli 1891, Shanks 1973) writes $p - 1 = 2^s d$ with $d$ odd, starts from the guess $x = a^{(d+1)/2}$, for which $x^2 = a \cdot a^d$, and then repairs the error $a^d$ (an element whose order is a power of $2$) using powers of a fixed non-residue, one bit at a time. It takes $O(s^2)$ multiplications after the initial exponentiations. Finding the non-residue is the only randomised step: half of all residues work, but nobody can prove that a *small* non-residue always exists without assuming the generalised Riemann Hypothesis, under which one below $2(\log p)^2$ exists.:cite[crandall-pomerance]

Modulo a composite $n = pq$, square roots are as hard as factoring. If you could find square roots modulo $n$, pick a random $x$, ask for a square root $y$ of $x^2$; with probability $\frac12$, $y \not\equiv \pm x$, and then $\gcd(x - y, n)$ is a factor. This is the reason the Rabin cryptosystem is provably as hard to break as factoring, and it is the same trick the quadratic sieve (Chapter 12) is built on.

:::key
- Modulo an odd prime, half the non-zero residues are squares. Euler’s criterion: $\left(\frac ap\right) \equiv a^{(p-1)/2}$.
- $-1$ is a square iff $p \equiv 1 \pmod 4$; hence infinitely many primes $4k + 1$. $2$ is a square iff $p \equiv \pm 1 \pmod 8$.
- Quadratic reciprocity: $\left(\frac pq\right)\left(\frac qp\right) = (-1)^{\frac{p-1}{2}\frac{q-1}{2}}$. Eisenstein’s proof counts lattice points on the two sides of a diagonal.
- The Jacobi symbol extends the Legendre symbol to odd moduli and is computed like a gcd. Solovay–Strassen tests primality with it.
- Square roots modulo $p$ are easy (one exponentiation when $p \equiv 3 \bmod 4$; Tonelli–Shanks otherwise); modulo $pq$ they are as hard as factoring.
:::

:::exercises
1. Use Gauss’s lemma with $a = 2$ to show that $\left(\frac 2p\right) = 1$ exactly when $p \equiv \pm 1 \pmod 8$. Then show there are infinitely many primes $8k + 7$. (Hint: consider $\frac12\left((4p_1 \cdots p_n)^2 - 2\right) = 8(p_1 \cdots p_n)^2 - 1$.)
2. For which primes $p$ is $3$ a quadratic residue? Answer in terms of $p \bmod 12$.
3. Show that $\varepsilon(n) = (-1)^{(n-1)/2}$ satisfies $\varepsilon(mn) = \varepsilon(m)\varepsilon(n)$ for odd $m, n$, and use it to extend quadratic reciprocity to the Jacobi symbol.
4. Show that if $p \equiv 1 \pmod 4$ is prime and $x = \left(\frac{p-1}{2}\right)!$, then $x^2 \equiv -1 \pmod p$ (this is Chapter 6, exercise 2). Use it to find a square root of $-1$ modulo $13$.
:::
