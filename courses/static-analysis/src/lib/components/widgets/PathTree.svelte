<!--
  Symbolic execution as a tree: each condition the executor meets splits the paths into those where it holds and
  those where it does not; the solver prunes the impossible ones. Each leaf is a path, with an input that follows
  it; findings (null dereferences, divisions by zero, failed assertions) come with an input that triggers them.
  `:::path-tree{bound="6"}` with a ```js block.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import CodeEditor, { type EditorMark } from '$lib/editor/CodeEditor.svelte';
  import { CfgError } from '$lib/sa/flow/cfg';
  import { execute, SymexError, type PathTree as Tree, type Model } from '$lib/sa/symex/symex';

  let {
    code,
    bound = '4',
    n,
    caption,
    title = 'Path tree',
    subtitle = 'Each leaf is one path through the function, with an input that takes it. Click a node to see it in the code.',
  }: { code: string; bound?: string; n?: string; caption?: string; title?: string; subtitle?: string } = $props();

  // svelte-ignore state_referenced_locally
  let source = $state(code);
  // svelte-ignore state_referenced_locally
  let loopBound = $state(Number(bound) || 4);
  let picked = $state<string | null>(null);

  const result = $derived.by(() => {
    try {
      return { r: execute(source, { loopBound, maxPaths: 48 }) };
    } catch (e) {
      return { error: e instanceof SymexError || e instanceof CfgError ? e.message : String(e) };
    }
  });

  // Layout: leaves get consecutive slots; a branch sits above the middle of its children.
  const W = 150;
  const H = 46;
  const GX = 14;
  const GY = 40;
  type Placed = { id: string; tree: Tree; x: number; y: number; parent?: string; edge?: 'T' | 'F' };
  const layout = $derived.by(() => {
    if (!result.r) return undefined;
    const out: Placed[] = [];
    let slot = 0;
    let depth = 0;
    const place = (t: Tree, d: number, id: string, parent?: string, edge?: 'T' | 'F'): number => {
      depth = Math.max(depth, d);
      if (t.kind !== 'branch') {
        const x = slot++ * (W + GX);
        out.push({ id, tree: t, x, y: d * (H + GY), parent, edge });
        return x;
      }
      const a = place(t.then, d + 1, `${id}T`, id, 'T');
      const b = place(t.else, d + 1, `${id}F`, id, 'F');
      const x = (a + b) / 2;
      out.push({ id, tree: t, x, y: d * (H + GY), parent, edge });
      return x;
    };
    place(result.r.tree, 0, 'r');
    return { nodes: out, width: slot * (W + GX), height: (depth + 1) * (H + GY), byId: new Map(out.map((p) => [p.id, p])) };
  });
  const selected = $derived(picked ? layout?.byId.get(picked) : undefined);
  const range = (t: Tree) => (t.kind === 'branch' || t.kind === 'return' || t.kind === 'throw' || t.kind === 'bound' ? result.r?.cfg.nodes[t.node]?.range : undefined);
  const fmtModel = (m: Model) => Object.entries(m).map(([k, v]) => `${k} = ${v}`).join(', ') || 'any input';
  const marks = $derived<EditorMark[]>(
    (result.r?.findings ?? []).flatMap((f) => {
      const r = result.r!.cfg.nodes[f.node]?.range;
      return r ? [{ from: r[0], to: r[1], kind: 'bad' as const, message: `${f.message}, for example with ${fmtModel(f.model)}` }] : [];
    }),
  );
  const label = (t: Tree): string[] => {
    switch (t.kind) {
      case 'branch':
        return [t.text.length > 22 ? `${t.text.slice(0, 21)}…` : t.text, `line ${t.line}`];
      case 'return':
        return [`return ${t.value.length > 14 ? `${t.value.slice(0, 13)}…` : t.value}`, fmtModel(t.model).slice(0, 22)];
      case 'throw':
        return ['✗ fails', fmtModel(t.model).slice(0, 22)];
      case 'infeasible':
        return ['infeasible', 'no input takes it'];
      case 'bound':
        return ['loop bound', 'not explored further'];
      case 'limit':
        return ['path limit', 'not explored'];
    }
  };
</script>

<Widget {title} {subtitle} {n} {caption} onreset={() => { source = code; loopBound = Number(bound) || 4; picked = null; }}>
  <div class="pt">
    <CodeEditor value={source} lang="js" minLines={8} label="Function" onchange={(c) => { source = c; picked = null; }} {marks} highlight={selected && range(selected.tree) ? { from: range(selected.tree)![0], to: range(selected.tree)![1] } : null} />
    <div class="ui">
      <label class="bound">Unroll loops up to <input type="number" min="1" max="10" bind:value={loopBound} /> times</label>
      {#if result.error}
        <p class="err">{result.error}</p>
      {:else if result.r && layout}
        <p class="stats">{result.r.paths} paths · {result.r.queries} solver queries · largest formula {result.r.maxClauses} clauses · {result.r.conflicts} conflicts</p>
        {#each result.r.findings as f (f.node + f.message)}
          <p class="finding">⚠ line {f.line}: {f.message}, for example with <code>{fmtModel(f.model)}</code></p>
        {:else}
          <p class="ok">No finding on the paths explored.</p>
        {/each}
        <div class="scroll">
          <svg viewBox="-4 -4 {layout.width + 8} {layout.height + 8}" width={layout.width + 8} height={layout.height + 8} role="img" aria-label="Path tree">
            {#each layout.nodes as p (p.id)}
              {#if p.parent}
                {@const q = layout.byId.get(p.parent)!}
                <path class="edge" class:dead={p.tree.kind === 'infeasible'} d="M{q.x + W / 2},{q.y + H} C{q.x + W / 2},{q.y + H + GY / 2} {p.x + W / 2},{p.y - GY / 2} {p.x + W / 2},{p.y}" />
                <text class="tf" x={(q.x + p.x) / 2 + W / 2 + (p.edge === 'T' ? -10 : 4)} y={q.y + H + GY / 2 + 4}>{p.edge === 'T' ? 'true' : 'false'}</text>
              {/if}
            {/each}
            {#each layout.nodes as p (p.id)}
              <g class="node {p.tree.kind}" class:on={picked === p.id} role="button" tabindex="0" aria-label={label(p.tree).join(', ')} onclick={() => (picked = picked === p.id ? null : p.id)} onkeydown={(ev) => (ev.key === 'Enter' || ev.key === ' ') && (picked = p.id)}>
                <rect x={p.x} y={p.y} width={W} height={H} rx={p.tree.kind === 'branch' ? 4 : 14} />
                {#each label(p.tree) as l, i (i)}<text x={p.x + W / 2} y={p.y + 18 + i * 15} text-anchor="middle" class:sub={i > 0}>{l}</text>{/each}
              </g>
            {/each}
          </svg>
        </div>
        {#if selected}
          <div class="detail">
            {#if selected.tree.kind === 'branch'}
              <p>Condition on the inputs: <code>{selected.tree.condition}</code></p>
            {:else if selected.tree.kind === 'return' || selected.tree.kind === 'throw'}
              <p>Path condition: <code>{selected.tree.conditions.join(' ∧ ') || 'true'}</code></p>
              <p>An input that takes this path: <code>{fmtModel(selected.tree.model)}</code>{selected.tree.kind === 'return' ? `, which returns ${selected.tree.value}` : ''}{selected.tree.kind === 'throw' && selected.tree.message ? `: ${selected.tree.message}` : ''}.</p>
            {:else if selected.tree.kind === 'infeasible'}
              <p>The solver proved that no input satisfies the path condition with this branch: the path does not exist.</p>
            {:else}
              <p>The executor stopped here: {selected.tree.kind === 'bound' ? 'the loop ran as many times as allowed' : 'too many paths'}. What lies beyond is not analysed.</p>
            {/if}
          </div>
        {/if}
      {/if}
    </div>
  </div>
</Widget>

<style>
  .pt {
    display: grid;
    gap: 0.6rem;
  }
  .pt > :global(*) {
    min-width: 0;
  }
  .bound {
    font-size: 0.84rem;
  }
  .bound input {
    width: 3.5em;
    font: inherit;
    background: var(--panel);
    color: var(--fg);
    border: 1px solid var(--line-strong);
    border-radius: 4px;
  }
  .stats {
    font-size: 0.8rem;
    color: var(--ink-2);
    margin: 0.4rem 0;
  }
  .finding {
    color: var(--bad);
    font-size: 0.86rem;
    margin: 0.2rem 0;
  }
  .ok {
    color: var(--ok);
    font-size: 0.86rem;
  }
  .scroll {
    overflow-x: auto;
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 6px;
    margin-top: 0.4rem;
  }
  .edge {
    fill: none;
    stroke: var(--line-strong);
    stroke-width: 1.4;
  }
  .edge.dead {
    stroke-dasharray: 3 3;
  }
  .tf {
    font-size: 10px;
    fill: var(--ink-2);
  }
  .node {
    cursor: pointer;
  }
  .node rect {
    fill: var(--panel);
    stroke: var(--line-strong);
    stroke-width: 1.2;
  }
  .node text {
    font-family: var(--font-mono, monospace);
    font-size: 11px;
    fill: var(--fg);
    pointer-events: none;
  }
  .node text.sub {
    font-size: 9.5px;
    fill: var(--ink-2);
  }
  .node.return rect {
    stroke: var(--ok);
  }
  .node.throw rect {
    stroke: var(--bad);
    stroke-width: 2;
  }
  .node.infeasible rect,
  .node.bound rect,
  .node.limit rect {
    stroke-dasharray: 4 3;
    opacity: 0.7;
  }
  .node.on rect {
    fill: color-mix(in srgb, var(--accent) 15%, var(--panel));
  }
  .detail {
    font-size: 0.86rem;
    margin-top: 0.5rem;
  }
  .detail p {
    margin: 0.2rem 0;
  }
  .detail code {
    overflow-wrap: anywhere;
  }
  .err {
    color: var(--bad);
  }
</style>
