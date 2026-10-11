/**
 * "Guess the gender from the ending": nouns whose ending (or Ge- prefix) matches one of the
 * rules in gender.ts, from the rules' own examples and exceptions and from the course dictionary.
 */
import { GENDER_RULES, ruleFor, type GenderRule } from './gender';
import type { Entry } from './lexicon';
import { shuffle } from '$lib/exercises/shuffle';

export type G = 'm' | 'f' | 'n';
export const ARTICLE: Record<G, string> = { m: 'der', f: 'die', n: 'das' };
const BY_ARTICLE: Record<string, G> = { der: 'm', die: 'f', das: 'n' };

export interface GenderItem {
  noun: string;
  gender: G;
  rule: GenderRule;
  /** The noun breaks its rule (die Mutter, der Junge). */
  exception: boolean;
}

/** Split a noun at the rule's ending, for highlighting: ["Zeit", "ung"], or ["Ge", "schenk"]. */
export function splitEnding(noun: string, rule: GenderRule): { before: string; ending: string; after: string } {
  if (rule.ending.endsWith('-')) {
    const n = rule.ending.length - 1;
    return { before: '', ending: noun.slice(0, n), after: noun.slice(n) };
  }
  const n = rule.ending.length - 1;
  return { before: noun.slice(0, -n), ending: noun.slice(-n), after: '' };
}

const syllables = (s: string) => (s.toLowerCase().match(/[aeiouyäöü]+/g) ?? []).length;

/**
 * Whether a dictionary noun really has the rule's ending, rather than just ending in the same
 * letters: one-syllable words (der Baum, der Wein, der Sprung) and -er, -in after a vowel (das
 * Bier, der Wein) are not suffixes; -ee is not the unstressed -e (der Tee, der Kaffee).
 */
function fits(noun: string, rule: GenderRule): boolean {
  if (syllables(noun) < 2) return false;
  if (rule.ending === '-e' && /ee$/.test(noun)) return false;
  if ((rule.ending === '-er' || rule.ending === '-in') && /[aeiouäöü]$/i.test(noun.slice(0, -2))) return false;
  if (rule.ending === '-um' && /aum$/.test(noun)) return false;
  return true;
}

/** Every quiz noun: the rules' examples and exceptions, then the dictionary's taught nouns. */
export function genderPool(entries: [string, Entry][] = []): GenderItem[] {
  const out = new Map<string, GenderItem>();
  for (const rule of GENDER_RULES) {
    for (const noun of rule.examples) if (!out.has(noun)) out.set(noun, { noun, gender: rule.gender, rule, exception: false });
    for (const ex of rule.exceptions ?? []) {
      const [art, noun] = ex.split(' ') as [string, string];
      const g = BY_ARTICLE[art];
      if (g && noun && !out.has(noun)) out.set(noun, { noun, gender: g, rule, exception: g !== rule.gender });
    }
  }
  for (const [key, e] of entries) {
    if (e.p !== 'n' || !e.a || e.a === 'pl') continue;
    const noun = key.replace(/^(der|die|das) /, '');
    if (out.has(noun) || /\s/.test(noun)) continue;
    const rule = ruleFor(noun);
    if (!rule || !fits(noun, rule)) continue;
    out.set(noun, { noun, gender: e.a, rule, exception: e.a !== rule.gender });
  }
  return [...out.values()];
}

/** A round: mostly nouns that follow their rule, with a few exceptions mixed in. */
export function genderRound(pool: GenderItem[], count: number, seed: number): GenderItem[] {
  const regular = shuffle(
    pool.filter((x) => !x.exception),
    seed,
  );
  const odd = shuffle(
    pool.filter((x) => x.exception),
    seed + 1,
  );
  const nOdd = Math.min(odd.length, Math.round(count * 0.3));
  return shuffle([...regular.slice(0, count - nOdd), ...odd.slice(0, nOdd)], seed + 2);
}
