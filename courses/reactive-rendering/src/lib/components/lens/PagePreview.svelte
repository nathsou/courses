<!--
  A MiniDom document drawn as real HTML, so it can be clicked and typed into. Events go back into the document
  (MiniDom runs the listeners, and bubbling); a typed value is stored on the MiniDom node, as a browser stores it on
  the real one. If a renderer throws a node away, the real element goes with it, and so does the focus.
-->
<script lang="ts">
  import type { MElement } from '$lib/rx/dom';
  import { snapshot, type Lens, type Snap } from './lens.svelte';

  let { lens, root, label = 'Page preview' }: { lens: Lens; root?: MElement; label?: string } = $props();

  const tree = $derived.by(() => {
    lens.version;
    return (root ?? lens.doc.root).children.map((c) => snapshot(c, { n: 400 }));
  });

  const asEl = (n: Snap) => n.ref as MElement;
  const VOID = new Set(['input', 'br', 'hr', 'img']);
  function onclick(e: MouseEvent, n: Snap) {
    e.stopPropagation();
    asEl(n).click();
  }
  function oninput(e: Event, n: Snap) {
    e.stopPropagation();
    const t = e.target as HTMLInputElement;
    if (n.tag === 'input' && t.type === 'checkbox') {
      asEl(n).props.checked = t.checked;
      asEl(n).fire('change');
    } else asEl(n).userInput(t.value);
  }
  function onfocus(e: FocusEvent, n: Snap) {
    e.stopPropagation();
    asEl(n).focus();
  }
  function onblur(e: FocusEvent, n: Snap) {
    e.stopPropagation();
    asEl(n).blur();
  }
  const attrs = (n: Snap) => Object.fromEntries(n.attrs.filter(([k]) => !k.includes(':') && !k.startsWith('on')));
</script>

{#snippet view(n: Snap)}
  {#if n.kind === 'text'}{n.text}
  {:else if n.kind === 'el'}
    {#if VOID.has(n.tag)}
      <svelte:element this={n.tag} {...attrs(n)} value={n.tag === 'input' ? n.value : undefined} checked={n.checked || undefined} onclick={(e: MouseEvent) => onclick(e, n)} oninput={(e: Event) => oninput(e, n)} onfocus={(e: FocusEvent) => onfocus(e, n)} onblur={(e: FocusEvent) => onblur(e, n)} />
    {:else}
      <svelte:element this={n.tag} {...attrs(n)} onclick={(e: MouseEvent) => onclick(e, n)}>
        {#each n.children as c (c.id)}{@render view(c)}{/each}
      </svelte:element>
    {/if}
  {/if}
{/snippet}

<div class="page" role="group" aria-label={label}>
  {#each tree as n (n.id)}{@render view(n)}{/each}
</div>

<style>
  .page {
    font-family: var(--font-ui);
    font-size: 0.9rem;
    color: var(--fg);
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 0.7rem 0.8rem;
    min-height: 6rem;
    overflow: auto;
  }
  .page :global(input) {
    font: inherit;
    padding: 0.25rem 0.45rem;
    border: 1px solid var(--line-strong);
    border-radius: 5px;
    background: var(--bg);
    color: inherit;
    width: 100%;
    max-width: 14rem;
  }
  .page :global(input:focus-visible) {
    outline: 2px solid var(--focus);
    outline-offset: 1px;
  }
  .page :global(p) {
    margin: 0.5rem 0 0.2rem;
    color: var(--ink-2);
    font-size: 0.82rem;
  }
  .page :global(ul) {
    list-style: none;
    margin: 0.2rem 0 0;
    padding: 0;
  }
  .page :global(li) {
    padding: 0.2rem 0.45rem;
    border-radius: 4px;
    cursor: pointer;
  }
  .page :global(li:hover) {
    background: var(--pn);
  }
  .page :global(button) {
    font: inherit;
    padding: 0.2rem 0.6rem;
    border: 1px solid var(--line-strong);
    border-radius: 5px;
    background: var(--panel);
    color: inherit;
    cursor: pointer;
  }
  .page :global(.danger) {
    background: var(--red-soft);
  }
  .page :global(.big) {
    font-weight: 700;
  }
  .page :global(table) {
    border-collapse: collapse;
    width: 100%;
  }
  .page :global(td) {
    padding: 0.1rem 0.4rem;
    border-bottom: 1px solid var(--line);
  }
</style>
