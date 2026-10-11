import { describe, expect, it } from 'vitest';
import { annotate, split, braced, unbrace, type Dict } from './text';

const FORMS: Record<string, string[]> = {
  ich: ['ich'],
  Ich: ['das Ich'],
  rufe: ['rufen'],
  dich: ['du'],
  morgen: ['morgen'],
  an: ['an'],
  Essen: ['das Essen'],
  essen: ['essen'],
  ist: ['sein'],
  fertig: ['fertig'],
  "geht's": ["geht's"],
};
const dict: Dict = { forms: (s) => FORMS[s], has: (k) => ['anrufen', 'rufen', 'das Essen'].includes(k) || Object.values(FORMS).flat().includes(k), taughtNoun: (k) => k === 'das Essen' };

describe('split', () => {
  it('keeps apostrophes and hyphens inside words', () => {
    expect(split("Wie geht's, E-Mail?").filter((t) => t.w).map((t) => t.t)).toEqual(['Wie', "geht's", 'E-Mail']);
  });
});

describe('annotate', () => {
  it('prefers the lower-case word at the start of a sentence', () => {
    expect(annotate('Ich rufe dich morgen an.', dict)[0]!.k).toEqual(['ich', 'das Ich']);
  });
  it('keeps a taught noun at the start of a sentence', () => {
    expect(annotate('Essen ist fertig.', dict)[0]!.k![0]).toBe('das Essen');
  });
  it('links a separated prefix back to its verb', () => {
    const t = annotate('Ich rufe dich morgen an.', dict).filter((x) => x.w);
    expect(t[1]!.k![0]).toBe('anrufen');
    expect(t[4]!.k![0]).toBe('anrufen');
  });
});

describe('braces', () => {
  it('finds and strips German runs', () => {
    expect(braced('Say {Guten Tag} or {Hallo}.')).toEqual(['Guten Tag', 'Hallo']);
    expect(unbrace('Say {Guten Tag}.')).toBe('Say Guten Tag.');
  });
});
