<!--
  Hunting the first sign change of π(x) − li(x). With u = log x, Riemann's formula gives
    (π(x) − li(x)) · log x / √x ≈ −1 − Σ_{γ > 0} 2 Re(x^(iγ)/ρ) = −1 − Σ 2 Re(e^(iγu)/ρ),
  up to terms that are tiny for large x. The −1 is the bias from the prime squares; the sum is an almost periodic
  function of u. A sign change needs the waves to align well enough to beat −1. Near u = 727.95 (x ≈ 1.397·10^316)
  they do: with 10,000 zeros the curve peaks at about +0.002 at u ≈ 727.952, a hair above 0.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import Plot from '$lib/charts/Plot.svelte';
  import { ZEROS } from '$lib/primes/zeros';
  import { loadZeros } from '$lib/data/zeros';

  let zeros = $state<readonly number[]>(ZEROS);
  $effect(() => {
    loadZeros()
      .then((z) => (zeros = z))
      .catch(() => {});
  });
  let K = $state(1000);
  let u0 = $state(725);
  let width = $state(6);

  const curve = $derived.by(() => {
    const zs = zeros.slice(0, Math.min(K, zeros.length));
    const a = zs.map((g) => 2 / (0.25 + g * g)); // 2/|ρ|² factors: Re(e^{iγu}/ρ) = (½cos γu + γ sin γu)/|ρ|²
    const n = 1200;
    const pts: [number, number][] = [];
    for (let i = 0; i <= n; i++) {
      const u = u0 + (width * i) / n;
      let s = -1;
      for (let k = 0; k < zs.length; k++) {
        const g = zs[k]!;
        s -= a[k]! * (0.5 * Math.cos(g * u) + g * Math.sin(g * u));
      }
      pts.push([u, s]);
    }
    return pts;
  });
  const peak = $derived(curve.reduce((m, p) => (p[1] > m[1] ? p : m), [0, -Infinity] as [number, number]));
  const PRESETS = [
    { label: 'small x (u from 5)', u0: 5, width: 40 },
    { label: 'around u = 405', u0: 402, width: 6 },
    { label: 'the Skewes region, u ≈ 727.95', u0: 725, width: 6 },
    { label: 'zoom in', u0: 727.94, width: 0.025 },
  ];
  const pow10 = (u: number) => {
    const e = u / Math.LN10;
    return `${Math.pow(10, e - Math.floor(e)).toFixed(3)}·10^${Math.floor(e)}`;
  };
</script>

<Widget title="Hunting for x with π(x) > li(x)" subtitle="The explicit formula for (π(x) − li(x))·log x/√x, as a function of u = log x, using the first K zeros. It hovers around −1. A sign change of π(x) − li(x) needs it to reach 0." onreset={() => ((K = 1000), (u0 = 725), (width = 6))}>
  {#snippet controls()}
    <Slider label="zeros K" bind:value={K} min={10} max={10000} log format={(v) => String(Math.round(v))} oninput={(v) => (K = Math.round(v))} />
  {/snippet}
  <div class="presets ui">
    {#each PRESETS as p (p.label)}
      <button class:on={u0 === p.u0 && width === p.width} onclick={() => ((u0 = p.u0), (width = p.width))}>{p.label}</button>
    {/each}
  </div>
  <Plot x={{ domain: [u0, u0 + width], label: 'u = log x' }} y={{ domain: [-3.5, 1], label: '(π − li)·log x/√x' }} height={260} label="The normalised error of li as a function of log x.">
    {#snippet marks({ sx, sy })}
      <line class="zero" x1={sx(u0)} x2={sx(u0 + width)} y1={sy(0)} y2={sy(0)} />
      <line class="bias" x1={sx(u0)} x2={sx(u0 + width)} y1={sy(-1)} y2={sy(-1)} />
      <path class="f" d={'M' + curve.map(([a, b]) => `${sx(a).toFixed(1)},${sy(Math.max(-3.5, Math.min(1, b))).toFixed(1)}`).join('L')} />
      <circle cx={sx(peak[0])} cy={sy(Math.min(1, peak[1]))} r="4" class="peak" />
    {/snippet}
  </Plot>
  <p class="out" aria-live="polite">
    With {Math.min(K, zeros.length).toLocaleString('en-GB')} zeros, the highest point in this window is {peak[1].toFixed(4)} at u = {peak[0].toFixed(3)}, that is x ≈ {pow10(peak[0])}.
    {peak[1] > 0 ? 'Above zero: here the formula predicts π(x) > li(x).' : 'Still below zero.'}
    {#if zeros.length < 10000}(Loading the full table of 10,000 zeros…){/if}
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
  .presets button.on {
    border-color: var(--prime);
    color: var(--prime);
  }
  .zero {
    stroke: var(--prime);
    stroke-width: 1.5;
  }
  .bias {
    stroke: var(--fg);
    stroke-dasharray: 4 3;
  }
  .f {
    fill: none;
    stroke: var(--fx-blue);
    stroke-width: 1.3;
  }
  .peak {
    fill: var(--prime);
  }
  .out {
    margin: 0.4rem 0 0;
    font-size: 0.86rem;
  }
</style>
