<!--
  Lit-style templates: no compiler, no virtual DOM. On the first render the library prepares the template and finds
  its parts; after that, rendering is "hand each part its new value", and a part that sees the same value does nothing.
  The counters are the real DOM operations of the lab's `lit.ts`.
-->
<script lang="ts">
  import { untrack } from 'svelte';
  import Widget from '$lib/components/ui/Widget.svelte';
  import Code from '$lib/code/Code.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import LensPane from '$lib/components/lens/LensPane.svelte';
  import { Lens } from '$lib/components/lens/lens.svelte';
  import { createDocument, type MElement } from '$lib/rx/dom';
  import { describeTemplate, html, render, repeat, type TemplateResult } from '$lib/rx/lit';

  let { n, title = 'Parts', caption, preset: initial = 'counter' }: { n?: string | number; title?: string; caption?: string; preset?: string } = $props();

  type Item = { id: number; text: string };
  const NAMES = ['alpha', 'beta', 'gamma', 'delta', 'epsilon'];

  let which = $state<'counter' | 'position' | 'keyed'>(initial === 'position' || initial === 'keyed' ? initial : 'counter');
  let lens = $state.raw<Lens | null>(null);
  let root = $state.raw<MElement | null>(null);
  let count = 0;
  let items: Item[] = [];
  let nextId = 0;
  let rows = $state.raw<{ index: number; kind: string; name?: string; value: string; changed: boolean }[]>([]);
  let templateHtml = $state('');
  let source = $state('');
  let prevValues: unknown[] = [];
  let doc: ReturnType<typeof createDocument>;
  let host: MElement;

  const inc = () => {
    count++;
    renderNow();
  };

  function view(): TemplateResult {
    if (which === 'counter') return html`<p class=${count > 5 ? 'big' : ''}>Count: ${count}</p><button @click=${inc}>+1</button>`;
    if (which === 'position') return html`<ul>${items.map((i) => html`<li>${i.text}</li>`)}</ul>`;
    return html`<ul>${repeat(items, (i) => i.id, (i) => html`<li>${i.text}</li>`)}</ul>`;
  }
  function sourceOf() {
    return which === 'counter'
      ? 'html`<p class=${count > 5 ? \'big\' : \'\'}>Count: ${count}</p>\n      <button @click=${inc}>+1</button>`'
      : which === 'position'
        ? 'html`<ul>${items.map((i) => html`<li>${i.text}</li>`)}</ul>`'
        : 'html`<ul>${repeat(items, (i) => i.id, (i) => html`<li>${i.text}</li>`)}</ul>`';
  }
  function renderNow() {
    const result = view();
    if (which === 'counter') {
      const d = describeTemplate(result.strings as readonly string[]);
      rows = d.parts.map((p) => {
        const v = result.values[p.index];
        return { index: p.index, kind: p.kind, name: p.name, value: typeof v === 'function' ? 'a function' : JSON.stringify(v), changed: !Object.is(prevValues[p.index], v) };
      });
      prevValues = [...result.values];
      templateHtml = d.html;
    }
    render(result, host);
  }

  function reset() {
    lens?.destroy();
    doc = createDocument();
    host = doc.createElement('div');
    doc.body.appendChild(host);
    const l = new Lens(doc);
    count = 0;
    nextId = 3;
    items = NAMES.slice(0, 3).map((text, id) => ({ id, text }));
    prevValues = [];
    source = sourceOf();
    l.act(() => renderNow());
    lens = l;
    root = host;
  }
  reset();
  let first = true;
  $effect(() => {
    which;
    if (first) {
      first = false;
      return;
    }
    untrack(reset);
  });

  const ACTIONS: Record<string, { label: string; run: () => void }[]> = {
    counter: [
      { label: 'count + 1', run: () => count++ },
      { label: 'count = 6', run: () => (count = 6) },
      { label: 'render again, nothing changed', run: () => {} },
    ],
    list: [
      { label: 'Reverse', run: () => (items = [...items].reverse()) },
      { label: 'Add at the front', run: () => (items = [{ id: nextId, text: NAMES[nextId++ % NAMES.length]! }, ...items]) },
      { label: 'Remove the first', run: () => (items = items.slice(1)) },
      { label: 'Rename the first', run: () => (items = items.map((it, i) => (i === 0 ? { ...it, text: it.text + '!' } : it))) },
    ],
  };
  const actions = $derived(which === 'counter' ? ACTIONS.counter! : ACTIONS.list!);
  function act(i: number) {
    lens?.act(() => {
      actions[i]!.run();
      renderNow();
    });
  }
</script>

<Widget {title} {n} {caption} kind="Experiment" subtitle="A template literal tagged with html. Change the data and render again; the lens shows what each part did.">
  {#snippet controls()}
    <Segmented
      label="Template"
      bind:value={which}
      options={[
        { value: 'counter', label: 'Counter' },
        { value: 'position', label: 'List (array)' },
        { value: 'keyed', label: 'List (repeat)' },
      ]}
    />
  {/snippet}

  <Code class="src" lang="js" code={source} />

  <div class="actions ui">
    {#each actions as a, i (a.label)}<Button size="sm" variant="primary" onclick={() => act(i)}>{a.label}</Button>{/each}
    <Button size="sm" variant="ghost" onclick={reset}>Reset</Button>
  </div>

  {#if which === 'counter'}
    <table class="parts ui">
      <caption>The parts found on the first render, and what the last render handed them</caption>
      <thead><tr><th>Hole</th><th>Kind</th><th>Value</th><th>Part did</th></tr></thead>
      <tbody>
        {#each rows as r (r.index)}
          <tr class:changed={r.changed}>
            <td><code>{'${' + r.index + '}'}</code></td>
            <td>{r.kind}{#if r.name}<code class="nm">{r.name}</code>{/if}</td>
            <td><code>{r.value}</code></td>
            <td>{r.changed ? (r.kind === 'event' ? 'bound once' : 'wrote') : 'nothing (same value)'}</td>
          </tr>
        {/each}
      </tbody>
    </table>
    <p class="note ui">The template is prepared <b>once</b>: <code>{templateHtml}</code> is cloned, the parts are found by position, and no later render parses anything.</p>
  {:else}
    <p class="note ui">
      {#if which === 'position'}An array of results is rendered <b>by position</b>: the <i>n</i>th item is handed to the <i>n</i>th part. Reverse the list and every row’s text is rewritten.{:else}<code>repeat</code> keys each row. Reverse the list and the rows <b>move</b>; their text is not rewritten. Rename the first one and only its text changes.{/if}
    </p>
  {/if}

  {#if lens && root}<LensPane {lens} {root} title="The page" note="Each action: the DOM operations it took." />{/if}
</Widget>

<style>
  :global(.src) {
    margin: 0 0 0.7rem;
    padding: 0.6rem 0.8rem;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--panel);
    overflow-x: auto;
    font-size: 0.82rem;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-bottom: 0.7rem;
  }
  .parts {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.82rem;
    margin-bottom: 0.4rem;
  }
  .parts caption {
    text-align: left;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--mute);
    padding-bottom: 0.25rem;
  }
  .parts th,
  .parts td {
    text-align: left;
    padding: 0.25rem 0.5rem;
    border-top: 1px solid var(--line);
  }
  .nm {
    margin-left: 0.4em;
  }
  .parts tr.changed td {
    background: var(--flash-soft);
  }
  .note {
    margin: 0.4rem 0 0.8rem;
    font-size: 0.84rem;
    color: var(--ink-2);
  }
</style>
