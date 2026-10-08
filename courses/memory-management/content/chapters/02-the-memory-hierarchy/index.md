---
title: The memory hierarchy
summary: Why the same loop can be ten times slower in a different order. Caches, lines and locality.
number: 2
duration: 55 minutes
prerequisites: [bytes-and-addresses]
---

Here are two loops that add up every number in a square matrix. They do exactly the same arithmetic on exactly the same numbers. One of them is several times slower than the other on any computer you are likely to own.

```c
for (i = 0; i < n; i++)          for (j = 0; j < n; j++)
  for (j = 0; j < n; j++)          for (i = 0; i < n; i++)
    sum += a[i][j];                  sum += a[i][j];
```

The array-of-bytes model from chapter 1 cannot explain the difference, because in that model every byte costs the same to read. This chapter replaces it with a better model: memory is a *hierarchy* of stores, small and fast near the processor, large and slow far from it, and the processor moves data between them in blocks. Once you see the blocks, the two loops stop looking the same.

## Near and far

A processor can add two numbers in a fraction of a nanosecond. Fetching a number from main memory takes on the order of a hundred nanoseconds. If every load went all the way to memory, the processor would spend almost all of its time waiting.

So between the processor and main memory sit **caches**: small memories built from fast, expensive SRAM, that keep copies of recently used data. A modern core has a tiny level-1 (L1) cache, a larger and slower L2, and usually shares a much larger L3 with the other cores. Below them is main memory, built from DRAM, which is dense and cheap but slow.

The course’s cost model (appendix B) uses these round numbers, in cycles of a processor clock:

| Where the data is | Cycles to read it | If an L1 hit took one second |
|---|---|---|
| L1 cache (32 KiB) | 4 | 1 second |
| L2 cache (512 KiB) | 14 | 3.5 seconds |
| L3 cache (4 MiB) | 40 | 10 seconds |
| DRAM (gigabytes) | 200 | 50 seconds |

They are a teaching model of the shape of a real machine, not the numbers of any particular one; real latencies vary by a factor of two or more between processors. The shape is what matters: each step down is several times slower, and the bottom is fifty times slower than the top. (Below DRAM there is the disk, where reads take tens of microseconds on a solid-state drive and milliseconds on a spinning one: in the right-hand column, hours to days. Chapter 6 is about the cost of going there.)

:::programmer
The hierarchy is a cache of a cache of a cache. Every lesson you know about caching applies: hits are cheap, misses are expensive, and the hit rate depends entirely on the access pattern.
:::

## Lines, sets and ways

A cache never stores a single byte. It stores **lines**: aligned blocks of 64 bytes on most processors (32 in the small cache of the figure below). When the processor loads one byte that is not in the cache, the whole line around it is fetched from the next level down. The other 63 bytes come along for free.

That single fact explains most of this chapter. If the program’s next loads touch the same line, they hit. If they touch a different line each time, every one of them misses.

Where can a line go in the cache? Searching every slot on every access would be too slow, so the cache is divided into **sets**, and a line can live only in one set, chosen by bits of its address. Each set holds a few lines, its **ways**. A cache with 8 sets of 2 ways can hold 16 lines, but only 2 lines from addresses that map to the same set. Load a third and one of the two is evicted (the least recently used one, in this simulator).

The set is chosen by the address bits just above the offset within the line:

```text
 address:   |           tag            |  set  | offset in line |
```

## Two loops, revisited

A C matrix is stored **row by row**: `a[0][0]`, `a[0][1]`, …, `a[0][n−1]`, then `a[1][0]`, and so on. Reading it row by row walks through memory in order, so each line fetched is used completely before the next is fetched. Reading it column by column jumps a whole row (128 bytes in the figure) between consecutive loads: each load touches a new line, and by the time the loop comes back for the neighbouring element, the line may have been evicted.

```predict
q: In the figure below, the matrix is 16 × 16 eight-byte numbers and a line holds four of them. Reading row by row, what fraction of the 256 loads will miss?
options:
  - text: All of them, since the cache starts empty
    why: Only the first load of each line misses; the line brings the next three numbers with it.
  - text: One in four
    correct: true
    why: 256 loads, 64 lines, one miss per line. The other three loads per line hit.
  - text: One in sixteen
    why: That would need lines of sixteen numbers (128 bytes).
```

Run it, then switch to column order.

::cache-lens

Column order misses on every single load. It is not just that the jumps are long: rows are 128 bytes apart, so the elements of one column fall into only two of the eight sets, and those two sets can hold four lines between them. The other twelve lines of each column evict each other. This kind of collision is called a **conflict miss**, and it is why programs that walk large arrays with power-of-two strides sometimes slow down mysteriously.

The two linked-list patterns visit the same 256 cells, following a pointer from each node to the next. When the nodes happen to be allocated one after another in memory, the walk is as cache-friendly as the row-by-row loop. When they are scattered, as they are in a program that has been allocating and freeing for a while, every hop is a miss. Same algorithm, same data, many times the cost. Chapter 22 will show a garbage collector turning the second case back into the first, as a side effect of moving objects.

:::key
**Locality** is what caches feed on. *Spatial locality*: after touching an address, a program tends to touch its neighbours soon, so fetching whole lines pays off. *Temporal locality*: after touching an address, a program tends to touch it again soon, so keeping recently used lines pays off. Data structures that put related things next to each other are fast for that reason alone.
:::

## Build it: sum a matrix in the right order

Your function receives the simulated heap, the address of a matrix of `n × n` eight-byte numbers stored row by row, and `n`. It must return their sum. The tests run it on a heap whose loads are priced by a small cache (32-byte lines, 2 ways, 4 cycles per hit, 100 per miss) and require the cycle count to be close to the minimum.

```build
id: the-memory-hierarchy/sum
title: Sum in cache order
prompt: |
  The starter adds up the matrix column by column. It gets the right answer, slowly. Make it fast. `heap.load64(address)` reads one eight-byte number; element `(i, j)` is at `base + (i * n + j) * 8`.
starter: |
  import type { Heap } from '@mm/heap';

  export function sum(heap: Heap, base: number, n: number): number {
    let total = 0;
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        total += heap.load64(base + (i * n + j) * 8);
      }
    }
    return total;
  }
solution: |
  import type { Heap } from '@mm/heap';

  export function sum(heap: Heap, base: number, n: number): number {
    let total = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        total += heap.load64(base + (i * n + j) * 8);
      }
    }
    return total;
  }
tests: |
  import { test, expect } from '@mm/test';
  import { FlatHeap } from '@mm/heap';
  import { sum } from './solution';

  function matrix(n: number) {
    const heap = new FlatHeap(0x1000, 1 << 16, { configs: [{ name: 'L1', size: 512, ways: 2, line: 32, latency: 4 }], dram: 100 });
    const base = heap.sbrk(n * n * 8);
    let expected = 0;
    for (let k = 0; k < n * n; k++) {
      heap.store64(base + k * 8, k % 97);
      expected += k % 97;
    }
    heap.resetStats();
    heap.caches!.flush();
    return { heap, base, expected };
  }
  test('the sum is right', () => {
    const { heap, base, expected } = matrix(32);
    expect(sum(heap, base, 32)).toBe(expected);
  });
  test('it reads each number exactly once', () => {
    const { heap, base } = matrix(32);
    sum(heap, base, 32);
    expect(heap.stats.loads).toBe(32 * 32);
  });
  test('it costs close to the minimum (one miss per 32-byte line)', () => {
    const { heap, base } = matrix(32);
    sum(heap, base, 32);
    const lines = (32 * 32 * 8) / 32;
    const best = lines * 100 + (32 * 32 - lines) * 4;
    expect(heap.stats.cycles).toBeLessThanOrEqual(best * 1.05);
  });
hints:
  - Which loop variable changes the address by 8, and which by `n * 8`?
  - Make the inner loop the one that moves by 8.
explain: |
  Swapping two loops made this about seven times cheaper in simulated cycles. Compilers can sometimes do this *loop interchange* for you, but only when they can prove it does not change the result; with floating point, or when the loop body calls functions, they usually cannot.
```

## Down to DRAM

The bottom of the hierarchy is DRAM, and it has habits of its own. A DRAM chip stores each bit as a charge on a tiny capacitor, arranged in a grid of **rows** and columns inside several **banks**. Reading anything means first copying a whole row (several kilobytes) into a buffer at the edge of the bank, the *row buffer*, and then reading the wanted columns out of it. Reading again from the same row is quick; reading from a different row of the same bank means closing one row and opening another, which is slower.

The capacitors also leak. A charged cell loses its charge within milliseconds, so the memory controller must periodically read and rewrite every row, a process called **refresh**. DRAM, in other words, does not just fail to free memory: left alone, it forgets.

:::bridge{course=digital-circuits chapter=memory title="Digital Circuits, chapter 20: Memory"}
Builds the one-transistor-one-capacitor DRAM cell and the six-transistor SRAM cell that caches are made of, and lets you watch a DRAM cell leak in real time.
:::

Rows are packed so densely that they are no longer perfectly isolated from each other, which turned out to matter a great deal.

::museum{exhibit="rowhammer-2014"}

Rowhammer is a reminder that the hierarchy is physical. Every abstraction in this course, from page tables to garbage collectors, assumes that a bit, once written, stays written. Chapter 3 shows why flipping the right bit in the right place, a page-table entry, is enough to break the isolation between programs completely.

## The memory wall

For several decades, processors got faster much more quickly than DRAM did. In 1995 William Wulf and Sally McKee called the consequence the **memory wall**: eventually, they argued, a program’s speed would be set almost entirely by memory latency, whatever the processor could do :cite[wulf1995]. Deeper cache hierarchies, prefetchers that guess the next line, and processors that keep working while a miss is pending have kept the wall at bay, but its shadow falls over every design in this course. An allocator that keeps related objects together, a collector that compacts the heap, a page table that is cheap to walk: each is, in part, an argument about cache lines.

:::whofrees
Caches never free anything. They **evict**: when a set is full and a new line arrives, the least recently used line goes, and if it was changed it is first written back to the level below. Nobody asks the cache whether the program still needs the data; the cache is betting that it does not.
:::

## What’s next

So far every address has been a physical one: a position in DRAM. But the address in chapter 0, `0x101010`, was not. The next chapter introduces the most important trick in all of memory management: giving every program its own private address space, and translating each of its addresses on the fly.
