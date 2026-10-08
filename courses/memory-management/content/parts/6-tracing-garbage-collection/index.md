---
title: Tracing garbage collection
summary: From McCarthy’s mark–sweep to collectors that pause for less than a millisecond, sixty years of finding what is still alive.
number: VI
---

In 1960, John McCarthy’s LISP needed a way to reclaim the list cells that programs abandoned, and his answer was to stop, find every cell still reachable from the program’s registers, and return the rest to the free list :cite[mccarthy1960]. Almost every idea in Part VI is a refinement of that one.

## Copying, and then generations

The first refinements attacked the cost of the sweep. Fenichel and Yochelson’s copying collector of 1969 moved the live data into a fresh space and never looked at the garbage :cite[fenichel1969], and Cheney’s algorithm of 1970 did it without recursion, using the new space as its own work list :cite[cheney1970]. In the 1980s, Lieberman and Hewitt :cite[lieberman1983] and Ungar :cite[ungar1984] observed that most objects die young, and built collectors that spend their effort where the garbage is. Generational collection, with its write barriers and remembered sets, became the default design of managed runtimes.

## Without help, and without stopping

Two other lines ran alongside. Boehm and Weiser showed in 1988 that a collector could work without any help from the compiler, scanning the stack conservatively :cite[boehm1988], which brought garbage collection to C and to the runtimes of languages compiled through C. And from the 1970s, researchers asked how a collector could run while the program kept going: Steele :cite[steele1975], Dijkstra and his colleagues :cite[dijkstra1978] and Baker :cite[baker1978] designed incremental and concurrent collectors, and the tricolour invariant and the write barrier became the core vocabulary of the field.

## Production

The 1990s and 2000s turned these designs into the collectors of Java, .NET and JavaScript, and the problem shifted from collecting at all to collecting predictably. Real-time collectors like Metronome bounded pauses by time :cite[bacon2003]; mark-region designs like Immix got much of the benefit of compaction without copying everything :cite[blackburn2008]; and concurrent compacting collectors, ZGC and Shenandoah among them, brought pauses below a millisecond on large heaps :cite[jep333, jep189, zgc-wiki]. Meanwhile the oldest technique of all came back: LXR combines reference counting with occasional tracing :cite[zhao2022].

Part VI follows that path: reachability and mark–sweep (chapter 21), moving collectors (22), generations (23), finding roots (24), concurrency (25), the collectors in production (26), and finalisers and weak references (27).

::timeline{part="VI"}
