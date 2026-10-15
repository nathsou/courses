<!--
  Server-render a component to a string, drop the HTML into a page, and hydrate it with the client's version of the
  same component. The report lists every place where the two disagree. The lens shows what hydration *did*: it
  should claim every node, create none, and attach the listeners, which is the one thing the HTML cannot carry.
-->
<script lang="ts">
  import { untrack } from 'svelte';
  import Widget from '$lib/components/ui/Widget.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import LensPane from '$lib/components/lens/LensPane.svelte';
  import { Lens } from '$lib/components/lens/lens.svelte';
  import { createDocument, type MElement } from '$lib/rx/dom';
  import { Renderer, h, useEffect, useState, type HydrationReport } from '$lib/rx/vdom';
  import { renderToString } from '$lib/rx/ssr';

  let { n, title = 'Hydration, and what goes wrong', caption, preset: initial = 'ok' }: { n?: string | number; title?: string; caption?: string; preset?: string } = $props();

  /** Where the code is running. The components below may (wrongly) look at it while rendering. */
  let env: 'server' | 'client' = 'server';

  const Counter = () => {
    const [n, setN] = useState(3);
    return h('div', { class: 'counter' }, h('p', null, `Clicked ${n} times`), h('button', { onClick: () => setN(n + 1) }, '+1'));
  };

  const Clock = () => h('p', null, 'It is ', env === 'server' ? '10:00:00' : '10:00:07');
  const Wide = () => h('div', null, h('h2', null, 'Dashboard'), env === 'client' ? h('aside', null, 'Sidebar (wide screens)') : null, h('main', null, 'Content'));
  const Id = () => h('label', { for: env === 'server' ? 'field-k3x9' : 'field-q7m2' }, 'Name ', h('input', { id: env === 'server' ? 'field-k3x9' : 'field-q7m2' }));
  const WideFixed = () => {
    const [wide, setWide] = useState(false); // the first client render must equal the server's
    useEffect(() => {
      if (env === 'client') setWide(true);
    }, []);
    return h('div', null, h('h2', null, 'Dashboard'), wide ? h('aside', null, 'Sidebar (wide screens)') : null, h('main', null, 'Content'));
  };

  const PRESETS: Record<string, { label: string; app: () => ReturnType<typeof h>; note: string }> = {
    ok: { label: 'Matching', app: () => h(Counter), note: 'The client renders what the server rendered. Hydration claims every node and attaches one listener.' },
    clock: { label: 'The time differs', app: () => h(Clock), note: 'A value that depends on *when* the code runs: the server said 10:00:00 and the client says 10:00:07.' },
    wide: { label: 'Browser-only branch', app: () => h(Wide), note: 'The component asks about the window during render. On the server there is no window, so the branch differs.' },
    id: { label: 'Random ids', app: () => h(Id), note: 'An id made from a random number on each side: the attributes differ, and the label points at nothing.' },
    fixed: { label: 'Fixed with an effect', app: () => h(WideFixed), note: 'The browser-only part moves into an effect, which runs after hydration. The first render matches; the sidebar appears one update later.' },
  };

  let which = $state(initial in PRESETS ? initial : 'ok');
  let serverHtml = $state('');
  let report = $state.raw<HydrationReport | null>(null);
  let lens = $state.raw<Lens | null>(null);
  let root = $state.raw<MElement | null>(null);
  let hydrated = $state(false);
  let doc: ReturnType<typeof createDocument>;
  let host: MElement;
  let renderer: Renderer;

  function reset() {
    lens?.destroy();
    const preset = PRESETS[which]!;
    env = 'server';
    serverHtml = renderToString(preset.app());
    doc = createDocument();
    host = doc.createElement('div');
    doc.body.appendChild(host);
    host.innerHTML = serverHtml; // the browser parses the HTML the server sent
    lens = new Lens(doc);
    root = host;
    renderer = new Renderer(doc, { autoFlush: false });
    report = null;
    hydrated = false;
  }
  reset();
  $effect(() => {
    which;
    untrack(reset);
  });

  function hydrate() {
    env = 'client';
    lens!.act(() => {
      report = renderer.hydrate(PRESETS[which]!.app(), host);
      renderer.flush();
    });
    hydrated = true;
  }
</script>

<Widget {title} {n} {caption} kind="Experiment" subtitle="The server sends HTML; the page shows it. Hydration is the browser taking it over.">
  {#snippet controls()}
    <Segmented label="Component" bind:value={which} options={Object.entries(PRESETS).map(([value, p]) => ({ value, label: p.label }))} />
  {/snippet}

  <p class="note ui">{PRESETS[which]!.note}</p>

  <div class="h ui">The HTML the server sent</div>
  <pre class="html"><code>{serverHtml}</code></pre>

  <div class="actions ui">
    <Button variant="primary" size="sm" onclick={hydrate} disabled={hydrated}>Hydrate</Button>
    <Button variant="ghost" size="sm" onclick={reset}>Reset</Button>
    <span class="state" class:live={hydrated}>{hydrated ? 'Interactive: listeners attached' : 'Visible, but dead: no listeners yet'}</span>
  </div>

  {#if report}
    <div class="report ui" class:bad={report.mismatches.length > 0}>
      <b>{report.mismatches.length === 0 ? 'No mismatches.' : `${report.mismatches.length} mismatch${report.mismatches.length === 1 ? '' : 'es'}.`}</b>
      {report.claimed} nodes claimed from the server HTML, {report.created} created on the client.
      {#if report.mismatches.length}
        <ul>
          {#each report.mismatches as m, i (i)}
            <li><span class="kind">{m.kind}</span> at <code>{m.path || 'root'}</code>{#if m.expected} expected <code>{m.expected}</code>{/if}{#if m.found} found <code>{m.found}</code>{/if}</li>
          {/each}
        </ul>
      {/if}
    </div>
  {/if}

  {#if lens && root}<LensPane {lens} {root} title="The page" note={hydrated ? 'What hydration did to the DOM.' : 'Click +1 now: nothing happens, since nothing is listening yet.'} />{/if}
</Widget>

<style>
  .note {
    margin: 0 0 0.7rem;
    font-size: 0.86rem;
    color: var(--ink-2);
  }
  .h {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--mute);
    margin-bottom: 0.25rem;
  }
  .html {
    margin: 0 0 0.7rem;
    padding: 0.5rem 0.7rem;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--panel);
    font-size: 0.78rem;
    overflow-x: auto;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.7rem;
  }
  .state {
    font-size: 0.82rem;
    color: var(--red);
  }
  .state.live {
    color: var(--signal);
  }
  .report {
    border: 1px solid var(--signal);
    border-radius: 8px;
    padding: 0.5rem 0.75rem;
    margin-bottom: 0.8rem;
    font-size: 0.84rem;
    background: var(--signal-soft);
  }
  .report.bad {
    border-color: var(--red);
    background: var(--red-soft);
  }
  .report ul {
    margin: 0.4rem 0 0;
    padding-left: 1.2rem;
  }
  .kind {
    font-weight: 700;
    text-transform: uppercase;
    font-size: 0.7rem;
    letter-spacing: 0.05em;
  }
</style>
