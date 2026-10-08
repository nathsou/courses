---
title: A heap from scratch
summary: Headers, free lists, boundary tags and coalescing. The bookkeeping has to fit in the heap.
number: 10
duration: 75 minutes
prerequisites: [bytes-and-addresses, anatomy-of-an-address-space]
---

`malloc` is the most used function in C, and probably in all of computing: every other runtime you have used, from Python’s to Java’s, either calls it or contains something very like it. Its contract fits in two lines:

```c
void *malloc(size_t n);   // give me n bytes, suitably aligned, that nobody else is using
void free(void *p);       // I am done with the block malloc gave me at p
```

Behind those two lines is a surprisingly deep problem. The kernel will give `malloc` memory in big pieces (chapter 7: `brk` and `mmap`), and the program asks for small pieces in an unpredictable order and gives them back in a different unpredictable order. `malloc` has to remember which pieces are in use, find room for each new request quickly, and reuse what was freed, all without wasting much memory, and with nowhere to keep its records except the very memory it is managing.

This chapter builds a working `malloc` in three steps, and you will write two of them. Chapter 11 then shows why the hard part is not making it work, but making it waste little.

## Step one: the bump allocator

The simplest allocator is the one chapter 8 used for the stack, minus the stack: keep a pointer to the next free byte and move it forward.

```typescript
let next = 0, end = 0;
function malloc(n) {
  if (!next) next = end = heap.sbrk(0);       // where the heap starts
  const p = align(next);                       // round up to a multiple of 16
  if (p + n > end) { heap.sbrk(4096); end += 4096; }   // ask the kernel for more
  next = p + n;
  return p;
}
function free(p) {}                            // nothing: memory is never reused
```

It is very fast (a few instructions per allocation) and never wastes a byte between blocks. It also never reuses anything. A program that allocates and frees in a loop grows without limit. That is not always a problem: a short-lived program, a compiler pass, or a game that throws away everything at the end of each frame can use exactly this, and chapter 13 is about them. But a general-purpose `malloc` must reuse freed memory.

```build
id: a-heap-from-scratch/bump
title: A bump allocator
prompt: |
  Write `createAllocator(heap)` returning `{ malloc, free }` where `malloc(n)` returns a 16-byte-aligned address of `n` fresh bytes (or 0 if `heap.sbrk` returns -1) and `free` does nothing. `heap.sbrk(bytes)` grows the heap and returns the old end. The starter returns whatever `sbrk` gives, which is not always aligned. Use only scalar variables: this is the storage rule from now on.
starter: |
  import type { Heap } from '@mm/heap';

  export function createAllocator(heap: Heap) {
    return {
      malloc(n: number): number {
        return heap.sbrk(n);
      },
      free(p: number): void {},
    };
  }
solution: |
  import type { Heap } from '@mm/heap';

  export function createAllocator(heap: Heap) {
    let next = 0;
    let end = 0;
    const align = (x: number) => Math.ceil(x / 16) * 16;
    return {
      malloc(n: number): number {
        if (!next) next = end = heap.sbrk(0);
        const p = align(next);
        if (p + n > end) {
          const grow = Math.max(4096, p + n - end);
          if (heap.sbrk(grow) < 0) return 0;
          end += grow;
        }
        next = p + n;
        return p;
      },
      free(p: number): void {},
    };
  }
storage: true
tests: |
  import { test, expect } from '@mm/test';
  import { runTrace } from '@mm/check';
  import { TRACE_BANK as BANK } from '@mm/trace';
  import { FlatHeap } from '@mm/heap';
  import { createAllocator } from './solution';
  test('every block is aligned, inside the heap, and overlaps nothing', () => {
    for (const t of BANK.filter((t) => t.id !== 'realloc')) {
      const r = runTrace(createAllocator, t.ops);
      expect(r.failure?.message ?? 'ok').toBe('ok');
    }
  });
  test('it asks the kernel for memory in large steps, not once per request', () => {
    const heap = new FlatHeap();
    const a = createAllocator(heap);
    for (let i = 0; i < 1000; i++) expect(a.malloc(8)).toBeGreaterThan(0);
    expect(heap.stats.sbrkCalls).toBeLessThan(10);
  });
hints:
  - Round with `Math.ceil(x / 16) * 16`.
  - "`heap.sbrk(0)` tells you where the heap ends without changing it."
```

## Step two: headers and an implicit free list

To reuse memory, `free` must know how big the block at `p` is (the program does not say), and `malloc` must be able to find freed blocks. The classic answer stores a **header** word just before each block’s payload, holding the block’s size. All blocks, used and free, then sit back to back in the heap, and walking from one header to the next (add the size) visits every block. Mark each header with whether the block is in use, and `malloc` can walk the heap looking for a free block that is big enough. This is an **implicit free list**: the free blocks are not linked together explicitly; they are found by walking past the used ones.

Since sizes are multiples of 16, the lowest bit of the size is always zero and can hold the “allocated” flag for free. A header holding `49` means a 48-byte block that is in use.

When `malloc` finds a free block bigger than it needs, it **splits** it: the front part becomes the allocated block and the rest becomes a new, smaller free block with its own header. When the program frees a block, it is marked free. That is enough to work, and it is the version in the figure below with the label *no coalescing*. Try this: allocate three blocks of 24 bytes, free all three, then ask for 80.

## Step three: coalescing and boundary tags

Without coalescing, the three freed blocks stay three separate free blocks of 48 bytes, and an 80-byte request fits in none of them, even though 144 contiguous bytes are free. The allocator extends the heap instead. Over a long run, a heap without coalescing fills up with small free fragments nobody can use.

**Coalescing** merges a freed block with any free neighbours. The next neighbour is easy to find: its header is right after this block. The previous one is the problem: walking backwards needs to know where the previous block starts, and its header is at the far end. Donald Knuth’s fix, in the first volume of *The Art of Computer Programming* :cite[knuth1968], is the **boundary tag**: a copy of the header, called the **footer**, at the end of every block. The word just before a block’s header is then the previous block’s footer, which gives its size, which gives its start. Coalescing becomes a constant-time operation.

Two more tricks finish the design. A tiny allocated **prologue** block at the start of the heap and a zero-sized allocated **epilogue** header at the end mean that every real block has neighbours on both sides, so coalescing never needs to check whether it is at an edge. The layout of every block is then:

```text
         header             payload (16-aligned)                         footer
   ┌──────────────┬──────────────────────────────────────────────┬──────────────┐
   │ size | alloc │  …what the program asked for, plus padding… │ size | alloc │
   └──────────────┴──────────────────────────────────────────────┴──────────────┘
                  ↑ the address malloc returns
```

Here it is, live. Every word of the simulated heap is shown; hover over any of them. The example allocates four blocks and frees two, so there are free blocks to look at.

::heap-inspector{allocators="first,nocoalesce,best,explicit" script="a 24, a 100, a 24, a 40, f 2, f 3" n="10.1" title="The heap, word by word" caption="A real allocator on a small simulated heap (it asks the kernel for 256 bytes at a time here, so you can see it all). Grey words are headers and footers; coloured words are payloads; hatched words are free; violet words are pointers stored inside free blocks."}

Free block #2 and then block #3 in the first-fit allocator and watch the two free blocks become one, with a single header and footer. Switch to *no coalescing* and do the same.

:::question
Look at a 24-byte block. How many bytes of heap does it really occupy, and why?
:::

:::details[Answer]
48. Eight for the header, eight for the footer, and the 24-byte payload rounded up so that the whole block stays a multiple of 16 (24 + 16 = 40, rounded to 48). For small objects, an allocator like this one spends half its memory on bookkeeping and padding. Chapter 11 measures this waste, and chapter 12 shows allocators that keep no per-object headers at all.
:::

## Step four: an explicit free list

Walking the implicit list visits every block, used or free, so `malloc` gets slower as the heap fills up. Free blocks have empty payloads, so why not use them? An **explicit free list** stores two pointers inside each free block, to the next and the previous free block, and `malloc` searches only the free blocks. In the figure, switch to *explicit free list*: the violet words are those pointers. Freeing pushes the block onto the front of the list (last in, first out); allocating unlinks it. The list costs nothing in memory, because it lives in space that is unused anyway, but it does impose a minimum block size: a free block must have room for a header, a footer and two pointers, 32 bytes.

## Build it: your own implicit-list allocator

Now write it. The starter has the layout, the prologue and epilogue, the heap extension and a first-fit search already in place. What it lacks is splitting (it hands out whole free blocks, however large) and coalescing (it never merges). The tests run your allocator through the course’s heap checker on the trace bank, so it must stay correct, and they also require it to use memory efficiently, which is where splitting and coalescing come in.

```build
id: a-heap-from-scratch/implicit
title: Split and coalesce
use: allocator
storage: true
prompt: |
  Complete `place` (split a block when the leftover would be at least 32 bytes) and `coalesce` (merge a free block with a free previous and/or next neighbour, using the boundary tags). Everything else is done. Remember the storage rule: the only state outside the heap is `start`, a number. Once this passes, the heap inspector in this chapter and later figures can run your allocator.
starter: |
  import type { Heap } from '@mm/heap';

  const W = 8;
  const align = (n: number) => Math.ceil(n / 16) * 16;
  const pack = (size: number, alloc: boolean) => size + (alloc ? 1 : 0);

  export function createAllocator(heap: Heap) {
    let start = 0; // payload address of the prologue block

    const size = (hdr: number) => heap.load64(hdr) - (heap.load64(hdr) % 2);
    const used = (hdr: number) => heap.load64(hdr) % 2 === 1;
    const hdrOf = (bp: number) => bp - W;
    const nextBp = (bp: number) => bp + size(hdrOf(bp));
    const prevBp = (bp: number) => bp - size(bp - 2 * W); // the previous block's footer is just before our header
    function mark(bp: number, sz: number, alloc: boolean) {
      heap.store64(hdrOf(bp), pack(sz, alloc));
      heap.store64(bp + sz - 2 * W, pack(sz, alloc));
    }

    function init() {
      const p = heap.sbrk(4 * W);
      heap.store64(p, 0); // padding
      heap.store64(p + W, pack(16, true)); // prologue header
      heap.store64(p + 2 * W, pack(16, true)); // prologue footer
      heap.store64(p + 3 * W, pack(0, true)); // epilogue header
      start = p + 2 * W;
    }

    function coalesce(bp: number): number {
      // TODO: merge with a free next block and/or a free previous block; return the merged block's address.
      return bp;
    }

    function extend(bytes: number): number {
      const sz = align(bytes);
      const bp = heap.sbrk(sz);
      if (bp < 0) return 0;
      mark(bp, sz, false); // the old epilogue becomes this block's header
      heap.store64(hdrOf(nextBp(bp)), pack(0, true)); // new epilogue
      return coalesce(bp);
    }

    function place(bp: number, need: number) {
      // TODO: if the block is at least `need + 32` bytes, split off the rest as a free block.
      mark(bp, size(hdrOf(bp)), true);
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
    };
  }
tests: |
  import { test, expect } from '@mm/test';
  import { runTrace } from '@mm/check';
  import { TRACE_BANK } from '@mm/trace';
  import { createAllocator } from './solution';
  const trace = (id: string) => TRACE_BANK.find((t) => t.id === id)!.ops;
  test('correct on every trace (the heap checker passes)', () => {
    for (const t of TRACE_BANK.filter((t) => t.id !== 'realloc')) {
      const r = runTrace(createAllocator, t.ops);
      expect(`${t.name}: ${r.failure?.message ?? 'ok'}`).toBe(`${t.name}: ok`);
    }
  });
  test('splitting: many small blocks fit in one extension', () => {
    const ops = Array.from({ length: 60 }, (_, i) => ({ op: 'a' as const, id: i, size: 24 }));
    const r = runTrace(createAllocator, ops);
    expect(r.peakHeap).toBeLessThanOrEqual(4096 + 64);
  });
  test('coalescing: freed neighbours make room for a bigger block', () => {
    const ops = [
      { op: 'a' as const, id: 1, size: 1000 }, { op: 'a' as const, id: 2, size: 1000 }, { op: 'a' as const, id: 3, size: 1000 },
      { op: 'f' as const, id: 1 }, { op: 'f' as const, id: 2 },
      { op: 'a' as const, id: 4, size: 1900 },
    ];
    const r = runTrace(createAllocator, ops);
    expect(r.ok).toBe(true);
    expect(r.peakHeap).toBeLessThanOrEqual(4096 + 64);
  });
  test('utilisation on the phases and compiler traces is at least 70%', () => {
    expect(runTrace(createAllocator, trace('phases')).utilisation).toBeGreaterThan(0.7);
    expect(runTrace(createAllocator, trace('compiler')).utilisation).toBeGreaterThan(0.7);
  });
hints:
  - "Splitting: compute the leftover `size - need`. If it is at least 32, mark the front `need` bytes allocated and the rest free, each with its own header and footer (`mark` writes both)."
  - "Coalescing: the next block’s header is at `hdrOf(nextBp(bp))`; the previous block’s footer is the word at `bp - 2 * W`."
  - Merge forwards first (it does not move the start), then backwards (it does).
explain: |
  This is, give or take details, the allocator in the CS:APP malloc lab and the textbook ancestor of every boundary-tag allocator. Chapter 11 measures how it fragments, and chapter 14 asks you to make it fast and dense enough to beat the course’s reference allocators.
```

:::hood
The course’s reference version of this allocator is `implicitList` in `src/lib/mm/heap/allocators.ts`, written against the same Heap API as your code. The heap checker that tests your allocator (`src/lib/mm/check/checker.ts`) is independent of it: it records every block it was given, fills each payload with a pattern, and checks on every operation that blocks are aligned, inside the heap and disjoint, and that payloads were not overwritten while they were in use. That last check is what catches an allocator writing its bookkeeping into a live block.
:::

## Giving memory back

One question remains: when does memory go back to the kernel? Freeing a block in the middle of the heap cannot shrink it, because `brk` only moves the end. Real allocators return the top of the heap when the topmost block is free and large, and use `mmap` for big requests so that each can be unmapped on its own (chapter 7). For memory in the middle of the heap they can use `madvise`, which tells the kernel “the contents of these pages no longer matter”: the kernel frees the frames and, if the program touches the pages again, maps fresh zeroed ones on demand. Chapter 12 shows how allocators decide when to do this.

:::whofrees
`malloc` frees a chunk when the program calls `free`, and then only within its own books: the chunk goes back on a free list, merged with its neighbours. Whether the memory ever goes back to the kernel is a separate decision, and usually the answer is “not yet”: the next `malloc` will probably want it.
:::

## What’s next

The allocator you just wrote is correct. It is also, depending on the order of requests, either quite good or quite bad at using memory. The next chapter is about why, and you will get to play the allocator yourself.
