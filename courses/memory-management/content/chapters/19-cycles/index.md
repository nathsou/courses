---
title: Cycles
summary: Objects that point to each other keep each other alive for ever. Weak references, trial deletion, and CPython’s cycle collector.
number: 19
duration: 50 minutes
prerequisites: [counting-references]
---

A parent knows its child, and the child knows its parent. Nothing could be more natural, and nothing is more fatal to reference counting.

:::rc-stepper{title="A family that never dies" n="19.1"}
```mote
struct Parent { name: int, child: Child? }
struct Child { name: int, parent: Parent? }

fn family(n: int) {
  let p = new Parent { name: n, child: null }
  let c = new Child { name: n + 1, parent: p }
  p.child = c
}

fn main() {
  family(1)
  family(3)
  print("done")
}
```
Each call to `family` creates a parent and a child that point to each other. Step to the end of each call and watch the counts when the local variables go away.
:::

When `family` returns, its two variables disappear and each count drops by one, to 1. Not zero: the parent is still pointed to by the child, and the child by the parent. Nothing else in the program can reach either of them, and neither will ever be freed. Swift’s documentation calls this a **strong reference cycle**: two instances that “hold a strong reference to each other, such that each instance keeps the other alive” :cite[swift-arc].

Reference counting is a *local* rule. Each object knows how many pointers point to it, but not where they come from, and a count cannot tell a pointer from the rest of the program apart from a pointer from inside a ring of garbage. To see the difference you have to look at the whole structure, and looking at structure is what tracing collectors do. This chapter shows two ways to avoid looking, and one way to look cleverly.

## Weak references

The simplest fix is to tell the counter that some pointers do not count. A **weak reference** points to an object without keeping it alive: it does not contribute to the count, and when the object is freed, the weak reference is cleared. Python’s documentation puts it plainly: “a weak reference to an object is not enough to keep the object alive” :cite[python-weakref].

The trick is to choose, in each cycle, the pointer that should not own anything. In a family, the parent owns the child; the child’s pointer back to its parent is just a way to find it. Swift offers two flavours. A **weak** reference is used “when the other instance has a shorter lifetime”, and ARC automatically sets it to `nil` when that instance is deallocated; an **unowned** reference is used when the other instance “has the same lifetime or a longer lifetime”, is never set to `nil`, and accessing it after its instance has been deallocated is a runtime error :cite[swift-arc].

```mote-task
id: cycles/weak
title: Break the cycle
setting: rc
prompt: |
  This is the program from figure 19.1, running under plain reference counting: every family leaks. Mark one field as `weak` (write `weak` before the field name) so that every object is freed, without changing anything else.
starter: |
  struct Parent { name: int, child: Child? }
  struct Child { name: int, parent: Parent? }

  fn family(n: int) {
    let p = new Parent { name: n, child: null }
    let c = new Child { name: n + 1, parent: p }
    p.child = c
  }

  fn main() {
    family(1)
    family(3)
    print("done")
  }
solution: |
  struct Parent { name: int, child: Child? }
  struct Child { name: int, weak parent: Parent? }

  fn family(n: int) {
    let p = new Parent { name: n, child: null }
    let c = new Child { name: n + 1, parent: p }
    p.child = c
  }

  fn main() {
    family(1)
    family(3)
    print("done")
  }
expect: ["done"]
hints:
  - "Which pointer is the back-pointer? The parent owns the child; the child only needs to find its parent."
explain: "With `weak parent`, the child’s pointer does not count. When `family` returns, the parent’s count drops to zero, so it is freed; that releases its pointer to the child, whose count drops to zero in turn. If anything later read `c.parent`, it would find `null`: the weak reference was cleared when the parent died."
```

Weak references put the burden back on the programmer, who must find every cycle and choose its weak link. Get it wrong one way and the cycle leaks; get it wrong the other way, making an owning pointer weak, and objects are freed while still needed, which with `weak` turns into an unexpected `nil` and with `unowned` into a crash.

## Trial deletion

Can a reference counter find garbage cycles on its own? It can, with a beautiful trick. Suppose we suspect that some object is part of a garbage cycle. Pretend to delete it: walk everything it reaches and subtract, from each object’s count, one for every pointer found inside that subgraph. Whatever is left of a count is the number of pointers from *outside* the subgraph. An object with nothing left is held only from inside, and if the same is true of everything that reaches it, the whole group is garbage. An object with something left is alive, and so is everything it reaches: their counts are put back.

Where do suspects come from? From decrements. An object whose count drops to zero is freed at once; one whose count drops to a non-zero value is exactly the kind of object that might now be held only by a cycle, so it becomes a **candidate**.

::trial-deletion

This is **trial deletion**. David Bacon and V. T. Rajan’s synchronous cycle collector of 2001, building on earlier work by Martínez, Wachenchauzer and Lins :cite[martinez1990], works this way, and they went on to make it run concurrently with the program, in a reference-counting collector for a Java virtual machine :cite[bacon2001]. The course’s `rc-cycles` setting implements their synchronous algorithm.

```build
id: cycles/trial-deletion
title: Trial deletion on the workbench
prompt: |
  Implement trial deletion on the collector workbench. Reference counts are in each object’s aux word, and they are correct. Given the candidate objects, free (with `heap.free`) every object that is garbage, and leave every survivor with its correct count. The last test checks thirty random graphs against the true reachable set.
starter: |
  import { GcHeap } from '@mm/gc';

  /**
   * Trial deletion. Every object's reference count is in its aux word, and counts are correct: they include
   * pointers from roots and from other objects. `candidates` are objects whose counts were recently decremented to
   * a non-zero value: possible members of garbage cycles. Free every object that is garbage only because of cycles.
   */
  export function collectCycles(heap: GcHeap, candidates: number[]): void {
    const colour = new Map<number, 'grey' | 'black' | 'white'>();

    // TODO: 1. mark grey from each candidate, subtracting the count of every child of every object you reach;
    //       2. scan: grey objects with a count left are alive (re-add their children's counts, recursively);
    //          grey objects at zero are white;
    //       3. free the white objects with heap.free.
    void colour;
  }
solution: |
  import { GcHeap } from '@mm/gc';

  /**
   * Trial deletion. Every object's reference count is in its aux word, and counts are correct: they include
   * pointers from roots and from other objects. `candidates` are objects whose counts were recently decremented to
   * a non-zero value: possible members of garbage cycles. Free every object that is garbage only because of cycles.
   */
  export function collectCycles(heap: GcHeap, candidates: number[]): void {
    const colour = new Map<number, 'grey' | 'black' | 'white'>();

    // 1. Mark grey: subtract the references that come from inside the candidates' subgraph.
    function markGrey(o: number) {
      if (colour.get(o) === 'grey') return;
      colour.set(o, 'grey');
      const stack = [o];
      while (stack.length) {
        const x = stack.pop()!;
        for (const c of heap.children(x)) {
          heap.setAux(c, heap.aux(c) - 1);
          if (colour.get(c) !== 'grey') {
            colour.set(c, 'grey');
            stack.push(c);
          }
        }
      }
    }

    // An object with a count left is referenced from outside: it, and everything it reaches, is alive.
    function scanBlack(o: number) {
      colour.set(o, 'black');
      const stack = [o];
      while (stack.length) {
        const x = stack.pop()!;
        for (const c of heap.children(x)) {
          heap.setAux(c, heap.aux(c) + 1);
          if (colour.get(c) !== 'black') {
            colour.set(c, 'black');
            stack.push(c);
          }
        }
      }
    }

    // 2. Scan: grey objects with a count left are alive (restore their children); the rest are white.
    function scan(o: number) {
      const stack = [o];
      while (stack.length) {
        const x = stack.pop()!;
        if (colour.get(x) !== 'grey') continue;
        if (heap.aux(x) > 0) scanBlack(x);
        else {
          colour.set(x, 'white');
          for (const c of heap.children(x)) stack.push(c);
        }
      }
    }

    for (const o of candidates) markGrey(o);
    for (const o of candidates) scan(o);
    // 3. Collect: white objects are garbage.
    for (const [o, c] of colour) if (c === 'white') heap.free(o);
  }
tests: |
  import { test, expect } from '@mm/test';
  import { GcHeap } from '@mm/gc';
  import { collectCycles } from './solution';

  /** Set every object's count to the number of pointers to it, from roots and from objects. */
  function recount(heap: GcHeap) {
    for (const o of heap.objects()) heap.setAux(o, 0);
    for (const o of heap.rootObjects()) heap.setAux(o, heap.aux(o) + 1);
    for (const o of heap.objects()) for (const c of heap.children(o)) heap.setAux(c, heap.aux(c) + 1);
  }

  test('a cycle that nothing else points to is freed', () => {
    const heap = new GcHeap({ roots: 2 });
    const T = heap.addType('Node', 2);
    const a = heap.alloc(T);
    const b = heap.alloc(T);
    heap.set(heap.pointerSlots(a)[0]!, b);
    heap.set(heap.pointerSlots(b)[0]!, a);
    recount(heap);
    collectCycles(heap, [a]);
    expect([heap.isFree(a), heap.isFree(b)]).toEqual([true, true]);
  });

  test('a cycle with a pointer from outside survives, with its counts restored', () => {
    const heap = new GcHeap({ roots: 2 });
    const T = heap.addType('Node', 2);
    const a = heap.alloc(T);
    const b = heap.alloc(T);
    heap.set(heap.pointerSlots(a)[0]!, b);
    heap.set(heap.pointerSlots(b)[0]!, a);
    heap.set(heap.rootSlots()[0]!, b);
    recount(heap);
    collectCycles(heap, [a]);
    expect([heap.isFree(a), heap.isFree(b)]).toEqual([false, false]);
    expect([heap.aux(a), heap.aux(b)]).toEqual([1, 2]);
  });

  test('on random graphs, exactly the unreachable objects are freed, and survivors keep correct counts', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const heap = GcHeap.random(40, seed, { roots: 3, edges: 0.5 });
      recount(heap);
      const all = [...heap.objects()];
      const reachable = heap.reachable();
      collectCycles(heap, all);
      for (const o of all) expect(`seed ${seed}: ${heap.isFree(o)}`).toBe(`seed ${seed}: ${!reachable.has(o)}`);
      // Survivors: count = pointers from roots and from other survivors.
      const want = new Map<number, number>();
      for (const o of heap.rootObjects()) want.set(o, (want.get(o) ?? 0) + 1);
      for (const o of all) if (!heap.isFree(o)) for (const c of heap.children(o)) want.set(c, (want.get(c) ?? 0) + 1);
      for (const o of all) if (!heap.isFree(o)) expect(`seed ${seed}: ${heap.aux(o)}`).toBe(`seed ${seed}: ${want.get(o) ?? 0}`);
    }
  });
hints:
  - "Three passes: mark grey (subtract), scan (white if zero, otherwise restore with scanBlack), collect (free the white ones)."
  - "scanBlack must add one back to each child for each pointer it follows, and turn white objects black again: a white object can turn out to be reachable from a black one found later."
```

## CPython’s cycle collector

CPython counts references, and it backs the counts up with a cycle collector that uses the same subtraction. Its design notes describe it: every container object gets a field initialised to its reference count, then the collector goes through the containers and decrements, for every container, the field of every object it references; “after all the objects have been scanned, only the objects that have references from outside the ‘objects to scan’ list will have `gc_ref > 0`” :cite[cpython-gc]. Those objects, and everything reachable from them, are alive; the rest is cyclic garbage.

It cannot scan every object every time, so it uses generations, based on “the weak generational hypothesis: most objects die young” :cite[cpython-gc], an idea that chapter 23 develops. And it has a cost that is easy to miss: the scan *writes* to every object it examines, even the ones that survive.

::museum{exhibit="instagram-2017"}

That exhibit, from chapter 5, was about copy-on-write pages. Seen from this chapter, it is about the cycle collector: a collector that only needed to *read* the objects would not have unshared a single page.

:::key
Reference counting cannot free **cycles**: objects in a ring keep each other’s counts above zero. **Weak references** don’t count, so a cycle with one weak link can die; the programmer must choose the link. **Trial deletion** finds garbage cycles automatically: from candidate objects, subtract the counts that come from inside, and whatever drops to zero, with nothing outside holding it, is garbage. CPython’s cycle collector uses the same subtraction.
:::

:::whofrees
For most objects, the last pointer to go; for cycles, either the programmer, by choosing which pointer is weak, or a cycle collector that occasionally looks at the structure as a whole. That second answer is a step towards tracing collection.
:::

## What’s next

The next chapter, an optional one, looks at the other weakness of reference counting: the cost of updating counts on every pointer write, and the tricks, from deferred counting to biased counts and in-place reuse, that make it fast. Readers heading straight for tracing collectors can skip to Part VI.
