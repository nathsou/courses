import { describe, expect, it } from 'vitest';
import { check, parseKey, targetOf } from './play';

describe('play exercise checking', () => {
  it('accepts a chord in any voicing and octave, with doublings', () => {
    const t = targetOf({ chord: 'Am' });
    expect(check([57, 60, 64], t).ok).toBe(true);
    expect(check([45, 64, 69, 72], t).ok).toBe(true);
    expect(check([57, 60], t)).toEqual({ ok: false, wrong: [], missing: 1 });
    expect(check([57, 60, 64, 67], t)).toEqual({ ok: false, wrong: [67], missing: 0 });
  });
  it('wants exact keys when octaves are given', () => {
    const t = targetOf({ notes: ['C4', 'E4', 'G4'] });
    expect(check([60, 64, 67], t).ok).toBe(true);
    expect(check([48, 64, 67], t).ok).toBe(false);
    expect(targetOf({ notes: ['C', 'E'] }).pcs).toEqual([0, 4]);
  });
  it('reads keys', () => {
    expect(parseKey('Eb major').fifths).toBe(-3);
    expect(parseKey('E minor').fifths).toBe(1);
    expect(parseKey(undefined).fifths).toBe(0);
  });
});
