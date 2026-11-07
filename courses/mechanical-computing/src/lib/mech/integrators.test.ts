import { describe, expect, test } from 'vitest';
import { analyse, beat, densify, planimeter, polygonArea, tide, wheelDisc } from './integrators';

describe('integrators', () => {
  test('wheel and disc: the wheel turns (1/ρ)∫y dx', () => {
    expect(wheelDisc((x) => x, 0, 2, 0.5)).toBeCloseTo(4, 6); // ∫₀² x dx = 2, / 0.5
  });

  test('polar planimeter: L × roll = area, for several shapes, pole outside', () => {
    const pole = { x: -3, y: 0 };
    const shapes = [
      [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }],
      [{ x: -0.5, y: -0.3 }, { x: 1.2, y: -0.1 }, { x: 0.8, y: 1.1 }, { x: 0.1, y: 0.4 }, { x: -0.6, y: 0.9 }],
    ];
    for (const poly of shapes) {
      const path = densify(poly, 0.005);
      const { roll } = planimeter(pole, path, 3, 2.5);
      expect(2.5 * roll.at(-1)!).toBeCloseTo(polygonArea(poly), 2);
    }
  });

  test('spring and neap: M2 and S2 beat every 14.77 days', () => {
    expect(beat(12.4206, 12) / 24).toBeCloseTo(14.77, 2);
  });

  test('harmonic analysis recovers a constituent’s amplitude', () => {
    const amp = { M2: 1.2, S2: 0.4, K1: 0.2 };
    const h = (t: number) => tide(t, amp, { M2: 0.7 });
    const r = analyse(h, 12.4206, 24 * 29.53 * 2);
    expect(r.amp).toBeCloseTo(1.2, 1);
  });
});
