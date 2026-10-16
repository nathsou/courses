<!--
  The TC39 Signals proposal's Watcher, run for real with the polyfill. An "effect" is a Computed wrapped around the
  effect body, watched by a Watcher. The Watcher's notify callback is called synchronously, inside the write, and may
  not touch any signals: it can only schedule. Here the schedule is a button, so you can see the gap between "told"
  and "ran".
-->
<script lang="ts">
  import { Signal } from 'signal-polyfill';
  import Widget from '$lib/components/ui/Widget.svelte';
  import Button from '$lib/components/ui/Button.svelte';

  let { n, title = 'The Watcher protocol', caption }: { n?: string | number; title?: string; caption?: string } = $props();

  interface Entry { kind: 'write' | 'notify' | 'flush' | 'run' | 'skip' | 'info'; text: string }
  let log = $state.raw<Entry[]>([]);
  let pending = $state(0);
  let scheduled = $state(false);
  let shown = $state('even');
  let runs = $state(0);
  let countValue = $state(0);

  let count: Signal.State<number>;
  let parity: Signal.Computed<string>;
  let watcher: Signal.subtle.Watcher;
  let effectNode: Signal.Computed<void>;
  let lines: Entry[] = [];
  let needsFlush = false;
  const names = new WeakMap<object, string>();

  function push(e: Entry) {
    lines.push(e);
    log = [...lines];
  }

  function build() {
    lines = [];
    needsFlush = false;
    runs = 0;
    scheduled = false;
    count = new Signal.State(0);
    parity = new Signal.Computed(() => (count.get() % 2 === 0 ? 'even' : 'odd'));
    names.set(parity, 'parity');
    effectNode = new Signal.Computed(() => {
      shown = parity.get();
      runs++;
      push({ kind: 'run', text: `the effect body ran: parity is “${shown}”` });
    });
    names.set(effectNode, 'effect');
    watcher = new Signal.subtle.Watcher(() => {
      // Called synchronously inside count.set(). It must not read or write a signal: it can only schedule.
      push({ kind: 'notify', text: 'the Watcher’s notify() was called, synchronously, inside the write' });
      if (!needsFlush) {
        needsFlush = true;
        scheduled = true;
        push({ kind: 'info', text: 'it queued one flush (“microtask”); a second notify would not queue another' });
      }
    });
    watcher.watch(effectNode);
    effectNode.get(); // run once, as `effect()` does
    countValue = count.get();
    pending = watcher.getPending().length;
  }
  build();

  function write(delta: number) {
    const before = count.get();
    push({ kind: 'write', text: `count.set(${before + delta})` });
    count.set(before + delta);
    countValue = count.get();
    pending = watcher.getPending().length;
  }
  function flush() {
    needsFlush = false;
    scheduled = false;
    const p = watcher.getPending();
    push({ kind: 'flush', text: `flush: watcher.getPending() = [${p.map((x) => names.get(x) ?? '?').join(', ')}]` });
    const before = runs;
    for (const s of p) s.get();
    if (runs === before) push({ kind: 'skip', text: 'the effect did not run: what it read (parity) did not change' });
    watcher.watch(); // re-arm: a Watcher notifies once until it is re-watched
    pending = watcher.getPending().length;
  }
  function reset() {
    watcher?.unwatch(effectNode);
    build();
  }
</script>

<Widget {title} {n} {caption} kind="Experiment" subtitle="count (State) → parity (Computed) → an effect built from a Watcher. The real TC39 polyfill, with scheduling done by hand.">
  <div class="graph ui">
    <span class="node s">count = {countValue}</span><span class="arr">→</span><span class="node c">parity</span><span class="arr">→</span><span class="node e">effect <small>shows “{shown}”, ran {runs}×</small></span>
    <span class="arr">⟵</span><span class="node w" class:hot={scheduled}>Watcher {#if scheduled}<small>flush queued</small>{:else}<small>armed</small>{/if}</span>
  </div>

  <div class="actions ui">
    <Button variant="primary" size="sm" onclick={() => write(1)}>count + 1</Button>
    <Button variant="primary" size="sm" onclick={() => write(2)}>count + 2</Button>
    <Button size="sm" onclick={flush} disabled={!scheduled}>Run the queued flush ({pending} pending)</Button>
    <Button size="sm" variant="ghost" onclick={reset}>Reset</Button>
  </div>

  <ol class="log ui" aria-live="polite" aria-label="What happened, in order">
    {#each log as e, i (i)}<li class={e.kind}>{e.text}</li>{/each}
    {#if !log.length}<li class="info">Press a button.</li>{/if}
  </ol>
</Widget>

<style>
  .graph {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem;
    margin-bottom: 0.7rem;
    font-size: 0.84rem;
  }
  .node {
    font-family: var(--font-mono);
    border: 1.5px solid var(--node-line);
    border-radius: 7px;
    padding: 0.2rem 0.55rem;
    background: var(--panel);
  }
  .node small {
    font-family: var(--font-ui, inherit);
    color: var(--ink-2);
  }
  .node.s { border-color: var(--signal); }
  .node.c { border-color: var(--computed); }
  .node.e { border-color: var(--effect); }
  .node.w { border-style: dashed; }
  .node.w.hot { border-color: var(--flash); background: var(--flash-soft); }
  .arr { color: var(--mute); }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-bottom: 0.7rem;
  }
  .log {
    margin: 0;
    padding: 0.5rem 0.6rem 0.5rem 1.8rem;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--panel);
    font-size: 0.82rem;
    max-height: 16rem;
    overflow: auto;
  }
  .log li { padding-block: 0.08rem; }
  .log li.write { font-weight: 600; }
  .log li.notify { color: var(--flash); }
  .log li.run { color: var(--effect); font-weight: 600; }
  .log li.skip { color: var(--signal); }
  .log li.info { color: var(--mute); }
</style>
