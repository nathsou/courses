import { describe, expect, it } from 'vitest';
import {
  CASES,
  GENDERS,
  adjectiveEnding,
  adjectiveReason,
  articleType,
  dativePlural,
  declineAdjective,
  definite,
  determiner,
  einHasNoEnding,
  genitiveS,
  isWeakNoun,
  joined,
  noun,
  nounForm,
  nounPhrase,
  parseCases,
  pronoun,
  weakForm,
  type Case,
  type Gender,
  type Noun,
} from './declension';

/** A table as rows nom, acc, dat, gen of [m, f, n, pl]. */
const table = (word: string) => CASES.map((c) => GENDERS.map((g) => (determiner(word, c, g) ? joined(determiner(word, c, g)!) : '—')).join(' '));

describe('determiners', () => {
  it('definite article', () => {
    expect(table('der')).toEqual(['der die das die', 'den die das die', 'dem der dem den', 'des der des der']);
    expect(definite('dat', 'pl')).toBe('den');
  });
  it('indefinite article (no plural)', () => {
    expect(table('ein')).toEqual(['ein eine ein —', 'einen eine ein —', 'einem einer einem —', 'eines einer eines —']);
  });
  it('kein', () => {
    expect(table('kein')).toEqual(['kein keine kein keine', 'keinen keine kein keine', 'keinem keiner keinem keinen', 'keines keiner keines keiner']);
  });
  it('possessives follow kein; euer drops its e', () => {
    expect(table('mein')).toEqual(['mein meine mein meine', 'meinen meine mein meine', 'meinem meiner meinem meinen', 'meines meiner meines meiner']);
    expect(table('unser')).toEqual(['unser unsere unser unsere', 'unseren unsere unser unsere', 'unserem unserer unserem unseren', 'unseres unserer unseres unserer']);
    expect(table('euer')).toEqual(['euer eure euer eure', 'euren eure euer eure', 'eurem eurer eurem euren', 'eures eurer eures eurer']);
    expect(table('Ihr')[2]).toBe('Ihrem Ihrer Ihrem Ihren');
  });
  it('der-words', () => {
    expect(table('dieser')).toEqual(['dieser diese dieses diese', 'diesen diese dieses diese', 'diesem dieser diesem diesen', 'dieses dieser dieses dieser']);
    expect(table('welcher')[1]).toBe('welchen welche welches welche');
    expect(table('jeder')[0]).toBe('jeder jede jedes —');
  });
  it('splits stem and ending for highlighting', () => {
    expect(determiner('dieser', 'dat', 'm')).toEqual({ stem: 'dies', ending: 'em' });
    expect(determiner('ein', 'nom', 'm')).toEqual({ stem: 'ein', ending: '' });
    expect(determiner('der', 'acc', 'm')).toEqual({ stem: 'd', ending: 'en' });
  });
  it('knows where ein-words have no ending', () => {
    const none = CASES.flatMap((c) => GENDERS.filter((g) => einHasNoEnding(c, g)).map((g) => `${c}-${g}`));
    expect(none).toEqual(['nom-m', 'nom-n', 'acc-n']);
  });
  it('classifies articles', () => {
    expect(articleType('der')).toBe('der');
    expect(articleType('dieser')).toBe('der');
    expect(articleType('mein')).toBe('ein');
    expect(articleType('kein')).toBe('ein');
    expect(articleType(null)).toBe('none');
  });
  it('rejects unknown words', () => {
    expect(() => determiner('foo', 'nom', 'm')).toThrow();
  });
});

describe('adjective endings', () => {
  const grid = (t: 'der' | 'ein' | 'none') => CASES.map((c) => GENDERS.map((g) => adjectiveEnding(t, c, g)).join(' '));
  it('weak, after der-words', () => {
    expect(grid('der')).toEqual(['e e e en', 'en e e en', 'en en en en', 'en en en en']);
  });
  it('mixed, after ein-words', () => {
    expect(grid('ein')).toEqual(['er e es en', 'en e es en', 'en en en en', 'en en en en']);
  });
  it('strong, with no article', () => {
    expect(grid('none')).toEqual(['er e es e', 'en e es e', 'em er em en', 'en er en er']);
  });
  it('stem changes', () => {
    expect(declineAdjective('dunkel', 'es')).toBe('dunkles');
    expect(declineAdjective('teuer', 'e')).toBe('teure');
    expect(declineAdjective('sauer', 'en')).toBe('sauren');
    expect(declineAdjective('hoch', 'er')).toBe('hoher');
    expect(declineAdjective('alt', 'en')).toBe('alten');
    expect(declineAdjective('lecker', 'e')).toBe('leckere');
  });
  it('builds whole phrases', () => {
    const Freund: Noun = { sg: 'Freund', g: 'm', pl: 'Freunde' };
    const Kaffee: Noun = { sg: 'Kaffee', g: 'm' };
    const Kind: Noun = { sg: 'Kind', g: 'n', pl: 'Kinder' };
    expect(nounPhrase('ein', Freund, 'dat', { adj: 'alt' })).toBe('einem alten Freund');
    expect(nounPhrase('ein', Freund, 'nom', { adj: 'alt' })).toBe('ein alter Freund');
    expect(nounPhrase('der', Freund, 'gen', { adj: 'alt' })).toBe('des alten Freundes');
    expect(nounPhrase(null, Kaffee, 'gen', { adj: 'kalt' })).toBe('kalten Kaffees');
    expect(nounPhrase(null, Kaffee, 'dat', { adj: 'heiß' })).toBe('heißem Kaffee');
    expect(nounPhrase('kein', Kind, 'dat', { adj: 'klein', plural: true })).toBe('keinen kleinen Kindern');
    expect(nounPhrase(null, Kind, 'gen', { adj: 'klein', plural: true })).toBe('kleiner Kinder');
    expect(nounPhrase('dieser', Kind, 'acc', { adj: 'dunkel' })).toBe('dieses dunkle Kind');
  });
  it('explains every ending with a reason that names it', () => {
    for (const t of ['der', 'ein', 'none'] as const)
      for (const c of CASES)
        for (const g of GENDERS) {
          const r = adjectiveReason(t, c, g, t === 'none' ? undefined : 'xyz');
          expect(r).toContain(`-${adjectiveEnding(t, c, g)}`);
        }
    expect(adjectiveReason('ein', 'nom', 'm', 'ein')).toMatch(/no ending/);
    expect(adjectiveReason('none', 'gen', 'm')).toMatch(/-s/);
    expect(adjectiveReason('der', 'dat', 'f', 'der')).toMatch(/every dative/);
  });
});

describe('nouns', () => {
  it('genitive -(e)s', () => {
    expect(genitiveS('Mann')).toBe('Mannes');
    expect(genitiveS('Kind')).toBe('Kindes');
    expect(genitiveS('Vater')).toBe('Vaters');
    expect(genitiveS('Haus')).toBe('Hauses');
    expect(genitiveS('Auto')).toBe('Autos');
    expect(genitiveS('Kaffee')).toBe('Kaffees');
    expect(genitiveS('Fahrrad')).toBe('Fahrrads');
    expect(genitiveS('Mantel')).toBe('Mantels');
  });
  it('dative plural -n', () => {
    expect(dativePlural('Kinder')).toBe('Kindern');
    expect(dativePlural('Hunde')).toBe('Hunden');
    expect(dativePlural('Frauen')).toBe('Frauen');
    expect(dativePlural('Autos')).toBe('Autos');
    expect(dativePlural('Äpfel')).toBe('Äpfeln');
  });
  it('n-declension', () => {
    expect(weakForm('Kollege')).toBe('Kollegen');
    expect(weakForm('Student')).toBe('Studenten');
    expect(weakForm('Herr')).toBe('Herrn');
    expect(weakForm('Nachbar')).toBe('Nachbarn');
    expect(weakForm('Bauer')).toBe('Bauern');
    expect(weakForm('Mensch')).toBe('Menschen');
    const Nachbar: Noun = { sg: 'Nachbar', g: 'm', pl: 'Nachbarn' };
    expect(isWeakNoun(Nachbar)).toBe(true);
    expect(CASES.map((c) => noun(Nachbar, c))).toEqual(['Nachbar', 'Nachbarn', 'Nachbarn', 'Nachbarn']);
    expect(nounForm(Nachbar, 'acc')).toEqual({ stem: 'Nachbar', ending: 'n' });
    expect(noun({ sg: 'Name', g: 'm' }, 'gen')).toBe('Namens');
    expect(noun({ sg: 'Name', g: 'm' }, 'dat')).toBe('Namen');
    expect(isWeakNoun({ sg: 'Mann', g: 'm' })).toBe(false);
  });
  it('splits case endings for highlighting', () => {
    const Kind: Noun = { sg: 'Kind', g: 'n', pl: 'Kinder' };
    expect(nounForm(Kind, 'gen')).toEqual({ stem: 'Kind', ending: 'es' });
    expect(nounForm(Kind, 'dat', true)).toEqual({ stem: 'Kinder', ending: 'n' });
    expect(nounForm({ sg: 'Frau', g: 'f', pl: 'Frauen' }, 'gen')).toEqual({ stem: 'Frau', ending: '' });
    expect(nounForm({ sg: 'Eltern', g: 'pl' }, 'dat')).toEqual({ stem: 'Eltern', ending: '' });
    expect(nounForm({ sg: 'Wein', g: 'm', gen: 'Weins' }, 'gen')).toEqual({ stem: 'Wein', ending: 's' });
  });
  it('complete definite paradigms', () => {
    const decline = (n: Noun, pl = false) => CASES.map((c: Case) => nounPhrase('der', n, c, { plural: pl }));
    expect(decline({ sg: 'Mann', g: 'm', pl: 'Männer' })).toEqual(['der Mann', 'den Mann', 'dem Mann', 'des Mannes']);
    expect(decline({ sg: 'Mann', g: 'm', pl: 'Männer' }, true)).toEqual(['die Männer', 'die Männer', 'den Männern', 'der Männer']);
    expect(decline({ sg: 'Frau', g: 'f', pl: 'Frauen' })).toEqual(['die Frau', 'die Frau', 'der Frau', 'der Frau']);
    expect(decline({ sg: 'Kollege', g: 'm', pl: 'Kollegen' })).toEqual(['der Kollege', 'den Kollegen', 'dem Kollegen', 'des Kollegen']);
    expect(decline({ sg: 'Herr', g: 'm', pl: 'Herren' })).toEqual(['der Herr', 'den Herrn', 'dem Herrn', 'des Herrn']);
  });
});

describe('pronouns', () => {
  const row = (c: Parameters<typeof pronoun>[1]) => Array.from({ length: 9 }, (_, i) => pronoun(i, c)).join(' ');
  it('personal pronouns', () => {
    expect(row('nom')).toBe('ich du er sie es wir ihr sie Sie');
    expect(row('acc')).toBe('mich dich ihn sie es uns euch sie Sie');
    expect(row('dat')).toBe('mir dir ihm ihr ihm uns euch ihnen Ihnen');
    expect(row('gen')).toBe('meiner deiner seiner ihrer seiner unser euer ihrer Ihrer');
  });
  it('reflexive pronouns: sich in the third person and with Sie', () => {
    expect(row('reflAcc')).toBe('mich dich sich sich sich uns euch sich sich');
    expect(row('reflDat')).toBe('mir dir sich sich sich uns euch sich sich');
  });
});

describe('parseCases', () => {
  it('reads props', () => {
    expect(parseCases('nom,acc')).toEqual(['nom', 'acc']);
    expect(parseCases('nom, acc, dat')).toEqual(['nom', 'acc', 'dat']);
    expect(parseCases('all')).toEqual(CASES);
    expect(parseCases(undefined)).toEqual(CASES);
    expect(parseCases('akk')).toEqual(['acc']);
    expect(parseCases('foo', ['nom'])).toEqual(['nom']);
  });
});

// Every cell of every table must be a real word: no "eurem"-style slips.
describe('sanity', () => {
  it('no determiner form is empty', () => {
    for (const w of ['der', 'ein', 'kein', 'mein', 'dein', 'sein', 'ihr', 'unser', 'euer', 'Ihr', 'dieser', 'jeder', 'welcher'])
      for (const c of CASES)
        for (const g of GENDERS as Gender[]) {
          const f = determiner(w, c, g);
          if (f) expect(joined(f)).toMatch(/^[A-Za-zäöü]{3,}$/);
        }
  });
});
