import { describe, expect, test } from 'vitest';
import { addColumns, delta, differenceTable, engineCycle, evalPoly, fromDigits, initialColumns, naiveStep, POLYS, staggeredColumns, toDigits } from './difference';

describe('method of differences', () => {
  test('a polynomial of degree n has constant n-th differences', () => {
    const vals = Array.from({ length: 10 }, (_, x) => evalPoly(POLYS.cubes!.p, BigInt(x)));
    const t = differenceTable(vals, 3);
    expect(new Set(t[3]!.map(String))).toEqual(new Set(['6']));
  });

  test('naive stepping reproduces the table', () => {
    for (const { p } of Object.values(POLYS)) {
      const cols = initialColumns(p);
      for (let x = 0n; x < 30n; x++) {
        expect(cols[0]).toBe(evalPoly(p, x));
        naiveStep(cols);
      }
    }
  });

  test('the engine’s two half-cycles reproduce the table from staggered starting values', () => {
    for (const { p } of Object.values(POLYS)) {
      const cols = staggeredColumns(p);
      for (let x = 0n; x < 30n; x++) {
        expect(cols[0]).toBe(evalPoly(p, x));
        engineCycle(cols);
      }
    }
  });

  test('without staggering the two half-cycles go wrong', () => {
    const cols = initialColumns(POLYS.cubes!.p);
    const got: bigint[] = [];
    for (let x = 0; x < 5; x++) {
      got.push(cols[0]!);
      engineCycle(cols);
    }
    expect(got).not.toEqual([0n, 1n, 8n, 27n, 64n]);
  });

  test('staggered set-up for x³: columns 0, 1, 0, 6', () => {
    expect(staggeredColumns(POLYS.cubes!.p)).toEqual([0n, 1n, 0n, 6n]);
    expect(delta(POLYS.euler!.p, 1, 0n)).toBe(2n);
  });

  test('digit addition with a spiral carry handles carries into 9s', () => {
    const r = addColumns(toDigits(9995n, 6), toDigits(5n, 6));
    expect(fromDigits(r.result)).toBe(10000n);
    expect(r.warnings).toEqual([true, false, false, false, false, false]);
    expect(r.carries).toEqual([0, 1, 2, 3]);
  });
});
