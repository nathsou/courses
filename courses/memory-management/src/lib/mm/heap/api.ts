/**
 * The Heap API: what an allocator sees (PLAN §7, appendix D). Addresses are plain numbers. An allocator gets its
 * memory from the "kernel" with `sbrk` (grow the heap segment) and keeps all of its bookkeeping in that memory:
 * only scalar module-level variables are allowed outside it (the storage rule, checked in check/storage.ts).
 */
import { Hierarchy, type CacheConfig } from '../machine/cache';

export interface Heap {
  load8(addr: number): number;
  load32(addr: number): number;
  /** Values up to 2^53 − 1: enough for any address or size. */
  load64(addr: number): number;
  store8(addr: number, value: number): void;
  store32(addr: number, value: number): void;
  store64(addr: number, value: number): void;
  /** Grow (or shrink) the heap by `bytes`; returns the old break, or -1 if memory is exhausted. */
  sbrk(bytes: number): number;
  readonly pageSize: number;
}

export interface ChunkInfo {
  addr: number;
  size: number;
  free: boolean;
  /** Optional label (e.g. "header", "prologue"). */
  note?: string;
}

export interface Allocator {
  /** A 16-byte-aligned payload address, or 0 when memory is exhausted. */
  malloc(size: number): number;
  free(ptr: number): void;
  realloc?(ptr: number, size: number): number;
  /** Optional: lets the heap inspector draw your chunks (whole blocks, headers included). */
  chunks?(): Iterable<ChunkInfo>;
  /** Optional: a name for the scoreboard. */
  name?: string;
}

export type AllocatorFactory = (heap: Heap) => Allocator;

export class HeapError extends Error {}

export interface HeapStats {
  loads: number;
  stores: number;
  cycles: number;
  sbrkCalls: number;
}

export type HeapEvent = { kind: 'load' | 'store'; addr: number; size: number } | { kind: 'sbrk'; old: number; bytes: number };

/**
 * A fast heap over one byte array: addresses [base, base + capacity). Used by figures, exercises and the lab
 * bench. Loads and stores are counted and, optionally, priced by a cache model (simulated cycles). The checker
 * reads and writes through `raw`, which is neither counted nor priced.
 */
export class FlatHeap implements Heap {
  readonly bytes: Uint8Array;
  readonly view: DataView;
  readonly pageSize = 4096;
  brk: number;
  /** Highest break reached (for utilisation). */
  peakBrk: number;
  stats: HeapStats = { loads: 0, stores: 0, cycles: 0, sbrkCalls: 0 };
  readonly caches?: Hierarchy;
  /** Optional event log for figures (bounded). */
  log?: HeapEvent[];
  logLimit = 20000;

  constructor(
    readonly base = 0x1000,
    readonly capacity = 1 << 20,
    cache?: { configs: CacheConfig[]; dram: number },
  ) {
    if (base % 16) throw new Error('FlatHeap: base must be 16-byte aligned');
    this.bytes = new Uint8Array(capacity);
    this.view = new DataView(this.bytes.buffer);
    this.brk = this.peakBrk = base;
    if (cache) this.caches = new Hierarchy(cache.configs, cache.dram);
  }

  get end(): number {
    return this.brk;
  }

  private at(addr: number, n: number, write: boolean): number {
    if (!Number.isInteger(addr)) throw new HeapError(`address ${addr} is not an integer`);
    if (addr < this.base || addr + n > this.brk) throw new HeapError(`${write ? 'store to' : 'load from'} 0x${addr.toString(16)} is outside the heap [0x${this.base.toString(16)}, 0x${this.brk.toString(16)})`);
    if (addr % n) throw new HeapError(`misaligned ${n}-byte ${write ? 'store to' : 'load from'} 0x${addr.toString(16)}`);
    if (write) this.stats.stores++;
    else this.stats.loads++;
    this.stats.cycles += this.caches ? this.caches.access(addr).cycles : 1;
    if (this.log && this.log.length < this.logLimit) this.log.push({ kind: write ? 'store' : 'load', addr, size: n });
    return addr - this.base;
  }

  load8(addr: number): number {
    return this.bytes[this.at(addr, 1, false)]!;
  }
  load32(addr: number): number {
    return this.view.getUint32(this.at(addr, 4, false), true);
  }
  load64(addr: number): number {
    const o = this.at(addr, 8, false);
    return this.view.getUint32(o, true) + this.view.getUint32(o + 4, true) * 2 ** 32;
  }
  store8(addr: number, v: number): void {
    this.bytes[this.at(addr, 1, true)] = v;
  }
  store32(addr: number, v: number): void {
    this.view.setUint32(this.at(addr, 4, true), v >>> 0, true);
  }
  store64(addr: number, v: number): void {
    if (!Number.isSafeInteger(v) || v < 0) throw new HeapError(`store64: ${v} is not an integer in [0, 2^53)`);
    const o = this.at(addr, 8, true);
    this.view.setUint32(o, v % 2 ** 32, true);
    this.view.setUint32(o + 4, Math.floor(v / 2 ** 32), true);
  }

  sbrk(bytes: number): number {
    if (!Number.isInteger(bytes)) throw new HeapError(`sbrk(${bytes}): not an integer`);
    this.stats.sbrkCalls++;
    this.stats.cycles += 300;
    const old = this.brk;
    const next = old + bytes;
    if (next < this.base || next > this.base + this.capacity) return -1;
    this.brk = next;
    this.peakBrk = Math.max(this.peakBrk, next);
    if (this.log && this.log.length < this.logLimit) this.log.push({ kind: 'sbrk', old, bytes });
    return old;
  }

  /** Unchecked, uncounted access for the checker and for figures. */
  readonly raw = {
    load8: (addr: number) => this.bytes[addr - this.base] ?? 0,
    store8: (addr: number, v: number) => {
      if (addr >= this.base && addr < this.base + this.capacity) this.bytes[addr - this.base] = v;
    },
    load64: (addr: number) => this.view.getUint32(addr - this.base, true) + this.view.getUint32(addr - this.base + 4, true) * 2 ** 32,
  };

  /** The heap's bytes in [from, to) (for figures). */
  slice(from: number, to: number): Uint8Array {
    return this.bytes.subarray(Math.max(0, from - this.base), Math.max(0, to - this.base));
  }

  resetStats(): void {
    this.stats = { loads: 0, stores: 0, cycles: 0, sbrkCalls: 0 };
  }
}
