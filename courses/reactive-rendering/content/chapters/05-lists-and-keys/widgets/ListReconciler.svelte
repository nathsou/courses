<!--
  Reconciling a keyed list. Choose an old and a new order, and a strategy; see the plan it computes (patch, move, insert,
  remove), what each costs, and which items are now attached to the wrong state. The lower half runs the same update on
  a real list of text boxes: type in a few, apply the reorder, and see whose text ended up where.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import LensPane from '$lib/components/lens/LensPane.svelte';
  import { Lens } from '$lib/components/lens/lens.svelte';
  import { createDocument } from '$lib/rx/dom';
  import { lis, planStats, reconcile, type Strategy, type Step } from '$lib/rx/keyed';
  import { Renderer, h } from '$lib/rx/vdom';

  let { n, title = 'The list reconciler', caption, strategy: initialStrategy = 'lis' }: { n?: string | number; title?: string; caption?: string; strategy?: string } = $props();

  const PRESETS: Record<string, { label: string; old: string; next: string }> = {
    lastFirst: { label: 'Last to front', old: 'a b c d e f', next: 'f a b c d e' },
    firstLast: { label: 'First to end', old: 'a b c d e f', next: 'b c d e f a' },
    swap: { label: 'Swap two', old: 'a b c d e f', next: 'a e c d b f' },
    reverse: { label: 'Reverse', old: 'a b c d e f', next: 'f e d c b a' },
    insert: { label: 'Insert', old: 'a b c d e f', next: 'a b c x d e f' },
    remove: { label: 'Remove', old: 'a b c d e f', next: 'a b d e f' },
  };

  let preset = $state('lastFirst');
  let oldText = $state(PRESETS.lastFirst!.old);
  let newText = $state(PRESETS.lastFirst!.next);
  let strategy = $state<Strategy>((['index', 'lastIndex', 'lis'] as string[]).includes(initialStrategy) ? (initialStrategy as Strategy) : 'lis');

  const words = (s: string) => [...new Set(s.split(/[\s,]+/).filter(Boolean))].slice(0, 12);
  const oldKeys = $derived(words(oldText));
  const newKeys = $derived(words(newText));
  const steps = $derived(reconcile(oldKeys, newKeys, strategy));
  const stats = $derived(planStats(oldKeys, newKeys, steps));
  /** For lis: the survivors that stay put. */
  const stay = $derived.by(() => {
    if (strategy !== 'lis') return new Set<string>();
    const survivors = newKeys.filter((k) => oldKeys.includes(k));
    const pos = survivors.map((k) => oldKeys.indexOf(k));
    return new Set(lis(pos).map((i) => survivors[i]!));
  });
  const moved = $derived(new Set(steps.filter((s): s is Extract<Step, { op: 'move' }> => s.op === 'move').map((s) => newKeys[s.to]!)));

  function describe(s: Step): string {
    switch (s.op) {
      case 'patch': return `keep ${oldKeys[s.from]} in place${oldKeys[s.from] !== newKeys[s.to] ? ` and rewrite it as ${newKeys[s.to]}` : ''}`;
      case 'move': return `move ${oldKeys[s.from]} ${typeof s.anchor === 'string' ? (s.anchor === 'start' ? 'to the start' : 'to the end') : 'before' in s.anchor ? `before ${newKeys[s.anchor.before]}` : `after ${newKeys[s.anchor.after]}`}`;
      case 'insert': return `create ${newKeys[s.to]}`;
      case 'remove': return `remove ${oldKeys[s.from]}`;
    }
  }

  // ───────── the live list ─────────
  function make() {
    const doc = createDocument();
    const root = doc.createElement('div');
    doc.body.appendChild(root);
    return { doc, root, lens: new Lens(doc), renderer: new Renderer(doc, { autoFlush: false, strategy }) };
  }
  let live = $state(make());
  let typed = $state<Record<string, string>>({});
  let applied = $state(false);
  const row = (k: string) => h('li', { key: k }, h('b', null, k), ' ', h('input', { placeholder: `note for ${k}` }));
  const view = (keys: string[]) => h('ul', null, keys.map(row));
  function reset() {
    live.lens.destroy();
    live = make();
    live.renderer.render(view(oldKeys), live.root);
    live.lens.begin();
    applied = false;
    typed = {};
  }
  function apply() {
    // Which text was typed where, by label, before the reorder.
    typed = Object.fromEntries(live.root.querySelectorAll('li').map((li) => [li.querySelector('b')!.textContent, (li.querySelector('input') as import('$lib/rx/dom').MElement).value]));
    live.lens.begin();
    live.renderer.render(view(newKeys), live.root);
    live.lens.refresh();
    applied = true;
  }
  const after = $derived.by(() => {
    live.lens.version;
    return applied
      ? live.root.querySelectorAll('li').map((li) => ({ label: li.querySelector('b')!.textContent, text: (li.querySelector('input') as import('$lib/rx/dom').MElement).value }))
      : [];
  });
  reset();
  function choose(id: string) {
    preset = id;
    oldText = PRESETS[id]!.old;
    newText = PRESETS[id]!.next;
    reset();
  }
</script>

<Widget {title} {n} {caption} kind="Experiment" subtitle="One reorder, three algorithms. Read the plan, then try it on real inputs." onreset={reset}>
  {#snippet controls()}
    <Segmented label="Reorder" bind:value={preset} options={Object.entries(PRESETS).map(([value, p]) => ({ value, label: p.label }))} onchange={choose} />
    <Segmented
      label="Algorithm"
      bind:value={strategy}
      onchange={reset}
      options={[
        { value: 'index', label: 'By position' },
        { value: 'lastIndex', label: 'React: last placed index' },
        { value: 'lis', label: 'Vue: longest increasing subsequence' },
      ]}
    />
  {/snippet}

  <div class="two">
    <div>
      <div class="lists" aria-label="Old and new order">
        <div class="row ui"><span class="tag">old</span>{#each oldKeys as k (k)}<span class="tile" class:gone={!newKeys.includes(k)}>{k}</span>{/each}</div>
        <div class="row ui">
          <span class="tag">new</span>
          {#each newKeys as k, i (k)}
            {@const from = oldKeys.indexOf(k)}
            <span class="tile" class:fresh={from < 0} class:moves={moved.has(k)} class:stays={strategy === 'lis' && stay.has(k)} class:mis={strategy === 'index' && from >= 0 && from !== i}>{k}</span>
          {/each}
        </div>
      </div>
      <ol class="plan ui" aria-label="The plan">
        {#each steps as s, i (i)}<li class={s.op}><b>{s.op}</b> {describe(s)}</li>{/each}
      </ol>
      <div class="stats ui">
        <span><b>{stats.moves}</b> move{stats.moves === 1 ? '' : 's'}</span>
        <span><b>{stats.inserts}</b> create</span>
        <span><b>{stats.removes}</b> remove</span>
        <span><b>{stats.patches + stats.moves}</b> kept</span>
        <span class:bad={stats.misattributed > 0}><b>{stats.misattributed}</b> with the wrong identity</span>
      </div>
    </div>
    <div>
      <div class="go ui">
        <Button variant="primary" onclick={apply}>Apply the reorder</Button>
        <Button onclick={reset}>Reset</Button>
        <span class="hint">Type something in two or three boxes first.</span>
      </div>
      <LensPane lens={live.lens} root={live.root} title="A real list" showTree={false} showLog />
      {#if applied}
        <table class="after ui" aria-label="Where the typed text ended up">
          <thead><tr><th>Item</th><th>Its box held</th><th>Its box holds now</th></tr></thead>
          <tbody>
            {#each after as r (r.label)}
              {@const was = typed[r.label]}
              <tr class:bad={was !== undefined && was !== r.text}>
                <td>{r.label}</td><td>{was === undefined ? '(new item)' : `“${was}”`}</td><td>“{r.text}”</td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </div>
  </div>
</Widget>

<style>
  .two {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(19rem, 1fr));
    gap: 1.2rem;
  }
  .lists {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.3rem;
  }
  .tag {
    width: 2.4rem;
    font-family: var(--font-mono);
    font-size: 0.68rem;
    text-transform: uppercase;
    color: var(--mute);
  }
  .tile {
    display: inline-grid;
    place-items: center;
    min-width: 2rem;
    height: 2rem;
    padding: 0 0.4rem;
    border: 1.5px solid var(--line-strong);
    border-radius: 6px;
    background: var(--panel);
    font-family: var(--font-mono);
    font-weight: 600;
  }
  .tile.gone {
    border-style: dashed;
    color: var(--mute);
    text-decoration: line-through;
  }
  .tile.fresh {
    border-color: var(--green);
    background: var(--green-soft);
  }
  .tile.moves {
    border-color: var(--flash);
    background: var(--flash-soft);
  }
  .tile.stays {
    border-color: var(--ink-blue);
    background: var(--ink-blue-soft);
  }
  .tile.mis {
    border-color: var(--red);
    background: var(--red-soft);
  }
  .plan {
    margin: 0.8rem 0 0.5rem;
    padding-left: 1.4rem;
    font-size: 0.8rem;
  }
  .plan li b {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    text-transform: uppercase;
    margin-right: 0.3rem;
  }
  .plan .move b { color: var(--flash); }
  .plan .insert b { color: var(--green); }
  .plan .remove b { color: var(--red); }
  .plan .patch b { color: var(--mute); }
  .stats {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem 1rem;
    font-size: 0.8rem;
    color: var(--ink-2);
  }
  .stats b {
    font-family: var(--font-mono);
    font-size: 1rem;
    color: var(--fg);
  }
  .stats .bad b {
    color: var(--red);
  }
  .go {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
    margin-bottom: 0.6rem;
  }
  .hint {
    font-size: 0.76rem;
    color: var(--mute);
  }
  .after {
    width: 100%;
    margin-top: 0.7rem;
    border-collapse: collapse;
    font-size: 0.8rem;
  }
  .after th, .after td {
    text-align: left;
    padding: 0.2rem 0.4rem;
    border-top: 1px solid var(--line);
    text-transform: none;
    letter-spacing: 0;
    font-family: var(--font-ui);
  }
  .after thead th { border-top: 0; font-size: 0.7rem; color: var(--mute); }
  .after tr.bad td { background: var(--red-soft); }
</style>
