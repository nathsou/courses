<!--
  Who re-renders? A small component tree, a counter in the root and a search box, and a set of switches for the things
  that change the answer: memo, unstable props, caching elements as a compiler would, and where the search text lives.
  Press an action and read which components ran, which were skipped and which were never reached.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Toggle from '$lib/components/ui/Toggle.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import { createDocument } from '$lib/rx/dom';
  import { Renderer, h, memo, useCallback, useMemo, useState, type Component, type TraceEvent } from '$lib/rx/vdom';

  let { n, title = 'Who re-renders?', caption }: { n?: string | number; title?: string; caption?: string } = $props();

  let useMemoWrapper = $state(false);
  let unstable = $state(false);
  let compiler = $state(false);
  let where = $state<'app' | 'search'>('search');

  const NAMES = ['App', 'Header', 'Counter', 'Search', 'Sidebar', 'Item'] as const;
  type Row = { name: string; total: number; status: string; ran: number };
  let rows = $state<Row[]>(NAMES.map((name) => ({ name, total: 0, status: '—', ran: 0 })));
  let last = $state('');
  const api: { bump?: () => void; type?: () => void } = {};
  let env: { renderer: Renderer; root: import('$lib/rx/dom').MElement; trace: TraceEvent[] };

  const ITEMS = ['Home', 'Inbox', 'Settings'];

  function build() {
    const doc = createDocument();
    const root = doc.createElement('div');
    doc.body.appendChild(root);
    const trace: TraceEvent[] = [];
    const renderer = new Renderer(doc, { autoFlush: false, onTrace: (e) => trace.push(e) });
    const maybeMemo = <P extends Record<string, unknown>>(c: Component<P>) => (useMemoWrapper ? memo(c) : c);
    const named = <T extends Component>(c: T, name: string): T => ((c.displayName = name), c);

    const Header = named(maybeMemo(({ title }: { title: string }) => h('header', null, title)), 'Header');
    const Item = named(maybeMemo(({ label }: { label: string; onPick: () => void }) => h('li', null, label)), 'Item');
    const Sidebar = named(
      maybeMemo(({ items, onPick }: { items: string[]; onPick: () => void }) => h('ul', null, items.map((label) => h(Item, { key: label, label, onPick })))),
      'Sidebar',
    );
    const Counter = named(({ count }: { count: number }) => h('p', null, `count = ${count}`), 'Counter');
    const Search = named(({ query, onQuery }: { query?: string; onQuery?: (q: string) => void }) => {
      const [local, setLocal] = useState('');
      const q = onQuery ? (query ?? '') : local;
      if (!onQuery) api.type = () => setLocal((x) => x + 'a');
      return h('input', { value: q, placeholder: 'Search…' });
    }, 'Search');

    const App = named(() => {
      const [count, setCount] = useState(0);
      const [query, setQuery] = useState('');
      api.bump = () => setCount((c) => c + 1);
      if (where === 'app') api.type = () => setQuery((x) => x + 'a');
      const stablePick = useCallback(() => {}, []);
      const stableItems = useMemo(() => ITEMS, []);
      // What the React Compiler arranges: every element cached, rebuilt only when its inputs change.
      const header = useMemo(() => h(Header, { title: 'Notes' }), []);
      const sidebar = useMemo(() => h(Sidebar, { items: stableItems, onPick: stablePick }), [stableItems, stablePick]);
      const searchEl = useMemo(() => (where === 'app' ? null : h(Search, {})), []);
      const counterEl = useMemo(() => h(Counter, { count }), [count]);
      if (compiler) {
        return h('main', null, header, counterEl, where === 'app' ? h(Search, { query, onQuery: setQuery }) : searchEl, sidebar);
      }
      return h(
        'main',
        null,
        h(Header, { title: 'Notes' }),
        h(Counter, { count }),
        where === 'app' ? h(Search, { query, onQuery: setQuery }) : h(Search, {}),
        h(Sidebar, unstable ? { items: [...ITEMS], onPick: () => {} } : { items: stableItems, onPick: stablePick }),
      );
    }, 'App');
    renderer.render(h(App), root);
    return { renderer, root, trace };
  }

  function snapshot() {
    return Object.fromEntries(NAMES.map((nm) => [nm, env.renderer.counts.get(nm)?.renders ?? 0]));
  }
  function act(label: string, f?: () => void) {
    const before = snapshot();
    env.trace.length = 0;
    f?.();
    env.renderer.flush();
    const after = snapshot();
    last = label;
    rows = NAMES.map((name) => {
      const ran = after[name]! - before[name]!;
      const skips = env.trace.filter((e) => e.kind === 'skip' && e.name === name);
      const status = ran > 0 ? 'rendered' : skips.length ? `skipped (${skips[0]!.why})` : 'not reached';
      return { name, total: after[name]!, status, ran };
    });
  }
  function reset() {
    env = build();
    const c = Object.fromEntries(env.renderer.counts);
    rows = NAMES.map((name) => ({ name, total: c[name]?.renders ?? 0, status: 'first render', ran: 0 }));
    last = '';
  }
  reset();
  // Rebuild when a switch changes.
  let first = true;
  $effect(() => {
    useMemoWrapper;
    unstable;
    compiler;
    where;
    if (first) {
      first = false;
      return;
    }
    reset();
  });
  const DEPTH: Record<string, number> = { App: 0, Header: 1, Counter: 1, Search: 1, Sidebar: 1, Item: 2 };
</script>

<Widget {title} {n} {caption} kind="Experiment" subtitle="Press an action. Which components ran, which were skipped, which were never reached?" onreset={reset}>
  {#snippet controls()}
    <Button variant="primary" onclick={() => act('Count +1', () => api.bump?.())}>Count +1 <small>(state in App)</small></Button>
    <Button onclick={() => act('Typed a letter', () => api.type?.())}>Type a letter in the search box</Button>
  {/snippet}
  <div class="switches ui">
    <Toggle label="memo() on Header, Sidebar and Item" bind:checked={useMemoWrapper} />
    <Toggle label="Pass a new array and function to Sidebar on every render" bind:checked={unstable} />
    <Toggle label="Cache every element, as the React Compiler does" bind:checked={compiler} />
    <Segmented label="Where the search text lives" bind:value={where} options={[{ value: 'search', label: 'In Search' }, { value: 'app', label: 'Lifted into App' }]} />
  </div>
  <table class="tree ui" aria-label="The component tree and what ran">
    <thead><tr><th>Component</th><th>Renders so far</th><th>{last ? `After “${last}”` : 'After an action'}</th></tr></thead>
    <tbody>
      {#each rows as r (r.name)}
        <tr class:ran={r.ran > 0} class:skipped={r.status.startsWith('skipped')}>
          <td style:padding-left="{0.5 + DEPTH[r.name]! * 1.2}rem"><code>{r.name}{r.name === 'Item' ? ' ×3' : ''}</code></td>
          <td class="num">{r.total}</td>
          <td>{#if r.ran > 0}<span class="b run">● rendered{r.name === 'Item' ? ` ${r.ran}×` : ''}</span>{:else if r.status.startsWith('skipped')}<span class="b skip">◌ {r.status}</span>{:else}<span class="b">{r.status}</span>{/if}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</Widget>

<style>
  .switches {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem 1.6rem;
    align-items: center;
    margin-bottom: 0.8rem;
  }
  .tree {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.84rem;
  }
  .tree th, .tree td {
    text-align: left;
    padding: 0.3rem 0.5rem;
    border-top: 1px solid var(--line);
    text-transform: none;
    letter-spacing: 0;
    font-family: var(--font-ui);
  }
  .tree thead th { border-top: 0; font-size: 0.72rem; color: var(--mute); }
  .num { font-family: var(--font-mono); text-align: right !important; width: 8rem; }
  code { font-family: var(--font-mono); font-size: 0.8rem; }
  tr.ran td { background: var(--flash-soft); }
  .b { color: var(--mute); font-size: 0.8rem; }
  .b.run { color: var(--flash); font-weight: 700; }
  .b.skip { color: var(--green); font-weight: 600; }
  small { font-weight: 400; opacity: 0.8; }
</style>
