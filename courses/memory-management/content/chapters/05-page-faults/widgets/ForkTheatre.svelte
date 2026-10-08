<!--
  Fork theatre: the toy kernel's real page tables, frames and reference counts. The parent's heap pages appear
  only when first touched (demand paging); fork shares every page copy-on-write; the first write to a shared page
  takes a fault and gets a private copy (or, for the last sharer, simply becomes writable again).
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import { Kernel, COW, type KernelEvent, type Process } from '$lib/mm/kernel/kernel';
  import { PAGE_SIZE } from '$lib/mm/machine/phys';
  import { PTE } from '$lib/mm/machine/sv39';
  import { hex } from '$lib/mm/util/format';

  const PAGES = 4;
  let k = $state.raw(new Kernel(64));
  let parent = $state.raw<Process>(undefined!);
  let child = $state.raw<Process | undefined>(undefined);
  let heap = 0;
  let tick = $state(0);
  let log = $state<string[]>([]);

  function reset() {
    const kk = new Kernel(64);
    const p = kk.spawn();
    kk.standardLayout(p);
    heap = kk.sbrk(p, PAGES * PAGE_SIZE);
    k = kk;
    parent = p;
    child = undefined;
    log = ['The parent reserved 4 heap pages with brk. No frames yet: nothing has touched them.'];
    tick++;
  }
  reset();

  function describe(e: KernelEvent, who: string): string {
    if (e.kind !== 'fault') return '';
    const page = Math.floor((e.va - heap) / PAGE_SIZE);
    switch (e.resolution) {
      case 'demand-zero':
        return `${who} touched heap page ${page}: page fault → the kernel zeroed frame ${e.frame} and mapped it.`;
      case 'cow-copy':
        return `${who} wrote shared heap page ${page}: page fault → copied frame ${e.from} into frame ${e.frame}, now private and writable.`;
      case 'cow-reuse':
        return `${who} wrote heap page ${page}: page fault, but frame ${e.frame} has no other sharers left, so it simply became writable again. No copy.`;
      default:
        return `${who}: ${e.resolution}`;
    }
  }
  function act(who: 'parent' | 'child', what: 'read' | 'write', page: number) {
    const p = who === 'parent' ? parent : child;
    if (!p) return;
    const before = k.events.length;
    const va = heap + page * PAGE_SIZE;
    k.as(p, () => (what === 'write' ? k.machine.store64(va, (who === 'parent' ? 100 : 200) + page + Math.floor(Math.random() * 9) * 1000) : k.machine.load64(va)));
    const evs = k.events.slice(before).filter((e) => e.kind === 'fault');
    const msgs = evs.map((e) => describe(e, who === 'parent' ? 'The parent' : 'The child'));
    if (!msgs.length) msgs.push(`${who === 'parent' ? 'The parent' : 'The child'} ${what === 'write' ? 'wrote' : 'read'} heap page ${page}: no fault, the TLB or the page table already allowed it.`);
    log = [...msgs, ...log].slice(0, 6);
    tick++;
  }
  function fork() {
    child = k.fork(parent);
    const shared = (k.events.at(-1) as { shared: number }).shared;
    log = [`fork(): the child got a copy of the parent’s page tables. ${shared} pages are now shared; writable ones became read-only and copy-on-write in both.`, ...log].slice(0, 6);
    tick++;
  }
  function exitChild() {
    if (!child) return;
    k.exit(child);
    child = undefined;
    log = ['The child exited: every frame it mapped lost one reference.', ...log].slice(0, 6);
    tick++;
  }

  interface Row {
    page: number;
    frame?: number;
    flags?: number;
    value?: number;
  }
  function rows(p: Process | undefined, _t: number): Row[] {
    return Array.from({ length: PAGES }, (_, i) => {
      if (!p) return { page: i };
      const pte = p.pt.get(heap + i * PAGE_SIZE);
      if (!pte || !(pte.flags & PTE.V)) return { page: i };
      return { page: i, frame: pte.ppn, flags: pte.flags, value: k.machine.phys.load64(pte.ppn * PAGE_SIZE) };
    });
  }
  const pRows = $derived(rows(parent, tick));
  const cRows = $derived(rows(child, tick));
  const frames = $derived.by(() => {
    void tick;
    const set = new Map<number, number>();
    for (const r of [...pRows, ...cRows]) if (r.frame !== undefined) set.set(r.frame, k.refs.get(r.frame) ?? 0);
    return [...set].sort((a, b) => a[0] - b[0]);
  });
  const hues = $derived(new Map(frames.map(([f], i) => [f, `var(--series-${(i % 7) + 1})`])));
  const hue = (f: number) => hues.get(f) ?? 'var(--line)';
  const flag = (r: Row) => (r.flags === undefined ? '' : r.flags & COW ? 'COW (read-only)' : r.flags & PTE.W ? 'writable' : 'read-only');
</script>

{#snippet table(title: string, rs: Row[], who: 'parent' | 'child', alive: boolean)}
  <div class="pt">
    <h5 class="ui">{title}</h5>
    {#if !alive}
      <p class="none ui">{who === 'child' ? 'No child yet.' : ''}</p>
    {:else}
      {#each rs as r (r.page)}
        <div class="row" style:--h={r.frame !== undefined ? hue(r.frame) : 'var(--line)'}>
          <span class="va mono">heap[{r.page}]</span>
          {#if r.frame === undefined}<span class="unm ui">not mapped</span>{:else}<span class="fr mono">→ frame {r.frame}</span><span class="fl ui" class:cow={(r.flags ?? 0) & COW}>{flag(r)}</span>{/if}
          <span class="acts ui">
            <button onclick={() => act(who, 'read', r.page)} title="Read this page">read</button>
            <button onclick={() => act(who, 'write', r.page)} title="Write this page">write</button>
          </span>
        </div>
      {/each}
    {/if}
  </div>
{/snippet}

<Widget title="Fork theatre" kind="Kernel" n="5.1" caption="Everything here is the toy kernel’s real state: Sv39 page-table entries (with bit 8 marking copy-on-write), frames from its buddy allocator, and per-frame reference counts. Colours match a page to its frame.">
  <div class="stage">
    {@render table('Parent’s page table', pRows, 'parent', true)}
    <div class="frames">
      <h5 class="ui">Physical frames</h5>
      {#each frames as [f, n] (f)}
        <div class="frame" style:--h={hue(f)}><span class="mono">frame {f}</span><span class="refs ui" class:shared={n > 1}>{n} {n === 1 ? 'mapping' : 'mappings'}</span><span class="val mono">first word {hex(k.machine.phys.load64(f * PAGE_SIZE))}</span></div>
      {:else}
        <p class="none ui">No heap frames in use.</p>
      {/each}
    </div>
    {@render table('Child’s page table', cRows, 'child', !!child)}
  </div>
  <div class="ctl ui">
    {#if !child}<button class="primary" onclick={fork}>fork()</button>{:else}<button onclick={exitChild}>The child exits</button>{/if}
    <button onclick={reset}>Start again</button>
    <span class="stat">frames in use by the heap: <strong>{frames.length}</strong></span>
  </div>
  <ol class="log ui" aria-live="polite">
    {#each log as l, i (i + l)}<li class:fresh={i === 0}>{l}</li>{/each}
  </ol>
</Widget>

<style>
  .stage {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 0.8fr) minmax(0, 1fr);
    gap: 0.8rem;
  }
  @media (max-width: 760px) {
    .stage {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  h5 {
    margin: 0 0 0.4rem;
    font-size: 0.8rem;
    color: var(--ink-2);
  }
  .row {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.1rem 0.5rem;
    padding: 0.35rem 0.5rem;
    margin-bottom: 4px;
    border-left: 4px solid var(--h);
    background: color-mix(in srgb, var(--h) 9%, var(--panel));
    border-radius: 3px;
    font-size: 0.78rem;
  }
  .va {
    font-weight: 600;
  }
  .unm,
  .none {
    color: var(--mute);
    font-size: 0.78rem;
  }
  .fl {
    grid-column: 2;
    font-size: 0.72rem;
    color: var(--ink-2);
  }
  .fl.cow {
    color: var(--leak);
    font-weight: 600;
  }
  .acts {
    grid-column: 1 / -1;
    display: flex;
    gap: 0.3rem;
  }
  .acts button {
    font-size: 0.7rem;
    padding: 0.05rem 0.5rem;
    border-radius: 99px;
    border: 1px solid var(--line-strong);
    background: var(--panel);
    cursor: pointer;
  }
  .frame {
    display: flex;
    flex-direction: column;
    padding: 0.4rem 0.6rem;
    margin-bottom: 4px;
    border: 2px solid var(--h);
    border-radius: 4px;
    font-size: 0.76rem;
    background: var(--panel);
  }
  .refs {
    font-size: 0.72rem;
    color: var(--ink-2);
  }
  .refs.shared {
    color: var(--leak);
    font-weight: 700;
  }
  .val {
    font-size: 0.68rem;
    color: var(--mute);
  }
  .ctl {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
    margin-top: 0.8rem;
    font-size: 0.85rem;
  }
  .ctl button {
    font: inherit;
    border: 1px solid var(--line-strong);
    background: var(--panel);
    border-radius: 99px;
    padding: 0.25rem 0.9rem;
    cursor: pointer;
  }
  .ctl .primary {
    background: var(--copper);
    border-color: var(--copper);
    color: var(--on-accent);
    font-weight: 700;
  }
  .stat {
    color: var(--ink-2);
  }
  .log {
    margin: 0.7rem 0 0;
    padding-left: 1.2rem;
    font-size: 0.82rem;
    color: var(--ink-2);
  }
  .log li.fresh {
    color: var(--fg);
    font-weight: 600;
  }
</style>
