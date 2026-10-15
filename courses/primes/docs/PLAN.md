# Course plan — *The Prime Staircase*

The living plan for the course: agreed decisions, curriculum, conventions and milestones. Update it when
decisions change or chapters land.

The course explains the prime numbers from scratch: what they are, how to find them, how to count them,
and why counting them leads to the Riemann zeta function and the Riemann Hypothesis. One picture runs
through it: the **prime staircase**, the graph of the prime-counting function π(x), which climbs by one at
every prime. Part I draws it by hand; Part III estimates and bounds it; Part IV rebuilds it, step for
step, from the zeros of ζ; Part V proves that it follows Gauss's curve; Part VI asks how closely.

## Decisions (agreed 2026-10-14)

| Topic | Decision | Notes |
|---|---|---|
| Title | **The Prime Staircase** | Subtitle: *from the sieve to the Riemann Hypothesis*. Slug `primes`, published at `/primes/`. |
| Reader | **A software engineer** | Comfortable with code, algebra and calculus; took a complex-analysis course about eight years ago and has forgotten most of it. Nothing beyond school algebra is assumed in the main text without a reminder; the background lives in the appendices (complex analysis, asymptotics, Fourier analysis, the Gamma function, the algebra minimum), each linked where it is first needed. |
| Independence | **Self-contained** | Topics that other courses cover (Proofcraft: Euclid's theorem, unique factorisation, Fermat's little theorem, two squares, quadratic reciprocity, the Basel problem; Euclid's *Elements*, Books VII–IX) are taught here in full. A *Bridge* callout may point to the other treatment, never replace it. |
| Proofs | **Sketch first, then the full proof** | Every major theorem is introduced with an idea and a sketch, then proved in full. The `::::zoom{levels="Idea, Sketch, Proof"}` directive carries short proofs; long ones (the prime number theorem above all) get a *plan* section or chapter followed by the complete proof. Each theorem is labelled **proved**, **sketched** or **stated**, and the label is honest: the explicit formula, AKS, the circle method, Zhang–Maynard and Weil's theorem are sketched or stated, and the text says so. |
| Algorithms | **Inline** | Algorithms are chapters of the main sequence (Part II and parts of III and IV), not a separate track. |
| Code | TypeScript in the browser | Code exercises (CodeMirror 6, sucrase in a Web Worker, hidden tests), the runner ported from Particle Physics. Exercises import the course library as `primes`. `bigint` where numbers outgrow 2⁵³. |
| Library | `src/lib/primes` | Sieves, primality, factoring, counting, complex arithmetic, ζ and L-functions, characters, Gaussian integers, point counting. Pure TypeScript, no DOM; every module tested. Widgets and exercises share it. |
| Zeros of ζ | Computed by the course | `scripts/zeros.mjs` computes the first zeros with the course's own Riemann–Siegel code and refines them; the shipped table (`static/data/zeros.json`) is tested against known values (Odlyzko's published first zeros) to 10⁻⁸. No third-party data tables are shipped. |
| Site | SvelteKit 2 + Svelte 5 (runes), `adapter-static`, the Markdown-with-directives compiler from Proofcraft | Single npm package. Output `dist/`; base path `BASE_PATH`, or `COURSES_BASE_PATH + /primes`. TypeScript 6. |
| Exercises | Code, quiz, step checker, blanks, Parsons, spot-the-bug, write-a-proof (self-reviewed against a rubric), numeric predictions | Feedback says what was established (CONTRIBUTING.md): *tests passed*, *answer checked*, *self-reviewed*, *step checked*. |
| Charts | Our own SVG/Canvas components (Proofcraft's `Plot`, `Histogram`, `Bars`) with d3-scale | No charting library. Respect `prefers-reduced-motion`. |
| Sound | Web Audio for the "music of the primes" in the explicit-formula chapter | Off by default. |
| Design | **"Ledger"** | After the printed factor tables of D. N. Lehmer (1909, 1914) and the counts Gauss kept by hand: ruled paper, black ink, one red rubric colour for primes. Dark theme: night ledger, warm ink on deep blue-black, amber primes. Fonts: Fraunces (display), IBM Plex Sans (UI), Source Serif 4 (prose), JetBrains Mono (numbers and code). Shares the collection's `theme` key. |
| Language | British English | |

## Through-lines

1. **The staircase.** π(x) appears in the prologue and in almost every part: drawn (Ch. 0, 7), estimated
   (14), computed (15), bounded (16), rebuilt from zeros (23), shown to follow Li(x) (26), and compared with
   Li(x) under RH (28, 30).
2. **The library you grow.** Code exercises build `isPrime`, `gcd`, `modPow`, a sieve, Miller–Rabin,
   Pollard ρ, a Lucy-style prime counter and a zero finder. Every exercise has a reference implementation
   in `src/lib/primes`, so skipping one never blocks later chapters.
3. **Proof honesty.** Every theorem shows a status chip: proved, sketched or stated.

## Chapter template

Front matter: `number`, `title`, `summary`, `duration`, `prerequisites` (slugs), `theorems`, `techniques`.
Then, in order:

1. An opening question or example that can be explored before any definition, usually a widget.
2. Named sessions (`##`), each with an outcome, ending at natural stopping points (`:::note` **A stopping point**).
3. Theorems with statuses; proofs as zoom levels or sketch-then-proof sections.
4. One to three activities that reveal the central idea (prediction, calculation, code, proof).
5. *Bridges* to other courses where they exist.
6. A short summary (`:::key`) and exercises (`:::exercises`) at the end.

## Curriculum

### Prologue
- **0 · The prime staircase.** Primes, π(x), Gauss's guess, and a preview of the zeros redrawing the staircase.

### Part I — The atoms of arithmetic
1. **Divisors and primes.** Divisibility, primes, trial division to √n. *You write:* `isPrime`.
2. **Euclid's algorithm.** gcd, extended Euclid, Bézout, Lamé's bound. *You write:* `extendedGcd`.
3. **Unique factorisation.** Euclid's lemma, the fundamental theorem, worlds where it fails (Hilbert numbers, ℤ[√−5]).
4. **Infinitely many primes.** Euclid (direct, not by contradiction), Fermat numbers, Euler's product, Furstenberg, long gaps, primes 4k+3.
5. **Clock arithmetic.** ℤ/nℤ, inverses, the Chinese remainder theorem, fast exponentiation. *You write:* `modPow`.
6. **Fermat, Euler and the group of units.** Fermat's little theorem, Lagrange, Euler's theorem, primitive roots (proved), discrete logarithms.

### Part II — Finding primes
7. **The sieve of Eratosthenes.** Correctness, O(n log log n), wheels, segmented and linear sieves, prime spirals. *You write:* a sieve.
8. **Probable primes.** Fermat test, Carmichael numbers (Korselt), Miller–Rabin with the ¼ bound proved, deterministic bases. *You write:* Miller–Rabin.
9. **Squares modulo p.** Euler's criterion, Legendre and Jacobi symbols, quadratic reciprocity (Eisenstein's lattice proof), Solovay–Strassen, square roots mod p.
10. **Certificates of primality.** Lucas, Pratt (PRIMES ∈ NP), Pocklington, Lucas–Lehmer (proved) and GIMPS, AKS (sketched).
11. **Taking numbers apart.** Fermat's method, Pollard ρ (birthday paradox, Floyd), Pollard p − 1. *You write:* Pollard ρ.
12. **The quadratic sieve.** Smooth numbers, Dickman's ρ, factor bases, linear algebra over GF(2), the number field sieve in outline.
13. **Primes in cryptography.** RSA (correctness proved), Diffie–Hellman, generating large primes, Shor's algorithm in outline.

### Part III — Counting primes
14. **Gauss's guess.** Tables of π(x), x/log x and Li(x), asymptotic notation, density 1/log x.
15. **Counting without listing.** Legendre's formula, Meissel–Lehmer, the Lucy/Lagarias-style O(x^¾) algorithm. *You write:* a prime counter for x = 10¹⁰.
16. **Chebyshev's bounds.** θ, ψ and Λ, the central binomial coefficient, π(x) ≍ x/log x, Bertrand's postulate (Erdős).
17. **Mertens' theorems.** Abel summation, Σ log p/p, Σ 1/p = log log x + M, Mertens' product.
18. **Are the primes random?** Cramér's model, gaps, the Hardy–Littlewood k-tuple conjecture and singular series, Maier's surprise.

### Part IV — The zeta function
19. **Euler's product.** Dirichlet series, the Euler product, ζ(2), Möbius inversion, Dirichlet convolution, −ζ′/ζ = Σ Λ(n) n⁻ˢ.
20. **Zeta in the complex plane.** Complex powers, continuation to Re s > 0 (η) and beyond (Euler–Maclaurin), the pole, domain colouring.
21. **The functional equation.** Γ, θ and Poisson summation; Riemann's second proof in full; ξ, trivial zeros, the critical strip.
22. **Finding the zeros.** Hardy's Z(t), Riemann–Siegel, Gram points, the argument principle and N(T). *You write:* a zero finder.
23. **Riemann's explicit formula.** Perron's formula, the sum over zeros, the staircase rebuilt from zeros (the flagship widget), Riemann's R(x).

### Part V — The prime number theorem
24. **The plan.** What has to be shown, Hadamard and de la Vallée Poussin (1896), the sketch in five steps.
25. **No zeros on the line Re s = 1.** The 3 + 4 cos θ + cos 2θ ≥ 0 inequality, proved.
26. **The proof in full.** Newman's analytic theorem and Zagier's write-up, from ψ(x) ~ x to π(x) ~ x/log x.
27. **Beyond the main term.** The zero-free region and the error term, Selberg's formula and the elementary proof of Erdős and Selberg.

### Part VI — The Riemann Hypothesis
28. **The Riemann Hypothesis.** The statement, RH ⇔ π(x) = Li(x) + O(√x log x), Schoenfeld's bound, the computational record.
29. **Faces of the Riemann Hypothesis.** The Möbius walk, Mertens' conjecture and its fall, Redheffer's matrix, Robin and Lagarias.
30. **When Li(x) falls behind.** Littlewood's theorem, Skewes' numbers, logarithmic density.
31. **Zeros and random matrices.** Montgomery's pair correlation, Dyson, Odlyzko's computations, GUE spacings.
32. **The Riemann Hypothesis over finite fields.** Counting points mod p, Hasse's bound, the zeta function of a curve, Weil and Deligne.

### Part VII — Primes in patterns
33. **Primes in arithmetic progressions.** Characters, L-functions, L(1, χ) ≠ 0, Dirichlet's theorem proved.
34. **Prime races.** Chebyshev's bias explained by the zeros, Rubinstein–Sarnak.
35. **Gaussian primes.** ℤ[i], Fermat's two-squares theorem (two proofs), the Gaussian moat.
36. **Twin primes and bounded gaps.** Brun's theorem, Selberg's sieve, GPY, Zhang, Maynard, Polymath.
37. **Goldbach and friends.** The Goldbach comet, the circle method in outline, Vinogradov, Helfgott, Chen, Green–Tao.
38. **Epilogue: the map of the unknown.** Every open problem in the course, its status and its best partial result.

### Appendices
- **A · Complex analysis, again.** Complex numbers, exp and log, holomorphy, power series, contour integrals, Cauchy, residues, analytic continuation, the argument principle.
- **B · Asymptotics and summation.** O, o, ~, ≪; Abel summation; Euler–Maclaurin; harmonic numbers and γ; Stirling.
- **C · Fourier analysis and Poisson summation.** Finite Fourier analysis on ℤ/qℤ, the Fourier transform, Poisson summation, θ.
- **D · The Gamma function.** Definition, functional equation, reflection and duplication, Stirling in the complex plane.
- **E · The algebra minimum.** Groups, rings, fields, cyclic groups, polynomials over fields.
- **F · The `primes` library.** Reference for every module the exercises can import.
- **G · Glossary, timeline and bibliography.**

## Milestones

| | Scope | Status |
|---|---|---|
| M0 | Scaffold (site, compiler, code runner, design "Ledger", library skeleton), Prologue, monorepo wiring, PR | done |
| M1 | Part I and appendix E | done |
| M2 | Part II | done (Miller–Rabin: the ½ bound proved, the ¼ bound sketched) |
| M3 | Part III and appendix B | done |
| M4 | Part IV and appendices A, C, D; zeros table | done (explicit formula sketched; everything it needs proved or stated) |
| M5 | Part V | done (PNT proved in full via Newman; zero-free region, error terms and the elementary proof sketched) |
| M6 | Part VI | done (equivalences proved where short; Littlewood, Montgomery, Hasse sketched; Weil, Deligne, Sato–Tate stated) |
| M7 | Part VII, epilogue, appendices F and G | |
| M8 | Proofread, UX review at phone and desktop widths in both themes, final checks | |

## Facts and sources

Every date, record and numerical claim is cited in `content/bibliography.yaml`, or computed by a test in
`src/lib/primes`. Values of π(x) beyond what the library computes are quoted from OEIS A006880 and cited.
When a source could not be checked, say less.
