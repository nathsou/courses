import { expect, test } from 'vitest';
import { decode, encode, exponentBits, gate, parallel, series, table } from './z1';

test('elements in series make AND, in parallel OR', () => {
  expect(table(series)).toEqual(table((a, b) => gate('AND', a, b)));
  expect(table(parallel)).toEqual(table((a, b) => gate('OR', a, b)));
});

test('XOR from OR, NAND and AND', () => {
  expect(table((a, b) => gate('AND', gate('OR', a, b), gate('NAND', a, b)))).toEqual([false, true, true, false]);
});

test('floating point round trip and exponent bits', () => {
  for (const x of [1, 3.25, -0.1, 1000, 1 / 3]) {
    const f = encode(x)!;
    expect(Math.abs(decode(f) - x) / Math.abs(x)).toBeLessThan(2 ** -16);
  }
  expect(encode(3.25)!.exponent).toBe(1);
  expect(exponentBits(-1)).toEqual([1, 1, 1, 1, 1, 1, 1]);
  expect(exponentBits(3)).toEqual([0, 0, 0, 0, 0, 1, 1]);
});
