---
number: 10
title: Certificates of primality
summary: How to prove a number prime rather than merely believe it. Lucas’s converse of Fermat, Pratt certificates (PRIMES is in NP), Pocklington and Proth, the Lucas–Lehmer test behind every record prime, and the idea of the AKS algorithm.
duration: About 1¾ hours
prerequisites: [probable-primes, quadratic-residues]
theorems: [Lucas’s theorem, Pratt certificates have polynomial size, Pocklington’s theorem, The Lucas–Lehmer test, AKS (PRIMES is in P)]
techniques: [orders of elements, recursion, 'arithmetic in ℤ[√3]']
---

A Miller–Rabin test that passes twenty rounds leaves a chance of error smaller than one in a trillion. For most purposes that is certainty. But it is not a *proof*, and sometimes a proof is what you want: for a record, for a published table, or because a probabilistic argument is not acceptable in your setting. This chapter is about **certificates**: short pieces of evidence that make a number's primality quick to *check*, even if finding the evidence was hard.

## Lucas’s theorem: a converse to Fermat

Fermat's little theorem cannot be reversed as it stands (Carmichael numbers). But it can be reversed if we ask for more than $a^{n-1} \equiv 1$: we ask that the order of $a$ be exactly $n - 1$.

:::theorem{name="Lucas’s theorem" who="Édouard Lucas; in this form, D. H. Lehmer" year=1876 status=proved}
Let $n > 2$. If there is an integer $a$ such that $a^{n-1} \equiv 1 \pmod n$ and $a^{(n-1)/q} \not\equiv 1 \pmod n$ for every prime $q$ dividing $n - 1$, then $n$ is prime.
:::

:::proof
The first condition makes $a$ a unit modulo $n$, with order $d$ dividing $n - 1$. If $d < n - 1$, then $(n - 1)/d > 1$ has a prime factor $q$, so $d \mid (n-1)/q$ and $a^{(n-1)/q} \equiv 1$, contradicting the second condition. So $d = n - 1$. But the order of a unit divides $\varphi(n)$ (Chapter 6), so $n - 1 \le \varphi(n)$. Since $\varphi(n) < n - 1$ for every composite $n$ (a composite has a divisor other than $1$ in $[2, n - 1]$, which is not a unit), $n$ is prime.
:::

So $a$ is a primitive root modulo $n$, which can only exist with order $n - 1$ when $n$ is prime. The catch is the factorisation of $n - 1$: you need to know all its prime factors, and you need to be sure they *are* prime.

## Pratt certificates

That last requirement suggests recursion. Vaughan Pratt observed in 1975 that a proof of primality can be written as a tree: $n$, a witness $a$, the prime factors of $n - 1$, and a certificate for each of those factors, down to $2$.:cite[pratt1975]

::pratt-tree

:::theorem{name="Pratt" year=1975 status=proved}
Every prime $n$ has a certificate whose total size is $O((\log n)^2)$ bits and which can be checked with $O((\log n)^2)$ modular exponentiations. In the language of complexity theory, PRIMES is in NP.
:::

::::zoom{levels="Idea, Proof"}
:::level[Idea]
A certificate for $n$ contains at most $\log_2 n$ certificates for the primes of $n - 1$, and the primes of $n - 1$ multiply to at most $n$. Count the primes in the tree by induction: a tree for $n$ contains at most $2\log_2 n$ nodes, each listing $O(\log n)$ bits.
:::
:::level[Proof]
Let $N(n)$ be the number of nodes (primes) in the tree for $n$, built with the distinct primes $q_1, \ldots, q_k$ of $n - 1$. We claim $N(n) \le 2\log_2 n - 1$ for odd primes $n$, and $N(2) = 1$. Induct on $n$. The prime $2$ always divides $n - 1$ and contributes one node; let $j$ be the number of odd $q_i$, each with $N(q_i) \le 2 \log_2 q_i - 1$. Since the odd $q_i$ multiply to at most $(n - 1)/2$,
$$N(n) \le 1 + 1 + \sum_{q_i \text{ odd}} (2\log_2 q_i - 1) \le 2 + 2\log_2 \frac{n-1}{2} - j < 2 \log_2 n - j.$$
If $j \ge 1$ this gives the claim. If $j = 0$, then $n - 1$ is a power of $2$ and $N(n) = 2 \le 2\log_2 n - 1$ because $n \ge 3$.
Each node stores a prime below $n$, a witness and a list of primes multiplying to less than $n$: $O(\log n)$ bits. Checking a node takes one exponentiation per prime factor plus one, and the number of prime factors at a node is at most $\log_2 n$; summed over the tree that is $O((\log n)^2)$ exponentiations, each costing a polynomial in $\log n$.
:::
::::

The certificate is short and easy to check, but finding it requires factoring $n - 1$, and the numbers below it, which is usually infeasible for large $n$. So this proved that primality has short proofs, without giving a fast way to find them. Composites have short proofs too (a factor, or just a Miller–Rabin witness), so PRIMES is in NP ∩ co-NP. Whether it was in P remained open until 2002.

## Using part of a factorisation

You do not need all of $n - 1$. A factored part bigger than $\sqrt{n}$ is enough.

:::theorem{name="Pocklington’s theorem" year=1914 status=proved}
Let $n - 1 = F R$ where the prime factorisation of $F$ is known and $F > \sqrt n$. Suppose that for each prime $q \mid F$ there is an $a_q$ with
$$a_q^{n-1} \equiv 1 \pmod n \qquad\text{and}\qquad \gcd\left(a_q^{(n-1)/q} - 1, n\right) = 1.$$
Then $n$ is prime.
:::

:::proof
Let $p$ be any prime factor of $n$; we show $p \equiv 1 \pmod F$. Let $q^e$ be the exact power of a prime $q$ in $F$, and let $d$ be the order of $a = a_q$ modulo $p$. From $a^{n-1} \equiv 1 \pmod p$, $d \mid n - 1$. From the gcd condition, $a^{(n-1)/q} \not\equiv 1 \pmod p$, so $d \nmid (n-1)/q$. A divisor of $n - 1$ that does not divide $(n-1)/q$ must contain the full power of $q$ in $n - 1$, so $q^e \mid d$. And $d \mid p - 1$ (Fermat). So $q^e \mid p - 1$ for every prime power in $F$, hence $F \mid p - 1$ and $p > F > \sqrt{n}$.

Every prime factor of $n$ exceeds $\sqrt n$, so $n$ cannot be composite.
:::

For numbers of special forms this is very practical. For $N = k \cdot 2^m + 1$, $F = 2^m$ needs no factoring at all:

:::corollary{name="Proth’s theorem" year=1878 status=proved}
Let $N = k \cdot 2^m + 1$ with $k$ odd and $k < 2^m$. If $a^{(N-1)/2} \equiv -1 \pmod N$ for some $a$, then $N$ is prime.
:::

:::proof
Apply Pocklington with $F = 2^m > \sqrt N$ (since $k < 2^m$, $N < 2^{2m}$) and $q = 2$. From $a^{(N-1)/2} \equiv -1$ we get $a^{N-1} \equiv 1$, and $\gcd(a^{(N-1)/2} - 1, N) = \gcd(-2, N) = 1$ since $N$ is odd.
:::

Conversely, if $N$ is prime, any quadratic non-residue $a$ works, by Euler's criterion; a few random tries find one. Large primes found by distributed projects such as PrimeGrid are often Proth primes for this reason.

## Mersenne primes and the Lucas–Lehmer test

The largest known primes have, for decades, almost all been **Mersenne primes** $M_p = 2^p - 1$. Two simple facts first.

:::lemma{status=proved}
1. If $2^n - 1$ is prime, then $n$ is prime.
2. If $p$ is an odd prime and $q$ is a prime dividing $M_p$, then $q \equiv 1 \pmod{2p}$.
:::

:::proof
1. If $n = ab$ with $a, b > 1$, then $2^a - 1$ divides $2^{ab} - 1 = (2^a - 1)(2^{a(b-1)} + \cdots + 2^a + 1)$, and $1 < 2^a - 1 < 2^n - 1$.
2. $2^p \equiv 1 \pmod q$, so the order of $2$ modulo $q$ divides $p$; it is not $1$, so it is $p$. The order divides $q - 1$, so $p \mid q - 1$; and $q - 1$ is even, so $2p \mid q - 1$.
:::

Part 2 makes trial division of Mersenne numbers efficient, since only $q = 2kp + 1$ need be tried. Euler used it in 1772 to prove $M_{31}$ prime by hand. It also lies behind a famous lecture. In October 1903, at a meeting of the American Mathematical Society, Frank Nelson Cole walked to the blackboard without a word, computed $2^{67} - 1$, then multiplied out $193{,}707{,}721 \times 761{,}838{,}257{,}287$, got the same number, and sat down to applause. Lucas had shown in 1876 that $M_{67}$ is composite without finding a factor; Cole later said the factors had taken him "three years of Sundays".:cite[cole1903]

For proving $M_p$ prime there is a test of astonishing simplicity.

:::theorem{name="The Lucas–Lehmer test" who="Lucas; Lehmer" year=1930 status=proved}
Let $p$ be an odd prime and define $s_0 = 4$, $s_{k+1} = s_k^2 - 2$. Then $M_p = 2^p - 1$ is prime if and only if $M_p \mid s_{p-2}$.
:::

Lucas found the test in the 1870s and used a version of it in 1876 to prove $M_{127}$ prime, which remained the largest known prime for 75 years; Derrick Henry Lehmer gave the clean statement and proof in 1930.:cite[lehmer1930] Run it:

::lucas-lehmer-run

Each step is one squaring of a $p$-bit number, and reducing modulo $2^p - 1$ needs no division: $x \bmod (2^p - 1) = (x \bmod 2^p) + \lfloor x / 2^p \rfloor$, a shift and an addition (then one subtraction if needed). So the test costs $p - 2$ squarings: about $p^2 \log p$ bit operations with fast multiplication.

Here is a proof of the direction that matters for records (if $M_p$ divides $s_{p-2}$, it is prime). It works in a number system like the ones in Chapter 3: numbers $a + b\sqrt 3$, with $a, b$ taken modulo a prime $q$. The idea is the same as in Lucas's theorem: find an element whose order is too large to fit in a small group.

::::zoom{levels="Idea, Sketch, Proof"}
:::level[Idea]
Let $\omega = 2 + \sqrt 3$ and $\bar\omega = 2 - \sqrt 3$, so $\omega\bar\omega = 1$. Then $s_k = \omega^{2^k} + \bar\omega^{2^k}$. If $q$ is a prime factor of $M_p$ and $q \mid s_{p-2}$, this forces $\omega$ to have order exactly $2^p$ in the multiplicative group of numbers $a + b\sqrt 3$ modulo $q$. That group has fewer than $q^2$ elements, so $2^p < q^2$, that is, $q > \sqrt{M_p}$. Every prime factor of $M_p$ is larger than its square root, so $M_p$ is prime.
:::
:::level[Sketch]
(1) $s_k = \omega^{2^k} + \omega^{-2^k}$ by induction, using $(\omega^{j} + \omega^{-j})^2 - 2 = \omega^{2j} + \omega^{-2j}$. (2) If $q \mid s_{p-2}$ then $\omega^{2^{p-2}} = -\omega^{-2^{p-2}}$ in $X_q = \{a + b\sqrt3 : a, b \in \mathbb{Z}/q\mathbb{Z}\}$, so $\omega^{2^{p-1}} = -1$ and $\omega^{2^p} = 1$: the order of $\omega$ is $2^p$. (3) The units of $X_q$ number at most $q^2 - 1$. (4) So $2^p \le q^2 - 1$; if $q$ is the smallest prime factor of a composite $M_p$, then $q^2 \le M_p = 2^p - 1$, a contradiction.
:::
:::level[Proof]
Let $q$ be a prime dividing $M_p$, and let $X_q$ be the set of pairs $a + b\sqrt3$ with $a, b \in \mathbb{Z}/q\mathbb{Z}$, multiplied by the rule $(a + b\sqrt 3)(c + d\sqrt 3) = (ac + 3bd) + (ad + bc)\sqrt 3$. This multiplication is associative and commutative with identity $1$ (it is the same as multiplying the formal expressions and replacing $(\sqrt 3)^2$ by $3$), so the elements with inverses form a group $X_q^\times$. It has at most $q^2 - 1$ elements, since $0$ has no inverse.

Let $\omega = 2 + \sqrt 3$ and $\bar\omega = 2 - \sqrt 3$. Then $\omega\bar\omega = 4 - 3 = 1$, so $\omega$ is in $X_q^\times$ with inverse $\bar\omega$.

*Claim: $s_k \equiv \omega^{2^k} + \bar\omega^{2^k}$ in $X_q$.* For $k = 0$: $\omega + \bar\omega = 4$. If it holds for $k$, then
$$s_{k+1} = s_k^2 - 2 = \left(\omega^{2^k} + \bar\omega^{2^k}\right)^2 - 2 = \omega^{2^{k+1}} + 2(\omega\bar\omega)^{2^k} + \bar\omega^{2^{k+1}} - 2 = \omega^{2^{k+1}} + \bar\omega^{2^{k+1}}.$$

Now suppose $M_p \mid s_{p-2}$; then $q \mid s_{p-2}$, so $\omega^{2^{p-2}} + \bar\omega^{2^{p-2}} = 0$ in $X_q$. Multiply by $\omega^{2^{p-2}}$ and use $\omega\bar\omega = 1$: $\omega^{2^{p-1}} = -1$. Squaring, $\omega^{2^p} = 1$. So the order of $\omega$ divides $2^p$ but not $2^{p-1}$ (as $-1 \ne 1$ modulo the odd prime $q$): it is exactly $2^p$. The order of an element is at most the size of the group, so
$$2^p \le |X_q^\times| \le q^2 - 1.$$
If $M_p$ were composite, its smallest prime factor $q$ would satisfy $q^2 \le M_p = 2^p - 1$, contradicting the inequality. So $M_p$ is prime.
:::
::::

The converse (if $M_p$ is prime, then $M_p \mid s_{p-2}$) needs more: one shows, using quadratic reciprocity, that $3$ is a non-residue modulo $M_p$ and $2$ is a residue, and then computes $\omega^{(M_p + 1)/2} = -1$ in $X_{M_p}$, which is a field. We leave it as a sketch; see Crandall and Pomerance for the details.:cite[crandall-pomerance] Without the converse the test could still prove primality; with it, it also proves compositeness.

### The record primes

The Lucas–Lehmer test made Mersenne numbers the natural place to hunt for record primes. In 1952 Raphael Robinson ran it on the SWAC computer and found $M_{521}$ and $M_{607}$ in a single evening, the first primes found by a computer. Since 1996, almost every record has come from the Great Internet Mersenne Prime Search (GIMPS), a volunteer project started by George Woltman. In October 2024 GIMPS volunteer Luke Durant found $M_{136{,}279{,}841}$, a prime of $41{,}024{,}320$ digits, the $52$nd known Mersenne prime and the largest prime known at the time of writing.:cite[gimps]

```code
id: certificates/lucas-lehmer
title: The Lucas–Lehmer test
prompt: |
  Write `isMersennePrime(p)` that returns whether $2^p - 1$ is prime, for $2 \le p \le 3000$. Return `false` when $p$ is composite (by the lemma) and `true` for $p = 2$; otherwise run Lucas–Lehmer with bigints. You may use plain `%` for the reduction, or the shift trick: with `M = (1n << P) - 1n`, `x % M` equals `(x & M) + (x >> P)` followed by at most one subtraction of `M`.
starter: |
  export function isMersennePrime(p: number): boolean {
    // Your code here.
    return false;
  }
tests: |
  import { test, expect } from 'test';
  import { isMersennePrime } from 'solution';

  test('exponents up to 130', () => {
    const found: number[] = [];
    for (let p = 2; p <= 130; p++) if (isMersennePrime(p)) found.push(p);
    expect(found).toEqual([2, 3, 5, 7, 13, 17, 19, 31, 61, 89, 107, 127]);
  });
  test('Robinson’s 1952 discoveries', () => {
    expect(isMersennePrime(521)).toBe(true);
    expect(isMersennePrime(607)).toBe(true);
    expect(isMersennePrime(523)).toBe(false);
  });
  test('a larger exponent', () => {
    expect(isMersennePrime(2203)).toBe(true);
    expect(isMersennePrime(2207)).toBe(false);
  });
solution: |
  export function isMersennePrime(p: number): boolean {
    if (p === 2) return true;
    for (let d = 2; d * d <= p; d++) if (p % d === 0) return false;
    if (p < 2) return false;
    const P = BigInt(p);
    const M = (1n << P) - 1n;
    let s = 4n;
    for (let i = 0; i < p - 2; i++) {
      s = s * s - 2n;
      s = (s & M) + (s >> P);
      if (s >= M) s -= M;
    }
    return s === 0n;
  }
hints:
  - Check that $p$ is prime with trial division first; $2^p - 1$ is composite otherwise.
  - 'The loop runs `p - 2` times: `s = (s * s - 2n) % M`. The answer is `s === 0n`.'
```

:::note
**A stopping point.** The last section describes the 2002 breakthrough; it is a sketch, not a full proof.
:::

## AKS: primality in polynomial time

For general numbers, certificates need factorisations (Pratt, Pocklington) or heavy machinery: the elliptic curve primality proving method (ECPP) of Atkin and Morain, which replaces the group of units by the points on an elliptic curve, has proved primes with tens of thousands of digits, but its running time is only heuristically polynomial. Whether there is an algorithm that decides primality in time polynomial in the number of digits, with no unproved hypothesis and no randomness, was open until August 2002, when Manindra Agrawal and his students Neeraj Kayal and Nitin Saxena at IIT Kanpur posted a paper titled "PRIMES is in P".:cite[aks2004]

The starting point is a polynomial version of Fermat's little theorem.

:::lemma{status=proved}
Let $n \ge 2$ and $\gcd(a, n) = 1$. Then $n$ is prime if and only if $(X + a)^n \equiv X^n + a \pmod n$ as polynomials (that is, coefficient by coefficient).
:::

:::proof
The coefficient of $X^k$ in $(X + a)^n - (X^n + a)$ is $\binom nk a^{n-k}$ for $0 < k < n$, and $a^n - a$ for $k = 0$. If $n$ is prime, $n \mid \binom nk$ for $0 < k < n$ (the numerator $n!$ has the factor $n$, the denominator $k!(n-k)!$ does not) and $a^n \equiv a$ by Fermat. If $n$ is composite, let $q$ be a prime factor with $q^e \parallel n$; then $q^e \nmid \binom nq$ (exercise 4), and $\gcd(a, q) = 1$, so the coefficient of $X^q$ is not divisible by $n$.
:::

This identity characterises primes exactly, but checking it means computing $n + 1$ coefficients, which is exponential in the number of digits. AKS check it modulo $X^r - 1$ for a small $r$ (of size about $(\log n)^5$), and for a range of values of $a$ up to about $\sqrt r \log n$. The hard part of the proof, which we only state, is that if all these reduced identities hold and $n$ is not a perfect power, then $n$ must be a prime: otherwise a certain group of polynomials would have to be simultaneously large and small.

:::theorem{name="Agrawal, Kayal and Saxena" year=2002 status=sketched}
There is a deterministic algorithm that decides whether $n$ is prime in time polynomial in $\log n$. The version in the published paper runs in time $\tilde O((\log n)^{10.5})$; Lenstra and Pomerance improved this to $\tilde O((\log n)^6)$.
:::

The paper won the Gödel Prize in 2006. In practice AKS is far slower than ECPP, and much slower than Miller–Rabin, so it is not what anyone runs; its importance is theoretical. It showed that primality, the problem Gauss called one of the most important and useful in arithmetic, is easy in the strongest sense complexity theory has, while factoring, as far as anyone knows, is not.

:::key
- Lucas: an element of order exactly $n - 1$ modulo $n$ proves $n$ prime. Pratt: recursing on the factors of $n - 1$ gives certificates of size $O((\log n)^2)$, so PRIMES is in NP.
- Pocklington: a factored part $F > \sqrt n$ of $n - 1$ suffices. Proth: for $N = k \cdot 2^m + 1$ with $k < 2^m$, one exponentiation can prove primality.
- Mersenne numbers: $2^n - 1$ prime needs $n$ prime; factors of $M_p$ are $\equiv 1 \pmod{2p}$. Lucas–Lehmer: $M_p$ is prime iff $M_p \mid s_{p-2}$, where $s_0 = 4$, $s_{k+1} = s_k^2 - 2$.
- AKS (2002): primality is decidable deterministically in polynomial time, via $(X + a)^n \equiv X^n + a$ checked modulo $X^r - 1$.
:::

:::exercises
1. Write down a Pratt certificate for $p = 97$ by hand.
2. Use Proth's theorem to prove that $97 = 3 \cdot 2^5 + 1$ is prime: show that $5^{48} \equiv -1 \pmod{97}$. Why was $a = 5$ a good choice? (Use quadratic reciprocity.)
3. Show that if $q$ is a prime factor of $M_p$ with $p$ odd, then $q \equiv \pm 1 \pmod 8$. (Since $2^{p+1} \equiv 2 \pmod q$ and $p + 1$ is even, $2$ is a square modulo $q$.)
4. Let $q$ be prime and $q^e \parallel n$ (the exact power). Show that $q^e \nmid \binom nq$.
:::
