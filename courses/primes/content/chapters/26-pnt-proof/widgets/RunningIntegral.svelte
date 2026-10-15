<!--
  The quantity Newman's theorem controls: I(X) = ∫_1^X (θ(x) − x)/x² dx, computed exactly from the primes up to 10^7.
  It converges, to −1 − γ − Σ_p log p/(p(p − 1)) ≈ −2.33258. The lower panel shows θ(x)/x, which converges to 1 as a
  consequence.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Plot from '$lib/charts/Plot.svelte';
  import { sieve } from '$lib/primes/sieve';

  const XMAX = 10_000_000;
  const LIMIT = -2.332582175730442;
  const data = (() => {
    const flags = sieve(XMAX);
    const I: [number, number][] = [];
    const T: [number, number][] = [];
    let th = 0;
    let acc = 0;
    let next = 2;
    for (let n = 1; n < XMAX; n++) {
      if (flags[n]) th += Math.log(n);
      // θ is constant on [n, n + 1): ∫ (θ − x)/x² dx = θ (1/n − 1/(n + 1)) − log((n + 1)/n).
      acc += th * (1 / n - 1 / (n + 1)) - Math.log1p(1 / n);
      if (n + 1 >= next) {
        I.push([n + 1, acc]);
        T.push([n + 1, th / (n + 1)]);
        next = Math.ceil(next * 1.02);
      }
    }
    return { I, T };
  })();
  let hover = $state<number | null>(null);
  const at = $derived.by(() => {
    if (hover === null) return null;
    const h = hover;
    const i = data.I.findIndex((p) => p[0] >= h);
    return i < 0 ? null : { x: data.I[i]![0], I: data.I[i]![1], t: data.T[i]![1] };
  });
  const path = (pts: [number, number][], sx: (v: number) => number, sy: (v: number) => number) => 'M' + pts.map(([a, b]) => `${sx(a).toFixed(1)},${sy(b).toFixed(1)}`).join('L');
</script>

<Widget title="The integral that converges" subtitle="Top: I(X) = ∫₁^X (θ(x) − x)/x² dx, computed from the primes. Bottom: θ(x)/x. Newman's theorem proves that the top curve has a limit; the Tauberian step turns that into the bottom curve tending to 1.">
  <Plot x={{ domain: [2, XMAX], type: 'log', label: 'X' }} y={{ domain: [-2.6, 0], label: 'I(X)' }} height={200} label="The running integral of theta minus x over x squared." onpointer={(p) => (hover = p ? p.x : null)}>
    {#snippet marks({ sx, sy })}
      <line class="lim" x1={sx(2)} x2={sx(XMAX)} y1={sy(LIMIT)} y2={sy(LIMIT)} />
      <path class="i" d={path(data.I, sx, sy)} />
    {/snippet}
  </Plot>
  <Plot x={{ domain: [2, XMAX], type: 'log', label: 'x' }} y={{ domain: [0, 1.2], label: 'θ(x)/x' }} height={160} label="theta of x over x." onpointer={(p) => (hover = p ? p.x : null)}>
    {#snippet marks({ sx, sy })}
      <line class="lim" x1={sx(2)} x2={sx(XMAX)} y1={sy(1)} y2={sy(1)} />
      <path class="t" d={path(data.T, sx, sy)} />
    {/snippet}
  </Plot>
  <p class="out" aria-live="polite">
    {#if at}
      X = {at.x.toLocaleString('en-GB')}: I(X) = {at.I.toFixed(5)}, θ(X)/X = {at.t.toFixed(5)}.
    {:else}
      I(10⁷) = {data.I[data.I.length - 1]![1].toFixed(5)}; the limit (dashed) is −1 − γ − Σ log p/(p(p − 1)) = {LIMIT.toFixed(5)}.
    {/if}
  </p>
</Widget>

<style>
  .lim {
    stroke: var(--fg);
    stroke-dasharray: 4 3;
  }
  .i {
    fill: none;
    stroke: var(--prime);
    stroke-width: 1.8;
  }
  .t {
    fill: none;
    stroke: var(--fx-blue);
    stroke-width: 1.6;
  }
  .out {
    margin: 0.4rem 0 0;
    font-size: 0.86rem;
  }
</style>
