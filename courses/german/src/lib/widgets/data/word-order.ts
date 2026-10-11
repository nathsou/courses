/**
 * WordOrder: sentences broken into chunks for the field model (Vorfeld | finite verb |
 * Mittelfeld | verb at the end | Nachfeld). German under subject, verb, chunks (de, q), end,
 * nach and the leads; English under en, question, label, note.
 */

export interface Chunk {
  de: string;
  /** Question word that asks for this chunk ("Wann", "Mit wem"). */
  q?: string;
  /** The English question asking for it. */
  question?: string;
}

export interface MainPreset {
  id: string;
  label: string;
  en: string;
  subject: Chunk;
  /** The finite verb, as it stands in second position. */
  verb: string;
  /** The rest of the middle field, in neutral order. */
  chunks: Chunk[];
  /** The right bracket: participle, infinitive or separable prefix. */
  end?: string;
  nach?: string;
  /** English yes/no question. */
  question?: string;
  note?: string;
}

export const V2_PRESETS: MainPreset[] = [
  {
    id: 'train',
    label: 'By train',
    en: 'I’m going to Berlin by train tomorrow.',
    subject: { de: 'ich' },
    verb: 'fahre',
    chunks: [{ de: 'morgen' }, { de: 'mit dem Zug' }, { de: 'nach Berlin' }],
  },
  {
    id: 'football',
    label: 'Football',
    en: 'My brother plays football in the park every Saturday.',
    subject: { de: 'mein Bruder' },
    verb: 'spielt',
    chunks: [{ de: 'jeden Samstag' }, { de: 'im Park' }, { de: 'Fußball' }],
  },
  {
    id: 'coffee',
    label: 'Coffee',
    en: 'We like drinking coffee on Sundays.',
    subject: { de: 'wir' },
    verb: 'trinken',
    chunks: [{ de: 'sonntags' }, { de: 'gern' }, { de: 'Kaffee' }],
  },
];

export const QUESTION_PRESETS: MainPreset[] = [
  {
    id: 'vienna',
    label: 'Lena’s trip',
    en: 'Lena is going to Vienna by train tomorrow.',
    question: 'Is Lena going to Vienna by train tomorrow?',
    subject: { de: 'Lena', q: 'Wer', question: 'Who is going to Vienna by train tomorrow?' },
    verb: 'fährt',
    chunks: [
      { de: 'morgen', q: 'Wann', question: 'When is Lena going to Vienna by train?' },
      { de: 'mit dem Zug', q: 'Wie', question: 'How is Lena getting to Vienna tomorrow?' },
      { de: 'nach Wien', q: 'Wohin', question: 'Where is Lena going by train tomorrow?' },
    ],
  },
  {
    id: 'zurich',
    label: 'Jonas in Zürich',
    en: 'Jonas has been living in Zürich for three years.',
    question: 'Has Jonas been living in Zürich for three years?',
    subject: { de: 'Jonas', q: 'Wer', question: 'Who has been living in Zürich for three years?' },
    verb: 'wohnt',
    chunks: [
      { de: 'seit drei Jahren', q: 'Seit wann', question: 'How long has Jonas been living in Zürich?' },
      { de: 'in Zürich', q: 'Wo', question: 'Where has Jonas been living for three years?' },
    ],
  },
  {
    id: 'dinner',
    label: 'Mehmet cooks',
    en: 'Mehmet is cooking spaghetti for his friends this evening.',
    question: 'Is Mehmet cooking spaghetti for his friends this evening?',
    subject: { de: 'Mehmet', q: 'Wer', question: 'Who is cooking spaghetti for his friends this evening?' },
    verb: 'kocht',
    chunks: [
      { de: 'heute Abend', q: 'Wann', question: 'When is Mehmet cooking spaghetti for his friends?' },
      { de: 'für seine Freunde', q: 'Für wen', question: 'Who is Mehmet cooking spaghetti for this evening?' },
      { de: 'Spaghetti', q: 'Was', question: 'What is Mehmet cooking for his friends this evening?' },
    ],
  },
];

export const BRACKET_PRESETS: MainPreset[] = [
  {
    id: 'perfect',
    label: 'Perfect',
    en: 'I played football in the park yesterday.',
    subject: { de: 'ich' },
    verb: 'habe',
    chunks: [{ de: 'gestern' }, { de: 'im Park' }, { de: 'Fußball' }],
    end: 'gespielt',
    note: 'Perfect: {haben} or {sein} in second position, the participle at the end.',
  },
  {
    id: 'modal',
    label: 'Modal verb',
    en: 'We want to go to the mountains at the weekend.',
    subject: { de: 'wir' },
    verb: 'wollen',
    chunks: [{ de: 'am Wochenende' }, { de: 'in die Berge' }],
    end: 'fahren',
    note: 'A modal verb takes second position; the infinitive goes to the end.',
  },
  {
    id: 'separable',
    label: 'Separable verb',
    en: 'On Monday I get up at six.',
    subject: { de: 'ich' },
    verb: 'stehe',
    chunks: [{ de: 'am Montag' }, { de: 'um sechs Uhr' }],
    end: 'auf',
    note: 'A separable verb splits: {stehe} in second position, the prefix {auf} at the end.',
  },
  {
    id: 'nachfeld',
    label: 'Nachfeld',
    en: 'I worked longer than you yesterday.',
    subject: { de: 'ich' },
    verb: 'habe',
    chunks: [{ de: 'gestern' }, { de: 'länger' }],
    end: 'gearbeitet',
    nach: 'als du',
    note: 'A comparison with {als} usually goes after the bracket, in the Nachfeld.',
  },
];

/** The main clause a subordinate clause hangs on. */
export interface Lead {
  subject: string;
  verb: string;
  rest?: string;
  /** Right bracket of the main clause ("Ich habe gehört, …"). */
  end?: string;
  /** Verb-first question ("Weißt du, ob …?"). */
  ask?: boolean;
  en: string;
}

export interface SubPreset {
  id: string;
  label: string;
  /** The clause on its own, as a main clause. */
  en: string;
  subject: string;
  verb: string;
  chunks: string[];
  /** Participle, infinitive, or (with `prefix`) a separable prefix that joins the verb. */
  end?: string;
  prefix?: boolean;
  leads: Partial<Record<'weil' | 'dass' | 'ob' | 'wenn', Lead>>;
}

export const SUB_PRESETS: SubPreset[] = [
  {
    id: 'ill',
    label: 'Ill',
    en: 'I’m ill.',
    subject: 'ich',
    verb: 'bin',
    chunks: ['krank'],
    leads: {
      weil: { subject: 'ich', verb: 'bleibe', rest: 'heute zu Hause', en: 'I’m staying at home today because I’m ill.' },
      dass: { subject: 'der Arzt', verb: 'sagt', en: 'The doctor says that I’m ill.' },
      wenn: { subject: 'ich', verb: 'bleibe', rest: 'immer zu Hause', en: 'I always stay at home when I’m ill.' },
    },
  },
  {
    id: 'early',
    label: 'Getting up early',
    en: 'I’m getting up early tomorrow morning.',
    subject: 'ich',
    verb: 'stehe',
    chunks: ['morgen früh'],
    end: 'auf',
    prefix: true,
    leads: {
      weil: { subject: 'ich', verb: 'gehe', rest: 'heute zeitig ins Bett', en: 'I’m going to bed early tonight because I’m getting up early tomorrow morning.' },
      dass: { subject: 'meine Mutter', verb: 'weiß', rest: 'nicht', en: 'My mother doesn’t know that I’m getting up early tomorrow morning.' },
      ob: { subject: 'ich', verb: 'weiß', rest: 'noch nicht', en: 'I don’t know yet whether I’m getting up early tomorrow morning.' },
    },
  },
  {
    id: 'come',
    label: 'Coming along',
    en: 'You can come along this evening.',
    subject: 'du',
    verb: 'kannst',
    chunks: ['heute Abend'],
    end: 'mitkommen',
    leads: {
      dass: { subject: 'ich', verb: 'hoffe', en: 'I hope that you can come along this evening.' },
      ob: { subject: 'ich', verb: 'frage', rest: 'dich', en: 'I’m asking you whether you can come along this evening.' },
      wenn: { subject: 'ich', verb: 'freue', rest: 'mich', en: 'I’ll be glad if you can come along this evening.' },
    },
  },
  {
    id: 'exam',
    label: 'The exam',
    en: 'Lena has passed the exam.',
    subject: 'Lena',
    verb: 'hat',
    chunks: ['die Prüfung'],
    end: 'bestanden',
    leads: {
      weil: { subject: 'wir', verb: 'feiern', rest: 'heute', en: 'We’re celebrating today because Lena has passed the exam.' },
      dass: { subject: 'ich', verb: 'habe', end: 'gehört', en: 'I’ve heard that Lena has passed the exam.' },
      ob: { subject: 'du', verb: 'weißt', ask: true, en: 'Do you know whether Lena has passed the exam?' },
    },
  },
];
