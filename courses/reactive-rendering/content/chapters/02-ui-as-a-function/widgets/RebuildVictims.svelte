<!--
  What a full rebuild throws away. The page below has six pieces of state that live in the DOM, not in the program:
  text typed into a box, the caret, focus, an opened <details>, a scroll offset and a running animation. Set some, then re-render the *same* application state two ways and see what survives.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import { createDocument, type MElement } from '$lib/rx/dom';
  import { morph } from '$lib/rx/morph';

  let { n, title = 'What a rebuild throws away', caption }: { n?: string | number; title?: string; caption?: string } = $props();

  const PAGE = `<div class="panel"><input id="q" placeholder="Search…"><details id="more"><summary>More options</summary><p>Hidden content</p></details><ul id="list"><li>one</li><li>two</li><li>three</li><li>four</li><li>five</li></ul><div id="bar" class="bar"></div></div>`;

  interface Item {
    key: string;
    label: string;
    set: (el: (id: string) => MElement) => void;
    read: (el: (id: string) => MElement, doc: ReturnType<typeof createDocument>) => string;
    done: string;
  }
  const ITEMS: Item[] = [
    { key: 'text', label: 'Text typed in the search box', set: (el) => el('q').userInput('reactiv'), read: (el) => JSON.stringify(el('q').value), done: 'typed “reactiv”' },
    { key: 'caret', label: 'Caret position in the box', set: (el) => ((el('q').props.selectionStart = 3), (el('q').props.selectionEnd = 3)), read: (el) => String(el('q').props.selectionStart ?? '—'), done: 'caret after the 3rd letter' },
    { key: 'focus', label: 'Keyboard focus', set: (el) => el('q').focus(), read: (el, doc) => (doc.activeElement === el('q') ? 'in the box' : 'nowhere'), done: 'focused the box' },
    { key: 'open', label: 'A <details> the user opened', set: (el) => (el('more').props.open = true), read: (el) => (el('more').props.open ? 'open' : 'closed'), done: 'opened it' },
    { key: 'scroll', label: 'Scroll position of the list', set: (el) => (el('list').props.scrollTop = 120), read: (el) => `${el('list').props.scrollTop ?? 0} px`, done: 'scrolled to 120 px' },
    { key: 'anim', label: 'A CSS animation in progress', set: (el) => (el('bar').props.animation = 0.6), read: (el) => (el('bar').props.animation === undefined ? 'restarted' : `${Math.round((el('bar').props.animation as number) * 100)}%`), done: 'animation at 60%' },
  ];

  function fresh() {
    const doc = createDocument();
    const root = doc.createElement('div');
    doc.body.appendChild(root);
    root.innerHTML = PAGE;
    return { doc, root, el: (id: string) => root.querySelector(`#${id}`) as MElement };
  }

  let env = $state(fresh());
  let set = $state<Record<string, boolean>>({});
  let how = $state<'rebuild' | 'patch'>('rebuild');
  let report = $state<{ key: string; before: string; after: string; kept: boolean }[] | null>(null);

  function apply(item: Item) {
    item.set(env.el);
    set[item.key] = true;
    report = null;
  }
  function rerender() {
    const before = ITEMS.filter((i) => set[i.key]).map((i) => ({ key: i.key, before: i.read(env.el, env.doc) }));
    if (how === 'rebuild') env.root.innerHTML = PAGE;
    else morph(env.root, PAGE);
    report = before.map((b) => {
      const item = ITEMS.find((i) => i.key === b.key)!;
      const after = item.read(env.el, env.doc);
      return { ...b, after, kept: after === b.before };
    });
  }
  function reset() {
    env = fresh();
    set = {};
    report = null;
  }
  const lost = $derived(report ? report.filter((r) => !r.kept).length : 0);
</script>

<Widget {title} {n} {caption} kind="Experiment" subtitle="Set some state the browser owns, then re-render the same application state." onreset={reset}>
  {#snippet controls()}
    <Segmented
      label="How to re-render"
      bind:value={how}
      options={[
        { value: 'rebuild', label: 'Rebuild (innerHTML)' },
        { value: 'patch', label: 'Patch in place (morph)' },
      ]}
    />
    <Button variant="primary" onclick={rerender} disabled={!Object.keys(set).length}>Re-render the same state</Button>
  {/snippet}
  <div class="grid">
    <div class="col">
      <h5 class="ui">1. Use the page</h5>
      <ul class="acts ui">
        {#each ITEMS as item (item.key)}
          <li>
            <button type="button" class:done={set[item.key]} onclick={() => apply(item)}>{set[item.key] ? '✓' : '＋'} {item.label}</button>
          </li>
        {/each}
      </ul>
    </div>
    <div class="col">
      <h5 class="ui">2. What survived</h5>
      {#if !report}
        <p class="empty ui">Set some state on the left, choose how to re-render, and press the button.</p>
      {:else}
        <table class="res ui">
          <thead><tr><th>State</th><th>Before</th><th>After</th><th></th></tr></thead>
          <tbody>
            {#each report as r (r.key)}
              <tr class:lost={!r.kept}>
                <td>{ITEMS.find((i) => i.key === r.key)!.label}</td>
                <td><code>{r.before}</code></td>
                <td><code>{r.after}</code></td>
                <td class="mark" aria-label={r.kept ? 'kept' : 'lost'}>{r.kept ? '✓ kept' : '✗ lost'}</td>
              </tr>
            {/each}
          </tbody>
        </table>
        <p class="sum ui"><b class:bad={lost > 0}>{lost}</b> of {report.length} lost.</p>
      {/if}
    </div>
  </div>
</Widget>

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
    gap: 1.2rem;
  }
  h5 {
    margin: 0 0 0.5rem !important;
    padding: 0 !important;
    border: 0 !important;
    font-family: var(--font-mono) !important;
    font-size: 0.7rem !important;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--mute);
  }
  h5::before, h5::after { display: none !important; }
  .acts {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }
  .acts button {
    width: 100%;
    text-align: left;
    font: inherit;
    font-size: 0.84rem;
    padding: 0.35rem 0.6rem;
    border: 1px solid var(--line-strong);
    border-radius: 6px;
    background: var(--panel);
    color: var(--fg);
    cursor: pointer;
  }
  .acts button.done {
    border-color: var(--green);
    background: var(--green-soft);
  }
  .res {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.82rem;
  }
  .res th {
    text-align: left;
    font-weight: 600;
    color: var(--mute);
    font-size: 0.72rem;
    padding: 0.2rem 0.4rem;
  }
  .res td {
    padding: 0.3rem 0.4rem;
    border-top: 1px solid var(--line);
    vertical-align: top;
  }
  .res code {
    font-family: var(--font-mono);
    font-size: 0.76rem;
  }
  .lost td {
    background: var(--red-soft);
  }
  .mark {
    white-space: nowrap;
    font-weight: 700;
    color: var(--green);
  }
  .lost .mark {
    color: var(--red);
  }
  .sum {
    font-size: 0.86rem;
  }
  .sum b.bad {
    color: var(--red);
  }
  .empty {
    color: var(--mute);
    font-size: 0.86rem;
  }
</style>
