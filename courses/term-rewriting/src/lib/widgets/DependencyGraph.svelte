<script lang="ts">
  /** Dependency pairs, the estimated dependency graph with its cycles, and the proof steps. */
  import Widget from '$lib/components/ui/Widget.svelte';
  import GraphView from '$lib/components/term/GraphView.svelte';
  import { parseProgram } from '$lib/trs/parse';
  import { dpProve } from '$lib/trs/termination';
  import { show } from '$lib/trs/term';

  let { rules }: { rules: string } = $props();
  // svelte-ignore state_referenced_locally
  let src = $state(rules);
  const data = $derived.by(() => {
    const prog = parseProgram(src);
    const err = prog.diagnostics.find((d) => d.severity === 'error');
    if (err) return { error: `line ${err.line}: ${err.message}` };
    const proof = dpProve(prog.rules);
    const inScc = new Set([...proof.steps.flatMap((s) => s.scc), ...proof.open.flat()]);
    const open = new Set(proof.open.flat());
    return { prog, proof, inScc, open };
  });
</script>

<Widget title="Dependency pairs" subtitle="One pair per recursive call. Only cycles in the graph can make the system loop; each cycle is then removed by a simple argument." onreset={() => (src = rules)}>
  <textarea class="w-input" rows={Math.min(10, rules.split('\n').length + 1)} bind:value={src} spellcheck="false" aria-label="Rules"></textarea>
  {#if 'error' in data}
    <p class="w-note w-bad">{data.error}</p>
  {:else}
    {@const P = data.proof}
    <ol class="pairs">{#each P.pairs as p, i (i)}<li class="w-code">{show(p.lhs, data.prog.fixity)} → {show(p.rhs, data.prog.fixity)}</li>{/each}</ol>
    {#if P.pairs.length}
      <GraphView nodes={P.pairs.map((_, i) => ({ label: `${i + 1}`, cls: data.open.has(i) ? 'bad' : data.inScc.has(i) ? 'hot' : undefined }))} edges={P.graph.flatMap((outs, i) => outs.map((j) => ({ from: i, to: j })))} title="The dependency graph" layout="circle" maxWidth={360} />
    {/if}
    {#each P.steps as s, i (i)}<p class="w-note">Cycle {'{'}{s.scc.map((x) => x + 1).join(', ')}{'}'}: the {s.method} removes pair{s.removed.length > 1 ? 's' : ''} {s.removed.map((x) => x + 1).join(', ')} ({s.detail}).</p>{/each}
    <p class:w-ok={P.ok} class:w-bad={!P.ok}>{P.ok ? 'No cycle is left: the system terminates.' : `Unsolved cycles: ${P.open.map((c) => `{${c.map((x) => x + 1).join(', ')}}`).join(', ')}.`}</p>
  {/if}
</Widget>

<style>
  .pairs {
    margin: 0.4rem 0;
    padding-left: 1.8rem;
  }
</style>
