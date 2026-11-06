<script lang="ts">
  /** Every AC match of a pattern against a term (+ and * are associative and commutative). */
  import Widget from '$lib/components/ui/Widget.svelte';
  import { parseTerm } from '$lib/trs/parse';
  import { acMatch, flatten, unflatten } from '$lib/trs/ac';
  import { show, showSubst, type Subst } from '$lib/trs/term';

  let { pattern = 'x + y', term = 'a + b + c', symbols = '+ *', extend = false }: { pattern?: string; term?: string; symbols?: string; extend?: boolean } = $props();
  // svelte-ignore state_referenced_locally
  let p = $state(pattern);
  // svelte-ignore state_referenced_locally
  let t = $state(term);
  // svelte-ignore state_referenced_locally
  let ext = $state(extend);
  const ac = $derived(new Set(symbols.split(/\s+/).filter(Boolean)));
  const fixity = new Map([['+', { prec: 6, assoc: 'left' as const }], ['*', { prec: 7, assoc: 'left' as const }]]);
  const res = $derived.by(() => {
    try {
      const pp = flatten(parseTerm(p, fixity), ac), tt = flatten(parseTerm(t, fixity), ac);
      const out: { sigma: Subst; rest: string }[] = [];
      for (const m of acMatch(pp, tt, ac, new Map(), ext)) {
        out.push({ sigma: new Map([...m.sigma].map(([k, v]) => [k, unflatten(v, ac)])), rest: m.rest.map((r) => show(unflatten(r, ac), fixity)).join(', ') });
        if (out.length >= 60) break;
      }
      return { out, flat: show(tt) };
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  });
</script>

<Widget title="AC matching" subtitle="Under an AC symbol the arguments form a multiset, so a pattern can match in many ways." onreset={() => ((p = pattern), (t = term), (ext = extend))}>
  <div class="w-row">
    <label class="grow">Pattern <input class="w-input" bind:value={p} spellcheck="false" /></label>
    <label class="grow">Term <input class="w-input" bind:value={t} spellcheck="false" /></label>
    <label><input type="checkbox" bind:checked={ext} /> extension (match part of a sum)</label>
  </div>
  {#if 'error' in res}
    <p class="w-note w-bad">{res.error}</p>
  {:else}
    <p class="w-note">Flattened term: <span class="w-code">{res.flat}</span> · {res.out.length}{res.out.length >= 60 ? '+' : ''} match{res.out.length === 1 ? '' : 'es'}</p>
    <ol class="ms">{#each res.out as m, i (i)}<li class="w-code">{showSubst(m.sigma, fixity)}{#if m.rest} <span class="w-note">left over: {m.rest}</span>{/if}</li>{/each}</ol>
  {/if}
</Widget>

<style>
  .ms {
    margin: 0.3rem 0;
    padding-left: 1.8rem;
    max-height: 16rem;
    overflow-y: auto;
  }
</style>
