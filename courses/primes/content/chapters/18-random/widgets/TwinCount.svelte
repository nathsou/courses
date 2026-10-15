<!--
  Twin primes up to x against two predictions: Cramér's ∫dt/(log t)² (independent events) and Hardy–Littlewood's
  2C₂ ∫ dt/(log t)², which corrects for divisibility by small primes. Live counts up to 2·10^7; published counts
  beyond that.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Plot from '$lib/charts/Plot.svelte';
  import { sieve } from '$lib/primes/sieve';

  const C2 = 0.6601618158468696;
  const N = 20_000_000;
  /** ∫_2^x dt / log² t by Simpson's rule in u = log t. */
  function li2(x: number): number {
    const a = Math.log(2);
    const b = Math.log(x);
    const n = 2000;
    const h = (b - a) / n;
    const f = (u: number) => Math.exp(u) / (u * u);
    let s = f(a) + f(b);
    for (let i = 1; i < n; i++) s += (i % 2 ? 4 : 2) * f(a + i * h);
    return (s * h) / 3;
  }
  const live = (() => {
    const s = sieve(N + 2);
    const out: { x: number; count: number }[] = [];
    let c = 0;
    let next = 100;
    for (let p = 3; p <= N; p++) {
      if (s[p] && s[p + 2]) c++;
      if (p >= next) {
        out.push({ x: p, count: c });
        next = Math.ceil(next * 1.08);
      }
    }
    return out;
  })();
  // Published counts of twin-prime pairs below 10^k (OEIS A007508).
  const TABLE = [
    { k: 8, count: 440312 },
    { k: 9, count: 3424506 },
    { k: 10, count: 27412679 },
  ];
</script>

<Widget title="Counting twin primes" subtitle="Pairs (p, p + 2) of primes up to x, divided by two predictions: Hardy–Littlewood’s 2C₂∫dt/log²t and Cramér’s model, ∫dt/log²t. A ratio of 1 means a perfect prediction.">
  <Plot x={{ domain: [100, N], type: 'log', label: 'x' }} y={{ domain: [0.4, 1.8], label: 'actual / prediction' }} height={240} label="Twin prime counts relative to two predictions.">
    {#snippet marks({ sx, sy })}
      <line class="one" x1={sx(100)} x2={sx(N)} y1={sy(1)} y2={sy(1)} />
      <path class="hl" d={'M' + live.map((r) => `${sx(r.x)},${sy(r.count / (2 * C2 * li2(r.x)))}`).join('L')} />
      <path class="cr" d={'M' + live.map((r) => `${sx(r.x)},${sy(Math.min(1.8, r.count / li2(r.x)))}`).join('L')} />
    {/snippet}
  </Plot>
  <div class="legend ui"><span class="k hl">count / Hardy–Littlewood</span><span class="k cr">count / Cramér (∫dt/log²t)</span></div>
  <table>
    <thead><tr><th>x</th><th>twin pairs</th><th>Hardy–Littlewood</th><th>Cramér: ∫dt/log²t</th></tr></thead>
    <tbody>
      {#each TABLE as r (r.k)}
        <tr><td>10<sup>{r.k}</sup></td><td>{r.count.toLocaleString('en-GB')}</td><td>{Math.round(2 * C2 * li2(10 ** r.k)).toLocaleString('en-GB')}</td><td>{Math.round(li2(10 ** r.k)).toLocaleString('en-GB')}</td></tr>
      {/each}
    </tbody>
  </table>
</Widget>

<style>
  .one {
    stroke: var(--fg);
    stroke-dasharray: 4 3;
  }
  path {
    fill: none;
    stroke-width: 1.8;
  }
  path.hl,
  .k.hl::before {
    stroke: var(--prime);
    border-color: var(--prime);
  }
  path.cr,
  .k.cr::before {
    stroke: var(--series-1);
    border-color: var(--series-1);
  }
  .legend {
    display: flex;
    gap: 1.2rem;
    font-size: 0.8rem;
    color: var(--ink-2);
    margin: 0.3rem 0 0.6rem;
  }
  .k::before {
    content: '';
    display: inline-block;
    width: 1.2rem;
    border-top: 2px solid;
    margin-right: 0.4rem;
    vertical-align: middle;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    font-size: 0.8rem;
    font-family: var(--font-mono);
  }
  th,
  td {
    text-align: right;
    padding: 0.2rem 0.5rem;
    border-bottom: 1px solid var(--ruling);
  }
  th {
    font-family: var(--font-ui);
    font-weight: 600;
  }
</style>
