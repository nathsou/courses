/**
 * Default note names and terms from the browser's languages (navigator.languages), never from
 * geolocation or a network lookup. See docs/PLAN.md §5a.
 */
import type { NoteNameSystem } from '$lib/music/names';

export type TermSet = 'british' | 'american';

export interface LocaleDefaults {
  noteNames: NoteNameSystem;
  /** French writes Ré. */
  accentedRe: boolean;
  terms: TermSet;
  /** The language tag the choice was made from, for the "from your browser's language" line. */
  from: string | undefined;
}

const SOLFEGE = new Set(['fr', 'it', 'es', 'pt', 'ro', 'ca', 'gl']);
const GERMAN = new Set(['de', 'nl', 'da', 'nb', 'nn', 'no', 'sv', 'fi', 'is', 'cs', 'sk', 'pl', 'hu', 'sl', 'hr', 'et', 'lv', 'lt']);
const BRITISH_REGIONS = new Set(['GB', 'IE', 'AU', 'NZ', 'ZA', 'IN']);

export function defaultsForLocale(languages: readonly string[]): LocaleDefaults {
  const tag = languages.find((l) => l.trim() !== '');
  if (!tag) return { noteNames: 'letters', accentedRe: false, terms: 'american', from: undefined };
  const [lang = '', ...rest] = tag.toLowerCase().split(/[-_]/);
  const region = rest.find((p) => /^[a-z]{2}$/.test(p))?.toUpperCase();
  const noteNames: NoteNameSystem = SOLFEGE.has(lang) ? 'solfege' : GERMAN.has(lang) ? 'german' : 'letters';
  const terms: TermSet = lang === 'en' && region && BRITISH_REGIONS.has(region) ? 'british' : 'american';
  return { noteNames, accentedRe: lang === 'fr', terms, from: tag };
}

/** The British and American names of note values and other terms that differ. */
export const TERMS: { british: string; american: string }[] = [
  { british: 'semibreve', american: 'whole note' },
  { british: 'minim', american: 'half note' },
  { british: 'crotchet', american: 'quarter note' },
  { british: 'quaver', american: 'eighth note' },
  { british: 'semiquaver', american: 'sixteenth note' },
  { british: 'demisemiquaver', american: 'thirty-second note' },
  { british: 'semibreve rest', american: 'whole rest' },
  { british: 'minim rest', american: 'half rest' },
  { british: 'crotchet rest', american: 'quarter rest' },
  { british: 'quaver rest', american: 'eighth rest' },
  { british: 'semiquaver rest', american: 'sixteenth rest' },
  { british: 'demisemiquaver rest', american: 'thirty-second rest' },
  { british: 'bar', american: 'measure' },
  { british: 'bars', american: 'measures' },
  { british: 'tone', american: 'whole step' },
  { british: 'tones', american: 'whole steps' },
  { british: 'semitone', american: 'half step' },
  { british: 'semitones', american: 'half steps' },
  { british: 'perfect cadence', american: 'authentic cadence' },
  { british: 'imperfect cadence', american: 'half cadence' },
  { british: 'interrupted cadence', american: 'deceptive cadence' },
  { british: 'leading note', american: 'leading tone' },
];

/**
 * A term in the chosen set, with the other in brackets when `both` is set:
 * term('crotchet', 'american', true) → "quarter note (crotchet)".
 */
export function term(word: string, set: TermSet, both = false): string {
  const lower = word.toLowerCase();
  const entry = TERMS.find((t) => t.british === lower || t.american === lower);
  if (!entry) return word;
  const main = entry[set];
  const other = entry[set === 'british' ? 'american' : 'british'];
  const out = both && other !== main ? `${main} (${other})` : main;
  return word[0] === word[0]!.toUpperCase() ? out[0]!.toUpperCase() + out.slice(1) : out;
}
