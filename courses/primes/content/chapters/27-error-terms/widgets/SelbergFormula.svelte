<!--
  Selberg's symmetry formula: Σ_{p ≤ x} log²p + Σ_{pq ≤ x} log p log q = 2x log x + O(x). Plotted: the left side
  divided by x log x, which tends to 2, and the two pieces separately (each alone tends to 1 by the PNT, but that is
  exactly what cannot be assumed in an elementary proof).
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Plot from '$lib/charts/Plot.svelte';
  import { primesUpTo } from '$lib/primes/sieve';

  const XMAX = 2_000_000;
  const data = (() => {
    const ps = primesUpTo(XMAX);
    // θ(y) for all y ≤ XMAX/2 via prefix sums over a table.
    const theta = new Float64Array(XMAX / 2 + 1);
    let j = 0;
    let acc = 0;
    for (let y = 0; y <= XMAX / 2; y++) {
      while (j < ps.length && ps[j] === y) acc += Math.log(ps[j++]!);
      theta[y] = acc;
    }
    const pts: { x: number; a: number; b: number }[] = [];
    for (let k = 0; k <= 120; k++) {
      const x = Math.round(100 * Math.pow(XMAX / 100, k / 120));
      let a = 0;
      for (const p of ps) {
        if (p > x) break;
        a += Math.log(p) ** 2;
      }
      let b = 0;
      for (const p of ps) {
        if (2 * p > x) break;
        b += Math.log(p) * theta[Math.floor(x / p)]!;
      }
      const n = x * Math.log(x);
      pts.push({ x, a: a / n, b: b / n });
    }
    return pts;
  })();
  const path = (f: (p: (typeof data)[number]) => number, sx: (v: number) => number, sy: (v: number) => number) => 'M' + data.map((p) => `${sx(p.x).toFixed(1)},${sy(f(p)).toFixed(1)}`).join('L');
  const last = data[data.length - 1]!;
</script>

<Widget title="Selberg’s symmetry formula" subtitle="The sum Σ log²p + Σ log p log q (over primes p ≤ x and products pq ≤ x), divided by x log x, tends to 2. The two pieces individually each tend to 1, but proving that is the prime number theorem.">
  <Plot x={{ domain: [100, XMAX], type: 'log', label: 'x' }} y={{ domain: [0, 2.4], label: '÷ x log x' }} height={240} label="Selberg's formula, numerically.">
    {#snippet marks({ sx, sy })}
      <line class="ref" x1={sx(100)} x2={sx(XMAX)} y1={sy(2)} y2={sy(2)} />
      <line class="ref" x1={sx(100)} x2={sx(XMAX)} y1={sy(1)} y2={sy(1)} />
      <path class="sum" d={path((p) => p.a + p.b, sx, sy)} />
      <path class="a" d={path((p) => p.a, sx, sy)} />
      <path class="b" d={path((p) => p.b, sx, sy)} />
    {/snippet}
  </Plot>
  <div class="legend ui"><span class="k sum">both sums</span><span class="k a">Σ log²p</span><span class="k b">Σ log p log q</span></div>
  <p class="out">At x = {XMAX.toLocaleString('en-GB')}: the total is {(last.a + last.b).toFixed(4)} × x log x; the pieces are {last.a.toFixed(4)} and {last.b.toFixed(4)}. The error is O(x): here (total − 2x log x)/x = {((last.a + last.b - 2) * Math.log(last.x)).toFixed(2)}, and at x = 10⁴ it was {(() => { const q = data.find((p) => p.x >= 10000)!; return ((q.a + q.b - 2) * Math.log(q.x)).toFixed(2); })()}: bounded, but large enough that the ratio approaches 2 only like 1/log x.</p>
</Widget>

<style>
  .ref {
    stroke: var(--fg);
    stroke-dasharray: 4 3;
  }
  path {
    fill: none;
    stroke-width: 1.8;
  }
  path.sum,
  .k.sum::before {
    stroke: var(--prime);
    border-color: var(--prime);
  }
  path.a,
  .k.a::before {
    stroke: var(--fx-blue);
    border-color: var(--fx-blue);
  }
  path.b,
  .k.b::before {
    stroke: var(--series-4);
    border-color: var(--series-4);
  }
  .legend {
    display: flex;
    gap: 1.2rem;
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
