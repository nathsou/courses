---
title: The machine and its kernel
summary: What the course’s simulator models, what it does not, and its cost model.
number: B
---

Every figure, exercise and number in this course comes from a simulator written in TypeScript and running in your browser. It is small enough to read and fast enough to replay a whole program on, and it is honest about the things that matter for memory management: addresses are real numbers in a real byte array, page tables are real 64-bit entries walked bit by bit, and an allocator’s bookkeeping really lives in the heap it manages. But it is a teaching model. This page says, layer by layer, what it models faithfully, what it simplifies, and what it leaves out, so that you know which conclusions carry over to real machines and which do not.

The short version: **trust the shapes, not the numbers.** When a figure says that one loop order is seven times cheaper than another, or that a copying collector touches fewer lines than reference counting, the direction and rough size of the effect are real. The exact cycle counts are not a prediction for any processor.

## The machine

**Physical memory** is a byte array divided into 4 KiB frames. Words are 64 bits, stored little-endian, as on RV64. Values up to 2^53 − 1 can be stored (the largest integer a JavaScript number holds exactly), which is enough for every address, size and page-table entry the course builds.

**Address translation** follows the RISC-V privileged specification’s Sv39 page-walk algorithm :cite[riscvpriv]: three levels of 512 eight-byte entries, leaves at any level (4 KiB pages, 2 MiB megapages, 1 GiB gigapages), the V, R, W, X, U, G, A and D bits, and the three page-fault causes. The walker sets the A and D bits itself, one of the two behaviours the specification allows. Appendix C is the reference card. Not modelled: machine mode, physical memory protection, the hypervisor extension, and the later extensions for naturally aligned contiguous pages and page-based memory types.

**The TLB** has 64 entries, fully associative, replaced least recently used, tagged with an address-space identifier so that switching processes need not flush it. Real processors usually have two or more levels of TLB, and the larger levels are set-associative :cite[drepper2007]. Real MMUs also cache the upper levels of the page tables, which makes a walk cheaper than the course’s, where every step is a memory access priced by the caches.

**The caches** are three levels, physically indexed, with 64-byte lines and least-recently-used replacement within each set:

| level | size | ways | cycles |
|---|---|---|---|
| L1 | 32 KiB | 8 | 4 |
| L2 | 512 KiB | 8 | 14 |
| L3 | 4 MiB | 16 | 40 |
| DRAM | | | 200 |

A page fault costs 1,000 cycles on top of the memory it touches, a system call 300, and zeroing or copying a page 600. A step of a page walk adds 2 cycles to its memory access. Some figures use a much smaller machine, with one tiny cache, so that every line and set can be drawn; they say so.

What the cost model leaves out matters more than what it includes:

- **Every access waits for the one before.** A real out-of-order processor keeps working past a miss and can have several misses in flight at once, which hides part of their latency; hardware **prefetchers** watch for regular access patterns and fetch lines before they are asked for :cite[drepper2007]. The course has neither. Sequential access is still cheaper here, because a 64-byte line serves eight words, but the gap between a sequential walk and a random one is smaller in the simulator than on a real machine with a good prefetcher.
- **Writes cost the same as reads.** Real caches track which lines have been modified and write them back to memory when they are evicted :cite[drepper2007]; the course charges nothing for write-backs.
- **One core.** There is no cache coherence between cores :cite[drepper2007], no false sharing, and no real threads. Chapter 12’s contention figure and chapter 25’s concurrent collectors simulate interleavings explicitly instead.
- **DRAM is one number.** Real DRAM is organised in banks and rows; a read from the row that is already open is faster than one that must open a new row :cite[drepper2007]. The course charges 200 cycles for every access that misses the last-level cache.
- **No instruction fetches.** Only data accesses go through the caches; the program’s own code is free.

## The kernel

The toy kernel is a TypeScript program that owns the simulated machine. It manages physical frames with a **buddy allocator** (chapter 9) and gives each process an address space: a page-table root, an address-space identifier and a list of virtual memory areas. Its page-fault handler does demand-zero pages, file-backed pages and **copy-on-write** after `fork` (chapter 5), and it implements six system calls: `brk`, `mmap`, `munmap`, `mprotect`, `fork` and `exit`. Copy-on-write is recorded in one of the two bits that the specification reserves for software in every page-table entry, as real kernels do.

It does not schedule: processes run when a figure says so. There are no signals, no threads, no page cache shared between processes, no swapping (chapter 6’s replacement figures run on reference strings, separately from the kernel), no transparent huge pages, no memory overcommit policy and no out-of-memory killer. Address-space layouts follow Linux’s conventions in outline, not in detail.

## The heap

Allocator exercises, the heap inspector and the lab bench use a simpler heap: one flat byte array, addressed from `0x10000` upwards, that grows when the allocator calls `sbrk`. It has no page tables, so it is fast enough to replay traces of thousands of operations on every keystroke. Every load and store is counted; on the lab bench and in the cost figures they are priced by a two-level cache (the L1 and L2 above, with DRAM behind them), and each call to `sbrk` costs 300 cycles, like a system call. Appendix D documents the API.

The **storage rule** keeps allocators honest: an allocator’s bookkeeping must live in the heap it manages. Outside it, only scalar variables are allowed: no JavaScript arrays, maps or objects. The checker enforces this by reading your code, so a free list kept in a JavaScript array is rejected even though it would work.

The lab bench’s traces are generated, not recorded from real programs: each has a seed and a short note saying what kind of program it imitates. A real allocator is judged on recorded traces of real workloads, which have patterns no generator imitates exactly.

## Mote and its memory managers

Mote programs (appendix E) are compiled to a small stack machine. Its frames live in a simulated stack that grows downwards from `0x7fff_f000`, its objects in a simulated heap from `0x10_0000`, and its globals in a small data segment, so everything a collector has to find is in simulated memory, as it would be on a real machine. The compiler records, at every safepoint (each call, allocation, loop back-edge and explicit collection), which stack slots hold pointers: these are the stack maps of chapter 24.

The ten memory-manager settings are textbook versions, each a few hundred lines long. They are faithful to the algorithms they are named after, but none is tuned, and none is a model of a particular production system. Collectors work while the program is stopped; even the incremental setting does its marking in small slices at the program’s safepoints, never in parallel with it. **Pause times are counted in work**, the number of objects visited and pointer slots scanned in one pause, not in cycles: that measures the thing a pause is made of without pretending to know how fast a particular processor would do it.

The VM also runs an **oracle** that records when each object is allocated, last used, becomes unreachable and is freed. The oracle is how the course can tell you that a pointer dangles or that an object leaked: it sees everything. Real programs have no oracle, which is why chapter 16’s tools exist.

In chapter 28’s full-stack replay, every load and store that the program and its allocator make is replayed on the machine above, through the kernel, the TLB and the caches. The collectors’ own marking reads are not replayed, so the figure understates what tracing collection costs in cache misses.

## Real systems

Where the course describes a real allocator or collector, such as glibc’s malloc, jemalloc, CPython’s reference counting, Go’s collector or HotSpot’s G1, it describes it from its documentation and the papers cited in the chapter, and any figure that imitates it is a simplified model that says so. Chapter 26’s dashboard is the clearest case: five collector designs reduced to toy models with round-number costs, to show the shape of the trade-offs between them, not their measured behaviour.

If a number in the course matters to you, measure it on your own machine. The simulator is for building intuition about why the numbers come out as they do.
