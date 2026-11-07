<script lang="ts">
  /** Martelli and Montanari's unification rules, applied one at a time. */
  import Widget from '$lib/components/ui/Widget.svelte';
  import { parseTerm } from '$lib/trs/parse';
  import { unify, type UnifyStep } from '$lib/trs/unify';
  import { show, showSubst, apply, type Term } from '$lib/trs/term';

  let { left = 'F(x, G(y, z))', right = 'F(G(z, A), x)' }: { left?: string; right?: string } = $props();
  // svelte-ignore state_referenced_locally
  let a = $state(left);
  // svelte-ignore state_referenced_locally
  let b = $state(right);
  let k = $state(0);
  const data = $derived.by(() => {
    try {
      const s = parseTerm(a), t = parseTerm(b);
      const trace: UnifyStep[] = [];
      const mgu = unify(s, t, trace);
      return { s, t, trace, mgu };
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  });
  $effect(() => {
    void a;
    void b;
    k = 0;
  });
  const RULE_NOTE: Record<string, string> = { delete: 'Delete', decompose: 'Decompose', orient: 'Orient', eliminate: 'Eliminate', clash: 'Clash (fail)', occurs: 'Occurs check (fail)' };
</script>

<Widget title="Unification, rule by rule" subtitle="A set of equations to solve. Each step applies one of the rules to the first equation." onreset={() => ((a = left), (b = right), (k = 0))}>
  <div class="w-row">
    <label class="grow">s <input class="w-input" bind:value={a} spellcheck="false" /></label>
    <label class="grow">t <input class="w-input" bind:value={b} spellcheck="false" /></label>
  </div>
  {#if 'error' in data}
    <p class="w-note w-bad">{data.error}</p>
  {:else}
    {@const cur = k > 0 ? data.trace[k - 1] : null}
    {@const problem: [Term, Term][] = cur ? cur.problem : [[data.s, data.t]]}
    <div class="w-row">
      <button class="w-btn" onclick={() => (k = 0)} disabled={k === 0}>⏮</button>
      <button class="w-btn" onclick={() => k--} disabled={k === 0}>◀</button>
      <button class="w-btn primary" onclick={() => k++} disabled={k >= data.trace.length}>Apply a rule ▶</button>
      <button class="w-btn" onclick={() => (k = data.trace.length)} disabled={k >= data.trace.length}>⏭</button>
      <span class="w-note">{cur ? `${RULE_NOTE[cur.rule]}: ${cur.note}` : 'The problem: one equation.'}</span>
    </div>
    <div class="cols">
      <div>
        <p class="w-note">To solve</p>
        {#if problem.length}<ul>{#each problem as [x, y], i (i)}<li class="w-code">{show(x)} ≟ {show(y)}</li>{/each}</ul>{:else}<p class="w-code">∅</p>{/if}
      </div>
      <div>
        <p class="w-note">Solved</p>
        <p class="w-code">{showSubst(cur ? cur.solved : new Map())}</p>
      </div>
    </div>
    {#if k >= data.trace.length}
      {#if data.mgu}<p class="w-ok">Most general unifier: {showSubst(data.mgu)}. Both sides become {show(apply(data.mgu, data.s))}.</p>
      {:else}<p class="w-bad">Not unifiable.</p>{/if}
    {/if}
  {/if}
</Widget>

<style>
  .cols {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
    gap: 0.5rem 1rem;
  }
  ul {
    margin: 0;
    padding-left: 1.2rem;
  }
  p {
    margin: 0.3rem 0;
  }
</style>
