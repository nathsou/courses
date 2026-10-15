<!--
  Brun's constant. B(x) = Σ (1/p + 1/(p + 2)) over twin pairs with p + 2 ≤ x converges (Brun, 1919), but very slowly:
  if Hardy–Littlewood is right, B(x) ≈ B − 4C₂/log x. Plotted against 1/log x, the points lie close to a straight line,
  and its intercept at 1/log x = 0 estimates B ≈ 1.90216.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Toggle from '$lib/components/ui/Toggle.svelte';
  import Plot from '$lib/charts/Plot.svelte';
  import { sieve } from '$lib/primes/sieve';

  const N = 10_000_000;
  const C2 = 0.6601618158468696;
  const data = (() => {
    const flags = sieve(N + 2);
    const pts: [number, number][] = [];
    let B = 0;
    let next = 100;
    for (let p = 3; p + 2 <= N; p += 2) {
      if (flags[p] && flags[p + 2]) B += 1 / p + 1 / (p + 2);
      if (p + 2 >= next) {
        pts.push([p + 2, B]);
        next = Math.ceil(next * 1.05);
      }
    }
    return pts;
  })();
  let inverse = $state(true);
  const last = data[data.length - 1]!;
  // Extrapolate with the predicted slope −4C₂ in the variable 1/log x.
  const extrapolated = last[1] + (4 * C2) / Math.log(last[0]);
  const xs = $derived(inverse ? data.map(([x, b]) => [1 / Math.log(x), b] as [number, number]) : data);
</script>

<Widget title="Brun’s constant" subtitle="The sum of 1/p + 1/(p + 2) over twin primes up to x. It converges, but so slowly that the limit is estimated by extrapolation, not by summing." onreset={() => (inverse = true)}>
  {#snippet controls()}
    <Toggle bind:checked={inverse} label="plot against 1/log x" />
  {/snippet}
  <Plot x={inverse ? { domain: [0, 0.22], label: '1/log x' } : { domain: [100, N], type: 'log', label: 'x' }} y={{ domain: [1, 2], label: 'B(x)' }} height={250} label="Partial sums of Brun's series.">
    {#snippet marks({ sx, sy })}
      <line class="lim" x1={sx(inverse ? 0 : 100)} x2={sx(inverse ? 0.22 : N)} y1={sy(1.902160583)} y2={sy(1.902160583)} />
      {#if inverse}<line class="fit" x1={sx(0)} y1={sy(extrapolated)} x2={sx(0.22)} y2={sy(extrapolated - 4 * C2 * 0.22)} />{/if}
      <path class="b" d={'M' + xs.map(([a, b]) => `${sx(a).toFixed(1)},${sy(b).toFixed(1)}`).join('L')} />
    {/snippet}
  </Plot>
  <p class="out">B(10⁷) = {last[1].toFixed(5)}. Adding the predicted tail 4C₂/log x gives {extrapolated.toFixed(5)}; the best estimate, from twin primes up to 2·10¹⁶, is 1.902160583 (dashed). {inverse ? 'The red line has the slope −4C₂ predicted by Hardy and Littlewood.' : ''}</p>
</Widget>

<style>
  .lim {
    stroke: var(--fg);
    stroke-dasharray: 4 3;
  }
  .fit {
    stroke: var(--prime);
    stroke-width: 1.4;
  }
  .b {
    fill: none;
    stroke: var(--fx-blue);
    stroke-width: 2;
  }
  .out {
    margin: 0.4rem 0 0;
    font-size: 0.86rem;
  }
</style>
