import { describe, expect, it } from 'vitest';
import { normaliseNumeral, numeralMatches } from './analyse';

describe('Roman numeral answers', () => {
  it('accept common spellings', () => {
    expect(normaliseNumeral('viio')).toBe('vii°');
    expect(normaliseNumeral('vii0 7')).toBe('vii°7');
    expect(normaliseNumeral('vii/o7')).toBe('viiø7');
    expect(normaliseNumeral('V6/5')).toBe('V65');
    expect(normaliseNumeral('bVII')).toBe('♭VII');
    expect(normaliseNumeral('V7/V')).toBe('V7/V');
    expect(normaliseNumeral(' I 6 4 ')).toBe('I64');
    expect(normaliseNumeral('V2')).toBe('V42');
  });
  it('compare case and alternatives', () => {
    expect(numeralMatches('ii', 'ii')).toBe(true);
    expect(numeralMatches('II', 'ii')).toBe(false);
    expect(numeralMatches('V7', 'V|V7')).toBe(true);
    expect(numeralMatches('viio6', 'vii°6')).toBe(true);
  });
});
