import { describe, expect, test } from 'vitest';
import { buildCfg } from '../flow/cfg.js';
import { concolicTrace, dictionary, race } from './fuzz.js';
import { check, not } from './bitblast.js';

const magic = `function parse(x, y) {
  if (x === 31337) {
    if (y > x) {
      if (y - x === 1000) {
        assert(false);
      }
    }
  }
  return 0;
}`;
const checksum = `function checksum(a, b) {
  let h = a;
  let i = 0;
  while (i < 6) {
    h = (h * 31 + b) % 1009;
    i = i + 1;
  }
  if (h === 7) {
    assert(false);
  }
  return h;
}`;

const byName = (r: ReturnType<typeof race>) => {
  const [Random, guided, dict, Concolic, Hybrid] = r.results;
  return { Random, 'Coverage-guided': guided, 'Coverage-guided+dict': dict, Concolic, Hybrid };
};

describe('the race', () => {
  test('magic numbers: only the solver gets through', () => {
    const r = byName(race(magic));
    expect(r.Random!.bug).toBeUndefined();
    expect(r['Coverage-guided']!.bug).toBeUndefined();
    expect(r['Coverage-guided+dict']!.covered).toBeGreaterThan(r['Coverage-guided']!.covered);
    expect(r.Concolic!.bug?.input).toEqual({ x: 31337, y: 32337 });
    expect(r.Hybrid!.bug).toBeDefined();
  });
  test('a checksum the solver cannot model: fuzzing wins', () => {
    const r = byName(race(checksum));
    expect(r.Random!.bug).toBeDefined();
    expect(r.Concolic!.bug).toBeUndefined();
    expect(r.Hybrid!.bug).toBeDefined();
  });
  test('concolic traces solve to inputs that flip a branch', () => {
    const cfg = buildCfg(magic);
    const trace = concolicTrace(cfg, { x: 0, y: 0 });
    expect(trace.length).toBe(1);
    const res = check([not(trace[0]!.cond!)]);
    expect(res.model!.x).toBe(31337);
  });
  test('dictionary', () => {
    expect(dictionary(buildCfg(magic)).sort((a, b) => a - b)).toEqual([0, 1000, 31337]);
  });
});
