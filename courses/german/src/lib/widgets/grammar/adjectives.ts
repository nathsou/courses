/**
 * AdjectiveEndings logic: a phrase from an article type, gender, case and adjective + noun
 * pair, split into parts for highlighting, with its English and the reason for the ending.
 */
import { adjectiveEnding, adjectiveReason, adjectiveStem, determiner, joined, nounForm, CASES, type Case, type Form, type Gender } from '$lib/de/declension';
import { rng } from '$lib/exercises/shuffle';
import { ADJ_COUNT, ADJ_MASS, type AdjPair } from '../data/adjective-endings';

export type AdjArticle = 'der' | 'ein' | 'none';
export const ARTICLE_WORDS: Record<Exclude<AdjArticle, 'none'>, string[]> = { der: ['der', 'dieser'], ein: ['ein', 'kein', 'mein'] };

export interface Choice {
  type: AdjArticle;
  /** The determiner (der, dieser, ein, kein, mein); ignored for "none". */
  word: string;
  g: Gender;
  c: Case;
  /** Index into the pairs for this gender. */
  pair: number;
}

export interface Phrase {
  /** Text before and after the noun phrase ("mit …", "Das ist ….") */
  before: string;
  after: string;
  article: Form | null;
  adj: Form;
  noun: Form;
  /** The determiner actually used (ein has no plural: kein is used instead). */
  word: string | null;
  text: string;
  en: string;
  reason: string;
  /** The base adjective (for drills). */
  base: string;
}

/** The pairs available for a gender and article type. */
export function pairsFor(type: AdjArticle, g: Gender): AdjPair[] {
  if (g === 'pl') return [...ADJ_COUNT.m, ...ADJ_COUNT.f, ...ADJ_COUNT.n];
  return type === 'none' ? ADJ_MASS[g] : ADJ_COUNT[g];
}

const FRAMES: Record<Case, [string, string]> = { nom: ['Das ist', '.'], acc: ['Ich suche', '.'], dat: ['mit', ''], gen: ['wegen', ''] };
const EN_FRAMES: Record<Case, string> = { nom: 'This is …', acc: 'I’m looking for …', dat: 'with …', gen: 'because of …' };
const EN_ARTICLE: Record<string, [string, string]> = {
  der: ['the', 'the'],
  dieser: ['this', 'these'],
  ein: ['a', ''],
  kein: ['no', 'no'],
  mein: ['my', 'my'],
};

export function phrase(ch: Choice): Phrase {
  const { g, c } = ch;
  const pairs = pairsFor(ch.type, g);
  const p = pairs[((ch.pair % pairs.length) + pairs.length) % pairs.length]!;
  let word: string | null = ch.type === 'none' ? null : ch.word;
  if (word === 'ein' && g === 'pl') word = 'kein';
  const article = word ? determiner(word, c, g) : null;
  const ending = adjectiveEnding(ch.type, c, g);
  const stem = adjectiveStem(p.adj);
  const noun = nounForm({ sg: g === 'pl' ? p.pl! : p.sg, g, pl: p.pl }, c, g === 'pl');
  let [before, after] = FRAMES[c];
  if (c === 'nom' && g === 'pl') before = 'Das sind';
  if (c === 'acc' && ch.type === 'none') before = 'Ich möchte';
  const np = [article ? joined(article) : '', stem + ending, joined(noun)].filter(Boolean).join(' ');
  const text = `${before} ${np}${after}`;
  // English
  let enFrame = EN_FRAMES[c];
  if (c === 'nom' && g === 'pl') enFrame = 'These are …';
  if (c === 'acc' && ch.type === 'none') enFrame = 'I’d like …';
  const enNoun = g === 'pl' ? p.enPl! : p.en;
  let enArt = word ? EN_ARTICLE[word]![g === 'pl' ? 1 : 0] : '';
  if (enArt === 'a' && /^[aeiou]/.test(enNoun)) enArt = 'an';
  const en = enFrame.replace('…', [enArt, enNoun].filter(Boolean).join(' ')) + (enFrame.startsWith('with') || enFrame.startsWith('because') ? '' : '.');
  const reason = adjectiveReason(ch.type, c, g, article ? joined(article) : undefined);
  return { before, after, article, adj: { stem, ending }, noun, word, text, en: en.charAt(0).toUpperCase() + en.slice(1), reason, base: p.adj };
}

/** A random drill item. */
export function randomChoice(seed: number): Choice {
  const r = rng(seed);
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)]!;
  const type = pick(['der', 'ein', 'none'] as const);
  const g = pick(['m', 'f', 'n', 'pl'] as const);
  const c = pick(CASES);
  const word = type === 'none' ? '' : pick(ARTICLE_WORDS[type]);
  return { type, word, g, c, pair: Math.floor(r() * 12) };
}

/** Accepted answers for a drill: the whole adjective, or just its ending when the stem is unchanged. */
export function accepted(p: Phrase): string[] {
  const full = p.adj.stem + p.adj.ending;
  return p.adj.stem === p.base ? [full, p.adj.ending, `-${p.adj.ending}`] : [full];
}
