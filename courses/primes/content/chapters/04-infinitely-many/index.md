---
number: 4
title: Infinitely many primes
summary: Euclid’s proof, which is not by contradiction, and four more, each giving a little more information; then primes of the form 4k + 3, gaps of any length, and how much each proof says about how many primes there are.
duration: About 1½ hours
prerequisites: [unique-factorisation]
theorems: [There are infinitely many primes, The sum of 1/p diverges, There are infinitely many primes of the form 4k + 3, There are arbitrarily long gaps between primes]
techniques: [construction, coprimality, comparison with series, counting, topology]
---

The primes thin out: a quarter of the numbers up to $100$ are prime, but only one in thirteen up to a million. Perhaps, far enough out, they stop altogether? Euclid answered this around 300 BC, in a proof so economical that it is still the first proof most mathematicians learn. This chapter gives it, then four more proofs of the same fact. That is not redundancy for its own sake. Each proof uses a different idea, and the later ones say not just *that* the primes go on, but roughly *how many* there are, which is the question of the rest of the course.

## Euclid’s theorem

:::theorem{name="Elements IX.20" who="Euclid" year="c. 300 BC" status=proved}
Prime numbers are more than any assigned multitude of prime numbers.
:::

That is Heath's translation of Euclid's statement:cite[euclid] given any finite list of primes, there is a prime that is not on the list.

::::zoom{levels="Idea, Proof"}
:::level[Idea]
Multiply the primes on the list and add one. Each prime on the list leaves remainder $1$, so none of them divides the result; but the result has some prime factor, and it must be new.
:::
:::level[Proof]
Let $p_1, \ldots, p_n$ be any finite list of primes, and let $N = p_1 p_2 \cdots p_n + 1$. Then $N > 1$, so $N$ has a prime factor $p$ (Chapter 1).

If $p$ were one of the $p_i$, it would divide both $N$ and the product $p_1 \cdots p_n$, hence their difference, which is $1$. No prime divides $1$. So $p$ is not on the list.
:::
::::

:::warning
**Euclid's proof is not a proof by contradiction.** It is usually retold as "suppose there are finitely many primes; multiply them all and add one; contradiction." That version is correct, but it is not Euclid's, and it is weaker: Euclid's argument *constructs* a new prime from any finite list (at least in principle), and it applies to any list at all, not just a supposedly complete one.:cite[hardy-woodgold]
:::

Here is the construction, run as a machine. Start from $\{2\}$; $2 + 1 = 3$ is prime, so add it; $2 \cdot 3 + 1 = 7$; $2 \cdot 3 \cdot 7 + 1 = 43$; then $2 \cdot 3 \cdot 7 \cdot 43 + 1 = 1807 = 13 \cdot 139$, and the machine keeps the smallest new factor, $13$.

::euclid-machine

Starting from $\{2\}$ and always keeping the smallest new prime gives the **Euclid–Mullin sequence**: $2, 3, 7, 43, 13, 53, 5, 6221671, 38709183810571, 139, \ldots$ It is conjectured that every prime eventually appears in it; nobody knows.:cite[oeis-a000945] After a few dozen terms the numbers to factor have hundreds of digits, and nobody can factor them. The *proof* does not care: it guarantees a new prime factor without finding it.

```bug
title: A popular mistake
prompt: 'This argument tries to construct a new prime from a finite list. Which line makes a claim that does not follow?'
lines:
  - Start with any finite list of primes $p_1, \ldots, p_n$.
  - Let $N = p_1 p_2 \cdots p_n + 1$.
  - None of the $p_i$ divides $N$, because each leaves remainder $1$.
  - Therefore $N$ is prime.
  - So $N$ is a prime that is not on the list.
wrong: 3
why: |
  $N$ need not be prime: $2 \cdot 3 \cdot 5 \cdot 7 \cdot 11 \cdot 13 + 1 = 30031 = 59 \cdot 509$. The list is arbitrary, so $N$ can have prime factors that are not on the list but are smaller than $N$. What always follows is that $N$ has *some* prime factor, and none of its prime factors is on the list.
notes:
  '2': 'Correct: dividing $N$ by $p_i$ leaves remainder $1$.'
```

:::note
**A stopping point.** That is the theorem. The next section gives four more proofs, which you can read in any order and skip on a first reading; the last two sections (primes $4k + 3$ and gaps) only need Euclid's proof.
:::

## Four more proofs

### Fermat numbers are pairwise coprime

The **Fermat numbers** are $F_n = 2^{2^n} + 1$: $F_0 = 3$, $F_1 = 5$, $F_2 = 17$, $F_3 = 257$, $F_4 = 65537$. In 1640 Fermat conjectured that they are all prime. The first five are, but in 1732 Euler found $F_5 = 4294967297 = 641 \times 6700417$, and no Fermat prime beyond $F_4$ has ever been found. Christian Goldbach had noticed, in a letter to Euler in 1730, that the Fermat numbers nevertheless prove Euclid's theorem.:cite[aigner-ziegler]

:::theorem{name="Goldbach" year=1730 status=proved}
Distinct Fermat numbers are coprime. Consequently there are infinitely many primes.
:::

:::proof
First, $F_0 F_1 \cdots F_{n-1} = F_n - 2$ for every $n \ge 1$. For $n = 1$ this says $3 = 5 - 2$. If it holds for $n$, then
$$F_0 \cdots F_{n-1} F_n = (F_n - 2) F_n = \left(2^{2^n} - 1\right)\left(2^{2^n} + 1\right) = 2^{2^{n+1}} - 1 = F_{n+1} - 2.$$

Now take $m < n$ and suppose a prime $p$ divides both $F_m$ and $F_n$. Then $p$ divides the product $F_0 \cdots F_{n-1} = F_n - 2$ (which contains $F_m$), and $p$ divides $F_n$, so $p$ divides $2$. But Fermat numbers are odd. So $F_m$ and $F_n$ are coprime. Each of the infinitely many $F_n$ has a prime factor, and no two share one, so there are infinitely many primes.
:::

As a bonus, this shows $p_{n+1} \le F_n$ (the $n + 1$ numbers $F_0, \ldots, F_n$ have $n + 1$ different prime factors, each at most $F_n$), so $\pi(x)$ is at least about $\log_2 \log_2 x$. That is a pitiful lower bound, but it is a bound.

### Euler’s product

Euler's proof of 1737 looks completely different, and it started a new subject.:cite[euler1737] It rests on two facts. The first is that the **harmonic series** diverges:
$$1 + \tfrac12 + \tfrac13 + \tfrac14 + \cdots = \infty.$$
Nicole Oresme proved this around 1350 by grouping terms: $\tfrac13 + \tfrac14 > \tfrac12$, $\tfrac15 + \cdots + \tfrac18 > \tfrac12$, $\tfrac19 + \cdots + \tfrac1{16} > \tfrac12$, and so on, so the sum exceeds $1 + \tfrac12 + \tfrac12 + \cdots$. More precisely, comparing with the integral of $1/t$,
$$\sum_{n \le x} \frac1n > \int_1^{x} \frac{dt}{t} = \log x \qquad (x \ge 1),$$
because $1/n > 1/t$ on each interval $[n, n+1)$, and $\int_1^x$ is covered by those intervals with $n \le x$.

The second fact is unique factorisation, used in an unusual way.

:::theorem{name="Euler" year=1737 status=proved}
For every $x \ge 2$,
$$\prod_{p \le x} \frac{1}{1 - 1/p} > \log x.$$
In particular there are infinitely many primes.
:::

::::zoom{levels="Idea, Proof"}
:::level[Idea]
$\frac{1}{1 - 1/p} = 1 + \frac1p + \frac1{p^2} + \cdots$. Multiplying these geometric series for all primes up to $x$ produces $\frac1n$ for every $n$ whose prime factors are all at most $x$, including every $n \le x$, each exactly once by unique factorisation. So the product is at least the harmonic sum up to $x$. If there were finitely many primes, the product over all of them would be a finite number, but the harmonic sums are unbounded.
:::
:::level[Proof]
For each prime $p$, $\frac{1}{1 - 1/p} = \sum_{k \ge 0} p^{-k}$, a convergent geometric series of positive terms. A finite product of such series can be multiplied out term by term (the terms are positive, so the order does not matter):
$$\prod_{p \le x} \sum_{k \ge 0} \frac{1}{p^k} = \sum \frac{1}{p_1^{k_1} p_2^{k_2} \cdots p_r^{k_r}},$$
where $p_1, \ldots, p_r$ are the primes up to $x$ and the sum runs over all exponents $k_1, \ldots, k_r \ge 0$. Each term is $1/n$ for a number $n$ all of whose prime factors are at most $x$, and by unique factorisation each such $n$ appears exactly once. Every $n \le x$ is such a number. Hence
$$\prod_{p \le x} \frac{1}{1 - 1/p} \ge \sum_{n \le x} \frac1n > \log x.$$
If there were only finitely many primes, the left-hand side would be bounded as $x \to \infty$, but $\log x$ is not.
:::
::::

Taking logarithms gives much more. This is our first theorem about *how many* primes there are, and it is proved in full.

:::theorem{name="Euler" year=1737 status=proved}
The sum of the reciprocals of the primes diverges. Precisely, for $x \ge 2$,
$$\sum_{p \le x} \frac1p > \log \log x - 1.$$
:::

:::proof
Take logarithms in the previous theorem: $\sum_{p \le x} -\log(1 - 1/p) > \log \log x$. For $0 \le t \le \tfrac12$,
$$-\log(1 - t) = t + \frac{t^2}{2} + \frac{t^3}{3} + \cdots \le t + \frac{t^2}{2}\left(1 + t + t^2 + \cdots\right) = t + \frac{t^2}{2(1 - t)} \le t + t^2.$$
Apply this with $t = 1/p \le \tfrac12$:
$$\log \log x < \sum_{p \le x} \frac1p + \sum_{p \le x} \frac1{p^2} < \sum_{p \le x} \frac1p + \sum_{n \ge 2} \frac{1}{n^2} < \sum_{p \le x} \frac1p + 1,$$
since $\sum_{n \ge 2} 1/n^2 < \sum_{n \ge 2} \frac{1}{n(n-1)} = \sum_{n \ge 2}\left(\frac{1}{n-1} - \frac1n\right) = 1$.
:::

So the primes are "denser" than the squares, for which $\sum 1/n^2$ converges, and much denser than any sequence that grows exponentially. Euler's idea of studying primes through a product over all of them, $\prod_p (1 - p^{-s})^{-1}$, is the seed of the zeta function and of all of Part IV. Chapter 17 sharpens this theorem to $\sum_{p \le x} 1/p = \log \log x + M + o(1)$.

### Erdős’s counting proof

Paul Erdős gave a proof in 1938 that uses nothing but counting, and it also produces a lower bound for $\pi(x)$.:cite[aigner-ziegler] Every positive integer $n$ can be written as $n = s m^2$ with $s$ **squarefree** (not divisible by any square other than $1$): put each prime with an odd exponent once into $s$, and the rest into $m^2$.

:::theorem{name="Erdős" year=1938 status=proved}
For every $x \ge 1$, $\pi(x) \ge \tfrac12 \log_2 x$.
:::

:::proof
Let $k = \pi(x)$. Every $n \le x$ can be written as $n = sm^2$ with $s$ squarefree. All prime factors of $s$ are at most $x$, and $s$ is a product of distinct primes, so $s$ is determined by which of the $k$ primes up to $x$ divide it: there are at most $2^k$ choices. And $m \le \sqrt{n} \le \sqrt{x}$, so there are at most $\sqrt{x}$ choices for $m$. The map $n \mapsto (s, m)$ is one-to-one, so $x \le 2^k \sqrt{x}$ (for integer $x$; for other $x$ use $\lfloor x \rfloor$ and the same argument). Hence $2^k \ge \sqrt{x}$, that is, $k \ge \tfrac12 \log_2 x$.
:::

A refinement of the same idea gives another proof that $\sum 1/p$ diverges. Suppose it converged; then some tail is small, $\sum_{i > k} 1/p_i < \tfrac12$. Among the numbers $n \le N$, those divisible by some $p_i$ with $i > k$ number at most $\sum_{i > k} N/p_i < N/2$. The others have all their prime factors among $p_1, \ldots, p_k$, and by the $sm^2$ argument there are at most $2^k \sqrt{N}$ of them. So $N < N/2 + 2^k \sqrt N$, which fails once $N \ge 2^{2k+2}$.

### Furstenberg’s topological proof

In 1955, as an undergraduate, Hillel Furstenberg published a proof that uses the language of topology.:cite[furstenberg1955,aigner-ziegler] It needs only the definition of a topology: a collection of "open" sets, closed under arbitrary unions and finite intersections, containing the empty set and the whole space. A set is "closed" if its complement is open.

:::theorem{name="Furstenberg" year=1955 status=proved}
There are infinitely many primes.
:::

:::proof
Call a set $U \subseteq \mathbb{Z}$ **open** if it is empty or if, for every $a \in U$, some whole arithmetic progression $a + b\mathbb{Z} = \{a + bk : k \in \mathbb{Z}\}$ with $b \ge 1$ lies inside $U$. Unions of open sets are clearly open. If $U_1, U_2$ are open and $a$ lies in both, with $a + b_1\mathbb{Z} \subseteq U_1$ and $a + b_2\mathbb{Z} \subseteq U_2$, then $a + b_1 b_2 \mathbb{Z}$ lies in both; so finite intersections are open. This is a topology. Two facts about it:

1. A non-empty open set is infinite (it contains a whole progression).
2. Each progression $a + b\mathbb{Z}$ is open (obviously) and also closed, because its complement is the union of the other $b - 1$ progressions $a + i + b\mathbb{Z}$, $1 \le i < b$, which is open.

Every integer other than $\pm 1$ has a prime factor, so
$$\mathbb{Z} \setminus \{-1, 1\} = \bigcup_{p \text{ prime}} p\mathbb{Z}.$$
If there were finitely many primes, the right-hand side would be a finite union of closed sets, hence closed. Then its complement $\{-1, 1\}$ would be open. But it is finite and non-empty, contradicting fact 1.
:::

The topology is a disguise: the proof is really about divisibility, like Euclid's.:cite[aigner-ziegler] But it is a striking illustration that a theorem about primes can be proved from very far away, a theme that returns with a vengeance when complex analysis proves the prime number theorem in Part V.

## Primes in progressions: a first step

Every prime other than $2$ is odd, so it is $4k + 1$ or $4k + 3$. Are there infinitely many of each kind? For $4k + 3$, a variation on Euclid's argument works.

:::theorem{status=proved}
There are infinitely many primes of the form $4k + 3$.
:::

:::proof
Let $p_1, \ldots, p_n$ be any finite list of primes of the form $4k + 3$, and set $N = 4 p_1 p_2 \cdots p_n - 1$. Then $N \equiv 3 \pmod 4$ (that is, $N$ leaves remainder $3$ on division by $4$) and $N$ is odd.

A product of numbers of the form $4k + 1$ has the same form, since $(4j + 1)(4k + 1) = 4(4jk + j + k) + 1$. So if every prime factor of $N$ were of the form $4k + 1$, $N$ would be too. It is not, so $N$ has a prime factor $q$ of the form $4k + 3$ (it is odd, so $2$ is not a factor). If $q$ were some $p_i$, it would divide $N$ and $4p_1 \cdots p_n$, hence $1$. So $q$ is a new prime of the form $4k + 3$.
:::

The same trick fails for $4k + 1$: a product of primes of the form $4k + 3$ can be $4k + 1$ ($3 \cdot 7 = 21$), so the new number's prime factors are not forced to have the right form. Infinitely many primes $4k + 1$ do exist; Chapter 9 proves it with one more idea (which primes divide numbers of the form $n^2 + 1$), and Chapter 33 proves **Dirichlet's theorem**: every progression $a, a + q, a + 2q, \ldots$ with $\gcd(a, q) = 1$ contains infinitely many primes. That needs the machinery of Part IV.

```prove
id: infinitely-many/six-k-five
title: Primes of the form 6k + 5
prompt: Prove that there are infinitely many primes of the form $6k + 5$.
hints:
  - Every prime other than $2$ and $3$ is $6k + 1$ or $6k + 5$.
  - Consider $N = 6 p_1 \cdots p_n - 1$. What can you say about a product of numbers of the form $6k + 1$?
rubric:
  - You defined a number like $N = 6p_1 \cdots p_n - 1$ from a finite list of primes $6k + 5$.
  - You explained why $N$ is not divisible by $2$ or $3$.
  - You showed that numbers of the form $6k + 1$ are closed under multiplication, so $N$ has a prime factor of the form $6k + 5$.
  - You showed that factor is not on the list.
solution: |
  Let $p_1, \ldots, p_n$ be primes of the form $6k + 5$ and put $N = 6p_1 \cdots p_n - 1 \equiv 5 \pmod 6$. $N$ is not divisible by $2$ or $3$, so each prime factor of $N$ is $6k + 1$ or $6k + 5$. Since $(6j + 1)(6k + 1) = 6(6jk + j + k) + 1$, if all were $6k + 1$ then $N$ would be too. So some prime factor $q$ is $6k + 5$. If $q = p_i$ then $q$ divides $6p_1 \cdots p_n - N = 1$, impossible. So $q$ is new.
```

## Gaps of any length

The primes go on forever, but they can be very far apart.

:::theorem{status=proved}
For every $n \ge 2$, there are $n - 1$ consecutive composite numbers.
:::

:::proof
The numbers $n! + 2, n! + 3, \ldots, n! + n$ are consecutive. For $2 \le k \le n$, $k$ divides $n!$ and $k$, so $k \mid n! + k$, and $n! + k > k$. So each of them is composite.
:::

The construction is extravagant: the first run of $13$ composites it produces starts at $14! + 2 \approx 8.7 \times 10^{10}$, but there is already a gap of $14$ between $113$ and $127$. The widget compares the two.

::gaps

Gaps grow, but slowly: the largest gap between primes below $10^7$ is $154$. Chapter 18 makes this quantitative. The average gap near $x$ is $\log x$, and Cramér conjectured that the largest gaps are about $(\log x)^2$. At the other extreme, the **twin prime conjecture** says that gaps of $2$ occur infinitely often. That is still open, but in 2013 Yitang Zhang proved that some gap below $70$ million occurs infinitely often, and the bound has since come down to $246$ (Chapter 36).

## How much do these proofs say?

Each proof gives a lower bound on $\pi(x)$, and comparing them with the truth is instructive.

| Proof | Lower bound for $\pi(x)$ | At $x = 10^6$ |
| --- | --- | ---: |
| Euclid, Goldbach | about $\log_2 \log_2 x$ | $5$ |
| Erdős | $\tfrac12 \log_2 x$ | $10$ |
| Euler (via $\sum 1/p$) | grows faster than any power of $\log x$ (exercise 4) | |
| Truth | $\pi(10^6)$ | $78{,}498$ |

None of the elementary arguments comes close to the truth, which is about $x / \log x$. Getting there is the work of Part III (Chebyshev's bounds, which are within a constant factor) and Part V (the prime number theorem, which gets the constant right).

:::key
- Euclid: from any finite list of primes, $p_1 \cdots p_n + 1$ has a prime factor not on the list. The proof is constructive, not by contradiction.
- Other proofs: Fermat numbers are pairwise coprime; Euler's product shows $\prod_{p \le x}(1 - 1/p)^{-1} > \log x$ and $\sum_{p \le x} 1/p > \log \log x - 1$; Erdős counts $n = sm^2$; Furstenberg uses arithmetic progressions as open sets.
- There are infinitely many primes $4k + 3$ (a variation on Euclid); $4k + 1$ needs more (Chapters 9 and 33).
- Gaps can be arbitrarily long ($n! + 2, \ldots, n! + n$), but in practice they grow slowly.
:::

:::exercises
1. Show by induction that the $n$-th prime satisfies $p_n \le 2^{2^{n-1}}$. (Use Euclid's construction: $p_{n+1} \le p_1 \cdots p_n + 1$.)
2. Show that if $2^m + 1$ is prime then $m$ is a power of $2$. (If $m$ has an odd factor $k > 1$, factor $x^k + 1$.) This is why Fermat looked at $2^{2^n} + 1$.
3. Show that $F_5 = 2^{32} + 1$ is divisible by $641$ without dividing: note $641 = 5 \cdot 2^7 + 1 = 5^4 + 2^4$.
4. Use $\sum_{p \le x} 1/p > \log \log x - 1$ to show that $\pi(x)$ cannot be bounded by $C (\log x)^k$ for any constants $C, k$. (Hint: if it were, use partial sums to bound $\sum_{p \le x} 1/p$.)
:::
