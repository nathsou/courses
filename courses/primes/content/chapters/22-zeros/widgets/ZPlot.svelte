<!--
  Hardy's Z(t) on a window of the critical line. Zeros of ζ on the line are sign changes of Z. Gram points g_n
  (where θ(g_n) = nπ) are marked: "good" if (−1)^n Z(g_n) > 0, which usually holds and puts one zero between
  consecutive Gram points (Gram's law). The first bad Gram point is g_126. Optional overlay: the Riemann–Siegel
  main sum, which needs only √(t/2π) terms.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import Toggle from '$lib/components/ui/Toggle.svelte';
  import Plot from '$lib/charts/Plot.svelte';
  import { hardyZ, riemannSiegelZ, gramPoint, theta } from '$lib/primes/zeta';

  let start = $state(10);
  let width = $state(50);
  let showRS = $state(false);
  let hover = $state<number | null>(null);

  const samples = $derived.by(() => {
    const n = 500;
    return Array.from({ length: n + 1 }, (_, i) => {
      const t = start + (width * i) / n;
      return { t, z: hardyZ(t) };
    });
  });
  const rs = $derived(showRS ? samples.map((p) => ({ t: p.t, z: riemannSiegelZ(p.t, 0) })) : []);
  const zMax = $derived(Math.max(1e-3, ...samples.map((p) => Math.abs(p.z))) * 1.08);
  const zeros = $derived.by(() => {
    const out: number[] = [];
    for (let i = 1; i < samples.length; i++) {
      const a = samples[i - 1]!;
      const b = samples[i]!;
      if (Math.sign(a.z) !== Math.sign(b.z)) out.push(a.t - (a.z * (b.t - a.t)) / (b.z - a.z));
    }
    return out;
  });
  const grams = $derived.by(() => {
    const out: { n: number; t: number; good: boolean }[] = [];
    if (start + width < 9.67) return out;
    let n = Math.max(-1, Math.ceil(theta(Math.max(start, 9.67)) / Math.PI - 1e-9));
    for (let k = 0; k < 400; k++, n++) {
      const g = gramPoint(n);
      if (g > start + width) break;
      if (g < start) continue;
      out.push({ n, t: g, good: (n % 2 === 0 ? 1 : -1) * hardyZ(g) > 0 });
    }
    return out;
  });
  const bad = $derived(grams.filter((g) => !g.good));
  const PRESETS = [
    { label: 'the first zeros', start: 10, width: 50 },
    { label: 'Gram’s law fails (g₁₂₆)', start: 270, width: 20 },
    { label: 'Lehmer’s pair near 7005', start: 7004.9, width: 0.4 },
    { label: 'around t = 1000', start: 1000, width: 20 },
  ];
  const sub = (n: number) => String(n).replace(/[0-9-]/g, (d) => (d === '-' ? '₋' : '₀₁₂₃₄₅₆₇₈₉'[+d]!));
  const zAt = (t: number) => samples[Math.round(((t - start) / width) * 500)]?.z ?? 0;
</script>

<Widget title="Hardy’s Z function" subtitle="Z(t) is real, and |Z(t)| = |ζ(½ + it)|. Every sign change is a zero of ζ on the critical line. The ticks on the axis are Gram points: green when Gram’s law holds there, red when it fails." onreset={() => ((start = 10), (width = 50), (showRS = false))}>
  {#snippet controls()}
    <Slider label="from t =" bind:value={start} min={0} max={9800} step={0.5} format={(v) => v.toFixed(1)} />
    <Slider label="window width" bind:value={width} min={0.2} max={100} step={0.1} log format={(v) => (v < 10 ? v.toFixed(1) : v.toFixed(0))} />
    <Toggle bind:checked={showRS} label="Riemann–Siegel main sum" />
  {/snippet}
  <div class="presets ui">
    {#each PRESETS as p (p.label)}
      <button onclick={() => ((start = p.start), (width = p.width))}>{p.label}</button>
    {/each}
  </div>
  <Plot x={{ domain: [start, start + width], label: 't' }} y={{ domain: [-zMax, zMax], label: 'Z(t)' }} height={280} label="Hardy's Z function from t = {start} to {start + width}." onpointer={(p) => (hover = p ? p.x : null)}>
    {#snippet marks({ sx, sy })}
      <line class="axis" x1={sx(start)} x2={sx(start + width)} y1={sy(0)} y2={sy(0)} />
      {#each grams as g (g.n)}
        <line class="gram" class:bad={!g.good} x1={sx(g.t)} x2={sx(g.t)} y1={sy(0) - 7} y2={sy(0) + 7}><title>g_{g.n} = {g.t.toFixed(3)}</title></line>
      {/each}
      {#if showRS}<path class="rs" d={'M' + rs.map((p) => `${sx(p.t)},${sy(p.z)}`).join('L')} />{/if}
      <path class="z" d={'M' + samples.map((p) => `${sx(p.t)},${sy(p.z)}`).join('L')} />
      {#each zeros as t, i (i)}<circle cx={sx(t)} cy={sy(0)} r="3.5" class="zero" />{/each}
    {/snippet}
  </Plot>
  <p class="out" aria-live="polite">
    {#if hover !== null}
      t = {hover.toFixed(3)}: Z(t) = {zAt(hover).toFixed(5)}{showRS ? `, Riemann–Siegel main sum ${riemannSiegelZ(hover, 0).toFixed(5)}` : ''}.
    {:else}
      {zeros.length} sign changes (zeros) and {grams.length} Gram points in this window{bad.length ? `; Gram’s law fails at ${bad.map((g) => `g${sub(g.n)}`).join(', ')}` : ''}.
      {#if showRS}The dashed curve uses only ⌊√(t/2π)⌋ = {Math.floor(Math.sqrt((start + width) / (2 * Math.PI)))} terms near the right edge.{/if}
    {/if}
  </p>
</Widget>

<style>
  .presets {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-bottom: 0.4rem;
  }
  .presets button {
    font: inherit;
    font-size: 0.76rem;
    padding: 0.15rem 0.55rem;
    border: 1px solid var(--rule);
    border-radius: 999px;
    background: transparent;
    color: var(--ink-2);
    cursor: pointer;
  }
  .axis {
    stroke: var(--fg);
    stroke-width: 1;
  }
  .z {
    fill: none;
    stroke: var(--fx-blue);
    stroke-width: 1.8;
  }
  .rs {
    fill: none;
    stroke: var(--series-3);
    stroke-width: 1.4;
    stroke-dasharray: 5 3;
  }
  .gram {
    stroke: var(--ok);
    stroke-width: 2;
  }
  .gram.bad {
    stroke: var(--bad);
    stroke-width: 3;
  }
  .zero {
    fill: var(--prime);
  }
  .out {
    margin: 0.4rem 0 0;
    font-size: 0.86rem;
  }
</style>
