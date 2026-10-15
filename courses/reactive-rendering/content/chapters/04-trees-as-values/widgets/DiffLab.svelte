<!--
  The diff lab: write a page "before" and "after" as HTML, mount the first, then patch to the second. The virtual DOM
  compares the two descriptions and the lens shows exactly which DOM operations that took. Compare with replacing the
  page by innerHTML. A `key="…"` attribute becomes the element's key (chapter 5).
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import LensPane from '$lib/components/lens/LensPane.svelte';
  import { Lens } from '$lib/components/lens/lens.svelte';
  import { htmlToVNodes } from '$lib/components/lens/htmlToVNode';
  import { createDocument, type MElement } from '$lib/rx/dom';
  import { Renderer } from '$lib/rx/vdom';

  let { n, title = 'The diff lab', caption, preset: initial = 'text' }: { n?: string | number; title?: string; caption?: string; preset?: string } = $props();

  const PRESETS: Record<string, { label: string; before: string; after: string }> = {
    text: { label: 'Text', before: '<div class="card"><h2>Notes</h2><p>3 notes</p></div>', after: '<div class="card"><h2>Notes</h2><p>4 notes</p></div>' },
    attr: { label: 'Attribute', before: '<button class="btn">Save</button>', after: '<button class="btn primary" disabled>Save</button>' },
    tag: { label: 'Tag changes', before: '<div><p>Hello</p><p>World</p></div>', after: '<div><section>Hello</section><p>World</p></div>' },
    add: { label: 'Add', before: '<ul><li>a</li><li>b</li></ul>', after: '<ul class="x"><li>a</li><li>B</li><li>c</li></ul>' },
    remove: { label: 'Remove', before: '<ul><li>a</li><li>b</li><li>c</li></ul>', after: '<ul><li>a</li></ul>' },
    reorder: { label: 'Reorder', before: '<ul><li>a</li><li>b</li><li>c</li><li>d</li></ul>', after: '<ul><li>d</li><li>a</li><li>b</li><li>c</li></ul>' },
  };

  let which = $state(initial in PRESETS ? initial : 'text');
  let before = $state(PRESETS[which]!.before);
  let after = $state(PRESETS[which]!.after);
  let how = $state<'diff' | 'innerHTML'>('diff');
  let error = $state('');

  function make() {
    const doc = createDocument();
    const root = doc.createElement('div');
    doc.body.appendChild(root);
    const renderer = new Renderer(doc, { autoFlush: false, strategy: 'index' });
    return { doc, root, renderer, lens: new Lens(doc) };
  }
  let env = $state(make());
  let phase = $state<'before' | 'after'>('before');
  let pair = $state<[number, number]>([0, 0]);

  function mount() {
    env.lens.destroy();
    env = make();
    error = '';
    try {
      env.renderer.render(htmlToVNodes(before), env.root);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
    env.lens.begin();
    phase = 'before';
  }
  function patch() {
    error = '';
    env.lens.begin();
    try {
      if (how === 'diff') env.renderer.render(htmlToVNodes(after), env.root);
      else env.root.innerHTML = after;
      phase = 'after';
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
    env.lens.refresh();
  }
  function choose(id: string) {
    which = id;
    before = PRESETS[id]!.before;
    after = PRESETS[id]!.after;
    mount();
  }
  mount();
  void pair;
</script>

<Widget {title} {n} {caption} kind="Experiment" subtitle="Edit the two pages. Mount the first, then patch to the second and read the lens.">
  {#snippet controls()}
    <Segmented label="Preset" bind:value={which} options={Object.entries(PRESETS).map(([value, p]) => ({ value, label: p.label }))} onchange={choose} />
    <Segmented label="Update by" bind:value={how} options={[{ value: 'diff', label: 'Diff the trees' }, { value: 'innerHTML', label: 'innerHTML' }]} onchange={mount} />
  {/snippet}
  <div class="grid">
    <div class="ed">
      <label class="ui"><span>Before</span><textarea bind:value={before} rows="4" spellcheck="false" oninput={mount}></textarea></label>
      <label class="ui"><span>After</span><textarea bind:value={after} rows="4" spellcheck="false" oninput={() => (phase = 'before')}></textarea></label>
      <div class="go ui">
        <Button variant="primary" onclick={patch}>Patch to “After”</Button>
        <Button onclick={mount}>Start over</Button>
        <span class="state">{phase === 'before' ? 'showing “Before”' : 'showing “After”'}</span>
      </div>
      {#if error}<p class="err ui">{error}</p>{/if}
    </div>
    <LensPane lens={env.lens} root={env.root} title={how === 'diff' ? 'Virtual DOM patch' : 'innerHTML'} showPage={false} showLog />
  </div>
</Widget>

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
    gap: 1rem;
  }
  .ed {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    min-width: 0;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    font-size: 0.72rem;
    color: var(--mute);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-family: var(--font-mono);
  }
  textarea {
    font-family: var(--font-mono);
    font-size: 0.78rem;
    padding: 0.5rem 0.6rem;
    border: 1px solid var(--line-strong);
    border-radius: 6px;
    background: var(--bg);
    color: var(--fg);
    resize: vertical;
    text-transform: none;
    letter-spacing: 0;
  }
  .go {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
  }
  .state {
    font-size: 0.76rem;
    color: var(--mute);
  }
  .err {
    color: var(--red);
    font-size: 0.82rem;
    margin: 0;
  }
</style>
