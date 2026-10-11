/**
 * Compound nouns: parts to combine, the compounds they make (with any linking element), the
 * long Danube-steamship compound built up step by step, and a gender quiz.
 */

export type CGender = 'm' | 'f' | 'n' | 'pl' | 'v';

export interface CPart {
  /** The form used inside the compound. */
  id: string;
  /** Where it comes from: a noun with its article, or a verb. */
  de: string;
  kind: CGender;
  en: string;
}

/** First parts (any word) and last parts (always nouns). */
export const C_FIRST: CPart[] = [
  { id: 'Haus', de: 'das Haus', kind: 'n', en: 'house' },
  { id: 'Kind', de: 'das Kind', kind: 'n', en: 'child' },
  { id: 'Arbeit', de: 'die Arbeit', kind: 'f', en: 'work' },
  { id: 'Geburt', de: 'die Geburt', kind: 'f', en: 'birth' },
  { id: 'Hand', de: 'die Hand', kind: 'f', en: 'hand' },
  { id: 'Kühl', de: 'kühlen', kind: 'v', en: 'to cool' },
  { id: 'Bahn', de: 'die Bahn', kind: 'f', en: 'railway' },
  { id: 'Fahr', de: 'fahren', kind: 'v', en: 'to ride, to drive' },
  { id: 'Leben', de: 'das Leben', kind: 'n', en: 'life' },
  { id: 'Garten', de: 'der Garten', kind: 'm', en: 'garden' },
  { id: 'Straße', de: 'die Straße', kind: 'f', en: 'street' },
  { id: 'Tasche', de: 'die Tasche', kind: 'f', en: 'pocket, bag' },
];

export const C_LAST: CPart[] = [
  { id: 'Tür', de: 'die Tür', kind: 'f', en: 'door' },
  { id: 'Garten', de: 'der Garten', kind: 'm', en: 'garden' },
  { id: 'Platz', de: 'der Platz', kind: 'm', en: 'place, square' },
  { id: 'Tag', de: 'der Tag', kind: 'm', en: 'day' },
  { id: 'Schuh', de: 'der Schuh', kind: 'm', en: 'shoe' },
  { id: 'Schrank', de: 'der Schrank', kind: 'm', en: 'cupboard' },
  { id: 'Hof', de: 'der Hof', kind: 'm', en: 'yard, court' },
  { id: 'Rad', de: 'das Rad', kind: 'n', en: 'wheel' },
  { id: 'Mittel', de: 'das Mittel', kind: 'n', en: 'means' },
  { id: 'Haus', de: 'das Haus', kind: 'n', en: 'house' },
  { id: 'Arbeit', de: 'die Arbeit', kind: 'f', en: 'work' },
  { id: 'Bahn', de: 'die Bahn', kind: 'f', en: 'track, railway' },
  { id: 'Lampe', de: 'die Lampe', kind: 'f', en: 'lamp' },
];

export interface Compound {
  first: string;
  /** Linking element between the parts ('' for none). */
  link: string;
  last: string;
  /** The compound with its article. */
  de: string;
  en: string;
  note?: string;
}

export const COMPOUNDS: Compound[] = [
  { first: 'Haus', link: '', last: 'Tür', de: 'die Haustür', en: 'front door' },
  { first: 'Haus', link: '', last: 'Schuh', de: 'der Hausschuh', en: 'slipper' },
  { first: 'Haus', link: '', last: 'Arbeit', de: 'die Hausarbeit', en: 'housework (also: a term paper)' },
  { first: 'Kind', link: 'er', last: 'Garten', de: 'der Kindergarten', en: 'nursery school, kindergarten', note: 'The first part appears in its plural form, {Kinder}: a garden for children.' },
  { first: 'Kind', link: 'er', last: 'Schuh', de: 'der Kinderschuh', en: 'child’s shoe', note: '{noch in den Kinderschuhen stecken}: to be still in its infancy.' },
  { first: 'Kind', link: 'er', last: 'Arbeit', de: 'die Kinderarbeit', en: 'child labour' },
  { first: 'Arbeit', link: 's', last: 'Platz', de: 'der Arbeitsplatz', en: 'workplace; job' },
  { first: 'Arbeit', link: 's', last: 'Tag', de: 'der Arbeitstag', en: 'working day' },
  { first: 'Geburt', link: 's', last: 'Tag', de: 'der Geburtstag', en: 'birthday', note: 'Words in {-t} like {Geburt} and {Arbeit} usually take the linking {-s-}.' },
  { first: 'Geburt', link: 's', last: 'Haus', de: 'das Geburtshaus', en: 'house where someone was born' },
  { first: 'Hand', link: '', last: 'Schuh', de: 'der Handschuh', en: 'glove', note: 'Literally a “hand shoe”.' },
  { first: 'Hand', link: '', last: 'Arbeit', de: 'die Handarbeit', en: 'handicraft; made by hand' },
  { first: 'Kühl', link: '', last: 'Schrank', de: 'der Kühlschrank', en: 'fridge', note: 'A verb stem as the first part: {kühlen} → {Kühl-}.' },
  { first: 'Bahn', link: '', last: 'Hof', de: 'der Bahnhof', en: 'railway station' },
  { first: 'Fahr', link: '', last: 'Rad', de: 'das Fahrrad', en: 'bicycle', note: 'A verb stem as the first part: {fahren} → {Fahr-}.' },
  { first: 'Fahr', link: '', last: 'Bahn', de: 'die Fahrbahn', en: 'carriageway, road surface' },
  { first: 'Leben', link: 's', last: 'Mittel', de: 'das Lebensmittel', en: 'food (usually plural: groceries)', note: 'Mostly used in the plural: {die Lebensmittel}.' },
  { first: 'Garten', link: '', last: 'Tür', de: 'die Gartentür', en: 'garden gate' },
  { first: 'Garten', link: '', last: 'Haus', de: 'das Gartenhaus', en: 'summer house, garden shed' },
  { first: 'Garten', link: '', last: 'Arbeit', de: 'die Gartenarbeit', en: 'gardening' },
  { first: 'Straße', link: 'n', last: 'Bahn', de: 'die Straßenbahn', en: 'tram' },
  { first: 'Straße', link: 'n', last: 'Lampe', de: 'die Straßenlampe', en: 'street lamp' },
  { first: 'Tasche', link: 'n', last: 'Lampe', de: 'die Taschenlampe', en: 'torch, flashlight', note: 'Literally a “pocket lamp”. Feminine nouns in {-e} usually link with {-n-}.' },
];

export interface LongStep {
  /** The new part with its article (or the linking s). */
  add: string;
  /** The compound so far, with its article; `{…}` marks the part just added. */
  de: string;
  en: string;
}

/** Donaudampfschifffahrtsgesellschaftskapitän, built from the head outwards. */
export const LONG_STEPS: LongStep[] = [
  { add: 'die Fahrt', de: 'die {Fahrt}', en: 'journey, trip' },
  { add: 'das Schiff', de: 'die {Schiff}fahrt', en: 'shipping, navigation' },
  { add: 'der Dampf', de: 'die {Dampf}schifffahrt', en: 'steam navigation' },
  { add: 'die Donau', de: 'die {Donau}dampfschifffahrt', en: 'Danube steam navigation' },
  { add: 'die Gesellschaft', de: 'die Donaudampfschifffahrts{gesellschaft}', en: 'Danube Steam Navigation Company' },
  { add: 'der Kapitän', de: 'der Donaudampfschifffahrtsgesellschafts{kapitän}', en: 'captain of the Danube Steam Navigation Company' },
];

export interface CQuizItem {
  /** The compound without its article. */
  word: string;
  /** With its article. */
  de: string;
  /** Its parts, linking elements as separate items. */
  parts: string[];
  /** The last part with its article: it decides. */
  head: string;
  answer: 'der' | 'die' | 'das';
  en: string;
  note?: string;
}

export const C_QUIZ: CQuizItem[] = [
  { word: 'Schreibtisch', de: 'der Schreibtisch', parts: ['Schreib', 'tisch'], head: 'der Tisch', answer: 'der', en: 'desk' },
  { word: 'Handtasche', de: 'die Handtasche', parts: ['Hand', 'tasche'], head: 'die Tasche', answer: 'die', en: 'handbag' },
  { word: 'Hausaufgabe', de: 'die Hausaufgabe', parts: ['Haus', 'aufgabe'], head: 'die Aufgabe', answer: 'die', en: 'homework' },
  { word: 'Zahnbürste', de: 'die Zahnbürste', parts: ['Zahn', 'bürste'], head: 'die Bürste', answer: 'die', en: 'toothbrush' },
  { word: 'Weihnachtsbaum', de: 'der Weihnachtsbaum', parts: ['Weihnacht', 's', 'baum'], head: 'der Baum', answer: 'der', en: 'Christmas tree' },
  { word: 'Kinderzimmer', de: 'das Kinderzimmer', parts: ['Kind', 'er', 'zimmer'], head: 'das Zimmer', answer: 'das', en: 'children’s room' },
  { word: 'Sonnenbrille', de: 'die Sonnenbrille', parts: ['Sonne', 'n', 'brille'], head: 'die Brille', answer: 'die', en: 'sunglasses' },
  { word: 'Wörterbuch', de: 'das Wörterbuch', parts: ['Wörter', 'buch'], head: 'das Buch', answer: 'das', en: 'dictionary', note: 'The first part is a plural: {Wörter}.' },
  { word: 'Fußball', de: 'der Fußball', parts: ['Fuß', 'ball'], head: 'der Ball', answer: 'der', en: 'football' },
  { word: 'Bushaltestelle', de: 'die Bushaltestelle', parts: ['Bus', 'haltestelle'], head: 'die Haltestelle', answer: 'die', en: 'bus stop', note: '{Haltestelle} is itself a compound: {halten} + {die Stelle}.' },
  { word: 'Krankenhaus', de: 'das Krankenhaus', parts: ['Kranken', 'haus'], head: 'das Haus', answer: 'das', en: 'hospital', note: 'A house for {die Kranken}, the sick.' },
  { word: 'Tageszeitung', de: 'die Tageszeitung', parts: ['Tag', 'es', 'zeitung'], head: 'die Zeitung', answer: 'die', en: 'daily newspaper' },
  { word: 'Apfelsaft', de: 'der Apfelsaft', parts: ['Apfel', 'saft'], head: 'der Saft', answer: 'der', en: 'apple juice' },
  { word: 'Stadtplan', de: 'der Stadtplan', parts: ['Stadt', 'plan'], head: 'der Plan', answer: 'der', en: 'street map' },
  { word: 'Fahrkarte', de: 'die Fahrkarte', parts: ['Fahr', 'karte'], head: 'die Karte', answer: 'die', en: 'ticket' },
  { word: 'Badezimmer', de: 'das Badezimmer', parts: ['Bade', 'zimmer'], head: 'das Zimmer', answer: 'das', en: 'bathroom' },
];

export const LONG_NOTE = {
  note: 'Watch the article: it was {die} at every step until {der Kapitän} took the last place. The linking -s- after {Schifffahrt} works as in {Geburtstag}, and after {-schaft} as in {Gesellschaftsspiel}. The triple fff has been the correct spelling since the 1996 reform (before it: {Schiffahrt}).',
};
