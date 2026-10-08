---
title: All the way down, and back up
summary: One program with every layer open at once; the same ideas in paged KV caches and WasmGC; memory safety as policy; and what to read next.
number: 28
duration: 30 minutes
prerequisites: [one-allocation]
---

The course began with one allocation, a single `Point`, followed down through the layers of a machine: the object, the allocator’s chunk, the page, the page-table walk, the frame and its cache line, the DRAM row. At every layer, the same question had a different answer: *who frees it?*

Twenty-seven chapters later, here is a whole program, with every layer open at once.

Before you run it, a last prediction.

```predict
q: "The program below builds a 300-node list, sums it twice and frees it. Under which memory manager does it make the most loads and stores to memory, counting the manager’s own?"
options:
  - text: Manual, with malloc and free
    why: "About 7,000: the allocator’s bookkeeping on every `malloc` and `free`, and nothing extra on a pointer copy. Only copying makes fewer."
  - text: Reference counting
    correct: true
    why: "About 18,400. Every time a pointer is copied into a variable or a field, two counts change, one up and one down, and walking the list moves `cur` three hundred times per sum."
  - text: Mark–sweep
    why: "About 12,200: its allocator keeps free lists much as `malloc` does, and the list outgrows its trigger, so one collection runs. Second, not first."
  - text: Copying
    why: "About 3,300, the fewest: allocation is a pointer bump, the frees are ignored, and the heap never fills, so no collection runs and nothing is copied."
```

## Every layer at once

:::full-stack{settings="manual,rc,mark-sweep,copying" n="28.1"}
```mote
struct Node { value: int, next: Node? }

fn build(n: int) -> Node? {
  var head: Node? = null
  for i in 0..n {
    head = new Node { value: i, next: head }
  }
  return head
}

fn sum(list: Node?) -> int {
  var total = 0
  var cur = list
  while cur != null {
    total = total + cur.value
    cur = cur.next
  }
  return total
}

fn main() {
  let list = build(300)
  print(sum(list))
  print(sum(list))
  var cur = list
  while cur != null {
    let next = cur.next
    free(cur)
    cur = next
  }
}
```
Every heap load and store made by the program and its memory manager is replayed on the simulated machine of Part I: the kernel maps pages on first touch, the MMU translates through the TLB, and the caches decide what goes to DRAM. Drag the slider, or play, and switch memory managers.
:::

Read it from the top. While `build` runs, objects pile up, the heap grows a chunk at a time, and each new page costs a page fault the first time it is touched (chapter 5), a TLB miss (chapter 4) and a run of cache misses as fresh lines are brought in (chapter 2). Then both calls to `sum` walk the list without a single miss: three hundred 32-byte nodes take less than ten kilobytes, which fits easily in a 32 KiB L1 cache, so the list `build` just wrote is still there. Finally the list is freed, or not, depending on who is in charge.

Now switch managers and compare the totals. Under reference counting, the same program makes more than twice as many memory accesses as under manual management, because every pointer copy updates two counts (chapter 20). Under the copying collector it makes the fewest, because allocation is a pointer bump with no free list to maintain (chapter 22), and the explicit `free` calls are ignored. Under mark–sweep, frees are ignored too, and the objects wait for a collection. Same program, same output, very different traffic underneath.

## The same ideas, in new places

The ideas in this course keep turning up far from where they started.

**Paged KV caches.** A large language model serving many requests keeps, for each one, a key–value cache that grows with every token. Allocating each cache as one contiguous block wastes memory to exactly the fragmentation of chapter 11. PagedAttention, the technique behind the vLLM serving system, is “inspired by the classical virtual memory and paging techniques in operating systems”: it splits each cache into fixed-size blocks and keeps a block table per request, like a page table, achieving “near-zero waste in KV cache memory” and sharing blocks between requests, and its authors report two to four times the throughput of earlier systems :cite[kwon2023].

:::bridge{course=language-models chapter=inference title="Language Models from Scratch, chapter 16: Inference engine"}
Builds the KV cache that PagedAttention pages, and shows where its memory goes.
:::

**WasmGC.** WebAssembly began as a target for languages like C and Rust that manage their own memory in a flat array of bytes: a malloc heap inside a sandbox. A garbage-collected language compiled that way has to ship its own collector. The WasmGC extension instead lets a compiler describe structs and arrays that are “managed by the Wasm VM’s own GC implementation”, so that Java, Kotlin or Dart compiled to WebAssembly share the browser’s collector :cite[zakai2023].

:::bridge{course=compiler-backends chapter=wasm title="SSA to Silicon, chapter 21: WebAssembly"}
What a WebAssembly module looks like to a compiler, including its linear memory: the heap that WasmGC objects live outside of.
:::

**Memory safety as policy.** Chapter 15’s statistics, around 70% of serious security bugs in large C and C++ code bases coming from memory errors, have moved from conference talks to government reports: in 2024 the White House’s Office of the National Cyber Director called for a move to memory-safe languages :cite[oncd2024], and Android reported its share of memory-safety vulnerabilities falling from 76% to 24% in six years as new code moved to memory-safe languages :cite[vanderstoep2024]. The answer to “who frees it?” has become a question of national security.

## Who frees it?

Every chapter ended with that question. Put the answers side by side and they form a map of the field.

| Layer or design | Who frees it | Chapter |
|---|---|---|
| A DRAM row | Nobody: it forgets unless refreshed | 2 |
| A cache line | Nobody: it is evicted, and written back if dirty | 2 |
| A page and its frame | The kernel, when the last mapping goes | 3–6 |
| A stack frame | The return, by moving one pointer | 8 |
| A chunk from `malloc` | The programmer, by calling `free` | 10–14 |
| An arena’s objects | Nobody, one by one; the arena, all at once | 13 |
| An owned object | The owner, at the end of its scope | 17 |
| A counted object | The last pointer to go | 18–20 |
| A traced object | The collector, when it next finds it unreachable | 21–27 |

None of these answers is best. Each trades something: the programmer’s attention, the program’s speed, its memory, its pauses, its predictability. The art is knowing which trade a given program can afford.

## What to read next

- **The garbage collection handbook.** Richard Jones, Antony Hosking and Eliot Moss’s *The Garbage Collection Handbook* covers everything in Parts V and VI in depth, and much more :cite[jones2023].
- **The allocator survey.** Paul Wilson and his colleagues’ 1995 survey of dynamic storage allocation is long, readable, and still the best map of Part III’s territory :cite[wilson1995].
- **Systems, from the programmer’s side.** Bryant and O’Hallaron’s *Computer Systems: A Programmer’s Perspective* has the virtual-memory and dynamic-allocation chapters behind the malloc lab :cite[bryant2016].
- **Operating systems.** Remzi and Andrea Arpaci-Dusseau’s *Operating Systems: Three Easy Pieces*, free online, covers Parts I and II from the kernel’s side :cite[ostep].
- **The papers.** Every chapter’s references are collected in the bibliography, and the museum gathers the failures. Pick a collector from chapter 26, find its paper, and see how many of this course’s ideas you recognise.

:::key
One program touches every layer at once, and each layer has its own answer to “who frees it?”: hardware never frees, the kernel frees frames, `free` frees chunks, owners free at the end of scopes, counts free at zero, collectors free what is unreachable. The same ideas reappear in new places, from paged KV caches to WasmGC, and memory safety has become a matter of policy.
:::

:::whofrees
Now you know.
:::
