import { expect, test } from 'vitest';
import { counterNextBit, minimumCover, minterms, primeImplicants, termText } from './kmap';

test('cubes and their minterms', () => {
  expect(minterms('1-0-')).toEqual([8, 9, 12, 13]);
  expect(termText('1--0', ['a', 'b', 'c', 'd'])).toBe('a·¬d');
});

test('prime implicants of a textbook function', () => {
  // f = Σ(0, 1, 2, 5, 6, 7) has six primes and a minimum cover of three.
  const pis = primeImplicants(3, [0, 1, 2, 5, 6, 7]);
  expect(pis.length).toBe(6);
  expect(minimumCover(3, [0, 1, 2, 5, 6, 7]).length).toBe(3);
});

test('the decade counter’s next-state bits, with values 10–15 as don’t-cares', () => {
  const sizes = [0, 1, 2, 3].map((b) => minimumCover(4, ...(Object.values(counterNextBit(b, true)) as [number[], number[]])).length);
  expect(sizes).toEqual([1, 2, 3, 2]);
  expect(minimumCover(4, ...(Object.values(counterNextBit(0, true)) as [number[], number[]]))).toEqual(['---0']);
  const b3 = minimumCover(4, ...(Object.values(counterNextBit(3, true)) as [number[], number[]])).map((c) => termText(c, ['q3', 'q2', 'q1', 'q0'])).sort();
  expect(b3).toEqual(['q2·q1·q0', 'q3·¬q0']);
});

test('don’t-cares never make a cover larger', () => {
  for (const b of [0, 1, 2, 3]) {
    const without = minimumCover(4, counterNextBit(b, false).ones);
    const withDc = minimumCover(4, ...(Object.values(counterNextBit(b, true)) as [number[], number[]]));
    expect(withDc.length).toBeLessThanOrEqual(without.length);
  }
});
