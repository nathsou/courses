/**
 * Splitting German text into words and linking each word to its dictionary entry.
 *
 * Pure: the dictionary is passed in, so the Markdown compiler, the audio collector and the tests
 * can use it without the bundled JSON.
 */

/** A word, or the spaces and punctuation between words. */
export interface Token {
  t: string;
  /** True for a word (letters), false for spaces, digits and punctuation. */
  w: boolean;
  /** Dictionary keys this word may belong to, best first. */
  k?: string[];
}

/** Letters plus the joiners that stay inside a German word: Bindestrich, apostrophe (geht's). */
const WORD = /[\p{L}\p{M}]+(?:['’-][\p{L}\p{M}]+)*/gu;

export function split(text: string): Token[] {
  const out: Token[] = [];
  let last = 0;
  for (const m of text.matchAll(WORD)) {
    if (m.index! > last) out.push({ t: text.slice(last, m.index), w: false });
    out.push({ t: m[0], w: true });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push({ t: text.slice(last), w: false });
  return out;
}

export interface Dict {
  /** Surface form → dictionary keys. */
  forms: (surface: string) => string[] | undefined;
  /** Whether a key is in the dictionary. */
  has: (key: string) => boolean;
  /** Whether a key is a noun the course teaches (so "Essen" at the start of a sentence stays a noun). */
  taughtNoun?: (key: string) => boolean;
}

/** Separable prefixes that can stand at the end of a clause: "Ich rufe dich morgen an." */
const PARTICLES = new Set([
  'ab', 'an', 'auf', 'aus', 'bei', 'dabei', 'dazu', 'durch', 'ein', 'entgegen', 'fern', 'fertig', 'fest', 'fort', 'frei', 'her',
  'heraus', 'herein', 'hin', 'hinaus', 'hoch', 'kennen', 'los', 'mit', 'nach', 'nieder', 'statt', 'teil', 'um', 'vor', 'voran',
  'vorbei', 'weg', 'weiter', 'wieder', 'zu', 'zurück', 'zusammen',
]);

/**
 * Look up one surface form. A capitalised word may just start a sentence: "Ich" is the pronoun
 * ich, not the noun das Ich, unless the course teaches that noun ("Essen ist fertig").
 */
export function resolve(word: string, dict: Dict, initial = false): string[] | undefined {
  const exact = dict.forms(word);
  const lower = word.charAt(0).toLowerCase() + word.slice(1);
  const low = lower !== word ? dict.forms(lower) : undefined;
  if (initial && low?.length && !exact?.some((k) => dict.taughtNoun?.(k))) return [...low, ...(exact ?? [])];
  if (exact?.length) return exact;
  return low?.length ? low : undefined;
}

/**
 * Tokenise and link words to the dictionary. A separated verb prefix at the end of a clause is
 * linked back to its verb, so "rufe … an" opens the card for "anrufen".
 */
export function annotate(text: string, dict: Dict): Token[] {
  const tokens = split(text);
  let initial = true;
  for (const t of tokens) {
    if (!t.w) {
      if (/[.!?:]|^\s*[„“"–-]\s*$/.test(t.t)) initial = true;
      continue;
    }
    const k = resolve(t.t, dict, initial);
    if (k) t.k = k;
    initial = false;
  }
  // Clause by clause (split at . ! ? ; : and commas), join a clause-final particle with a verb.
  let start = 0;
  for (let i = 0; i <= tokens.length; i++) {
    const end = i === tokens.length || (!tokens[i]!.w && /[.!?;:,–—"“”„]/.test(tokens[i]!.t));
    if (!end) continue;
    const words = tokens.slice(start, i).filter((x) => x.w);
    const last = words[words.length - 1];
    if (last && words.length >= 3 && PARTICLES.has(last.t)) {
      for (const v of words.slice(0, -1)) {
        const keys = (v.k ?? []).flatMap((k) => [`${last.t}${k}`, `sich ${last.t}${k}`]).filter((k) => dict.has(k));
        if (keys.length) {
          v.k = [...keys, ...(v.k ?? [])];
          last.k = [...keys, ...(last.k ?? [])];
          break;
        }
      }
    }
    start = i + 1;
  }
  return tokens;
}

/** Strip the inline German markup used in English text: "{Guten Tag}" → "Guten Tag". */
export const unbrace = (s: string) => s.replace(/\{([^{}]*)\}/g, '$1');

/** The German runs marked with braces inside English text. */
export function braced(s: string): string[] {
  return [...s.matchAll(/\{([^{}]+)\}/g)].map((m) => m[1]!);
}
