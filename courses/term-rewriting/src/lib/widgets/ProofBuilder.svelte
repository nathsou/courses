<script lang="ts">
  /** Build an equational proof by hand: replace an instance of one side of an axiom by the other side. */
  import Widget from '$lib/components/ui/Widget.svelte';
  import TermTree from '$lib/components/term/TermTree.svelte';
  import { parseStrict, parseTerm } from '$lib/trs/parse';
  import { match } from '$lib/trs/match';
  import { apply, at, equal, fnPositions, replaceAt, show, showPos, positions, vars, type Position, type Term } from '$lib/trs/term';

  let { axioms, from, to, hint = '' }: { axioms: string; from: string; to: string; hint?: string } = $props();
  const prog = $derived(parseStrict(axioms));
  const goal = $derived(parseTerm(to, prog.fixity));
  // svelte-ignore state_referenced_locally
  let chain = $state<{ term: Term; why?: string }[]>([{ term: parseTerm(from, parseStrict(axioms).fixity) }]);
  let sel = $state<Position | null>(null);
  const cur = $derived(chain.at(-1)!.term);
  const done = $derived(equal(cur, goal));
  /** Moves at the selected position: each axiom in each direction whose left side matches there. */
  const moves = $derived.by(() => {
    if (!sel) return [];
    const sub = at(cur, sel);
    const out: { label: string; result: Term }[] = [];
    prog.equations.forEach((e, i) => {
      for (const [l, r, dir] of [[e.left, e.right, '→'], [e.right, e.left, '←']] as const) {
        const s = match(l, sub);
        if (!s) continue;
        // A direction whose target has variables the source lacks would leave them unbound: skip it.
        if (vars(r).some((x) => !vars(l).includes(x))) continue;
        const res = apply(s, r);
        out.push({ label: `axiom ${i + 1} ${dir}`, result: replaceAt(cur, sel!, res) });
      }
    });
    return out;
  });
  function applyMove(m: { label: string; result: Term }) {
    chain = [...chain, { term: m.result, why: `${m.label} at ${showPos(sel!)}` }];
    sel = null;
  }
</script>

<Widget title="An equational proof, by hand" subtitle="Click a subterm, then choose an axiom to apply there, in either direction. Reach the goal." onreset={() => ((chain = [{ term: parseTerm(from, prog.fixity) }]), (sel = null))}>
  <ol class="ax">{#each prog.equations as e, i (i)}<li class="w-code">{show(e.left, prog.fixity)} = {show(e.right, prog.fixity)}</li>{/each}</ol>
  <p class="w-note">Goal: <span class="w-code">{show(chain[0]!.term, prog.fixity)} = {show(goal, prog.fixity)}</span>{hint ? ` · ${hint}` : ''}</p>
  <TermTree term={cur} redex={sel} clickable={done ? [] : fnPositions(cur).concat(positions(cur).filter((p) => at(cur, p).type === 'var'))} onpick={(p) => (sel = p)} maxWidth={420} />
  {#if sel && !done}
    <div class="w-row">
      {#each moves as m, i (i)}<button class="w-btn" onclick={() => applyMove(m)}>{m.label}: {show(m.result, prog.fixity)}</button>{/each}
      {#if !moves.length}<span class="w-note">No axiom applies at {showPos(sel)}.</span>{/if}
    </div>
  {/if}
  <ol class="chain">
    {#each chain as c, i (i)}<li><span class="w-code">{i ? '= ' : ''}{show(c.term, prog.fixity)}</span>{#if c.why}<span class="w-note"> ({c.why})</span>{/if}</li>{/each}
  </ol>
  <div class="w-row">
    <button class="w-btn" onclick={() => chain.length > 1 && (chain = chain.slice(0, -1))} disabled={chain.length < 2}>Undo</button>
    {#if done}<span class="w-ok">Proved in {chain.length - 1} steps.</span>{/if}
  </div>
</Widget>

<style>
  .ax,
  .chain {
    margin: 0.3rem 0;
    padding-left: 1.8rem;
  }
  .chain {
    list-style: none;
    padding-left: 0.5rem;
  }
</style>
