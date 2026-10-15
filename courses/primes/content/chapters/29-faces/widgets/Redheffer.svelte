<!--
  Redheffer's matrix A_n: entry (i, j) is 1 if j = 1 or i divides j, and 0 otherwise. Its determinant is M(n), the
  Mertens function, so RH is equivalent to det A_n = O(n^(1/2 + ε)). The determinant is computed here by exact
  integer elimination (Bareiss), independently of the Möbius function.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import { mertensTable } from '$lib/primes/sieve';

  let n = $state(12);
  const M = mertensTable(60);
  const cell = (i: number, j: number) => (j === 1 || j % i === 0 ? 1 : 0);
  /** Exact determinant by Bareiss's fraction-free elimination over BigInt. */
  function det(size: number): bigint {
    const a: bigint[][] = Array.from({ length: size }, (_, i) => Array.from({ length: size }, (_, j) => BigInt(cell(i + 1, j + 1))));
    let sign = 1n;
    let prev = 1n;
    for (let k = 0; k < size - 1; k++) {
      if (a[k]![k] === 0n) {
        const r = a.findIndex((row, idx) => idx > k && row[k] !== 0n);
        if (r < 0) return 0n;
        [a[k], a[r]] = [a[r]!, a[k]!];
        sign = -sign;
      }
      for (let i = k + 1; i < size; i++) {
        for (let j = k + 1; j < size; j++) a[i]![j] = (a[i]![j]! * a[k]![k]! - a[i]![k]! * a[k]![j]!) / prev;
      }
      prev = a[k]![k]!;
    }
    return sign * a[size - 1]![size - 1]!;
  }
  const d = $derived(det(n));
  const size = $derived(Math.min(420, 22 * n));
  const c = $derived(size / n);
</script>

<Widget title="Redheffer’s matrix" subtitle="Row i, column j is filled when j = 1 or i divides j. Its determinant equals the Mertens function M(n) = μ(1) + ⋯ + μ(n)." onreset={() => (n = 12)}>
  {#snippet controls()}
    <Slider label="n" bind:value={n} min={1} max={60} step={1} format={(v) => String(v)} />
  {/snippet}
  <div class="wrap">
    <svg viewBox="0 0 {size + 24} {size + 24}" style:max-width="{size + 24}px" role="img" aria-label="Redheffer's matrix of size {n}.">
      {#each Array.from({ length: n }, (_, i) => i + 1) as i (i)}
        {#each Array.from({ length: n }, (_, j) => j + 1) as j (j)}
          <rect x={24 + (j - 1) * c} y={24 + (i - 1) * c} width={c - 1} height={c - 1} class:on={cell(i, j) === 1} class:col={j === 1 && i > 1} />
        {/each}
        {#if n <= 30 || i % 5 === 0}<text x="20" y={24 + (i - 0.5) * c + 4} text-anchor="end">{i}</text>{/if}
      {/each}
      {#each Array.from({ length: n }, (_, j) => j + 1) as j (j)}
        {#if n <= 30 || j % 5 === 0}<text x={24 + (j - 0.5) * c} y="16" text-anchor="middle">{j}</text>{/if}
      {/each}
    </svg>
  </div>
  <p class="out" aria-live="polite">det A<sub>{n}</sub> = <strong>{d.toString()}</strong>, computed by exact elimination; and M({n}) = {M[n]}.</p>
</Widget>

<style>
  .wrap {
    width: 100%;
  }
  svg {
    width: 100%;
    display: block;
    margin: 0 auto;
    font-family: var(--font-mono);
  }
  rect {
    fill: var(--surface);
    stroke: var(--ruling);
    stroke-width: 0.5;
  }
  rect.on {
    fill: var(--fx-blue);
  }
  rect.on.col {
    fill: var(--prime);
  }
  text {
    font-size: 9px;
    fill: var(--mute);
  }
  .out {
    margin: 0.6rem 0 0;
    font-size: 0.86rem;
  }
</style>
