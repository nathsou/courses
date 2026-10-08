---
title: Fragmentation
summary: Enough free memory and nowhere to put it. Placement policies, size classes and an adversary.
number: 11
duration: 55 minutes
prerequisites: [a-heap-from-scratch]
---

Your allocator from chapter 10 never hands out the same byte twice, never loses a freed block, and merges free neighbours as soon as it can. It is correct. And yet run it long enough on the wrong program and it will ask the kernel for twice, three times, ten times as much memory as the program is actually using.

The memory is not leaked. It is **fragmented**: free, but in pieces too small or too awkwardly placed to satisfy the requests that arrive. Fragmentation is the central problem of allocator design, the one that separates a textbook `malloc` from a good one, and it has a peculiar property: it depends not just on the allocator but on the whole history of requests, which the allocator does not choose and cannot predict.

You are going to feel this before you read about it.

## Be the allocator

::placement-game

Play level 1 a couple of times. Then try level 2, which frees mostly small blocks and leaves the large ones in place, and level 3, where the choice of policy matters enormously. Pay attention to the moment you lose: there is almost always plenty of free memory. It is just in the wrong shape.

The automatic policies replay the very stream you played, so you can see whether you would have done better to follow a simple rule. Three rules are classic:

- **First fit**: take the first hole, from the start of the heap, that is big enough.
- **Next fit**: like first fit, but start searching where the last search stopped.
- **Best fit**: take the smallest hole that is big enough.

Worst fit (take the largest hole, so the leftover is still useful) is included as a cautionary tale.

## Two kinds of waste

The game shows **external fragmentation**: free memory outside any block, broken into holes too small to use. Chapter 10 showed the other kind, **internal fragmentation**: memory inside a block that the program did not ask for. A 24-byte request that occupies a 48-byte block (header, footer, rounding) wastes half of it internally. The two pull against each other. An allocator that rounds requests up generously, to a few fixed sizes, has more internal waste but fewer odd-shaped holes; one that gives every request exactly what it asked for has the reverse.

```numeric
id: fragmentation/classes
title: Rounding up
prompt: "An allocator rounds every request up to one of these sizes: 16, 32, 48, 64, 96, 128 bytes. A program allocates many blocks of 65 bytes. What percentage of each block is wasted?"
answer: 32.3
unit: '%'
tolerance: 0.03
explain: "65 rounds up to 96: 31 of 96 bytes, about 32%, are wasted. Size classes spaced by a constant ratio (here, at most 50% apart) bound the worst case; finer classes waste less but need more lists."
```

Both kinds are measured the same way, by comparing what the program uses with what the allocator holds. The course uses **utilisation**: the peak number of bytes the program had live at once, divided by the peak size of the heap. 100% is perfect; 50% means the heap was twice as big as it needed to be.

## The adversary

Is there a policy that never fragments? No, and the reason is worth knowing. In the early 1970s J. M. Robson studied the *worst case*: given a bound on how much memory a program has live at any moment, and the ratio between the largest and smallest blocks it may ask for, how big might the heap have to be? He showed that for *every* allocator there is a sequence of requests (an adversary, choosing each request after seeing where the allocator put the previous ones) that forces the heap to be larger than the live data by a factor that grows with the logarithm of that ratio, and that some policies stay within a constant factor of this bound :cite[robson1971, robson1974]. No allocator can promise good utilisation for every program.

The trace called *Adversary* in the scoreboard below is a much simpler adversary, but it has the right idea: it fills the heap with small blocks, frees every other one, then asks for blocks slightly too big for the holes.

## What real programs do

Fortunately, programs are not adversaries. In 1995 Paul Wilson, Mark Johnstone, Michael Neely and David Boles published a long survey of allocator research and argued that much of it had been measuring the wrong thing :cite[wilson1995]. Most studies had tested allocators on *random* traces: sizes and lifetimes drawn from probability distributions. Real programs are not random. They allocate in **phases** (build a data structure, use it, tear it down), they allocate many objects of a few sizes, and objects allocated together tend to die together. An allocator that keeps objects allocated together next to each other, so that they leave one big hole when they die together, does far better on real programs than on random ones, and the ranking of policies changes.

In a follow-up study, Johnstone and Wilson measured real programs and found that the best policies, best fit and **address-ordered** first fit (keeping the free list sorted by address, so that first fit tends to fill holes from the bottom of the heap), fragmented remarkably little: in their words, the fragmentation problem looked “solved” for those programs :cite[johnstone1998]. The catch was speed: best fit and address-ordered free lists are slow to search if implemented naively.

Compare the policies on several kinds of trace here (they all run through the heap checker; a ✗ would mean a correctness failure):

::scoreboard{traces="phases,compiler,server,trees,random,adversary" allocators="first,next,best,explicit,explicit-addr,segregated,classes" n="11.2" title="Utilisation and speed, trace by trace" caption="Utilisation is peak live bytes over peak heap size. Cycles are the allocator’s own loads and stores, priced by a small cache model, plus 300 cycles per call to sbrk. Hover a ✗ for the checker’s report."}

Three things stand out. Next fit, which spreads allocations around the heap, fragments more than first fit, because it mixes objects from different phases. Best fit and address-ordered first fit are consistently dense. And the *Random* trace makes every policy look worse than the realistic traces do, which is Wilson’s point.

:::key
Fragmentation is wasted free memory: external (holes too small to use) or internal (space inside blocks the program did not ask for). Every allocator can be defeated by an adversary, but real programs allocate in phases and in a few sizes, and allocators that exploit those regularities fragment very little. The art is to get that density without the cost of searching.
:::

## Segregated fits

The fast way to get best-fit-like behaviour is to keep **several free lists, one per range of sizes**: blocks of 32–63 bytes on one list, 64–127 on the next, and so on. To allocate, go straight to the list for the request’s size and take the first block that fits; if that list is empty, try the next larger one. This is **segregated fits**, the design of Doug Lea’s allocator (dlmalloc, first written in 1987) and of glibc’s `malloc`, which descends from it :cite[lea1996]. Searching a list of blocks that are all about the right size is close to best fit, and much faster than searching everything.

Take the idea to its limit, with one list per exact size and no splitting or merging at all, and you get **size classes**, the design of the slab allocator from chapter 9 and of the fast allocators of the next chapter. The scoreboard’s last row shows the trade: no headers, very fast, but the rounding up to a class costs utilisation, and memory freed in one size class cannot be used for another.

:::whofrees
Fragmentation is memory that was freed and cannot be reused. The program did its part, calling `free`, and the allocator did its part, putting the block on a list. The memory is still lost, for now, to the shape of the holes. No later call to `free` will fix it; only the program freeing a neighbour, or, in a garbage-collected runtime, a collector that *moves* objects to close the gaps (chapter 22).
:::

## What’s next

Everything so far has assumed one thread. Real programs have many, all calling `malloc` at once, and a single heap with a single lock becomes the bottleneck. The next chapter, an optional one, looks at how modern allocators solve that, and in passing explains the size-class designs of jemalloc, TCMalloc and mimalloc.
