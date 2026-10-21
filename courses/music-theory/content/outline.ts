/**
 * The course outline: single source of truth for navigation. A chapter becomes readable when a
 * matching `chapters/<nn>-<slug>/index.md` exists; until then it is listed as planned.
 */

export interface OutlineEntry {
  slug: string;
  number: string;
  title: string;
  summary: string;
  /** The theorem or result the chapter is built around (shown on the home page's timeline). */
  theorem?: string;
  /** Year of that result, for the timeline (negative for BC). */
  year?: number;
  milestone: string;
}

export interface OutlinePart {
  id: string;
  title: string;
  blurb: string;
  chapters: OutlineEntry[];
}

export const COURSE_TITLE = 'The Prime Staircase';
export const COURSE_SUBTITLE = 'From the sieve to the Riemann Hypothesis';

export const PARTS: OutlinePart[] = [
  {
    id: '0',
    title: 'Prologue',
    blurb: 'One graph, π(x), and the question that runs through the whole course.',
    chapters: [
      { slug: 'staircase', number: '0', title: 'The prime staircase', summary: 'Count the primes, draw the staircase, meet Gauss’s guess, and watch the zeros of ζ redraw it.', theorem: 'Gauss’s guess: π(x) ≈ x / log x', year: 1792, milestone: 'M0' },
    ],
  },
  {
    id: 'I',
    title: 'The atoms of arithmetic',
    blurb: 'Divisibility, Euclid’s algorithm, unique factorisation, modular arithmetic and Fermat’s little theorem: everything later chapters stand on.',
    chapters: [
      { slug: 'divisors', number: '1', title: 'Divisors and primes', summary: 'What divides what, why 1 is not prime, and the first algorithm: trial division up to √n.', milestone: 'M1' },
      { slug: 'euclid-algorithm', number: '2', title: 'Euclid’s algorithm', summary: 'The oldest non-trivial algorithm, Bézout’s identity, and Lamé’s bound on its running time.', theorem: 'Lamé’s theorem', year: 1844, milestone: 'M1' },
      { slug: 'unique-factorisation', number: '3', title: 'Unique factorisation', summary: 'Euclid’s lemma, the fundamental theorem of arithmetic, and two worlds where factorisation is not unique.', theorem: 'The fundamental theorem of arithmetic', year: 1801, milestone: 'M1' },
      { slug: 'infinitely-many', number: '4', title: 'Infinitely many primes', summary: 'Euclid’s proof (which is not by contradiction), Fermat numbers, Euler’s product, Furstenberg’s topology and arbitrarily long gaps.', theorem: 'There are infinitely many primes', year: -300, milestone: 'M1' },
      { slug: 'modular-arithmetic', number: '5', title: 'Clock arithmetic', summary: 'Congruences, inverses, the Chinese remainder theorem and exponentiation by squaring.', milestone: 'M1' },
      { slug: 'fermat-euler', number: '6', title: 'Fermat, Euler and the group of units', summary: 'Fermat’s little theorem, Lagrange’s theorem, Euler’s theorem and the existence of primitive roots.', theorem: 'Fermat’s little theorem', year: 1640, milestone: 'M1' },
    ],
  },
  {
    id: 'II',
    title: 'Finding primes',
    blurb: 'Algorithms that list, test, certify and break apart numbers, and the cryptography that rests on them.',
    chapters: [
      { slug: 'sieves', number: '7', title: 'The sieve of Eratosthenes', summary: 'Why the sieve works and costs O(n log log n), and how wheels, segments and a linear sieve make it fast.', theorem: 'The sieve of Eratosthenes', year: -240, milestone: 'M2' },
      { slug: 'probable-primes', number: '8', title: 'Probable primes', summary: 'The Fermat test and the Carmichael numbers that fool it, then Miller–Rabin and the proof that at most a quarter of bases lie.', theorem: 'The Miller–Rabin test', year: 1980, milestone: 'M2' },
      { slug: 'quadratic-residues', number: '9', title: 'Squares modulo p', summary: 'Euler’s criterion, the Legendre and Jacobi symbols, quadratic reciprocity by counting lattice points, and Solovay–Strassen.', theorem: 'Quadratic reciprocity', year: 1796, milestone: 'M2' },
      { slug: 'certificates', number: '10', title: 'Certificates of primality', summary: 'Lucas, Pratt and Pocklington certificates, the Lucas–Lehmer test behind every Mersenne record, and AKS.', theorem: 'The Lucas–Lehmer test', year: 1930, milestone: 'M2' },
      { slug: 'factoring', number: '11', title: 'Taking numbers apart', summary: 'Fermat’s method, Pollard’s ρ and the birthday paradox, and Pollard’s p − 1.', theorem: 'Pollard’s ρ method', year: 1975, milestone: 'M2' },
      { slug: 'quadratic-sieve', number: '12', title: 'The quadratic sieve', summary: 'Smooth numbers, factor bases, linear algebra over GF(2), and the road to the number field sieve.', theorem: 'The quadratic sieve', year: 1981, milestone: 'M2' },
      { slug: 'cryptography', number: '13', title: 'Primes in cryptography', summary: 'RSA and Diffie–Hellman, how large primes are generated, and what Shor’s algorithm would change.', theorem: 'RSA', year: 1977, milestone: 'M2' },
    ],
  },
  {
    id: 'III',
    title: 'Counting primes',
    blurb: 'How many primes are there up to x? Gauss’s guess, fast exact counting, Chebyshev’s bounds and Mertens’ theorems.',
    chapters: [
      { slug: 'gauss', number: '14', title: 'Gauss’s guess', summary: 'Tables of primes, the density 1/log x, the logarithmic integral and the language of asymptotics.', theorem: 'π(x) ~ x / log x (conjectured)', year: 1849, milestone: 'M3' },
      { slug: 'counting', number: '15', title: 'Counting without listing', summary: 'Legendre’s formula, Meissel and Lehmer, and an O(x^¾) algorithm that counts the primes below 10¹⁰ in a second.', theorem: 'Meissel’s formula', year: 1870, milestone: 'M3' },
      { slug: 'chebyshev', number: '16', title: 'Chebyshev’s bounds', summary: 'θ, ψ and Λ; the central binomial coefficient; π(x) is of order x/log x; Bertrand’s postulate.', theorem: 'Chebyshev’s bounds', year: 1850, milestone: 'M3' },
      { slug: 'mertens', number: '17', title: 'Mertens’ theorems', summary: 'Abel summation, the sums Σ log p / p and Σ 1/p, and Mertens’ product formula.', theorem: 'Mertens’ theorems', year: 1874, milestone: 'M3' },
      { slug: 'random', number: '18', title: 'Are the primes random?', summary: 'Cramér’s model, gaps between primes, the Hardy–Littlewood conjectures, and Maier’s warning.', theorem: 'Cramér’s model', year: 1936, milestone: 'M3' },
    ],
  },
  {
    id: 'IV',
    title: 'The zeta function',
    blurb: 'Euler’s product turns the primes into a function. Riemann extends it to the complex plane, and its zeros rebuild the staircase.',
    chapters: [
      { slug: 'euler-product', number: '19', title: 'Euler’s product', summary: 'Dirichlet series, the Euler product, ζ(2) = π²/6, Möbius inversion, and the series that encodes the primes.', theorem: 'The Euler product', year: 1737, milestone: 'M4' },
      { slug: 'complex-zeta', number: '20', title: 'Zeta in the complex plane', summary: 'Complex powers, analytic continuation past the line where the series stops converging, and the pole at s = 1.', theorem: 'Analytic continuation of ζ', year: 1859, milestone: 'M4' },
      { slug: 'functional-equation', number: '21', title: 'The functional equation', summary: 'The Gamma function, the theta function and Poisson summation give Riemann’s symmetry s ↔ 1 − s.', theorem: 'The functional equation of ζ', year: 1859, milestone: 'M4' },
      { slug: 'zeros', number: '22', title: 'Finding the zeros', summary: 'Hardy’s Z function, the Riemann–Siegel formula, Gram points and counting zeros with the argument principle.', theorem: 'The Riemann–von Mangoldt formula', year: 1905, milestone: 'M4' },
      { slug: 'explicit-formula', number: '23', title: 'Riemann’s explicit formula', summary: 'Perron’s formula and the sum over zeros: the prime staircase rebuilt, wave by wave, from the zeros of ζ.', theorem: 'Riemann’s explicit formula', year: 1895, milestone: 'M4' },
    ],
  },
  {
    id: 'V',
    title: 'The prime number theorem',
    blurb: 'Gauss’s guess becomes a theorem: first the plan, then every step in full.',
    chapters: [
      { slug: 'pnt-plan', number: '24', title: 'The plan', summary: 'What has to be shown, why the line Re s = 1 is the crux, and the whole proof in five steps.', theorem: 'The prime number theorem', year: 1896, milestone: 'M5' },
      { slug: 'no-zeros-on-one', number: '25', title: 'No zeros on the line Re s = 1', summary: 'The inequality 3 + 4 cos θ + cos 2θ ≥ 0 and the proof that ζ(1 + it) ≠ 0.', theorem: 'ζ(1 + it) ≠ 0', year: 1896, milestone: 'M5' },
      { slug: 'pnt-proof', number: '26', title: 'The proof in full', summary: 'Newman’s analytic theorem, the integral of ψ(x) − x, and from ψ(x) ~ x to π(x) ~ x / log x.', theorem: 'Newman’s proof', year: 1980, milestone: 'M5' },
      { slug: 'error-terms', number: '27', title: 'Beyond the main term', summary: 'The zero-free region and the error term, Selberg’s formula, and the elementary proof.', theorem: 'The elementary proof of the PNT', year: 1949, milestone: 'M5' },
    ],
  },
  {
    id: 'VI',
    title: 'The Riemann Hypothesis',
    blurb: 'The most famous open problem in mathematics: what it says about the primes, its many disguises, and the evidence.',
    chapters: [
      { slug: 'riemann-hypothesis', number: '28', title: 'The Riemann Hypothesis', summary: 'The statement, why it is equivalent to the best possible error term for π(x), and what has been verified.', theorem: 'The Riemann Hypothesis (open)', year: 1859, milestone: 'M6' },
      { slug: 'faces', number: '29', title: 'Faces of the Riemann Hypothesis', summary: 'The Möbius random walk, Mertens’ conjecture and its fall, Redheffer’s matrix, Robin and Lagarias.', theorem: 'Mertens’ conjecture is false', year: 1985, milestone: 'M6' },
      { slug: 'littlewood', number: '30', title: 'When Li(x) falls behind', summary: 'Littlewood’s theorem that π(x) − Li(x) changes sign infinitely often, and Skewes’ enormous numbers.', theorem: 'Littlewood’s theorem', year: 1914, milestone: 'M6' },
      { slug: 'random-matrices', number: '31', title: 'Zeros and random matrices', summary: 'Montgomery’s pair correlation, a conversation over tea with Dyson, and Odlyzko’s computations.', theorem: 'Montgomery’s pair correlation', year: 1973, milestone: 'M6' },
      { slug: 'finite-fields', number: '32', title: 'The Riemann Hypothesis over finite fields', summary: 'Counting points on curves modulo p, Hasse’s bound, and the theorems of Weil and Deligne.', theorem: 'Hasse’s theorem', year: 1933, milestone: 'M6' },
    ],
  },
  {
    id: 'VII',
    title: 'Primes in patterns',
    blurb: 'Primes in progressions, in races, in the Gaussian integers, in pairs and in sums.',
    chapters: [
      { slug: 'dirichlet', number: '33', title: 'Primes in arithmetic progressions', summary: 'Characters, L-functions, L(1, χ) ≠ 0 and Dirichlet’s theorem.', theorem: 'Dirichlet’s theorem', year: 1837, milestone: 'M7' },
      { slug: 'prime-races', number: '34', title: 'Prime races', summary: 'Why primes ≡ 3 (mod 4) usually lead, and how the zeros of L-functions explain the bias.', theorem: 'Rubinstein–Sarnak: Chebyshev’s bias explained', year: 1994, milestone: 'M7' },
      { slug: 'gaussian-primes', number: '35', title: 'Gaussian primes', summary: 'Primes in ℤ[i], Fermat’s two-squares theorem twice over, and the Gaussian moat.', theorem: 'Fermat’s two-squares theorem', year: 1749, milestone: 'M7' },
      { slug: 'twin-primes', number: '36', title: 'Twin primes and bounded gaps', summary: 'Brun’s theorem, sieve methods, and the breakthroughs of Zhang and Maynard.', theorem: 'Bounded gaps between primes', year: 2013, milestone: 'M7' },
      { slug: 'goldbach', number: '37', title: 'Goldbach and friends', summary: 'The Goldbach comet, the circle method, Vinogradov and Helfgott, and Green–Tao.', theorem: 'Ternary Goldbach', year: 2013, milestone: 'M7' },
      { slug: 'open-problems', number: '38', title: 'Epilogue: the map of the unknown', summary: 'Every open problem in the course, its status and its best partial result.', milestone: 'M7' },
    ],
  },
];

export const APPENDICES: OutlineEntry[] = [
  { slug: 'complex-analysis', number: 'A', title: 'Complex analysis, again', summary: 'Everything the course uses: holomorphy, contour integrals, Cauchy, residues, continuation and the argument principle.', milestone: 'M4' },
  { slug: 'asymptotics', number: 'B', title: 'Asymptotics and summation', summary: 'O, o, ~ and ≪; Abel summation; Euler–Maclaurin; γ; Stirling.', milestone: 'M3' },
  { slug: 'fourier', number: 'C', title: 'Fourier analysis and Poisson summation', summary: 'Fourier analysis on ℤ/qℤ and on ℝ, Poisson summation and the theta function.', milestone: 'M4' },
  { slug: 'gamma-function', number: 'D', title: 'The Gamma function', summary: 'Definition, functional equation, reflection and duplication, and Stirling’s formula.', milestone: 'M4' },
  { slug: 'algebra', number: 'E', title: 'The algebra minimum', summary: 'Groups, rings and fields, cyclic groups and polynomials: just what the course needs.', milestone: 'M1' },
  { slug: 'library', number: 'F', title: 'The primes library', summary: 'Every function that code exercises and widgets can import from primes.', milestone: 'M7' },
  { slug: 'reference', number: 'G', title: 'Glossary, timeline and bibliography', summary: 'Every term, date and source in the course.', milestone: 'M7' },
];
