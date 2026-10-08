---
title: The process
summary: From loaders and fixed partitions to ELF, address randomisation, and the kernel’s buddy and slab allocators.
number: II
---

Early operating systems divided memory into a few fixed **partitions** and loaded one program into each. A program had to be told, when it was linked, where in memory it would run; moving it meant relinking it. Swapping a program out to disk and back in usually meant putting it back exactly where it had been. The address space of chapter 7, a private, mostly empty 512 GiB in which each piece of a program lands wherever the kernel decides, was decades away.

## The loader and the layout

Paging made it possible to give every program the *same* addresses: the code at the bottom, the stack at the top, each program believing it had the machine to itself. Unix settled the shape of the layout early: text, initialised data, the zero-filled bss (a name inherited from an IBM 704 assembler of the 1950s), a heap grown upwards with `brk`, and a stack growing down from the top. Later Unix systems added `mmap`, at first to map files and soon for anonymous memory as well, and shared libraries mapped into every process that needed them. The executable formats changed (a.out, COFF, and since the 1990s ELF on most Unix-like systems), but the layout they described stayed recognisably the same.

The stack itself is older than any of this. Subroutines needed somewhere to keep their return addresses, and the last-in-first-out discipline of nested calls made a stack the natural place. Recursive languages, from Lisp and Algol in the early 1960s onwards, made it essential.

## When the layout became a weapon

A predictable layout became a liability once programs faced hostile input. The Morris worm of 1988 :cite[spafford1989] showed what an overflowing stack buffer could do, and by the mid-1990s the technique was published for all to learn :cite[aleph1996]. The defences arrived over the following decade: stack canaries with StackGuard in 1998 :cite[cowan1998], address space layout randomisation from the PaX project in 2001 :cite[pax2001], and non-executable stacks once processors could mark pages that way. Each made one step of an attack harder; none removed the bugs underneath, which is the story Part IV picks up.

## The kernel’s own memory

Inside the kernel, two allocators from very different decades still do most of the work. Kenneth Knowlton’s buddy system of 1965 :cite[knowlton1965] has survived because its rules are simple, its coalescing is nearly free, and it can hand out physically contiguous blocks. Knuth’s *Art of Computer Programming* made it widely known, and Linux has used it for physical pages since its early versions.

Jeff Bonwick’s slab allocator of 1994 :cite[bonwick1994] solved a different problem: thousands of small kernel objects of a few dozen fixed sizes, created and destroyed constantly, each expensive to initialise. Its answers (one cache per object type, slabs of equal slots, no per-object headers, keeping objects constructed, colouring slabs to spread them across cache sets) were so effective that they escaped the kernel. Bonwick and Jonathan Adams later added per-CPU caches (“magazines”) and extended the design to general-purpose memory :cite[bonwick2001], and the user-space allocators of the 2000s and 2010s, jemalloc, TCMalloc and mimalloc among them, are slab allocators under other names. Chapter 12 returns to them.

::timeline{part="II"}
