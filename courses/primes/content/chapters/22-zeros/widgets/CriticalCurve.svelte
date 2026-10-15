<!--
  The image of the critical line under ζ: the curve t ↦ ζ(½ + it) for 0 ≤ t ≤ T. It starts at ζ(½) ≈ −1.46 and
  loops around; every time it passes through the origin, ζ has a zero on the critical line.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import { zetaOnLine } from '$lib/primes/zeta';
  import { ZEROS } from '$lib/primes/zeros';
  import { format } from '$lib/primes/complex';

  let T = $state(30);
  const STEP = 0.02;
  const all = Array.from({ length: Math.round(80 / STEP) + 1 }, (_, i) => {
    const t = i * STEP;
    return { t, z: zetaOnLine(t) };
  });
  const pts = $derived(all.slice(0, Math.round(T / STEP) + 1));
  const end = $derived(pts[pts.length - 1]!);
  const passed = $derived(ZEROS.filter((g) => g <= T));

  const W = 520;
  const H = 360;
  const R = 4.2;
  const X = (x: number) => W / 2 + (x / R) * (H / 2) * 0.95 - 30;
  const Y = (y: number) => H / 2 - (y / R) * (H / 2) * 0.95;
</script>

<Widget title="The critical line, through ζ’s eyes" subtitle="The curve traced by ζ(½ + it) as t runs from 0 to T. Each pass through the origin (the cross) is a zero on the critical line." onreset={() => (T = 30)}>
  {#snippet controls()}
    <Slider label="T" bind:value={T} min={0.5} max={80} step={0.1} format={(v) => v.toFixed(1)} />
  {/snippet}
  <svg viewBox="0 0 {W} {H}" class="plot" role="img" aria-label="The curve zeta of one half plus i t for t up to {T.toFixed(1)}; it passes through 0 {passed.length} times.">
    <line class="axis" x1="0" x2={W} y1={Y(0)} y2={Y(0)} />
    <line class="axis" y1="0" y2={H} x1={X(0)} x2={X(0)} />
    {#each [-4, -2, 2, 4] as k (k)}
      <text x={X(k)} y={Y(0) + 14} text-anchor="middle">{k}</text>
      <text x={X(0) + 5} y={Y(k) + 4}>{k}i</text>
    {/each}
    <polyline class="curve" points={pts.map((p) => `${X(p.z.re).toFixed(1)},${Y(p.z.im).toFixed(1)}`).join(' ')} />
    <path class="cross" d="M{X(0) - 6},{Y(0) - 6} l12,12 M{X(0) - 6},{Y(0) + 6} l12,-12" />
    <circle cx={X(end.z.re)} cy={Y(end.z.im)} r="5" class="head" />
  </svg>
  <p class="out" aria-live="polite">
    ζ(½ + {T.toFixed(1)}i) = {format(end.z, 3)}. Zeros passed: {passed.length}{passed.length ? ` (at t = ${passed.map((g) => g.toFixed(2)).join(', ')})` : ''}.
  </p>
</Widget>

<style>
  .plot {
    width: 100%;
    max-width: 640px;
    height: auto;
    display: block;
    margin: 0 auto;
    background: var(--chart-surface);
    border: 1px solid var(--line-strong);
    font-family: var(--font-mono);
  }
  .axis {
    stroke: var(--ruling);
  }
  text {
    font-size: 10px;
    fill: var(--mute);
  }
  .curve {
    fill: none;
    stroke: var(--fx-blue);
    stroke-width: 1.4;
    stroke-linejoin: round;
  }
  .cross {
    stroke: var(--prime);
    stroke-width: 2;
  }
  .head {
    fill: var(--prime);
  }
  .out {
    margin: 0.6rem 0 0;
    font-size: 0.86rem;
    overflow-wrap: anywhere;
  }
</style>
