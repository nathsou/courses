/**
 * Word-addressed memory for the Mote VM: byte addresses (multiples of 8) naming 64-bit words that hold
 * JavaScript integers, so Mote's ints can be negative and a word can be read as an int, a pointer or a code
 * address without conversion. It implements the Heap API's word operations (allocators that use only load64 and
 * store64 run on it unchanged, including the reader's).
 */
import { HeapError, type Heap } from './api';

export class WordMemory implements Heap {
  readonly words: Float64Array;
  readonly pageSize = 4096;
  brk: number;
  peakBrk: number;
  stats = { loads: 0, stores: 0, sbrkCalls: 0 };
  /** Words written by the program since the last reset of `dirty` (for figures that flash changes). */
  dirty?: Set<number>;
  /** Called on every counted access (for figures that replay the accesses on the simulated machine). */
  trace?: (addr: number, write: boolean) => void;

  constructor(
    readonly base: number,
    readonly capacity: number,
    readonly name = 'memory',
  ) {
    if (base % 16) throw new Error('WordMemory: base must be 16-byte aligned');
    this.words = new Float64Array(capacity / 8);
    this.brk = this.peakBrk = base;
  }

  get end(): number {
    return this.base + this.capacity;
  }

  contains(addr: number): boolean {
    return addr >= this.base && addr < this.brk;
  }

  index(addr: number): number {
    if (addr % 8 || addr < this.base || addr >= this.brk) {
      if (addr === 0) throw new HeapError('null pointer dereference (address 0)');
      throw new HeapError(addr % 8 ? `misaligned word access at 0x${addr.toString(16)}` : `segmentation fault: 0x${addr.toString(16)} is outside ${this.name} [0x${this.base.toString(16)}, 0x${this.brk.toString(16)})`);
    }
    return (addr - this.base) / 8;
  }

  load64(addr: number): number {
    this.stats.loads++;
    const v = this.words[this.index(addr)]!;
    this.trace?.(addr, false);
    return v;
  }
  store64(addr: number, v: number): void {
    this.stats.stores++;
    this.words[this.index(addr)] = v;
    this.dirty?.add(addr);
    this.trace?.(addr, true);
  }
  /** Uncounted access for collectors' bookkeeping views and figures. */
  peek(addr: number): number {
    return this.words[(addr - this.base) / 8] ?? 0;
  }
  poke(addr: number, v: number): void {
    this.words[(addr - this.base) / 8] = v;
  }

  load8(): number {
    throw new HeapError('Mote memory is word-addressed: use load64');
  }
  load32(): number {
    throw new HeapError('Mote memory is word-addressed: use load64');
  }
  store8(): void {
    throw new HeapError('Mote memory is word-addressed: use store64');
  }
  store32(): void {
    throw new HeapError('Mote memory is word-addressed: use store64');
  }

  sbrk(bytes: number): number {
    this.stats.sbrkCalls++;
    const old = this.brk;
    const next = old + bytes;
    if (next < this.base || next > this.end || next % 8) return -1;
    this.brk = next;
    this.peakBrk = Math.max(this.peakBrk, next);
    return old;
  }

  /** Copy `n` words (used by moving collectors). */
  copyWords(from: number, to: number, n: number): void {
    const a = this.index(from);
    const b = this.index(to);
    this.words.copyWithin(b, a, a + n);
    this.stats.loads += n;
    this.stats.stores += n;
    if (this.trace) for (let i = 0; i < n; i++) (this.trace(from + i * 8, false), this.trace(to + i * 8, true));
  }
}
