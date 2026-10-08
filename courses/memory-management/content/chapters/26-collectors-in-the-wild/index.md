---
title: Collectors in the wild
summary: Java’s collectors, Go’s, V8’s, .NET’s and the BEAM’s, and the three-way trade between memory, throughput and pauses that each one makes.
number: 26
duration: 45 minutes
prerequisites: [generations, concurrent-collection]
---

Every production collector is assembled from the parts of the last five chapters: tracing, moving or not, generations, barriers, concurrency. What distinguishes them is which trade they make, and there are three quantities to trade. **Memory**: how much bigger than the live data the heap must be. **Throughput**: what share of the machine’s time the program, rather than the collector, gets to use. **Pauses**: how long the program is ever stopped. You can have any two cheaply. Having all three is the research problem of the last forty years.

## Five designs, one workload

The dashboard runs five simplified collector designs on the same synthetic workload. They are toy models on a toy machine, with round-number costs that are stated below the figure, not measurements of real systems; but the shapes of the trade-offs are the real ones.

::gc-dashboard

Start with the default heap, twice the live set, and compare the rows. The stop-the-world collectors pause for a long time, because a full mark and sweep must trace every live object with the program stopped; four threads divide the pause by four. The generational model replaces most of those pauses with very short nursery collections, at the cost of an occasional full one. The two concurrent models barely pause at all, but give up a slice of throughput to their barriers.

Now shrink the heap. The stop-the-world collectors collect more often, so their throughput falls. The concurrent ones need **headroom**: the program keeps allocating while the collector works, and if the free space runs out before the collection finishes, the program must wait. Push the heap small enough and the concurrent models start to stall, and their pauses come back. Then grow the live set: every model’s full collection gets longer, because tracing costs grow with what is alive.

## What real systems choose

**HotSpot**, the Java virtual machine, offers a choice. Its Serial and Parallel collectors stop the world, the second with many threads, and favour throughput. Since Java 9, G1 has been the default on server configurations, chosen because “limiting GC pause times is, in general, more important than maximizing throughput” :cite[jep248]. For still shorter pauses there are two concurrent compacting collectors. ZGC, introduced in Java 11, set itself the goal that pause times “should not exceed 10ms” with “no more than 15% application throughput reduction compared to using G1”, using coloured pointers and load barriers :cite[jep333]; it now aims never to stop application threads “for more than a millisecond”, and was rebuilt with generations in Java 21 :cite[zgc-wiki]. Shenandoah reduces pauses “by doing evacuation work concurrently with the running Java threads”, so that its pauses are independent of heap size :cite[jep189].

**Go** chose a non-moving, concurrent mark–sweep collector, which “does most of its work concurrently with the application” to keep latencies low :cite[go-gc-guide]. It has essentially one knob, `GOGC`, which sets how much the heap may grow between collections: the target heap is the live heap plus `GOGC` per cent of it (and of the roots), so the default of 100 lets the heap reach about twice the live data :cite[go-gc-guide]. That is the dashboard’s heap slider, exposed to the programmer.

**V8**, the JavaScript engine in Chrome and Node.js, turned “a sequential, stop-the-world garbage collector” into “a mostly parallel and concurrent collector with incremental fallback” in its Orinoco project :cite[marshall2019]. Its young generation is a semi-space copying collector, run in parallel; its old generation is marked concurrently, with write barriers :cite[marshall2019].

**.NET** divides its heap into three generations, 0, 1 and 2, so that most collections touch only the young ones, and puts objects of 85,000 bytes or more on a separate large object heap :cite[dotnet-gc].

**The BEAM**, the virtual machine of Erlang and Elixir, avoids most of the problem by design. Each process has its own small heap, collected by “a per process generational semi-space copying collector using Cheney’s copy collection algorithm” :cite[erlang-gc]. A collection stops one process, which holds a tiny fraction of the system’s data, while the others keep running.

Research has not stood still either. Immix organises the heap into blocks and lines and marks regions rather than objects, getting much of the benefit of compaction without copying everything :cite[blackburn2008]; LXR combines reference counting with occasional tracing to reach low latency and high throughput together :cite[zhao2022]. Part V’s technique is back in the collectors.

## When a collector meets a cache

The dashboard’s workload has a fixed live set. Real services often keep a large cache of long-lived data, and the cost of a collection grows with the live data it must scan, however little garbage there is.

::museum{exhibit="discord-2020"}

```quiz
q: "A service keeps a 4 GB cache that changes slowly and allocates little else. Its collector is a non-moving, concurrent mark–sweep collector. Which change most directly reduces the work each collection does?"
options:
  - text: Giving it a bigger heap
    why: "A bigger heap makes collections rarer, but each one still has to trace the whole cache."
  - text: Making the cache smaller, or moving it out of the collected heap
    correct: true
    why: "Tracing cost grows with live data. Discord tried smaller caches, which shrank the spikes. Moving the cache out of the collected heap would remove that work altogether."
  - text: Allocating more, so that collections happen more often
    why: "More frequent collections each still scan the whole cache: more total work, not less."
```

:::key
Every collector trades **memory**, **throughput** and **pause time**. Stop-the-world collectors are simple and efficient but pause in proportion to the live data; generational collectors make most pauses short; concurrent collectors make pauses tiny but need headroom and pay for barriers. HotSpot offers the whole range, from Serial to G1 to ZGC and Shenandoah; Go chose a concurrent, non-moving collector with one knob; V8 and .NET are generational; the BEAM collects each process separately.
:::

:::whofrees
The runtime, on its own schedule, which is exactly the problem for a latency-sensitive service: someone else decides when the work happens. Choosing a collector, and a heap size, is choosing that schedule.
:::

## What’s next

One part of the collector’s job is still missing. Some objects need to *do* something when they die: close a file, release a lock, remove themselves from a cache. Chapter 27, an optional one, covers finalisers and weak references, and the strange things that happen when a dying object refuses to die.
