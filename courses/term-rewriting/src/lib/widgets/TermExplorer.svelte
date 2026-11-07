<script lang="ts">
  /** Type a term, see its tree; click a node for its position and subterm, and replace it. */
  import Widget from '$lib/components/ui/Widget.svelte';
  import TermTree from '$lib/components/term/TermTree.svelte';
  import { parseTerm } from '$lib/trs/parse';
  import { at, positions, replaceAt, show, showPos, size, depth, vars, type Position } from '$lib/trs/term';

  let { initial = 'F(G(x), H(A, y))' }: { initial?: string } = $props();
  // svelte-ignore state_referenced_locally
  let src = $state(initial);
  let sel = $state<Position>([]);
  let repl = $state('K');
  const t = $derived.by(() => {
    try {
      return { t: parseTerm(src), error: null };
    } catch (e) {
      return { t: null, error: e instanceof Error ? e.message : String(e) };
    }
  });
  $effect(() => {
    void src;
    sel = [];
  });
  const replaced = $derived.by(() => {
    if (!t.t) return null;
    try {
      return show(replaceAt(t.t, sel, parseTerm(repl)));
    } catch {
      return null;
    }
  });
</script>

<Widget title="A term is a tree" subtitle="Click any node. Positions are paths from the root: 2.1 means “second argument, then its first argument”; ε is the root." onreset={() => ((src = initial), (sel = []))}>
  <div class="w-row"><label class="grow">Term <input class="w-input" bind:value={src} spellcheck="false" /></label></div>
  {#if t.error}<p class="w-note w-bad">{t.error}</p>{/if}
  {#if t.t}
    {@const all = positions(t.t)}
    <TermTree term={t.t} redex={sel} clickable={all} onpick={(p) => (sel = p)} maxWidth={420} />
    <table class="w-table">
      <tbody>
        <tr><th>Position</th><td class="w-code">{showPos(sel)}</td></tr>
        <tr><th>Subterm t|<sub>p</sub></th><td class="w-code">{show(at(t.t, sel))}</td></tr>
        <tr><th>Replace it by</th><td><input class="w-input" bind:value={repl} spellcheck="false" aria-label="Replacement term" /> <span class="w-code">⇒ {replaced ?? '(not a term)'}</span></td></tr>
        <tr><th>All positions</th><td class="w-code">{all.map(showPos).join(', ')}</td></tr>
        <tr><th>Size, depth, variables</th><td class="w-code">{size(t.t)}, {depth(t.t)}, {'{'}{vars(t.t).join(', ')}{'}'}</td></tr>
      </tbody>
    </table>
  {/if}
</Widget>
