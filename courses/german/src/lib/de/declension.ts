/**
 * Declension: articles and other determiners, adjective endings, noun endings and personal
 * pronouns, in the four cases. Pure functions with no data imports, shared by the ArticleTable,
 * CaseMachine and AdjectiveEndings widgets.
 *
 * The organising idea is the one the course teaches: der-words (der, dieser, jeder, welcher)
 * carry the "strong" endings that show gender and case; ein-words (ein, kein, mein…) carry the
 * same endings except in three places where they have none (ein Mann, ein Kind nominative, ein
 * Kind accusative); and "if the article does not show gender and case, the adjective must".
 */
import type { Gender } from './notation';

export type Case = 'nom' | 'acc' | 'dat' | 'gen';
export type { Gender };

export const CASES: Case[] = ['nom', 'acc', 'dat', 'gen'];
export const GENDERS: Gender[] = ['m', 'f', 'n', 'pl'];

export const CASE_NAMES: Record<Case, { de: string; en: string; role: string }> = {
  nom: { de: 'Nominativ', en: 'nominative', role: 'subject' },
  acc: { de: 'Akkusativ', en: 'accusative', role: 'direct object' },
  dat: { de: 'Dativ', en: 'dative', role: 'indirect object' },
  gen: { de: 'Genitiv', en: 'genitive', role: 'whose?' },
};

export const GENDER_NAMES: Record<Gender, string> = { m: 'masculine', f: 'feminine', n: 'neuter', pl: 'plural' };

/** Parse a `cases` prop such as "nom,acc,dat" or "all" (unknown names are dropped). */
export function parseCases(s: string | undefined, fallback: Case[] = CASES): Case[] {
  if (!s) return fallback;
  if (s.trim() === 'all') return CASES;
  const want = new Set(s.split(/[\s,]+/).map((x) => x.trim().toLowerCase().slice(0, 3)));
  const out = CASES.filter((c) => want.has(c) || (c === 'acc' && want.has('akk')));
  return out.length ? out : fallback;
}

/** The "strong" endings, which der-words always have: dies·er, dies·en, dies·em… */
export const STRONG: Record<Case, Record<Gender, string>> = {
  nom: { m: 'er', f: 'e', n: 'es', pl: 'e' },
  acc: { m: 'en', f: 'e', n: 'es', pl: 'e' },
  dat: { m: 'em', f: 'er', n: 'em', pl: 'en' },
  gen: { m: 'es', f: 'er', n: 'es', pl: 'er' },
};

/** A determiner split for display: "dies" + "em". */
export interface Form {
  stem: string;
  ending: string;
}
export const joined = (f: Form) => f.stem + f.ending;

const DEFINITE: Record<Case, Record<Gender, string>> = {
  nom: { m: 'der', f: 'die', n: 'das', pl: 'die' },
  acc: { m: 'den', f: 'die', n: 'das', pl: 'die' },
  dat: { m: 'dem', f: 'der', n: 'dem', pl: 'den' },
  gen: { m: 'des', f: 'der', n: 'des', pl: 'der' },
};

export function definite(c: Case, g: Gender): string {
  return DEFINITE[c][g];
}

/** The definite article as d + ending, for highlighting. */
export function definiteForm(c: Case, g: Gender): Form {
  const a = DEFINITE[c][g];
  return { stem: 'd', ending: a.slice(1) };
}

/** der-words: dieser, jeder, welcher, jener, mancher, alle (given as stems: dies, jed, welch…). */
export const DER_WORDS = ['dies', 'jed', 'welch', 'jen', 'manch', 'all'] as const;

/** A der-word form; null where it does not exist (jeder has no plural, alle no singular). */
export function derWordForm(stem: string, c: Case, g: Gender): Form | null {
  if (stem === 'jed' && g === 'pl') return null;
  if (stem === 'all' && g !== 'pl') return null;
  return { stem, ending: STRONG[c][g] };
}

/** ein-words: ein, kein and the possessives. */
export const EIN_WORDS = ['ein', 'kein', 'mein', 'dein', 'sein', 'ihr', 'unser', 'euer', 'Ihr'] as const;

/** Where an ein-word has no ending at all: masculine nominative, neuter nominative and accusative. */
export function einHasNoEnding(c: Case, g: Gender): boolean {
  return (c === 'nom' && (g === 'm' || g === 'n')) || (c === 'acc' && g === 'n');
}

/**
 * An ein-word form: ein·em, kein·e, unser·en. "euer" drops its e before an ending (eure, eurem,
 * euren). "ein" has no plural (null).
 */
export function einWordForm(base: string, c: Case, g: Gender): Form | null {
  if (base === 'ein' && g === 'pl') return null;
  if (einHasNoEnding(c, g)) return { stem: base, ending: '' };
  const stem = base === 'euer' ? 'eur' : base;
  return { stem, ending: STRONG[c][g] };
}

export type ArticleKind = 'definite' | 'indefinite' | 'negative' | 'possessive' | 'demonstrative';

/** The determiner a kind of article uses by default. */
export const KIND_WORD: Record<ArticleKind, string> = {
  definite: 'der',
  indefinite: 'ein',
  negative: 'kein',
  possessive: 'mein',
  demonstrative: 'dies',
};

/** Any determiner by its dictionary word: "der", "ein", "kein", "mein", "dieser"/"dies", "welcher"… */
export function determiner(word: string, c: Case, g: Gender): Form | null {
  if (word === 'der' || word === 'die' || word === 'das') return definiteForm(c, g);
  if ((EIN_WORDS as readonly string[]).includes(word)) return einWordForm(word, c, g);
  const stem = word.replace(/(er|e|es)$/, '');
  if ((DER_WORDS as readonly string[]).includes(stem)) return derWordForm(stem, c, g);
  if ((DER_WORDS as readonly string[]).includes(word)) return derWordForm(word, c, g);
  throw new Error(`Unknown determiner: ${word}`);
}

/** The kind of declension a determiner triggers in a following adjective. */
export type ArticleType = 'der' | 'ein' | 'none';

export function articleType(word: string | null | undefined): ArticleType {
  if (!word) return 'none';
  return (EIN_WORDS as readonly string[]).includes(word) ? 'ein' : 'der';
}

// --- Adjectives --------------------------------------------------------------------------

/**
 * The adjective ending after a der-word (weak), an ein-word (mixed) or no article (strong).
 * After ein-words the plural is that of keine/meine (ein itself has none).
 */
export function adjectiveEnding(type: ArticleType, c: Case, g: Gender): string {
  if (type === 'none') {
    // Strong, like der/die/das, except masculine and neuter genitive: the noun's -s shows it.
    if (c === 'gen' && (g === 'm' || g === 'n')) return 'en';
    return STRONG[c][g];
  }
  if (type === 'ein' && einHasNoEnding(c, g)) return STRONG[c][g]; // -er, -es
  // Weak: -e in the five places where the definite article is der/die/das, else -en.
  if (g !== 'pl' && (c === 'nom' || (c === 'acc' && g !== 'm'))) return 'e';
  return 'en';
}

/** Which declension that is, by its traditional name. */
export function declensionName(type: ArticleType): 'weak' | 'mixed' | 'strong' {
  return type === 'der' ? 'weak' : type === 'ein' ? 'mixed' : 'strong';
}

/** The stem an adjective takes endings on: dunkel → dunkl, teuer → teur, hoch → hoh. */
export function adjectiveStem(adj: string): string {
  if (adj === 'hoch') return 'hoh';
  if (/el$/.test(adj)) return adj.slice(0, -2) + 'l';
  if (/(au|eu)er$/.test(adj)) return adj.slice(0, -2) + 'r';
  return adj;
}

/** An adjective with its ending: ("alt", "en") → "alten"; ("dunkel", "es") → "dunkles". */
export function declineAdjective(adj: string, ending: string): string {
  return adjectiveStem(adj) + ending;
}

/**
 * One sentence explaining an adjective ending by the principle "if the article does not show
 * gender and case, the adjective must". German forms are in {braces}.
 */
export function adjectiveReason(type: ArticleType, c: Case, g: Gender, article?: string): string {
  const end = adjectiveEnding(type, c, g);
  const what = g === 'pl' ? `plural ${CASE_NAMES[c].en}` : `${GENDER_NAMES[g]} ${CASE_NAMES[c].en}`;
  const art = article ? `{${article}}` : 'the article';
  if (type === 'none') {
    if (c === 'gen' && g !== 'f' && g !== 'pl') return `No article, but the noun's genitive -s already shows the case, so the adjective takes -en rather than -es.`;
    return `No article to show the ${what}, so the adjective must: it takes -${end}, like {${definite(c, g)}}.`;
  }
  if (type === 'ein' && einHasNoEnding(c, g)) {
    return `${art} has no ending, so it does not show that this is ${g === 'm' ? 'masculine' : 'neuter'}: the adjective must, with -${end} (as in {${definite(c, g)}}).`;
  }
  if (c === 'dat' || c === 'gen') return `${art} already shows the ${CASE_NAMES[c].en}, and after an article every ${CASE_NAMES[c].en} adjective takes -en.`;
  if (g === 'pl') return `${art} already shows the plural, and after an article plural adjectives always take -en.`;
  if (end === 'en') return `${art} already shows masculine accusative, so the adjective only needs the weak ending -en.`;
  return `${art} already shows the ${what}, so the adjective only needs the weak ending -e.`;
}

// --- Nouns -------------------------------------------------------------------------------

export interface Noun {
  /** Singular (or the plural, for plural-only nouns). */
  sg: string;
  g: Gender;
  /** Plural form, if any. */
  pl?: string;
  /** Genitive singular, when it is not the regular -(e)s or the n-declension form. */
  gen?: string;
  /** n-declension ("weak") noun: -(e)n in every case but the nominative singular. */
  weak?: boolean;
}

const syllables = (w: string) => (w.toLowerCase().match(/[aeiouäöüy]+/g) ?? []).length;

/** Genitive singular of a masculine or neuter noun: Mann → Mannes, Vater → Vaters, Haus → Hauses. */
export function genitiveS(sg: string): string {
  if (/(s|ß|x|z)$/.test(sg)) return sg + 'es';
  if (/[aeiouäöüy]$/i.test(sg)) return sg + 's';
  return syllables(sg) === 1 ? sg + 'es' : sg + 's';
}

/** Dative plural: Kinder → Kindern, Hunde → Hunden; plurals in -n or -s are left alone. */
export function dativePlural(pl: string): string {
  return /[ns]$/.test(pl) ? pl : pl + 'n';
}

/** The n-declension form: Kollege → Kollegen, Herr → Herrn, Nachbar → Nachbarn, Student → Studenten. */
export function weakForm(sg: string): string {
  if (sg === 'Herr') return 'Herrn';
  if (/(e|er|ar)$/.test(sg)) return sg + 'n';
  return sg + 'en';
}

/** Common n-declension nouns (masculine), for the n-declension marker. */
export const WEAK_NOUNS = new Set([
  'Affe', 'Bär', 'Bauer', 'Experte', 'Franzose', 'Held', 'Herr', 'Journalist', 'Junge', 'Kollege', 'Kunde', 'Löwe', 'Mensch', 'Nachbar', 'Neffe',
  'Polizist', 'Präsident', 'Student', 'Tourist', 'Name', 'Gedanke', 'Buchstabe', 'Glaube', 'Wille', 'Friede', 'Kandidat', 'Assistent', 'Architekt', 'Fotograf', 'Pilot', 'Soldat', 'Prinz',
]);
/** Nouns of the n-declension that also take -s in the genitive: des Namens. */
const NS_NOUNS = new Set(['Name', 'Gedanke', 'Buchstabe', 'Glaube', 'Wille', 'Friede', 'Funke', 'Same']);

export const isWeakNoun = (n: Noun) => n.weak ?? (n.g === 'm' && WEAK_NOUNS.has(n.sg));

/** The noun in a case, split into the stem and the case ending (for highlighting). */
export function nounForm(n: Noun, c: Case, plural = n.g === 'pl'): Form {
  if (plural) {
    const pl = n.g === 'pl' ? n.sg : (n.pl ?? n.sg);
    if (c === 'dat') {
      const d = dativePlural(pl);
      return { stem: pl, ending: d.slice(pl.length) };
    }
    return { stem: pl, ending: '' };
  }
  if (n.g === 'f' || c === 'nom') return { stem: n.sg, ending: '' };
  if (isWeakNoun(n)) {
    const w = weakForm(n.sg);
    if (c === 'gen' && NS_NOUNS.has(n.sg)) return { stem: n.sg, ending: w.slice(n.sg.length) + 's' };
    return { stem: n.sg, ending: w.slice(n.sg.length) };
  }
  if (c === 'gen') {
    const gen = n.gen ?? genitiveS(n.sg);
    return gen.startsWith(n.sg) ? { stem: n.sg, ending: gen.slice(n.sg.length) } : { stem: gen, ending: '' };
  }
  return { stem: n.sg, ending: '' };
}

export const noun = (n: Noun, c: Case, plural?: boolean) => joined(nounForm(n, c, plural));

/** "dem Mann", "den Kindern", "eines alten Freundes": determiner word + optional adjective + noun. */
export function nounPhrase(word: string | null, n: Noun, c: Case, opts: { plural?: boolean; adj?: string } = {}): string {
  const g: Gender = opts.plural || n.g === 'pl' ? 'pl' : n.g;
  const det = word ? determiner(word, c, g) : null;
  const parts: string[] = [];
  if (det) parts.push(joined(det));
  if (opts.adj) parts.push(declineAdjective(opts.adj, adjectiveEnding(det ? articleType(word) : 'none', c, g)));
  parts.push(noun(n, c, g === 'pl'));
  return parts.join(' ');
}

// --- Pronouns ----------------------------------------------------------------------------

/** ich, du, er, sie (she), es, wir, ihr, sie (they), Sie. */
export const PERSONS = ['ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'sie', 'Sie'] as const;
export const PERSON_EN = ['I', 'you', 'he', 'she', 'it', 'we', 'you (pl.)', 'they', 'you (formal)'];

const PRONOUNS: Record<Case | 'reflAcc' | 'reflDat', string[]> = {
  nom: ['ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'sie', 'Sie'],
  acc: ['mich', 'dich', 'ihn', 'sie', 'es', 'uns', 'euch', 'sie', 'Sie'],
  dat: ['mir', 'dir', 'ihm', 'ihr', 'ihm', 'uns', 'euch', 'ihnen', 'Ihnen'],
  gen: ['meiner', 'deiner', 'seiner', 'ihrer', 'seiner', 'unser', 'euer', 'ihrer', 'Ihrer'],
  reflAcc: ['mich', 'dich', 'sich', 'sich', 'sich', 'uns', 'euch', 'sich', 'sich'],
  reflDat: ['mir', 'dir', 'sich', 'sich', 'sich', 'uns', 'euch', 'sich', 'sich'],
};

export type PronounCase = Case | 'reflAcc' | 'reflDat';

/** A personal (or reflexive) pronoun by person index (0–8, see PERSONS). */
export function pronoun(person: number, c: PronounCase): string {
  return PRONOUNS[c][person]!;
}

/** The possessive determiner that belongs to each person: ich → mein, Sie → Ihr. */
export const POSSESSIVES = ['mein', 'dein', 'sein', 'ihr', 'sein', 'unser', 'euer', 'ihr', 'Ihr'] as const;
