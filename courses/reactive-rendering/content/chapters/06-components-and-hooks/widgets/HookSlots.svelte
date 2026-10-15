<!--
  Hooks are slots. A component is a function that runs again on every render; its state lives in a list that the
  framework keeps for the component and reads *by position*. Press the buttons and watch the slots. Then call a hook
  conditionally and watch the positions stop meaning anything.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Toggle from '$lib/components/ui/Toggle.svelte';
  import PagePreview from '$lib/components/lens/PagePreview.svelte';
  import { Lens } from '$lib/components/lens/lens.svelte';
  import { createDocument } from '$lib/rx/dom';
  import { Renderer, h, useEffect, useRef, useState, type InspectNode, type TraceEvent } from '$lib/rx/vdom';

  let { n, title = 'Hook slots', caption }: { n?: string | number; title?: string; caption?: string } = $props();

  let conditional = $state(false);
  let error = $state('');
  let tree = $state<InspectNode | null>(null);
  let events = $state<string[]>([]);
  const api: { count?: (f: (c: number) => number) => void; name?: () => void } = {};
  const flag = { extra: false };

  function Profile() {
    const [count, setCount] = useState(0);
    const [name, setName] = useState('Ann');
    if (flag.extra) {
      const [extra] = useState('extra'); // a hook inside a condition
      void extra;
    }
    const renders = useRef(0);
    renders.current++;
    useEffect(() => {
      note(`effect runs (count = ${count})`);
      return () => note(`cleanup (count was ${count})`);
    }, [count]);
    api.count = setCount;
    api.name = () => setName((x) => (x === 'Ann' ? 'Bea' : 'Ann'));
    return h('div', { class: 'profile' }, h('p', null, `${name} has clicked ${count} time${count === 1 ? '' : 's'}`), h('button', { onClick: () => setCount(count + 1) }, '+1'), ' ', h('button', { onClick: () => setName(name === 'Ann' ? 'Bea' : 'Ann') }, 'Rename'));
  }

  // Bundlers rename functions; the renderer reports components by displayName.
  Profile.displayName = 'Profile';

  function note(s: string) {
    events = [...events.slice(-9), s];
  }

  function make() {
    const doc = createDocument();
    const root = doc.createElement('div');
    doc.body.appendChild(root);
    const renderer = new Renderer(doc, {
      strategy: 'lis',
      onTrace: (e: TraceEvent) => {
        if (e.kind === 'render') note(`render ${e.name}`);
      },
      onError: (e) => {
        error = e instanceof Error ? e.message : String(e);
        refresh();
      },
    });
    return { doc, root, renderer, lens: new Lens(doc) };
  }
  let env = $state(make());

  function refresh() {
    tree = env.renderer.inspect(env.root);
    env.lens.refresh();
  }
  function start() {
    env.lens.destroy();
    flag.extra = false;
    conditional = false;
    error = '';
    events = [];
    env = make();
    env.renderer.render(h(Profile), env.root);
    refresh();
  }
  function act(f: () => void) {
    if (error) return;
    try {
      f();
      env.renderer.flush();
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
    refresh();
  }
  $effect(() => {
    // Both the figure's buttons and clicks inside the page end up here: a flush after any change.
    const off = env.doc.subscribe(() => queueMicrotask(refresh));
    return off;
  });
  start();
  const comp = $derived(tree?.kind === 'component' ? tree : (tree?.children[0] ?? null));
  const profile = $derived.by(() => {
    const find = (t: InspectNode | null): InspectNode | null => (!t ? null : t.name === 'Profile' ? t : (t.children.map(find).find(Boolean) ?? null));
    return find(tree);
  });
  void comp;
</script>

<Widget {title} {n} {caption} kind="Experiment" subtitle="The component is called again on every render. Its state is a list of slots, read by position." onreset={start}>
  {#snippet controls()}
    <Button variant="primary" onclick={() => act(() => api.count?.((c) => c + 1))}>+1</Button>
    <Button onclick={() => act(() => api.name?.())}>Rename</Button>
    <Toggle
      label="Call a hook inside a condition"
      bind:checked={conditional}
      onchange={(v) => {
        flag.extra = v;
        error = '';
      }}
    />
  {/snippet}
  <div class="grid">
    <div>
      <PagePreview lens={env.lens} root={env.root} label="The rendered component" />
      {#if error}
        <p class="err ui" role="alert">✗ {error}</p>
        <p class="hint ui">Press the reset button (top right) to start again.</p>
      {:else if conditional}
        <p class="hint ui">The extra hook will be called on the next render. Press +1 and watch what the framework finds in slot 2.</p>
      {/if}
    </div>
    <div>
      <h5 class="ui">Profile’s slots ({profile?.renders ?? 0} render{profile?.renders === 1 ? '' : 's'})</h5>
      <table class="slots ui" aria-label="The component's hook slots">
        <thead><tr><th>#</th><th>hook</th><th>value</th></tr></thead>
        <tbody>
          {#each profile?.hooks ?? [] as slot, i (i)}
            <tr><td>{i}</td><td><code>{slot.kind === 'state' ? 'useState' : slot.kind === 'ref' ? 'useRef' : 'useEffect'}</code></td><td><code>{slot.value}</code></td></tr>
          {/each}
        </tbody>
      </table>
      <h5 class="ui log-h">What happened</h5>
      <ol class="log ui">
        {#each events as e, i (i)}<li class:fx={e.startsWith('effect') || e.startsWith('cleanup')}>{e}</li>{/each}
      </ol>
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
    margin: 0 0 0.4rem !important;
    padding: 0 !important;
    border: 0 !important;
    font-family: var(--font-mono) !important;
    font-size: 0.7rem !important;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--mute);
  }
  h5::before, h5::after { display: none !important; }
  .log-h { margin-top: 0.9rem !important; }
  .slots {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.82rem;
  }
  .slots th, .slots td {
    text-align: left;
    padding: 0.25rem 0.45rem;
    border-top: 1px solid var(--line);
    text-transform: none;
    letter-spacing: 0;
    font-family: var(--font-ui);
  }
  .slots thead th { border-top: 0; font-size: 0.7rem; color: var(--mute); }
  code { font-family: var(--font-mono); font-size: 0.76rem; }
  .log {
    margin: 0;
    padding-left: 1.2rem;
    font-family: var(--font-mono);
    font-size: 0.72rem;
    color: var(--ink-2);
  }
  .log li.fx { color: var(--effect); }
  .err {
    color: var(--red);
    font-weight: 600;
    font-size: 0.84rem;
    margin: 0.6rem 0 0;
  }
  .hint {
    font-size: 0.78rem;
    color: var(--mute);
    margin: 0.4rem 0 0;
  }
</style>
