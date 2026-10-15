<!--
  The spacing statistics of three point sets, all rescaled ("unfolded") to mean spacing 1:
  - the first 10,000 zeros of ζ, unfolded with the smooth zero count θ(t)/π + 1;
  - eigenvalues of random GUE matrices (40 matrices of size 120, central part, unfolded with the semicircle law);
  - independent uniform random points (Poisson).
  Two views: nearest-neighbour spacings against the Wigner surmise and e^(−s); and pair correlation (all differences)
  against Montgomery's 1 − (sin πu/πu)² and the flat line 1.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Plot from '$lib/charts/Plot.svelte';
  import { theta } from '$lib/primes/zeta';
  import { ZEROS } from '$lib/primes/zeros';
  import { loadZeros } from '$lib/data/zeros';
  import { rng, gueEigenvalues, wignerGUE, poissonSpacing, pairCorrelation } from '$lib/primes/random';

  let zeros = $state<readonly number[]>(ZEROS);
  $effect(() => {
    loadZeros()
      .then((z) => (zeros = z))
      .catch(() => {});
  });
  let source = $state<'zeros' | 'gue' | 'poisson'>('zeros');
  let view = $state<'nearest' | 'pair'>('nearest');
  let seed = $state(1);

  /** Unfolded points (mean spacing 1), as several independent runs. */
  const runs = $derived.by((): number[][] => {
    if (source === 'zeros') return [zeros.map((g) => theta(g) / Math.PI + 1)];
    const r = rng(seed);
    if (source === 'poisson') return Array.from({ length: 4 }, () => Array.from({ length: 2500 }, () => r.next() * 2500).sort((a, b) => a - b));
    const n = 120;
    const F = (y: number) => (y * Math.sqrt(1 - y * y) + Math.asin(y)) / Math.PI + 0.5;
    return Array.from({ length: 40 }, () => {
      const ev = gueEigenvalues(n, r);
      return ev
        .map((l) => n * F(Math.max(-1, Math.min(1, l / (2 * Math.sqrt(n))))))
        .slice(Math.floor(n * 0.2), Math.ceil(n * 0.8));
    });
  });
  const BINS = 40;
  const hist = $derived.by(() => {
    const smax = view === 'nearest' ? 3.5 : 3;
    const h = new Array<number>(BINS).fill(0);
    let count = 0;
    let norm = 0;
    for (const xs of runs) {
      if (view === 'nearest') {
        for (let i = 1; i < xs.length; i++) {
          const s = xs[i]! - xs[i - 1]!;
          if (s < smax) h[Math.floor((s / smax) * BINS)]!++;
          count++;
        }
      } else {
        for (let i = 0; i < xs.length; i++) {
          for (let j = i + 1; j < xs.length && xs[j]! - xs[i]! < smax; j++) {
            h[Math.floor(((xs[j]! - xs[i]!) / smax) * BINS)]!++;
          }
          norm++;
        }
      }
    }
    const w = smax / BINS;
    return h.map((c) => (view === 'nearest' ? c / (count * w) : c / (norm * w)));
  });
  const curveA = $derived(Array.from({ length: 151 }, (_, i) => ((view === 'nearest' ? 3.5 : 3) * i) / 150).map((s) => [s, view === 'nearest' ? wignerGUE(s) : pairCorrelation(s)] as [number, number]));
  const curveB = $derived(Array.from({ length: 151 }, (_, i) => ((view === 'nearest' ? 3.5 : 3) * i) / 150).map((s) => [s, view === 'nearest' ? poissonSpacing(s) : 1] as [number, number]));
  const smaxNow = $derived(view === 'nearest' ? 3.5 : 3);
  const small = $derived.by(() => {
    let n = 0;
    let t = 0;
    for (const xs of runs) for (let i = 1; i < xs.length; i++) ((t += 1), xs[i]! - xs[i - 1]! < 0.25 && (n += 1));
    return n / t;
  });
</script>

<Widget title="Spacings: zeros, random matrices, random points" subtitle="Each point set is rescaled to have average spacing 1. Left view: how far each point is from the next. Right view: how often two points are a distance u apart." onreset={() => ((source = 'zeros'), (view = 'nearest'), (seed = 1))}>
  {#snippet controls()}
    <Segmented label="Points" bind:value={source} options={[{ value: 'zeros', label: 'zeros of ζ' }, { value: 'gue', label: 'GUE eigenvalues' }, { value: 'poisson', label: 'random points' }]} size="sm" />
    <Segmented label="Statistic" bind:value={view} options={[{ value: 'nearest', label: 'nearest spacing' }, { value: 'pair', label: 'pair correlation' }]} size="sm" />
    {#if source !== 'zeros'}<Button size="sm" onclick={() => seed++}>Resample</Button>{/if}
  {/snippet}
  <Plot x={{ domain: [0, smaxNow], label: view === 'nearest' ? 'spacing s' : 'distance u' }} y={{ domain: [0, view === 'nearest' ? 1.1 : 1.4], label: 'density' }} height={250} label="Histogram of {view === 'nearest' ? 'nearest-neighbour spacings' : 'pair distances'}.">
    {#snippet marks({ sx, sy })}
      {#each hist as v, i (i)}
        <rect x={sx((i * smaxNow) / BINS) + 0.5} y={sy(Math.min(view === 'nearest' ? 1.1 : 1.4, v))} width={Math.max(0, sx(smaxNow / BINS) - sx(0) - 1)} height={sy(0) - sy(Math.min(view === 'nearest' ? 1.1 : 1.4, v))} class="bar" />
      {/each}
      <path class="b" d={'M' + curveB.map(([a, b]) => `${sx(a)},${sy(b)}`).join('L')} />
      <path class="a" d={'M' + curveA.map(([a, b]) => `${sx(a)},${sy(b)}`).join('L')} />
    {/snippet}
  </Plot>
  <div class="legend ui">
    <span class="k a">{view === 'nearest' ? 'GUE (Wigner surmise)' : 'Montgomery: 1 − (sin πu/πu)²'}</span>
    <span class="k b">{view === 'nearest' ? 'independent points: e^(−s)' : 'independent points: 1'}</span>
  </div>
  <p class="out" aria-live="polite">
    {source === 'zeros' ? `${zeros.length.toLocaleString('en-GB')} zeros` : source === 'gue' ? '40 random 120 × 120 GUE matrices (middle 60% of each spectrum)' : '10,000 uniform random points'}. Fraction of spacings below ¼: {(small * 100).toFixed(1)}% (the Wigner surmise gives 1.6%, independent points 22%).
  </p>
</Widget>

<style>
  .bar {
    fill: color-mix(in srgb, var(--fx-blue) 55%, var(--surface));
  }
  path {
    fill: none;
    stroke-width: 2;
  }
  .a,
  .k.a::before {
    stroke: var(--prime);
    border-color: var(--prime);
  }
  .b,
  .k.b::before {
    stroke: var(--mute);
    border-color: var(--mute);
  }
  .b {
    stroke-dasharray: 5 4;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 1.2rem;
    font-size: 0.8rem;
    color: var(--ink-2);
    margin-top: 0.3rem;
  }
  .k::before {
    content: '';
    display: inline-block;
    width: 1.2rem;
    border-top: 2px solid;
    margin-right: 0.4rem;
    vertical-align: middle;
  }
  .out {
    margin: 0.4rem 0 0;
    font-size: 0.86rem;
  }
</style>
