/**
 * The dictionary notation used in lesson word lists, as in German textbooks:
 *
 *   der Tisch, -e | table              noun: article, singular, plural ending
 *   die Stadt, ¨-e | town              ¨ = the stem vowel takes an umlaut
 *   das Zimmer, - | room               "-" = plural unchanged
 *   der Student, -en | student
 *   das Museum, Museen | museum         a full plural form
 *   die Eltern (Pl.) | parents          plural-only nouns
 *   die Milch | milk                    no plural given: looked up in the dictionary
 *   fahren (fährt, fuhr, ist gefahren) | to drive    verb with principal parts
 *   an|rufen | to phone                 separable verb: the prefix before the bar
 *   sich freuen (über + A) | to be glad (about)      reflexive, with its preposition
 *   gut (besser, am besten) | good      adjective with irregular comparison
 *   Wie geht's? | How are you?          anything else is a phrase
 *
 * This module is pure (no Svelte, no JSON) so the Markdown compiler and scripts can use it.
 */

export type Article = 'der' | 'die' | 'das';
export type Gender = 'm' | 'f' | 'n' | 'pl';

export interface Headword {
  /** The deck and dictionary key: "der Tisch", "anrufen", "sich freuen", "gut", "Wie geht's?". */
  key: string;
  /** The bare lemma to look up in the dictionary: "Tisch", "anrufen", "freuen". */
  lemma: string;
  kind: 'noun' | 'verb' | 'other';
  /** A lower-case word in -n with no markers: a verb if the dictionary says so (essen, not zusammen). */
  maybeVerb?: boolean;
  article?: Article;
  /** Plural-only noun (die Eltern). */
  pluralOnly?: boolean;
  /** Plural as written in the notation ("-e", "¨-er", "Museen", "-"), if given. */
  plural?: string;
  /** Separable prefix (an|rufen → "an"). */
  prefix?: string;
  reflexive?: boolean;
  /** Principal parts as written: "fährt, fuhr, ist gefahren", or comparison "besser, am besten". */
  parts?: string;
  /** Anything else in brackets, such as "über + A". */
  extra?: string;
}

const ARTICLES: Record<Article, Gender> = { der: 'm', die: 'f', das: 'n' };
export const genderOf = (a: Article): Gender => ARTICLES[a];
export const articleOf: Record<Exclude<Gender, 'pl'>, Article> = { m: 'der', f: 'die', n: 'das' };

/** Umlaut the last umlautable vowel of a stem (Haus → Häus, Stadt → Städt, Buch → Büch). */
export function umlaut(stem: string): string {
  // Find the last a/o/u/au that is not part of a final -e/-el/-en/-er syllable.
  const vowels = [...stem.matchAll(/au|Au|äu|[aouAOU]/g)];
  for (let i = vowels.length - 1; i >= 0; i--) {
    const v = vowels[i]!;
    const after = stem.slice(v.index! + v[0].length);
    if (/^[^aeiouäöü]*$/i.test(after) || /^[^aeiouäöü]*e[lnr]?$/i.test(after)) {
      const rep: Record<string, string> = { au: 'äu', Au: 'Äu', a: 'ä', o: 'ö', u: 'ü', A: 'Ä', O: 'Ö', U: 'Ü', äu: 'äu' };
      return stem.slice(0, v.index) + rep[v[0]] + after;
    }
  }
  return stem;
}

/** Apply a plural notation to a singular: ("Stadt", "¨-e") → "Städte". Returns undefined for "no plural". */
export function applyPlural(singular: string, notation: string): string | undefined {
  const n = notation.trim().replace(/^–$/, '-');
  if (/^(\(?(nur|only)?\s*Sg\.?\)?|kein Pl\.?|no pl(ural)?\.?)$/i.test(n)) return undefined;
  const um = /^¨/.test(n) || /^-¨/.test(n);
  const ending = n.replace(/^-?¨-?/, '').replace(/^-/, '');
  if (!/^-|^¨/.test(n)) return n; // a full form: "Museen"
  const stem = um ? umlaut(singular) : singular;
  return stem + ending;
}

/** The notation for a plural relative to its singular: ("Stadt", "Städte") → "¨-e". */
export function pluralNotation(singular: string, plural: string | undefined): string {
  if (!plural) return '';
  if (plural === singular) return '-';
  if (plural.startsWith(singular)) return `-${plural.slice(singular.length)}`;
  const u = umlaut(singular);
  if (u !== singular && plural.startsWith(u)) return plural === u ? '¨' : `¨-${plural.slice(u.length)}`;
  return plural;
}

/** Parse the headword part of a word-list line (before the "|"). */
export function parseHeadword(raw: string): Headword {
  let s = raw.trim();
  // Noun with article.
  const noun = /^(der|die|das)\s+([\p{Lu}][\p{L}\p{M}-]*(?:\s[\p{Lu}][\p{L}-]*)?)(?:\s*,\s*([^()]+?))?\s*(?:\((Pl\.?|pl\.?|Plural|Sg\.?|nur Sg\.?|[^)]*)\))?\s*$/u.exec(s);
  if (noun) {
    const [, art, lemma, plural, bracket] = noun;
    const pluralOnly = !!bracket && /^pl/i.test(bracket);
    const h: Headword = { key: `${art} ${lemma}`, lemma: lemma!, kind: 'noun', article: pluralOnly ? undefined : (art as Article) };
    if (pluralOnly) h.pluralOnly = true;
    if (plural) h.plural = plural.trim();
    if (bracket && !pluralOnly) {
      if (/^(nur )?Sg\.?$/i.test(bracket)) h.plural = 'Sg.';
      else h.extra = bracket;
    }
    return h;
  }
  let reflexive = false;
  if (/^sich\s/.test(s)) {
    reflexive = true;
    s = s.slice(5);
  }
  // Everything else: a word followed by bracketed groups (principal parts, a case or preposition).
  const groups = [...s.matchAll(/\(([^)]*)\)/g)].map((m) => m[1]!.trim());
  const word = s.replace(/\s*\([^)]*\)/g, '').trim();
  const isParts = (g: string) => /,/.test(g) && /\b(hat|ist)\s/.test(g);
  const parts = groups.find(isParts);
  const extra = groups.filter((g) => g !== parts && !/,/.test(g)).join('; ') || undefined;
  const comparison = groups.find((g) => g !== parts && /,/.test(g));
  if (/^\p{Ll}[\p{Ll}|]*n$/u.test(word)) {
    // A lower-case word in -n is certainly a verb with parts, a | or sich; otherwise (essen,
    // but also morgen, zusammen) the dictionary build decides.
    const explicit = !!parts || reflexive || word.includes('|');
    const lemma = word.replace('|', '');
    const h: Headword = { key: `${reflexive ? 'sich ' : ''}${lemma}`, lemma, kind: explicit ? 'verb' : 'other' };
    if (!explicit) h.maybeVerb = true;
    if (word.includes('|')) h.prefix = word.split('|')[0];
    if (reflexive) h.reflexive = true;
    if (parts) h.parts = parts;
    if (extra) h.extra = extra;
    return h;
  }
  if (reflexive) return { key: `sich ${word}`, lemma: word, kind: 'other', reflexive: true, ...(extra ? { extra } : {}) };
  if (groups.length && /^[\p{L}-]+$/u.test(word)) {
    // gut (besser, am besten); bekannt (+ D)
    const h: Headword = { key: word, lemma: word, kind: 'other' };
    if (comparison) h.parts = comparison;
    if (extra) h.extra = extra;
    return h;
  }
  return { key: raw.trim(), lemma: raw.trim(), kind: 'other' };
}

/** A word-list line: "der Tisch, -e | table". */
export function parseWordLine(line: string): { head: Headword; gloss?: string; raw: string } {
  const bar = line.indexOf(' | ');
  const left = bar >= 0 ? line.slice(0, bar) : line.replace(/\s*\|\s*$/, '');
  const gloss = bar >= 0 ? line.slice(bar + 3).trim() : undefined;
  return { head: parseHeadword(left), gloss: gloss || undefined, raw: left.trim() };
}

/** Split principal parts "fährt, fuhr, ist gefahren" into [present, past, aux, participle]. */
export function splitParts(parts: string): { present?: string; past?: string; aux?: 'hat' | 'ist'; participle?: string } | undefined {
  const p = parts.split(',').map((x) => x.trim());
  if (p.length !== 3) return undefined;
  const m = /^(hat|ist)\s+(.+)$/.exec(p[2]!);
  if (!m) return undefined;
  return { present: p[0], past: p[1], aux: m[1] as 'hat' | 'ist', participle: m[2] };
}
