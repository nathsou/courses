<!--
  The buddy system on 32 frames: request blocks of 1–8 frames, click an allocated block to free it, and watch
  blocks split in halves and buddies merge back. The free lists below are the allocator's whole state.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import { BuddyAllocator, orderFor, type BuddyEvent } from '$lib/mm/kernel/buddy';
  import { rng } from '$lib/mm/util/random';

  const FRAMES = 32;
  let b = $state.raw(new BuddyAllocator(FRAMES));
  let tick = $state(0);
  let log = $state<string[]>(['32 free frames: one block of order 5.']);
  let owners = $state(new Map<number, number>());
  let nextOwner = 1;
  let r = rng(4);

  const say = (e: BuddyEvent): string => {
    const n = (k: number) => `${2 ** k} frame${k ? 's' : ''}`;
    switch (e.kind) {
      case 'split':
        return `split the ${n(e.order)} block at frame ${e.frame} into two buddies of ${n(e.order - 1)}`;
      case 'take':
        return `allocated ${n(e.order)} at frame ${e.frame}`;
      case 'merge':
        return `merged buddies into ${n(e.order)} at frame ${e.frame}`;
      case 'release':
        return `freed ${n(e.order)} at frame ${e.frame}`;
      case 'fail':
        return `✗ no free block of ${n(e.order)} or larger`;
    }
  };
  function run(f: () => void) {
    const before = b.events.length;
    f();
    const msgs = b.events.slice(before).map(say);
    log = [...msgs.reverse(), ...log].slice(0, 8);
    tick++;
  }
  function alloc(frames: number) {
    run(() => {
      const f = b.alloc(orderFor(frames));
      if (f >= 0) owners.set(f, nextOwner++);
    });
  }
  function free(frame: number) {
    run(() => {
      b.free_(frame);
      owners.delete(frame);
    });
  }
  function randomWork() {
    for (let i = 0; i < 6; i++) {
      const live = [...b.allocated.keys()];
      if (live.length && r() < 0.45) free(live[Math.floor(r() * live.length)]!);
      else alloc([1, 1, 2, 3, 4][Math.floor(r() * 5)]!);
    }
  }
  function reset() {
    b = new BuddyAllocator(FRAMES);
    owners = new Map();
    log = ['32 free frames: one block of order 5.'];
    r = rng(4);
    tick++;
  }
  const blocks = $derived.by(() => {
    void tick;
    return b.blocks();
  });
  const freeLists = $derived.by(() => {
    void tick;
    return b.free.map((l) => [...l]);
  });
  const stats = $derived.by(() => {
    void tick;
    return { free: b.freeFrames(), largest: b.largestFree() >= 0 ? 2 ** b.largestFree() : 0 };
  });
</script>

<Widget title="The buddy system" kind="Allocator" n="9.1" caption="Thirty-two physical frames. Every block is a power of two in size and starts at a multiple of its size, so a block’s buddy is found by flipping one bit of its frame number. Click an allocated block to free it.">
  <div class="ctl ui">
    <span>Allocate:</span>
    {#each [1, 2, 3, 4, 8] as n (n)}<button onclick={() => alloc(n)}>{n} frame{n > 1 ? 's' : ''}</button>{/each}
    <button onclick={randomWork}>Random work ×6</button>
    <button onclick={reset}>Reset</button>
  </div>
  <div class="strip" role="list" aria-label="Frames 0 to 31">
    {#each blocks as blk (blk.frame + ':' + blk.order + ':' + blk.free)}
      {#if blk.free}
        <div class="blk free" role="listitem" style:flex-grow={2 ** blk.order} title="free block of {2 ** blk.order} at frame {blk.frame}"><span>{2 ** blk.order}</span></div>
      {:else}
        <button class="blk used" style:flex-grow={2 ** blk.order} style:--c="var(--series-{((owners.get(blk.frame) ?? 0) % 7) + 1})" onclick={() => free(blk.frame)} title="Free the {2 ** blk.order}-frame block at frame {blk.frame}" aria-label="Free the {2 ** blk.order}-frame block at frame {blk.frame}"><span>#{owners.get(blk.frame)}</span></button>
      {/if}
    {/each}
  </div>
  <div class="ruler mono">{#each Array.from({ length: 9 }, (_, i) => i * 4) as f (f)}<span>{f}</span>{/each}</div>
  <div class="lists mono">
    {#each freeLists as l, k (k)}
      <div class="fl"><span class="o">order {k} ({2 ** k})</span>{#each l as f (f)}<span class="fb">@{f}</span>{:else}<span class="empty">empty</span>{/each}</div>
    {/each}
  </div>
  <p class="stats ui">free: <strong>{stats.free}</strong> frames · largest block that could be allocated: <strong>{stats.largest}</strong>{stats.free > stats.largest * 2 && stats.largest > 0 ? ' · plenty free, but in pieces' : ''}</p>
  <ol class="log ui">{#each log as l, i (i + l)}<li class:fresh={i === 0}>{l}</li>{/each}</ol>
</Widget>

<style>
  .ctl {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    align-items: center;
    font-size: 0.82rem;
    margin-bottom: 0.8rem;
  }
  .ctl button {
    font: inherit;
    border: 1px solid var(--line-strong);
    background: var(--panel);
    border-radius: 99px;
    padding: 0.15rem 0.7rem;
    cursor: pointer;
  }
  .strip {
    display: flex;
    gap: 2px;
    height: 3rem;
  }
  .blk {
    flex-basis: 0;
    min-width: 0;
    border-radius: 3px;
    display: grid;
    place-items: center;
    font-family: var(--font-mono);
    font-size: 0.7rem;
    overflow: hidden;
    animation: pop 220ms ease-out;
  }
  @keyframes pop {
    from {
      transform: scaleY(0.6);
    }
  }
  .blk.free {
    border: 1px dashed var(--free);
    background: repeating-linear-gradient(135deg, transparent 0 5px, color-mix(in srgb, var(--free) 22%, transparent) 5px 6px);
    color: var(--mute);
  }
  .blk.used {
    border: 0;
    background: var(--c);
    color: var(--on-accent);
    font-weight: 700;
    cursor: pointer;
  }
  .blk.used:hover {
    outline: 2px solid var(--amber);
  }
  .ruler {
    display: flex;
    justify-content: space-between;
    font-size: 0.62rem;
    color: var(--mute);
    margin-top: 0.15rem;
  }
  .lists {
    margin-top: 0.8rem;
    font-size: 0.74rem;
    display: grid;
    gap: 2px;
  }
  .fl {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    align-items: center;
  }
  .o {
    width: 6.5rem;
    color: var(--ink-2);
  }
  .fb {
    padding: 0 0.35rem;
    border: 1px dashed var(--free);
    border-radius: 3px;
  }
  .empty {
    color: var(--mute);
  }
  .stats {
    font-size: 0.86rem;
    margin: 0.7rem 0 0.3rem;
  }
  .log {
    font-size: 0.8rem;
    color: var(--ink-2);
    padding-left: 1.2rem;
    margin: 0;
  }
  .log .fresh {
    color: var(--fg);
    font-weight: 600;
  }
</style>
