<!--
  Mertens' three theorems, measured up to 10^7: Σ log p/p − log x stays bounded (tending to −1.332…),
  Σ 1/p − log log x tends to M = 0.2614…, and log x · Π (1 − 1/p) tends to e^{−γ} = 0.5614….
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import Plot from '$lib/charts/Plot.svelte';
  import { sieve } from '$lib/primes/sieve';
  import { EULER_GAMMA } from '$lib/primes/count';

  const N = 10_000_000;
  const M = 0.2614972128476428;
  const E1 = -1.332582275733221; // lim Σ_{p≤x} log p / p − log x
  const data = (() => {
    const s = sieve(N);
    const out: { x: number; a: number; b: number; c: number }[] = [];
    let s1 = 0;
    let s2 = 0;
    let logProd = 0;
    let next = 3;
    for (let p = 2; p <= N; p++) {
      if (s[p]) {
        s1 += Math.log(p) / p;
        s2 += 1 / p;
        logProd += Math.log1p(-1 / p);
      }
      if (p >= next) {
        const L = Math.log(p);
        out.push({ x: p, a: s1 - L, b: s2 - Math.log(L), c: L * Math.exp(logProd) });
        next = Math.ceil(next * 1.03);
      }
    }
    return out;
  })();
  let which = $state<'a' | 'b' | 'c'>('b');
  const SPEC = {
    a: { label: 'Σ log p / p − log x', target: E1, tlabel: '−1.3326', y: [-2, 0] as [number, number] },
    b: { label: 'Σ 1/p − log log x', target: M, tlabel: 'M = 0.2615', y: [0, 0.6] as [number, number] },
    c: { label: 'log x · Π (1 − 1/p)', target: Math.exp(-EULER_GAMMA), tlabel: 'e^−γ = 0.5615', y: [0.4, 0.8] as [number, number] },
  };
  const spec = $derived(SPEC[which]);
  const last = $derived(data.at(-1)!);
</script>

<Widget title="Mertens’ three theorems" subtitle="Each quantity is computed from all the primes up to x, for x up to ten million, and settles towards its constant.">
  {#snippet controls()}
    <Segmented label="Quantity" bind:value={which} options={[{ value: 'a', label: 'first' }, { value: 'b', label: 'second' }, { value: 'c', label: 'third' }]} size="sm" />
  {/snippet}
  <Plot x={{ domain: [3, N], type: 'log', label: 'x' }} y={{ domain: spec.y, label: spec.label }} height={260} label="{spec.label} for x up to ten million.">
    {#snippet marks({ sx, sy })}
      <line class="t" x1={sx(3)} x2={sx(N)} y1={sy(spec.target)} y2={sy(spec.target)} />
      <text class="lab" x={sx(N) - 4} y={sy(spec.target) - 5} text-anchor="end">{spec.tlabel}</text>
      <path d={'M' + data.map((r) => `${sx(r.x)},${sy(Math.min(spec.y[1], Math.max(spec.y[0], r[which])))}`).join('L')} />
    {/snippet}
  </Plot>
  <p class="out">At x = 10⁷: {spec.label} = {last[which].toFixed(5)}; the limit is {spec.target.toFixed(5)}.</p>
</Widget>

<style>
  path {
    fill: none;
    stroke: var(--prime);
    stroke-width: 1.7;
  }
  .t {
    stroke: var(--fg);
    stroke-dasharray: 4 3;
  }
  .lab {
    font-size: 11px;
    fill: var(--mute);
  }
  .out {
    margin: 0.5rem 0 0;
    font-size: 0.86rem;
  }
</style>
