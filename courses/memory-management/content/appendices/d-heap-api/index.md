---
title: The Heap API
summary: Everything your allocator and collector code can call, and the rules it must follow.
number: D
---

The course’s exercises are TypeScript modules that run in your browser against the simulator. This appendix is their reference: what each library module provides, the rules your code must follow, and what the checker looks for. Appendix B explains how the pieces are simulated.

Every exercise has the same shape. You edit a file called `solution.ts`, which exports what the exercise asks for (usually a function such as `createAllocator` or `collect`). The tests, which you can read below each exercise, import it and check it. Your code may import from the course’s library modules, which all start with `@mm/`, and from nothing else.

## `@mm/heap`: the heap

An allocator sees memory through one small interface. Addresses are plain numbers, counted in bytes.

```ts
interface Heap {
  load8(addr: number): number
  load32(addr: number): number
  load64(addr: number): number          // values up to 2^53 − 1
  store8(addr: number, value: number): void
  store32(addr: number, value: number): void
  store64(addr: number, value: number): void
  sbrk(bytes: number): number           // the old break, or -1 when memory is exhausted
  readonly pageSize: number             // 4096
}
```

- **Loads and stores must be aligned** to their size: a `load64` address must be a multiple of 8. They must also fall inside the heap, between its base and the current break. Anything else throws an error that names the address.
- **`sbrk(n)`** grows the heap by `n` bytes and returns the old break, the address where the new memory starts. A negative `n` shrinks it. It returns `-1` if the heap would grow past its capacity. The first call returns the heap’s base, which is 16-byte aligned. Do not rely on new memory being zero.
- **Every access is counted**, and on the lab bench priced by a cache model; each `sbrk` call costs 300 cycles, like a system call. Reading your own bookkeeping is not free.

An allocator implements this:

```ts
interface Allocator {
  malloc(size: number): number          // a 16-byte-aligned address, or 0 when out of memory
  free(ptr: number): void
  realloc?(ptr: number, size: number): number
  chunks?(): Iterable<{ addr: number; size: number; free: boolean; note?: string }>
  name?: string
}
type AllocatorFactory = (heap: Heap) => Allocator
```

Exercises ask for a factory, usually called `createAllocator`, which receives a fresh heap and returns the allocator. `chunks` is optional: if you provide it, the heap inspector draws your blocks, headers included, and labels them with `note`.

The module also exports the constants and helpers of chapter 10’s block layout: `WORD` (8), `ALIGN` (16), `MIN_BLOCK` (32), `align(n)` (round up to 16), `pack(size, alloc)` (a header word: the size plus 1 if allocated) and `blockSize(n)` (the block size for an `n`-byte request, with a header and a footer). It also exports `FlatHeap`, the heap the tests use, and `WordMemory`, the word-addressed memory of the Mote VM and the collector workbench.

### The storage rule

**An allocator’s bookkeeping must live in the heap it manages.** Outside the heap, your module may keep only scalar variables: numbers and booleans, such as the address of a free list’s head. No arrays, `Map`s, `Set`s, typed arrays or objects used as dictionaries.

The rule is what makes the exercises about allocation rather than about JavaScript: a free list kept in a JavaScript array would work, but it would hide the whole problem of storing a list in the memory it describes. When you run an exercise that has the rule, the checker reads your code too, and a red *storage rule* badge appears if it breaks it. The check reads your source rather than sandboxing it, so it can be fooled; its job is to catch honest mistakes.

## `@mm/check`: the heap checker

`runTrace(createAllocator, ops, options)` replays an allocation trace against your allocator on a fresh heap and returns a report. After every operation it checks that:

1. `malloc` returned a non-zero address (`null`);
2. the address is 16-byte aligned (`alignment`);
3. the block lies inside the heap (`bounds`);
4. the block overlaps no other live block (`overlap`);
5. every live block still holds the bytes the checker wrote into it, which catches an allocator that writes its bookkeeping into someone else’s block (`corrupted`);
6. `realloc` kept the old contents (`realloc-lost`);

and that nothing threw (`exception`). The first failure stops the run and is reported with the operation that caused it. The report also gives the **utilisation** (peak live bytes divided by peak heap size) and **cycles per operation**.

`performanceIndex(report)` combines them into chapter 14’s score out of 100: 60 per cent for utilisation and 40 per cent for speed, where speed is full marks at 60 cycles per operation or fewer and falls off in proportion above that. A run that fails scores 0.

## `@mm/trace`: allocation traces

A trace is a list of operations: `{ op: 'a', id, size }` allocates block `id`, `{ op: 'f', id }` frees it and `{ op: 'r', id, size }` reallocates it. `TRACE_BANK` holds the course’s seven traces (phases, compiler pass, request server, growing buffers, binary trees, random and adversary), each with a description and a note on where it comes from. `parseTrace(text)` reads the one-line-per-operation text form, as in `a 3 24`, `f 3` and `r 3 48`, and `peakLive(ops)` gives a trace’s peak live bytes.

## `@mm/bench`: the lab bench

`bench(createAllocator)` runs an allocator on every trace in the bank, each on a heap limited to four times the trace’s peak live data (and at least 16 KiB), with the cache model on, and returns one row per trace. `benchScore(rows)` is the mean of their indices: chapter 14’s headline number.

## `@mm/allocators`: the reference allocators

The course’s own allocators, written against the same API and following the same rules. You can import them to compare against, or to build on:

| export | what it is | chapter |
|---|---|---|
| `bump` | a bump allocator: `free` does nothing | 10 |
| `implicitList(fit, { coalesce })` | header-and-footer blocks on an implicit list, with first, next or best fit | 10, 11 |
| `segregated(classes, { order, fit })` | an explicit free list (one class) or segregated fits (several) | 11 |
| `sizeClasses` | size classes with LIFO free lists, like a thread cache | 12 |

## `@mm/gc`: the collector workbench

Collector exercises use `GcHeap`, a small heap of objects with the same layout as Mote’s, and nothing else around it:

```
object: [ header | aux | pointer fields… | int fields… ]       header = type × 16 + flags
```

| method | what it does |
|---|---|
| `addType(name, pointers, ints)` | declare an object type; returns its number |
| `alloc(type)` | allocate an object by bumping a pointer; 0 if the heap is full |
| `rootSlots()`, `rootObjects()` | the root slots (addresses), and the objects they point to |
| `pointerSlots(o)`, `children(o)` | the addresses of `o`’s pointer fields, and the non-null objects they point to |
| `get(slot)`, `set(slot, v)` | read or write a slot, in a root or in an object |
| `size(o)`, `typeOf(o)` | an object’s size in bytes, and its type |
| `isMarked(o)`, `setMarked(o, on)` | the mark bit (`MARK`) in the header |
| `flags(o)` | the header’s four flag bits: `MARK`, `FORWARDED`, `GREY` and a dead flag |
| `aux(o)`, `setAux(o, v)` | the second header word, free for a collector’s use: a forwarding address, a count |
| `objects()` | every object in the heap, in address order |
| `free(o)` | free an object: what a sweeper does |
| `reachable()` | the truth, for tests: the set of objects reachable from the roots |
| `GcHeap.random(n, seed)` | a random heap of `n` two-pointer objects, for tests |

Underneath are two `WordMemory`s, `mem` (the heap) and `roots`, each with `peek(addr)` and `poke(addr, v)` for uncounted access. The exercises say which methods count as work: `isMarked`, for instance, adds to the heap’s `visits` counter, so a collector that inspects the same object twice is caught doing it.

## The memory-manager interface

Behind the Mote settings (appendix E) is one interface. You will not implement it in an exercise, but the chapters’ figures are made from it, and reading `src/lib/mm/managers/managers.ts` is a good next step after the course. The VM calls the manager:

| hook | when |
|---|---|
| `alloc(type, words)` | for every `new`; returns the address of the new object, and may collect first |
| `onBorn(obj)` | once a new object’s header and fields are filled in |
| `free(obj)` | for every call to Mote’s `free` (manual setting) |
| `onStore(slot, old, value, holder, weak)` | for every pointer store into a field or a root: reference counts and write barriers live here |
| `onDiscard(value)` | when a pointer is dropped from the operand stack (reference counting’s temporaries) |
| `onFrameExit(frame)` | when a function returns: reference counting releases its locals. (Under the ownership setting, the VM itself drops what a local owns when it goes out of scope.) |
| `onStatement()`, `onSafepoint()` | at each statement and each safepoint: where deferred frees happen and incremental collectors do a slice of work |
| `collect(reason)` | for `gc()`, and when the heap is full |
| `access(obj, addr, write)` | for every load or store through a pointer: chapter 16’s detectors check it here |

A manager finds the roots by walking the VM’s simulated stack with the compiler’s **stack maps**, which say, at each safepoint, which slots hold pointers (chapter 24). The conservative setting ignores them and treats every word on the stack that looks like a heap address as a pointer.

## The other modules

| module | what it provides | chapters |
|---|---|---|
| `@mm/test` | `test(name, fn)` and `expect(value)` with the usual matchers (`toBe`, `toEqual`, `toBeLessThan`, `toThrow`, …) | all |
| `@mm/sv39` | `PhysicalMemory`, `PAGE_SIZE`, `PTE` flag values, `splitVa`, `encodePte`, `decodePte`, `walk` | 3, 4 |
| `@mm/cache` | `Cache` and `Hierarchy`, set-associative LRU caches | 2 |
| `@mm/kernel` | the toy `Kernel`, `BuddyAllocator`, `COW` and the copy-on-write fault interface | 5, 9 |
| `@mm/replace` | `simulate(references, frames, policy)` and `faults(steps)`, page replacement on reference strings | 6 |
| `@mm/explore` | the tricolour model, its barriers and the interleaving explorer | 25 |
