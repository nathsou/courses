import { describe, expect, test } from 'vitest';
import { Vm } from '../mote/vm';
import { compile } from '../mote/compile';
import { makeManager, SETTINGS, type Setting } from './managers';
import { PROGRAMS } from '../mote/programs';

function run(src: string, s: Setting, opts: Parameters<typeof makeManager>[1] = {}) {
  const m = makeManager(s, { heapBytes: 1 << 18, trigger: 2048, nurseryBytes: 2048, ...opts });
  const vm = new Vm(src, m, { heapBytes: 1 << 19 }).run();
  return { vm, m };
}

const SAFE: Setting[] = ['rc', 'rc-cycles', 'mark-sweep', 'conservative', 'mark-compact', 'copying', 'generational', 'incremental'];

describe('every setting runs the same program the same way', () => {
  for (const [name, src] of Object.entries(PROGRAMS)) {
    const ref = run(src, 'mark-sweep');
    test(`${name}: reference run`, () => {
      expect(ref.vm.error?.message ?? 'ok').toBe('ok');
    });
    for (const s of SAFE) {
      test(`${name} · ${s}`, () => {
        const { vm } = run(src, s);
        expect(vm.error?.message ?? 'ok').toBe('ok');
        expect(vm.output).toEqual(ref.vm.output);
        // Safety: nothing was freed before its last use.
        expect(vm.summary().unsafeFrees).toBe(0);
        expect(vm.summary().uaf).toBe(0);
      });
    }
  }
});

test('tracing collectors free the garbage', () => {
  for (const s of ['mark-sweep', 'mark-compact', 'copying', 'generational'] as Setting[]) {
    const { vm, m } = run(PROGRAMS.churn, s, { heapBytes: 16 * 1024 });
    expect(m.stats.collections, s).toBeGreaterThan(0);
    expect(vm.summary().freed).toBeGreaterThan(500);
  }
});

test('plain reference counting leaks cycles; trial deletion collects them', () => {
  const rc = run(PROGRAMS.cycle, 'rc');
  const rcc = run(PROGRAMS.cycle, 'rc-cycles');
  expect(rc.vm.summary().leaked).toBeGreaterThanOrEqual(100);
  expect(rcc.vm.summary().leaked).toBe(0);
});

test('reference counting frees acyclic garbage immediately', () => {
  const { vm } = run(PROGRAMS.churn, 'rc');
  const s = vm.summary();
  expect(s.leaked).toBe(0);
  // Drag is small: objects are freed within a statement or two of becoming unreachable.
  const objs = [...vm.objects.values()].filter((o) => o.freed !== undefined);
  const lag = objs.reduce((n, o) => n + (o.freed! - o.lastUse), 0) / objs.length;
  expect(lag).toBeLessThan(120);
});

test('ownership drops values at the end of their scope and stops a use after move', () => {
  const ok = run(PROGRAMS.churn, 'ownership');
  expect(ok.vm.error?.message ?? 'ok').toBe('ok');
  expect(ok.vm.summary().leaked).toBe(0);
  const bad = run(`struct B { v: int }
fn main() {
  let a = new B { v: 1 }
  let b = a
  print(a.v)
}`, 'ownership');
  expect(bad.vm.error?.message).toMatch(/use of moved value a/);
});

test('manual management: a missing free leaks, a double free is reported', () => {
  const leak = run(PROGRAMS.churn, 'manual');
  expect(leak.vm.summary().leaked).toBeGreaterThan(500);
  const df = run(`struct B { v: int }
fn main() {
  let a = new B { v: 1 }
  free(a)
  free(a)
  let x = new B { v: 2 }
  let y = new B { v: 3 }
  print(x == y)
}`, 'manual');
  expect(df.vm.events.some((e) => e.kind === 'double-free')).toBe(true);
  // The classic consequence: the free list now hands out the same block twice.
  expect(df.vm.output).toEqual(['true']);
});

test('use after free is recorded, and type confusion follows reuse', () => {
  const { vm } = run(`struct Account { balance: int, onClose: fn(int) -> int }
struct Message { length: int, code: int }
fn close(x: int) -> int { return 0 }
fn grantAdmin(x: int) -> int { print("ADMIN GRANTED"); return 1 }
fn main() {
  let acct = new Account { balance: 10, onClose: close }
  free(acct)
  let msg = new Message { length: 99, code: 4194432 }
  let f = acct.onClose
  print(f(1))
}`, 'manual');
  expect(vm.events.some((e) => e.kind === 'uaf')).toBe(true);
  expect(vm.output[0]).toBe('ADMIN GRANTED');
});

test('the generational write barrier matters', () => {
  const src = `struct N { next: N?, v: int }
fn main() {
  let old = new N { next: null, v: 1 }
  for i in 0..200 { let junk = new N { next: null, v: i } }
  old.next = new N { next: null, v: 42 }
  for i in 0..200 { let junk = new N { next: null, v: i } }
  print(old.next.v)
}`;
  const good = run(src, 'generational');
  expect(good.vm.output).toEqual(['42']);
  const bad = run(src, 'generational', { generationalBarrier: false });
  expect((bad.m as unknown as { lost: number[] }).lost.length).toBeGreaterThan(0);
});

test('every setting in the dial can be constructed', () => {
  for (const s of SETTINGS) expect(makeManager(s.id).id).toBeTruthy();
});
