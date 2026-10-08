<!--
  The arena timeline: a server handles a dozen requests, each of which allocates a burst of objects that all die
  when the response is sent. One heap uses malloc and free (segregated fits); the other gives every request an
  arena and resets it at the end. An optional cache keeps one object per request alive, and the reader picks
  where that object lives: in the request's arena (it dangles), in an arena that is never reset (memory grows), or
  copied into a long-lived arena (correct).
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import { FlatHeap } from '$lib/mm/heap/api';
  import { segregated, makeArena } from '$lib/mm/heap/allocators';
  import { rng, randInt } from '$lib/mm/util/random';
  import { bytes } from '$lib/mm/util/format';

  const REQUESTS = 12;
  type CacheMode = 'none' | 'arena' | 'keep' | 'copy';
  type Block = { addr: number; size: number; req: number; cached?: boolean; dangling?: boolean; clobbered?: boolean; dead?: boolean };
  type Frame = { blocks: Block[]; long: Block[]; top: number; longTop: number; calls: number; accesses: number };

  let mode = $state<CacheMode>('none');
  let frame = $state(REQUESTS);
  let playing = $state(false);

  function requests() {
    const r = rng(42);
    return Array.from({ length: REQUESTS }, () => {
      const n = randInt(r, 10, 24);
      const sizes = Array.from({ length: n }, () => (r() < 0.75 ? 16 * randInt(r, 1, 4) : 64 * randInt(r, 2, 7)));
      return { sizes, cacheSize: 48 };
    });
  }
  const REQS = requests();

  function runMalloc(cache: boolean): Frame[] {
    const heap = new FlatHeap(0x10000);
    const a = segregated(10)(heap);
    const frames: Frame[] = [];
    const kept: Block[] = [];
    let calls = 0;
    REQS.forEach((q, i) => {
      const live: Block[] = q.sizes.map((s) => ({ addr: a.malloc(s), size: s, req: i }));
      calls += q.sizes.length;
      if (cache) {
        kept.push({ addr: a.malloc(q.cacheSize), size: q.cacheSize, req: i, cached: true });
        calls++;
      }
      frames.push({ blocks: [...live, ...kept.map((b) => ({ ...b }))], long: [], top: heap.end - heap.base, longTop: 0, calls, accesses: heap.stats.loads + heap.stats.stores });
      for (const b of live) a.free(b.addr);
      calls += live.length;
    });
    return frames;
  }

  function runArena(m: CacheMode): Frame[] {
    const heap = new FlatHeap(0x10000);
    const longHeap = new FlatHeap(0x10000);
    const arena = makeArena(heap);
    const longArena = makeArena(longHeap);
    const frames: Frame[] = [];
    const kept: Block[] = [];
    const longKept: Block[] = [];
    const retained: Block[] = []; // dead objects the arena still holds because it is never reset
    let calls = 0;
    REQS.forEach((q, i) => {
      const mark = arena.mark();
      const live: Block[] = q.sizes.map((s) => ({ addr: arena.malloc(s), size: s, req: i }));
      calls += q.sizes.length;
      // Anything this request's objects overlap that a cache entry still points to has been clobbered.
      for (const k of kept) if (k.dangling && live.some((b) => b.addr < k.addr + k.size && k.addr < b.addr + b.size)) k.clobbered = true;
      if (m === 'arena' || m === 'keep') {
        kept.push({ addr: arena.malloc(q.cacheSize), size: q.cacheSize, req: i, cached: true });
        calls++;
      } else if (m === 'copy') {
        const p = arena.malloc(q.cacheSize);
        longKept.push({ addr: longArena.malloc(q.cacheSize), size: q.cacheSize, req: i, cached: true });
        void p;
        calls += 2;
      }
      frames.push({
        blocks: [...retained, ...live, ...kept.map((b) => ({ ...b }))],
        long: longKept.map((b) => ({ ...b })),
        top: heap.end - heap.base,
        longTop: longHeap.end - longHeap.base,
        calls,
        accesses: heap.stats.loads + heap.stats.stores + longHeap.stats.loads + longHeap.stats.stores,
      });
      if (m === 'keep') retained.push(...live.map((b) => ({ ...b, dead: true })));
      else {
        arena.reset(mark);
        calls++;
        for (const k of kept) if (k.req === i) k.dangling = true;
      }
    });
    return frames;
  }

  const mallocFrames = $derived(runMalloc(mode !== 'none'));
  const arenaFrames = $derived(runArena(mode));
  const scale = $derived(Math.max(...mallocFrames.map((f) => f.top), ...arenaFrames.map((f) => f.top + f.longTop), 4096));
  const mf = $derived(mallocFrames[frame - 1]!);
  const af = $derived(arenaFrames[frame - 1]!);
  const problems = $derived.by(() => {
    const d = af.blocks.filter((b) => b.cached && b.dangling);
    return { dangling: d.length, clobbered: d.filter((b) => b.clobbered).length };
  });

  const hue = (req: number) => (req * 67 + 200) % 360;
  const x = (addr: number) => ((addr - 0x10000) / scale) * 100;
  const w = (size: number) => Math.max(0.15, (size / scale) * 100);

  let timer: ReturnType<typeof setInterval> | undefined;
  function play() {
    if (playing) {
      clearInterval(timer);
      playing = false;
      return;
    }
    playing = true;
    frame = 1;
    timer = setInterval(() => {
      if (frame >= REQUESTS) {
        clearInterval(timer);
        playing = false;
      } else frame++;
    }, 650);
  }
  $effect(() => () => clearInterval(timer));

  const MODES: [CacheMode, string][] = [
    ['none', 'No cache'],
    ['arena', 'Cache entry allocated in the request’s arena'],
    ['keep', 'Never reset the arena'],
    ['copy', 'Copy the entry to a long-lived arena'],
  ];
</script>

{#snippet bar(blocks: Block[], top: number, label: string, extra?: { blocks: Block[]; top: number })}
  <div class="row">
    <div class="label ui">{label}</div>
    <svg viewBox="0 0 100 10" preserveAspectRatio="none" class="bar" aria-hidden="true">
      <rect x="0" y="0" width={x(0x10000 + top)} height="10" class="held" />
      {#each blocks as b, i (i)}
        <rect
          x={x(b.addr)}
          y={b.cached ? 1 : 2}
          width={w(b.size)}
          height={b.cached ? 8 : 6}
          class:cached={b.cached}
          class:dangling={b.dangling}
          class:clobbered={b.clobbered}
          class:dead={b.dead}
          style:--h={hue(b.req)}
        />
      {/each}
      {#if extra}
        {@const off = top}
        <rect x={x(0x10000 + off)} y="0" width={x(0x10000 + extra.top)} height="10" class="held long" />
        {#each extra.blocks as b, i (i)}
          <rect x={x(b.addr + off)} y="1" width={w(b.size)} height="8" class="cached" style:--h={hue(b.req)} />
        {/each}
      {/if}
    </svg>
  </div>
{/snippet}

<Widget title="One arena per request" kind="Simulation" n="13.1" caption="A server handles twelve requests. Each allocates a burst of small objects (coloured by request) that all die when the response is sent. Top: <code>malloc</code> and <code>free</code> for every object. Bottom: an arena per request, reset in one step at the end. The shaded band is the heap the process holds; tall blocks are cache entries meant to outlive their request.">
  <div class="cfg ui" role="radiogroup" aria-label="Where the cached object lives">
    {#each MODES as [m, label] (m)}
      <button role="radio" aria-checked={mode === m} class:on={mode === m} onclick={() => (mode = m)}>{label}</button>
    {/each}
  </div>
  <div class="time ui">
    <button class="play" onclick={play}>{playing ? '❚❚ Pause' : '▶ Play'}</button>
    <label>Request <strong>{frame}</strong> of {REQUESTS} <input type="range" min="1" max={REQUESTS} bind:value={frame} /></label>
  </div>
  {@render bar(mf.blocks, mf.top, 'malloc / free')}
  {@render bar(af.blocks, af.top, mode === 'copy' ? 'arenas (request | long-lived)' : 'arena per request', mode === 'copy' ? { blocks: af.long, top: af.longTop } : undefined)}
  <div class="table-scroll">
    <table class="ui">
      <thead><tr><th></th><th>Allocator calls</th><th>Allocator loads + stores</th><th>Heap held</th><th>Problems</th></tr></thead>
      <tbody>
        <tr><th scope="row">malloc / free</th><td class="mono">{mf.calls}</td><td class="mono">{mf.accesses}</td><td class="mono">{bytes(mf.top)}</td><td>none</td></tr>
        <tr>
          <th scope="row">Arenas</th><td class="mono">{af.calls}</td><td class="mono">{af.accesses}</td><td class="mono">{bytes(af.top + af.longTop)}</td>
          <td class:bad={problems.dangling > 0 || (mode === 'keep' && frame > 3)}>
            {#if problems.dangling}{problems.dangling} dangling cache {problems.dangling === 1 ? 'entry' : 'entries'}{#if problems.clobbered}, {problems.clobbered} already overwritten{/if}
            {:else if mode === 'keep'}memory grows with every request
            {:else}none{/if}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</Widget>

<style>
  .cfg {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    font-size: 0.78rem;
  }
  .cfg button,
  .play {
    font: inherit;
    border: 1px solid var(--line-strong);
    background: var(--panel);
    border-radius: 99px;
    padding: 0.15rem 0.7rem;
    cursor: pointer;
    color: var(--fg);
  }
  .cfg button.on {
    background: var(--copper);
    border-color: var(--copper);
    color: var(--on-accent);
    font-weight: 600;
  }
  .time {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem 1rem;
    margin: 0.8rem 0 0.4rem;
    font-size: 0.84rem;
  }
  .row {
    margin-top: 0.5rem;
  }
  .label {
    font-size: 0.74rem;
    color: var(--ink-2);
    margin-bottom: 0.15rem;
  }
  .bar {
    width: 100%;
    height: 2.4rem;
    display: block;
    border: 1px solid var(--line);
    border-radius: 4px;
    background: var(--panel);
  }
  .held {
    fill: var(--free);
    opacity: 0.18;
  }
  .held.long {
    fill: var(--meta);
  }
  rect:not(.held) {
    fill: hsl(var(--h) 55% 55%);
    transition: x 0.2s;
  }
  rect.dead {
    opacity: 0.3;
  }
  rect.cached {
    fill: var(--copper);
  }
  rect.dangling {
    fill: var(--uaf);
    opacity: 0.55;
  }
  rect.clobbered {
    fill: var(--uaf);
    opacity: 1;
  }
  .table-scroll {
    overflow-x: auto;
    margin-top: 0.8rem;
  }
  table {
    border-collapse: collapse;
    font-size: 0.8rem;
    width: 100%;
  }
  th,
  td {
    padding: 0.3rem 0.5rem;
    border-bottom: 1px solid var(--line);
    text-align: left;
    white-space: nowrap;
  }
  thead th {
    font-size: 0.72rem;
    color: var(--ink-2);
  }
  td:last-child {
    white-space: normal;
    min-width: 9rem;
  }
  td.bad {
    color: var(--uaf);
    font-weight: 600;
  }
</style>
