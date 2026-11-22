<!--
  Printing a grating of lines. Top: the mask, opaque lines on clear glass. Middle left: the diffraction orders the
  mask sends out (spikes, height = amplitude) against the lens's pupil (the band of angles it collects); orders
  outside the band are lost. Middle right: the aerial image rebuilt from the orders that pass, with the resist's
  threshold. Bottom: the resist pattern that results (positive resist: dissolved where the light exceeds the
  threshold).
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import Plot from '$lib/components/ui/Plot.svelte';
  import { gratingImage, minPitch, printedLine, type Optics } from '$lib/fab/litho';

  const TOOLS = [
    { id: 'g', name: 'g-line (1980s)', lambda: 436, NA: 0.45 },
    { id: 'i', name: 'i-line (1990s)', lambda: 365, NA: 0.6 },
    { id: 'krf', name: 'KrF laser (late 1990s)', lambda: 248, NA: 0.8 },
    { id: 'arf', name: 'ArF laser (2000s)', lambda: 193, NA: 0.93 },
    { id: 'arfi', name: 'ArF immersion (2007–)', lambda: 193, NA: 1.35 },
    { id: 'euv', name: 'EUV (2019–)', lambda: 13.5, NA: 0.33 },
    { id: 'hna', name: 'High-NA EUV (mid-2020s)', lambda: 13.5, NA: 0.55 },
  ];
  let tool = $state('arfi');
  let pitch = $state(160);
  let duty = $state(0.5);
  let sigma = $state(0.5);
  let defocus = $state(0);
  let threshold = $state(0.3);

  const t = $derived(TOOLS.find((x) => x.id === tool)!);
  const o = $derived<Optics>({ lambda: t.lambda, NA: t.NA, sigma, defocus });
  const w = $derived(pitch * duty);
  const img = $derived(gratingImage(o, pitch, w, 160));
  const cd = $derived(printedLine(img, pitch, threshold));
  const imax = $derived(Math.max(...img));
  const imin = $derived(Math.min(...img));
  const contrast = $derived((imax - imin) / (imax + imin || 1));
  const k1 = $derived(((pitch / 2) * t.NA) / t.lambda);
  const pmin = $derived(minPitch(o));
  // Two periods, centred on a line.
  const curve = $derived(Array.from({ length: 321 }, (_, i) => [(i / 160 - 1) * pitch, img[i % 160]!] as [number, number]));
  const orders = $derived.by(() => {
    const out: { s: number; a: number; pass: boolean }[] = [];
    const kmax = Math.min(12, Math.ceil((2.2 * pitch * t.NA) / t.lambda) + 2);
    for (let k = -kmax; k <= kmax; k++) {
      const c = k === 0 ? 1 - duty : Math.abs(duty * (Math.sin(Math.PI * k * duty) / (Math.PI * k * duty)));
      const s = (k * t.lambda) / (pitch * t.NA); // order position in units of NA
      out.push({ s, a: c, pass: Math.abs(s) <= 1 + sigma });
    }
    return out;
  });
  const status = $derived(cd === 0 ? 'nothing prints: the light exceeds the threshold everywhere' : cd >= pitch ? 'nothing prints: the light never reaches the threshold' : contrast < 0.05 ? 'barely any contrast' : `lines print ${cd.toFixed(1)} nm wide (mask: ${w.toFixed(1)} nm)`);
</script>

<Widget title="Printing a grating" subtitle="A mask of opaque lines at a chosen pitch, imaged by a projection lens onto photoresist. Shrink the pitch until the pattern disappears, then try a shorter wavelength or a larger lens.">
  {#snippet controls()}
    <label class="sel ui">Exposure tool
      <select bind:value={tool}>{#each TOOLS as x (x.id)}<option value={x.id}>{x.name}: {x.lambda} nm, NA {x.NA}</option>{/each}</select>
    </label>
    <Slider bind:value={pitch} min={20} max={1200} log label="Pitch (line + space)" format={(v) => `${v.toFixed(0)} nm`} />
    <Slider bind:value={duty} min={0.25} max={0.75} step={0.01} label="Line ÷ pitch on the mask" format={(v) => v.toFixed(2)} />
    <Slider bind:value={sigma} min={0} max={1} step={0.05} label="Illumination σ" format={(v) => v.toFixed(2)} />
    <Slider bind:value={defocus} min={-300} max={300} step={5} label="Defocus" format={(v) => `${v.toFixed(0)} nm`} />
    <Slider bind:value={threshold} min={0.1} max={0.7} step={0.01} label="Resist threshold (dose)" format={(v) => v.toFixed(2)} />
  {/snippet}
  <svg viewBox="0 0 600 26" class="strip" preserveAspectRatio="none" role="img" aria-label="The mask: opaque lines {w.toFixed(0)} nm wide at {pitch.toFixed(0)} nm pitch">
    <rect x="0" y="0" width="600" height="26" class="glass" />
    {#each [-1, 0, 1] as k (k)}<rect x={300 + ((k * pitch - w / 2) / (2 * pitch)) * 600} y="0" width={(w / (2 * pitch)) * 600} height="26" class="chrome" />{/each}
    <text x="6" y="17" class="lab">mask</text>
  </svg>
  <div class="two">
    <svg viewBox="-150 -70 300 90" class="pupil" role="img" aria-label="{orders.filter((x) => x.pass).length} diffraction orders inside the lens's reach">
      <rect x={-100 * (1 + sigma)} y="-64" width={200 * (1 + sigma)} height="64" class="reach" />
      <rect x="-100" y="-64" width="200" height="64" class="lens" />
      <line x1="-150" x2="150" y1="0" y2="0" class="ax" />
      {#each orders as d, i (i)}
        {#if Math.abs(d.s) < 1.5}<line x1={d.s * 100} x2={d.s * 100} y1="0" y2={-4 - 56 * d.a} class="ord" class:pass={d.pass} />{/if}
      {/each}
      <text x="0" y="14" class="lab c">diffraction angle (in units of NA)</text>
      <text x="-98" y="-56" class="lab">lens</text>
    </svg>
    <Plot
      label="Aerial image over two periods"
      x={{ min: -pitch, max: pitch, label: 'position (nm)' }}
      y={{ min: 0, max: Math.max(1.2, imax * 1.05), label: 'intensity' }}
      height={170}
      series={[{ points: curve, color: 'var(--series-3)', width: 2.5, fillTo: 0, opacity: 0.12 }]}
      hlines={[{ at: threshold, label: 'threshold', color: 'var(--bad)' }]}
    />
  </div>
  <svg viewBox="0 0 600 26" class="strip" preserveAspectRatio="none" role="img" aria-label="Printed resist: {status}">
    <rect x="0" y="0" width="600" height="26" class="sub" />
    {#each curve as [x, v], i (i)}
      {#if i < curve.length - 1 && v < threshold}<rect x={((x + pitch) / (2 * pitch)) * 600} y="0" width={600 / 320 + 0.5} height="26" class="resist" />{/if}
    {/each}
    <text x="6" y="17" class="lab">resist</text>
  </svg>
  <dl class="nums ui">
    <div><dt>Result</dt><dd>{status}</dd></div>
    <div><dt>k₁ = (pitch/2) · NA / λ</dt><dd>{k1.toFixed(2)}</dd></div>
    <div><dt>Smallest pitch λ / (NA(1 + σ))</dt><dd>{pmin.toFixed(0)} nm</dd></div>
    <div><dt>Image contrast</dt><dd>{(contrast * 100).toFixed(0)} %</dd></div>
  </dl>
</Widget>

<style>
  .sel {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.82rem;
    color: var(--ink-2);
  }
  .sel select {
    font: inherit;
    padding: 0.3rem 0.4rem;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-sm);
    background: var(--page);
    color: var(--ink);
    max-width: 100%;
  }
  .strip {
    width: 100%;
    height: 26px;
    display: block;
    margin: 0.3rem 0;
    border-radius: 3px;
  }
  .glass {
    fill: var(--m-oxide);
  }
  .chrome {
    fill: var(--ink);
  }
  .sub {
    fill: var(--m-si);
  }
  .resist {
    fill: var(--m-resist);
  }
  .lab {
    font-family: var(--font-ui);
    font-size: 10px;
    fill: var(--ink);
    paint-order: stroke;
    stroke: var(--surface);
    stroke-width: 3px;
  }
  .lab.c {
    text-anchor: middle;
  }
  .two {
    display: grid;
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.3fr);
    gap: 1rem;
    align-items: center;
  }
  @media (max-width: 640px) {
    .two {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .pupil {
    width: 100%;
    height: auto;
    font-family: var(--font-ui);
  }
  .reach {
    fill: var(--accent-soft);
  }
  .lens {
    fill: var(--term-hl);
    stroke: var(--ac);
  }
  .ax {
    stroke: var(--ink-3);
  }
  .ord {
    stroke: var(--ink-3);
    stroke-width: 3;
    opacity: 0.5;
  }
  .ord.pass {
    stroke: var(--series-1);
    opacity: 1;
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
</style>
