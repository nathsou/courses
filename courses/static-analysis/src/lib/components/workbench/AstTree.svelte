<!--
  An ESTree as a collapsible outline. Each node shows its type, its label (name, raw literal, operator) and the
  key under which its parent holds it. Clicking a node selects its source range; the node under the editor's
  cursor is highlighted and its ancestors are opened.
-->
<script lang="ts">
  import type { AstNode } from '$lib/sa/runtime/inspect';
  import Self from './AstTree.svelte';

  let {
    node,
    field,
    cursor,
    selected,
    onpick,
    depth = 0,
    openDepth = 2,
  }: {
    node: AstNode;
    field?: string;
    cursor?: number;
    selected?: [number, number] | null;
    onpick: (n: AstNode) => void;
    depth?: number;
    /** Nodes shallower than this start open. */
    openDepth?: number;
  } = $props();

  const contains = $derived(cursor !== undefined && node.range[0] <= cursor && cursor <= node.range[1]);
  const hasKids = $derived(node.children.some((c) => c.nodes.length));
  let open = $state<boolean | undefined>(undefined);
  const isOpen = $derived(open ?? (depth < openDepth || contains));
  /** The deepest node containing the cursor is the "current" one. */
  const current = $derived(contains && !node.children.some((c) => c.nodes.some((n) => cursor! >= n.range[0] && cursor! <= n.range[1])));
  const isSelected = $derived(!!selected && selected[0] === node.range[0] && selected[1] === node.range[1]);
</script>

<li class="node" class:current class:selected={isSelected}>
  <div class="row" style:padding-left="{depth * 0.85}rem">
    {#if hasKids}
      <button class="twist" aria-expanded={isOpen} aria-label={isOpen ? 'Collapse' : 'Expand'} onclick={() => (open = !isOpen)}>{isOpen ? '▾' : '▸'}</button>
    {:else}<span class="twist" aria-hidden="true"></span>{/if}
    <button class="pick" onclick={() => onpick(node)} title="Select {node.type} ({node.range[0]}–{node.range[1]})">
      {#if field}<span class="field">{field}:</span>{/if}
      <span class="type">{node.type}</span>
      {#if node.label}<span class="label">{node.label}</span>{/if}
    </button>
  </div>
  {#if hasKids && isOpen}
    <ul>
      {#each node.children as c (c.key)}
        {#each c.nodes as child, i (i)}
          <Self node={child} field={c.list ? `${c.key}[${i}]` : c.key} {cursor} {selected} {onpick} {openDepth} depth={depth + 1} />
        {/each}
      {/each}
    </ul>
  {/if}
</li>

<style>
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .node {
    margin: 0;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 0.15rem;
    min-height: 1.45rem;
  }
  .twist {
    width: 1.1rem;
    flex: none;
    border: 0;
    background: none;
    color: var(--mute);
    cursor: pointer;
    font-size: 0.75rem;
    padding: 0;
  }
  .pick {
    border: 0;
    background: none;
    cursor: pointer;
    font: inherit;
    color: inherit;
    padding: 0.05rem 0.3rem;
    border-radius: 3px;
    text-align: left;
    white-space: nowrap;
  }
  .pick:hover {
    background: var(--surface-3);
  }
  .current > .row .pick {
    background: var(--amber-soft);
    box-shadow: inset 2px 0 0 var(--amber);
  }
  .selected > .row .pick {
    outline: 1px solid var(--accent);
  }
  .field {
    color: var(--mute);
    margin-right: 0.3rem;
  }
  .type {
    color: var(--code-type);
    font-weight: 600;
  }
  .label {
    color: var(--code-string);
    margin-left: 0.4rem;
    max-width: 14rem;
    overflow: hidden;
    text-overflow: ellipsis;
    display: inline-block;
    vertical-align: bottom;
  }
</style>
