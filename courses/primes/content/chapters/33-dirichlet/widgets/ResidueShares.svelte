<!--
  Primes in arithmetic progressions: for each residue a coprime to q, the share of the primes up to x that are
  ≡ a (mod q), as a multiple of the fair share 1/φ(q). Dirichlet: every share is infinite; the prime number theorem
  for arithmetic progressions: every ratio tends to 1.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import { primesUpTo } from '$lib/primes/sieve';
  import { gcd } from '$lib/primes/arith';

  const PS = primesUpTo(10_000_000);
  let q = $state(10);
  let X = $state(1_000_000);
  const data = $derived.by(() => {
    const counts = new Array<number>(q).fill(0);
    let total = 0;
    for (const p of PS) {
      if (p > X) break;
      counts[p % q]!++;
      total++;
    }
    const units = Array.from({ length: q }, (_, a) => a).filter((a) => gcd(a, q) === 1);
    const fair = (total - counts.filter((_, a) => gcd(a, q) !== 1).reduce((s, v) => s + v, 0)) / units.length;
    return { units: units.map((a) => ({ a, n: counts[a]!, r: counts[a]! / fair })), total, fair };
  });
</script>

<Widget title="Primes in residue classes" subtitle="How the primes up to x split among the residues a modulo q with gcd(a, q) = 1. Each bar is the count divided by the fair share π(x)/φ(q)." onreset={() => ((q = 10), (X = 1_000_000))}>
  {#snippet controls()}
    <Slider label="modulus q" bind:value={q} min={3} max={30} step={1} format={(v) => String(v)} />
    <Segmented label="x" bind:value={X} options={[{ value: 1000, label: '10³' }, { value: 100_000, label: '10⁵' }, { value: 1_000_000, label: '10⁶' }, { value: 10_000_000, label: '10⁷' }]} size="sm" />
  {/snippet}
  <div class="bars">
    {#each data.units as u (u.a)}
      <div class="row">
        <span class="lab mono">{u.a} mod {q}</span>
        <div class="track"><div class="bar" style:width="{Math.min(100, u.r * 50)}%"></div><div class="fair"></div></div>
        <span class="val mono">{u.n.toLocaleString('en-GB')} · {u.r.toFixed(4)}</span>
      </div>
    {/each}
  </div>
  <p class="out">π(x) = {data.total.toLocaleString('en-GB')} for x = {X.toLocaleString('en-GB')}; φ({q}) = {data.units.length} classes, fair share {Math.round(data.fair).toLocaleString('en-GB')}. The dark line marks a ratio of 1.</p>
</Widget>

<style>
  .bars {
    display: grid;
    gap: 0.25rem;
  }
  .row {
    display: grid;
    grid-template-columns: 5.5rem 1fr 9.5rem;
    gap: 0.5rem;
    align-items: center;
    font-size: 0.78rem;
  }
  .mono {
    font-family: var(--font-mono);
  }
  .val {
    text-align: right;
  }
  .track {
    position: relative;
    height: 0.9rem;
    background: var(--chart-surface);
    border: 1px solid var(--ruling);
  }
  .bar {
    position: absolute;
    inset: 0 auto 0 0;
    background: color-mix(in srgb, var(--fx-blue) 60%, var(--surface));
  }
  .fair {
    position: absolute;
    left: 50%;
    top: -2px;
    bottom: -2px;
    border-left: 2px solid var(--fg);
  }
  .out {
    margin: 0.6rem 0 0;
    font-size: 0.86rem;
  }
</style>
