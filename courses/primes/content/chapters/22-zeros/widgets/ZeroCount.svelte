<!--
  Counting zeros: N(T), the number of zeros with 0 < Im ρ ≤ T (a staircase), against the smooth Riemann–von
  Mangoldt term θ(T)/π + 1 ≈ (T/2π) log(T/2π) − T/2π + 7/8. The difference S(T) stays small: it is O(log T), and in
  this range (T < 9870) |S(T)| < 1.45.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import Plot from '$lib/charts/Plot.svelte';
  import { theta } from '$lib/primes/zeta';
  import { ZEROS } from '$lib/primes/zeros';
  import { loadZeros } from '$lib/data/zeros';

  let zeros = $state<readonly number[]>(ZEROS);
  let failed = $state(false);
  $effect(() => {
    loadZeros()
      .then((z) => (zeros = z))
      .catch(() => (failed = true));
  });

  let Tmax = $state(60);
  let view = $state<'count' | 'error'>('count');
  const smooth = (T: number) => theta(T) / Math.PI + 1;
  const inRange = $derived(zeros.filter((g) => g <= Tmax));
  const enough = $derived(zeros.length >= 10000 || Tmax <= (zeros[zeros.length - 1] ?? 0));
  const stairs = $derived.by(() => {
    const pts: [number, number][] = [[0, 0]];
    inRange.forEach((g, i) => {
      pts.push([g, i]);
      pts.push([g, i + 1]);
    });
    pts.push([Tmax, inRange.length]);
    return pts;
  });
  const curve = $derived(Array.from({ length: 301 }, (_, i) => (i * Tmax) / 300).filter((t) => t >= 9).map((t) => [t, smooth(t)] as [number, number]));
  const S = $derived.by(() => {
    const pts: [number, number][] = [];
    inRange.forEach((g, i) => {
      pts.push([g, i - smooth(g)]);
      pts.push([g, i + 1 - smooth(g)]);
    });
    pts.push([Tmax, inRange.length - smooth(Tmax)]);
    return pts;
  });
  const sMax = $derived(Math.max(1.2, ...S.map((p) => Math.abs(p[1]))));
  const path = (pts: [number, number][], sx: (v: number) => number, sy: (v: number) => number) => 'M' + pts.map(([a, b]) => `${sx(a).toFixed(1)},${sy(b).toFixed(1)}`).join('L');
</script>

<Widget title="Counting the zeros" subtitle="N(T), the number of zeros with 0 < Im ρ ≤ T, against the smooth term of the Riemann–von Mangoldt formula. The difference S(T) is the fluctuating part." onreset={() => ((Tmax = 60), (view = 'count'))}>
  {#snippet controls()}
    <Segmented label="Up to" bind:value={Tmax} options={[{ value: 60, label: 'T = 60' }, { value: 250, label: '250' }, { value: 1000, label: '1000' }, { value: 9870, label: '9870' }]} size="sm" />
    <Segmented label="View" bind:value={view} options={[{ value: 'count', label: 'N(T)' }, { value: 'error', label: 'S(T) = N(T) − smooth' }]} size="sm" />
  {/snippet}
  {#if view === 'count'}
    <Plot x={{ domain: [0, Tmax], label: 'T' }} y={{ domain: [0, Math.max(5, smooth(Tmax) * 1.04)], label: 'number of zeros' }} height={260} label="The zero counting function and its smooth approximation.">
      {#snippet marks({ sx, sy })}
        <path class="smooth" d={path(curve, sx, sy)} />
        <path class="stairs" d={path(stairs, sx, sy)} />
      {/snippet}
    </Plot>
  {:else}
    <Plot x={{ domain: [0, Tmax], label: 'T' }} y={{ domain: [-sMax * 1.1, sMax * 1.1], label: 'S(T)' }} height={260} label="The fluctuating part S of the zero count.">
      {#snippet marks({ sx, sy })}
        <line class="zero" x1={sx(0)} x2={sx(Tmax)} y1={sy(0)} y2={sy(0)} />
        <path class="stairs" style:stroke-width={Tmax > 1000 ? 0.6 : 1.4} d={path(S, sx, sy)} />
      {/snippet}
    </Plot>
  {/if}
  <p class="out">
    {#if !enough}Loading the zeros…{:else}
      N({Tmax}) = {inRange.length.toLocaleString('en-GB')}; θ(T)/π + 1 = {smooth(Tmax).toFixed(2)}.
      {#if view === 'error'}In this range |S(T)| stays below {sMax.toFixed(2)}, while log T = {Math.log(Tmax).toFixed(1)}.{/if}
    {/if}
    {#if failed}(Could not load the table of 10,000 zeros; showing the first 100.){/if}
  </p>
</Widget>

<style>
  .smooth {
    fill: none;
    stroke: var(--prime);
    stroke-width: 2;
  }
  .stairs {
    fill: none;
    stroke: var(--fx-blue);
    stroke-width: 1.4;
  }
  .zero {
    stroke: var(--fg);
    stroke-dasharray: 4 3;
  }
  .out {
    margin: 0.4rem 0 0;
    font-size: 0.86rem;
  }
</style>
