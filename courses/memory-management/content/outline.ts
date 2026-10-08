/**
 * The course outline: single source of truth for navigation. A chapter becomes readable when a
 * matching `chapters/<nn>-<slug>/index.md` exists; until then it is listed as planned.
 * Slugs are fixed: other courses link to them.
 */

/** The layers of the layer map (PLAN §3, through-line 2), from the hardware up. */
export type LayerId = 'dram' | 'frames' | 'pages' | 'chunks' | 'objects';

export const LAYERS: { id: LayerId; label: string; glyph: string; blurb: string }[] = [
  { id: 'dram', label: 'DRAM & caches', glyph: '▦', blurb: 'Bytes in rows of capacitors, copied into caches line by line.' },
  { id: 'frames', label: 'Frames', glyph: '▤', blurb: 'Physical memory in 4 KiB frames, handed out by the kernel.' },
  { id: 'pages', label: 'Pages', glyph: '⧉', blurb: 'Virtual pages, mapped to frames by page tables.' },
  { id: 'chunks', label: 'Chunks', glyph: '▭', blurb: 'Pieces of pages handed out by malloc.' },
  { id: 'objects', label: 'Objects', glyph: '◉', blurb: 'What your program thinks it has: nodes, strings, closures.' },
];

export interface OutlineEntry {
  slug: string;
  number: string;
  title: string;
  summary: string;
  /** The flagship interactive. */
  flagship?: string;
  /** Optional deeper chapter (◇): the core path skips it. */
  optional?: boolean;
  /** The layers the chapter works on (lit on the layer map). */
  layers?: LayerId[];
  /** Year of the chapter's key historical moment, for the course map. */
  year?: number;
  event?: string;
}

export interface OutlinePart {
  id: string;
  title: string;
  /** Part opener page with the "How we got here" essay (absent for the prologue and epilogue). */
  essay?: string;
  blurb: string;
  chapters: OutlineEntry[];
}

export const COURSE_TITLE = 'Memory Management';
export const COURSE_SUBTITLE = 'From page tables to garbage collectors: who frees it?';

export const PARTS: OutlinePart[] = [
  {
    id: '0',
    title: 'Prologue',
    blurb: 'One allocation followed all the way down, and the question every layer answers differently.',
    chapters: [
      { slug: 'one-allocation', number: '0', title: 'One allocation, all the way down', summary: 'Follow `new Point(1, 2)` from a line of code to a row of capacitors, then turn the dial and watch five memory managers disagree about when to free it.', flagship: 'The zoom and the dial', layers: ['dram', 'frames', 'pages', 'chunks', 'objects'] },
    ],
  },
  {
    id: 'I',
    title: 'The machine',
    essay: 'the-machine',
    blurb: 'Bytes and addresses, caches, and the page tables that let every program believe it owns the whole machine.',
    chapters: [
      { slug: 'bytes-and-addresses', number: '1', title: 'Bytes and addresses', summary: 'Memory as one long array, pointers as numbers, and the padding hidden inside every struct.', flagship: 'Byte explorer', layers: ['dram'] },
      { slug: 'the-memory-hierarchy', number: '2', title: 'The memory hierarchy', summary: 'Why the same loop can be ten times slower in a different order: caches, lines and locality.', flagship: 'Cache lens', layers: ['dram'], year: 2014, event: 'Rowhammer' },
      { slug: 'virtual-memory', number: '3', title: 'Virtual memory', summary: 'Every address is a lie: RISC-V’s Sv39 page tables, walked one level at a time.', flagship: 'Be the MMU', layers: ['frames', 'pages'], year: 1962, event: 'The Atlas one-level store' },
      { slug: 'the-tlb', number: '4', title: 'The TLB', summary: 'A tiny cache of translations, how far it reaches, and what Meltdown cost it.', flagship: 'Reach game', layers: ['pages'], year: 2018, event: 'Meltdown and KPTI' },
      { slug: 'page-faults', number: '5', title: 'Page faults', summary: 'Memory that is not there until you touch it: demand paging, copy-on-write and fork.', flagship: 'Fork theatre', layers: ['frames', 'pages'], year: 2017, event: 'Instagram disables Python’s collector' },
      { slug: 'choosing-a-victim', number: '6', title: 'Choosing a victim', summary: 'When memory runs out, which page goes? FIFO, LRU, Clock, the impossible optimum, and an anomaly.', flagship: 'Replacement race', layers: ['frames', 'pages'], year: 1969, event: 'Bélády’s anomaly' },
    ],
  },
  {
    id: 'II',
    title: 'The process',
    essay: 'the-process',
    blurb: 'What a running program’s memory looks like, the cheapest allocator of all, and the kernel’s own allocators.',
    chapters: [
      { slug: 'anatomy-of-an-address-space', number: '7', title: 'Anatomy of an address space', summary: 'Text, data, heap, stack and the gaps between them; guard pages and address randomisation.', flagship: 'Address-space map', layers: ['pages'] },
      { slug: 'the-stack', number: '8', title: 'The stack', summary: 'Allocation by moving one register: frames, overflows, and the pointer that outlived its frame.', flagship: 'Stack stepper', layers: ['pages', 'objects'], year: 1988, event: 'The Morris worm' },
      { slug: 'the-kernels-allocators', number: '9', title: 'The kernel’s allocators', summary: 'The buddy system splits and merges powers of two; the slab allocator keeps objects warm.', flagship: 'Buddy tree', layers: ['frames'], year: 1965, event: 'Knowlton’s buddy system' },
    ],
  },
  {
    id: 'III',
    title: 'malloc',
    essay: 'malloc',
    blurb: 'Build an allocator from a bump pointer up, lose a fight with fragmentation, then write your own and put it on the scoreboard.',
    chapters: [
      { slug: 'a-heap-from-scratch', number: '10', title: 'A heap from scratch', summary: 'Headers, free lists, boundary tags and coalescing: the bookkeeping has to fit in the heap.', flagship: 'Heap inspector', layers: ['chunks'], year: 1968, event: 'Knuth’s boundary tags' },
      { slug: 'fragmentation', number: '11', title: 'Fragmentation', summary: 'Enough free memory and nowhere to put it: placement policies, size classes and an adversary.', flagship: 'The placement game', layers: ['chunks'], year: 1995, event: 'Wilson et al.’s survey' },
      { slug: 'fast-allocators', number: '12', title: 'Fast allocators', summary: 'Size classes, thread caches and sharded free lists: how jemalloc, TCMalloc and mimalloc go fast.', flagship: 'Contention view', optional: true, layers: ['chunks'], year: 2006, event: 'jemalloc' },
      { slug: 'arenas-pools-and-regions', number: '13', title: 'Arenas, pools and regions', summary: 'Stop freeing one object at a time; and two spacecraft that ran out of memory.', flagship: 'Arena timeline', layers: ['chunks'], year: 1969, event: 'Apollo 11’s 1202 alarm' },
      { slug: 'the-malloc-lab', number: '14', title: 'The malloc lab', summary: 'Write a complete allocator and put it on the scoreboard.', flagship: 'Lab bench', layers: ['chunks'] },
    ],
  },
  {
    id: 'IV',
    title: 'When manual management goes wrong',
    essay: 'when-manual-goes-wrong',
    blurb: 'Use-after-free, double free, overflows and leaks; the tools that catch them; and ownership, which rules them out.',
    chapters: [
      { slug: 'the-error-zoo', number: '15', title: 'The error zoo', summary: 'Every classic memory error, reproduced on a real allocator, down to the corrupted bytes.', flagship: 'The zoo', layers: ['chunks', 'objects'], year: 2014, event: 'Heartbleed' },
      { slug: 'catching-them', number: '16', title: 'Catching them', summary: 'Guard pages, shadow memory, redzones, quarantine, memory tags and capabilities.', flagship: 'Sanitiser goggles', layers: ['chunks'], year: 2012, event: 'AddressSanitizer' },
      { slug: 'ownership', number: '17', title: 'Ownership', summary: 'One owner per object, freed at the end of its scope: RAII, moves, borrows and regions.', flagship: 'Lifetime bars', layers: ['objects'], year: 2015, event: 'Rust 1.0' },
    ],
  },
  {
    id: 'V',
    title: 'Reference counting',
    essay: 'reference-counting',
    blurb: 'Count the pointers to every object and free it when the count reaches zero. Then deal with cycles, and with the cost.',
    chapters: [
      { slug: 'counting-references', number: '18', title: 'Counting references', summary: 'Increments, decrements and the cascade that follows a zero.', flagship: 'RC stepper', layers: ['objects'], year: 1960, event: 'Collins’s reference counts' },
      { slug: 'cycles', number: '19', title: 'Cycles', summary: 'Garbage that keeps itself alive: weak references and trial deletion.', flagship: 'Trial deletion', layers: ['objects'] },
      { slug: 'fast-reference-counting', number: '20', title: 'Fast reference counting', summary: 'Deferral, coalescing, biased counts, immortal objects, and reuse in place.', flagship: 'Count counter', optional: true, layers: ['objects'], year: 2021, event: 'Perceus' },
    ],
  },
  {
    id: 'VI',
    title: 'Tracing garbage collection',
    essay: 'tracing-garbage-collection',
    blurb: 'Free whatever the program can no longer reach: marking, copying, generations, roots, concurrency and the collectors in your runtime.',
    chapters: [
      { slug: 'reachability', number: '21', title: 'Reachability', summary: 'Roots, the object graph, mark and sweep, and why “dead” can only be approximated.', flagship: 'Be the collector', layers: ['objects'], year: 1960, event: 'McCarthy’s Lisp' },
      { slug: 'moving-collectors', number: '22', title: 'Moving collectors', summary: 'Compaction and Cheney’s copying collector, whose queue is the heap itself.', flagship: 'Cheney’s fingers', layers: ['objects', 'chunks'], year: 1970, event: 'Cheney’s algorithm' },
      { slug: 'generations', number: '23', title: 'Generations', summary: 'Most objects die young: nurseries, promotion, and the write barrier you cannot forget.', flagship: 'Generations', layers: ['objects'], year: 1984, event: 'Generation scavenging' },
      { slug: 'finding-roots', number: '24', title: 'Finding roots', summary: 'Stack maps and safepoints, conservative scanning, and integers that look like pointers.', flagship: 'Stack-map viewer', layers: ['objects', 'pages'], year: 1988, event: 'Boehm and Weiser' },
      { slug: 'concurrent-collection', number: '25', title: 'Concurrent and incremental collection', summary: 'Collecting while the program runs: the lost object, tricolour invariants and barriers.', flagship: 'The adversarial mutator', layers: ['objects'], year: 1978, event: 'On-the-fly garbage collection' },
      { slug: 'collectors-in-the-wild', number: '26', title: 'Collectors in the wild', summary: 'G1, ZGC, Go, V8, OCaml and the BEAM, and how to trade memory for pauses.', flagship: 'GC dashboard', layers: ['objects', 'pages'], year: 2020, event: 'Discord’s latency spikes' },
      { slug: 'finalisers-and-weak-references', number: '27', title: 'Finalisers, weak references and ephemerons', summary: 'Code that runs when an object dies, objects that come back, and caches that let go.', flagship: 'Resurrection', optional: true, layers: ['objects'] },
    ],
  },
  {
    id: 'E',
    title: 'Epilogue',
    blurb: 'Back down the stack with every layer open, and the same ideas turning up in new places.',
    chapters: [
      { slug: 'all-the-way-down', number: '28', title: 'All the way down, and back up', summary: 'One program with every layer open at once; paged KV caches, WasmGC, and memory safety as policy.', flagship: 'Full-stack replay', layers: ['dram', 'frames', 'pages', 'chunks', 'objects'] },
    ],
  },
];

export interface AppendixEntry {
  slug: string;
  number: string;
  title: string;
  summary: string;
}

export const APPENDICES: AppendixEntry[] = [
  { slug: 'primer', number: 'A', title: 'Bits, hex and pointers', summary: 'Binary, hexadecimal, bit operations and powers of two, for reading addresses fluently.' },
  { slug: 'the-machine', number: 'B', title: 'The machine and its kernel', summary: 'What the course’s simulator models, what it does not, and its cost model.' },
  { slug: 'sv39-reference', number: 'C', title: 'Sv39 reference card', summary: 'Address split, PTE format, satp and fault causes on one page.' },
  { slug: 'heap-api', number: 'D', title: 'The Heap API', summary: 'Everything your allocator and collector code can call, and the rules it must follow.' },
  { slug: 'mote-reference', number: 'E', title: 'Mote reference', summary: 'The course language: types, statements, built-ins and the memory-manager settings.' },
  { slug: 'museum', number: 'F', title: 'The museum', summary: 'Historic memory failures, each linked to the chapter that re-enacts it.' },
  { slug: 'rosetta', number: 'G', title: 'Rosetta', summary: 'One linked list in eight languages, and who frees it in each.' },
  { slug: 'glossary-and-bibliography', number: 'H', title: 'Glossary, timeline and bibliography', summary: 'Every term, every date and every source in the course.' },
];

export const READING_PATHS: { id: string; title: string; blurb: string; chapters: string[] }[] = [
  {
    id: 'systems-lang',
    title: 'I write C, C++ or Rust',
    blurb: 'The machine under your pointers, how malloc works, how it breaks, and what ownership buys you.',
    chapters: ['one-allocation', 'bytes-and-addresses', 'the-memory-hierarchy', 'anatomy-of-an-address-space', 'the-stack', 'a-heap-from-scratch', 'fragmentation', 'arenas-pools-and-regions', 'the-malloc-lab', 'the-error-zoo', 'catching-them', 'ownership'],
  },
  {
    id: 'managed-lang',
    title: 'I write Java, Go, JavaScript or Python',
    blurb: 'What your runtime is doing between your lines of code, and why it sometimes pauses.',
    chapters: ['one-allocation', 'bytes-and-addresses', 'the-memory-hierarchy', 'a-heap-from-scratch', 'counting-references', 'cycles', 'reachability', 'moving-collectors', 'generations', 'finding-roots', 'concurrent-collection', 'collectors-in-the-wild'],
  },
  {
    id: 'os',
    title: 'Operating systems',
    blurb: 'Page tables, TLBs, faults, replacement and the kernel’s own allocators.',
    chapters: ['one-allocation', 'bytes-and-addresses', 'the-memory-hierarchy', 'virtual-memory', 'the-tlb', 'page-faults', 'choosing-a-victim', 'anatomy-of-an-address-space', 'the-stack', 'the-kernels-allocators', 'fast-allocators'],
  },
  {
    id: 'implementers',
    title: 'Language implementers',
    blurb: 'Allocators, reference counting and every kind of collector, from the inside.',
    chapters: ['one-allocation', 'a-heap-from-scratch', 'fragmentation', 'counting-references', 'cycles', 'fast-reference-counting', 'reachability', 'moving-collectors', 'generations', 'finding-roots', 'concurrent-collection', 'collectors-in-the-wild', 'finalisers-and-weak-references'],
  },
];
