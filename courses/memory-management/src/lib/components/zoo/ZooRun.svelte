<!--
  The zoo (chapter 15): a Mote program runs under manual memory management with no checks, as C would, on the
  size-class allocator. Step through it statement by statement: every heap block is drawn with whoever occupies
  it (two occupants after a double free; a new occupant after reuse), freed blocks show the free-list pointer
  the allocator wrote into them, and the oracle's log explains each memory error as it happens. With `checks`,
  the reader can turn the course's checks on and watch the same program stop at the first error.
  `:::zoo-run{title="…" n="15.1" checks leaks}` with a ```mote block inside (`leaks` lists unfreed objects at exit).
-->
<script lang="ts">
  import Widget from '../ui/Widget.svelte';
  import CodeEditor from '$lib/exercise/CodeEditor.svelte';
  import { Vm, FIELDS, type VmEvent } from '$lib/mm/mote/vm';
  import { compile, fnFromAddress, type Compiled, type TypeInfo } from '$lib/mm/mote/compile';
  import { ManualManager } from '$lib/mm/managers/managers';
  import { hex } from '$lib/mm/util/format';

  let { code, title = 'The zoo', caption, n, checks = false, leaks = false }: { code: string; title?: string; caption?: string; n?: string; checks?: boolean; leaks?: boolean } = $props();

  interface Field {
    name: string;
    value: string;
    addr: number;
    hit?: boolean;
  }
  interface Occupant {
    id: number;
    type: string;
    live: boolean;
    fields: Field[];
  }
  interface BlockView {
    addr: number;
    bytes: number;
    occupants: Occupant[];
    freeNext?: number;
    lastDead?: Occupant;
  }
  interface Snap {
    line?: number;
    out: number;
    ev: number;
    blocks: BlockView[];
  }

  let checked = $state(false);
  let at = $state(0);
  let playing = $state(false);

  function fmt(c: Compiled, t: TypeInfo['fields'][number]['type'] | undefined, v: number): string {
    if (!t) return String(v);
    if (t.k === 'bool') return v === 1 ? 'true' : v === 0 ? 'false' : `${v} (not a bool)`;
    if (t.k === 'fn') {
      const id = fnFromAddress(v);
      return id > 0 && c.fns[id] ? `→ ${c.fns[id]!.name}` : `${hex(v)} (not a function)`;
    }
    if (t.k === 'struct' || t.k === 'array' || t.k === 'null') return v ? hex(v) : 'null';
    return String(v);
  }

  function occupant(vm: Vm, id: number, hits: Set<number>): Occupant {
    const r = vm.objects.get(id)!;
    const t = vm.c.types[r.type]!;
    const live = r.freed === undefined;
    const fields: Field[] = [];
    if (t.kind === 'array') {
      const len = r.words - 3;
      fields.push({ name: 'length', value: String(len), addr: r.addr + FIELDS });
      for (let i = 0; i < len; i++) {
        const a = r.addr + FIELDS + 8 + i * 8;
        fields.push({ name: `[${i}]`, value: fmt(vm.c, t.elem, vm.heap.peek(a)), addr: a, hit: hits.has(a) });
      }
    } else {
      t.fields.forEach((f, i) => {
        const a = r.addr + FIELDS + i * 8;
        fields.push({ name: f.name, value: fmt(vm.c, f.type, vm.heap.peek(a)), addr: a, hit: hits.has(a) });
      });
    }
    return { id, type: t.kind === 'array' ? 'array' : t.name, live, fields };
  }

  function snapshot(vm: Vm, hits: Set<number>): Snap {
    const byAddr = new Map<number, number[]>();
    for (const r of vm.objects.values()) {
      const list = byAddr.get(r.addr) ?? [];
      list.push(r.id);
      byAddr.set(r.addr, list);
    }
    const blocks: BlockView[] = [...byAddr.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([addr, ids]) => {
        const recs = ids.map((i) => vm.objects.get(i)!);
        const liveIds = recs.filter((r) => r.freed === undefined).map((r) => r.id);
        const dead = recs.filter((r) => r.freed !== undefined).sort((a, b) => b.freed! - a.freed!)[0];
        const occupants = liveIds.map((i) => occupant(vm, i, hits));
        return {
          addr,
          bytes: Math.max(...recs.map((r) => r.words)) * 8,
          occupants,
          freeNext: occupants.length ? undefined : vm.heap.peek(addr),
          lastDead: dead ? occupant(vm, dead.id, hits) : undefined,
        };
      });
    return { line: vm.status === 'done' || vm.status === 'error' ? undefined : vm.currentPos()?.line, out: vm.output.length, ev: vm.events.length, blocks };
  }

  function simulate(src: string, withChecks: boolean) {
    let vm: Vm;
    try {
      vm = new Vm(compile(src), new ManualManager(undefined, { checked: withChecks }), { heapBytes: 1 << 16 });
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e), snaps: [] as Snap[], vm: undefined };
    }
    while (vm.frames.length && vm.top.fn.name === '$init' && vm.step());
    const hits = new Set<number>();
    const snaps: Snap[] = [snapshot(vm, hits)];
    let guard = 0;
    while (vm.status !== 'done' && vm.status !== 'error' && guard++ < 400) {
      const before = vm.events.length;
      vm.stepStatement();
      for (const e of vm.events.slice(before)) if (e.kind === 'overflow' && e.write) hits.add(e.addr);
      snaps.push(snapshot(vm, hits));
    }
    if (vm.status !== 'done' && vm.status !== 'error') vm.run(200_000);
    if (snaps.length > 400) snaps.splice(1, snaps.length - 400);
    return { error: '', snaps, vm };
  }

  const sim = $derived(simulate(code, checked));
  $effect(() => {
    void sim;
    at = 0;
  });
  const snap = $derived(sim.snaps[Math.min(at, sim.snaps.length - 1)]);
  const vm = $derived(sim.vm);
  const finished = $derived(at === sim.snaps.length - 1);

  function typeName(id: number) {
    const r = vm?.objects.get(id);
    return r && vm ? (vm.c.types[r.type]!.kind === 'array' ? 'array' : vm.c.types[r.type]!.name) : '?';
  }
  function owner(addr: number): string {
    if (!vm) return '';
    for (const r of vm.objects.values()) if (r.freed === undefined && addr >= r.addr && addr < r.addr + r.words * 8) return `#${r.id} (${typeName(r.id)})`;
    return 'memory no object owns';
  }

  interface Line {
    kind: 'bad' | 'warn' | 'info';
    text: string;
  }
  function explain(e: VmEvent): Line | undefined {
    switch (e.kind) {
      case 'uaf':
        if (e.was < 0) return { kind: 'bad', text: `Line ${e.pos.line} uses a pointer into reused memory, now inside #${e.now} (${typeName(e.now!)}).` };
        if (e.now !== undefined) return { kind: 'bad', text: `Line ${e.pos.line} uses a dangling pointer to #${e.was} (${typeName(e.was)}). Its memory now holds #${e.now}, a ${typeName(e.now)}: type confusion.` };
        return { kind: 'bad', text: `Line ${e.pos.line} ${e.write ? 'writes to' : 'reads'} #${e.was} (${typeName(e.was)}), which has been freed: use after free.` };
      case 'double-free':
        return { kind: 'bad', text: `Line ${e.pos.line} frees #${e.was} a second time: double free. Its block is now on the free list twice.` };
      case 'invalid-free':
        return { kind: 'bad', text: `Line ${e.pos.line} frees ${hex(e.addr)}, which malloc never returned: invalid free.` };
      case 'overflow': {
        const past = (e.index - e.length + 1) * 8;
        return { kind: 'bad', text: `Line ${e.pos.line} ${e.write ? 'writes' : 'reads'} element ${e.index} of an array of length ${e.length}${e.index >= e.length ? `, ${past} bytes past its end` : ''}, in ${owner(e.addr)}: ${e.write ? 'heap overflow' : 'over-read'}.` };
      }
      case 'note':
        return { kind: 'warn', text: e.text };
      default:
        return undefined;
    }
  }
  const log = $derived.by(() => {
    if (!vm || !snap) return [] as Line[];
    const lines = vm.events
      .slice(0, snap.ev)
      .map(explain)
      .filter((l): l is Line => !!l);
    // Collapse runs of identical overflow messages for long loops.
    const out: Line[] = [];
    for (const l of lines) if (!out.length || out[out.length - 1]!.text !== l.text) out.push(l);
    if (leaks && finished && vm.status === 'done') {
      for (const r of vm.objects.values()) {
        if (r.freed === undefined && r.unreachable !== undefined) out.push({ kind: 'warn', text: `#${r.id} (${typeName(r.id)}), allocated on line ${r.bornPos.line}, was never freed and nothing points to it: a leak.` });
      }
    }
    if (finished && vm.status === 'error') out.push({ kind: 'info', text: `Checks stopped the program: ${vm.error?.message}` });
    return out.slice(-8);
  });
  const output = $derived(vm && snap ? vm.output.slice(0, snap.out) : []);

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
      if (at >= sim.snaps.length - 1) {
        clearInterval(timer);
        playing = false;
      } else at++;
    }, 550);
  }
  $effect(() => () => clearInterval(timer));
</script>

<Widget {title} {caption} {n} kind="The zoo">
  {#if sim.error}
    <p class="bad ui">{sim.error}</p>
  {:else}
    <div class="grid">
      <div>
        <CodeEditor value={code} lang="mote" readonly minLines={6} maxHeight="24rem" highlightLine={snap?.line} label="The program" />
        <div class="ctl ui">
          <button class="primary" onclick={play}>{playing ? '❚❚ Pause' : finished ? '↺ Replay' : '▶ Play'}</button>
          <button onclick={() => (at = Math.max(0, at - 1))} disabled={at === 0} aria-label="Step back">◀</button>
          <button onclick={() => (at = Math.min(sim.snaps.length - 1, at + 1))} disabled={finished} aria-label="Step forward">▶</button>
          <input type="range" min="0" max={sim.snaps.length - 1} bind:value={at} aria-label="Statement" />
          {#if checks}
            <label class="chk"><input type="checkbox" bind:checked /> Checks on</label>
          {/if}
        </div>
        <div class="out mono" aria-label="Output">
          {#each output as o, i (i)}<div>{o}</div>{:else}<div class="mute">(no output yet)</div>{/each}
        </div>
      </div>
      <div>
        <div class="lbl ui">The heap</div>
        <div class="blocks">
          {#each snap?.blocks ?? [] as b (b.addr)}
            <div class="block" class:free={!b.occupants.length} class:twice={b.occupants.length > 1} class:reused={b.occupants.length === 1 && b.lastDead}>
              <div class="bh mono"><span>{hex(b.addr)}</span><span class="ui">{b.occupants.length > 1 ? 'two objects, one block' : b.occupants.length ? '' : 'free'}</span></div>
              {#each b.occupants as o (o.id)}
                <div class="occ">
                  <div class="oname ui">#{o.id} {o.type}</div>
                  {#each o.fields as f (f.addr)}<div class="f mono" class:hit={f.hit}><span>{f.name}</span><span>{f.value}</span></div>{/each}
                </div>
              {/each}
              {#if !b.occupants.length}
                <div class="occ ghost">
                  {#if b.lastDead}<div class="oname ui">was #{b.lastDead.id} {b.lastDead.type}</div>{/if}
                  <div class="f mono meta"><span>free list next</span><span>{b.freeNext ? hex(b.freeNext) : 'null'}</span></div>
                  {#each (b.lastDead?.fields ?? []).slice(0, 4) as f (f.addr)}<div class="f mono stale" class:hit={f.hit}><span>{f.name}</span><span>{f.value}</span></div>{/each}
                </div>
              {:else if b.lastDead}
                <div class="was ui">reused: was #{b.lastDead.id} {b.lastDead.type}</div>
              {/if}
            </div>
          {:else}<p class="mute ui">Nothing allocated yet.</p>{/each}
        </div>
        <div class="lbl ui">What the oracle saw</div>
        <ul class="log ui">
          {#each log as l, i (i)}<li class={l.kind}>{l.text}</li>{:else}<li class="mute">Nothing yet.</li>{/each}
        </ul>
      </div>
    </div>
  {/if}
</Widget>

<style>
  .grid {
    display: grid;
    grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
    gap: 1rem;
  }
  @media (max-width: 760px) {
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
  .chk {
    display: flex;
    gap: 0.3rem;
    align-items: center;
  }
  .out {
    margin-top: 0.6rem;
    padding: 0.5rem 0.7rem;
    background: var(--code-bg, var(--panel));
    border: 1px solid var(--line);
    border-radius: 6px;
    font-size: 0.78rem;
    max-height: 9rem;
    overflow: auto;
  }
  .lbl {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-2);
    margin: 0 0 0.35rem;
  }
  .blocks {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    margin-bottom: 0.9rem;
  }
  .block {
    border: 1.5px solid var(--alloc);
    border-radius: 6px;
    min-width: 9.5rem;
    flex: 1 1 9.5rem;
    max-width: 14rem;
    font-size: 0.74rem;
    background: color-mix(in srgb, var(--alloc) 7%, transparent);
  }
  .block.free {
    border-style: dashed;
    border-color: var(--free);
    background: transparent;
  }
  .block.twice {
    border-color: var(--uaf);
    background: color-mix(in srgb, var(--uaf) 10%, transparent);
  }
  .block.reused {
    border-color: var(--violet, var(--alloc));
  }
  .bh {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.2rem 0.45rem;
    border-bottom: 1px solid var(--line);
    color: var(--ink-2);
  }
  .block.twice .bh .ui {
    color: var(--uaf);
    font-weight: 700;
  }
  .occ {
    padding: 0.25rem 0.45rem;
  }
  .occ + .occ {
    border-top: 1px dashed var(--line-strong);
  }
  .oname {
    font-weight: 700;
    margin-bottom: 0.1rem;
  }
  .ghost .oname {
    color: var(--mute);
    font-weight: 500;
  }
  .f {
    display: flex;
    justify-content: space-between;
    gap: 0.6rem;
  }
  .f.meta {
    color: var(--meta);
  }
  .f.stale {
    color: var(--mute);
  }
  .f.hit {
    background: color-mix(in srgb, var(--uaf) 22%, transparent);
    color: var(--uaf);
    font-weight: 600;
  }
  .was {
    padding: 0.15rem 0.45rem 0.25rem;
    color: var(--mute);
    font-size: 0.7rem;
  }
  .log {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 0.3rem;
    font-size: 0.8rem;
  }
  .log li {
    padding: 0.3rem 0.55rem;
    border-left: 3px solid var(--line-strong);
    background: var(--panel);
    border-radius: 0 4px 4px 0;
  }
  .log li.bad {
    border-color: var(--uaf);
  }
  .log li.warn {
    border-color: var(--leak, var(--copper));
  }
  .log li.info {
    border-color: var(--green);
  }
  .mute {
    color: var(--mute);
  }
  .bad {
    color: var(--uaf);
  }
</style>
