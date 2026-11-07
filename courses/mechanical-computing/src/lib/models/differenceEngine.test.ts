import { expect, test } from 'vitest';
import { DESlice, differenceEngineModel } from './differenceEngine';
import { evalPoly, POLYS, staggeredColumns } from '$lib/mech/difference';

test('the 3D slice tabulates Euler’s polynomial, cycle by cycle, animated or not', () => {
  const p = POLYS.euler!.p;
  const s = new DESlice(staggeredColumns(p));
  for (let k = 0; k < 6; k++) s.cycle();
  let frames = 0;
  while (s.update(16)) if (++frames > 10000) throw new Error('never settles');
  expect(s.printed).toEqual([1n, 2n, 3n, 4n, 5n, 6n].map((x) => evalPoly(p, x)));
});

test('the model poses every node without NaN', () => {
  const model = differenceEngineModel();
  const s = new DESlice(staggeredColumns(POLYS.euler!.p));
  const m = new Float32Array(model.nodes.length * 16);
  s.cycle();
  for (let k = 0; k < 50; k++) {
    s.update(50);
    model.pose(m, s);
    expect(m.every((v) => Number.isFinite(v))).toBe(true);
  }
});
