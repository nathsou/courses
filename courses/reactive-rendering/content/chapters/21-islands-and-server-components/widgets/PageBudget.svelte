<!--
  A blog page, made of components. Decide which of them run in the browser: that code is what the page has to
  download, parse, run and hydrate. Three strategies: hydrate everything, islands (only interactive parts hydrate),
  and server components (the rest never ship, and the page arrives as a stream of rows, serialised by the lab's
  `flight.ts`).
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Code from '$lib/code/Code.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import { clientComponent, serialize, type FlightResult, type ServerComponent } from '$lib/rx/flight';
  import { h } from '$lib/rx/vdom';

  let { n, title = 'What ships?', caption, mode: initial = 'all' }: { n?: string | number; title?: string; caption?: string; mode?: string } = $props();

  interface Spec {
    id: string;
    name: string;
    /** KB of JavaScript the component brings with it, with the libraries only it uses. */
    kb: number;
    interactive: boolean;
    note: string;
  }
  const COMPONENTS: Spec[] = [
    { id: 'Header', name: 'Header', kb: 6, interactive: false, note: 'a logo and a menu of links' },
    { id: 'Article', name: 'Article body', kb: 71, interactive: false, note: 'reads the post and turns Markdown into elements (the Markdown library is 58 KB)' },
    { id: 'Like', name: 'Like button', kb: 3, interactive: true, note: 'a counter that changes on click' },
    { id: 'Comments', name: 'Comments', kb: 22, interactive: true, note: 'a form and a list that updates' },
    { id: 'Search', name: 'Search box', kb: 9, interactive: true, note: 'filters as you type' },
    { id: 'Footer', name: 'Footer', kb: 2, interactive: false, note: 'links and a copyright line' },
  ];
  const RUNTIME_KB = 45;

  type Mode = 'all' | 'islands' | 'rsc';
  let mode = $state<Mode>(initial === 'islands' || initial === 'rsc' ? initial : 'all');
  let client = $state<Record<string, boolean>>({ Header: false, Article: false, Like: true, Comments: true, Search: true, Footer: false });

  const isClient = (id: string) => (mode === 'all' ? true : !!client[id]);

  // Run the real serializer on the page for the server-components view.
  let result = $state.raw<FlightResult | null>(null);
  let token = 0;
  async function build() {
    const mine = ++token;
    const mk = (spec: Spec) => {
      if (client[spec.id]) return clientComponent(spec.id, spec.kb * 1024, () => h('div', null));
      const fn: ServerComponent = async () => {
        await Promise.resolve(); // the "database"
        return { type: spec.id === 'Article' ? 'article' : spec.id === 'Header' ? 'header' : spec.id === 'Footer' ? 'footer' : 'section', props: { children: spec.id === 'Article' ? ['The post, as elements.'] : spec.name } };
      };
      fn.bytes = spec.kb * 1024;
      return fn;
    };
    const tree = { type: 'main', props: { children: COMPONENTS.map((c) => ({ type: mk(c), props: c.interactive ? { initial: 3 } : {} })) } };
    const r = await serialize(tree as never);
    if (mine === token) result = r;
  }
  $effect(() => {
    JSON.stringify(client);
    build();
  });

  const shippedKB = $derived.by(() => {
    const comps = COMPONENTS.filter((c) => isClient(c.id)).reduce((a, c) => a + c.kb, 0);
    return comps === 0 ? 0 : comps + RUNTIME_KB;
  });
  const allKB = COMPONENTS.reduce((a, c) => a + c.kb, 0) + RUNTIME_KB;
  const dead = $derived(COMPONENTS.filter((c) => c.interactive && !isClient(c.id)));
  const hydrating = $derived(COMPONENTS.filter((c) => isClient(c.id)));
  const keptHome = $derived(COMPONENTS.filter((c) => !isClient(c.id)).reduce((a, c) => a + c.kb, 0));
  const payloadBytes = $derived(result ? result.payload.length : 0);
</script>

<Widget {title} {n} {caption} kind="Experiment" subtitle="A page of six components. Choose a strategy; for the last two, choose which components run in the browser.">
  {#snippet controls()}
    <Segmented
      label="Strategy"
      bind:value={mode}
      options={[
        { value: 'all', label: 'Hydrate everything' },
        { value: 'islands', label: 'Islands' },
        { value: 'rsc', label: 'Server components' },
      ]}
    />
  {/snippet}

  <table class="comp ui">
    <thead><tr><th>Component</th><th>JS</th><th>Runs in the browser?</th></tr></thead>
    <tbody>
      {#each COMPONENTS as c (c.id)}
        <tr class:off={!isClient(c.id)}>
          <td><b>{c.name}</b> <span class="note">{c.note}</span></td>
          <td class="kb">{c.kb} KB</td>
          <td>
            <label class="sw">
              <input type="checkbox" checked={isClient(c.id)} disabled={mode === 'all'} onchange={(e) => (client[c.id] = e.currentTarget.checked)} aria-label="{c.name} runs in the browser" />
              <span>{isClient(c.id) ? (mode === 'islands' ? 'an island' : 'client') : mode === 'rsc' ? 'server only' : 'plain HTML'}</span>
            </label>
            {#if c.interactive && !isClient(c.id)}<span class="warn">needs the browser</span>{/if}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>

  <div class="grid ui">
    <div class="stat">
      <div class="h">JavaScript to ship</div>
      <div class="big">{shippedKB} <small>KB</small></div>
      <div class="bar"><span style:width="{(shippedKB / allKB) * 100}%"></span></div>
      <div class="sub">{mode === 'all' ? 'every component, plus the framework' : `${keptHome} KB of component code stays on the server${shippedKB ? `, plus ${RUNTIME_KB} KB runtime` : ''}`}</div>
    </div>
    <div class="stat">
      <div class="h">Hydrated on load</div>
      <div class="big">{hydrating.length} <small>of {COMPONENTS.length}</small></div>
      <div class="sub">{hydrating.length ? hydrating.map((c) => c.name).join(', ') : 'nothing: the page is plain HTML'}</div>
    </div>
  </div>

  {#if dead.length}<p class="deadmsg ui" role="alert"><b>Broken:</b> {dead.map((c) => c.name).join(', ')} {dead.length === 1 ? 'needs' : 'need'} state and events, but {dead.length === 1 ? 'is' : 'are'} not running in the browser. Their HTML shows, and nothing responds.</p>{/if}

  {#if mode === 'rsc' && result}
    <div class="h ui rows">What the browser receives: the component tree as rows ({payloadBytes} bytes of payload)</div>
    <Code class="payload" lang="js" code={result.payload} />
    <p class="note ui">Server components appear only as the elements they returned. A client component is a reference (<code>$L1</code>) to a module row, plus its props. The browser downloads the referenced modules and nothing else: <b>{result.clientModules.length}</b> module{result.clientModules.length === 1 ? '' : 's'}, and <b>{Math.round(result.serverOnlyBytes / 1024)} KB</b> of component code never leaves the server.</p>
  {/if}
</Widget>

<style>
  .comp {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.84rem;
    margin-bottom: 0.8rem;
  }
  .comp th,
  .comp td {
    text-align: left;
    padding: 0.35rem 0.5rem;
    border-top: 1px solid var(--line);
    vertical-align: top;
  }
  .comp th {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--mute);
    border-top: 0;
  }
  .comp tr.off td {
    color: var(--ink-2);
  }
  .kb {
    font-family: var(--font-mono);
    white-space: nowrap;
  }
  .note {
    color: var(--ink-2);
    font-size: 0.78rem;
  }
  .sw {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    cursor: pointer;
  }
  .sw input:disabled + span {
    opacity: 0.7;
  }
  .warn {
    margin-left: 0.5rem;
    font-size: 0.74rem;
    color: var(--red);
    font-weight: 600;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
    gap: 0.8rem;
  }
  .stat {
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 0.6rem 0.8rem;
    background: var(--panel);
  }
  .h {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--mute);
  }
  .big {
    font-family: var(--font-display);
    font-size: 2rem;
    font-weight: 700;
    line-height: 1.2;
  }
  .big small {
    font-size: 0.85rem;
    font-weight: 400;
    color: var(--ink-2);
  }
  .bar {
    height: 8px;
    border-radius: 4px;
    background: var(--line);
    margin-top: 0.4rem;
    overflow: hidden;
  }
  .bar span {
    display: block;
    height: 100%;
    min-width: 2px;
    background: var(--effect);
  }
  .sub {
    font-size: 0.8rem;
    color: var(--ink-2);
    margin-top: 0.3rem;
  }
  .deadmsg {
    margin: 0.8rem 0 0;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--red);
    background: var(--red-soft);
    border-radius: 8px;
    font-size: 0.84rem;
  }
  .rows {
    margin: 1rem 0 0.3rem;
  }
  :global(.payload) {
    margin: 0;
    padding: 0.6rem 0.8rem;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--panel);
    font-size: 0.74rem;
    overflow-x: auto;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
</style>
