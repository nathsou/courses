import { describe, expect, it } from 'vitest';
import { compareWords } from './mic';

describe('compareWords', () => {
  it('marks the words that were heard, ignoring case and punctuation', () => {
    expect(compareWords('Ich heiße Anna.', 'ich heiße hanna')).toEqual([
      { word: 'Ich', ok: true },
      { word: 'heiße', ok: true },
      { word: 'Anna.', ok: false },
    ]);
  });
});
