/**
 * AdjectiveEndings: adjective + noun pairs by gender. Count nouns go with articles; mass nouns
 * (no article in the singular) show the strong endings. Phrases are built by
 * $lib/de/declension.
 */

export interface AdjPair {
  adj: string;
  sg: string;
  pl?: string;
  /** English adjective + noun, singular and plural. */
  en: string;
  enPl?: string;
}

/** Count nouns, for der-words and ein-words (and their plurals, for every article type). */
export const ADJ_COUNT: Record<'m' | 'f' | 'n', AdjPair[]> = {
  m: [
    { adj: 'alt', sg: 'Freund', pl: 'Freunde', en: 'old friend', enPl: 'old friends' },
    { adj: 'neu', sg: 'Tisch', pl: 'Tische', en: 'new table', enPl: 'new tables' },
    { adj: 'warm', sg: 'Mantel', pl: 'Mäntel', en: 'warm coat', enPl: 'warm coats' },
    { adj: 'klein', sg: 'Hund', pl: 'Hunde', en: 'small dog', enPl: 'small dogs' },
  ],
  f: [
    { adj: 'schön', sg: 'Stadt', pl: 'Städte', en: 'beautiful town', enPl: 'beautiful towns' },
    { adj: 'neu', sg: 'Lampe', pl: 'Lampen', en: 'new lamp', enPl: 'new lamps' },
    { adj: 'gut', sg: 'Freundin', pl: 'Freundinnen', en: 'good friend', enPl: 'good friends' },
    { adj: 'teuer', sg: 'Jacke', pl: 'Jacken', en: 'expensive jacket', enPl: 'expensive jackets' },
  ],
  n: [
    { adj: 'neu', sg: 'Auto', pl: 'Autos', en: 'new car', enPl: 'new cars' },
    { adj: 'alt', sg: 'Haus', pl: 'Häuser', en: 'old house', enPl: 'old houses' },
    { adj: 'gut', sg: 'Buch', pl: 'Bücher', en: 'good book', enPl: 'good books' },
    { adj: 'dunkel', sg: 'Zimmer', pl: 'Zimmer', en: 'dark room', enPl: 'dark rooms' },
  ],
};

/** Mass nouns, for the singular with no article ("kalter Kaffee"). */
export const ADJ_MASS: Record<'m' | 'f' | 'n', AdjPair[]> = {
  m: [
    { adj: 'kalt', sg: 'Kaffee', en: 'cold coffee' },
    { adj: 'rot', sg: 'Wein', en: 'red wine' },
  ],
  f: [
    { adj: 'frisch', sg: 'Milch', en: 'fresh milk' },
    { adj: 'laut', sg: 'Musik', en: 'loud music' },
  ],
  n: [
    { adj: 'kalt', sg: 'Wasser', en: 'cold water' },
    { adj: 'frisch', sg: 'Brot', en: 'fresh bread' },
  ],
};
