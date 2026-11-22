import { describe, expect, test } from 'vitest';
import { alignGate, alignYield, erf } from './align';

describe('self-alignment', () => {
  test('a metal gate works only while the misalignment is within its overlap', () => {
    const ok = alignGate('metal', { length: 10, overlap: 2, misalign: 1.5 });
    expect(ok.works).toBe(true);
    expect(ok.overlapSource + ok.overlapDrain).toBeCloseTo(4, 9);
    expect(ok.capacitance).toBeCloseTo(1.4, 9);
    const bad = alignGate('metal', { length: 10, overlap: 2, misalign: -2.5 });
    expect(bad.works).toBe(false);
    expect(bad.gapDrain).toBeCloseTo(0.5, 9);
    expect(bad.gapSource).toBe(0);
  });

  test('a self-aligned gate works wherever it lands, with only the sideways spread as overlap', () => {
    for (const m of [-3, -1, 0, 2.5]) {
      const r = alignGate('self', { length: 10, overlap: 0, misalign: m });
      expect(r.works).toBe(true);
      expect(r.overlapSource).toBeCloseTo(0.2, 9);
      expect(r.overlapDrain).toBeCloseTo(0.2, 9);
      expect(r.capacitance).toBeCloseTo(10 / 9.6, 9);
    }
  });

  test('yield follows the normal distribution: 2.58 sigma of overlap for 99 %', () => {
    expect(erf(0)).toBe(0);
    expect(erf(1)).toBeCloseTo(0.8427, 4);
    expect(alignYield(2.576, 1)).toBeCloseTo(0.99, 3);
    // The answer in chapter 16: 99 % working costs about 52 % more gate capacitance on a 10 µm channel.
    expect(alignGate('metal', { length: 10, overlap: 2.6, misalign: 0 }).capacitance).toBeCloseTo(1.52, 9);
  });
});
