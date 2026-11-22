<!--
  A mirror for extreme ultraviolet light: alternating layers of molybdenum and silicon, each reflecting a
  fraction of a per cent at its interfaces. Choose how many pairs and how thick each pair is; the reflectivity
  against wavelength comes from thin-film optics (the transfer-matrix method). Then send the light through the
  dozen or so mirrors of a scanner and see how much reaches the wafer.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import Plot from '$lib/components/ui/Plot.svelte';
  import { INDEX, peak, reflectivity, surfaceReflectivity } from '$lib/fab/euv';

  let pairs = $state(10);
  let period = $state(7.1);
  let mirrors = $state(10);
  const GAMMA = 0.4;
  const stack = $derived({ pairs, period, gamma: GAMMA });
  const curve = $derived(Array.from({ length: 161 }, (_, i) => 12.8 + (i * 1.6) / 160).map((w) => [w, reflectivity(stack, w) * 100] as [number, number]));
  const r = $derived(reflectivity(stack, 13.5));
  const top = $derived(peak(stack));
  const moSurface = surfaceReflectivity(INDEX.mo);
  const left = $derived(r ** mirrors);
  const pct = (x: number, d = 1) => (x >= 1e-4 || x === 0 ? `${(x * 100).toFixed(d)} %` : `${(x * 1e6).toPrecision(2)} parts per million`);
  // The stack drawing: at most 30 pairs drawn, scaled to fit.
  const shown = $derived(Math.min(pairs, 30));
</script>

<Widget title="A mirror for EUV light" subtitle="Nothing reflects 13.5 nm light well: a polished molybdenum surface returns {pct(moSurface, 2)} of it. Stack thin layers of molybdenum and silicon, and tune their period so that the weak reflections from every interface add up.">
  {#snippet controls()}
    <Slider bind:value={pairs} min={1} max={60} step={1} label="Mo–Si pairs" format={(v) => String(v)} />
    <Slider bind:value={period} min={6.6} max={7.3} step={0.01} label="Period (one pair)" format={(v) => `${v.toFixed(2)} nm`} />
    <Slider bind:value={mirrors} min={1} max={12} step={1} label="Mirrors in the scanner" format={(v) => String(v)} />
  {/snippet}
  <div class="two">
    <Plot
      label="Reflectivity against wavelength"
      x={{ min: 12.8, max: 14.4, label: 'wavelength (nm)', format: (v) => v.toFixed(1) }}
      y={{ min: 0, max: 80, label: 'reflectivity (%)' }}
      height={230}
      series={[{ points: curve, color: 'var(--series-1)', width: 2.5, fillTo: 0, opacity: 0.2 }]}
      vlines={[{ at: 13.5, label: '13.5 nm source', color: 'var(--ac)' }]}
      markers={[{ x: 13.5, y: r * 100, color: 'var(--ac)' }]}
    />
    <svg viewBox="0 0 160 230" class="stack" role="img" aria-label="Cross-section of the mirror: {pairs} pairs of molybdenum and silicon, {period.toFixed(2)} nm each">
      <text x="80" y="14" class="t c">{pairs} pair{pairs === 1 ? '' : 's'}, {(pairs * period).toFixed(0)} nm in all</text>
      {#each Array.from({ length: shown }) as _, i (i)}
        {@const h = 180 / Math.max(shown, 12)}
        <rect x="20" y={24 + i * h} width="120" height={h * (1 - GAMMA)} class="si" />
        <rect x="20" y={24 + i * h + h * (1 - GAMMA)} width="120" height={h * GAMMA} class="mo" />
      {/each}
      <rect x="20" y={24 + shown * (180 / Math.max(shown, 12))} width="120" height={206 - (24 + shown * (180 / Math.max(shown, 12)))} class="sub" />
      {#if pairs > shown}<text x="80" y="222" class="t c">(first 30 drawn)</text>{/if}
      <g class="key"><rect x="20" y="212" width="8" height="8" class="mo" /><text x="31" y="219" class="t">Mo</text><rect x="58" y="212" width="8" height="8" class="si stroke" /><text x="69" y="219" class="t">Si</text></g>
    </svg>
  </div>
  <div class="chain ui" role="img" aria-label="{mirrors} mirrors, each reflecting {pct(r)}: {pct(left, 2)} of the light reaches the wafer">
    <span class="lbl">Source</span>
    {#each Array.from({ length: mirrors }) as _, i (i)}
      <span class="m" style:opacity={Math.max(0.12, r ** (i + 1))} title="After mirror {i + 1}: {pct(r ** (i + 1), 2)}"></span>
    {/each}
    <span class="lbl">Wafer</span>
  </div>
  <dl class="nums ui">
    <div><dt>Reflectivity at 13.5 nm</dt><dd>{pct(r)}</dd></div>
    <div><dt>Peak</dt><dd>{pct(top.r)} at {top.wavelength.toFixed(2)} nm</dd></div>
    <div><dt>Light reaching the wafer after {mirrors} mirror{mirrors === 1 ? '' : 's'}</dt><dd class:low={left < 0.05}>{pct(left, 2)}</dd></div>
  </dl>
</Widget>

<style>
  .two {
    display: grid;
    grid-template-columns: minmax(0, 1.6fr) minmax(0, 0.7fr);
    gap: 1rem;
    align-items: center;
  }
  @media (max-width: 640px) {
    .two {
      grid-template-columns: minmax(0, 1fr);
    }
    .stack {
      max-width: 12rem;
      margin: 0 auto;
    }
  }
  .stack {
    width: 100%;
    height: auto;
    font-family: var(--font-ui);
  }
  .si {
    fill: var(--m-si);
  }
  .si.stroke {
    stroke: var(--ink-3);
    stroke-width: 0.6;
  }
  .mo {
    fill: var(--m-metal);
  }
  .sub {
    fill: var(--m-si);
    opacity: 0.6;
  }
  .t {
    font-size: 9px;
    fill: var(--ink-2);
  }
  .t.c {
    text-anchor: middle;
  }
  .chain {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    flex-wrap: wrap;
    margin: 0.8rem 0 0.4rem;
    font-size: 0.78rem;
    color: var(--ink-3);
  }
  .chain .m {
    width: 1.3rem;
    height: 1.3rem;
    border-radius: 3px;
    background: var(--ac);
    border: 1px solid var(--line-strong);
  }
  .nums {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
    gap: 0.4rem 1rem;
    margin: 0.4rem 0 0;
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
  .nums dd.low {
    color: var(--bad);
  }
</style>
