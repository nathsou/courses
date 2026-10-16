<!--
  The mutation lens on the Notes app: the same three actions applied to the same page, built by different strategies,
  side by side. Each pane has its own MiniDom document. Do the actions, then click the notes and type in the search
  box of each pane to feel what each strategy keeps and what it throws away.

    ::notes-lens{strategies="rebuild,diff,track" title="…" n="0.1"}
-->
<script lang="ts">
  import Widget from '../ui/Widget.svelte';
  import Button from '../ui/Button.svelte';
  import LensPane from './LensPane.svelte';
  import { Lens } from './lens.svelte';
  import { createDocument } from '$lib/rx/dom';
  import { NOTES_STRATEGIES, createNotesApp, type NotesApp, type NotesStrategy } from '$lib/rx/notes';

  let {
    strategies = 'rebuild,diff,track',
    title = 'The mutation lens',
    subtitle,
    caption,
    n,
    showTree = true,
    showLog = true,
  }: { strategies?: string; title?: string; subtitle?: string; caption?: string; n?: string | number; showTree?: boolean; showLog?: boolean } = $props();

  interface Pane {
    id: NotesStrategy;
    label: string;
    lens: Lens;
    app: NotesApp;
    root: import('$lib/rx/dom').MElement;
  }

  function build(): Pane[] {
    return strategies
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((id) => {
        const doc = createDocument();
        const root = doc.createElement('div');
        doc.body.appendChild(root);
        const app = createNotesApp(id as NotesStrategy, doc, root);
        const lens = new Lens(doc);
        return { id: id as NotesStrategy, label: NOTES_STRATEGIES.find((s) => s.id === id)?.label ?? id, lens, app, root };
      });
  }

  let panes = $state(build());
  let actions = $state(0);

  function all(fn: (app: NotesApp) => void) {
    actions++;
    for (const p of panes) p.lens.act(() => fn(p.app));
  }
  function reset() {
    for (const p of panes) p.lens.destroy();
    panes = build();
    actions = 0;
  }
</script>

<Widget {title} {subtitle} {caption} {n} onreset={reset}>
  {#snippet controls()}
    <Button variant="primary" onclick={() => all((a) => a.add())}>Add a note</Button>
    <Button onclick={() => all((a) => a.toggle(1))}>Toggle “Write chapter”</Button>
    <Button onclick={() => all((a) => a.rename(0))}>Rename the first note</Button>
    <span class="hint ui">Then click a note and type in a search box.</span>
  {/snippet}
  <div class="panes" style:--cols={panes.length}>
    {#each panes as p (p.label)}
      <LensPane lens={p.lens} root={p.root} title={p.label} {showTree} {showLog} />
    {/each}
  </div>
</Widget>

<style>
  .panes {
    display: grid;
    gap: 0.8rem;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr));
  }
  .hint {
    font-size: 0.78rem;
    color: var(--mute);
    align-self: center;
  }
</style>
