<!--
  How many distinct prime factors does a typical number have? The distribution of ω(n) for n in a window near x,
  against the normal curve with mean and variance log log x (Erdős–Kac). The approach to the normal curve is slow.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import { primesUpTo } from '$lib/primes/sieve';
  import { isqrt } from '$lib/primes/arith';

  let logx = $state(7);
  const W = 200_000;
  const data = $derived.by(() => {
    const x0 = 10 ** logx;
    const counts = new Int32Array(W);
    const rest = new Float64Array(W);
    for (let i = 0; i < W; i++) rest[i] = x0 + i;
    for (const p of primesUpTo(isqrt(x0 + W))) {
      const start = Math.ceil(x0 / p) * p;
      for (let m = start; m < x0 + W; m += p) {
        const i = m - x0;
        counts[i]!++;
        let r = rest[i]!;
        while (r % p === 0) r /= p;
        rest[i] = r;
      }
    }
    const hist = new Array<number>(16).fill(0);
    let sum = 0;
    for (let i = 0; i < W; i++) {
      const w = counts[i]! + (rest[i]! > 1 ? 1 : 0);
      hist[Math.min(15, w)]!++;
      sum += w;
    }
    return { hist, mean: sum / W, ll: Math.log(Math.log(x0)) };
  });
  const maxH = $derived(Math.max(...data.hist));
  const normal = (k: number) => (W / Math.sqrt(2 * Math.PI * data.ll)) * Math.exp(-((k - data.ll) ** 2) / (2 * data.ll));
  const H = 180;
</script>

<Widget title="How many prime factors?" subtitle="The number of distinct prime factors ω(n) for 200,000 consecutive n starting at x. Bars: counts. Dots: a normal distribution with mean and variance log log x.">
  {#snippet controls()}
    <Segmented label="x" bind:value={logx} options={[{ value: 4, label: 'x = 10⁴' }, { value: 7, label: '10⁷' }, { value: 10, label: '10¹⁰' }, { value: 13, label: '10¹³' }]} size="sm" />
  {/snippet}
  <svg viewBox="0 0 480 {H + 24}" class="plot" role="img" aria-label="Histogram of the number of distinct prime factors.">
    {#each data.hist as c, k (k)}
      {#if k <= 12}
        <rect x={k * 36 + 6} y={H - (c / maxH) * (H - 8)} width="28" height={(c / maxH) * (H - 8)} />
        <circle cx={k * 36 + 20} cy={H - (normal(k) / maxH) * (H - 8)} r="3.5" />
        <text x={k * 36 + 20} y={H + 15} text-anchor="middle">{k}</text>
      {/if}
    {/each}
  </svg>
  <p class="out">Mean ω(n) here: {data.mean.toFixed(3)}; log log x = {data.ll.toFixed(3)}. The difference tends to a constant, M ≈ 0.26 (exercise 3).</p>
</Widget>

<style>
  .plot {
    width: 100%;
    height: auto;
    display: block;
    font-family: var(--font-mono);
  }
  rect {
    fill: color-mix(in srgb, var(--fx-blue) 70%, var(--surface));
  }
  circle {
    fill: var(--prime);
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
