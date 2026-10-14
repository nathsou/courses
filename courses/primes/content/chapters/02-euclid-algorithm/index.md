---
number: 2
title: Euclid’s algorithm
summary: The greatest common divisor, the oldest non-trivial algorithm in continuous use, Bézout’s identity, and Lamé’s theorem that the algorithm never needs more than five steps per digit.
duration: About 1¼ hours
prerequisites: [divisors]
theorems: [Euclid’s algorithm computes the gcd, Bézout’s identity, Lamé’s theorem]
techniques: [invariants, well-ordering, Fibonacci bounds]
---

The **greatest common divisor** of two numbers is the largest number that divides both. Computing it looks like a factoring problem: factor both numbers and take the common primes. But factoring is hard (Chapter 1 ended on that note), and the greatest common divisor is not: Euclid's algorithm computes it for numbers with thousands of digits in a blink, without factoring anything. It is more than 2,300 years old, it appears in Book VII of the *Elements*,:cite[euclid] and every RSA key ever generated has been through it.

This chapter proves that the algorithm is correct, extends it to produce **Bézout's identity**, which is the key to unique factorisation in Chapter 3 and to modular inverses in Chapter 5, and proves Lamé's bound on how fast it is.

## The greatest common divisor

:::definition
For integers $a$ and $b$, not both zero, $\gcd(a, b)$ is the largest integer that divides both $a$ and $b$. We set $\gcd(0, 0) = 0$. If $\gcd(a, b) = 1$, we say $a$ and $b$ are **coprime**.
:::

For example, $\gcd(42, 30) = 6$, $\gcd(17, 5) = 1$ and $\gcd(12, 0) = 12$ (every integer divides $0$). Signs do not matter: $\gcd(a, b) = \gcd(|a|, |b|)$, so from now on take $a, b \ge 0$.

The whole algorithm rests on one observation.

:::lemma{status=proved}
If $a = qb + r$, then $\gcd(a, b) = \gcd(b, r)$.
:::

:::proof
We show that $a, b$ and $b, r$ have exactly the same common divisors; then their greatest common divisors are equal. If $d \mid a$ and $d \mid b$, then $d \mid a - qb = r$ (Chapter 1, part 2 of the lemma), so $d$ divides $b$ and $r$. Conversely, if $d \mid b$ and $d \mid r$, then $d \mid qb + r = a$.
:::

Apply the lemma with $r = a \bmod b$, and the problem shrinks: $r < b$. Repeat until the remainder is $0$; then $\gcd(g, 0) = g$.

:::algorithm[Euclid’s algorithm]
**Input:** integers $a \ge b \ge 0$. **Output:** $\gcd(a, b)$.

While $b \neq 0$: replace $(a, b)$ by $(b, a \bmod b)$. Then return $a$.
:::

For $1071$ and $462$:

$$\begin{aligned} 1071 &= 2 \cdot 462 + 147 \\ 462 &= 3 \cdot 147 + 21 \\ 147 &= 7 \cdot 21 + 0 \end{aligned}$$

so $\gcd(1071, 462) = 21$. Each line is a division with remainder, and the remainders strictly decrease ($147 > 21 > 0$), so the algorithm always stops. When it does, the lemma says the gcd has not changed along the way.

### A picture

Euclid thought of numbers as lengths, and his algorithm as repeated subtraction: take the shorter length away from the longer as many times as you can. In two dimensions this becomes a rectangle cut into squares. From an $a \times b$ rectangle, cut as many $b \times b$ squares as will fit (that is the quotient $q$), leaving a strip of width $r$; then cut squares from the strip, and so on. The side of the very last square divides every side before it, and it is the gcd.

::euclid-squares

```blanks
title: Euclid’s algorithm by hand
prompt: Run the algorithm on $252$ and $198$.
text: |
  $252 = 1 \times 198 + $ [[r1]]

  $198 = $ [[q2]] $\times 54 + 36$

  $54 = 1 \times 36 + $ [[r3]]

  $36 = 2 \times 18 + 0$, so $\gcd(252, 198) = $ [[g]].
blanks:
  r1: { answer: '54' }
  q2: { answer: '3' }
  r3: { answer: '18' }
  g: { answer: '18' }
```

## Bézout’s identity

Run the algorithm backwards and something more appears. From the example above,

$$21 = 462 - 3 \cdot 147 = 462 - 3\,(1071 - 2 \cdot 462) = 7 \cdot 462 - 3 \cdot 1071.$$

The gcd is a **combination** of the two numbers, with integer coefficients. That is always true.

:::theorem{name="Bézout’s identity" who="Étienne Bézout" year=1779 status=proved}
For integers $a$ and $b$ there are integers $x$ and $y$ with
$$ax + by = \gcd(a, b).$$
Moreover, $\gcd(a, b)$ is the smallest positive integer of the form $ax + by$, and every common divisor of $a$ and $b$ divides $\gcd(a, b)$.
:::

The name is slightly unfair: the identity for integers was known to Bachet in 1624, and Bézout proved the corresponding statement for polynomials.:cite[bezout1779] Here are two proofs. The first is short and tells you *why* it is true; the second is the algorithm that computes $x$ and $y$.

::::zoom{levels="Idea, Proof by well-ordering"}
:::level[Idea]
The combinations $ax + by$ are closed under subtraction, so the smallest positive one divides all the others, including $a$ and $b$. That makes it a common divisor, and nothing larger can divide a combination of $a$ and $b$ and still be smaller than it.
:::
:::level[Proof by well-ordering]
If $a = b = 0$ there is nothing to prove, so assume not. Let $S = \{ax + by : x, y \in \mathbb{Z},\ ax + by > 0\}$. It is not empty ($a^2 + b^2 > 0$ is in it), so it has a smallest element $d = ax_0 + by_0$.

*$d$ divides $a$.* Divide: $a = qd + r$ with $0 \le r < d$. Then $r = a - qd = a(1 - qx_0) + b(-qy_0)$ is a combination of $a$ and $b$. If $r$ were positive it would be in $S$ and smaller than $d$, which is impossible; so $r = 0$. The same argument shows $d \mid b$.

*Every common divisor divides $d$.* If $c \mid a$ and $c \mid b$, then $c \mid ax_0 + by_0 = d$.

So $d$ is a common divisor, and every common divisor $c$ divides $d$, so $|c| \le d$. Hence $d = \gcd(a, b)$.
:::
::::

The second part of the theorem deserves emphasis: the gcd is not merely the *largest* common divisor, it is a *multiple of every* common divisor. That is a much stronger property, and Chapter 3 uses it to prove Euclid's lemma.

### The extended algorithm

To compute $x$ and $y$, carry the coefficients along. Keep a row $(r, x, y)$ with the **invariant** $r = ax + by$. Start with the rows $(a, 1, 0)$ and $(b, 0, 1)$, which satisfy it trivially. Each new row is the row two above minus $q$ times the row above, where $q$ is the quotient of their $r$ values. Subtracting rows preserves the invariant, and the $r$ column runs through exactly the remainders of Euclid's algorithm.

::extended-table

```code
id: euclid/extended-gcd
title: Extended Euclid
prompt: |
  Write `extendedGcd(a, b)` for non-negative bigints. It should return `[g, x, y]` with `g = gcd(a, b)` and `a*x + b*y === g`. Keep two rows `(r, x, y)` as in the table, and remember that bigint division `/` truncates (for non-negative values it is the floor).
starter: |
  export function extendedGcd(a: bigint, b: bigint): [bigint, bigint, bigint] {
    // Rows (r0, x0, y0) = (a, 1, 0) and (r1, x1, y1) = (b, 0, 1).
    return [0n, 0n, 0n];
  }
tests: |
  import { test, expect } from 'test';
  import { extendedGcd } from 'solution';
  import { gcdBig } from 'primes';

  function check(a: bigint, b: bigint) {
    const [g, x, y] = extendedGcd(a, b);
    if (g !== gcdBig(a, b)) throw new Error(`gcd(${a}, ${b}) should be ${gcdBig(a, b)}, got ${g}`);
    if (a * x + b * y !== g) throw new Error(`${a}·(${x}) + ${b}·(${y}) = ${a * x + b * y}, not ${g}`);
  }
  test('small examples', () => {
    check(240n, 46n);
    check(1071n, 462n);
    check(17n, 5n);
    check(5n, 17n);
  });
  test('zeros', () => {
    check(12n, 0n);
    check(0n, 12n);
    expect(extendedGcd(0n, 0n)[0]).toBe(0n);
  });
  test('every pair up to 60', () => {
    for (let a = 0n; a <= 60n; a++) for (let b = 0n; b <= 60n; b++) check(a, b);
  });
  test('huge numbers', () => {
    check(2n ** 127n - 1n, 10n ** 30n + 57n);
    check(3n ** 200n, 2n ** 300n * 3n ** 7n);
  });
solution: |
  export function extendedGcd(a: bigint, b: bigint): [bigint, bigint, bigint] {
    let [r0, x0, y0] = [a, 1n, 0n];
    let [r1, x1, y1] = [b, 0n, 1n];
    while (r1 !== 0n) {
      const q = r0 / r1;
      [r0, r1] = [r1, r0 - q * r1];
      [x0, x1] = [x1, x0 - q * x1];
      [y0, y1] = [y1, y0 - q * y1];
    }
    return [r0, x0, y0];
  }
hints:
  - 'Loop while `r1 !== 0n`. Compute `q = r0 / r1`, then replace each pair `(u0, u1)` by `(u1, u0 - q * u1)` for `u = r, x, y`.'
  - The answer is the first row when the second row’s remainder becomes zero.
```

## How fast is it?

Each step replaces $(a, b)$ by $(b, a \bmod b)$. How many steps can that take? The map below runs the algorithm on every pair up to $144$ and colours each pair by its number of steps.

::steps-map

Most pairs finish in a few steps. The slow ones lie along lines whose slope is close to the golden ratio $\varphi = (1 + \sqrt 5)/2 \approx 1.618$, and the slowest of all are pairs of consecutive **Fibonacci numbers** $F_1 = F_2 = 1$, $F_{k+1} = F_k + F_{k-1}$: $1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, \ldots$ On $(F_{k+1}, F_k)$, every quotient is $1$ (until the last) and every remainder is the previous Fibonacci number, so the algorithm crawls down the sequence one term at a time.

That is the worst that can happen, and it is still fast.

:::theorem{name="Lamé’s theorem" who="Gabriel Lamé" year=1844 status=proved}
If $a \ge b > 0$ and Euclid's algorithm takes $n$ division steps on $(a, b)$, then $b \ge F_{n+1}$. Consequently $n$ is at most five times the number of decimal digits of $b$.
:::

This was one of the first theorems in the analysis of algorithms.:cite[lame1844,knuth-taocp2]

::::zoom{levels="Idea, Sketch, Proof"}
:::level[Idea]
Read the algorithm backwards. The last non-zero remainder is at least $1$, the one before it at least $2$, and each earlier one is at least the sum of the next two. So the remainders, read from the end, grow at least as fast as the Fibonacci numbers, and those grow exponentially.
:::
:::level[Sketch]
Write the steps as $r_{i-1} = q_i r_i + r_{i+1}$ for $i = 1, \ldots, n$, with $r_0 = a$, $r_1 = b$, $r_n \ne 0$ and $r_{n+1} = 0$. Since every $q_i \ge 1$, $r_{i-1} \ge r_i + r_{i+1}$: Fibonacci growth, backwards. So $b = r_1 \ge F_{n+1}$. And $F_k \ge \varphi^{k-2}$, so $n \le 1 + \log_\varphi b$, which is less than $5 \times$ (digits of $b$).
:::
:::level[Proof]
Use the notation of the sketch. We prove $r_{n-j} \ge F_{j+2}$ for $j = 0, 1, \ldots, n - 1$ by strong induction on $j$.

- $j = 0$: $r_n \ge 1 = F_2$ because $r_n \ne 0$.
- $j = 1$: $r_{n-1} = q_n r_n + 0$ and $r_{n-1} > r_n$ (remainders strictly decrease), so $q_n \ge 2$ and $r_{n-1} \ge 2 r_n \ge 2 = F_3$.
- $j \ge 2$: $r_{n-j} = q_{n-j+1} r_{n-j+1} + r_{n-j+2} \ge r_{n-j+1} + r_{n-j+2} \ge F_{j+1} + F_j = F_{j+2}$.

Taking $j = n - 1$ gives $b = r_1 \ge F_{n+1}$.

Next, $F_k \ge \varphi^{k-2}$ for all $k \ge 2$, again by induction: $F_2 = 1 = \varphi^0$, $F_3 = 2 \ge \varphi$, and for $k \ge 3$, $F_{k+1} = F_k + F_{k-1} \ge \varphi^{k-2} + \varphi^{k-3} = \varphi^{k-3}(\varphi + 1) = \varphi^{k-1}$, using $\varphi^2 = \varphi + 1$.

So $b \ge \varphi^{n-1}$, that is, $n \le 1 + \log_\varphi b$. If $b$ has $d$ decimal digits then $b < 10^d$, and $\log_\varphi 10 \approx 4.785$, so $n < 1 + 4.785\,d < 5d + 1$. As $n$ is an integer, $n \le 5d$.
:::
::::

So the gcd of two 300-digit numbers takes at most $1500$ division steps. On average it takes far fewer: for numbers up to $N$ the average is about $\tfrac{12 \log 2}{\pi^2} \log N \approx 0.84 \log N$ (a theorem of Heilbronn and Dixon from 1969–70 that we will not prove), which for $300$ digits is about $0.84 \times 691 \approx 580$.:cite[knuth-taocp2] Each step is one division of large numbers. Compare trial division's $10^{150}$ steps on a number of that size: the gcd is, for practical purposes, free.

```quiz
q: Which pair below $100$ makes Euclid’s algorithm take the most steps?
options:
  - text: $(89, 55)$
    correct: true
    why: Consecutive Fibonacci numbers. The quotients are all $1$ until the last division, so the remainders step down $55, 34, 21, 13, 8, 5, 3, 2, 1$, which is $9$ divisions.
  - text: $(99, 98)$
    why: '$99 = 1 \cdot 98 + 1$, then $98 = 98 \cdot 1 + 0$: two steps. A big quotient finishes things quickly.'
  - text: $(97, 89)$
    why: Two primes, but primality is irrelevant here. $97 = 1 \cdot 89 + 8$, $89 = 11 \cdot 8 + 1$, $8 = 8 \cdot 1$: three steps.
```

:::note
**A stopping point.** You can now compute gcds and Bézout coefficients, and you know why it is fast. Chapter 3 uses Bézout to prove unique factorisation; Chapter 5 uses the extended algorithm to compute inverses modulo $n$.
:::

## Two variations

**Least common multiple.** $\operatorname{lcm}(a, b)$ is the smallest positive common multiple of $a$ and $b$. Chapter 3 shows that $\gcd(a, b) \cdot \operatorname{lcm}(a, b) = ab$ for positive $a, b$, so the lcm is also cheap to compute. (In code, compute `a / gcd(a, b) * b` rather than `a * b / gcd(a, b)`, so the intermediate product does not overflow.)

**Binary gcd.** Division is the slowest arithmetic operation on most processors, and Josef Stein noticed in 1967 that you can avoid it entirely: $\gcd(2a, 2b) = 2\gcd(a, b)$, $\gcd(2a, b) = \gcd(a, b)$ for odd $b$, and $\gcd(a, b) = \gcd(a - b, b)$; together with shifts, these give an algorithm that uses only subtraction and halving.:cite[knuth-taocp2] Big-integer libraries use refinements of both approaches.

:::key
- $\gcd(a, b) = \gcd(b, a \bmod b)$, so repeated division with remainder reaches the gcd: Euclid's algorithm.
- Bézout: $\gcd(a, b) = ax + by$ for some integers $x, y$, found by the extended algorithm, and every common divisor divides the gcd.
- Lamé: the number of steps is at most five per decimal digit, with consecutive Fibonacci numbers as the worst case. Gcds are cheap; factoring is not.
:::

:::exercises
1. Show that consecutive Fibonacci numbers are coprime, and that $\gcd(F_m, F_n) = F_{\gcd(m, n)}$. (The second is harder: first prove $F_{m+n} = F_{m+1} F_n + F_m F_{n-1}$.)
2. Prove that $\gcd(n, n + 1) = 1$ and that $\gcd(2n + 1, 3n + 2) = 1$ for every integer $n$.
3. Find all integer solutions of $35x + 21y = 14$. (First find one, then describe the rest.)
4. Prove that $\gcd(2^m - 1, 2^n - 1) = 2^{\gcd(m, n)} - 1$. (Run Euclid's algorithm on the exponents.)
:::
