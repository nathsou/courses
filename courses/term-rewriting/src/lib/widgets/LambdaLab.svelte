<script lang="ts">
  /** A λ-term, its translation into S, K and I by bracket abstraction, and the SKI reduction. */
  import Widget from '$lib/components/ui/Widget.svelte';
  import { parseLambda, showLambda, bracketAbstraction, SKI, showCL, toDeBruijn, showDB } from '$lib/trs/lambda';
  import { normalize, system } from '$lib/trs/rewrite';

  let { initial = '(\\f x. f (f x)) G A' }: { initial?: string } = $props();
  // svelte-ignore state_referenced_locally
  let src = $state(initial);
  let strat = $state<'outermost' | 'innermost'>('outermost');
  const res = $derived.by(() => {
    try {
      const e = parseLambda(src);
      const cl = bracketAbstraction(e);
      const r = normalize(system(SKI), cl, { strategy: strat, fuel: 400 });
      return { lam: showLambda(e), db: showDB(toDeBruijn(e)), cl: showCL(cl), steps: r.steps.map((s) => showCL(s.after)), nf: showCL(r.term), normal: r.normal, count: r.count };
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  });
</script>

<Widget title="λ-terms as combinators" subtitle="Type a λ-term (\x. body, application by juxtaposition, capitalised names are constants). Bracket abstraction removes every variable; three first-order rules then do β-reduction's job." onreset={() => (src = initial)}>
  <div class="w-row">
    <label class="grow">λ-term <input class="w-input" bind:value={src} spellcheck="false" /></label>
    <label>Strategy <select class="w-input" bind:value={strat}><option value="outermost">outermost</option><option value="innermost">innermost</option></select></label>
  </div>
  {#if 'error' in res}
    <p class="w-note w-bad">{res.error}</p>
  {:else}
    <table class="w-table">
      <tbody>
        <tr><th>λ-term</th><td class="w-code">{res.lam}</td></tr>
        <tr><th>de Bruijn</th><td class="w-code">{res.db}</td></tr>
        <tr><th>SKI</th><td class="w-code">{res.cl}</td></tr>
        <tr><th>normal form</th><td class="w-code" class:w-bad={!res.normal}>{res.normal ? res.nf : `none within 400 steps (last: ${res.nf.slice(0, 80)}…)`}</td></tr>
      </tbody>
    </table>
    <details>
      <summary class="w-note">The {res.count} SKI steps</summary>
      <ol class="steps">{#each res.steps as s, i (i)}<li class="w-code">{s}</li>{/each}</ol>
    </details>
  {/if}
</Widget>

<style>
  .steps {
    margin: 0.3rem 0;
    padding-left: 2rem;
    max-height: 14rem;
    overflow-y: auto;
    font-size: 0.78rem;
  }
  summary {
    cursor: pointer;
  }
</style>
