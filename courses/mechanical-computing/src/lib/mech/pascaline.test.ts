import { describe, expect, test } from 'vitest';
import { ACCOUNTING, Pascaline, subtractByComplement, livres } from './pascaline';

describe('Pascaline', () => {
  test('adds with carries', () => {
    const m = new Pascaline();
    m.add(487);
    m.add(256);
    m.flush();
    expect(m.value()).toBe(743);
  });

  test('a long carry ripples through every 9, one sautoir after another', () => {
    const m = new Pascaline();
    m.set(99999);
    m.dial(0, 1);
    m.flush();
    expect(m.value()).toBe(100000);
    expect(m.carries).toBe(5);
    const order = m.events.filter((e) => e.kind === 'carry').map((e) => (e.kind === 'carry' ? e.from : -1));
    expect(order).toEqual([0, 1, 2, 3, 4]);
  });

  test('overflow past the last wheel is lost', () => {
    const m = new Pascaline([10, 10]);
    m.set(99);
    m.dial(0, 1);
    m.flush();
    expect(m.value()).toBe(0);
    expect(m.events.at(-1)).toEqual({ kind: 'overflow' });
  });

  test('subtraction by nines’ complement', () => {
    for (const [a, b] of [[743, 256], [100000, 1], [5000, 4999], [12, 12]]) {
      expect(subtractByComplement(a!, b!).result).toBe(a! - b!);
    }
  });

  test('the complement row shows 9 − d on decimal wheels', () => {
    const m = new Pascaline([10, 10, 10]);
    m.set(270);
    expect(m.complementDigits()).toEqual([9, 2, 7]);
    expect(m.complement()).toBe(729);
  });

  test('accounting wheels: 12 deniers make a sol, 20 sols a livre', () => {
    const m = new Pascaline(ACCOUNTING);
    m.set(11); // 11 deniers
    m.dial(0, 1);
    m.flush();
    expect(livres(m.value())).toEqual({ l: 0, s: 1, d: 0 });
    m.set(239);
    m.dial(0, 1);
    m.flush();
    expect(livres(m.value())).toEqual({ l: 1, s: 0, d: 0 });
  });

  test('animation reaches the same state as flushing, and lifts then drops the sautoir', () => {
    const m = new Pascaline();
    m.set(8);
    m.dial(0, 2);
    let lifted = 0;
    let frames = 0;
    while (m.update(16)) {
      lifted = Math.max(lifted, m.lift(0));
      if (++frames > 1000) throw new Error('never settles');
    }
    expect(m.value()).toBe(10);
    expect(lifted).toBeGreaterThan(0.95);
    expect(m.lift(0)).toBe(0);
  });
});
