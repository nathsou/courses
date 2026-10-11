import { describe, expect, it } from 'vitest';
import { spell, spokenSpelling, markSpelling } from './spelling';
import { LETTERS, SPELLING_WORDS } from '$lib/widgets/data/alphabet';

describe('spelling', () => {
  it('has the 26 letters, three umlauts and ß', () => {
    expect(LETTERS).toHaveLength(30);
    expect(new Set(LETTERS.map((l) => l.letter)).size).toBe(30);
  });
  it('names the tricky letters the German way', () => {
    const name = (c: string) => LETTERS.find((l) => l.letter === c)!.name;
    expect(name('J')).toBe('Jott');
    expect(name('V')).toBe('Vau');
    expect(name('W')).toBe('We');
    expect(name('Y')).toBe('Ypsilon');
    expect(name('Z')).toBe('Zett');
    expect(name('ß')).toBe('Eszett');
  });
  it('spells words letter by letter', () => {
    expect(spell('Straße').map((l) => l.letter)).toEqual(['S', 'T', 'R', 'A', 'ß', 'E']);
    expect(spokenSpelling('Jonas')).toBe('Jott, Oh, Enn, Ah, Ess');
    expect(spokenSpelling('Käse')).toBe('Kah, Äh, Ess, Eh');
  });
  it('can spell every game word', () => {
    for (const w of SPELLING_WORDS) expect(() => spell(w)).not.toThrow();
  });
  it('refuses characters it has no name for', () => {
    expect(() => spell('C-3PO')).toThrow();
  });
  it('marks typed words without minding capitals', () => {
    expect(markSpelling('lena', 'Lena')).toBe('right');
    expect(markSpelling(' Straße ', 'Straße')).toBe('right');
    expect(markSpelling('Strasse', 'Straße')).toBe('almost');
    expect(markSpelling('kaese', 'Käse')).toBe('almost');
    expect(markSpelling('Lina', 'Lena')).toBe('wrong');
  });
});
