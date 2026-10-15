<!--
  Partial Fourier sums of two periodic functions with jumps: the sawtooth {t} − ½ = −Σ sin(2πnt)/(πn) and the square
  wave. More terms reproduce the jumps better, but the overshoot next to each jump (the Gibbs phenomenon, about 9% of
  the jump) never goes away; it only gets narrower. The explicit formula of Chapter 23 shows the same behaviour.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import Plot from '$lib/charts/Plot.svelte';

  let N = $state(8);
  let kind = $state<'saw' | 'square'>('saw');
  const exact = (t: number) => (kind === 'saw' ? t - Math.floor(t) - 0.5 : t - Math.floor(t) < 0.5 ? 1 : -1);
  const partial = (t: number) => {
    let s = 0;
    for (let n = 1; n <= N; n++) {
      if (kind === 'saw') s -= Math.sin(2 * Math.PI * n * t) / (Math.PI * n);
      else if (n % 2) s += (4 / (Math.PI * n)) * Math.sin(2 * Math.PI * n * t);
    }
    return s;
  };
  const pts = $derived(Array.from({ length: 1201 }, (_, i) => -1 + (3 * i) / 1200).map((t) => [t, partial(t)] as [number, number]));
  const steps = $derived.by(() => {
    const out: [number, number][][] = [];
    const breaks = kind === 'saw' ? [-1, 0, 1, 2] : [-1, -0.5, 0, 0.5, 1, 1.5, 2];
    for (let i = 0; i + 1 < breaks.length; i++) {
      const a = breaks[i]! + 1e-9;
      const b = breaks[i + 1]! - 1e-9;
      out.push([
        [a, exact(a)],
        [b, exact(b)],
      ]);
    }
    return out;
  });
  const overshoot = $derived(Math.max(...pts.map((p) => p[1])) - (kind === 'saw' ? 0.5 : 1));
  const jump = $derived(kind === 'saw' ? 1 : 2);
</script>

<Widget title="Fourier series and jumps" subtitle="The sum of the first N terms of a Fourier series (red) against the function (blue). At every jump the partial sums pass through the midpoint, and overshoot next to it." onreset={() => ((N = 8), (kind = 'saw'))}>
  {#snippet controls()}
    <Segmented label="Function" bind:value={kind} options={[{ value: 'saw', label: 'sawtooth {t} − ½' }, { value: 'square', label: 'square wave' }]} size="sm" />
    <Slider label="terms N" bind:value={N} min={1} max={200} log format={(v) => String(Math.round(v))} oninput={(v) => (N = Math.round(v))} />
  {/snippet}
  <Plot x={{ domain: [-1, 2], label: 't' }} y={{ domain: kind === 'saw' ? [-0.75, 0.75] : [-1.4, 1.4], label: '' }} height={240} label="Partial Fourier sum with {N} terms.">
    {#snippet marks({ sx, sy })}
      {#each steps as seg, i (i)}<line class="exact" x1={sx(seg[0]![0])} y1={sy(seg[0]![1])} x2={sx(seg[1]![0])} y2={sy(seg[1]![1])} />{/each}
      <path class="partial" d={'M' + pts.map(([a, b]) => `${sx(a).toFixed(1)},${sy(b).toFixed(1)}`).join('L')} />
    {/snippet}
  </Plot>
  <p class="out">{kind === 'saw' ? '{t} − ½ = −Σ sin(2πnt)/(πn)' : 'square wave = Σ over odd n of 4 sin(2πnt)/(πn)'}. With N = {N}, the largest overshoot is {overshoot.toFixed(4)}, that is {((overshoot / jump) * 100).toFixed(1)}% of the jump (the limit is 8.95%).</p>
</Widget>

<style>
  .exact {
    stroke: var(--fx-blue);
    stroke-width: 2.4;
  }
  .partial {
    fill: none;
    stroke: var(--prime);
    stroke-width: 1.5;
  }
  .out {
    margin: 0.4rem 0 0;
    font-size: 0.86rem;
  }
</style>
