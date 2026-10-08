---
title: Catching them
summary: Guard pages, Valgrind, AddressSanitizer’s shadow memory, hardened allocators, memory tagging and capabilities. What each catches, and what it costs.
number: 16
duration: 50 minutes
prerequisites: [the-error-zoo]
---

The errors in the zoo share one cruel property: nothing happens when they happen. The program that writes past the end of an array carries on; the damage surfaces later, elsewhere, as a wrong balance or a crash in `free`. Debugging that is detective work, starting from the corpse.

A **detector** changes the deal. It watches the program’s memory accesses and its calls to `malloc` and `free`, and stops the program *at the moment of the error*, on the line that made it. The cost is time and memory, and every detector strikes the bargain differently. Put on the goggles.

## The goggles

::goggles

The table is the chapter in miniature. Every model catches some errors and misses others, and the misses are as instructive as the catches. Start with the selected cell: the *overflow that jumps* writes element 12 of a three-element array. With no detector, it lands in empty memory and nothing visible happens. Under redzones, it **jumps over the redzone** into the next block, which happens to be the account, and the detector, which only checks whether the bytes touched are addressable, sees nothing wrong. The rest of this chapter explains each column.

## Guard pages

The oldest trick borrows the hardware of chapter 3. An allocator can place every block at the very end of a page and leave the *next* page unmapped, so that the first byte past the block faults; and it can unmap freed memory instead of reusing it. Bruce Perens’s **Electric Fence** works this way: it “uses the virtual memory hardware of your computer to place an inaccessible memory page immediately after (or before, at the user’s option) each memory allocation”, and memory released by `free` “is made inaccessible” :cite[efence].

The checks cost nothing, because the MMU makes them on every access anyway. The memory costs a great deal: at least a page and a guard page for every block, however small. In the goggles, the leak program’s twenty 32-byte requests take 160 KiB. And alignment gets in the way: a block must start on a 16-byte boundary, so a guard page catches a byte past the end only if the block’s size happens to be a multiple of the alignment.

## Shadow memory: Valgrind and AddressSanitizer

The next idea is to keep, alongside the program’s memory, a record of which bytes the program is *allowed* to touch, and to check that record on every load and store.

**Valgrind**’s Memcheck does this by translating the program’s machine code as it runs and adding checks to it. It keeps a bit per byte saying whether the byte is addressable, and further bits saying whether each bit of a value has been initialised, so it also catches reads of uninitialised memory; it reports illegal reads and writes, illegal frees and leaks :cite[valgrind-memcheck]. Freed memory is “marked inaccessible and placed in a queue of freed blocks”, twenty million bytes of them by default, so that a use after free is caught for a while after the `free` :cite[valgrind-memcheck]. The price is speed: a program under Memcheck runs “much slower (eg. 20 to 30 times) than normal” :cite[valgrind-quickstart].

**AddressSanitizer**, from Konstantin Serebryany and colleagues at Google, made the same idea fast enough to leave on in testing :cite[serebryany2012]. The compiler inserts a check before every memory access, and the checks consult a **shadow memory**: one byte of shadow for every 8 bytes of memory, at address `(addr >> 3) + offset`. Because `malloc` returns 8-byte-aligned memory, any aligned 8 bytes are in one of nine states, so one shadow byte suffices: 0 means all 8 bytes may be touched, *k* from 1 to 7 means only the first *k*, and a negative value means none, with different negative values for heap redzones, freed memory and the rest :cite[serebryany2012]. The allocator surrounds every block with poisoned **redzones**, and `free` poisons the block and puts it in a FIFO **quarantine** so that it is not reused soon :cite[serebryany2012]. The paper reports an average slowdown of 73% and 3.4 times the memory :cite[serebryany2012].

The paper is candid about the misses, and the goggles reproduce both. An out-of-bounds access “too far away from the object bound may land in a different valid allocation and the bug will be missed”, and a use after free may be missed “if a large amount of memory has been allocated and deallocated between the ‘free’ and the following use”, because the quarantine has moved on :cite[serebryany2012].

```build
id: catching-them/sanitiser
title: Shadow memory, redzones and a quarantine
storage: true
prompt: |
  Build the heart of AddressSanitizer around the segregated allocator. The shadow is a region of the heap with one byte per 8 bytes of memory. `malloc` is written: it surrounds each block with 16-byte redzones, poisons them, and unpoisons exactly the `n` bytes requested (with a partial last granule). The quarantine in `free` is written too. Complete `check(addr)`, which classifies a single byte access, and the two missing pieces of `free`: report double and invalid frees, and poison the freed payload so that later accesses are caught.
starter: |
  import type { Heap } from '@mm/heap';
  import { segregated } from '@mm/allocators';

  const RZ = 16; // redzone bytes on each side of a block
  const QUARANTINE = 4096; // bytes of freed blocks held back before reuse
  const COVER = 1 << 20; // bytes of heap the shadow describes
  const REDZONE = 0xfa; // shadow values: 0 = addressable, 1..7 = first k bytes addressable,
  const FREED = 0xfd; //   REDZONE or FREED = not addressable at all

  export function createSanitiser(heap: Heap) {
    const inner = segregated(10)(heap);
    const base = heap.sbrk(0);
    const shadow = heap.sbrk(COVER / 8); // one shadow byte per 8 bytes of heap
    for (let i = 0; i < COVER / 8; i += 8) heap.store64(shadow + i, 0);
    let qHead = 0; // oldest quarantined block (its raw address)
    let qTail = 0;
    let qBytes = 0;

    const shadowAt = (addr: number) => shadow + Math.floor((addr - base) / 8);
    function poison(from: number, n: number, value: number) {
      for (let a = from; a < from + n; a += 8) heap.store8(shadowAt(a), value);
    }
    /** Mark n bytes from p addressable, with a partial last granule if n is not a multiple of 8. */
    function unpoison(p: number, n: number) {
      for (let a = p; a < p + n; a += 8) heap.store8(shadowAt(a), p + n - a >= 8 ? 0 : p + n - a);
    }

    return {
      malloc(n: number): number {
        const size = Math.ceil(n / 16) * 16;
        const raw = inner.malloc(size + 2 * RZ);
        if (!raw) return 0;
        const p = raw + RZ;
        heap.store64(raw, n); // the left redzone remembers the requested size
        poison(raw, RZ, REDZONE);
        poison(p, size, REDZONE);
        unpoison(p, n);
        poison(p + size, RZ, REDZONE);
        return p;
      },
      free(p: number): string {
        if (!p) return 'ok';
        // TODO: report 'double-free' if p's shadow says FREED, and 'invalid-free' if p is not the start of a
        // block (its shadow is a redzone, or the granule just before it is not a left redzone).
        const raw = p - RZ;
        const size = Math.ceil(heap.load64(raw) / 16) * 16;
        // TODO: poison the payload as FREED.
        // Queue the block (linked through its own first payload word), then release the oldest beyond the limit.
        heap.store64(p, 0);
        if (qTail) heap.store64(qTail + RZ, raw);
        else qHead = raw;
        qTail = raw;
        qBytes += size + 2 * RZ;
        while (qBytes > QUARANTINE && qHead !== qTail) {
          const old = qHead;
          qHead = heap.load64(old + RZ);
          qBytes -= Math.ceil(heap.load64(old) / 16) * 16 + 2 * RZ;
          inner.free(old);
        }
        return 'ok';
      },
      /** May the program touch the byte at addr? */
      check(addr: number): string {
        // TODO: read addr's shadow byte. 0: 'ok'. 1 to 7: 'ok' only if addr is among the first k bytes of its
        // granule. FREED: 'use-after-free'. Anything else: 'overflow'.
        return 'ok';
      },
    };
  }
solution: |
  import type { Heap } from '@mm/heap';
  import { segregated } from '@mm/allocators';

  const RZ = 16; // redzone bytes on each side of a block
  const QUARANTINE = 4096; // bytes of freed blocks held back before reuse
  const COVER = 1 << 20; // bytes of heap the shadow describes
  const REDZONE = 0xfa; // shadow values: 0 = addressable, 1..7 = first k bytes addressable,
  const FREED = 0xfd; //   REDZONE or FREED = not addressable at all

  export function createSanitiser(heap: Heap) {
    const inner = segregated(10)(heap);
    const base = heap.sbrk(0);
    const shadow = heap.sbrk(COVER / 8); // one shadow byte per 8 bytes of heap
    for (let i = 0; i < COVER / 8; i += 8) heap.store64(shadow + i, 0);
    let qHead = 0; // oldest quarantined block (its raw address)
    let qTail = 0;
    let qBytes = 0;

    const shadowAt = (addr: number) => shadow + Math.floor((addr - base) / 8);
    function poison(from: number, n: number, value: number) {
      for (let a = from; a < from + n; a += 8) heap.store8(shadowAt(a), value);
    }
    /** Mark n bytes from p addressable, with a partial last granule if n is not a multiple of 8. */
    function unpoison(p: number, n: number) {
      for (let a = p; a < p + n; a += 8) heap.store8(shadowAt(a), p + n - a >= 8 ? 0 : p + n - a);
    }

    return {
      malloc(n: number): number {
        const size = Math.ceil(n / 16) * 16;
        const raw = inner.malloc(size + 2 * RZ);
        if (!raw) return 0;
        const p = raw + RZ;
        heap.store64(raw, n); // the left redzone remembers the requested size
        poison(raw, RZ, REDZONE);
        poison(p, size, REDZONE);
        unpoison(p, n);
        poison(p + size, RZ, REDZONE);
        return p;
      },
      free(p: number): string {
        if (!p) return 'ok';
        const s = heap.load8(shadowAt(p));
        if (s === FREED) return 'double-free';
        if (s === REDZONE || heap.load8(shadowAt(p - 8)) !== REDZONE) return 'invalid-free';
        const raw = p - RZ;
        const size = Math.ceil(heap.load64(raw) / 16) * 16;
        poison(p, size, FREED);
        // Queue the block (linked through its own first payload word), then release the oldest beyond the limit.
        heap.store64(p, 0);
        if (qTail) heap.store64(qTail + RZ, raw);
        else qHead = raw;
        qTail = raw;
        qBytes += size + 2 * RZ;
        while (qBytes > QUARANTINE && qHead !== qTail) {
          const old = qHead;
          qHead = heap.load64(old + RZ);
          qBytes -= Math.ceil(heap.load64(old) / 16) * 16 + 2 * RZ;
          inner.free(old);
        }
        return 'ok';
      },
      /** May the program touch the byte at addr? */
      check(addr: number): string {
        const s = heap.load8(shadowAt(addr));
        if (s === 0) return 'ok';
        if (s < 8) return (addr - base) % 8 < s ? 'ok' : 'overflow';
        return s === FREED ? 'use-after-free' : 'overflow';
      },
    };
  }
tests: |
  import { test, expect } from '@mm/test';
  import { runTrace } from '@mm/check';
  import { TRACE_BANK as BANK } from '@mm/trace';
  import { FlatHeap } from '@mm/heap';
  import { createSanitiser } from './solution';

  test('correct programs run cleanly: every trace passes the heap checker', () => {
    for (const t of BANK.filter((t) => t.id !== 'realloc')) {
      const r = runTrace((h) => createSanitiser(h), t.ops);
      expect(`${t.name}: ${r.failure?.message ?? 'ok'}`).toBe(`${t.name}: ok`);
    }
  });
  test('overflows: the bytes after a block, and before it, are caught', () => {
    const s = createSanitiser(new FlatHeap());
    const p = s.malloc(20);
    expect(s.check(p)).toBe('ok');
    expect(s.check(p + 19)).toBe('ok');
    expect(s.check(p + 20)).toBe('overflow');
    expect(s.check(p + 32)).toBe('overflow');
    expect(s.check(p - 1)).toBe('overflow');
  });
  test('use after free is caught, and the quarantine keeps the block from being reused at once', () => {
    const s = createSanitiser(new FlatHeap());
    const p = s.malloc(48);
    expect(s.free(p)).toBe('ok');
    expect(s.check(p + 8)).toBe('use-after-free');
    for (let i = 0; i < 10; i++) expect(s.malloc(48)).not.toBe(p);
  });
  test('double and invalid frees are reported', () => {
    const s = createSanitiser(new FlatHeap());
    const p = s.malloc(32);
    const q = s.malloc(32);
    expect(s.free(p)).toBe('ok');
    expect(s.free(p)).toBe('double-free');
    expect(s.free(q + 16)).toBe('invalid-free');
  });
hints:
  - "In `check`: `const s = heap.load8(shadowAt(addr))`. A partial granule `s` from 1 to 7 allows the first `s` bytes, that is, offsets `(addr - base) % 8` below `s`."
  - "A block’s start is the first byte after a left redzone: the shadow of `p - 8` is `REDZONE`, and the shadow of `p` is not."
  - "Poison the freed payload with `poison(p, size, FREED)`."
```

## Hardened allocators

Detectors are for testing; nobody ships Valgrind. Production allocators instead add cheap checks that make the most dangerous errors harder to exploit. glibc’s `malloc` is a good example. When a block is freed into a thread cache, it checks whether the block is already in that cache and, if so, stops with “free(): double free detected in tcache 2”; and its single-linked free lists use **safe-linking**, storing each next pointer XORed with the address where it is stored (shifted right by 12 bits), so that an attacker who overwrites a freed block’s first word cannot point the free list wherever they like :cite[glibc-malloc-c]. The goggles’ last column models only the first check, which is why it catches the double free and nothing else.

## Hardware help

Software checks cost instructions on every access. The newest defences move the check into hardware.

**Memory tagging** gives every 16-byte granule of memory a small tag. On Arm’s Memory Tagging Extension the tag is 4 bits, and every pointer carries a 4-bit tag in its top byte; the processor compares the two on each access and can raise an exception on a mismatch :cite[linux-mte]. An allocator can give each block a random tag and re-tag it when it is freed, so overflows into a neighbour and uses after free are caught with high probability, not certainty: two random 4-bit tags match one time in sixteen.

**CHERI** goes further and replaces pointers with **capabilities**: a pointer that also carries the lower and upper bounds of the memory it may access, and permissions, in 128 bits plus a hidden tag bit that the hardware protects; a new capability can only ever be derived from an existing one with the same or narrower bounds :cite[watson2019]. Overflows become impossible by construction. Temporal safety, catching uses after free, needs more: CHERI systems revoke capabilities to freed memory by sweeping memory for them, which the CHERI team has implemented for userspace programs :cite[watson2019].

:::key
A detector stops a memory error when it happens instead of when its damage surfaces. **Guard pages** use the MMU for free checks but cost pages of memory. **Shadow memory** (Valgrind, AddressSanitizer) records which bytes may be touched; with **redzones** and a **quarantine** it catches overflows and uses after free, at a cost in speed and memory, and still misses accesses that jump into another valid block or arrive after the quarantine has moved on. **Hardened allocators** add cheap checks to production; **memory tagging** and **capabilities** move the checks into hardware.
:::

:::whofrees
Still the programmer. Every tool in this chapter finds mistakes in who frees what, and when; none of them changes who has to get it right. The next chapter changes that: it hands the decision to the language.
:::

## What’s next

Detecting errors is good; making them impossible to write is better. Chapter 17 is about **ownership**: the idea, from C++’s destructors to Rust’s borrow checker, that every object has exactly one owner, and that the compiler, not the programmer, inserts the `free`.
