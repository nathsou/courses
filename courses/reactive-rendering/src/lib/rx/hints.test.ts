import { describe, expect, test } from 'vitest';
import { makeCard, newStats, patch, size, type CardState } from './hints';

const base: CardState = { title: 'Hello', count: 0, hot: false };

function run(staticRows: number, change: Partial<CardState>, hints: boolean) {
  const render = makeCard(staticRows);
  const prev = render(base, hints);
  const next = render({ ...base, ...change }, hints);
  const stats = newStats();
  patch(prev, next, stats, { hints });
  return { stats, prev, next };
}

describe('compiler hints', () => {
  test('the diff produces the same result with and without hints', () => {
    for (const hints of [false, true]) {
      const { prev, next } = run(5, { title: 'Hi', count: 3, hot: true }, hints);
      expect(prev.children[0]!.text).toBe('Hi');
      expect(prev.children.at(-2)!.text).toBe('Count: 3');
      expect(prev.children.at(-2)!.props).toEqual({ class: 'hot' });
      void next;
    }
  });

  test('both make the same DOM writes', () => {
    const a = run(20, { count: 1 }, false).stats;
    const b = run(20, { count: 1 }, true).stats;
    expect(a.writes).toBe(1);
    expect(b.writes).toBe(1);
  });

  test('without hints every node is visited', () => {
    const { stats, next } = run(20, { count: 1 }, false);
    expect(stats.visited).toBe(size(next));
  });

  test('with hints only the dynamic nodes are visited, however many static ones there are', () => {
    const small = run(5, { count: 1 }, true).stats;
    const big = run(500, { count: 1 }, true).stats;
    expect(small.visited).toBe(3); // the block root and its two dynamic children
    expect(big.visited).toBe(3);
    expect(run(500, { count: 1 }, false).stats.visited).toBe(504);
  });

  test('patch flags limit what is compared on a dynamic node', () => {
    const full = run(0, { count: 1 }, false).stats.comparisons;
    const flagged = run(0, { count: 1 }, true).stats.comparisons;
    expect(flagged).toBeLessThan(full);
  });
});
