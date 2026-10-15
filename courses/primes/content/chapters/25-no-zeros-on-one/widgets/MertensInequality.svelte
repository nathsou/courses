<!--
  The 3–4–1 trick. Top: |ζ(1 + it)|, which dips but never reaches 0. Bottom: for a chosen σ > 1, the product
  |ζ(σ)|³ |ζ(σ + it)|⁴ |ζ(σ + 2it)| as a function of t, on a log scale; it never drops below 1, because its logarithm
  is a sum of terms (3 + 4 cos θ + cos 2θ)/(k p^(kσ)) ≥ 0.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import Plot from '$lib/charts/Plot.svelte';
  import { c, abs } from '$lib/primes/complex';
  import { zeta } from '$lib/primes/zeta';

  let sigma = $state(1.05);
  let tMax = $state(40);
  let hover = $state<number | null>(null);
  const N = 600;
  const line = $derived(Array.from({ length: N + 1 }, (_, i) => (tMax * i) / N).map((t) => [t, t === 0 ? 20 : abs(zeta(c(1, t)))] as [number, number]));
  const zs = $derived(abs(zeta(c(sigma, 0))));
  const prod = $derived(line.map(([t]) => [t, Math.log10(zs ** 3 * abs(zeta(c(sigma, t))) ** 4 * abs(zeta(c(sigma, 2 * t))))] as [number, number]));
  const minProd = $derived(Math.min(...prod.map((p) => p[1])));
  const minLine = $derived(line.filter((p) => p[0] > 1).reduce((m, p) => (p[1] < m[1] ? p : m), [0, Infinity] as [number, number]));
  const path = (pts: [number, number][], sx: (v: number) => number, sy: (v: number) => number, hi: number) => 'M' + pts.map(([a, b]) => `${sx(a).toFixed(1)},${sy(Math.min(hi, b)).toFixed(1)}`).join('L');
  const at = $derived(hover === null ? null : { t: hover, z: abs(zeta(c(1, hover))), p: zs ** 3 * abs(zeta(c(sigma, hover))) ** 4 * abs(zeta(c(sigma, 2 * hover))) });
</script>

<Widget title="Why ζ(1 + it) cannot vanish" subtitle="Top: |ζ(1 + it)|. Bottom: the product |ζ(σ)|³ |ζ(σ + it)|⁴ |ζ(σ + 2it)| for σ slightly above 1, on a logarithmic scale. It never goes below 1 (the dashed line)." onreset={() => ((sigma = 1.05), (tMax = 40))}>
  {#snippet controls()}
    <Slider label="σ" bind:value={sigma} min={1.001} max={1.5} log format={(v) => v.toFixed(3)} />
    <Slider label="t up to" bind:value={tMax} min={10} max={100} step={5} format={(v) => String(v)} />
  {/snippet}
  <Plot x={{ domain: [0, tMax], label: 't' }} y={{ domain: [0, 3], label: '|ζ(1 + it)|' }} height={180} label="The absolute value of zeta on the line Re s = 1." onpointer={(p) => (hover = p ? p.x : null)}>
    {#snippet marks({ sx, sy })}
      <line class="zero" x1={sx(0)} x2={sx(tMax)} y1={sy(0)} y2={sy(0)} />
      <path class="z1" d={path(line, sx, sy, 3)} />
    {/snippet}
  </Plot>
  <Plot x={{ domain: [0, tMax], label: 't' }} y={{ domain: [-0.5, Math.max(2, Math.min(8, Math.max(...prod.map((p) => p[1]))))], label: 'log₁₀ product' }} height={180} label="The logarithm of the 3-4-1 product." onpointer={(p) => (hover = p ? p.x : null)}>
    {#snippet marks({ sx, sy })}
      <line class="one" x1={sx(0)} x2={sx(tMax)} y1={sy(0)} y2={sy(0)} />
      <path class="prod" d={path(prod, sx, sy, 8)} />
    {/snippet}
  </Plot>
  <p class="out" aria-live="polite">
    {#if at}
      t = {at.t.toFixed(2)}: |ζ(1 + it)| = {at.z.toFixed(4)}; product = {at.p.toPrecision(4)} ≥ 1.
    {:else}
      Smallest |ζ(1 + it)| on this range: {minLine[1].toFixed(4)} at t ≈ {minLine[0].toFixed(1)}. Smallest product: 10^{minProd.toFixed(3)} = {Math.pow(10, minProd).toFixed(3)}, never below 1.
    {/if}
  </p>
</Widget>

<style>
  .zero,
  .one {
    stroke: var(--fg);
    stroke-dasharray: 4 3;
  }
  .z1 {
    fill: none;
    stroke: var(--fx-blue);
    stroke-width: 1.8;
  }
  .prod {
    fill: none;
    stroke: var(--prime);
    stroke-width: 1.6;
  }
  .out {
    margin: 0.4rem 0 0;
    font-size: 0.86rem;
  }
</style>
