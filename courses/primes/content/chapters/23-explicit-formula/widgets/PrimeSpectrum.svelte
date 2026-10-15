<!--
  The explicit formula read backwards: the zeros can be heard in the primes. Plot
    F(t) = −Σ_{n ≤ X} Λ(n) n^(−1/2) (1 − n/X) cos(t log n) + Re ∫_1^X u^(−1/2 − it) (1 − u/X) du,
  a smoothed partial sum of −Re ζ′/ζ(½ + it) with the contribution of the pole at s = 1 removed. It has sharp
  peaks at the ordinates γ of the zeros, which sharpen as X grows.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import Toggle from '$lib/components/ui/Toggle.svelte';
  import Plot from '$lib/charts/Plot.svelte';
  import { mangoldtTable } from '$lib/primes/sieve';
  import { ZEROS } from '$lib/primes/zeros';

  const XMAX = 100_000;
  const lam = mangoldtTable(XMAX);
  let X = $state(2000);
  let tMax = $state(60);
  let showZeros = $state(false);

  const curve = $derived.by(() => {
    const logs: number[] = [];
    const w: number[] = [];
    for (let n = 2; n <= X; n++) {
      const l = lam[n]!;
      if (l > 0) {
        logs.push(Math.log(n));
        w.push((l / Math.sqrt(n)) * (1 - n / X));
      }
    }
    const pts: [number, number][] = [];
    const N = 1200;
    for (let i = 0; i <= N; i++) {
      const t = (tMax * i) / N;
      let s = 0;
      for (let k = 0; k < logs.length; k++) s -= w[k]! * Math.cos(t * logs[k]!);
      pts.push([t, s + pole(t)]);
    }
    return pts;
  });
  /** Re ∫_1^X u^(−a) (1 − u/X) du with a = ½ + it (the pole's contribution). */
  function pole(t: number): number {
    // ∫ u^(−a) du = (X^(1−a) − 1)/(1 − a); ∫ u^(1−a)/X du = (X^(2−a) − 1)/(X (2 − a)).
    const L = Math.log(X);
    // Re[(X^(b − it) − 1) / (b − it)], times `scale`.
    const term = (b: number, scale: number) => {
      const mag = Math.exp(b * L);
      const re = mag * Math.cos(t * L) - 1;
      const im = -mag * Math.sin(t * L);
      return (scale * (re * b - im * t)) / (b * b + t * t);
    };
    return term(0.5, 1) - term(1.5, 1 / X);
  }
  const yMax = $derived(Math.max(4, ...curve.filter((p) => p[0] > 8).map((p) => p[1])) * 1.1);
  const peaks = $derived(curve.filter((p, i) => i > 0 && i < curve.length - 1 && p[0] > 8 && p[1] > curve[i - 1]![1] && p[1] > curve[i + 1]![1] && p[1] > yMax * 0.45));
  const terms = $derived(Array.from(lam.subarray(0, X + 1)).filter((v) => v > 0).length);
</script>

<Widget title="Hearing the zeros in the primes" subtitle="A sum over prime powers n ≤ X, with weights Λ(n)/√n, viewed as a function of a frequency t. It has spikes exactly at the heights γ of the zeros of ζ." onreset={() => ((X = 2000), (tMax = 60), (showZeros = false))}>
  {#snippet controls()}
    <Slider label="primes up to X" bind:value={X} min={50} max={XMAX} log format={(v) => Math.round(v).toLocaleString('en-GB')} oninput={(v) => (X = Math.round(v))} />
    <Slider label="t up to" bind:value={tMax} min={30} max={100} step={5} format={(v) => String(v)} />
    <Toggle bind:checked={showZeros} label="mark the zeros" />
  {/snippet}
  <Plot x={{ domain: [0, tMax], label: 't' }} y={{ domain: [-yMax * 0.5, yMax], label: 'F(t)' }} height={260} label="A sum over primes up to {X}, with peaks at the zeros of zeta.">
    {#snippet marks({ sx, sy })}
      {#if showZeros}
        {#each ZEROS.filter((g) => g <= tMax) as g (g)}<line class="zero" x1={sx(g)} x2={sx(g)} y1={sy(-yMax * 0.5)} y2={sy(yMax)} />{/each}
      {/if}
      <path class="f" d={'M' + curve.map(([a, b]) => `${sx(a).toFixed(1)},${sy(Math.max(-yMax * 0.5, Math.min(yMax, b))).toFixed(1)}`).join('L')} />
    {/snippet}
  </Plot>
  <p class="out" aria-live="polite">
    {terms.toLocaleString('en-GB')} prime powers. Tallest peaks near t = {peaks.slice(0, 6).map((p) => p[0].toFixed(2)).join(', ')}{peaks.length > 6 ? ', …' : ''}. The zeros are at 14.13, 21.02, 25.01, 30.42, 32.94, …
  </p>
</Widget>

<style>
  .f {
    fill: none;
    stroke: var(--prime);
    stroke-width: 1.4;
  }
  .zero {
    stroke: var(--fx-blue);
    stroke-width: 1;
    stroke-dasharray: 3 3;
  }
  .out {
    margin: 0.4rem 0 0;
    font-size: 0.86rem;
  }
</style>
