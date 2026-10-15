<!--
  The classical half of Shor's algorithm: if you can find the order r of a modulo n, then (when r is even and
  a^(r/2) ≢ −1) gcd(a^(r/2) − 1, n) is a factor. Here the order is found by brute force; a quantum computer would
  find it by period finding in polynomial time.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import { gcd, modPow, order } from '$lib/primes/arith';

  const NS = [15, 21, 35, 91, 143, 221, 323, 3233, 10403];
  let n = $state(91);
  let a = $state(3);

  const valid = $derived(a > 1 && a < n);
  const g0 = $derived(gcd(a, n));
  const r = $derived(g0 === 1 ? order(a, n)! : 0);
  const half = $derived(r % 2 === 0 ? modPow(a, r / 2, n) : null);
  const f1 = $derived(half !== null ? gcd(half - 1, n) : null);
  const f2 = $derived(half !== null ? gcd(half + 1, n) : null);
  const seq = $derived(g0 === 1 ? Array.from({ length: Math.min(r + 1, 40) }, (_, k) => modPow(a, k, n)) : []);
  // Fraction of bases that work, for the explanation.
  const goodFraction = $derived.by(() => {
    let good = 0;
    let total = 0;
    for (let b = 2; b < n; b++) {
      if (gcd(b, n) !== 1) continue;
      total++;
      const o = order(b, n)!;
      if (o % 2 === 0 && modPow(b, o / 2, n) !== n - 1) good++;
    }
    return total ? good / total : 0;
  });
</script>

<Widget title="From the order of a to a factor of n" subtitle="Shor’s quantum algorithm finds the period r of k ↦ aᵏ mod n. Everything else is classical, and shown here.">
  {#snippet controls()}
    <label class="pick ui">n = <select bind:value={n} onchange={() => (a = 2)}>{#each NS as v (v)}<option value={v}>{v}</option>{/each}</select></label>
    <label class="pick ui">a = <input type="number" min="2" max={n - 1} bind:value={a} /></label>
  {/snippet}
  {#if !valid}
    <p>Choose 2 ≤ a ≤ n − 1.</p>
  {:else if g0 > 1}
    <p class="out">Lucky: gcd({a}, {n}) = {g0} is already a factor. (For large n this almost never happens.)</p>
  {:else}
    <p class="seq mono">a<sup>k</sup> mod {n}: {seq.join(', ')}{r + 1 > 40 ? ', …' : ''}</p>
    <ol class="steps">
      <li>The powers repeat with period <strong>r = {r}</strong>: a<sup>{r}</sup> ≡ 1. <span class="mute">(This is the step a quantum computer does fast.)</span></li>
      {#if r % 2 === 1}
        <li class="fail">r is odd, so a<sup>r/2</sup> is not an integer power. Try another a.</li>
      {:else}
        <li>r is even: x = a<sup>r/2</sup> = {a}<sup>{r / 2}</sup> ≡ {half} is a square root of 1 modulo {n}.</li>
        {#if half === n - 1}
          <li class="fail">But x ≡ −1, a trivial square root. Try another a.</li>
        {:else}
          <li>x ≢ ±1, so n divides (x − 1)(x + 1) but neither factor: gcd(x − 1, n) = <strong>{f1}</strong> and gcd(x + 1, n) = <strong>{f2}</strong>, and {n} = {f1} × {n / f1!}.</li>
        {/if}
      {/if}
    </ol>
    <p class="mute small">For n = {n}, {(goodFraction * 100).toFixed(0)}% of the bases coprime to n lead to a factor this way.</p>
  {/if}
</Widget>

<style>
  .pick {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.85rem;
  }
  select,
  input {
    font-family: var(--font-mono);
    padding: 0.15rem 0.3rem;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--ink);
    width: 6rem;
  }
  .mono {
    font-family: var(--font-mono);
  }
  .seq {
    font-size: 0.8rem;
    overflow-wrap: anywhere;
    margin: 0 0 0.5rem;
  }
  .steps {
    margin: 0;
    padding-left: 1.3rem;
    font-size: 0.88rem;
  }
  .steps li {
    margin: 0.25rem 0;
  }
  .fail {
    color: var(--bad);
  }
  .mute {
    color: var(--mute);
  }
  .small {
    font-size: 0.8rem;
    margin: 0.5rem 0 0;
  }
  .out {
    font-size: 0.88rem;
  }
</style>
