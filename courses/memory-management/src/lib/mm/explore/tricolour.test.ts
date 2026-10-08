import { expect, test } from 'vitest';
import { BARRIERS, SMALL_HEAPS, explore } from './tricolour';

test('without a barrier, the explorer finds a lost object on the chain and the cycle', () => {
  for (const h of SMALL_HEAPS.filter((x) => x.name !== 'a fan')) {
    const r = explore(h.model, BARRIERS.none!.fn);
    expect(r.counterexample, h.name).toBeDefined();
    // The classic shape: two writes (hide the pointer in a black object, cut the grey path) and some scans.
    expect(r.counterexample!.steps.filter((s) => s.kind !== 'scan').length).toBe(2);
  }
  // In the fan, the first scan turns every object grey or black at once: there is nothing left to hide.
  expect(explore(SMALL_HEAPS[1]!.model, BARRIERS.none!.fn).counterexample).toBeUndefined();
});

test('the insertion and deletion barriers lose nothing, on any interleaving the explorer can find', () => {
  for (const b of ['dijkstra', 'steele', 'yuasa']) {
    for (const h of SMALL_HEAPS) {
      const r = explore(h.model, BARRIERS[b]!.fn);
      expect(r.counterexample, `${b} on ${h.name}`).toBeUndefined();
      expect(r.states).toBeGreaterThan(50);
    }
  }
});
