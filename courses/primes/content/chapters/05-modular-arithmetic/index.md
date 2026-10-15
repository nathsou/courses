---
number: 5
title: Clock arithmetic
summary: Congruences, the integers modulo n, which numbers have inverses, the Chinese remainder theorem, and exponentiation by squaring, the algorithm behind every primality test and every public-key cryptosystem.
duration: About 1½ hours
prerequisites: [euclid-algorithm, unique-factorisation]
theorems: [Inverses modulo n, The Chinese remainder theorem, Euler’s φ is multiplicative]
techniques: [congruences, constructive proof, binary expansion]
---

At $10$ o’clock, five hours later it is $3$ o’clock, not $15$. Arithmetic in which numbers wrap around is called **modular arithmetic**, and it is the setting for almost everything in Part II: primality tests, factoring algorithms and cryptography all compute with remainders. Gauss introduced the notation in 1801, and it made arguments about divisibility so much shorter that it has been used ever since.:cite[gauss1801]

## Congruences

:::definition
Let $n \ge 1$. Integers $a$ and $b$ are **congruent modulo $n$**, written $a \equiv b \pmod{n}$, if $n \mid a - b$; equivalently, if $a$ and $b$ leave the same remainder on division by $n$.
:::

So $15 \equiv 3 \pmod{12}$, $-1 \equiv 6 \pmod 7$, and $a \equiv 0 \pmod n$ just says $n \mid a$. Congruence modulo $n$ behaves like equality: it is reflexive, symmetric and transitive. Most importantly, it respects arithmetic.

:::lemma{status=proved}
If $a \equiv a' \pmod n$ and $b \equiv b' \pmod n$, then $a + b \equiv a' + b'$ and $ab \equiv a'b' \pmod n$. Consequently $a^k \equiv a'^k \pmod n$ for every $k \ge 0$.
:::

:::proof
$n$ divides $a - a'$ and $b - b'$, so it divides $(a + b) - (a' + b')$, which is their sum. For products, $ab - a'b' = a(b - b') + b'(a - a')$, a combination of two multiples of $n$. Powers follow by induction on $k$.
:::

This is what makes modular arithmetic useful: in any calculation made of additions and multiplications, you may reduce modulo $n$ at any stage. What is the last digit of $7^{2026}$? Modulo $10$, $7^2 = 49 \equiv -1$, so $7^4 \equiv 1$, and $7^{2026} = (7^4)^{506} \cdot 7^2 \equiv 1 \cdot (-1) \equiv 9$. The last digit is $9$, and nobody had to compute a 1713-digit number.

```quiz
q: Which of these is a valid deduction for all integers?
options:
  - text: If $2a \equiv 2b \pmod{6}$ then $a \equiv b \pmod 6$.
    why: Take $a = 0$, $b = 3$; then $2a = 0 \equiv 6 = 2b \pmod 6$, but $0 \not\equiv 3$. You cannot divide by $2$ modulo $6$, because $2$ has no inverse there.
  - text: If $2a \equiv 2b \pmod{7}$ then $a \equiv b \pmod 7$.
    correct: true
    why: $2 \cdot 4 = 8 \equiv 1 \pmod 7$, so multiplying both sides by $4$ undoes the multiplication by $2$. Inverses exist exactly for numbers coprime to the modulus; this section proves it.
  - text: If $a^2 \equiv b^2 \pmod{8}$ then $a \equiv \pm b \pmod 8$.
    why: $1^2 \equiv 3^2 \equiv 1 \pmod 8$, but $3 \not\equiv \pm 1 \pmod 8$. Modulo a composite, a number can have more than two square roots.
```

### The integers modulo $n$

Every integer is congruent to exactly one of $0, 1, \ldots, n - 1$ (its remainder). These $n$ **residue classes**, with addition and multiplication done modulo $n$, form a number system called $\mathbb{Z}/n\mathbb{Z}$, “the integers modulo $n$”. It has its own addition and multiplication tables, which you can explore below.

::clock-table

Addition is boring in the best way: every row of the addition table is a rearrangement of $0, \ldots, n - 1$, so you can always subtract. Multiplication is more interesting. For $n = 7$, every row except the first is a rearrangement too, and each non-zero row contains a $1$. For $n = 12$, the rows of $2, 3, 4, 6, 8, 9, 10$ contain $0$s off the axes ($3 \cdot 4 \equiv 0$): these are **zero divisors**, and those rows never contain a $1$.

## Inverses

:::theorem{status=proved}
Let $n \ge 2$. An integer $a$ has an **inverse** modulo $n$ (an integer $x$ with $ax \equiv 1 \pmod n$) if and only if $\gcd(a, n) = 1$. The inverse is unique modulo $n$, and the extended Euclidean algorithm computes it.
:::

:::proof
If $\gcd(a, n) = 1$, Bézout’s identity gives $ax + ny = 1$ for some integers $x, y$, so $ax \equiv 1 \pmod n$. Conversely, if $ax \equiv 1 \pmod n$, then $ax - 1 = ny$ for some $y$, so $ax - ny = 1$, and any common divisor of $a$ and $n$ divides $1$.

For uniqueness, if $ax \equiv ax' \equiv 1$, then $x \equiv x(ax') = (xa)x' \equiv x' \pmod n$.
:::

The residues coprime to $n$ are the **units** of $\mathbb{Z}/n\mathbb{Z}$, and their number is **Euler’s totient** $\varphi(n)$. So $\varphi(12) = 4$ (the units are $1, 5, 7, 11$) and $\varphi(p) = p - 1$ for a prime $p$.

When $p$ is prime, every non-zero residue is a unit, so you can divide by anything except $0$. That makes $\mathbb{Z}/p\mathbb{Z}$ a **field**, like the rationals or the reals but finite, and it is often written $\mathbb{F}_p$. Much of what you know about solving equations carries over to it: a linear equation $ax = b$ with $a \not\equiv 0$ has exactly one solution, and (Chapter 6 and Appendix E) a polynomial of degree $d$ has at most $d$ roots. Modulo a composite, both facts fail: $x^2 \equiv 1 \pmod 8$ has four solutions.

:::corollary{status=proved}
The congruence $ax \equiv b \pmod n$ has a solution if and only if $g = \gcd(a, n)$ divides $b$. In that case it has exactly $g$ solutions modulo $n$.
:::

:::proof
If $ax - b = ny$ then $g$ divides $ax - ny = b$. Conversely, if $g \mid b$, write $a = ga'$, $b = gb'$, $n = gn'$ with $\gcd(a', n') = 1$. The congruence is equivalent to $a'x \equiv b' \pmod{n'}$, whose solutions are $x \equiv x_0 = b'(a')^{-1} \pmod{n'}$. Modulo $n$, these are the $g$ residues $x_0, x_0 + n', \ldots, x_0 + (g - 1)n'$.
:::

## The Chinese remainder theorem

A problem from the *Sunzi Suanjing*, a Chinese mathematical text from the 3rd to 5th century, in a common English rendering:

> There are certain things whose number is unknown. Counted by threes, two remain; by fives, three remain; by sevens, two remain. How many things are there?

In modern notation: find $x$ with $x \equiv 2 \pmod 3$, $x \equiv 3 \pmod 5$ and $x \equiv 2 \pmod 7$. The answer given is $23$, and the general method became known as the Chinese remainder theorem.:cite[katz-history]

Here is the idea in a picture. Write each integer $k$ in the cell of a grid whose column is $k \bmod m$ and whose row is $k \bmod n$. Counting $0, 1, 2, \ldots$ moves one step diagonally each time, wrapping around the edges.

::crt-grid

When $m$ and $n$ are coprime, the diagonal walk visits every one of the $mn$ cells before returning to the start. So every pair of remainders occurs, and exactly once among $0, \ldots, mn - 1$. When they are not coprime, it returns early and misses cells.

:::theorem{name="The Chinese remainder theorem" status=proved}
Let $n_1, \ldots, n_k$ be pairwise coprime positive integers and $N = n_1 n_2 \cdots n_k$. For any integers $a_1, \ldots, a_k$, the system
$$x \equiv a_1 \pmod{n_1}, \quad \ldots, \quad x \equiv a_k \pmod{n_k}$$
has a solution, and any two solutions are congruent modulo $N$.
:::

::::zoom{levels="Idea, Proof"}
:::level[Idea]
Build, for each $i$, a number $e_i$ that is $1$ modulo $n_i$ and $0$ modulo all the other $n_j$. Then $x = a_1 e_1 + \cdots + a_k e_k$ works. Each $e_i$ is a multiple of $N/n_i$ that is $1$ modulo $n_i$, which exists because $N/n_i$ is coprime to $n_i$.
:::
:::level[Proof]
*Existence.* Let $M_i = N / n_i$, the product of the other moduli. Each of those is coprime to $n_i$, so $\gcd(M_i, n_i) = 1$ (a prime dividing $n_i$ and $M_i$ would divide some $n_j$ with $j \ne i$). So $M_i$ has an inverse $y_i$ modulo $n_i$. Set
$$x = \sum_{i=1}^{k} a_i M_i y_i.$$
Modulo $n_j$, every term with $i \ne j$ vanishes (as $n_j \mid M_i$), and the $j$-th term is $a_j M_j y_j \equiv a_j \pmod{n_j}$.

*Uniqueness.* If $x$ and $x'$ are both solutions, then each $n_i$ divides $x - x'$. The $n_i$ are pairwise coprime, so their product divides $x - x'$. (By induction: if $n_1 \cdots n_{i-1}$ divides $c$, write $c = n_1 \cdots n_{i-1}\, t$; then $n_i \mid c$ and $\gcd(n_i, n_1 \cdots n_{i-1}) = 1$ give $n_i \mid t$ by the corollary to Euclid’s lemma in Chapter 3.)
:::
::::

For Sunzi’s problem: $N = 105$, $M_1 = 35 \equiv 2 \pmod 3$ with inverse $2$; $M_2 = 21 \equiv 1 \pmod 5$ with inverse $1$; $M_3 = 15 \equiv 1 \pmod 7$ with inverse $1$. So $x = 2 \cdot 35 \cdot 2 + 3 \cdot 21 \cdot 1 + 2 \cdot 15 \cdot 1 = 233 \equiv 23 \pmod{105}$.

```numeric
id: crt/sunzi-variant
title: A variant of Sunzi’s problem
prompt: Find the smallest positive $x$ with $x \equiv 1 \pmod 3$, $x \equiv 2 \pmod 5$ and $x \equiv 3 \pmod 7$.
answer: 52
tolerance: 0
explain: '$52 = 17 \cdot 3 + 1 = 10 \cdot 5 + 2 = 7 \cdot 7 + 3$. With the formula: $1 \cdot 35 \cdot 2 + 2 \cdot 21 \cdot 1 + 3 \cdot 15 \cdot 1 = 157 \equiv 52 \pmod{105}$.'
```

The theorem says more than that a solution exists. The map $x \mapsto (x \bmod n_1, \ldots, x \bmod n_k)$ is a one-to-one correspondence between $\mathbb{Z}/N\mathbb{Z}$ and tuples of residues, and it respects addition and multiplication. So arithmetic modulo $N$ can be done component by component, modulo each $n_i$ separately. Implementations of RSA use exactly this to speed up decryption by a factor of about four (Chapter 13). And it gives a formula for $\varphi$.

:::corollary{status=proved}
If $\gcd(m, n) = 1$ then $\varphi(mn) = \varphi(m)\varphi(n)$. Consequently, for $n = p_1^{e_1} \cdots p_r^{e_r}$,
$$\varphi(n) = n \prod_{p \mid n} \left(1 - \frac1p\right).$$
:::

:::proof
Under the correspondence $x \leftrightarrow (x \bmod m, x \bmod n)$, $x$ is coprime to $mn$ exactly when it is coprime to $m$ and to $n$, that is, when both components are units. So the units modulo $mn$ correspond to pairs of units, and there are $\varphi(m)\varphi(n)$ of those.

For a prime power, the numbers in $[1, p^e]$ not coprime to $p^e$ are the multiples of $p$, of which there are $p^{e-1}$; so $\varphi(p^e) = p^e - p^{e-1} = p^e(1 - 1/p)$. Multiplying over the prime powers in $n$ gives the formula.
:::

:::note
**A stopping point.** Congruences, inverses and the Chinese remainder theorem are all you need for Chapter 6. The last section is about computing powers, which every algorithm in Part II depends on.
:::

## Computing powers quickly

Primality tests (Chapter 8) and cryptography (Chapter 13) need $b^e \bmod m$ for numbers with hundreds of digits, *including the exponent*. Multiplying $b$ by itself $e - 1$ times is out of the question when $e \approx 10^{300}$. But squaring doubles the exponent: $b^2$, $b^4$, $b^8$, … take one multiplication each. Writing $e$ in binary turns this into an algorithm.

:::algorithm[Exponentiation by squaring (left to right)]
**Input:** $b$, $e \ge 0$, $m \ge 1$. **Output:** $b^e \bmod m$.

Let $r = 1$. For each bit of $e$, from the most significant to the least: replace $r$ by $r^2 \bmod m$; if the bit is $1$, replace $r$ by $r b \bmod m$. Return $r$.
:::

Why it works: after processing the leading bits that form the number $f$, $r = b^f \bmod m$. Appending a bit $\beta$ changes $f$ to $2f + \beta$, and $b^{2f + \beta} = (b^f)^2 \cdot b^\beta$. A $k$-bit exponent costs at most $2k$ multiplications modulo $m$, and every intermediate number is less than $m^2$. For a 1024-bit exponent that is at most 2048 multiplications instead of $2^{1024}$.

::power-ladder

The default example computes $7^{560} \bmod 561$ and gets $1$. Chapter 6 explains why that would be expected if $561$ were prime, and Chapter 8 explains why it is not.

```code
id: modular/mod-pow
title: Modular exponentiation
prompt: |
  Write `modPow(b, e, m)` for bigints with $e \ge 0$ and $m \ge 1$, returning $b^e \bmod m$ in $[0, m)$. The tests use exponents with hundreds of digits, so multiplying $e$ times will time out; use squaring. A right-to-left version is often easiest: while $e > 0$, if $e$ is odd multiply the result by $b$; then square $b$ and halve $e$ (`e >>= 1n`). Watch out for negative bases and for $m = 1$.
starter: |
  export function modPow(b: bigint, e: bigint, m: bigint): bigint {
    // Multiplying e times would be far too slow for e ≈ 10^150.
    let result = 1n;
    // Your code here.
    return result;
  }
tests: |
  import { test, expect } from 'test';
  import { modPow } from 'solution';
  import { modPowBig } from 'primes';

  test('small cases', () => {
    expect(modPow(2n, 10n, 1000n)).toBe(24n);
    expect(modPow(7n, 0n, 13n)).toBe(1n);
    expect(modPow(5n, 3n, 1n)).toBe(0n);
    expect(modPow(7n, 2026n, 10n)).toBe(9n);
  });
  test('negative base gives a residue in [0, m)', () => {
    expect(modPow(-2n, 3n, 7n)).toBe(6n);
    expect(modPow(-1n, 101n, 1000n)).toBe(999n);
  });
  test('agrees with the library on many inputs', () => {
    for (let b = 0n; b < 20n; b++) for (let e = 0n; e < 40n; e += 3n) for (const m of [1n, 2n, 9n, 97n, 1000n]) expect(modPow(b, e, m)).toBe(modPowBig(b, e, m));
  });
  test('huge exponents are fast', () => {
    const m = 2n ** 521n - 1n; // a Mersenne prime
    const e = 10n ** 150n + 7n;
    expect(modPow(3n, e, m)).toBe(modPowBig(3n, e, m));
    expect(modPow(3n, m - 1n, m)).toBe(1n);
  });
solution: |
  export function modPow(b: bigint, e: bigint, m: bigint): bigint {
    if (m === 1n) return 0n;
    let result = 1n;
    b = ((b % m) + m) % m;
    while (e > 0n) {
      if (e & 1n) result = (result * b) % m;
      b = (b * b) % m;
      e >>= 1n;
    }
    return result;
  }
hints:
  - Reduce $b$ into $[0, m)$ first with `((b % m) + m) % m`, because `%` keeps the sign of `b`.
  - 'Invariant for the right-to-left loop: `result * b^e` is unchanged by each iteration, and equals the answer when `e` reaches `0n`.'
```

:::key
- $a \equiv b \pmod n$ means $n \mid a - b$. Congruences can be added and multiplied, so you can reduce at every step.
- $a$ is invertible modulo $n$ exactly when $\gcd(a, n) = 1$; the extended Euclidean algorithm finds the inverse. $\mathbb{Z}/p\mathbb{Z}$ is a field.
- Chinese remainder theorem: for pairwise coprime moduli, remainders can be prescribed independently, and arithmetic modulo $N$ splits into arithmetic modulo each factor. Hence $\varphi(n) = n \prod_{p \mid n}(1 - 1/p)$.
- Exponentiation by squaring computes $b^e \bmod m$ with about $2\log_2 e$ multiplications.
:::

:::exercises
1. Show that $n$ is divisible by $9$ if and only if the sum of its decimal digits is. (Use $10 \equiv 1 \pmod 9$.) What is the analogous test for $11$?
2. Solve $35x \equiv 14 \pmod{91}$.
3. Show that $x^2 \equiv 1 \pmod{p}$ has only the solutions $x \equiv \pm 1$ when $p$ is an odd prime, but that $x^2 \equiv 1 \pmod{15}$ has four solutions. Find them using the Chinese remainder theorem.
4. Show that $\sum_{d \mid n} \varphi(d) = n$. (Hint: sort the fractions $\frac1n, \frac2n, \ldots, \frac nn$ by their denominator in lowest terms.) Chapter 6 uses this identity.
:::
