---
number: 1
title: Divisors and primes
summary: What it means for one number to divide another, why 1 is not a prime, and the first primality test, trial division, with an honest look at what it costs.
duration: About 1 hour
prerequisites: [staircase]
theorems: [Division with remainder, Every integer above 1 has a prime factor, A composite n has a prime factor at most √n]
techniques: [well-ordering, proof by smallest counterexample, algorithm analysis]
---

This chapter lays the foundations: divisibility, remainders and primes, stated precisely enough to prove things about them. It ends with the first algorithm of the course, a primality test you will write yourself, and with a sobering calculation of how slow that test becomes on large numbers. Every fast method in Part II exists to get around that calculation.

## Divisibility

:::definition
An integer $a$ **divides** an integer $b$, written $a \mid b$, if $b = ak$ for some integer $k$. We also say $a$ is a **divisor** (or factor) of $b$, and $b$ is a **multiple** of $a$. If $a$ does not divide $b$, we write $a \nmid b$.
:::

So $3 \mid 12$ (since $12 = 3 \cdot 4$), $5 \nmid 12$, $-4 \mid 12$, and every integer divides $0$ (since $0 = a \cdot 0$). Note that $a \mid b$ is a *statement*, true or false, not a number: $3 \mid 12$ is true, whereas $12 / 3 = 4$ is a division.

Three facts get used constantly, usually without comment.

:::lemma{status=proved}
For all integers $a, b, c, x, y$:

1. if $a \mid b$ and $b \mid c$, then $a \mid c$;
2. if $a \mid b$ and $a \mid c$, then $a \mid bx + cy$;
3. if $a \mid b$ and $b \neq 0$, then $|a| \le |b|$.
:::

:::proof
1. Write $b = ak$ and $c = bl$. Then $c = a(kl)$.
2. Write $b = ak$ and $c = al$. Then $bx + cy = a(kx + ly)$.
3. Write $b = ak$. As $b \ne 0$, $k \ne 0$, so $|k| \ge 1$ and $|b| = |a|\,|k| \ge |a|$.
:::

Part 2 is the workhorse. It says that the multiples of $a$ are closed under adding, subtracting and scaling: if $a$ divides two numbers, it divides any combination of them. In particular, if $a \mid b$ and $a \mid b + 1$, then $a \mid (b + 1) - b = 1$, so $a = \pm 1$. Chapter 4 builds Euclid's proof that there are infinitely many primes on exactly this observation.

### Division with remainder

When $a$ does not divide $b$, there is a remainder. Everyone learns this at school; here is the precise version, with a proof, because the course leans on it heavily.

:::theorem{name="Division with remainder" status=proved}
Let $a$ and $b$ be integers with $b > 0$. There are unique integers $q$ and $r$ with
$$a = qb + r \qquad\text{and}\qquad 0 \le r < b.$$
$q$ is the **quotient** and $r$ the **remainder**, written $r = a \bmod b$.
:::

::::zoom{levels="Idea, Proof"}
:::level[Idea]
Take the largest multiple of $b$ that does not exceed $a$. What is left over is less than $b$.
:::
:::level[Proof]
*Existence.* Let $q = \lfloor a/b \rfloor$, the largest integer with $q \le a/b$. Then $q \le a/b < q + 1$; multiplying by $b > 0$ gives $qb \le a < qb + b$. Set $r = a - qb$: then $0 \le r < b$.

*Uniqueness.* Suppose $a = qb + r = q'b + r'$ with $0 \le r, r' < b$. Then $b(q - q') = r' - r$, so $b \mid r' - r$. But $-b < r' - r < b$, and the only multiple of $b$ strictly between $-b$ and $b$ is $0$. So $r = r'$, and then $q = q'$.
:::
::::

:::warning
**Programmers, beware of negative numbers.** In mathematics the remainder is never negative: $-7 \bmod 3 = 2$, because $-7 = (-3) \cdot 3 + 2$. In JavaScript, C, Java and Rust, `-7 % 3` is `-1`: the `%` operator rounds the quotient towards zero, not downwards. Python's `%` agrees with the mathematicians. The course's library has `mod(a, m)`, which always returns a value in $[0, m)$.
:::

```quiz
q: What are $q$ and $r$ when $a = -17$ and $b = 5$?
options:
  - text: $q = -4$, $r = 3$
    correct: true
    why: $-17 = (-4) \cdot 5 + 3$ with $0 \le 3 < 5$. The quotient is $\lfloor -17/5 \rfloor = \lfloor -3.4 \rfloor = -4$.
  - text: $q = -3$, $r = -2$
    why: That is what `-17 % 5` gives in JavaScript, but the remainder must satisfy $0 \le r < b$.
  - text: $q = -3$, $r = 2$
    why: Check it: $(-3) \cdot 5 + 2 = -13$, not $-17$.
```

## Primes

Every integer $n > 1$ has at least two positive divisors, $1$ and $n$. The primes are the numbers with no others.

:::definition
An integer $p > 1$ is **prime** if its only positive divisors are $1$ and $p$. An integer $n > 1$ that is not prime is **composite**: it can be written $n = ab$ with $1 < a, b < n$.
:::

A picture helps. Lay out $n$ counters in a rectangle with whole rows. Every factorisation $n = a \times b$ is a rectangle with $a$ rows of $b$. A prime is a number of counters that can only be laid out in a single line.

::rectangles

### Why 1 is not prime

The definition starts at $2$, and that is a deliberate choice, not an accident of history (for a while, some mathematicians did count $1$ as prime). The reason is the theorem the whole subject rests on: every integer above $1$ is a product of primes in exactly one way, up to the order of the factors (Chapter 3). If $1$ were prime, the "one way" would fail at once: $6 = 2 \cdot 3 = 1 \cdot 2 \cdot 3 = 1 \cdot 1 \cdot 2 \cdot 3 = \cdots$. Excluding $1$ keeps the most important theorem about primes simple to state. Numbers like $1$ and $-1$, which divide everything and have inverses, are called **units**; in Chapter 3 the same distinction reappears in other number systems.

### Every number has a prime factor

The first real theorem is that primes are unavoidable: any integer above $1$ is either prime itself or divisible by a smaller prime.

:::theorem{status=proved}
Every integer $n > 1$ has a prime factor. In fact, its smallest divisor greater than $1$ is prime.
:::

:::proof
The set of divisors of $n$ that are greater than $1$ is not empty, since it contains $n$. Every non-empty set of positive integers has a smallest element (the **well-ordering principle**), so let $d$ be the smallest divisor of $n$ with $d > 1$.

Suppose $d$ were not prime. Then $d$ would have a divisor $e$ with $1 < e < d$. By part 1 of the lemma, $e \mid d$ and $d \mid n$ give $e \mid n$. So $e$ is a divisor of $n$, greater than $1$ and smaller than $d$, which contradicts the choice of $d$. Hence $d$ is prime.
:::

This is a proof by **smallest counterexample**, or rather by smallest example: choose the extreme case and show that it cannot misbehave. You will see the same move many times.

Applying the theorem again and again breaks any number into primes: split off a prime factor $p$, then factor $n/p$, and so on. The quotients get smaller each time, so the process stops. Chapter 3 proves that the primes you end up with do not depend on the choices you make along the way.

## Testing a number for primality

How can you tell whether $n$ is prime? The definition suggests trying every possible divisor from $2$ to $n - 1$. You can stop much sooner.

:::theorem{status=proved}
If $n > 1$ is composite, then $n$ has a prime factor $p \le \sqrt{n}$.
:::

:::proof
Write $n = ab$ with $1 < a \le b < n$ (we can order the two factors so that $a \le b$). Then $a^2 \le ab = n$, so $a \le \sqrt{n}$. By the previous theorem, $a$ has a prime factor $p$, and $p \le a \le \sqrt{n}$. Since $p \mid a$ and $a \mid n$, $p \mid n$.
:::

The rectangles show why: in a rectangle of $n$ counters, the shorter side has at most $\sqrt n$ counters. So to test $n$ you only need to try divisors up to $\sqrt{n}$, and if none of them divides $n$, it is prime.

:::algorithm[Trial division]
**Input:** an integer $n \ge 2$. **Output:** the smallest prime factor of $n$ (which equals $n$ exactly when $n$ is prime).

1. For $d = 2, 3, 4, \ldots$ while $d^2 \le n$: if $d \mid n$, return $d$.
2. Return $n$.
:::

The first $d$ that divides $n$ is automatically prime: if it were composite, one of its prime factors (which is smaller than $d$ and also divides $n$) would have been found earlier. In practice you skip the even numbers after $2$, which halves the work; Chapter 7 shows how to skip multiples of $3$, $5$ and $7$ as well.

::trial-division

### Write it yourself

```code
id: divisors/is-prime
title: Trial division
prompt: |
  Write `isPrime(n)` for integers $0 \le n < 2^{53}$. It should return `true` exactly when $n$ is prime. Use trial division: test $2$, then odd numbers $d$ while $d \cdot d \le n$. Make sure $0$ and $1$ are not prime and $2$ is.
starter: |
  export function isPrime(n: number): boolean {
    // Your code here.
    return false;
  }
tests: |
  import { test, expect } from 'test';
  import { isPrime } from 'solution';
  import { isPrimeTrial } from 'primes';

  test('0, 1, 2, 3 and 4', () => {
    expect(isPrime(0)).toBe(false);
    expect(isPrime(1)).toBe(false);
    expect(isPrime(2)).toBe(true);
    expect(isPrime(3)).toBe(true);
    expect(isPrime(4)).toBe(false);
  });
  test('agrees with the library up to 10,000', () => {
    for (let n = 0; n <= 10000; n++) if (isPrime(n) !== isPrimeTrial(n)) throw new Error(`isPrime(${n}) should be ${isPrimeTrial(n)}`);
  });
  test('squares of primes are composite (check the bound d·d ≤ n)', () => {
    for (const p of [3, 5, 7, 11, 101, 1009]) expect(isPrime(p * p)).toBe(false);
  });
  test('large numbers: 2147483647 is prime, 999999000001 is prime, 2147483649 is not', () => {
    expect(isPrime(2147483647)).toBe(true);
    expect(isPrime(999999000001)).toBe(true);
    expect(isPrime(2147483649)).toBe(false);
  });
solution: |
  export function isPrime(n: number): boolean {
    if (n < 2) return false;
    if (n % 2 === 0) return n === 2;
    for (let d = 3; d * d <= n; d += 2) {
      if (n % d === 0) return false;
    }
    return true;
  }
hints:
  - Handle $n < 2$ first, then even numbers (only $2$ is an even prime).
  - 'The loop condition `d * d <= n` avoids computing a square root, and the `<=` matters: try $n = 9$.'
```

## What trial division costs

Trial division is correct, short and fast enough for numbers up to about $10^{12}$. But look at how its cost grows. For a prime $n$, it performs about $\sqrt{n}/2$ divisions. That sounds mild until you remember how big numbers are measured: a number with $d$ decimal digits is about $10^d$, so testing it takes about $10^{d/2}$ divisions.

| Digits of $n$ | Divisions (about $\tfrac12\sqrt{n}$) | Time at $10^9$ divisions per second |
| ---: | ---: | ---: |
| $10$ | $5 \times 10^4$ | $50$ microseconds |
| $20$ | $5 \times 10^9$ | $5$ seconds |
| $30$ | $5 \times 10^{14}$ | $6$ days |
| $40$ | $5 \times 10^{19}$ | $1{,}600$ years |
| $300$ | $5 \times 10^{149}$ | far longer than the age of the universe |

The size of the *input* is its number of digits (or bits), and trial division takes time exponential in that size: for a $b$-bit number, $\sqrt{n} \approx 2^{b/2}$. Cryptography routinely needs primes with $300$ digits or more (Chapter 13). Testing those requires a completely different idea, and Chapter 8 supplies one: a test that takes a fraction of a second on a 300-digit number, based on Fermat's little theorem (Chapter 6).

:::question
Trial division also *factors* numbers: run it, divide out the factor found, and repeat. Is factoring a 300-digit number with no small factors any easier than proving a 300-digit number prime this way? Keep your answer in mind: Chapters 8 and 11 show that, with better algorithms, these two problems turn out to have very different difficulty.
:::

:::key
- $a \mid b$ means $b = ak$ for an integer $k$. Divisors of two numbers divide every combination $bx + cy$.
- Division with remainder: $a = qb + r$ with $0 \le r < b$, uniquely. (Mind the sign of `%` in code.)
- A prime has exactly two positive divisors. $1$ is not prime, so that factorisation into primes can be unique.
- The smallest divisor above $1$ of any $n > 1$ is prime, and a composite $n$ has a prime factor at most $\sqrt{n}$. That gives trial division, which costs about $\sqrt{n}$ steps: exponential in the number of digits.
:::

:::exercises
1. Show that if $a \mid b$ and $b \mid a$ for positive integers $a, b$, then $a = b$.
2. Find all $n$ such that $n \mid n + 6$. (Use part 2 of the lemma.)
3. Prove that if $n > 1$ and $n$ has no prime factor at most $\sqrt[3]{n}$, then $n$ is a prime or a product of two primes.
4. The numbers $n^2 + n + 41$ are prime for $n = 0, 1, \ldots, 39$ (Euler noticed this in 1772). Without a computer, find an $n$ for which it is composite.
:::

```numeric
id: divisors/divisor-count
title: Counting divisors
prompt: How many positive divisors does $360 = 2^3 \cdot 3^2 \cdot 5$ have? (Chapter 3 explains the shortcut; for now, you can list them.)
answer: 24
tolerance: 0
explain: A divisor is $2^a 3^b 5^c$ with $0 \le a \le 3$, $0 \le b \le 2$, $0 \le c \le 1$, so there are $4 \cdot 3 \cdot 2 = 24$.
```
