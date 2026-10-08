/**
 * The heap checker (PLAN §7). Independent of the allocator under test, it records every block it was given and
 * checks, after every operation: the address is 16-byte aligned; the block lies inside memory obtained from the
 * kernel; it overlaps no other live block; its payload still holds the pattern the checker wrote (which catches
 * allocators that write their bookkeeping into live blocks); and realloc kept the contents.
 */
import { FlatHeap, HeapError, type Allocator, type AllocatorFactory } from '../heap/api';
import type { Op } from '../trace/trace';
import { peakLive } from '../trace/trace';

export interface CheckFailure {
  /** Index of the operation in the trace. */
  at: number;
  op: Op;
  kind: 'alignment' | 'bounds' | 'overlap' | 'corrupted' | 'realloc-lost' | 'null' | 'exception';
  message: string;
}

export interface CheckReport {
  ok: boolean;
  failure?: CheckFailure;
  ops: number;
  /** Peak live payload / peak heap size. */
  utilisation: number;
  peakLive: number;
  peakHeap: number;
  /** Simulated cycles per operation (cost of the allocator's own loads, stores and sbrk calls). */
  cyclesPerOp: number;
  loads: number;
  stores: number;
}

const pattern = (id: number, i: number) => (id * 131 + i * 7 + 1) & 0xff;

export interface RunOptions {
  /** Heap capacity in bytes. */
  capacity?: number;
  /** Price loads and stores with a cache model instead of 1 cycle each. */
  cache?: boolean;
  /** Called after each operation (for figures that animate a trace). */
  onStep?: (i: number, heap: FlatHeap, alloc: Allocator) => void;
  /** Check payload patterns of every live block after every op (slow; default checks on free and realloc). */
  paranoid?: boolean;
}

export function runTrace(make: AllocatorFactory, ops: Op[], opts: RunOptions = {}): CheckReport {
  const heap = new FlatHeap(0x10000, opts.capacity ?? 1 << 22, opts.cache ? { configs: [{ name: 'L1', size: 32768, ways: 8, line: 64, latency: 4 }, { name: 'L2', size: 524288, ways: 8, line: 64, latency: 14 }], dram: 200 } : undefined);
  const alloc = make(heap);
  const live = new Map<number, { addr: number; size: number }>();
  const report = (at: number, kind: CheckFailure['kind'], message: string): CheckReport => ({ ...summary(), ok: false, failure: { at, op: ops[at]!, kind, message } });
  const summary = () => ({
    ok: true,
    ops: ops.length,
    peakLive: peakLive(ops),
    peakHeap: heap.peakBrk - heap.base,
    utilisation: heap.peakBrk > heap.base ? peakLive(ops) / (heap.peakBrk - heap.base) : 0,
    cyclesPerOp: ops.length ? heap.stats.cycles / ops.length : 0,
    loads: heap.stats.loads,
    stores: heap.stats.stores,
  });

  const fill = (id: number, addr: number, size: number) => {
    for (let i = 0; i < size; i++) heap.raw.store8(addr + i, pattern(id, i));
  };
  const intact = (id: number, addr: number, size: number) => {
    for (let i = 0; i < size; i++) if (heap.raw.load8(addr + i) !== pattern(id, i)) return i;
    return -1;
  };
  const place = (i: number, id: number, addr: number, size: number): CheckReport | undefined => {
    const hex = `0x${addr.toString(16)}`;
    if (!addr) return report(i, 'null', `malloc(${size}) returned 0 (out of memory?) with ${heap.brk - heap.base} bytes of heap`);
    if (addr % 16) return report(i, 'alignment', `block ${id} at ${hex} is not 16-byte aligned`);
    if (addr < heap.base || addr + size > heap.brk) return report(i, 'bounds', `block ${id} at ${hex} (${size} bytes) is not inside the heap [0x${heap.base.toString(16)}, 0x${heap.brk.toString(16)})`);
    for (const [other, b] of live) {
      if (other !== id && addr < b.addr + b.size && b.addr < addr + size) return report(i, 'overlap', `block ${id} at ${hex} overlaps live block ${other} at 0x${b.addr.toString(16)} (${b.size} bytes)`);
    }
    live.set(id, { addr, size });
    return undefined;
  };

  let i = 0;
  try {
    for (i = 0; i < ops.length; i++) {
      const o = ops[i]!;
      if (o.op === 'a') {
        const p = alloc.malloc(o.size);
        const bad = place(i, o.id, p, o.size);
        if (bad) return bad;
        fill(o.id, p, o.size);
      } else if (o.op === 'f') {
        const b = live.get(o.id);
        if (!b) continue;
        const k = intact(o.id, b.addr, b.size);
        if (k >= 0) return report(i, 'corrupted', `block ${o.id} at 0x${b.addr.toString(16)} was overwritten at byte ${k} while it was live: did the allocator write its bookkeeping into it?`);
        live.delete(o.id);
        alloc.free(b.addr);
      } else {
        const b = live.get(o.id);
        if (b) {
          const k = intact(o.id, b.addr, b.size);
          if (k >= 0) return report(i, 'corrupted', `block ${o.id} was overwritten at byte ${k} before realloc`);
        }
        let p: number;
        if (alloc.realloc) p = alloc.realloc(b?.addr ?? 0, o.size);
        else {
          // No realloc: do what a C library wrapper would, malloc, copy and free.
          p = alloc.malloc(o.size);
          if (p && b) for (let k = 0; k < Math.min(b.size, o.size); k++) heap.raw.store8(p + k, heap.raw.load8(b.addr + k));
          if (b) alloc.free(b.addr);
        }
        live.delete(o.id);
        const bad = place(i, o.id, p, o.size);
        if (bad) return bad;
        const keep = Math.min(b?.size ?? 0, o.size);
        const k = intact(o.id, p, keep);
        if (k >= 0) return report(i, 'realloc-lost', `realloc of block ${o.id} lost its contents at byte ${k}`);
        fill(o.id, p, o.size);
      }
      if (opts.paranoid) for (const [id, b] of live) if (intact(id, b.addr, b.size) >= 0) return report(i, 'corrupted', `live block ${id} was overwritten`);
      opts.onStep?.(i, heap, alloc);
    }
  } catch (e) {
    return report(Math.min(i, ops.length - 1), 'exception', e instanceof HeapError ? e.message : e instanceof Error ? `${e.name}: ${e.message}` : String(e));
  }
  return summary();
}

/** The scoreboard's single number: a weighted mix of utilisation and throughput relative to a target. */
export function performanceIndex(r: CheckReport, targetCycles = 60, weight = 0.6): number {
  if (!r.ok) return 0;
  return 100 * (weight * Math.min(1, r.utilisation) + (1 - weight) * Math.min(1, targetCycles / Math.max(1, r.cyclesPerOp)));
}
