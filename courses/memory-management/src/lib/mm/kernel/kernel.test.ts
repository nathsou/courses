import { describe, expect, test } from 'vitest';
import { Kernel, Segfault, COW } from './kernel';
import { BuddyAllocator } from './buddy';
import { simulate, faults, BELADY_STRING } from './replace';
import { SlabCache } from './slab';
import { rng } from '../util/random';
import { PAGE_SIZE } from '../machine/phys';

describe('buddy allocator', () => {
  test('splits, merges and keeps every frame accounted for', () => {
    const b = new BuddyAllocator(64);
    const a = b.alloc(0);
    const c = b.alloc(2);
    expect(a).toBe(0);
    expect(c).toBe(4);
    expect(b.freeFrames()).toBe(64 - 1 - 4);
    b.free_(a);
    b.free_(c);
    expect(b.freeFrames()).toBe(64);
    expect(b.largestFree()).toBe(6);
  });

  test('random workloads never overlap and coalesce completely', () => {
    const r = rng(3);
    const b = new BuddyAllocator(256);
    const live: number[] = [];
    for (let i = 0; i < 2000; i++) {
      if (live.length && r() < 0.45) b.free_(live.splice(Math.floor(r() * live.length), 1)[0]!);
      else {
        const f = b.alloc(Math.floor(r() * 4));
        if (f >= 0) live.push(f);
      }
      const used = new Set<number>();
      for (const blk of b.blocks()) for (let k = 0; k < 2 ** blk.order; k++) {
        expect(used.has(blk.frame + k)).toBe(false);
        used.add(blk.frame + k);
      }
      expect(used.size).toBe(256);
    }
    for (const f of live) b.free_(f);
    expect(b.largestFree()).toBe(8);
  });
});

describe('page replacement', () => {
  test("Bélády's anomaly: FIFO faults more with more frames", () => {
    expect(faults(simulate(BELADY_STRING, 3, 'fifo'))).toBe(9);
    expect(faults(simulate(BELADY_STRING, 4, 'fifo'))).toBe(10);
  });
  test('OPT is never beaten', () => {
    const r = rng(9);
    for (let t = 0; t < 50; t++) {
      const refs = Array.from({ length: 40 }, () => Math.floor(r() * 7));
      const opt = faults(simulate(refs, 3, 'opt'));
      for (const p of ['fifo', 'lru', 'clock', 'random'] as const) expect(faults(simulate(refs, 3, p))).toBeGreaterThanOrEqual(opt);
    }
  });
});

describe('slab cache', () => {
  test('fills partial slabs first and reaps empty ones', () => {
    const s = new SlabCache('inode', 600);
    expect(s.perSlab).toBe(6);
    const objs = Array.from({ length: 8 }, () => s.alloc());
    expect(s.slabs.length).toBe(2);
    for (const o of objs.slice(0, 6)) s.free(o.slab, o.index);
    expect(s.reap()).toBe(1);
    expect(() => s.free(1, 0)).not.toThrow();
    expect(() => s.free(1, 0)).toThrow(/double free/);
  });
});

describe('kernel', () => {
  test('demand-zero pages appear on first touch', () => {
    const k = new Kernel(256);
    const p = k.spawn();
    k.standardLayout(p);
    const m = k.machine;
    const old = k.sbrk(p, 3 * PAGE_SIZE);
    expect(p.resident().length).toBe(0);
    m.store64(old + 16, 42);
    expect(m.load64(old + 16)).toBe(42);
    expect(k.events.filter((e) => e.kind === 'fault' && e.resolution === 'demand-zero').length).toBe(1);
    expect(m.load64(old + PAGE_SIZE)).toBe(0);
  });

  test('guard pages and unmapped addresses segfault', () => {
    const k = new Kernel(256);
    const p = k.spawn();
    k.standardLayout(p);
    const guard = p.vmas.find((v) => v.kind === 'guard')!;
    expect(() => k.machine.load8(guard.start)).toThrow(Segfault);
    expect(() => k.machine.load8(0x8)).toThrow(/no mapping/);
    const text = p.vmas.find((v) => v.kind === 'text')!;
    expect(() => k.machine.store8(text.start, 1)).toThrow(/read-only/);
  });

  test('fork shares pages copy-on-write and splits them on the first write', () => {
    const k = new Kernel(256);
    const parent = k.spawn();
    k.standardLayout(parent);
    const heap = k.sbrk(parent, 2 * PAGE_SIZE);
    k.machine.store64(heap, 7);
    k.machine.store64(heap + PAGE_SIZE, 8);
    const child = k.fork(parent);
    const frameBefore = parent.pt.get(heap)!.ppn;
    expect(child.pt.get(heap)!.ppn).toBe(frameBefore);
    expect(parent.pt.get(heap)!.flags & COW).toBe(COW);
    k.as(child, () => k.machine.store64(heap, 99));
    expect(k.as(child, () => k.machine.load64(heap))).toBe(99);
    expect(k.machine.load64(heap)).toBe(7);
    expect(child.pt.get(heap)!.ppn).not.toBe(frameBefore);
    // The parent is now the only user of the original frame: its write reuses it without copying.
    k.machine.store64(heap, 70);
    expect(k.events.at(-1)).toMatchObject({ kind: 'fault', resolution: 'cow-reuse' });
    expect(k.as(child, () => k.machine.load64(heap + PAGE_SIZE))).toBe(8);
  });

  test('frames are returned on exit', () => {
    const k = new Kernel(256);
    const p = k.spawn();
    k.standardLayout(p);
    const before = k.frames.freeFrames();
    const heap = k.sbrk(p, 4 * PAGE_SIZE);
    for (let i = 0; i < 4; i++) k.machine.store8(heap + i * PAGE_SIZE, 1);
    const child = k.fork(p);
    k.exit(child);
    k.exit(p);
    // Page-table frames are not reclaimed by the toy kernel; data frames are.
    expect(k.frames.freeFrames()).toBeGreaterThanOrEqual(before - 8);
    expect(k.refs.size).toBe(0);
  });

  test('the TLB caches translations', () => {
    const k = new Kernel(256);
    const p = k.spawn();
    k.standardLayout(p);
    const heap = k.sbrk(p, PAGE_SIZE);
    k.machine.store64(heap, 1);
    k.machine.resetStats();
    for (let i = 0; i < 100; i++) k.machine.load64(heap + (i % 64) * 8);
    expect(k.machine.stats.walks).toBe(0);
    expect(k.machine.tlb.stats.hits).toBe(100);
  });
});
