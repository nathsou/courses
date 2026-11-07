import { describe, expect, test } from 'vitest';
import { carries, digitsOf } from './carry';

const val = (d: number[]) => d.reduceRight((a, x) => a * 10 + x, 0);

describe('anticipating carriage', () => {
  test('gives the same sums as ordinary addition', () => {
    for (let k = 0; k < 500; k++) {
      const a = Math.floor(Math.random() * 1e8), b = Math.floor(Math.random() * 1e8);
      expect(val(carries(digitsOf(a, 10), digitsOf(b, 10)).result)).toBe((a + b) % 1e10);
    }
  });

  test('a run of 9s: one warning, every place above it until the run ends receives a carry', () => {
    const t = carries(digitsOf(99999, 7), digitsOf(1, 7));
    expect(t.warnings).toEqual([true, false, false, false, false, false, false]);
    expect(t.receives).toEqual([false, true, true, true, true, true, false]);
    expect(t.rippleSteps).toBe(5);
    expect(val(t.result)).toBe(100000);
  });

  test('no carries: no ripple steps', () => {
    expect(carries(digitsOf(123, 4), digitsOf(456, 4)).rippleSteps).toBe(0);
  });
});
