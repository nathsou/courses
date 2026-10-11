/**
 * SeparableVerbs: seven verbs, each in seven structures. The highlighting (prefix, stem, ge-/zu-)
 * is worked out from `prefix`, `base` (the forms of the verb without its prefix) and `pp`.
 */

export type Structure = 'present' | 'question' | 'imperative' | 'modal' | 'perfect' | 'subordinate' | 'zu';

export interface SepSentence {
  de: string;
  en: string;
}

export interface SepVerb {
  id: string;
  /** The infinitive. */
  verb: string;
  prefix: string;
  /** Forms of the verb without its prefix (present, imperative, infinitive). */
  base: string[];
  pp: string;
  aux: 'haben' | 'sein';
  gloss: string;
  sentences: Record<Structure, SepSentence>;
}

export const STRUCTURES: { id: Structure; label: string; rule: string }[] = [
  { id: 'present', label: 'Statement', rule: 'In a main clause the verb splits: the conjugated stem takes position 2 and the prefix goes to the very end.' },
  { id: 'question', label: 'Question', rule: 'Questions split the verb too: the stem comes first or second, the prefix is still last.' },
  { id: 'imperative', label: 'Imperative', rule: 'The imperative puts the stem first; the prefix still goes to the end.' },
  { id: 'modal', label: 'With a modal', rule: 'The modal verb takes position 2, so the separable verb is an infinitive at the end, in one piece.' },
  { id: 'perfect', label: 'Perfect', rule: 'The participle puts ge- between the prefix and the stem, in one word.' },
  { id: 'subordinate', label: 'weil, wenn, dass', rule: 'In a subordinate clause the verb goes to the end, and there it joins up again: one word.' },
  { id: 'zu', label: 'zu + infinitive', rule: 'zu goes between the prefix and the stem, all in one word.' },
];

export const SEP_VERBS: SepVerb[] = [
  {
    id: 'anrufen',
    verb: 'anrufen',
    prefix: 'an',
    base: ['rufe', 'rufst', 'ruft', 'rufen', 'ruf'],
    pp: 'angerufen',
    aux: 'haben',
    gloss: 'to phone',
    sentences: {
      present: { de: 'Ich rufe dich heute Abend an.', en: 'I’ll phone you this evening.' },
      question: { de: 'Rufst du mich morgen an?', en: 'Will you phone me tomorrow?' },
      imperative: { de: 'Ruf mich bitte morgen an!', en: 'Please phone me tomorrow!' },
      modal: { de: 'Ich muss heute noch meine Mutter anrufen.', en: 'I still have to phone my mother today.' },
      perfect: { de: 'Ich habe dich gestern angerufen.', en: 'I phoned you yesterday.' },
      subordinate: { de: 'Oma freut sich, wenn du sie anrufst.', en: 'Grandma is pleased when you phone her.' },
      zu: { de: 'Vergiss nicht, deine Oma anzurufen!', en: 'Don’t forget to phone your grandma!' },
    },
  },
  {
    id: 'aufstehen',
    verb: 'aufstehen',
    prefix: 'auf',
    base: ['stehe', 'stehst', 'steht', 'stehen', 'steh'],
    pp: 'aufgestanden',
    aux: 'sein',
    gloss: 'to get up',
    sentences: {
      present: { de: 'Ich stehe jeden Morgen um sechs Uhr auf.', en: 'I get up at six every morning.' },
      question: { de: 'Wann stehst du am Wochenende auf?', en: 'When do you get up at the weekend?' },
      imperative: { de: 'Steh bitte auf, es ist schon acht!', en: 'Please get up, it’s already eight!' },
      modal: { de: 'Morgen muss ich früh aufstehen.', en: 'Tomorrow I have to get up early.' },
      perfect: { de: 'Heute bin ich erst um zehn aufgestanden.', en: 'Today I didn’t get up until ten.' },
      subordinate: { de: 'Ich bin müde, weil ich so früh aufstehe.', en: 'I’m tired because I get up so early.' },
      zu: { de: 'Es ist schwer, im Winter früh aufzustehen.', en: 'It’s hard to get up early in winter.' },
    },
  },
  {
    id: 'einkaufen',
    verb: 'einkaufen',
    prefix: 'ein',
    base: ['kaufe', 'kaufst', 'kauft', 'kaufen', 'kauf'],
    pp: 'eingekauft',
    aux: 'haben',
    gloss: 'to go shopping',
    sentences: {
      present: { de: 'Wir kaufen samstags im Supermarkt ein.', en: 'We do our shopping at the supermarket on Saturdays.' },
      question: { de: 'Kaufst du heute ein?', en: 'Are you doing the shopping today?' },
      imperative: { de: 'Kauf bitte nach der Arbeit ein!', en: 'Please do the shopping after work!' },
      modal: { de: 'Ich kann heute leider nicht einkaufen.', en: 'Unfortunately I can’t go shopping today.' },
      perfect: { de: 'Ich habe gestern auf dem Markt eingekauft.', en: 'I did my shopping at the market yesterday.' },
      subordinate: { de: 'Ich nehme immer das Auto, wenn ich einkaufe.', en: 'I always take the car when I go shopping.' },
      zu: { de: 'Ich habe keine Lust, heute noch einzukaufen.', en: 'I don’t feel like going shopping today.' },
    },
  },
  {
    id: 'fernsehen',
    verb: 'fernsehen',
    prefix: 'fern',
    base: ['sehe', 'siehst', 'sieht', 'sehen', 'seht', 'sieh'],
    pp: 'ferngesehen',
    aux: 'haben',
    gloss: 'to watch TV',
    sentences: {
      present: { de: 'Am Abend sehe ich oft fern.', en: 'In the evening I often watch TV.' },
      question: { de: 'Siehst du gern fern?', en: 'Do you like watching TV?' },
      imperative: { de: 'Sieh nicht so viel fern!', en: 'Don’t watch so much TV!' },
      modal: { de: 'Die Kinder dürfen heute eine Stunde fernsehen.', en: 'The children may watch TV for an hour today.' },
      perfect: { de: 'Gestern haben wir den ganzen Abend ferngesehen.', en: 'Yesterday we watched TV all evening.' },
      subordinate: { de: 'Lena isst nie, wenn sie fernsieht.', en: 'Lena never eats while she’s watching TV.' },
      zu: { de: 'Es ist nicht gesund, den ganzen Tag fernzusehen.', en: 'It isn’t healthy to watch TV all day.' },
    },
  },
  {
    id: 'mitkommen',
    verb: 'mitkommen',
    prefix: 'mit',
    base: ['komme', 'kommst', 'kommt', 'kommen', 'komm'],
    pp: 'mitgekommen',
    aux: 'sein',
    gloss: 'to come along',
    sentences: {
      present: { de: 'Ich komme gern mit.', en: 'I’d love to come along.' },
      question: { de: 'Kommst du heute Abend mit?', en: 'Are you coming along this evening?' },
      imperative: { de: 'Komm doch mit!', en: 'Do come along!' },
      modal: { de: 'Mein Bruder will auch mitkommen.', en: 'My brother wants to come along too.' },
      perfect: { de: 'Leider ist Jonas nicht mitgekommen.', en: 'Unfortunately Jonas didn’t come along.' },
      subordinate: { de: 'Ich freue mich, dass du mitkommst.', en: 'I’m glad that you’re coming along.' },
      zu: { de: 'Hast du Lust, heute Abend mitzukommen?', en: 'Do you feel like coming along this evening?' },
    },
  },
  {
    id: 'ankommen',
    verb: 'ankommen',
    prefix: 'an',
    base: ['komme', 'kommst', 'kommt', 'kommen', 'komm'],
    pp: 'angekommen',
    aux: 'sein',
    gloss: 'to arrive',
    sentences: {
      present: { de: 'Der Zug kommt um 18 Uhr in Wien an.', en: 'The train arrives in Vienna at 6 p.m.' },
      question: { de: 'Wann kommst du in Berlin an?', en: 'When do you arrive in Berlin?' },
      imperative: { de: 'Komm gut an!', en: 'Have a safe journey! (literally: arrive well)' },
      modal: { de: 'Wir wollen vor Mitternacht ankommen.', en: 'We want to arrive before midnight.' },
      perfect: { de: 'Wir sind gestern Abend in Zürich angekommen.', en: 'We arrived in Zürich yesterday evening.' },
      subordinate: { de: 'Schreib mir, wenn du ankommst!', en: 'Text me when you arrive!' },
      zu: { de: 'Es ist schön, endlich zu Hause anzukommen.', en: 'It’s nice to arrive home at last.' },
    },
  },
  {
    id: 'zurueckkommen',
    verb: 'zurückkommen',
    prefix: 'zurück',
    base: ['komme', 'kommst', 'kommt', 'kommen', 'komm'],
    pp: 'zurückgekommen',
    aux: 'sein',
    gloss: 'to come back',
    sentences: {
      present: { de: 'Ich komme in einer Stunde zurück.', en: 'I’ll be back in an hour.' },
      question: { de: 'Wann kommst du zurück?', en: 'When are you coming back?' },
      imperative: { de: 'Komm bald zurück!', en: 'Come back soon!' },
      modal: { de: 'Sie möchte nächstes Jahr nach Graz zurückkommen.', en: 'She would like to come back to Graz next year.' },
      perfect: { de: 'Meine Eltern sind gestern aus dem Urlaub zurückgekommen.', en: 'My parents came back from holiday yesterday.' },
      subordinate: { de: 'Wir essen, wenn Papa zurückkommt.', en: 'We’ll eat when Dad comes back.' },
      zu: { de: 'Er hat versprochen, pünktlich zurückzukommen.', en: 'He promised to come back on time.' },
    },
  },
];
