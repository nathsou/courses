import { expect, test } from 'vitest';
import { capstan, SETUPS, solve } from './da';

test('two integrators in a loop make a cosine', () => {
  const r = solve(SETUPS.oscillator.make(0), Math.PI);
  expect(r.at(-1)![2]).toBeCloseTo(-1, 4); // y(π) = cos π
});

test('slip makes the oscillation die away', () => {
  const r = solve(SETUPS.oscillator.make(0), 20 * Math.PI, 0.002, 0.01);
  expect(Math.abs(r.at(-1)![2]!)).toBeLessThan(0.9);
});

test('Binet: the orbit is an ellipse with the chosen eccentricity', () => {
  const e = 0.3;
  const r = solve(SETUPS.orbit.make(e), 2 * Math.PI);
  const us = r.map((row) => row[2]!);
  expect(Math.max(...us)).toBeCloseTo(1 + e, 3);
  expect(Math.min(...us)).toBeCloseTo(1 - e, 3);
  expect(r.at(-1)![2]).toBeCloseTo(1 + e, 3); // closes after one turn
});

test('a capstan of two turns with μ = 0.3 multiplies the pull about 43 times', () => {
  expect(capstan(0.3, 4 * Math.PI)).toBeCloseTo(43.4, 1);
});
