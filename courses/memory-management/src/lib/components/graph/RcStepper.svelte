<!--
  The reference-counting stepper (chapters 18 and 19): a Mote program runs under reference counting, one statement
  at a time. Variables are on the left, objects are cards with their counts in the corner, pointers are arrows.
  Counts that changed in the last statement flash, and the log explains each increment, decrement and free,
  including the cascades that a single decrement can set off.
  `:::rc-stepper{title="…" n="18.1" setting="rc"}` with a ```mote block inside.
-->
<script lang="ts">
  import Widget from '../ui/Widget.svelte';
  import CodeEditor from '$lib/exercise/CodeEditor.svelte';
  import ObjectGraph, { type GNode, type GEdge, type GRoot } from './ObjectGraph.svelte';
  import { Vm, DATA_BASE, FIELDS } from '$lib/mm/mote/vm';
  import { compile } from '$lib/mm/mote/compile';
  import { makeManager, type Setting } from '$lib/mm/managers/managers';

  let { code, title = 'Counting references', caption, n, setting = 'rc' }: { code: string; title?: string; caption?: string; n?: string; setting?: Setting } = $props();

  interface Snap {
    ran?: number;
    roots: { name: string; to?: number }[];
    live: Map<number, { count: number; edges: { to: number; weak: boolean }[]; sub: string }>;
    freed: Map<number, string>;
    out: number;
  }

  function observe(vm: Vm, freedSoFar: Map<number, string>): Omit<Snap, 'ran'> {
    const roots: Snap['roots'] = [];
    for (const f of vm.frames) {
      if (f.fn.name === '$init') continue;
      const prefix = f.fn.name === 'main' ? '' : `${f.fn.name}.`;
      f.fn.locals.forEach((l, i) => {
        if (!l.ptr || l.name.startsWith('$')) return;
        const v = vm.stack.peek(vm.slotAddr(f, i));
        roots.push({ name: `${prefix}${l.name}`, to: vm.byAddr.get(v) });
      });
    }
    vm.c.globals.forEach((g, i) => {
      if (g.ptr) roots.push({ name: g.name, to: vm.byAddr.get(vm.data.peek(DATA_BASE + i * 8)) });
    });
    const live: Snap['live'] = new Map();
    for (const [addr, id] of vm.byAddr) {
      const t = vm.typeOf(addr);
      const edges: { to: number; weak: boolean }[] = [];
      const ints: string[] = [];
      if (t.kind === 'struct') {
        t.fields.forEach((fd, i) => {
          const v = vm.heap.peek(addr + FIELDS + i * 8);
          if (fd.ptr) {
            const to = vm.byAddr.get(v);
            if (to !== undefined) edges.push({ to, weak: fd.weak });
          } else if (ints.length < 2) ints.push(`${fd.name} ${v}`);
        });
      } else {
        for (const s of vm.pointerSlots(addr)) {
          const to = vm.byAddr.get(vm.heap.peek(s));
          if (to !== undefined) edges.push({ to, weak: false });
        }
      }
      live.set(id, { count: vm.heap.peek(addr + 8), edges, sub: ints.join(', ') });
    }
    return { roots, live, freed: new Map(freedSoFar), out: vm.output.length };
  }

  const run = $derived.by(() => {
    let vm: Vm;
    try {
      vm = new Vm(compile(code), makeManager(setting, { rcThreshold: 0 }), { heapBytes: 1 << 18 });
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e), snaps: [] as Snap[], vm: undefined };
    }
    while (vm.frames.length && vm.top.fn.name === '$init' && vm.step());
    const freed = new Map<number, string>();
    let seen = 0;
    const note = () => {
      for (const e of vm.events.slice(seen)) if (e.kind === 'free') freed.set(e.id, e.by);
      seen = vm.events.length;
    };
    const snaps: Snap[] = [observe(vm, freed)];
    let guard = 0;
    while (vm.status !== 'done' && vm.status !== 'error' && guard++ < 200) {
      const ran = vm.currentPos()?.line;
      vm.stepStatement();
      // Counts that reached zero are processed at the statement boundary; do it now, so that the frees are shown
      // with the statement that caused them rather than the next one.
      if (!['done', 'error'].includes(vm.status as string)) vm.manager.onStatement?.();
      note();
      snaps.push({ ran, ...observe(vm, freed) });
    }
    return { error: '', snaps, vm };
  });

  // Stable layout, taken from the moment with the most live objects: an object's column is its distance from the
  // variables, its row the order in which a breadth-first walk meets it. Objects never alive at that moment are
  // placed where they first appear, in the first free cell of their column.
  const layout = $derived.by(() => {
    const col = new Map<number, number>();
    const row = new Map<number, number>();
    const rootRow = new Map<string, number>();
    for (const s of run.snaps) for (const r of s.roots) if (!rootRow.has(r.name)) rootRow.set(r.name, rootRow.size);
    const used = new Set<string>();
    const place = (id: number, c: number, r: number) => {
      while (used.has(`${c}:${r}`)) r++;
      col.set(id, c);
      row.set(id, r);
      used.add(`${c}:${r}`);
    };
    const visit = (s: Snap) => {
      const depth = new Map<number, number>();
      const order: number[] = [];
      const queue: number[] = [];
      for (const r of s.roots) {
        if (r.to !== undefined && !depth.has(r.to)) {
          depth.set(r.to, 0);
          queue.push(r.to);
          if (!col.has(r.to)) place(r.to, 0, rootRow.get(r.name) ?? 0);
        }
      }
      while (queue.length) {
        const o = queue.shift()!;
        order.push(o);
        for (const e of s.live.get(o)?.edges ?? []) {
          if (depth.has(e.to)) continue;
          depth.set(e.to, depth.get(o)! + 1);
          queue.push(e.to);
          if (!col.has(e.to)) place(e.to, depth.get(o)! + 1, row.get(o) ?? 0);
        }
      }
      for (const id of s.live.keys()) if (!col.has(id)) place(id, 0, 0);
    };
    const busiest = run.snaps.reduce((best, s) => (s.live.size > best.live.size ? s : best), run.snaps[0] ?? ({ live: new Map() } as Snap));
    if (run.snaps.length) visit(busiest);
    for (const s of run.snaps) visit(s);
    return { col, row, rootRow };
  });

  let at = $state(0);
  let playing = $state(false);
  const snap = $derived(run.snaps[Math.min(at, run.snaps.length - 1)]);
  const prev = $derived(at > 0 ? run.snaps[at - 1] : undefined);

  const typeOf = (id: number) => {
    const r = run.vm!.objects.get(id)!;
    const t = run.vm!.c.types[r.type]!;
    return t.kind === 'array' ? 'array' : t.name;
  };

  const graph = $derived.by(() => {
    if (!snap) return { nodes: [] as GNode[], edges: [] as GEdge[], roots: [] as GRoot[] };
    const nodes: GNode[] = [];
    const edges: GEdge[] = [];
    for (const [id, o] of snap.live) {
      const before = prev?.live.get(id)?.count;
      nodes.push({ id, col: layout.col.get(id) ?? 0, row: layout.row.get(id) ?? 0, title: `#${id} ${typeOf(id)}`, sub: o.sub, badge: String(o.count), flash: before !== undefined && before !== o.count, state: 'live' });
      for (const e of o.edges) edges.push({ from: id, to: e.to, weak: e.weak });
    }
    // Objects freed by this very statement stay visible as ghosts.
    for (const [id] of snap.freed) {
      if (prev && !prev.freed.has(id) && prev.live.has(id)) {
        nodes.push({ id, col: layout.col.get(id) ?? 0, row: layout.row.get(id) ?? 0, title: `#${id} ${typeOf(id)}`, sub: 'freed', badge: '0', state: 'freed' });
        for (const e of prev.live.get(id)!.edges) edges.push({ from: id, to: e.to, dead: true });
      }
    }
    const roots: GRoot[] = snap.roots.map((r) => ({ name: r.name, row: layout.rootRow.get(r.name) ?? 0, to: r.to }));
    return { nodes, edges, roots };
  });

  const log = $derived.by(() => {
    if (!snap || !prev) return [] as string[];
    const lines: string[] = [];
    for (const [id, o] of snap.live) {
      const b = prev.live.get(id);
      if (!b) lines.push(`#${id} ${typeOf(id)} is allocated; count ${o.count}.`);
      else if (b.count !== o.count) lines.push(`#${id}: count ${b.count} → ${o.count} (${o.count > b.count ? 'a new pointer to it' : 'a pointer to it went away'}).`);
    }
    const freedNow = [...snap.freed].filter(([id]) => !prev.freed.has(id));
    if (freedNow.length) {
      const why = freedNow[0]![1];
      lines.push(`Freed: ${freedNow.map(([id]) => `#${id}`).join(', ')} (${why}).${freedNow.length > 1 && why.startsWith('count') ? ' One count reaching zero released the pointers inside it, and so on down: a cascade.' : ''}`);
    }
    return lines;
  });
  const output = $derived(run.vm && snap ? run.vm.output.slice(0, snap.out) : []);
  const finished = $derived(at >= run.snaps.length - 1);

  let timer: ReturnType<typeof setInterval> | undefined;
  function play() {
    if (playing) {
      clearInterval(timer);
      playing = false;
      return;
    }
    if (finished) at = 0;
    playing = true;
    timer = setInterval(() => {
      if (at >= run.snaps.length - 1) {
        clearInterval(timer);
        playing = false;
      } else at++;
    }, 700);
  }
  $effect(() => () => clearInterval(timer));
  const leftover = $derived(run.vm && finished ? [...run.vm.objects.values()].filter((o) => o.freed === undefined) : []);
</script>

<Widget {title} {caption} {n} kind="Reference counting">
  {#if run.error}
    <p class="bad ui">{run.error}</p>
  {:else}
    <div class="grid">
      <div>
        <CodeEditor value={code} lang="mote" readonly minLines={6} maxHeight="22rem" highlightLine={snap?.ran} label="The program" />
        <div class="ctl ui">
          <button class="primary" onclick={play}>{playing ? '❚❚ Pause' : finished ? '↺ Replay' : '▶ Play'}</button>
          <button onclick={() => (at = Math.max(0, at - 1))} disabled={at === 0} aria-label="Step back">◀</button>
          <button onclick={() => (at = Math.min(run.snaps.length - 1, at + 1))} disabled={finished} aria-label="Step forward">▶</button>
          <input type="range" min="0" max={run.snaps.length - 1} bind:value={at} aria-label="Statement" />
        </div>
      </div>
      <div>
        <ul class="log ui" aria-live="polite">
          {#if snap?.ran}<li class="head">Line {snap.ran}</li>{/if}
          {#each log as l, i (i)}<li>{l}</li>{:else}<li class="mute">{at === 0 ? 'Press play, or step with the arrows.' : 'No counts changed.'}</li>{/each}
          {#if finished && leftover.length}<li class="bad">The program has ended, and {leftover.length} object{leftover.length === 1 ? ' was' : 's were'} never freed: {leftover.map((o) => `#${o.id}`).join(', ')}.</li>{/if}
        </ul>
        {#if output.length}<pre class="out mono">{output.join('\n')}</pre>{/if}
      </div>
    </div>
    <div class="graph-wrap">
      <ObjectGraph nodes={graph.nodes} edges={graph.edges} roots={graph.roots} />
    </div>
  {/if}
</Widget>

<style>
  .grid {
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
    gap: 1rem;
    align-items: start;
  }
  @media (max-width: 800px) {
    .grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .ctl {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    align-items: center;
    margin-top: 0.6rem;
    font-size: 0.8rem;
  }
  .ctl input[type='range'] {
    flex: 1;
    min-width: 6rem;
  }
  button {
    font: inherit;
    border: 1px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
    border-radius: 99px;
    padding: 0.2rem 0.7rem;
    cursor: pointer;
  }
  button.primary {
    background: var(--copper);
    border-color: var(--copper);
    color: var(--on-accent);
    font-weight: 600;
  }
  button:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .graph-wrap {
    margin-top: 0.9rem;
    padding-top: 0.6rem;
    border-top: 1px dashed var(--line);
    overflow-x: auto;
  }
  .out {
    margin: 0.6rem 0 0;
    padding: 0.45rem 0.6rem;
    border: 1px solid var(--line);
    border-radius: 6px;
    background: var(--panel);
    font-size: 0.76rem;
  }
  .log {
    list-style: none;
    margin: 0;
    padding: 0;
    font-size: 0.8rem;
    display: grid;
    gap: 0.25rem;
    min-height: 4.5rem;
  }
  .log li {
    padding-left: 0.6rem;
    border-left: 3px solid var(--copper);
  }
  .log li.head {
    border: 0;
    padding: 0;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-2);
  }
  .log li.mute {
    border-color: var(--line);
    color: var(--mute);
  }
  .log li.bad,
  .bad {
    color: var(--uaf);
    border-color: var(--uaf);
  }
</style>
