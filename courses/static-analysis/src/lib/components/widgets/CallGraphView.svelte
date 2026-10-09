<!--
  A module's call graph, built by name, by rapid type analysis, or by following function values. Functions are
  boxes (dashed when unreachable from the module's top-level code and exports); below, every call site with its
  targets. `:::call-graph-view{algorithms="names,rta,flow"}` with a ```js block.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import CodeEditor from '$lib/editor/CodeEditor.svelte';
  import CodePathGraph from '$lib/components/workbench/CodePathGraph.svelte';
  import type { CodePathInfo } from '$lib/sa/runtime/inspect';
  import { buildCallGraph, CallGraphError, type Algorithm, type CallGraph } from '$lib/sa/interproc/callgraph';

  let {
    code,
    algorithms = 'names,rta,flow',
    initial,
    n,
    caption,
    title = 'Call graph',
    subtitle = 'Switch algorithms to compare the edges they find. Click a function or a call to find it in the code.',
  }: { code: string; algorithms?: string; initial?: string; n?: string; caption?: string; title?: string; subtitle?: string } = $props();

  const NAMES: Record<Algorithm, string> = { names: 'By name', rta: 'Rapid type analysis', flow: 'Function-value flow' };
  const choices = $derived(algorithms.split(',').map((s) => s.trim()).filter((a): a is Algorithm => a in NAMES));
  // svelte-ignore state_referenced_locally
  let algorithm = $state<Algorithm>((initial as Algorithm) ?? (algorithms.split(',')[0]!.trim() as Algorithm));
  // svelte-ignore state_referenced_locally
  let source = $state(code);
  let picked = $state<{ range: [number, number]; id: string } | null>(null);

  const built = $derived.by((): { graph?: CallGraph; error?: string } => {
    try {
      return { graph: buildCallGraph(source, algorithm) };
    } catch (e) {
      return { error: e instanceof CallGraphError ? e.message : String(e) };
    }
  });

  const path = $derived.by((): CodePathInfo | undefined => {
    const g = built.graph;
    if (!g) return undefined;
    const next = new Map<number, Set<number>>();
    for (const e of g.edges) {
      const from = g.sites[e.site]!.caller;
      next.set(from, (next.get(from) ?? new Set()).add(e.target));
    }
    const prev = new Map<number, number[]>();
    for (const [a, bs] of next) for (const b of bs) prev.set(b, [...(prev.get(b) ?? []), a]);
    // Back edges (recursion) by depth-first search from the roots.
    const loops: [string, string][] = [];
    const state = new Map<number, 'open' | 'done'>();
    const dfs = (f: number) => {
      state.set(f, 'open');
      for (const t of next.get(f) ?? []) {
        if (state.get(t) === 'open') loops.push([`f${f}`, `f${t}`]);
        else if (!state.has(t)) dfs(t);
      }
      state.set(f, 'done');
    };
    for (const r of g.roots) if (!state.has(r)) dfs(r);
    for (const f of g.fns) if (!state.has(f.id)) dfs(f.id);
    return {
      id: 'callgraph',
      name: 'module',
      range: [0, source.length],
      initial: 'f0',
      final: [],
      returned: [],
      thrown: [],
      loops,
      segments: g.fns.map((f) => ({ id: `f${f.id}`, reachable: g.reachable.has(f.id), next: [...(next.get(f.id) ?? [])].map((t) => `f${t}`), prev: (prev.get(f.id) ?? []).map((t) => `f${t}`), nodes: [] })),
    };
  });
  const labels = $derived(built.graph ? Object.fromEntries(built.graph.fns.map((f) => [`f${f.id}`, [f.name, f.kind === 'module' ? 'top-level code' : `line ${f.line}${built.graph!.roots.includes(f.id) && f.id !== 0 ? ', exported' : ''}`]])) : {});
  const facts = $derived(built.graph ? Object.fromEntries(built.graph.fns.filter((f) => !built.graph!.reachable.has(f.id)).map((f) => [`f${f.id}`, 'unreachable'])) : {});

  const sites = $derived.by(() => {
    const g = built.graph;
    if (!g) return [];
    return g.sites.map((s) => ({
      ...s,
      reachable: g.reachable.has(s.caller),
      targets: g.edges.filter((e) => e.site === s.id).map((e) => g.fns[e.target]!.name + (e.via ? ` (called by ${e.via})` : '')),
    }));
  });
  const summary = $derived.by(() => {
    const g = built.graph;
    if (!g) return '';
    const functions = g.fns.length - 1;
    const reachable = g.reachable.size - 1;
    const unresolved = sites.filter((s) => s.targets.length === 0).length;
    return `${functions} functions, ${reachable} reachable · ${g.sites.length} call sites, ${unresolved} without a target in this module · ${g.edges.length} edges`;
  });
</script>

<Widget {title} {subtitle} {n} {caption} onreset={() => { source = code; picked = null; algorithm = (initial as Algorithm) ?? choices[0]!; }}>
  <div class="cg">
    <CodeEditor value={source} lang="js" minLines={8} label="Module" onchange={(c) => { source = c; picked = null; }} highlight={picked ? { from: picked.range[0], to: picked.range[1] } : null} />
    <div class="ui">
      {#if choices.length > 1}
        <div class="tabs" role="tablist" aria-label="Algorithm">
          {#each choices as a (a)}<button role="tab" aria-selected={a === algorithm} class:on={a === algorithm} onclick={() => (algorithm = a)}>{NAMES[a]}</button>{/each}
        </div>
      {/if}
      {#if built.error}
        <p class="err">{built.error}</p>
      {:else if path && built.graph}
        <p class="summary">{summary}</p>
        <div class="graph">
          <CodePathGraph {path} code={source} {labels} {facts} picked={picked?.id ?? null} onpick={(id) => { const f = built.graph!.fns[Number(id.slice(1))]!; picked = { range: f.range, id }; }} />
        </div>
        <table>
          <thead><tr><th scope="col">Line</th><th scope="col">Call</th><th scope="col">Targets</th></tr></thead>
          <tbody>
            {#each sites as s (s.id)}
              <tr class:dim={!s.reachable} class:on={picked?.id === `s${s.id}`} onclick={() => (picked = { range: s.range, id: `s${s.id}` })}>
                <td>{s.line}</td>
                <td><button class="link" onclick={(ev) => { ev.stopPropagation(); picked = { range: s.range, id: `s${s.id}` }; }}><code>{s.text}</code></button></td>
                <td>{#if s.targets.length}{#each s.targets as t, i (i)}{i ? ', ' : ''}<code>{t}</code>{/each}{:else}<span class="none">none in this module</span>{/if}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </div>
  </div>
</Widget>

<style>
  .cg {
    display: grid;
    gap: 0.7rem;
  }
  .cg > :global(*) {
    min-width: 0;
  }
  .tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }
  .tabs button {
    font: inherit;
    font-size: 0.8rem;
    border: 1px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
    border-radius: 999px;
    padding: 0.15rem 0.7rem;
    cursor: pointer;
  }
  .tabs button.on {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--accent-fg, #fff);
  }
  .summary {
    font-size: 0.84rem;
    color: var(--ink-2);
    margin: 0.5rem 0;
  }
  .graph {
    overflow-x: auto;
    border: 1px solid var(--line);
    border-radius: 6px;
    background: var(--panel-2, var(--panel));
  }
  table {
    border-collapse: collapse;
    width: 100%;
    font-size: 0.84rem;
    margin-top: 0.6rem;
  }
  th,
  td {
    text-align: left;
    padding: 0.25rem 0.4rem;
    border-bottom: 1px solid var(--line);
    vertical-align: top;
  }
  th {
    text-transform: none;
    letter-spacing: normal;
    font-weight: 600;
  }
  tr {
    cursor: pointer;
  }
  tr.dim td {
    opacity: 0.55;
  }
  tr.on td {
    background: color-mix(in srgb, var(--accent) 12%, transparent);
  }
  .link {
    font: inherit;
    background: none;
    border: 0;
    padding: 0;
    cursor: pointer;
    color: inherit;
    text-align: left;
  }
  .none {
    color: var(--ink-2);
    font-style: italic;
  }
  .err {
    color: var(--bad);
  }
</style>
