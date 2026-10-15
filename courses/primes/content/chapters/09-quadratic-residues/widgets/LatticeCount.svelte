<!--
  Eisenstein's proof of quadratic reciprocity in one picture. In the rectangle 1 ≤ x ≤ (p−1)/2, 1 ≤ y ≤ (q−1)/2,
  the diagonal y = qx/p passes through no lattice point. Points below it count Σ⌊qx/p⌋ (whose parity gives
  (q/p)); points above count Σ⌊py/q⌋ (giving (p/q)). Together they fill the rectangle.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import { primesUpTo } from '$lib/primes/sieve';
  import { legendre } from '$lib/primes/primality';

  const PRIMES = primesUpTo(60).slice(1);
  let p = $state(11);
  let q = $state(7);

  const hp = $derived((p - 1) / 2);
  const hq = $derived((q - 1) / 2);
  const below = $derived(Array.from({ length: hp }, (_, i) => Math.floor((q * (i + 1)) / p)).reduce((a, b) => a + b, 0));
  const above = $derived(Array.from({ length: hq }, (_, j) => Math.floor((p * (j + 1)) / q)).reduce((a, b) => a + b, 0));
  const cell = $derived(Math.min(30, Math.floor(420 / Math.max(hp, hq, 1))));
  const sign = (k: number) => (k % 2 === 0 ? '+1' : '−1');
</script>

<Widget title="Counting lattice points" subtitle="Lattice points in the rectangle 1 ≤ x ≤ (p−1)/2, 1 ≤ y ≤ (q−1)/2, split by the line y = qx/p. The parity of each count is a Legendre symbol." onreset={() => ((p = 11), (q = 7))}>
  {#snippet controls()}
    <label class="pick ui">p = <select bind:value={p}>{#each PRIMES as r (r)}<option value={r} disabled={r === q}>{r}</option>{/each}</select></label>
    <label class="pick ui">q = <select bind:value={q}>{#each PRIMES as r (r)}<option value={r} disabled={r === p}>{r}</option>{/each}</select></label>
  {/snippet}
  {#if p !== q}
    <div class="wrap">
      <svg viewBox="0 0 {(hp + 1) * cell + 20} {(hq + 1) * cell + 20}" style:max-width="{(hp + 1) * cell + 20}px" role="img" aria-label="{below} lattice points below the line and {above} above it.">
        <g transform="translate(10,{(hq + 1) * cell + 10}) scale(1,-1)">
          <rect x={cell * 0.5} y={cell * 0.5} width={hp * cell} height={hq * cell} class="box" />
          <line x1="0" y1="0" x2={(p / 2) * cell} y2={(q / 2) * cell} class="diag" />
          {#each Array.from({ length: hp }, (_, i) => i + 1) as x (x)}
            {#each Array.from({ length: hq }, (_, j) => j + 1) as y (y)}
              <circle cx={x * cell} cy={y * cell} r={Math.max(2.5, cell * 0.16)} class:below={y < (q * x) / p} class:above={y > (q * x) / p} />
            {/each}
          {/each}
        </g>
      </svg>
    </div>
    <table class="tally">
      <tbody>
        <tr><td><span class="dot below"></span></td><td>below the line: Σ⌊qx/p⌋ = {below}</td><td>so (q/p) = (−1)<sup>{below}</sup> = {sign(below)}</td><td class="chk">{legendre(q, p) === (below % 2 ? -1 : 1) ? '✓' : '✗'}</td></tr>
        <tr><td><span class="dot above"></span></td><td>above the line: Σ⌊py/q⌋ = {above}</td><td>so (p/q) = (−1)<sup>{above}</sup> = {sign(above)}</td><td class="chk">{legendre(p, q) === (above % 2 ? -1 : 1) ? '✓' : '✗'}</td></tr>
        <tr><td></td><td>total: {below} + {above} = {hp} × {hq} = {hp * hq}</td><td>so (p/q)(q/p) = (−1)<sup>{hp * hq}</sup> = {sign(hp * hq)}</td><td></td></tr>
      </tbody>
    </table>
  {/if}
</Widget>

<style>
  .pick {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.85rem;
  }
  select {
    font-family: var(--font-mono);
    padding: 0.15rem 0.3rem;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--ink);
  }
  .wrap {
    overflow-x: auto;
  }
  svg {
    display: block;
    width: 100%;
    height: auto;
    margin: 0 auto;
  }
  .box {
    fill: none;
    stroke: var(--line-strong);
    stroke-dasharray: 3 3;
  }
  .diag {
    stroke: var(--fg);
    stroke-width: 1.5;
  }
  circle {
    fill: var(--surface-3);
  }
  circle.below,
  .dot.below {
    fill: var(--prime);
    background: var(--prime);
  }
  circle.above,
  .dot.above {
    fill: var(--fx-blue);
    background: var(--fx-blue);
  }
  .tally {
    margin-top: 0.6rem;
    border-collapse: collapse;
    font-size: 0.84rem;
  }
  .tally td {
    padding: 0.2rem 0.6rem 0.2rem 0;
  }
  .dot {
    width: 0.7rem;
    height: 0.7rem;
    border-radius: 50%;
    display: inline-block;
  }
  .chk {
    color: var(--ok);
    font-weight: 700;
  }
</style>
