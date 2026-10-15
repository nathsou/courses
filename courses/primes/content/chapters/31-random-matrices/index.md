---
number: 31
title: Zeros and random matrices
summary: "How the zeros of ζ are spaced: Montgomery’s pair correlation, the conversation at tea with Freeman Dyson that linked it to the eigenvalues of random Hermitian matrices, Odlyzko’s computations, and the Hilbert–Pólya dream of a self-adjoint operator whose eigenvalues are the zeros."
duration: About 1 hour
prerequisites: [zeros, riemann-hypothesis]
theorems: [Montgomery’s pair correlation theorem, The GUE conjecture (open), Keating–Snaith moment conjectures (open)]
techniques: [unfolding, pair correlation, random matrix ensembles]
---

Chapter 22 found the zeros and counted them. Their average spacing at height $T$ is $\frac{2\pi}{\log(T/2\pi)}$. This chapter asks how they are spaced in detail: are they like random points thrown independently on a line, or do they have structure? The answer connects the primes to the physics of heavy nuclei.

## Unfolding

The zeros get denser as they go up, so to compare spacings at different heights we rescale. The smooth zero count $\bar N(t) = \frac{\theta(t)}{\pi} + 1$ (Chapter 22) maps each ordinate $\gamma_n$ to $x_n = \bar N(\gamma_n)$, and the **unfolded** points $x_n$ have average spacing $1$ at every height. The question becomes: what is the distribution of the gaps $x_{n+1} - x_n$?

If the zeros behaved like independent random points (a Poisson process), small gaps would be the most common, with density $e^{-s}$: about $22\%$ of gaps would be less than $\frac14$. For the first $10{,}000$ zeros the actual figure is under $1\%$. The zeros **repel** each other.

## Montgomery’s pair correlation

In 1972 Hugh Montgomery studied the **pair correlation** of the zeros: for $0 < a < b$, how many pairs of zeros up to height $T$ have unfolded distance in $[a, b]$? For independent points the answer would be proportional to $b - a$.

:::theorem{name="Montgomery" year=1973 status=stated}
Assume the Riemann Hypothesis. Then for test functions whose Fourier transform is supported in $(-1, 1)$, the pair correlation of the zeros is
$$1 - \left(\frac{\sin\pi u}{\pi u}\right)^2,$$
in the sense that the number of pairs $\gamma, \gamma'$ up to height $T$ with $\frac{\log T}{2\pi}(\gamma - \gamma')$ near $u$ has density $1 - \left(\frac{\sin\pi u}{\pi u}\right)^2$ relative to independent points.
:::

He conjectured that the formula holds for all test functions. Montgomery’s method is the explicit formula of Chapter 23 run in reverse: sums over pairs of zeros become sums over primes, and the Hardy–Littlewood conjectures about prime pairs (Chapter 18) are exactly what one would need to extend his theorem to all test functions.:cite[montgomery1973]

The density $1 - (\sin\pi u/\pi u)^2$ vanishes at $u = 0$: zeros avoid each other at short range, and the correlation decays to $1$ (no correlation) at long range, with gentle oscillations.

## Tea with Dyson

In April 1972 Montgomery visited the Institute for Advanced Study in Princeton. At afternoon tea, Sarvadaman Chowla introduced him to the physicist Freeman Dyson. When Montgomery described his formula, Dyson recognised it at once: it is the pair correlation function of the eigenvalues of large random Hermitian matrices, the **Gaussian Unitary Ensemble (GUE)**, which Dyson and others had studied as models for the energy levels of heavy atomic nuclei.

:::definition
A **GUE matrix** of size $n$ is a random Hermitian matrix $H$ whose diagonal entries are real normal variables of variance $1$ and whose entries above the diagonal are complex normal variables with independent real and imaginary parts of variance $\frac12$, all independent. Its distribution is invariant under conjugation by unitary matrices.
:::

The eigenvalues of such a matrix are real and fill out a semicircle; after unfolding, their pair correlation tends to $1 - (\sin\pi u/\pi u)^2$ as $n \to \infty$, and their nearest-neighbour spacings follow a distribution (computed by Gaudin and Mehta) that is very close to the **Wigner surmise**
$$p(s) = \frac{32}{\pi^2}s^2e^{-4s^2/\pi}.$$
The factor $s^2$ is the repulsion: the joint density of eigenvalues contains $\prod_{i < j}|\lambda_i - \lambda_j|^2$, which vanishes when two of them meet.

::spacings

The widget computes GUE eigenvalues without complex linear algebra. Ioana Dumitriu and Alan Edelman showed in 2002 that a real symmetric tridiagonal matrix with independent normal diagonal entries and $\chi$-distributed off-diagonal entries has exactly the same eigenvalue distribution as GUE,:cite[dumitriu-edelman2002] and the eigenvalues of a tridiagonal matrix are easy to find by bisection, counting sign changes of a Sturm sequence. That is the library function `gueEigenvalues`.

## Odlyzko’s computations

Is the agreement real, or an artefact of low zeros? From 1987 onwards Andrew Odlyzko computed hundreds of millions of zeros near the $10^{20}$-th, and later near the $10^{22}$-nd and $10^{23}$-rd, using a fast algorithm for evaluating many values of $\zeta$ at once (Odlyzko–Schönhage). The spacing histograms match the GUE predictions to within the statistical noise, far better than the first $10{,}000$ zeros do. This is now one of the most striking experimental facts in mathematics.:cite[odlyzko-zeros]

:::conjecture{name="GUE conjecture" who="Montgomery; Dyson; Odlyzko"}
The unfolded zeros of $\zeta$ have, in the limit, the same local statistics (spacings, pair and higher correlations) as the eigenvalues of large GUE matrices.
:::

Rudnick and Sarnak proved in 1996 that the higher correlations agree with GUE for restricted test functions, extending Montgomery’s theorem. Keating and Snaith used random matrix theory in 2000 to conjecture the precise asymptotics of the moments $\frac1T\int_0^T|\zeta(\frac12 + it)|^{2k}dt$, recovering the two cases $k = 1, 2$ known from Hardy–Littlewood and Ingham and matching the predictions for $k = 3, 4$ that number theorists had obtained by other means.:cite[keating-snaith2000]

## Hilbert and Pólya

Why would zeros of $\zeta$ behave like eigenvalues? A suggestion attributed to Hilbert and to Pólya (around 1914, though nothing was published) is that the Riemann Hypothesis has a spectral explanation: there might be a self-adjoint operator whose eigenvalues are the ordinates $\gamma$ of the zeros. Self-adjoint operators have real eigenvalues, so $\frac12 + i\gamma$ would have real part $\frac12$. The GUE statistics, which are those of a system without time-reversal symmetry, are a clue to what such an operator would look like. Michael Berry and Jon Keating proposed in 1999 that a quantisation of the classical Hamiltonian $H = xp$ is a candidate, and the explicit formula then plays the role of a “trace formula” relating eigenvalues (zeros) to periodic orbits (prime powers, with periods $\log p^k$). Nobody has found the operator.

Chapter 32 shows a setting where the analogue of the Hilbert–Pólya idea works perfectly: for curves over finite fields, the zeros are eigenvalues of an explicit operator (Frobenius), and the analogue of RH is a theorem.

```quiz
q: 'What does the factor $\prod_{i<j}|\lambda_i - \lambda_j|^2$ in the GUE eigenvalue density imply?'
options:
  - text: Very small spacings are rare; the spacing density vanishes like $s^2$ at $s = 0$.
    correct: true
    why: 'When two eigenvalues approach each other, the density goes to zero quadratically; this is "level repulsion".'
  - text: The eigenvalues are complex.
    why: Hermitian matrices have real eigenvalues; the factor only says how they are spaced.
  - text: The eigenvalues are uniformly distributed.
    why: Their density is a semicircle, and after unfolding they are far more regular than uniform random points.
```

:::key
- Unfold the zeros by $x_n = \theta(\gamma_n)/\pi + 1$ to get mean spacing $1$. Their gaps are not like random points: small gaps are rare (repulsion).
- Montgomery (1973, on RH, restricted test functions): pair correlation $1 - (\sin\pi u/\pi u)^2$. Dyson recognised it as the GUE eigenvalue pair correlation.
- Odlyzko’s computations near the $10^{20}$-th zero and beyond match GUE spacings closely. The GUE conjecture is open; random matrix theory also predicts moments of $\zeta$ (Keating–Snaith).
- Hilbert–Pólya: the zeros might be eigenvalues of a self-adjoint operator, which would prove RH. Over finite fields this is exactly what happens (Chapter 32).
:::

:::exercises
1. Show that the unfolded points $x_n = \bar N(\gamma_n)$ have average spacing $1$, using $N(T) = \bar N(T) + S(T)$ with $S(T) = O(\log T)$.
2. For independent uniform points with mean spacing $1$, show that the gap distribution tends to $e^{-s}$ and that the fraction of gaps below $\frac14$ tends to $1 - e^{-1/4} \approx 0.221$.
3. Show that the Wigner surmise $p(s) = \frac{32}{\pi^2}s^2e^{-4s^2/\pi}$ is a probability density with mean $1$.
4. For a $2 \times 2$ real symmetric matrix $\begin{pmatrix}a & b\\ b & c\end{pmatrix}$ with independent normal entries, the eigenvalue gap is $\sqrt{(a - c)^2 + 4b^2}$. Explain why small gaps are rare (two independent quantities must both be small), and why for complex Hermitian matrices (three quantities) they are rarer still.
:::
