---
title: Reachability
summary: An object nobody can reach is garbage. Roots, marking, sweeping, the three colours, and why “reachable” is not the same as “will be used”.
number: 21
duration: 50 minutes
prerequisites: [counting-references]
---

Reference counting asks every object, all the time, how many pointers it has. Tracing asks a different question, and only now and then: starting from the variables the program can use directly, which objects can it reach by following pointers? Everything it can reach might still be used. Everything else is garbage, and can be freed, however its pointers are arranged, cycles included.

The idea is as old as reference counting. John McCarthy’s 1960 paper on LISP, the language that made heap allocation routine, reclaimed storage this way: when the free list ran out, the system traced every list reachable from its base registers and returned the rest to the free list :cite[mccarthy1960]. Reclaiming storage by tracing became known as **garbage collection**, and the name has stayed with it.

## Be the collector

The program’s directly usable pointers are its **roots**: the variables in every active stack frame, the global variables, and the values in registers. From the roots, pointers lead to objects, and from those objects to others: the **object graph**. Collecting garbage means finding the part of the graph that the roots reach.

::be-the-collector

That is the whole of **mark–sweep**: a mark phase that visits every reachable object and sets a bit in its header, and a sweep phase that walks the heap from one end to the other, freeing every object whose bit is clear and clearing the bits it finds set. Notice what you could not do: mark an object before finding a pointer to it. And notice what you did not need: any count. The two Undo objects that point to each other, which would leak under reference counting, are freed without a second thought.

## Three colours

Watch the replay again. At every moment, each object is in one of three states. **White**: not yet found. **Grey**: found, but its own pointers not yet followed. **Black**: found, and all its pointers followed. Marking turns grey objects black, one at a time, and greys their white children; it is done when nothing is grey; and at that point the white objects are garbage.

This **tricolour** picture comes from Edsger Dijkstra, Leslie Lamport and their colleagues, who used it in 1978 to reason about a collector running at the same time as the program :cite[dijkstra1978]. It will matter a great deal in chapter 25, because its one invariant, *no black object points to a white one*, is exactly what a running program can break.

The grey objects are the collector’s **work list**, and they must be kept somewhere. A recursive marker keeps them on the machine stack, one frame per level of nesting, and a long list overflows it. Real collectors use an explicit mark stack, and must also cope with that stack overflowing, for example by noting the overflow and later rescanning the heap for marked objects with unmarked children :cite[jones2023].

```build
id: reachability/mark-sweep
title: Mark and sweep
prompt: |
  Write a mark–sweep collector for the workbench. Mark every object reachable from the roots, with an explicit stack rather than recursion; then sweep the heap, freeing every unmarked object and clearing the mark on every survivor, so that the next collection starts clean. The tests use random heaps, a cycle, and a list of 100,000 nodes.
starter: |
  import { GcHeap } from '@mm/gc';

  /** Mark everything reachable from the roots, then free everything unmarked and clear the marks. */
  export function collect(heap: GcHeap): void {
    // TODO: mark every object reachable from heap.rootObjects(), following heap.children(o).
    // Use heap.setMarked(o) and heap.isMarked(o), and an explicit stack rather than recursion.

    // Sweep: walk the heap object by object.
    for (const o of heap.objects()) {
      if (heap.isFree(o)) continue;
      if (heap.isMarked(o)) heap.setMarked(o, false);
      else heap.free(o);
    }
  }
solution: |
  import { GcHeap } from '@mm/gc';

  /** Mark everything reachable from the roots, then free everything unmarked and clear the marks. */
  export function collect(heap: GcHeap): void {
    // Mark, with an explicit stack (the grey objects): no recursion, so deep structures are fine.
    const grey: number[] = [];
    for (const o of heap.rootObjects()) {
      if (!heap.isMarked(o)) {
        heap.setMarked(o);
        grey.push(o);
      }
    }
    while (grey.length) {
      const o = grey.pop()!;
      for (const c of heap.children(o)) {
        if (!heap.isMarked(c)) {
          heap.setMarked(c);
          grey.push(c);
        }
      }
    }
    // Sweep: walk the heap object by object.
    for (const o of heap.objects()) {
      if (heap.isFree(o)) continue;
      if (heap.isMarked(o)) heap.setMarked(o, false);
      else heap.free(o);
    }
  }
tests: |
  import { test, expect } from '@mm/test';
  import { GcHeap } from '@mm/gc';
  import { collect } from './solution';

  test('on random heaps, exactly the unreachable objects are freed', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const heap = GcHeap.random(60, seed, { roots: 4, edges: 0.4 });
      const reachable = heap.reachable();
      collect(heap);
      for (const o of heap.objects()) expect(`seed ${seed}: ${heap.isFree(o)}`).toBe(`seed ${seed}: ${!reachable.has(o)}`);
    }
  });
  test('the marks are cleared, so a second collection after the program changes works too', () => {
    const heap = GcHeap.random(60, 7, { roots: 4, edges: 0.4 });
    collect(heap);
    for (const o of heap.objects()) if (!heap.isFree(o)) expect(heap.isMarked(o)).toBe(false);
    // Drop a root, and collect again.
    heap.set(heap.rootSlots()[0]!, 0);
    const reachable = heap.reachable();
    collect(heap);
    for (const o of heap.objects()) if (!heap.isFree(o)) expect(reachable.has(o)).toBe(true);
  });
  test('cycles are freed when nothing reaches them', () => {
    const heap = new GcHeap({ roots: 2 });
    const T = heap.addType('Node', 1);
    const a = heap.alloc(T);
    const b = heap.alloc(T);
    heap.set(heap.pointerSlots(a)[0]!, b);
    heap.set(heap.pointerSlots(b)[0]!, a);
    collect(heap);
    expect([heap.isFree(a), heap.isFree(b)]).toEqual([true, true]);
  });
  test('a list of 100,000 nodes is marked without overflowing the stack', () => {
    const heap = new GcHeap({ bytes: 1 << 23, roots: 1 });
    const T = heap.addType('Node', 1);
    let prev = 0;
    for (let i = 0; i < 100_000; i++) {
      const n = heap.alloc(T);
      heap.set(heap.pointerSlots(n)[0]!, prev);
      prev = n;
    }
    heap.set(heap.rootSlots()[0]!, prev);
    collect(heap);
    expect(heap.freed.size).toBe(0);
  });
hints:
  - "Push every root object onto a stack, marking it as you push. Then pop, and push every unmarked child, marking it as you push."
```

The sweep visits *every* object in the heap, alive or dead, so its cost grows with the size of the heap, not with the amount of live data. Collectors reduce that cost by sweeping lazily, a page at a time, as the allocator needs free memory :cite[jones2023]. The mark phase, by contrast, costs in proportion to what is reachable. That asymmetry is the starting point of chapter 22.

## Reachable is not the same as live

A tracing collector frees what cannot be reached. What a programmer would like it to free is what will not be *used*: an object is **live** if the program will read it again. Every live object is reachable, since the program can only read what it can reach, but not every reachable object is live.

:::dial{settings="mark-sweep,rc" title="Reachable, but never used again" n="21.2"}
```mote
struct Row { id: int, next: Row? }

var history: Row? = null

fn record(i: int) {
  history = new Row { id: i, next: history }
}

fn main() {
  var total = 0
  for i in 0..200 {
    record(i)
    let tmp = new Row { id: i, next: null }
    total = total + tmp.id
  }
  print(total)
}
```
The program appends every row to `history` and never reads it. The `tmp` rows die young and are freed; the history rows stay reachable until the end, so no collector that frees only unreachable objects can free them.
:::

The gap between the last use of an object and the moment it is freed is its **drag**, and objects reachable from a global that nobody reads again are the classic case. This is a leak that no collector can fix, because the collector cannot know the future. In fact no program can: deciding whether an object will ever be used again would mean deciding what an arbitrary program will do, which runs into the undecidability of the halting problem.

:::bridge{course=incompleteness chapter=cmp.thy.hlt title="Incompleteness and Computability: the halting problem"}
Whether a program will ever read a given object again is a question about its future behaviour, and questions of that kind cannot be decided in general. The halting problem is the original example.
:::

So tracing collectors settle for reachability: a safe approximation that never frees anything live, and frees everything unreachable. Holding fewer references, by setting a variable to `null` when you are done or by keeping caches bounded, is how a programmer closes the gap.

:::key
A tracing collector finds every object reachable from the **roots** and frees the rest. **Mark–sweep** marks reachable objects and then sweeps the heap; cycles are no problem. Marking is described with three colours (white, grey, black) and runs from a work list of grey objects. Reachability is a safe approximation of **liveness**: reachable but unused objects are a leak no collector can find.
:::

:::whofrees
The collector, all at once, for everything the program can no longer reach. The programmer frees nothing, and their only remaining job is to stop pointing at what they no longer need.
:::

## What’s next

Mark–sweep frees memory but leaves it where it was, with holes between the survivors, and it touches every dead object to free it. The next chapter’s collectors **move** the survivors instead: compacting them together, or copying them into a fresh space, so that a collection costs only as much as the data that is still alive.
