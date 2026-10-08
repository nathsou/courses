---
title: Sv39 reference card
summary: Address split, PTE format, satp and fault causes on one page.
number: C
---

Everything about RISC-V’s Sv39 virtual memory that the course uses, on one page. The source is the privileged architecture specification :cite[riscvpriv]; chapters 3 and 4 explain it step by step.

::sv39-decoder

## The virtual address

```
 63            39 38        30 29        21 20        12 11            0
┌────────────────┬────────────┬────────────┬────────────┬───────────────┐
│ copies of b38  │   VPN[2]   │   VPN[1]   │   VPN[0]   │    offset     │
└────────────────┴────────────┴────────────┴────────────┴───────────────┘
       25 bits       9 bits       9 bits       9 bits        12 bits
```

- Three 9-bit indices, one per level of page table, and a 12-bit offset inside a 4 KiB page.
- Bits 63 to 39 must all equal bit 38; any other address faults. Valid addresses therefore fall in two halves of 256 GiB each, at the bottom and the top of the 64-bit range. User programs live in the bottom half; kernels usually take the top.
- In code: `vpn[i] = (va >> (12 + 9 * i)) & 0x1ff`, `offset = va & 0xfff`.

## The page-table entry

```
 63      54 53        28 27        19 18        10 9  8 7 6 5 4 3 2 1 0
┌──────────┬────────────┬────────────┬────────────┬────┬─┬─┬─┬─┬─┬─┬─┬─┐
│ reserved │   PPN[2]   │   PPN[1]   │   PPN[0]   │RSW │D│A│G│U│X│W│R│V│
└──────────┴────────────┴────────────┴────────────┴────┴─┴─┴─┴─┴─┴─┴─┴─┘
               26 bits      9 bits       9 bits    2 bits
```

| bit | name | meaning |
|---|---|---|
| 0 | V | Valid. If 0, the entry is ignored and any access through it faults; the other bits are free for software. |
| 1 | R | Readable. |
| 2 | W | Writable. |
| 3 | X | Executable. |
| 4 | U | Accessible from user mode. The supervisor may read and write U pages only when `sstatus.SUM` is set, and may never execute them. |
| 5 | G | Global: present in every address space. The TLB keeps it across address-space switches. |
| 6 | A | Accessed since the bit was last cleared. |
| 7 | D | Dirty: written since the bit was last cleared. |
| 8–9 | RSW | Reserved for software. The course’s kernel marks copy-on-write pages with bit 8. |
| 10–53 | PPN | The physical page (frame) number: the physical address divided by 4,096. |
| 54–63 | | Reserved for extensions that the course does not use. |

The physical address is `ppn << 12`, or in the course’s arithmetic, which avoids 64-bit shifts, `ppn * 4096`; and the PPN is `pte >> 10`, or `Math.floor(pte / 1024)`.

### What R, W and X mean together

| X W R | the entry is |
|---|---|
| 0 0 0 | a pointer to the next level’s table |
| 0 0 1 | a read-only leaf |
| 0 1 1 | a read–write leaf |
| 1 0 0 | an execute-only leaf |
| 1 0 1 | a read–execute leaf |
| 1 1 1 | a read–write–execute leaf |
| 0 1 0, 1 1 0 | reserved: faults |

## The `satp` register

```
 63   60 59                 44 43                                       0
┌───────┬─────────────────────┬──────────────────────────────────────────┐
│ MODE  │        ASID         │            PPN of the root table         │
└───────┴─────────────────────┴──────────────────────────────────────────┘
  4 bits       16 bits                         44 bits
```

MODE 0 means no translation (“Bare”), 8 means Sv39 and 9 means Sv48. The ASID (address-space identifier) tags TLB entries so that switching processes need not flush the TLB (chapter 4). Writing `satp` switches address spaces.

## The walk

1. Let *a* = `satp.PPN` × 4096 and *i* = 2.
2. Read the entry at *a* + VPN[*i*] × 8.
3. If V = 0, or W = 1 with R = 0, raise a page fault.
4. If R = 0 and X = 0, the entry points to the next level: let *a* = PPN × 4096, decrease *i*, and go to step 2. If *i* would fall below 0, raise a page fault.
5. The entry is a leaf. Check the access against R, W, X and U; if it is not allowed, raise a page fault.
6. If *i* > 0, the leaf is a superpage (2 MiB at level 1, 1 GiB at level 2), and the low 9 × *i* bits of its PPN must be zero, or it is a misaligned superpage and the access faults.
7. If A = 0, or the access is a store and D = 0, either raise a page fault (and let software set the bits) or set them in the entry; the specification allows both. The course’s machine sets them.
8. The physical address is the PPN followed by the offset. For a superpage, VPN[*i* − 1 … 0] pass through unchanged into the physical address.

## Page faults and fences

| cause | name | raised by |
|---|---|---|
| 12 | instruction page fault | fetching an instruction |
| 13 | load page fault | a load |
| 15 | store/AMO page fault | a store or an atomic memory operation |

On a page fault, the processor records the cause in `scause`, the faulting instruction’s address in `sepc` and, normally, the faulting virtual address in `stval`, and jumps to the supervisor’s trap handler. The handler fixes the page table and returns with `sret`, which retries the faulting instruction (chapter 5), or decides the access is a bug and kills the program.

The TLB is not kept coherent with the page tables by hardware. After changing an entry, the kernel executes `sfence.vma`: with no operands, it flushes every translation; with an address, only that page’s; with an ASID, only that address space’s non-global entries (chapter 4).

## Numbers to remember

| | |
|---|---|
| page | 4 KiB = 2¹² bytes |
| entries per table | 512 = 2⁹, of 8 bytes each: one table is one page |
| one level-0 table maps | 2 MiB |
| one level-1 table maps | 1 GiB |
| one root table maps | 512 GiB = 2³⁹ bytes |
| memory reads for a walk | 3, plus the access itself |
