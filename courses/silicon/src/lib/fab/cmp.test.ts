import { describe, expect, test } from 'vitest';
import { FILL_DENSITY, REGIONS, STEP, effectiveDensity, heightRange, pattern, polished } from './cmp';

describe('chemical-mechanical polishing (pattern-density model)', () => {
  test('raised areas polish at the blanket rate divided by the density, then everything at the blanket rate', () => {
    expect(polished(0.5, 100)).toEqual({ up: -200, down: -STEP });
    // The step is gone once density × step has been removed; after that the surface sits step × (1 − ρ) lower.
    expect(polished(0.5, 200).up).toBeCloseTo(-200 - STEP * 0.5, 9);
    expect(polished(0.25, 300).up).toBeCloseTo(-300 - STEP * 0.75, 9);
    expect(polished(0.25, 300).down).toBe(polished(0.25, 300).up);
  });

  test('without dummy fill, polishing longer cannot flatten regions of different density', () => {
    const p = effectiveDensity(REGIONS, false);
    const after = heightRange(p, 250);
    expect(after).toBeGreaterThan(150);
    expect(heightRange(p, 450)).toBeCloseTo(after, 6);
  });

  test('dummy fill brings the strip within a 100 nm depth of focus', () => {
    const p = effectiveDensity(REGIONS, true);
    expect(Math.min(...p.map((q) => q.rho))).toBeGreaterThanOrEqual(FILL_DENSITY - 1e-9);
    expect(heightRange(p, 250)).toBeLessThan(100);
    expect(heightRange(p, 0)).toBe(STEP);
  });

  test('the drawn pattern has the stated densities', () => {
    for (const fill of [false, true]) {
      const pat = pattern(REGIONS, fill, 250);
      for (const r of REGIONS) {
        const covered = pat.filter((w) => w.from >= r.from && w.to <= r.to).reduce((s, w) => s + w.to - w.from, 0) / (r.to - r.from);
        expect(covered).toBeCloseTo(fill ? Math.max(r.density, FILL_DENSITY) : r.density, 2);
      }
    }
  });
});
