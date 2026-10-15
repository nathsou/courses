<!--
  A Pratt certificate, built and checked. To certify p: give a witness a and the prime factors q of p − 1, with
  a^(p−1) ≡ 1 and a^((p−1)/q) ≢ 1 for each q; then certify each q the same way. The tree bottoms out at 2.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import NumberInput from '$lib/components/ui/NumberInput.svelte';
  import { factorWithin } from '$lib/primes/factor';
  import { isPrime } from '$lib/primes/primality';
  import { modPowBig } from '$lib/primes/arith';

  interface Cert {
    p: bigint;
    a: bigint;
    factors: [bigint, number][];
    children: Cert[];
  }

  const PRESETS = ['97', '65537', '1000003', '2147483647', '1000000007', '999999000001', '170141183460469231731687303715884105727'];
  let text = $state('1000003');
  let parsed = $state<bigint | null>(1000003n);

  function certify(p: bigint, budget: { ms: number }): Cert | null | 'composite' {
    if (p === 2n) return { p, a: 1n, factors: [], children: [] };
    if (!isPrime(p)) return 'composite';
    const start = performance.now();
    const factors = factorWithin(p - 1n, Math.max(50, budget.ms));
    budget.ms -= performance.now() - start;
    if (!factors) return null;
    let a = 2n;
    for (; a < p; a++) {
      if (modPowBig(a, p - 1n, p) !== 1n) continue;
      if (factors.every(([q]) => modPowBig(a, (p - 1n) / q, p) !== 1n)) break;
    }
    const children: Cert[] = [];
    for (const [q] of factors) {
      const c = certify(q, budget);
      if (c === null || c === 'composite') return null;
      children.push(c);
    }
    return { p, a, factors, children };
  }

  const cert = $derived.by(() => {
    if (parsed === null || parsed < 2n) return undefined;
    return certify(parsed, { ms: 2500 });
  });
  const size = (c: Cert): number => 1 + c.children.reduce((s, k) => s + size(k), 0);
  const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  const fmt = (fs: [bigint, number][]) => fs.map(([q, e]) => (e > 1 ? `${q}${String(e).replace(/\d/g, (d) => SUP[Number(d)]!)}` : `${q}`)).join(' · ');
</script>

{#snippet node(c: Cert)}
  <li>
    {#if c.p === 2n}
      <span class="p">2</span> <span class="why">is prime (base case)</span>
    {:else}
      <span class="p">{c.p}</span>
      <span class="why">witness a = {c.a}; p − 1 = {fmt(c.factors)}</span>
      <ul>
        {#each c.children as k (k.p)}{@render node(k)}{/each}
      </ul>
    {/if}
  </li>
{/snippet}

<Widget title="A Pratt certificate" subtitle="Each prime p is certified by a witness a of order p − 1 and the factorisation of p − 1, whose primes are certified in turn. Anyone can check the tree with a few modular exponentiations.">
  {#snippet controls()}
    <NumberInput label="a prime to certify" bind:value={text} bind:parsed min={2n} width="30ch" />
    <div class="presets ui" role="group" aria-label="Examples">
      {#each PRESETS as p (p)}<button onclick={() => (text = p)}>{p.length > 12 ? `2¹²⁷ − 1` : p}</button>{/each}
    </div>
  {/snippet}
  {#if cert === 'composite'}
    <p class="bad">That number is composite (Miller–Rabin finds a witness), so it has no certificate of primality.</p>
  {:else if cert === null}
    <p class="bad">Could not factor p − 1 (or one of the numbers below it) within the time limit. Certificates exist for every prime, but finding one needs those factorisations.</p>
  {:else if cert}
    <ul class="tree">{@render node(cert)}</ul>
    <p class="out">{size(cert)} primes in the tree. Checking it takes about {size(cert)} × (number of prime factors) modular exponentiations.</p>
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
  .tree,
  .tree :global(ul) {
    list-style: none;
    margin: 0;
    padding-left: 1.2rem;
    border-left: 1px solid var(--ruling);
  }
  .tree {
    padding-left: 0;
    border-left: 0;
    font-family: var(--font-mono);
    font-size: 0.8rem;
    max-height: 26rem;
    overflow: auto;
  }
  .tree :global(li) {
    padding: 0.15rem 0;
    overflow-wrap: anywhere;
  }
  .tree :global(.p) {
    color: var(--accent);
    font-weight: 700;
  }
  .tree :global(.why) {
    color: var(--ink-2);
    margin-left: 0.4rem;
  }
  .bad {
    color: var(--bad);
  }
  .out {
    margin: 0.6rem 0 0;
    font-size: 0.84rem;
  }
</style>
