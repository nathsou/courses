import { describe, expect, test } from 'vitest';
import { design } from './hdl';
import { synthesize } from './techmap';
import { DECADE_COUNTER } from './designs';
import { annealAll, hpwl, positions, problemFrom, randomPlacement, rowWidth } from './place';
import { routeAll, search, type RouteGrid } from './route';
import { analyse } from './sta';
import { allFaults, atpg, coverage, detects, faultName, testPorts, vectorOf } from './faults';

const nl = synthesize(design(DECADE_COUNTER));

describe('placement', () => {
  const p = problemFrom(nl);
  test('every cell placed once, no row over capacity', () => {
    const pl = randomPlacement(p, 3);
    expect(pl.flat().sort()).toEqual(p.cells.map((c) => c.id).sort());
    for (const row of pl) expect(rowWidth(p, row)).toBeLessThanOrEqual(p.sites);
    expect(positions(p, pl).size).toBe(p.cells.length + p.io.length);
  });
  test('annealing shortens the wires a lot, and stays legal', () => {
    const start = randomPlacement(p, 3);
    const end = annealAll(p, start, { seed: 5, batches: 60 });
    expect(end.cost).toBeLessThan(0.7 * hpwl(p, start));
    for (const row of end.placement) expect(rowWidth(p, row)).toBeLessThanOrEqual(p.sites);
    expect(end.placement.flat().sort()).toEqual(p.cells.map((c) => c.id).sort());
  });
});

describe('routing', () => {
  const empty: RouteGrid = { w: 10, h: 6, blocked: new Set() };
  test('a straight run on the preferred layer costs one per step', () => {
    const r = search(empty, new Set(), [{ x: 0, y: 2, z: 0 }], [7, 2]);
    expect(r.path!.length).toBe(8);
  });
  test('a wall forces a detour', () => {
    const wall: RouteGrid = { w: 10, h: 6, blocked: new Set([0, 1, 2, 3, 4].flatMap((y) => [`5,${y},0`, `5,${y},1`])) };
    const r = search(wall, new Set(), [{ x: 0, y: 0, z: 0 }], [9, 0]);
    expect(r.path!.some((c) => c.y === 5)).toBe(true);
  });
  test('on one layer crossing nets cannot both route; with two layers and vias they can', () => {
    const across = { name: 'across', pins: [[0, 3], [9, 3]] as [number, number][] };
    const down = { name: 'down', pins: [[5, 0], [5, 5]] as [number, number][] };
    expect(routeAll({ ...empty, layers: 1 }, [across, down]).failed).toEqual(['down']);
    const two = routeAll(empty, [across, down]);
    expect(two.failed).toEqual([]);
    expect(two.routes.get('down')!.some((c) => c.x === 5 && c.y === 3 && c.z === 1)).toBe(true);
  });
});

describe('static timing', () => {
  const t = analyse(nl, { period: 1000 });
  test('arrival grows along paths; slack is required minus arrival', () => {
    for (const e of t.endpoints) expect(e.slack).toBeCloseTo(e.required - e.arrival, 9);
    expect(t.worst.slack).toBeGreaterThan(0);
  });
  test('the critical path starts at a flip-flop and ends at a flip-flop or output', () => {
    expect(t.critical.length).toBeGreaterThan(2);
    expect(nl.flops.map((f) => f.q).concat(nl.inputs)).toContain(t.critical[0]);
  });
  test('at the minimum period the worst slack is zero', () => {
    const tight = analyse(nl, { period: t.minPeriod });
    expect(tight.worst.slack).toBeCloseTo(0, 6);
    expect(analyse(nl, { period: t.minPeriod - 1 }).worst.slack).toBeLessThan(0);
  });
  test('upsizing a critical cell helps it; skew can break hold', () => {
    const id = t.criticalCells.at(-1)!;
    const up = analyse(nl, { period: 1000, sizes: { [id]: 2 } });
    expect(up.delay.get(id)!).toBeLessThan(t.delay.get(id)!);
    const skewed = analyse(nl, { period: 1000, skew: Object.fromEntries(nl.flops.map((f, i) => [f.id, i === 0 ? 200 : 0])) });
    expect(skewed.worstHold).toBeLessThan(0);
    expect(t.worstHold).toBeGreaterThan(0);
  });
});

describe('fault simulation and test generation', () => {
  const faults = allFaults(nl);
  test('stuck-at faults on every net', () => {
    expect(faults.length).toBe(2 * (testPorts(nl).controls.length + nl.instances.length));
  });
  test('a single vector detects some faults, not all', () => {
    const d = detects(nl, vectorOf(nl, 0), faults);
    expect(d.length).toBeGreaterThan(0);
    expect(d.length).toBeLessThan(faults.length);
  });
  test('ATPG finds a short test set that detects every detectable fault', () => {
    const r = atpg(nl, faults);
    const c = coverage(nl, r.vectors, faults);
    expect(c.detected.size).toBe(faults.length - r.redundant.length);
    expect(r.vectors.length).toBeLessThan(30);
    expect(r.vectors.length).toBeGreaterThan(3);
    void faultName;
  });
});
