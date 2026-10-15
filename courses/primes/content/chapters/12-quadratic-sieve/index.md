---
number: 12
title: The quadratic sieve
summary: Factoring by building a square. Congruences of squares, smooth numbers and Dickman’s function, linear algebra over GF(2), sieving with logarithms, the subexponential running time, and the number field sieve that factors RSA moduli today.
duration: About 1¾ hours
prerequisites: [factoring, quadratic-residues]
theorems: [A congruence of squares splits n with probability at least 1/2, Enough relations always contain a dependency]
techniques: [congruences of squares, smoothness, linear algebra over GF(2), sieving]
---

The methods of Chapter 11 all depend on the factor $p$ being small, or close to another factor, or having a smooth $p - 1$. RSA moduli are built to have none of these weaknesses: two random primes of the same size. For such numbers the champions are the **sieve methods**: the quadratic sieve, invented by Carl Pomerance in 1981, and its successor the number field sieve. They do not search for a factor at all. They build a **congruence of squares**, and a factor falls out of a gcd.

## Congruences of squares

If $X^2 \equiv Y^2 \pmod n$, then $n \mid (X - Y)(X + Y)$. If moreover $X \not\equiv \pm Y \pmod n$, then $n$ divides neither factor, so $\gcd(X - Y, n)$ is a proper factor of $n$. (This is the trick from Chapter 8: a non-trivial square root of $1$ is the case $Y = 1$.)

:::lemma{status=proved}
Let $n$ be odd with at least two distinct prime factors. If $X$ is a random unit modulo $n$ and $Y$ is any square root of $X^2$ chosen without knowledge of $X$, then $X \not\equiv \pm Y$ with probability at least $\tfrac12$.
:::

:::proof
Write $n = \prod_{i=1}^k p_i^{e_i}$ with $k \ge 2$. Modulo each odd prime power $p_i^{e_i}$, the unit $X^2$ has exactly two square roots, $\pm X$ (the units modulo an odd prime power form a cyclic group, Appendix E). By the Chinese remainder theorem, $X^2$ has $2^k \ge 4$ square roots modulo $n$, one for each choice of signs. They are equally likely to be $X$, given $X^2$, since all of them square to the same value. Only two of them are $\pm X$. So the probability that $Y \equiv \pm X$ is $2/2^k \le \tfrac12$.
:::

So the problem becomes: find $X$ and $Y$ with $X^2 \equiv Y^2 \pmod n$ "independently". Maurice Kraitchik's idea, from the 1920s, is to find many $x$ for which $x^2 \bmod n$ factors into small primes, and then *multiply some of them together* so that the product is a perfect square.

Here is the smallest example worth doing, from Pomerance's account of the method.:cite[pomerance-two-sieves] Let $n = 1649$. Near $\sqrt{1649} \approx 40.6$:
$$41^2 \equiv 32 = 2^5, \qquad 42^2 \equiv 115 = 5 \cdot 23, \qquad 43^2 \equiv 200 = 2^3 \cdot 5^2.$$
Neither $32$ nor $200$ is a square, but their product is: $32 \cdot 200 = 6400 = 80^2$. So $(41 \cdot 43)^2 \equiv 80^2 \pmod{1649}$. Since $41 \cdot 43 = 1763 \equiv 114$, we get $114^2 \equiv 80^2$, and $\gcd(114 - 80, 1649) = \gcd(34, 1649) = 17$. Indeed $1649 = 17 \cdot 97$.

## The method in four steps

1. **Factor base.** Choose a bound $B$ and keep the primes $p \le B$. Only some of them can ever divide $x^2 - n$: if $p \mid x^2 - n$ then $n \equiv x^2$ is a square modulo $p$. So the **factor base** is $2$ and the odd primes $p \le B$ with $\left(\frac np\right) = 1$, about half of them.
2. **Relations.** For $x = \lceil \sqrt n\rceil, \lceil \sqrt n \rceil + 1, \ldots$, compute $Q(x) = x^2 - n$, and keep $x$ if $Q(x)$ is **$B$-smooth**. Each kept $x$ gives a **relation** $x^2 \equiv Q(x) = \prod_p p^{e_p} \pmod n$.
3. **Linear algebra.** Record each relation's exponent vector $(e_p)$ modulo $2$. A product of relations is a square exactly when the sum of their vectors is zero modulo $2$. So we need a set of vectors summing to zero over the field with two elements, $\mathbb{F}_2$: a linear dependency.
4. **Square root and gcd.** For a dependency, let $X$ be the product of the $x$'s and $Y$ the product of $p^{(\text{total exponent of } p)/2}$; then $X^2 \equiv Y^2$, and $\gcd(X - Y, n)$ is a proper factor with probability at least $\frac12$. If it fails, use another dependency.

Step through it with several values of $n$ and several bounds $B$:

::qs-demo

How many relations are enough? Linear algebra answers exactly.

:::lemma{status=proved}
If there are more relations than primes in the factor base, some non-empty subset of them has exponent vectors summing to zero modulo $2$.
:::

:::proof
The exponent vectors live in $\mathbb{F}_2^k$, where $k$ is the size of the factor base, a vector space of dimension $k$. More than $k$ vectors in a $k$-dimensional space are linearly dependent: some non-trivial combination $\sum c_i v_i$ is zero. Over $\mathbb{F}_2$ every coefficient $c_i$ is $0$ or $1$, so the combination is just the sum of a non-empty subset.
:::

In practice one collects a few more than $k$ relations, finds several dependencies by Gaussian elimination, and tries them in turn. Each succeeds with probability at least $\frac12$, so ten dependencies fail with probability below $\frac{1}{1000}$.

```code
id: qs/dependency
title: Find a dependency over GF(2)
prompt: |
  Write `findDependency(rows)`, where each row is a bigint whose bits are an exponent vector modulo 2. Return the indices (in increasing order) of a non-empty set of rows whose XOR is zero, or `[]` if the rows are linearly independent. Use Gaussian elimination, tracking for each reduced row which original rows were combined into it (another bigint used as a bitmask).
starter: |
  export function findDependency(rows: bigint[]): number[] {
    // Your code here.
    return [];
  }
tests: |
  import { test, expect } from 'test';
  import { findDependency } from 'solution';
  import { rng } from 'primes';

  function xorOf(rows: bigint[], idx: number[]) {
    return idx.reduce((acc, i) => acc ^ rows[i]!, 0n);
  }
  test('the example from the text (2, 5, 23 as bits 0, 1, 2)', () => {
    // 41² ≡ 2⁵, 42² ≡ 5·23, 43² ≡ 2³·5²: parity vectors 0b001, 0b110, 0b001.
    const rows = [0b001n, 0b110n, 0b001n];
    const d = findDependency(rows);
    expect(d).toEqual([0, 2]);
  });
  test('independent rows give []', () => {
    expect(findDependency([1n, 2n, 4n, 8n])).toEqual([]);
    expect(findDependency([])).toEqual([]);
  });
  test('random matrices with more rows than columns always have a dependency', () => {
    const r = rng(42);
    for (let t = 0; t < 50; t++) {
      const cols = 5 + (t % 20);
      const rows = Array.from({ length: cols + 1 }, () => {
        let v = 0n;
        for (let j = 0; j < cols; j++) if (r.next() < 0.3) v |= 1n << BigInt(j);
        return v;
      });
      const d = findDependency(rows);
      expect(d.length).toBeGreaterThan(0);
      expect(xorOf(rows, d)).toBe(0n);
      expect([...d].sort((a, b) => a - b)).toEqual(d);
    }
  });
solution: |
  export function findDependency(rows: bigint[]): number[] {
    const pivots: { v: bigint; combo: bigint }[] = [];
    for (let i = 0; i < rows.length; i++) {
      let v = rows[i]!;
      let combo = 1n << BigInt(i);
      for (const p of pivots) {
        const lead = p.v & -p.v;
        if (v & lead) {
          v ^= p.v;
          combo ^= p.combo;
        }
      }
      if (v === 0n) {
        const out: number[] = [];
        for (let j = 0; j < rows.length; j++) if ((combo >> BigInt(j)) & 1n) out.push(j);
        return out;
      }
      pivots.push({ v, combo });
    }
    return [];
  }
hints:
  - 'Process rows one at a time. Reduce each new row by every pivot so far: if the row has the pivot’s lowest set bit (`p.v & -p.v`), XOR the pivot into it (and its combination mask).'
  - If the reduced row is zero, its combination mask lists the rows of a dependency. Otherwise it becomes a new pivot.
```

## Smooth numbers

Everything hinges on step 2: how often is a number smooth? Let $\Psi(x, y)$ be the number of $y$-smooth integers up to $x$. In 1930 the actuary Karl Dickman found the answer for $y = x^{1/u}$ with $u$ fixed.:cite[dickman1930]

:::theorem{name="Dickman" year=1930 status=stated}
For each fixed $u \ge 1$, $\Psi(x, x^{1/u}) \sim \rho(u)\, x$ as $x \to \infty$, where $\rho$ is the continuous function with $\rho(u) = 1$ for $0 \le u \le 1$ and $u \rho'(u) = -\rho(u - 1)$ for $u > 1$.
:::

The function falls off very fast: $\rho(2) = 1 - \log 2 \approx 0.307$, $\rho(3) \approx 0.049$, $\rho(4) \approx 0.0049$, and roughly $\rho(u) \approx u^{-u}$. (For $1 \le u \le 2$ the statement is easy: a number up to $x$ fails to be $\sqrt[u]{x}$-smooth exactly when it has a prime factor $p > x^{1/u}$, and there is at most one, so the proportion that fails is $\sum_{x^{1/u} < p \le x} \frac 1p \approx \log u$ by Mertens' theorem of Chapter 17, which gives $\rho(u) = 1 - \log u$ on that range.)

::smooth-density

### Choosing $B$

There is a tension. A larger factor base makes each $Q(x)$ more likely to be smooth, but then you need more relations (one per prime) and more linear algebra. The values $Q(x) = x^2 - n$ for $x$ near $\sqrt n$ are about $2\sqrt{n}\,(x - \sqrt n)$, so roughly $n^{1/2}$ in size, which is the whole point of the method: they are much smaller than random residues modulo $n$, and so much more likely to be smooth.

Balancing the two costs, using Dickman's estimate as a heuristic for these particular numbers, gives the optimum $B \approx \exp\left(\tfrac12\sqrt{\log n \log\log n}\right)$ and a total running time of
$$L_n = \exp\left((1 + o(1))\sqrt{\log n \log\log n}\right).$$
This function is **subexponential**: it grows more slowly than $n^\varepsilon$ for every $\varepsilon > 0$, and faster than any power of $\log n$. For a 100-digit $n$, $L_n \approx 10^{15}$ rather than trial division's $10^{50}$. The analysis is heuristic, because the numbers $Q(x)$ are not random; nobody has proved the running time of the quadratic sieve, although John Dixon proved a subexponential bound in 1981 for a variant that chooses the $x$'s at random, and later work made such rigorous bounds sharper.:cite[dixon1981,crandall-pomerance]

## Why it is called a sieve

Trial-dividing every $Q(x)$ by every prime in the factor base would be slow. The quadratic sieve finds the smooth values the way Eratosthenes found primes. For a prime $p$ in the factor base, $p \mid Q(x)$ exactly when $x^2 \equiv n \pmod p$, that is, when $x$ is congruent to one of the two square roots $\pm r_p$ of $n$ modulo $p$ (Chapter 9 shows how to compute them). So the $x$'s for which $p$ divides $Q(x)$ form two arithmetic progressions with difference $p$, and you can visit them by stepping, without testing anything.

:::algorithm[The sieving step]
Store an array $A[x] \approx \log |Q(x)|$ over an interval of $x$. For each prime $p$ of the factor base and each root $r$ of $n$ modulo $p$, subtract $\log p$ from $A[x]$ for every $x \equiv r \pmod p$ in the interval (and handle prime powers similarly). Afterwards, the $x$ with $A[x] \approx 0$ are the candidates for smooth $Q(x)$; only those are factored by trial division.
:::

The sieving costs about $\sum_{p \le B} \frac{2 \cdot (\text{interval length})}{p}$ subtractions, which is $\log\log B$ per position, as in Chapter 7. Practical versions add many refinements: several polynomials instead of one (the **multiple polynomial** quadratic sieve), relations with one or two large primes outside the factor base that are later matched up, and sparse linear algebra (block Lanczos or Wiedemann) instead of Gaussian elimination for matrices with millions of rows.

In 1994, RSA-129, a 129-digit number published in 1977 by Rivest, Shamir and Adleman with the challenge to decrypt a message, was factored by the multiple polynomial quadratic sieve, using about 1600 computers coordinated by email over eight months. The secret message was "The Magic Words are Squeamish Ossifrage".:cite[rsa129]

:::note
**A stopping point.** The last section describes the number field sieve without proofs.
:::

## The number field sieve

The quadratic sieve's weakness is that $Q(x)$ is about $\sqrt n$ in size. The **number field sieve**, proposed by Pollard in 1988 and developed by Lenstra, Lenstra, Manasse and Pollard, works with two polynomials sharing a root modulo $n$ and with smaller values, at the price of doing the "square" step in a ring of algebraic integers like the ones in Chapter 3.:cite[lenstra-nfs] Its heuristic running time is
$$\exp\left(\left(\left(\tfrac{64}{9}\right)^{1/3} + o(1)\right)(\log n)^{1/3} (\log\log n)^{2/3}\right),$$
with the exponent of $\log n$ down from $\tfrac12$ to $\tfrac13$. Above about 100 digits it beats the quadratic sieve. In February 2020 a team led by Fabrice Boudot, Pierrick Gaudry, Aurore Guillevic, Nadia Heninger, Emmanuel Thomé and Paul Zimmermann factored RSA-250, a 250-digit (829-bit) number, using about 2700 core-years of computing; it is the largest RSA challenge number factored to date.:cite[rsa250] Typical RSA keys today have 2048 bits (617 digits), out of reach by an enormous margin.

:::key
- Find $X^2 \equiv Y^2 \pmod n$ with $X \not\equiv \pm Y$; then $\gcd(X - Y, n)$ is a proper factor. For $n$ with $k \ge 2$ prime factors, a random such pair works with probability at least $\frac12$.
- Collect relations $x^2 \equiv Q(x)$ with $Q(x)$ smooth over a factor base; more relations than primes guarantees a subset whose product is a square (linear algebra over $\mathbb{F}_2$).
- Smooth numbers have density $\rho(u)$ (Dickman). Balancing gives the subexponential cost $L_n = e^{(1+o(1))\sqrt{\log n \log\log n}}$ (heuristically).
- Sieving finds the smooth values like Eratosthenes. The number field sieve improves the exponent to $\frac13$ and holds the factoring records.
:::

:::exercises
1. Factor $n = 2041$ by hand with the quadratic sieve, using the factor base $\{2, 3, 5, 7\}$ and $x = 46, 47, 49, 51$.
2. Show that if $n = p^k$ is a prime power then every square root of $X^2$ is $\pm X$, so congruences of squares never split it. (How would you detect prime powers instead?)
3. Show that $\rho(u) = 1 - \log u$ for $1 \le u \le 2$ from the delay equation.
4. Estimate how many values $Q(x)$ the quadratic sieve must examine for a 60-digit $n$ with $B = 10^5$, assuming $Q(x) \approx 10^{31}$ and that $Q(x)$ is smooth with probability $\rho(u)$, $u = \log Q / \log B$.
:::
