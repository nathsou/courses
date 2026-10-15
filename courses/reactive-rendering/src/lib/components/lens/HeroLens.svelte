<!--
  The home page's lens: the Notes app rebuilt from a string and updated by signals, side by side. One button.
-->
<script lang="ts">
  import LensPane from './LensPane.svelte';
  import { Lens } from './lens.svelte';
  import { createDocument } from '$lib/rx/dom';
  import { createNotesApp, type NotesApp, type NotesStrategy } from '$lib/rx/notes';

  function make(id: NotesStrategy, label: string) {
    const doc = createDocument();
    const root = doc.createElement('div');
    doc.body.appendChild(root);
    const app: NotesApp = createNotesApp(id, doc, root);
    return { id, label, doc, root, app, lens: new Lens(doc) };
  }
  let panes = $state([make('rebuild', 'Rebuild everything'), make('track', 'Track dependencies')]);
  let count = $state(0);
  function rename() {
    for (const p of panes) p.lens.act(() => p.app.rename(count % p.app.notes.length));
    count++;
  }
</script>

<div class="hero ui">
  <div class="top">
    <button type="button" class="go" onclick={rename}>Rename a note</button>
    <span class="hint">same action, same page, two strategies. Try typing in the search boxes first.</span>
  </div>
  <div class="two">
    {#each panes as p (p.id)}
      <LensPane lens={p.lens} root={p.root} title={p.label} showTree={false} />
    {/each}
  </div>
</div>

<style>
  .hero {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    padding: 0.8rem;
    border: 1px solid var(--line-strong);
    border-radius: 10px;
    background: var(--panel);
    box-shadow: var(--shadow-lg);
  }
  .top {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 0.8rem;
  }
  .go {
    font: inherit;
    font-weight: 600;
    font-size: 0.86rem;
    padding: 0.35rem 0.85rem;
    border-radius: 7px;
    border: 1px solid var(--flash);
    background: var(--flash-soft);
    color: var(--fg);
    cursor: pointer;
  }
  .go:hover {
    background: var(--flash);
    color: var(--on-accent);
  }
  .hint {
    font-size: 0.76rem;
    color: var(--mute);
  }
  .two {
    display: grid;
    gap: 0.6rem;
  }
</style>
