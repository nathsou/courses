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
  /** Keep a real control in step with its MiniDom node: the user's own typing and ticking change the real control first. */
  function sync(node: HTMLInputElement, n: Snap) {
    const apply = (n: Snap) => {
      if (node.type === 'checkbox' || node.type === 'radio') {
        if (node.checked !== n.checked) node.checked = n.checked;
      } else if (node.value !== n.value) node.value = n.value;
    };
    apply(n);
    return { update: apply };
  }
  const inputState = (n: Snap): Record<string, unknown> => (n.tag === 'input' ? { value: n.value, checked: n.checked } : {});
  const attrs = (n: Snap) => Object.fromEntries(n.attrs.filter(([k]) => !k.includes(':') && !k.startsWith('on')));
</script>

{#snippet view(n: Snap)}
  {#if n.kind === 'text'}{n.text}
  {:else if n.kind === 'el'}
    {#if VOID.has(n.tag)}
      <svelte:element this={n.tag} {...attrs(n)} {...inputState(n)} onclick={(e: MouseEvent) => onclick(e, n)} oninput={(e: Event) => oninput(e, n)} onfocus={(e: FocusEvent) => onfocus(e, n)} onblur={(e: FocusEvent) => onblur(e, n)} use:sync={n} />
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
  /* The article's heading styles must not leak into the page being previewed. */
  .page :global(h1),
  .page :global(h2),
  .page :global(h3) {
    font-family: var(--font-ui);
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: 0;
    margin: 0 0 0.3rem;
    padding: 0;
    border: 0;
  }
  .page :global(h1)::before,
  .page :global(h2)::before,
  .page :global(h3)::before,
  .page :global(h1)::after,
  .page :global(h2)::after,
  .page :global(h3)::after {
    content: none;
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
