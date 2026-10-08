<!--
  What a rule sees, for the code in an editor: the ESTree, the scopes and their references, the TypeScript type of
  the expression at the cursor, and ESLint's code paths. Recomputed (debounced) when the code changes, by running a
  recording rule with the real Linter in the runner worker.
-->
<script lang="ts">
  import { inspectRemote } from '$lib/sa/runtime/client';
  import type { AstNode, InspectResult } from '$lib/sa/runtime/inspect';
  import AstTree from './AstTree.svelte';
  import CodePathGraph from './CodePathGraph.svelte';

  type Tab = 'tree' | 'scopes' | 'types' | 'paths';
  let {
    code,
    cursor,
    types = true,
    tabs = ['tree', 'scopes', 'types', 'paths'],
    initial = 'tree',
    onpick,
    file = '/inspect/input.ts',
  }: {
    code: string;
    cursor?: number;
    types?: boolean;
    tabs?: Tab[];
    initial?: Tab;
    onpick?: (range: [number, number]) => void;
    file?: string;
  } = $props();

  const uid = $props.id();
  const LABELS: Record<Tab, string> = { tree: 'Tree', scopes: 'Scopes', types: 'Types', paths: 'Code paths' };
  let tab = $state<Tab>(initial);
  let result = $state<InspectResult | null>(null);
  let error = $state<string | null>(null);
  let loading = $state(false);
  let selected = $state<[number, number] | null>(null);
  let pickedSegment = $state<string | null>(null);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let token = 0;

  $effect(() => {
    const src = code;
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const mine = ++token;
      loading = true;
      try {
        const r = await inspectRemote(src, { types, file });
        if (mine !== token) return;
        result = r;
        error = r.parseError ?? null;
      } catch (e) {
        if (mine === token) error = e instanceof Error ? e.message : String(e);
      } finally {
        if (mine === token) loading = false;
      }
    }, result ? 350 : 0);
    return () => clearTimeout(timer);
  });

  function pick(n: AstNode) {
    selected = n.range;
    onpick?.(n.range);
  }

  /** The innermost typed expression at the cursor. */
  const typeAtCursor = $derived.by(() => {
    if (!result || cursor === undefined) return undefined;
    let best: InspectResult['types'][number] | undefined;
    for (const t of result.types) {
      if (t.range[0] <= cursor && cursor <= t.range[1] && (!best || t.range[1] - t.range[0] <= best.range[1] - best.range[0])) best = t;
    }
    return best;
  });

  const pathAtCursor = $derived.by(() => {
    if (!result) return undefined;
    const containing = result.codePaths.filter((p) => cursor !== undefined && p.range[0] <= cursor && cursor <= p.range[1]);
    return containing.sort((a, b) => a.range[1] - a.range[0] - (b.range[1] - b.range[0]))[0] ?? result.codePaths[0];
  });
  let chosenPath = $state<string | null>(null);
  const shownPath = $derived(result?.codePaths.find((p) => p.id === chosenPath) ?? pathAtCursor);

  const slice = (r: [number, number]) => code.slice(r[0], r[1]);
  const lineOf = (offset: number) => code.slice(0, offset).split('\n').length;
</script>

<div class="inspector ui">
  <div class="tabs" role="tablist" aria-label="Inspector views">
    {#each tabs as t (t)}
      <button role="tab" id="{uid}-{t}" aria-selected={tab === t} aria-controls="{uid}-panel" class:on={tab === t} onclick={() => (tab = t)}>{LABELS[t]}</button>
    {/each}
    <span class="status" aria-live="polite">{loading ? 'updating…' : ''}</span>
  </div>
  <div class="panel" id="{uid}-panel" role="tabpanel" aria-labelledby="{uid}-{tab}">
    {#if error}
      <p class="error">{error}</p>
    {/if}
    {#if !result}
      <p class="hint">Loading the parser…</p>
    {:else if tab === 'tree' && result.ast}
      <ul class="tree"><AstTree node={result.ast} {cursor} {selected} onpick={pick} /></ul>
    {:else if tab === 'scopes'}
      {#each result.scopes as s, i (i)}
        <section class="scope" style:margin-left="{s.depth * 0.9}rem">
          <h4><span class="kind">{s.type}</span> scope <button class="link" onclick={() => onpick?.(s.range)}>lines {lineOf(s.range[0])}–{lineOf(s.range[1])}</button></h4>
          {#if s.variables.length}
            <table>
              <thead><tr><th>Variable</th><th>Defined as</th><th>References</th></tr></thead>
              <tbody>
                {#each s.variables as v (v.name)}
                  <tr>
                    <td class="mono">{v.name}</td>
                    <td>{v.defs.join(', ')}</td>
                    <td>
                      {#each v.references as r, k (k)}
                        <button class="ref" class:w={r.write} class:r={r.read} title="{r.write && r.read ? 'read and write' : r.write ? 'write' : 'read'} at line {lineOf(r.range[0])}" onclick={() => onpick?.(r.range)}>{r.write && r.read ? 'rw' : r.write ? 'w' : 'r'}{lineOf(r.range[0])}</button>
                      {/each}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          {:else}
            <p class="hint">No variables declared here.</p>
          {/if}
          {#if s.through.length}<p class="through">Resolved outside: <span class="mono">{s.through.join(', ')}</span></p>{/if}
        </section>
      {/each}
    {:else if tab === 'types'}
      {#if !types}
        <p class="hint">Type information is off for this code.</p>
      {:else if typeAtCursor}
        <p class="type-line"><span class="mono expr">{slice(typeAtCursor.range).length > 60 ? `${slice(typeAtCursor.range).slice(0, 59)}…` : slice(typeAtCursor.range)}</span></p>
        <p class="type-line"><span class="kind">{typeAtCursor.nodeType}</span> has type</p>
        <pre class="type">{typeAtCursor.type}</pre>
        <p class="hint">Move the cursor in the code to see the type TypeScript computes at that point, after narrowing.</p>
      {:else}
        <p class="hint">Put the cursor on an expression to see its type.</p>
      {/if}
    {:else if tab === 'paths'}
      {#if result.codePaths.length > 1}
        <label class="choose">Code path
          <select bind:value={chosenPath}>
            <option value={null}>at the cursor</option>
            {#each result.codePaths as p (p.id)}<option value={p.id}>{p.name} ({p.id})</option>{/each}
          </select>
        </label>
      {/if}
      {#if shownPath}
        <div class="graph-scroll">
          <CodePathGraph path={shownPath} {code} picked={pickedSegment} onpick={(id, r) => { pickedSegment = id; if (r) onpick?.(r); }} />
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
  .inspector {
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-sm);
    background: var(--panel);
    display: flex;
    flex-direction: column;
    min-width: 0;
    font-size: 0.8rem;
  }
  .tabs {
    display: flex;
    gap: 0.1rem;
    border-bottom: 1px solid var(--line);
    background: var(--pn);
    padding: 0.2rem 0.3rem 0;
    align-items: flex-end;
    flex-wrap: wrap;
  }
  .tabs button {
    border: 1px solid transparent;
    border-bottom: 0;
    background: none;
    color: var(--mute);
    font: inherit;
    font-weight: 600;
    padding: 0.25rem 0.6rem;
    border-radius: 4px 4px 0 0;
    cursor: pointer;
  }
  .tabs button.on {
    background: var(--panel);
    color: var(--fg);
    border-color: var(--line);
    margin-bottom: -1px;
  }
  .status {
    margin-left: auto;
    color: var(--mute);
    font-size: 0.72rem;
    padding: 0 0.3rem 0.3rem;
  }
  .panel {
    padding: 0.5rem 0.6rem;
    overflow: auto;
    max-height: 26rem;
    min-height: 10rem;
    font-family: var(--font-mono);
  }
  .tree {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .hint {
    color: var(--mute);
    font-family: var(--font-ui);
  }
  .error {
    color: var(--bad);
    font-family: var(--font-ui);
  }
  .scope h4 {
    margin: 0.5rem 0 0.25rem;
    font-size: 0.78rem;
    font-family: var(--font-ui);
  }
  .kind {
    color: var(--code-type);
    font-weight: 700;
    font-family: var(--font-mono);
  }
  table {
    border-collapse: collapse;
    width: 100%;
    font-size: 0.76rem;
  }
  th,
  td {
    text-align: left;
    padding: 0.15rem 0.35rem;
    border-bottom: 1px solid var(--line);
    vertical-align: top;
  }
  th {
    font-family: var(--font-ui);
    color: var(--mute);
    font-weight: 600;
  }
  .mono {
    font-family: var(--font-mono);
  }
  .ref {
    font: inherit;
    font-size: 0.7rem;
    border: 1px solid var(--line-strong);
    border-radius: 3px;
    padding: 0 0.25rem;
    margin: 0 0.15rem 0.15rem 0;
    background: var(--panel);
    color: var(--fg);
    cursor: pointer;
  }
  .ref.w {
    border-color: var(--accent);
    color: var(--accent-ink);
  }
  .ref.r.w {
    background: var(--accent-soft);
  }
  .link {
    border: 0;
    background: none;
    color: var(--accent-ink);
    text-decoration: underline;
    cursor: pointer;
    font: inherit;
    padding: 0;
  }
  .through {
    color: var(--mute);
    margin: 0.2rem 0;
  }
  .type-line {
    margin: 0.2rem 0;
  }
  .expr {
    background: var(--amber-soft);
    padding: 0 0.2rem;
  }
  pre.type {
    margin: 0.3rem 0 0.6rem;
    padding: 0.4rem 0.5rem;
    background: var(--pn);
    border-radius: 4px;
    white-space: pre-wrap;
    color: var(--code-type);
    font-weight: 600;
  }
  .choose {
    display: flex;
    gap: 0.4rem;
    align-items: center;
    font-family: var(--font-ui);
    margin-bottom: 0.4rem;
  }
  .graph-scroll {
    overflow: auto;
  }
</style>
