<!--
  A wafer and its dies. In "dies" mode: choose the wafer and die size and count the whole dies (an edge ring of
  3 mm is unusable). In "yield" mode: scatter random defects (optionally clustered); a die with a defect fails;
  compare the measured yield with the Poisson and negative-binomial models, and work out the cost of a good die.
-->
<script lang="ts">
  import { untrack } from 'svelte';
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import Toggle from '$lib/components/ui/Toggle.svelte';
  import { rng } from '$lib/eda/sim';
  import { dieGrid, diesPerWaferFormula, yieldNegBinomial, yieldPoisson } from '$lib/fab/fab';

  let { mode = 'dies' }: { mode?: 'dies' | 'yield' } = $props();
  let diameter = $state(300);
  let dw = $state(untrack(() => (mode === 'yield' ? 15 : 10)));
  let dh = $state(untrack(() => (mode === 'yield' ? 15 : 10)));
  let density = $state(0.2);
  let clustered = $state(false);
  let seed = $state(1);
  let waferCost = $state(17000);

  const grid = $derived(dieGrid(diameter, dw, dh));
  const formula = $derived(diesPerWaferFormula(diameter, dw * dh));
  const R = $derived(diameter / 2);
  const defects = $derived.by(() => {
    if (mode !== 'yield') return [] as [number, number][];
    const r = rng(seed * 7919 + 13);
    const area = Math.PI * (R / 10) ** 2; // cm²
    const expected = density * area;
    // Poisson-distributed count (normal approximation is fine for the numbers here).
    const count = Math.max(0, Math.round(expected + Math.sqrt(expected) * (r() + r() + r() - 1.5) * 2));
    const pts: [number, number][] = [];
    const centres: [number, number][] = [];
    for (let i = 0; i < count; i++) {
      if (clustered && centres.length && r() < 0.75) {
        const c = centres[Math.floor(r() * centres.length)]!;
        const a = r() * 2 * Math.PI;
        const d = r() * 12;
        pts.push([c[0] + d * Math.cos(a), c[1] + d * Math.sin(a)]);
        continue;
      }
      for (;;) {
        const x = (r() * 2 - 1) * R;
        const y = (r() * 2 - 1) * R;
        if (Math.hypot(x, y) <= R) {
          pts.push([x, y]);
          centres.push([x, y]);
          break;
        }
      }
    }
    return pts;
  });
  const dead = $derived(new Set(grid.dies.map((d, i) => (defects.some(([x, y]) => x >= d.x && x < d.x + dw && y >= d.y && y < d.y + dh) ? i : -1)).filter((i) => i >= 0)));
  const whole = $derived(grid.dies.map((d, i) => ({ d, i })).filter(({ d }) => d.whole));
  const good = $derived(whole.filter(({ i }) => !dead.has(i)).length);
  const areaCm2 = $derived((dw * dh) / 100);
  const S = $derived(560 / diameter);
</script>

<Widget title={mode === 'yield' ? 'Defects and yield' : 'Dies on a wafer'} subtitle={mode === 'yield' ? 'Random defects land on the wafer; any die with a defect in it fails. Bigger dies catch more defects.' : 'Whole dies (coloured) fit inside the usable area; partial dies at the edge (grey) are wasted.'}>
  {#snippet controls()}
    {#if mode === 'dies'}<Segmented bind:value={diameter} label="Wafer" size="sm" options={[150, 200, 300, 450].map((d) => ({ value: d, label: `${d} mm` }))} />{/if}
    <Slider bind:value={dw} min={2} max={33} step={0.5} label="Die width" format={(v) => `${v} mm`} />
    <Slider bind:value={dh} min={2} max={26} step={0.5} label="Die height" format={(v) => `${v} mm`} />
    {#if mode === 'yield'}
      <Slider bind:value={density} min={0.01} max={2} step={0.01} label="Defect density" format={(v) => `${v.toFixed(2)} per cm²`} />
      <Toggle bind:checked={clustered} label="Defects cluster" />
      <button class="b ui" onclick={() => seed++}>Another wafer</button>
    {/if}
  {/snippet}
  <div class="two">
    <svg viewBox="-290 -290 580 580" class="w" role="img" aria-label="{grid.whole} whole dies{mode === 'yield' ? `, ${good} good` : ''}">
      <defs><clipPath id="wafer-clip-{mode}"><circle r={R * S} /></clipPath></defs>
      <circle r={R * S} class="wafer" />
      <circle r={(R - 3) * S} class="edge" />
      <g clip-path="url(#wafer-clip-{mode})">
      {#each grid.dies as d, i (i)}
        <rect x={d.x * S} y={d.y * S} width={dw * S} height={dh * S} class="die" class:whole={d.whole} class:dead={d.whole && dead.has(i)} />
      {/each}
      </g>
      {#each defects as [x, y], i (i)}<circle cx={x * S} cy={y * S} r="2.2" class="def" />{/each}
      <path d="M-6,{-R * S + 1} L6,{-R * S + 1} L0,{-R * S + 9} Z" class="notch" />
    </svg>
    <dl class="nums ui">
      <div><dt>Die area</dt><dd>{(dw * dh).toFixed(0)} mm²</dd></div>
      <div><dt>Whole dies</dt><dd>{grid.whole}</dd></div>
      <div><dt>Estimate πr²/A − πd/√(2A)</dt><dd>{Math.max(0, formula).toFixed(0)}</dd></div>
      <div><dt>Wafer area used by whole dies</dt><dd>{((grid.whole * dw * dh) / (Math.PI * R * R) * 100).toFixed(0)} %</dd></div>
      {#if mode === 'yield'}
        <div><dt>Good dies</dt><dd>{good} of {grid.whole} ({grid.whole ? ((good / grid.whole) * 100).toFixed(0) : 0} %)</dd></div>
        <div><dt>Poisson model e<sup>−AD</sup></dt><dd>{(yieldPoisson(areaCm2, density) * 100).toFixed(0)} %</dd></div>
        <div><dt>Clustered model (α = 2)</dt><dd>{(yieldNegBinomial(areaCm2, density, 2) * 100).toFixed(0)} %</dd></div>
        <div class="cost">
          <Slider bind:value={waferCost} min={1000} max={30000} step={500} label="Cost of a processed wafer" format={(v) => `$${v.toLocaleString('en-GB')}`} />
          <p>Cost per good die: <strong>{good ? `$${(waferCost / good).toFixed(2)}` : '—'}</strong></p>
        </div>
      {/if}
    </dl>
  </div>
</Widget>

<style>
  .two {
    display: grid;
    grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
    gap: 1.2rem;
    align-items: center;
  }
  @media (max-width: 640px) {
    .two {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .w {
    width: 100%;
    max-width: 26rem;
    height: auto;
    display: block;
    margin: 0 auto;
  }
  .wafer {
    fill: var(--m-si);
    stroke: var(--ink-2);
    stroke-width: 1.5;
  }
  .edge {
    fill: none;
    stroke: var(--ink-3);
    stroke-dasharray: 3 3;
  }
  .die {
    fill: var(--surface-3);
    stroke: var(--page);
    stroke-width: 0.6;
    opacity: 0.35;
  }
  .die.whole {
    fill: var(--series-1);
    opacity: 0.75;
  }
  .die.whole.dead {
    fill: var(--bad);
    opacity: 0.85;
  }
  .def {
    fill: var(--fx-yellow);
    stroke: var(--ink);
    stroke-width: 0.6;
  }
  .notch {
    fill: var(--page);
  }
  .nums {
    display: grid;
    gap: 0.45rem;
    margin: 0;
    font-size: 0.84rem;
  }
  .nums dt {
    color: var(--ink-3);
  }
  .nums dd {
    margin: 0;
    font-family: var(--font-mono);
    font-weight: 600;
  }
  .cost p {
    margin: 0.3rem 0 0;
  }
  .b {
    font: inherit;
    font-size: 0.84rem;
    border: 1px solid var(--line-strong);
    background: var(--surface);
    color: var(--ink);
    border-radius: var(--radius-sm);
    padding: 0.3rem 0.9rem;
    cursor: pointer;
    min-height: 2.2rem;
  }
</style>
