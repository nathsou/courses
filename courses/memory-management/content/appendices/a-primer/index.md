---
title: Bits, hex and pointers
summary: Binary, hexadecimal, bit operations and powers of two, for reading addresses fluently.
number: A
---

Memory management is full of numbers that only make sense in base two: page sizes, alignments, page-table indices, flag bits hidden in the bottom of a size. This appendix is the arithmetic the course assumes. Ten minutes with it, and the bench below, should make an address like `0x3f_0000_1a40` readable at a glance.

## Binary

A bit is 0 or 1. A row of bits is a number in base two: each position is worth twice the one to its right. The bits of `1101` are worth 8, 4, 2 and 1, so `1101` is 8 + 4 + 1 = 13. Positions are numbered from the right, starting at 0, so bit *i* is worth $2^i$.

With *n* bits there are $2^n$ different patterns, so *n* bits can count from 0 to $2^n - 1$. Eight bits, a byte, count to 255; 32 bits to just over four billion; 64 bits to about 1.8 × 10¹⁹.

## Hexadecimal

Long rows of bits are hard to read, so we group them in fours. Four bits have sixteen patterns, and hexadecimal, base 16, has one digit for each: `0` to `9`, then `a` for 10 up to `f` for 15. Every hex digit is exactly four bits, so converting is a matter of looking up one group at a time:

| hex | bits | | hex | bits | | hex | bits | | hex | bits |
|---|---|---|---|---|---|---|---|---|---|---|
| `0` | `0000` | | `4` | `0100` | | `8` | `1000` | | `c` | `1100` |
| `1` | `0001` | | `5` | `0101` | | `9` | `1001` | | `d` | `1101` |
| `2` | `0010` | | `6` | `0110` | | `a` | `1010` | | `e` | `1110` |
| `3` | `0011` | | `7` | `0111` | | `b` | `1011` | | `f` | `1111` |

Hex numbers are written with a `0x` prefix, so that `0x10` (sixteen) is not confused with `10` (ten). Long ones are often split with underscores for readability, as in `0x3f_0000_0000`; the underscores mean nothing.

A few habits make hex addresses easy to read:

- **The last three hex digits are the offset inside a 4 KiB page**, because 4 KiB is 2¹² and three hex digits are twelve bits. `0x7fe4a` is offset `0xe4a` in page `0x7f`.
- **An address ending in `0` is a multiple of 16**; one ending in `0` or `8` is a multiple of 8.
- **Adding `0x1000` moves to the next page**; adding `0x10` moves sixteen bytes.

::bit-bench

## Powers of two

Memory comes in powers of two, and a few are worth knowing by heart:

| power | value | name | where it appears |
|---|---|---|---|
| 2⁴ | 16 | | malloc’s alignment on 64-bit machines (chapter 10) |
| 2⁶ | 64 | | a cache line (chapter 2) |
| 2⁹ | 512 | | entries in one Sv39 page table (chapter 3) |
| 2¹⁰ | 1,024 | 1 KiB | |
| 2¹² | 4,096 | 4 KiB | a page (chapter 3) |
| 2²⁰ | 1,048,576 | 1 MiB | |
| 2²¹ | | 2 MiB | an Sv39 megapage (chapter 4) |
| 2³⁰ | | 1 GiB | an Sv39 gigapage |
| 2³⁹ | | 512 GiB | Sv39’s whole virtual address space |

The course writes KiB, MiB and GiB for powers of 1,024, and kB, MB and GB for powers of 1,000. The difference is small for a kilobyte (2.4 per cent) and grows with each step: a GiB is 7.4 per cent more than a GB.

Exponents add when powers multiply, which is how most memory arithmetic goes. A page table has 2⁹ entries, each mapping a 2¹²-byte page, so one table maps 2²¹ bytes, 2 MiB. Three levels of 9 bits on top of a 12-bit offset make 9 + 9 + 9 + 12 = 39 bits.

```numeric
id: primer/pages
title: Counting pages
prompt: How many 4 KiB pages does a 2 MiB megapage cover?
answer: 512
unit: pages
explain: "2 MiB is 2²¹ bytes and a page is 2¹², so a megapage covers 2²¹⁻¹² = 2⁹ = 512 pages: exactly one page table’s worth."
```

## Bit operations

Four operations work on numbers bit by bit:

- **AND** (`&`) gives 1 where *both* inputs have a 1. It *selects* bits: `x & 0xfff` keeps the low twelve bits of `x` and clears the rest. The second operand is called a **mask**.
- **OR** (`|`) gives 1 where *either* input has a 1. It *sets* bits: `size | 1` turns on the lowest bit, which is how chapter 10’s block headers mark a block as allocated.
- **XOR** (`^`) gives 1 where the inputs *differ*. It *flips* bits: `x ^ 1` toggles the lowest bit.
- **NOT** (`~`) flips every bit. `~15` is all ones except the low four bits, so `x & ~15` clears them.

Two more move bits sideways:

- **Shift left** (`x << k`) moves every bit *k* places to the left, filling with zeros: it multiplies by $2^k$.
- **Shift right** (`x >> k`) moves them *k* places to the right, dropping the bits that fall off: for a non-negative `x` it divides by $2^k$ and rounds down. `x >> 12` is the page number of address `x`.

Shifting and masking together pull a field out of the middle of a number. The index into the second level of an Sv39 page table is bits 21 to 29 of the address: shift them down to the bottom, then keep nine bits, `(x >> 21) & 0x1ff`.

## Alignment

An address is **aligned** to *a* (a power of two) when it is a multiple of *a*. In binary, that means its low $\log_2 a$ bits are zero: a multiple of 16 ends in four zero bits. Two recipes cover almost every use:

- **Is `x` aligned?** `x & (a − 1)` is zero exactly when it is. `a − 1` is a mask of the low bits: for 16, it is `0b1111`.
- **Round `x` up to a multiple of `a`**: `(x + a − 1) & ~(a − 1)`. Adding `a − 1` carries `x` past the next multiple unless it is already on one; clearing the low bits drops it back onto that multiple.

Because aligned sizes always have zero low bits, allocators store flags there for free. Chapter 10’s header stores a block’s size with its “allocated” flag in bit 0; Sv39 page-table entries keep ten flag and reserved bits below the frame number (appendix C).

```numeric
id: primer/round-up
title: Rounding up
prompt: "A program asks malloc for 50 bytes. malloc adds an 8-byte header, then rounds the total up to a multiple of 16. How many bytes does the block take?"
answer: 64
unit: bytes
explain: "50 + 8 = 58, and (58 + 15) & ~15 = 73 & ~15 = 64. The 6 bytes between 58 and 64 are internal fragmentation (chapter 11)."
```

## Pointers are numbers

A pointer is an address: a number, stored in a word like any other. That is the single fact underneath most of the course. It is why an allocator can keep its free list *inside* the free blocks (chapter 10), why a conservative collector cannot tell a pointer from an integer that happens to look like one (chapter 24), and why a dangling pointer is so dangerous: the number still points somewhere, and something else may live there now (chapter 15).

**Pointer arithmetic** in C counts in elements, not bytes: if `p` points to an 8-byte integer, `p + 1` is eight bytes further on. The course’s TypeScript `Heap` API has no types, so its addresses always count in bytes: the next word after `addr` is `addr + 8`.

**Negative numbers** use two’s complement: the top bit is worth $-2^{n-1}$ instead of $+2^{n-1}$, so in 64 bits, all ones is −1. This matters for addresses in one place: Sv39 uses only the low 39 bits of a 64-bit address, and requires bits 63 to 39 to be copies of bit 38. Addresses with bit 38 set are therefore “negative”, at the very top of the 64-bit range, and that is where kernels put themselves (chapter 7).

```quiz
q: "Which of these addresses is 16-byte aligned?"
options:
  - text: "0x7f38"
    why: "It ends in 8: a multiple of 8, but not of 16."
  - text: "0x7f40"
    correct: true
    why: "It ends in hex 0, so its low four bits are zero: a multiple of 16."
  - text: "0x7f4c"
    why: "c is 1100 in binary: the low two bits are zero, so it is a multiple of 4 only."
```
