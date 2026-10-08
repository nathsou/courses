---
title: Virtual memory
summary: Every address is a lie. RISC-V’s Sv39 page tables, walked one level at a time.
number: 3
duration: 70 minutes
prerequisites: [bytes-and-addresses]
---

Run the same program twice, side by side, and print the address of one of its variables in each copy. On a modern system you may well see the same number twice. Both copies store different values at that address, and neither disturbs the other. Two different things live at one address.

That is only possible because the address is not a position in DRAM. It is a **virtual address**, a number that means something only inside one program, and every time the program uses it the hardware translates it into a **physical address**, a real position in memory. The translation is different for every program. This chapter builds it.

## Why lie?

Imagine a machine without translation, where every program uses physical addresses directly. Four problems arrive almost at once.

**Isolation.** Any program can read or overwrite any other program’s memory, or the operating system’s. One bug, or one malicious program, takes everything down.

**Relocation.** A program compiled to expect its data at address 0x10000 can only run if that memory is free. Two such programs cannot run at once.

**Fragmentation.** A program that needs 100 MiB needs 100 MiB of *contiguous* free memory, even if there are 500 MiB free in small pieces.

**Size.** A program cannot use more memory than the machine has, even if most of what it asks for sits untouched.

Translation fixes all four. Each program gets its own **address space**, a private range of virtual addresses starting from zero. The operating system decides, piece by piece, which physical memory backs which virtual addresses. Programs cannot name each other’s memory at all, because their addresses go through different translations. And the backing memory need not be contiguous, need not exist yet, and need not even be in DRAM (chapter 5).

## How we got here, briefly

The first machine to translate every address in hardware was the Atlas, built at the University of Manchester and first running in 1962. Its designers, led by Tom Kilburn, called the idea a **one-level store**: the programmer saw one large memory, while the machine shuffled 512-word pages between a small fast core memory and a large slow magnetic drum, automatically, behind the program’s back :cite[kilburn1962]. The program never knew which pages were where.

Simpler schemes came before and alongside it. With **base and bounds**, every address is added to a base register and checked against a limit: cheap, and it gives isolation and relocation, but each program still needs one contiguous block. **Segmentation** gives each program several such blocks (code, data, stack), each with its own base and limit. Multics combined segments with pages in the late 1960s; x86 processors still carry the remains of segmentation. But it is the Atlas idea, fixed-size pages and a table per program, that every mainstream processor uses today.

## Pages and page tables

Divide virtual memory into fixed-size **pages** and physical memory into **frames** of the same size: 4 KiB (4096 bytes, 2¹² bytes) on RISC-V and almost everywhere else. A virtual address then splits into two parts: the **virtual page number** (which page) and the **offset** (which byte inside it). Translation replaces the page number with a **physical page number** (which frame) and keeps the offset unchanged.

The mapping from page numbers to frame numbers is the **page table**. The obvious design is one array indexed by virtual page number. Do the arithmetic for RISC-V’s Sv39 scheme: 39-bit virtual addresses, 4 KiB pages, so 2²⁷ pages, eight bytes per entry. That is a gigabyte of page table, per program, almost all of it empty, because a typical program uses a few regions at the bottom of its address space and a stack near the top.

So the table is a tree. Sv39 splits the 27-bit page number into three 9-bit indices. The first selects one of 512 entries in a top-level table; that entry points to a second-level table; nine more bits select an entry there, which points to a third-level table; the last nine bits select the entry that finally names the frame. Each table is 512 entries of eight bytes: exactly one 4 KiB page. A program that uses three small regions needs only a handful of tables, and the parts of the tree with nothing in them are simply absent.

:::programmer
A multi-level page table is a **trie** keyed by the bits of the address, nine bits per level. Absent subtrees cost nothing. Every walk from the root to a leaf is three pointer-chasing loads.
:::

## Sv39 in detail

RISC-V’s privileged specification defines several schemes; Sv39 is the one most RISC-V systems running Linux use, and the one this course simulates :cite[riscvpriv].

A virtual address has 39 meaningful bits. The other 25 bits of a 64-bit register must all be copies of bit 38, which splits the address space into a lower half (user programs, here) and an upper half (traditionally, the kernel). That still leaves 256 GiB for a user program.

```text
 virtual address:   | VPN[2] (9) | VPN[1] (9) | VPN[0] (9) |  offset (12)  |
                     bits 38–30   bits 29–21   bits 20–12    bits 11–0

 page-table entry:  | reserved (10) |      PPN (44)      | RSW (2) | D A G U X W R V |
```

The low ten bits of an entry are flags:

| Bit | Name | Meaning |
|---|---|---|
| 0 | V | Valid. If 0, the entry means nothing and any use of it is a page fault. |
| 1–3 | R, W, X | The page may be read, written, executed. If all three are 0, the entry points to the next table instead of a page. |
| 4 | U | User code may access the page. Kernel pages have U = 0. |
| 5 | G | Global: mapped in every address space (chapter 4). |
| 6 | A | Accessed: the page has been read or written since the bit was last cleared. |
| 7 | D | Dirty: the page has been written. |
| 8–9 | RSW | Reserved for software: the kernel can use them as it likes. Ours marks copy-on-write pages with bit 8 (chapter 5). |

Which tree to walk? A special register, `satp`, holds the physical page number of the current program’s root table, along with the mode (8 means Sv39) and an address-space identifier we will need in chapter 4. Switching programs means writing a different value into `satp`.

The walk itself, in the specification’s own order:

1. Start at the root table named by `satp`. Let *i* = 2.
2. Read the entry at index VPN[*i*] of the current table.
3. If V = 0, or if W = 1 while R = 0 (a reserved combination), raise a **page fault**.
4. If R and X are both 0, the entry points to the next table: move to it, decrease *i*, and repeat from step 2 (if *i* falls below 0, fault).
5. Otherwise this entry is a **leaf**. Check its permissions against the access: a load needs R, a store needs W, an instruction fetch needs X, and user code needs U. If the check fails, page fault.
6. The physical address is the leaf’s PPN followed by the offset. (If the leaf was found at level 1 or 2, it maps a whole 2 MiB or 1 GiB **superpage**, and the lower VPN bits pass straight through into the physical address.)

The A and D bits need setting along the way. The specification lets an implementation either set them in hardware or raise a page fault and let the kernel do it. The simulator does the first by default, and chapter 6 uses the second.

## Be the MMU

The address space in this figure is small and hand-made: two pages of code, one of data, two of heap, one of stack, one kernel page and a 2 MiB megapage. Each puzzle gives you a virtual address and an access. Walk the tables. Three right in a row and the exercise counts as done.

::be-the-mmu

If you found yourself reading the binary digits nine at a time, that is exactly what the hardware does, and why the numbers are powers of two: 512 entries of 8 bytes in a 4096-byte table. Everything lines up.

:::question
The walk needs three memory reads before the read the program actually asked for. Does that make every load four times slower?
:::

:::details[Answer]
It would, without the TLB, the small cache of recent translations that chapter 4 is about. Most loads find their translation there and do no walk at all. When a walk is needed, its three reads usually hit in the data caches, because page tables are small and heavily reused.
:::

Before moving on, press *Flip one bit* and translate a heap address again. One flipped bit in one page-table entry, and the heap page now *is* a page table, the very one that contains the entry. A program that can write to its own page table can point entries at any frame in the machine, including the kernel’s. That is what Rowhammer’s most famous exploit achieved, without any software bug at all.

## What a page fault is for

A page fault is not an error. It is a **trap**: the processor stops the program at the faulting instruction, records why (the cause, 12, 13 or 15 for instruction, load and store faults) and which address, and jumps into the kernel. The kernel looks at its own records of what *should* be at that address and decides:

- The address is in a region the program asked for, but no frame has been assigned yet. Assign one, fill in the entry, and return to the program, which retries the instruction as if nothing happened. This is **demand paging**, and chapter 5 is about it.
- The page is in a region shared copy-on-write. Copy it, then retry (also chapter 5).
- The page was moved to disk to make room. Bring it back, then retry (chapter 6).
- The address is not in any region the program has, or the access breaks the region’s rules. The program has a bug: the kernel sends it a **segmentation fault**, which usually ends it.

So the page table is not the kernel’s whole record of a program’s memory. It is a cache of the parts the hardware needs right now. The kernel’s real record is a list of *regions* (chapter 7), and page faults are how the hardware asks the kernel to fill in what is missing.

## Build it: the page walk

Now write the walk. You get the simulated physical memory, the root table’s frame number (what `satp` holds), a virtual address and an access type. Return the physical address, or `-1` for a page fault. You do not need to set A or D bits, and the access always comes from user mode.

```build
id: virtual-memory/walk
title: Walk the page tables
prompt: |
  Implement `translate(mem, rootPpn, va, access)`. Read entries with `mem.load64(address)`; decode them with `decodePte(raw)`, which returns `{ ppn, flags }`; test flags with `has(flags, 'V')` and so on; `splitVa(va)` gives `{ vpn: [vpn0, vpn1, vpn2], offset }`. Remember superpages. The starter handles only a perfect three-level walk and checks nothing.
starter: |
  import { PhysicalMemory, decodePte, splitVa, has, PAGE_SIZE, type Access } from '@mm/sv39';

  export function translate(mem: PhysicalMemory, rootPpn: number, va: number, access: Access): number {
    const { vpn, offset } = splitVa(va);
    let table = rootPpn;
    for (let level = 2; level > 0; level--) {
      const pte = decodePte(mem.load64(table * PAGE_SIZE + vpn[level] * 8));
      table = pte.ppn;
    }
    const leaf = decodePte(mem.load64(table * PAGE_SIZE + vpn[0] * 8));
    return leaf.ppn * PAGE_SIZE + offset;
  }
solution: |
  import { PhysicalMemory, decodePte, splitVa, has, PAGE_SIZE, type Access } from '@mm/sv39';

  export function translate(mem: PhysicalMemory, rootPpn: number, va: number, access: Access): number {
    const { vpn, offset, canonical } = splitVa(va);
    if (!canonical) return -1;
    let table = rootPpn;
    for (let level = 2; level >= 0; level--) {
      const pte = decodePte(mem.load64(table * PAGE_SIZE + vpn[level] * 8));
      const f = pte.flags;
      if (!has(f, 'V') || (has(f, 'W') && !has(f, 'R'))) return -1;
      if (!has(f, 'R') && !has(f, 'X')) {
        table = pte.ppn; // a pointer to the next level
        continue;
      }
      // A leaf: check permissions (user mode).
      if (!has(f, 'U')) return -1;
      if (access === 'r' && !has(f, 'R')) return -1;
      if (access === 'w' && !has(f, 'W')) return -1;
      if (access === 'x' && !has(f, 'X')) return -1;
      // A superpage: the low PPN bits must be zero, and the low VPN bits pass through.
      const span = 512 ** level;
      if (pte.ppn % span !== 0) return -1;
      const page = Math.floor(va / PAGE_SIZE) % span;
      return (pte.ppn + page) * PAGE_SIZE + offset;
    }
    return -1;
  }
tests: |
  import { test, expect } from '@mm/test';
  import { PhysicalMemory, PageTableBuilder, PTE, walk } from '@mm/sv39';
  import { translate } from './solution';

  function space() {
    const mem = new PhysicalMemory(8192);
    let next = 2;
    const pt = new PageTableBuilder(mem, 1, () => next++);
    const U = PTE.U | PTE.A | PTE.D;
    pt.map(0x10000, 0x40, PTE.R | PTE.X | U);
    pt.map(0x12000, 0x45, PTE.R | PTE.W | U);
    pt.map(0x3fffffe000, 0x60, PTE.R | PTE.W | U);
    pt.map(0x200000, 0x70, PTE.R | PTE.W | PTE.A | PTE.D);
    pt.map(0x40000000, 0x400, PTE.R | U, 1);
    pt.map(0x80000000, 0x401, PTE.R | U, 1);
    return mem;
  }
  const ref = (mem: PhysicalMemory, va: number, a: 'r' | 'w' | 'x') => {
    const r = walk(mem, 1, va, { access: a, user: true, update: false });
    return r.ok ? r.pa : -1;
  };
  test('an ordinary load', () => {
    expect(translate(space(), 1, 0x12018, 'r')).toBe(0x45 * 4096 + 0x18);
  });
  test('a store to read-only code faults', () => {
    expect(translate(space(), 1, 0x10008, 'w')).toBe(-1);
  });
  test('an unmapped page faults (at any level)', () => {
    const m = space();
    expect(translate(m, 1, 0x13000, 'r')).toBe(-1);
    expect(translate(m, 1, 0x1000000000, 'r')).toBe(-1);
  });
  test('user code cannot touch a kernel page', () => {
    expect(translate(space(), 1, 0x200010, 'r')).toBe(-1);
  });
  test('a megapage passes the low bits through', () => {
    expect(translate(space(), 1, 0x40123456, 'r')).toBe(0x400 * 4096 + 0x123456);
  });
  test('a misaligned megapage faults', () => {
    expect(translate(space(), 1, 0x80000010, 'r')).toBe(-1);
  });
  test('agrees with the simulator on 2,000 random accesses', () => {
    const m = space();
    const bases = [0x10000, 0x12000, 0x3fffffe000, 0x200000, 0x40000000, 0x13000, 0x40100000];
    let seed = 7;
    const rnd = (n: number) => ((seed = (seed * 1103515245 + 12345) % 2147483648), seed % n);
    for (let i = 0; i < 2000; i++) {
      const va = bases[rnd(bases.length)] + rnd(4096) * 8 % 4096;
      const a = (['r', 'w', 'x'] as const)[rnd(3)];
      expect(translate(m, 1, va, a)).toBe(ref(m, va, a));
    }
  });
hints:
  - Loop over the levels from 2 down to 0; at each level read entry `vpn[level]` of the current table.
  - An entry with R = 0 and X = 0 points to the next table. Anything else is a leaf, at whatever level you are.
  - "At level 1 a leaf maps 512 pages: the physical page is `pte.ppn + (page number mod 512)`."
explain: |
  This is the same algorithm as the simulator’s `walk` in `src/lib/mm/machine/sv39.ts`, which follows the privileged specification step by step. Real MMUs do it in hardware, in a few cycles per level when the tables are in the cache.
```

:::hood
The course’s page tables are not a JavaScript data structure: they are 64-bit entries in a byte array that plays the part of physical memory, at addresses computed exactly as above. The figure’s tables, the kernel of chapter 5 and the program in chapter 0 all use the same memory and the same walker, so a bit flipped by the figure really does change what the next walk finds.
:::

## Bigger address spaces

39 bits is 512 GiB of virtual address space. Servers with terabytes of memory want more, so RISC-V also defines Sv48 and Sv57, which add a fourth and a fifth level of 9 bits each :cite[riscvpriv]. x86-64 made the same choice: four levels and 48-bit addresses for most of its life, with a five-level extension for the largest machines. Each extra level is one more memory read on every walk, which is part of why the TLB matters so much.

:::whofrees
The kernel frees page tables when the address space they belong to goes away, and frees a data frame when the last page-table entry mapping it is removed (by `munmap`, or when the program exits). Translation adds nothing that needs freeing during a program’s life, but the tables themselves are memory: a program with a large, sparse address space can spend megabytes on them.
:::

## What’s next

Three extra memory reads on every access would be ruinous. The next chapter introduces the cache that makes translation nearly free most of the time, and measures how far that cache can reach.
