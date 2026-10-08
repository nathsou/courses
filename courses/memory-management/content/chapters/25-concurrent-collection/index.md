---
title: Concurrent and incremental collection
summary: Let the program run while the collector marks, and it can hide an object from it. The lost-object problem, and the barriers that prevent it.
number: 25
duration: 55 minutes
prerequisites: [reachability]
---

Every collector so far has stopped the program, done its work, and let the program carry on. For a batch job that is fine. For a game rendering sixty frames a second, a trading system, or a server with a latency budget, a pause of a hundred milliseconds is a failure. The natural fix is to do the collector’s work in small pieces, interleaved with the program (**incremental** collection), or at the same time on another core (**concurrent** collection).

There is a catch. Marking assumes the object graph holds still. If the program, which collector papers call the **mutator**, rewires pointers while the collector is halfway through, the collector can miss an object that is still reachable, and the sweep will free it. Try it yourself.

## Hide an object

::adversarial-mutator

The trick that works without a barrier takes two writes. First, while A is black and B is grey, store a pointer to the white object C into A. Then delete the pointer from B to C. Now the only path to C runs through a black object, which the collector will never scan again, and C stays white until the end.

Both conditions are needed, and naming them is the key to fixing the problem :cite[jones2023]. An object is lost only if:

1. the mutator stores a pointer to a white object into a black object, **and**
2. every path from a grey object to that white object is destroyed.

Break either condition and nothing can be lost. The tricolour picture from chapter 21 makes this precise as an invariant: the **strong tricolour invariant** says no black object ever points to a white one, which rules out the first condition outright.

## Barriers

A **write barrier** runs on every pointer write while marking is in progress, and repairs the colours before the damage is done. There are two families, one for each condition.

**Insertion barriers** attack the first condition. When the program stores a pointer to a white object, Edsger Dijkstra and his colleagues shade that object grey on the spot, so no black object ever points to a white one :cite[dijkstra1978]. Guy Steele’s variant instead turns the black *holder* back to grey, so that the collector will scan it again :cite[steele1975].

**Deletion barriers** attack the second. Taiichi Yuasa’s barrier shades the object a pointer *used* to point to, whenever that pointer is overwritten :cite[yuasa1990]. Nothing that was reachable when marking began can then be lost, which is why this approach is called **snapshot at the beginning**: the collector marks the graph as it was at the start, plus whatever is allocated since.

Switch the barrier in the figure above and try the same two moves again. With an insertion barrier, the first write shades C; with a deletion barrier, the second does.

How sure can we be? The moves in the figure are one interleaving among many. The explorer below tries them all, on three small heaps, for every barrier.

::interleaving-explorer

Without a barrier, the explorer finds the same two-write trick on its own. With any of the three barriers, it finds nothing, on any of the interleavings it tries. That is not a proof for every heap, but it is a proof for these heaps and these bounds, and searching every interleaving of a small model is exactly how such bugs are found in practice.

:::bridge{course=formal-verification chapter=interleavings title="For All Inputs, chapter 2: Interleavings"}
Checking every interleaving of two concurrent processes, by building the state space and searching it: the technique behind the explorer above, and its limits.
:::

```build
id: concurrent-collection/barrier
title: A barrier the explorer cannot break
prompt: |
  Write a write barrier. It runs on every write `holder.field = value` during marking, with `old` the pointer being overwritten, and it can shade a white object grey or turn a black object grey again. The tests run the interleaving explorer from figure 25.2 on four small heaps: it must not find a single lost object.
starter: |
  import type { BarrierApi, Ref } from '@mm/explore';

  /**
   * A write barrier. It runs on every write `holder.field = value` while the collector is marking; `old` is the
   * pointer being overwritten. api.colour(o) tells you an object's colour; api.shade(o) turns a white object grey;
   * api.regrey(o) turns a black object grey again.
   */
  export function barrier(api: BarrierApi, holder: number, old: Ref, value: Ref): void {
    // TODO: stop the program from hiding a white object from the collector.
  }
solution: |
  import type { BarrierApi, Ref } from '@mm/explore';

  /**
   * A write barrier. It runs on every write `holder.field = value` while the collector is marking; `old` is the
   * pointer being overwritten. api.colour(o) tells you an object's colour; api.shade(o) turns a white object grey;
   * api.regrey(o) turns a black object grey again.
   */
  export function barrier(api: BarrierApi, holder: number, old: Ref, value: Ref): void {
    // Dijkstra's insertion barrier: a pointer stored into the heap is never to a white object.
    if (value !== null) api.shade(value);
  }
tests: |
  import { test, expect } from '@mm/test';
  import { explore, SMALL_HEAPS, type Model } from '@mm/explore';
  import { barrier } from './solution';

  const CHAIN4: Model = { roots: [0, null], fields: [[1, null], [2, null], [3, null], [null, null]], colour: ['white', 'white', 'white', 'white'] };

  for (const h of SMALL_HEAPS) {
    test(`no interleaving loses an object, starting from ${h.name}`, () => {
      const r = explore(h.model, barrier);
      const why = r.counterexample ? `lost ${r.counterexample.lost.join(',')} after ${JSON.stringify(r.counterexample.steps)}` : 'safe';
      expect(why).toBe('safe');
    });
  }
  test('no interleaving of two writes loses an object in a chain of four', () => {
    const r = explore(CHAIN4, barrier, 2);
    expect(r.counterexample ? `lost ${r.counterexample.lost.join(',')}` : 'safe').toBe('safe');
  });
hints:
  - "Pick one of the two conditions for losing an object and make it impossible."
  - "Insertion: shade the new value. Deletion: shade the old one."
```

## Roots, reads and moving objects

A detail: barriers cover writes to the *heap*. Writes to local variables are far more frequent and are usually not barriered at all. A collector with an insertion barrier must therefore rescan the roots at the end of marking, with the program stopped, as the course’s incremental collector does; a snapshot-at-the-beginning collector need not.

Moving collectors running concurrently have a harder problem: the program may follow a pointer to an object that has just been copied. Henry Baker’s 1978 copying collector used a **read barrier**, checking every pointer the program loads and copying the object first if needed :cite[baker1978]. Rodney Brooks proposed giving every object an extra word that points to its current copy, so that the program always goes through one indirection and always finds the right one :cite[brooks1984].

## Measuring pauses

Splitting the work into small pieces does not by itself guarantee that the program gets to run: many short pauses close together are as bad as one long one. Perry Cheng and Guy Blelloch proposed measuring **minimum mutator utilisation**: for a window of a given length, the smallest fraction of it that the program got to run, over the whole execution :cite[cheng2001]. Metronome, by David Bacon, Perry Cheng and V. T. Rajan, scheduled collector work by time to keep that utilisation consistently high :cite[bacon2003].

:::key
An incremental or concurrent collector lets the program run during marking, and the program can **lose** an object: store a pointer to a white object in a black one, then destroy every grey path to it. A **write barrier** prevents one of the two conditions: **insertion** barriers (Dijkstra, Steele) stop black-to-white pointers; **deletion** barriers (Yuasa) keep everything reachable at the start. Concurrent copying needs a **read barrier** or forwarding (Baker, Brooks). Pauses are measured by **minimum mutator utilisation**.
:::

:::whofrees
The collector, still, but now in cooperation with the program, whose every pointer write pays a few instructions so that the collector’s view of the graph stays safe.
:::

## What’s next

Part VI has built every piece of a modern collector. Chapter 26 puts them together the way production systems do: Java’s collectors, Go’s, V8’s and others, and the trade-offs between memory, throughput and pauses that each one makes.
