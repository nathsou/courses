<!--
  Thermal oxidation (the Deal–Grove model): oxide thickness against time in dry oxygen or steam, at a chosen
  furnace temperature, on (100) silicon. The oxide grows into the silicon as well as above it.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import Plot from '$lib/components/ui/Plot.svelte';
  import { SILICON_CONSUMED, dealGrove, oxideThickness } from '$lib/fab/fab';

  let tC = $state(1000);
  let hours = $state(1);
  const dry = $derived(Array.from({ length: 101 }, (_, i) => [(i / 100) * 8, oxideThickness('dry', tC, (i / 100) * 8) * 1000] as [number, number]));
  const wet = $derived(Array.from({ length: 101 }, (_, i) => [(i / 100) * 8, oxideThickness('wet', tC, (i / 100) * 8) * 1000] as [number, number]));
  const xd = $derived(oxideThickness('dry', tC, hours) * 1000);
  const xw = $derived(oxideThickness('wet', tC, hours) * 1000);
  const dg = $derived(dealGrove('wet', tC));
  const scale = $derived(120 / Math.max(xw, 1));
</script>

<Widget title="Growing oxide" subtitle="Silicon heated in oxygen grows a layer of glass. Oxygen must diffuse through the oxide already grown to reach the silicon, so growth slows as the layer thickens.">
  {#snippet controls()}
    <Slider bind:value={tC} min={800} max={1200} step={10} label="Furnace temperature" format={(v) => `${v} °C`} />
    <Slider bind:value={hours} min={0.05} max={8} step={0.05} label="Time" format={(v) => `${v.toFixed(2)} h`} />
  {/snippet}
  <div class="two">
    <Plot
      label="Oxide thickness against time"
      x={{ min: 0, max: 8, label: 'time (hours)' }}
      y={{ min: 0, max: Math.max(100, ...wet.map((p) => p[1])) * 1.05, label: 'oxide thickness (nm)' }}
      height={230}
      series={[
        { points: wet, color: 'var(--series-1)', width: 2.5, label: 'wet (steam)' },
        { points: dry, color: 'var(--series-2)', width: 2.5, label: 'dry oxygen' },
      ]}
      markers={[{ x: hours, y: xw, color: 'var(--series-1)' }, { x: hours, y: xd, color: 'var(--series-2)' }]}
    />
    <svg viewBox="0 0 200 230" class="xs" role="img" aria-label="Cross-section: {xw.toFixed(0)} nm of wet oxide, of which {(SILICON_CONSUMED * 100).toFixed(0)} % lies below the original surface">
      <rect x="20" y="40" width="160" height="190" class="si" />
      <rect x="20" y={130 - xw * scale * (1 - SILICON_CONSUMED)} width="160" height={xw * scale} class="ox" />
      <line x1="10" x2="190" y1="130" y2="130" class="orig" />
      <text x="186" y="126" class="t r">original surface</text>
      <text x="100" y={130 - xw * scale * (1 - SILICON_CONSUMED) + (xw * scale) / 2 + 4} class="t c">oxide {xw.toFixed(0)} nm</text>
      <text x="100" y="220" class="t c">silicon</text>
    </svg>
  </div>
  <dl class="nums ui">
    <div><dt>Wet oxide after {hours.toFixed(2)} h</dt><dd>{xw.toFixed(0)} nm</dd></div>
    <div><dt>Dry oxide after {hours.toFixed(2)} h</dt><dd>{xd.toFixed(1)} nm</dd></div>
    <div><dt>Silicon consumed (wet)</dt><dd>{(xw * SILICON_CONSUMED).toFixed(0)} nm</dd></div>
    <div><dt>Wet growth regime</dt><dd>{xw / 1000 < dg.A / 2 ? 'mostly linear (reaction-limited)' : 'mostly parabolic (diffusion-limited)'}</dd></div>
  </dl>
</Widget>

<style>
  .two {
    display: grid;
    grid-template-columns: minmax(0, 1.5fr) minmax(0, 0.8fr);
    gap: 1rem;
    align-items: center;
  }
  @media (max-width: 640px) {
    .two {
      grid-template-columns: minmax(0, 1fr);
    }
    .xs {
      max-width: 14rem;
      margin: 0 auto;
    }
  }
  .xs {
    width: 100%;
    height: auto;
    font-family: var(--font-ui);
  }
  .si {
    fill: var(--m-si);
  }
  .ox {
    fill: var(--m-oxide);
    stroke: var(--m-oxide-edge);
  }
  .orig {
    stroke: var(--ink);
    stroke-dasharray: 4 3;
  }
  .t {
    font-size: 10px;
    fill: var(--ink);
  }
  .t.c {
    text-anchor: middle;
  }
  .t.r {
    text-anchor: end;
  }
  .nums {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
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
</style>
