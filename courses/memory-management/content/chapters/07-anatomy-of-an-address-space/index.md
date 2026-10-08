---
title: Anatomy of an address space
summary: Text, data, heap, stack and the gaps between them; guard pages and address randomisation.
number: 7
duration: 40 minutes
prerequisites: [page-faults]
---

Part I gave every program a private address space and showed how the hardware translates it. But what is actually *in* one? A 39-bit address space has room for 512 GiB, and a small program uses a few megabytes of it, in a handful of separate places. This chapter is a tour of those places, and of the two system calls that create new ones.

It is also where the kernel’s view of a program’s memory and the program’s own view meet. The kernel thinks in **areas**: ranges of addresses with permissions and a source of contents. Page tables, as chapter 5 showed, are just a cache of the parts of those areas that are currently in memory. Everything above the kernel, starting with `malloc` in Part III, gets its memory by asking for new areas or bigger ones.

## The map

Here is a small program’s address space, as Linux would show it in the file `/proc/self/maps`, one line per area. Click around, grow the heap, map a block, and probe a few addresses.

::address-map

From the bottom up:

**The program itself.** When the kernel starts a program, it reads the executable file (an ELF file on Linux and most Unix systems) and maps its pieces: the machine code as read-only and executable (**text**), constants as read-only, and initialised global variables as read-write (**data**). None of it is copied up front. The areas are mapped from the file, and pages are read in on demand when first touched, exactly like the file mappings of chapter 5. The code pages are shared by every process running the same program, because nobody can write to them.

**The bss.** Global variables that start at zero take no space in the file. The kernel maps a demand-zero area for them, so they appear, page by page, as zeros. (The name is a fossil from an IBM assembler of the 1950s; it originally meant “block started by symbol”.)

:::bridge{course=compiler-backends chapter=linking title="SSA to Silicon, chapter 20: Linking and running"}
Builds the ELF file the kernel maps here: sections, segments, relocations, and the program headers that tell the loader which parts to map with which permissions.
:::

**The heap.** Just above the program’s data sits an area that starts empty and grows upwards. Its end is called the **program break**, and the system call `brk` (or the old library function `sbrk`) moves it. This is the area `malloc` traditionally carves up, and it is a single contiguous range: to give memory back to the kernel, `malloc` can only lower the break, which works only if the topmost chunk is free.

**Memory mappings.** The system call `mmap` creates a new area anywhere in the address space: anonymous memory (demand-zero, like the heap) or a view of a file. Shared libraries are mapped this way, each with its own text and data areas. Modern allocators use `mmap` heavily: glibc’s `malloc` serves large requests (128 KiB and up, by default) with a mapping of their own, so that `free` can hand the whole thing straight back with `munmap`; allocators like jemalloc and mimalloc get almost all their memory this way.

**The stack.** At the top of the user half of the address space is the main thread’s stack, growing downwards. Chapter 8 is about what happens inside it.

**The gaps.** Between the heap and the mappings, and between the mappings and the stack, lie huge ranges with no area at all. Touching them is a bug, and the kernel answers with a segmentation fault.

:::key
The kernel tracks a process’s memory as a list of areas, each with a start, an end, permissions, and a source (a file, or zeros). Page tables are filled in lazily from this list, one page fault at a time. `brk` grows one special area, the heap; `mmap` creates new ones; `munmap` removes them.
:::

## The guard page

Below the stack the kernel leaves a **guard page**: an area with no permissions at all. A program that runs off the end of its stack, usually through runaway recursion, hits the guard page and faults immediately, instead of quietly overwriting whatever lies below. Threads get stacks of their own, each allocated with `mmap` and each with its own guard page.

A guard page only works if the program touches it. A function with a huge local array can move the stack pointer down by more than a page in one step and land past the guard, in some other area, without ever touching the guard itself. In 2017 the security firm Qualys showed that this “stack clash” :cite[qualys2017] could be exploited on several Unix systems, and compilers responded by adding *stack probes*: code that touches each page of a large frame in order, so that the guard page is always hit.

## Shuffling the deck

The layout above used to be identical every time a program ran. That was convenient for attackers: an exploit that needed the address of a function in the C library, or of the stack, could simply hard-code it.

**Address space layout randomisation** (ASLR) moves the pieces by a random amount each time a program starts: the stack, the heap, the libraries and, for programs compiled as position-independent executables, the program itself. The PaX project introduced it for Linux in 2001 :cite[pax2001], and over the following years it became standard in Linux, Windows, macOS, iOS and Android. Press *Shuffle* in the figure to see the effect.

ASLR does not fix any bug. It makes exploiting one harder, by turning “jump to this address” into “guess this address”. It is one of a family of such mitigations, along with non-executable stacks and stack canaries (chapter 8) and the hardened allocators of chapter 16. Each raises the cost of turning a memory error into an attack. None of them prevents the memory error.

```predict
q: A 64-bit program has ASLR. An attacker learns, through some bug, the address of one function in the C library. What has the attacker gained?
options:
  - text: Very little. Only that one function is located.
    why: Libraries are mapped as one unit. Everything in them is at a fixed offset from everything else.
  - text: The location of the whole library.
    correct: true
    why: "ASLR randomises where each area starts, not the layout inside it. One leaked address reveals the base of its area, and with it every function in the library. This is why real attacks usually start with an information leak."
  - text: The location of every area in the address space.
    why: Each area is randomised separately (though on some systems the offsets are correlated). The stack and heap are still unknown.
```

## The other half

The upper half of a 64-bit address space belongs to the kernel. Traditionally, the kernel’s code and data, and a mapping of all physical memory, were present in every process’s page tables, marked U = 0 so that user code could not touch them. Chapter 4 explained why, since Meltdown, many systems unmap most of the kernel while user code runs. Either way, the kernel’s half is not part of the program’s map, and touching it from user mode is a fault.

:::whofrees
The kernel frees an area’s pages when the area is removed: by `munmap`, by `brk` lowering the break, or when the process exits and the whole address space goes. `free` in a C program usually frees nothing at this layer; it gives the chunk back to `malloc`, which keeps it for later. Whether the memory goes back to the kernel at all depends on `malloc`, which is the subject of Part III.
:::

## What’s next

One area deserves a chapter of its own, because it is the cheapest allocator in the machine, used by every function call in every program: the stack.
