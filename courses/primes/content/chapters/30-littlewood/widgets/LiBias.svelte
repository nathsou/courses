<!--
  The bias of li. (π(x) − li(x))/(½ li(√x)) for x up to 10^7, computed from the primes: it hovers around −1, not 0.
  The −1 comes from the prime squares: li(x) estimates J(x) = π(x) + ½π(√x) + ⅓π(∛x) + ⋯ better than π(x), and
  ½π(√x) ≈ √x/log x. Toggle to compare with R(x), which corrects for this.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Toggle from '$lib/components/ui/Toggle.svelte';
  import Plot from '$lib/charts/Plot.svelte';
  import { sieve } from '$lib/primes/sieve';
  import { li, riemannR } from '$lib/primes/count';

  const XMAX = 10_000_000;
  let useR = $state(false);
  const data = (() => {
    const flags = sieve(XMAX);
    const pts: { x: number; pi: number }[] = [];
    let pi = 0;
    let next = 100;
    for (let n = 2; n <= XMAX; n++) {
      if (flags[n]) pi++;
      if (n >= next) {
        pts.push({ x: n, pi });
        next = Math.ceil(next * 1.01);
      }
    }
    return pts;
  })();
  // Normalised by ½ li(√x) ≈ √x/log x, the size of the prime-square correction, so that the bias sits at −1.
  const curve = $derived(data.map((p) => [p.x, (p.pi - (useR ? riemannR(p.x) : li(p.x))) / (0.5 * li(Math.sqrt(p.x)))] as [number, number]));
  const mean = $derived(curve.filter((p) => p[0] > 1e4).reduce((s, p) => s + p[1], 0) / curve.filter((p) => p[0] > 1e4).length);
</script>

<Widget title="Why li(x) is usually too big" subtitle="(π(x) − li(x)) divided by ½ li(√x) ≈ √x/log x, from the actual primes. If π(x) were li(x) plus random noise of that size, this would hover around 0. It hovers around −1." onreset={() => (useR = false)}>
  {#snippet controls()}
    <Toggle bind:checked={useR} label="use Riemann’s R(x) instead of li(x)" />
  {/snippet}
  <Plot x={{ domain: [100, XMAX], type: 'log', label: 'x' }} y={{ domain: [-3, 1.5], label: useR ? '(π − R)/(½ li √x)' : '(π − li)/(½ li √x)' }} height={240} label="The normalised error of li or R.">
    {#snippet marks({ sx, sy })}
      <line class="zero" x1={sx(100)} x2={sx(XMAX)} y1={sy(0)} y2={sy(0)} />
      <line class="bias" x1={sx(100)} x2={sx(XMAX)} y1={sy(-1)} y2={sy(-1)} />
      <path class="f" d={'M' + curve.map(([a, b]) => `${sx(a).toFixed(1)},${sy(Math.max(-3, Math.min(1.5, b))).toFixed(1)}`).join('L')} />
    {/snippet}
  </Plot>
  <p class="out">Average over 10⁴ ≤ x ≤ 10⁷: {mean.toFixed(3)}. {useR ? 'R(x) removes the bias: what is left oscillates around 0, and this time it does change sign.' : 'li(x) overestimates π(x) at every x in this range, and in fact for every x from 2 to 10¹⁹.'}</p>
</Widget>

<style>
  .zero {
    stroke: var(--prime);
  }
  .bias {
    stroke: var(--fg);
    stroke-dasharray: 4 3;
  }
  .f {
    fill: none;
    stroke: var(--fx-blue);
    stroke-width: 1.4;
  }
  .out {
    margin: 0.4rem 0 0;
    font-size: 0.86rem;
  }
</style>
