/**
 * The collector workbench (`@mm/gc`): a small heap of objects for the chapters' collector exercises, with the
 * same layout as Mote's objects but no language around it.
 *
 *   object: [ header | aux | pointer fields… | int fields… ]      header = type × 16 + flags
 *
 * The roots are a handful of slots in a separate root area (think: the stack and the globals). Objects are
 * allocated contiguously from the start of the heap (bump allocation), so the heap can be walked object by object.
 */
import { WordMemory } from '../heap/words';
import { rng } from '../util/random';

export const MARK = 1;
export const FORWARDED = 2;
export const GREY = 4;

export interface GcType {
  name: string;
  pointers: number;
  ints: number;
}

export class GcHeap {
  readonly mem: WordMemory;
  readonly roots: WordMemory;
  readonly types: GcType[] = [];
  /** Where the next object goes (bump allocation). */
  top: number;
  /** Bookkeeping for tests and figures (not visible to collectors that play fair). */
  freed = new Set<number>();
  /** Work counter: how many objects a collector visited. */
  visits = 0;

  constructor(opts: { bytes?: number; roots?: number } = {}) {
    this.mem = new WordMemory(0x1_0000, opts.bytes ?? 64 * 1024, 'the heap');
    this.mem.brk = this.mem.end;
    this.top = this.mem.base;
    this.roots = new WordMemory(0x7000, (opts.roots ?? 8) * 8, 'the roots');
    this.roots.brk = this.roots.end;
  }

  addType(name: string, pointers: number, ints = 0): number {
    this.types.push({ name, pointers, ints });
    return this.types.length - 1;
  }

  /** Bytes of an object of type t. */
  sizeOfType(t: number): number {
    const ty = this.types[t]!;
    return (2 + ty.pointers + ty.ints) * 8;
  }

  alloc(type: number): number {
    const size = this.sizeOfType(type);
    if (this.top + size > this.mem.end) return 0;
    const o = this.top;
    this.top += size;
    this.mem.poke(o, type * 16);
    for (let i = 8; i < size; i += 8) this.mem.poke(o + i, 0);
    return o;
  }

  // ── What collectors call ──

  typeOf(o: number): number {
    return Math.floor(this.mem.peek(o) / 16);
  }
  size(o: number): number {
    return this.sizeOfType(this.typeOf(o));
  }
  /** Addresses of o's pointer fields. */
  pointerSlots(o: number): number[] {
    return Array.from({ length: this.types[this.typeOf(o)]!.pointers }, (_, i) => o + 16 + i * 8);
  }
  /** The objects o points to (non-null). */
  children(o: number): number[] {
    return this.pointerSlots(o).map((s) => this.mem.peek(s)).filter((v) => v !== 0);
  }
  get(slot: number): number {
    return slot >= this.roots.base && slot < this.roots.end ? this.roots.peek(slot) : this.mem.peek(slot);
  }
  set(slot: number, v: number): void {
    if (slot >= this.roots.base && slot < this.roots.end) this.roots.poke(slot, v);
    else this.mem.poke(slot, v);
  }
  /** The root slots (addresses). */
  rootSlots(): number[] {
    return Array.from({ length: this.roots.capacity / 8 }, (_, i) => this.roots.base + i * 8);
  }
  /** The objects the roots point to (non-null). */
  rootObjects(): number[] {
    return this.rootSlots().map((s) => this.roots.peek(s)).filter((v) => v !== 0);
  }
  flags(o: number): number {
    return this.mem.peek(o) % 16;
  }
  isMarked(o: number): boolean {
    this.visits++;
    return (this.flags(o) & MARK) !== 0;
  }
  setMarked(o: number, on = true): void {
    const h = this.mem.peek(o);
    const f = h % 16;
    this.mem.poke(o, h - f + (on ? f | MARK : f & ~MARK));
  }
  aux(o: number): number {
    return this.mem.peek(o + 8);
  }
  setAux(o: number, v: number): void {
    this.mem.poke(o + 8, v);
  }
  /** Walk every object in the heap, from the bottom up. */
  *objects(): Generator<number> {
    for (let o = this.mem.base; o < this.top; o += this.size(o)) yield o;
  }
  /** Free an object (a sweeper's job): it is marked dead in place. */
  free(o: number): void {
    this.freed.add(o);
    const h = this.mem.peek(o);
    this.mem.poke(o, h - (h % 16) + 8); // flag 8 = dead
  }
  isFree(o: number): boolean {
    return (this.flags(o) & 8) !== 0;
  }

  // ── Reference answers (for tests) ──

  reachable(): Set<number> {
    const seen = new Set<number>();
    const work = this.rootObjects();
    while (work.length) {
      const o = work.pop()!;
      if (seen.has(o)) continue;
      seen.add(o);
      for (const c of this.children(o)) work.push(c);
    }
    return seen;
  }

  /** A random graph: n objects of a two-pointer type, edges and roots chosen with a seed. */
  static random(n: number, seed = 1, opts: { roots?: number; edges?: number } = {}): GcHeap {
    const r = rng(seed);
    const h = new GcHeap({ bytes: Math.max(4096, n * 64), roots: opts.roots ?? 4 });
    const t = h.addType('Node', 2, 1);
    const objs = Array.from({ length: n }, () => h.alloc(t));
    for (const o of objs) {
      for (const s of h.pointerSlots(o)) if (r() < (opts.edges ?? 0.6)) h.set(s, objs[Math.floor(r() * n)]!);
      h.mem.poke(o + 32, Math.floor(r() * 100));
    }
    for (const s of h.rootSlots()) if (r() < 0.75) h.set(s, objs[Math.floor(r() * n)]!);
    return h;
  }
}
