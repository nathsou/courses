<script lang="ts">
  /** The tree automaton of the ground normal forms of a left-linear system, and the normal forms it accepts. */
  import Widget from '$lib/components/ui/Widget.svelte';
  import { parseProgram } from '$lib/trs/parse';
  import { normalFormAutomaton, accepts, groundTerms } from '$lib/trs/automata';
  import { signature } from '$lib/trs/termination';
  import { show, size, isLinear } from '$lib/trs/term';

  let { rules, depth = 2 }: { rules: string; depth?: number } = $props();
  // svelte-ignore state_referenced_locally
  let src = $state(rules);
  const data = $derived.by(() => {
    const prog = parseProgram(src);
    const err = prog.diagnostics.find((d) => d.severity === 'error');
    if (err) return { error: `line ${err.line}: ${err.message}` };
    if (!prog.rules.every((r) => isLinear(r.lhs))) return { error: 'The construction needs left-linear rules.' };
    const sig = signature(prog.rules);
    if (![...sig.values()].includes(0)) return { error: 'The signature needs a constant.' };
    const A = normalFormAutomaton(prog.rules, sig);
    const nfs = groundTerms(sig, depth).filter((t) => accepts(A, t)).sort((a, b) => size(a) - size(b)).slice(0, 30);
    return { A, nfs };
  });
</script>

<Widget title="The automaton of normal forms" subtitle="States record which proper parts of left-hand sides a term matches; a left-hand side instance has no transition. What is accepted is exactly the ground normal forms." onreset={() => (src = rules)}>
  <textarea class="w-input" rows={Math.min(8, rules.split('\n').length + 1)} bind:value={src} spellcheck="false" aria-label="Rules"></textarea>
  {#if 'error' in data}
    <p class="w-note w-bad">{data.error}</p>
  {:else}
    <p class="w-note">{data.A.states.length} states, {data.A.transitions.length} transitions. States: {data.A.states.join(', ')}</p>
    <details>
      <summary class="w-note">Transitions</summary>
      <ul class="tr">{#each data.A.transitions as t, i (i)}<li class="w-code">{t.symbol}{t.from.length ? `(${t.from.join(', ')})` : ''} → {t.to}</li>{/each}</ul>
    </details>
    <p class="w-note">Smallest accepted terms (all normal forms up to depth {depth}):</p>
    <p class="w-code">{data.nfs.map((t) => show(t)).join(',  ')}</p>
  {/if}
</Widget>

<style>
  .tr {
    max-height: 14rem;
    overflow-y: auto;
    font-size: 0.76rem;
  }
  summary {
    cursor: pointer;
  }
</style>
