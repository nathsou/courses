import { describe, expect, test } from 'vitest';
import { CLOCK_WIRE, clockTiming, grid, hTree, scatter, spanningTree, spine } from './clock';

const centre = { x: 500, y: 500 };

describe('clock distribution', () => {
  test('Elmore delay of one wire matches the formula', () => {
    const t = clockTiming(spanningTree({ x: 0, y: 0 }, [{ x: 300, y: 400 }]));
    const { r, c, pin, driver } = CLOCK_WIRE;
    const L = 700;
    expect(t.arrival[0]).toBeCloseTo(driver * (c * L + pin) + r * L * ((c * L) / 2 + pin), 20);
    expect(t.wire).toBe(L);
  });

  test('the least-wire tree uses the least wire but has the most skew', () => {
    for (const seed of [1, 2, 3]) {
      const sinks = scatter(64, 1000, seed);
      const mst = clockTiming(spanningTree(centre, sinks));
      const sp = clockTiming(spine(centre, sinks));
      const h = clockTiming(hTree(1000, 3, sinks));
      expect(mst.wire).toBeLessThan(sp.wire);
      expect(mst.wire).toBeLessThan(h.wire);
      expect(mst.skew).toBeGreaterThan(sp.skew);
      expect(h.skew).toBeLessThan(mst.skew / 4);
      expect(h.skew).toBeLessThan(sp.skew / 3);
    }
  });

  test('an H-tree over a matching regular array has no skew', () => {
    const t = clockTiming(hTree(1000, 3, grid(8, 1000)));
    expect(t.skew).toBeLessThan(1e-16);
    expect(hTree(1000, 3, []).nodes.length).toBe(1 + 6 * (1 + 4 + 16)); // the centre, then two arms and four ends for every H
  });

  test('every node of every tree is reachable from the source', () => {
    const sinks = scatter(30, 1000, 7);
    for (const tree of [spanningTree(centre, sinks), spine(centre, sinks), hTree(1000, 2, sinks)]) {
      const t = clockTiming(tree);
      expect(t.arrival.every((a) => a > 0 && Number.isFinite(a))).toBe(true);
      expect(tree.sinkNodes.length).toBe(30);
    }
  });
});
