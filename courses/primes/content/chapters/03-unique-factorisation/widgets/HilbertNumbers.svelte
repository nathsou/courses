<!--
  Hilbert's world: only the numbers 1, 5, 9, 13, … (≡ 1 mod 4) exist. They are closed under multiplication, so
  "Hilbert primes" make sense — but factorisation into them is not unique. Click a number to see all of its
  factorisations into Hilbert primes.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';

  const N = 1001;
  const nums = Array.from({ length: (N - 1) / 4 + 1 }, (_, i) => 1 + 4 * i).filter((n) => n > 1);
  const isHilbert = (n: number) => n % 4 === 1;
  const hPrime = new Map<number, boolean>();
  for (const n of nums) {
    let p = true;
    for (let d = 5; d * d <= n; d += 4) if (n % d === 0 && isHilbert(n / d)) p = false;
    hPrime.set(n, p);
  }

  /** All factorisations of n into Hilbert primes, as non-decreasing lists. */
  function factorisations(n: number, min = 5): number[][] {
    const out: number[][] = [];
    if (hPrime.get(n) && n >= min) out.push([n]);
    for (let d = min; d * d <= n; d += 4) {
      if (n % d !== 0 || !hPrime.get(d) || !isHilbert(n / d)) continue;
      for (const rest of factorisations(n / d, d)) out.push([d, ...rest]);
    }
    return out;
  }

  const ambiguous = new Set(nums.filter((n) => factorisations(n).length > 1));
  let chosen = $state(441);
  const fs = $derived(factorisations(chosen));
</script>

<Widget title="Hilbert’s numbers" subtitle="Only 1, 5, 9, 13, 17, … exist. Red: Hilbert primes (not a product of two smaller Hilbert numbers). Outlined: numbers with more than one factorisation into Hilbert primes. Click any number." onreset={() => (chosen = 441)}>
  <div class="grid" role="group" aria-label="Hilbert numbers up to {N}">
    {#each nums as n (n)}
      <button class:hp={hPrime.get(n)} class:amb={ambiguous.has(n)} class:on={chosen === n} onclick={() => (chosen = n)} aria-pressed={chosen === n}>{n}</button>
    {/each}
  </div>
  <div class="out" aria-live="polite">
    {#if hPrime.get(chosen)}
      <p><strong>{chosen}</strong> is a Hilbert prime{chosen % 3 === 0 || chosen % 7 === 0 || chosen % 11 === 0 ? `, even though it is not an ordinary prime` : ''}.</p>
    {:else}
      <p><strong>{chosen}</strong> has {fs.length} {fs.length === 1 ? 'factorisation' : 'factorisations'} into Hilbert primes:</p>
      <ul>
        {#each fs as f, i (i)}<li>{chosen} = {f.join(' × ')}</li>{/each}
      </ul>
    {/if}
  </div>
</Widget>

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(2.6rem, 1fr));
    gap: 3px;
    max-height: 15rem;
    overflow-y: auto;
    padding: 2px;
  }
  .grid button {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    padding: 0.2rem 0;
    border: 1px solid transparent;
    border-radius: 3px;
    background: var(--pn);
    color: var(--ink-2);
    cursor: pointer;
  }
  .grid button.hp {
    background: color-mix(in srgb, var(--prime) 22%, var(--surface));
    color: var(--ink);
  }
  .grid button.amb {
    border: 2px solid var(--fx-blue);
    font-weight: 700;
    color: var(--fx-blue);
  }
  .grid button.on {
    outline: 2px solid var(--fg);
    outline-offset: 1px;
  }
  .out {
    margin-top: 0.75rem;
    font-variant-numeric: tabular-nums;
  }
  .out p {
    margin: 0 0 0.3rem;
  }
  .out ul {
    margin: 0;
    padding-left: 1.2rem;
    font-family: var(--font-mono);
    font-size: 0.85rem;
  }
</style>
