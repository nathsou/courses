<!--
  Every base a from 1 to n − 1, coloured by what the Fermat and Miller–Rabin tests say about n with that base:
  witness (the Fermat test already proves n composite), Fermat liar caught by Miller–Rabin, or strong liar.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import NumberInput from '$lib/components/ui/NumberInput.svelte';
  import { gcd, modPow, totient } from '$lib/primes/arith';
  import { isPrimeTrial, strongProbablePrime } from '$lib/primes/primality';

  const PRESETS = ['91', '341', '561', '1105', '1729', '2047', '2821', '8911', '9'];
  let text = $state('561');
  let parsed = $state<bigint | null>(561n);

  const n = $derived(parsed !== null && parsed >= 3n && parsed <= 20000n ? Number(parsed) : null);
  const data = $derived.by(() => {
    if (n === null) return null;
    const N = BigInt(n);
    const kinds = new Uint8Array(n); // 0 unused, 1 shares a factor, 2 Fermat witness, 3 Fermat liar but strong witness, 4 strong liar
    let fermat = 0;
    let strong = 0;
    for (let a = 1; a < n; a++) {
      const f = modPow(a, n - 1, n) === 1;
      const s = n % 2 === 1 && strongProbablePrime(N, BigInt(a));
      if (s) {
        kinds[a] = 4;
        strong++;
        fermat++;
      } else if (f) {
        kinds[a] = 3;
        fermat++;
      } else kinds[a] = gcd(a, n) > 1 ? 1 : 2;
    }
    return { kinds, fermat, strong, phi: totient(n), prime: isPrimeTrial(n) };
  });
  const cell = $derived(n === null ? 8 : n <= 200 ? 22 : n <= 1200 ? 10 : n <= 5000 ? 6 : 4);
  const pct = (x: number, y: number) => `${((100 * x) / y).toFixed(1)}%`;
</script>

<Widget title="Liars and witnesses" subtitle="Each square is a base a between 1 and n − 1. Does the test with base a expose n as composite?">
  {#snippet controls()}
    <NumberInput label="n (3 to 20,000)" bind:value={text} bind:parsed min={3n} max={20000n} />
    <div class="presets ui" role="group" aria-label="Examples">
      {#each PRESETS as p (p)}<button onclick={() => (text = p)}>{p}</button>{/each}
    </div>
  {/snippet}
  {#if data && n !== null}
    <div class="grid" style:--s="{cell}px" role="img" aria-label="Bases coloured by test outcome for n = {n}.">
      {#each Array.from({ length: n - 1 }, (_, i) => i + 1) as a (a)}<i class="k{data.kinds[a]}" title="a = {a}"></i>{/each}
    </div>
    <ul class="legend ui">
      <li><i class="k1"></i> shares a factor with n</li>
      <li><i class="k2"></i> Fermat witness: a<sup>n−1</sup> ≢ 1</li>
      <li><i class="k3"></i> Fermat liar, but Miller–Rabin catches it</li>
      <li><i class="k4"></i> strong liar: fools both tests</li>
    </ul>
    <p class="out" aria-live="polite">
      {#if data.prime}
        {n} is prime: every base is a "liar" in the sense that it passes, as it must.
      {:else}
        {n} is composite. Fermat liars: {data.fermat} of {n - 1} bases ({pct(data.fermat, n - 1)}){data.fermat === data.phi ? ', which is every base coprime to n: a Carmichael number' : ''}.
        {#if n % 2 === 1}Strong liars: {data.strong} ({pct(data.strong, n - 1)}; the bound φ(n)/4 = {data.phi / 4}).{:else}Miller–Rabin needs odd n.{/if}
      {/if}
    </p>
  {:else}
    <p>Enter an integer from 3 to 20,000.</p>
  {/if}
</Widget>

<style>
  .presets {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }
  .presets button {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    border: 1px solid var(--line-strong);
    background: var(--surface);
    border-radius: 999px;
    padding: 0.1rem 0.55rem;
    cursor: pointer;
  }
  .grid {
    display: flex;
    flex-wrap: wrap;
    gap: 1px;
    max-height: 22rem;
    overflow-y: auto;
  }
  .grid i,
  .legend i {
    display: block;
    width: var(--s, 12px);
    height: var(--s, 12px);
    border-radius: 1px;
  }
  .k1 {
    background: var(--surface-3);
  }
  .k2 {
    background: color-mix(in srgb, var(--ok) 55%, var(--surface));
  }
  .k3 {
    background: var(--fx-yellow);
  }
  .k4 {
    background: var(--prime);
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem 1.2rem;
    list-style: none;
    padding: 0;
    margin: 0.7rem 0 0;
    font-size: 0.78rem;
    color: var(--ink-2);
  }
  .legend li {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .legend i {
    width: 12px;
    height: 12px;
  }
  .out {
    margin: 0.5rem 0 0;
    font-size: 0.86rem;
  }
</style>
