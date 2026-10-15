<!--
  Arithmetic progressions of primes. For each length k, the progression with the smallest last term, found by search.
  The common difference must be divisible by every prime below k (unless the progression starts at that prime),
  which is why the differences jump to multiples of 30 and 210. Green and Tao proved that every length occurs.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import { sieve, primesUpTo } from '$lib/primes/sieve';

  const M = 4000;
  const flags = sieve(M);
  const PS = primesUpTo(M);
  let k = $state(6);
  const best = $derived.by(() => {
    let found: number[] | null = null;
    for (const a of PS) {
      for (let d = 2; a + (k - 1) * d < M; d += 2) {
        if (found && a + (k - 1) * d >= found[k - 1]!) break;
        let ok = true;
        for (let i = 1; i < k; i++) {
          if (!flags[a + i * d]) {
            ok = false;
            break;
          }
        }
        if (ok) found = Array.from({ length: k }, (_, i) => a + i * d);
      }
    }
    return found;
  });
  const d = $derived(best && best.length > 1 ? best[1]! - best[0]! : 0);
  const factor = (n: number) => {
    const f: string[] = [];
    for (let p = 2; p <= n; p++) {
      let e = 0;
      while (n % p === 0) ((n /= p), e++);
      if (e) f.push(e > 1 ? `${p}^${e}` : String(p));
    }
    return f.join('·');
  };
  const W = 640;
</script>

<Widget title="Primes in arithmetic progression" subtitle="For each length k, the progression of k primes a, a + d, …, a + (k − 1)d with the smallest last term." onreset={() => (k = 6)}>
  {#snippet controls()}
    <Slider label="length k" bind:value={k} min={3} max={10} step={1} format={(v) => String(v)} />
  {/snippet}
  {#if best}
    <svg viewBox="0 0 {W} 70" class="line" role="img" aria-label="The progression {best.join(', ')}.">
      <line x1="10" x2={W - 10} y1="40" y2="40" class="axis" />
      {#each best as v, i (i)}
        <circle cx={10 + ((W - 20) * v) / best[k - 1]!} cy="40" r="5" class="pt" />
        <text x={10 + ((W - 20) * v) / best[k - 1]!} y={i % 2 ? 64 : 24} text-anchor="middle">{v}</text>
      {/each}
    </svg>
    <p class="out mono">{best.join(', ')}</p>
    <p class="out">Common difference d = {d} = {factor(d)}{k >= 7 && d % 210 === 0 ? ', a multiple of 2·3·5·7 = 210' : k >= 5 && d % 30 === 0 ? ', a multiple of 2·3·5 = 30' : ''}. If a prime p ≤ k did not divide d, the k terms would cover every residue modulo p, so one of them would be divisible by p and would have to be p itself.</p>
  {:else}
    <p class="out">None below {M}.</p>
  {/if}
</Widget>

<style>
  .line {
    width: 100%;
    height: auto;
    display: block;
    font-family: var(--font-mono);
  }
  .axis {
    stroke: var(--rule);
  }
  .pt {
    fill: var(--prime);
  }
  text {
    font-size: 11px;
    fill: var(--ink-2);
  }
  .out {
    margin: 0.4rem 0 0;
    font-size: 0.86rem;
  }
  .mono {
    font-family: var(--font-mono);
  }
</style>
