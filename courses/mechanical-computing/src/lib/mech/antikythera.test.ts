import { expect, test } from 'vitest';
import { anomaly, LUNAR_TRAIN, pinSlot, SIDEREAL_PER_YEAR, trainRatio } from './antikythera';

test('the lunar train turns 254/19 times a year (reversed three times)', () => {
  expect(Math.abs(trainRatio(LUNAR_TRAIN))).toBeCloseTo(SIDEREAL_PER_YEAR, 12);
  expect(trainRatio(LUNAR_TRAIN)).toBeLessThan(0);
});

test('pin-and-slot: same mean motion, a periodic lead and lag of about e/r radians', () => {
  const r = 0.85, e = 0.085;
  let max = 0;
  for (let t = 0; t < 2 * Math.PI; t += 0.01) max = Math.max(max, Math.abs(anomaly(t, r, e)));
  expect(max).toBeGreaterThan(0.09);
  expect(max).toBeLessThan(0.11);
  // After a full turn the output has also turned exactly once.
  expect(pinSlot(2 * Math.PI, r, e)).toBeCloseTo(pinSlot(0, r, e), 9);
});
