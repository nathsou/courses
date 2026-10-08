import { describe, expect, test } from 'vitest';
import { PhysicalMemory, PAGE_SIZE } from './phys';
import { PageTableBuilder, PTE, walk, splitVa, joinVa, encodePte, decodePte, flagString } from './sv39';
import { rng } from '../util/random';

function setup(frames = 64) {
  const mem = new PhysicalMemory(frames);
  let next = 2;
  const pt = new PageTableBuilder(mem, 1, () => next++);
  return { mem, pt };
}

describe('Sv39', () => {
  test('splits and joins virtual addresses', () => {
    const va = 0x12_3456_7abc;
    const p = splitVa(va);
    expect(p.offset).toBe(0xabc);
    expect(joinVa(p.vpn, p.offset)).toBe(va);
    expect(splitVa(2 ** 38).canonical).toBe(false);
  });

  test('PTEs round-trip and print their flags', () => {
    const raw = encodePte(0x12345, PTE.V | PTE.R | PTE.W | PTE.A);
    expect(decodePte(raw)).toEqual({ ppn: 0x12345, flags: PTE.V | PTE.R | PTE.W | PTE.A });
    expect(flagString(PTE.V | PTE.R | PTE.W | PTE.A)).toBe('-A---WRV');
  });

  test('a three-level walk finds the frame and sets A and D', () => {
    const { mem, pt } = setup();
    pt.map(0x40_0000, 40, PTE.R | PTE.W | PTE.U);
    const r = walk(mem, 1, 0x40_0123, { access: 'w', user: true });
    expect(r.ok).toBe(true);
    expect(r.pa).toBe(40 * PAGE_SIZE + 0x123);
    expect(r.steps.length).toBe(3);
    expect(pt.get(0x40_0000)!.flags & (PTE.A | PTE.D)).toBe(PTE.A | PTE.D);
  });

  test('faults: unmapped, write to read-only, user/supervisor, Svade', () => {
    const { mem, pt } = setup();
    pt.map(0x1000, 10, PTE.R | PTE.U);
    pt.map(0x2000, 11, PTE.R | PTE.W);
    expect(walk(mem, 1, 0x9000, { access: 'r', user: true }).fault!.cause).toBe(13);
    expect(walk(mem, 1, 0x1000, { access: 'w', user: true }).fault!.cause).toBe(15);
    expect(walk(mem, 1, 0x2000, { access: 'r', user: true }).fault!.reason).toMatch(/supervisor page/);
    expect(walk(mem, 1, 0x1000, { access: 'r', user: false }).fault!.reason).toMatch(/SUM/);
    expect(walk(mem, 1, 0x1000, { access: 'r', user: false, sum: true }).ok).toBe(true);
    expect(walk(mem, 1, 0x1000, { access: 'x', user: true }).fault!.cause).toBe(12);
    const fresh = setup();
    fresh.pt.map(0x3000, 12, PTE.R | PTE.U);
    expect(walk(fresh.mem, 1, 0x3000, { access: 'r', user: true, ad: 'svade' }).fault!.reason).toMatch(/Svade/);
  });

  test('megapages translate with the low VPN bits and reject misalignment', () => {
    const { mem, pt } = setup(4096);
    pt.map(0x20_0000, 512, PTE.R | PTE.U, 1);
    const r = walk(mem, 1, 0x20_0000 + 0x1_2345, { access: 'r', user: true });
    expect(r.ok && r.level).toBe(1);
    expect(r.pa).toBe(512 * PAGE_SIZE + 0x1_2345);
    pt.map(0x40_0000, 513, PTE.R | PTE.U, 1);
    expect(walk(mem, 1, 0x40_0000, { access: 'r', user: true }).fault!.reason).toMatch(/misaligned/);
  });

  test('agrees with a direct transcription of the spec on random tables', () => {
    const r = rng(7);
    for (let trial = 0; trial < 200; trial++) {
      const { mem, pt } = setup(256);
      const pages = new Map<number, { ppn: number; flags: number }>();
      for (let i = 0; i < 8; i++) {
        const va = Math.floor(r() * 2 ** 26) * PAGE_SIZE;
        const flags = [PTE.R, PTE.R | PTE.W, PTE.R | PTE.X, PTE.X][Math.floor(r() * 4)]! | PTE.U | PTE.A | PTE.D;
        const ppn = 100 + i;
        if (pages.has(va)) continue;
        pt.map(va, ppn, flags);
        pages.set(va, { ppn, flags });
      }
      for (const [va, { ppn, flags }] of pages) {
        for (const access of ['r', 'w', 'x'] as const) {
          const res = walk(mem, 1, va + 8, { access, user: true });
          const allowed = access === 'r' ? flags & PTE.R : access === 'w' ? flags & PTE.W : flags & PTE.X;
          expect(res.ok).toBe(!!allowed);
          if (res.ok) expect(res.pa).toBe(ppn * PAGE_SIZE + 8);
        }
      }
    }
  });
});
