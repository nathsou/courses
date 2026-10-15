<!--
  The birthday paradox, which is why Pollard's ρ needs only about √p steps. Left: the probability that k random
  values from N possibilities contain a repeat. Right: simulated waiting times for the first repeat, against √(πN/2).
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Plot from '$lib/charts/Plot.svelte';
  import { rng } from '$lib/primes/random';

  let N = $state(365);
  let samples = $state<number[]>([]);
  let seed = 1;

  const curve = $derived.by(() => {
    const kMax = Math.ceil(4 * Math.sqrt(N)) + 2;
    const pts: { k: number; p: number }[] = [];
    let none = 1;
    for (let k = 0; k <= kMax; k++) {
      if (k > 0) none *= 1 - (k - 1) / N;
      pts.push({ k, p: 1 - none });
    }
    return pts;
  });
  const half = $derived(curve.find((c) => c.p >= 0.5)?.k ?? 0);
  const expected = $derived(Math.sqrt((Math.PI * N) / 2));

  function simulate() {
    const r = rng(seed++);
    const out: number[] = [];
    for (let t = 0; t < 400; t++) {
      const seen = new Set<number>();
      let k = 0;
      for (;;) {
        k++;
        const v = Math.floor(r.next() * N);
        if (seen.has(v)) break;
        seen.add(v);
      }
      out.push(k);
    }
    samples = out;
  }
  const mean = $derived(samples.length ? samples.reduce((a, b) => a + b, 0) / samples.length : 0);
</script>

<Widget title="The birthday paradox" subtitle="Draw random values from N possibilities. A repeat is likely long before N draws: after about √N." onreset={() => ((N = 365), (samples = []))}>
  {#snippet controls()}
    <Segmented label="N" bind:value={N} options={[{ value: 365, label: 'N = 365' }, { value: 10_000, label: 'N = 10⁴' }, { value: 1_000_000, label: 'N = 10⁶' }]} onchange={() => (samples = [])} size="sm" />
    <Button size="sm" onclick={simulate}>Simulate 400 runs</Button>
  {/snippet}
  <Plot x={{ domain: [0, curve.at(-1)!.k], label: 'number of draws k' }} y={{ domain: [0, 1], label: 'P(some repeat)' }} height={240} label="Probability of a repeat among k draws from {N} values.">
    {#snippet marks({ sx, sy })}
      <path class="c" d={'M' + curve.map((c) => `${sx(c.k)},${sy(c.p)}`).join('L')} />
      <line class="half" x1={sx(half)} x2={sx(half)} y1={sy(0)} y2={sy(0.5)} />
      <line class="half" x1={sx(0)} x2={sx(half)} y1={sy(0.5)} y2={sy(0.5)} />
    {/snippet}
  </Plot>
  <p class="out" aria-live="polite">
    With N = {N.toLocaleString('en-GB')}, a repeat is more likely than not after {half} draws (√N = {Math.sqrt(N).toFixed(0)}). The expected wait is about √(πN/2) ≈ {expected.toFixed(1)}.
    {#if samples.length}Simulated mean over 400 runs: <strong>{mean.toFixed(1)}</strong>.{/if}
  </p>
</Widget>

<style>
  .c {
    fill: none;
    stroke: var(--prime);
    stroke-width: 2;
  }
  .half {
    stroke: var(--fx-blue);
    stroke-dasharray: 4 3;
  }
  .out {
    margin: 0.5rem 0 0;
    font-size: 0.86rem;
  }
</style>
