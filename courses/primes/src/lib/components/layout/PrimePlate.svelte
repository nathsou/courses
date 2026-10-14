<!--
  A page of a factor table: the hundred numbers start+1 … start+100 as a 10 × 10 grid, primes inked in
  rubric red. Each chapter gets its own hundred (chapter n shows (100n, 100n + 100]).
-->
<script lang="ts">
  import { isPrimeTrial } from '$lib/primes/primality';

  let { start }: { start: number } = $props();

  const cells = $derived(Array.from({ length: 100 }, (_, i) => start + 1 + i));
  const count = $derived(cells.filter(isPrimeTrial).length);
</script>

<figure class="plate" aria-label="The numbers {start + 1} to {start + 100}: {count} of them are prime.">
  <div class="grid" aria-hidden="true">
    {#each cells as n (n)}<i class:p={isPrimeTrial(n)}></i>{/each}
  </div>
  <figcaption class="ui"><span>{start + 1}–{start + 100}</span><span>{count} primes</span></figcaption>
</figure>

<style>
  .plate {
    margin: 0;
    width: 10.5rem;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(10, 1fr);
    gap: 2px;
    padding: 6px;
    background: var(--surface);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-sm);
    box-shadow: var(--shadow);
  }
  i {
    aspect-ratio: 1;
    background: var(--pn);
    border-radius: 1px;
  }
  i.p {
    background: var(--prime);
  }
  figcaption {
    display: flex;
    justify-content: space-between;
    margin-top: 0.45rem;
    font-family: var(--font-mono);
    font-size: 0.66rem;
    letter-spacing: 0.06em;
    color: var(--mute);
    font-variant-numeric: tabular-nums;
  }
</style>
