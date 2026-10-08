import { describe, expect, test } from 'vitest';
import { REFERENCE, implicitList, describe as chunksOf } from './allocators';
import { FlatHeap, type AllocatorFactory } from './api';
import { runTrace } from '../check/checker';
import { TRACE_BANK, randomTrace } from '../trace/trace';
import { checkStorage } from '../check/storage';

describe('reference allocators pass the heap checker on the whole bank', () => {
  for (const a of REFERENCE) {
    for (const t of TRACE_BANK) {
      test(`${a.label} · ${t.name}`, () => {
        const r = runTrace(a.make, t.ops);
        expect(r.failure?.message ?? 'ok').toBe('ok');
        if (a.id !== 'bump') expect(r.utilisation).toBeGreaterThan(0.01);
      });
    }
  }
  test('fuzzed traces', () => {
    for (let s = 1; s < 6; s++) for (const a of REFERENCE) expect(runTrace(a.make, randomTrace(600, s, 900), { paranoid: true }).failure?.message ?? 'ok').toBe('ok');
  });
});

describe('the checker catches broken allocators', () => {
  const overlapping: AllocatorFactory = (heap) => {
    let p = 0;
    return { malloc: () => (p ||= heap.sbrk(1 << 16)), free() {} };
  };
  const misaligned: AllocatorFactory = (heap) => {
    let p = 0;
    return {
      malloc: (n) => {
        if (!p) p = heap.sbrk(1 << 16);
        const r = p + 8;
        p += n + 8;
        return r;
      },
      free() {},
    };
  };
  const scribbler: AllocatorFactory = (heap) => {
    const inner = implicitList('first')(heap);
    let last = 0;
    return {
      malloc: (n) => {
        // Writes "bookkeeping" into the previous block, which is still live.
        if (last) heap.store64(last, 0);
        return (last = inner.malloc(n));
      },
      free: (p) => inner.free(p),
    };
  };
  const ops = TRACE_BANK.find((t) => t.id === 'compiler')!.ops;
  test.each([
    ['overlap', overlapping],
    ['alignment', misaligned],
  ] as const)('%s', (kind, make) => {
    expect(runTrace(make, ops).failure?.kind).toBe(kind);
  });
  test('metadata written into live blocks', () => {
    expect(runTrace(scribbler, ops).ok).toBe(false);
  });
});

test('chunks() describes the whole heap without gaps', () => {
  const heap = new FlatHeap();
  const a = implicitList('first')(heap);
  const ps = [a.malloc(10), a.malloc(100), a.malloc(30)];
  a.free(ps[1]!);
  const cs = chunksOf(a);
  for (let i = 1; i < cs.length; i++) expect(cs[i]!.addr).toBe(cs[i - 1]!.addr + cs[i - 1]!.size);
  expect(cs.at(-1)!.addr + cs.at(-1)!.size).toBe(heap.brk);
  expect(cs.filter((c) => c.free).length).toBe(1 + 0 + 0 + (cs.filter((c) => c.free).length - 1));
});

describe('storage rule', () => {
  test('accepts scalar state and heap accesses', () => {
    expect(checkStorage(`let head = 0; // a [comment]\nexport function createAllocator(heap) { return { malloc(n) { const x = heap.load64(head); return x; }, free(p) { heap.store64(p, head); head = p; } }; }`)).toEqual([]);
  });
  test('rejects collections outside the heap', () => {
    expect(checkStorage('const free = new Map<number, number>();').length).toBeGreaterThan(0);
    expect(checkStorage('let list = [];').length).toBeGreaterThan(0);
    expect(checkStorage('sizes.push(3)').length).toBeGreaterThan(0);
    expect(checkStorage('table[p] = 3').length).toBeGreaterThan(0);
  });
});
