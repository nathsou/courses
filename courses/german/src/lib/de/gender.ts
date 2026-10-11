/**
 * The rules of thumb that predict a noun's gender from its ending. None is perfect; each has a
 * rough reliability so the course can say "always" or "usually" honestly.
 */
import type { Gender } from './notation';

export interface GenderRule {
  ending: string;
  gender: Exclude<Gender, 'pl'>;
  /** How often it holds: "always" (no common exceptions) or "usually". */
  strength: 'always' | 'usually';
  examples: string[];
  exceptions?: string[];
  note?: string;
}

export const GENDER_RULES: GenderRule[] = [
  { ending: '-ung', gender: 'f', strength: 'always', examples: ['Zeitung', 'Wohnung', 'Übung'] },
  { ending: '-heit', gender: 'f', strength: 'always', examples: ['Freiheit', 'Gesundheit'] },
  { ending: '-keit', gender: 'f', strength: 'always', examples: ['Möglichkeit', 'Süßigkeit'] },
  { ending: '-schaft', gender: 'f', strength: 'always', examples: ['Freundschaft', 'Mannschaft'] },
  { ending: '-ion', gender: 'f', strength: 'always', examples: ['Information', 'Nation', 'Religion'] },
  { ending: '-tät', gender: 'f', strength: 'always', examples: ['Universität', 'Qualität'] },
  { ending: '-ei', gender: 'f', strength: 'usually', examples: ['Bäckerei', 'Polizei'], exceptions: ['das Ei', 'der Papagei'] },
  { ending: '-ie', gender: 'f', strength: 'usually', examples: ['Familie', 'Biologie'], exceptions: ['das Knie'] },
  { ending: '-ik', gender: 'f', strength: 'usually', examples: ['Musik', 'Politik'], exceptions: ['der Atlantik'] },
  { ending: '-ur', gender: 'f', strength: 'usually', examples: ['Natur', 'Kultur'], exceptions: ['das Abitur'] },
  { ending: '-enz', gender: 'f', strength: 'always', examples: ['Konferenz', 'Konkurrenz'] },
  { ending: '-anz', gender: 'f', strength: 'usually', examples: ['Distanz', 'Toleranz'], exceptions: ['der Tanz', 'der Kranz'] },
  { ending: '-in', gender: 'f', strength: 'usually', examples: ['Lehrerin', 'Ärztin'], note: 'for women and female animals', exceptions: ['der Termin', 'das Benzin'] },
  { ending: '-e', gender: 'f', strength: 'usually', examples: ['Lampe', 'Straße', 'Katze'], exceptions: ['der Junge', 'der Name', 'das Ende', 'der Käse', 'das Auge'], note: 'about nine nouns in ten' },
  { ending: '-chen', gender: 'n', strength: 'always', examples: ['Mädchen', 'Brötchen'], note: 'diminutives are always neuter, whatever they describe' },
  { ending: '-lein', gender: 'n', strength: 'always', examples: ['Fräulein', 'Büchlein'] },
  { ending: '-ment', gender: 'n', strength: 'usually', examples: ['Instrument', 'Dokument'], exceptions: ['der Moment', 'der Zement'] },
  { ending: '-um', gender: 'n', strength: 'usually', examples: ['Zentrum', 'Museum', 'Datum'], exceptions: ['der Irrtum', 'der Konsum'] },
  { ending: '-tum', gender: 'n', strength: 'usually', examples: ['Eigentum', 'Wachstum'], exceptions: ['der Reichtum', 'der Irrtum'] },
  { ending: '-ma', gender: 'n', strength: 'usually', examples: ['Thema', 'Klima', 'Drama'], exceptions: ['die Firma', 'die Oma'] },
  { ending: '-o', gender: 'n', strength: 'usually', examples: ['Auto', 'Büro', 'Kino'], exceptions: ['der Euro'] },
  { ending: 'Ge-', gender: 'n', strength: 'usually', examples: ['Gebäude', 'Geschenk', 'Gemüse'], exceptions: ['die Geschichte', 'der Geburtstag', 'der Gedanke'] },
  { ending: '-ling', gender: 'm', strength: 'always', examples: ['Frühling', 'Schmetterling'] },
  { ending: '-ismus', gender: 'm', strength: 'always', examples: ['Tourismus', 'Optimismus'] },
  { ending: '-ist', gender: 'm', strength: 'always', examples: ['Polizist', 'Tourist'] },
  { ending: '-or', gender: 'm', strength: 'usually', examples: ['Motor', 'Doktor', 'Professor'], exceptions: ['das Labor', 'das Tor'] },
  { ending: '-ig', gender: 'm', strength: 'always', examples: ['Honig', 'König', 'Essig'] },
  { ending: '-ich', gender: 'm', strength: 'usually', examples: ['Teppich', 'Rettich'], exceptions: ['das Reich'] },
  { ending: '-ant', gender: 'm', strength: 'usually', examples: ['Elefant', 'Praktikant'], exceptions: ['das Restaurant'] },
  { ending: '-er', gender: 'm', strength: 'usually', examples: ['Lehrer', 'Computer', 'Fahrer'], note: 'for people who do things and for tools; many exceptions', exceptions: ['die Mutter', 'das Zimmer', 'das Fenster', 'die Butter'] },
];

/** The first rule whose ending fits the noun (longest endings are listed first within a gender). */
export function ruleFor(noun: string): GenderRule | undefined {
  const sorted = [...GENDER_RULES].sort((a, b) => b.ending.length - a.ending.length);
  return sorted.find((r) => (r.ending.endsWith('-') ? noun.startsWith(r.ending.slice(0, -1)) : noun.endsWith(r.ending.slice(1))));
}
