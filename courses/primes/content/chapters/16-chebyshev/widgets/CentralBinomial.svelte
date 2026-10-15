<!--
  The prime factorisation of the central binomial coefficient C(2n, n), drawn as bars of log(p^e). Every prime in
  (n, 2n] appears exactly once; no prime in (2n/3, n] appears at all; each prime power is at most 2n. These three
  facts give Chebyshev's bounds and Bertrand's postulate.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import { primesUpTo } from '$lib/primes/sieve';

  let n = $state(30);

  const vp = (p: number) => {
    let e = 0;
    for (let q = p; q <= 2 * n; q *= p) e += Math.floor((2 * n) / q) - 2 * Math.floor(n / q);
    return e;
  };
  const bars = $derived(primesUpTo(2 * n).map((p) => ({ p, e: vp(p), zone: p > n ? 'high' : 3 * p > 2 * n ? 'gap' : p * p > 2 * n ? 'mid' : 'low' })));
  const logC = $derived(bars.reduce((s, b) => s + b.e * Math.log(b.p), 0));
  const maxLog = $derived(Math.log(2 * n));
  const W = 640;
  const H = 200;
  const bw = $derived(W / Math.max(1, bars.length));
  const digits = $derived(Math.floor(logC / Math.LN10) + 1);
</script>

<Widget title="Inside the central binomial coefficient" subtitle="The prime factorisation of C(2n, n) = (2n)! / (n!)². Each bar is log(pᵉ) for the exact power pᵉ dividing it; the dashed line is log(2n), which no bar exceeds." onreset={() => (n = 30)}>
  {#snippet controls()}
    <Slider label="n" bind:value={n} min={5} max={200} step={1} format={(v) => String(v)} />
  {/snippet}
  <svg viewBox="0 0 {W} {H + 24}" class="plot" role="img" aria-label="Prime factorisation of the binomial coefficient 2n choose n for n = {n}.">
    <line class="cap" x1="0" x2={W} y1={H - (H - 10) * 1} y2={H - (H - 10) * 1} />
    {#each bars as b, i (b.p)}
      {@const h = (b.e * Math.log(b.p)) / maxLog * (H - 10)}
      <rect x={i * bw + 1} y={H - h} width={Math.max(1, bw - 2)} height={h} class={b.zone} />
      {#if bars.length <= 40}<text x={i * bw + bw / 2} y={H + 14} text-anchor="middle">{b.p}</text>{/if}
    {/each}
  </svg>
  <ul class="legend ui">
    <li><i class="low"></i> p ≤ √(2n): any exponent, but pᵉ ≤ 2n</li>
    <li><i class="mid"></i> √(2n) &lt; p ≤ 2n/3: exponent 0 or 1</li>
    <li><i class="gap"></i> 2n/3 &lt; p ≤ n: never divides</li>
    <li><i class="high"></i> n &lt; p ≤ 2n: exactly once</li>
  </ul>
  <p class="out">C({2 * n}, {n}) has {digits} digits. 4ⁿ / (2n + 1) ≤ C(2n, n) ≤ 4ⁿ, and here log C(2n, n) / (n log 4) = {(logC / (n * Math.log(4))).toFixed(3)}.</p>
</Widget>

<style>
  .plot {
    width: 100%;
    height: auto;
    display: block;
    font-family: var(--font-mono);
  }
  .cap {
    stroke: var(--rule-strong);
    stroke-dasharray: 4 3;
  }
  rect.low {
    fill: var(--fx-blue);
  }
  rect.mid {
    fill: var(--series-4);
  }
  rect.gap {
    fill: var(--surface-3);
  }
  rect.high {
    fill: var(--prime);
  }
  text {
    font-size: 9px;
    fill: var(--mute);
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem 1rem;
    list-style: none;
    padding: 0;
    margin: 0.4rem 0 0;
    font-size: 0.76rem;
    color: var(--ink-2);
  }
  .legend li {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }
  .legend i {
    width: 0.8rem;
    height: 0.8rem;
    display: inline-block;
  }
  .legend i.low {
    background: var(--fx-blue);
  }
  .legend i.mid {
    background: var(--series-4);
  }
  .legend i.gap {
    background: var(--surface-3);
    border: 1px solid var(--line-strong);
  }
  .legend i.high {
    background: var(--prime);
  }
  .out {
    margin: 0.5rem 0 0;
    font-size: 0.86rem;
  }
</style>
