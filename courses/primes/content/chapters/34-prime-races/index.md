---
number: 34
title: Prime races
summary: "Chebyshev noticed in 1853 that primes ≡ 3 (mod 4) seem to outnumber primes ≡ 1 (mod 4). They do not in the long run, but they lead most of the time. The explicit formula for L-functions explains the bias, the first reversals at 26,861 and 608,981,813,029, and the Rubinstein–Sarnak densities."
duration: About 1 hour
prerequisites: [dirichlet, littlewood]
theorems: [Littlewood (1914) for races, Rubinstein–Sarnak densities (conditional)]
techniques: [explicit formulas for L-functions, logarithmic density]
---

By Chapter 33, the primes are shared equally between the residue classes modulo $q$ in the long run. But in 1853 Pafnuty Chebyshev remarked in a letter that there are “notably more” primes of the form $4k + 3$ than of the form $4k + 1$.:cite[chebyshev1853] Up to $10^7$, the class $3 \bmod 4$ is ahead at all but a few thousand integers $x$. This chapter explains why, and how such **prime races** behave in the long run.

::race-chart

## The first reversals

The lead of $3 \bmod 4$ is not permanent. John Leech found in 1957 that at $x = 26{,}861$ there are, for the first time, more primes $\equiv 1 \pmod 4$ (namely $1473$ against $1472$).:cite[leech1957] The next reversal begins at $616{,}841$, and there are dozens of short reversals below $10^7$. For the race between $2 \bmod 3$ and $1 \bmod 3$, the first reversal is at $608{,}981{,}813{,}029$ (Bays and Hudson, 1978).:cite[bays-hudson1978]

Littlewood’s 1914 theorem (Chapter 30) applies here too: each of these races has infinitely many lead changes. So the question is not “who wins” but “who leads, how often”.

## Why the non-squares lead

The explicit formula of Chapter 23 has a version for each $L$-function. For a character $\chi$ modulo $q$, the weighted count $\psi(x, \chi) = \sum_{n \le x}\chi(n)\Lambda(n)$ satisfies
$$\psi(x, \chi) = -\sum_{\rho_\chi}\frac{x^{\rho_\chi}}{\rho_\chi} + (\text{small}), \qquad \chi \ne \chi_0,$$
a sum over the nontrivial zeros $\rho_\chi$ of $L(s, \chi)$. There is no main term $x$, because $L(s, \chi)$ has no pole. For $q = 4$, with $\chi = \chi_{-4}$, the difference between the classes is
$$\sum_{\substack{p^k \le x\\ p^k \equiv 3\ (4)}}\log p - \sum_{\substack{p^k \le x\\ p^k \equiv 1\ (4)}}\log p = -\psi(x, \chi_{-4}).$$
Now pass from prime powers to primes, as in Chapter 30. The prime squares $p^2$ are all $\equiv 1 \pmod 4$, never $\equiv 3$. So counting prime powers gives the class $1$ an unfair bonus of about $\sum_{p \le \sqrt x}\log p \approx \sqrt x$, and removing it shifts the balance in favour of $3$:
$$\pi(x; 4, 3) - \pi(x; 4, 1) \approx \frac{\sqrt x}{\log x}\left(1 + \sum_{\gamma}2\operatorname{Re}\frac{x^{i\gamma}}{\rho}\right),$$
the sum over the zeros $\rho = \frac12 + i\gamma$ of $L(s, \chi_{-4})$ with $\gamma > 0$, assuming GRH. This is exactly the shape of the formula for $\pi(x) - \operatorname{li}(x)$ in Chapter 30, with the bias $+1$ in favour of the **non-squares**: in every race between a class of quadratic non-residues and a class of residues, the residues receive the prime squares, and the non-residues lead on average.

The size of the bias relative to the waves decides how often the leader changes. For $\pi$ against $\operatorname{li}$, the lowest zero of $\zeta$ is at height $14.13$, the waves are small, and the first reversal is near $10^{316}$. The lowest zero of $L(s, \chi_{-4})$ is at height $6.02$, its wave is more than twice as large, and the first reversal comes at $26{,}861$. The lowest zero for the character modulo $3$ is at height $8.04$, which is why that race waits until $6 \times 10^{11}$.

## How often does each class lead?

Use logarithmic density, as in Chapter 30. Michael Rubinstein and Peter Sarnak showed in 1994 that, under GRH and the hypothesis that the ordinates of the zeros of the relevant $L$-functions are linearly independent over $\Q$, every such race has a logarithmic density, and they computed them.:cite[rubinstein-sarnak1994]

:::theorem{name="Rubinstein–Sarnak" year=1994 status=stated}
Assume GRH and linear independence of the zeros. Then the set of $x$ with $\pi(x; 4, 3) > \pi(x; 4, 1)$ has logarithmic density $0.9959\ldots$, and the set with $\pi(x; 3, 2) > \pi(x; 3, 1)$ has logarithmic density $0.9990\ldots$
:::

So the class $3 \bmod 4$ leads about $99.6\%$ of the time in the logarithmic sense, and the bias is real, but neither class leads forever. Their method treats the normalised difference as a random variable $1 + \sum_\gamma\frac{2\sin(\gamma\theta_\gamma)}{|\rho|}$ with the phases $\theta_\gamma$ independent and uniform (which is what linear independence gives), and computes its distribution. The same approach shows that the bias in a race modulo $q$ fades as $q$ grows, and identifies the most biased races.

```quiz
q: 'In a race between the classes $a$ and $b$ modulo $q$ (both coprime to $q$), which class is favoured?'
options:
  - text: The one that is a quadratic non-residue modulo $q$, if the other is a residue.
    correct: true
    why: The prime squares all land in residue classes, so the residues get a head start among prime powers that disappears when only primes are counted.
  - text: The smaller of $a$ and $b$.
    why: '$3 \bmod 4$ leads $1 \bmod 4$, and $2 \bmod 3$ leads $1 \bmod 3$: the size of the residue is irrelevant.'
  - text: Neither, by Dirichlet’s theorem.
    why: Dirichlet’s theorem (and the PNT for progressions) is about the long-run ratio, which is $1$; the race is about the lower-order term, which is biased.
```

:::key
- $\pi(x; 4, 3) > \pi(x; 4, 1)$ for most $x$ (Chebyshev’s bias), but not all: first reversal at $26{,}861$; for $2 \bmod 3$ against $1 \bmod 3$, at $608{,}981{,}813{,}029$.
- The explicit formula for $L(s, \chi)$ gives $\frac{\sqrt x}{\log x}(1 + \sum2\operatorname{Re}\frac{x^{i\gamma}}{\rho})$: the $1$ comes from prime squares, which always fall in residue classes, so non-residues lead on average.
- Under GRH and linear independence, races have logarithmic densities (Rubinstein–Sarnak): $0.9959$ for $3$ vs $1 \bmod 4$, $0.9990$ for $2$ vs $1 \bmod 3$.
:::

```code
id: prime-races/reversals
title: Find the reversals
prompt: |
  Write `reversals(N)`, which returns the list of primes $p \le N$ at which $\pi(x; 4, 1)$ moves ahead of $\pi(x; 4, 3)$, that is, the primes $p \equiv 1 \pmod 4$ such that $\pi(p; 4, 1) > \pi(p; 4, 3)$ but $\pi(p - 1; 4, 1) \le \pi(p - 1; 4, 3)$. Use `sieve(N)` from the library.
starter: |
  import { sieve } from 'primes';

  export function reversals(N: number): number[] {
    return [];
  }
tests: |
  import { test, expect } from 'test';
  import { reversals } from 'solution';

  test('the first reversal is at 26,861', () => {
    expect(reversals(100000)).toEqual([26861]);
  });
  test('up to a million', () => {
    const r = reversals(1000000);
    expect(r[1]).toBe(616841);
    expect(r.length).toBeGreaterThan(10);
  });
solution: |
  import { sieve } from 'primes';

  export function reversals(N: number): number[] {
    const flags = sieve(N);
    const out: number[] = [];
    let ones = 0;
    let threes = 0;
    for (let p = 3; p <= N; p++) {
      if (!flags[p]) continue;
      const before = ones > threes;
      if (p % 4 === 1) ones++;
      else threes++;
      if (!before && ones > threes) out.push(p);
    }
    return out;
  }
hints:
  - 'Keep two counters and a flag for “class 1 is ahead”; record $p$ when the flag switches from false to true.'
```

:::exercises
1. Check by hand that $\pi(26861; 4, 1) = 1473$ and $\pi(26861; 4, 3) = 1472$ are plausible: use $\pi(26861) = 2946$ and the fact that $2$ is in neither class.
2. Show that every odd square is $\equiv 1 \pmod 8$, and predict which classes modulo $8$ are favoured in races against the class $1 \bmod 8$.
3. Explain why there is no comparable bias between $\psi(x; 4, 3)$ and $\psi(x; 4, 1)$, the counts of prime powers weighted by $\log p$. What does the explicit formula say about their difference?
:::
