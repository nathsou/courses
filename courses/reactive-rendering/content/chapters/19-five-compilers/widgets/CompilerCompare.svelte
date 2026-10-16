<!--
  The same counter, as written for each framework and as each framework's compiler writes it. The files are the real
  compiler outputs captured for this course (see docs/captured/README.md for the versions). Below the code: what the
  compiler decided before the page ran, and what runs on a click.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import CodeEditor from '$lib/exercise/CodeEditor.svelte';
  import type { CodeLang } from '$lib/code/highlight';

  let { n, title = 'One counter, eight outputs', caption, which: initial = 'react' }: { n?: string | number; title?: string; caption?: string; which?: string } = $props();

  const files = import.meta.glob(['../../../../docs/captured/*', '!../../../../docs/captured/*.server.js', '!../../../../docs/captured/*.md'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
  const file = (name: string) => files[`../../../../docs/captured/${name}`] ?? '';

  interface Tab {
    id: string;
    label: string;
    version: string;
    source: string;
    sourceLabel: string;
    out: string;
    outLabel: string;
    sourceLang: CodeLang;
    /** What was decided before the page ran. */
    decided: string;
    /** What runs when the button is clicked. */
    onClick: string;
    /** How the framework learns that `count` changed. */
    learns: string;
  }

  const TABS: Tab[] = [
    {
      id: 'react',
      label: 'React',
      version: 'Babel, automatic JSX runtime',
      source: 'react.jsx',
      sourceLabel: 'Counter.jsx',
      out: 'react.classic.js',
      outLabel: 'compiled',
      sourceLang: 'jsx',
      decided: 'Almost nothing: JSX becomes nested calls to `jsx()` that build a description each time the function runs.',
      onClick: 'setCount queues a render. The whole function runs again, builds a new tree of descriptions, and React diffs it against the last one.',
      learns: 'It is told by `setCount`, and does not know what changed in the output: it re-runs and compares.',
    },
    {
      id: 'react-compiler',
      label: 'React + Compiler',
      version: 'babel-plugin-react-compiler 1.0.0',
      source: 'react.jsx',
      sourceLabel: 'Counter.jsx (unchanged)',
      out: 'react.compiler.js',
      outLabel: 'compiled',
      sourceLang: 'jsx',
      decided: 'Which values each piece of JSX depends on. It allocates a cache of 9 slots (`_c(9)`) and wraps every element in a check of its inputs.',
      onClick: 'The function still runs. Each `if ($[n] !== count)` finds its inputs unchanged or not: the static `h1` comes from the cache, the paragraph and the button are rebuilt.',
      learns: 'Same as React: re-run. The compiler adds comparisons so that unchanged parts return the *same* objects, and the diff skips them by identity.',
    },
    {
      id: 'solid',
      label: 'Solid',
      version: 'babel-preset-solid 1.9.16',
      source: 'solid.jsx',
      sourceLabel: 'Counter.jsx',
      out: 'solid.dom.js',
      outLabel: 'compiled (DOM)',
      sourceLang: 'jsx',
      decided: 'The static HTML (a cloned template), the walk to each dynamic node, and one effect per hole. Components become setup functions that run once.',
      onClick: 'Only the two effects that read `count` run: one writes the text, one the class. The component function is not called.',
      learns: 'At run time: each `count()` inside an effect subscribes that effect.',
    },
    {
      id: 'vue',
      label: 'Vue',
      version: '@vue/compiler-sfc 3.6.0-rc.11, virtual DOM',
      source: 'Counter.vue',
      sourceLabel: 'Counter.vue',
      out: 'vue.vdom.inline.js',
      outLabel: 'compiled (default mode)',
      sourceLang: 'vue',
      decided: 'Which nodes are static (hoisted or cached), and which fields of each dynamic node can change (`3 /* TEXT, CLASS */`). The block records its dynamic children.',
      onClick: 'The component’s render effect re-runs: it builds vnodes, and the diff walks only the block’s dynamic children, comparing text and class.',
      learns: 'At run time, through a Proxy: reading `count.value` during render subscribes the component.',
    },
    {
      id: 'vapor',
      label: 'Vue Vapor',
      version: '@vue/compiler-sfc 3.6.0-rc.11, vapor: true',
      source: 'Counter.vue',
      sourceLabel: 'Counter.vue (same file)',
      out: 'vue.vapor.inline.js',
      outLabel: 'compiled (Vapor mode)',
      sourceLang: 'vue',
      decided: 'The static HTML, the walk, and one render effect for all the template’s holes. No virtual DOM is created at all.',
      onClick: 'The one `_renderEffect` runs and sets the class and the text; each setter writes only if its value changed.',
      learns: 'At run time: `count.value` inside the effect subscribes it.',
    },
    {
      id: 'svelte',
      label: 'Svelte 5',
      version: 'svelte 5.57.2',
      source: 'Counter.svelte',
      sourceLabel: 'Counter.svelte',
      out: 'svelte.client.js',
      outLabel: 'compiled (client)',
      sourceLang: 'svelte',
      decided: 'That `count` is a signal; that every read of it is `$.get` and every write `$.update`; the static HTML; and one template effect for the holes.',
      onClick: '`$.update(count)` marks the effect, which runs once in a microtask: it calls `$.set_class` and `$.set_text`, which write only on change.',
      learns: 'At run time, with `$.get` subscribing the template effect, but the compiler wrote every one of those calls.',
    },
    {
      id: 'svelte4',
      label: 'Svelte 4',
      version: 'svelte 4.2.19',
      source: 'svelte4.counter.src',
      sourceLabel: 'Counter.svelte (Svelte 4 syntax)',
      out: 'svelte4.counter.js',
      outLabel: 'compiled',
      sourceLang: 'svelte',
      decided: 'Everything: which variables the template reads (as bits), where they are used (`p`), and how to update each (`set_data`, `toggle_class`).',
      onClick: '`$$invalidate(0, count += 1)` sets bit 0. One flush runs `p`, and the bit tests that match fire.',
      learns: 'It is told by the rewritten assignment. There is no tracking and no subscription.',
    },
    {
      id: 'angular',
      label: 'Angular',
      version: '@angular/compiler-cli 22.2.3',
      source: 'angular.counter.component.ts',
      sourceLabel: 'counter.component.ts',
      out: 'angular.counter.component.js',
      outLabel: 'compiled',
      sourceLang: 'ts',
      decided: 'A creation block (build the nodes once) and an update block (the bindings, each of which compares and writes). The component becomes a static definition.',
      onClick: 'The click handler marks the view; the next change-detection tick runs the update block, which re-evaluates both bindings and writes the ones that differ.',
      learns: 'By checking: the update block runs and compares with the last values. (With signals, a read in the template also notifies the view.)',
    },
  ];

  const sourceOverride: Record<string, string> = {
    'svelte4.counter.src': `<script>
  let count = 0;
  $: double = count * 2;
<\/script>

<div class="counter">
  <h1>Counter</h1>
  <p class:big={count > 5}>Count: {count} (double {double})</p>
  <button on:click={() => count += 1}>+1</button>
</div>`,
  };

  /** Tiny inline markup for the static notes: `code` and *emphasis*. */
  const fmt = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*([^*]+)\*/g, '<em>$1</em>');

  let tab = $state(TABS.some((t) => t.id === initial) ? initial : 'react');
  const cur = $derived(TABS.find((t) => t.id === tab)!);
  const src = $derived(sourceOverride[cur.source] ?? file(cur.source));
  const out = $derived(file(cur.out));
  const stats = $derived({ lines: out.trim().split('\n').length, bytes: out.length });
</script>

<Widget {title} {n} {caption} kind="Experiment" subtitle="The same counter, in each framework's own syntax, and what its compiler writes. Real outputs.">
  <div class="tabs ui" role="tablist" aria-label="Framework">
    {#each TABS as t (t.id)}
      <button role="tab" aria-selected={tab === t.id} class:on={tab === t.id} onclick={() => (tab = t.id)}>{t.label}</button>
    {/each}
  </div>
  <p class="ver ui">{cur.version}</p>

  <div class="cols">
    <div class="col">
      <div class="h ui">You write: {cur.sourceLabel}</div>
      {#key cur.id}<CodeEditor value={src} lang={cur.sourceLang} readonly label="Source" minLines={9} maxHeight="22rem" />{/key}
    </div>
    <div class="col">
      <div class="h ui">The compiler writes: {cur.outLabel}</div>
      {#key cur.id}<CodeEditor value={out} lang="ts" readonly label="Compiled output" minLines={9} maxHeight="22rem" />{/key}
    </div>
  </div>

  <dl class="facts ui">
    <div><dt>Decided before the page runs</dt><dd>{@html fmt(cur.decided)}</dd></div>
    <div><dt>When you click the button</dt><dd>{@html fmt(cur.onClick)}</dd></div>
    <div><dt>How it learns <code>count</code> changed</dt><dd>{@html fmt(cur.learns)}</dd></div>
  </dl>
  <p class="meta ui">Output: {stats.lines} lines, {stats.bytes} characters (including import lines).</p>
</Widget>

<style>
  .tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    margin-bottom: 0.3rem;
  }
  .tabs button {
    font: inherit;
    font-size: 0.84rem;
    padding: 0.3rem 0.7rem;
    border: 1px solid var(--line-strong);
    border-radius: 999px;
    background: var(--panel);
    color: var(--fg);
    cursor: pointer;
  }
  .tabs button.on {
    background: var(--flash-soft);
    border-color: var(--flash);
    font-weight: 700;
  }
  .tabs button:focus-visible {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
  }
  .ver {
    margin: 0 0 0.6rem;
    font-size: 0.76rem;
    color: var(--mute);
  }
  .cols {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(19rem, 1fr));
    gap: 0.8rem;
  }
  .col {
    min-width: 0;
  }
  .h {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--mute);
    margin-bottom: 0.3rem;
  }
  .facts {
    margin: 0.9rem 0 0;
    display: grid;
    gap: 0.5rem;
  }
  .facts div {
    border-left: 3px solid var(--flash);
    padding: 0.15rem 0.7rem;
  }
  .facts dt {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--mute);
  }
  .facts dd {
    margin: 0.1rem 0 0;
    font-size: 0.88rem;
  }
  .meta {
    font-size: 0.76rem;
    color: var(--mute);
    margin: 0.7rem 0 0;
  }
</style>
