---
title: The malloc lab
summary: Write a complete allocator, run it on every trace, and put it on the scoreboard.
number: 14
duration: 60 minutes, or an evening
prerequisites: [fragmentation]
---

Since at least 2001, students in Carnegie Mellon’s introductory systems course have spent a few weeks on one assignment: write `malloc`, `free` and `realloc`, run them against a set of recorded traces, and be graded largely on a single number :cite[cmu2001malloclab]. It is a famous assignment, and for good reason. Nothing else in a systems course combines so much pointer arithmetic, so many off-by-one opportunities, and such a clear, measurable sense of getting better.

This chapter is that lab, rebuilt for the browser. You have everything you need: the heap API (chapter 10), boundary tags and coalescing (chapter 10), placement policies and segregated lists (chapter 11), size classes and caches (chapter 12). The bench at the end of the chapter runs your allocator against every trace the course has used, scores it, and puts it on a leaderboard with the reference designs.

## The rules

Your module exports `createAllocator(heap)` and returns an object with `malloc(n)`, `free(p)` and, optionally, `realloc(p, n)`.

- **Alignment.** Every pointer `malloc` returns must be a multiple of 16.
- **The storage rule.** All bookkeeping lives in the heap, reached through `heap.load64` and `heap.store64`. Outside the heap you may keep a few numbers, never a `Map`, a `Set` or an array. This is what makes it a real allocator: in C there is nowhere else to put the free lists.
- **Memory.** You get more heap with `heap.sbrk(bytes)`, which returns the old end of the heap, or -1 if the request would take the heap beyond its limit. On the bench, the limit is four times the most data the trace ever has live at once (and at least 16 KiB). An allocator that wastes more than that runs out of memory.
- **realloc** must keep the contents of the block, up to the smaller of the old and new sizes. If you leave it out, the bench uses `malloc`, a copy, and `free`.

The heap checker watches every operation: it fails a trace the moment a block is misaligned, overlaps another, lies outside the heap, or has its contents changed while it was allocated (which is what happens when an allocator writes its bookkeeping into a live block).

## The score

The original lab grades an allocator with a **performance index** that weighs space utilisation against throughput :cite[cmu2001malloclab]:

$$
P = w\,U + (1 - w)\,\min\!\left(1, \frac{T}{T_\text{libc}}\right), \qquad w = 0.6
$$

where $U$ is the utilisation (peak live data over peak heap size, as in chapter 11) and $T$ is the throughput, compared with the C library’s own `malloc`. The writeup is explicit about the intent: since each term can contribute at most its weight, “you should not go to extremes to optimize either the memory utilization or the throughput only” :cite[cmu2001malloclab].

The bench uses the same formula per trace, with one change: throughput is measured in simulated cycles, by the cost model from chapter 2, and full marks go to an allocator that averages 60 cycles per operation or fewer. A trace that fails, or runs out of memory, scores zero. Your index is the average over the seven traces.

```numeric
id: the-malloc-lab/index
title: Reading the score
prompt: "On one trace an allocator reaches 80% utilisation at 120 cycles per operation. What does it score on that trace, out of 100?"
answer: 68
unit: points
tolerance: 0
explain: "0.6 × 0.80 = 0.48 for space. Throughput: 60 / 120 = 0.5 of full marks, times 0.4 = 0.20. Total 0.68, or 68 points. Halving the cycles would add 20 points; raising utilisation to 100% would add only 12."
```

## The traces

Each trace is a recorded sequence of `malloc`, `free` and `realloc` calls; you have met them all in the scoreboards of chapters 11 and 12.

- **Phases** builds a data structure, tears most of it down, and repeats with other sizes.
- **Compiler pass** makes many small temporaries and keeps a few long-lived tables.
- **Request server** allocates a burst of buffers per request and frees them when the request ends.
- **Growing buffers** grows buffers with `realloc` while small temporaries come and go.
- **Binary trees** builds and drops complete binary trees, in the manner of the GCBench garbage-collector benchmark.
- **Random** draws sizes and lifetimes at random: the trace that, as chapter 11 warned, misleads.
- **Adversary** leaves holes everywhere and none big enough.

## Warming up: realloc

The reference allocators all implement `realloc` the lazy way: allocate a new block, copy, free the old one. That is correct, and on the *Growing buffers* trace it is ruinously slow, because a buffer that grows a few bytes at a time is copied every time. Most of the time it does not need to move.

```build
id: the-malloc-lab/realloc
title: realloc in place
storage: true
prompt: |
  This is the implicit-list allocator from chapter 10 with a `realloc` added. The starter always moves the block: it allocates a new one, copies the payload, and frees the old one. Make it grow the block **in place** when it can: absorb the next block if that is free and the two together are big enough, and if nothing but free space (or nothing at all) lies between this block and the end of the heap, extend the heap first. Only move the block when neither works. The test replays the *Growing buffers* trace, where moving costs about 400 cycles per operation.
starter: |
  import type { Heap } from '@mm/heap';

  const W = 8;
  const align = (n: number) => Math.ceil(n / 16) * 16;
  const pack = (size: number, alloc: boolean) => size + (alloc ? 1 : 0);

  export function createAllocator(heap: Heap) {
    let start = 0;

    const size = (hdr: number) => heap.load64(hdr) - (heap.load64(hdr) % 2);
    const used = (hdr: number) => heap.load64(hdr) % 2 === 1;
    const hdrOf = (bp: number) => bp - W;
    const nextBp = (bp: number) => bp + size(hdrOf(bp));
    const prevBp = (bp: number) => bp - size(bp - 2 * W);
    function mark(bp: number, sz: number, alloc: boolean) {
      heap.store64(hdrOf(bp), pack(sz, alloc));
      heap.store64(bp + sz - 2 * W, pack(sz, alloc));
    }

    function init() {
      const p = heap.sbrk(4 * W);
      heap.store64(p, 0);
      heap.store64(p + W, pack(16, true));
      heap.store64(p + 2 * W, pack(16, true));
      heap.store64(p + 3 * W, pack(0, true));
      start = p + 2 * W;
    }

    function coalesce(bp: number): number {
      let sz = size(hdrOf(bp));
      const next = nextBp(bp);
      if (!used(hdrOf(next))) sz += size(hdrOf(next));
      if (!used(bp - 2 * W)) {
        bp = prevBp(bp);
        sz += size(hdrOf(bp));
      }
      mark(bp, sz, false);
      return bp;
    }

    function extend(bytes: number): number {
      const sz = align(bytes);
      const bp = heap.sbrk(sz);
      if (bp < 0) return 0;
      mark(bp, sz, false);
      heap.store64(hdrOf(nextBp(bp)), pack(0, true));
      return coalesce(bp);
    }

    function place(bp: number, need: number) {
      const sz = size(hdrOf(bp));
      if (sz - need >= 32) {
        mark(bp, need, true);
        mark(bp + need, sz - need, false);
      } else mark(bp, sz, true);
    }

    return {
      malloc(n: number): number {
        if (n <= 0) return 0;
        if (!start) init();
        const need = Math.max(32, align(n + 2 * W));
        for (let bp = nextBp(start); size(hdrOf(bp)) > 0; bp = nextBp(bp)) {
          if (!used(hdrOf(bp)) && size(hdrOf(bp)) >= need) {
            place(bp, need);
            return bp;
          }
        }
        const bp = extend(Math.max(need, 4096));
        if (!bp) return 0;
        place(bp, need);
        return bp;
      },
      free(bp: number): void {
        mark(bp, size(hdrOf(bp)), false);
        coalesce(bp);
      },
      realloc(bp: number, n: number): number {
        if (!bp) return this.malloc(n);
        if (n <= 0) {
          this.free(bp);
          return 0;
        }
        const need = Math.max(32, align(n + 2 * W));
        const sz = size(hdrOf(bp));
        if (sz >= need) return bp;
        // TODO: grow in place: absorb a free next block, extending the heap first if this block (or its free
        // neighbour) is the last one before the epilogue.
        const np = this.malloc(n);
        if (!np) return 0;
        for (let i = 0; i < sz - 2 * W; i += 4) heap.store32(np + i, heap.load32(bp + i));
        this.free(bp);
        return np;
      },
    };
  }
solution: |
  import type { Heap } from '@mm/heap';

  const W = 8;
  const align = (n: number) => Math.ceil(n / 16) * 16;
  const pack = (size: number, alloc: boolean) => size + (alloc ? 1 : 0);

  export function createAllocator(heap: Heap) {
    let start = 0;

    const size = (hdr: number) => heap.load64(hdr) - (heap.load64(hdr) % 2);
    const used = (hdr: number) => heap.load64(hdr) % 2 === 1;
    const hdrOf = (bp: number) => bp - W;
    const nextBp = (bp: number) => bp + size(hdrOf(bp));
    const prevBp = (bp: number) => bp - size(bp - 2 * W);
    function mark(bp: number, sz: number, alloc: boolean) {
      heap.store64(hdrOf(bp), pack(sz, alloc));
      heap.store64(bp + sz - 2 * W, pack(sz, alloc));
    }

    function init() {
      const p = heap.sbrk(4 * W);
      heap.store64(p, 0);
      heap.store64(p + W, pack(16, true));
      heap.store64(p + 2 * W, pack(16, true));
      heap.store64(p + 3 * W, pack(0, true));
      start = p + 2 * W;
    }

    function coalesce(bp: number): number {
      let sz = size(hdrOf(bp));
      const next = nextBp(bp);
      if (!used(hdrOf(next))) sz += size(hdrOf(next));
      if (!used(bp - 2 * W)) {
        bp = prevBp(bp);
        sz += size(hdrOf(bp));
      }
      mark(bp, sz, false);
      return bp;
    }

    function extend(bytes: number): number {
      const sz = align(bytes);
      const bp = heap.sbrk(sz);
      if (bp < 0) return 0;
      mark(bp, sz, false);
      heap.store64(hdrOf(nextBp(bp)), pack(0, true));
      return coalesce(bp);
    }

    function place(bp: number, need: number) {
      const sz = size(hdrOf(bp));
      if (sz - need >= 32) {
        mark(bp, need, true);
        mark(bp + need, sz - need, false);
      } else mark(bp, sz, true);
    }

    return {
      malloc(n: number): number {
        if (n <= 0) return 0;
        if (!start) init();
        const need = Math.max(32, align(n + 2 * W));
        for (let bp = nextBp(start); size(hdrOf(bp)) > 0; bp = nextBp(bp)) {
          if (!used(hdrOf(bp)) && size(hdrOf(bp)) >= need) {
            place(bp, need);
            return bp;
          }
        }
        const bp = extend(Math.max(need, 4096));
        if (!bp) return 0;
        place(bp, need);
        return bp;
      },
      free(bp: number): void {
        mark(bp, size(hdrOf(bp)), false);
        coalesce(bp);
      },
      realloc(bp: number, n: number): number {
        if (!bp) return this.malloc(n);
        if (n <= 0) {
          this.free(bp);
          return 0;
        }
        const need = Math.max(32, align(n + 2 * W));
        const sz = size(hdrOf(bp));
        if (sz >= need) return bp;
        let next = nextBp(bp);
        let room = sz + (used(hdrOf(next)) ? 0 : size(hdrOf(next)));
        const last = used(hdrOf(next)) ? next : nextBp(next);
        if (room < need && size(hdrOf(last)) === 0) {
          // Nothing after us but free space or the epilogue: grow the heap, which merges with the free neighbour.
          if (!extend(Math.max(need - room, 4096))) return 0;
          next = nextBp(bp);
          room = sz + size(hdrOf(next));
        }
        if (room >= need) {
          mark(bp, room, true);
          place(bp, need);
          return bp;
        }
        const np = this.malloc(n);
        if (!np) return 0;
        for (let i = 0; i < sz - 2 * W; i += 4) heap.store32(np + i, heap.load32(bp + i));
        this.free(bp);
        return np;
      },
    };
  }
tests: |
  import { test, expect } from '@mm/test';
  import { runTrace } from '@mm/check';
  import { TRACE_BANK as BANK } from '@mm/trace';
  import { createAllocator } from './solution';
  test('every trace passes the heap checker, with contents kept across realloc', () => {
    for (const t of BANK) {
      const r = runTrace(createAllocator, t.ops);
      expect(`${t.name}: ${r.failure?.message ?? 'ok'}`).toBe(`${t.name}: ok`);
    }
  });
  test('growing buffers in place: fewer than 150 cycles per operation on the Growing buffers trace', () => {
    const r = runTrace(createAllocator, BANK.find((t) => t.id === 'realloc')!.ops, { cache: true });
    expect(Math.round(r.cyclesPerOp)).toBeLessThan(150);
  });
hints:
  - "The block after `bp` is `nextBp(bp)`. If it is free, the room available is `size(hdrOf(bp)) + size(hdrOf(next))`."
  - "The epilogue has size 0. If the block after `bp` (or after its free neighbour) has size 0, `extend` adds a free block there and merges it with that neighbour."
  - "Once there is room: `mark(bp, room, true)` makes one big allocated block, and `place(bp, need)` splits off the rest."
```

Utilisation on *Growing buffers* does not change much: the trace is small, and an allocator that grows the heap 4 KiB at a time holds about four times what the trace needs whatever `realloc` does. That is a hint for the lab.

## Where the points are

The reference allocators set the bar. Here is how they score, with the heap limit in force:

::scoreboard{traces="phases,compiler,server,realloc,trees,random,adversary" allocators="bump,first,next,best,explicit,explicit-addr,segregated,classes" limit n="14.1" title="The reference allocators" caption="The same seven traces as the bench, with the same heap limit. Switch between utilisation and cycles to see where each design loses its points."}

A few moves are worth knowing before you start. Each is a trade between the two terms of the score.

1. **An explicit free list** (chapter 11) stops `malloc` from walking past allocated blocks. It is the single biggest speed-up over the implicit list.
2. **Segregated lists** make the search short *and* close to best fit. The reference version uses ten size classes; more classes, or best fit within a class, can push utilisation up.
3. **Drop the footer from allocated blocks.** A footer exists only so that the *next* block can find this block’s start when it is freed and wants to coalesce backwards, and it only needs to do that if this block is free. Keep a “previous block is allocated” bit in each header, and allocated blocks need no footer at all: on small objects that is 8 bytes in 32. Bryant and O’Hallaron describe this optimisation in their textbook :cite[bryant2016].
4. **Mind the chunk size.** Growing the heap 4 KiB at a time costs nothing on the big traces and a lot of utilisation on the small ones. Ask for what you need, and coalesce the new space with a free block at the end of the heap.
5. **A cache in front** (chapter 12) makes the common sizes fast, but cached blocks are not free for other sizes and count against utilisation.
6. **realloc in place**, as above, and perhaps a little slack when a buffer grows, so that the next `realloc` finds room.

Nobody gets 100. The limits of chapter 11 still apply, and the adversary trace is built to hurt. A good allocator is one where you can explain every lost point.

## The bench

::lab-bench{n="14.2"}

The bench is also on its own page, [the lab](/lab), with a larger editor. Your draft and your best score are kept in this browser. When every trace passes, *Use this allocator in the figures* makes your allocator available to the heap inspector and the other figures that offer “my allocator”.

:::key
A complete allocator is a set of trade-offs between space and time, and the malloc lab’s performance index makes the trade explicit: 60% for utilisation, 40% for throughput. The biggest wins come from not searching (explicit and segregated lists), not wasting (no footers on allocated blocks, careful chunk sizes), and not copying (`realloc` in place).
:::

:::whofrees
You do, and so does every program that will ever run on your allocator. The allocator’s whole job is to make the programmer’s `free` cheap and its memory reusable; it cannot make the call happen at the right time. That is the subject of Part IV, which looks at what happens when programs call `free` too early, too late, twice, or never.
:::

## What’s next

Part III has been about the allocator’s side of the contract. Part IV turns to the program’s side: the error zoo of use-after-free, double free, leaks and overflows; the tools that catch them; and the language designs that rule them out.
