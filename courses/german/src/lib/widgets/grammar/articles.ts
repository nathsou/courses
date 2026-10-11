/**
 * What the ArticleTable widget shows: for each kind of article, the determiner, the example
 * nouns and the little phrases a tapped cell speaks ("mit dem Mann"). Pure, for testing.
 */
import { CASES, GENDERS, determiner, joined, nounForm, pronoun, type Case, type Form, type Gender, type Noun, type PronounCase } from '$lib/de/declension';

export type TableKind = 'definite' | 'indefinite' | 'negative' | 'possessive' | 'demonstrative';
export const TABLE_KINDS: TableKind[] = ['definite', 'indefinite', 'negative', 'possessive', 'demonstrative'];

interface KindInfo {
  title: string;
  /** Determiners the learner can switch between (the first is the default). */
  words: string[];
  nouns: Record<Gender, Noun & { en: string }>;
  /** Phrase frames per case; "…" is replaced by the article and noun. Plural frames where they differ. */
  frames: Record<Case, string>;
  plFrames?: Partial<Record<Case, string>>;
  note: string;
}

const MANN = { sg: 'Mann', g: 'm', pl: 'Männer', en: 'man' } as const;
const FRAU = { sg: 'Frau', g: 'f', pl: 'Frauen', en: 'woman' } as const;
const KIND = { sg: 'Kind', g: 'n', pl: 'Kinder', en: 'child' } as const;
const KINDER = { sg: 'Kinder', g: 'pl', en: 'children' } as const;

export const KINDS: Record<TableKind, KindInfo> = {
  definite: {
    title: 'der, die, das: “the”',
    words: ['der'],
    nouns: { m: MANN, f: FRAU, n: KIND, pl: KINDER },
    frames: { nom: 'Das ist …', acc: 'Ich sehe …', dat: 'mit …', gen: 'das Auto …' },
    plFrames: { nom: 'Das sind …' },
    note: 'Only the masculine changes in the accusative. The dative and genitive change everything.',
  },
  indefinite: {
    title: 'ein, eine: “a”',
    words: ['ein'],
    nouns: { m: MANN, f: FRAU, n: KIND, pl: KINDER },
    frames: { nom: 'Das ist …', acc: 'Ich sehe …', dat: 'mit …', gen: 'das Auto …' },
    plFrames: { nom: 'Das sind …' },
    note: '{ein} has no plural: “children” is just {Kinder}. Where {ein} has no ending (masculine nominative, neuter nominative and accusative), it does not show the gender.',
  },
  negative: {
    title: 'kein: “no, not a”',
    words: ['kein'],
    nouns: { m: MANN, f: FRAU, n: KIND, pl: KINDER },
    frames: { nom: 'Das ist …', acc: 'Ich sehe …', dat: 'mit …', gen: '…' },
    plFrames: { nom: 'Das sind …' },
    note: '{kein} is {ein} with a k, and it has a plural: {keine Kinder}.',
  },
  possessive: {
    title: 'mein, dein, sein…: “my, your, his…”',
    words: ['mein', 'dein', 'sein', 'ihr', 'unser', 'euer', 'Ihr'],
    nouns: {
      m: { sg: 'Bruder', g: 'm', pl: 'Brüder', en: 'brother' },
      f: { sg: 'Schwester', g: 'f', pl: 'Schwestern', en: 'sister' },
      n: { sg: 'Auto', g: 'n', pl: 'Autos', en: 'car' },
      pl: { sg: 'Freunde', g: 'pl', en: 'friends' },
    },
    frames: { nom: 'Das ist …', acc: 'Ich suche …', dat: 'mit …', gen: 'wegen …' },
    plFrames: { nom: 'Das sind …' },
    note: '{dein, sein, ihr, unser, euer} and {Ihr} take exactly the endings of {mein} (and of {kein}). {euer} drops its e when an ending follows: {eure, eurem, euren}.',
  },
  demonstrative: {
    title: 'dieser: “this”',
    words: ['dieser', 'welcher', 'jeder'],
    nouns: {
      m: { sg: 'Pullover', g: 'm', pl: 'Pullover', en: 'jumper' },
      f: { sg: 'Jacke', g: 'f', pl: 'Jacken', en: 'jacket' },
      n: { sg: 'Hemd', g: 'n', pl: 'Hemden', en: 'shirt' },
      pl: { sg: 'Schuhe', g: 'pl', en: 'shoes' },
    },
    frames: { nom: '… ist schön.', acc: 'Ich nehme …', dat: 'mit …', gen: 'der Preis …' },
    plFrames: { nom: '… sind schön.' },
    note: '{welcher} (“which”) and {jeder} (“every”, singular only) take the same endings as {dieser}, and they match {der, die, das} letter for letter: {dies·em}, {d·em}.',
  },
};

export interface Cell {
  article: Form | null;
  noun: Form;
  /** The phrase a tap speaks. */
  phrase: string;
  /** The article differs from the nominative in the same column. */
  changed: boolean;
}

/** Put a noun phrase into a frame; a phrase at the start of a sentence gets its capital. */
const fill = (frame: string, np: string) => {
  const s = frame.replace('…', np);
  return frame.startsWith('…') && /[.!?]$/.test(frame) ? s.charAt(0).toUpperCase() + s.slice(1) : s;
};

/** One cell of a determiner table. */
export function cell(kind: TableKind, word: string, c: Case, g: Gender): Cell {
  const k = KINDS[kind];
  const n = k.nouns[g];
  const article = determiner(word, c, g);
  const nf = nounForm(n, c, g === 'pl');
  const np = [article ? joined(article) : '', joined(nf)].filter(Boolean).join(' ');
  const frame = (g === 'pl' ? k.plFrames?.[c] : undefined) ?? k.frames[c];
  const nomArticle = determiner(word, 'nom', g);
  const changed = c !== 'nom' && !!article && !!nomArticle && joined(article) !== joined(nomArticle);
  return { article, noun: nf, phrase: fill(frame, np), changed };
}

export function table(kind: TableKind, word: string, cases: Case[] = CASES): Cell[][] {
  return cases.map((c) => GENDERS.map((g) => cell(kind, word, c, g)));
}

// --- Personal pronouns -------------------------------------------------------------------

export const PERSON_LABELS = ['ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'sie', 'Sie'];
export const PERSON_GLOSS = ['I', 'you', 'he', 'she', 'it', 'we', 'you all', 'they', 'you (formal)'];

const KOMMEN = ['komme', 'kommst', 'kommt', 'kommt', 'kommt', 'kommen', 'kommt', 'kommen', 'kommen'];
const WASCHEN = ['wasche', 'wäschst', 'wäscht', 'wäscht', 'wäscht', 'waschen', 'wascht', 'waschen', 'waschen'];
const KAUFEN = ['kaufe', 'kaufst', 'kauft', 'kauft', 'kauft', 'kaufen', 'kauft', 'kaufen', 'kaufen'];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The phrase a pronoun cell speaks: "mit mir", "Ich wasche mich." */
export function pronounPhrase(person: number, c: PronounCase): string {
  const p = pronoun(person, c);
  const subj = cap(pronoun(person, 'nom'));
  switch (c) {
    case 'nom':
      return `${subj} ${KOMMEN[person]}.`;
    case 'acc':
      return `für ${p}`;
    case 'dat':
      return `mit ${p}`;
    case 'gen':
      return `statt ${p}`;
    case 'reflAcc':
      return `${subj} ${WASCHEN[person]} ${p}.`;
    case 'reflDat':
      return `${subj} ${KAUFEN[person]} ${p} ein Eis.`;
  }
}

/** A pronoun differs from its nominative (or, for reflexives, from the ordinary pronoun). */
export function pronounChanged(person: number, c: PronounCase): boolean {
  if (c === 'nom') return false;
  if (c === 'reflAcc') return pronoun(person, c) !== pronoun(person, 'acc');
  if (c === 'reflDat') return pronoun(person, c) !== pronoun(person, 'dat');
  return pronoun(person, c) !== pronoun(person, 'nom');
}
