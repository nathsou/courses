<!--
  Doping along a Czochralski ingot. The melt is doped so that the first crystal (the seed end) has the target
  resistivity; as the crystal grows, the dopant it rejects accumulates in the shrinking melt (Scheil's equation),
  so later crystal is more heavily doped. Wafers are sold to a resistivity specification: how much of the ingot
  meets it?
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import Plot from '$lib/components/ui/Plot.svelte';
  import { SEGREGATION, scheil } from '$lib/fab/fab';
  import { resistivity } from '$lib/physics/semiconductor';

  let dopant = $state('B');
  let target = $state(10);
  let tol = $state(20);

  const d = $derived(SEGREGATION[dopant]!);
  const rho = (n: number) => (d.type === 'p' ? resistivity(0, n) : resistivity(n, 0));
  /** Doping that gives resistivity r (bisection on a log scale). */
  const dopingFor = (r: number) => {
    let lo = 1e12;
    let hi = 1e20;
    for (let i = 0; i < 80; i++) {
      const mid = Math.sqrt(lo * hi);
      if (rho(mid) > r) lo = mid;
      else hi = mid;
    }
    return Math.sqrt(lo * hi);
  };
  const seed = $derived(dopingFor(target));
  const along = $derived(Array.from({ length: 96 }, (_, i) => {
    const fs = i / 100;
    return { fs, n: (seed * scheil(d.k, fs)) / d.k, r: rho((seed * scheil(d.k, fs)) / d.k) };
  }));
  const inSpec = $derived(along.filter((p) => Math.abs(p.r - target) / target <= tol / 100));
  const usable = $derived(inSpec.length ? Math.max(...inSpec.map((p) => p.fs)) + 0.01 : 0);
  const color = (r: number) => (Math.abs(r - target) / target <= tol / 100 ? 'var(--ok)' : 'var(--bad)');
</script>

<Widget title="Doping a crystal as it grows" subtitle="The melt is doped so that the first crystal pulled has the target resistivity. Each dopant prefers the melt to the solid by its own factor, so the melt, and the crystal, get richer in dopant as growth goes on.">
  {#snippet controls()}
    <Segmented bind:value={dopant} label="Dopant" options={Object.entries(SEGREGATION).map(([k, v]) => ({ value: k, label: `${v.name} (k = ${v.k})` }))} size="sm" />
    <Slider bind:value={target} min={1} max={50} step={0.5} label="Target resistivity" format={(v) => `${v.toFixed(1)} Ω·cm`} />
    <Slider bind:value={tol} min={5} max={50} step={1} label="Specification" format={(v) => `± ${v} %`} />
  {/snippet}
  <svg viewBox="0 0 600 70" class="ingot" role="img" aria-label="The ingot, seed end on the left; {Math.round(usable * 100)} % of it within specification">
    <path d="M10,35 L40,20 L560,20 Q590,35 560,50 L40,50 Z" class="body" />
    {#each along as p, i (i)}<rect x={40 + p.fs * 545} y="21" width="6.2" height="28" fill={color(p.r)} opacity="0.55" />{/each}
    <text x="12" y="66" class="t">seed end</text>
    <text x="590" y="66" class="t r">tail</text>
  </svg>
  <Plot
    label="Resistivity along the ingot"
    x={{ min: 0, max: 0.95, label: 'fraction of the melt solidified', format: (v) => `${Math.round(v * 100)} %` }}
    y={{ min: Math.max(0.01, target / 20), max: target * 2, log: true, label: 'resistivity (Ω·cm)' }}
    height={220}
    series={[{ points: along.map((p) => [p.fs, p.r] as [number, number]), color: 'var(--series-1)', width: 2.5 }]}
    hlines={[{ at: target * (1 + tol / 100), color: 'var(--ok)', label: `+${tol} %` }, { at: target * (1 - tol / 100), color: 'var(--ok)', label: `−${tol} %` }]}
  />
  <dl class="nums ui">
    <div><dt>Segregation coefficient k</dt><dd>{d.k}</dd></div>
    <div><dt>Doping at the seed end</dt><dd>{seed.toExponential(2).replace('e+', ' × 10^')} per cm³</dd></div>
    <div><dt>Ingot within specification</dt><dd>{Math.round(usable * 100)} %</dd></div>
  </dl>
</Widget>

<style>
  .ingot {
    width: 100%;
    height: auto;
    display: block;
    font-family: var(--font-ui);
  }
  .body {
    fill: var(--m-si);
    stroke: var(--ink-2);
  }
  .t {
    font-size: 11px;
    fill: var(--ink-2);
  }
  .t.r {
    text-anchor: end;
  }
  .nums {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
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
