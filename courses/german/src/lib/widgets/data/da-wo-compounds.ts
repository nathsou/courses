/**
 * Verbs with a fixed preposition, and the da-/wo-compounds that stand in for "it" and "what".
 * In each sentence `{…}` marks the prepositional phrase, compound or question word.
 */

export interface DaWoLine {
  /** A statement with the full prepositional phrase. */
  stmt: string;
  /** The question asking for it. */
  ask: string;
  /** The statement again with the phrase replaced. */
  reply: string;
}

export interface DaWoNone {
  none: true;
  note: string;
}

export interface DaWoVerb {
  id: string;
  /** Verb + preposition, as in a word list. */
  de: string;
  prep: string;
  /** Case after the preposition. */
  kind: 'acc' | 'dat';
  en: string;
  da: string;
  wo: string;
  thing: DaWoLine;
  person: DaWoLine | DaWoNone;
  /** da-compound pointing ahead to a clause. */
  clause: { de: string; en: string } | DaWoNone;
}

export const DAWO_VERBS: DaWoVerb[] = [
  {
    id: 'warten',
    de: 'warten auf',
    prep: 'auf',
    kind: 'acc',
    en: 'to wait for',
    da: 'darauf',
    wo: 'worauf',
    thing: { stmt: 'Ich warte {auf den Bus}.', ask: '{Worauf} wartest du?', reply: 'Ich warte {darauf}.' },
    person: { stmt: 'Ich warte {auf meine Schwester}.', ask: '{Auf wen} wartest du?', reply: 'Ich warte {auf sie}.' },
    clause: { de: 'Ich warte {darauf}, dass der Regen aufhört.', en: 'I’m waiting for the rain to stop.' },
  },
  {
    id: 'denken',
    de: 'denken an',
    prep: 'an',
    kind: 'acc',
    en: 'to think of, to think about',
    da: 'daran',
    wo: 'woran',
    thing: { stmt: 'Ich denke oft {an den Urlaub}.', ask: '{Woran} denkst du?', reply: 'Ich denke oft {daran}.' },
    person: { stmt: 'Ich denke oft {an meinen Opa}.', ask: '{An wen} denkst du?', reply: 'Ich denke oft {an ihn}.' },
    clause: { de: 'Denk {daran}, die Tür abzuschließen!', en: 'Remember to lock the door!' },
  },
  {
    id: 'freuen-auf',
    de: 'sich freuen auf',
    prep: 'auf',
    kind: 'acc',
    en: 'to look forward to',
    da: 'darauf',
    wo: 'worauf',
    thing: { stmt: 'Ich freue mich {auf das Wochenende}.', ask: '{Worauf} freust du dich?', reply: 'Ich freue mich {darauf}.' },
    person: { stmt: 'Ich freue mich {auf meine Freunde}.', ask: '{Auf wen} freust du dich?', reply: 'Ich freue mich {auf sie}.' },
    clause: { de: 'Ich freue mich {darauf}, dich wiederzusehen.', en: 'I’m looking forward to seeing you again.' },
  },
  {
    id: 'freuen-ueber',
    de: 'sich freuen über',
    prep: 'über',
    kind: 'acc',
    en: 'to be pleased about',
    da: 'darüber',
    wo: 'worüber',
    thing: { stmt: 'Ich freue mich {über das Geschenk}.', ask: '{Worüber} freust du dich?', reply: 'Ich freue mich {darüber}.' },
    person: { none: true, note: 'You are pleased about things and events. For people, German says {sich für jemanden freuen}: {Ich freue mich für dich.} (I’m happy for you.)' },
    clause: { de: 'Ich freue mich {darüber}, dass du gekommen bist.', en: 'I’m glad that you came.' },
  },
  {
    id: 'interessieren',
    de: 'sich interessieren für',
    prep: 'für',
    kind: 'acc',
    en: 'to be interested in',
    da: 'dafür',
    wo: 'wofür',
    thing: { stmt: 'Ich interessiere mich {für Fußball}.', ask: '{Wofür} interessierst du dich?', reply: 'Ich interessiere mich {dafür}.' },
    person: { stmt: 'Lena interessiert sich {für den neuen Kollegen}.', ask: '{Für wen} interessiert sie sich?', reply: 'Sie interessiert sich {für ihn}.' },
    clause: { de: 'Ich interessiere mich {dafür}, wie das funktioniert.', en: 'I’m interested in how it works.' },
  },
  {
    id: 'kuemmern',
    de: 'sich kümmern um',
    prep: 'um',
    kind: 'acc',
    en: 'to look after, to take care of',
    da: 'darum',
    wo: 'worum',
    thing: { stmt: 'Ich kümmere mich {um den Garten}.', ask: '{Worum} kümmerst du dich?', reply: 'Ich kümmere mich {darum}.' },
    person: { stmt: 'Ich kümmere mich {um meine Oma}.', ask: '{Um wen} kümmerst du dich?', reply: 'Ich kümmere mich {um sie}.' },
    clause: { de: 'Kannst du dich {darum} kümmern, dass alle eine Einladung bekommen?', en: 'Can you make sure that everyone gets an invitation?' },
  },
  {
    id: 'traeumen',
    de: 'träumen von',
    prep: 'von',
    kind: 'dat',
    en: 'to dream of',
    da: 'davon',
    wo: 'wovon',
    thing: { stmt: 'Ich träume {von einem Haus am Meer}.', ask: '{Wovon} träumst du?', reply: 'Ich träume {davon}.' },
    person: { stmt: 'Ich träume oft {von meinem Opa}.', ask: '{Von wem} träumst du?', reply: 'Ich träume oft {von ihm}.' },
    clause: { de: 'Sie träumt {davon}, eine eigene Bäckerei zu eröffnen.', en: 'She dreams of opening her own bakery.' },
  },
  {
    id: 'sprechen',
    de: 'sprechen über',
    prep: 'über',
    kind: 'acc',
    en: 'to talk about',
    da: 'darüber',
    wo: 'worüber',
    thing: { stmt: 'Wir sprechen {über das Wetter}.', ask: '{Worüber} sprecht ihr?', reply: 'Wir sprechen {darüber}.' },
    person: { stmt: 'Wir sprechen {über unseren Chef}.', ask: '{Über wen} sprecht ihr?', reply: 'Wir sprechen {über ihn}.' },
    clause: { de: 'Wir haben {darüber} gesprochen, ob wir umziehen sollen.', en: 'We talked about whether we should move.' },
  },
  {
    id: 'angst',
    de: 'Angst haben vor',
    prep: 'vor',
    kind: 'dat',
    en: 'to be afraid of',
    da: 'davor',
    wo: 'wovor',
    thing: { stmt: 'Ich habe Angst {vor der Prüfung}.', ask: '{Wovor} hast du Angst?', reply: 'Ich habe Angst {davor}.' },
    person: { stmt: 'Die Kinder haben Angst {vor dem neuen Lehrer}.', ask: '{Vor wem} haben sie Angst?', reply: 'Sie haben Angst {vor ihm}.' },
    clause: { de: 'Er hat Angst {davor}, Fehler zu machen.', en: 'He is afraid of making mistakes.' },
  },
  {
    id: 'erinnern',
    de: 'sich erinnern an',
    prep: 'an',
    kind: 'acc',
    en: 'to remember',
    da: 'daran',
    wo: 'woran',
    thing: { stmt: 'Ich erinnere mich gut {an den Sommer in Italien}.', ask: '{Woran} erinnerst du dich?', reply: 'Ich erinnere mich gut {daran}.' },
    person: { stmt: 'Ich erinnere mich gut {an meine erste Lehrerin}.', ask: '{An wen} erinnerst du dich?', reply: 'Ich erinnere mich gut {an sie}.' },
    clause: { de: 'Ich kann mich nicht {daran} erinnern, wo ich den Schlüssel hingelegt habe.', en: 'I can’t remember where I put the key.' },
  },
  {
    id: 'teilnehmen',
    de: 'teilnehmen an',
    prep: 'an',
    kind: 'dat',
    en: 'to take part in',
    da: 'daran',
    wo: 'woran',
    thing: { stmt: 'Ich nehme {am Kurs} teil.', ask: '{Woran} nimmst du teil?', reply: 'Ich nehme {daran} teil.' },
    person: { none: true, note: 'You take part in things (a course, a meeting, a race), not in people.' },
    clause: { none: true, note: '{teilnehmen an} rarely points ahead to a clause: {Ich nehme daran teil.} is the usual use.' },
  },
];

export const DAWO_EXPLAIN: Record<'thing' | 'person' | 'clause', { title: string; explain: string }> = {
  thing: {
    title: 'For a thing',
    explain: 'For things and ideas, German fuses the preposition with {wo-} (asking) or {da-} (answering): {auf den Bus} → {Worauf?} → {darauf}. Never {auf es} or {auf was} in careful German ({auf was} is colloquial).',
  },
  person: {
    title: 'For a person',
    explain: 'For people (and usually pets), keep the preposition and use a pronoun in the right case: {Auf wen?} → {auf sie}. A da-compound for a person sounds as if you were talking about an object.',
  },
  clause: {
    title: 'Pointing ahead',
    explain: 'The da-compound can announce a whole clause ({dass …}, {ob …}, a W-question or {zu} + infinitive). English often has no word for it: “I’m waiting for the rain to stop.”',
  },
};

/** Prepositions that make da-/wo-compounds, with or without the linking r. */
export const DAWO_PREPS: { prep: string; da: string; wo: string }[] = [
  { prep: 'an', da: 'daran', wo: 'woran' },
  { prep: 'auf', da: 'darauf', wo: 'worauf' },
  { prep: 'aus', da: 'daraus', wo: 'woraus' },
  { prep: 'in', da: 'darin', wo: 'worin' },
  { prep: 'über', da: 'darüber', wo: 'worüber' },
  { prep: 'um', da: 'darum', wo: 'worum' },
  { prep: 'unter', da: 'darunter', wo: 'worunter' },
  { prep: 'bei', da: 'dabei', wo: 'wobei' },
  { prep: 'durch', da: 'dadurch', wo: 'wodurch' },
  { prep: 'für', da: 'dafür', wo: 'wofür' },
  { prep: 'gegen', da: 'dagegen', wo: 'wogegen' },
  { prep: 'mit', da: 'damit', wo: 'womit' },
  { prep: 'nach', da: 'danach', wo: 'wonach' },
  { prep: 'von', da: 'davon', wo: 'wovon' },
  { prep: 'vor', da: 'davor', wo: 'wovor' },
  { prep: 'zu', da: 'dazu', wo: 'wozu' },
];

export interface DaWoQuizItem {
  de: string;
  answer: string[];
  explain: string;
}

export const DAWO_QUIZ: DaWoQuizItem[] = [
  { de: '___ wartest du? – Auf den Bus.', answer: ['Worauf'], explain: 'A thing: {wo} + {r} + {auf}.' },
  { de: '___ wartest du? – Auf meine Schwester.', answer: ['Auf wen'], explain: 'A person: preposition + {wen} (accusative).' },
  { de: 'Freust du dich auf die Ferien? – Ja, ich freue mich sehr ___.', answer: ['darauf'], explain: '{die Ferien} are a thing: {darauf}.' },
  { de: 'Erinnerst du dich an Herrn Berger? – Ja, ich erinnere mich gut ___.', answer: ['an ihn'], explain: 'A person: {an} + {ihn}.' },
  { de: '___ interessierst du dich? – Für Politik.', answer: ['Wofür'], explain: '{für} starts with a consonant: no {r}, so {wofür}.' },
  { de: 'Hast du Angst vor der Prüfung? – Nein, ich habe keine Angst ___.', answer: ['davor'], explain: '{vor} starts with a consonant: {davor}.' },
  { de: '___ habt ihr gesprochen? – Über unseren neuen Chef.', answer: ['Über wen'], explain: 'A person: {über} + {wen}.' },
  { de: 'Wer kümmert sich um die Getränke? – Ich kümmere mich ___.', answer: ['darum'], explain: '{um} starts with a vowel: {dar} + {um}.' },
  { de: '___ träumst du? – Von einer Reise nach Japan.', answer: ['Wovon'], explain: 'A thing, and {von} takes no {r}: {wovon}.' },
  { de: 'Nimmst du am Ausflug teil? – Ja, ich nehme ___ teil.', answer: ['daran'], explain: '{an} starts with a vowel: {daran}.' },
  { de: 'Denkst du noch an Jonas? – Ja, ich denke oft ___.', answer: ['an ihn'], explain: 'Jonas is a person: {an ihn}, not {daran}.' },
  { de: 'Ich freue mich ___, dass du kommst.', answer: ['darüber', 'darauf'], explain: '{darüber} (pleased that you are coming) or {darauf} (looking forward to it): the da-compound points ahead to the dass-clause.' },
];
