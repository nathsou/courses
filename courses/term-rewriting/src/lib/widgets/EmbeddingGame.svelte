<script lang="ts">
  /**
   * Kruskal's game: write a sequence of terms, each of size at most k plus its position, without
   * ever writing a term into which an earlier one embeds. The theorem says you must lose.
   */
  import Widget from '$lib/components/ui/Widget.svelte';
  import { parseTerm } from '$lib/trs/parse';
  import { embeds } from '$lib/trs/orders';
  import { show, size, type Term } from '$lib/trs/term';

  let { k = 2 }: { k?: number } = $props();
  let seq = $state<Term[]>([]);
  let input = $state('');
  let msg = $state('');
  let lost = $state<{ i: number; j: number } | null>(null);
  function add() {
    try {
      const t = parseTerm(input.trim());
      if (t.type === 'var' || /[a-z]/.test(show(t).replace(/[A-Z]/g, ''))) {
        msg = 'Use ground terms only (no variables).';
        return;
      }
      const limit = k + seq.length;
      if (size(t) > limit) {
        msg = `Term ${seq.length + 1} may have at most ${limit} symbols; this one has ${size(t)}.`;
        return;
      }
      const i = seq.findIndex((s) => embeds(t, s));
      seq = [...seq, t];
      input = '';
      if (i >= 0) {
        lost = { i, j: seq.length - 1 };
        msg = `Term ${i + 1}, ${show(seq[i]!)}, embeds into the new term ${show(t)}: delete symbols from the new term and you get it back. You lose.`;
      } else msg = `Fine: no earlier term embeds into ${show(t)}.`;
    } catch (e) {
      msg = e instanceof Error ? e.message : String(e);
    }
  }
</script>

<Widget title="Kruskal’s game" subtitle="Write ground terms over the symbols F (two arguments), G (one) and A (constant). Term n may have at most {k} + n − 1 symbols. Avoid any earlier term embedding into a later one." onreset={() => ((seq = []), (msg = ''), (lost = null), (input = ''))}>
  <div class="w-row">
    <label class="grow">Term {seq.length + 1} <input class="w-input" bind:value={input} disabled={!!lost} placeholder="e.g. F(A, A)" spellcheck="false" onkeydown={(e) => e.key === 'Enter' && add()} /></label>
    <button class="w-btn primary" onclick={add} disabled={!!lost || !input.trim()}>Add</button>
  </div>
  {#if seq.length}
    <ol class="seq">{#each seq as t, i (i)}<li class="w-code" class:hit={lost && (i === lost.i || i === lost.j)}>{show(t)}</li>{/each}</ol>
  {/if}
  {#if msg}<p class="w-note" class:w-bad={!!lost}>{msg}</p>{/if}
</Widget>

<style>
  .seq {
    margin: 0.4rem 0;
    padding-left: 1.8rem;
  }
  .hit {
    color: var(--redex);
    font-weight: 700;
  }
</style>
