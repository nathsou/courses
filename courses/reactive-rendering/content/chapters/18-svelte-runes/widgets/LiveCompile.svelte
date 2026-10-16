<!--
  The real Svelte 5 compiler, running in this page. Edit a component; read what it writes. Nothing is simulated: the
  compiler is `svelte/compiler`, loaded on demand. The badges count the signals and effects in the output.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import CodeEditor from '$lib/exercise/CodeEditor.svelte';

  let { n, title = 'Compile it live', caption, preset: initial = 'counter' }: { n?: string | number; title?: string; caption?: string; preset?: string } = $props();

  const PRESETS: Record<string, { label: string; source: string }> = {
    counter: {
      label: 'Counter',
      source: `<script>
  let count = $state(0);
<\/script>

<div class="counter">
  <h1>Counter</h1>
  <p class={count > 5 ? 'big' : ''}>Count: {count}</p>
  <button onclick={() => count++}>+1</button>
</div>`,
    },
    derived: {
      label: 'Derived and effect',
      source: `<script>
  let count = $state(0);
  let double = $derived(count * 2);

  $effect(() => {
    document.title = \`count is \${count}\`;
  });
<\/script>

<p>{count} × 2 = {double}</p>
<button onclick={() => count++}>+1</button>`,
    },
    everything: {
      label: 'Blocks',
      source: `<script>
  let count = $state(0);
  let name = $state('Ada');
  let todos = $state([{ text: 'milk', done: false }]);
  let double = $derived(count * 2);

  $effect(() => {
    document.title = \`\${name}: \${count}\`;
  });
<\/script>

<h1 class={count > 5 ? 'big' : ''}>Hello {name}</h1>
<p>{count} × 2 = {double}</p>
{#if count > 2}
  <p>big</p>
{/if}
<ul>
  {#each todos as todo (todo.text)}
    <li class:done={todo.done}>{todo.text}</li>
  {/each}
</ul>
<button onclick={() => count++}>+1</button>`,
    },
  };

  let which = $state(initial in PRESETS ? initial : 'counter');
  let target = $state<'client' | 'server'>('client');
  let source = $state(PRESETS[which]!.source);
  let output = $state('');
  let error = $state('');
  let loading = $state(true);
  let warnings = $state<string[]>([]);
  let token = 0;
  let compilerPromise: Promise<typeof import('svelte/compiler')> | null = null;

  async function run() {
    const mine = ++token;
    loading = true;
    try {
      compilerPromise ??= import('svelte/compiler');
      const { compile } = await compilerPromise;
      const r = compile(source, { generate: target, filename: 'App.svelte', dev: false, css: 'external' });
      if (mine !== token) return;
      output = r.js.code;
      warnings = r.warnings.map((w) => w.message);
      error = '';
    } catch (e) {
      if (mine !== token) return;
      error = e instanceof Error ? e.message : String(e);
    } finally {
      if (mine === token) loading = false;
    }
  }
  $effect(() => {
    source;
    target;
    run();
  });
  function pick(v: string) {
    which = v;
    source = PRESETS[v]!.source;
  }
  const count = (re: RegExp) => (output.match(re) ?? []).length;
  const stats = $derived([
    { label: '$.state / $.proxy', n: count(/\$\.(state|proxy)\(/g) },
    { label: '$.derived', n: count(/\$\.derived\(/g) },
    { label: '$.user_effect', n: count(/\$\.user_effect\(/g) },
    { label: '$.template_effect', n: count(/\$\.template_effect\(/g) },
    { label: 'blocks ($.if / $.each)', n: count(/\$\.(if|each)\(/g) },
  ]);
</script>

<Widget {title} {n} {caption} kind="Experiment" subtitle="Edit a Svelte 5 component and read what its compiler writes. This is the real compiler, running in your browser.">
  {#snippet controls()}
    <Segmented label="Component" value={which} onchange={pick} options={Object.entries(PRESETS).map(([value, p]) => ({ value, label: p.label }))} />
    <Segmented label="Compile for" bind:value={target} options={[{ value: 'client', label: 'The browser' }, { value: 'server', label: 'The server (SSR)' }]} />
  {/snippet}

  <div class="cols">
    <div class="col">
      <div class="h ui">Component.svelte</div>
      {#key which}<CodeEditor value={source} lang="svelte" label="Svelte component source" minLines={12} onchange={(c) => (source = c)} />{/key}
    </div>
    <div class="col">
      <div class="h ui">Compiled {loading ? '(loading the compiler…)' : ''}</div>
      {#if error}
        <p class="err ui" role="alert">{error}</p>
      {:else}
        {#key output}<CodeEditor value={output} lang="ts" readonly label="Compiled output" minLines={12} />{/key}
      {/if}
    </div>
  </div>

  {#if target === 'client' && !error}
    <ul class="stats ui" aria-label="What the output contains">
      {#each stats as s (s.label)}<li><b>{s.n}</b> <code>{s.label}</code></li>{/each}
    </ul>
  {/if}
  {#if warnings.length}<p class="warn ui">{warnings.join(' · ')}</p>{/if}
</Widget>

<style>
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
  .err {
    color: var(--red);
    font-family: var(--font-mono);
    font-size: 0.8rem;
    margin: 0;
    white-space: pre-wrap;
  }
  .warn {
    font-size: 0.8rem;
    color: var(--ink-2);
  }
  .stats {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 1rem;
    list-style: none;
    padding: 0;
    margin: 0.8rem 0 0;
    font-size: 0.82rem;
    color: var(--ink-2);
  }
  .stats b {
    font-size: 1rem;
    color: var(--fg);
  }
</style>
