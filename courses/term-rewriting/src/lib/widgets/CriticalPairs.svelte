<script lang="ts">
  /** Each overlap of two left-hand sides: the peak term, the two ways to rewrite it, and whether they join. */
  import Widget from '$lib/components/ui/Widget.svelte';
  import TermTree from '$lib/components/term/TermTree.svelte';
  import { parseProgram, showRule } from '$lib/trs/parse';
  import { criticalPairs, joinPair } from '$lib/trs/confluence';
  import { fromProgram } from '$lib/trs/rewrite';
  import { show, showPos, showSubst } from '$lib/trs/term';

  let { rules }: { rules: string } = $props();
  // svelte-ignore state_referenced_locally
  let src = $state(rules);
  let sel = $state(0);
  const data = $derived.by(() => {
    const prog = parseProgram(src);
    const err = prog.diagnostics.find((d) => d.severity === 'error');
    if (err) return { error: `line ${err.line}: ${err.message}` };
    const cps = criticalPairs(prog.rules);
    const sys = fromProgram(prog);
    return { prog, joins: cps.map((cp) => joinPair(sys, cp)) };
  });
  $effect(() => {
    void src;
    sel = 0;
  });
</script>

<Widget title="Critical pairs" subtitle="Where one left-hand side unifies with a non-variable subterm of another, the most general overlapping term can be rewritten two ways." onreset={() => (src = rules)}>
  <textarea class="w-input" rows={Math.min(10, rules.split('\n').length + 1)} bind:value={src} spellcheck="false" aria-label="Rules"></textarea>
  {#if 'error' in data}
    <p class="w-note w-bad">{data.error}</p>
  {:else if !data.joins.length}
    <p class="w-note w-ok">No overlaps: there are no critical pairs.</p>
  {:else}
    <div class="w-row">
      <label>Pair <select class="w-input" bind:value={sel}>{#each data.joins as j, i (i)}<option value={i}>{i + 1}: rules {j.pair.outer + 1} and {j.pair.inner + 1}{j.joinable ? '' : ' (does not join)'}</option>{/each}</select></label>
      <span class="w-note">{data.joins.filter((j) => j.joinable).length} of {data.joins.length} join</span>
    </div>
    {@const j = data.joins[sel]!}
    {@const R = data.prog.rules}
    <p class="w-note">Rule {j.pair.inner + 1} (<span class="w-code">{showRule(R[j.pair.inner]!, data.prog.fixity)}</span>) overlaps rule {j.pair.outer + 1} (<span class="w-code">{showRule(R[j.pair.outer]!, data.prog.fixity)}</span>) at position {showPos(j.pair.pos)}, with unifier <span class="w-code">{showSubst(j.pair.mgu)}</span>.</p>
    <TermTree term={j.pair.peak} redex={j.pair.pos} marked={[[]]} maxWidth={360} title="The peak" />
    <div class="split">
      <div><p class="w-note">inner rule first</p><p class="w-code">{show(j.pair.left, data.prog.fixity)}</p><p class="w-note">normal form</p><p class="w-code">{show(j.leftNF, data.prog.fixity)}</p></div>
      <div><p class="w-note">outer rule first</p><p class="w-code">{show(j.pair.right, data.prog.fixity)}</p><p class="w-note">normal form</p><p class="w-code">{show(j.rightNF, data.prog.fixity)}</p></div>
    </div>
    <p class:w-ok={j.joinable} class:w-bad={!j.joinable}>{j.joinable ? 'Joinable: both sides reach the same term.' : 'Not joinable: two different normal forms from one term.'}</p>
  {/if}
</Widget>

<style>
  .split {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem 1rem;
  }
  p {
    margin: 0.2rem 0;
  }
</style>
