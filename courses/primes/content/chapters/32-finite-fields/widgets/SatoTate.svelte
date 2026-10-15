<!--
  Counting points on an elliptic curve y² = x³ + ax + b modulo p for every prime p up to P. Hasse: the error
  a_p = p + 1 − #E(F_p) satisfies |a_p| ≤ 2√p, the Riemann Hypothesis for this curve. Left: a_p/(2√p) against p, always
  in [−1, 1]. Right: its histogram, which for curves without complex multiplication follows the semicircle
  (2/π)√(1 − t²) (the Sato–Tate theorem, 2008–2011).
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import Plot from '$lib/charts/Plot.svelte';
  import { primesUpTo } from '$lib/primes/sieve';

  const CURVES = [
    { id: '1,1', a: 1, b: 1, label: 'y² = x³ + x + 1', cm: false },
    { id: '-1,1', a: -1, b: 1, label: 'y² = x³ − x + 1', cm: false },
    { id: '-1,0', a: -1, b: 0, label: 'y² = x³ − x (CM)', cm: true },
    { id: '0,1', a: 0, b: 1, label: 'y² = x³ + 1 (CM)', cm: true },
  ];
  let curveId = $state('1,1');
  let P = $state(10_000);
  const curve = $derived(CURVES.find((c) => c.id === curveId)!);

  const data = $derived.by(() => {
    const { a, b } = curve;
    const disc = 4 * a ** 3 + 27 * b ** 2;
    const out: { p: number; t: number; ap: number }[] = [];
    for (const p of primesUpTo(P)) {
      if (p <= 3 || disc % p === 0) continue;
      // How many y with y² ≡ r: 1 + (r/p), from a table of squares.
      const sq = new Uint8Array(p);
      for (let y = 0; y < p; y++) sq[(y * y) % p]!++;
      let n = 1; // the point at infinity
      for (let x = 0; x < p; x++) {
        const r = (((((x * x) % p) * x) % p) + ((a * x) % p) + b + 2 * p) % p;
        n += sq[r]!;
      }
      const ap = p + 1 - n;
      out.push({ p, ap, t: ap / (2 * Math.sqrt(p)) });
    }
    return out;
  });
  const BINS = 30;
  const hist = $derived.by(() => {
    const h = new Array<number>(BINS).fill(0);
    for (const d of data) h[Math.min(BINS - 1, Math.floor(((d.t + 1) / 2) * BINS))]!++;
    const w = 2 / BINS;
    return h.map((c) => c / (data.length * w));
  });
  const semicircle = Array.from({ length: 101 }, (_, i) => -1 + i / 50).map((t) => [t, (2 / Math.PI) * Math.sqrt(Math.max(0, 1 - t * t))] as [number, number]);
  const maxAbs = $derived(Math.max(...data.map((d) => Math.abs(d.t))));
  const zeros = $derived(data.filter((d) => d.ap === 0).length);
</script>

<Widget title="Counting points modulo p" subtitle="For each prime p, a_p = p + 1 − (number of points of the curve over the integers mod p, plus one at infinity). Hasse proved |a_p| ≤ 2√p: the Riemann Hypothesis for this curve." onreset={() => ((curveId = '1,1'), (P = 10_000))}>
  {#snippet controls()}
    <Segmented label="Curve" bind:value={curveId} options={CURVES.map((c) => ({ value: c.id, label: c.label }))} size="sm" />
    <Segmented label="Primes up to" bind:value={P} options={[{ value: 1000, label: '10³' }, { value: 10_000, label: '10⁴' }, { value: 30_000, label: '3·10⁴' }]} size="sm" />
  {/snippet}
  <div class="pair">
    <Plot x={{ domain: [0, P], label: 'p' }} y={{ domain: [-1.1, 1.1], label: 'a_p / 2√p' }} height={240} label="Normalised traces of Frobenius against p.">
      {#snippet marks({ sx, sy })}
        <line class="bound" x1={sx(0)} x2={sx(P)} y1={sy(1)} y2={sy(1)} />
        <line class="bound" x1={sx(0)} x2={sx(P)} y1={sy(-1)} y2={sy(-1)} />
        {#each data as d (d.p)}<circle cx={sx(d.p)} cy={sy(d.t)} r="1.3" class="pt" />{/each}
      {/snippet}
    </Plot>
    <Plot x={{ domain: [-1, 1], label: 'a_p / 2√p' }} y={{ domain: [0, curve.cm ? 1.6 : 0.9], label: 'density' }} height={240} label="Histogram of normalised traces.">
      {#snippet marks({ sx, sy })}
        {#each hist as v, i (i)}
          <rect x={sx(-1 + (2 * i) / BINS) + 0.5} y={sy(Math.min(curve.cm ? 1.6 : 0.9, v))} width={Math.max(0, sx(2 / BINS) - sx(0) - 1)} height={sy(0) - sy(Math.min(curve.cm ? 1.6 : 0.9, v))} class="bar" />
        {/each}
        <path class="semi" d={'M' + semicircle.map(([a, b]) => `${sx(a)},${sy(b)}`).join('L')} />
      {/snippet}
    </Plot>
  </div>
  <p class="out" aria-live="polite">
    {data.length.toLocaleString('en-GB')} primes of good reduction; the largest |a_p|/2√p is {maxAbs.toFixed(4)} ≤ 1, as Hasse's theorem says.
    {curve.cm ? `This curve has complex multiplication: a_p = 0 for ${zeros.toLocaleString('en-GB')} of the primes (about half), so the histogram has a spike at 0 and is not a semicircle.` : 'The histogram follows the Sato–Tate semicircle (red).'}
  </p>
</Widget>

<style>
  .pair {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
    gap: 0.6rem;
  }
  .bound {
    stroke: var(--prime);
    stroke-dasharray: 5 4;
  }
  .pt {
    fill: var(--fx-blue);
    opacity: 0.6;
  }
  .bar {
    fill: color-mix(in srgb, var(--fx-blue) 55%, var(--surface));
  }
  .semi {
    fill: none;
    stroke: var(--prime);
    stroke-width: 2;
  }
  .out {
    margin: 0.4rem 0 0;
    font-size: 0.86rem;
  }
</style>
