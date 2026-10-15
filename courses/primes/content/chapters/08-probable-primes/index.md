---
number: 8
title: Probable primes
summary: Turning Fermat’s little theorem into a test, the Carmichael numbers that defeat it, and the Miller–Rabin test that does not have that weakness, with a proof that at least half of all bases expose a composite (and a sketch of why it is really three quarters).
duration: About 1¾ hours
prerequisites: [fermat-euler]
theorems: [Korselt’s criterion, At most half the bases are strong liars, At most a quarter of the bases are strong liars (Monier–Rabin)]
techniques: [contrapositive testing, subgroups, the Chinese remainder theorem, randomised algorithms]
---

Trial division needs about $\sqrt{n}$ steps, which is hopeless for a 300-digit number. Fermat’s little theorem suggests something completely different: if $n$ is prime, then $a^{n-1} \equiv 1 \pmod n$ for every $a$ not divisible by $n$. Exponentiation by squaring computes $a^{n-1} \bmod n$ with about $2\log_2 n$ multiplications, a few thousand for a 300-digit number. So if the congruence *fails*, we learn that $n$ is composite, in a fraction of a second, without finding a single factor.

The catch is the other direction: if the congruence *holds*, is $n$ prime? This chapter is about that question. The answer is “not necessarily”, then “not even if it holds for every base”, and finally, with Miller and Rabin’s refinement, “almost certainly, if it holds for a few random bases”, with a theorem that says how certain.

## The Fermat test

:::algorithm[Fermat test, base $a$]
**Input:** an integer $n > 2$ and a base $1 < a < n - 1$. Compute $a^{n-1} \bmod n$. If it is not $1$, output **composite** (and $a$ is a **Fermat witness**). Otherwise output **probably prime**.
:::

“Composite” is always correct; it is Fermat’s little theorem read backwards. “Probably prime” can be wrong. A composite $n$ with $a^{n-1} \equiv 1 \pmod n$ is a **Fermat pseudoprime to base $a$**, and $a$ is a **Fermat liar** for it.

The smallest pseudoprime to base $2$ is $341 = 11 \cdot 31$: $2^{10} = 1024 = 3 \cdot 341 + 1$, so $2^{10} \equiv 1$, and hence $2^{340} = (2^{10})^{34} \equiv 1 \pmod{341}$. Pierre Frédéric Sarrus pointed this out in 1820, disproving a claim, which some have attributed to ancient China, that $2^{n-1} \equiv 1$ characterises primes.:cite[crandall-pomerance] But base $3$ exposes it: $3^{340} \equiv 56 \pmod{341}$. Pseudoprimes are rare; there are $21{,}853$ to base $2$ below $25 \times 10^9$, against about a billion primes.:cite[psw1980] So a natural plan is to try several bases.

```quiz
q: A composite number $n$ passes the Fermat test to bases $2$, $3$ and $5$. What can you conclude?
options:
  - text: Nothing certain; it could even pass for every base coprime to it.
    correct: true
    why: That is exactly what Carmichael numbers do, as the next section shows. Fermat liars are not independent coin flips.
  - text: The probability that it is composite is at most $1/8$.
    why: That would be true if each base independently caught a composite with probability at least $1/2$. For Carmichael numbers no base coprime to $n$ catches it at all.
  - text: It must be a product of two primes.
    why: Pseudoprimes can have any number of prime factors; $561 = 3 \cdot 11 \cdot 17$ fools bases $2$ and $5$ (base $3$ shares a factor with it).
```

## Carmichael numbers

In 1910 Robert Carmichael found that $561 = 3 \cdot 11 \cdot 17$ satisfies $a^{560} \equiv 1 \pmod{561}$ for *every* $a$ coprime to $561$.:cite[carmichael1910] (Václav Šimerka had listed the first seven such numbers in 1885, unnoticed.) Composite numbers with this property, pseudoprimes to every base coprime to them, are called **Carmichael numbers**. For them the Fermat test finds a witness only if it stumbles on a base sharing a factor with $n$, which for numbers with large prime factors almost never happens.

Look at $561$ in the map below: every base coprime to $561$ is a Fermat liar. Then try $341$, where most bases are witnesses.

::liar-map

Alwin Korselt had characterised these numbers in 1899, before any example was known.:cite[korselt1899]

:::theorem{name="Korselt’s criterion" year=1899 status=proved}
A composite number $n$ is a Carmichael number if and only if $n$ is squarefree and $p - 1 \mid n - 1$ for every prime $p \mid n$.
:::

::::zoom{levels="Idea, Proof"}
:::level[Idea]
By the Chinese remainder theorem, $a^{n-1} \equiv 1 \pmod n$ for all units $a$ exactly when it holds modulo each prime power in $n$. Modulo a prime $p$, the units are cyclic of order $p - 1$, so all of them satisfy $a^{n-1} \equiv 1$ exactly when $p - 1 \mid n - 1$. A square factor $p^2$ spoils things, because $1 + p$ has order $p$ modulo $p^2$, and $p$ cannot divide $n - 1$.
:::
:::level[Proof]
($\Leftarrow$) Let $n = p_1 \cdots p_k$ be squarefree with $p_i - 1 \mid n - 1$, and let $\gcd(a, n) = 1$. For each $i$, $p_i \nmid a$, so Fermat gives $a^{p_i - 1} \equiv 1 \pmod{p_i}$, and since $p_i - 1 \mid n - 1$, $a^{n-1} \equiv 1 \pmod{p_i}$. The $p_i$ are distinct primes, so their product $n$ divides $a^{n-1} - 1$.

($\Rightarrow$) Let $n$ be a Carmichael number.

*Squarefree.* Suppose $p^2 \mid n$; write $n = p^e m$ with $p \nmid m$ and $e \ge 2$. By the Chinese remainder theorem choose $a \equiv 1 + p \pmod{p^e}$ and $a \equiv 1 \pmod m$; then $\gcd(a, n) = 1$. By the binomial theorem, $(1 + p)^{n-1} \equiv 1 + (n - 1)p \pmod {p^2}$. Since $p \mid n$, $p \nmid n - 1$, so $(n-1)p \not\equiv 0 \pmod{p^2}$ and $a^{n-1} \not\equiv 1 \pmod{p^2}$, hence not modulo $n$. Contradiction.

*$p - 1 \mid n - 1$.* Let $p \mid n$ and let $g$ be a primitive root modulo $p$ (Chapter 6). Choose $a \equiv g \pmod p$ and $a \equiv 1 \pmod{n/p}$ (possible because $n$ is squarefree, so $p \nmid n/p$). Then $a$ is a unit modulo $n$, so $a^{n-1} \equiv 1 \pmod n$, and in particular $g^{n-1} \equiv 1 \pmod p$. As $g$ has order $p - 1$, $p - 1 \mid n - 1$.
:::
::::

Check $561$: $560 = 2^4 \cdot 5 \cdot 7$ is divisible by $2$, $10$ and $16$. The next Carmichael numbers are $1105 = 5 \cdot 13 \cdot 17$, $1729 = 7 \cdot 13 \cdot 19$ (Hardy’s taxi-cab number), $2465$, $2821$, $6601$ and $8911$. Every Carmichael number is odd and has at least three prime factors (exercise 1). For a long time it was unknown whether there are infinitely many. In 1994 Alford, Granville and Pomerance proved that there are, and that for large $x$ there are more than $x^{2/7}$ of them below $x$.:cite[agp1994] So no fixed list of exceptions can repair the Fermat test.

## A better test: square roots of 1

Miller’s idea uses one more fact that holds modulo primes and fails modulo composites.

:::lemma{status=proved}
If $p$ is an odd prime and $x^2 \equiv 1 \pmod p$, then $x \equiv 1$ or $x \equiv -1 \pmod p$.
:::

:::proof
$p \mid x^2 - 1 = (x - 1)(x + 1)$, so by Euclid’s lemma $p \mid x - 1$ or $p \mid x + 1$.
:::

Modulo a composite there can be more square roots of $1$: modulo $561$, $67^2 = 4489 = 8 \cdot 561 + 1$, so $67^2 \equiv 1$ although $67 \not\equiv \pm 1$. Such a **non-trivial square root of 1** proves that $n$ is composite, and more: $n$ divides $(x-1)(x+1)$ but neither factor, so $\gcd(x - 1, n)$ is a proper factor of $n$. Here $\gcd(66, 561) = 33$.

How do we find square roots of $1$? Write $n - 1 = 2^s d$ with $d$ odd. Fermat’s test computes $a^{n-1}$, which is $a^d$ squared $s$ times:
$$a^d,\ a^{2d},\ a^{4d},\ \ldots,\ a^{2^s d} = a^{n-1}.$$
If $n$ is prime, the last term is $1$. Look at the first $1$ in the sequence. Unless the sequence starts with $1$, the term just before it squares to $1$, so (by the lemma) it must be $-1$. So for a prime $n$, either $a^d \equiv 1$, or $a^{2^r d} \equiv -1$ for some $0 \le r < s$.

:::algorithm[Miller–Rabin test, base $a$]
**Input:** odd $n > 3$ and a base $2 \le a \le n - 2$. Write $n - 1 = 2^s d$ with $d$ odd and compute $x = a^d \bmod n$. If $x = 1$ or $x = n - 1$, output **probably prime**. Otherwise square $x$ up to $s - 1$ times; if it becomes $n - 1$, output **probably prime**. If it never does, output **composite** ($a$ is a **strong witness**).
:::

A composite $n$ that passes for base $a$ is a **strong pseudoprime** to base $a$, and $a$ is a **strong liar**. Trace the test below; with $n = 561$ and $a = 2$, the sequence is $263, 166, 67, 1, 1$: the $1$ arrives from $67$, a non-trivial square root.

::miller-rabin-trace

Gary Miller proposed the test in 1976 as a deterministic algorithm whose correctness depended on the generalised Riemann Hypothesis (more on that below); Michael Rabin turned it into the randomised test in 1980.:cite[miller1976,rabin1980]

## How often does a composite fool the test?

The decisive difference from the Fermat test is that there are no “strong Carmichael numbers”: every odd composite has many strong witnesses. Here is a complete proof that at least half of the bases are witnesses. The argument has a pleasing shape: the liars always fit inside a subgroup that is not the whole group, and Lagrange’s theorem does the rest.

:::theorem{status=proved}
Let $n$ be an odd composite number. Then the strong liars for $n$ number at most $\varphi(n)/2$. So a random base $a \in [2, n-2]$ exposes $n$ with probability at least $\tfrac12$.
:::

::::zoom{levels="Idea, Sketch, Proof"}
:::level[Idea]
Show that all strong liars lie in a subgroup $B$ of the units modulo $n$ that is not all of the units. By Lagrange’s theorem, a proper subgroup has at most half the elements.
:::
:::level[Sketch]
If $n$ is not a Carmichael number, the Fermat liars $\{a : a^{n-1} \equiv 1\}$ are already a proper subgroup, and strong liars are Fermat liars. If $n$ is a Carmichael number, it is squarefree with at least two prime factors, so $n = n_1 n_2$ with coprime $n_1, n_2 > 1$. Take the largest $j$ for which some unit $v$ has $v^{2^j d} \equiv -1$, and let $B = \{x : x^{2^j d} \equiv \pm 1\}$. Every strong liar lies in $B$; and the Chinese remainder theorem builds a unit $w$ with $w^{2^j d} \equiv -1 \pmod{n_1}$ but $\equiv 1 \pmod{n_2}$, which is not in $B$.
:::
:::level[Proof]
Write $n - 1 = 2^s d$ with $d$ odd, and let $U$ be the group of units modulo $n$, of order $\varphi(n)$. Every strong liar is a unit (if $\gcd(a, n) > 1$ then $a^{n-1} \not\equiv 1$, and also $a^{2^r d} \not\equiv -1$). We find a subgroup $B \ne U$ containing all strong liars; then $|B| \le |U|/2$ by Lagrange’s theorem (Appendix E), since $|B|$ is a proper divisor of $|U|$.

*Case 1: $n$ is not a Carmichael number.* Let $B = \{a \in U : a^{n-1} \equiv 1\}$. It is a subgroup (closed under products and inverses, contains $1$). Every strong liar is in $B$, since passing the Miller–Rabin test implies $a^{n-1} \equiv 1$. And $B \ne U$ because $n$ is not a Carmichael number.

*Case 2: $n$ is a Carmichael number.* By Korselt, $n$ is squarefree and (being composite) has at least two prime factors, so $n = n_1 n_2$ with $\gcd(n_1, n_2) = 1$ and $n_1, n_2 > 1$. Since $d$ is odd, $(-1)^{2^0 d} = -1$, so there are indices $j \in \{0, \ldots, s - 1\}$ and units $v$ with $v^{2^j d} \equiv -1 \pmod n$; take the *largest* such $j$, and a corresponding $v$. Define
$$B = \{a \in U : a^{2^j d} \equiv \pm 1 \pmod n\}.$$
$B$ is a subgroup: it contains $1$, and if $a^{2^j d}, b^{2^j d} \in \{\pm 1\}$ then so is $(ab)^{2^j d}$ and $(a^{-1})^{2^j d}$.

*Every strong liar $a$ lies in $B$.* If $a^d \equiv 1$, then $a^{2^j d} = 1$. Otherwise $a^{2^r d} \equiv -1$ for some $r < s$; by the maximality of $j$, $r \le j$; if $r = j$ then $a^{2^j d} \equiv -1$, and if $r < j$ then squaring $j - r$ times gives $a^{2^j d} \equiv 1$.

*$B \ne U$.* By the Chinese remainder theorem there is $w$ with $w \equiv v \pmod{n_1}$ and $w \equiv 1 \pmod{n_2}$. It is a unit modulo $n$ (it is coprime to $n_1$ because $v$ is, and to $n_2$). Then $w^{2^j d} \equiv v^{2^j d} \equiv -1 \pmod{n_1}$ and $w^{2^j d} \equiv 1 \pmod{n_2}$. If $w^{2^j d} \equiv 1 \pmod n$ then reducing modulo $n_1$ gives $-1 \equiv 1 \pmod{n_1}$, impossible as $n_1 > 2$ is odd; if $w^{2^j d} \equiv -1 \pmod n$ then reducing modulo $n_2$ gives the same contradiction. So $w \notin B$.
:::
::::

This proof follows Cormen, Leiserson, Rivest and Stein’s textbook.:cite[clrs] The truth is better still, and it is the number usually quoted.

:::theorem{name="Monier; Rabin" year=1980 status=sketched}
For odd composite $n > 9$, the number of strong liars is at most $\varphi(n)/4$.
:::

*Sketch.* Monier and Rabin counted the strong liars exactly. Write $n = \prod p_i^{e_i}$ and $p_i - 1 = 2^{s_i} d_i$ with $d_i$ odd. Using the Chinese remainder theorem and the cyclic structure of the units modulo each $p_i^{e_i}$, the number of strong liars is
$$\left(1 + \frac{2^{k \nu} - 1}{2^k - 1}\right) \prod_{i=1}^{k} \gcd(d, d_i),$$
where $k$ is the number of distinct prime factors and $\nu = \min_i s_i$. Comparing with $\varphi(n) = \prod p_i^{e_i - 1}(p_i - 1)$ case by case (prime powers; $k = 2$; $k \ge 3$) gives the bound $\tfrac14$, which is attained only by numbers of a few special shapes.:cite[monier1980,crandall-pomerance] We leave out the case analysis. In the widget above, $n = 8911 = 7 \cdot 19 \cdot 67$ is one of the rare cases of equality: it has exactly $1782 = \varphi(8911)/4$ strong liars. Most composites have far fewer; $561$ has only $10$ out of $320$ units.

So $k$ independent random bases fail to expose a composite with probability at most $4^{-k}$. Twenty rounds make the error smaller than $10^{-12}$, less than the chance that cosmic rays flip a bit in your computer during the calculation. For *random* inputs, as when you search for a large prime, the error is far smaller still: Damgård, Landrock and Pomerance proved explicit bounds in 1993 which, for numbers with hundreds of digits, are many orders of magnitude below $4^{-k}$, because composites with many strong liars are very rare.:cite[dlp1993]

```code
id: probable-primes/miller-rabin
title: Miller–Rabin
prompt: |
  Write `isProbablePrime(n)` for bigints. Return `false` for $n < 2$ and for even $n > 2$, handle $n \le 3$ directly, and then run the Miller–Rabin test with the thirteen bases $2, 3, 5, \ldots, 41$ (the first thirteen primes; skip a base that is $\ge n - 1$). With these bases the answer is provably correct for every $n < 3.3 \times 10^{24}$. You may import `modPowBig` from `primes`.
starter: |
  import { modPowBig } from 'primes';

  const BASES = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n, 41n];

  export function isProbablePrime(n: bigint): boolean {
    // Your code here.
    return modPowBig(2n, n - 1n, n) === 1n;
  }
tests: |
  import { test, expect } from 'test';
  import { isProbablePrime } from 'solution';
  import { isPrimeTrial } from 'primes';

  test('small numbers agree with trial division', () => {
    for (let n = 0; n < 3000; n++) if (isProbablePrime(BigInt(n)) !== isPrimeTrial(n)) throw new Error(`wrong answer for ${n}`);
  });
  test('Carmichael numbers are composite', () => {
    for (const n of [561n, 1105n, 1729n, 2465n, 2821n, 6601n, 8911n, 41041n, 825265n]) expect(isProbablePrime(n)).toBe(false);
  });
  test('strong pseudoprimes to base 2 are caught by the other bases', () => {
    for (const n of [2047n, 3277n, 4033n, 4681n, 8321n, 3215031751n]) expect(isProbablePrime(n)).toBe(false);
  });
  test('large primes and composites', () => {
    expect(isProbablePrime(2n ** 61n - 1n)).toBe(true);
    expect(isProbablePrime(2n ** 89n - 1n)).toBe(true);
    expect(isProbablePrime(2n ** 67n - 1n)).toBe(false);
    expect(isProbablePrime(10n ** 20n + 39n)).toBe(true);
    expect(isProbablePrime((10n ** 9n + 7n) * (10n ** 9n + 9n))).toBe(false);
  });
solution: |
  import { modPowBig } from 'primes';

  const BASES = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n, 41n];

  export function isProbablePrime(n: bigint): boolean {
    if (n < 2n) return false;
    if (n < 4n) return true;
    if (n % 2n === 0n) return false;
    let d = n - 1n;
    let s = 0;
    while (d % 2n === 0n) {
      d /= 2n;
      s++;
    }
    outer: for (const a of BASES) {
      if (a >= n - 1n) continue;
      let x = modPowBig(a, d, n);
      if (x === 1n || x === n - 1n) continue;
      for (let r = 1; r < s; r++) {
        x = (x * x) % n;
        if (x === n - 1n) continue outer;
      }
      return false;
    }
    return true;
  }
hints:
  - First compute $s$ and the odd $d$ with $n - 1 = 2^s d$, by halving $n - 1$ while it is even.
  - 'For each base: `x = modPowBig(a, d, n)`; pass if `x` is `1n` or `n - 1n`; otherwise square up to `s - 1` times looking for `n - 1n`. If it never appears, return `false`.'
```

:::note
**A stopping point.** You now have a practical primality test. The rest of the chapter explains how it is used in practice and what is known about making it deterministic.
:::

## In practice

**Deterministic for bounded inputs.** For numbers below a fixed bound, a fixed set of bases is enough, because the smallest strong pseudoprimes to several bases at once have been found by exhaustive search. Testing bases $2, 3, 5, 7$ is correct for all $n < 3{,}215{,}031{,}751$, the first thirteen primes as bases are correct below about $3.3 \times 10^{24}$,:cite[sorenson-webster] and testing with the first twelve primes suffices for every 64-bit integer. The course library uses this.

**Under the Riemann Hypothesis.** If the generalised Riemann Hypothesis (Chapter 33) is true, every odd composite $n$ has a strong witness below $2(\log n)^2$, so testing those bases is a deterministic polynomial-time algorithm (Miller 1976, with the constant from Bach 1990).:cite[miller1976,bach1990] This was one of the first places where the Riemann Hypothesis mattered for computer science.

**Baillie–PSW.** Most software (Mathematica, PARI/GP, many cryptography libraries) combines one Miller–Rabin round to base $2$ with a different kind of test, a “strong Lucas probable prime” test (Chapter 10 introduces Lucas sequences). No composite is known that passes both, and every composite below $2^{64}$ has been checked.:cite[psw1980]

**Certainty.** A probable prime is not a proof. When a proof is needed, Chapter 10 shows how to certify primality, and in 2002 Agrawal, Kayal and Saxena showed that it can always be done in polynomial time.

:::key
- Fermat test: $a^{n-1} \not\equiv 1 \pmod n$ proves $n$ composite. Pseudoprimes exist, and Carmichael numbers fool every base coprime to them (Korselt: squarefree with $p - 1 \mid n - 1$). There are infinitely many.
- Miller–Rabin also checks the square roots of $1$ along the way: modulo a prime only $\pm 1$ square to $1$.
- Every odd composite has at least half (in fact three quarters) of all bases as strong witnesses, so $k$ random rounds err with probability at most $4^{-k}$.
- Fixed small sets of bases are provably correct below known bounds; under the generalised Riemann Hypothesis, bases below $2(\log n)^2$ always suffice.
:::

:::exercises
1. Show that a Carmichael number is odd and has at least three prime factors. (If $n = pq$ with $p < q$, then $q - 1 \mid n - 1 = p(q-1) + p - 1$.)
2. Show that if $6k + 1$, $12k + 1$ and $18k + 1$ are all prime, then their product is a Carmichael number (Chernick, 1939). Which $k$ gives $1729$?
3. Show that every strong liar is an Euler liar: if $n$ passes Miller–Rabin to base $a$, then $a^{(n-1)/2} \equiv \pm 1 \pmod n$. (Chapter 9 makes “Euler liar” precise.)
4. Using the Miller–Rabin trace, explain why finding a non-trivial square root of $1$ modulo $n$ is as hard as factoring $n$, for $n = pq$. (This will matter in Chapter 13.)
:::
