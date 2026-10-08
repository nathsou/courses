---
title: Fast allocators
summary: One heap, one lock, sixteen threads. Arenas, thread caches and sharded free lists.
number: 12
duration: 40 minutes
prerequisites: [fragmentation]
---

Every allocator in the last two chapters had one heap and assumed one caller. Real servers have dozens of threads, and every one of them calls `malloc` thousands of times a second. If they all share one heap, they must take turns: the free lists are a shared data structure, and two threads splitting the same block at once will corrupt them. The simplest fix is a lock around the whole allocator. Here is what that costs.

## One lock

::contention-view

Start with one thread and 40% of its time spent allocating. Now add threads. With two, the lock is sometimes taken; with four, red appears everywhere; with eight, the threads spend more time waiting than working, and the total work done barely beats four threads. Lower the share of time spent allocating and the problem shrinks, raise it and it grows: a lock costs little when it is rarely wanted.

This is a toy, with made-up costs, but the shape is real. In 2006 Jason Evans wrote that FreeBSD’s scalability work had progressed far enough that the C library’s `malloc` was “now a potential bottleneck for multi-threaded applications running on multiprocessor systems” :cite[evans2006]. Now tick *Thread caches* and watch the red drain away. The rest of this chapter is about why that works and what it costs.

## Many heaps

The first idea is to have several heaps, called **arenas**, each with its own lock, and to spread the threads across them. Two threads using different arenas never wait for each other. This is how glibc’s `malloc` handles threads: it descends from Wolfram Gloger’s *ptmalloc*, which descends from Doug Lea’s dlmalloc, and it creates extra arenas “as pressure from thread collisions increases” :cite[glibcmallocinternals, berger2000]. Per-Åke Larson and Murali Krishnan assigned threads to arenas by hashing the thread identifier :cite[larson1998]; jemalloc, Evans’s allocator for FreeBSD, gives each new thread the next arena in round-robin order and by default makes four times as many arenas as there are processors :cite[evans2006].

Arenas have a cost of their own. Memory freed into one arena can only be reused by threads allocating from that arena. The TCMalloc documentation gives an example from a Google program: a first phase allocated about 300 MB, and when a second phase ran in a different arena it could not reuse any of it, adding another 300 MB to the process :cite[ghemawat2005].

Emery Berger and his co-authors called this **blowup**: the memory a concurrent allocator uses, divided by what an ideal single-threaded allocator would use :cite[berger2000]. The worst case is a common pattern. A *producer* thread allocates messages and hands them to a *consumer* thread, which frees them. If memory freed by the consumer goes into the consumer’s heap, the producer never sees it again and must keep asking for more: the program “consumes more and more memory as it runs” while using a fixed amount :cite[berger2000]. Their allocator, Hoard, keeps one heap per processor plus a global heap, and when a processor’s heap becomes mostly empty it hands a large chunk back to the global heap, where another processor can take it. That bounds blowup to a constant factor :cite[berger2000].

## Thread caches

The second idea goes further: give each thread a small private stash of free blocks, one short list per size class, that it can use **without any lock at all**. `malloc` first looks in the thread’s own list for its size; only when that is empty does it go to the shared heap, under the lock, often taking a batch of blocks at once. `free` puts the block on the thread’s own list; only when that list is full does it return blocks to the shared heap.

Google’s TCMalloc (thread-caching malloc) was built around this. Its authors measured about 300 nanoseconds for a small `malloc`/`free` pair with glibc 2.3’s allocator (ptmalloc2) and about 50 with TCMalloc, and reported “virtually zero contention” for small objects :cite[ghemawat2005]. glibc later gained its own per-thread cache, the **tcache**: an array of singly linked lists, one per chunk size, each limited to a few entries, used before any arena lock is taken :cite[glibcmallocinternals].

Two details make the design work. Lists hold only blocks of one exact size, so the fast path never searches or splits: pop the head, done. And the lists are **bounded**: if a thread could keep everything it ever freed, a thread that frees a lot and allocates little would hoard memory no other thread could use. Blowup again.

The speed comes from more than avoiding the lock. A thread-cache hit touches one list head and one block, both probably in the cache, and it skips the segregated allocator’s splitting, coalescing and list surgery entirely. Our cost model does not simulate threads, but it does count those loads and stores.

```build
id: fast-allocators/tcache
title: A thread cache
storage: true
prompt: |
  Wrap the segregated-fits allocator from chapter 11 in a cache of recently freed blocks, as glibc’s tcache does. Blocks of 32, 48, …, 144 bytes (eight classes) get one LIFO list each, holding at most 7 blocks. The list heads and counts live in a small table in the heap, allocated from the inner allocator on first use. Complete the fast paths in `malloc` and `free`: pop from or push onto the class’s list. The tests replay traces through the checker, require a clear speed-up over the plain segregated allocator on the *Compiler* trace, and check that the cache really is bounded.
starter: |
  import type { Heap } from '@mm/heap';
  import { segregated } from '@mm/allocators';

  const MAX_CACHED = 7;
  const CLASSES = 8; // block sizes 32, 48, …, 144 bytes

  export function createAllocator(heap: Heap) {
    const inner = segregated(8)(heap);
    let table = 0; // CLASSES list heads, then CLASSES counts, in the heap

    // The block size is in the header word just before the payload (low bit = allocated).
    const blockOf = (p: number) => heap.load64(p - 8) - (heap.load64(p - 8) % 2);
    const classOf = (block: number) => (block - 32) / 16;
    const head = (k: number) => table + k * 8;
    const count = (k: number) => table + (CLASSES + k) * 8;

    function init() {
      table = inner.malloc(2 * CLASSES * 8);
      for (let i = 0; i < 2 * CLASSES; i++) heap.store64(table + i * 8, 0);
    }

    return {
      malloc(n: number): number {
        if (!table) init();
        const need = Math.max(32, Math.ceil((n + 16) / 16) * 16); // the block size the inner allocator would use
        const k = classOf(need);
        // TODO: if k < CLASSES and the list for k is not empty, pop its head (the next pointer is the
        // block's first payload word), decrement the count, and return it.
        return inner.malloc(n);
      },
      free(p: number): void {
        if (!p) return;
        const k = classOf(blockOf(p));
        // TODO: if k < CLASSES and fewer than MAX_CACHED blocks are cached, push p and return.
        inner.free(p);
      },
    };
  }
solution: |
  import type { Heap } from '@mm/heap';
  import { segregated } from '@mm/allocators';

  const MAX_CACHED = 7;
  const CLASSES = 8; // block sizes 32, 48, …, 144 bytes

  export function createAllocator(heap: Heap) {
    const inner = segregated(8)(heap);
    let table = 0; // CLASSES list heads, then CLASSES counts, in the heap

    // The block size is in the header word just before the payload (low bit = allocated).
    const blockOf = (p: number) => heap.load64(p - 8) - (heap.load64(p - 8) % 2);
    const classOf = (block: number) => (block - 32) / 16;
    const head = (k: number) => table + k * 8;
    const count = (k: number) => table + (CLASSES + k) * 8;

    function init() {
      table = inner.malloc(2 * CLASSES * 8);
      for (let i = 0; i < 2 * CLASSES; i++) heap.store64(table + i * 8, 0);
    }

    return {
      malloc(n: number): number {
        if (!table) init();
        const need = Math.max(32, Math.ceil((n + 16) / 16) * 16); // the block size the inner allocator would use
        const k = classOf(need);
        if (k < CLASSES) {
          const p = heap.load64(head(k));
          if (p) {
            heap.store64(head(k), heap.load64(p));
            heap.store64(count(k), heap.load64(count(k)) - 1);
            return p;
          }
        }
        return inner.malloc(n);
      },
      free(p: number): void {
        if (!p) return;
        const k = classOf(blockOf(p));
        if (k < CLASSES && heap.load64(count(k)) < MAX_CACHED) {
          heap.store64(p, heap.load64(head(k)));
          heap.store64(head(k), p);
          heap.store64(count(k), heap.load64(count(k)) + 1);
          return;
        }
        inner.free(p);
      },
    };
  }
tests: |
  import { test, expect } from '@mm/test';
  import { runTrace } from '@mm/check';
  import { TRACE_BANK as BANK } from '@mm/trace';
  import { FlatHeap } from '@mm/heap';
  import { segregated } from '@mm/allocators';
  import { createAllocator } from './solution';
  test('every trace passes the heap checker', () => {
    for (const t of BANK) {
      const r = runTrace(createAllocator, t.ops);
      expect(`${t.name}: ${r.failure?.message ?? 'ok'}`).toBe(`${t.name}: ok`);
    }
  });
  test('it is at least 30% faster than plain segregated fits on the Compiler trace', () => {
    const ops = BANK.find((t) => t.id === 'compiler')!.ops;
    const mine = runTrace(createAllocator, ops, { cache: true }).cyclesPerOp;
    const plain = runTrace(segregated(8), ops, { cache: true }).cyclesPerOp;
    expect(Math.round(mine)).toBeLessThan(Math.round(plain * 0.7));
  });
  test('the cache is bounded: freed memory beyond 7 blocks goes back to the heap', () => {
    const heap = new FlatHeap();
    const a = createAllocator(heap);
    const ps: number[] = [];
    for (let i = 0; i < 100; i++) ps.push(a.malloc(24));
    for (const p of ps) a.free(p);
    const before = heap.stats.sbrkCalls;
    expect(a.malloc(4000)).toBeGreaterThan(0);
    expect(heap.stats.sbrkCalls).toBe(before);
  });
hints:
  - The list’s next pointer is stored in the free block itself, at `p`, exactly as in the explicit free list.
  - "To pop: `p = load64(head(k))`, then `store64(head(k), load64(p))`. To push: `store64(p, load64(head(k)))`, then `store64(head(k), p)`."
```

In the course’s cost model, the solution roughly halves the cycles per operation on the *Compiler* trace and cuts them by about a third on *Server*: those programs free and reallocate the same few sizes constantly, so most calls never reach the inner allocator. On *Trees*, which builds everything before freeing anything, and on *Phases*, the cache makes almost no difference. A cache only helps if blocks come back before they are wanted again.

## False sharing

Threads introduce a second, subtler cost. Caches keep memory coherent between processors one *line* at a time, typically 64 bytes. If two threads write to two different objects that happen to share a line, the processors must pass ownership of the line back and forth, each write invalidating the other’s copy, even though the threads never touch each other’s data. This is **false sharing**, and an allocator can cause it.

Berger and colleagues distinguish two ways :cite[berger2000]. An allocator with one heap can **actively** induce false sharing by handing consecutive small blocks of one cache line to different threads. It can **passively** induce it when a program passes objects between threads and the allocator lets each thread reuse the pieces it freed. Padding every block to a full cache line would prevent both, but at a heavy cost in memory, which is why, Evans notes, jemalloc relies on arenas to keep threads apart and leaves padding to the programmer where it matters :cite[evans2006].

## Sharding

The latest step in this line is **mimalloc**, by Daan Leijen, Ben Zorn and Leonardo de Moura at Microsoft Research. Its central idea is *free list sharding*: rather than one free list per size class, mimalloc keeps a free list per *page*, a 64 KiB region holding objects of one size :cite[leijen2019]. Each page has three lists. One is for allocating; a second collects blocks freed by the page’s own thread, without any atomic operation; a third collects blocks freed by *other* threads, pushed with an atomic instruction. Allocation pops from the first list; only when it is empty does mimalloc swap in the others :cite[leijen2019].

Sharding keeps blocks allocated together physically together, which helps the cache; it means a thread almost never waits for another; and it answers the producer–consumer problem, because a block freed by the consumer goes back to the producer’s page, where the producer will find it.

:::key
A single lock around the heap stops scaling as soon as threads allocate often. Allocators escape it in stages: several **arenas**, each with its own lock; per-thread **caches** of small blocks, used without any lock; and **sharded** free lists, one per page, with a separate list for frees from other threads. Each step must also stop memory from being stranded in one thread’s hands (**blowup**) and avoid placing different threads’ objects in the same cache line (**false sharing**).
:::

:::whofrees
Nothing changes for the program: it still calls `free`. What changes is *where the freed block goes*. In a thread cache it stays with the thread that freed it, ready for that thread’s next `malloc`; in a sharded allocator it returns to the page, and so the thread, it came from. The question “who frees it?” has a quiet twin in a concurrent allocator: *who gets to reuse it?*
:::

## What’s next

Thread caches make each `malloc` and `free` cheap. The next chapter asks a more radical question: what if the program did not free objects one at a time at all, but threw away a whole region at once? It ends with two spacecraft, one on its way to the Moon, that ran short of memory at the worst possible moment.
