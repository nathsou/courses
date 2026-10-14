---
number: 0
title: The prime staircase
summary: Count the primes, draw the staircase, meet Gauss’s guess, and get a first glimpse of how the zeros of the zeta function redraw it, step by step.
duration: About 45 minutes
theorems: ['Gauss’s guess: π(x) is close to Li(x) (stated here; proved in Part V)']
techniques: [experiment, counting, comparing growth rates]
---

Take the whole numbers $2, 3, 4, 5, \ldots$ and ask which of them can be built by multiplying smaller whole numbers. $4 = 2 \cdot 2$ can. $6 = 2 \cdot 3$ can. $2$, $3$, $5$ and $7$ cannot. The numbers that cannot be built this way are the **primes**: $2$, $3$, $5$, $7$, $11$, $13$, $17$, $19$, $23$, $29$, $31$, $37$, $41$, $43$, $47$, $53$, $59$, $61$, $67$, $71$, $73$, $79$, $83$, $89$, $97$, and so on.

Every other number above $1$ is a product of primes, so the primes are the atoms that all whole numbers are made from. This course is about them: how to recognise them, how to find them, how many there are, and the strange and beautiful mathematics that answers that last question.

The list above looks irregular. Gaps open and close: $23$ and $29$ are six apart, then $29$ and $31$ only two. Nobody has found a formula that produces the $n$-th prime quickly, and there are good reasons to think there isn't one. And yet, if you step back far enough, the primes turn out to be astonishingly well behaved. This prologue shows you the one picture that captures both facts at once.

## Counting the primes

Instead of asking *which* numbers are prime, ask *how many* primes there are up to a given point.

:::definition
For a real number $x$, $\pi(x)$ is the number of primes $p$ with $p \le x$.
:::

The letter $\pi$ here has nothing to do with $3.14159\ldots$; it is the traditional name, chosen by Edmund Landau in 1909, and the course follows tradition.:cite[landau1909] So $\pi(10) = 4$ (the primes $2, 3, 5, 7$), $\pi(2.5) = 1$, and $\pi(1) = 0$.

Before you look at any data, make a guess.

```numeric
id: staircase/guess-1000
title: A first guess
prompt: There are $25$ primes up to $100$. How many do you think there are up to $1000$? (Anything within 20% counts.)
answer: 168
tolerance: 0.2
explain: There are exactly $168$. If you guessed $250$ (ten times as many), you assumed the primes keep the same density; they don’t. Up to $100$, one number in four is prime; up to $1000$, only one in six.
```

Now plot it. $\pi(x)$ stays flat between primes and jumps by one at each prime, so its graph is a staircase. Start at $x \le 30$, where every step is visible, then zoom out.

::staircase{initial=30}

At small scale the staircase is ragged: long treads where there are no primes, then short ones in quick succession. Zoom out to $x \le 10^5$ and something remarkable happens. The $9592$ steps blur into a smooth curve, bending gently downwards. The primes thin out, but they do it *smoothly*.

:::question
Why does the curve bend downwards? Before reading on, write down what a straight line through the origin would say about the primes, and why that cannot be right. (Hint: a straight line means a fixed proportion of all numbers is prime.)
:::

## Gauss’s guess

In 1792 or 1793, a fifteen-year-old Carl Friedrich Gauss was given a book of logarithm tables that also contained a table of primes. He began counting the primes in blocks of a thousand numbers and noticed a pattern. More than half a century later, in a letter to the astronomer Johann Encke written on Christmas Eve 1849, he described what he had seen: behind all the fluctuations, the frequency of primes near a number $x$ is on average inversely proportional to the logarithm of $x$.:cite[gauss1849,goldstein1973] He added that he had often spent an idle quarter of an hour counting another block of a thousand, and had eventually counted all the primes up to three million.

:::bio{name="Carl Friedrich Gauss" born=1777 died=1855 place="Braunschweig and Göttingen"}
Gauss reshaped number theory with his *Disquisitiones Arithmeticae* (1801), written at 21. He kept the prime-counting conjecture to himself for nearly sixty years; it surfaced only in the 1849 letter to Encke.
:::

Throughout this course, $\log$ means the **natural logarithm**, to base $e$. Gauss’s observation says:

$$\text{the probability that a number near } x \text{ is prime is about } \frac{1}{\log x}.$$

Near $100$, $\log 100 \approx 4.6$, so about one number in $4.6$ is prime. Near a million, $\log 10^6 \approx 13.8$: one in fourteen. Near $10^{100}$, one in $230$. The primes thin out, but only logarithmically slowly, which is why they never run out (Chapter 4 proves that they don’t).

If the density near $t$ is $1/\log t$, then the number of primes up to $x$ should be the sum of those densities, which is approximately an integral. That gives two natural guesses:

$$\pi(x) \approx \frac{x}{\log x} \qquad\text{and}\qquad \pi(x) \approx \operatorname{Li}(x) = \int_2^x \frac{dt}{\log t}.$$

The first is simpler; the second, the **logarithmic integral**, is what Gauss actually proposed, and it is much more accurate. Here are the numbers. The values of $\pi(x)$ beyond $10^{10}$ come from enormous computations described in Chapter 15; the rest of the table you could check with the code in this course.:cite[oeis-a006880]

| $x$ | $\pi(x)$ | $x / \log x$ | $\pi(x) \big/ \tfrac{x}{\log x}$ | $\operatorname{Li}(x) - \pi(x)$ |
| ---: | ---: | ---: | ---: | ---: |
| $10^3$ | $168$ | $145$ | $1.161$ | $9$ |
| $10^6$ | $78{,}498$ | $72{,}382$ | $1.085$ | $129$ |
| $10^9$ | $50{,}847{,}534$ | $48{,}254{,}942$ | $1.054$ | $1{,}700$ |
| $10^{12}$ | $37{,}607{,}912{,}018$ | $36{,}191{,}206{,}825$ | $1.039$ | $38{,}262$ |
| $10^{18}$ | $24{,}739{,}954{,}287{,}740{,}860$ | $2.41 \times 10^{16}$ | $1.025$ | $2.2 \times 10^{7}$ |
| $10^{24}$ | $18{,}435{,}599{,}767{,}349{,}200{,}867{,}866$ | $1.81 \times 10^{22}$ | $1.019$ | $1.7 \times 10^{10}$ |

Two things stand out.

1. The ratio $\pi(x) / (x / \log x)$ creeps towards $1$, slowly. That is the content of the **prime number theorem**: $\pi(x) / (x/\log x) \to 1$ as $x \to \infty$. Gauss and Legendre conjectured it around 1800; it was proved in 1896, independently, by Jacques Hadamard and Charles de la Vallée Poussin. Part V of this course proves it in full.
2. $\operatorname{Li}(x)$ is astonishingly accurate. At $x = 10^{24}$ it is off by about $1.7 \times 10^{10}$, an error in the twelfth significant digit. The error is roughly the size of $\sqrt{x}$ (here $10^{12}$), divided by a logarithm. Whether that remains true for *all* $x$ is the **Riemann Hypothesis**, the subject of Part VI.

```quiz
q: At $x = 10^{12}$, $\operatorname{Li}(x)$ overestimates $\pi(x)$ by about $38{,}000$. Roughly what fraction of $\pi(x)$ is that?
options:
  - text: About one part in a million
    correct: true
    why: $38{,}262 / 37{,}607{,}912{,}018 \approx 10^{-6}$. The relative error keeps shrinking as $x$ grows.
  - text: About one per cent
    why: That would be an error of $376$ million. The ratio $\pi(x)/(x/\log x) = 1.039$ is off by a few per cent, but $\operatorname{Li}(x)$ is far better than $x/\log x$.
  - text: About one in a thousand
    why: That would be about $37$ million, a thousand times more than the actual error.
```

Switch on both curves in the staircase above and zoom out: the dashed $x/\log x$ runs visibly below the staircase, while the dotted $\operatorname{Li}(x)$ sits almost on top of it.

:::note
**A stopping point.** You now know what $\pi(x)$ is and what Gauss guessed about it. The rest of this chapter is a preview of where the course goes; nothing later depends on understanding it now.
:::

## A preview: the music of the zeros

Gauss’s curve gets the overall shape right. But the staircase is not smooth, and the question of *exactly where* its steps fall seems hopelessly irregular. In 1859, Bernhard Riemann published an eight-page paper, his only paper on number theory, which showed that the irregularity has a hidden structure.:cite[riemann1859]

Riemann studied a function that Euler had introduced a century earlier,

$$\zeta(s) = 1 + \frac{1}{2^s} + \frac{1}{3^s} + \frac{1}{4^s} + \cdots,$$

and extended it to complex numbers $s$. He found an exact formula for the prime staircase as a sum of a smooth curve and infinitely many waves, one for each **zero** of $\zeta$: each complex number $\rho$ with $\zeta(\rho) = 0$ contributes an oscillation whose frequency is the imaginary part of $\rho$. Nobody needs to take this on trust: the widget below uses the first 100 zeros, computed by this course’s own code, and adds their waves to the smooth part.

::zero-staircase

With no zeros you get a smooth curve close to $\operatorname{Li}(x)$. Add the first zero, $\tfrac12 + 14.1347\ldots i$, and a single slow wave appears. With ten zeros the steps at $2, 3, 5, 7$ are clearly visible; with a hundred, the curve hugs the staircase. The primes, it turns out, are determined by the zeros of $\zeta$, and the zeros by the primes.

The zeros used here all have real part exactly $\tfrac12$. Riemann guessed that *every* non-trivial zero does. That guess, the Riemann Hypothesis, is equivalent to the statement that $\operatorname{Li}(x)$ is as accurate as the table above suggests: off by not much more than $\sqrt{x}$. It has been checked for the first $12$ trillion zeros, it was the eighth of David Hilbert’s problems for the twentieth century, and it carries a million-dollar prize from the Clay Mathematics Institute. It is still open.:cite[platt-trudgian2021,clay]

## The road ahead

The course climbs from the definition of a prime to the frontier of research. Each part builds on the ones before it.

| Part | The question | Where it leads |
| --- | --- | --- |
| I · The atoms of arithmetic | What can we prove about divisibility? | Unique factorisation, modular arithmetic, Fermat’s little theorem |
| II · Finding primes | How do we test and find primes, and factor numbers? | Sieves, Miller–Rabin, Lucas–Lehmer, Pollard’s ρ, the quadratic sieve, RSA |
| III · Counting primes | How fast does $\pi(x)$ grow? | Fast exact counting, Chebyshev’s and Mertens’ theorems, random models |
| IV · The zeta function | Why do zeros of $\zeta$ control primes? | Euler’s product, continuation, the functional equation, the explicit formula |
| V · The prime number theorem | Is Gauss right? | A complete proof, sketched first and then given in full |
| VI · The Riemann Hypothesis | How accurate is $\operatorname{Li}(x)$? | RH and its equivalents, random matrices, RH over finite fields |
| VII · Primes in patterns | Which patterns do the primes contain? | Dirichlet’s theorem, prime races, twin primes, Goldbach, Green–Tao |

## How to use this course

You are assumed to be comfortable with code, algebra and calculus. You do not need to remember any number theory, and you do not need to remember your complex analysis course: Part IV says exactly what it needs and Appendix A reviews it from the ground up, with pictures. Appendices B to E cover asymptotics, Fourier analysis, the Gamma function and the little algebra the course uses.

Proofs come in layers. Major results appear first as an **idea**, then a **sketch** of the main steps, and then a complete **proof** that you can expand when you are ready. Every theorem carries a label:

- **proved**: proved in full in this course;
- **sketched**: the idea and main steps are here, and the text says exactly what is left out;
- **stated**: quoted without proof, with a reference;
- **open**: nobody knows.

Algorithms are part of the main story, not an optional track. Several chapters ask you to write a function in TypeScript (a sieve, a primality test, a factoring method, a prime counter, a zero finder) and check it against tests that run in your browser. Every exercise has a reference solution in the course’s `primes` library (Appendix F), so a skipped exercise never blocks a later chapter.

:::bridge
Two other courses in this collection meet the primes from different directions. *Proofcraft* uses Euclid’s theorem, unique factorisation and Fermat’s little theorem to teach proof technique, and *Euclid’s Elements* has the original arithmetic of Books VII–IX. This course covers all of that material in full on its own, so you do not need either; they are there if you want a second view.
:::

:::key
- $\pi(x)$ counts the primes up to $x$. Its graph is a staircase that is ragged up close and smooth from far away.
- Gauss guessed that primes near $x$ have density about $1/\log x$, so $\pi(x) \approx \operatorname{Li}(x) = \int_2^x dt/\log t$. That this is right asymptotically is the prime number theorem (Part V).
- Riemann showed that the zeros of $\zeta$ rebuild the staircase exactly. The Riemann Hypothesis says how accurate $\operatorname{Li}(x)$ is (Part VI).
:::
