<!--
  Lifetime bars (chapter 17): a Mote program runs under the ownership setting, one statement at a time. Each
  object gets a bar across time, divided into stretches by who owns it (a local, or a field of another object);
  borrows are drawn as thin lines under the bar, and a borrow that outlives its object is drawn in red. Click a
  column to see which line ran and who owned what afterwards.
  `:::lifetime-bars{title="…" n="17.1" setting="ownership"}` with a ```mote block inside.
-->
<script lang="ts">
  import Widget from '../ui/Widget.svelte';
  import CodeEditor from '$lib/exercise/CodeEditor.svelte';
  import { Vm } from '$lib/mm/mote/vm';
  import { compile } from '$lib/mm/mote/compile';
  import { makeManager, type Setting } from '$lib/mm/managers/managers';

  let { code, title = 'Lifetime bars', caption, n, setting = 'ownership' }: { code: string; title?: string; caption?: string; n?: string; setting?: Setting } = $props();

  interface Snap {
    /** The line whose statement ran to reach this state (undefined for the initial state). */
    ran?: number;
    time: number;
    owners: Map<number, string>;
    borrows: Map<number, string[]>;
    dangling: Map<number, string[]>;
  }

  function observe(vm: Vm): Omit<Snap, 'ran'> {
    const owners = new Map<number, string>();
    const borrows = new Map<number, string[]>();
    const dangling = new Map<number, string[]>();
    const add = (m: Map<number, string[]>, id: number, s: string) => m.set(id, [...(m.get(id) ?? []), s]);
    vm.frames.forEach((f) => {
      if (f.fn.name === '$init') return;
      const prefix = f.fn.name === 'main' ? '' : `${f.fn.name}: `;
      f.fn.locals.forEach((l, i) => {
        if (!l.ptr || l.name.startsWith('$')) return;
        const v = vm.stack.peek(vm.slotAddr(f, i));
        if (!v) return;
        const live = vm.byAddr.get(v);
        if (l.borrow) {
          if (live !== undefined) add(borrows, live, `&${prefix}${l.name}`);
          else if (vm.freedAt.has(v)) add(dangling, vm.freedAt.get(v)!, `&${prefix}${l.name}`);
        } else if (live !== undefined && !f.moved?.has(i)) owners.set(live, `${prefix}${l.name}`);
      });
    });
    vm.c.globals.forEach((g, i) => {
      if (!g.ptr) return;
      const v = vm.data.peek(0x2_0000 + i * 8);
      const live = vm.byAddr.get(v);
      if (live !== undefined) owners.set(live, g.name);
    });
    for (const [addr, id] of vm.byAddr) {
      const t = vm.typeOf(addr);
      const names = t.kind === 'array' ? null : t.fields.filter((f) => f.ptr && !f.weak).map((f) => f.name);
      vm.pointerSlots(addr).forEach((s, k) => {
        const v = vm.heap.peek(s);
        const live = vm.byAddr.get(v);
        if (live !== undefined) owners.set(live, `#${id}.${names ? names[k] : `[${k}]`}`);
      });
    }
    return { time: vm.time, owners, borrows, dangling };
  }

  const run = $derived.by(() => {
    let vm: Vm;
    try {
      vm = new Vm(compile(code), makeManager(setting), { heapBytes: 1 << 18 });
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e), snaps: [] as Snap[], vm: undefined };
    }
    while (vm.frames.length && vm.top.fn.name === '$init' && vm.step());
    const snaps: Snap[] = [{ ...observe(vm) }];
    let guard = 0;
    while (vm.status !== 'done' && vm.status !== 'error' && guard++ < 160) {
      const ran = vm.currentPos()?.line;
      vm.stepStatement();
      snaps.push({ ran, ...observe(vm) });
    }
    return { error: '', snaps, vm };
  });

  const objects = $derived(run.vm ? [...run.vm.objects.values()].slice(0, 12) : []);
  let sel = $state(-1);
  const at = $derived(sel < 0 || sel >= run.snaps.length ? run.snaps.length - 1 : sel);
  const snap = $derived(run.snaps[at]);

  /** Index of the first snapshot at or after time t. */
  function indexAt(t: number): number {
    const i = run.snaps.findIndex((s) => s.time >= t);
    return i < 0 ? run.snaps.length - 1 : i;
  }

  interface Seg {
    from: number;
    to: number;
    label: string;
    kind: 'own' | 'borrow' | 'dangling';
  }
  function segments(id: number): { owned: Seg[]; borrowed: Seg[]; freedAt?: number } {
    const r = run.vm!.objects.get(id)!;
    const born = indexAt(r.born);
    const freedAt = r.freed !== undefined ? indexAt(r.freed) : undefined;
    const owned: Seg[] = [];
    const borrowed: Seg[] = [];
    const end = freedAt ?? run.snaps.length - 1;
    for (let i = born; i <= end; i++) {
      const s = run.snaps[i]!;
      const label = i === freedAt ? 'dropped' : (s.owners.get(id) ?? (i === born ? 'temporary' : 'no owner'));
      const last = owned[owned.length - 1];
      if (last && last.label === label && last.to === i - 1) last.to = i;
      else owned.push({ from: i, to: i, label, kind: 'own' });
    }
    for (let i = born; i < run.snaps.length; i++) {
      const s = run.snaps[i]!;
      const list = [...(s.borrows.get(id) ?? []).map((b) => [b, 'borrow'] as const), ...(s.dangling.get(id) ?? []).map((b) => [b, 'dangling'] as const)];
      for (const [b, kind] of list) {
        const last = borrowed.find((x) => x.label === b && x.kind === kind && x.to === i - 1);
        if (last) last.to = i;
        else borrowed.push({ from: i, to: i, label: b, kind });
      }
    }
    return { owned, borrowed, freedAt };
  }
  const rows = $derived(objects.map((o) => ({ o, ...segments(o.id) })));
  const N = $derived(Math.max(1, run.snaps.length));
  const pct = (i: number) => (i / N) * 100;
  const typeName = (t: number) => {
    const ty = run.vm!.c.types[t]!;
    return ty.kind === 'array' ? 'array' : ty.name;
  };
  /** Objects freed while the selected statement ran, in the order they were freed. */
  const dropped = $derived.by(() => {
    if (!run.vm || at <= 0) return [] as string[];
    const from = run.snaps[at - 1]!.time;
    const to = run.snaps[at]!.time;
    return run.vm.events.filter((e) => e.kind === 'free' && e.t > from && e.t <= to).map((e) => {
      const r = run.vm!.objects.get((e as { id: number }).id)!;
      return `#${r.id} ${typeName(r.type)}`;
    });
  });
  const status = $derived.by(() => {
    const vm = run.vm;
    if (!vm) return '';
    if (vm.status === 'error') return `✗ stopped: ${vm.error?.message}`;
    if (vm.status === 'done') {
      const left = [...vm.objects.values()].filter((o) => o.freed === undefined).length;
      return `✓ finished${vm.output.length ? `, printing ${vm.output.join(' · ')}` : ''}. ${left ? `${left} object${left === 1 ? '' : 's'} never freed.` : 'Every object was dropped by its owner.'}`;
    }
    return '';
  });
</script>

<Widget {title} {caption} {n} kind="Lifetime bars">
  {#if run.error}
    <p class="bad ui">{run.error}</p>
  {:else}
    <div class="grid">
      <div>
        <CodeEditor value={code} lang="mote" readonly minLines={6} maxHeight="24rem" highlightLine={snap?.ran} label="The program" />
        <p class="status ui" class:bad={run.vm?.status === 'error'}>{status}</p>
      </div>
      <div class="chart ui">
        <div class="plot">
        <div class="axis">
          <span>start</span><span>time →</span><span>{run.vm?.status === 'error' ? 'error' : 'end'}</span>
        </div>
        {#each rows as r (r.o.id)}
          <div class="row">
            <div class="name">#{r.o.id} {typeName(r.o.type)} <span class="mute">line {r.o.bornPos.line}</span></div>
            <div class="track">
              {#each r.owned as s, k (k)}
                <span class="seg {s.label === 'dropped' ? 'drop' : s.label === 'no owner' ? 'orphan' : 'own'}" style:left="{pct(s.from)}%" style:width="{pct(s.to - s.from + 1)}%" title={s.label}>{s.label}</span>
              {/each}
              {#each r.borrowed as b, k (k)}
                <span class="borrow {b.kind}" style:left="{pct(b.from)}%" style:width="{pct(b.to - b.from + 1)}%" title="{b.kind === 'dangling' ? 'dangling borrow ' : 'borrowed by '}{b.label}">{b.label}</span>
              {/each}
            </div>
          </div>
        {/each}
        <div class="cols" style:--n={N}>
          {#each run.snaps as s, i (i)}
            <button class="col" class:on={i === at} onclick={() => (sel = i)} aria-label="State after line {s.ran ?? 'start'}"></button>
          {/each}
        </div>
        </div>
        {#if snap}
          <div class="now">
            <strong>{snap.ran ? `After line ${snap.ran}` : 'At the start'}</strong>:
            {#if snap.owners.size}{[...snap.owners].map(([id, o]) => `${o} owns #${id}`).join(' · ')}{:else}nothing is owned{/if}
            {#each [...snap.borrows] as [id, bs] (id)} · {bs.join(', ')} borrows #{id}{/each}
            {#each [...snap.dangling] as [id, bs] (id)} · <span class="bad">{bs.join(', ')} still points to #{id}, which has been dropped</span>{/each}
            {#if dropped.length}<div class="dropped">Dropped, in this order: {dropped.join(' → ')}</div>{/if}
          </div>
        {/if}
      </div>
    </div>
  {/if}
</Widget>

<style>
  .grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
    gap: 1rem;
  }
  @media (max-width: 760px) {
    .grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .status {
    font-size: 0.82rem;
    margin: 0.5rem 0 0;
  }
  .bad {
    color: var(--uaf);
  }
  .chart {
    font-size: 0.76rem;
  }
  .plot {
    position: relative;
  }
  .axis {
    display: flex;
    justify-content: space-between;
    color: var(--mute);
    font-size: 0.7rem;
    margin-left: 7.5rem;
    margin-bottom: 0.3rem;
  }
  .row {
    display: grid;
    grid-template-columns: 7.5rem 1fr;
    align-items: center;
    min-height: 2.1rem;
  }
  .name {
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .mute {
    color: var(--mute);
    font-weight: 400;
  }
  .track {
    position: relative;
    height: 1.9rem;
    border-bottom: 1px dashed var(--line);
  }
  .seg {
    position: absolute;
    top: 0.15rem;
    height: 1rem;
    border-radius: 3px;
    font-size: 0.66rem;
    line-height: 1rem;
    padding: 0 0.25rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    box-sizing: border-box;
    border-left: 2px solid color-mix(in srgb, var(--bg) 70%, transparent);
  }
  .seg.own {
    background: var(--alloc);
    color: var(--on-accent);
  }
  .seg.orphan {
    background: var(--leak, var(--copper));
    color: var(--on-accent);
  }
  .seg.drop {
    background: var(--free);
    color: var(--on-accent);
  }
  .borrow {
    position: absolute;
    top: 1.3rem;
    height: 0.5rem;
    border-top: 2px solid var(--violet, var(--meta));
    font-size: 0.6rem;
    line-height: 0.5rem;
    color: var(--violet, var(--meta));
    white-space: nowrap;
    overflow: hidden;
  }
  .borrow.dangling {
    border-top: 2px dashed var(--uaf);
    color: var(--uaf);
  }
  .cols {
    position: absolute;
    top: 1.2rem;
    left: 7.5rem;
    right: 0;
    bottom: 0;
    display: grid;
    grid-template-columns: repeat(var(--n), 1fr);
  }
  .col {
    border: 0;
    background: transparent;
    cursor: pointer;
    padding: 0;
  }
  .col:hover {
    background: color-mix(in srgb, var(--copper) 12%, transparent);
  }
  .col.on {
    background: color-mix(in srgb, var(--copper) 22%, transparent);
    box-shadow: inset 1px 0 var(--copper), inset -1px 0 var(--copper);
  }
  .dropped {
    margin-top: 0.2rem;
    color: var(--ink-2);
  }
  .now {
    margin-top: 0.7rem;
    padding: 0.45rem 0.6rem;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 6px;
    font-size: 0.78rem;
    min-height: 2.6rem;
  }
</style>
