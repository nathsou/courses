---
number: 11
title: Taking numbers apart
summary: Factoring beyond trial division. Fermat’s difference of squares, Pollard’s ρ with the birthday paradox and Floyd’s cycle finding, Pollard’s p − 1 and smooth numbers, and a glimpse of the elliptic curve method.
duration: About 1½ hours
prerequisites: [probable-primes]
theorems: [Fermat’s method, Floyd’s cycle detection, Pollard’s p − 1 method]
techniques: [difference of squares, the birthday paradox, cycle detection, smoothness]
---

Chapter 8 left an odd asymmetry. Miller–Rabin can tell you in a millisecond that a 300-digit number is composite, without revealing a single factor. Finding the factors is a different problem, and as far as anyone knows a much harder one. Trial division finds a factor $p$ after about $p$ steps, which is fine when $n$ has a small factor and hopeless when its smallest factor has 30 digits. This chapter presents three classical methods, each exploiting a different kind of weakness, and an interactive race between them.

## Fermat’s method

If $n = x^2 - y^2$, then $n = (x - y)(x + y)$. Every odd $n = ab$ (with $a \le b$) is a difference of squares in this way, with $x = \frac{a+b}2$ and $y = \frac{b-a}2$. Fermat’s idea, from a 1643 letter, is to search for $x$ directly.

:::algorithm[Fermat’s method]
For odd $n$: start with $x = \lceil \sqrt n \rceil$. While $x^2 - n$ is not a perfect square, increase $x$ by $1$. When $x^2 - n = y^2$, return $x - y$.
:::

:::theorem{status=proved}
For odd composite $n$ that is not a square, Fermat’s method stops, and if $n = ab$ with $1 < a \le b$, it stops after at most $\frac{a+b}{2} - \lceil\sqrt n\rceil + 1$ steps.
:::

:::proof
$x = \frac{a + b}2$ is an integer (both factors are odd) with $x^2 - n = \left(\frac{b - a}{2}\right)^2$, a square, and $x \ge \sqrt{ab} = \sqrt n$ by the AM–GM inequality. So the search reaches it, or stops earlier at another representation $x'^2 - y'^2 = n$, which also gives a factorisation $n = (x' - y')(x' + y')$; it is non-trivial because $x' - y' = 1$ would mean $x' = \frac{n+1}{2}$, beyond $\frac{a+b}{2}$.
:::

The number of steps, $\frac{a+b}{2} - \sqrt{ab} = \frac{(\sqrt b - \sqrt a)^2}{2}$, is tiny when the factors are close together and enormous otherwise. For $n = 999{,}979 \times 999{,}983$, the very first $x$ works. This is not a museum piece: in 2022 Hanno Böck found that some printers and other devices generated RSA keys with primes so close together that Fermat’s method factored them instantly.:cite[bock2022] Key generators now make sure the two primes differ substantially.

## Pollard’s ρ method

John Pollard published a remarkable method in 1975 whose cost depends on the size of the smallest prime factor $p$, roughly $\sqrt{p}$ operations instead of trial division’s $p$.:cite[pollard1975]

### The birthday paradox

How many people do you need in a room before two of them probably share a birthday? Only $23$. In general, if you draw values at random from $N$ possibilities, the probability of no repeat among the first $k$ draws is
$$\left(1 - \frac1N\right)\left(1 - \frac2N\right)\cdots\left(1 - \frac{k-1}{N}\right) \le e^{-(1 + 2 + \cdots + (k-1))/N} = e^{-k(k-1)/2N},$$
using $1 - t \le e^{-t}$. So once $k$ is a few times $\sqrt{N}$, a repeat is almost certain. The expected waiting time is about $\sqrt{\pi N / 2}$.

::birthday

### The walk

Pollard’s idea: walk through the residues modulo $n$ with a fixed, cheap, random-looking map, $f(x) = x^2 + c \bmod n$, starting from some $x_0$. Now look at the same walk **modulo $p$**, the unknown prime factor. There are only $p$ residues modulo $p$, so the walk must eventually repeat, and from then on it cycles. Drawn out, it looks like the Greek letter ρ: a tail leading into a loop. If $f$ behaves like a random map, the birthday paradox says the first repeat comes after about $\sqrt p$ steps.

A repeat modulo $p$, $x_i \equiv x_j \pmod p$, means $p \mid x_i - x_j$. We cannot compute modulo $p$, since we do not know $p$. But we can compute $\gcd(x_i - x_j, n)$, which is a multiple of $p$, and usually exactly $p$ (unless the walk modulo the other factors repeats at the same moment).

### Finding the cycle with two pointers

Comparing every pair $(i, j)$ would cost $k^2$ gcds. Robert Floyd’s trick needs only one per step.

:::lemma{name="Floyd’s cycle detection" status=proved}
Let $x_0, x_1, \ldots$ be a sequence with $x_{i+1} = f(x_i)$ in a finite set, with a tail of length $\mu$ and a cycle of length $\lambda$ (so $x_i = x_j$ for $i, j \ge \mu$ exactly when $\lambda \mid i - j$). Then there is an $i$ with $1 \le i \le \mu + \lambda$ and $x_i = x_{2i}$.
:::

:::proof
$x_i = x_{2i}$ holds when $i \ge \mu$ and $\lambda \mid 2i - i = i$. The multiples of $\lambda$ that are at least $\mu$ include one in $[\mu, \mu + \lambda)$, unless $\mu = 0$, in which case $i = \lambda$ works. In every case $i \le \mu + \lambda$.
:::

So run a **tortoise** $x_i$ and a **hare** $x_{2i}$ at the same time, and at each step compute $\gcd(x_i - x_{2i}, n)$.

::rho-walk

:::algorithm[Pollard’s ρ]
Set $x = y = 2$ and pick $c$ (usually $1$). Repeat: $x \leftarrow f(x)$, $y \leftarrow f(f(y))$, $g \leftarrow \gcd(|x - y|, n)$. If $1 < g < n$, return $g$. If $g = n$, start again with another $c$.
:::

How fast is it? If $f$ were a truly random map, the expected value of $\mu + \lambda$ modulo $p$ would be about $\sqrt{\pi p / 2}$, and the algorithm would find $p$ in $O(\sqrt p)$ steps. The map $x^2 + c$ is not random, and nobody has proved this running time; it is a heuristic that matches experiments very well. (Avoid $c = 0$ and $c = -2$, for which the map has too much structure.) The method’s most famous success came in 1980, when Richard Brent and Pollard used an improved version to factor the eighth Fermat number $F_8 = 2^{256} + 1$, finding a 16-digit prime factor.:cite[brent-pollard1981]

```code
id: factoring/rho
title: Pollard’s ρ
prompt: |
  Write `rho(n)` for an odd composite bigint $n$ that is not a prime power, returning a factor $1 < d < n$. Use $f(x) = x^2 + c \bmod n$ and Floyd’s tortoise and hare, starting from $2$; if the gcd ever equals $n$, retry with the next $c$. The tests include $n$ around $10^{20}$ whose smallest factor has 9 digits, which takes a fraction of a second with ρ and far too long with trial division.
starter: |
  import { gcdBig } from 'primes';

  export function rho(n: bigint): bigint {
    // Your code here.
    return 1n;
  }
tests: |
  import { test, expect } from 'test';
  import { rho } from 'solution';

  function check(n: bigint) {
    const d = rho(n);
    if (!(d > 1n && d < n && n % d === 0n)) throw new Error(`rho(${n}) returned ${d}, not a proper factor`);
  }
  test('small composites', () => {
    for (const n of [15n, 21n, 77n, 91n, 143n, 8051n, 10403n]) check(n);
  });
  test('Carmichael numbers', () => {
    for (const n of [561n, 1105n, 1729n, 41041n]) check(n);
  });
  test('two 9-digit primes', () => {
    check(1000000007n * 1000000009n);
    check(999999937n * 998244353n);
  });
solution: |
  import { gcdBig } from 'primes';

  export function rho(n: bigint): bigint {
    for (let c = 1n; ; c++) {
      let x = 2n;
      let y = 2n;
      for (;;) {
        x = (x * x + c) % n;
        y = (y * y + c) % n;
        y = (y * y + c) % n;
        const g = gcdBig(x > y ? x - y : y - x, n);
        if (g === n) break;
        if (g > 1n) return g;
      }
    }
  }
hints:
  - 'Inside a loop over `c = 1n, 2n, …`: move the tortoise one step and the hare two, then take `gcdBig(|x − y|, n)`.'
  - A gcd of $1$ means “keep going”; a gcd equal to $n$ means both cycles closed at once, so try the next $c$.
```

## Pollard’s $p - 1$ method

Pollard had found another method a year earlier, in 1974, which exploits a completely different weakness.:cite[pollard1974] Suppose $p$ is a prime factor of $n$ and $p - 1$ has only small prime factors. Take a number $M$ that is a multiple of every prime power up to some bound $B$, for instance $M = \operatorname{lcm}(1, 2, \ldots, B)$. If every prime power dividing $p - 1$ is at most $B$, then $p - 1 \mid M$, and by Fermat, $2^M \equiv 1 \pmod p$. So $p$ divides $\gcd(2^M - 1, n)$, which we *can* compute.

:::definition
A positive integer is **$B$-smooth** if all its prime factors are at most $B$. It is **$B$-powersmooth** if all the prime powers dividing it are at most $B$.
:::

:::theorem{name="Pollard" year=1974 status=proved}
Let $M = \operatorname{lcm}(1, \ldots, B)$. If $p$ is a prime factor of $n$, $p \nmid a$ and $p - 1$ is $B$-powersmooth, then $p$ divides $\gcd(a^M - 1, n)$.
:::

:::proof
$B$-powersmooth means every prime power $q^e \parallel p - 1$ satisfies $q^e \le B$, so $q^e \mid \operatorname{lcm}(1, \ldots, B) = M$. Hence $p - 1 \mid M$, and Fermat gives $a^M = (a^{p-1})^{M/(p-1)} \equiv 1 \pmod p$.
:::

Computing $a^M \bmod n$ takes about $1.44B$ modular multiplications (since $\log M \approx B$). The gcd is a proper factor unless *every* prime factor of $n$ has smooth $p - 1$ (then try a smaller $B$) or none does (then the method fails). For a random prime $p$ of 30 digits, the chance that $p - 1$ is $10^6$-smooth is small, but not negligible, and the method costs almost nothing to try. This is why RSA key generators once insisted on **strong primes** with a large prime factor in $p - 1$. That precaution is now considered unnecessary, because of the next method.

## The elliptic curve method

The weakness of $p - 1$ is that the group of units modulo $p$ has a fixed size, $p - 1$, which is either smooth or not. In 1985 Hendrik Lenstra replaced it with the group of points on a randomly chosen **elliptic curve** modulo $p$ (Chapter 32 introduces these curves). Its size is a random-looking number between $p + 1 - 2\sqrt p$ and $p + 1 + 2\sqrt p$ (Hasse’s theorem, Chapter 32), and if one curve’s group size is not smooth, you simply try another curve.:cite[lenstra1987] Its expected running time, under a plausible assumption about smooth numbers in short intervals, is
$$\exp\left((\sqrt 2 + o(1))\sqrt{\log p \log\log p}\right)$$
group operations: **subexponential** in the size of $p$, between polynomial and exponential. ECM is the method of choice for finding factors of up to 60 or 70 digits; the largest factor found by it has 83 digits.:cite[zimmermann-ecm]

## The race

Each method has numbers it is good at. Try the presets: two factors close together (Fermat’s day), a 19-digit product of two 10-digit primes far apart (ρ’s day), a factor whose $p - 1$ is smooth ($p - 1$’s day), and a 100-digit RSA challenge number, which defeats all four.

::factor-race

RSA-100 was factored in 1991 by Arjen Lenstra and Mark Manasse, using the method of the next chapter, the quadratic sieve, which does not care about the shape of the factors at all.

:::key
- Fermat: search for $x$ with $x^2 - n$ a square; fast exactly when the two factors are close.
- Pollard’s ρ: iterate $x \mapsto x^2 + c$; modulo the unknown prime $p$ the walk repeats after about $\sqrt p$ steps (birthday paradox, heuristically), and Floyd’s tortoise and hare detect it with one gcd per step.
- Pollard’s $p - 1$: if $p - 1$ is smooth, $\gcd(a^M - 1, n)$ reveals $p$. The elliptic curve method replaces the fixed group of size $p - 1$ by many random groups.
- All of these depend on the size or shape of the factor. RSA moduli are built to defeat them, which leads to the sieve methods.
:::

:::exercises
1. Factor $n = 2{,}019{,}097$ by hand with Fermat’s method. (Start at $x = \lceil\sqrt n\,\rceil$.)
2. Show that if $n = ab$ with $a < b$ odd and $b < 3a$, Fermat’s method takes fewer steps than trial division up to $a$.
3. Explain why Pollard’s ρ needs $n$ not to be a prime power for the gcd to be a proper factor *usually*, and what happens for $n = p^2$. Does the method still work?
4. Modify Floyd’s algorithm to compute $\mu$ and $\lambda$ exactly, once the meeting point is found.
:::
