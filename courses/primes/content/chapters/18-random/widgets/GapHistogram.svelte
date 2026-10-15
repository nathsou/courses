<!--
  Gaps between consecutive primes in [x, x + 2·10^6), divided by log x, against the exponential density e^{−t}
  that Cramér's model predicts. The real gaps are all even, which shows up as structure at small t.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import { primesInRange } from '$lib/primes/sieve';

  let logx = $state(9);
  const BINS = 40;
  const TMAX = 5;
  const data = $derived.by(() => {
    const x = 10 ** logx;
    const ps = primesInRange(x, x + 2_000_000);
    const L = Math.log(x);
    const hist = new Array<number>(BINS).fill(0);
    let gaps = 0;
    let biggest = 0;
    for (let i = 1; i < ps.length; i++) {
      const g = ps[i]! - ps[i - 1]!;
      biggest = Math.max(biggest, g);
      const t = g / L;
      if (t < TMAX) hist[Math.floor((t / TMAX) * BINS)]!++;
      gaps++;
    }
    const width = TMAX / BINS;
    return { hist: hist.map((c) => c / (gaps * width)), gaps, L, biggest };
  });
  const W = 520;
  const H = 200;
  const yMax = 1.2;
  const sx = (t: number) => 30 + (t / TMAX) * (W - 40);
  const sy = (v: number) => H - (v / yMax) * (H - 10);
</script>

<Widget title="Gaps between primes" subtitle="Histogram of gaps between consecutive primes in a window of two million numbers starting at x, measured in units of log x. The curve is e^(−t), the exponential law of a random model.">
  {#snippet controls()}
    <Segmented label="x" bind:value={logx} options={[{ value: 6, label: 'x = 10⁶' }, { value: 9, label: '10⁹' }, { value: 12, label: '10¹²' }, { value: 15, label: '10¹⁵' }]} size="sm" />
  {/snippet}
  <svg viewBox="0 0 {W} {H + 26}" class="plot" role="img" aria-label="Histogram of normalised prime gaps near 10 to the {logx}.">
    {#each data.hist as v, i (i)}
      <rect x={sx((i * TMAX) / BINS) + 0.5} y={sy(Math.min(yMax, v))} width={(W - 40) / BINS - 1} height={H - sy(Math.min(yMax, v))} />
    {/each}
    <path d={'M' + Array.from({ length: 101 }, (_, i) => (i * TMAX) / 100).map((t) => `${sx(t)},${sy(Math.exp(-t))}`).join('L')} />
    {#each [0, 1, 2, 3, 4, 5] as t (t)}<text x={sx(t)} y={H + 16} text-anchor="middle">{t}</text>{/each}
  </svg>
  <p class="out">{data.gaps.toLocaleString('en-GB')} gaps; log x = {data.L.toFixed(1)}; the largest gap in the window is {data.biggest} = {(data.biggest / data.L).toFixed(1)} log x.</p>
</Widget>

<style>
  .plot {
    width: 100%;
    height: auto;
    display: block;
    font-family: var(--font-mono);
  }
  rect {
    fill: color-mix(in srgb, var(--fx-blue) 65%, var(--surface));
  }
  path {
    fill: none;
    stroke: var(--prime);
    stroke-width: 2;
  }
  text {
    font-size: 11px;
    fill: var(--mute);
  }
  .out {
    margin: 0.4rem 0 0;
    font-size: 0.86rem;
  }
</style>
