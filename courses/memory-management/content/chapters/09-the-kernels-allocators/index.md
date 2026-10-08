---
title: The kernel’s allocators
summary: The buddy system splits and merges powers of two; the slab allocator keeps objects warm.
number: 9
duration: 50 minutes
prerequisites: [page-faults]
---

Every page fault in chapter 5 ended with the same casual phrase: “the kernel takes a free frame”. Where from? The kernel needs an allocator of its own, and it needs one with properties no user-space allocator has to worry about. It must hand out *physical* memory, and some of its customers need several physically contiguous frames (a device that reads memory directly, or the 2 MiB superpages of chapter 4). It must never fail slowly, because it runs inside page faults and interrupts. And it must keep running for months without its memory slowly falling to pieces.

This chapter opens two allocators that between them handle almost all of the Linux kernel’s memory, and whose ideas reappear throughout the rest of the course: the **buddy system**, for frames, and the **slab allocator**, for the kernel’s own small objects.

## Allocators all the way down

It is worth pausing on where we are. In chapter 0 you saw a stack of allocators: DRAM at the bottom, then frames, then pages, then `malloc`’s chunks, then objects. This chapter is the second layer: the allocator that every page fault, every new page table and every kernel data structure ultimately calls.

Every allocator in this course answers the same three questions, and it helps to ask them every time:

1. **How do I find space?** (Search a list? Index by size? Bump a pointer?)
2. **How do I get it back?** (Merge with neighbours? Put it on a list for reuse? Never?)
3. **What bookkeeping do I keep, and where?** (Headers? Bitmaps? Separate tables?)

The stack of chapter 8 answered them in the simplest possible way: bump a pointer, move it back, keep nothing. The buddy system’s answers are more interesting.

## The buddy system

Kenneth Knowlton described the buddy system at Bell Labs in 1965 :cite[knowlton1965]. Its rules fit on a postcard:

- Memory is a power-of-two number of frames. Every block is also a power of two in size, and starts at a multiple of its size. A block of 2ᵏ frames is a block of **order** *k*.
- To allocate *n* frames, round *n* up to a power of two, 2ᵏ. Take a free block of the smallest order ≥ *k*. While it is too big, **split** it into two halves, keep one, and put the other on the free list of the order below.
- The two halves of a split are **buddies**. A block’s buddy is found by flipping one bit of its address: the block of order *k* at frame *f* has its buddy at *f* XOR 2ᵏ.
- To free a block, check whether its buddy is free (and whole). If so, remove the buddy from its free list and **merge** the two into a block of the next order up, and repeat. Otherwise, put the block on its free list.

The bookkeeping is one free list per order. No search through the whole memory is ever needed, and merging free neighbours (**coalescing**), which in a general allocator requires knowing where a block’s neighbours are, here costs one XOR.

::buddy-tree

Try allocating 3 frames. You get 4: the buddy system pays for its speed with **internal fragmentation**, rounding every request up to a power of two, which wastes up to half of each block. Now allocate and free a few blocks at random, and look at the line under the free lists. Quite often there are plenty of free frames but no large block, because the free frames are scattered in small pieces whose buddies are still in use. That is **external fragmentation**, and it is the enemy of every allocator in Part III.

```predict
q: In a 32-frame buddy allocator, blocks of 1 frame are allocated at frames 0, 4, 8, … 28 (eight of them) and everything else is free. What is the largest block that can now be allocated?
options:
  - text: 24 frames, since 24 are free
    why: The buddy system can only hand out power-of-two blocks aligned to their size.
  - text: 2 frames
    correct: true
    why: "Each 4-frame group has frame 0 of it in use, so no aligned 4-frame block is free. Within each group, frames 2–3 form a free 2-frame block (frame 1 is free too but its buddy, frame 0, is not). 24 frames free, and the largest allocation is 2."
  - text: 4 frames
    why: Every aligned group of four contains one of the allocated frames.
```

Linux has used a buddy allocator for physical pages since its early days. Its free lists run from order 0 (one 4 KiB page) up to order 10 by default (4 MiB), and much of the kernel’s cleverness about memory, such as grouping pages that can be moved and compacting memory to rebuild large blocks, exists to keep the higher orders from running dry.

## Build it: a buddy allocator

```build
id: the-kernels-allocators/buddy
title: Split and merge
prompt: |
  Implement `alloc(order)` and `free(frame)` for a buddy allocator over `frames` frames (a power of two). `free[k]` is the list of free blocks of order `k`, as start frames, kept in increasing order. `alloc` takes the lowest-addressed block of the smallest sufficient order, splits it as needed (keeping the lower half each time), and returns its first frame, or `-1`. `free` merges with free buddies for as long as it can. The class remembers each allocated block’s order in `allocated`. JavaScript arrays and maps are fine here: this is the kernel’s own bookkeeping, not data in the simulated heap.
starter: |
  export class Buddy {
    free: number[][];
    allocated = new Map<number, number>();
    constructor(public frames: number) {
      const max = Math.log2(frames);
      this.free = Array.from({ length: max + 1 }, () => []);
      this.free[max] = [0];
    }

    alloc(order: number): number {
      // Only exact sizes, no splitting.
      const f = this.free[order].shift();
      if (f === undefined) return -1;
      this.allocated.set(f, order);
      return f;
    }

    free_(frame: number): void {
      const order = this.allocated.get(frame)!;
      this.allocated.delete(frame);
      this.free[order].push(frame);
    }
  }
solution: |
  export class Buddy {
    free: number[][];
    allocated = new Map<number, number>();
    constructor(public frames: number) {
      const max = Math.log2(frames);
      this.free = Array.from({ length: max + 1 }, () => []);
      this.free[max] = [0];
    }

    private insert(order: number, frame: number) {
      const list = this.free[order];
      let i = 0;
      while (i < list.length && list[i] < frame) i++;
      list.splice(i, 0, frame);
    }

    alloc(order: number): number {
      let k = order;
      while (k < this.free.length && this.free[k].length === 0) k++;
      if (k >= this.free.length) return -1;
      const frame = this.free[k].shift()!;
      while (k > order) {
        k--;
        this.insert(k, frame + 2 ** k); // the upper half is free
      }
      this.allocated.set(frame, order);
      return frame;
    }

    free_(frame: number): void {
      let order = this.allocated.get(frame)!;
      this.allocated.delete(frame);
      while (order < this.free.length - 1) {
        const buddy = frame ^ (2 ** order);
        const at = this.free[order].indexOf(buddy);
        if (at < 0) break;
        this.free[order].splice(at, 1);
        frame = Math.min(frame, buddy);
        order++;
      }
      this.insert(order, frame);
    }
  }
tests: |
  import { test, expect } from '@mm/test';
  import { BuddyAllocator } from '@mm/kernel';
  import { Buddy } from './solution';
  test('splitting: one frame from 32', () => {
    const b = new Buddy(32);
    expect(b.alloc(0)).toBe(0);
    expect(b.free).toEqual([[1], [2], [4], [8], [16], []]);
  });
  test('merging: everything returns to one block', () => {
    const b = new Buddy(32);
    const xs = [b.alloc(0), b.alloc(1), b.alloc(0), b.alloc(2)];
    for (const x of xs) b.free_(x);
    expect(b.free[5]).toEqual([0]);
  });
  test('no block big enough', () => {
    const b = new Buddy(8);
    b.alloc(2);
    b.alloc(1);
    expect(b.alloc(2)).toBe(-1);
  });
  test('agrees with the kernel’s allocator on a random workload', () => {
    const mine = new Buddy(64);
    const ref = new BuddyAllocator(64);
    let s = 5;
    const rnd = (n: number) => ((s = (s * 1103515245 + 12345) % 2147483648), s % n);
    const live: number[] = [];
    for (let i = 0; i < 500; i++) {
      if (live.length && rnd(2)) {
        const f = live.splice(rnd(live.length), 1)[0];
        mine.free_(f);
        ref.free_(f);
      } else {
        const k = rnd(4);
        const a = mine.alloc(k);
        expect(a).toBe(ref.alloc(k));
        if (a >= 0) live.push(a);
      }
      expect(mine.free).toEqual(ref.free.map((l) => [...l]));
    }
  });
hints:
  - "To allocate: find the smallest order with a free block, take it, and while it is bigger than needed, halve it and put the upper half on the free list of the order below."
  - "To free: the buddy of the block of order k at frame f is at `f ^ 2**k`. If it is on the free list of order k, remove it, merge, and try the next order."
```

## The slab allocator

The buddy system deals in pages. Most of what the kernel allocates is much smaller: a structure describing an open file, a network packet header, an entry in the cache of directory names. Thousands of these are created and destroyed every second, they come in a few dozen fixed sizes, and rounding each one up to a page would be absurd.

In 1994 Jeff Bonwick described the allocator he had built for Sun’s Solaris kernel :cite[bonwick1994], and its design has been copied ever since. The kernel keeps one **cache** per kind of object. A cache gets whole pages from the page allocator, called **slabs**, and carves each into equal slots for its object. Allocation takes a free slot from a partly used slab; freeing returns it to its slab. When a slab becomes completely empty, its page can be given back to the buddy allocator.

::slab-view

Bonwick’s paper made three further points that are worth remembering, because they come back in Part III:

- **Objects of one size need no headers.** The cache knows its object size, and a slot’s slab can be found from its address (the slab is the page containing it). An allocator that keeps sizes per page rather than per object saves space on every object.
- **Construction is expensive; keep constructed objects.** Many kernel objects contain locks and lists that must be initialised. A slab allocator can return objects to the cache *still initialised*, so the next allocation skips the work. This is object caching, not just memory allocation.
- **Colour the slabs.** If every slab starts its first object at offset 0, objects at the same offset in different slabs land in the same cache sets (chapter 2) and evict each other. Shifting each slab’s first object by a different small offset, a different “colour”, spreads them out.

Linux adopted the slab design and, after several rewrites, uses a simplified successor called SLUB. Chapter 12 shows the same design in user space: the size-class allocators of jemalloc, TCMalloc and mimalloc are slab allocators in all but name.

:::programmer
A slab cache is an object pool with a free list threaded through its unused slots, backed by pages from a lower-level allocator. If you have ever kept a pool of reusable buffers to avoid allocation in a hot loop, you have written one.
:::

:::whofrees
The kernel frees its own objects explicitly, and its frames when their last user lets go: the buddy allocator gets a block back when the kernel frees it, merges it with its buddy if it can, and puts the result on a free list. Nothing is collected automatically. A kernel that forgets to free leaks memory until it is rebooted, which is why kernel developers have their own leak detectors.
:::

## What’s next

Part II ends here: we have seen a process’s whole address space, the stack inside it, and the kernel allocators underneath it. Part III moves up one layer, to the allocator every C program uses and every other runtime is built on: `malloc`.
