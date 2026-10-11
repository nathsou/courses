/**
 * The two-way prepositions in the PrepositionScene widget. Each has a sentence for position
 * (wo? → dative) and one for movement (wohin? → accusative). Braces mark the article (or
 * contraction) the widget highlights; `options` are the choices in the quiz, the first right.
 */

export type Prep = 'in' | 'an' | 'auf' | 'über' | 'unter' | 'vor' | 'hinter' | 'neben' | 'zwischen';

export interface PrepSentence {
  de: string;
  en: string;
  options: string[];
}

export interface PrepItem {
  prep: Prep;
  en: string;
  wo: PrepSentence;
  wohin: PrepSentence;
}

const ARTS = ['dem', 'den', 'der', 'die', 'das'];
const first = (right: string) => [right, ...ARTS.filter((a) => a !== right)];

export const PREPOSITIONS: PrepItem[] = [
  {
    prep: 'in',
    en: 'in, into',
    wo: { de: 'Die Katze sitzt in {der} Kiste.', en: 'The cat is sitting in the box.', options: first('der') },
    wohin: { de: 'Die Katze springt in {die} Kiste.', en: 'The cat jumps into the box.', options: first('die') },
  },
  {
    prep: 'an',
    en: 'at, on (a vertical surface)',
    wo: { de: 'Die Katze sitzt {am} Tisch.', en: 'The cat is sitting at the table.', options: ['am', 'ans', 'an den'] },
    wohin: { de: 'Die Katze setzt sich an {den} Tisch.', en: 'The cat sits down at the table.', options: first('den') },
  },
  {
    prep: 'auf',
    en: 'on (top of)',
    wo: { de: 'Die Katze sitzt auf {dem} Tisch.', en: 'The cat is sitting on the table.', options: first('dem') },
    wohin: { de: 'Die Katze springt auf {den} Tisch.', en: 'The cat jumps onto the table.', options: first('den') },
  },
  {
    prep: 'über',
    en: 'above, over',
    wo: { de: 'Die Lampe hängt über {dem} Tisch.', en: 'The lamp is hanging above the table.', options: first('dem') },
    wohin: { de: 'Lena hängt die Lampe über {den} Tisch.', en: 'Lena hangs the lamp above the table.', options: first('den') },
  },
  {
    prep: 'unter',
    en: 'under',
    wo: { de: 'Die Katze liegt unter {dem} Tisch.', en: 'The cat is lying under the table.', options: first('dem') },
    wohin: { de: 'Die Katze kriecht unter {den} Tisch.', en: 'The cat crawls under the table.', options: first('den') },
  },
  {
    prep: 'vor',
    en: 'in front of',
    wo: { de: 'Die Katze liegt vor {dem} Sofa.', en: 'The cat is lying in front of the sofa.', options: first('dem') },
    wohin: { de: 'Die Katze legt sich vor {das} Sofa.', en: 'The cat lies down in front of the sofa.', options: first('das') },
  },
  {
    prep: 'hinter',
    en: 'behind',
    wo: { de: 'Die Katze sitzt hinter {der} Kiste.', en: 'The cat is sitting behind the box.', options: first('der') },
    wohin: { de: 'Die Katze läuft hinter {die} Kiste.', en: 'The cat runs behind the box.', options: first('die') },
  },
  {
    prep: 'neben',
    en: 'next to',
    wo: { de: 'Die Katze sitzt neben {dem} Sofa.', en: 'The cat is sitting next to the sofa.', options: first('dem') },
    wohin: { de: 'Die Katze setzt sich neben {das} Sofa.', en: 'The cat sits down next to the sofa.', options: first('das') },
  },
  {
    prep: 'zwischen',
    en: 'between',
    wo: { de: 'Die Katze liegt zwischen {dem} Sofa und {dem} Tisch.', en: 'The cat is lying between the sofa and the table.', options: ['dem … dem', 'das … den', 'dem … den', 'das … dem'] },
    wohin: { de: 'Die Katze legt sich zwischen {das} Sofa und {den} Tisch.', en: 'The cat lies down between the sofa and the table.', options: ['das … den', 'dem … dem', 'das … dem', 'dem … den'] },
  },
];

/** The verb pairs: position (wo?) and putting or moving (wohin?). */
export const VERB_PAIRS = [
  { de: 'liegen – legen', en: 'lie – lay' },
  { de: 'sitzen – setzen', en: 'sit – set, seat' },
  { de: 'stehen – stellen', en: 'stand – stand (something) up' },
  { de: 'hängen – hängen', en: 'hang – hang (something) up' },
];

/** Contractions of the preposition and the article. */
export const CONTRACTIONS = [
  { de: 'in dem → im', en: 'dative' },
  { de: 'in das → ins', en: 'accusative' },
  { de: 'an dem → am', en: 'dative' },
  { de: 'an das → ans', en: 'accusative' },
];
