<!--
  One strategy under the lens: the page (clickable), the document tree with the last action's touches flashing, and the
  operation counters. The two views sit side by side when there is room.
-->
<script lang="ts">
  import type { MElement } from '$lib/rx/dom';
  import type { Snippet } from 'svelte';
  import DomLens from './DomLens.svelte';
  import OpCounter from './OpCounter.svelte';
  import PagePreview from './PagePreview.svelte';
  import { describe, type Lens } from './lens.svelte';

  let {
    lens,
    root,
    title,
    note,
    showPage = true,
    showTree = true,
    showLog = false,
    glyph,
    extra,
  }: {
    lens: Lens;
    root?: MElement;
    title: string;
    note?: string;
    showPage?: boolean;
    showTree?: boolean;
    showLog?: boolean;
    glyph?: string;
    extra?: Snippet;
  } = $props();

  const log = $derived.by(() => {
    lens.version;
    const ids = new Map<number, string>();
    const walk = (n: import('$lib/rx/dom').MNode) => {
      ids.set(n.id, describe(n));
      if ('children' in n) for (const c of (n as MElement).children) walk(c);
    };
    walk(lens.doc.root);
    return lens.ops.slice(0, 14).map((op) => {
      const who = ids.get(op.id) ?? `node ${op.id}`;
      switch (op.kind) {
        case 'create': return `create ${op.tag}`;
        case 'clone': return `clone ${op.nodes} nodes`;
        case 'html': return `parse ${op.nodes} nodes`;
        case 'insert': return `insert ${who}`;
        case 'remove': return `remove ${who}`;
        case 'attr': return `${op.value === null ? 'remove' : 'set'} ${op.name} on ${who}`;
        case 'prop': return `set .${op.name} on ${who}`;
        case 'text': return `write text of ${who}`;
        case 'listen': return `listen ${op.type} on ${who}`;
        case 'unlisten': return `unlisten ${op.type}`;
      }
    });
  });
</script>

<section class="pane" aria-label={title}>
  <header class="ui">
    {#if glyph}<span class="glyph" aria-hidden="true">{glyph}</span>{/if}
    <h5>{title}</h5>
  </header>
  {#if note}<p class="note ui">{note}</p>{/if}
  <div class="views" class:both={showPage && showTree}>
    {#if showPage}<PagePreview {lens} {root} label="{title}: the page" />{/if}
    {#if showTree}<div class="tree"><DomLens {lens} {root} /></div>{/if}
  </div>
  <div class="foot">
    <OpCounter stats={lens.stats} />
    {#if showLog && log.length}
      <ol class="log ui">
        {#each log as line, i (i)}<li>{line}</li>{/each}
        {#if lens.ops.length > log.length}<li class="more">… and {lens.ops.length - log.length} more</li>{/if}
      </ol>
    {/if}
    {@render extra?.()}
  </div>
</section>

<style>
  .pane {
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--bg);
    padding: 0.7rem 0.8rem 0.8rem;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .glyph {
    font-size: 1.1rem;
    color: var(--flash);
  }
  h5 {
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
    font-family: var(--font-display) !important;
    font-size: 1rem !important;
    font-weight: 600 !important;
    letter-spacing: -0.01em;
  }
  h5::before,
  h5::after {
    display: none !important;
  }
  .note {
    margin: 0;
    font-size: 0.8rem;
    color: var(--mute);
  }
  .views {
    display: grid;
    gap: 0.6rem;
    min-width: 0;
  }
  .views.both {
    grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
  }
  .tree {
    border: 1px dashed var(--line-strong);
    border-radius: 6px;
    padding: 0.5rem 0.4rem;
    background: color-mix(in srgb, var(--pn) 50%, var(--panel));
    max-height: 17rem;
    overflow: auto;
    min-width: 0;
  }
  .foot {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  .log {
    margin: 0;
    padding-left: 1.2rem;
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--mute);
    columns: 2 11rem;
  }
  .log .more {
    list-style: none;
    margin-left: -1.2rem;
  }
</style>
