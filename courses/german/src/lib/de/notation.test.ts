import { describe, expect, it } from 'vitest';
import { applyPlural, parseHeadword, parseWordLine, pluralNotation, umlaut, splitParts } from './notation';

describe('umlaut', () => {
  it('umlauts the last full vowel of the stem', () => {
    expect(umlaut('Stadt')).toBe('Städt');
    expect(umlaut('Haus')).toBe('Häus');
    expect(umlaut('Apfel')).toBe('Äpfel');
    expect(umlaut('Bruder')).toBe('Brüder');
    expect(umlaut('Mutter')).toBe('Mütter');
    expect(umlaut('Buch')).toBe('Büch');
  });
});

describe('plurals', () => {
  it('applies and derives notations', () => {
    expect(applyPlural('Stadt', '¨-e')).toBe('Städte');
    expect(applyPlural('Kind', '-er')).toBe('Kinder');
    expect(applyPlural('Zimmer', '-')).toBe('Zimmer');
    expect(applyPlural('Vater', '¨')).toBe('Väter');
    expect(applyPlural('Museum', 'Museen')).toBe('Museen');
    expect(pluralNotation('Haus', 'Häuser')).toBe('¨-er');
    expect(pluralNotation('Tisch', 'Tische')).toBe('-e');
    expect(pluralNotation('Lehrer', 'Lehrer')).toBe('-');
    expect(pluralNotation('Mutter', 'Mütter')).toBe('¨');
    expect(pluralNotation('Museum', 'Museen')).toBe('Museen');
  });
});

describe('headwords', () => {
  it('parses nouns', () => {
    expect(parseHeadword('die Stadt, ¨-e')).toMatchObject({ key: 'die Stadt', lemma: 'Stadt', kind: 'noun', article: 'die', plural: '¨-e' });
    expect(parseHeadword('die Eltern (Pl.)')).toMatchObject({ key: 'die Eltern', pluralOnly: true });
    expect(parseHeadword('die Milch')).toMatchObject({ key: 'die Milch', kind: 'noun' });
    expect(parseHeadword('der Student, -en')).toMatchObject({ plural: '-en' });
  });
  it('parses verbs', () => {
    expect(parseHeadword('fahren (fährt, fuhr, ist gefahren)')).toMatchObject({ key: 'fahren', kind: 'verb', parts: 'fährt, fuhr, ist gefahren' });
    expect(parseHeadword('an|rufen')).toMatchObject({ key: 'anrufen', prefix: 'an', kind: 'verb' });
    expect(parseHeadword('sich freuen (über + A)')).toMatchObject({ key: 'sich freuen', lemma: 'freuen', reflexive: true, extra: 'über + A' });
    expect(parseHeadword('helfen (hilft, half, hat geholfen) (+ D)')).toMatchObject({ key: 'helfen', kind: 'verb', parts: 'hilft, half, hat geholfen', extra: '+ D' });
    expect(parseHeadword('machen')).toMatchObject({ key: 'machen', kind: 'other', maybeVerb: true });
    expect(parseHeadword('zusammen')).toMatchObject({ kind: 'other', maybeVerb: true });
    expect(parseHeadword('warten (auf + A)')).toMatchObject({ key: 'warten', extra: 'auf + A', maybeVerb: true });
    expect(splitParts('fährt, fuhr, ist gefahren')).toEqual({ present: 'fährt', past: 'fuhr', aux: 'ist', participle: 'gefahren' });
  });
  it('parses other words and phrases', () => {
    expect(parseHeadword('gut (besser, am besten)')).toMatchObject({ key: 'gut', kind: 'other', parts: 'besser, am besten' });
    expect(parseHeadword('Wie geht’s?')).toMatchObject({ key: 'Wie geht’s?', kind: 'other' });
    expect(parseHeadword('schön')).toMatchObject({ key: 'schön', kind: 'other' });
    expect(parseWordLine('der Tisch, -e | table')).toMatchObject({ gloss: 'table', head: { key: 'der Tisch' } });
  });
});
