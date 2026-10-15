<!--
  How big is ψ(x) − x? Measured in units of √x, it stays bounded (blue), inside the Riemann Hypothesis bound
  log²x/(8π) of Schoenfeld (red, dashed). The best unconditional bounds are of the shape x·exp(−c√log x); in units
  of √x they grow like √x·exp(−c√log x), far off the top of the chart.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Plot from '$lib/charts/Plot.svelte';
  import { sieve } from '$lib/primes/sieve';

  const XMAX = 10_000_000;
  const data = (() => {
    const flags = sieve(XMAX);
    const powers: [number, number][] = [];
    for (let p = 2; p * p <= XMAX; p++) if (flags[p]) for (let q = p * p; q <= XMAX; q *= p) powers.push([q, Math.log(p)]);
    powers.sort((a, b) => a[0] - b[0]);
    const pts: [number, number][] = [];
    let psi = 0;
    let j = 0;
    let next = 100;
    let lo = Infinity;
    let hi = -Infinity;
    for (let n = 2; n <= XMAX; n++) {
      // Sample just before and just after each jump so the oscillation is not under-sampled.
      if (n >= next) {
        const before = (psi - n) / Math.sqrt(n);
        pts.push([n, before]);
      }
      if (flags[n]) psi += Math.log(n);
      while (j < powers.length && powers[j]![0] === n) psi += powers[j++]![1];
      if (n >= next) {
        const after = (psi - n) / Math.sqrt(n);
        pts.push([n, after]);
        lo = Math.min(lo, after);
        hi = Math.max(hi, after);
        next = Math.ceil(next * 1.003);
      }
    }
    return { pts, lo, hi };
  })();
  const rh = Array.from({ length: 200 }, (_, i) => 100 * Math.pow(XMAX / 100, i / 199)).map((x) => [x, Math.log(x) ** 2 / (8 * Math.PI)] as [number, number]);
  const path = (pts: [number, number][], sx: (v: number) => number, sy: (v: number) => number) => 'M' + pts.map(([a, b]) => `${sx(a).toFixed(1)},${sy(Math.max(-12, Math.min(12, b))).toFixed(1)}`).join('L');
</script>

<Widget title="The size of the error" subtitle="(ψ(x) − x)/√x for x up to ten million. The dashed curves are ±log²x/(8π): if the Riemann Hypothesis is true, the blue curve stays between them for every x ≥ 73.2 (Schoenfeld).">
  <Plot x={{ domain: [100, XMAX], type: 'log', label: 'x' }} y={{ domain: [-12, 12], label: '(ψ(x) − x)/√x' }} height={260} label="psi of x minus x, in units of the square root of x, with the Riemann Hypothesis bound.">
    {#snippet marks({ sx, sy })}
      <line class="zero" x1={sx(100)} x2={sx(XMAX)} y1={sy(0)} y2={sy(0)} />
      <path class="rh" d={path(rh, sx, sy)} />
      <path class="rh" d={path(rh.map(([a, b]) => [a, -b]), sx, sy)} />
      <path class="err" d={path(data.pts, sx, sy)} />
    {/snippet}
  </Plot>
  <p class="out">Between 100 and 10⁷, (ψ(x) − x)/√x stays between {data.lo.toFixed(2)} and {data.hi.toFixed(2)}, while log²x/(8π) grows to {(Math.log(XMAX) ** 2 / (8 * Math.PI)).toFixed(1)}. The error really is of size about √x, as the explicit formula predicts when every zero has real part ½.</p>
</Widget>

<style>
  .zero {
    stroke: var(--fg);
    stroke-dasharray: 2 3;
  }
  .rh {
    fill: none;
    stroke: var(--prime);
    stroke-width: 1.4;
    stroke-dasharray: 6 4;
  }
  .err {
    fill: none;
    stroke: var(--fx-blue);
    stroke-width: 1;
  }
  .out {
    margin: 0.4rem 0 0;
    font-size: 0.86rem;
  }
</style>
