---
title: Moving collectors
summary: Move the survivors instead of freeing the dead. Compaction, semispace copying, Cheney’s two fingers, forwarding pointers, and allocation by bumping a pointer.
number: 22
duration: 50 minutes
prerequisites: [reachability]
---

Mark–sweep leaves two problems behind. The first is the one chapter 11 was about: the survivors stay where they were, with holes between them, and the heap fragments. The second is cost: the sweep visits every object in the heap, alive or dead, so a heap of a million objects of which a thousand survive costs a million steps to sweep.

A **moving** collector solves both at once. Instead of freeing the dead objects where they lie, it moves the *live* ones together, and declares everything else free in one step. The free space is then one contiguous block, so allocation is a bump of a pointer, as in chapter 10’s simplest allocator. The price is that every pointer to a moved object must be found and updated, which only works if the collector knows exactly where all the pointers are.

## Compaction

A **mark–compact** collector marks as before, then slides the live objects down to the bottom of the heap, in their original order. The classic version, sometimes called the Lisp 2 algorithm, makes three more passes over the heap: one to compute each live object’s new address, one to update every pointer to point at the new addresses, and one to move the objects :cite[jones2023]. It keeps the heap compact and the objects in their allocation order, which is good for locality; it is also slow, because it walks the whole heap several times.

## Copying: two spaces

The fastest way to compact is not to slide objects within one space but to copy them into another. Robert Fenichel and Jerome Yochelson described such a collector for LISP in 1969 :cite[fenichel1969]. The heap is split into two halves. The program allocates in one, **from-space**, by bumping a pointer. When it is full, the collector copies every reachable object into the other half, **to-space**, and the two swap roles. Garbage is never touched at all: it simply stays behind in from-space, which is reused wholesale next time.

Two problems remain. Copying an object moves it, so every pointer to it must be updated, including pointers from objects not yet copied; and the copying must find every reachable object, which seems to need a work list. C. J. Cheney’s 1970 algorithm solves both with two pointers into to-space :cite[cheney1970].

::cheney-fingers

When an object is copied, its old body in from-space is overwritten with its new address: a **forwarding pointer**. Anyone who later finds a pointer to the old copy follows the forwarding pointer and learns where the object went, so each object is copied exactly once, however many pointers lead to it. And the objects between the scan finger and the free finger are exactly the grey objects of chapter 21, found but not yet scanned: to-space *is* the work list, so no extra memory and no recursion are needed.

```build
id: moving-collectors/cheney
title: Cheney’s collector
prompt: |
  Write Cheney’s copying collector for the workbench. `evacuate` is written: it copies an object to the free finger (`to.alloc`), leaving a forwarding pointer in its old body, or returns the new address if the object was already copied. Write the rest: evacuate the root objects and update the root slots, then run a scan finger through to-space, evacuating whatever each copied object points to and updating its fields, until the scan finger catches up with the free finger (`to.top`).
starter: |
  import { GcHeap, FORWARDED } from '@mm/gc';

  /**
   * Cheney's copying collector. Copy every object reachable from from's roots into `to` (an empty heap with the same
   * types), and update from's roots to point at the copies. A copied object's old body holds a forwarding pointer:
   * the FORWARDED flag in its header and the new address in its aux word.
   */
  export function collect(from: GcHeap, to: GcHeap): void {
    const forwarded = (o: number) => (from.flags(o) & FORWARDED) !== 0;

    /** The to-space address of o, copying it to the free finger first if needed. */
    function evacuate(o: number): number {
      if (forwarded(o)) return from.aux(o);
      const n = to.alloc(from.typeOf(o)); // to.alloc bumps the free finger
      for (let i = 0; i < from.size(o); i += 8) to.mem.poke(n + i, from.mem.peek(o + i));
      from.mem.poke(o, from.mem.peek(o) | FORWARDED);
      from.setAux(o, n);
      return n;
    }

    // TODO: evacuate the root objects, updating the root slots; then advance a scan finger through to-space
    // from to.mem.base to to.top, evacuating every object each copied object points to and updating its fields.
  }
solution: |
  import { GcHeap, FORWARDED } from '@mm/gc';

  /**
   * Cheney's copying collector. Copy every object reachable from from's roots into `to` (an empty heap with the same
   * types), and update from's roots to point at the copies. A copied object's old body holds a forwarding pointer:
   * the FORWARDED flag in its header and the new address in its aux word.
   */
  export function collect(from: GcHeap, to: GcHeap): void {
    const forwarded = (o: number) => (from.flags(o) & FORWARDED) !== 0;

    /** The to-space address of o, copying it to the free finger first if needed. */
    function evacuate(o: number): number {
      if (forwarded(o)) return from.aux(o);
      const n = to.alloc(from.typeOf(o)); // to.alloc bumps the free finger
      for (let i = 0; i < from.size(o); i += 8) to.mem.poke(n + i, from.mem.peek(o + i));
      from.mem.poke(o, from.mem.peek(o) | FORWARDED);
      from.setAux(o, n);
      return n;
    }

    for (const slot of from.rootSlots()) {
      const o = from.get(slot);
      if (o) from.set(slot, evacuate(o));
    }
    // The scan finger: everything between scan and free has been copied but not yet scanned.
    let scan = to.mem.base;
    while (scan < to.top) {
      for (const slot of to.pointerSlots(scan)) {
        const o = to.get(slot);
        if (o) to.set(slot, evacuate(o));
      }
      scan += to.size(scan);
    }
  }
tests: |
  import { test, expect } from '@mm/test';
  import { GcHeap } from '@mm/gc';
  import { collect } from './solution';

  /** A description of the graph reachable from the roots, independent of addresses. */
  function shape(h: GcHeap): string {
    const ids = new Map<number, number>();
    const out: string[] = [];
    const queue: number[] = [];
    const name = (o: number) => {
      if (!o) return '·';
      if (!ids.has(o)) {
        ids.set(o, ids.size);
        queue.push(o);
      }
      return String(ids.get(o));
    };
    const roots = h.rootSlots().map((s) => name(h.get(s)));
    while (queue.length) {
      const o = queue.shift()!;
      const ints = h.size(o) / 8 - 2 - h.pointerSlots(o).length;
      const vals = Array.from({ length: ints }, (_, i) => h.mem.peek(o + 16 + (h.pointerSlots(o).length + i) * 8));
      out.push(`${ids.get(o)}:${h.typeOf(o)}:${h.pointerSlots(o).map((s) => name(h.get(s))).join(',')}:${vals.join(',')}`);
    }
    return `${roots.join(',')} | ${out.join(' ')}`;
  }
  function fresh(like: GcHeap): GcHeap {
    const to = new GcHeap({ bytes: like.mem.capacity, roots: 1 });
    for (const t of like.types) to.addType(t.name, t.pointers, t.ints);
    return to;
  }

  test('the copy has the same shape as the original, and nothing else', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const from = GcHeap.random(50, seed, { roots: 4, edges: 0.5 });
      const before = shape(from);
      const live = from.reachable();
      const to = fresh(from);
      collect(from, to);
      // The roots now point into to-space; read the graph there.
      const view = Object.assign(Object.create(Object.getPrototypeOf(to)), to, { roots: from.roots });
      expect(`seed ${seed}: ${shape(view)}`).toBe(`seed ${seed}: ${before}`);
      let bytes = 0;
      for (const o of live) bytes += from.sizeOfType(from.typeOf(o));
      expect(`seed ${seed}: ${to.top - to.mem.base}`).toBe(`seed ${seed}: ${bytes}`);
    }
  });
  test('shared objects and cycles are copied once', () => {
    const from = new GcHeap({ roots: 2 });
    const T = from.addType('Node', 2);
    const a = from.alloc(T);
    const b = from.alloc(T);
    from.set(from.pointerSlots(a)[0]!, b);
    from.set(from.pointerSlots(a)[1]!, b);
    from.set(from.pointerSlots(b)[0]!, a);
    from.set(from.rootSlots()[0]!, a);
    from.set(from.rootSlots()[1]!, b);
    const to = fresh(from);
    collect(from, to);
    expect(to.top - to.mem.base).toBe(2 * from.sizeOfType(T));
  });
  test('copying is breadth-first: the root’s object first, then what it points to, in order', () => {
    const from = new GcHeap({ roots: 1 });
    const T = from.addType('Node', 2, 1);
    const objs = Array.from({ length: 5 }, (_, i) => {
      const o = from.alloc(T);
      from.mem.poke(o + 32, i); // label each object with its index
      return o;
    });
    // root → 4 → (2, 0); 2 → 3; object 1 is garbage
    from.set(from.rootSlots()[0]!, objs[4]!);
    from.set(from.pointerSlots(objs[4]!)[0]!, objs[2]!);
    from.set(from.pointerSlots(objs[4]!)[1]!, objs[0]!);
    from.set(from.pointerSlots(objs[2]!)[0]!, objs[3]!);
    const to = fresh(from);
    collect(from, to);
    expect([...to.objects()].map((o) => to.mem.peek(o + 32))).toEqual([4, 2, 0, 3]);
    expect(from.get(from.rootSlots()[0]!)).toBe(to.mem.base);
  });
  test('a list of 100,000 nodes is copied without recursion', () => {
    const from = new GcHeap({ bytes: 1 << 23, roots: 1 });
    const T = from.addType('Node', 1);
    let prev = 0;
    for (let i = 0; i < 100_000; i++) {
      const n = from.alloc(T);
      from.set(from.pointerSlots(n)[0]!, prev);
      prev = n;
    }
    from.set(from.rootSlots()[0]!, prev);
    const to = fresh(from);
    collect(from, to);
    expect(to.top - to.mem.base).toBe(100_000 * from.sizeOfType(T));
  });
hints:
  - "Roots: for each slot in `from.rootSlots()`, if `from.get(slot)` is an object, `from.set(slot, evacuate(it))`."
  - "Scan: `let scan = to.mem.base; while (scan < to.top) { … scan += to.size(scan) }`, evacuating every non-null `to.get(slot)` for `slot` in `to.pointerSlots(scan)`."
```

## What copying costs

A copying collection does work in proportion to the live data, not to the heap: in the figure, the five garbage objects were never looked at. If most objects are dead when the collector runs, as they usually are, that is a huge saving, and chapter 23 builds on it. Allocation becomes a bump of the free finger, the cheapest allocation there is. And the survivors end up next to each other.

The price is memory: half the heap is always empty, waiting to be the next to-space. Moving also has consequences beyond the collector. Objects’ addresses change, so a program cannot use an address as a hash code or pass it to code that does not know the object might move, and the collector must find *every* pointer, exactly, which is chapter 24’s problem.

:::dial{settings="mark-sweep,mark-compact,copying" title="Three tracing collectors, one program" n="22.2"}
```mote
struct Tree { left: Tree?, right: Tree?, value: int }

fn build(depth: int) -> Tree? {
  if depth == 0 {
    return null
  }
  return new Tree { left: build(depth - 1), right: build(depth - 1), value: depth }
}

fn count(t: Tree?) -> int {
  if t == null {
    return 0
  }
  return 1 + count(t.left) + count(t.right)
}

fn main() {
  let longLived = build(6)
  var total = 0
  for i in 0..20 {
    let t = build(4)
    total = total + count(t)
  }
  print(total, count(longLived))
}
```
The same program under mark–sweep, mark–compact and copying. Compare the heap each holds and how often each collects: the copying collector can only use half of its memory at a time.
:::

:::key
A **moving** collector relocates the live objects and frees everything else in one step, eliminating fragmentation and making allocation a pointer bump. **Mark–compact** slides survivors together within one space; **semispace copying** copies them to a second space, doing work only for live objects but keeping half the heap empty. **Cheney’s algorithm** uses to-space itself as the work list, with **forwarding pointers** so that each object is copied once.
:::

:::whofrees
The collector, by not copying. Dead objects are never visited, never freed one by one: they are simply left behind in a space that will be overwritten.
:::

## What’s next

Copying is cheap when most objects are dead, and expensive when they are not: a collector that copies the same long-lived data structure over and over is wasting its time. Chapter 23 splits the heap by age, so that young objects, which mostly die, are collected often, and old ones, which mostly do not, are left alone.
