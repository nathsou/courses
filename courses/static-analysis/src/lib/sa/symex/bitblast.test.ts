import { describe, expect, test } from 'vitest';
import { check, int, not, and, type BoolTerm, type IntTerm } from './bitblast.js';

const x: IntTerm = { t: 'var', name: 'x' };
const y: IntTerm = { t: 'var', name: 'y' };
const add = (a: IntTerm, b: IntTerm): IntTerm => ({ t: 'add', a, b });
const sub = (a: IntTerm, b: IntTerm): IntTerm => ({ t: 'sub', a, b });
const mul = (a: IntTerm, b: IntTerm): IntTerm => ({ t: 'mul', a, b });
const eq = (a: IntTerm, b: IntTerm): BoolTerm => ({ t: 'eq', a, b });
const lt = (a: IntTerm, b: IntTerm): BoolTerm => ({ t: 'lt', a, b });

describe('bit-blasting', () => {
  test('solves linear equations', () => {
    const r = check([eq(add(mul(x, int(3)), int(7)), int(100))]);
    expect(r.sat && r.model).toEqual({ x: 31 });
  });
  test('negative numbers and signed comparison', () => {
    const r = check([lt(x, int(-1000)), lt(int(-1003), x)]);
    expect(r.sat).toBe(true);
    expect([-1002, -1001]).toContain(r.model!.x);
  });
  test('no overflow: x + 1 > x always holds', () => {
    expect(check([not(lt(x, add(x, int(1))))]).sat).toBe(false);
  });
  test('no overflow in products: x * x = -4 has no solution, x * x = 289 has', () => {
    expect(check([eq(mul(x, x), int(-4))]).sat).toBe(false);
    const r = check([eq(mul(x, x), int(289))]);
    expect([17, -17]).toContain(r.model!.x);
  });
  test('two variables', () => {
    const r = check([eq(add(x, y), int(10)), eq(sub(x, y), int(4))]);
    expect(r.model).toEqual({ x: 7, y: 3 });
  });
  test('models satisfy random constraints', () => {
    let s = 3;
    const rnd = () => ((s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
    for (let k = 0; k < 25; k++) {
      const a = Math.floor(rnd() * 200) - 100;
      const b = Math.floor(rnd() * 50) - 25;
      const c = Math.floor(rnd() * 400) - 200;
      // a·x + b·y = c, with x and y in [-50, 50]
      const cond = and(eq(add(mul(int(a), x), mul(int(b), y)), int(c)), and(lt(int(-51), x), and(lt(x, int(51)), and(lt(int(-51), y), lt(y, int(51))))));
      const r = check([cond]);
      if (r.sat) {
        const mx = r.model!.x as number;
        const my = r.model!.y as number;
        expect(a * mx + b * my).toBe(c);
      } else {
        let any = false;
        for (let i = -50; i <= 50 && !any; i++) for (let j = -50; j <= 50; j++) if (a * i + b * j === c) any = true;
        expect(any).toBe(false);
      }
    }
  });
});
