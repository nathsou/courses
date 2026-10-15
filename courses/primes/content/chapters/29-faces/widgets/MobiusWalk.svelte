<!--
  The Möbius walk. M(x) = Σ_{n ≤ x} μ(n) steps +1, −1 or 0 at each n. It wanders like a random walk and stays inside
  ±√x (Mertens' conjecture, false but true for every x anyone has checked: |M(x)| < 0.571√x for x ≤ 10^16).
  A genuinely random walk with the same step probabilities (μ = ±1 each with density 3/π², 0 otherwise) is shown for
  comparison; reseed it to see how differently random walks can behave.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Toggle from '$lib/components/ui/Toggle.svelte';
  import Plot from '$lib/charts/Plot.svelte';
  import { mobiusTable } from '$lib/primes/sieve';
  import { rng } from '$lib/primes/random';

  const NMAX = 10_000_000;
  const mu = mobiusTable(NMAX);
  let X = $state(100_000);
  let showRandom = $state(false);
  let seed = $state(1);
  let scaled = $state(false);

  function sample(step: (n: number) => number, xMax: number): [number, number][] {
    const pts: [number, number][] = [];
    const every = Math.max(1, Math.floor(xMax / 2000));
    let m = 0;
    let lo = 0;
    let hi = 0;
    for (let n = 1; n <= xMax; n++) {
      m += step(n);
      lo = Math.min(lo, m);
      hi = Math.max(hi, m);
      if (n % every === 0 || n === xMax) {
        // Keep the extremes inside each bucket so that the envelope is faithful.
        pts.push([n, lo], [n, hi]);
        lo = m;
        hi = m;
      }
    }
    return pts;
  }
  const walk = $derived(sample((n) => mu[n]!, X));
  const random = $derived.by(() => {
    if (!showRandom) return [];
    const r = rng(seed);
    const p = 3 / Math.PI ** 2;
    return sample(() => {
      const u = r.next();
      return u < p ? 1 : u < 2 * p ? -1 : 0;
    }, X);
  });
  const M = $derived.by(() => {
    let m = 0;
    for (let n = 1; n <= X; n++) m += mu[n]!;
    return m;
  });
  const tr = (pts: [number, number][]) => (scaled ? pts.map(([x, y]) => [x, y / Math.sqrt(x)] as [number, number]) : pts);
  const yMax = $derived(scaled ? 1.2 : Math.sqrt(X) * 1.2);
  const root = $derived(Array.from({ length: 201 }, (_, i) => (X * i) / 200).map((x) => [x, scaled ? 1 : Math.sqrt(x)] as [number, number]));
  const path = (pts: [number, number][], sx: (v: number) => number, sy: (v: number) => number) => (pts.length ? 'M' + pts.map(([a, b]) => `${sx(a).toFixed(1)},${sy(Math.max(-yMax, Math.min(yMax, b))).toFixed(1)}`).join('L') : '');
</script>

<Widget title="The Möbius walk" subtitle="M(x) = μ(1) + μ(2) + … + μ(x): a step up at each square-free n with an even number of prime factors, down at an odd number, and a pause at numbers with a square factor. The dashed curves are ±√x." onreset={() => ((X = 100_000), (showRandom = false), (seed = 1), (scaled = false))}>
  {#snippet controls()}
    <Segmented label="x up to" bind:value={X} options={[{ value: 1000, label: '10³' }, { value: 100_000, label: '10⁵' }, { value: 1_000_000, label: '10⁶' }, { value: NMAX, label: '10⁷' }]} size="sm" />
    <Toggle bind:checked={scaled} label="divide by √x" />
    <Toggle bind:checked={showRandom} label="a random walk too" />
    {#if showRandom}<Button size="sm" onclick={() => seed++}>New random walk</Button>{/if}
  {/snippet}
  <Plot x={{ domain: [0, X], label: 'x' }} y={{ domain: [-yMax, yMax], label: scaled ? 'M(x)/√x' : 'M(x)' }} height={260} label="The Mertens function up to {X}.">
    {#snippet marks({ sx, sy })}
      <line class="zero" x1={sx(0)} x2={sx(X)} y1={sy(0)} y2={sy(0)} />
      <path class="root" d={path(root, sx, sy)} />
      <path class="root" d={path(root.map(([a, b]) => [a, -b]), sx, sy)} />
      {#if showRandom}<path class="rand" d={path(tr(random), sx, sy)} />{/if}
      <path class="walk" d={path(tr(walk), sx, sy)} />
    {/snippet}
  </Plot>
  <p class="out">M({X.toLocaleString('en-GB')}) = {M}, and √x = {Math.round(Math.sqrt(X)).toLocaleString('en-GB')}. {showRandom ? 'The random walk (grey) has the same step probabilities; it typically strays as far as √x times a slowly growing factor, and sometimes crosses the dashed curves.' : ''}</p>
</Widget>

<style>
  .zero {
    stroke: var(--ruling);
  }
  .root {
    fill: none;
    stroke: var(--prime);
    stroke-dasharray: 6 4;
    stroke-width: 1.4;
  }
  .walk {
    fill: none;
    stroke: var(--fx-blue);
    stroke-width: 1;
  }
  .rand {
    fill: none;
    stroke: var(--mute);
    stroke-width: 1;
    opacity: 0.7;
  }
  .out {
    margin: 0.4rem 0 0;
    font-size: 0.86rem;
  }
</style>
