/**
 * The memory managers of the memory-manager dial (PLAN §8). Each implements the VM's Manager interface. They are
 * written to be read: chapters quote them in their "Under the hood" boxes.
 */
import { segregated, sizeClasses } from '../heap/allocators';
import type { Allocator, AllocatorFactory } from '../heap/api';
import { AUX, FIELDS, FLAG, HEAP_BASE, type Frame, type Manager, type Vm } from '../mote/vm';
import type { Pos } from '../mote/syntax';

export interface ManagerStats {
  allocs: number;
  frees: number;
  collections: number;
  /** Work done in each pause (objects visited + slots scanned), the course's unit of pause time. */
  pauses: number[];
  increments: number;
  decrements: number;
  barriers: number;
  /** Total collector work, for throughput. */
  work: number;
  minor: number;
  major: number;
}

const freshStats = (): ManagerStats => ({ allocs: 0, frees: 0, collections: 0, pauses: [], increments: 0, decrements: 0, barriers: 0, work: 0, minor: 0, major: 0 });

abstract class Base implements Manager {
  abstract readonly id: string;
  abstract readonly label: string;
  vm!: Vm;
  stats = freshStats();
  attach(vm: Vm): void {
    this.vm = vm;
  }
  abstract alloc(type: number, words: number): number;
  get heap() {
    return this.vm.heap;
  }
  aux(o: number): number {
    return this.heap.peek(o + AUX);
  }
  setAux(o: number, v: number): void {
    this.heap.poke(o + AUX, v);
  }
  marked(o: number): boolean {
    return (this.vm.flags(o) & FLAG.MARK) !== 0;
  }
  setMark(o: number, on: boolean): void {
    const f = this.vm.flags(o);
    this.vm.setFlags(o, on ? f | FLAG.MARK : f & ~FLAG.MARK);
  }
  pause(work: number): void {
    this.stats.pauses.push(work);
    this.stats.work += work;
    this.stats.collections++;
  }
  usage() {
    return { used: this.vm.heap.brk - this.vm.heap.base, capacity: this.vm.heap.capacity };
  }
}

// ── Manual ───────────────────────────────────────────────────────────────────────────────────────────────

/** malloc and free: the program decides. Unchecked, as in C, unless `checked` is set. */
export class ManualManager extends Base {
  readonly id: string = 'manual';
  readonly label: string = 'Manual (malloc/free)';
  readonly manual = true;
  readonly unchecked: boolean;
  allocator!: Allocator;
  /** The default allocator is size classes with LIFO free lists, like glibc's tcache: fast, and a double free
   *  makes it hand out the same block twice. */
  constructor(
    readonly make: AllocatorFactory = sizeClasses,
    opts: { checked?: boolean } = {},
  ) {
    super();
    this.unchecked = !opts.checked;
  }
  attach(vm: Vm): void {
    super.attach(vm);
    this.allocator = this.make(vm.heap);
  }
  alloc(_type: number, words: number): number {
    this.stats.allocs++;
    return this.allocator.malloc(words * 8);
  }
  free(obj: number, _pos?: Pos): void {
    this.stats.frees++;
    this.vm.freed(obj, 'free()');
    this.allocator.free(obj);
  }
}

/** Ownership: every object has one owner and is freed (dropped) when its owner goes away. */
export class OwnershipManager extends ManualManager {
  readonly id = 'ownership';
  readonly label = 'Ownership (drop at end of scope)';
  readonly ownership = true;
  constructor(make?: AllocatorFactory) {
    super(make, { checked: true });
  }
  free(obj: number): void {
    this.stats.frees++;
    this.vm.freed(obj, 'dropped by its owner');
    this.allocator.free(obj);
  }
}

// ── Reference counting ───────────────────────────────────────────────────────────────────────────────────

export type RcColour = 'black' | 'grey' | 'white' | 'purple';

/**
 * Reference counting. The count lives in each object's aux word. Every pointer store increments the new target and
 * decrements the old one; a frame's locals are released when it returns. An object whose count reaches zero goes on
 * a zero-count table and is freed at the next statement boundary unless a temporary on an operand stack still
 * holds it; freeing it releases its children, which may cascade.
 *
 * With `cycles`, objects whose count drops to a non-zero value become candidate roots of garbage cycles, and trial
 * deletion (Bacon and Rajan's synchronous algorithm) collects the cycles among them.
 */
export class RcManager extends Base {
  readonly id: string;
  readonly label: string;
  allocator!: Allocator;
  zct = new Set<number>();
  candidates = new Set<number>();
  colour = new Map<number, RcColour>();
  cascadeDepth = 0;
  maxCascade = 0;
  constructor(readonly opts: { cycles?: boolean; threshold?: number; make?: AllocatorFactory } = {}) {
    super();
    this.id = opts.cycles ? 'rc-cycles' : 'rc';
    this.label = opts.cycles ? 'Reference counting + cycle collection' : 'Reference counting';
  }
  attach(vm: Vm): void {
    super.attach(vm);
    this.allocator = (this.opts.make ?? segregated(8))(vm.heap);
  }
  alloc(_type: number, words: number): number {
    this.stats.allocs++;
    let p = this.allocator.malloc(words * 8);
    if (!p && this.opts.cycles) {
      this.collectCycles();
      p = this.allocator.malloc(words * 8);
    }
    return p;
  }
  count(o: number): number {
    return this.aux(o);
  }
  inc(o: number): void {
    if (!this.vm.byAddr.has(o)) return;
    this.stats.increments++;
    this.setAux(o, this.aux(o) + 1);
    if (this.opts.cycles) this.colour.set(o, 'black');
  }
  dec(o: number): void {
    if (!this.vm.byAddr.has(o)) return;
    this.stats.decrements++;
    const n = this.aux(o) - 1;
    this.setAux(o, Math.max(0, n));
    if (n <= 0) {
      this.zct.add(o);
      this.candidates.delete(o);
    } else if (this.opts.cycles) {
      this.candidates.add(o);
      this.colour.set(o, 'purple');
    }
  }
  onStore(_slot: number, old: number, value: number, _holder: number, weak: boolean): void {
    if (weak || old === value) return;
    if (value) this.inc(value);
    if (old) this.dec(old);
  }
  onDiscard(v: number): void {
    if (this.vm.byAddr.has(v) && this.aux(v) === 0) this.zct.add(v);
  }
  onFrameExit(f: Frame): void {
    f.fn.locals.forEach((l, i) => {
      if (!l.ptr) return;
      const v = this.vm.stack.peek(this.vm.slotAddr(f, i));
      if (v) this.dec(v);
    });
  }
  onStatement(): void {
    if (this.zct.size) this.processZct();
    if (this.opts.cycles && this.candidates.size > (this.opts.threshold ?? 64)) this.collectCycles();
  }
  private onOperandStack(o: number): boolean {
    for (const f of this.vm.frames) for (let d = 0; d < f.depth; d++) if (this.vm.stack.peek(this.vm.opAddr(f, d)) === o) return true;
    return false;
  }
  processZct(): void {
    const work = [...this.zct];
    this.zct.clear();
    let depth = 0;
    while (work.length) {
      const o = work.pop()!;
      if (!this.vm.byAddr.has(o) || this.aux(o) > 0) continue;
      if (this.onOperandStack(o)) {
        this.zct.add(o);
        continue;
      }
      depth++;
      for (const s of this.vm.pointerSlots(o)) {
        const v = this.heap.peek(s);
        if (v && this.vm.byAddr.has(v)) {
          this.stats.decrements++;
          const n = this.aux(v) - 1;
          this.setAux(v, Math.max(0, n));
          if (n <= 0) work.push(v);
          else if (this.opts.cycles) {
            this.candidates.add(v);
            this.colour.set(v, 'purple');
          }
        }
      }
      this.release(o, 'count reached zero');
    }
    this.maxCascade = Math.max(this.maxCascade, depth);
  }
  private release(o: number, why: string): void {
    this.stats.frees++;
    this.candidates.delete(o);
    this.colour.delete(o);
    this.vm.freed(o, why);
    this.allocator.free(o);
  }
  collect(): void {
    this.processZct();
    if (this.opts.cycles) this.collectCycles();
  }
  atExit(): void {
    this.processZct();
    if (this.opts.cycles) this.collectCycles();
  }

  /** Trial deletion: subtract internal references; whatever drops to zero is held only by itself. */
  collectCycles(): number {
    let work = 0;
    const roots = [...this.candidates].filter((o) => this.vm.byAddr.has(o));
    const children = (o: number) => this.vm.pointerSlots(o).map((s) => this.heap.peek(s)).filter((v) => v && this.vm.byAddr.has(v));
    const markGrey = (start: number) => {
      const stack = [start];
      if (this.colour.get(start) === 'grey') return;
      this.colour.set(start, 'grey');
      while (stack.length) {
        const o = stack.pop()!;
        for (const c of children(o)) {
          work++;
          this.setAux(c, this.aux(c) - 1);
          if (this.colour.get(c) !== 'grey') {
            this.colour.set(c, 'grey');
            stack.push(c);
          }
        }
      }
    };
    const scanBlack = (start: number) => {
      const stack = [start];
      this.colour.set(start, 'black');
      while (stack.length) {
        const o = stack.pop()!;
        for (const c of children(o)) {
          work++;
          this.setAux(c, this.aux(c) + 1);
          if (this.colour.get(c) !== 'black') {
            this.colour.set(c, 'black');
            stack.push(c);
          }
        }
      }
    };
    const scan = (start: number) => {
      const stack = [start];
      while (stack.length) {
        const o = stack.pop()!;
        if (this.colour.get(o) !== 'grey') continue;
        if (this.aux(o) > 0) scanBlack(o);
        else {
          this.colour.set(o, 'white');
          for (const c of children(o)) stack.push(c);
        }
      }
    };
    for (const r of roots) if (this.colour.get(r) === 'purple') markGrey(r);
    for (const r of roots) scan(r);
    const white = [...this.colour].filter(([, c]) => c === 'white').map(([o]) => o);
    for (const o of white) this.release(o, 'garbage cycle (trial deletion)');
    this.candidates.clear();
    if (roots.length) this.pause(work + roots.length);
    return white.length;
  }
}

// ── Tracing: shared marking ──────────────────────────────────────────────────────────────────────────────

/** Mark everything reachable from `roots`; returns the work done. Weak slots are not traced. */
function markFrom(m: Base, roots: number[]): number {
  const vm = m.vm;
  let work = 0;
  const stack: number[] = [];
  for (const r of roots) {
    if (vm.byAddr.has(r) && !m.marked(r)) {
      m.setMark(r, true);
      stack.push(r);
    }
  }
  while (stack.length) {
    const o = stack.pop()!;
    work++;
    for (const s of vm.pointerSlots(o)) {
      work++;
      const v = vm.heap.peek(s);
      if (v && vm.byAddr.has(v) && !m.marked(v)) {
        m.setMark(v, true);
        stack.push(v);
      }
    }
  }
  return work;
}

function rootValues(vm: Vm): number[] {
  return vm.rootSlots().map((s) => vm.peekAny(s));
}

// ── Mark–sweep ───────────────────────────────────────────────────────────────────────────────────────────

/**
 * Mark–sweep over a free-list heap (McCarthy, 1960). Collects when the bytes allocated since the last collection
 * exceed `trigger` (or when malloc fails). With `conservative`, roots are found by scanning every word of the
 * stacks and globals and keeping anything that points into an allocated block (Boehm–Demers–Weiser style; the
 * heap itself is still traced with type information).
 */
export class MarkSweepManager extends Base {
  readonly id: string;
  readonly label: string;
  allocator!: Allocator;
  sinceGc = 0;
  /** Objects kept alive only because a non-pointer word looked like a pointer (conservative). */
  falseRoots: number[] = [];
  constructor(readonly opts: { conservative?: boolean; trigger?: number; make?: AllocatorFactory } = {}) {
    super();
    this.id = opts.conservative ? 'conservative' : 'mark-sweep';
    this.label = opts.conservative ? 'Mark–sweep, conservative roots' : 'Mark–sweep';
  }
  attach(vm: Vm): void {
    super.attach(vm);
    this.allocator = (this.opts.make ?? segregated(8))(vm.heap);
  }
  alloc(_type: number, words: number): number {
    this.stats.allocs++;
    if (this.sinceGc > (this.opts.trigger ?? 16 * 1024)) this.collect('allocation trigger');
    let p = this.allocator.malloc(words * 8);
    if (!p) {
      this.collect('out of memory');
      p = this.allocator.malloc(words * 8);
    }
    this.sinceGc += words * 8;
    return p;
  }
  /** Allocated blocks (payload start and size), from the allocator's own heap walk. */
  private blocks(): { addr: number; size: number }[] {
    if (!this.allocator.chunks) return [...this.vm.byAddr.keys()].map((a) => ({ addr: a, size: this.vm.wordsOf(a) * 8 }));
    return [...this.allocator.chunks()].filter((c) => !c.free && !c.note).map((c) => ({ addr: c.addr + 8, size: c.size - 16 }));
  }
  roots(): number[] {
    if (!this.opts.conservative) return rootValues(this.vm);
    const blocks = this.blocks().sort((a, b) => a.addr - b.addr);
    const precise = new Set(rootValues(this.vm));
    const out: number[] = [];
    this.falseRoots = [];
    for (const s of this.vm.conservativeSlots()) {
      const v = this.vm.peekAny(s);
      if (!Number.isInteger(v) || v < HEAP_BASE || v >= this.vm.heap.brk) continue;
      // Binary search for the block containing v (interior pointers count).
      let lo = 0;
      let hi = blocks.length - 1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const b = blocks[mid]!;
        if (v < b.addr) hi = mid - 1;
        else if (v >= b.addr + b.size) lo = mid + 1;
        else {
          if (this.vm.byAddr.has(b.addr)) {
            out.push(b.addr);
            if (!precise.has(b.addr)) this.falseRoots.push(b.addr);
          }
          break;
        }
      }
    }
    return out;
  }
  collect(_reason = 'gc()'): void {
    let work = markFrom(this, this.roots());
    // Sweep: walk the heap; free unmarked objects, unmark the rest.
    for (const b of this.blocks()) {
      work++;
      const o = b.addr;
      if (!this.vm.byAddr.has(o)) continue;
      if (this.marked(o)) this.setMark(o, false);
      else {
        this.stats.frees++;
        this.vm.freed(o, 'swept');
        this.allocator.free(o);
      }
    }
    this.sinceGc = 0;
    this.pause(work);
    this.vm.gcEvent(this.label, this.stats.frees, work);
  }
  atExit(): void {}
}

// ── Bump-allocated regions (for compaction and copying) ──────────────────────────────────────────────────

/** Visit the objects laid out contiguously in [from, to). */
function* objectsIn(vm: Vm, from: number, to: number): Generator<number> {
  for (let o = from; o < to; ) {
    yield o;
    o += vm.wordsOf(o) * 8;
  }
}

/** Mark–compact (the Lisp 2 sliding algorithm): mark, compute new addresses, update pointers, slide. */
export class MarkCompactManager extends Base {
  readonly id = 'mark-compact';
  readonly label = 'Mark–compact';
  start = 0;
  top = 0;
  limit = 0;
  constructor(readonly opts: { heapBytes?: number } = {}) {
    super();
  }
  attach(vm: Vm): void {
    super.attach(vm);
    const bytes = Math.min(this.opts.heapBytes ?? vm.heap.capacity, vm.heap.capacity);
    this.start = this.top = vm.heap.sbrk(bytes);
    this.limit = this.start + bytes;
  }
  alloc(_type: number, words: number): number {
    this.stats.allocs++;
    if (this.top + words * 8 > this.limit) this.collect();
    if (this.top + words * 8 > this.limit) return 0;
    const p = this.top;
    this.top += words * 8;
    return p;
  }
  collect(): void {
    const vm = this.vm;
    const slots = vm.rootSlots();
    let work = markFrom(this, slots.map((s) => vm.peekAny(s)));
    // 1. Compute forwarding addresses into the aux word.
    let free = this.start;
    const live: number[] = [];
    for (const o of objectsIn(vm, this.start, this.top)) {
      work++;
      if (this.marked(o)) {
        this.setAux(o, free);
        live.push(o);
        free += vm.wordsOf(o) * 8;
      } else if (vm.byAddr.has(o)) {
        this.stats.frees++;
        vm.freed(o, 'not marked (compacted away)');
      }
    }
    const fwd = (p: number) => (p && p >= this.start && p < this.top && live.length && this.marked(p) ? this.aux(p) : p);
    // 2. Update every pointer: roots, then fields of live objects (weak ones to dead objects become null).
    for (const s of slots) vm.pokeAny(s, fwd(vm.peekAny(s)));
    for (const o of live) {
      for (const s of vm.pointerSlots(o, true)) {
        work++;
        const v = vm.heap.peek(s);
        vm.heap.poke(s, v && !this.marked(v) ? 0 : fwd(v));
      }
    }
    // 3. Slide objects down, in address order (destinations never overtake sources).
    for (const o of live) {
      const to = this.aux(o);
      const n = vm.wordsOf(o);
      if (to !== o) {
        vm.heap.copyWords(o, to, n);
        vm.moved(o, to);
      }
      this.setMark(to, false);
      this.setAux(to, 0);
      work += n;
    }
    this.top = free;
    vm.rebuildWeak();
    this.pause(work);
    vm.gcEvent(this.label, this.stats.frees, work);
  }
  usage() {
    return { used: this.top - this.start, capacity: this.limit - this.start };
  }
}

/**
 * Semispace copying collection with Cheney's algorithm (1970): copy the roots' targets into to-space, then scan
 * to-space from left to right, copying whatever the scanned objects point to. The to-space between the scan and
 * free pointers is the breadth-first queue. Leaves a forwarding address in each copied object.
 */
export class CopyingManager extends Base {
  readonly id = 'copying';
  readonly label = 'Copying (Cheney)';
  fromStart = 0;
  toStart = 0;
  size = 0;
  top = 0;
  /** For figures: the scan and free pointers after each step of the last collection. */
  lastTrace: { scan: number; free: number }[] = [];
  constructor(readonly opts: { semispaceBytes?: number } = {}) {
    super();
  }
  attach(vm: Vm): void {
    super.attach(vm);
    this.size = Math.floor(Math.min(this.opts.semispaceBytes ?? vm.heap.capacity / 2, vm.heap.capacity / 2) / 16) * 16;
    this.fromStart = this.top = vm.heap.sbrk(this.size * 2);
    this.toStart = this.fromStart + this.size;
  }
  alloc(_type: number, words: number): number {
    this.stats.allocs++;
    if (this.top + words * 8 > this.fromStart + this.size) this.collect();
    if (this.top + words * 8 > this.fromStart + this.size) return 0;
    const p = this.top;
    this.top += words * 8;
    return p;
  }
  inFrom = (p: number) => p >= this.fromStart && p < this.fromStart + this.size;
  collect(): void {
    const vm = this.vm;
    let free = this.toStart;
    let work = 0;
    this.lastTrace = [];
    const forward = (p: number): number => {
      if (!p || !this.inFrom(p) || !vm.byAddr.has(p) && !(vm.flags(p) & FLAG.FORWARDED)) return p;
      if (vm.flags(p) & FLAG.FORWARDED) return this.aux(p);
      const n = vm.wordsOf(p);
      const to = free;
      vm.heap.copyWords(p, to, n);
      free += n * 8;
      vm.setFlags(p, vm.flags(p) | FLAG.FORWARDED);
      this.setAux(p, to);
      vm.moved(p, to);
      work += n;
      return to;
    };
    for (const s of vm.rootSlots()) vm.pokeAny(s, forward(vm.peekAny(s)));
    let scan = this.toStart;
    this.lastTrace.push({ scan, free });
    while (scan < free) {
      for (const s of vm.pointerSlots(scan)) vm.heap.poke(s, forward(vm.heap.peek(s)));
      scan += vm.wordsOf(scan) * 8;
      this.lastTrace.push({ scan, free });
    }
    // Weak fields: keep the target's new address if it survived, else null.
    for (let o = this.toStart; o < free; o += vm.wordsOf(o) * 8) {
      for (const s of vm.weakSlotsOf(o)) {
        const v = vm.heap.peek(s);
        vm.heap.poke(s, v && this.inFrom(v) ? (vm.flags(v) & FLAG.FORWARDED ? this.aux(v) : 0) : v);
      }
    }
    // Everything left in from-space without a forwarding address is garbage.
    const dead = [...vm.byAddr.keys()].filter((a) => this.inFrom(a));
    for (const a of dead) {
      this.stats.frees++;
      vm.freed(a, 'not copied');
    }
    // Flip.
    [this.fromStart, this.toStart] = [this.toStart, this.fromStart];
    this.top = free;
    for (let o = this.fromStart; o < this.top; o += vm.wordsOf(o) * 8) vm.setFlags(o, vm.flags(o) & ~FLAG.FORWARDED);
    vm.rebuildWeak();
    this.pause(work + (free - this.fromStart) / 8);
    vm.gcEvent(this.label, this.stats.frees, work);
  }
  usage() {
    return { used: this.top - this.fromStart, capacity: this.size * 2 };
  }
}

// ── Generational ─────────────────────────────────────────────────────────────────────────────────────────

/**
 * Two generations: a nursery where new objects are bump-allocated, and an old generation (a free-list heap). A
 * minor collection copies the nursery's survivors into the old generation (promotion) and empties the nursery.
 * Its roots are the program's roots plus the **remembered set**: the old-generation slots that point into the
 * nursery, recorded by the write barrier. Turn the barrier off and a minor collection frees young objects that
 * are still reachable through old ones (the oracle reports it).
 */
export class GenerationalManager extends Base {
  readonly id = 'generational';
  readonly label = 'Generational (copying nursery, mark–sweep old)';
  nurseryStart = 0;
  nurseryEnd = 0;
  top = 0;
  old!: Allocator;
  remembered = new Set<number>();
  sinceMajor = 0;
  promoted = 0;
  /** Objects freed by a minor collection while still reachable (only possible without the barrier). */
  lost: number[] = [];
  constructor(readonly opts: { nurseryBytes?: number; barrier?: boolean; majorTrigger?: number } = {}) {
    super();
  }
  get barrier(): boolean {
    return this.opts.barrier ?? true;
  }
  attach(vm: Vm): void {
    super.attach(vm);
    const n = this.opts.nurseryBytes ?? 8 * 1024;
    this.nurseryStart = this.top = vm.heap.sbrk(n);
    this.nurseryEnd = this.nurseryStart + n;
    this.old = segregated(8)(vm.heap);
  }
  young = (p: number) => p >= this.nurseryStart && p < this.nurseryEnd;
  alloc(_type: number, words: number): number {
    this.stats.allocs++;
    if (words * 8 > (this.nurseryEnd - this.nurseryStart) / 4) {
      // Large objects go straight to the old generation.
      return this.oldAlloc(words);
    }
    if (this.top + words * 8 > this.nurseryEnd) this.minor();
    if (this.top + words * 8 > this.nurseryEnd) return 0;
    const p = this.top;
    this.top += words * 8;
    return p;
  }
  private oldAlloc(words: number): number {
    if (this.sinceMajor > (this.opts.majorTrigger ?? 64 * 1024)) this.major();
    let p = this.old.malloc(words * 8);
    if (!p) {
      this.major();
      p = this.old.malloc(words * 8);
    }
    this.sinceMajor += words * 8;
    return p;
  }
  onStore(slot: number, _old: number, value: number, holder: number): void {
    if (!this.barrier) return;
    this.stats.barriers++;
    if (holder && !this.young(holder) && value && this.young(value)) this.remembered.add(slot);
  }
  minor(): void {
    const vm = this.vm;
    let work = 0;
    const queue: number[] = [];
    const forward = (p: number): number => {
      if (!p || !this.young(p)) return p;
      if (vm.flags(p) & FLAG.FORWARDED) return this.aux(p);
      if (!vm.byAddr.has(p)) return p;
      const n = vm.wordsOf(p);
      const to = this.oldAlloc(n);
      if (!to) throw new Error('out of memory while promoting');
      vm.heap.copyWords(p, to, n);
      vm.setFlags(to, (vm.flags(to) & ~FLAG.FORWARDED) | FLAG.OLD);
      vm.setFlags(p, vm.flags(p) | FLAG.FORWARDED);
      this.setAux(p, to);
      vm.moved(p, to);
      queue.push(to);
      this.promoted++;
      work += n;
      return to;
    };
    for (const s of vm.rootSlots()) vm.pokeAny(s, forward(vm.peekAny(s)));
    for (const s of this.remembered) {
      work++;
      vm.heap.poke(s, forward(vm.heap.peek(s)));
    }
    while (queue.length) {
      const o = queue.shift()!;
      for (const s of vm.pointerSlots(o)) vm.heap.poke(s, forward(vm.heap.peek(s)));
      for (const s of vm.weakSlotsOf(o)) {
        const v = vm.heap.peek(s);
        if (this.young(v)) vm.heap.poke(s, vm.flags(v) & FLAG.FORWARDED ? this.aux(v) : 0);
      }
    }
    // Nursery objects not forwarded are dead; check them against the oracle to catch a missing barrier.
    const reach = this.barrier ? undefined : vm.reachable();
    for (const a of [...vm.byAddr.keys()].filter((x) => this.young(x))) {
      if (reach?.has(a)) this.lost.push(vm.byAddr.get(a)!);
      this.stats.frees++;
      vm.freed(a, 'died young');
    }
    if (this.lost.length) vm.note(`minor collection freed ${this.lost.length} object(s) that were still reachable from the old generation: the write barrier was off`);
    this.remembered.clear();
    this.top = this.nurseryStart;
    vm.rebuildWeak();
    this.stats.minor++;
    this.pause(work + 1);
    vm.gcEvent('minor', this.stats.frees, work + 1);
  }
  major(): void {
    const vm = this.vm;
    // Collect the nursery first so every live object is old, then mark–sweep the old generation.
    if (this.top > this.nurseryStart && !this.inMajor) {
      this.inMajor = true;
      try {
        this.minor();
      } finally {
        this.inMajor = false;
      }
    }
    let work = markFrom(this, rootValues(vm));
    for (const c of [...(this.old.chunks?.() ?? [])]) {
      if (c.free || c.note) continue;
      work++;
      const o = c.addr + 8;
      if (!vm.byAddr.has(o)) continue;
      if (this.marked(o)) this.setMark(o, false);
      else {
        this.stats.frees++;
        vm.freed(o, 'swept (old generation)');
        this.old.free(o);
      }
    }
    this.sinceMajor = 0;
    this.stats.major++;
    this.pause(work);
    vm.gcEvent('major', this.stats.frees, work);
  }
  private inMajor = false;
  collect(): void {
    this.major();
  }
}

// ── Incremental (tricolour) mark–sweep ───────────────────────────────────────────────────────────────────

export type Barrier = 'none' | 'dijkstra' | 'steele' | 'yuasa';

/**
 * Incremental mark–sweep: marking is spread over safepoints, a few objects at a time, while the program keeps
 * running and changing pointers. Tricolour: white (not yet seen), grey (seen, children not scanned: on the grey
 * stack), black (seen and scanned: marked and not grey). The write barrier keeps the program from hiding a white
 * object behind a black one:
 *   Dijkstra (insertion): shade the new target grey.     Steele: re-grey the black holder.
 *   Yuasa (deletion, snapshot-at-the-beginning): shade the old target grey.     none: lose objects.
 * New objects are allocated black during marking.
 */
export class IncrementalManager extends Base {
  readonly id = 'incremental';
  readonly label: string;
  allocator!: Allocator;
  phase: 'idle' | 'marking' = 'idle';
  grey: number[] = [];
  sinceGc = 0;
  /** Objects swept while still reachable (only without a correct barrier). */
  lost: number[] = [];
  cycles = 0;
  constructor(readonly opts: { barrier?: Barrier; trigger?: number; step?: number } = {}) {
    super();
    this.label = `Incremental mark–sweep (${opts.barrier ?? 'dijkstra'} barrier)`;
  }
  get barrier(): Barrier {
    return this.opts.barrier ?? 'dijkstra';
  }
  attach(vm: Vm): void {
    super.attach(vm);
    this.allocator = segregated(8)(vm.heap);
  }
  isGrey(o: number): boolean {
    return (this.vm.flags(o) & FLAG.GREY) !== 0;
  }
  shade(o: number): void {
    if (!o || !this.vm.byAddr.has(o) || this.marked(o)) return;
    this.setMark(o, true);
    this.vm.setFlags(o, this.vm.flags(o) | FLAG.GREY);
    this.grey.push(o);
  }
  alloc(_type: number, words: number): number {
    this.stats.allocs++;
    if (this.phase === 'idle' && this.sinceGc > (this.opts.trigger ?? 8 * 1024)) this.start();
    let p = this.allocator.malloc(words * 8);
    if (!p) {
      this.finish();
      p = this.allocator.malloc(words * 8);
    }
    this.sinceGc += words * 8;
    return p;
  }
  /** Allocate black: an object born during marking is already marked (and not grey). */
  onBorn(o: number): void {
    if (this.phase === 'marking') this.setMark(o, true);
  }
  start(): void {
    this.phase = 'marking';
    this.cycles++;
    for (const v of rootValues(this.vm)) this.shade(v);
  }
  /** Do up to `n` units of marking work. */
  work(n: number): void {
    const vm = this.vm;
    let done = 0;
    while (this.grey.length && done < n) {
      const o = this.grey.pop()!;
      if (!vm.byAddr.has(o)) continue;
      vm.setFlags(o, vm.flags(o) & ~FLAG.GREY);
      for (const s of vm.pointerSlots(o)) this.shade(vm.heap.peek(s));
      done++;
    }
    this.stats.work += done;
    if (done) this.stats.pauses.push(done);
    if (!this.grey.length && this.phase === 'marking') this.finish();
  }
  onSafepoint(): void {
    if (this.phase === 'marking') this.work(this.opts.step ?? 4);
  }
  onStore(_slot: number, old: number, value: number, holder: number, weak: boolean): void {
    if (this.phase !== 'marking' || weak) return;
    this.stats.barriers++;
    switch (this.barrier) {
      case 'dijkstra':
        if (holder) this.shade(value);
        break;
      case 'steele':
        if (holder && value && this.vm.byAddr.has(value) && !this.marked(value) && this.marked(holder) && !this.isGrey(holder)) {
          this.vm.setFlags(holder, this.vm.flags(holder) | FLAG.GREY);
          this.grey.push(holder);
        }
        break;
      case 'yuasa':
        this.shade(old);
        break;
    }
  }
  /** Finish the cycle: rescan roots (insertion barriers do not cover them), drain the grey stack, sweep. */
  finish(): void {
    const vm = this.vm;
    if (this.phase !== 'marking') this.start();
    if (this.barrier !== 'yuasa') for (const v of rootValues(vm)) this.shade(v);
    let final = 0;
    while (this.grey.length) {
      const o = this.grey.pop()!;
      if (!vm.byAddr.has(o)) continue;
      vm.setFlags(o, vm.flags(o) & ~FLAG.GREY);
      for (const s of vm.pointerSlots(o)) this.shade(vm.heap.peek(s));
      final++;
    }
    const reach = vm.reachable();
    let swept = 0;
    for (const c of [...(this.allocator.chunks?.() ?? [])]) {
      if (c.free || c.note) continue;
      const o = c.addr + 8;
      if (!vm.byAddr.has(o)) continue;
      swept++;
      if (this.marked(o)) this.setMark(o, false);
      else {
        if (reach.has(o)) this.lost.push(vm.byAddr.get(o)!);
        this.stats.frees++;
        vm.freed(o, 'swept');
        this.allocator.free(o);
      }
    }
    if (this.lost.length) vm.note(`the collector freed ${this.lost.length} reachable object(s): a lost object`);
    this.phase = 'idle';
    this.sinceGc = 0;
    this.pause(final + swept);
    vm.gcEvent(this.label, this.stats.frees, final + swept);
  }
  collect(): void {
    this.finish();
  }
}

// ── The dial ─────────────────────────────────────────────────────────────────────────────────────────────

export type Setting = 'manual' | 'ownership' | 'rc' | 'rc-cycles' | 'mark-sweep' | 'conservative' | 'mark-compact' | 'copying' | 'generational' | 'incremental';

export const SETTINGS: { id: Setting; label: string; short: string; blurb: string }[] = [
  { id: 'manual', label: 'Manual', short: 'manual', blurb: 'malloc and free: the program decides.' },
  { id: 'ownership', label: 'Ownership', short: 'own', blurb: 'One owner per object; dropped at the end of its owner’s scope.' },
  { id: 'rc', label: 'Reference counting', short: 'RC', blurb: 'Freed when the count of pointers to it reaches zero.' },
  { id: 'rc-cycles', label: 'RC + cycle collector', short: 'RC+', blurb: 'Reference counting, plus trial deletion for cycles.' },
  { id: 'mark-sweep', label: 'Mark–sweep', short: 'M–S', blurb: 'Mark what is reachable, sweep the rest.' },
  { id: 'conservative', label: 'Conservative', short: 'cons', blurb: 'Mark–sweep that guesses roots from stack words.' },
  { id: 'mark-compact', label: 'Mark–compact', short: 'M–C', blurb: 'Mark, then slide survivors together.' },
  { id: 'copying', label: 'Copying', short: 'copy', blurb: 'Copy survivors to the other half (Cheney).' },
  { id: 'generational', label: 'Generational', short: 'gen', blurb: 'A copying nursery for the young, mark–sweep for the old.' },
  { id: 'incremental', label: 'Incremental', short: 'incr', blurb: 'Marking spread over the run, with a write barrier.' },
];

export interface ManagerOptions {
  allocator?: AllocatorFactory;
  heapBytes?: number;
  trigger?: number;
  barrier?: Barrier;
  generationalBarrier?: boolean;
  nurseryBytes?: number;
}

export function makeManager(s: Setting, o: ManagerOptions = {}): Manager & { stats: ManagerStats } {
  switch (s) {
    case 'manual':
      return new ManualManager(o.allocator);
    case 'ownership':
      return new OwnershipManager(o.allocator);
    case 'rc':
      return new RcManager({ make: o.allocator });
    case 'rc-cycles':
      return new RcManager({ cycles: true, make: o.allocator });
    case 'mark-sweep':
      return new MarkSweepManager({ trigger: o.trigger, make: o.allocator });
    case 'conservative':
      return new MarkSweepManager({ conservative: true, trigger: o.trigger, make: o.allocator });
    case 'mark-compact':
      return new MarkCompactManager({ heapBytes: o.heapBytes });
    case 'copying':
      return new CopyingManager({ semispaceBytes: o.heapBytes ? o.heapBytes / 2 : undefined });
    case 'generational':
      return new GenerationalManager({ barrier: o.generationalBarrier, nurseryBytes: o.nurseryBytes });
    case 'incremental':
      return new IncrementalManager({ barrier: o.barrier, trigger: o.trigger });
  }
}
