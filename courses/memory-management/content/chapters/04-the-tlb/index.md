---
title: The TLB
summary: A tiny cache of translations, how far it reaches, and what Meltdown cost it.
number: 4
duration: 45 minutes
prerequisites: [virtual-memory, the-memory-hierarchy]
---

Chapter 3 left us with an uncomfortable bill. Every load and store a program makes needs its address translated, and translating means walking three levels of page tables: three extra memory reads before the one the program asked for. If that happened every time, virtual memory would make every program several times slower, and nobody would use it.

Nobody pays that bill, because of a small piece of hardware with an unlovely name: the **translation lookaside buffer**, or TLB. It is a cache, like those of chapter 2, but what it caches is translations: “virtual page 0x14 of this program is in frame 0x43, readable and writable”. A hit costs nothing extra. A miss costs a page walk.

This chapter measures how far a TLB reaches, shows how to stretch it with bigger pages, and explains why switching between programs used to empty it, and why, after 2018, some operating systems went back to emptying it far more often.

## A cache of translations

A TLB entry holds a virtual page number, the frame it maps to, and the permission bits of the leaf entry. On every memory access the hardware compares the address’s page number with the entries, all at once. On a hit, the physical address is ready in a cycle or so, and the permissions are checked from the entry. On a miss, the hardware walks the page tables (on RISC-V, x86 and Arm the walk is done by hardware; some older architectures trapped to software instead), puts the result in the TLB, evicting some other entry, and carries on.

TLBs are small, because they are searched on every access and must be very fast. A core typically has a first-level TLB of a few dozen entries and a second-level one of somewhere between several hundred and a couple of thousand. The simulator’s default has 64 entries; the figure below has 8, so that you can see each one.

:::programmer
A TLB is a memoisation table for `translate(va)`, with a fixed number of slots and LRU eviction. Like every cache, it works only as well as the access pattern lets it.
:::

## Reach

The question to ask of any TLB is: how much memory can a program touch before it starts missing? Each entry maps one page, so the answer is the number of entries times the page size. This is the TLB’s **reach**.

```numeric
id: the-tlb/reach
title: Reach
prompt: A TLB has 64 entries, and every page is 4 KiB. How many KiB of memory can a program sweep through repeatedly without a single TLB miss after the first pass?
answer: 256
unit: KiB
explain: 64 × 4 KiB = 256 KiB. That is less than a typical L2 cache, so a program whose working set fits in L2 can still miss in the TLB.
```

A working set bigger than the reach does not just miss a little more. A program that sweeps over its data in order, one page after another, evicts the least recently used entry just before it would have been needed again. Every page misses on every pass. Least-recently-used replacement, which is so good for most access patterns, is at its worst for a loop slightly too big for the cache. You will meet this pattern again in chapter 6, with pages and disks instead of entries and walks.

Predict before you run each configuration in the figure: what fraction of loads will miss?

::reach-game

## Stretching the reach with superpages

Chapter 3 mentioned that an Sv39 leaf entry can sit at level 1 and map a whole 2 MiB **megapage**, or at level 2 and map a 1 GiB **gigapage**. One TLB entry then covers 512 or 262,144 times as much memory. Tick the megapage box in the figure: eight entries now reach 16 MiB.

Large pages have costs. Memory is handed out in 2 MiB pieces, so a program that needs 3 MiB gets 4; finding 2 MiB of *physically contiguous* free memory gets harder as memory fragments (the kernel’s buddy allocator, chapter 9, exists partly to keep large blocks available); and copy-on-write (chapter 5) must copy 2 MiB instead of 4 KiB when a page is written. Linux offers both explicit huge pages, which a program asks for, and *transparent huge pages*, where the kernel promotes ordinary pages to huge ones in the background when it can. Databases and virtual machines, with large working sets and long lives, are the usual beneficiaries.

## Whose translation is it?

There is a problem we have been ignoring. Two programs can both use virtual page 0x14, mapped to different frames. If program A’s translation is in the TLB when the system switches to program B, B would use A’s frame. That cannot be allowed.

The blunt fix is to flush the TLB on every switch. Then each program starts with an empty TLB and pays a burst of misses every time it is scheduled. The better fix is to tag each entry with an **address-space identifier** (ASID): a small number, held in the same `satp` register as the root table, that names the current address space. A lookup matches only entries with the current ASID, so entries of several programs can live in the TLB side by side, and a switch costs nothing. RISC-V’s `satp` has room for an ASID of up to 16 bits :cite[riscvpriv]; x86 calls the same idea a *process-context identifier* (PCID).

Some pages are the same in every address space: classically, the kernel’s. Their entries carry the **global** bit (G) and match every ASID.

When the kernel changes a mapping, any TLB that cached the old one must be told. On RISC-V the instruction `sfence.vma` does this, for one address, one ASID or everything. On a machine with many cores, each core has its own TLB, so a kernel that unmaps a page used by a multi-threaded program must interrupt the other cores and ask them to flush too: a **TLB shootdown**. Shootdowns are one of the hidden costs of `munmap` and of moving pages around, and kernels go to some lengths to batch them.

::asid-switch

## Build it: a TLB with address-space identifiers

```build
id: the-tlb/tlb
title: A tagged TLB
prompt: |
  Implement a small fully associative TLB for 4 KiB pages: `lookup(vpn, asid)` returns the cached frame number or `-1`; `insert(vpn, asid, ppn, global)` adds an entry, evicting the least recently used one when full; `flush(asid)` removes every non-global entry of that address space. Global entries match any ASID. You may use a JavaScript array here: this is hardware, not an allocator.
starter: |
  export class Tlb {
    entries: { vpn: number; asid: number; ppn: number; global: boolean }[] = [];
    constructor(public capacity: number) {}

    lookup(vpn: number, asid: number): number {
      const e = this.entries.find((e) => e.vpn === vpn);
      return e ? e.ppn : -1;
    }

    insert(vpn: number, asid: number, ppn: number, global = false): void {
      this.entries.push({ vpn, asid, ppn, global });
    }

    flush(asid: number): void {
      this.entries = [];
    }
  }
solution: |
  export class Tlb {
    entries: { vpn: number; asid: number; ppn: number; global: boolean; used: number }[] = [];
    private clock = 0;
    constructor(public capacity: number) {}

    lookup(vpn: number, asid: number): number {
      const e = this.entries.find((e) => e.vpn === vpn && (e.global || e.asid === asid));
      if (!e) return -1;
      e.used = ++this.clock;
      return e.ppn;
    }

    insert(vpn: number, asid: number, ppn: number, global = false): void {
      if (this.entries.length >= this.capacity) {
        let victim = 0;
        for (let i = 1; i < this.entries.length; i++) if (this.entries[i].used < this.entries[victim].used) victim = i;
        this.entries.splice(victim, 1);
      }
      this.entries.push({ vpn, asid, ppn, global, used: ++this.clock });
    }

    flush(asid: number): void {
      this.entries = this.entries.filter((e) => e.global || e.asid !== asid);
    }
  }
tests: |
  import { test, expect } from '@mm/test';
  import { Tlb } from './solution';
  test('a hit returns the frame', () => {
    const t = new Tlb(4);
    t.insert(0x14, 1, 0x43);
    expect(t.lookup(0x14, 1)).toBe(0x43);
    expect(t.lookup(0x15, 1)).toBe(-1);
  });
  test('another address space does not see the entry', () => {
    const t = new Tlb(4);
    t.insert(0x14, 1, 0x43);
    expect(t.lookup(0x14, 2)).toBe(-1);
  });
  test('global entries match every address space', () => {
    const t = new Tlb(4);
    t.insert(0x99, 1, 0x7, true);
    expect(t.lookup(0x99, 5)).toBe(0x7);
  });
  test('the least recently used entry is evicted', () => {
    const t = new Tlb(2);
    t.insert(1, 1, 10);
    t.insert(2, 1, 20);
    t.lookup(1, 1);
    t.insert(3, 1, 30);
    expect(t.lookup(2, 1)).toBe(-1);
    expect(t.lookup(1, 1)).toBe(10);
    expect(t.lookup(3, 1)).toBe(30);
  });
  test('flush removes one address space and keeps global entries', () => {
    const t = new Tlb(8);
    t.insert(1, 1, 10);
    t.insert(2, 2, 20);
    t.insert(3, 1, 30, true);
    t.flush(1);
    expect(t.lookup(1, 1)).toBe(-1);
    expect(t.lookup(2, 2)).toBe(20);
    expect(t.lookup(3, 1)).toBe(30);
  });
  test('it never holds more than its capacity', () => {
    const t = new Tlb(3);
    for (let i = 0; i < 10; i++) t.insert(i, 1, i);
    expect(t.entries.length).toBe(3);
  });
hints:
  - A match needs the same VPN and either the same ASID or the global bit.
  - Give each entry a "last used" counter; on insert into a full TLB, remove the entry with the smallest one.
```

## Meltdown and the price of isolation

For decades, operating systems on x86 kept the kernel mapped in the upper part of every program’s address space, marked as supervisor-only (U = 0) and global. A system call then needed no change of page tables and no TLB flush: the kernel’s translations were already there. The U bit made those pages inaccessible to the program, and that was supposed to be enough.

::museum{exhibit="meltdown-2018"}

The fix, **kernel page-table isolation** (KPTI), gives each program two sets of page tables: one, used while the program runs, in which almost all of the kernel is simply absent; and a full one, used inside the kernel. Every system call and every interrupt now switches `satp` (on x86, the `CR3` register) twice. Without tagged TLB entries, each switch would flush the TLB, and the cost for system-call-heavy workloads was large. With PCIDs, the two sets of tables get different identifiers, their entries survive the switches, and most of the cost goes away. Turn the time slice down to 5 loads in the figure above to see why short, frequent switches are the expensive case.

:::key
The TLB makes virtual memory cheap by remembering translations. Its reach (entries × page size) decides when a program starts paying for page walks; superpages extend it; address-space identifiers let it survive switches between programs. Every security boundary that changes page tables (system calls under KPTI, virtual machines, sandboxes) is also a TLB problem.
:::

:::whofrees
TLB entries are never freed, only evicted (when the TLB is full) or flushed (when the mapping they cache changes). A stale entry that survives a change of mapping is a security bug: the kernel must flush before it reuses the frame the old mapping pointed to.
:::

## What’s next

We have been assuming that every page a program uses is already mapped. Usually it is not: most pages are mapped lazily, the first time they are touched, and some are shared between programs until one of them writes. The next chapter is about page faults, the mechanism that makes all of this work.
