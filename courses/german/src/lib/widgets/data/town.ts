/**
 * The places in the TownMap widget, with the forms the directions need: nominative (`de`),
 * dative after neben/gegenüber (`dat`), and the way there with zu (`zu`: zur Post, zum Kino).
 */

export interface Place {
  id: string;
  de: string;
  dat: string;
  zu: string;
  en: string;
}

export const PLACES: Place[] = [
  { id: 'bahnhof', de: 'der Bahnhof', dat: 'dem Bahnhof', zu: 'zum Bahnhof', en: 'station' },
  { id: 'bank', de: 'die Bank', dat: 'der Bank', zu: 'zur Bank', en: 'bank' },
  { id: 'apotheke', de: 'die Apotheke', dat: 'der Apotheke', zu: 'zur Apotheke', en: 'chemist’s' },
  { id: 'post', de: 'die Post', dat: 'der Post', zu: 'zur Post', en: 'post office' },
  { id: 'supermarkt', de: 'der Supermarkt', dat: 'dem Supermarkt', zu: 'zum Supermarkt', en: 'supermarket' },
  { id: 'kino', de: 'das Kino', dat: 'dem Kino', zu: 'zum Kino', en: 'cinema' },
  { id: 'museum', de: 'das Museum', dat: 'dem Museum', zu: 'zum Museum', en: 'museum' },
  { id: 'park', de: 'der Park', dat: 'dem Park', zu: 'zum Park', en: 'park' },
  { id: 'cafe', de: 'das Café', dat: 'dem Café', zu: 'zum Café', en: 'café' },
  { id: 'rathaus', de: 'das Rathaus', dat: 'dem Rathaus', zu: 'zum Rathaus', en: 'town hall' },
  { id: 'schule', de: 'die Schule', dat: 'der Schule', zu: 'zur Schule', en: 'school' },
  { id: 'hotel', de: 'das Hotel', dat: 'dem Hotel', zu: 'zum Hotel', en: 'hotel' },
];

/** The fixed phrases the widget says. */
export const TOWN_PHRASES = {
  ask: { de: 'Entschuldigung, wie komme ich', en: 'Excuse me, how do I get' },
  here: { de: 'Sie sind hier.', en: 'You are here.' },
  moves: [
    { de: 'geradeaus', en: 'straight on' },
    { de: 'links', en: 'left' },
    { de: 'rechts', en: 'right' },
  ],
};
