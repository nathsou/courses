---
title: Fast reference counting
summary: Counting every pointer write is expensive. Deferred and coalesced counting, biased counts for threads, immortal objects, and reuse in place.
number: 20
duration: 40 minutes
prerequisites: [counting-references]
---

Reference counting’s great virtue is that it does its work as the program runs, a little at a time. That is also its great cost. Every time a pointer is copied into a variable, passed to a function, stored in a field or overwritten, two counts change: one goes up, one goes down. Each change is a write to memory, often to an object the program was not otherwise touching, and in a program with threads each must be an atomic instruction, because another thread might be changing the same count at the same moment.

This chapter is about the tricks that make reference counting fast, and it starts by counting the counting.

::count-counter

Two things stand out. In the list program, almost all of the updates come from **variables**: the loop variable that walks the list, the arguments passed to `push` and `sum`, the locals released at each return. And in the cursor program, almost all of them come from **one field** being overwritten again and again. Each observation has a trick.

## Deferred counting: don’t count the stack

In 1976 Peter Deutsch and Daniel Bobrow proposed not counting references from the stack at all :cite[deutsch1976]. Counts include only pointers from other objects, so the many short-lived pointers in local variables cost nothing. The price is that a count of zero no longer means an object is garbage: a variable might still point to it. Such objects go into a **zero-count table**, and from time to time the program stops, scans its stack, and frees every object in the table that no variable points to.

In the count counter, deferral cuts the list program from about 700 updates to about 100. It does little for the cursor, whose updates are to a field.

```build
id: fast-reference-counting/zct
title: A zero-count table
prompt: |
  Implement deferred reference counting on the workbench. Counts include only pointers from objects: the program writes its roots directly with `heap.set`, at no cost. When a count reaches zero the object goes into the zero-count table instead of being freed, because a root might still point to it. Complete `reconcile()`, which frees every object in the table that no root points to, cascading through what they release. The starter frees objects as soon as their count reaches zero, which is no longer safe.
starter: |
  import { GcHeap } from '@mm/gc';

  /**
   * Deferred reference counting (Deutsch and Bobrow). Counts include only pointers from other objects: the program
   * writes its roots (think: local variables) directly with heap.set, at no cost. An object whose count reaches zero
   * might still be referenced from a root, so it goes into a zero-count table instead of being freed; reconcile()
   * frees the ones that no root points to.
   */
  export function createDeferredRc(heap: GcHeap) {
    const zct = new Set<number>();
    let updates = 0;

    return {
      /** Store value into a pointer field of an object (never a root). */
      write(slot: number, value: number): void {
        const old = heap.get(slot);
        if (old === value) return;
        if (value) {
          heap.setAux(value, heap.aux(value) + 1);
          updates++;
          zct.delete(value);
        }
        heap.set(slot, value);
        if (old) {
          heap.setAux(old, heap.aux(old) - 1);
          updates++;
          if (heap.aux(old) === 0) heap.free(old); // TODO: is that safe? A root might still point to it.
        }
      },
      /** Register a newly allocated object: its count starts at zero, so it starts in the table. */
      allocated(o: number): void {
        zct.add(o);
      },
      /** Free every object in the table that no root points to, and whatever that releases. */
      reconcile(): void {
        // TODO: free every object in the table that no root points to (heap.rootObjects()), releasing the
        // pointers inside it; anything whose count drops to zero is freed too, unless a root points to it, in
        // which case it goes back into the table.
      },
      /** Count updates performed so far (to compare with plain reference counting). */
      updates: () => updates,
    };
  }
solution: |
  import { GcHeap } from '@mm/gc';

  /**
   * Deferred reference counting (Deutsch and Bobrow). Counts include only pointers from other objects: the program
   * writes its roots (think: local variables) directly with heap.set, at no cost. An object whose count reaches zero
   * might still be referenced from a root, so it goes into a zero-count table instead of being freed; reconcile()
   * frees the ones that no root points to.
   */
  export function createDeferredRc(heap: GcHeap) {
    const zct = new Set<number>();
    let updates = 0;

    return {
      /** Store value into a pointer field of an object (never a root). */
      write(slot: number, value: number): void {
        const old = heap.get(slot);
        if (old === value) return;
        if (value) {
          heap.setAux(value, heap.aux(value) + 1);
          updates++;
          zct.delete(value);
        }
        heap.set(slot, value);
        if (old) {
          heap.setAux(old, heap.aux(old) - 1);
          updates++;
          if (heap.aux(old) === 0) zct.add(old);
        }
      },
      /** Register a newly allocated object: its count starts at zero, so it starts in the table. */
      allocated(o: number): void {
        zct.add(o);
      },
      /** Free every object in the table that no root points to, and whatever that releases. */
      reconcile(): void {
        const rooted = new Set(heap.rootObjects());
        const work = [...zct].filter((o) => !rooted.has(o));
        for (const o of work) zct.delete(o);
        while (work.length) {
          const o = work.pop()!;
          if (heap.isFree(o) || heap.aux(o) > 0) continue;
          for (const c of heap.children(o)) {
            heap.setAux(c, heap.aux(c) - 1);
            updates++;
            if (heap.aux(c) === 0) {
              if (rooted.has(c)) zct.add(c);
              else work.push(c);
            }
          }
          heap.free(o);
        }
      },
      /** Count updates performed so far (to compare with plain reference counting). */
      updates: () => updates,
    };
  }
tests: |
  import { test, expect } from '@mm/test';
  import { GcHeap } from '@mm/gc';
  import { createDeferredRc } from './solution';

  function setup() {
    const heap = new GcHeap({ bytes: 1 << 20, roots: 4 });
    const T = heap.addType('Node', 2, 1);
    const rc = createDeferredRc(heap);
    const alloc = () => {
      const o = heap.alloc(T);
      rc.allocated(o);
      return o;
    };
    const field = (o: number, i = 0) => heap.pointerSlots(o)[i]!;
    return { heap, rc, alloc, field, r: heap.rootSlots() };
  }

  test('an object held only by a root survives reconciliation', () => {
    const { heap, rc, alloc, r } = setup();
    const a = alloc();
    heap.set(r[0]!, a); // a root write: not counted
    rc.reconcile();
    expect(heap.isFree(a)).toBe(false);
  });
  test('an object that loses its last pointer is freed at reconciliation, not before', () => {
    const { heap, rc, alloc, field, r } = setup();
    const a = alloc();
    const b = alloc();
    heap.set(r[0]!, a);
    rc.write(field(a), b);
    rc.write(field(a), 0);
    expect(heap.isFree(b)).toBe(false);
    rc.reconcile();
    expect(heap.isFree(b)).toBe(true);
    expect(heap.isFree(a)).toBe(false);
  });
  test('a field pointer dropped while a root still holds the object does not free it', () => {
    const { heap, rc, alloc, field, r } = setup();
    const a = alloc();
    const b = alloc();
    heap.set(r[0]!, a);
    heap.set(r[1]!, b);
    rc.write(field(a), b);
    rc.write(field(a), 0); // b's count is 0, but r[1] holds it
    rc.reconcile();
    expect(heap.isFree(b)).toBe(false);
    heap.set(r[1]!, 0);
    rc.reconcile();
    expect(heap.isFree(b)).toBe(true);
  });
  test('reconciliation cascades through structures nobody holds', () => {
    const { heap, rc, alloc, field, r } = setup();
    const a = alloc();
    heap.set(r[0]!, a);
    let cur = a;
    for (let i = 0; i < 1000; i++) {
      const n = alloc();
      rc.write(field(cur), n);
      cur = n;
    }
    heap.set(r[0]!, 0);
    rc.reconcile();
    expect(heap.freed.size).toBe(1001);
  });
  test('root writes cost nothing: only field writes update counts', () => {
    const { heap, rc, alloc, r } = setup();
    const a = alloc();
    for (let i = 0; i < 100; i++) heap.set(r[i % 4]!, i % 2 ? a : 0);
    expect(rc.updates()).toBe(0);
  });
hints:
  - "Collect the rooted objects first: `new Set(heap.rootObjects())`."
  - "Use a work list. Freeing an object decrements its children; a child that reaches zero is freed too, unless a root points to it, in which case it goes back into the table."
```

## Coalescing: only the first and last values matter

Yossi Levanoni and Erez Petrank observed that if a field is overwritten many times between two collections, the intermediate values do not matter: the only objects whose counts really change are the one the field pointed to at the start and the one it points to at the end :cite[levanoni2001]. A collector that logs the *first* old value of each field it sees modified, and reads the current value when it next processes the log, can skip every update in between.

Drag the epoch slider with the cursor program selected: with an epoch of 20 statements, its thousand field updates shrink to under two hundred.

## Threads: biased counting

Atomic instructions are the expensive part when a program has threads. The observation behind **biased reference counting**, from Jiho Choi, Thomas Shull and Josep Torrellas, is that most objects are only ever used by one thread, even in programs with many :cite[choi2018, pep703]. So give each object two counts: a local count that only the owning thread updates, with ordinary instructions, and a shared count that other threads update atomically.

This is how the free-threaded build of CPython, which runs without the global interpreter lock, keeps reference counting affordable: “reference counting operations from the owning thread use non-atomic instructions to modify a ‘local’ reference count. Other threads use atomic instructions to modify a ‘shared’ reference count” :cite[pep703].

## Immortal objects

Some objects are never going to die: `None`, small integers, the built-in types. Counting references to them is pure waste, and worse than waste. Since Python 3.12, CPython can mark an object **immortal**, so that its “refcount will never reach 0” and the object becomes “truly immutable” :cite[pep683]. The proposal lists the costs it removes. Every count update invalidates a CPU cache line, so two threads using `None` keep invalidating each other’s caches. And programs that set up their state and then `fork` workers, the proposal names Instagram and YouTube, lose the benefit of copy-on-write sharing when count updates write to shared pages :cite[pep683]. That is the museum exhibit of chapters 5 and 19 again, from a third side.

## Reuse in place

The last trick turns reference counting from a cost into an advantage. If an object’s count is exactly one, the code holding the pointer is the *only* code that can see it. A functional language, which builds new values instead of modifying old ones, can then overwrite the old object in place, and nobody can tell.

::reuse

Alex Reinking, Ningning Xie, Leonardo de Moura and Daan Leijen made this precise in **Perceus**, the reference counting of the Koka language: it inserts count operations so that programs are “garbage free”, which enables “guaranteed in-place updates at runtime”, a style they call “functional but in-place” :cite[reinking2021]. Purely functional code that rebuilds a list, a tree or a map then runs with the memory traffic of a destructive update.

:::key
Reference counting pays on every pointer write. **Deferred counting** ignores pointers from the stack and frees from a zero-count table after scanning the stack; **coalescing** updates counts only for the first and last values of each field per epoch; **biased counting** lets the owning thread avoid atomic instructions; **immortal objects** skip counting altogether; and **reuse** turns a count of one into permission to update in place.
:::

:::whofrees
Still the last pointer, but “last” is decided less eagerly: at the next scan of the stack, at the end of an epoch, or never, for an immortal object. Every speed-up here trades a little promptness for a lot of throughput, which is the trade tracing collectors make wholesale.
:::

## What’s next

Part V ends here. Part VI turns the problem inside out: instead of keeping counts up to date all the time, it does nothing while the program runs and, now and then, finds everything that is still reachable. Whatever is not, is garbage, cycles included.
