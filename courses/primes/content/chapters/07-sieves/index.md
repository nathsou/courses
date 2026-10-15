---
number: 7
title: The sieve of Eratosthenes
summary: The oldest algorithm for listing primes, why it is correct, why it costs only about n log log n steps, and the engineering that makes it fast (odd-only storage, wheels, segments, the linear sieve). Then the patterns primes seem to make in spirals.
duration: About 1½ hours
prerequisites: [divisors, infinitely-many]
theorems: [The sieve is correct, The sieve costs O(n log log n), The linear sieve crosses each composite once]
techniques: [algorithm correctness, harmonic sums, cache-aware design]
---

Trial division answers "is this number prime?" one number at a time. To list *all* the primes up to $N$, there is something far better, and it is more than 2,000 years old. Eratosthenes of Cyrene, the librarian of Alexandria who also estimated the circumference of the Earth, is credited with it by Nicomachus of Gerasa, writing around 100 AD.:cite[oconnor-eratosthenes] The idea is to never test a number at all: instead, cross out everything that is *not* prime, and see what is left.

## The sieve

:::algorithm[The sieve of Eratosthenes]
**Input:** $N \ge 2$. **Output:** the primes up to $N$.

1. Write down $2, 3, \ldots, N$, none of them crossed out.
2. Let $p$ be the smallest number that is not crossed out and has not been used yet. If $p^2 > N$, stop.
3. Cross out $p^2, p^2 + p, p^2 + 2p, \ldots$ up to $N$. Go back to step 2.

The numbers that are not crossed out are the primes up to $N$.
:::

Step through it below. Each composite is coloured by the prime that crossed it out first, which is its smallest prime factor.

::sieve-grid

:::theorem{status=proved}
When the sieve stops, the numbers in $[2, N]$ that are not crossed out are exactly the primes.
:::

:::proof
Nothing prime is ever crossed out: every number crossed out is a multiple $kp$ with $k \ge p \ge 2$, so it is composite.

Every composite $m \le N$ is crossed out. Let $q$ be its smallest prime factor; by Chapter 1, $q \le \sqrt{m} \le \sqrt{N}$, and $m = qk$ with $k \ge q$ (since every prime factor of $k$ is at least $q$). So $m$ is one of $q^2, q^2 + q, \ldots$. It remains to see that $q$ is used as a value of $p$ in step 2. The values of $p$ are taken in increasing order and each is the smallest number not yet crossed out; a prime is never crossed out, so every prime $q$ with $q^2 \le N$ is eventually reached.
:::

The proof explains the two details of step 3. Crossing out can start at $p^2$, because a smaller multiple $kp$ with $k < p$ has a prime factor smaller than $p$ and was crossed out earlier. And the process can stop at $\sqrt{N}$, because every composite up to $N$ has a prime factor that small. With the checkbox in the widget you can see what the first saving is worth.

```numeric
id: sieves/primes-needed
title: How far to sieve
prompt: To list the primes up to $10{,}000$ with the sieve, crossing out multiples of how many different primes is enough?
answer: 25
tolerance: 0
explain: You need the primes up to $\sqrt{10{,}000} = 100$, and there are $\pi(100) = 25$ of them.
```

## What it costs

Each prime $p \le \sqrt N$ crosses out about $N/p$ numbers. So the total work is about

$$\sum_{p \le \sqrt N} \frac{N}{p} = N \sum_{p \le \sqrt N} \frac 1p.$$

How big is the sum of the reciprocals of the primes? Chapter 4 showed it is *at least* $\log\log x - 1$. A crude upper bound is easy: the primes are among the integers, so $\sum_{p \le x} 1/p \le \sum_{n \le x} 1/n \le 1 + \log x$, which already gives $O(N \log N)$. The truth is much better.

:::theorem{status=proved}
The sieve of Eratosthenes makes $N \log\log N + O(N)$ crossings to list the primes up to $N$.
:::

:::proof
The number of crossings is $\sum_{p \le \sqrt N} \left(\lfloor N/p \rfloor - p + 1\right)$, which differs from $N \sum_{p \le \sqrt N} 1/p$ by at most $\sum_{p \le \sqrt N} p \le N$. **Mertens' second theorem**, proved in Chapter 17, says $\sum_{p \le x} 1/p = \log\log x + O(1)$. With $x = \sqrt N$, $\log \log \sqrt N = \log\log N - \log 2$, so the total is $N\log\log N + O(N)$.
:::

$\log \log N$ grows so slowly that it is practically a constant: it is about $2.6$ at $N = 10^6$, $3.0$ at $10^9$ and $3.6$ at $10^{16}$. For $N = 10^6$ the sieve makes $2{,}122{,}048$ crossings (the formula $N\log\log N$ gives $2.6$ million), about two per number. So listing all the primes up to $N$ costs barely more than writing the numbers down, whereas testing each number by trial division would cost about $N^{3/2}/\log N$ divisions.

## Engineering a fast sieve

The textbook sieve is simple, but on a modern machine its speed is dominated by memory, not arithmetic. Four standard improvements:

**Store only odd numbers.** Half the array is even numbers, all crossed out by $2$. Let index $i$ stand for $2i + 1$. That halves the memory and skips the busiest prime.

**Wheels.** Push the same idea further. Modulo $30 = 2 \cdot 3 \cdot 5$, only the $8$ residues $1, 7, 11, 13, 17, 19, 23, 29$ are coprime to $30$, so storing only those keeps $8/30 \approx 27\%$ of the numbers. With the primes up to $7$ the fraction is $48/210 \approx 23\%$, and in general it is $\prod_{p \le B}(1 - 1/p)$, which shrinks only like $1/\log B$ (Chapter 17 again), so large wheels give diminishing returns.

**Segments.** A sieve up to $10^9$ needs a gigabyte at one byte per number, and every crossing touches a random place in it, missing the processor's cache. A **segmented sieve** first finds the primes up to $\sqrt N$ with a small sieve, then processes $[2, N]$ in blocks of, say, $64$ kilobytes, crossing out multiples of the small primes in each block. Memory falls to $O(\sqrt{N})$ plus one block, every access stays in cache, and, as a bonus, you can sieve *any* interval $[A, B]$ without sieving everything below it. That is how the course's library finds the $37$ primes between $10^{12}$ and $10^{12} + 1000$ in a millisecond, using only the $78{,}498$ primes below $10^6$.

**Bits.** One bit per number instead of one byte saves another factor of $8$ in memory, at the cost of some bit manipulation.

The race below runs five versions in your browser. All of them must agree.

::sieve-race

Record-breaking implementations combine all of these, along with careful handling of small primes. Kim Walisch's *primesieve* counts the primes below $10^{10}$ in a fraction of a second on a laptop.:cite[primesieve] Asymptotically better sieves exist: the sieve of Atkin and Bernstein (2004) needs $O(N / \log\log N)$ operations,:cite[atkin-bernstein] but in practice well-engineered segmented Eratosthenes is hard to beat.

### The linear sieve

The plain sieve crosses out some numbers several times: $30$ is crossed out by $2$, $3$ and $5$. A variation by Gries and Misra (1978) crosses out every composite exactly once, and records its smallest prime factor as it does so.:cite[gries-misra]

:::algorithm[The linear sieve]
Keep a list of primes found so far and an array $\mathrm{spf}$, initially $0$. For $i = 2, 3, \ldots, N$: if $\mathrm{spf}[i] = 0$, then $i$ is prime: set $\mathrm{spf}[i] = i$ and add it to the list. Then, for each prime $p$ in the list with $p \le \mathrm{spf}[i]$ and $p i \le N$, set $\mathrm{spf}[p i] = p$.
:::

:::theorem{status=proved}
The linear sieve sets $\mathrm{spf}[m]$ to the smallest prime factor of every $m \le N$, and visits every composite exactly once.
:::

:::proof
Every composite $m$ can be written uniquely as $m = p \cdot i$ with $p$ its smallest prime factor; then every prime factor of $i$ is at least $p$, so $p \le \mathrm{spf}(i)$. When the outer loop reaches this $i$, the inner loop runs over the primes up to $\mathrm{spf}(i)$, which are all in the list by then (they are at most $i$), and in particular reaches $p$ and sets $\mathrm{spf}[m] = p$. Conversely, the pair $(p, i)$ visited by the inner loop always satisfies $p \le \mathrm{spf}(i)$, so $p$ is the smallest prime factor of $pi$: the representation above. Since it is unique, each composite is visited once.
:::

The smallest-prime-factor table is the real prize. With it, factoring any $m \le N$ takes only as many steps as $m$ has prime factors: divide by $\mathrm{spf}[m]$, look up the quotient, repeat. Tables of $\mu(n)$, $\varphi(n)$ and the other arithmetic functions of Part IV are computed this way.

### Write your own

```code
id: sieves/sieve
title: A sieve that scales
prompt: |
  Write `primesUpTo(n)` returning the primes up to $n$ in increasing order, for $0 \le n \le 3 \times 10^7$. Use a `Uint8Array` of flags (one byte per number is fine), start crossing out at $p^2$, and stop the outer loop once $p^2 > n$. The tests include $n = 10^7$, so an $O(n\sqrt n)$ approach will time out.
starter: |
  export function primesUpTo(n: number): number[] {
    const composite = new Uint8Array(n + 1);
    const primes: number[] = [];
    // Your code here.
    return primes;
  }
tests: |
  import { test, expect } from 'test';
  import { primesUpTo } from 'solution';

  test('small values', () => {
    expect(primesUpTo(0)).toEqual([]);
    expect(primesUpTo(1)).toEqual([]);
    expect(primesUpTo(2)).toEqual([2]);
    expect(primesUpTo(30)).toEqual([2, 3, 5, 7, 11, 13, 17, 19, 23, 29]);
    expect(primesUpTo(49).at(-1)).toBe(47);
  });
  test('π(10⁶) = 78498 and the last prime below a million', () => {
    const ps = primesUpTo(1_000_000);
    expect(ps.length).toBe(78498);
    expect(ps.at(-1)).toBe(999983);
  });
  test('π(10⁷) = 664579, quickly', () => {
    const t = performance.now();
    expect(primesUpTo(10_000_000).length).toBe(664579);
    expect(performance.now() - t).toBeLessThan(4000);
  });
solution: |
  export function primesUpTo(n: number): number[] {
    const composite = new Uint8Array(n + 1);
    const primes: number[] = [];
    for (let p = 2; p <= n; p++) {
      if (composite[p]) continue;
      primes.push(p);
      if (p * p > n) continue;
      for (let m = p * p; m <= n; m += p) composite[m] = 1;
    }
    return primes;
  }
hints:
  - One loop does both jobs. For $p = 2, \ldots, n$, skip $p$ if it is crossed out; otherwise it is prime, so record it and cross out its multiples from $p^2$.
  - Guard the inner loop with `p * p <= n`, so that large primes are recorded without any crossing.
```

:::note
**A stopping point.** You can now list primes quickly; the rest of the chapter is about the patterns they seem to make.
:::

## Patterns in the sieve

In 1963, sitting through a dull talk at a meeting, Stanisław Ulam doodled the integers in a square spiral and circled the primes. They crowded onto diagonal lines.:cite[stein-ulam-wells] Robert Sacks later drew a variant in which $n$ sits at radius $\sqrt n$ and angle $2\pi\sqrt{n}$, so that the perfect squares fall on one ray, and the primes trace out curves.

::prime-spiral

The diagonals are not mysterious once you see what they are. In the Ulam spiral, numbers along a diagonal line are the values of a quadratic polynomial $4n^2 + bn + c$. Some quadratics are prime unusually often, because they avoid small prime factors: $n^2 + n + 41$ is never divisible by $2, 3, 5, \ldots, 37$ (it is always odd, for instance, since $n^2 + n$ is even), and it is prime for $n = 0, 1, \ldots, 39$, as Euler noticed in 1772.:cite[euler1772] No polynomial can be prime for *every* $n$ (exercise 3), but some come impressively close.

How often a polynomial hits primes is a deep and mostly open question. Nobody has proved that $n^2 + 1$ is prime infinitely often (this is the last of the four "unattackable" problems Edmund Landau listed in 1912). Hardy and Littlewood conjectured in 1923 a precise formula for how many primes $n^2 + n + 41$ and its cousins should produce, with a constant measuring how well the polynomial avoids small primes. Chapter 18 explains where such formulas come from, and how well they match the data.

:::key
- The sieve crosses out the multiples of each prime $p \le \sqrt N$, starting at $p^2$. What remains is prime.
- Its cost is $N \sum_{p \le \sqrt N} 1/p = N \log\log N + O(N)$: essentially linear.
- In practice memory dominates: store odd numbers only, use a wheel, sieve in cache-sized segments. A segmented sieve can sieve any interval $[A, B]$ using the primes up to $\sqrt B$.
- The linear sieve visits each composite once and produces the smallest-prime-factor table, which factors every $m \le N$ instantly.
:::

:::exercises
1. Modify the sieve to compute the number of distinct prime factors $\omega(m)$ of every $m \le N$ in $O(N \log\log N)$ time.
2. How much memory does a segmented sieve need to list the primes in $[10^{18}, 10^{18} + 10^9]$? (You need the primes up to $10^9$; how many are there, roughly?)
3. Show that no non-constant polynomial $f$ with integer coefficients has $f(n)$ prime for all $n \ge 0$. (If $f(0) = p$ is prime, look at $f(kp)$.)
4. Explain why two of the diagonal rays in the Ulam spiral contain no primes at all. (Which numbers lie on them?)
:::
