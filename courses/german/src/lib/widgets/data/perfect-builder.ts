/**
 * PerfectBuilder: a curated list of common verbs with their participle, auxiliary and a model
 * sentence. When the course's verb tables ($lib/de/verbs) have a verb, the widget checks
 * answers against them; this list supplies the sentences and the reasons for sein.
 */

export type SeinReason = 'movement' | 'change' | 'stay';

export interface PerfectVerb {
  verb: string;
  pp: string;
  aux: 'haben' | 'sein';
  /** Why sein: movement from A to B, a change of state, or sein/bleiben/passieren. */
  kind?: SeinReason;
  gloss: string;
  de: string;
  en: string;
  /** Extra remark, e.g. fahren with an object takes haben. */
  note?: string;
}

export const PERFECT_VERBS: PerfectVerb[] = [
  // Regular: ge- + stem + -t
  { verb: 'machen', pp: 'gemacht', aux: 'haben', gloss: 'to do, to make', de: 'Ich habe am Wochenende einen Kuchen gemacht.', en: 'I made a cake at the weekend.' },
  { verb: 'kaufen', pp: 'gekauft', aux: 'haben', gloss: 'to buy', de: 'Ich habe gestern neue Schuhe gekauft.', en: 'I bought new shoes yesterday.' },
  { verb: 'spielen', pp: 'gespielt', aux: 'haben', gloss: 'to play', de: 'Wir haben im Park Fußball gespielt.', en: 'We played football in the park.' },
  { verb: 'lernen', pp: 'gelernt', aux: 'haben', gloss: 'to learn', de: 'Ich habe zwei Jahre Deutsch gelernt.', en: 'I learnt German for two years.' },
  { verb: 'wohnen', pp: 'gewohnt', aux: 'haben', gloss: 'to live', de: 'Ich habe drei Jahre in Wien gewohnt.', en: 'I lived in Vienna for three years.' },
  { verb: 'hören', pp: 'gehört', aux: 'haben', gloss: 'to hear, to listen to', de: 'Ich habe gestern ein tolles Lied gehört.', en: 'I heard a great song yesterday.' },
  { verb: 'kochen', pp: 'gekocht', aux: 'haben', gloss: 'to cook', de: 'Mehmet hat für uns Spaghetti gekocht.', en: 'Mehmet cooked spaghetti for us.' },
  { verb: 'arbeiten', pp: 'gearbeitet', aux: 'haben', gloss: 'to work', de: 'Ich habe gestern bis acht Uhr gearbeitet.', en: 'I worked until eight yesterday.' },
  { verb: 'haben', pp: 'gehabt', aux: 'haben', gloss: 'to have', de: 'Ich habe leider keine Zeit gehabt.', en: 'Unfortunately I didn’t have time.' },
  // Strong: ge- + stem + -en, often with a vowel change
  { verb: 'essen', pp: 'gegessen', aux: 'haben', gloss: 'to eat', de: 'Wir haben im Restaurant Pizza gegessen.', en: 'We ate pizza at the restaurant.' },
  { verb: 'trinken', pp: 'getrunken', aux: 'haben', gloss: 'to drink', de: 'Ich habe heute zu viel Kaffee getrunken.', en: 'I’ve drunk too much coffee today.' },
  { verb: 'sehen', pp: 'gesehen', aux: 'haben', gloss: 'to see', de: 'Ich habe den Film schon gesehen.', en: 'I’ve already seen the film.' },
  { verb: 'lesen', pp: 'gelesen', aux: 'haben', gloss: 'to read', de: 'Ich habe das Buch in zwei Tagen gelesen.', en: 'I read the book in two days.' },
  { verb: 'schreiben', pp: 'geschrieben', aux: 'haben', gloss: 'to write', de: 'Lena hat ihrer Oma eine Karte geschrieben.', en: 'Lena wrote her grandma a card.' },
  { verb: 'schlafen', pp: 'geschlafen', aux: 'haben', gloss: 'to sleep', de: 'Ich habe heute sehr gut geschlafen.', en: 'I slept very well last night.' },
  { verb: 'sprechen', pp: 'gesprochen', aux: 'haben', gloss: 'to speak', de: 'Ich habe mit meinem Chef gesprochen.', en: 'I spoke to my boss.' },
  { verb: 'nehmen', pp: 'genommen', aux: 'haben', gloss: 'to take', de: 'Ich habe den Bus genommen.', en: 'I took the bus.' },
  { verb: 'finden', pp: 'gefunden', aux: 'haben', gloss: 'to find', de: 'Ich habe meinen Schlüssel endlich gefunden.', en: 'I’ve finally found my key.' },
  { verb: 'helfen', pp: 'geholfen', aux: 'haben', gloss: 'to help', de: 'Jonas hat mir beim Umzug geholfen.', en: 'Jonas helped me move house.' },
  { verb: 'treffen', pp: 'getroffen', aux: 'haben', gloss: 'to meet', de: 'Ich habe gestern Aylin in der Stadt getroffen.', en: 'I met Aylin in town yesterday.' },
  // Mixed: -t, but the stem changes
  { verb: 'bringen', pp: 'gebracht', aux: 'haben', gloss: 'to bring', de: 'Der Kellner hat uns die Rechnung gebracht.', en: 'The waiter brought us the bill.' },
  { verb: 'denken', pp: 'gedacht', aux: 'haben', gloss: 'to think', de: 'Ich habe oft an dich gedacht.', en: 'I often thought of you.' },
  { verb: 'kennen', pp: 'gekannt', aux: 'haben', gloss: 'to know (a person)', de: 'Ich habe ihn schon als Kind gekannt.', en: 'I knew him even as a child.' },
  { verb: 'wissen', pp: 'gewusst', aux: 'haben', gloss: 'to know (a fact)', de: 'Das habe ich nicht gewusst.', en: 'I didn’t know that.' },
  // No ge-: inseparable prefixes and -ieren
  { verb: 'besuchen', pp: 'besucht', aux: 'haben', gloss: 'to visit', de: 'Wir haben am Sonntag meine Großeltern besucht.', en: 'We visited my grandparents on Sunday.' },
  { verb: 'bezahlen', pp: 'bezahlt', aux: 'haben', gloss: 'to pay', de: 'Ich habe schon bezahlt.', en: 'I’ve already paid.' },
  { verb: 'verkaufen', pp: 'verkauft', aux: 'haben', gloss: 'to sell', de: 'Mein Bruder hat sein altes Auto verkauft.', en: 'My brother sold his old car.' },
  { verb: 'erzählen', pp: 'erzählt', aux: 'haben', gloss: 'to tell', de: 'Mia hat mir eine lustige Geschichte erzählt.', en: 'Mia told me a funny story.' },
  { verb: 'verstehen', pp: 'verstanden', aux: 'haben', gloss: 'to understand', de: 'Ich habe die Frage nicht verstanden.', en: 'I didn’t understand the question.' },
  { verb: 'vergessen', pp: 'vergessen', aux: 'haben', gloss: 'to forget', de: 'Ich habe seinen Namen vergessen.', en: 'I’ve forgotten his name.' },
  { verb: 'bekommen', pp: 'bekommen', aux: 'haben', gloss: 'to get, to receive', de: 'Ich habe einen Brief bekommen.', en: 'I got a letter.' },
  { verb: 'studieren', pp: 'studiert', aux: 'haben', gloss: 'to study (at university)', de: 'Fatma hat in Graz Medizin studiert.', en: 'Fatma studied medicine in Graz.' },
  { verb: 'telefonieren', pp: 'telefoniert', aux: 'haben', gloss: 'to talk on the phone', de: 'Ich habe eine Stunde mit meiner Schwester telefoniert.', en: 'I was on the phone to my sister for an hour.' },
  // Separable: prefix + ge + …
  { verb: 'anrufen', pp: 'angerufen', aux: 'haben', gloss: 'to phone', de: 'Ich habe dich gestern angerufen.', en: 'I phoned you yesterday.' },
  { verb: 'einkaufen', pp: 'eingekauft', aux: 'haben', gloss: 'to go shopping', de: 'Wir haben am Samstag eingekauft.', en: 'We did the shopping on Saturday.' },
  { verb: 'fernsehen', pp: 'ferngesehen', aux: 'haben', gloss: 'to watch TV', de: 'Die Kinder haben den ganzen Abend ferngesehen.', en: 'The children watched TV all evening.' },
  { verb: 'mitbringen', pp: 'mitgebracht', aux: 'haben', gloss: 'to bring along', de: 'Ben hat Blumen mitgebracht.', en: 'Ben brought flowers.' },
  // sein: movement, change of state, sein and bleiben
  {
    verb: 'fahren',
    pp: 'gefahren',
    aux: 'sein',
    kind: 'movement',
    gloss: 'to go, to drive',
    de: 'Wir sind mit dem Zug nach Berlin gefahren.',
    en: 'We went to Berlin by train.',
    note: 'With a direct object it takes haben: {Ich habe das Auto gefahren.}',
  },
  { verb: 'gehen', pp: 'gegangen', aux: 'sein', kind: 'movement', gloss: 'to go, to walk', de: 'Ich bin gestern ins Kino gegangen.', en: 'I went to the cinema yesterday.' },
  { verb: 'kommen', pp: 'gekommen', aux: 'sein', kind: 'movement', gloss: 'to come', de: 'Mein Bruder ist spät nach Hause gekommen.', en: 'My brother came home late.' },
  { verb: 'fliegen', pp: 'geflogen', aux: 'sein', kind: 'movement', gloss: 'to fly', de: 'Sophie ist nach New York geflogen.', en: 'Sophie flew to New York.' },
  { verb: 'laufen', pp: 'gelaufen', aux: 'sein', kind: 'movement', gloss: 'to run, to walk', de: 'Ich bin heute zehn Kilometer gelaufen.', en: 'I ran ten kilometres today.' },
  { verb: 'reisen', pp: 'gereist', aux: 'sein', kind: 'movement', gloss: 'to travel', de: 'Wir sind durch die Schweiz gereist.', en: 'We travelled through Switzerland.' },
  { verb: 'ankommen', pp: 'angekommen', aux: 'sein', kind: 'movement', gloss: 'to arrive', de: 'Der Zug ist pünktlich angekommen.', en: 'The train arrived on time.' },
  { verb: 'umziehen', pp: 'umgezogen', aux: 'sein', kind: 'movement', gloss: 'to move house', de: 'Elias ist letztes Jahr nach Hamburg umgezogen.', en: 'Elias moved to Hamburg last year.' },
  { verb: 'aufstehen', pp: 'aufgestanden', aux: 'sein', kind: 'change', gloss: 'to get up', de: 'Ich bin heute um sechs Uhr aufgestanden.', en: 'I got up at six today.' },
  { verb: 'einschlafen', pp: 'eingeschlafen', aux: 'sein', kind: 'change', gloss: 'to fall asleep', de: 'Ich bin vor dem Fernseher eingeschlafen.', en: 'I fell asleep in front of the TV.' },
  { verb: 'werden', pp: 'geworden', aux: 'sein', kind: 'change', gloss: 'to become', de: 'Mein Bruder ist Arzt geworden.', en: 'My brother became a doctor.' },
  { verb: 'sein', pp: 'gewesen', aux: 'sein', kind: 'stay', gloss: 'to be', de: 'Ich bin noch nie in Österreich gewesen.', en: 'I’ve never been to Austria.' },
  { verb: 'bleiben', pp: 'geblieben', aux: 'sein', kind: 'stay', gloss: 'to stay', de: 'Ich bin am Wochenende zu Hause geblieben.', en: 'I stayed at home at the weekend.' },
  { verb: 'passieren', pp: 'passiert', aux: 'sein', kind: 'stay', gloss: 'to happen', de: 'Was ist passiert?', en: 'What happened?' },
];

export const SEIN_REASONS: Record<SeinReason | 'haben', string> = {
  movement: 'it is movement from one place to another.',
  change: 'it is a change of state or position.',
  stay: '{sein}, {bleiben} and {passieren} take sein too: learn them as a group.',
  haben: 'most verbs take haben, including every verb with a direct object.',
};
