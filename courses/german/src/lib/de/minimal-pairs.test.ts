import { describe, expect, it } from 'vitest';
import { pairQuiz } from './minimal-pairs';
import { SOUND_SETS } from '$lib/widgets/data/sounds';

describe('pairQuiz', () => {
  const pairs = [
    { a: 'schon', b: 'schön' },
    { a: 'Mutter', b: 'Mütter' },
    { a: 'Bach', b: 'Bauch' },
  ];
  it('uses every pair before repeating', () => {
    const q = pairQuiz(pairs, 6, 42);
    expect(q).toHaveLength(6);
    const first = q.slice(0, 3).map((x) => [x.a, x.b].sort().join('/'));
    expect(new Set(first).size).toBe(3);
  });
  it('mixes which word is spoken and where it appears', () => {
    const q = pairQuiz(pairs, 60, 7);
    expect(q.some((x) => x.answer === 'a')).toBe(true);
    expect(q.some((x) => x.answer === 'b')).toBe(true);
    expect(q.some((x) => x.a === 'schön')).toBe(true);
    expect(q.some((x) => x.a === 'schon')).toBe(true);
  });
  it('copes with no pairs', () => {
    expect(pairQuiz([], 5, 1)).toEqual([]);
  });
});

describe('sound sets', () => {
  it('has five sets, each with sounds and at least five pairs', () => {
    expect(SOUND_SETS.map((s) => s.id)).toEqual(['vowels', 'umlauts', 'diphthongs', 'consonants', 'endings']);
    for (const s of SOUND_SETS) {
      expect(s.sounds.length).toBeGreaterThan(3);
      expect(s.pairs.length).toBeGreaterThanOrEqual(5);
      for (const p of s.pairs) expect(p.a.word).not.toBe(p.b.word);
    }
  });
  it('keeps braces balanced in the notes', () => {
    for (const s of SOUND_SETS) for (const t of [s.summary, ...s.sounds.map((x) => x.note)]) expect(t.split('{').length).toBe(t.split('}').length);
  });
});
