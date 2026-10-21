import { describe, expect, it } from 'vitest';
import { intervalVector, invertRow, isRow, matrix, normalForm, primeForm, primeText, retrograde, TRICHORDS } from './pcset';
import { cents, intervalCents, offsets, PURE, PYTHAGOREAN_COMMA, SYNTONIC_COMMA, tuned } from './tuning';

describe('pitch-class sets', () => {
  it('finds normal and prime forms', () => {
    expect(normalForm([60, 64, 67])).toEqual([0, 4, 7]);
    expect(normalForm([11, 0, 4])).toEqual([11, 0, 4]);
    expect(primeForm([0, 4, 7])).toEqual([0, 3, 7]);
    expect(primeForm([0, 3, 7])).toEqual([0, 3, 7]);
    expect(primeForm([11, 0, 4])).toEqual([0, 1, 5]);
    expect(TRICHORDS[primeText(primeForm([2, 6, 10]))]).toBe('3-12');
    expect(primeText(primeForm([0, 2, 4, 6, 8, 10]))).toBe('02468T');
  });
  it('counts interval classes', () => {
    expect(intervalVector([0, 4, 7])).toEqual([0, 0, 1, 1, 1, 0]);
    expect(intervalVector([0, 3, 6, 9])).toEqual([0, 0, 4, 0, 0, 2]);
    expect(intervalVector([0, 2, 4, 6, 8, 10])).toEqual([0, 6, 0, 6, 0, 3]);
  });
  it('builds the twelve-tone matrix', () => {
    const row = [0, 11, 7, 8, 3, 1, 2, 10, 6, 5, 4, 9];
    expect(isRow(row)).toBe(true);
    const m = matrix(row);
    expect(m[0]).toEqual(row);
    expect(m.map((r) => r[0])).toEqual(invertRow(row));
    expect(m.every((r) => isRow(r))).toBe(true);
    // Every column is a row form too, and the diagonal is constant.
    expect(new Set(m.map((r, i) => r[i])).size).toBe(1);
    expect(retrograde(row)[0]).toBe(9);
  });
});

describe('tuning', () => {
  it('measures the commas', () => {
    expect(PYTHAGOREAN_COMMA).toBeCloseTo(23.46, 2);
    expect(SYNTONIC_COMMA).toBeCloseTo(21.51, 2);
    expect(cents(2)).toBe(1200);
  });
  it('gives each temperament its fifths and thirds', () => {
    expect(intervalCents(60, 67, 'equal')).toBeCloseTo(700, 6);
    expect(intervalCents(60, 67, 'pythagorean')).toBeCloseTo(PURE['perfect fifth']!, 6);
    expect(intervalCents(60, 64, 'meantone')).toBeCloseTo(PURE['major third']!, 6);
    expect(intervalCents(60, 64, 'just')).toBeCloseTo(PURE['major third']!, 6);
    // The meantone wolf: G♯ up to E♭ is far wider than a fifth.
    expect(intervalCents(68, 75, 'meantone')).toBeCloseTo(737.6, 1);
    expect(offsets('equal').every((x) => x === 0)).toBe(true);
    expect(tuned(60, 'werckmeister')).toBe(60);
  });
});
