---
number: 3
title: Unique factorisation
summary: Euclid’s lemma, the fundamental theorem of arithmetic with a complete proof, what it lets you compute, and two number systems where factorisation is not unique.
duration: About 1½ hours
prerequisites: [euclid-algorithm]
theorems: [Euclid’s lemma, The fundamental theorem of arithmetic, √n is irrational unless n is a square]
techniques: [strong induction, proof by minimal counterexample, norms]
---

Every whole number above $1$ is a product of primes, and in only one way. You have used this since school: it is why you can find a least common denominator, and why $\sqrt 2$ is irrational. It is called the **fundamental theorem of arithmetic**, and it is the reason primes matter at all: they are the atoms, and each number has exactly one atomic formula.

The theorem has two halves. That a factorisation *exists* is easy (Chapter 1 nearly proved it). That it is *unique* is not, and the clearest way to see why it needs a proof is to visit worlds where it fails. This chapter proves both halves, shows what uniqueness buys you, and then visits two such worlds.

## Two ways to grow a tree

Start with $360$. Split it as $36 \times 10$, then $36 = 6 \times 6$, $10 = 2 \times 5$, and so on until only primes are left. Or start with $360 = 8 \times 45$. Different trees, but the same primes at the bottom: $2 \cdot 2 \cdot 2 \cdot 3 \cdot 3 \cdot 5$. Try to break this.

::factor-tree

However you grow the tree, the leaves are the same. That is the claim to prove.

## Euclid’s lemma

The whole proof rests on one property of primes.

:::theorem{name="Euclid’s lemma" who="Euclid, Elements VII.30" status=proved}
If a prime $p$ divides a product $ab$, then $p \mid a$ or $p \mid b$.
:::

It is worth pausing on why this is not obvious. The definition of a prime says what *divides* $p$: only $1$ and $p$. Euclid’s lemma says something about what $p$ *divides*. Converting one into the other is where Bézout’s identity (Chapter 2) comes in.

::::zoom{levels="Idea, Proof"}
:::level[Idea]
If $p$ does not divide $a$, then $p$ and $a$ have no common factor except $1$, so Bézout gives $px + ay = 1$. Multiply by $b$: now $p$ divides both terms on the left, hence the right, which is $b$.
:::
:::level[Proof]
Suppose $p \mid ab$ and $p \nmid a$; we show $p \mid b$. The only positive divisors of $p$ are $1$ and $p$, and $p$ does not divide $a$, so $\gcd(p, a) = 1$. By Bézout’s identity there are integers $x, y$ with $px + ay = 1$. Multiplying by $b$,
$$pbx + aby = b.$$
$p$ divides $pbx$, and $p$ divides $ab$ by assumption, so $p$ divides $aby$. Hence $p$ divides the sum, which is $b$.
:::
::::

The same proof, with $p$ replaced by any $a$ coprime to $b$, gives a version you will need often.

:::corollary{status=proved}
If $a \mid bc$ and $\gcd(a, b) = 1$, then $a \mid c$. And if a prime divides a product $a_1 a_2 \cdots a_k$, it divides one of the factors.
:::

:::proof
For the first statement: Bézout gives $ax + by = 1$, so $acx + bcy = c$, and $a$ divides both terms on the left. For the second, induct on $k$: $p \mid a_1 (a_2 \cdots a_k)$, so by Euclid’s lemma $p \mid a_1$ or $p \mid a_2 \cdots a_k$, and in the second case the induction hypothesis applies.
:::

```parsons
title: Rebuild the proof of Euclid’s lemma
prompt: Put the proof in order. One of the lines does not belong, because it assumes what we are trying to prove.
lines:
  - Suppose $p \mid ab$ and $p \nmid a$; we show $p \mid b$.
  - The only positive divisors of $p$ are $1$ and $p$, so $\gcd(p, a) = 1$.
  - By Bézout’s identity, $px + ay = 1$ for some integers $x, y$.
  - Multiplying by $b$ gives $pbx + aby = b$.
  - Since $p$ divides both $pbx$ and $aby$, it divides $b$.
distractors:
  - By unique factorisation, $p$ appears in the prime factorisation of $a$ or of $b$.
explain: The distractor is circular. Euclid’s lemma is the key step in proving unique factorisation, so it cannot use unique factorisation.
```

## The fundamental theorem

:::theorem{name="The fundamental theorem of arithmetic" who="Euclid; first stated in full by Gauss" year=1801 status=proved}
Every integer $n > 1$ can be written as a product of primes
$$n = p_1 p_2 \cdots p_k,$$
and this factorisation is unique apart from the order of the factors.
:::

Euclid proved the essential ingredients (Book VII, Propositions 30–32, and Book IX, Proposition 14), but the first complete statement and proof is in Gauss’s *Disquisitiones Arithmeticae* of 1801.:cite[euclid,gauss1801]

Grouping equal primes gives the **canonical form** $n = p_1^{e_1} p_2^{e_2} \cdots p_r^{e_r}$ with $p_1 < p_2 < \cdots < p_r$ and every $e_i \ge 1$; for example $360 = 2^3 \cdot 3^2 \cdot 5$. It is often convenient to write $n = \prod_p p^{v_p(n)}$ over *all* primes, where $v_p(n)$, the **$p$-adic valuation**, is the exponent of $p$ in $n$ and is zero for all but finitely many $p$.

::::zoom{levels="Idea, Sketch, Proof"}
:::level[Idea]
Existence: keep splitting until only primes remain. Uniqueness: if two prime factorisations of the same number differed, the first prime of one would divide the product of the other, so by Euclid’s lemma it would equal one of its primes. Cancel it and repeat.
:::
:::level[Sketch]
*Existence* by strong induction: a prime is its own factorisation; a composite $n = ab$ with $1 < a, b < n$ is the product of factorisations of $a$ and $b$. *Uniqueness* by minimal counterexample: take the smallest $n$ with two different factorisations $p_1 \cdots p_k = q_1 \cdots q_l$. Then $p_1$ divides $q_1 \cdots q_l$, so $p_1 = q_j$ for some $j$; cancelling gives a smaller number with two different factorisations.
:::
:::level[Proof]
*Existence.* We use strong induction on $n \ge 2$: assume every integer $m$ with $2 \le m < n$ is a product of primes. If $n$ is prime, it is a product of one prime. Otherwise $n = ab$ with $1 < a, b < n$; by the induction hypothesis $a$ and $b$ are products of primes, and so is their product $n$.

*Uniqueness.* Suppose not, and let $n$ be the smallest integer greater than $1$ with two different factorisations
$$n = p_1 p_2 \cdots p_k = q_1 q_2 \cdots q_l$$
(different meaning that the lists are not rearrangements of each other). The prime $p_1$ divides $n = q_1 q_2 \cdots q_l$, so by the corollary to Euclid’s lemma $p_1 \mid q_j$ for some $j$. As $q_j$ is prime and $p_1 > 1$, $p_1 = q_j$. Cancel it from both sides:
$$\frac{n}{p_1} = p_2 \cdots p_k = q_1 \cdots \widehat{q_j} \cdots q_l,$$
where the hat means that $q_j$ is omitted. If $n / p_1 = 1$, both sides are empty products, so $k = l = 1$ and the two factorisations were the same, a contradiction. Otherwise $n/p_1 > 1$ is smaller than $n$, and its two factorisations are different (since the original ones were, and we removed the same prime from both). This contradicts the minimality of $n$.
:::
::::

:::bridge
Proofcraft, Chapter 6, proves the same theorem with an emphasis on the technique of strong induction, and Euclid’s Elements, Book VII, has the original propositions with live figures.
:::

### Write it yourself

```code
id: factorisation/factor
title: Factorise by trial division
prompt: |
  Write `factor(n)` for integers $1 \le n < 2^{53}$, returning the canonical form as a list of `[prime, exponent]` pairs in increasing order of the primes. For example `factor(360)` is `[[2, 3], [3, 2], [5, 1]]` and `factor(1)` is `[]`. Divide out each factor completely as soon as you find it; then the next divisor you find is automatically prime. Stop when $d^2 > n$; whatever is left above $1$ is a prime.
starter: |
  export function factor(n: number): [number, number][] {
    const out: [number, number][] = [];
    // Your code here.
    return out;
  }
tests: |
  import { test, expect } from 'test';
  import { factor } from 'solution';
  import { factorTrial } from 'primes';

  test('examples', () => {
    expect(factor(360)).toEqual([[2, 3], [3, 2], [5, 1]]);
    expect(factor(1)).toEqual([]);
    expect(factor(97)).toEqual([[97, 1]]);
    expect(factor(1024)).toEqual([[2, 10]]);
  });
  test('agrees with the library up to 5000', () => {
    for (let n = 1; n <= 5000; n++) expect(factor(n)).toEqual(factorTrial(n));
  });
  test('a large prime factor is left at the end', () => {
    expect(factor(2 * 999999000001)).toEqual([[2, 1], [999999000001, 1]]);
    expect(factor(600851475143)).toEqual([[71, 1], [839, 1], [1471, 1], [6857, 1]]);
  });
solution: |
  export function factor(n: number): [number, number][] {
    const out: [number, number][] = [];
    for (let d = 2; d * d <= n; d++) {
      if (n % d !== 0) continue;
      let e = 0;
      while (n % d === 0) {
        n /= d;
        e++;
      }
      out.push([d, e]);
    }
    if (n > 1) out.push([n, 1]);
    return out;
  }
hints:
  - For each $d = 2, 3, 4, \ldots$ with $d \cdot d \le n$, count how many times $d$ divides $n$, dividing it out each time.
  - Because you shrink $n$ as you go, the loop bound $d \cdot d \le n$ also shrinks, which makes numbers with small factors fast.
```

## What uniqueness buys

Once you know the factorisation of $n$, many questions about $n$ become bookkeeping with exponents.

**Divisibility.** $d \mid n$ exactly when $v_p(d) \le v_p(n)$ for every prime $p$. (If $n = dk$, the exponents of $d$ and $k$ add up to those of $n$, by uniqueness.)

**Divisors.** So the divisors of $n = p_1^{e_1} \cdots p_r^{e_r}$ are the numbers $p_1^{a_1} \cdots p_r^{a_r}$ with $0 \le a_i \le e_i$. There are
$$\tau(n) = (e_1 + 1)(e_2 + 1) \cdots (e_r + 1)$$
of them, and their sum is
$$\sigma(n) = \prod_{i=1}^{r} \left(1 + p_i + p_i^2 + \cdots + p_i^{e_i}\right) = \prod_{i=1}^{r} \frac{p_i^{e_i + 1} - 1}{p_i - 1},$$
because expanding the product produces each divisor exactly once. Functions like these, determined by what they do on prime powers, return in force in Chapter 19.

**gcd and lcm.** $v_p(\gcd(a, b)) = \min(v_p(a), v_p(b))$ and $v_p(\operatorname{lcm}(a, b)) = \max(v_p(a), v_p(b))$. Since $\min(x, y) + \max(x, y) = x + y$,
$$\gcd(a, b) \cdot \operatorname{lcm}(a, b) = ab.$$

```quiz
q: How many positive divisors does $2^4 \cdot 3^2 \cdot 7 = 1008$ have, and what is $\gcd(1008, 2^2 \cdot 3^5)$?
options:
  - text: $30$ divisors; gcd $= 2^2 \cdot 3^2 = 36$
    correct: true
    why: $\tau = (4+1)(2+1)(1+1) = 30$. For the gcd take the smaller exponent of each prime; $7$ does not divide $2^2 \cdot 3^5$.
  - text: $8$ divisors; gcd $= 36$
    why: $8 = 4 \cdot 2 \cdot 1$ multiplies the exponents themselves. Each exponent $e$ allows $e + 1$ choices, because the exponent $0$ is allowed too.
  - text: $30$ divisors; gcd $= 2^4 \cdot 3^5$
    why: That takes the larger exponents, which gives the lcm (without the factor $7$).
```

**Irrationality.** The oldest application of all.

:::theorem{status=proved}
If $n$ is a positive integer that is not a perfect square, then $\sqrt{n}$ is irrational.
:::

:::proof
Suppose $\sqrt{n} = a/b$ with positive integers $a, b$. Then $a^2 = n b^2$. In $a^2$ and $b^2$, every prime appears to an even power. As $n$ is not a square, some prime $p$ appears in $n$ to an odd power $v_p(n)$. Then $v_p(nb^2) = v_p(n) + 2v_p(b)$ is odd, while $v_p(a^2) = 2v_p(a)$ is even. This contradicts the uniqueness of the factorisation of $a^2 = nb^2$.
:::

A related fact comes in handy whenever squares appear, as they will in Chapters 9 and 35.

:::lemma{status=proved}
If $ab$ is a perfect square and $\gcd(a, b) = 1$, then $a$ and $b$ are both perfect squares (for positive $a, b$).
:::

:::proof
Since $a$ and $b$ share no prime, every prime $p$ of $a$ has $v_p(a) = v_p(ab)$, which is even. So every exponent in $a$ is even, and $a$ is a square. The same holds for $b$.
:::

:::note
**A stopping point.** The rest of this chapter visits worlds where factorisation is not unique. It explains *why* Euclid’s lemma was needed, but nothing later depends on it except Chapter 35, which returns to number systems like $\mathbb{Z}[i]$.
:::

## Worlds without unique factorisation

### Hilbert’s numbers

David Hilbert is said to have illustrated the theorem with a toy world. Suppose the only numbers are those of the form $4k + 1$: $1, 5, 9, 13, 17, 21, 25, \ldots$ The product of two of them is again of this form, since $(4j + 1)(4k + 1) = 4(4jk + j + k) + 1$, so multiplication makes sense, and you can call a number a **Hilbert prime** if it is not a product of two smaller Hilbert numbers (other than $1$). $9$, $21$ and $49$ are Hilbert primes, because their ordinary factors $3$ and $7$ do not exist in this world. But

$$441 = 9 \times 49 = 21 \times 21,$$

two genuinely different factorisations into Hilbert primes.

::hilbert-numbers

What went wrong? Existence still holds (the same splitting argument works). Uniqueness failed because Euclid’s lemma fails: $21$ divides $9 \times 49$, but divides neither factor. And Euclid’s lemma failed because Bézout’s identity is not available: Hilbert’s world is not closed under subtraction, so there is no division with remainder and no Euclid’s algorithm.

This separates two ideas that coincide in the ordinary integers:

- an **irreducible** element cannot be split into a product of non-units;
- a **prime** element $p$ has Euclid’s property: $p \mid ab$ implies $p \mid a$ or $p \mid b$.

In $\mathbb{Z}$, every irreducible is prime: that is Euclid’s lemma. In Hilbert’s world, $21$ is irreducible but not prime. Unique factorisation holds exactly when the two notions agree (for systems where factorisations exist at all).

### A world that matters: $\mathbb{Z}[\sqrt{-5}]$

Hilbert’s numbers are a toy. Here is a world that mathematicians actually needed. Take the numbers $a + b\sqrt{-5}$ with $a, b$ integers. They can be added, subtracted and multiplied, like the integers. In this world,

$$6 = 2 \times 3 = \left(1 + \sqrt{-5}\right)\left(1 - \sqrt{-5}\right).$$

To see that these four factors cannot be split further, use the **norm** $N(a + b\sqrt{-5}) = a^2 + 5b^2$, which is multiplicative: $N(xy) = N(x)N(y)$. (Check this by expanding, or note that $N(z) = z\bar z$.) If $2 = xy$ with neither factor a unit, then $4 = N(x) N(y)$ with $N(x), N(y) > 1$, so $N(x) = 2$. But $a^2 + 5b^2 = 2$ has no integer solutions. The same argument works for $3$ (no element has norm $3$) and for $1 \pm \sqrt{-5}$ (norm $6 = 2 \times 3$, and again nothing has norm $2$ or $3$). And $2$ is not a unit multiple of $1 \pm \sqrt{-5}$, because their norms differ. So $6$ really has two different factorisations into irreducibles.

This was not a curiosity. In 1847 Gabriel Lamé announced a proof of Fermat’s Last Theorem to the Paris Academy, built on factorising $x^n + y^n$ in a number system like this one. Joseph Liouville immediately asked whether factorisation there was unique, and it emerged that Ernst Kummer had already shown in 1844 that it often is not. Kummer went on to rescue unique factorisation by inventing “ideal numbers”, which became the ideals of modern algebra.:cite[edwards-flt] Chapter 35 visits a happier world, the Gaussian integers $\mathbb{Z}[i]$, where unique factorisation holds and explains which primes are sums of two squares.

:::key
- Euclid’s lemma ($p \mid ab \Rightarrow p \mid a$ or $p \mid b$) comes from Bézout’s identity, and it is the heart of uniqueness.
- The fundamental theorem: every $n > 1$ is a product of primes in exactly one way, up to order. Existence by strong induction, uniqueness by a minimal counterexample.
- With factorisations in hand, divisors, $\tau$, $\sigma$, gcd and lcm are exponent bookkeeping, and $\sqrt{n}$ is irrational unless $n$ is a square.
- Uniqueness can fail when Euclid’s lemma does: Hilbert’s numbers $4k + 1$ and $\mathbb{Z}[\sqrt{-5}]$.
:::

```prove
id: factorisation/prime-power-square
title: '$\sqrt p$ is irrational, by descent'
prompt: 'Let $p$ be a prime and $m, n$ positive integers with $m^2 = p\,n^2$. Show this is impossible, using only Euclid’s lemma (not unique factorisation).'
hints:
  - Take a solution with $m$ as small as possible.
  - From $m^2 = p n^2$, Euclid’s lemma gives $p \mid m$.
rubric:
  - You chose a solution with $m$ minimal (or $n$ minimal).
  - You used Euclid’s lemma to deduce $p \mid m$, so $m = pm'$.
  - You derived $n^2 = p m'^2$, a smaller solution, and reached a contradiction.
solution: |
  Suppose solutions exist and take one with $m$ as small as possible. Since $p \mid m^2 = m \cdot m$, Euclid’s lemma gives $p \mid m$; write $m = pm'$. Then $p^2 m'^2 = p n^2$, so $n^2 = p m'^2$. That is a solution $(n, m')$ with $n < m$ (as $m^2 = pn^2 > n^2$), contradicting minimality. This is Fermat’s method of **infinite descent**.
```

:::exercises
1. Show that $\tau(n)$ is odd exactly when $n$ is a perfect square.
2. A number is **perfect** if $\sigma(n) = 2n$ (as $6 = 1 + 2 + 3$). Show that if $2^k - 1$ is prime then $2^{k-1}(2^k - 1)$ is perfect. (Euler proved that every *even* perfect number has this form; nobody knows whether odd perfect numbers exist.)
3. Prove that $\log_2 3$ is irrational.
4. In Hilbert’s world, find a number with three different factorisations into Hilbert primes. (Hint: multiply four different ordinary primes of the form $4k + 3$. The smallest such number is $4389$.)
:::
