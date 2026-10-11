import { describe, expect, it } from 'vitest';
import { accepted, pairsFor, phrase, randomChoice } from './adjectives';
import { CASES, GENDERS } from '$lib/de/declension';

describe('adjective phrases', () => {
  it('builds the classic examples', () => {
    expect(phrase({ type: 'ein', word: 'ein', g: 'm', c: 'dat', pair: 0 }).text).toBe('mit einem alten Freund');
    expect(phrase({ type: 'ein', word: 'ein', g: 'm', c: 'dat', pair: 0 }).en).toBe('With an old friend');
    expect(phrase({ type: 'ein', word: 'ein', g: 'm', c: 'nom', pair: 0 }).text).toBe('Das ist ein alter Freund.');
    expect(phrase({ type: 'der', word: 'der', g: 'm', c: 'nom', pair: 0 }).text).toBe('Das ist der alte Freund.');
    expect(phrase({ type: 'der', word: 'dieser', g: 'n', c: 'gen', pair: 1 }).text).toBe('wegen dieses alten Hauses');
    expect(phrase({ type: 'ein', word: 'mein', g: 'n', c: 'acc', pair: 3 }).text).toBe('Ich suche mein dunkles Zimmer.');
    expect(phrase({ type: 'none', word: '', g: 'm', c: 'nom', pair: 0 }).text).toBe('Das ist kalter Kaffee.');
    expect(phrase({ type: 'none', word: '', g: 'm', c: 'acc', pair: 0 }).text).toBe('Ich möchte kalten Kaffee.');
    expect(phrase({ type: 'none', word: '', g: 'm', c: 'gen', pair: 1 }).text).toBe('wegen roten Weines');
    expect(phrase({ type: 'none', word: '', g: 'f', c: 'dat', pair: 0 }).text).toBe('mit frischer Milch');
    expect(phrase({ type: 'none', word: '', g: 'n', c: 'dat', pair: 0 }).text).toBe('mit kaltem Wasser');
    expect(phrase({ type: 'der', word: 'der', g: 'f', c: 'acc', pair: 3 }).text).toBe('Ich suche die teure Jacke.');
  });
  it('plurals: ein becomes kein, dative plural -n', () => {
    const p = phrase({ type: 'ein', word: 'ein', g: 'pl', c: 'dat', pair: 2 });
    expect(p.text).toBe('mit keinen warmen Mänteln');
    expect(p.word).toBe('kein');
    expect(phrase({ type: 'none', word: '', g: 'pl', c: 'gen', pair: 0 }).text).toBe('wegen alter Freunde');
    expect(phrase({ type: 'none', word: '', g: 'pl', c: 'nom', pair: 4 }).text).toBe('Das sind schöne Städte.');
    expect(phrase({ type: 'der', word: 'der', g: 'pl', c: 'nom', pair: 4 }).en).toBe('These are the beautiful towns.');
    expect(phrase({ type: 'der', word: 'der', g: 'pl', c: 'dat', pair: 11 }).text).toBe('mit den dunklen Zimmern');
  });
  it('gives a reason naming the ending for every combination', () => {
    for (const type of ['der', 'ein', 'none'] as const)
      for (const g of GENDERS)
        for (const c of CASES)
          for (let i = 0; i < pairsFor(type, g).length; i++) {
            const p = phrase({ type, word: type === 'der' ? 'der' : 'ein', g, c, pair: i });
            expect(p.reason).toContain(`-${p.adj.ending}`);
            expect(p.text).not.toMatch(/\s\s|undefined/);
            expect(p.en).not.toMatch(/undefined|\s\s/);
          }
  });
  it('accepts the ending alone unless the stem changes', () => {
    expect(accepted(phrase({ type: 'ein', word: 'ein', g: 'm', c: 'dat', pair: 0 }))).toEqual(['alten', 'en', '-en']);
    expect(accepted(phrase({ type: 'ein', word: 'ein', g: 'n', c: 'nom', pair: 3 }))).toEqual(['dunkles']);
  });
  it('random drill items are valid and varied', () => {
    const seen = new Set<string>();
    for (let s = 1; s < 200; s++) {
      const ch = randomChoice(s);
      seen.add(`${ch.type}-${ch.g}-${ch.c}`);
      expect(phrase(ch).text.length).toBeGreaterThan(5);
    }
    expect(seen.size).toBeGreaterThan(30);
  });
});
