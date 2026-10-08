/**
 * The reference allocators. Each one is written against the Heap API only and follows the storage rule: its
 * bookkeeping lives in the heap, and outside it there are only scalar variables. They are deliberately short and
 * plain, because chapters quote them.
 *
 * Block layout for the boundary-tag allocators (after Knuth's boundary tags and the CS:APP malloc lab):
 *
 *        header (8)        payload (16-aligned) …                    footer (8)
 *   ┌───────────────┬──────────────────────────────────────────┬───────────────┐
 *   │ size | alloc  │                                          │ size | alloc  │
 *   └───────────────┴──────────────────────────────────────────┴───────────────┘
 *                   ↑ bp (what malloc returns)
 *
 * `size` counts the whole block (header and footer included) and is a multiple of 16, so its low bit is free to
 * hold the "allocated" flag. The heap starts with an 8-byte pad, a 16-byte allocated "prologue" block and ends
 * with a size-0 allocated "epilogue" header, so coalescing never has to check for the heap's edges.
 */
import type { Allocator, AllocatorFactory, ChunkInfo, Heap } from './api';

export const WORD = 8;
export const ALIGN = 16;
export const MIN_BLOCK = 32;
const CHUNK = 4096;

export const align = (n: number) => Math.ceil(n / ALIGN) * ALIGN;
export const pack = (size: number, alloc: boolean) => size + (alloc ? 1 : 0);
/** Block size for a request: room for the header and footer, rounded up, at least the minimum block. */
export const blockSize = (n: number) => Math.max(MIN_BLOCK, align(n + 2 * WORD));

// ── 1. Bump ──────────────────────────────────────────────────────────────────────────────────────────────
/** The simplest allocator there is: move a pointer forward. `free` does nothing. */
export const bump: AllocatorFactory = (heap) => {
  let next = 0;
  let end = 0;
  return {
    name: 'bump',
    malloc(size) {
      if (size <= 0) return 0;
      if (next === 0) next = end = heap.sbrk(0);
      const p = align(next);
      const need = p + align(size);
      if (need > end) {
        const grow = Math.max(CHUNK, need - end);
        if (heap.sbrk(grow) < 0) return 0;
        end += grow;
      }
      next = need;
      return p;
    },
    free() {
      /* a bump allocator never reuses memory */
    },
  };
};

// ── 2. Implicit free list (first, next or best fit) ─────────────────────────────────────────────────────
export type Fit = 'first' | 'next' | 'best';

function boundaryTag(heap: Heap) {
  const size = (p: number) => heap.load64(p) - (heap.load64(p) % 2);
  const allocated = (p: number) => heap.load64(p) % 2 === 1;
  const hdr = (bp: number) => bp - WORD;
  const ftr = (bp: number) => bp + size(hdr(bp)) - 2 * WORD;
  const next = (bp: number) => bp + size(hdr(bp));
  const prev = (bp: number) => bp - size(bp - 2 * WORD);
  const mark = (bp: number, sz: number, alloc: boolean) => {
    heap.store64(hdr(bp), pack(sz, alloc));
    heap.store64(bp + sz - 2 * WORD, pack(sz, alloc));
  };
  return { size, allocated, hdr, ftr, next, prev, mark };
}

/**
 * An implicit free list: every block, free or not, is on one list, linked by the sizes in the headers.
 * `fit` chooses where to place a request: the first free block that fits, the next one after the last
 * placement (a "roving pointer"), or the best (smallest) one.
 */
export function implicitList(fit: Fit = 'first', opts: { coalesce?: boolean } = {}): AllocatorFactory {
  const doCoalesce = opts.coalesce ?? true;
  return (heap) => {
    const b = boundaryTag(heap);
    let start = 0; // payload address of the prologue block
    let rover = 0;

    function init(): boolean {
      const p = heap.sbrk(4 * WORD);
      if (p < 0) return false;
      heap.store64(p, 0); // alignment pad
      heap.store64(p + WORD, pack(16, true)); // prologue header
      heap.store64(p + 2 * WORD, pack(16, true)); // prologue footer
      heap.store64(p + 3 * WORD, pack(0, true)); // epilogue header
      start = rover = p + 2 * WORD;
      return true;
    }

    function coalesce(bp: number): number {
      if (!doCoalesce) return bp;
      const prevFree = !b.allocated(bp - 2 * WORD);
      const nextFree = !b.allocated(b.hdr(b.next(bp)));
      let sz = b.size(b.hdr(bp));
      if (nextFree) sz += b.size(b.hdr(b.next(bp)));
      if (prevFree) {
        const p = b.prev(bp);
        sz += b.size(b.hdr(p));
        bp = p;
      }
      b.mark(bp, sz, false);
      if (rover > bp && rover < bp + sz) rover = bp;
      return bp;
    }

    function extend(bytes: number): number {
      const sz = align(bytes);
      const bp = heap.sbrk(sz);
      if (bp < 0) return 0;
      // The old epilogue header becomes the new block's header.
      b.mark(bp, sz, false);
      heap.store64(b.hdr(b.next(bp)), pack(0, true));
      return coalesce(bp);
    }

    function find(asize: number): number {
      if (fit === 'best') {
        let best = 0;
        for (let bp = start; b.size(b.hdr(bp)) > 0; bp = b.next(bp)) {
          const s = b.size(b.hdr(bp));
          if (!b.allocated(b.hdr(bp)) && s >= asize && (!best || s < b.size(b.hdr(best)))) {
            best = bp;
            if (s === asize) break;
          }
        }
        return best;
      }
      const from = fit === 'next' ? rover : start;
      for (let bp = from; b.size(b.hdr(bp)) > 0; bp = b.next(bp)) if (!b.allocated(b.hdr(bp)) && b.size(b.hdr(bp)) >= asize) return bp;
      if (fit === 'next') for (let bp = start; bp < from; bp = b.next(bp)) if (!b.allocated(b.hdr(bp)) && b.size(b.hdr(bp)) >= asize) return bp;
      return 0;
    }

    function place(bp: number, asize: number): void {
      const sz = b.size(b.hdr(bp));
      if (sz - asize >= MIN_BLOCK) {
        b.mark(bp, asize, true);
        b.mark(bp + asize, sz - asize, false);
      } else b.mark(bp, sz, true);
      rover = bp;
    }

    const self: Allocator = {
      name: `implicit list, ${fit} fit${doCoalesce ? '' : ', no coalescing'}`,
      malloc(size) {
        if (size <= 0) return 0;
        if (!start && !init()) return 0;
        const asize = blockSize(size);
        let bp = find(asize);
        if (!bp) {
          bp = extend(Math.max(asize, CHUNK));
          if (!bp) return 0;
          // Without coalescing the new space may sit behind a smaller free block; search again.
          if (b.size(b.hdr(bp)) < asize) return 0;
        }
        place(bp, asize);
        return bp;
      },
      free(bp) {
        if (!bp) return;
        b.mark(bp, b.size(b.hdr(bp)), false);
        coalesce(bp);
      },
      realloc(bp, size) {
        return reallocVia(self, heap, bp, size, (p) => b.size(b.hdr(p)) - 2 * WORD);
      },
      *chunks() {
        if (!start) return;
        yield { addr: start - 2 * WORD, size: 3 * WORD, free: false, note: 'pad + prologue' };
        for (let bp = start; ; bp = b.next(bp)) {
          const s = b.size(b.hdr(bp));
          if (bp !== start && s === 0) {
            yield { addr: b.hdr(bp), size: WORD, free: false, note: 'epilogue' };
            return;
          }
          if (bp !== start) yield { addr: b.hdr(bp), size: s, free: !b.allocated(b.hdr(bp)) };
        }
      },
    };
    return self;
  };
}

/** realloc in terms of malloc, copy and free (with an in-place fast path when the block is already big enough). */
export function reallocVia(a: Allocator, heap: Heap, bp: number, size: number, payloadOf: (bp: number) => number): number {
  if (!bp) return a.malloc(size);
  if (size <= 0) {
    a.free(bp);
    return 0;
  }
  const have = payloadOf(bp);
  if (have >= size) return bp;
  const np = a.malloc(size);
  if (!np) return 0;
  for (let i = 0; i + 4 <= have; i += 4) heap.store32(np + i, heap.load32(bp + i));
  a.free(bp);
  return np;
}

// ── 3. Explicit and segregated free lists ────────────────────────────────────────────────────────────────
/**
 * Free blocks carry two pointers in their (unused) payload: next and previous free block. With one list this is
 * the explicit free list; with several lists, one per size class, it is segregated fits. The list heads live in
 * the heap, just before the prologue: the allocator itself keeps only scalars.
 *
 *   free block:  header | next free | prev free | …unused… | footer
 */
export function segregated(classes = 1, opts: { order?: 'lifo' | 'address'; fit?: 'first' | 'best' } = {}): AllocatorFactory {
  const order = opts.order ?? 'lifo';
  return (heap) => {
    const b = boundaryTag(heap);
    let heads = 0; // address of the array of list heads (one word per class)
    let start = 0;

    const classOf = (sz: number) => {
      // Class k holds blocks of size in [32·2^k, 32·2^(k+1)); the last class holds everything larger.
      let k = 0;
      while (k < classes - 1 && sz >= MIN_BLOCK * 2 ** (k + 1)) k++;
      return k;
    };
    const head = (k: number) => heap.load64(heads + k * WORD);
    const setHead = (k: number, bp: number) => heap.store64(heads + k * WORD, bp);
    const nextFree = (bp: number) => heap.load64(bp);
    const prevFree = (bp: number) => heap.load64(bp + WORD);

    function insert(bp: number): void {
      const k = classOf(b.size(b.hdr(bp)));
      let prev = 0;
      let cur = head(k);
      if (order === 'address') {
        while (cur && cur < bp) {
          prev = cur;
          cur = nextFree(cur);
        }
      }
      heap.store64(bp, cur);
      heap.store64(bp + WORD, prev);
      if (cur) heap.store64(cur + WORD, bp);
      if (prev) heap.store64(prev, bp);
      else setHead(k, bp);
    }

    function remove(bp: number): void {
      const k = classOf(b.size(b.hdr(bp)));
      const n = nextFree(bp);
      const p = prevFree(bp);
      if (p) heap.store64(p, n);
      else setHead(k, n);
      if (n) heap.store64(n + WORD, p);
    }

    function init(): boolean {
      const words = classes + (classes % 2 ? 1 : 0); // keep 16-byte alignment
      const p = heap.sbrk(words * WORD + 4 * WORD);
      if (p < 0) return false;
      heads = p;
      for (let k = 0; k < words; k++) heap.store64(p + k * WORD, 0);
      const q = p + words * WORD;
      heap.store64(q, 0);
      heap.store64(q + WORD, pack(16, true));
      heap.store64(q + 2 * WORD, pack(16, true));
      heap.store64(q + 3 * WORD, pack(0, true));
      start = q + 2 * WORD;
      return true;
    }

    function coalesce(bp: number): number {
      const prevIsFree = !b.allocated(bp - 2 * WORD);
      const nextBp = b.next(bp);
      const nextIsFree = !b.allocated(b.hdr(nextBp));
      let sz = b.size(b.hdr(bp));
      if (nextIsFree) {
        remove(nextBp);
        sz += b.size(b.hdr(nextBp));
      }
      if (prevIsFree) {
        const p = b.prev(bp);
        remove(p);
        sz += b.size(b.hdr(p));
        bp = p;
      }
      b.mark(bp, sz, false);
      insert(bp);
      return bp;
    }

    function extend(bytes: number): number {
      const sz = align(bytes);
      const bp = heap.sbrk(sz);
      if (bp < 0) return 0;
      b.mark(bp, sz, false);
      heap.store64(b.hdr(b.next(bp)), pack(0, true));
      return coalesce(bp);
    }

    function find(asize: number): number {
      for (let k = classOf(asize); k < classes; k++) {
        let best = 0;
        for (let bp = head(k); bp; bp = nextFree(bp)) {
          const s = b.size(b.hdr(bp));
          if (s >= asize) {
            if (opts.fit !== 'best') return bp;
            if (!best || s < b.size(b.hdr(best))) best = bp;
          }
        }
        if (best) return best;
      }
      return 0;
    }

    function place(bp: number, asize: number): void {
      const sz = b.size(b.hdr(bp));
      remove(bp);
      if (sz - asize >= MIN_BLOCK) {
        b.mark(bp, asize, true);
        b.mark(bp + asize, sz - asize, false);
        insert(bp + asize);
      } else b.mark(bp, sz, true);
    }

    const self: Allocator = {
      name: classes === 1 ? `explicit list (${order})` : `segregated fits (${classes} classes)`,
      malloc(size) {
        if (size <= 0) return 0;
        if (!start && !init()) return 0;
        const asize = blockSize(size);
        let bp = find(asize);
        if (!bp) bp = extend(Math.max(asize, CHUNK));
        if (!bp) return 0;
        place(bp, asize);
        return bp;
      },
      free(bp) {
        if (!bp) return;
        b.mark(bp, b.size(b.hdr(bp)), false);
        coalesce(bp);
      },
      realloc(bp, size) {
        return reallocVia(self, heap, bp, size, (p) => b.size(b.hdr(p)) - 2 * WORD);
      },
      *chunks() {
        if (!start) return;
        yield { addr: heads, size: start - 2 * WORD - heads, free: false, note: classes === 1 ? 'list head' : 'list heads' };
        yield { addr: start - 2 * WORD, size: 3 * WORD, free: false, note: 'pad + prologue' };
        for (let bp = b.next(start); ; bp = b.next(bp)) {
          const s = b.size(b.hdr(bp));
          if (s === 0) {
            yield { addr: b.hdr(bp), size: WORD, free: false, note: 'epilogue' };
            return;
          }
          yield { addr: b.hdr(bp), size: s, free: !b.allocated(b.hdr(bp)) };
        }
      },
    };
    return self;
  };
}

export const explicitList = (order: 'lifo' | 'address' = 'lifo') => segregated(1, { order });

// ── 4. Size-class slabs ("in the style of" jemalloc's and mimalloc's small-object allocation) ──────────────
/**
 * Small requests are rounded up to a size class; each class carves whole pages into equal slots, and a page
 * remembers its class in a small header. A free slot holds a pointer to the next free slot of its page's class
 * (an intrusive free list). No headers on objects, no coalescing, no splitting: very fast, with internal
 * fragmentation from rounding up. Large requests get whole pages with a one-word header.
 *
 *   page:  [ class | used count | … ]  slot  slot  slot …   (page header is the first 16 bytes)
 */
export const SIZE_CLASSES = [16, 32, 48, 64, 96, 128, 192, 256, 384, 512, 768, 1024, 2048];
export const sizeClasses: AllocatorFactory = (heap) => {
  const PAGE = 4096;
  const HDR = 16;
  let table = 0; // per-class free-list heads, in the heap
  const nClasses = SIZE_CLASSES.length;
  const classOf = (n: number) => SIZE_CLASSES.findIndex((c) => c >= n);
  const pageOf = (p: number) => p - ((p - table) % PAGE);

  function init(): boolean {
    // The first page holds the class table; pages after it are aligned relative to it.
    const p = heap.sbrk(PAGE);
    if (p < 0) return false;
    table = p;
    for (let k = 0; k <= nClasses; k++) heap.store64(p + k * WORD, 0);
    return true;
  }

  function refill(k: number): boolean {
    const page = heap.sbrk(PAGE);
    if (page < 0) return false;
    const slot = SIZE_CLASSES[k]!;
    heap.store64(page, k + 1);
    heap.store64(page + WORD, 0);
    let prev = 0;
    for (let s = page + PAGE - slot - ((PAGE - HDR) % slot); s >= page + HDR; s -= slot) {
      heap.store64(s, prev);
      prev = s;
    }
    heap.store64(table + k * WORD, prev);
    return true;
  }

  const self: Allocator = {
    name: 'size classes',
    malloc(size) {
      if (size <= 0) return 0;
      if (!table && !init()) return 0;
      const k = classOf(size);
      if (k < 0) {
        // Large: whole pages, with the page count in a page header (class 0 marks "large"). Freed runs wait on
        // a list (head at the end of the class table) and are reused first fit, without splitting.
        const pages = Math.ceil((size + HDR) / PAGE);
        const largeHead = table + nClasses * WORD;
        for (let prev = 0, run = heap.load64(largeHead); run; prev = run, run = heap.load64(run + HDR)) {
          if (heap.load64(run + WORD) >= pages) {
            const after = heap.load64(run + HDR);
            if (prev) heap.store64(prev + HDR, after);
            else heap.store64(largeHead, after);
            return run + HDR;
          }
        }
        const p = heap.sbrk(pages * PAGE);
        if (p < 0) return 0;
        heap.store64(p, 0);
        heap.store64(p + WORD, pages);
        return p + HDR;
      }
      let p = heap.load64(table + k * WORD);
      if (!p) {
        if (!refill(k)) return 0;
        p = heap.load64(table + k * WORD);
      }
      heap.store64(table + k * WORD, heap.load64(p));
      const page = pageOf(p);
      heap.store64(page + WORD, heap.load64(page + WORD) + 1);
      return p;
    },
    free(p) {
      if (!p) return;
      const page = pageOf(p);
      const k = heap.load64(page) - 1;
      if (k < 0) {
        const largeHead = table + nClasses * WORD;
        heap.store64(p, heap.load64(largeHead));
        heap.store64(largeHead, page);
        return;
      }
      heap.store64(p, heap.load64(table + k * WORD));
      heap.store64(table + k * WORD, p);
      heap.store64(page + WORD, heap.load64(page + WORD) - 1);
    },
    realloc(p, size) {
      return reallocVia(self, heap, p, size, (q) => {
        const k = heap.load64(pageOf(q)) - 1;
        return k < 0 ? heap.load64(pageOf(q) + WORD) * PAGE - HDR : SIZE_CLASSES[k]!;
      });
    },
  };
  return self;
};

// ── 5. Arena ─────────────────────────────────────────────────────────────────────────────────────────────
/** A bump allocator that can be reset to a mark: everything allocated since the mark is freed at once. */
export function makeArena(heap: Heap) {
  let start = 0;
  let next = 0;
  let end = 0;
  return {
    malloc(size: number): number {
      if (!start) start = next = end = heap.sbrk(0);
      const p = align(next);
      const need = p + align(size);
      if (need > end) {
        const grow = Math.max(CHUNK, need - end);
        if (heap.sbrk(grow) < 0) return 0;
        end += grow;
      }
      next = need;
      return p;
    },
    /** Where the next allocation would go; pass it to reset to free everything after it. */
    mark: (): number => (start ? next : heap.sbrk(0)),
    reset(m: number): void {
      next = m;
    },
    used: (): number => next - start,
  };
}

/** Every reference allocator, for the scoreboard and the placement game. */
export const REFERENCE: { id: string; label: string; make: AllocatorFactory }[] = [
  { id: 'bump', label: 'Bump (never frees)', make: bump },
  { id: 'first', label: 'Implicit list, first fit', make: implicitList('first') },
  { id: 'next', label: 'Implicit list, next fit', make: implicitList('next') },
  { id: 'best', label: 'Implicit list, best fit', make: implicitList('best') },
  { id: 'explicit', label: 'Explicit list, LIFO', make: explicitList('lifo') },
  { id: 'explicit-addr', label: 'Explicit list, address order', make: explicitList('address') },
  { id: 'segregated', label: 'Segregated fits, 10 classes', make: segregated(10) },
  { id: 'classes', label: 'Size classes (slab style)', make: sizeClasses },
];

/** Walk an allocator's chunks if it can describe them. */
export function describe(a: Allocator): ChunkInfo[] {
  return a.chunks ? [...a.chunks()] : [];
}
