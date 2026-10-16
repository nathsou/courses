<!--
  Angular's change detection as a tree of views. Choose what runs the checks (zone.js or notifications only) and how
  each view is checked (Default or OnPush); then make something happen and see which views the walk visited and which
  had their bindings re-evaluated. Model: the lab's `cd.ts`.
-->
<script lang="ts">
  import { untrack } from 'svelte';
  import Widget from '$lib/components/ui/Widget.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import { allViews, buildViews, handle, sampleApp, type CdEvent, type CdMode, type Tick, type View, type ViewStrategy } from '$lib/rx/cd';

  let { n, title = 'What does Angular check?', caption, strategy: s0 = 'default', mode: m0 = 'zone' }: { n?: string | number; title?: string; caption?: string; strategy?: string; mode?: string } = $props();

  let strategy = $state<ViewStrategy>(s0 === 'onpush' ? 'onpush' : 'default');
  let mode = $state<CdMode>(m0 === 'zoneless' ? 'zoneless' : 'zone');
  let root = $state.raw<View>(buildViews(sampleApp('default')));
  let last = $state.raw<Tick | null>(null);
  let what = $state('');
  let total = $state(0);
  let ticks = $state(0);
  let version = $state(0);
  const totalBindings = $derived(allViews(root).reduce((a, v) => a + v.bindings, 0));

  function reset() {
    root = buildViews(sampleApp(strategy));
    last = null;
    what = '';
    total = 0;
    ticks = 0;
    version++;
  }
  $effect(() => {
    strategy;
    untrack(reset);
  });

  const EVENTS: { label: string; ev: CdEvent; text: string }[] = [
    { label: 'Click in Row3', ev: { kind: 'click', view: 'Row3' }, text: 'a click handler in Row3' },
    { label: 'Signal read by Row3', ev: { kind: 'signal', view: 'Row3' }, text: 'a signal that Row3’s template reads is written' },
    { label: 'markForCheck in Row3', ev: { kind: 'markForCheck', view: 'Row3' }, text: 'markForCheck() called in Row3' },
    { label: 'Unrelated timer', ev: { kind: 'timer' }, text: 'an unrelated timer or HTTP response' },
    { label: 'Click in Header', ev: { kind: 'click', view: 'Header' }, text: 'a click handler in Header' },
  ];
  function fire(i: number) {
    const e = EVENTS[i]!;
    const t = handle(root, mode, e.ev);
    what = e.text;
    last = t;
    ticks += t ? 1 : 0;
    total += t?.bindings ?? 0;
    version++; // the views are mutated in place
  }
  const status = (name: string) => (last?.checked.includes(name) ? 'checked' : last?.visited.includes(name) ? 'visited' : '');
  const flat = $derived.by(() => {
    version;
    const out: { v: View; depth: number }[] = [];
    const walk = (v: View, d: number) => {
      out.push({ v, depth: d });
      v.children.forEach((c) => walk(c, d + 1));
    };
    walk(root, 0);
    return out;
  });
</script>

<Widget {title} {n} {caption} kind="Simulation" subtitle="An app of {allViews(root).length} views and {totalBindings} template bindings. What does each kind of event make Angular do?">
  {#snippet controls()}
    <Segmented label="What triggers a check" bind:value={mode} options={[{ value: 'zone', label: 'zone.js: after every task' }, { value: 'zoneless', label: 'Zoneless: when notified' }]} />
    <Segmented label="How views are checked" bind:value={strategy} options={[{ value: 'default', label: 'Default everywhere' }, { value: 'onpush', label: 'OnPush everywhere' }]} />
  {/snippet}

  <div class="actions ui">
    {#each EVENTS as e, i (e.label)}<Button size="sm" variant="primary" onclick={() => fire(i)}>{e.label}</Button>{/each}
    <Button size="sm" variant="ghost" onclick={reset}>Reset</Button>
  </div>

  <div class="tree" role="tree" aria-label="View tree">
    {#each flat as { v, depth } (v.name)}
      <div class="row {status(v.name)}" role="treeitem" aria-selected="false" aria-level={depth + 1}>
        <span class="name" style:padding-left="{depth * 1.1}rem">{v.name}</span>
        <span class="strat">{v.strategy === 'default' ? 'Default' : 'OnPush'} · {v.bindings} binding{v.bindings === 1 ? '' : 's'}</span>
        <span class="st ui">{#if status(v.name) === 'checked'}re-evaluated{:else if status(v.name) === 'visited'}walked through{:else if last}skipped{/if}</span>
      </div>
    {/each}
  </div>

  <p class="out ui" aria-live="polite">
    {#if !what}Pick an event.
    {:else if last}After {what}: <b>{last.checked.length}</b> of {allViews(root).length} views re-evaluated, <b>{last.bindings}</b> of {totalBindings} bindings.
    {:else}After {what}: <b>no change detection ran at all.</b>{/if}
    <span class="tot">Total so far: {total} bindings over {ticks} tick{ticks === 1 ? '' : 's'}.</span>
  </p>
</Widget>

<style>
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-bottom: 0.7rem;
  }
  .tree {
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--panel);
    padding: 0.35rem 0.5rem;
    font-size: 0.84rem;
  }
  .row {
    display: grid;
    grid-template-columns: 9rem 1fr auto;
    gap: 0.6rem;
    align-items: baseline;
    padding-block: 0.12rem;
    border-radius: 4px;
  }
  .row.checked {
    background: var(--flash-soft);
  }
  .row.visited {
    background: var(--computed-soft);
  }
  .name {
    font-family: var(--font-mono);
    font-weight: 600;
  }
  .strat {
    font-size: 0.74rem;
    color: var(--mute);
  }
  .st {
    font-size: 0.74rem;
    color: var(--ink-2);
    white-space: nowrap;
  }
  .row.checked .st {
    color: var(--flash);
    font-weight: 700;
  }
  .out {
    margin: 0.7rem 0 0;
    font-size: 0.85rem;
    color: var(--ink-2);
  }
  .tot {
    display: block;
    color: var(--mute);
    font-size: 0.78rem;
    margin-top: 0.15rem;
  }
</style>
