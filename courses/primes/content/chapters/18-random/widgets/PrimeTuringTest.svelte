<!--
  A Turing test for primes: three runs of "primes" starting near x. One is real, one comes from Cramér's model
  (each n independently with probability 1/log n), one from Granville's refinement (only n coprime to the primes
  up to 11, with the probability raised to compensate). Can you tell which is which?
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { primesInRange } from '$lib/primes/sieve';
  import { rng } from '$lib/primes/random';
  import { gcd } from '$lib/primes/arith';

  const X = 1_000_000;
  const COUNT = 30;
  let seed = $state(1);
  let guess = $state<number | null>(null);

  const rounds = $derived.by(() => {
    const r = rng(seed);
    const start = X + r.int(0, 900_000);
    const real = primesInRange(start, start + 2000).slice(0, COUNT);
    const cramer: number[] = [];
    for (let n = start; cramer.length < COUNT; n++) if (r.next() < 1 / Math.log(n)) cramer.push(n);
    // Granville: keep only n coprime to 2310 = 2·3·5·7·11, with probability (1/log n) · 2310/φ(2310).
    const boost = 2310 / 480;
    const granville: number[] = [];
    for (let n = start; granville.length < COUNT; n++) if (gcd(n, 2310) === 1 && r.next() < boost / Math.log(n)) granville.push(n);
    const lists = [
      { kind: 'real', nums: real },
      { kind: 'Cramér', nums: cramer },
      { kind: 'Granville', nums: granville },
    ];
    // Shuffle the display order.
    const order = [0, 1, 2].sort(() => r.next() - 0.5);
    return order.map((i) => lists[i]!);
  });
  const realIndex = $derived(rounds.findIndex((l) => l.kind === 'real'));
  const stats = (nums: number[]) => ({ even: nums.filter((n) => n % 2 === 0).length, mult3: nums.filter((n) => n % 3 === 0).length });
</script>

<Widget title="Which list is real?" subtitle="Thirty consecutive “primes” from three sources, starting at the same random point above a million. Pick the real primes." onreset={() => ((seed = 1), (guess = null))}>
  {#snippet controls()}
    <Button size="sm" onclick={() => ((seed = seed + 1), (guess = null))}>New lists</Button>
  {/snippet}
  <div class="lists">
    {#each rounds as l, i (i)}
      <div class="list" class:right={guess !== null && i === realIndex} class:wrong={guess === i && i !== realIndex}>
        <p class="nums mono">{l.nums.join(', ')}</p>
        {#if guess === null}
          <Button size="sm" onclick={() => (guess = i)}>This one is real</Button>
        {:else}
          {@const st = stats(l.nums)}
          <p class="verdict ui"><strong>{l.kind === 'real' ? 'The real primes' : l.kind === 'Cramér' ? 'Cramér’s model' : 'Granville’s model'}</strong> · {st.even} even, {st.mult3} multiples of 3</p>
        {/if}
      </div>
    {/each}
  </div>
  {#if guess !== null}
    <p class="out" aria-live="polite">{guess === realIndex ? 'Correct.' : 'Not this time.'} Cramér’s model gives itself away with even numbers; Granville’s, which removes multiples of small primes first, is much harder to tell apart from the real thing.</p>
  {/if}
</Widget>

<style>
  .lists {
    display: grid;
    gap: 0.6rem;
  }
  .list {
    padding: 0.5rem 0.7rem;
    border: 1px solid var(--rule);
    border-radius: var(--radius-sm);
  }
  .list.right {
    border-color: var(--ok);
    background: var(--ok-soft);
  }
  .list.wrong {
    border-color: var(--bad);
    background: var(--bad-soft);
  }
  .nums {
    margin: 0 0 0.4rem;
    font-size: 0.74rem;
    line-height: 1.5;
    overflow-wrap: anywhere;
  }
  .mono {
    font-family: var(--font-mono);
  }
  .verdict {
    margin: 0;
    font-size: 0.82rem;
  }
  .out {
    margin: 0.6rem 0 0;
    font-size: 0.86rem;
  }
</style>
