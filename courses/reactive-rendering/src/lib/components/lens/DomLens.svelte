<!--
  The tree view of a MiniDom document with the mutation lens on it: every node an action touched is outlined, its
  label flashes, and a small mark says how (✎ rewritten, + inserted). Pass a Lens; the tree follows it.
-->
<script lang="ts">
  import type { MElement } from '$lib/rx/dom';
  import { snapshot, type Lens, type Snap } from './lens.svelte';

  let { lens, root, compact = false, maxNodes = 120 }: { lens: Lens; root?: MElement; compact?: boolean; maxNodes?: number } = $props();

  const tree = $derived.by(() => {
    lens.version; // re-snapshot when the document changes
    return (root ?? lens.doc.root).children.map((c) => snapshot(c, { n: maxNodes }));
  });
  const added = $derived.by(() => {
    lens.version;
    return lens.added;
  });
  const kinds = $derived.by(() => {
    lens.version;
    const m = new Map<number, Set<string>>();
    for (const op of lens.ops) {
      if (op.kind === 'insert' || op.kind === 'clone') continue;
      (m.get(op.id) ?? m.set(op.id, new Set()).get(op.id)!).add(op.kind);
    }
    return m;
  });
  const touched = (n: Snap) => n.touched > lens.epochClock;
  const mark = (n: Snap) => {
    const k = kinds.get(n.id);
    const bits: string[] = [];
    if (added.has(n.id)) bits.push('+');
    if (k && (k.has('text') || k.has('attr') || k.has('prop'))) bits.push('✎');
    return bits.join(' ');
  };
</script>

{#snippet node(n: Snap)}
  {#if n.kind === 'el'}
    <div class="el" class:touched={touched(n)} class:compact>
      {#key n.touched}
        <div class="hd" class:flash={touched(n)}>
          <span class="tag">&lt;{n.tag}{#each n.attrs.filter(([k]) => k === 'id' || k === 'class') as [k, v] (k)}<span class="at">{k}="{v}"</span>{/each}&gt;</span>
          {#if mark(n)}<span class="mk" aria-label={added.has(n.id) ? 'inserted' : 'rewritten'}>{mark(n)}</span>{/if}
        </div>
      {/key}
      {#if n.children.length}
        <div class="kids">
          {#each n.children as c (c.id)}{@render node(c)}{/each}
        </div>
      {/if}
    </div>
  {:else if n.kind === 'text'}
    {#key n.touched}<div class="tx" class:flash={touched(n)} class:touched={touched(n)}>“{n.text}”{#if mark(n)} <span class="mk">{mark(n)}</span>{/if}</div>{/key}
  {:else}
    <div class="cm">&lt;!-- --&gt;</div>
  {/if}
{/snippet}

<div class="lens" role="tree" aria-label="The document tree; touched nodes are outlined">
  {#each tree as n (n.id)}{@render node(n)}{/each}
  {#if !tree.length}<p class="empty">(empty)</p>{/if}
</div>

<style>
  .lens {
    font-family: var(--font-mono);
    font-size: 0.74rem;
    line-height: 1.5;
    min-width: 0;
    overflow-x: auto;
  }
  .el {
    border-left: 1px solid var(--line-strong);
    margin-left: 0.35rem;
    padding-left: 0.5rem;
    border-radius: 2px;
  }
  .el.touched {
    border-left: 2px solid var(--flash);
  }
  .hd {
    display: inline-flex;
    gap: 0.4rem;
    align-items: baseline;
    padding: 0 0.3rem;
    border-radius: 3px;
    color: var(--ink-2);
  }
  .tag {
    color: var(--code-prop);
    white-space: nowrap;
  }
  .at {
    color: var(--mute);
    margin-left: 0.5ch;
  }
  .tx {
    display: inline-block;
    margin-left: 0.85rem;
    padding: 0 0.3rem;
    border-radius: 3px;
    color: var(--code-string);
    white-space: nowrap;
  }
  .tx.touched {
    outline: 1px solid var(--flash);
  }
  .cm {
    margin-left: 0.85rem;
    color: var(--mute);
    font-size: 0.68rem;
  }
  .mk {
    color: var(--flash);
    font-weight: 700;
  }
  .flash {
    animation: flash 1.4s ease-out;
    background: var(--flash-soft);
  }
  @keyframes flash {
    0% {
      background: var(--flash);
      color: var(--on-accent);
    }
    100% {
      background: var(--flash-soft);
    }
  }
  .empty {
    color: var(--mute);
    margin: 0;
  }
  @media (prefers-reduced-motion: reduce) {
    .flash {
      animation: none;
    }
  }
</style>
