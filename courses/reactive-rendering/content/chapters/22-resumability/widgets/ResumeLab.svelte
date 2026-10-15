<!--
  Hydration versus resumability, on the same small page. In both, the server sends the same HTML. In hydration, the
  browser downloads the framework and the whole app, runs every component, and attaches the handlers. In resumability
  it runs nothing: a tiny loader waits, and the first click fetches the one function it needs. The page behind the
  figure is the lab's `resume.ts`; the sizes are illustrative round numbers.
-->
<script lang="ts">
  import { untrack } from 'svelte';
  import Widget from '$lib/components/ui/Widget.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import LensPane from '$lib/components/lens/LensPane.svelte';
  import { Lens } from '$lib/components/lens/lens.svelte';
  import { createDocument, type MElement } from '$lib/rx/dom';
  import { LOADER_BYTES, bind, h, load, qrl, renderResumable, resume, type ResumableApp, type Resumed, type ServerOutput } from '$lib/rx/resume';

  let { n, title = 'Hydrate or resume?', caption, mode: initial = 'resume' }: { n?: string | number; title?: string; caption?: string; mode?: string } = $props();

  const FRAMEWORK = 42 * 1024; // a framework runtime, as hydration needs it
  const kb = (b: number) => (b >= 1024 ? `${(b / 1024).toFixed(1)} KB` : `${b} B`);

  const makeApp = (): ResumableApp => ({
    signals: { count: 3, name: 'Ann', saved: 0 },
    view: () =>
      h(
        'div',
        { class: 'app' },
        h('h3', null, 'Hello ', bind('name') as never),
        h('button', { 'on:click': qrl('increment') }, 'Clicked ', bind('count') as never, ' times'),
        h('button', { 'on:click': qrl('rename') }, 'Rename'),
        h('button', { 'on:click': qrl('save') }, 'Save (', bind('saved') as never, ')'),
      ),
    symbols: {
      increment: { chunk: 'increment.js', bytes: 420, run: (c) => c.set('count', (c.get('count') as number) + 1) },
      rename: { chunk: 'rename.js', bytes: 2150, run: (c) => c.set('name', c.get('name') === 'Ann' ? 'Bob' : 'Ann') },
      save: { chunk: 'save.js', bytes: 5300, run: (c) => c.set('saved', (c.get('saved') as number) + 1) },
    },
  });

  let mode = $state<'hydrate' | 'resume'>(initial === 'hydrate' ? 'hydrate' : 'resume');
  let app: ResumableApp;
  let out = $state.raw<ServerOutput | null>(null);
  let lens = $state.raw<Lens | null>(null);
  let root = $state.raw<MElement | null>(null);
  let r: Resumed;
  let log = $state.raw<{ kind: string; text: string }[]>([]);
  let lines: { kind: string; text: string }[] = [];
  let fetchedChunks = $state<string[]>([]);
  let clicks = $state(0);
  let seen = 0;

  const appBytes = $derived(Object.values(makeApp().symbols).reduce((a, s) => a + s.bytes, 0));
  const note = (kind: string, text: string) => {
    lines.push({ kind, text });
    log = [...lines];
  };

  function reset() {
    lens?.destroy();
    app = makeApp();
    out = renderResumable(app);
    const doc = createDocument();
    root = load(doc, out);
    lens = new Lens(doc);
    r = resume(root, out.stateJson, out.events, app.symbols);
    lines = [];
    seen = 0;
    clicks = 0;
    fetchedChunks = [];
    note('html', `HTML arrives and paints: ${kb(out.sizes.html)}. The page is visible.`);
    if (mode === 'hydrate') {
      note('js', `Download the framework (${kb(FRAMEWORK)}) and the application (${kb(appBytes)}).`);
      note('js', 'Run the root component and every child; build the tree of instances; walk the page and claim each node.');
      note('js', 'Attach 3 event listeners. The page is now interactive.');
    } else {
      note('js', `Download the loader (${kb(LOADER_BYTES)}). It installs one listener for “click” on the page.`);
      note('ok', 'No application code has run. The page is interactive: any click will find its handler.');
    }
    log = [...lines];
  }
  reset();
  $effect(() => {
    mode;
    untrack(reset);
  });

  function afterClick(e: MouseEvent) {
    if (!(e.target as HTMLElement).closest('.page button')) return; // only clicks on the page's own buttons
    clicks++;
    if (mode === 'hydrate') note('run', 'Run the handler (its code is already loaded). The component re-renders, and the DOM is patched.');
    setTimeout(() => void r.idle().then(sync), 0); // after the page's own click handler has run
  }
  function sync() {
    const f = r.fetched;
    if (mode === 'resume') {
      for (let i = seen; i < f.length; i++) {
        note('fetch', `First use of ${f[i]!.chunk}: fetch it (${kb(f[i]!.bytes)})${i === 0 ? ` and parse the state JSON (${kb(out!.sizes.state)}), once` : ''}.`);
        note('run', 'Run the handler. It writes a signal; the nodes bound to that signal are updated. No component is rendered.');
      }
    }
    seen = f.length;
    fetchedChunks = f.map((x) => x.chunk);
  }

  const jsAtLoad = $derived(mode === 'hydrate' ? FRAMEWORK + appBytes : LOADER_BYTES);
  const jsNow = $derived(mode === 'hydrate' ? FRAMEWORK + appBytes : LOADER_BYTES + fetchedChunks.reduce((a, c) => a + (makeApp().symbols[c.replace('.js', '')]?.bytes ?? 0), 0));
</script>

<Widget {title} {n} {caption} kind="Experiment" subtitle="The same page, brought to life two ways. Click the buttons in the page and read the log.">
  {#snippet controls()}
    <Segmented label="Strategy" bind:value={mode} options={[{ value: 'hydrate', label: 'Hydrate' }, { value: 'resume', label: 'Resume' }]} />
  {/snippet}

  <div class="stats ui">
    <div class="stat"><div class="h">JavaScript run before the page responds</div><div class="big">{kb(jsAtLoad)}</div></div>
    <div class="stat"><div class="h">JavaScript downloaded so far</div><div class="big">{kb(jsNow)}</div></div>
    <div class="stat"><div class="h">What the server also sent</div><div class="sub">state: <code>{out?.stateJson}</code></div></div>
  </div>

  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div onclickcapture={afterClick}>
    {#if lens && root}<LensPane {lens} {root} title="The page" note="Click Rename, Save, or the counter. The lens shows the DOM operations." />{/if}
  </div>

  <ol class="log ui" aria-live="polite" aria-label="What the browser did, in order">
    {#each log as e, i (i)}<li class={e.kind}>{e.text}</li>{/each}
  </ol>
  <div class="actions ui"><Button size="sm" variant="ghost" onclick={reset}>Reset</Button></div>
</Widget>

<style>
  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
    gap: 0.6rem;
    margin-bottom: 0.8rem;
  }
  .stat {
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 0.5rem 0.75rem;
    background: var(--panel);
  }
  .h {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--mute);
  }
  .big {
    font-family: var(--font-display);
    font-size: 1.6rem;
    font-weight: 700;
  }
  .sub {
    font-size: 0.76rem;
    overflow-wrap: anywhere;
    margin-top: 0.2rem;
  }
  .log {
    margin: 0.8rem 0 0.3rem;
    padding: 0.5rem 0.6rem 0.5rem 1.8rem;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--panel);
    font-size: 0.82rem;
  }
  .log li { padding-block: 0.1rem; }
  .log li.html { color: var(--signal); }
  .log li.js { color: var(--effect); }
  .log li.fetch { color: var(--flash); font-weight: 600; }
  .log li.ok { color: var(--signal); font-weight: 600; }
  .actions { margin-top: 0.3rem; }
</style>
