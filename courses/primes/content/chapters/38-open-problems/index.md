---
number: 38
title: "Epilogue: the map of the unknown"
summary: "A look back at the staircase, a map of every open problem the course has met with its status and best partial result, and where to read next."
duration: About 30 minutes
prerequisites: [goldbach]
theorems: []
techniques: []
---

The course began with a staircase: $\pi(x)$, rising by one at each prime. It has been drawn by hand (Part I), sieved and tested (Part II), estimated and bounded (Part III), rebuilt from the zeros of a complex function (Part IV), proved to follow Gauss's curve (Part V), and measured against the Riemann Hypothesis (Part VI). Part VII looked at primes in patterns: progressions, races, pairs, sums.

Along the way, the same ideas kept returning:

- **Unique factorisation as an identity of functions.** Euler's product turned the fundamental theorem of arithmetic into $\zeta(s) = \prod_p(1 - p^{-s})^{-1}$, and every later chapter built on it: Dirichlet's $L$-functions, the zeta functions of polynomial rings and curves, the Gaussian integers.
- **Duality between primes and zeros.** The explicit formula says that the primes and the zeros of $\zeta$ determine each other. The prime number theorem is a statement about one zero-free line; the Riemann Hypothesis about a whole half-plane; prime races and the sign changes of $\pi(x) - \operatorname{li}(x)$ about the fine structure of the zeros.
- **Random models and their limits.** Cramér's model, Hardy and Littlewood's singular series and random matrices predict almost everything that has been checked. But Maier's theorem, Mertens' conjecture and the bias of $\operatorname{li}$ show that such predictions need proof, and that the proof can be very far away.
- **Positivity.** $3 + 4\cos\theta + \cos 2\theta \ge 0$ proves the prime number theorem; positive coefficients and Landau's theorem prove $L(1, \chi) \ne 0$; degrees and Cauchy–Schwarz prove the Riemann Hypothesis over finite fields. Where positivity is missing, as for the Riemann Hypothesis itself, progress stops.

## The map

::problem-map

A few remarks on reading it.

**Some problems are probably very hard, and some may just be hard.** The Riemann Hypothesis has resisted every approach for over 160 years and connects to so much of mathematics that a proof would almost certainly need new ideas. The twin prime conjecture, by contrast, was within a factor of $123$ (from gap $246$ to gap $2$) by 2014; the obstacle is the parity problem of sieve theory, and it is not clear how deep it is. Goldbach's binary conjecture seems to need something beyond the circle method.

**Records move.** The largest known prime, the verified height of the Riemann Hypothesis, the bound on prime gaps: these numbers are as of the sources cited in each chapter, and some will have improved by the time you read this. The mathematics around them does not change.

**Computation is an instrument.** Almost every conjecture in this course was found or sharpened by looking at numbers, from Gauss's tables to Odlyzko's zeros. The widgets in this course are small versions of the same instrument: they cannot prove theorems, but they show which statements are worth trying to prove, and they catch false ones.

## Where to go next

The books that this course leans on most, and that go further:

- **Harold Davenport, *Multiplicative Number Theory*.** The classical theory of $\zeta$ and $L$-functions, the prime number theorem in progressions, the large sieve and Bombieri–Vinogradov, in a short book.:cite[davenport]
- **H. M. Edwards, *Riemann's Zeta Function*.** Riemann's paper, line by line, with everything it led to up to the 1970s, including the computation of zeros.:cite[edwards1974]
- **E. C. Titchmarsh, *The Theory of the Riemann Zeta-Function*** (second edition revised by D. R. Heath-Brown). The reference on $\zeta$ itself.:cite[titchmarsh1986]
- **G. H. Hardy and E. M. Wright, *An Introduction to the Theory of Numbers*.** Elementary and analytic number theory, including the elementary proof of the prime number theorem.:cite[hardy-wright]
- **Richard Crandall and Carl Pomerance, *Prime Numbers: A Computational Perspective*.** Algorithms for primes and factoring, from sieves to the number field sieve.:cite[crandall-pomerance]
- **Henryk Iwaniec and Emmanuel Kowalski, *Analytic Number Theory*.** The modern toolkit: sieves, exponential sums, automorphic forms, and the methods behind bounded gaps.:cite[iwaniec-kowalski]

And Riemann's paper itself, only a few pages long, which repays reading after this course.:cite[riemann1859]

:::key
- The staircase $\pi(x)$ is governed by the zeros of $\zeta$: the PNT is proved; the Riemann Hypothesis, which would give square-root accuracy, is open.
- Open problems cluster around zeros (RH, GRH, Lindelöf), gaps (twin primes, Cramér, Legendre), additive questions (Goldbach) and special forms ($n^2 + 1$, Mersenne, Fermat). Each has a best partial result, and the map links to the chapter that explains it.
- The recurring tools: Euler products, the explicit formula, random models, sieves, the circle method, and positivity.
:::
