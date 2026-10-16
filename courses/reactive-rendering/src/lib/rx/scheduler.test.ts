import { describe, expect, test } from 'vitest';
import { bigList, preorder, simulate, toFibers, totalCost, typingScenario, units } from './scheduler';

describe('fibers', () => {
  test('toFibers links child, sibling and return', () => {
    const tree = { name: 'A', cost: 1, children: [{ name: 'B', cost: 1, children: [{ name: 'D', cost: 1 }] }, { name: 'C', cost: 1 }] };
    const a = toFibers(tree);
    expect(a.child?.name).toBe('B');
    expect(a.child?.sibling?.name).toBe('C');
    expect(a.child?.child?.name).toBe('D');
    expect(a.child?.child?.return?.name).toBe('B');
    expect(a.return).toBeNull();
  });

  test('units follow the preorder', () => {
    const tree = bigList(25, 1, 10);
    expect(units(tree).map((u) => u.label)).toEqual(preorder(tree));
    expect(totalCost(tree)).toBeCloseTo(25 + 3 * 0.2 + 0.5, 6);
  });
});

describe('simulate', () => {
  const sync = simulate(typingScenario('sync'));
  const conc = simulate(typingScenario('concurrent'));

  test('sync mode blocks input for as long as the list takes, and the backlog grows', () => {
    expect(sync.keys[0]!.latency).toBeGreaterThan(100);
    expect(sync.worstLatency).toBeGreaterThan(sync.keys[0]!.latency);
    expect(sync.longestBlock).toBeGreaterThan(100);
    expect(sync.droppedFrames).toBeGreaterThan(10);
    expect(sync.wasted).toBe(0);
  });

  test('concurrent mode echoes every keystroke at once, with no dropped frames', () => {
    expect(conc.worstLatency).toBeLessThan(8); // at worst one slice plus the echo
    expect(conc.longestBlock).toBeLessThan(16); // a slice, a unit, a commit
    expect(conc.droppedFrames).toBe(0);
  });

  test('concurrent mode throws away stale list renders and shows only the last one', () => {
    expect(conc.wasted).toBeGreaterThan(0);
    expect(conc.segments.some((s) => s.kind === 'discard')).toBe(true);
    const shown = conc.keys.filter((k) => k.listAt !== null).map((k) => k.key);
    expect(shown).toEqual([4]);
    expect(sync.keys.every((k) => k.listAt !== null)).toBe(true);
  });

  test('with a cheap list both modes feel the same', () => {
    const cheap = (mode: 'sync' | 'concurrent') => simulate(typingScenario(mode, 10, 0.2));
    expect(cheap("sync").worstLatency).toBeLessThan(8);
    expect(cheap('concurrent').wasted).toBe(0);
  });

  test('segments never overlap and are ordered in time', () => {
    for (const r of [sync, conc]) {
      let end = 0;
      for (const s of r.segments) {
        expect(s.start).toBeGreaterThanOrEqual(end - 1e-9);
        expect(s.end).toBeGreaterThanOrEqual(s.start);
        end = Math.max(end, s.end);
      }
    }
  });
});
