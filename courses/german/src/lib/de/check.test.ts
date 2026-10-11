import { describe, expect, it } from 'vitest';
import { mark, parseCloze, fillCloze, normalise } from './check';

describe('mark', () => {
  it('ignores punctuation and spacing', () => {
    expect(mark('ich bin  müde', 'Ich bin müde.').verdict).toBe('almost');
    expect(mark('Ich bin müde', 'Ich bin müde.').verdict).toBe('right');
    expect(normalise('„Na,  klar!“')).toBe('Na klar');
  });
  it('treats capitals as almost, naming nouns', () => {
    const m = mark('der tisch', 'der Tisch');
    expect(m.verdict).toBe('almost');
    expect(m.note).toMatch(/nouns/);
  });
  it('accepts transliterated umlauts as almost, or right when lenient', () => {
    expect(mark('faehrt', 'fährt').verdict).toBe('almost');
    expect(mark('faehrt', 'fährt', { lenient: true }).verdict).toBe('right');
    expect(mark('Strasse', 'Straße').note).toMatch(/ß/);
  });
  it('never forgives a wrong ending or a missing umlaut', () => {
    expect(mark('schöner', 'schönen').verdict).toBe('wrong');
    expect(mark('fahrt', 'fährt').verdict).toBe('wrong');
  });
  it('accepts any listed alternative', () => {
    expect(mark('Heute gehe ich', ['Ich gehe heute', 'Heute gehe ich']).verdict).toBe('right');
  });
});

describe('cloze', () => {
  it('parses gaps, alternatives and hints', () => {
    expect(parseCloze('Ich [bin/war](sein) müde.')).toEqual(['Ich ', { answers: ['bin', 'war'], hint: 'sein' }, ' müde.']);
    expect(fillCloze('mit [dem] Bus')).toBe('mit dem Bus');
  });
});
