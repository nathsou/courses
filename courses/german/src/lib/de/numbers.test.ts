import { describe, expect, it } from 'vitest';
import { drillNumber, formatNumber, MAX_NUMBER, numberParts, numberWord, numberWords, parseDigits } from './numbers';
import { rng } from '$lib/exercises/shuffle';

describe('numberWord', () => {
  it('says 0 to 20', () => {
    const want = 'null eins zwei drei vier fünf sechs sieben acht neun zehn elf zwölf dreizehn vierzehn fünfzehn sechzehn siebzehn achtzehn neunzehn zwanzig'.split(' ');
    want.forEach((w, n) => expect(numberWord(n)).toBe(w));
  });

  it('drops the s of sechs and the en of sieben in the teens and tens', () => {
    expect(numberWord(16)).toBe('sechzehn');
    expect(numberWord(17)).toBe('siebzehn');
    expect(numberWord(60)).toBe('sechzig');
    expect(numberWord(70)).toBe('siebzig');
    expect(numberWord(66)).toBe('sechsundsechzig');
    expect(numberWord(77)).toBe('siebenundsiebzig');
  });

  it('writes dreißig with ß and the other tens with -zig', () => {
    expect([20, 30, 40, 50, 60, 70, 80, 90].map((n) => numberWord(n))).toEqual(['zwanzig', 'dreißig', 'vierzig', 'fünfzig', 'sechzig', 'siebzig', 'achtzig', 'neunzig']);
  });

  it('puts the units before the tens', () => {
    expect(numberWord(24)).toBe('vierundzwanzig');
    expect(numberWord(38)).toBe('achtunddreißig');
    expect(numberWord(99)).toBe('neunundneunzig');
  });

  it('uses ein inside a word and eins at the end', () => {
    expect(numberWord(1)).toBe('eins');
    expect(numberWord(21)).toBe('einundzwanzig');
    expect(numberWord(101)).toBe('einhunderteins');
    expect(numberWord(100)).toBe('einhundert');
    expect(numberWord(1000)).toBe('eintausend');
    expect(numberWord(1001)).toBe('eintausendeins');
    expect(numberWord(31_000)).toBe('einunddreißigtausend');
    expect(numberWord(101_000)).toBe('einhunderteintausend');
  });

  it('can leave out the optional ein of (ein)hundert and (ein)tausend', () => {
    expect(numberWord(100, { ein: false })).toBe('hundert');
    expect(numberWord(1100, { ein: false })).toBe('tausendeinhundert');
    expect(numberWord(1_000_100, { ein: false })).toBe('eine Million einhundert');
    expect(numberWord(1_000_000, { ein: false })).toBe('eine Million');
    expect(numberWord(201, { ein: false })).toBe('zweihunderteins');
  });

  it('builds hundreds and thousands as one word', () => {
    expect(numberWord(345)).toBe('dreihundertfünfundvierzig');
    expect(numberWord(710)).toBe('siebenhundertzehn');
    expect(numberWord(1999)).toBe('eintausendneunhundertneunundneunzig');
    expect(numberWord(2026)).toBe('zweitausendsechsundzwanzig');
    expect(numberWord(16_017)).toBe('sechzehntausendsiebzehn');
    expect(numberWord(999_999)).toBe('neunhundertneunundneunzigtausendneunhundertneunundneunzig');
  });

  it('writes Million and Millionen as separate words', () => {
    expect(numberWord(1_000_000)).toBe('eine Million');
    expect(numberWord(2_000_000)).toBe('zwei Millionen');
    expect(numberWord(21_000_000)).toBe('einundzwanzig Millionen');
    expect(numberWord(101_000_000)).toBe('einhunderteine Million');
    expect(numberWord(1_000_001)).toBe('eine Million eins');
    expect(numberWord(2_350_000)).toBe('zwei Millionen dreihundertfünfzigtausend');
    expect(numberWord(MAX_NUMBER)).toBe('neunhundertneunundneunzig Millionen neunhundertneunundneunzigtausendneunhundertneunundneunzig');
  });

  it('refuses numbers out of range', () => {
    expect(() => numberWord(-1)).toThrow();
    expect(() => numberWord(1.5)).toThrow();
    expect(() => numberWord(1e9)).toThrow();
  });
});

describe('numberParts', () => {
  it('labels each piece', () => {
    expect(numberParts(24).map((p) => [p.text, p.kind, p.value])).toEqual([
      ['vier', 'digit', 4],
      ['und', 'und', 0],
      ['zwanzig', 'ten', 20],
    ]);
    expect(numberParts(1234).map((p) => p.text)).toEqual(['ein', 'tausend', 'zwei', 'hundert', 'vier', 'und', 'dreißig']);
  });

  it('keeps teens whole', () => {
    expect(numberParts(17)).toEqual([{ text: 'siebzehn', kind: 'digit', value: 17 }]);
  });

  it('groups parts into written words', () => {
    expect(numberWords(3_000_042).map((w) => w.map((p) => p.text).join(''))).toEqual(['drei', 'Millionen', 'zweiundvierzig']);
  });
});

describe('digits', () => {
  it('formats with points', () => {
    expect(formatNumber(7)).toBe('7');
    expect(formatNumber(1000)).toBe('1.000');
    expect(formatNumber(1_234_567)).toBe('1.234.567');
  });
  it('reads typed numbers', () => {
    expect(parseDigits('1.000')).toBe(1000);
    expect(parseDigits(' 1 000 ')).toBe(1000);
    expect(parseDigits('42')).toBe(42);
    expect(parseDigits('zwei')).toBeNaN();
    expect(parseDigits('')).toBeNaN();
  });
  it('draws drill numbers within the limit', () => {
    const r = rng(7);
    for (const max of [100, 1000, 1_000_000]) {
      for (let i = 0; i < 300; i++) {
        const n = drillNumber(max, r);
        expect(n).toBeGreaterThanOrEqual(13);
        expect(n).toBeLessThanOrEqual(max);
      }
    }
  });
});
