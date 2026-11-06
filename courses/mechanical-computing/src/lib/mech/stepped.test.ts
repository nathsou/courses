import { describe, expect, test } from 'vitest';
import { SteppedReckoner, engagedTeeth } from './stepped';

describe('stepped drum', () => {
  test('a pinion at setting s meets s teeth', () => {
    for (let s = 0; s <= 9; s++) expect(engagedTeeth(s)).toHaveLength(s);
    expect(engagedTeeth(3)).toEqual([7, 8, 9]);
  });

  test('one turn adds the setting; turns and shifts multiply', () => {
    const m = new SteppedReckoner();
    m.set(347);
    m.turn();
    expect(m.resultValue).toBe(347);
    m.clear();
    const turns = m.multiply(213);
    expect(m.resultValue).toBe(347 * 213);
    expect(m.counterValue).toBe(213);
    expect(turns).toBe(2 + 1 + 3);
  });

  test('subtraction with the complementary teeth', () => {
    const m = new SteppedReckoner();
    m.result = SteppedReckoner.toDigits(1000, 11);
    m.set(1);
    m.turn(true);
    expect(m.resultValue).toBe(999);
    expect(m.wrapped).toBe(false);
    m.result = SteppedReckoner.toDigits(5, 11);
    m.set(7);
    m.turn(true);
    expect(m.wrapped).toBe(true);
    expect(m.resultValue).toBe(1e11 - 2); // tens' complement of 2: the register has gone "through zero"
  });

  test('restoring division leaves quotient in the counter and remainder in the result', () => {
    const m = new SteppedReckoner();
    m.divide(100000, 7);
    expect(m.counterValue).toBe(14285);
    expect(m.resultValue).toBe(5);
    m.divide(987654, 321);
    expect(m.counterValue).toBe(Math.floor(987654 / 321));
    expect(m.resultValue).toBe(987654 % 321);
  });

  test('Leibniz’s carry: a carry into a 9 is left pending for the operator', () => {
    const m = new SteppedReckoner(4, 8, 4, 'leibniz');
    m.result = SteppedReckoner.toDigits(995, 8);
    m.set(5);
    m.turn();
    // 995 + 5: units 0 with a carry; tens 9 → 0 by that carry; the carry into the hundreds waits.
    expect(m.resultValue).toBe(900);
    expect([...m.pending]).toEqual([2]);
    m.completeCarry(2);
    // The hundreds were 9 too, so completing it leaves another pending.
    expect(m.resultValue).toBe(0);
    expect([...m.pending]).toEqual([3]);
    m.completeCarry(3);
    expect(m.resultValue).toBe(1000);
    expect(m.pending.size).toBe(0);
  });

  test('Leibniz’s carry is fine when no 9 is in the way', () => {
    const m = new SteppedReckoner(4, 8, 4, 'leibniz');
    m.result = SteppedReckoner.toDigits(487, 8);
    m.set(256);
    m.turn();
    expect(m.resultValue).toBe(743);
    expect(m.pending.size).toBe(0);
  });
});
