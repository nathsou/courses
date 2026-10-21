import { describe, expect, it } from 'vitest';
import { defaultsForLocale, term } from './locale';

describe('defaults from the browser locale', () => {
  const pick = (...l: string[]) => {
    const d = defaultsForLocale(l);
    return `${d.noteNames}/${d.terms}${d.accentedRe ? '/Ré' : ''}`;
  };
  it('follows the table in docs/PLAN.md §5a', () => {
    expect(pick('fr-FR')).toBe('solfege/american/Ré');
    expect(pick('fr')).toBe('solfege/american/Ré');
    expect(pick('it-IT')).toBe('solfege/american');
    expect(pick('es-419')).toBe('solfege/american');
    expect(pick('pt-BR')).toBe('solfege/american');
    expect(pick('de-AT')).toBe('german/american');
    expect(pick('nl')).toBe('german/american');
    expect(pick('nb-NO')).toBe('german/american');
    expect(pick('pl')).toBe('german/american');
    expect(pick('en-GB')).toBe('letters/british');
    expect(pick('en-AU')).toBe('letters/british');
    expect(pick('en_IE')).toBe('letters/british');
    expect(pick('en-US')).toBe('letters/american');
    expect(pick('en')).toBe('letters/american');
    expect(pick('ja-JP')).toBe('letters/american');
    expect(pick()).toBe('letters/american');
  });
  it('uses the first preferred language', () => {
    expect(pick('en-GB', 'fr-FR')).toBe('letters/british');
    expect(pick('fr-CA', 'en-CA')).toBe('solfege/american/Ré');
  });
});

describe('terms', () => {
  it('translates both ways and keeps capitals', () => {
    expect(term('crotchet', 'american')).toBe('quarter note');
    expect(term('quarter note', 'british')).toBe('crotchet');
    expect(term('Bar', 'american')).toBe('Measure');
    expect(term('crotchet', 'american', true)).toBe('quarter note (crotchet)');
    expect(term('crotchet', 'british', true)).toBe('crotchet (quarter note)');
    expect(term('octave', 'british', true)).toBe('octave');
  });
});
