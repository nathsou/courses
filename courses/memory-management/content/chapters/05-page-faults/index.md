---
title: Page faults
summary: Memory that is not there until you touch it. Demand paging, copy-on-write and fork.
number: 5
duration: 60 minutes
prerequisites: [virtual-memory]
---

Ask a modern operating system for a gigabyte of memory and it will say yes immediately, even on a machine with half a gigabyte free. Then nothing happens. No memory is set aside, no page table is filled in. The kernel has made a promise, and it intends to keep it one page at a time, if and when the program actually touches each page.

The mechanism behind that promise is the page fault. Chapter 3 introduced it as a trap the hardware raises when a translation fails; this chapter shows how the kernel uses that trap to do three remarkable things: hand out memory lazily, copy a whole process in an instant with `fork`, and share pages between programs until the moment one of them writes.

## Demand paging

When a program asks for memory (with `brk` to grow its heap, or `mmap` for a fresh region, both in chapter 7), the kernel records the new region in its list of the program’s areas: start, end, permissions, what should be in it. It does not touch the page tables. Every page in the new region is unmapped.

The first time the program touches one of those pages, the MMU finds an invalid entry and raises a page fault. The kernel’s fault handler then:

1. looks up the faulting address in the program’s list of areas. If it is not in any area, or the access breaks the area’s permissions, the program gets a segmentation fault;
2. otherwise allocates a free frame and fills it: with zeros for fresh memory (a **demand-zero** page), or with the right part of a file for a file mapping;
3. writes a page-table entry mapping the page to the frame;
4. returns to the program, which re-executes the faulting instruction. This time the translation succeeds.

The program cannot tell this happened, except that the instruction took a few thousand times longer than usual. This is **demand paging**. It means a program pays, in time and in memory, only for the pages it touches. A program that reserves a large array and uses a corner of it costs a corner’s worth of memory.

:::key
Zeroing matters. A frame handed to one program might last have held another program’s passwords. The kernel must never map a frame without first overwriting it, either with zeros or with file contents.
:::

## fork and copy-on-write

Unix creates processes with `fork`: the new process (the *child*) starts as an exact copy of the old one (the *parent*), with the same memory contents at the same addresses. Copying every page would make `fork` take as long as copying the whole program, and it is usually wasted, because the child often calls `exec` straight away and throws its copy out.

Instead, `fork` copies only the page tables. Parent and child then map the same frames. To keep them from seeing each other’s writes, the kernel marks every writable page **read-only** in both page tables and remembers, in a spare bit of the entry, that the page is **copy-on-write** (COW). Reads go ahead at full speed. The first write to such a page, by either process, faults. The handler sees the copy-on-write mark, allocates a fresh frame, copies the shared page into it, maps the copy writable for the writer, and returns. The other process keeps the original. If the other process has already made its own copy, or exited, so that the writer is the frame’s last user, there is nothing to protect: the handler simply makes the page writable again.

To know which case it is in, the kernel keeps a **reference count** for every frame: the number of page-table entries that map it. This is the first appearance in this course of an idea that will come back in Part V: count the pointers, and when the count reaches one, or zero, you know something.

Play with the figure. Touch the parent’s pages first (demand paging), then fork, then write from each side.

::fork-theatre

:::question
After `fork`, the parent writes to heap page 0 and then the child writes to it too. How many copies are made?
:::

:::details[Answer]
One. The parent’s write copies the shared frame (the frame had two mappings). That leaves the original frame with only the child’s mapping, so the child’s write finds a reference count of 1 and just makes the page writable: no copy. The last sharer inherits the original.
:::

## Build it: the copy-on-write fault

Write the heart of the handler. The kernel has already checked that the fault is a write to a page of a writable area whose entry is marked copy-on-write; it calls your function with the faulting entry and a few operations.

```build
id: page-faults/cow
title: Handle a copy-on-write fault
prompt: |
  Implement `onCowFault(f)`. `f.pte` is the faulting page’s entry (`{ ppn, flags }`); `f.refs(frame)` is how many entries map a frame; `f.allocFrame()` returns a fresh frame (with one reference); `f.copyFrame(from, to)` copies a page; `f.release(frame)` drops one reference to a frame; `f.setPte(ppn, flags)` installs the new entry. Flags are bit masks: `PTE.W` (writable), `PTE.D` (dirty), `PTE.A` (accessed) and `COW`. The new entry must be writable, dirty and accessed, and no longer copy-on-write. Copy only when you must.
starter: |
  import { COW, PTE, type CowFault } from '@mm/kernel';

  export function onCowFault(f: CowFault): void {
    // Always copy: correct, but wasteful.
    const fresh = f.allocFrame();
    f.copyFrame(f.pte.ppn, fresh);
    f.setPte(fresh, f.pte.flags | PTE.W);
  }
solution: |
  import { COW, PTE, type CowFault } from '@mm/kernel';

  export function onCowFault(f: CowFault): void {
    const flags = (f.pte.flags & ~COW) | PTE.W | PTE.D | PTE.A;
    if (f.refs(f.pte.ppn) === 1) {
      // The last sharer: take the frame over, no copy.
      f.setPte(f.pte.ppn, flags);
      return;
    }
    const fresh = f.allocFrame();
    f.copyFrame(f.pte.ppn, fresh);
    f.release(f.pte.ppn);
    f.setPte(fresh, flags);
  }
tests: |
  import { test, expect } from '@mm/test';
  import { Kernel, COW } from '@mm/kernel';
  import { PTE } from '@mm/sv39';
  import { onCowFault } from './solution';

  function scene() {
    const k = new Kernel(128);
    k.cowHandler = onCowFault;
    const p = k.spawn();
    k.standardLayout(p);
    const heap = k.sbrk(p, 2 * 4096);
    k.machine.store64(heap, 7);
    k.machine.store64(heap + 4096, 8);
    const c = k.fork(p);
    return { k, p, c, heap };
  }
  test('a write after fork gives the writer a private copy', () => {
    const { k, p, c, heap } = scene();
    k.as(c, () => k.machine.store64(heap, 99));
    expect(k.as(c, () => k.machine.load64(heap))).toBe(99);
    expect(k.machine.load64(heap)).toBe(7);
    expect(c.pt.get(heap)!.ppn).not.toBe(p.pt.get(heap)!.ppn);
  });
  test('the new entry is writable and no longer copy-on-write', () => {
    const { k, c, heap } = scene();
    k.as(c, () => k.machine.store64(heap, 1));
    const e = c.pt.get(heap)!;
    expect(e.flags & PTE.W).toBe(PTE.W);
    expect(e.flags & COW).toBe(0);
  });
  test('reference counts stay exact', () => {
    const { k, p, c, heap } = scene();
    const shared = p.pt.get(heap)!.ppn;
    expect(k.refs.get(shared)).toBe(2);
    k.as(c, () => k.machine.store64(heap, 1));
    expect(k.refs.get(shared)).toBe(1);
    expect(k.refs.get(c.pt.get(heap)!.ppn)).toBe(1);
  });
  test('the last sharer does not copy', () => {
    const { k, p, c, heap } = scene();
    k.as(c, () => k.machine.store64(heap, 1));
    const before = k.frames.freeFrames();
    const frame = p.pt.get(heap)!.ppn;
    k.machine.store64(heap, 2);
    expect(p.pt.get(heap)!.ppn).toBe(frame);
    expect(k.frames.freeFrames()).toBe(before);
  });
  test('after the child exits, the parent reuses every page in place', () => {
    const { k, p, c, heap } = scene();
    k.exit(c);
    const before = k.frames.freeFrames();
    k.machine.store64(heap, 5);
    k.machine.store64(heap + 4096, 6);
    expect(k.frames.freeFrames()).toBe(before);
    expect(k.machine.load64(heap + 4096)).toBe(6);
  });
hints:
  - "Clear the copy-on-write bit with `flags & ~COW` and add `PTE.W | PTE.D | PTE.A`."
  - If `f.refs(f.pte.ppn)` is 1, nobody else maps the frame.
  - When you copy, the old frame loses this mapping: release it.
```

## When sharing goes wrong

Copy-on-write rests on an assumption: that pages shared after `fork` are mostly *read*. Servers lean on it heavily. A common design starts one parent process, loads the application’s code and data into it, and then forks a few dozen workers. The workers share the parent’s memory, so a server with fifty workers costs little more than one, as long as the workers do not write to the shared pages.

The assumption can fail without anyone writing a line of code that looks like a write.

::museum{exhibit="instagram-2017"}

The lesson reaches across layers. A decision made in a language runtime (where to keep bookkeeping bits) interacted with a decision made in the kernel (share pages until written) to waste gigabytes. Ruby’s runtime made a similar change for the same reason, moving its garbage collector’s mark bits out of the objects and into separate bitmaps in version 2.0, so that marking would not write to shared pages. We will meet mark bits again in chapter 21.

## Promises the kernel cannot keep

Demand paging lets the kernel promise more memory than it has. Linux does this by default: it estimates whether a request is reasonable and, unless it is absurd, says yes. This **overcommit** works because most programs never touch most of what they reserve.

When the bet fails, and programs between them touch more pages than there are frames, the kernel has two ways out. It can move some pages out of memory to disk, to be brought back by a page fault when needed: that is the subject of the next chapter. Or, when even that is not possible, it can pick a process and kill it to free its memory. Linux’s **OOM killer** (OOM for *out of memory*) chooses its victim by a score that favours large processes. The program that dies is not necessarily the one that asked for too much; it is the one the kernel decided it could most afford to lose. For a program, this is the strangest consequence of demand paging: an allocation can succeed, and the program can still be killed, much later, for touching what it was given.

:::programmer
`malloc` returning a non-null pointer does not mean the memory exists. On Linux with default settings it means the kernel did not think the request was absurd. The memory appears, page by page, when you write to it.
:::

:::hood
The toy kernel’s fault handler is in `src/lib/mm/kernel/kernel.ts`, and it is short: find the area, check permissions, then either map a fresh zeroed frame, fill a frame from a file, or resolve copy-on-write with the frame’s reference count. Its reference counts are kept in a JavaScript map rather than in simulated memory, which is one of the places where the simulator is simpler than a real kernel (appendix B).
:::

:::whofrees
The kernel frees a frame when its reference count, the number of page-table entries that map it, drops to zero: when the last sharer writes its own copy, unmaps the page, or exits. This is reference counting, applied to frames. It works perfectly here because page tables never point at each other in cycles. Chapter 19 shows what happens when objects do.
:::

## What’s next

Overcommit makes it possible to run out of frames. The next chapter is about what the kernel does then: choosing which page to evict to disk, and why the best choice requires knowing the future.
