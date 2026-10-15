<!--
  π(10^k) for k = 1…25 against the two candidate approximations: the ratio to x / log x creeps down towards 1
  very slowly, while the ratio to Li(x) is 1 to many decimal places. A second view shows the error Li(x) − π(x)
  in units of √x / log x.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import Plot from '$lib/charts/Plot.svelte';
  import { Li, PI_POWERS_OF_TEN } from '$lib/primes/count';

  let view = $state<'ratio' | 'error'>('ratio');
  const rows = PI_POWERS_OF_TEN.slice(1).map((v, i) => {
    const k = i + 1;
    const x = 10 ** k;
    const pi = Number(v);
    return { k, pi, r1: pi / (x / Math.log(x)), r2: pi / Li(x), err: (Li(x) - pi) / (Math.sqrt(x) / Math.log(x)) };
  });
  let hover = $state<(typeof rows)[number] | null>(null);
</script>

<Widget title="π(x) against x / log x and Li(x)" subtitle="Known values of π(10ᵏ) for k up to 25. Switch views to see the size of the error.">
  {#snippet controls()}
    <Segmented label="View" bind:value={view} options={[{ value: 'ratio', label: 'ratios' }, { value: 'error', label: 'error of Li(x)' }]} size="sm" />
  {/snippet}
  {#if view === 'ratio'}
    <Plot x={{ domain: [1, 25], label: 'k, where x = 10ᵏ', ticks: 12 }} y={{ domain: [0.75, 1.2], label: 'ratio' }} height={260} label="Ratios of pi of x to x over log x and to Li of x." onpointer={(pt) => (hover = pt ? rows[Math.min(24, Math.max(0, Math.round(pt.x) - 1))]! : null)}>
      {#snippet marks({ sx, sy })}
        <line class="one" x1={sx(1)} x2={sx(25)} y1={sy(1)} y2={sy(1)} />
        <path class="l1" d={'M' + rows.map((r) => `${sx(r.k)},${sy(r.r1)}`).join('L')} />
        <path class="l2" d={'M' + rows.map((r) => `${sx(r.k)},${sy(r.r2)}`).join('L')} />
        {#each rows as r (r.k)}
          <circle cx={sx(r.k)} cy={sy(r.r1)} r="3" class="p1" />
          <circle cx={sx(r.k)} cy={sy(r.r2)} r="3" class="p2" />
        {/each}
      {/snippet}
    </Plot>
    <div class="legend ui"><span class="k k1">π(x) / (x / log x)</span><span class="k k2">π(x) / Li(x)</span></div>
  {:else}
    <Plot x={{ domain: [1, 25], label: 'k, where x = 10ᵏ', ticks: 12 }} y={{ domain: [-0.5, 3], label: '(Li(x) − π(x)) / (√x / log x)' }} height={260} label="The error of Li of x in units of square root of x over log x." onpointer={(pt) => (hover = pt ? rows[Math.min(24, Math.max(0, Math.round(pt.x) - 1))]! : null)}>
      {#snippet marks({ sx, sy })}
        <line class="one" x1={sx(1)} x2={sx(25)} y1={sy(0)} y2={sy(0)} />
        <path class="l1" d={'M' + rows.map((r) => `${sx(r.k)},${sy(r.err)}`).join('L')} />
        {#each rows as r (r.k)}<circle cx={sx(r.k)} cy={sy(r.err)} r="3" class="p1" />{/each}
      {/snippet}
    </Plot>
  {/if}
  <p class="out" aria-live="polite">
    {#if hover}
      x = 10<sup>{hover.k}</sup>: π(x) = {PI_POWERS_OF_TEN[hover.k]!.toLocaleString('en-GB')}; ratio to x/log x = {hover.r1.toFixed(4)}; ratio to Li(x) = {hover.r2.toFixed(hover.k > 8 ? 9 : 5)}; error of Li in units of √x/log x = {hover.err.toFixed(3)}.
    {:else}
      Point at the chart to read the values.
    {/if}
  </p>
</Widget>

<style>
  .one {
    stroke: var(--rule-strong);
    stroke-dasharray: 3 3;
  }
  .l1 {
    fill: none;
    stroke: var(--series-1);
    stroke-width: 1.6;
  }
  .l2 {
    fill: none;
    stroke: var(--prime);
    stroke-width: 1.6;
  }
  .p1 {
    fill: var(--series-1);
  }
  .p2 {
    fill: var(--prime);
  }
  .legend {
    display: flex;
    gap: 1.2rem;
    font-size: 0.8rem;
    color: var(--ink-2);
    margin-top: 0.3rem;
  }
  .k::before {
    content: '';
    display: inline-block;
    width: 1.2rem;
    border-top: 2px solid var(--series-1);
    margin-right: 0.4rem;
    vertical-align: middle;
  }
  .k2::before {
    border-color: var(--prime);
  }
  .out {
    margin: 0.5rem 0 0;
    font-size: 0.84rem;
    min-height: 2.5em;
  }
</style>
