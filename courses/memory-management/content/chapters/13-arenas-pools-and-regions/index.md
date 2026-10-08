---
title: Arenas, pools and regions
summary: Stop freeing one object at a time; and two spacecraft that ran out of memory.
number: 13
duration: 45 minutes
prerequisites: [fragmentation]
---

A web server receives a request. To answer it, the server parses the headers into a dozen small strings, builds a little tree for the URL, looks something up, formats a response into a buffer, and sends it. Then every one of those objects dies at the same instant. A compiler does the same with each function it compiles; a game with each frame it draws.

`malloc` and `free` treat every object as an individual with its own lifetime, and charge for the privilege: a header on every block, a search on every allocation, a merge on every free. When objects come in batches that live and die together, there is a much cheaper deal available.

## One arena per request

An **arena** is a bump allocator (chapter 10) that can be emptied. Allocation moves a pointer forward. There is no `free`. When the batch is done, the arena is **reset** in one step: the pointer moves back to the start, and every object in it is gone.

::arena-timeline

Press play with *No cache* selected. Both heaps hold about the same amount of memory, because both reuse it after each request. But look at the cost columns. The malloc/free heap makes two calls per object and touches its free lists hundreds of times per request; the arena makes one call per object, plus one reset, and the allocator itself never touches memory at all: its only state is a pointer.

David Hanson made the case for this in 1990: allocate objects with the same lifetime in the same arena, and free them all at once :cite[hanson1990]. His lcc compiler, and GCC with its *obstacks*, both allocate this way :cite[berger2002]. Berger and colleagues trace region-style allocation back to Douglas Ross’s AED free storage package of 1967 :cite[ross1967, berger2002].

```numeric
id: arenas/cost
title: What a reset saves
prompt: "A request allocates 2,000 objects and frees them all when it ends. With malloc and free, how many allocator calls does one request make?"
answer: 4000
unit: calls with malloc and free
tolerance: 0
explain: "2,000 calls to malloc and 2,000 to free: 4,000. The arena makes 2,000 allocations and a single reset, 2,001 calls, and each allocation is a pointer bump with no list to search."
```

## The catch

Now select *Cache entry allocated in the request’s arena*. Each request decides to keep one result, the tall block, in a cache that outlives the request. But the code allocated it from the request’s arena, as it did everything else, and when the request ends the arena is reset. The cache now holds a pointer into memory that is free. At the next request, new objects are bump-allocated over it: the red blocks are cache entries that have already been overwritten.

That is a dangling pointer, the subject of Part IV, and arenas make it easy to create: one object whose lifetime does not match its batch is enough. The two obvious fixes are both on the selector.

- *Never reset the arena* keeps the cache entries valid by keeping everything else alive too. Memory grows without bound.
- *Copy the entry to a long-lived arena* gives the long-lived object a home whose lifetime matches its own. This is the right answer, and it is what real arena-based programs do: they keep a hierarchy of arenas, one per request, one per connection, one for the whole process, and allocate each object in the arena that will live as long as it needs to.

Emery Berger, Benjamin Zorn and Kathryn McKinley studied eight programs with custom allocators and found that only the two using regions beat a good general-purpose allocator, by up to 44% :cite[berger2002]. They also found the cost: because a region can only be freed as a whole, regions retained up to 230% more memory than freeing each object after its last use :cite[berger2002]. Their answer, *reaps*, is a region that also lets you free an individual object.

## Arenas that share

So far one arena owned one stretch of heap. A real program has many arenas alive at once, and they need to share memory: when a request’s arena is destroyed, its memory should be available to the next request’s arena. The usual design hands out memory in fixed-size **chunks**. An arena is a linked list of chunks; it bump-allocates from its newest chunk and takes another when that is full; destroying an arena puts all its chunks on a shared list of spare chunks.

```build
id: arenas/chunks
title: Arenas from a shared pool of chunks
storage: true
prompt: |
  Implement arenas that take 4 KiB chunks from a shared pool. Each chunk starts with a 32-byte header: the next chunk in its list, the chunk’s *top* (where the next allocation goes), and, in an arena’s first chunk only, the arena’s current chunk. An arena’s handle is the address of its first chunk. `chunk()` and `create()` are done. Complete `alloc`, which must take a fresh chunk when the current one is full, and `destroy`, which must put every chunk of the arena on the `spare` list so that later arenas reuse them.
starter: |
  import type { Heap } from '@mm/heap';

  const CHUNK = 4096;
  const HDR = 32; // next chunk, top, current chunk (first chunk only), padding

  export function createArenas(heap: Heap) {
    let spare = 0; // a list of unused chunks, linked through their first word

    const next = (c: number) => heap.load64(c);
    const setNext = (c: number, v: number) => heap.store64(c, v);
    const top = (c: number) => heap.load64(c + 8);
    const setTop = (c: number, v: number) => heap.store64(c + 8, v);
    const current = (a: number) => heap.load64(a + 16);
    const setCurrent = (a: number, c: number) => heap.store64(a + 16, c);

    /** A fresh chunk: from the spare list if possible, otherwise from the kernel. 0 if out of memory. */
    function chunk(): number {
      let c = spare;
      if (c) spare = next(c);
      else {
        c = heap.sbrk(CHUNK);
        if (c < 0) return 0;
      }
      setNext(c, 0);
      setTop(c, c + HDR);
      return c;
    }

    return {
      /** A new, empty arena. Its handle is the address of its first chunk. */
      create(): number {
        const a = chunk();
        if (a) setCurrent(a, a);
        return a;
      },
      /** n bytes (at most 4000), 16-byte aligned, from arena a. */
      alloc(a: number, n: number): number {
        const size = Math.ceil(n / 16) * 16;
        const c = current(a);
        if (top(c) + size > c + CHUNK) {
          return 0; // TODO: take a fresh chunk, link it into the arena's list, make it current
        }
        const p = top(c);
        setTop(c, p + size);
        return p;
      },
      /** Free everything in arena a at once. */
      destroy(a: number): void {
        // TODO: walk the arena's chunks and push each onto the spare list
      },
    };
  }
solution: |
  import type { Heap } from '@mm/heap';

  const CHUNK = 4096;
  const HDR = 32; // next chunk, top, current chunk (first chunk only), padding

  export function createArenas(heap: Heap) {
    let spare = 0; // a list of unused chunks, linked through their first word

    const next = (c: number) => heap.load64(c);
    const setNext = (c: number, v: number) => heap.store64(c, v);
    const top = (c: number) => heap.load64(c + 8);
    const setTop = (c: number, v: number) => heap.store64(c + 8, v);
    const current = (a: number) => heap.load64(a + 16);
    const setCurrent = (a: number, c: number) => heap.store64(a + 16, c);

    /** A fresh chunk: from the spare list if possible, otherwise from the kernel. 0 if out of memory. */
    function chunk(): number {
      let c = spare;
      if (c) spare = next(c);
      else {
        c = heap.sbrk(CHUNK);
        if (c < 0) return 0;
      }
      setNext(c, 0);
      setTop(c, c + HDR);
      return c;
    }

    return {
      /** A new, empty arena. Its handle is the address of its first chunk. */
      create(): number {
        const a = chunk();
        if (a) setCurrent(a, a);
        return a;
      },
      /** n bytes (at most 4000), 16-byte aligned, from arena a. */
      alloc(a: number, n: number): number {
        const size = Math.ceil(n / 16) * 16;
        let c = current(a);
        if (top(c) + size > c + CHUNK) {
          const fresh = chunk();
          if (!fresh) return 0;
          setNext(fresh, next(a)); // chain every later chunk just after the first
          setNext(a, fresh);
          setCurrent(a, fresh);
          c = fresh;
        }
        const p = top(c);
        setTop(c, p + size);
        return p;
      },
      /** Free everything in arena a at once. */
      destroy(a: number): void {
        let c = a;
        while (c) {
          const n = next(c);
          setNext(c, spare);
          spare = c;
          c = n;
        }
      },
    };
  }
tests: |
  import { test, expect } from '@mm/test';
  import { FlatHeap } from '@mm/heap';
  import { createArenas } from './solution';

  function overlaps(blocks: number[][]) {
    const s = [...blocks].sort((x, y) => x[0]! - y[0]!);
    for (let i = 1; i < s.length; i++) if (s[i - 1]![0]! + s[i - 1]![1]! > s[i]![0]!) return true;
    return false;
  }

  test('small allocations are aligned and do not overlap, across two arenas', () => {
    const heap = new FlatHeap();
    const A = createArenas(heap);
    const a = A.create();
    const b = A.create();
    const blocks: number[][] = [];
    for (let i = 0; i < 50; i++) {
      for (const [ar, n] of [[a, 24], [b, 40]]) {
        const p = A.alloc(ar!, n!);
        expect(p % 16).toBe(0);
        blocks.push([p, n!]);
      }
    }
    expect(overlaps(blocks)).toBe(false);
  });
  test('an arena grows past one chunk', () => {
    const heap = new FlatHeap();
    const A = createArenas(heap);
    const a = A.create();
    const blocks: number[][] = [];
    for (let i = 0; i < 40; i++) {
      const p = A.alloc(a, 1000);
      expect(p).toBeGreaterThan(0);
      expect(p + 1000).toBeLessThanOrEqual(heap.sbrk(0));
      blocks.push([p, 1000]);
    }
    expect(overlaps(blocks)).toBe(false);
  });
  test('destroying an arena gives its chunks to the next arena: no new memory needed', () => {
    const heap = new FlatHeap();
    const A = createArenas(heap);
    for (let round = 0; round < 5; round++) {
      const a = A.create();
      for (let i = 0; i < 30; i++) A.alloc(a, 900);
      A.destroy(a);
    }
    expect(heap.sbrk(0) - heap.base).toBeLessThanOrEqual(10 * 4096);
  });
hints:
  - "When the current chunk is full: `fresh = chunk()`, link it into the arena’s list (after the first chunk is simplest), then `setCurrent(a, fresh)`."
  - In `destroy`, read a chunk’s `next` before you overwrite it with `spare`.
```

The Apache web server is built this way. Its memory is managed with regions it calls *pools*: one per connection, with sub-pools inside it, so that when a connection ends or fails a single call tears down everything associated with it, and nothing leaks :cite[berger2002]. The same design constrains the modules that extend Apache: a module cannot free one object, so a producer–consumer pattern inside a pool would grow without bound :cite[berger2002].

## Pools

A **pool**, in the narrow sense, is a free list of objects of one fixed size: the slab caches of chapter 9 are pools, and so are the thread caches of chapter 12. Embedded and safety-critical systems often allocate *only* from fixed pools sized at design time, so that the worst case can be known in advance. The price is that a pool can run dry while other memory sits idle, and what happens next is a design decision too.

::museum{exhibit="apollo11-1969"}

Don Eyles, who worked on the landing software, explains that when its pool of core sets ran out, the Executive could not schedule the job it had been asked for, so it restarted, rebuilding only the jobs that mattered :cite[eyles2004]. In the language of this chapter, the restart freed a whole region at once: every half-finished copy of the guidance job, in one step. It was a design for hardware glitches that turned out to shed load too.

Thirty-five years later, a pool that was *not* bounded nearly lost a Mars rover.

::museum{exhibit="spirit-2004"}

The most striking line in Reeves and Neilson’s report is a rule that already existed. The rover’s design guidelines prohibited allocating from the free system memory once initialisation was complete, which is to say: size every pool in advance and never grow it. The rule was enforced for the software JPL wrote, but not for the commercial file system library :cite[reeves2005]. Put in this chapter’s terms, the file system’s memory was an arena that was never reset, because deleting a file did not free its entry, and it was allowed to take memory from everyone else.

## Regions

An arena reset is a manual `free` for a whole batch: it is fast, but the programmer must still get the lifetime right, and the dangling cache entry above shows how easily that goes wrong. Mads Tofte and Jean-Pierre Talpin asked whether a *compiler* could get it right instead. Their region inference for the ML language analyses a program and decides, for every allocation, which region it belongs to and where that region can be freed, with the guarantee that the program never uses an object after its region has been freed :cite[tofte1997]. Regions are created and destroyed in last-in, first-out order, like stack frames, so every object lives in one level of a stack of regions.

Region inference never became mainstream in its pure form, but the idea that lifetimes can be *checked* rather than trusted is the subject of Part IV’s last chapter, where Rust’s borrow checker makes a related promise.

:::key
An **arena** allocates by bumping a pointer and frees a whole batch of objects at once. It is very fast and cannot fragment within a batch, but every object must die with its batch: one long-lived object allocated in a short-lived arena becomes a dangling pointer, and an arena that is never reset is a leak. Real systems use a hierarchy of arenas matched to lifetimes, fixed-size **pools** where the worst case must be known, and, in some languages, **regions** whose lifetimes a compiler checks.
:::

:::whofrees
Nobody frees the objects; somebody frees the **arena**. The question moves from “when does this object die?” to “which batch does this object belong to?”, which is easier to answer correctly for most objects and catastrophic to get wrong for one.
:::

## What’s next

That completes the tour of allocator designs. The next chapter is the lab: everything from chapters 10 to 13 on one bench, a full allocator of your own design, and the scoreboard.
