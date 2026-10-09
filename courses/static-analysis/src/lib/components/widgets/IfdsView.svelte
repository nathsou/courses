<!--
  The exploded supergraph of an IFDS taint problem: one panel per function, one row per statement, one column per
  fact (Λ, the function's variables, its return value). Each edge is part of a flow function; filled dots are the
  (statement, fact) pairs reachable from the entry with Λ, and a ringed dot is a leak at a sink. A switch compares
  the tabulation algorithm (calls matched with returns) with plain reachability (every return to every caller).
  `:::ifds-view` with a ```js block.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import CodeEditor from '$lib/editor/CodeEditor.svelte';
  import { CfgError } from '$lib/sa/flow/cfg';
  import { buildSupergraph, explodedEdges, solveTaint, usedReturnEdges, ZERO, type ExplodedEdge } from '$lib/sa/interproc/ifds';

  let {
    code,
    n,
    caption,
    title = 'The exploded supergraph',
    subtitle = 'Each dot is a fact before a statement; filled dots are reached from the entry. Toggle the matching of calls with returns.',
  }: { code: string; n?: string; caption?: string; title?: string; subtitle?: string } = $props();

  // svelte-ignore state_referenced_locally
  let source = $state(code);
  let matched = $state(true);
  let picked = $state<[number, number] | null>(null);

  const ROW = 26;
  const COL = 30;
  const LABEL = 150;
  const HEAD = 46;
  const GAP = 46;

  const built = $derived.by(() => {
    try {
      const graph = buildSupergraph(source);
      const result = solveTaint(graph, { contextSensitive: matched });
      const edges = explodedEdges(graph);
      const used = usedReturnEdges(result, { contextSensitive: matched });
      // Layout: panels left to right, entry function first; rows in source order.
      const names = [graph.entry, ...[...graph.fns.keys()].filter((f) => f !== graph.entry)];
      const panels = new Map<string, { x: number; width: number; rows: Map<number, number>; cols: Map<string, number> }>();
      let x = 10;
      let height = 0;
      for (const name of names) {
        const cfg = graph.fns.get(name)!;
        const ordered = [...cfg.nodes].sort((a, b) => (a.kind === 'entry' ? -1 : b.kind === 'entry' ? 1 : a.kind === 'exit' ? 1 : b.kind === 'exit' ? -1 : (a.range?.[0] ?? 0) - (b.range?.[0] ?? 0)));
        const rows = new Map(ordered.map((node, i) => [node.id, i]));
        const facts = graph.facts.get(name)!;
        const cols = new Map(facts.map((f, i) => [f, i]));
        const width = LABEL + facts.length * COL;
        panels.set(name, { x, width, rows, cols });
        x += width + GAP;
        height = Math.max(height, HEAD + ordered.length * ROW + 10);
      }
      return { graph, result, edges, used, names, panels, width: x, height, error: undefined };
    } catch (e) {
      return { error: e instanceof CfgError ? e.message : String(e) };
    }
  });

  const pos = (fn: string, node: number, fact: string) => {
    const p = built.panels!.get(fn)!;
    return { x: p.x + LABEL + p.cols.get(fact)! * COL + COL / 2, y: HEAD + p.rows.get(node)! * ROW + ROW / 2 };
  };
  const isReached = (fn: string, node: number, fact: string) => built.result!.reached.get(fn)!.has(`${node}|${fact}`);
  const live = (e: ExplodedEdge) => {
    if (!isReached(e.from.fn, e.from.node, e.from.fact)) return false;
    if (e.kind === 'return') return built.used!.has(`${e.from.fn}:${e.from.node}:${e.from.fact}>${e.to.fn}:${e.call}`);
    return true;
  };
  const path = (e: ExplodedEdge) => {
    const a = pos(e.from.fn, e.from.node, e.from.fact);
    const b = pos(e.to.fn, e.to.node, e.to.fact);
    if (e.from.fn === e.to.fn && b.y <= a.y) {
      // A back edge within a function: around the right of the panel.
      const p = built.panels!.get(e.from.fn)!;
      const r = p.x + p.width + 10;
      return `M${a.x},${a.y} C${r},${a.y} ${r},${b.y} ${b.x + 5},${b.y}`;
    }
    if (e.from.fn !== e.to.fn) return `M${a.x},${a.y} C${(a.x + b.x) / 2},${a.y} ${(a.x + b.x) / 2},${b.y} ${b.x},${b.y}`;
    return `M${a.x},${a.y} L${b.x},${b.y - 5}`;
  };
  const leakKeys = $derived(new Set((built.result?.leaks ?? []).map((l) => `${l.fn}:${l.node}:${l.fact}`)));
  const shortFact = (f: string) => (f.length > 6 ? `${f.slice(0, 5)}…` : f);
  const shortText = (t: string) => (t.length > 22 ? `${t.slice(0, 21)}…` : t);
</script>

<Widget {title} {subtitle} {n} {caption} onreset={() => { source = code; matched = true; picked = null; }}>
  <div class="iv">
    <CodeEditor value={source} lang="js" minLines={8} label="Module" onchange={(c) => { source = c; picked = null; }} highlight={picked ? { from: picked[0], to: picked[1] } : null} />
    <div class="ui">
      <label class="toggle"><input type="checkbox" bind:checked={matched} /> match each return with its call (IFDS tabulation)</label>
      {#if built.error}
        <p class="err">{built.error}</p>
      {:else if built.result && built.graph && built.panels}
        <div class="leaks" aria-live="polite">
          {#if built.result.leaks.length === 0}
            <p class="ok">No tainted value reaches a sink.</p>
          {:else}
            {#each built.result.leaks as l (`${l.fn}:${l.node}:${l.sink}`)}
              <p class="leak"><button class="link" onclick={() => (picked = l.range ?? null)}>⚠ <code>{built.graph.fns.get(l.fn)!.nodes[l.node]!.text}</code></button> in <code>{l.fn}</code>: tainted <code>{l.fact === ZERO ? 'source' : l.fact}</code> reaches <code>{l.sink}</code></p>
            {/each}
          {/if}
          <p class="note">{built.result.work} edges processed{matched ? `, ${[...built.result.summaries.values()].reduce((n, m) => n + [...m.values()].reduce((k, s) => k + s.size, 0), 0)} summary edges` : ''}.</p>
        </div>
        <div class="scroll">
          <svg viewBox="0 0 {built.width} {built.height}" width={built.width} height={built.height} role="img" aria-label="Exploded supergraph">
            <defs>
              <marker id="ifds-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" class="head" /></marker>
            </defs>
            {#each built.names as fn (fn)}
              {@const p = built.panels.get(fn)!}
              {@const cfg = built.graph.fns.get(fn)!}
              <rect class="panel" x={p.x - 4} y="4" width={p.width + 8} height={built.height - 8} rx="6" />
              <text class="fn" x={p.x + 4} y="20">{fn}</text>
              {#each built.graph.facts.get(fn)! as f (f)}
                <text class="fact" x={p.x + LABEL + p.cols.get(f)! * COL + COL / 2} y={HEAD - 8} text-anchor="middle">{shortFact(f)}<title>{f}</title></text>
              {/each}
              {#each cfg.nodes as node (node.id)}
                <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
                <text class="stmt" x={p.x + 4} y={HEAD + p.rows.get(node.id)! * ROW + ROW / 2 + 4} onclick={() => (picked = node.range ?? null)}>{shortText(node.text)}<title>{node.text}</title></text>
              {/each}
            {/each}
            {#each built.edges as e, i (i)}
              <path d={path(e)} class="edge {e.kind}" class:live={live(e)} marker-end={live(e) ? 'url(#ifds-arrow)' : undefined} />
            {/each}
            {#each built.names as fn (fn)}
              {#each built.graph.fns.get(fn)!.nodes as node (node.id)}
                {#each built.graph.facts.get(fn)! as f (f)}
                  {@const q = pos(fn, node.id, f)}
                  <circle cx={q.x} cy={q.y} r="4.5" class="dot" class:on={isReached(fn, node.id, f)} class:leak={leakKeys.has(`${fn}:${node.id}:${f}`)}><title>{node.text} · {f}{isReached(fn, node.id, f) ? ' (reached)' : ''}</title></circle>
                {/each}
              {/each}
            {/each}
          </svg>
        </div>
        <p class="legend"><span class="sw normal"></span> within a function <span class="sw call"></span> call <span class="sw return"></span> return <span class="sw call-to-return"></span> call to return site</p>
      {/if}
    </div>
  </div>
</Widget>

<style>
  .iv {
    display: grid;
    gap: 0.7rem;
  }
  .iv > :global(*) {
    min-width: 0;
  }
  .toggle {
    font-size: 0.86rem;
  }
  .scroll {
    overflow-x: auto;
    border: 1px solid var(--line);
    border-radius: 6px;
  }
  .panel {
    fill: var(--panel);
    stroke: var(--line);
  }
  .fn {
    font-weight: 600;
    font-size: 12px;
    fill: var(--fg);
  }
  .fact {
    font-family: var(--font-mono, monospace);
    font-size: 10px;
    fill: var(--ink-2);
  }
  .stmt {
    font-family: var(--font-mono, monospace);
    font-size: 10.5px;
    fill: var(--fg);
    cursor: pointer;
  }
  .edge {
    fill: none;
    stroke: var(--line-strong);
    stroke-width: 0.8;
    opacity: 0.35;
  }
  .edge.live {
    opacity: 1;
    stroke-width: 1.4;
    stroke: var(--accent);
  }
  .edge.call.live {
    stroke: var(--ok);
    stroke-dasharray: 5 3;
  }
  .edge.return.live {
    stroke: var(--maybe);
    stroke-dasharray: 5 3;
  }
  .edge.call-to-return {
    stroke-dasharray: 2 2;
  }
  .head {
    fill: var(--ink-2);
  }
  .dot {
    fill: var(--panel);
    stroke: var(--line-strong);
    stroke-width: 1.2;
  }
  .dot.on {
    fill: var(--accent);
    stroke: var(--accent);
  }
  .dot.leak {
    stroke: var(--bad);
    stroke-width: 3;
  }
  .leaks p {
    margin: 0.2rem 0;
    font-size: 0.86rem;
  }
  .leak {
    color: var(--bad);
  }
  .ok {
    color: var(--ok);
  }
  .note,
  .legend {
    color: var(--ink-2);
    font-size: 0.8rem;
  }
  .link {
    font: inherit;
    color: inherit;
    background: none;
    border: 0;
    padding: 0;
    cursor: pointer;
  }
  .sw {
    display: inline-block;
    width: 1.6em;
    height: 0;
    border-top: 2px solid var(--accent);
    vertical-align: middle;
    margin: 0 0.2em 0 0.6em;
  }
  .sw.call {
    border-top: 2px dashed var(--ok);
  }
  .sw.return {
    border-top: 2px dashed var(--maybe);
  }
  .sw.call-to-return {
    border-top: 2px dotted var(--accent);
  }
  .err {
    color: var(--bad);
  }
</style>
