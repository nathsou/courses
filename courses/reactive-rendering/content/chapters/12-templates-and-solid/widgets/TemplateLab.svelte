<!--
  The template compiler, live. Edit a template with {holes}; the compiler writes JavaScript that clones the static
  HTML once and wraps each hole in its own effect. Poke a signal and watch which one DOM node the lens says was
  written. The compiler and the runtime are the lab's `template.ts` over the three-colour signals engine.
-->
<script lang="ts">
  import { untrack } from 'svelte';
  import Widget from '$lib/components/ui/Widget.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import LensPane from '$lib/components/lens/LensPane.svelte';
  import CodeEditor from '$lib/exercise/CodeEditor.svelte';
  import { Lens } from '$lib/components/lens/lens.svelte';
  import { createDocument, type MElement } from '$lib/rx/dom';
  import { compileTemplate, createTemplateRuntime, instantiate, TemplateError, type Compiled } from '$lib/rx/template';
  import { createEngine, type Signal } from '$lib/rx/signals';

  let { n, title = 'The template compiler', caption, preset: initial = 'counter' }: { n?: string | number; title?: string; caption?: string; preset?: string } = $props();

  interface Preset {
    label: string;
    source: string;
    signals: Record<string, unknown>;
    actions: { label: string; run: (s: Record<string, Signal<any>>) => void }[];
  }

  const PRESETS: Record<string, Preset> = {
    counter: {
      label: 'Counter',
      source: `<div class="counter">
  <h1>Counter</h1>
  <p class={count() > 5 ? 'big' : ''}>Count: {count()}</p>
  <button onClick={() => setCount(count() + 1)}>+1</button>
</div>`,
      signals: { count: 0 },
      actions: [
        { label: 'count + 1', run: (s) => s.count!.update((v: number) => v + 1) },
        { label: 'count = 6', run: (s) => s.count!.set(6) },
      ],
    },
    names: {
      label: 'Two holes',
      source: `<div class="card">
  <h2>{first()} {last()}</h2>
  <p>Hello, {first()}.</p>
  <p class="note">Static text is never touched.</p>
</div>`,
      signals: { first: 'Ada', last: 'Lovelace' },
      actions: [
        { label: 'first = “Grace”', run: (s) => s.first!.set('Grace') },
        { label: 'last = “Hopper”', run: (s) => s.last!.set('Hopper') },
      ],
    },
    attrs: {
      label: 'Attributes',
      source: `<button class={on() ? 'btn on' : 'btn'} title={label()} onClick={() => setOn(!on())}>
  {on() ? 'On' : 'Off'}
</button>`,
      signals: { on: false, label: 'Toggle me' },
      actions: [
        { label: 'toggle on', run: (s) => s.on!.update((v: boolean) => !v) },
        { label: 'rename the title', run: (s) => s.label!.set('A new tooltip') },
      ],
    },
  };

  let which = $state(initial in PRESETS ? initial : 'counter');
  let source = $state(PRESETS[which]!.source);
  let error = $state('');
  let compiled = $state.raw<Compiled | null>(null);
  let lens = $state.raw<Lens | null>(null);
  let root = $state.raw<MElement | null>(null);
  let sigs: Record<string, Signal<any>> = {};

  const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1);

  function build() {
    error = '';
    const preset = PRESETS[which]!;
    const doc = createDocument();
    const host = doc.createElement('div');
    doc.body.appendChild(host);
    const l = new Lens(doc);
    const engine = createEngine('colour');
    sigs = {};
    const scope: Record<string, unknown> = {};
    for (const [name, init] of Object.entries(preset.signals)) {
      const s = engine.signal<any>(init, { label: name });
      sigs[name] = s;
      scope[name] = () => s.get();
      scope[`set${cap(name)}`] = (v: unknown) => s.set(typeof v === 'function' ? (v as (p: unknown) => unknown)(s.peek()) : v);
    }
    try {
      const c = compileTemplate(source, { name: 'Component', scope: Object.keys(scope) });
      compiled = c;
      const rt = createTemplateRuntime(doc, engine);
      const component = instantiate<Record<string, unknown>>(c, rt);
      l.act(() => {
        engine.createRoot(() => {
          host.appendChild(component(scope));
        });
      });
    } catch (e) {
      compiled = null;
      error = e instanceof TemplateError ? e.message : e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    }
    lens?.destroy();
    lens = l;
    root = host;
  }
  build();

  let firstRun = true;
  $effect(() => {
    which;
    source;
    if (firstRun) {
      firstRun = false;
      return;
    }
    untrack(build);
  });
  function pick(v: string) {
    which = v;
    source = PRESETS[v]!.source;
  }
  function run(i: number) {
    lens?.act(() => PRESETS[which]!.actions[i]!.run(sigs));
  }
</script>

<Widget {title} {n} {caption} kind="Experiment" subtitle="The template on the left is compiled to the code beside it. Press an action and see how little the page does.">
  {#snippet controls()}
    <Segmented label="Template" value={which} onchange={pick} options={Object.entries(PRESETS).map(([value, p]) => ({ value, label: p.label }))} />
  {/snippet}

  <div class="cols">
    <div class="col">
      <div class="h ui">Template</div>
      {#key which}<CodeEditor value={source} lang="jsx" label="Template source" minLines={7} onchange={(c) => (source = c)} />{/key}
    </div>
    <div class="col">
      <div class="h ui">Compiled{#if compiled} <span class="pill">{compiled.holes} effect{compiled.holes === 1 ? '' : 's'}</span>{/if}</div>
      {#if compiled}
        {#key compiled.code}<CodeEditor value={compiled.code} lang="ts" readonly label="Compiled output" minLines={7} />{/key}
      {:else}
        <p class="err ui" role="alert">{error}</p>
      {/if}
    </div>
  </div>

  <div class="actions ui">
    {#each PRESETS[which]!.actions as a, i (a.label)}<Button variant="primary" onclick={() => run(i)}>{a.label}</Button>{/each}
    <span class="hint">or click inside the page</span>
  </div>

  {#if lens && root && compiled}
    <LensPane {lens} {root} title="The page it made" note="Each action: how many DOM operations did it take?" />
  {/if}
</Widget>

<style>
  .cols {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
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
  .pill {
    text-transform: none;
    letter-spacing: 0;
    border: 1px solid var(--effect);
    background: var(--effect-soft);
    color: var(--fg);
    border-radius: 999px;
    padding: 0 0.45rem;
    margin-left: 0.3rem;
  }
  .err {
    color: var(--red);
    font-family: var(--font-mono);
    font-size: 0.82rem;
    margin: 0;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    margin: 0.8rem 0;
  }
  .hint {
    font-size: 0.8rem;
    color: var(--mute);
  }
</style>
