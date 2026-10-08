---
title: One allocation, all the way down
summary: Follow one new from a line of code to a row of capacitors, then turn a dial and watch five memory managers disagree about when to give it back.
number: 0
duration: 40 minutes
---

Here is a line of code you have written a thousand times, in one language or another:

```mote
let p = new Point { x: 1, y: 2 }
```

It asks for sixteen bytes to hold two numbers. It feels like the simplest thing a program can do. It is also the beginning of a negotiation that runs through five layers of software and hardware, each of which hands out memory in its own way and each of which has its own idea of when that memory can be taken back.

This course is about that negotiation. By the end you will have built a small version of every layer: page tables that translate addresses, a kernel that hands out pages, an allocator that carves them into chunks, and the reference counters and garbage collectors that decide when a chunk is no longer needed. You will also have broken each of them on purpose, because the failures are where the design decisions become visible.

This first chapter is a trailer. We follow one allocation all the way down, then turn a dial and watch the same program run under five different memory managers.

## One line, many layers


Before we look, a prediction.

```predict
q: When the line above runs, how many separate allocators (pieces of software or hardware that hand out memory and keep track of what is in use) are involved in finding a home for the Point?
options:
  - text: One. The language runtime puts it on the heap.
    why: The runtime is only the top layer. It gets its memory from somewhere.
  - text: Two. The runtime asks the operating system.
    why: Closer, but the operating system itself has several layers, and so does the hardware.
  - text: Four or five, depending on how you count.
    correct: true
    why: The runtime asks an allocator (malloc or its equivalent), which asks the kernel for pages, which hands out physical frames, which the hardware caches line by line. Each one keeps its own books.
```

Step down through the layers in the figure below. Nothing in it is a drawing of how things usually go: the course’s simulator really ran the program, really allocated the Point, really took a page fault and really walked the page tables. Use the buttons or the arrow keys.

::all-the-way-down

A few things are worth pausing on.

**The address is a fiction.** `p` holds a number, something like `0x101010`. That number is a *virtual* address, meaningful only inside this one program. Two programs running side by side can both have a Point at `0x101010` and never see each other’s. The translation from virtual to physical happens on every single memory access, in hardware, through the page tables you saw at level 4. Chapters 3 to 6 build that machinery.

**Every layer keeps books, and the books take space.** The Point has a header word in front of it saying what it is. The allocator’s page has a header saying which size class it serves. The page tables are themselves memory, three 4 KiB tables just to map this one page. There is no free lunch at any layer: the question is always where the bookkeeping lives and what it costs.

**The first touch was expensive.** When the program first wrote to the page holding the Point, there was no page there. The kernel had promised the memory but not delivered it. The hardware raised a fault, the kernel found a free frame, zeroed it, filled in a page-table entry and let the program try again. This *demand paging* is why a program can ask for a gigabyte and pay only for what it touches. It is also why a program can run out of memory long after the allocation “succeeded”, as chapter 5 shows.

:::key
Memory is handed out by a stack of allocators: the hardware’s DRAM and caches at the bottom, then the kernel’s frames and pages, then `malloc`’s chunks, then the runtime’s objects. Each layer gets its memory from the layer below and hands it out to the layer above, and each keeps its own books.
:::

## Who frees it?

Allocating is the easy half. The hard half is giving memory back, because it requires knowing that nobody will ever use it again. Each layer answers that question differently, and the answers you saw at the bottom of each level of the zoom are the outline of this course:

| Layer | Who frees it? | Chapters |
|---|---|---|
| Hardware | Nobody. Caches evict; DRAM forgets unless refreshed. | 1–2 |
| Kernel | A frame is freed when the last page mapping it goes, or the process exits. | 3–9 |
| malloc | A chunk is freed when the program calls `free`. | 10–16 |
| Ownership | An object is freed when its single owner goes out of scope. | 17 |
| Reference counting | An object is freed when no pointer to it remains. | 18–20 |
| Tracing collection | An object is freed when nothing reachable points to it. | 21–27 |

The last four rows are the ones programmers argue about, because they are choices a language makes for you. C hands you `malloc` and `free` and trusts you. Rust tracks ownership at compile time. Swift and CPython count references. Java, Go, JavaScript and C# trace. All of them are trying to answer the same question: *is this object dead yet?*

The trouble is that the true answer depends on the future. An object is dead when the program will never touch it again, and in general no tool can predict that (chapter 21 explains why it is undecidable). So every memory manager *guesses*, using something it can observe now. The guesses differ in how early they free, how much work they do to find out, and how they fail.

## The dial

The figure below is the instrument you will use more than any other in this course. It runs one program, written in the course’s small language, Mote, under whichever memory manager the dial points at.

The program builds a hundred and twenty points. Most are temporary: used once, then dropped. Every sixth one is kept on a list until the end. Where the program frees a temporary, it says so with `free(p)`, the way a C programmer would.

:::dial{settings="manual,ownership,rc,mark-sweep,copying,generational" title="Same program, different memory managers" n="0.2"}
```mote
struct Point { x: int, y: int }
struct Path { p: Point?, next: Path? }

fn main() {
  var path: Path? = null
  var total = 0
  for i in 0..120 {
    let p = new Point { x: i, y: i * i }
    total = total + p.x
    if i % 6 == 0 {
      path = new Path { p: p, next: path }  // kept until the end
    } else {
      free(p)                               // a temporary: done with it
    }
  }
  print("total", total)
}
```
The top chart shows how many bytes the memory manager holds over time (blue), against two lines the course computes after the run by watching every access: the bytes still *reachable* from the program (violet, dashed) and the bytes that *will actually be used again* (green). Below it, one bar per object.
:::

Turn the dial and look at the two charts each time. Here is what to look for.

**Manual.** The temporaries are freed the moment the program says so, and the blue line hugs the green one. Then the program ends without ever freeing the path or the points kept on it. The bars that end in an orange arrowhead are **leaks**: memory that is unreachable and was never given back. In a program that runs for a few milliseconds nobody cares. In a server that runs for a month, they are the reason it is restarted every night.

**Ownership.** The program’s `free` calls are ignored (they show as ghost diamonds ◇). Each Point is owned by the variable `p` or, once stored, by the path node that holds it. When `p` goes out of scope at the end of each loop iteration, the Point it still owns is dropped. When `main` returns, the path is dropped, and everything it owns goes with it. No leaks, no frees to remember, and nothing freed too early. The price is that the program must be written so that every object has exactly one owner, which chapter 17 shows is not always easy.

**Reference counting.** Every object carries a count of the pointers to it. When the count reaches zero, the object is freed at once. The blue line hugs the violet one: memory goes back as soon as it becomes unreachable. Chapter 19 shows the one case it cannot handle.

**Mark–sweep, copying, generational.** These *tracing collectors* let garbage pile up and then, every so often, find everything reachable and free the rest. The blue line becomes a sawtooth, and each collection shows as a dotted vertical line. Between collections, the hatched parts of the bars are objects that are already unreachable and still occupying memory. That is the bargain tracing makes: it does no work at all on most pointer writes, but it holds on to garbage until it gets round to looking.

:::question
Under the tracing collectors, why does the blue line never come down to the green one, even right after a collection?
:::

:::details[Answer]
A collection frees what is *unreachable*, not what is *unused*. The kept points are still reachable through the path long after the program has used them for the last time; only the program knows it will never look at them again. The gap between the violet and green lines is memory that no automatic memory manager can reclaim, because it would have to know the future.
:::

## Lag, drag and the oracle

The lifetime chart encodes everything this course cares about in one picture, so it is worth reading slowly. Hover over a few bars.

Every object is born, used, and eventually freed. In between there are two moments a memory manager could free it:

- **The last use.** After this, nobody will touch the object again. This is the ideal moment to free it, and the one that only an oracle that knew the future could choose. The course *can* compute it, after the fact, because it records every access the program makes.
- **The moment it becomes unreachable.** After this, no chain of pointers from the program’s variables leads to the object. A tracing collector can detect this; reference counting detects most of it immediately.

The time between the last use and the actual free is called **drag**, after Niklas Röjemo and Colin Runciman’s study of heap profiles of functional programs :cite[rojemo1996]. Drag is wasted memory. A memory manager that frees *before* the last use has gone wrong in the opposite direction, and much worse: the program will read memory that may already belong to something else. That is a **use-after-free**, the bar turns red, and chapters 15 and 16 are about the damage it does.

Every memory manager in this course is a strategy for guessing the last use from information available now. You will see each of them on this same chart.

:::whofrees
In this chapter: nobody had to free the Point by hand except under the manual setting, and there the program forgot to free the kept ones. Every other setting freed everything eventually; they differ in *when*.
:::

## How this course works

**Bottom-up.** Part I builds the machine: bytes and addresses, caches, and the page tables that make every address a virtual one. Part II looks at a running process: the stack, the address space and the kernel’s own allocators. Part III is `malloc`: you will write one and put it on a scoreboard. Part IV breaks manual memory management in every classic way and then shows how ownership rules those failures out. Parts V and VI automate freeing, first with reference counts and then with tracing collectors, ending with the collectors inside the runtimes you use every day.

**You build each layer.** Most chapters have a *Build it* exercise: TypeScript code that runs in your browser against the simulated machine, with tests. Your code operates on the simulated memory through a small API (appendix D), so a page walker really reads page-table entries and an allocator really keeps its free lists in the heap. Some figures can then run *your* implementation instead of the course’s.

**Honest results.** Every check says exactly what it established. “Tests passed (5 of 5) on this code” means those five tests passed on the code you ran, not that the code is correct. “Every free was safe on this run” means the oracle checked every free against the last use *in this run*. When you edit your code, old results are marked as out of date.

**The museum.** Real systems have failed in every way this course describes: spacecraft that ran out of memory, servers that leaked, browsers whose freed memory was taken over by an attacker. Each failure is retold where its mechanism is taught, and the [museum](/appendix/museum/) collects them.

**The two MMUs.** Two different things in this course are called MMU. In Part I it is the *memory management unit*, the hardware that translates addresses. In Part VI it is *minimum mutator utilisation*, a way of measuring how much a garbage collector interrupts a program. There will be no confusing them.

## What’s next

We start at the bottom, with the simplest possible model of memory: one very long array of bytes, and addresses that are just positions in it.
