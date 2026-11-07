<!-- One switch in each technology, compared on log scales: time, energy and size per switching event. -->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import { LANDAUER, SWITCHES } from '$lib/ledger';

  let metric = $state<'time' | 'energy' | 'size'>('time');
  const UNITS = { time: 's', energy: 'J', size: 'm' } as const;
  const vals = $derived(SWITCHES.map((s) => s[metric]));
  const lo = $derived(Math.floor(Math.log10(Math.min(...vals, metric === 'energy' ? LANDAUER : Infinity))));
  const hi = $derived(Math.ceil(Math.log10(Math.max(...vals))));
  const pos = (v: number) => ((Math.log10(v) - lo) / (hi - lo)) * 100;
  function fmt(v: number): string {
    const e = Math.floor(Math.log10(v));
    const m = v / 10 ** e;
    return `${m === 1 ? '' : `${m.toFixed(m < 10 ? 0 : 0)} × `}10${e < 0 ? '⁻' : ''}${String(Math.abs(e)).split('').map((c) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+c]).join('')} ${UNITS[metric]}`;
  }
  const ratio = $derived(vals[0]! / vals.at(-1)!);
</script>

<Widget title="The switch race" subtitle="One switching event in each technology, on a logarithmic scale: every gridline is ten times the last. Orders of magnitude, not measurements.">
  {#snippet controls()}
    <div class="seg" role="group" aria-label="What to compare">
      {#each [['time', 'Time per switch'], ['energy', 'Energy per switch'], ['size', 'Size']] as [k, l] (k)}
        <button class:on={metric === k} aria-pressed={metric === k} onclick={() => (metric = k as typeof metric)}>{l}</button>
      {/each}
    </div>
  {/snippet}
  <div class="chart ui">
    {#each SWITCHES as s, i (s.name)}
      <div class="row">
        <span class="name">{s.name} <span class="yr">{s.year}</span></span>
        <span class="track">
          {#each Array.from({ length: hi - lo + 1 }) as _, g (g)}<span class="grid" style:left="{(g / (hi - lo)) * 100}%"></span>{/each}
          <span class="bar" class:elec={i >= 3} style:width="{Math.max(1, pos(vals[i]!))}%"></span>
        </span>
        <span class="v num">{fmt(vals[i]!)}</span>
      </div>
    {/each}
    {#if metric === 'energy'}
      <div class="row">
        <span class="name">Landauer’s limit (erasing one bit at room temperature)</span>
        <span class="track">{#each Array.from({ length: hi - lo + 1 }) as _, g (g)}<span class="grid" style:left="{(g / (hi - lo)) * 100}%"></span>{/each}<span class="mark" style:left="{pos(LANDAUER)}%"></span></span>
        <span class="v num">3 × 10⁻²¹ J</span>
      </div>
    {/if}
  </div>
  <p class="note ui">From the Pascaline to a transistor in a chip today, {metric === 'time' ? 'switching got faster' : metric === 'energy' ? 'the energy per switch fell' : 'the switch shrank'} by a factor of about 10<sup>{Math.round(Math.log10(ratio))}</sup>. Mechanical parts in brown, electrical in blue.</p>
</Widget>

<style>
  .seg {
    display: inline-flex;
  }
  .seg button {
    font: inherit;
    font-size: 0.82rem;
    border: 1px solid var(--line-strong);
    background: var(--surface);
    padding: 0.28rem 0.6rem;
    cursor: pointer;
    color: var(--ink);
    min-height: 2rem;
  }
  .seg button + button {
    border-left: 0;
  }
  .seg button:first-child {
    border-radius: var(--radius-sm) 0 0 var(--radius-sm);
  }
  .seg button:last-child {
    border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  }
  .seg button.on {
    background: var(--accent);
    color: var(--on-accent);
    border-color: var(--accent);
  }
  .chart {
    display: grid;
    gap: 0.45rem;
  }
  .row {
    display: grid;
    grid-template-columns: minmax(7rem, 13rem) 1fr 6.5rem;
    gap: 0.6rem;
    align-items: center;
    font-size: 0.8rem;
  }
  @media (max-width: 560px) {
    .row {
      grid-template-columns: 1fr 5.5rem;
    }
    .row .track {
      grid-column: 1 / -1;
      grid-row: 2;
    }
  }
  .yr {
    color: var(--ink-3);
  }
  .track {
    position: relative;
    height: 0.9rem;
    background: var(--surface-2);
    border-radius: 2px;
  }
  .grid {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 1px;
    background: var(--line);
  }
  .bar {
    position: absolute;
    left: 0;
    top: 0.15rem;
    bottom: 0.15rem;
    background: var(--brass);
    border-radius: 2px;
    transition: width 300ms;
  }
  .bar.elec {
    background: var(--fx-blue);
  }
  .mark {
    position: absolute;
    top: -2px;
    bottom: -2px;
    width: 3px;
    background: var(--fx-red);
  }
  .v {
    text-align: right;
    font-family: var(--font-mono);
    font-size: 0.76rem;
  }
  .note {
    font-size: 0.82rem;
    color: var(--ink-2);
    margin: 0.6rem 0 0;
  }
</style>
