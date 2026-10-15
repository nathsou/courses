<!--
  The Riemann Hypothesis as a slope. On log–log axes, the error Li(x) − π(x) at x = 10^k (k = 4…25) lies close to a
  line of slope ½, far below the line of slope 1 (which is the size of π(x) itself). Drag θ to compare with x^θ; the
  red band is Schoenfeld's bound √x log x/(8π), valid for all x ≥ 2657 if and only if RH holds.
  Data: π(10^k) from OEIS A006880; Li computed to 40 digits.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import Plot from '$lib/charts/Plot.svelte';

  // Li(10^k) − π(10^k), k = 4..25.
  const DIFF = [16.092052, 36.763837, 128.504, 338.35988, 753.33028, 1699.9118, 3102.5415, 11586.576, 38261.76, 108970.01, 314888.91, 1052617.5, 3214630.7, 7956587.7, 21949554.0, 99877774.0, 2.2274464e8, 5.9739425e8, 1.9323552e9, 7.2501862e9, 1.7146907e10, 5.5160981e10];
  const pts = DIFF.map((d, i) => [i + 4, Math.log10(d)] as [number, number]);
  let theta = $state(0.5);
  // Fit the constant of c·x^θ through the data by least squares in log space.
  const offset = $derived(pts.reduce((s, [k, y]) => s + (y - theta * k), 0) / pts.length);
  const rms = $derived(Math.sqrt(pts.reduce((s, [k, y]) => s + (y - theta * k - offset) ** 2, 0) / pts.length));
  const schoenfeld = (k: number) => Math.log10((Math.pow(10, k / 2) * k * Math.LN10) / (8 * Math.PI));
  const ks = Array.from({ length: 23 }, (_, i) => i + 3.5);
</script>

<Widget title="The error has slope one half" subtitle="log₁₀ of Li(x) − π(x) at x = 10ᵏ, against k. A power law c·x^θ is a straight line of slope θ. Fit the slope by eye." onreset={() => (theta = 0.5)}>
  {#snippet controls()}
    <Slider label="slope θ" bind:value={theta} min={0.3} max={1} step={0.01} />
  {/snippet}
  <Plot x={{ domain: [3.5, 25.5], label: 'k (x = 10ᵏ)' }} y={{ domain: [0, 26], label: 'log₁₀ error' }} height={280} label="The error in the prime number theorem on log-log axes.">
    {#snippet marks({ sx, sy })}
      <path class="size" d={'M' + ks.map((k) => `${sx(k)},${sy(k - Math.log10(k * Math.LN10))}`).join('L')} />
      <path class="rh" d={'M' + ks.map((k) => `${sx(k)},${sy(schoenfeld(k))}`).join('L')} />
      <path class="fit" d={'M' + ks.map((k) => `${sx(k)},${sy(theta * k + offset)}`).join('L')} />
      {#each pts as [k, y] (k)}<circle cx={sx(k)} cy={sy(y)} r="3.5" class="pt" />{/each}
    {/snippet}
  </Plot>
  <div class="legend ui">
    <span class="k pt">Li(x) − π(x)</span><span class="k size">π(x) itself (≈ x/log x)</span><span class="k rh">√x log x/(8π), the RH bound</span><span class="k fit">best fit c·x^θ</span>
  </div>
  <p class="out" aria-live="polite">With θ = {theta.toFixed(2)} the best line misses the points by {rms.toFixed(2)} on average (in powers of ten). The best slope is close to ½; the Riemann Hypothesis says the error is at most √x log x/(8π) for all x ≥ 2657, and every point is far below that line.</p>
</Widget>

<style>
  path {
    fill: none;
    stroke-width: 1.6;
  }
  .size,
  .k.size::before {
    stroke: var(--mute);
    border-color: var(--mute);
  }
  .size {
    stroke-dasharray: 2 3;
  }
  .rh,
  .k.rh::before {
    stroke: var(--prime);
    border-color: var(--prime);
  }
  .rh {
    stroke-dasharray: 6 4;
  }
  .fit,
  .k.fit::before {
    stroke: var(--series-4);
    border-color: var(--series-4);
  }
  .pt {
    fill: var(--fx-blue);
  }
  .k.pt::before {
    border-color: var(--fx-blue);
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 1.2rem;
    font-size: 0.8rem;
    color: var(--ink-2);
    margin-top: 0.3rem;
  }
  .k::before {
    content: '';
    display: inline-block;
    width: 1.2rem;
    border-top: 2px solid;
    margin-right: 0.4rem;
    vertical-align: middle;
  }
  .out {
    margin: 0.4rem 0 0;
    font-size: 0.86rem;
  }
</style>
