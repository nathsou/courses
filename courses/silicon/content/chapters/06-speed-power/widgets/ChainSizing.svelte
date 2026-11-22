<!--
  Driving a large load: a chain of N inverters, each f = H^(1/N) times larger than the last, driving a load H
  times the first one's input. Delay N(f + p) in units of τ (logical effort, with parasitic delay p = 1).
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import Plot from '$lib/components/ui/Plot.svelte';
  import { bestStages, chainDelay } from '$lib/physics/circuits';

  let h = $state(256);
  let n = $state(1);

  const f = $derived(h ** (1 / n));
  const d = $derived(chainDelay(h, n));
  const best = $derived(bestStages(h));
  const curve = $derived(Array.from({ length: 12 }, (_, i) => [i + 1, chainDelay(h, i + 1)] as [number, number]));
  const sizes = $derived(Array.from({ length: n }, (_, i) => f ** i));
  const W = 560;
  const scale = $derived((s: number) => 8 + 22 * Math.log10(1 + s * 9) / Math.log10(1 + Math.max(...sizes) * 9 || 10));
</script>

<Widget title="Driving a big load" subtitle="A small gate must drive a load H times its own input capacitance (a long wire, a pad, thousands of gates). Choose how many inverters to put in between; each is f times bigger than the last.">
  {#snippet controls()}
    <Slider bind:value={h} min={1} max={10000} log label="Load H (× the first gate’s input)" format={(x) => x.toFixed(0)} />
    <Slider bind:value={n} min={1} max={12} step={1} label="Number of stages N" format={(x) => String(x)} />
  {/snippet}
  <svg viewBox="0 0 {W} 70" class="chain" role="img" aria-label="{n} inverters, each {f.toFixed(1)} times larger than the last">
    {#each sizes as s, i (i)}
      {@const x = 20 + (i * (W - 110)) / Math.max(1, n)}
      {@const r = scale(s)}
      <path d="M{x},{35 - r} L{x + r * 1.6},35 L{x},{35 + r} Z" class="inv" />
      <circle cx={x + r * 1.6 + 3} cy="35" r="3" class="bub" />
    {/each}
    <line x1={W - 80} x2={W - 80} y1="12" y2="58" class="load" />
    <line x1={W - 70} x2={W - 70} y1="12" y2="58" class="load" />
    <text x={W - 60} y="39" class="t">load ×{h.toFixed(0)}</text>
  </svg>
  <Plot
    label="Delay against number of stages"
    x={{ min: 1, max: 12, label: 'number of stages N' }}
    y={{ min: 1, max: 20000, log: true, label: 'delay (units of τ)' }}
    height={190}
    series={[{ points: curve, color: 'var(--series-1)', width: 2.5 }]}
    markers={[{ x: best, y: chainDelay(h, best), color: 'var(--ok)', r: 4 }, { x: n, y: d, color: 'var(--ac)' }]}
  />
  <dl class="nums ui">
    <div><dt>Stage effort f = H<sup>1/N</sup></dt><dd>{f.toFixed(2)}</dd></div>
    <div><dt>Delay N(f + 1)</dt><dd>{d.toFixed(1)} τ</dd></div>
    <div><dt>Best N for this load</dt><dd>{best} (f = {(h ** (1 / best)).toFixed(2)})</dd></div>
  </dl>
</Widget>

<style>
  .chain {
    width: 100%;
    height: auto;
    display: block;
    margin-bottom: 0.4rem;
  }
  .inv {
    fill: var(--surface-2);
    stroke: var(--ink);
    stroke-width: 1.5;
  }
  .bub {
    fill: var(--surface);
    stroke: var(--ink);
    stroke-width: 1.3;
  }
  .load {
    stroke: var(--ink);
    stroke-width: 3;
  }
  .t {
    font-family: var(--font-ui);
    font-size: 15px;
    fill: var(--ink);
  }
  .nums {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
    gap: 0.4rem 1rem;
    margin: 0.6rem 0 0;
    font-size: 0.82rem;
  }
  .nums dt {
    color: var(--ink-3);
  }
  .nums dd {
    margin: 0;
    font-family: var(--font-mono);
    font-weight: 600;
  }
</style>
