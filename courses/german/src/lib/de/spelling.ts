/**
 * Spelling aloud (buchstabieren): a word as the names of its letters, and marking a word typed
 * back from a spelling. Capitals are not spelt aloud, so they never count against the learner.
 */
import { LETTERS, type Letter } from '$lib/widgets/data/alphabet';
import { transliterate } from './check';

const BY_LETTER = new Map(LETTERS.map((l) => [l.letter, l]));

/** The letters of a word, in order: "Straße" → S, T, R, A, ß, E. */
export function spell(word: string): Letter[] {
  return [...word].map((ch) => {
    const l = BY_LETTER.get(ch === 'ß' ? 'ß' : ch.toUpperCase());
    if (!l) throw new Error(`No letter name for "${ch}" in "${word}"`);
    return l;
  });
}

/** The spelling as one utterance, letter names separated so the voice pauses: "Beh, Ih, Err". */
export function spokenSpelling(word: string): string {
  return spell(word)
    .map((l) => l.say)
    .join(', ');
}

export type SpellVerdict = 'right' | 'almost' | 'wrong';

/** Right if the letters match (any capitals); almost if only ä/ae, ß/ss differ. */
export function markSpelling(typed: string, word: string): SpellVerdict {
  const t = typed.trim().toLowerCase();
  const w = word.toLowerCase();
  if (t === w) return 'right';
  if (transliterate(t) === transliterate(w)) return 'almost';
  return 'wrong';
}
