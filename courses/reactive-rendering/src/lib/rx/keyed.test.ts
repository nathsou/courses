import { describe, expect, test } from 'vitest';
import { applyPlan, lis, planStats, reconcile, type Key, type Strategy } from './keyed';

/** Small deterministic PRNG so the property tests are reproducible. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomLists(seed: number): [Key[], Key[]] {
  const r = rng(seed);
  const pool = Array.from({ length: 12 }, (_, i) => `k${i}`);
  const pick = () => {
    const n = Math.floor(r() * 10);
    const copy = [...pool].sort(() => r() - 0.5);
    return copy.slice(0, n);
  };
  const a = pick();
  // The new list reuses many of the old keys, in a new order, plus some fresh ones.
  const keep = a.filter(() => r() > 0.3).sort(() => (r() > 0.5 ? 1 : -1) * r());
  const fresh = pool.filter((k) => !a.includes(k)).slice(0, Math.floor(r() * 3));
  const b = [...keep, ...fresh].sort(() => r() - 0.5);
  return [a, b];
}

describe('lis', () => {
  test('finds a longest increasing subsequence', () => {
    expect(lis([2, 1, 5, 3, 6, 4, 8, 9, 7]).map((i) => [2, 1, 5, 3, 6, 4, 8, 9, 7][i])).toHaveLength(5);
    expect(lis([])).toEqual([]);
    expect(lis([5])).toEqual([0]);
    expect(lis([3, 2, 1])).toHaveLength(1);
    expect(lis([0, 1, 2, 3])).toEqual([0, 1, 2, 3]);
  });
  test('ignores -1 entries and returns increasing values', () => {
    const seq = [-1, 4, -1, 2, 7, -1, 9];
    const idx = lis(seq);
    const vals = idx.map((i) => seq[i]!);
    expect(vals).toEqual([2, 7, 9]);
    expect(idx).toEqual([...idx].sort((a, b) => a - b));
  });
  test('matches brute force on random inputs', () => {
    const r = rng(7);
    for (let t = 0; t < 200; t++) {
      const seq = Array.from({ length: 1 + Math.floor(r() * 9) }, () => Math.floor(r() * 20));
      // Brute force over subsets.
      let best = 0;
      for (let mask = 0; mask < 1 << seq.length; mask++) {
        let last = -Infinity;
        let ok = true;
        let n = 0;
        for (let i = 0; i < seq.length && ok; i++) {
          if (mask & (1 << i)) {
            if (seq[i]! <= last) ok = false;
            last = seq[i]!;
            n++;
          }
        }
        if (ok) best = Math.max(best, n);
      }
      const got = lis(seq);
      expect(got.length).toBe(best);
      for (let i = 1; i < got.length; i++) expect(seq[got[i]!]!).toBeGreaterThan(seq[got[i - 1]!]!);
    }
  });
});

describe('reconcile', () => {
  const keyed: Strategy[] = ['lastIndex', 'lis'];

  test.each(keyed)('%s produces exactly the new order on random lists', (strategy) => {
    for (let seed = 1; seed <= 400; seed++) {
      const [a, b] = randomLists(seed);
      const steps = reconcile(a, b, strategy);
      expect(applyPlan(a, b, steps), `seed ${seed}: ${a} → ${b}`).toEqual(b);
      // Every old child is accounted for exactly once, and every new child exactly once.
      const olds = steps.flatMap((s) => ('from' in s ? [s.from] : [])).sort((x, y) => x - y);
      expect(olds).toEqual(a.map((_, i) => i));
      const news = steps.flatMap((s) => ('to' in s ? [s.to] : [])).sort((x, y) => x - y);
      expect(news).toEqual(b.map((_, i) => i));
    }
  });

  test('the index strategy ignores keys: positions are right, identities are not', () => {
    const steps = reconcile(['a', 'b', 'c'], ['c', 'a', 'b'], 'index');
    expect(steps.every((s) => s.op === 'patch')).toBe(true);
    expect(planStats(['a', 'b', 'c'], ['c', 'a', 'b'], steps)).toMatchObject({ patches: 3, moves: 0, misattributed: 3 });
    expect(applyPlan(['a', 'b', 'c'], ['c', 'a', 'b'], steps)).toEqual(['a', 'b', 'c']);
  });

  test('moving the last child to the front: React moves three, LIS moves one', () => {
    const a = ['a', 'b', 'c', 'd'];
    const b = ['d', 'a', 'b', 'c'];
    expect(planStats(a, b, reconcile(a, b, 'lastIndex')).moves).toBe(3);
    expect(planStats(a, b, reconcile(a, b, 'lis')).moves).toBe(1);
  });

  test('moving the first child to the end: both move one', () => {
    const a = ['a', 'b', 'c', 'd'];
    const b = ['b', 'c', 'd', 'a'];
    expect(planStats(a, b, reconcile(a, b, 'lastIndex')).moves).toBe(1);
    expect(planStats(a, b, reconcile(a, b, 'lis')).moves).toBe(1);
  });

  test('LIS never moves more than React, and never moves more than needed', () => {
    for (let seed = 1; seed <= 400; seed++) {
      const [a, b] = randomLists(seed);
      const react = planStats(a, b, reconcile(a, b, 'lastIndex')).moves;
      const vue = planStats(a, b, reconcile(a, b, 'lis')).moves;
      expect(vue, `seed ${seed}`).toBeLessThanOrEqual(react);
      // The survivors keep their relative order in an LIS of their old positions: moves = survivors - |LIS|.
      const survivors = b.filter((k) => a.includes(k));
      const oldPos = survivors.map((k) => a.indexOf(k));
      expect(vue).toBeLessThanOrEqual(survivors.length - lis(oldPos).length);
    }
  });

  test('inserting in the middle and removing from the middle need no moves', () => {
    const a = ['a', 'b', 'c', 'd'];
    for (const s of keyed) {
      expect(planStats(a, ['a', 'b', 'x', 'c', 'd'], reconcile(a, ['a', 'b', 'x', 'c', 'd'], s))).toMatchObject({ moves: 0, inserts: 1, removes: 0 });
      expect(planStats(a, ['a', 'd'], reconcile(a, ['a', 'd'], s))).toMatchObject({ moves: 0, inserts: 0, removes: 2 });
    }
  });

  test('handles empty lists', () => {
    for (const s of ['index', 'lastIndex', 'lis'] as Strategy[]) {
      expect(reconcile([], [], s)).toEqual([]);
      expect(reconcile([], ['a'], s)).toHaveLength(1);
      expect(reconcile(['a'], [], s)).toEqual([{ op: 'remove', from: 0 }]);
    }
  });
});
