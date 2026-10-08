<!--
  The heap inspector: run malloc and free against a real allocator on a small simulated heap and see every word:
  headers and footers (size | allocated bit), payloads, and the free-list pointers stored inside free blocks.
  `::heap-inspector{allocators="first,best,explicit" script="a 24, a 40, f 1"}`. With `mine`, readers who passed
  chapter 10's exercise can run their own allocator here.
-->
<script lang="ts">
  import Widget from '../ui/Widget.svelte';
  import { FlatHeap, type Allocator, type AllocatorFactory, type ChunkInfo } from '$lib/mm/heap/api';
  import { bump, implicitList, explicitList, segregated } from '$lib/mm/heap/allocators';
  import { impls } from '$lib/state/impl.svelte';
  import { hex } from '$lib/mm/util/format';
  import { onMount } from 'svelte';

  type Layout = 'bump' | 'implicit' | 'explicit' | 'mine';
  const CATALOGUE: Record<string, { label: string; layout: Layout; make: (chunk: number) => AllocatorFactory }> = {
    bump: { label: 'Bump', layout: 'bump', make: () => bump },
    first: { label: 'Implicit list, first fit', layout: 'implicit', make: (c) => implicitList('first', { chunk: c }) },
    next: { label: 'Implicit list, next fit', layout: 'implicit', make: (c) => implicitList('next', { chunk: c }) },
    best: { label: 'Implicit list, best fit', layout: 'implicit', make: (c) => implicitList('best', { chunk: c }) },
    nocoalesce: { label: 'Implicit list, no coalescing', layout: 'implicit', make: (c) => implicitList('first', { chunk: c, coalesce: false }) },
    explicit: { label: 'Explicit free list', layout: 'explicit', make: (c) => explicitList('lifo', c) },
    segregated: { label: 'Segregated fits', layout: 'explicit', make: (c) => segregated(4, { chunk: c }) },
  };

  let {
    allocators = 'first',
    script = '',
    chunk = 256,
    mine = false,
    title = 'The heap inspector',
    caption,
    n,
  }: { allocators?: string; script?: string; chunk?: number; mine?: boolean; title?: string; caption?: string; n?: string } = $props();

  const ids = $derived(allocators.split(',').map((s) => s.trim()).filter((s) => CATALOGUE[s]));
  let which = $state(allocators.split(',')[0]!.trim());
  let mineCode = $state<string | undefined>(undefined);
  let heap = $state.raw(new FlatHeap(0x1000, 1 << 16));
  let alloc = $state.raw<Allocator>(bump(heap));
  let live = $state<{ id: number; ptr: number; size: number }[]>([]);
  let nextId = 1;
  let log = $state<string[]>([]);
  let size = $state(24);
  let tick = $state(0);
  let hover = $state<{ addr: number; text: string } | null>(null);
  let err = $state('');

  const layout = $derived<Layout>(which === 'mine' ? 'mine' : CATALOGUE[which]!.layout);

  async function factory(): Promise<AllocatorFactory> {
    if (which === 'mine' && mineCode) {
      const { evaluate } = await import('$lib/exercise/modules');
      const { LIBRARY } = await import('$lib/exercise/modules');
      const m = evaluate(mineCode, 'mine.ts', (s) => LIBRARY[s]);
      const f = m.createAllocator as AllocatorFactory | undefined;
      if (!f) throw new Error('your code exports no createAllocator(heap)');
      return f;
    }
    return CATALOGUE[which]!.make(chunk);
  }

  async function reset(runScript = true) {
    err = '';
    heap = new FlatHeap(0x1000, 1 << 16);
    try {
      alloc = (await factory())(heap);
    } catch (e) {
      err = e instanceof Error ? e.message : String(e);
      alloc = bump(heap);
    }
    live = [];
    nextId = 1;
    log = [];
    if (runScript && script) {
      for (const cmd of script.split(',').map((c) => c.trim()).filter(Boolean)) {
        const [k, a] = cmd.split(/\s+/);
        if (k === 'a') doMalloc(Number(a));
        else if (k === 'f') doFree(Number(a));
      }
    }
    tick++;
  }

  function doMalloc(n: number) {
    try {
      const p = alloc.malloc(n);
      if (!p) {
        log = [`malloc(${n}) → 0: out of memory`, ...log];
        return;
      }
      const id = nextId++;
      for (let i = 0; i < n; i++) heap.raw.store8(p + i, (0xa0 + id) & 0xff);
      live = [...live, { id, ptr: p, size: n }];
      log = [`malloc(${n}) → ${hex(p)}  (block #${id})`, ...log].slice(0, 8);
    } catch (e) {
      err = e instanceof Error ? e.message : String(e);
    }
    tick++;
  }
  function doFree(id: number) {
    const b = live.find((x) => x.id === id);
    if (!b) return;
    try {
      alloc.free(b.ptr);
      live = live.filter((x) => x.id !== id);
      log = [`free(${hex(b.ptr)})  (block #${id})`, ...log].slice(0, 8);
    } catch (e) {
      err = e instanceof Error ? e.message : String(e);
    }
    tick++;
  }

  onMount(() => {
    impls.load();
    mineCode = impls.get('allocator');
    reset();
  });

  // ── Views ──
  const chunks = $derived.by<ChunkInfo[]>(() => {
    void tick;
    if (alloc.chunks) {
      try {
        return [...alloc.chunks()];
      } catch {
        return [];
      }
    }
    // A bump allocator keeps no records: show the live blocks and the untouched tail.
    const out: ChunkInfo[] = live.map((b) => ({ addr: b.ptr, size: Math.ceil(b.size / 16) * 16, free: false }));
    return out;
  });
  const end = $derived.by(() => {
    void tick;
    return heap.brk;
  });

  interface WordInfo {
    addr: number;
    role: 'pad' | 'hdr' | 'ftr' | 'next' | 'prev' | 'payload' | 'free' | 'meta' | 'epi' | 'none';
    text: string;
    owner?: number;
  }
  const words = $derived.by<WordInfo[]>(() => {
    void tick;
    const out: WordInfo[] = [];
    const roleOf = new Map<number, WordInfo>();
    for (const c of chunks) {
      if (c.note) {
        for (let a = c.addr; a < c.addr + c.size; a += 8) roleOf.set(a, { addr: a, role: c.note === 'epilogue' ? 'epi' : 'meta', text: c.note === 'epilogue' ? 'epilogue header: size 0, allocated (marks the end of the heap)' : `${c.note}` });
        continue;
      }
      if (layout === 'bump' || layout === 'mine') {
        for (let a = c.addr; a < c.addr + c.size; a += 8) roleOf.set(a, { addr: a, role: c.free ? 'free' : 'payload', text: c.free ? 'free' : 'part of an allocated block' });
        continue;
      }
      const v = heap.raw.load64(c.addr);
      roleOf.set(c.addr, { addr: c.addr, role: 'hdr', text: `header: size ${v - (v % 2)}, ${v % 2 ? 'allocated' : 'free'} (size | allocated bit = ${v})` });
      const f = c.addr + c.size - 8;
      roleOf.set(f, { addr: f, role: 'ftr', text: `footer (boundary tag): a copy of the header, so the next block can find this one’s start` });
      for (let a = c.addr + 8; a < f; a += 8) {
        if (c.free && layout === 'explicit' && a === c.addr + 8) roleOf.set(a, { addr: a, role: 'next', text: `next free block: ${hex(heap.raw.load64(a))}${heap.raw.load64(a) ? '' : ' (none)'}` });
        else if (c.free && layout === 'explicit' && a === c.addr + 16) roleOf.set(a, { addr: a, role: 'prev', text: `previous free block: ${hex(heap.raw.load64(a))}${heap.raw.load64(a) ? '' : ' (none)'}` });
        else {
          const owner = live.find((b) => a >= b.ptr && a < b.ptr + Math.max(8, b.size));
          roleOf.set(a, { addr: a, role: c.free ? 'free' : owner ? 'payload' : 'pad', text: c.free ? 'unused space in a free block (it still holds whatever was there before: free does not erase)' : owner ? `payload of block #${owner.id} (${owner.size} bytes requested)` : 'padding: rounded up to a multiple of 16', owner: owner?.id });
        }
      }
    }
    for (let a = heap.base; a < end; a += 8) out.push(roleOf.get(a) ?? { addr: a, role: 'none', text: 'beyond the last block' });
    return out;
  });
  const shown = $derived(words.slice(0, 2 * 64));
  /** A word as hex, most significant byte first, read byte by byte (values can exceed 2^53). */
  const fmt = (a: number) => {
    let s = '';
    for (let i = 7; i >= 0; i--) s += heap.raw.load8(a + i).toString(16).padStart(2, '0');
    return s.replace(/^0{8}/, '········');
  };
  const used = $derived(live.reduce((s, b) => s + b.size, 0));
  const freeBytes = $derived(chunks.filter((c) => c.free).reduce((s, c) => s + c.size, 0));
  const largest = $derived(Math.max(0, ...chunks.filter((c) => c.free).map((c) => c.size - 16)));
</script>

<Widget {title} {caption} {n} kind="Heap inspector">
  <div class="ctl ui">
    <div class="pick" role="radiogroup" aria-label="Allocator">
      {#each ids as id (id)}<button role="radio" aria-checked={which === id} class:on={which === id} onclick={() => ((which = id), reset())}>{CATALOGUE[id]!.label}</button>{/each}
      {#if mine}<button role="radio" aria-checked={which === 'mine'} class:on={which === 'mine'} disabled={!mineCode} title={mineCode ? 'Run the allocator you wrote in chapter 10' : 'Pass the implicit-list exercise in chapter 10 first'} onclick={() => ((which = 'mine'), reset())}>Use my allocator</button>{/if}
    </div>
    <form class="ops" onsubmit={(e) => (e.preventDefault(), doMalloc(size))}>
      <label>malloc(<input type="number" min="1" max="2000" bind:value={size} />)</label>
      <button type="submit" class="primary">Allocate</button>
      <button type="button" onclick={() => reset(false)}>Empty heap</button>
      {#if script}<button type="button" onclick={() => reset(true)}>Replay the example</button>{/if}
    </form>
  </div>
  {#if err}<p class="err ui">✗ {err}</p>{/if}

  <div class="strip" aria-label="Blocks in address order">
    {#each chunks as c (c.addr)}
      <div class="blk" class:free={c.free} class:meta={!!c.note} style:flex-grow={c.size} title="{c.note ?? (c.free ? 'free block' : 'allocated block')} at {hex(c.addr)}, {c.size} bytes">
        <span>{c.note ? '' : c.size}</span>
      </div>
    {/each}
    <div class="blk tail" style:flex-grow={Math.max(0, 64)}><span>brk →</span></div>
  </div>

  <div class="live ui">
    {#each live as b (b.id)}
      <button class="lb" onclick={() => doFree(b.id)} title="free block #{b.id}">#{b.id} · {b.size} B · <span class="mono">{hex(b.ptr)}</span> <span class="x">free ✕</span></button>
    {:else}
      <span class="dim">No live blocks. Allocate something.</span>
    {/each}
  </div>

  <div class="words mono" role="grid" aria-label="The heap, word by word">
    {#each Array.from({ length: Math.ceil(shown.length / 2) }, (_, r) => r) as r (r)}
      <div class="wr" role="row">
        <span class="wa">{hex(shown[r * 2]!.addr)}</span>
        {#each shown.slice(r * 2, r * 2 + 2) as w (w.addr)}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <span class="w {w.role}" role="gridcell" tabindex="0" style:--o={w.owner ? `var(--series-${(w.owner % 7) + 1})` : undefined} onmouseenter={() => (hover = w)} onfocus={() => (hover = w)} onmouseleave={() => (hover = null)}>{fmt(w.addr)}</span>
        {/each}
      </div>
    {/each}
    {#if words.length > shown.length}<div class="more ui">… {(words.length - shown.length) * 8} more bytes</div>{/if}
  </div>
  <p class="explain ui" aria-live="polite">{hover ? `${hex(hover.addr)}: ${hover.text}` : 'Hover or focus a word to see what it is.'}</p>

  <p class="stats ui">
    heap {end - heap.base} bytes · requested and live {used} · free {freeBytes} · largest free payload {largest}
  </p>
  <ol class="log ui">{#each log as l, i (i + l)}<li class:fresh={i === 0}>{l}</li>{/each}</ol>
  <p class="legend ui">
    <span><i class="k hdr"></i> header / footer</span><span><i class="k payload"></i> payload</span><span><i class="k free"></i> free</span><span><i class="k next"></i> free-list pointer</span><span><i class="k pad"></i> padding</span><span><i class="k meta"></i> allocator’s own</span>
  </p>
</Widget>

<style>
  .ctl {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    font-size: 0.82rem;
  }
  .pick,
  .ops {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    align-items: center;
  }
  button {
    font: inherit;
    border: 1px solid var(--line-strong);
    background: var(--panel);
    border-radius: 99px;
    padding: 0.15rem 0.7rem;
    cursor: pointer;
  }
  button.on,
  button.primary {
    background: var(--copper);
    border-color: var(--copper);
    color: var(--on-accent);
    font-weight: 600;
  }
  button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  input[type='number'] {
    width: 4.5rem;
    font: inherit;
    font-family: var(--font-mono);
    border: 1px solid var(--line-strong);
    background: var(--panel);
    padding: 0.1rem 0.3rem;
  }
  .err {
    color: var(--bad);
    font-size: 0.85rem;
  }
  .strip {
    display: flex;
    gap: 2px;
    height: 2.4rem;
    margin: 0.8rem 0 0.5rem;
  }
  .blk {
    flex-basis: 0;
    min-width: 6px;
    background: var(--alloc);
    color: var(--on-accent);
    border-left: 4px solid var(--meta);
    border-right: 4px solid var(--meta);
    font-family: var(--font-mono);
    font-size: 0.66rem;
    display: grid;
    place-items: center;
    overflow: hidden;
    border-radius: 2px;
    transition: flex-grow 300ms;
  }
  .blk.free {
    background: repeating-linear-gradient(135deg, transparent 0 4px, color-mix(in srgb, var(--free) 30%, transparent) 4px 5px);
    color: var(--mute);
    border-top: 1px dashed var(--free);
    border-bottom: 1px dashed var(--free);
  }
  .blk.meta {
    background: var(--meta-soft);
    border: 0;
  }
  .blk.tail {
    background: none;
    border: 1px dotted var(--line-strong);
    color: var(--mute);
  }
  .live {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    font-size: 0.76rem;
    margin-bottom: 0.6rem;
  }
  .lb {
    border-radius: 4px;
    padding: 0.1rem 0.5rem;
  }
  .lb .x {
    color: var(--bad);
  }
  .dim {
    color: var(--mute);
  }
  .words {
    font-size: 0.7rem;
    max-height: 22rem;
    overflow-y: auto;
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    padding: 0.3rem;
    background: light-dark(var(--panel), #0a0b0d);
  }
  .wr {
    display: grid;
    grid-template-columns: 4.5rem 1fr 1fr;
    gap: 3px;
    margin-bottom: 2px;
  }
  .wa {
    color: var(--copper);
  }
  .w {
    padding: 0.05rem 0.3rem;
    border-radius: 2px;
    cursor: help;
    outline: none;
  }
  .w:focus,
  .w:hover {
    box-shadow: 0 0 0 1.5px var(--amber);
  }
  .w.hdr,
  .w.ftr,
  .w.epi {
    background: var(--meta-soft);
    font-weight: 700;
  }
  .w.payload {
    background: color-mix(in srgb, var(--o, var(--alloc)) 22%, transparent);
    color: var(--fg);
  }
  .w.free {
    color: var(--mute);
    background: repeating-linear-gradient(135deg, transparent 0 4px, color-mix(in srgb, var(--free) 18%, transparent) 4px 5px);
  }
  .w.next,
  .w.prev {
    background: var(--violet-soft);
    color: var(--violet);
    font-weight: 700;
  }
  .w.pad {
    color: var(--mute);
    background: repeating-linear-gradient(45deg, transparent 0 2px, color-mix(in srgb, var(--leak) 14%, transparent) 2px 3px);
  }
  .w.meta {
    background: var(--meta-soft);
    color: var(--ink-2);
  }
  .w.none {
    color: var(--mute);
    opacity: 0.5;
  }
  .more {
    color: var(--mute);
    font-size: 0.72rem;
    padding: 0.2rem;
  }
  .explain {
    font-size: 0.82rem;
    min-height: 1.4em;
    margin: 0.4rem 0;
  }
  .stats {
    font-size: 0.8rem;
    color: var(--ink-2);
    margin: 0.2rem 0;
  }
  .log {
    font-size: 0.78rem;
    color: var(--ink-2);
    padding-left: 1.2rem;
    margin: 0.3rem 0;
    font-family: var(--font-mono);
  }
  .log .fresh {
    color: var(--fg);
    font-weight: 600;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem 0.9rem;
    font-size: 0.74rem;
    color: var(--ink-2);
  }
  .k {
    display: inline-block;
    width: 0.9rem;
    height: 0.6rem;
    vertical-align: middle;
    margin-right: 0.25rem;
    border-radius: 2px;
  }
  .k.hdr {
    background: var(--meta-soft);
    border: 1px solid var(--meta);
  }
  .k.payload {
    background: var(--alloc-soft);
    border: 1px solid var(--alloc);
  }
  .k.free {
    border: 1px dashed var(--free);
  }
  .k.next {
    background: var(--violet-soft);
    border: 1px solid var(--violet);
  }
  .k.pad {
    background: repeating-linear-gradient(45deg, transparent 0 2px, color-mix(in srgb, var(--leak) 30%, transparent) 2px 3px);
  }
  .k.meta {
    background: var(--meta-soft);
  }
</style>
