<!--
  One round of Miller–Rabin, traced: write n − 1 = 2^s·d, compute a^d, then square s times. A prime must show
  either 1 at the start or −1 somewhere before the end. A 1 reached from something other than ±1 is a non-trivial
  square root of 1, and its gcd with n splits n.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import NumberInput from '$lib/components/ui/NumberInput.svelte';
  import { decompose, millerRabinTrace } from '$lib/primes/primality';
  import { gcdBig } from '$lib/primes/arith';

  let tn = $state('561');
  let ta = $state('2');
  let n = $state<bigint | null>(561n);
  let a = $state<bigint | null>(2n);

  const result = $derived.by(() => {
    if (n === null || a === null || n < 5n || n % 2n === 0n || a < 2n || a > n - 2n) return null;
    const { s, d } = decompose(n);
    const seq = millerRabinTrace(n, a);
    let verdict: 'pass' | 'witness' = 'witness';
    let reason = '';
    let factor: bigint | null = null;
    if (seq[0] === 1n) {
      verdict = 'pass';
      reason = `a^d ≡ 1 at once.`;
    } else {
      for (let i = 0; i < s; i++) {
        if (seq[i] === n - 1n) {
          verdict = 'pass';
          reason = `−1 appears at step ${i}, so every later square is 1.`;
          break;
        }
        if (seq[i + 1] === 1n) {
          reason = `${seq[i]} squares to 1 but is not ±1: a non-trivial square root of 1, impossible modulo a prime.`;
          factor = gcdBig(seq[i]! - 1n, n);
          break;
        }
      }
      if (verdict === 'witness' && !reason) reason = seq[s] === 1n ? '' : `a^(n−1) = ${seq[s]} ≠ 1: even the Fermat test fails.`;
    }
    return { s, d, seq, verdict, reason, factor };
  });
  const short = (v: bigint) => {
    const t = v.toString();
    return t.length > 30 ? `${t.slice(0, 12)}…${t.slice(-12)}` : t;
  };
</script>

<Widget title="One round of Miller–Rabin" subtitle="Write n − 1 = 2ˢ·d with d odd. Compute a^d and square it s times. For a prime n the sequence must start with 1, or contain −1 before the end.">
  {#snippet controls()}
    <NumberInput label="odd n" bind:value={tn} bind:parsed={n} min={5n} width="22ch" />
    <NumberInput label="base a" bind:value={ta} bind:parsed={a} min={2n} width="10ch" />
  {/snippet}
  {#if result && n !== null}
    <p class="dec">n − 1 = {short(n - 1n)} = 2<sup>{result.s}</sup> × {short(result.d)}</p>
    <ol class="seq" start="0">
      {#each result.seq as v, i (i)}
        <li class:one={v === 1n} class:minus={v === n - 1n}>
          <span class="exp">a<sup>{i === 0 ? 'd' : `2${i > 1 ? `^${i}` : ''}d`}</sup></span>
          <span class="val">≡ {v === n - 1n ? '−1' : short(v)}</span>
        </li>
      {/each}
    </ol>
    <p class="out" class:pass={result.verdict === 'pass'} aria-live="polite">
      {#if result.verdict === 'pass'}
        <strong>Passes:</strong> {result.reason} n is a strong probable prime to base {a}.
      {:else}
        <strong>Witness:</strong> {result.reason} So {short(n)} is composite.
        {#if result.factor && result.factor > 1n && result.factor < n}Bonus: gcd(that − 1, n) = {short(result.factor)} is a factor.{/if}
      {/if}
    </p>
  {:else}
    <p>Enter an odd n ≥ 5 and a base 2 ≤ a ≤ n − 2.</p>
  {/if}
</Widget>

<style>
  .dec {
    margin: 0 0 0.5rem;
    font-family: var(--font-mono);
    font-size: 0.84rem;
    overflow-wrap: anywhere;
  }
  .seq {
    list-style: none;
    margin: 0;
    padding: 0;
    font-family: var(--font-mono);
    font-size: 0.84rem;
  }
  .seq li {
    display: flex;
    gap: 1rem;
    padding: 0.2rem 0.4rem;
    border-bottom: 1px solid var(--ruling);
  }
  .exp {
    min-width: 6rem;
    color: var(--mute);
  }
  .seq li.one .val {
    color: var(--ok);
    font-weight: 700;
  }
  .seq li.minus .val {
    color: var(--fx-blue);
    font-weight: 700;
  }
  .out {
    margin: 0.7rem 0 0;
    padding: 0.4rem 0.7rem;
    border-left: 3px solid var(--bad);
    background: var(--bad-soft);
    font-size: 0.88rem;
    overflow-wrap: anywhere;
  }
  .out.pass {
    border-color: var(--ok);
    background: var(--ok-soft);
  }
</style>
