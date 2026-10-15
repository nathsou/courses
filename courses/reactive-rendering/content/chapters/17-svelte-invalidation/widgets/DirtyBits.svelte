<!--
  Svelte 3/4: the compiler numbers the component's variables and writes an update function of bit tests. Press a
  button: the assignment invalidates one variable (a bit), a flush runs `p` once, and only the blocks whose bits are
  set execute. The component is the real compiler output (4.2.19) running on the lab's runtime.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import LensPane from '$lib/components/lens/LensPane.svelte';
  import { Lens } from '$lib/components/lens/lens.svelte';
  import { createDocument, type MElement } from '$lib/rx/dom';
  import { counterComponent, createSvelte4, type Internals } from '$lib/rx/svelte4';
  import compiled from '../../../../docs/captured/svelte4.counter.js?raw';

  let { n, title = 'Dirty bits', caption }: { n?: string | number; title?: string; caption?: string } = $props();

  const SOURCE = `<script>
  let count = 0;
  $: double = count * 2;
<\/script>

<div class="counter">
  <h1>Counter</h1>
  <p class:big={count > 5}>Count: {count} (double {double})</p>
  <button on:click={() => count += 1}>+1</button>
</div>`;

  // Cut the update function out of the real compiler output.
  const excerpt = (() => {
    const m = /\n\t\tp\(ctx, \[dirty\]\) \{\n([\s\S]*?)\n\t\t\},\n\t\ti: noop/.exec(compiled);
    const body = m ? m[1]! : '';
    const lines = body.split('\n').map((l) => l.replace(/^\t\t\t/, ''));
    let bit = 0;
    return lines.map((text) => {
      const b = /dirty & \/\*(\w+)\*\/ (\d+)/.exec(text);
      if (b) bit = Number(b[2]);
      if (text.trim() === '') bit = 0;
      return { text, bit };
    });
  })();
  const VARS = ['count', 'double'];

  let rt: Internals;
  let lens = $state.raw<Lens | null>(null);
  let root = $state.raw<MElement | null>(null);
  let host: MElement;
  let button: MElement;
  let mask = $state(0);
  let flushes = $state(0);
  let invalidations = $state(0);
  let ranBits = $state(0);
  let queued = $state(0);

  function reset() {
    lens?.destroy();
    const doc = createDocument();
    host = doc.createElement('div');
    doc.body.appendChild(host);
    const l = new Lens(doc);
    rt = createSvelte4(doc, { manual: true });
    rt.onUpdate = (dirty) => {
      mask = dirty[0]!;
      ranBits = dirty[0]!;
    };
    const Counter = counterComponent(rt);
    l.act(() => void new Counter({ target: host }));
    button = host.querySelector('button')!;
    lens = l;
    root = host;
    mask = 0;
    ranBits = 0;
    flushes = 0;
    invalidations = 0;
    queued = 0;
  }
  reset();

  function sync() {
    flushes = rt.stats.flushes - 1; // the first flush is the mount
    invalidations = rt.stats.invalidations;
  }
  /** Click the button `times` times in one tick, then let the microtask flush run. */
  function click(times: number) {
    lens?.act(() => {
      ranBits = 0;
      mask = 0;
      for (let i = 0; i < times; i++) button.click();
      queued = times;
      rt.flush();
    });
    sync();
  }
  const bin = (v: number) => v.toString(2).padStart(2, '0');
</script>

<Widget {title} {n} {caption} kind="Experiment" subtitle="The real Svelte 4.2 output for this component. Each variable is a bit; assignments set bits; the update function tests them.">
  <div class="cols">
    <div>
      <div class="h ui">Counter.svelte</div>
      <pre class="code"><code>{SOURCE}</code></pre>
    </div>
    <div>
      <div class="h ui">Compiled: the update function <code>p</code></div>
      <pre class="code upd"><code>{#each excerpt as l, i (i)}<span class="ln" class:ran={l.bit !== 0 && (ranBits & l.bit) !== 0} class:skip={l.bit !== 0 && (ranBits & l.bit) === 0 && mask !== 0}>{l.text || ' '}</span>{/each}</code></pre>
      <p class="vars ui">Bits: {#each VARS as v, i (v)}<code>{v} = {1 << i}</code>{#if i < VARS.length - 1}, {/if}{/each}</p>
    </div>
  </div>

  <div class="actions ui">
    <Button variant="primary" size="sm" onclick={() => click(1)}>Click +1</Button>
    <Button variant="primary" size="sm" onclick={() => click(3)}>Click three times in one tick</Button>
    <Button variant="ghost" size="sm" onclick={reset}>Reset</Button>
  </div>

  <p class="out ui" aria-live="polite">
    dirty mask of the last flush: <code>0b{bin(mask)}</code> ({VARS.filter((_, i) => mask & (1 << i)).join(' + ') || 'nothing yet'}) ·
    <b>{invalidations}</b> invalidations in <b>{flushes}</b> flush{flushes === 1 ? '' : 'es'}.
  </p>

  {#if lens && root}<LensPane {lens} {root} title="The page" note="One flush = one run of p, however many assignments." />{/if}
</Widget>

<style>
  .cols {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(19rem, 1fr));
    gap: 0.8rem;
  }
  .h {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--mute);
    margin-bottom: 0.3rem;
  }
  .code {
    margin: 0;
    padding: 0.6rem 0.8rem;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--panel);
    font-size: 0.78rem;
    overflow-x: auto;
    line-height: 1.5;
    tab-size: 2;
  }
  .ln {
    display: block;
    white-space: pre;
    padding-inline: 0.25rem;
    border-radius: 3px;
  }
  .ln.ran {
    background: var(--flash-soft);
    box-shadow: inset 3px 0 0 var(--flash);
  }
  .ln.skip {
    opacity: 0.45;
  }
  .vars {
    font-size: 0.78rem;
    color: var(--ink-2);
    margin: 0.4rem 0 0;
  }
  .vars code {
    margin-right: 0.2rem;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin: 0.8rem 0 0.5rem;
  }
  .out {
    font-size: 0.84rem;
    color: var(--ink-2);
    margin: 0 0 0.8rem;
  }
</style>
