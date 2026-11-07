<script lang="ts">
  /** Matching, one comparison at a time: the pattern and the term side by side, the substitution growing. */
  import Widget from '$lib/components/ui/Widget.svelte';
  import TermTree from '$lib/components/term/TermTree.svelte';
  import { parseTerm } from '$lib/trs/parse';
  import { matchTrace } from '$lib/trs/match';
  import { show, showSubst, apply, positions, at, type Term, type Position } from '$lib/trs/term';

  let { pattern = '+(S(x), y)', term = '+(S(0), S(S(0)))' }: { pattern?: string; term?: string } = $props();
  // svelte-ignore state_referenced_locally
  let pSrc = $state(pattern);
  // svelte-ignore state_referenced_locally
  let tSrc = $state(term);
  let k = $state(0);

  const parsed = $derived.by(() => {
    try {
      return { p: parseTerm(pSrc), t: parseTerm(tSrc), error: null };
    } catch (e) {
      return { p: null, t: null, error: e instanceof Error ? e.message : String(e) };
    }
  });
  const trace = $derived(parsed.p && parsed.t ? matchTrace(parsed.p, parsed.t) : null);
  $effect(() => {
    void pSrc;
    void tSrc;
    k = 0;
  });
  /** Find the position of a subterm object inside a term (by identity). */
  function posOf(root: Term, sub: Term): Position | null {
    for (const p of positions(root)) if (at(root, p) === sub) return p;
    return null;
  }
  const cur = $derived(trace && k > 0 ? trace.steps[k - 1] : null);
  const done = $derived(!!trace && k >= trace.steps.length);
</script>

<Widget title="Matching, step by step" subtitle="Walk both trees together. A variable takes whatever subterm it meets; a symbol must meet the same symbol." onreset={() => ((pSrc = pattern), (tSrc = term), (k = 0))}>
  <div class="w-row">
    <label class="grow">Pattern <input class="w-input" bind:value={pSrc} spellcheck="false" /></label>
    <label class="grow">Term <input class="w-input" bind:value={tSrc} spellcheck="false" /></label>
  </div>
  {#if parsed.error}<p class="w-note w-bad">{parsed.error}</p>{/if}
  {#if trace && parsed.p && parsed.t}
    <div class="pair">
      <div><p class="w-note">pattern</p><TermTree term={parsed.p} redex={cur ? posOf(parsed.p, cur.pattern) : null} maxWidth={320} /></div>
      <div><p class="w-note">term</p><TermTree term={parsed.t} redex={cur ? posOf(parsed.t, cur.term) : null} maxWidth={320} /></div>
    </div>
    <div class="w-row">
      <button class="w-btn" onclick={() => (k = 0)} disabled={k === 0}>⏮</button>
      <button class="w-btn" onclick={() => k--} disabled={k === 0}>◀</button>
      <button class="w-btn primary" onclick={() => k++} disabled={done}>Compare ▶</button>
      <button class="w-btn" onclick={() => (k = trace.steps.length)} disabled={done}>⏭</button>
      <span class="w-note">step {k} of {trace.steps.length}</span>
    </div>
    <p class="w-code">{cur ? cur.note : 'Start at the two roots.'}</p>
    <p class="w-code">σ = {showSubst(cur ? cur.sigma : new Map())}</p>
    {#if done}
      {#if trace.sigma}
        <p class="w-ok">Match: {show(parsed.p)} σ = {show(apply(trace.sigma, parsed.p))}, which is the term.</p>
      {:else}<p class="w-bad">No match: the pattern is not an instance-maker for this term.</p>{/if}
    {/if}
  {/if}
</Widget>

<style>
  .pair {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
    gap: 0.5rem 1rem;
    align-items: start;
  }
  p {
    margin: 0.3rem 0;
  }
</style>
