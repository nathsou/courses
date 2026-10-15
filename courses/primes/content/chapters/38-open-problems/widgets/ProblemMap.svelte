<!--
  The map of the unknown: the open problems met in the course (and a few solved ones for contrast), with their status,
  the best partial result, and the chapter where they appear. Filter by status or theme.
-->
<script lang="ts">
  import { base } from '$app/paths';
  import Widget from '$lib/components/ui/Widget.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';

  interface Problem {
    name: string;
    year: number;
    statement: string;
    status: 'open' | 'solved';
    best: string;
    theme: 'zeta' | 'gaps' | 'additive' | 'forms' | 'other';
    chapter: string;
    slug: string;
  }
  const P: Problem[] = [
    { name: 'Riemann Hypothesis', year: 1859, statement: 'Every nontrivial zero of ζ has real part ½.', status: 'open', best: 'All zeros up to height 3·10¹² are on the line; more than 41% of all zeros are; no zeros with σ > 1 − c/(log t)^(2/3)(log log t)^(1/3).', theme: 'zeta', chapter: '28', slug: 'riemann-hypothesis' },
    { name: 'Generalised Riemann Hypothesis', year: 1884, statement: 'The same for every Dirichlet L-function.', status: 'open', best: 'Zero-free regions as for ζ, except for a possible Siegel zero.', theme: 'zeta', chapter: '33', slug: 'dirichlet' },
    { name: 'Lindelöf Hypothesis', year: 1908, statement: 'ζ(½ + it) = O(|t|^ε) for every ε > 0.', status: 'open', best: 'ζ(½ + it) = O(|t|^(13/84 + ε)) (Bourgain, 2017). Implied by RH.', theme: 'zeta', chapter: '28', slug: 'riemann-hypothesis' },
    { name: 'GUE conjecture', year: 1973, statement: 'The local statistics of the zeros match random Hermitian matrices.', status: 'open', best: 'Pair correlation for restricted test functions, on RH (Montgomery); higher correlations (Rudnick–Sarnak).', theme: 'zeta', chapter: '31', slug: 'random-matrices' },
    { name: 'First crossing of π and li', year: 1914, statement: 'Where does π(x) first exceed li(x)?', status: 'open', best: 'Not below 10¹⁹ (Büthe); a crossing exists near 1.397·10³¹⁶ (Bays–Hudson, Saouter–Demichel).', theme: 'zeta', chapter: '30', slug: 'littlewood' },
    { name: 'Twin prime conjecture', year: 1849, statement: 'Infinitely many primes p with p + 2 prime.', status: 'open', best: 'Gaps ≤ 246 infinitely often (Maynard, Polymath); p + 2 prime or a product of two primes infinitely often (Chen).', theme: 'gaps', chapter: '36', slug: 'twin-primes' },
    { name: 'Prime k-tuples conjecture', year: 1923, statement: 'Every admissible pattern occurs infinitely often, with the Hardy–Littlewood frequency.', status: 'open', best: 'Some pair from any admissible 50-tuple occurs infinitely often (Maynard).', theme: 'gaps', chapter: '18', slug: 'random' },
    { name: 'Cramér’s conjecture', year: 1936, statement: 'p_{n+1} − p_n = O((log p_n)²).', status: 'open', best: 'O(p^0.525) unconditionally (Baker–Harman–Pintz); O(√p log p) on RH.', theme: 'gaps', chapter: '18', slug: 'random' },
    { name: 'Legendre’s conjecture', year: 1912, statement: 'There is a prime between n² and (n + 1)² (one of Landau’s four problems).', status: 'open', best: 'A prime in [x, x + x^0.525] for large x; Legendre needs x^0.5.', theme: 'gaps', chapter: '16', slug: 'chebyshev' },
    { name: 'Goldbach’s conjecture', year: 1742, statement: 'Every even n ≥ 4 is a sum of two primes.', status: 'open', best: 'Verified to 4·10¹⁸; almost all even n; every large even n = p + P₂ (Chen).', theme: 'additive', chapter: '37', slug: 'goldbach' },
    { name: 'Primes n² + 1', year: 1912, statement: 'Infinitely many primes of the form n² + 1 (Landau’s fourth problem).', status: 'open', best: 'n² + 1 is a product of at most two primes infinitely often (Iwaniec, 1978).', theme: 'forms', chapter: '35', slug: 'gaussian-primes' },
    { name: 'Bunyakovsky’s conjecture', year: 1857, statement: 'Every irreducible integer polynomial without a fixed prime divisor takes infinitely many prime values.', status: 'open', best: 'Known only in degree 1 (Dirichlet). Two-variable forms such as a² + b⁴ are known (Friedlander–Iwaniec).', theme: 'forms', chapter: '35', slug: 'gaussian-primes' },
    { name: 'Infinitely many Mersenne primes', year: 1644, statement: 'Infinitely many primes 2ⁿ − 1.', status: 'open', best: '52 were known in October 2024, when the largest, 2^136279841 − 1, was found.', theme: 'forms', chapter: '10', slug: 'certificates' },
    { name: 'Fermat primes', year: 1640, statement: 'Are there Fermat primes 2^(2ⁿ) + 1 beyond n = 4?', status: 'open', best: 'F₅ to F₃₂ are composite.', theme: 'forms', chapter: '10', slug: 'certificates' },
    { name: 'Artin’s conjecture', year: 1927, statement: '2 is a primitive root modulo infinitely many primes.', status: 'open', best: 'True on GRH (Hooley, 1967); one of 2, 3, 5 works (Heath-Brown, 1986).', theme: 'other', chapter: '6', slug: 'fermat-euler' },
    { name: 'Gaussian moat', year: 1962, statement: 'Can one walk to infinity on Gaussian primes with bounded steps?', status: 'open', best: 'Not with steps of length √26 (Gethner–Wagon–Wick).', theme: 'other', chapter: '35', slug: 'gaussian-primes' },
    { name: 'Irrationality of ζ(5)', year: 1978, statement: 'Is ζ(5) irrational?', status: 'open', best: 'ζ(3) is (Apéry); one of ζ(5), ζ(7), ζ(9), ζ(11) is (Zudilin); infinitely many ζ(2k + 1) are (Ball–Rivoal).', theme: 'zeta', chapter: '19', slug: 'euler-product' },
    { name: 'Prime number theorem', year: 1792, statement: 'π(x) ~ x/log x.', status: 'solved', best: 'Hadamard and de la Vallée Poussin, 1896.', theme: 'zeta', chapter: '26', slug: 'pnt-proof' },
    { name: 'Dirichlet’s theorem', year: 1837, statement: 'Infinitely many primes ≡ a (mod q) when gcd(a, q) = 1.', status: 'solved', best: 'Dirichlet, 1837.', theme: 'other', chapter: '33', slug: 'dirichlet' },
    { name: 'Bertrand’s postulate', year: 1845, statement: 'A prime between n and 2n.', status: 'solved', best: 'Chebyshev, 1852.', theme: 'gaps', chapter: '16', slug: 'chebyshev' },
    { name: 'Primes is in P', year: 1801, statement: 'Primality can be decided in polynomial time.', status: 'solved', best: 'Agrawal, Kayal and Saxena, 2002.', theme: 'other', chapter: '10', slug: 'certificates' },
    { name: 'Ternary Goldbach', year: 1742, statement: 'Every odd n ≥ 7 is a sum of three primes.', status: 'solved', best: 'Vinogradov (large n), 1937; Helfgott, 2013.', theme: 'additive', chapter: '37', slug: 'goldbach' },
    { name: 'Long progressions of primes', year: 1770, statement: 'Arbitrarily long arithmetic progressions of primes.', status: 'solved', best: 'Green and Tao, 2004.', theme: 'additive', chapter: '37', slug: 'goldbach' },
    { name: 'Bounded gaps', year: 1849, statement: 'Infinitely many pairs of primes a bounded distance apart.', status: 'solved', best: 'Zhang, 2013 (70,000,000); Maynard and Tao, 2013; now 246.', theme: 'gaps', chapter: '36', slug: 'twin-primes' },
    { name: 'Mertens’ conjecture', year: 1897, statement: '|M(x)| < √x for all x > 1.', status: 'solved', best: 'False: Odlyzko and te Riele, 1985 (no explicit counterexample known).', theme: 'zeta', chapter: '29', slug: 'faces' },
  ];
  let status = $state<'all' | 'open' | 'solved'>('open');
  let theme = $state<'all' | Problem['theme']>('all');
  const shown = $derived(P.filter((p) => (status === 'all' || p.status === status) && (theme === 'all' || p.theme === theme)).sort((a, b) => a.year - b.year));
</script>

<Widget title="The map of the unknown" subtitle="Problems about primes met in this course: what is conjectured, what is known, and where to read about it." onreset={() => ((status = 'open'), (theme = 'all'))}>
  {#snippet controls()}
    <Segmented label="Status" bind:value={status} options={[{ value: 'open', label: 'open' }, { value: 'solved', label: 'solved' }, { value: 'all', label: 'all' }]} size="sm" />
    <Segmented label="Theme" bind:value={theme} options={[{ value: 'all', label: 'all' }, { value: 'zeta', label: 'zeros' }, { value: 'gaps', label: 'gaps' }, { value: 'additive', label: 'additive' }, { value: 'forms', label: 'special forms' }, { value: 'other', label: 'other' }]} size="sm" />
  {/snippet}
  <div class="grid">
    {#each shown as p (p.name)}
      <article class="card" class:solved={p.status === 'solved'}>
        <header>
          <span class="chip ui">{p.status === 'open' ? 'open' : 'solved'}</span>
          <span class="year mono">{p.year}</span>
        </header>
        <h4>{p.name}</h4>
        <p class="stmt">{p.statement}</p>
        <p class="best"><strong>{p.status === 'open' ? 'Best known:' : 'Resolved:'}</strong> {p.best}</p>
        <a class="ui" href="{base}/chapters/{p.slug}/">Chapter {p.chapter} →</a>
      </article>
    {/each}
  </div>
  <p class="out">{shown.length} problems shown. The year is when the question was first posed or became widely known.</p>
</Widget>

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
    gap: 0.7rem;
  }
  .card {
    border: 1px solid var(--rule);
    border-top: 3px solid var(--prime);
    border-radius: var(--radius-sm);
    padding: 0.6rem 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    background: var(--surface);
  }
  .card.solved {
    border-top-color: var(--ok);
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .chip {
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--prime);
  }
  .solved .chip {
    color: var(--ok);
  }
  .year {
    font-size: 0.75rem;
    color: var(--mute);
  }
  .mono {
    font-family: var(--font-mono);
  }
  h4 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 1.02rem;
  }
  .stmt,
  .best {
    margin: 0;
    font-size: 0.82rem;
    line-height: 1.45;
  }
  .best {
    color: var(--ink-2);
  }
  a {
    margin-top: auto;
    font-size: 0.78rem;
    color: var(--prime);
    text-decoration: none;
  }
  a:hover {
    text-decoration: underline;
  }
  .out {
    margin: 0.6rem 0 0;
    font-size: 0.82rem;
    color: var(--mute);
  }
</style>
