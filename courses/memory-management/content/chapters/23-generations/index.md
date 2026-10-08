---
title: Generations
summary: Most objects die young. Collect the young often and the old rarely, and keep track of the pointers between them with a write barrier.
number: 23
duration: 50 minutes
prerequisites: [moving-collectors]
---

A copying collector’s cost is the live data it copies. That is wonderful when almost everything is dead, and wasteful when a large, long-lived structure is copied at every collection, unchanged, over and over. Is there a way to collect only where the garbage is?

There is, because objects do not all live equally long. Measure it.

::lifetimes

In the short-lived pairs program, nearly every object is unreachable within four allocations of its birth. In the binary trees, most nodes belong to the many small trees that are built and dropped, and a minority to the one tree that lives for the whole run. This pattern, a few objects that live long and very many that die almost at once, has a name: the **weak generational hypothesis**, “most objects die young” :cite[cpython-gc].

## Two generations

Henry Lieberman and Carl Hewitt proposed in 1983 to exploit it by dividing the heap by age :cite[lieberman1983], and David Ungar’s generation scavenging of 1984 gave the design its now-classic form :cite[ungar1984]. New objects are allocated in a small **nursery**. When it fills, a **minor collection** copies its few survivors out, into an **old generation**, a step called **promotion**, and the whole nursery is empty again. Because most nursery objects are already dead, a minor collection copies very little and is quick. The old generation fills slowly and is collected rarely, by a **major collection** of the whole heap.

:::generations{n="23.2"}
```mote
struct Item { n: int }
struct Entry { key: int, value: Item? }
struct Junk { a: int, b: int }

fn main() {
  let table = new [Entry; 20]
  for i in 0..20 {
    table[i] = new Entry { key: i, value: null }
  }
  var total = 0
  for round in 0..30 {
    for k in 0..40 {
      let j = new Junk { a: k, b: round }
      total = total + j.a
    }
    let e = table[round % 20]
    e.value = new Item { n: round }
  }
  var sum = 0
  for i in 0..20 {
    sum = sum + table[i].value.n
  }
  print(total, sum)
}
```
:::

Each tooth of the sawtooth is a minor collection: thousands of `Junk` objects die in the nursery without ever being copied, while the table and its entries are promoted once and then left alone. Try a smaller nursery: more minor collections, each one cheaper, and a few more objects promoted because they had less time to die.

## The pointer the collector cannot see

A minor collection only looks at the nursery. It finds live nursery objects by tracing from the roots, but the roots are not the only way in: an *old* object can point to a young one. In the program, line 17 stores a brand-new `Item` into an `Entry` that was promoted long ago. If the minor collection traced only from the roots, it would never find that `Item`, and would free it while the table still points to it.

Untick *Write barrier* in the figure, and that is exactly what happens: the oracle reports reachable objects freed by a minor collection, and the program soon reads one of them.

The fix is a **write barrier**: a little code the compiler adds to every store of a pointer into an object. When an old object is made to point to a young one, the barrier records where, in a **remembered set**, and the next minor collection treats those locations as extra roots. In the figure, the barrier ran on every pointer store, over two thousand times, so that the minor collections could stay small. Generational collection is a bargain: a little work on every write, in exchange for collections that ignore most of the heap.

Instead of remembering individual fields, many collectors divide the old generation into fixed-size **cards** and keep one byte per card; the barrier just marks the card containing the written field as dirty, and the minor collection scans only the dirty cards :cite[jones2023]. The barrier is a couple of instructions with no test at all; the price is moved to the collector, which must scan a whole card to find the pointers in it.

```build
id: generations/cards
title: A card-marking write barrier
prompt: |
  Implement card marking. Objects below `boundary` are old, the rest young; the card table has one entry per 64 bytes of the old generation. `write` is the barrier every pointer store goes through: mark the card of any old field written. `scanCards` is called by a minor collection: visit every old pointer field that lies in a dirty card and points into the young generation, then clean all the cards.
starter: |
  import { GcHeap } from '@mm/gc';

  export const CARD = 64; // bytes of heap per card

  /**
   * Card marking. Objects below `boundary` are old; objects at or above it are young. The card table has one entry
   * per CARD bytes of the old generation: dirty means "some pointer field in these bytes was written since the last
   * minor collection".
   */
  export function createCards(heap: GcHeap, boundary: number) {
    const cards = new Uint8Array(Math.ceil((boundary - heap.mem.base) / CARD));
    const cardOf = (addr: number) => Math.floor((addr - heap.mem.base) / CARD);

    return {
      /** The write barrier: every pointer store into the heap goes through here. */
      write(slot: number, value: number): void {
        heap.set(slot, value);
        // TODO: if the slot is in the old generation, mark its card dirty.
      },
      /** For a minor collection: visit every old pointer field into the young generation found in a dirty card. */
      scanCards(visit: (slot: number) => void): void {
        // TODO: for each old object (heap.objects() walks them in address order), visit each pointer slot that
        // lies in a dirty card and points into the young generation; then clean every card.
      },
      dirtyCards: () => cards.reduce((n, c) => n + c, 0),
    };
  }
solution: |
  import { GcHeap } from '@mm/gc';

  export const CARD = 64; // bytes of heap per card

  /**
   * Card marking. Objects below `boundary` are old; objects at or above it are young. The card table has one entry
   * per CARD bytes of the old generation: dirty means "some pointer field in these bytes was written since the last
   * minor collection".
   */
  export function createCards(heap: GcHeap, boundary: number) {
    const cards = new Uint8Array(Math.ceil((boundary - heap.mem.base) / CARD));
    const cardOf = (addr: number) => Math.floor((addr - heap.mem.base) / CARD);

    return {
      /** The write barrier: every pointer store into the heap goes through here. */
      write(slot: number, value: number): void {
        heap.set(slot, value);
        if (slot < boundary) cards[cardOf(slot)] = 1;
      },
      /** For a minor collection: visit every old pointer field into the young generation found in a dirty card. */
      scanCards(visit: (slot: number) => void): void {
        for (const o of heap.objects()) {
          if (o >= boundary) break;
          for (const slot of heap.pointerSlots(o)) {
            if (!cards[cardOf(slot)]) continue;
            if (heap.get(slot) >= boundary) visit(slot);
          }
        }
        cards.fill(0);
      },
      dirtyCards: () => cards.reduce((n, c) => n + c, 0),
    };
  }
tests: |
  import { test, expect } from '@mm/test';
  import { GcHeap } from '@mm/gc';
  import { createCards } from './solution';

  /** A small deterministic random-number generator. */
  function rng(seed: number) {
    let x = seed * 2654435761 % 4294967296;
    return () => ((x = (x * 1664525 + 1013904223) % 4294967296) / 4294967296);
  }

  function setup(seed: number) {
    const heap = new GcHeap({ bytes: 1 << 16, roots: 2 });
    const T = heap.addType('Node', 2, 1);
    const old = Array.from({ length: 60 }, () => heap.alloc(T));
    const boundary = heap.top;
    const young = Array.from({ length: 40 }, () => heap.alloc(T));
    return { heap, T, old, young, boundary, cards: createCards(heap, boundary), r: rng(seed) };
  }
  /** The truth: every old pointer field that points into the young generation. */
  function oldToYoung(heap: GcHeap, boundary: number): number[] {
    const out: number[] = [];
    for (const o of heap.objects()) if (o < boundary) for (const s of heap.pointerSlots(o)) if (heap.get(s) >= boundary) out.push(s);
    return out.sort((a, b) => a - b);
  }

  test('every old-to-young pointer is found, and nothing else', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const { heap, old, young, boundary, cards, r } = setup(seed);
      for (let i = 0; i < 80; i++) {
        const all = [...old, ...young];
        const holder = all[Math.floor(r() * all.length)]!;
        const target = r() < 0.2 ? 0 : all[Math.floor(r() * all.length)]!;
        cards.write(heap.pointerSlots(holder)[Math.floor(r() * 2)]!, target);
      }
      const seen: number[] = [];
      cards.scanCards((s) => seen.push(s));
      expect(`seed ${seed}: ${seen.sort((a, b) => a - b).join(',')}`).toBe(`seed ${seed}: ${oldToYoung(heap, boundary).join(',')}`);
    }
  });
  test('writes into young objects dirty no cards', () => {
    const { heap, young, cards } = setup(1);
    for (const y of young) cards.write(heap.pointerSlots(y)[0]!, young[0]!);
    expect(cards.dirtyCards()).toBe(0);
  });
  test('a scan cleans the cards, so the next minor collection starts fresh', () => {
    const { heap, old, young, cards } = setup(2);
    cards.write(heap.pointerSlots(old[3]!)[0]!, young[5]!);
    expect(cards.dirtyCards()).toBe(1);
    let n = 0;
    cards.scanCards(() => n++);
    expect(n).toBe(1);
    expect(cards.dirtyCards()).toBe(0);
  });
hints:
  - "The barrier: `if (slot < boundary) cards[cardOf(slot)] = 1`."
  - "The scan: walk `heap.objects()` (stop at the boundary), and for each pointer slot check its card, then whether `heap.get(slot) >= boundary`."
```

## Promotion and its mistakes

Promotion is a bet that an object which has survived one collection will live a long time. Sometimes the bet is wrong: an object that would have died a moment after the minor collection gets promoted, and now occupies the old generation until the next major collection. Real collectors hedge by keeping survivors in the nursery for a few collections before promoting them, which costs copying them several times :cite[jones2023].

:::key
The **weak generational hypothesis** says most objects die young, and the course’s programs bear it out. A generational collector allocates in a small **nursery**, collects it often with a cheap **minor collection**, and **promotes** survivors to an old generation collected rarely. Pointers from old objects to young ones must be found without scanning the old generation, so a **write barrier** records them, in a **remembered set** or a **card table**. Without the barrier, a minor collection frees live objects.
:::

:::whofrees
The minor collection, for the vast majority of objects, and in the cheapest way possible: by not copying them out of the nursery. A few long-lived objects are freed much later, by a major collection.
:::

## What’s next

Every collector so far has been handed a perfect list of roots: the VM knows which stack slots hold pointers. Real compilers have to work for that knowledge, and some collectors go without it. Chapter 24 is about finding roots.
