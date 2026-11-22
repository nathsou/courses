import { describe, expect, test } from 'vitest';
import { DEFAULT_STACK, INDEX, peak, reflectivity, surfaceReflectivity } from './euv';

describe('EUV multilayer mirrors', () => {
  test('a single surface reflects almost nothing', () => {
    expect(surfaceReflectivity(INDEX.mo)).toBeGreaterThan(0.001);
    expect(surfaceReflectivity(INDEX.mo)).toBeLessThan(0.002);
    expect(surfaceReflectivity(INDEX.si)).toBeLessThan(1e-5);
  });

  test('forty Mo/Si pairs reflect a little under 75 % at 13.5 nm', () => {
    const r = reflectivity(DEFAULT_STACK, 13.5);
    expect(r).toBeGreaterThan(0.72);
    expect(r).toBeLessThan(0.75);
    const p = peak(DEFAULT_STACK);
    expect(p.wavelength).toBeGreaterThan(13.47);
    expect(p.wavelength).toBeLessThan(13.53);
  });

  test('reflectivity grows with pairs and saturates, and never exceeds 1', () => {
    const rs = [1, 5, 10, 20, 40, 60, 100].map((pairs) => reflectivity({ ...DEFAULT_STACK, pairs }, 13.5));
    for (let i = 1; i < rs.length; i++) expect(rs[i]!).toBeGreaterThanOrEqual(rs[i - 1]! - 1e-3);
    expect(rs.at(-1)! - rs[4]!).toBeLessThan(0.01);
    for (let w = 12.8; w <= 14.4; w += 0.05) expect(reflectivity(DEFAULT_STACK, w)).toBeLessThan(1);
  });

  test('the peak moves in proportion to the period (Bragg)', () => {
    const a = peak({ ...DEFAULT_STACK, period: 6.8 }).wavelength;
    const b = peak({ ...DEFAULT_STACK, period: 7.0 }).wavelength;
    expect((b - a) / a).toBeCloseTo(0.2 / 6.8, 2);
  });

  test('a dozen mirrors pass on a few per cent', () => {
    const r = reflectivity(DEFAULT_STACK, 13.5);
    expect(r ** 10).toBeGreaterThan(0.02);
    expect(r ** 12).toBeLessThan(0.05);
  });
});
