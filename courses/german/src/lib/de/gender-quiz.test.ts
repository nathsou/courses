import { describe, expect, it } from 'vitest';
import { genderPool, genderRound, splitEnding, ARTICLE } from './gender-quiz';
import { GENDER_RULES } from './gender';
import { taught, type Entry } from './lexicon';

const rule = (ending: string) => GENDER_RULES.find((r) => r.ending === ending)!;
const n = (a: 'm' | 'f' | 'n', l = 'A1'): Entry => ({ p: 'n', g: '', a, l: l as Entry['l'] });

describe('gender quiz', () => {
  it('splits a noun at its ending', () => {
    expect(splitEnding('Zeitung', rule('-ung'))).toEqual({ before: 'Zeit', ending: 'ung', after: '' });
    expect(splitEnding('Geschenk', rule('Ge-'))).toEqual({ before: '', ending: 'Ge', after: 'schenk' });
  });

  it('takes examples and exceptions from the rules', () => {
    const pool = genderPool();
    const find = (s: string) => pool.find((x) => x.noun === s);
    expect(find('Zeitung')).toMatchObject({ gender: 'f', exception: false });
    expect(find('Junge')).toMatchObject({ gender: 'm', exception: true });
    expect(find('Mädchen')).toMatchObject({ gender: 'n', exception: false });
    expect(find('Euro')).toMatchObject({ gender: 'm', exception: true });
  });

  it('adds dictionary nouns that really have the ending', () => {
    const pool = genderPool([
      ['die Wohnung', n('f')],
      ['die Tochter', n('f')],
      ['der Tee', n('m')],
      ['das Bier', n('n')],
      ['der Wein', n('m')],
      ['der Baum', n('m')],
      ['die Eltern', { p: 'n', g: '', a: 'pl', l: 'A1' }],
      ['der Tisch', n('m')],
    ]);
    const nouns = pool.map((x) => x.noun);
    expect(nouns).toContain('Wohnung');
    expect(pool.find((x) => x.noun === 'Tochter')).toMatchObject({ exception: true, gender: 'f' });
    for (const no of ['Tee', 'Bier', 'Wein', 'Baum', 'Eltern', 'Tisch']) expect(nouns).not.toContain(no);
  });

  it('gives every taught noun in the pool a gender its rule can explain', () => {
    for (const item of genderPool(taught())) {
      expect(['m', 'f', 'n']).toContain(item.gender);
      expect(item.exception).toBe(item.gender !== item.rule.gender);
    }
  });

  it('builds a round with a few exceptions', () => {
    const round = genderRound(genderPool(), 10, 5);
    expect(round).toHaveLength(10);
    const odd = round.filter((x) => x.exception).length;
    expect(odd).toBeGreaterThan(0);
    expect(odd).toBeLessThanOrEqual(3);
    expect(new Set(round.map((x) => x.noun)).size).toBe(10);
  });

  it('names the articles', () => {
    expect(ARTICLE).toEqual({ m: 'der', f: 'die', n: 'das' });
  });
});
