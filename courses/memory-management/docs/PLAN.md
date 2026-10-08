# Course plan: *Memory Management*

The working plan for the course: decisions, through-lines, curriculum, interactive components, the simulated
machine, the reader's code, milestones and risks. Update it when a decision changes or a chapter lands.

The course teaches how programs get memory and how it is given back, at every layer that decides it: the
hardware, the kernel, the allocator and the language runtime. It starts from bytes and addresses, builds up
virtual memory on RISC-V's Sv39 page tables, opens the kernel's frame allocators, has the reader write their
own `malloc`, breaks it with the classic memory errors, and then automates freeing with ownership, reference
counting and tracing garbage collection. Everything on screen runs on a machine, a kernel, a language and a
set of memory managers written for the course, in TypeScript in the browser. Every run is recorded as a
trace, so the course knows when each object was really last used and can show how close each strategy came.

## 1. Positioning

Several courses in the collection touch memory. None makes it the subject:

| Course | Question it answers |
|---|---|
| `courses/digital-circuits`: *Digital Circuits* | How is a bit stored (SRAM, DRAM, Ch. 20), and how does a CPU use a stack (Ch. 23)? |
| `courses/compiler-backends`: *SSA to Silicon* | How does a compiler lay out code, frames (Ch. 15) and data, and link them into an executable (Ch. 19–20)? |
| `courses/formal-verification`: *For All Inputs* | How do we prove that heap-manipulating code is memory-safe (Ch. 21–22)? |
| `courses/language-models`: *Language Models from Scratch* | Uses memory management without teaching it: tensor scopes (Ch. 8), the paged KV cache (Ch. 16) |
| **`courses/memory-management`: *Memory Management*** | **Who decides where each byte lives and when it can be reused (the hardware, the kernel, the allocator or the language runtime), how does each one decide, and what goes wrong when they decide badly?** |

How it differs from its neighbours:

- **Mechanism, not proof.** For All Inputs proves heap programs safe. This course builds the machinery that
  makes them run and shows what happens when it fails, then links there for the proofs.
- **Every layer, one question.** The kernel's frame allocator, `malloc`, a reference count and a garbage
  collector are taught as different answers to the same question: *who frees it?*
- **The reader builds the allocators.** The reader writes allocators, fault handlers and collectors in
  TypeScript against a simulated machine. Their code then powers later chapters' figures.

**Reader.** A software engineer who writes code professionally, in a garbage-collected language (Java, Go,
JavaScript, Python, C#) or in C, C++ or Rust. They have heard of the stack and the heap and know roughly what
a pointer is. No operating systems course is assumed, and no C is required: the reader writes TypeScript and
the course's small language, *Mote* (§8). C, C++, Rust, Swift and Java appear in *In the wild* callouts and
the Rosetta appendix, to be read, not written. Binary, hexadecimal and bit operations are taught in
appendix A.

**What this course is not.**

- It is not an operating systems course: scheduling, file systems and drivers are left out, and only the
  memory half of the kernel is built.
- It is not a C course.
- It is not an exploitation course. Memory errors are shown at the level of concepts, up to a use-after-free
  turning into type confusion inside the simulated machine, and no further (§2, *Security depth*).
- It is not a catalogue of every collector. Real allocators and collectors appear as simplified models,
  labelled as such, with the version they describe.

## 2. Decisions

*Agreed* rows were decided with the course owner on 2026-10-08. *Proposed* rows follow the collection's
conventions and stand unless changed at M0.

| Topic | Decision | Status | Notes |
|---|---|---|---|
| Title | **Memory Management** | agreed | Slug `memory-management`, published at `/memory-management/`. |
| Aim | Understand every layer that allocates and frees memory well enough to build a simple version of each, predict its costs and recognise its failures | proposed | Three parts: build it, measure it, break it. |
| Order | **Bottom-up** after a prologue: the machine, the process, `malloc`, memory errors, ownership, reference counting, tracing collection | agreed | Later layers need the earlier ones: copy-on-write after `fork` explains the Instagram exhibit (Ch. 5), guard pages explain stack overflow (Ch. 8), and page protection and virtual-memory tricks reappear in collectors (Ch. 23, 26). The prologue is a trailer for the whole course, as in the other courses. |
| Page tables | **RISC-V Sv39**, implemented from the privileged specification | agreed | Real and small: 39-bit virtual addresses, three levels of 512 entries, 4 KiB pages with 2 MiB and 1 GiB superpages, one PTE format. It matches the RV64 world of SSA to Silicon. Sv48 and x86-64's four-level tables appear in text only. §6 lists what is and is not modelled. |
| Reader's code | **TypeScript against a simulated `Heap` API** | agreed | The reader writes allocators, a page walker, fault handlers, replacement policies, reference-counting hooks, collectors and write barriers. Pointers are plain numbers in the simulated address space; every load and store goes through the simulated MMU. §7. |
| Security depth | **Concept level, up to use-after-free → type confusion** | agreed | Chapter 15 follows a dangling pointer into memory reused by an object of another type, inside the simulated machine, and stops when the program calls a function pointer chosen by the new object. No techniques against real allocators, no shellcode, no exploit recipes. Museum cards describe real CVEs from public advisories only. |
| The course language | **Mote** (working name): a small typed language with structs, nullable pointers, closures and arrays, compiled to a register VM whose frames and objects live in simulated memory | proposed | One program runs under every memory manager (the dial, §3 through-line 1). Optional `free` statements and ownership annotations are honoured only by the settings that use them. Full specification in `docs/MOTE.md` (M0). |
| Toolchain | **Our own machine, kernel, VM and memory managers in TypeScript**, in Web Workers, with no third-party runtime | proposed | This follows the collection's convention (kiln, DCL, Vouch, `hep`). §6–9. |
| Honest results | Each result says exactly what was established, with one shared set of **result badges** | proposed | *tests passed*, *heap checker passed on k traces*, *scored*, *no memory errors on this run*, *leak*, *use-after-free at event n (replayed)*, *every free was safe on this run*, *exhaustive for this heap size*, *self-reviewed*. Each expands into what was checked, how, and what was assumed. This applies CONTRIBUTING.md's rule that feedback must say what was established. |
| Real failures | **The museum**: historic failures, each re-enacted on the simulated machine in the chapter that explains it | proposed | §10. Re-enactments are simplified and labelled as such. Every claim is cited. |
| History | The evolution of the field is a through-line: part-opening essays, history cards and biographies in place, an interactive timeline | proposed | Same rules as For All Inputs: every date, attribution and quotation cited in the bibliography. |
| Site | SvelteKit 2 + Svelte 5, `adapter-static`, TypeScript 6, the Markdown-with-directives compiler copied from For All Inputs | proposed | Single npm package. Output in `dist/`, base path from `BASE_PATH`. TS 6 because `svelte-check` and the in-browser language service need its JS API. |
| Editor and runner | CodeMirror 6 with a TypeScript 6 language service in a worker; reader code transpiled with sucrase and run in a worker with a step and time budget | proposed | Copied from Language Models' exercise runner (`course/src/lib/exercise/`). Mote gets its own CodeMirror mode with diagnostics and hovers. |
| Rendering | SVG for page tables, object graphs and small heaps; Canvas 2D for large heap strips, heatmaps, timelines and pause charts; WebGL2 only for heap maps beyond Canvas's reach | proposed | Graph layout with ELK (elkjs, lazy-loaded in a worker) where a layered layout fits; a custom address-ordered layout for heaps. No charting libraries. Respect `prefers-reduced-motion`. |
| Sound | None | proposed | |
| LLM | None | proposed | As in For All Inputs. |
| Progress | `localStorage` for exercises, badges and settings; IndexedDB for the reader's TypeScript and Mote files; export and import as JSON | proposed | Drafts are saved before a run; results are invalidated on edit and bound to the submitted source. |
| Design | **"Core"**: magnetic core planes by day, an amber hex dump by night | proposed | §14. Shares the collection's `theme` key. |
| Language | British English | proposed | |

## 3. Through-lines

1. **Who frees it?** Every chapter ends with the answer at its layer: the hardware never frees; the kernel
   frees frames when a mapping goes or the process exits; `malloc` frees when told; ownership frees at the
   end of a scope; reference counting frees when the count reaches zero; a tracing collector frees what it
   cannot reach. Two devices make this concrete:
   - **The memory-manager dial.** Every Mote program can be run under any memory manager: manual, ownership,
     reference counting, reference counting with cycle collection, mark–sweep, mark–compact, copying,
     generational and incremental. Turn the dial and the same program runs again. A program's `free`
     statements run only under the manual setting; under the others they are drawn as ghost ticks, showing
     where the programmer guessed.
   - **The lifetime chart.** Below the program, each object gets a bar:

     ```
     born ──── first use ════ last use ┄┄┄┄┄┄┄┄┄┄ unreachable ┄┄┄┄┄┄ freed
                                       └ reachable but dead ┘└ collector lag ┘
     ```

     Because every run is recorded, the course knows each object's **last use** (the liveness oracle) and
     the moment it became **unreachable** (the reachability oracle, computed after the run with the Merlin
     algorithm of Hertz et al.). The time between last use and the free is *drag*, after Röjemo and
     Runciman's lag, drag and void. A free before the last use is a red **use-after-free**; a bar with no end
     is a **leak**. Every strategy in the course is a way of guessing the oracle, and the chart shows how
     close each guess comes. Exact liveness is undecidable (Ch. 21), which is why every strategy guesses.
     Bélády's optimal page replacement (Ch. 6) is the same oracle idea, applied to paging.

2. **Allocators all the way down.** DRAM rows hold frames; the kernel hands out frames with a buddy
   allocator; frames back pages; `mmap` and `brk` hand out pages; `malloc` carves pages into chunks; a
   collector's nursery bump-allocates objects into chunks. The same three questions recur at every layer:
   *how do I find space? how do I get it back? what bookkeeping do I keep, and where?* So do the same
   answers: free lists in the buddy allocator, slabs, `malloc` and the sweeper; bump pointers in the stack,
   arenas and nurseries; size classes in slabs and in `malloc`; copying in copy-on-write and in copying
   collectors. A **layer map** at the top of every chapter lights up the current layer and the layers it
   allocates from.

3. **Your allocator, everywhere.** When the reader's allocator passes the heap checker, it can power later
   figures: the heap inspector, the placement game's comparison, the error zoo, and the Mote runtime's
   manual and reference-counting settings. A *use my allocator* toggle switches between the reader's code
   and the reference implementation, so skipping an exercise never blocks a later chapter. This is Digital
   Circuits' parts bin and Language Models' *use my implementation*, applied to memory.

4. **The trace bank.** One trace format records allocations, frees, loads, stores and pointer writes (§9).
   Every allocator, replacement policy and collector replays the same workloads, so comparisons are fair.
   Some traces are recorded from real open-source programs, some are generated, and some come from Mote
   programs. Chapter 11 shows why random synthetic traces mislead.

5. **Be the machine first.** Before an engine runs, the reader does its job by hand: translating an address
   as the MMU (Ch. 3), choosing a page to evict (Ch. 6), placing blocks as the allocator (Ch. 11), marking and
   sweeping as the collector (Ch. 21), evacuating to to-space (Ch. 22), and playing the mutator that tries to
   hide an object from a concurrent marker (Ch. 25). Then the engine does it in milliseconds.

6. **The museum.** Historic memory failures, re-enacted where their mechanism is taught (§10).

7. **Cost is visible.** Every run reports simulated cycles from one documented cost model (§6): cache hits and
   misses, TLB misses and page walks, page faults, system calls. Every design is placed on the same triangle
   of **space**, **throughput** and **pause time**, and every locality claim (compaction, copying, size
   classes, fragmentation) is shown in the cache and TLB counters, not just asserted.

8. **Programmer's view.** Short callouts map ideas onto ones the reader already has:
   - a page table is a trie keyed by address bits;
   - the TLB is a cache with an invalidation problem;
   - copy-on-write is structural sharing, as in persistent data structures;
   - a free list is an intrusive linked list;
   - `malloc` with size classes is a map from size to a stack of addresses;
   - an arena is a vector you never pop from and clear all at once;
   - a weak reference is a cache key that does not keep its value alive;
   - marking is graph search, and Cheney's algorithm is breadth-first search whose queue is the to-space;
   - a write barrier is an observer on pointer writes;
   - a finaliser is a destructor whose timing you do not control.

9. **In the wild.** Callouts show how real systems do it, and where the course's version is simpler: Linux
   (page tables, overcommit, transparent huge pages, the OOM killer), glibc's malloc, jemalloc, TCMalloc,
   mimalloc, CPython, Swift, Rust, HotSpot, V8, Go, .NET, OCaml and the BEAM. Each names the version it
   describes.

10. **How we got here.** Each part opens with an essay of 800–1,500 words on how its ideas developed (outlines
    in §4), beside its slice of the timeline. History cards and biographies sit where each idea appears. Most
    ideas in the course are old; the essays say why each took the form it has now: a new machine, a new
    workload, a new language, or a disaster.

## 4. Curriculum

Chapters are roughly 1–1.5 hours each. Chapters marked ◇ are optional deeper chapters: the core path skips
them without losing anything later chapters need. *Reader does* lists the main hands-on work; `ts` exercises
are TypeScript against the simulated machine (§5).

### Prologue

| # | Chapter | Key ideas | Flagship interactive | Reader does |
|---|---|---|---|---|
| 0 | One allocation, all the way down | `new Point(1, 2)` followed through every layer; who frees it, at each layer; the course map | **Scroll-driven zoom**: a Mote line → the nursery's bump pointer → a heap page → the page-table walk → a physical frame → a cache line → a DRAM row. Then the dial: the same program under five memory managers, with the lifetime chart | Turn the dial and predict which setting frees the point first |

### Part I: The machine

| # | Chapter | Key ideas | Flagship interactive | Reader does |
|---|---|---|---|---|
| 1 | Bytes and addresses | Memory as an array of bytes; addresses and pointers as integers; words; endianness; alignment and padding; struct layout; the null page | **Byte explorer**: type a struct and see it laid out with padding; reorder fields to shrink it; hover any byte to see what it belongs to | Lay out structs and predict their sizes (`layout`) |
| 2 | The memory hierarchy | Registers, caches, DRAM; lines, sets and ways; spatial and temporal locality; the latency ladder; DRAM rows and refresh (bridge to Digital Circuits Ch. 20); disturbance errors | **Cache lens**: row-major against column-major traversal, and an array against a linked list, with a live cache heatmap and cycle counter | Predict which loop is faster; write a cache-friendly traversal (`ts`), scored in simulated cycles |
| 3 | Virtual memory | Why: isolation, relocation, sharing, more memory than is installed; base and bounds; segmentation, briefly; paging; the Atlas one-level store; Sv39: the address split, the three-level walk, PTE bits (V, R, W, X, U, G, A, D), `satp`; page faults as traps | **Be the MMU**: an address split into its bit fields and walked through three levels, each PTE decoded; flip a permission bit and predict the fault | Translate addresses by hand (`translate`); write `walk(satp, va)` reading PTEs from physical memory (`ts`) |
| 4 | The TLB | Caching translations; TLB reach; the cost of a miss; superpages; ASIDs, the global bit and `sfence.vma`; context switches; shootdowns, abstractly | **Reach game**: a stride slider and a page-size toggle; predict misses, then watch them. Museum: Meltdown and KPTI | Predict TLB misses; pick page sizes for three workloads |
| 5 | Page faults | The fault handler; demand-zero pages; file-backed `mmap`; `fork` and copy-on-write; swap; A and D bits; overcommit and the OOM killer | **Fork theatre**: parent and child page tables sharing frames; a write splits a page; frame reference counts update. Museum: Instagram and CPython's collector | Write the copy-on-write fault handler for the toy kernel (`ts`) |
| 6 | Choosing a victim | Replacement: FIFO, LRU, Clock (the A bit), OPT; Bélády's anomaly; working sets; thrashing; the page cache | **Replacement race** on one reference string. 🔮 *Does FIFO with more frames ever fault more?* (Yes: Bélády, Nelson and Shedler, 1969) | Implement Clock (`ts`); find a reference string that beats LRU |

*How we got here (Part I):* from the Atlas computer's one-level store (Kilburn et al., 1962) through Multics,
Bélády's study of replacement algorithms (1966) and Denning's working sets and thrashing (1968), to TLBs,
superpages and the page-table isolation forced by Meltdown (2018).

### Part II: The process

| # | Chapter | Key ideas | Flagship interactive | Reader does |
|---|---|---|---|---|
| 7 | Anatomy of an address space | Text, data, bss, heap, `mmap` region, stack; loading an ELF (bridge to SSA to Silicon Ch. 19–20); `brk` against `mmap`; shared libraries mapped once; ASLR; guard pages; the kernel half | **Address-space map**: a `/proc/self/maps` explorer for the toy process; an ASLR shuffle button | Say where an address lives and what touching it does |
| 8 | The stack | Frames (bridge to SSA to Silicon Ch. 15 and Digital Circuits Ch. 23); the cheapest allocator: bump and LIFO; `alloca`; stack overflow and the guard page; returning a pointer to a local; one stack per thread; canaries and non-executable stacks | **Stack stepper**: frames pushed and popped as bytes in simulated memory. Museum: the Morris worm | Find the dangling stack pointer (`debug`) |
| 9 | The kernel's allocators | Physical frames; the buddy system (Knowlton, 1965): splitting, coalescing, the free-area lists; the slab allocator (Bonwick, 1994): object caches, constructed state, colouring | **Buddy tree**: split and merge animated beside the free lists; slab caches filling and draining | Implement buddy allocation and freeing (`ts`) |

*How we got here (Part II):* from loaders and segments to ELF; from Knowlton's buddy system (1965) to
Bonwick's slab allocator (1994); ASLR from PaX (2001) to every mainstream kernel.

### Part III: malloc

| # | Chapter | Key ideas | Flagship interactive | Reader does |
|---|---|---|---|---|
| 10 | A heap from scratch | The `malloc` and `free` contract; bump allocation; implicit free lists; headers and boundary tags (Knuth, 1968); coalescing; alignment; `realloc`. **Reference chapter for M0** | **Heap inspector**: a byte-level view with headers, footers and free-list arrows; hover any byte to see what it is ("size field of the chunk at 0x40; low bit: previous chunk in use") | A bump allocator, then an implicit free list with coalescing (`ts`) |
| 11 | Fragmentation | Internal and external fragmentation; first, next and best fit; explicit and segregated free lists; Robson's worst-case bounds; Wilson et al.'s survey: fragmentation is a placement problem, and random traces mislead | **The placement game**: requests arrive and the reader places them in a one-row heap; the game ends when total free space is enough but no hole is; then first fit and best fit replay the reader's trace | Play; implement segregated fits (`ts`) |
| 12 ◇ | Fast allocators | Size classes; slabs in user space; thread caches and central heaps; false sharing; giving memory back (`madvise`); dlmalloc, glibc's ptmalloc, Hoard, TCMalloc, jemalloc, mimalloc's free-list sharding | **Contention view**: simulated threads allocating through one lock, then through thread caches, with lock wait drawn as lanes | Put a thread cache in front of your allocator (`ts`) |
| 13 | Arenas, pools and regions | Bump-and-reset; per-frame allocators in games; compiler arenas; fixed-size pools; tensor scopes (bridge to Language Models Ch. 8); fixed budgets in embedded systems | **Arena timeline**: a game loop's per-frame garbage, freed one object at a time and then all at once. Museum: Apollo 11's 1201 and 1202 alarms; Spirit's flash anomaly | Write an arena with marks and reset (`ts`) |
| 14 | The malloc lab (project) | Putting it together: a complete allocator, scored on the trace bank for utilisation and throughput; the heap checker; reading the scoreboard | **Lab bench**: editor, trace picker, heap inspector, checker, and a scoreboard against the reference allocators | Write your own allocator (`ts`, project; optional extensions with a stopping point) |

*How we got here (Part III):* from Knuth's boundary tags (1968) to Doug Lea's malloc (1987), Wilson,
Johnstone, Neely and Boles's survey (1995), and the multicore allocators: Hoard (2000), TCMalloc, jemalloc
(2006) and mimalloc (2019).

### Part IV: When manual management goes wrong

| # | Chapter | Key ideas | Flagship interactive | Reader does |
|---|---|---|---|---|
| 15 | The error zoo | Use-after-free, double free, heap overflow, over-read, leak, uninitialised read, invalid free; how each corrupts allocator metadata; 🔮 a double free makes `malloc` return the same address twice; concept level: a use-after-free becomes type confusion when the memory is reused for another type, ending at a function pointer the new object controls | **The zoo**: each error reproduced on the reader's allocator (or the reference one), with the corrupted metadata highlighted. **Type confusion, step by step** in the simulated machine. Museum: zlib's double free, Heartbleed, Chrome's FileReader use-after-free, the memory-safety statistics | Find the event and the kind of each error (`debug`) |
| 16 | Catching them | Guard pages (Electric Fence); Valgrind's Memcheck; AddressSanitizer: shadow memory (one shadow byte per eight bytes), redzones and quarantine; hardened allocators and glibc's safe-linking; memory tagging (Arm MTE); capabilities (CHERI) | **Sanitiser goggles**: replay the zoo under each detector and see what it catches, when, and at what cost in memory and cycles | Wrap your allocator with redzones and a quarantine (`ts`) and catch the zoo |
| 17 | Ownership | RAII and destructors; unique ownership and moves; Rust's ownership and borrowing; drop order; lifetimes; regions (Tofte and Talpin; MLKit; Cyclone); escape analysis and stack allocation | **Lifetime bars**: a Mote program under the ownership setting, owners and borrows drawn as bars over the code; a rejected program explained. Bridge to For All Inputs Ch. 21–22 for the proofs | Fix Mote programs the ownership checker rejects (`mote`); predict drop order |

*How we got here (Part IV):* from the Morris worm (1988) to Valgrind (early 2000s), AddressSanitizer
(2012), CHERI and memory tagging; from Tofte and Talpin's regions and Cyclone to Rust 1.0 (2015); and the
memory-safety policy turn of 2022–24.

### Part V: Reference counting

| # | Chapter | Key ideas | Flagship interactive | Reader does |
|---|---|---|---|---|
| 18 | Counting references | Collins (1960); increments and decrements on pointer writes; cascading frees and the deep-cascade problem, solved with a work list; reference counting in CPython, Swift and Objective-C, `shared_ptr`, `Rc` and `Arc`, COM, and hard links in file systems | **RC stepper**: counts change on each pointer write; a decrement to zero frees a whole structure | Implement the reference-counting hooks (increment, decrement, cascade) on top of your allocator (`ts`) |
| 19 | Cycles | Cyclic garbage; weak references (Swift's `weak` and `unowned`, Python's `weakref`); trial deletion (Martínez, Wachenchauzer and Lins, 1990; Bacon and Rajan, 2001); CPython's cycle collector; backup tracing | **Trial deletion**: subtract internal references and watch what reaches zero. Museum: Instagram, from the collector's side | Break a cycle with a weak reference (`mote`); implement trial deletion (`ts`) |
| 20 ◇ | Fast reference counting | The cost of counting every pointer write; deferred reference counting (Deutsch and Bobrow, 1976); coalescing; atomic counts and contention; biased reference counting (Choi, Shull and Torrellas, 2018) and free-threaded CPython; immortal objects; Perceus and in-place reuse (Lean 4, Koka) | **Count counter**: one program, its count operations under naive, deferred, coalesced and biased schemes. **Reuse**: a functional map updated in place when its count is one | Predict the operations saved; implement a zero-count table for deferred counting (`ts`) |

*How we got here (Part V):* from Collins (1960) and Deutsch and Bobrow (1976) through Smalltalk,
Objective-C and Swift's ARC, CPython's cycle collector, to Perceus (2021) and reference counting's return in
high-performance hybrids such as LXR (2022).

### Part VI: Tracing garbage collection

| # | Chapter | Key ideas | Flagship interactive | Reader does |
|---|---|---|---|---|
| 21 | Reachability | Roots and the object graph; mark–sweep (McCarthy, 1960); the tricolour abstraction; mark stacks and their overflow; lazy sweeping; reachability against liveness, and why exact liveness is undecidable (bridge to Incompleteness Ch. 6) | **Be the collector**: mark from the roots by clicking, then sweep; the engine replays the same heap. The lifetime chart's two oracle lines explained | Write mark and sweep against the object-graph API, sweeping into your free list (`ts`) |
| 22 | Moving collectors | Mark–compact (sliding, two-finger); semispace copying (Fenichel and Yochelson, 1969); Cheney's algorithm (1970): the to-space is the queue; forwarding pointers; bump allocation for free; locality after copying; the cost of half the heap | **Cheney's fingers**: the scan and free pointers moving through to-space, forwarding pointers left behind, with cache counters before and after | Write Cheney's collector (`ts`) |
| 23 | Generations | The weak generational hypothesis, measured on the trace bank; nursery and promotion (Lieberman and Hewitt, 1983; Ungar, 1984); write barriers; card tables and remembered sets; thread-local allocation buffers. 🔮 *Remove the write barrier: what happens to a young object referenced only from an old one?* | **Generations**: the heap in bands, minor and major collections, remembered-set arrows; a barrier toggle that frees a reachable object (caught by the oracle) | Implement a card-marking write barrier (`ts`); predict promotion rates |
| 24 | Finding roots | Precise and conservative collection; stack maps and safepoints (bridge to SSA to Silicon Ch. 11 and 15); shadow stacks; Boehm–Demers–Weiser (1988); interior pointers; false retention; pinning | **Stack-map viewer**: Mote VM code with safepoints and the live pointer slots at each. **Conservative scan**: integers mistaken for pointers keep garbage alive | Write a conservative stack scanner (`ts`); find a false retention (`debug`) |
| 25 | Concurrent and incremental collection | Mutator and collector interleaved; the lost-object problem and its two conditions; strong and weak tricolour invariants; insertion barriers (Dijkstra et al., 1978; Steele, 1975) and deletion or snapshot-at-the-beginning barriers (Yuasa, 1990); read barriers (Baker, 1978) and forwarding (Brooks, 1984); pause times and minimum mutator utilisation (Cheng and Blelloch, 2001); Metronome | **The adversarial mutator**: the reader rearranges pointers to hide an object from the marker, until a barrier stops them. An exhaustive interleaving check of each barrier on small heaps (bridge to For All Inputs Ch. 2) | Play; implement a barrier the explorer cannot break (`ts`) |
| 26 | Collectors in the wild | HotSpot's Serial, Parallel, G1, ZGC (coloured pointers; its first version mapped the heap at several virtual addresses) and Shenandoah; Go's concurrent mark–sweep and pacer; V8's Orinoco; .NET; OCaml 5; the BEAM's per-process heaps; Immix and LXR; tuning heap size against throughput and pauses | **GC dashboard**: one workload under simplified models of each design, with a heap-size slider, a pause timeline, a mutator-utilisation curve and throughput. Museum: Discord's latency spikes | Meet a pause target with the least memory (`tune`) |
| 27 ◇ | Finalisers, weak references and ephemerons | Finalisation and resurrection; ordering and timing; Java's deprecation of `finalize`; soft, weak and phantom references; ephemerons (Hayes, 1997); JavaScript's `WeakMap`, `WeakRef` and `FinalizationRegistry` | **Resurrection**: a finaliser stores `this` in a global and the object comes back | Predict what is collected; build a cache with weak references (`mote`) |

*How we got here (Part VI):* McCarthy's mark–sweep (1960); Minsky's copying to secondary storage (1963),
Fenichel and Yochelson (1969) and Cheney (1970); Baker (1978) and Dijkstra et al. (1978); generations (1983–84);
Boehm and Weiser (1988); then Metronome (2003), Garbage-First (2004), Immix (2008), ZGC and Shenandoah, and LXR
(2022).

### Epilogue

| # | Chapter | Key ideas | Flagship interactive |
|---|---|---|---|
| 28 | All the way down, and back up | The prologue's allocation revisited with every layer open; the same ideas in new places: the paged KV cache (bridge to Language Models Ch. 16) and WasmGC (bridge to SSA to Silicon Ch. 21); memory safety as policy (the NSA, CISA and White House reports of 2022–24; Android's falling share of memory-safety bugs); what to read next | **Full-stack replay**: one Mote program with every layer open at once (object, chunk, page, frame, cache line) on one synchronised timeline |

**Appendices.**

- A. Primer: binary, hexadecimal, bit operations, powers of two, pointers.
- B. The machine and its kernel: what they model and what they do not (the honesty page, like Proofcraft's
  appendix B).
- C. Sv39 reference card: address split, PTE format, `satp`, fault causes.
- D. The `Heap` API and the memory-manager interface.
- E. Mote reference.
- F. The museum.
- G. Rosetta: one linked structure built and dropped in C, C++, Rust, Swift, Python, Java, Go and JavaScript,
  and who frees it in each.
- H. Glossary, timeline and bibliography.

**Reading paths** (shown on the home page's course map):

- *I write C, C++ or Rust*: 0 → 1–2 → 7–8 → 10–11 → 13–17.
- *I write Java, Go, JavaScript or Python*: 0 → 1–2 → 10 → 18–19 → 21–26.
- *Operating systems*: 0 → 1–9 → 12.
- *Language implementers*: 0 → 10–11 → 18–27.

## 5. Interactive components

### Cross-cutting

| Component | What it does |
|---|---|
| **The dial and the lifetime chart** | Through-line 1. Runs a Mote program under any memory manager the chapter allows; draws each object's bar with its oracle lines, ghost ticks for unexecuted `free`s, red use-after-frees and open-ended leaks. Hover a bar to see its object; click to jump to the event in the replay |
| **Layer map** | Through-line 2. A compact strip at the top of each chapter: DRAM → frames → pages → chunks → objects, with the current layer lit |
| **Heap inspector** | Byte-level view of a heap. Uses the reader's optional `chunks()` hook (§7) to draw their layout; otherwise shows payloads from the checker's records and raw bytes. Hover explains every byte |
| **Replay** | Every run is a trace; every widget can scrub through it, forwards and backwards, with the machine state (page tables, TLB, caches, heap, object graph) at each event |
| **Result badge** | The one way any result is reported (§2, *Honest results*) |
| **Cost meter** | Simulated cycles broken down by cause (cache, TLB, page walks, faults, system calls, barriers), and the space–throughput–pause triangle |
| **Workbench** (full page and inline) | TypeScript and Mote editors with diagnostics, a trace picker, the heap inspector, the checker and the scoreboard |
| **Timeline**, **biography cards**, **museum page** | As in For All Inputs: one lane per layer (hardware, kernels, allocators, safety, reference counting, tracing collection), every card cited |
| **Course map** | Chapters as a graph with layer icons and the four reading paths |
| Terms, equations, history cards, glossary, bibliography | Ported from For All Inputs' compiler and components |

### Exercise types (fenced YAML blocks, as in the other SvelteKit courses)

| Type | The reader… | Checked by (the exercise contract) |
|---|---|---|
| `quiz`, `predict` | predicts before a figure answers | answer key |
| `layout` | gives field offsets and sizes for a struct | the layout engine |
| `translate` | translates an address by hand, level by level | each step against the MMU |
| `ts` | writes TypeScript against the simulated machine (an allocator, a handler, a policy, a collector) | visible and hidden tests in the worker harness, plus the exercise's contract: for allocators, the heap checker on the named traces and the storage rule (§7); for collectors, the safety and completeness oracles (§8) |
| `play` | plays the MMU, the allocator, the collector or the adversarial mutator | the game reaches its target state |
| `debug` | finds the event and kind of a memory error in a Mote program or a trace | the oracle's record of the run |
| `mote` | writes or fixes Mote code to run correctly under a given setting | runs under that setting: expected output, no memory errors, no leak at exit, and (for ownership) the checker accepts it |
| `tune` | chooses a collector's parameters to meet targets | the workload run under those parameters |
| `parsons`, `bug` | orders steps; spots the flaw in a design or a trace | answer key |

All exercises save drafts before a run. Feedback always names what was established. Each `ts` exercise's
reference solution must pass and its starter must fail, checked at build time.

## 6. The simulated machine (`src/lib/mm/machine`, `src/lib/mm/kernel`)

**Physical memory.** A byte array divided into 4 KiB frames, sized per figure: a few dozen frames where every
frame is drawn, tens of megabytes for scoring.

**The MMU.** Sv39, following the RISC-V privileged specification:

- `satp` with MODE = 8 (Sv39), an ASID and the root page-table PPN;
- virtual addresses of 39 bits, sign-extended; the split into VPN[2], VPN[1], VPN[0] and a 12-bit offset;
- the specification's page-walk algorithm over real 64-bit PTEs stored in simulated physical memory, with
  leaves at any level (4 KiB pages, 2 MiB megapages, 1 GiB gigapages) and the misaligned-superpage check;
- permissions R, W, X and U, with `sstatus.SUM` for supervisor access to user pages;
- A and D bits under either behaviour the specification allows, switchable: a page fault when a bit must be
  set (Svade) or a hardware update (Svadu, the default);
- instruction, load and store/AMO page faults (causes 12, 13 and 15) delivered to the kernel's handler.

Not modelled: machine mode, PMP, the hypervisor extension, Svnapot, Svpbmt, Sv48 and Sv57 (Sv48 appears in
text). Appendix B says so.

**The TLB.** Configurable size and associativity, ASID-tagged, honouring the G bit, flushed with
`sfence.vma` semantics (all, by ASID, by address). Shootdowns between simulated harts are modelled as a
cost.

**Caches.** Set-associative, physically indexed, LRU, write-back, with configurable levels, sizes and line
size: small in figures so every line can be drawn, realistic when scoring.

**The cost model.** Each event has a cost in simulated cycles: cache hits and misses at each level, TLB
misses, page-walk steps, faults, system calls, lock waits, barrier executions. The parameters are shown on
screen and taken from published measurements of a contemporary core, cited. Simulated cycles make scores
deterministic and comparable across readers' machines. The model is a teaching model, not a predictor of
real performance, and appendix B says how it differs.

**The toy kernel.** A hosted kernel in TypeScript (not RISC-V code) that owns the machine:

- processes and address spaces as lists of virtual memory areas;
- the page-fault handler: demand-zero, file-backed, copy-on-write and swap, each replaceable by the reader's
  `ts` exercise in Chapters 5 and 6;
- physical frames from a buddy allocator, kernel objects from slab caches (Chapter 9, replaceable);
- system calls: `brk`, `mmap`, `munmap`, `mprotect`, `madvise`, `fork`, `exit`;
- replacement policies and a swap device; overcommit and an OOM killer;
- seeded ASLR.

**Threads.** Simulated threads are interleaved deterministically by a seeded scheduler in one worker, and drawn
as lanes. This is enough for contention (Ch. 12) and concurrent collection (Ch. 25). Real parallelism is not
modelled.

## 7. The `Heap` API and the malloc lab (`src/lib/mm/heap`, `src/lib/mm/check`)

What the reader's allocator sees (illustrative; the final API is fixed at M0 and documented in appendix D):

```ts
/** Addresses are plain numbers in the process's virtual address space. Every access goes through the MMU. */
export interface Heap {
  load8(addr: number): number;
  load32(addr: number): number;
  load64(addr: number): number; // values up to 2^53 − 1: enough for any Sv39 address or size
  store8(addr: number, value: number): void;
  store32(addr: number, value: number): void;
  store64(addr: number, value: number): void;
  sbrk(bytes: number): number; // the old break, or -1
  mmap(bytes: number): number; // a page-aligned address, or -1
  munmap(addr: number, bytes: number): void;
  readonly pageSize: number; // 4096
}

export interface Allocator {
  malloc(size: number): number; // a 16-byte-aligned payload address, or 0
  free(ptr: number): void;
  realloc?(ptr: number, size: number): number;
  /** Optional: lets the heap inspector draw your chunks. */
  chunks?(): Iterable<{ addr: number; size: number; free: boolean }>;
}

export function createAllocator(heap: Heap): Allocator;
```

**The storage rule.** Allocator metadata must live in simulated memory. As in the CS:APP malloc lab (Bryant
and O'Hallaron), only scalar module-level variables are allowed: the contract rejects arrays, maps, sets,
typed arrays and growing objects in allocator code, checked on the TypeScript syntax tree. This keeps
utilisation honest, and it is the point of the exercise: the bookkeeping has to fit in the heap.

**The heap checker.** Independent of the allocator, it tracks every returned block and checks: alignment;
blocks inside memory obtained from the kernel; no overlap between live blocks; payloads intact (it fills
each payload with a pattern and verifies it at `free` and `realloc`, which catches metadata written into
live blocks); `realloc` preserving contents. A failure is reported with the operation number and replayed.
The checker is mutation-tested against sabotaged allocators (§13).

**The scoreboard.** Utilisation (peak live payload over peak heap footprint) and throughput (simulated cycles
per operation), reported separately and combined into one index with its weights shown, over a named set of
traces. The comparison is local: the reader against the reference allocators, with no server.

**Reference allocators**, each small, documented, and labelled *in the style of* when it models a real one:
bump; implicit list; explicit list; segregated fits; buddy; a dlmalloc-style allocator; a jemalloc-style
size-class allocator with thread caches; a mimalloc-style sharded allocator; arenas and pools.

## 8. Mote and the memory-manager dial (`src/lib/mm/mote`, `src/lib/mm/managers`)

**The language** (sketch; the full specification goes in `docs/MOTE.md` at M0):

```mote
struct Node {
  value: int
  next: Node?            // nullable pointer
}

fn push(head: Node?, v: int) -> Node {
  return new Node { value: v, next: head }
}

fn main() {
  var list: Node? = null
  for i in 0..1000 {
    list = push(list, i)
    if i % 10 == 0 {
      let old = list!
      list = old.next
      free(old)          // runs under the manual setting; a ghost tick under the others
    }
  }
}
```

Structs, nullable pointers, arrays, closures (function values stored in fields, which Chapter 15's type
confusion needs) and integers. No semicolons, strict typing, error messages written for learners, hover
explanations on every construct, as in DCL and Vouch. Optional ownership annotations (moves and borrows)
are checked only by the ownership setting, which accepts a restricted fragment and explains every rejection.
The full borrow checker is For All Inputs' subject, not this course's.

**The VM.** Mote compiles to a register bytecode. Frames live on the simulated stack and objects in the
simulated heap, laid out as real bytes with headers, so Chapters 8 and 24 show genuine frames and Chapter 15
shows genuine reuse. The compiler records a stack map at every safepoint (calls, allocations and loop back
edges), which precise collectors use and conservative ones ignore.

**The manager interface.** Every memory manager implements one interface: allocate an object of a type, free
(manual only), pointer-write and pointer-read hooks (barriers and count updates), safepoint and collect,
given the roots. Managers:

| Setting | Implementation | First taught |
|---|---|---|
| manual | `malloc` and `free` on the reference allocator or the reader's | Ch. 10, 15 |
| ownership | drops inserted by the ownership checker at the end of each owner's scope | Ch. 17 |
| rc | naive, deferred, coalesced, biased variants | Ch. 18, 20 |
| rc + cycles | trial deletion | Ch. 19 |
| mark–sweep | precise or conservative roots | Ch. 21, 24 |
| mark–compact | sliding | Ch. 22 |
| copying | Cheney semispaces | Ch. 22 |
| generational | copying nursery, mark–sweep old generation, card table | Ch. 23 |
| incremental | tricolour marking interleaved with the mutator, with Dijkstra, Steele or Yuasa barriers, or none | Ch. 25 |

Simplified models of named production collectors (G1, ZGC, Go, V8 and others) are configurations of these
pieces plus a pacing policy, used only in Chapter 26's dashboard and labelled as models.

**The oracles.** Every run records allocations, every load and store to each object, and every pointer
write. Afterwards the course computes each object's last use and the moment it became unreachable (Merlin
algorithm). Two checks run on every managed run: **safety**, that nothing reachable was freed, and, for
precise full collections, **completeness**, that nothing unreachable survived. A *debug* exercise's answer,
a collector exercise's contract and the lifetime chart all read from the same record.

**The interleaving explorer** (Ch. 25). An exhaustive search over interleavings of mutator and collector
steps on heaps of up to four or five objects, reporting the lost object as a replayable trace, or *exhaustive
for this heap size* when there is none. It is deliberately small, and the chapter links to For All Inputs for
model checking proper.

## 9. The trace bank (`content/traces/`, `src/lib/mm/trace`)

One format: a header (provenance, seed or recording details) and a stream of events: `alloc(id, size,
site)`, `free(id)`, `realloc(id, size)`, `load(id, offset)`, `store(id, offset)`, `ptr(src, field, dst)`,
`root(push or pop)`, `tick`. Allocator traces use the first five; managed traces use all of them.

- **Recorded** from open-source programs through an `LD_PRELOAD` shim that logs `malloc`, `free` and
  `realloc` (outside CI, like SSA to Silicon's validation scripts). Candidates, picked at M3: a C compiler, a
  JSON processor, a database engine running a benchmark. Each trace states its program, version, input,
  licence and what was simplified (for example, threads serialised). Compressed and committed.
- **Generated** by seeded generators: build-up and tear-down phases, producer–consumer, uniform random sizes
  (Chapter 11's counterexample), and adversarial sequences in the spirit of Robson's bound.
- **From Mote programs**: a JSON parser, binary trees in the style of Boehm's GCBench, an LRU cache, a game
  loop with per-frame garbage, a compiler pass building and dropping an AST, a doubly linked list.

## 10. The museum

Each exhibit has a history card with citations and a re-enactment on the simulated machine, labelled with
what it simplifies. The museum page records which exhibits the reader has visited.

| Exhibit | Year | Chapter | What the re-enactment shows |
|---|---|---|---|
| Apollo 11's program alarms 1201 and 1202 | 1969 | 13 | The guidance computer's executive ran out of VAC areas (1201) and core sets (1202), fixed pools allocated per job; restart as recovery |
| The Morris worm and `fingerd` | 1988 | 8 | A stack buffer overflow overwrites a return address, on the simulated stack |
| zlib 1.1.3's double free (CVE-2002-0059) | 2002 | 15 | A double free corrupts the free list |
| Spirit's flash anomaly, sol 18 | 2004 | 13 | Memory needed for a file system's directory grows with stored files until it exceeds a fixed RAM budget; a reboot loop |
| Heartbleed (CVE-2014-0160) | 2014 | 15, 16 | An over-read returns neighbouring heap contents; redzones catch it. (Also an exhibit in For All Inputs, where abstract interpretation raises an out-of-bounds alarm) |
| Rowhammer | 2014–15 | 2, 3 | Disturbance errors flip DRAM bits (Kim et al., 2014); Project Zero's exploit flipped a PTE so that a process could map its own page table (Seaborn and Dullien, 2015). Described, with the PTE flip shown in the MMU figure; not exploited |
| Instagram and CPython's collector | 2016–17 | 5, 19 | Collections write to every tracked object's header, turning copy-on-write pages shared after `fork` into private copies; `gc.freeze()` as the fix |
| Meltdown and KPTI | 2018 | 4 | The kernel half of every address space; page-table isolation and its TLB cost; ASIDs to win some of it back |
| Chrome's FileReader use-after-free (CVE-2019-5786) | 2019 | 15 | Concept level only: a dangling pointer into memory reused by an object of another type |
| Discord's latency spikes | 2020 | 26 | Periodic forced collections of a large, mostly static heap |
| How many vulnerabilities are memory-safety bugs | 2019–24 | 15, 28 | Statistics, not re-enactments: about 70% of Microsoft's CVEs (Miller, 2019) and of Chromium's serious security bugs; Android's share falling from 76% to 24% as new code moved to memory-safe languages (Google, 2024) |

## 11. Chapter template

Hook (a museum exhibit or a history card) → 🔮 predict → explore (the flagship) → explain → ✍️ build (a `ts`
exercise, a game or a Mote task) → 🐞 break it (a memory error or an adversarial input) → ⚙️ under the hood
(how the simulator does it, with an excerpt of the real code) → 🏭 in the wild → 🗑️ who frees it? → what's
next → further reading.

Standards per chapter:

- 2,500–5,000 words, in named sessions with a natural stopping point.
- One flagship interactive, plus 2–4 smaller figures.
- At least one *predict* question, placed where intuition is usually wrong.
- At least one hands-on activity (`ts`, `play`, `debug`, `mote` or `tune`). A chapter's exercise must reveal
  its central idea (CONTRIBUTING.md); mechanics outside the goal are scaffolded.
- A *Who frees it?* box with the chapter's entry on the lifetime chart.
- At least one history card or museum exhibit, cited, where its idea appears; biographies for the people
  whose idea the chapter is built on.
- An *Under the hood* box wherever the simulator does something non-trivial.
- Every Mote snippet carries its expected output and is checked in tests.
- Each part opener: a *How we got here* essay of 800–1,500 words with its slice of the timeline.

## 12. Bridges with other courses

| This course | Elsewhere |
|---|---|
| Ch. 0, 2: DRAM rows, refresh and leakage | Digital Circuits Ch. 20 (memory) |
| Ch. 7: loading an executable | SSA to Silicon Ch. 19–20 (object files, linking and running) |
| Ch. 8: frames and the stack | SSA to Silicon Ch. 15 (frames); Digital Circuits Ch. 23 (Octet's stack and calls) |
| Ch. 13: arenas and scopes | Language Models Ch. 8 (tensor scopes) |
| Ch. 15: Heartbleed | For All Inputs Ch. 26 (the same exhibit, caught by interval analysis) |
| Ch. 17: ownership | For All Inputs Ch. 21–22 (separation logic; ownership as permission accounting) |
| Ch. 21: liveness is undecidable | Incompleteness Ch. 6 (computability) |
| Ch. 24: stack maps and safepoints | SSA to Silicon Ch. 11 (liveness) and Ch. 15 (frames) |
| Ch. 25: barriers checked over every interleaving | For All Inputs Ch. 2 (interleavings) |
| Ch. 28: paged KV cache; WasmGC | Language Models Ch. 16 (inference); SSA to Silicon Ch. 21 (WebAssembly) |

Each bridge is a `:::bridge{course=… chapter=…}` callout that links to the exact chapter and says in one
sentence what the reader will find there. At integration (M8) the bridged courses get reciprocal links,
added with each course's own conventions and checked by its tests.

## 13. Architecture and quality gates

```
courses/memory-management/
  docs/               PLAN.md, MOTE.md, AUTHORING.md
  content/            outline.ts; parts/<n>-<slug>/index.md (the *How we got here* essays);
                      chapters/<nn>-<slug>/{index.md, widgets/*.svelte, *.mote};
                      appendices; traces/ (the trace bank, with provenance);
                      museum, timeline, glossary, bibliography, terms and bios as YAML
  src/lib/mm/         the toolchain: pure TypeScript, no DOM (it runs in workers and under Vitest)
    machine/          physical memory, Sv39 MMU, TLB, caches, cost model, event bus
    kernel/           address spaces, fault handler, buddy and slab, system calls, replacement, swap, ASLR
    heap/             the Heap API and the reference allocators
    check/            heap checker, storage rule, oracles (last use, Merlin), safety and completeness checks
    trace/            format, recorder, replayer, generators, metrics
    mote/             lexer, parser, type checker, ownership checker, compiler, VM, stack maps
    managers/         manual, ownership, rc (variants), cycles, mark–sweep, mark–compact, copying,
                      generational, incremental, conservative roots
    explore/          the interleaving explorer (Ch. 25)
  src/lib/exercise/   editor, TypeScript service and worker harness (copied from Language Models)
  src/lib/components/ dial, lifetime chart, layer map, heap inspector, replay, badges, cost meter, layout
  src/lib/widgets/    the flagship interactives
  tools/markdown/     Markdown → Svelte compiler (copied from For All Inputs)
  scripts/            trace recording and Sv39 validation (outside CI)
```

Quality gates (Vitest, deterministic with seeded randomness, and in
`.github/workflows/memory-management.yml`):

- **MMU:** property tests on random page tables and addresses against a direct transcription of the
  specification's walk algorithm (translations, permissions, superpage alignment, fault causes); golden tests
  for every figure. Outside CI, `validate:sv39` compares walks and fault causes with Spike or QEMU on the same
  page tables.
- **Kernel:** invariants after every system call: a frame is never both free and mapped; each frame's
  reference count equals the PTEs mapping it plus the page cache's references. Property test for
  copy-on-write: random writes after `fork`, and each process sees only its own.
- **Allocators:** every reference allocator passes the heap checker on the whole bank and on fuzzed traces.
  The checker catches every sabotaged allocator (overlap, misalignment, metadata in payloads, lost
  `realloc` contents).
- **Managers:** every Mote program in the course produces the same output under every setting that accepts
  it. Safety holds on every run of every manager; completeness holds after every precise full collection;
  reference counting with trial deletion leaves no garbage at exit. The explorer finds the lost object with
  no barrier and none with each correct barrier.
- **Exercises:** every `ts` exercise's reference solution passes and its starter fails; every `debug`
  exercise's error is found at the stated event; every `mote` exercise's solution runs under its setting.
- **Content:** every chapter compiles; every Mote snippet yields its annotated output; every timeline event,
  museum exhibit and biography has a bibliography key that resolves; every internal link resolves.
- `npm run check` (svelte-check, 0 errors) and `npm run build`; the root audit and the navigation browser
  checks.

Performance targets, measured at M1 and M3 and adjusted then:

- At least 5 million heap loads and stores per second through the MMU fast path in a worker.
- The malloc lab's default trace set scored in under 10 seconds.
- The Mote VM at 10 million bytecode steps per second with the trivial manager.

**Decision point (M3):** if the TypeScript fast path cannot meet the first target, the scoring runs switch
off the cache model (keeping TLB and fault costs) and say so on the badge; moving the machine's hot path to
Rust compiled to WebAssembly behind the same interface is the fallback, as other courses planned.

## 14. Look and feel: "Core"

By day, the warm paper of a 1960s programming manual: part headers decorated with a magnetic core plane (rings
threaded on a grid of wires), ink-blue text, copper accents. By night, an amber hex dump on near-black, like a
phosphor terminal. Addresses and bytes are set in JetBrains Mono (shared with the collection); the display and
prose faces are chosen with the M0 mockups and must differ from the other courses'.

One encoding in every figure, with shape and label as well as colour:

- allocated: filled;
- free: empty with a hatched border;
- metadata: grey, with a header glyph;
- garbage: faded, with a dashed outline;
- use-after-free: red, with a ✗;
- leak: an open-ended bar with an arrowhead;
- pointers: arrows with a dot at the source;
- tricolour marking: white, grey and black drawn as empty, half-filled and filled, labelled W, G and B, so
  they read the same in both themes.

The collection index card shows a strip of hex dump with one chunk header highlighted, a free-list arrow
looping back, and one lifetime bar with its drag marked.

Accessibility: every widget is keyboard-operable; live values are exposed to screen readers; colours meet
WCAG contrast in both themes; animation is optional and respects `prefers-reduced-motion`; layouts work at
360 px.

## 15. Integration with the collection

- **Root `README.md`:** a row in the course table and the install line.
- **`scripts/build.mjs`:** build with `BASE_PATH=<base>/memory-management` and copy to
  `dist/memory-management/`.
- **`.github/workflows/deploy.yml`:** `npm ci` and the lockfile cache path.
- **`.github/workflows/memory-management.yml`:** tests, check and build on changes under
  `courses/memory-management/`.
- **`site/index.html` and `site/styles.css`:** the course card under *Computer systems* (marked *in progress*
  until M8), and the course count in the copy and meta description.
- **Theme:** the shared `theme` key in `localStorage`.

## 16. Milestones

| | Milestone | Contents |
|---|---|---|
| M0 | Plan and foundations | This plan agreed; `docs/MOTE.md` (syntax, types, VM, manager interface); `docs/AUTHORING.md`; scaffold copied from For All Inputs, with Language Models' exercise runner; "Core" mockups; the `Heap` API fixed; **Chapter 10 as the reference chapter** (heap inspector, a `ts` exercise, the checker, a history card) |
| M1 | The machine | Physical memory, the Sv39 MMU, TLB, caches and cost model; the replay component; benchmarks against §13's targets; Chapters 1–4 and the Part I essay |
| M2 | The kernel and Part II | Faults, copy-on-write, `mmap`, swap, replacement, buddy and slab; Chapters 5–9 and the Part II essay; wired into the collection as *in progress* |
| M3 | malloc | Reference allocators, the heap checker and storage rule, the trace format, recorder and bank; the placement game; the lab bench and scoreboard; Chapters 11–14 and the Part III essay; **performance decision** (§13) |
| M4 | Mote | Language, ownership checker, VM and stack maps; manual and ownership settings; the dial and lifetime chart with the oracles; Chapters 15–17 and the Part IV essay |
| M5 | Reference counting | The rc settings and trial deletion; Chapters 18–20 and the Part V essay |
| M6 | Tracing collection I | Mark–sweep, mark–compact, copying, generational, conservative roots; Chapters 21–24 and the Part VI essay |
| M7 | Tracing collection II | Incremental collection, barriers and the explorer; the collector models and the dashboard; Chapters 25–27 |
| M8 | Epilogue and finish | Chapters 0 and 28; appendices; the museum page and the full timeline reviewed for coverage and citations; accessibility, mobile and reduced-motion pass; reciprocal links in the bridged courses; *in progress* removed |

## 17. Risks

- **Speed.** Every load and store goes through a simulated MMU in JavaScript. Mitigations: a translation fast
  path cached on the TypeScript side and invalidated with the TLB; typed arrays throughout; replay in workers;
  the M3 decision point.
- **Honest scores.** Readers can keep metadata outside the heap or tune for the cost model. Mitigations: the
  storage rule, payload patterns in the checker, the cost model's parameters on screen, and badges that name
  the trace set they were measured on.
- **Scope.** 29 chapters, a machine, a kernel, a language and VM, and about ten managers. One `Heap` API, one
  manager interface and one trace format keep the parts small. If a milestone slips, the three ◇ chapters can
  move later without breaking the core path.
- **Language design.** A language that is pleasant for list-and-tree programs and can also show ownership and
  closures is the hardest design problem here. M0 writes MOTE.md and checks it on the hardest examples (the
  doubly linked list under ownership, the type-confusion walkthrough, a closure-heavy program under the
  incremental setting) before any chapter is written.
- **Security content.** The type-confusion walkthrough runs only inside the simulated machine and stops at the
  corrupted call target (§2). Real CVEs are described from public advisories, not reproduced.
- **Fidelity claims.** Real allocators and collectors are simplified models with a stated version; appendix B
  lists what the machine does not model.
- **Facts.** Every number, date, attribution and claim about a historical failure must be cited from a primary
  or reputable source in the bibliography. Re-enactments say what they simplify. If a number cannot be
  checked, the chapter says less.

## 18. Open questions

1. **Names.** *Mote* (the language) and *Core* (the design) are working names.
2. **Real traces.** Which programs to record at M3, and whether any licence prevents committing their traces.
3. **A local track.** Whether to add optional *Try it on Linux* boxes, like Digital Circuits' *Build it for
   real*: `/proc/self/maps`, `perf` counters for TLB misses, and the reader's allocator ported to C and loaded
   into real programs with `LD_PRELOAD`.
4. **Machine code.** Whether Chapters 3 and 24 should also run real RV64 code, on a copy of SSA to Silicon's
   emulator extended with supervisor mode, `satp` and page-fault traps. The plan assumes not: the MMU is
   exercised by the kernel, the reader's allocators and the Mote VM.
5. **Optional chapters.** Whether Chapters 12, 20 and 27 ship in the first release or follow it.
