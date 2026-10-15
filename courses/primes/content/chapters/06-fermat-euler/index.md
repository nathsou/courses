---
number: 6
title: Fermat, Euler and the group of units
summary: Fermat’s little theorem proved twice (by counting necklaces, and by shuffling units), Lagrange’s theorem, Euler’s theorem, Wilson’s theorem, and the existence of primitive roots.
duration: About 1½ hours
prerequisites: [modular-arithmetic]
theorems: [Fermat’s little theorem, Euler’s theorem, Wilson’s theorem, Primitive roots exist modulo every prime]
techniques: [counting orbits, bijections, groups and cosets, counting by order]
---

Compute $2^{10} \bmod 11$, $3^{10} \bmod 11$, $5^{10} \bmod 11$. Each time you get $1$. Try $a^{12} \bmod 13$ for any $a$ not divisible by $13$: $1$ again. This is **Fermat’s little theorem**, and it is the single most useful fact in computational number theory. It gives the primality tests of Chapter 8, the RSA cryptosystem of Chapter 13 and the Lucas–Lehmer test of Chapter 10.

This chapter proves it twice. The first proof counts necklaces. The second shuffles the units modulo $p$, and it generalises at once to Euler’s theorem for any modulus and to the language of **groups**, which organises everything that follows. The chapter ends with **primitive roots**: modulo a prime, some number has every unit as a power.

## Fermat’s little theorem

:::theorem{name="Fermat’s little theorem" who="Pierre de Fermat" year=1640 status=proved}
If $p$ is prime and $a$ is any integer, then $a^p \equiv a \pmod p$. If moreover $p \nmid a$, then $a^{p-1} \equiv 1 \pmod p$.
:::

Fermat stated it in a letter to Frénicle de Bessy in 1640, without proof, as was his habit. Leibniz proved it in unpublished notes before 1683, and Euler gave a proof in 1736 and several more later.:cite[weil-number-theory] The two forms are equivalent: if $p \nmid a$, then $a$ is invertible modulo $p$ and you may cancel one factor $a$ from $a^p \equiv a$; if $p \mid a$, both sides of $a^p \equiv a$ are $0$.

### First proof: necklaces

Make necklaces of $p$ beads, each bead one of $a$ colours. As strings, read clockwise from a fixed clasp, there are $a^p$ of them. But rotating a necklace does not change it, so several strings can describe the same necklace.

::necklaces

With $5$ beads, each necklace that uses at least two colours stands for exactly $5$ strings; with $4$ or $6$ beads, some stand for fewer.

::::zoom{levels="Idea, Proof"}
:::level[Idea]
Group the $a^p$ strings into rotation classes. The $a$ one-colour strings are classes of size $1$. For prime $p$, every other class has exactly $p$ members. So $a^p - a$ is a multiple of $p$.
:::
:::level[Proof]
Let $a \ge 1$ (the case $a \le 0$ follows, since $a^p \equiv a$ depends only on $a \bmod p$). Consider all $a^p$ strings $s = (s_0, \ldots, s_{p-1})$ of colours, and let the rotation $\rho$ act by $\rho(s) = (s_1, \ldots, s_{p-1}, s_0)$. The strings $s, \rho(s), \rho^2(s), \ldots$ form the **orbit** of $s$; since $\rho^p$ is the identity, it has at most $p$ members, and different orbits do not overlap.

Suppose $\rho^k(s) = s$ for some $0 < k < p$; that is, $s_i = s_{i+k}$ for all $i$, with indices taken modulo $p$. Since $p$ is prime, $\gcd(k, p) = 1$, so $k$ has an inverse modulo $p$ and every index $j$ is $\equiv mk \pmod p$ for some $m$. Then $s_0 = s_k = s_{2k} = \cdots = s_{mk} = s_j$: the string is constant. So for a non-constant string, $s, \rho(s), \ldots, \rho^{p-1}(s)$ are all different, and its orbit has exactly $p$ members.

The $a^p$ strings therefore split into $a$ constant strings and some number $N$ of orbits of size $p$: $a^p = a + pN$. So $p \mid a^p - a$.
:::
::::

This proof explains *where* the primality of $p$ is used: a rotation by a step not dividing the length cannot fix a non-constant pattern. For $p = 4$ the string $(1, 0, 1, 0)$ is fixed by a half turn, and indeed $4 \nmid 2^4 - 2 = 14$.

### Second proof: shuffling the units

:::proof[Proof (Ivory, 1806; Dirichlet)]
Let $p \nmid a$. The numbers $a, 2a, 3a, \ldots, (p-1)a$ are all non-zero modulo $p$ (Euclid’s lemma), and they are all different modulo $p$: if $ia \equiv ja$ then, cancelling the invertible $a$, $i \equiv j$. So they are $1, 2, \ldots, p - 1$ in some order. Multiply them all together:
$$a \cdot 2a \cdots (p-1)a \equiv 1 \cdot 2 \cdots (p - 1) \pmod p, \quad\text{that is,}\quad a^{p-1} (p-1)! \equiv (p-1)! \pmod p.$$
$(p - 1)!$ is a product of units, hence a unit, so it can be cancelled: $a^{p-1} \equiv 1 \pmod p$.
:::

This proof uses only that multiplication by $a$ **permutes** the units modulo $p$. Nothing stops us from replacing $p$ by any modulus $n$ and $1, \ldots, p - 1$ by the $\varphi(n)$ units modulo $n$.

:::theorem{name="Euler’s theorem" who="Leonhard Euler" year=1763 status=proved}
If $\gcd(a, n) = 1$, then $a^{\varphi(n)} \equiv 1 \pmod n$.
:::

:::proof
Let $u_1, \ldots, u_{\varphi(n)}$ be the units modulo $n$. Multiplication by $a$ (itself a unit) sends units to units, and it is one-to-one, because $a$ can be cancelled. So $au_1, \ldots, au_{\varphi(n)}$ is a rearrangement of the $u_i$. Multiplying, $a^{\varphi(n)} \prod u_i \equiv \prod u_i$, and the product of units can be cancelled.
:::

```quiz
q: What is $3^{100} \bmod 14$?
options:
  - text: $11$
    correct: true
    why: '$\varphi(14) = 6$, so $3^6 \equiv 1 \pmod{14}$. As $100 = 6 \cdot 16 + 4$, $3^{100} \equiv 3^4 = 81 = 5 \cdot 14 + 11 \equiv 11$.'
  - text: $9$
    why: That comes from reducing the exponent modulo $14$ ($100 \bmod 14 = 2$, and $3^2 = 9$). Exponents reduce modulo $\varphi(14) = 6$, not modulo $14$.
  - text: $1$
    why: That would need the order of $3$ to divide $100$. The order of $3$ modulo $14$ is $6$.
```

## Groups, orders and Lagrange’s theorem

Both proofs are really about a **group**: a set with an associative multiplication, an identity element and inverses. (Appendix E has the definitions with examples.) The units modulo $n$ form a group, written $(\mathbb{Z}/n\mathbb{Z})^\times$, of size $\varphi(n)$.

:::definition
The **order** of a unit $a$ modulo $n$, written $\operatorname{ord}_n(a)$, is the smallest $k \ge 1$ with $a^k \equiv 1 \pmod n$.
:::

The order exists: the powers $a, a^2, a^3, \ldots$ take finitely many values, so $a^i \equiv a^j$ for some $i < j$, and cancelling $a^i$ gives $a^{j-i} \equiv 1$.

:::lemma{status=proved}
$a^m \equiv 1 \pmod n$ if and only if $\operatorname{ord}_n(a) \mid m$.
:::

:::proof
Let $d = \operatorname{ord}_n(a)$ and write $m = qd + r$ with $0 \le r < d$. Then $a^m = (a^d)^q a^r \equiv a^r$. If $a^m \equiv 1$ then $a^r \equiv 1$ with $r < d$, so by minimality $r = 0$. The converse is clear.
:::

So Euler’s theorem is equivalent to saying that $\operatorname{ord}_n(a)$ divides $\varphi(n)$. Here is a picture of why. Draw the units modulo $n$ on a circle, with an arrow from each $x$ to $ax$.

::unit-cycles

The arrows always break the circle into cycles of equal length. Starting from $x$, the cycle is $x, ax, a^2 x, \ldots$, and it closes up exactly when $a^k x \equiv x$, that is, when $a^k \equiv 1$. So every cycle has length $\operatorname{ord}_n(a)$, and the units are partitioned into cycles of that length. Hence $\operatorname{ord}_n(a)$ divides $\varphi(n)$. This is **Lagrange’s theorem** for the subgroup generated by $a$: the cycles are its **cosets**. In general, the size of a subgroup of a finite group divides the size of the group (Appendix E).

Two consequences are used constantly in Part II.

- **Inverses by powering.** Modulo a prime, $a^{-1} \equiv a^{p-2}$, since $a \cdot a^{p-2} = a^{p-1} \equiv 1$. With exponentiation by squaring, this is an alternative to the extended Euclidean algorithm.
- **Reducing exponents.** If $\gcd(a, n) = 1$, then $a^e \equiv a^{e \bmod \varphi(n)} \pmod n$. This is the reason RSA decryption works (Chapter 13).

## Wilson’s theorem

The second proof multiplied all the units modulo $p$ together. What is that product?

:::theorem{name="Wilson’s theorem" year=1770 status=proved}
If $p$ is prime, then $(p - 1)! \equiv -1 \pmod p$. Conversely, if $n > 1$ and $(n - 1)! \equiv -1 \pmod n$, then $n$ is prime.
:::

Edward Waring published it in 1770, attributing it to his student John Wilson; Lagrange gave the first proof in 1771.:cite[hardy-wright]

::::zoom{levels="Idea, Proof"}
:::level[Idea]
Pair each unit with its inverse. The pairs multiply to $1$ and cancel out of the product. The only units that are their own inverses are $1$ and $-1$, so the product is $-1$.
:::
:::level[Proof]
For $p = 2$, $1! = 1 \equiv -1 \pmod 2$. Let $p$ be odd. A unit $x$ is its own inverse when $x^2 \equiv 1$, that is, $p \mid (x - 1)(x + 1)$; by Euclid’s lemma $x \equiv 1$ or $x \equiv -1$. These are different because $p > 2$. The remaining units $2, 3, \ldots, p - 2$ split into pairs $\{x, x^{-1}\}$ with $x \ne x^{-1}$, and each pair has product $1$. So $(p - 1)! \equiv 1 \cdot (p - 1) \cdot 1 \equiv -1 \pmod p$.

Conversely, if $n$ is composite, it has a divisor $d$ with $1 < d < n$. Then $d \mid (n - 1)!$, so if $(n - 1)! \equiv -1 \pmod n$, $d$ would divide $(n - 1)! + 1$ and $(n-1)!$, hence $1$. So $(n - 1)! \not\equiv -1$.
:::
::::

So Wilson’s theorem characterises the primes exactly. It is useless as a primality test, because computing $(n - 1)! \bmod n$ takes $n - 2$ multiplications, far worse than trial division. But it gives a quick fact for Chapter 9: if $p \equiv 1 \pmod 4$, then $x = \left(\frac{p-1}{2}\right)!$ satisfies $x^2 \equiv -1 \pmod p$ (exercise 2).

:::note
**A stopping point.** Fermat’s and Euler’s theorems are what Chapters 8 and 13 need. Primitive roots, below, are used in Chapters 9, 12 and 33; you can return to them then.
:::

## Primitive roots

Modulo $7$, the powers of $3$ are $3, 2, 6, 4, 5, 1$: every unit appears. A unit whose order is $\varphi(n)$, so that its powers run through all the units, is a **primitive root** modulo $n$. Modulo $8$ there is none: every unit squares to $1$. The widget above lists the primitive roots for each $n$; for prime $n$ there are always some.

:::theorem{name="Primitive roots" who="Gauss" year=1801 status=proved}
For every prime $p$ there is a primitive root modulo $p$. In fact there are exactly $\varphi(p - 1)$ of them.
:::

Euler believed this and gave an incomplete argument; Gauss gave the first complete proof in the *Disquisitiones*.:cite[gauss1801] The proof needs one fact about polynomials, which holds modulo a prime because $\mathbb{Z}/p\mathbb{Z}$ is a field.

:::lemma{name="Lagrange" status=proved}
A non-zero polynomial of degree $d$ with coefficients in $\mathbb{Z}/p\mathbb{Z}$ has at most $d$ roots modulo $p$.
:::

:::proof
Induction on $d$. A non-zero constant has no roots. If $f$ has degree $d \ge 1$ and a root $r$, divide $f(x)$ by $x - r$ (polynomial long division works because the leading coefficient of $x - r$ is $1$): $f(x) = (x - r) g(x) + c$ with $\deg g = d - 1$ and $c$ a constant; setting $x = r$ shows $c = 0$. If $s \ne r$ is another root, then $(s - r) g(s) \equiv 0$, and $s - r$ is invertible modulo $p$, so $g(s) \equiv 0$. So every root other than $r$ is a root of $g$, which has at most $d - 1$ roots.
:::

Modulo $8$ the lemma fails ($x^2 - 1$ has four roots: $1, 3, 5, 7$), which is exactly why $8$ has no primitive root.

::::zoom{levels="Idea, Sketch, Proof"}
:::level[Idea]
Count the units of each possible order $d$. If there is one unit of order $d$, its $d$ powers are all roots of $x^d - 1$, so (by Lagrange’s lemma) they are *all* the roots, and exactly $\varphi(d)$ of them have order $d$. So each $d$ has either $0$ or $\varphi(d)$ elements of that order. The counts must add up to $p - 1 = \sum_{d \mid p-1} \varphi(d)$, so none of them can be $0$.
:::
:::level[Sketch]
Let $\psi(d)$ be the number of units of order $d$. Every order divides $p - 1$, so $\sum_{d \mid p - 1} \psi(d) = p - 1$. If $\psi(d) > 0$, take $a$ of order $d$; then $1, a, \ldots, a^{d-1}$ are $d$ distinct roots of $x^d - 1$, which has at most $d$ roots, so every element of order $d$ is a power $a^k$, and $a^k$ has order $d$ exactly when $\gcd(k, d) = 1$. So $\psi(d) \le \varphi(d)$. Since $\sum_{d \mid p-1} \varphi(d) = p - 1$ as well, $\psi(d) = \varphi(d)$ for every $d$, and in particular $\psi(p - 1) = \varphi(p - 1) \ge 1$.
:::
:::level[Proof]
For $d \mid p - 1$ let $\psi(d)$ be the number of units modulo $p$ of order exactly $d$. Every unit has an order dividing $p - 1$ (Fermat), so
$$\sum_{d \mid p - 1} \psi(d) = p - 1.$$

*Claim: $\psi(d) \le \varphi(d)$.* If $\psi(d) = 0$ there is nothing to prove. Otherwise let $a$ have order $d$. The powers $1, a, a^2, \ldots, a^{d-1}$ are distinct (if $a^i \equiv a^j$ with $0 \le i < j < d$ then $a^{j - i} \equiv 1$ with $0 < j - i < d$, contradicting the order), and each is a root of $x^d - 1$, since $(a^k)^d = (a^d)^k \equiv 1$. By Lagrange’s lemma, $x^d - 1$ has no other roots. Every element $b$ of order $d$ satisfies $b^d \equiv 1$, so $b = a^k$ for some $0 \le k < d$. Finally $a^k$ has order $d / \gcd(k, d)$ (its $m$-th power is $1$ iff $d \mid km$ iff $\frac{d}{\gcd(k,d)} \mid m$), which equals $d$ exactly when $\gcd(k, d) = 1$. There are $\varphi(d)$ such $k$, so $\psi(d) = \varphi(d)$.

*Conclusion.* By exercise 4 of Chapter 5, $\sum_{d \mid n} \varphi(d) = n$ for every $n$; with $n = p - 1$,
$$\sum_{d \mid p-1} \psi(d) = p - 1 = \sum_{d \mid p-1} \varphi(d).$$
Each term on the left is at most the corresponding term on the right, so they are all equal. In particular $\psi(p - 1) = \varphi(p - 1) \ge 1$.
:::
::::

A primitive root $g$ turns multiplication into addition: every unit is $g^k$ for a unique $k \bmod p - 1$, its **discrete logarithm**, and $g^j g^k = g^{j+k}$. The units modulo $p$ are a **cyclic group**, a clock with $p - 1$ hours. Computing $g^k$ is fast (Chapter 5), but recovering $k$ from $g^k$ appears to be hard, and the Diffie–Hellman key exchange in Chapter 13 is built on that asymmetry.

To *find* a primitive root you need the prime factors of $p - 1$: $g$ is a primitive root exactly when $g^{(p-1)/q} \not\equiv 1$ for every prime $q \mid p - 1$ (if the order of $g$ were a proper divisor of $p - 1$, it would divide some $(p - 1)/q$). In practice small numbers work: $2$ is a primitive root modulo $3, 5, 11, 13, 19, 29, \ldots$ In 1927 Emil Artin conjectured that $2$ is a primitive root modulo infinitely many primes, and that the proportion of such primes is about $0.3739558$. Christopher Hooley proved it in 1967 assuming a generalised Riemann Hypothesis; unconditionally it is still open.:cite[moree-artin]

```code
id: fermat-euler/primitive-root
title: Find a primitive root
prompt: |
  Write `primitiveRoot(p)` returning the smallest primitive root modulo an odd prime $p < 2^{26}$. Factor $p - 1$ (you may use `factorTrial` from `primes`), then test $g = 2, 3, 4, \ldots$: $g$ is a primitive root when $g^{(p-1)/q} \not\equiv 1 \pmod p$ for every prime $q$ dividing $p - 1$. You may use `modPow(b, e, m)` from `primes` (it works on numbers).
starter: |
  import { factorTrial, modPow } from 'primes';

  export function primitiveRoot(p: number): number {
    // Your code here.
    return 2;
  }
tests: |
  import { test, expect } from 'test';
  import { primitiveRoot } from 'solution';
  import { primesUpTo, order } from 'primes';

  test('small primes', () => {
    expect(primitiveRoot(3)).toBe(2);
    expect(primitiveRoot(7)).toBe(3);
    expect(primitiveRoot(41)).toBe(6);
  });
  test('it is primitive and the smallest, for every prime below 2000', () => {
    for (const p of primesUpTo(2000).slice(1)) {
      const g = primitiveRoot(p);
      expect(order(g, p)).toBe(p - 1);
      for (let h = 2; h < g; h++) if (order(h, p) === p - 1) throw new Error(`${h} is a smaller primitive root mod ${p}`);
    }
  });
  test('a large prime', () => {
    expect(primitiveRoot(40487)).toBe(5);
    expect(primitiveRoot(65537)).toBe(3);
  });
solution: |
  import { factorTrial, modPow } from 'primes';

  export function primitiveRoot(p: number): number {
    const qs = factorTrial(p - 1).map(([q]) => q);
    for (let g = 2; g < p; g++) {
      if (qs.every((q) => modPow(g, (p - 1) / q, p) !== 1)) return g;
    }
    throw new Error('no primitive root');
  }
hints:
  - '`factorTrial(p - 1)` returns pairs `[q, e]`; you only need the primes `q`.'
  - Use `every` to check all the conditions for one `g`, and return the first `g` that passes.
```

:::key
- Fermat: $a^p \equiv a \pmod p$; for $p \nmid a$, $a^{p-1} \equiv 1$. Proved by counting necklaces, and by noting that multiplication by $a$ permutes the units.
- Euler: $a^{\varphi(n)} \equiv 1 \pmod n$ for $\gcd(a, n) = 1$. The order of $a$ divides $\varphi(n)$, because multiplication by $a$ splits the units into cycles of equal length (Lagrange).
- Wilson: $(p - 1)! \equiv -1 \pmod p$, and this characterises primes (uselessly, for computation).
- Modulo a prime there are primitive roots: the units form a cyclic group of order $p - 1$. The proof uses that a polynomial of degree $d$ has at most $d$ roots modulo $p$.
:::

:::exercises
1. Compute $2^{340} \bmod 341$ by hand or with the power ladder of Chapter 5, and factor $341$. What does this say about the converse of Fermat’s little theorem? (Chapter 8 starts here.)
2. Let $p \equiv 1 \pmod 4$ and $x = \left(\tfrac{p - 1}{2}\right)!$. Use Wilson’s theorem to show $x^2 \equiv -1 \pmod p$. (Pair $k$ with $p - k$ in $(p-1)!$.)
3. Show that if $g$ is a primitive root modulo $p$, then $g^k$ is a primitive root exactly when $\gcd(k, p - 1) = 1$.
4. Show that $n^{13} - n$ is divisible by $2730 = 2 \cdot 3 \cdot 5 \cdot 7 \cdot 13$ for every integer $n$. (For each of these primes $p$, $p - 1$ divides $12$.)
:::
