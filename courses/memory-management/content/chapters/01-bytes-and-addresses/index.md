---
title: Bytes and addresses
summary: Memory as one long array, pointers as numbers, and the padding hidden inside every struct.
number: 1
duration: 50 minutes
---

Strip away every layer from chapter 0 and what remains is the simplest model of memory there is: a very long row of numbered boxes, each holding one byte. The number of a box is its **address**. Everything else in this course, page tables and allocators and garbage collectors, is built on top of that row.

The model is simple, but three of its consequences surprise almost everyone the first time: the bytes of a number are stored in an order that looks backwards, values like to sit at addresses that are multiples of their size, and a struct is usually bigger than the sum of its fields. This chapter is about those three surprises and about the idea underneath all of them: a pointer is just a number.

## An array of bytes

A byte is eight bits, so it holds a number from 0 to 255. Memory is an array of them. A machine with 16 GiB of memory has about seventeen billion of these boxes, numbered from zero.

Bigger values span several boxes. A 64-bit integer occupies eight consecutive bytes; we say it *starts* at the address of the first one. The processor reads and writes memory in these units: one byte, two, four or eight at a time. RISC-V, the architecture this course simulates, calls an eight-byte unit a *doubleword* and loads one with the instruction `ld`; we will mostly just say **word**, since that is what a 64-bit machine is built around.

Addresses are written in hexadecimal, base 16, because each hex digit is exactly four bits and addresses then line up neatly with the powers of two that memory is organised around. `0x1000` is 4096, the size of a page; `0x10` is 16. If hexadecimal is rusty, appendix A has a short refresher. The useful habits are these: the last three hex digits of an address are its offset inside a 4 KiB page, and an address ending in `0` or `8` is a multiple of 8.

:::programmer
If you write JavaScript, Python or Java, you never see an address: the language hands you *references* and keeps the numbers to itself. They are still there. Every object reference your program holds is, underneath, the address of the object’s first byte.
:::

## Which end first?

Store the 32-bit number `0x12345678` at address 100. It takes four bytes, at 100, 101, 102 and 103. Which byte goes where?

```predict
q: A RISC-V machine stores the 32-bit value 0x12345678 at address 100. What is the byte at address 100?
options:
  - text: "0x12, the most significant byte"
    why: That is big-endian order, used by network protocols and by some older processors, but not by RISC-V.
  - text: "0x78, the least significant byte"
    correct: true
    why: RISC-V is little-endian, like x86 and (in practice) Arm. The little end comes first, at the lowest address.
  - text: It depends on the compiler.
    why: It depends on the processor, not the compiler. The compiler must emit loads and stores that match.
```

Little-endian machines store the least significant byte at the lowest address. It looks backwards when you read a hex dump left to right, but it has a pleasant property: the address of a value is also the address of its low byte, so reading a 64-bit value as a 32-bit one gives the same low half. The names come from Gulliver’s Travels, by way of Danny Cohen’s 1980 note on byte order, which compared the debate to the war between those who broke their eggs at the big end and those who broke them at the little end :cite[cohen1980].

You can try both orders in the figure below (at the bottom). For the rest of the course, everything is little-endian, and you will mostly not need to think about it: the simulator’s `load64` and `store64` put the bytes in order for you.

## Alignment

A processor fetches memory from its cache in fixed blocks (64 bytes on most machines, as chapter 2 explains) and its buses carry several bytes at once. An eight-byte value that starts at an address divisible by 8 lies inside one such block. One that starts at address 13 straddles two, and may cost two fetches, or worse.

So values have an **alignment**: an eight-byte integer prefers an address that is a multiple of 8, a four-byte one a multiple of 4, a byte goes anywhere. What happens when a program ignores this varies. x86 processors handle misaligned accesses in hardware, usually at little extra cost. The RISC-V specification allows an implementation either to handle them in hardware or to trap and let software emulate them, in which case a misaligned access can be very slow indeed :cite[riscvunpriv]. Some older processors simply refused. Compilers sidestep the question: they place every value at an address that is a multiple of its alignment.

:::key
The alignment of a primitive value is usually its size: 1, 2, 4 or 8 bytes. An address is *aligned* for a value if it is a multiple of the value’s alignment. Allocators promise aligned memory: `malloc` on a typical 64-bit system returns addresses that are multiples of 16, so that anything can be stored there.
:::

## Structs and padding

A struct is a sequence of fields in memory, in the order they are declared (C and C++ guarantee the order; Rust is free to reorder fields unless told not to, and does). Each field must be aligned, and the struct as a whole must be too. The compiler achieves this with two rules:

1. Each field goes at the first offset at or after the end of the previous field that is a multiple of the field’s alignment. The skipped bytes are **padding**.
2. The struct’s alignment is the largest of its fields’ alignments, and its size is rounded up to a multiple of that. The extra bytes at the end are **tail padding**, and they exist so that in an array of these structs, every element stays aligned.

```predict
q: "A struct has three fields, in this order: a bool, a 64-bit integer, and another bool. How big is it?"
options:
  - text: 10 bytes
    why: That is the sum of the fields. The 64-bit integer must start at a multiple of 8.
  - text: 16 bytes
    why: Close. The integer starts at 8, ends at 16, and the second bool goes at 16. Then the size must be rounded up.
  - text: 24 bytes
    correct: true
    why: "bool at 0, seven bytes of padding, the integer at 8 to 15, the second bool at 16, and seven bytes of tail padding to reach a multiple of 8: 24 bytes for 10 bytes of data."
```

Play with the figure. Start from “a careless order”, then use the arrows to move fields, or press *Sort by alignment*.

::byte-explorer

Ordering fields from the largest alignment to the smallest always removes the padding between fields; only tail padding remains. That is why careful C programmers declare their wide fields first, and why Linux kernel developers use a tool, `pahole`, whose job is to point out the holes in structs. Rust does the reordering for you.

None of this is pedantry. A program that allocates a hundred million small objects pays for their padding a hundred million times. The same will be true of allocator headers (chapter 10), object headers in garbage-collected runtimes (chapter 21), and the size classes allocators round requests up to (chapter 11). Every layer pays a tax in bytes for keeping its books, and the first one is paid right here, by the compiler.

## Build it: the layout algorithm

Time to write the two rules down as code. Your function receives the size and alignment of each field, in declaration order, and must return each field’s offset, the struct’s size and its alignment.

```build
id: bytes-and-addresses/layout
title: Lay out a struct
prompt: |
  Implement `layout(fields)`. Each field is `{ size, align }`; return `{ offsets, size, align }` following the two rules above. The starter packs the fields with no padding at all, which is wrong as soon as alignments differ.
starter: |
  export interface Field { size: number; align: number }

  export function layout(fields: Field[]) {
    const offsets: number[] = [];
    let offset = 0;
    for (const f of fields) {
      offsets.push(offset);
      offset += f.size;
    }
    return { offsets, size: offset, align: 1 };
  }
solution: |
  export interface Field { size: number; align: number }

  const alignUp = (n: number, a: number) => Math.ceil(n / a) * a;

  export function layout(fields: Field[]) {
    const offsets: number[] = [];
    let offset = 0;
    let align = 1;
    for (const f of fields) {
      offset = alignUp(offset, f.align);
      offsets.push(offset);
      offset += f.size;
      align = Math.max(align, f.align);
    }
    return { offsets, size: alignUp(offset, align), align };
  }
tests: |
  import { test, expect } from '@mm/test';
  import { layout } from './solution';
  const B = { size: 1, align: 1 }, U16 = { size: 2, align: 2 }, U32 = { size: 4, align: 4 }, U64 = { size: 8, align: 8 };
  test('bool, u64, bool is 24 bytes', () => {
    expect(layout([B, U64, B])).toEqual({ offsets: [0, 8, 16], size: 24, align: 8 });
  });
  test('wide fields first leave only tail padding', () => {
    expect(layout([U64, B, B])).toEqual({ offsets: [0, 8, 9], size: 16, align: 8 });
  });
  test('a u16 after a byte is padded to offset 2', () => {
    expect(layout([B, U16, U32])).toEqual({ offsets: [0, 2, 4], size: 8, align: 4 });
  });
  test('a struct of bytes needs no padding', () => {
    expect(layout([B, B, { size: 3, align: 1 }])).toEqual({ offsets: [0, 1, 2], size: 5, align: 1 });
  });
  test('the empty struct', () => {
    expect(layout([]).size).toBe(0);
  });
hints:
  - "Round up with `Math.ceil(n / a) * a`."
  - Track the largest alignment as you go; round the final offset up to it.
explain: |
  This is, almost word for word, what C compilers do (the System V ABI for RISC-V and x86-64 specifies these rules). An allocator does the same rounding when it turns a request into a block size, as you will see in chapter 10.
```

## A pointer is a number

Because memory is an array and an address is an index into it, a pointer is just a number held in a variable: the address of the first byte of whatever it points to. Three consequences follow, and the whole course leans on them.

**Pointers can be stored in memory.** A linked-list node holds the address of the next node in one of its fields. Follow it and you are at the next node. The data structures of a running program are graphs whose edges are numbers in memory, and chapters 21 to 25 are about tracing those graphs.

**Pointers can be computed.** In C, `p + 1` on a pointer to an eight-byte value is the address eight bytes further on. Arrays work this way: element `i` is at `base + i * size`. Nothing stops a program from computing an address past the end of the array, which is what a buffer overflow is (chapter 15).

**A number that looks like a pointer might be one.** If all you have is memory, you cannot always tell whether the eight bytes `0x0000000000101010` are a pointer to an object or the integer 1,052,688. The compiler knew, but it may not have written that down anywhere. A garbage collector that wants to find every pointer either needs the compiler to tell it where they are (chapter 24’s *stack maps*) or must guess, treating every value that looks like an address as one (*conservative* collection, also chapter 24).

:::programmer
In the course’s language, Mote, pointers are opaque: you cannot add to them or turn them into integers, as in Java or Go. That safety is what lets a moving garbage collector relocate objects without the program noticing (chapter 22). C and C++ allow pointer arithmetic, and pay for it with every bug in Part IV.
:::

:::whofrees
Nobody, at this layer. Memory is just an array of bytes, and bytes do not know whether anyone still cares about them. Every notion of “free” is a promise kept by a layer above.
:::

## What’s next

The array-of-bytes model is a useful lie. Reading the byte at address 0 and the byte at address 1,000,000,000 do not cost the same: one may take a nanosecond and the other a hundred. The next chapter opens up the memory hierarchy and shows why the order in which you touch memory can matter more than how much of it you touch.
