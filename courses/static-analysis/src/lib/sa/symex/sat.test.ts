import { describe, expect, test } from 'vitest';
import { solve, type Lit } from './sat.js';

/** A small deterministic random generator. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}
const satisfies = (clauses: Lit[][], model: boolean[]) => clauses.every((c) => c.some((l) => (l > 0 ? model[l] : !model[-l])));
function brute(n: number, clauses: Lit[][]): boolean {
  for (let m = 0; m < 2 ** n; m++) {
    const model = [false, ...Array.from({ length: n }, (_, i) => ((m >> i) & 1) === 1)];
    if (satisfies(clauses, model)) return true;
  }
  return false;
}

describe('CDCL', () => {
  test('agrees with brute force on random 3-SAT near the threshold', () => {
    const r = rng(7);
    for (let k = 0; k < 300; k++) {
      const n = 4 + Math.floor(r() * 9);
      const m = Math.round(n * 4.26);
      const clauses = Array.from({ length: m }, () => Array.from({ length: 3 }, () => (1 + Math.floor(r() * n)) * (r() < 0.5 ? -1 : 1)));
      const res = solve(n, clauses);
      expect(res.sat).toBe(brute(n, clauses));
      if (res.sat) expect(satisfies(clauses, res.model)).toBe(true);
    }
  });
  test('pigeonhole: 6 pigeons do not fit in 5 holes', () => {
    const P = 6;
    const H = 5;
    const v = (p: number, h: number) => p * H + h + 1;
    const clauses: Lit[][] = [];
    for (let p = 0; p < P; p++) clauses.push(Array.from({ length: H }, (_, h) => v(p, h)));
    for (let h = 0; h < H; h++) for (let p = 0; p < P; p++) for (let q = p + 1; q < P; q++) clauses.push([-v(p, h), -v(q, h)]);
    const res = solve(P * H, clauses);
    expect(res.sat).toBe(false);
    expect(res.stats.conflicts).toBeGreaterThan(0);
  });
  test('larger satisfiable instances', () => {
    const r = rng(11);
    const n = 150;
    // A planted solution keeps it satisfiable.
    const planted = [false, ...Array.from({ length: n }, () => r() < 0.5)];
    const clauses: Lit[][] = [];
    while (clauses.length < 600) {
      const c = Array.from({ length: 3 }, () => (1 + Math.floor(r() * n)) * (r() < 0.5 ? -1 : 1));
      if (satisfies([c], planted)) clauses.push(c);
    }
    const res = solve(n, clauses);
    expect(res.sat).toBe(true);
    if (res.sat) expect(satisfies(clauses, res.model)).toBe(true);
  });
  test('edge cases', () => {
    expect(solve(1, [[1], [-1]]).sat).toBe(false);
    expect(solve(0, []).sat).toBe(true);
    expect(solve(2, [[]]).sat).toBe(false);
    const r = solve(3, [[1, 2], [-1], [-2, 3]]);
    expect(r.sat && r.model[2] && r.model[3]).toBe(true);
  });
});
