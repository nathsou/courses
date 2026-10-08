<!--
  Resurrection: an object with a finaliser goes through a collector in stages. The first collection that finds it
  unreachable cannot free it, because its finaliser must run first: it is queued, and everything it points to
  stays alive with it. The finaliser runs, and may store `this` somewhere reachable: the object comes back. A
  later collection frees it without running the finaliser again.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import ObjectGraph, { type GNode, type GEdge, type GRoot } from '$lib/components/graph/ObjectGraph.svelte';

  let resurrect = $state(true);
  let step = $state(0);

  type S = 'reachable' | 'unreachable' | 'queued' | 'finalised' | 'freed';
  interface Frame {
    file: S;
    buffer: S;
    f: boolean;
    zombies: boolean;
    queue: boolean;
    text: string;
    code: string;
  }
  const frames = $derived.by<Frame[]>(() => {
    const out: Frame[] = [
      { file: 'reachable', buffer: 'reachable', f: true, zombies: false, queue: false, code: 'f = new File(buffer)', text: 'A File object with a finaliser, holding a large Buffer. The variable f points to it.' },
      { file: 'unreachable', buffer: 'unreachable', f: false, zombies: false, queue: false, code: 'f = null', text: 'The program drops its last pointer to the File. Nothing can reach it, or its Buffer.' },
      { file: 'queued', buffer: 'queued', f: false, zombies: false, queue: true, code: '// collection 1', text: 'Collection 1 finds the File unreachable, but it has a finaliser that has never run. The collector cannot free it: it puts the File on the finaliser queue instead, which makes it reachable again, and its Buffer with it. Nothing is freed.' },
    ];
    if (resurrect) {
      out.push({ file: 'finalised', buffer: 'reachable', f: false, zombies: true, queue: false, code: 'finalise(): zombies.add(this)', text: 'The finaliser runs, on some thread, at some time. This one stores `this` in a global list: the File is reachable again. It has been resurrected, and it is now marked as finalised.' });
      out.push({ file: 'finalised', buffer: 'reachable', f: false, zombies: true, queue: false, code: '// collection 2', text: 'Collection 2 finds the File reachable from zombies, so it survives, with its Buffer. The program can even use it, although it has already been “closed”.' });
      out.push({ file: 'unreachable', buffer: 'unreachable', f: false, zombies: false, queue: false, code: 'zombies.clear()', text: 'Later the program clears the list. The File is unreachable again.' });
      out.push({ file: 'freed', buffer: 'freed', f: false, zombies: false, queue: false, code: '// collection 3', text: 'Collection 3 finds it unreachable and already finalised. Its finaliser will not run again, so this time it is freed, Buffer and all. It took three collections.' });
    } else {
      out.push({ file: 'finalised', buffer: 'unreachable', f: false, zombies: false, queue: false, code: 'finalise(): close the file', text: 'The finaliser runs, on some thread, at some time, and closes the file. The File is marked as finalised and is unreachable again.' });
      out.push({ file: 'freed', buffer: 'freed', f: false, zombies: false, queue: false, code: '// collection 2', text: 'Collection 2 finds it unreachable and already finalised, and frees it with its Buffer. Even without resurrection, a finalisable object needs two collections to die, and keeps everything it points to alive for the first.' });
    }
    return out;
  });
  $effect(() => {
    void resurrect;
    step = 0;
  });
  const cur = $derived(frames[Math.min(step, frames.length - 1)]!);
  const st = (s: S): GNode['state'] => (s === 'freed' ? 'freed' : s === 'unreachable' ? 'garbage' : s === 'queued' ? 'purple' : s === 'finalised' ? 'grey' : 'live');
  const nodes = $derived<GNode[]>([
    { id: 0, col: 0, row: 0, title: 'File', sub: cur.file, state: st(cur.file) },
    { id: 1, col: 1, row: 0, title: 'Buffer (1 MB)', sub: cur.buffer, state: st(cur.buffer) },
  ]);
  const edges = $derived<GEdge[]>([{ from: 0, to: 1, dead: cur.file === 'freed' }]);
  const roots = $derived<GRoot[]>([
    { name: 'f', row: 0, to: cur.f ? 0 : undefined },
    { name: 'zombies', row: 1, to: cur.zombies ? 0 : undefined },
    { name: 'queue', row: 2, to: cur.queue ? 0 : undefined },
  ]);
</script>

<Widget title="Back from the dead" kind="Step through" n="27.1" caption="Purple: on the finaliser queue. Grey: finalised. Dashed: unreachable or freed. The roots are a local variable, a global list, and the collector’s own finaliser queue.">
  <div class="ctl ui">
    <button class="primary" onclick={() => (step = step >= frames.length - 1 ? 0 : step + 1)}>{step >= frames.length - 1 ? '↺ Start again' : '▶ Next'}</button>
    <span class="n">{step + 1} of {frames.length}</span>
    <label><input type="checkbox" bind:checked={resurrect} /> The finaliser stores <code>this</code> in a global list</label>
  </div>
  <pre class="code mono">{cur.code}</pre>
  <p class="text ui" aria-live="polite">{cur.text}</p>
  <div class="g"><ObjectGraph {nodes} {edges} {roots} /></div>
</Widget>

<style>
  .ctl {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    align-items: center;
    font-size: 0.82rem;
  }
  button {
    font: inherit;
    border: 1px solid var(--copper);
    background: var(--copper);
    color: var(--on-accent);
    font-weight: 600;
    border-radius: 99px;
    padding: 0.2rem 0.85rem;
    cursor: pointer;
  }
  .n {
    color: var(--mute);
  }
  .code {
    font-size: 0.8rem;
    margin: 0.6rem 0 0.3rem;
    padding: 0.3rem 0.6rem;
    border: 1px solid var(--line);
    border-radius: 6px;
    background: var(--panel);
  }
  .text {
    min-height: 3.4rem;
    font-size: 0.88rem;
    margin: 0.3rem 0 0.5rem;
  }
  .g {
    max-width: 520px;
  }
</style>
