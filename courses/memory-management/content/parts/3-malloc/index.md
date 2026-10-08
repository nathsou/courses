---
title: malloc
summary: From Knuth’s boundary tags to thread caches, sixty years of allocators and the surprising difficulty of measuring them.
number: III
---

The problem of handing out pieces of memory of arbitrary size, and taking them back in arbitrary order, is almost as old as the stored-program computer. By the time Donald Knuth wrote the first volume of *The Art of Computer Programming* in 1968, it had a section of its own: first fit and best fit, free lists, the trick of the **boundary tag** that lets a block find its neighbours in constant time, and the buddy system :cite[knuth1968]. Most of chapter 10 would have been familiar to its readers.

## Storage allocators in the open

What changed over the next two decades was who wrote allocators. In Kernighan and Ritchie’s *The C Programming Language*, a storage allocator is a worked example of a few dozen lines: a circular free list, first fit, blocks carved from memory obtained from the operating system :cite[kernighan1988]. Every C programmer could read one, and many wrote their own. Doug Lea started his in 1987 for C++ programs that allocated heavily; its segregated bins, boundary tags and careful heuristics made it fast and dense, and it became the ancestor of the GNU C library’s `malloc` :cite[lea1996, glibcmallocinternals].

Meanwhile there was theory, and it was discouraging. J. M. Robson showed in the early 1970s that every allocator can be forced to waste memory by a factor that grows with the range of request sizes :cite[robson1971, robson1974]. No policy is safe against every program.

## Measuring the right thing

In 1995 Paul Wilson and his colleagues reviewed three decades of allocator research and argued that much of it had been measuring the wrong thing: allocators had been compared on synthetic, random workloads that look nothing like real programs, which allocate in phases and in few sizes :cite[wilson1995]. Measured on real traces, the classic policies fragmented far less than feared :cite[johnstone1998]. The lesson shaped everything after it, including this course’s trace bank and the warning label on its *Random* trace.

## Threads, and the end of one heap

The multiprocessor servers of the late 1990s made the single locked heap a bottleneck. Emery Berger and his colleagues’ Hoard (2000) bounded the memory wasted by per-processor heaps :cite[berger2000]. Google’s TCMalloc made thread-local caches the fast path :cite[ghemawat2005], Jason Evans built jemalloc around many arenas for FreeBSD :cite[evans2006], and Microsoft Research’s mimalloc (2019) sharded the free lists by page :cite[leijen2019]. Along the way Berger, Benjamin Zorn and Kathryn McKinley checked a piece of folk wisdom, that a hand-written custom allocator beats the general-purpose one, and found it mostly false: only region allocators reliably won :cite[berger2002].

Part III follows this arc: a heap from scratch (chapter 10), the problem of fragmentation (11), fast allocators for many threads (12), arenas and regions (13), and the lab, where you build one yourself (14).

::timeline{part="III"}
