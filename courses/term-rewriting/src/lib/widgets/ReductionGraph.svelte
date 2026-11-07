<script lang="ts">
  /** Every way to rewrite a term, drawn as a graph: arrows are single steps, green boxes normal forms. */
  import Widget from '$lib/components/ui/Widget.svelte';
  import GraphView from '$lib/components/term/GraphView.svelte';
  import { parseProgram, parseTerm } from '$lib/trs/parse';
  import { fromProgram, reductionGraph, normalize, type Strategy } from '$lib/trs/rewrite';
  import { show, key, showPos } from '$lib/trs/term';

  let { rules, term, limit = 40, title = 'The reduction graph', strategies = false }: { rules: string; term: string; limit?: number; title?: string; strategies?: boolean } = $props();
  // svelte-ignore state_referenced_locally
  let src = $state(rules);
  // svelte-ignore state_referenced_locally
  let tSrc = $state(term);
  let highlight = $state<Strategy | 'none'>('none');

  const data = $derived.by(() => {
    try {
      const prog = parseProgram(src);
      const err = prog.diagnostics.find((d) => d.severity === 'error');
      if (err) return { error: `line ${err.line}: ${err.message}` };
      const sys = fromProgram(prog);
      const t = parseTerm(tSrc, prog.fixity);
      const g = reductionGraph(sys, t, limit);
      const outdeg = g.nodes.map((_, i) => g.edges.filter((e) => e.from === i).length);
      let path = new Set<string>();
      if (highlight !== 'none') {
        const r = normalize(sys, t, { strategy: highlight, fuel: 60 });
        path = new Set(r.steps.map((s) => `${key(s.before)}→${key(s.after)}`));
      }
      const nfs = g.nodes.filter((_, i) => outdeg[i] === 0 && !(g.truncated && false));
      return {
        nodes: g.nodes.map((n, i) => ({ label: show(n, prog.fixity), cls: outdeg[i] === 0 ? 'nf' : i === 0 ? 'start' : undefined })),
        edges: g.edges.map((e) => ({ from: e.from, to: e.to, label: showPos(e.redex.pos), cls: path.has(`${key(g.nodes[e.from]!)}→${key(g.nodes[e.to]!)}`) ? 'hot' : highlight !== 'none' ? 'dim' : undefined })),
        nfs: nfs.map((n) => show(n, prog.fixity)),
        truncated: g.truncated,
        count: g.nodes.length,
      };
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  });
</script>

<Widget {title} subtitle="Each arrow contracts one redex (labelled with its position). Boxes with no way out are normal forms." onreset={() => ((src = rules), (tSrc = term), (highlight = 'none'))}>
  <textarea class="w-input" rows={Math.min(8, rules.split('\n').length + 1)} bind:value={src} spellcheck="false" aria-label="Rules"></textarea>
  <div class="w-row">
    <label class="grow">Term <input class="w-input" bind:value={tSrc} spellcheck="false" /></label>
    {#if strategies}
      <label>Highlight
        <select class="w-input" bind:value={highlight}>
          <option value="none">nothing</option>
          <option value="innermost">innermost path</option>
          <option value="outermost">outermost path</option>
        </select>
      </label>
    {/if}
  </div>
  {#if 'error' in data}
    <p class="w-note w-bad">{data.error}</p>
  {:else}
    <GraphView nodes={data.nodes} edges={data.edges} title="Reduction graph" />
    <p class="w-note">
      {data.count} term{data.count === 1 ? '' : 's'}{data.truncated ? ` (stopped at ${limit}: the graph is larger, perhaps infinite)` : ''};
      normal form{data.nfs.length === 1 ? '' : 's'}: {data.nfs.length ? data.nfs.join(', ') : 'none reached'}.
    </p>
  {/if}
</Widget>
