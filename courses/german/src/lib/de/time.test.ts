import { describe, expect, it } from 'vitest';
import { dayPart, digital, formalTime, hour12, informalTime, randomTime, sameTime } from './time';
import { rng } from '$lib/exercises/shuffle';

const main = (h: number, m: number) => informalTime(h, m).main;
const alts = (h: number, m: number) => informalTime(h, m).alt.map((a) => a.de);

describe('formalTime', () => {
  it('reads the 24-hour clock', () => {
    expect(formalTime(14, 30)).toBe('vierzehn Uhr dreißig');
    expect(formalTime(8, 0)).toBe('acht Uhr');
    expect(formalTime(20, 15)).toBe('zwanzig Uhr fünfzehn');
    expect(formalTime(23, 59)).toBe('dreiundzwanzig Uhr neunundfünfzig');
    expect(formalTime(16, 7)).toBe('sechzehn Uhr sieben');
  });
  it('says ein Uhr, but eins for a minute', () => {
    expect(formalTime(1, 0)).toBe('ein Uhr');
    expect(formalTime(1, 5)).toBe('ein Uhr fünf');
    expect(formalTime(12, 1)).toBe('zwölf Uhr eins');
    expect(formalTime(21, 0)).toBe('einundzwanzig Uhr');
  });
  it('starts the day at null Uhr', () => {
    expect(formalTime(0, 0)).toBe('null Uhr');
    expect(formalTime(0, 30)).toBe('null Uhr dreißig');
  });
  it('rejects impossible times', () => {
    expect(() => formalTime(24, 0)).toThrow();
    expect(() => formalTime(3, 60)).toThrow();
  });
});

describe('informalTime', () => {
  it('uses halb for the half hour before the next hour', () => {
    expect(main(2, 30)).toBe('halb drei');
    expect(main(14, 30)).toBe('halb drei');
    expect(main(12, 30)).toBe('halb eins');
    expect(main(0, 30)).toBe('halb eins');
    expect(main(11, 30)).toBe('halb zwölf');
  });
  it('counts five minutes either side of halb', () => {
    expect(main(2, 25)).toBe('fünf vor halb drei');
    expect(main(2, 35)).toBe('fünf nach halb drei');
  });
  it('gives the quarters', () => {
    expect(main(3, 15)).toBe('Viertel nach drei');
    expect(main(3, 45)).toBe('Viertel vor vier');
    expect(main(12, 45)).toBe('Viertel vor eins');
    expect(alts(3, 15)).toContain('viertel vier');
    expect(alts(3, 45)).toContain('drei viertel vier');
    expect(informalTime(3, 15).alt[0]!.note).toMatch(/regional/);
  });
  it('gives both forms at twenty past and twenty to', () => {
    expect(main(2, 20)).toBe('zwanzig nach zwei');
    expect(alts(2, 20)).toContain('zehn vor halb drei');
    expect(main(2, 40)).toBe('zwanzig vor drei');
    expect(alts(2, 40)).toContain('zehn nach halb drei');
  });
  it('reads every five-minute step of an hour', () => {
    const want = [
      'drei Uhr',
      'fünf nach drei',
      'zehn nach drei',
      'Viertel nach drei',
      'zwanzig nach drei',
      'fünf vor halb vier',
      'halb vier',
      'fünf nach halb vier',
      'zwanzig vor vier',
      'Viertel vor vier',
      'zehn vor vier',
      'fünf vor vier',
    ];
    want.forEach((w, i) => expect(main(15, i * 5)).toBe(w));
  });
  it('uses the 12-hour clock and ein Uhr', () => {
    expect(main(13, 0)).toBe('ein Uhr');
    expect(alts(13, 0)).toContain('eins');
    expect(main(13, 5)).toBe('fünf nach eins');
    expect(main(0, 0)).toBe('zwölf Uhr');
    expect(alts(0, 0)).toContain('Mitternacht');
    expect(main(23, 50)).toBe('zehn vor zwölf');
  });
  it('rounds with kurz near the hour and the half hour', () => {
    expect(main(3, 2)).toBe('kurz nach drei');
    expect(alts(3, 1)).toContain('eine Minute nach drei');
    expect(main(3, 28)).toBe('kurz vor halb vier');
    expect(main(3, 32)).toBe('kurz nach halb vier');
    expect(main(3, 58)).toBe('kurz vor vier');
  });
  it('reads odd minutes sensibly', () => {
    expect(main(3, 7)).toBe('sieben nach drei');
    expect(main(3, 17)).toBe('siebzehn nach drei');
    expect(main(3, 22)).toBe('acht vor halb vier');
    expect(main(3, 37)).toBe('sieben nach halb vier');
    expect(main(3, 43)).toBe('siebzehn vor vier');
    expect(main(3, 51)).toBe('neun vor vier');
  });
  it('has a reading for every minute of the day', () => {
    for (let h = 0; h < 24; h++)
      for (let m = 0; m < 60; m++) {
        const r = informalTime(h, m);
        expect(r.main).toMatch(/^[\p{L} ]+$/u);
        expect(r.main).not.toMatch(/eins Uhr|ein nach|ein vor|halb ein$/);
      }
  });
});

describe('helpers', () => {
  it('names parts of the day', () => {
    expect(dayPart(3)).toBe('nachts');
    expect(dayPart(7)).toBe('morgens');
    expect(dayPart(10)).toBe('vormittags');
    expect(dayPart(12)).toBe('mittags');
    expect(dayPart(15)).toBe('nachmittags');
    expect(dayPart(19)).toBe('abends');
    expect(dayPart(23)).toBe('nachts');
  });
  it('formats and compares', () => {
    expect(digital(9, 5)).toBe('9:05');
    expect(hour12(0)).toBe(12);
    expect(hour12(14)).toBe(2);
    expect(sameTime({ h: 14, m: 30 }, 2, 30, true)).toBe(true);
    expect(sameTime({ h: 14, m: 30 }, 2, 30, false)).toBe(false);
    expect(sameTime({ h: 0, m: 0 }, 12, 0, true)).toBe(true);
  });
  it('draws five-minute times', () => {
    const r = rng(3);
    for (let i = 0; i < 100; i++) {
      const t = randomTime(r);
      expect(t.m % 5).toBe(0);
      expect(t.h).toBeGreaterThanOrEqual(0);
      expect(t.h).toBeLessThan(24);
    }
  });
});
