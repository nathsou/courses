<script lang="ts">
  /** Post's correspondence problem: choose dominoes until top and bottom read the same; or let a bounded search try. */
  import Widget from '$lib/components/ui/Widget.svelte';
  import { solvePCP, type Domino } from '$lib/trs/machines';

  let { dominoes = 'b/ca, a/ab, ca/a, abc/c' }: { dominoes?: string } = $props();
  // svelte-ignore state_referenced_locally
  let src = $state(dominoes);
  let seq = $state<number[]>([]);
  let found = $state<string>('');
  const D = $derived(src.split(',').map((s) => s.trim()).filter(Boolean).map((s) => s.split('/') as Domino).filter((d) => d.length === 2));
  const top = $derived(seq.map((i) => D[i]?.[0] ?? '').join(''));
  const bottom = $derived(seq.map((i) => D[i]?.[1] ?? '').join(''));
  const ok = $derived(top.startsWith(bottom) || bottom.startsWith(top));
  function search() {
    const s = solvePCP(D, 10);
    found = s ? `A solution: ${s.map((i) => i + 1).join(', ')}` : 'No solution of length 10 or less (which proves nothing about longer ones).';
    if (s) seq = s;
  }
</script>

<Widget title="Post’s correspondence problem" subtitle="Line up dominoes (repeats allowed) so that the top row and the bottom row spell the same word." onreset={() => ((src = dominoes), (seq = []), (found = ''))}>
  <div class="w-row"><label class="grow">Dominoes (top/bottom) <input class="w-input" bind:value={src} spellcheck="false" /></label></div>
  <div class="w-row">
    {#each D as d, i (i)}
      <button class="domino" onclick={() => (seq = [...seq, i])} aria-label="Add domino {i + 1}"><span>{d[0]}</span><span>{d[1]}</span><small>{i + 1}</small></button>
    {/each}
  </div>
  <div class="rows w-code">
    <div>top:&nbsp;&nbsp;&nbsp; {top}</div>
    <div>bottom: {bottom}</div>
  </div>
  <p class="w-note" class:w-ok={seq.length > 0 && top === bottom} class:w-bad={!ok}>
    {seq.length === 0 ? 'Choose a domino.' : top === bottom ? 'Solved: top and bottom agree.' : ok ? 'So far one row is a prefix of the other.' : 'Dead end: the rows disagree.'}
  </p>
  <div class="w-row">
    <button class="w-btn" onclick={() => (seq = seq.slice(0, -1))} disabled={!seq.length}>Undo</button>
    <button class="w-btn" onclick={search}>Search (length ≤ 10)</button>
    <span class="w-note">{found}</span>
  </div>
</Widget>

<style>
  .domino {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--ink);
    font-family: var(--font-mono);
    padding: 0.2rem 0.6rem;
    cursor: pointer;
    min-width: 3rem;
  }
  .domino span:first-child {
    border-bottom: 1px solid var(--line-strong);
  }
  .domino small {
    color: var(--mute);
    font-size: 0.65rem;
  }
  .rows {
    background: var(--pn);
    padding: 0.4rem 0.6rem;
    border-radius: var(--radius-sm);
    margin: 0.4rem 0;
    white-space: pre;
    overflow-x: auto;
  }
</style>
