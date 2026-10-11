/** The course outline. Lesson slugs are URLs and progress keys: do not rename them. */
export const COURSE_TITLE = 'Auf Deutsch';
export const COURSE_SUBTITLE = 'German from your first Hallo to B2, for beginners and returners';

export type Level = 'A1' | 'A2' | 'B1' | 'B2';

export interface LessonRef {
  slug: string;
  title: string;
  /** The lesson's German motto, shown large beside its title. */
  de: string;
  /** Rough time to work through the lesson, in minutes. */
  minutes: number;
  /** One-line promise shown on the course map. */
  blurb: string;
  /** The grammar it covers, in a few words, for the map and the placement check. */
  grammar: string;
}

export interface Part {
  id: string;
  title: string;
  de: string;
  /** Who this part is for, shown on the map. */
  tagline: string;
  level: Level;
  lessons: LessonRef[];
}

export const PARTS: Part[] = [
  {
    id: 'a1',
    title: 'First steps',
    de: 'Erste Schritte',
    tagline: 'Introduce yourself, count, eat, shop and get around: the whole of A1.',
    level: 'A1',
    lessons: [
      { slug: '01-hallo', title: 'Hello! The sounds of German', de: 'Hallo!', minutes: 30, blurb: 'Greetings, the alphabet, and the dozen sounds that make German sound German.', grammar: 'pronunciation, ä ö ü ß, greetings' },
      { slug: '02-ich-bin', title: 'Who are you?', de: 'Wer bist du?', minutes: 35, blurb: 'Names, countries and languages, du or Sie, and your first verbs.', grammar: 'sein, regular present tense, du/Sie, questions' },
      { slug: '03-zahlen', title: 'Numbers you can say', de: 'Zahlen', minutes: 30, blurb: 'Counting to a million the German way (backwards!), ages, phone numbers and prices.', grammar: 'numbers, wie viel, spelling' },
      { slug: '04-familie', title: 'Family: der, die, das', de: 'Die Familie', minutes: 35, blurb: 'Who is in your family, the three genders, plurals, haben, and mein/dein.', grammar: 'gender, plural, ein/eine, haben, possessives' },
      { slug: '05-essen', title: 'Eating and drinking', de: 'Guten Appetit!', minutes: 35, blurb: 'Ordering in a café, the accusative case, kein versus nicht, möchte and mag.', grammar: 'accusative, kein/nicht, möchten, mögen, gern' },
      { slug: '06-tagesablauf', title: 'A day in your life', de: 'Mein Tag', minutes: 35, blurb: 'Telling the time (halb drei is 2:30!), daily routines, separable verbs and the verb-second rule.', grammar: 'time, separable verbs, verb-second word order' },
      { slug: '07-wohnung', title: 'At home', de: 'Zu Hause', minutes: 30, blurb: 'Rooms, furniture and colours, es gibt, and describing where you live.', grammar: 'es gibt, adjectives after sein, accusative pronouns' },
      { slug: '08-stadt', title: 'In town', de: 'In der Stadt', minutes: 35, blurb: 'Places, directions and transport, the imperative, and your first dative.', grammar: 'imperative, mit/zu/in + dative, wo/wohin' },
      { slug: '09-freizeit', title: 'Free time and plans', de: 'Freizeit', minutes: 35, blurb: 'Hobbies, invitations and excuses with the modal verbs.', grammar: 'können, wollen, müssen, dürfen, sollen' },
      { slug: '10-einkaufen', title: 'Shopping and clothes', de: 'Einkaufen', minutes: 30, blurb: 'Sizes and colours, this one or that one, and verbs like gefallen.', grammar: 'dieser/welcher, ihn/sie/es, mir/dir, gefallen' },
      { slug: '11-wochenende', title: 'What did you do?', de: 'Am Wochenende', minutes: 35, blurb: 'Talking about the past with the perfect tense: hat gemacht, ist gefahren.', grammar: 'Perfekt with haben and sein, war and hatte' },
      { slug: '12-a1-review', title: 'A1: putting it together', de: 'Wiederholung A1', minutes: 40, blurb: 'A story, a full day of scenes, and a review of everything in A1.', grammar: 'review' },
    ],
  },
  {
    id: 'a2',
    title: 'Getting around',
    de: 'Unterwegs',
    tagline: 'Tell stories, travel, describe people and things, and give reasons: A2.',
    level: 'A2',
    lessons: [
      { slug: '13-perfekt', title: 'Telling what happened', de: 'Was ist passiert?', minutes: 35, blurb: 'The perfect tense in depth: irregular participles, separable verbs, -ieren, and sein.', grammar: 'Perfekt: all participle patterns' },
      { slug: '14-dativ', title: 'To whom? The dative', de: 'Wem?', minutes: 35, blurb: 'Giving and helping, dative verbs and prepositions, mir, dir, ihm.', grammar: 'dative case, dative verbs and prepositions' },
      { slug: '15-wo-wohin', title: 'Where and where to', de: 'Wo oder wohin?', minutes: 35, blurb: 'Two-way prepositions: in den Schrank or im Schrank? Plus stellen/stehen, legen/liegen.', grammar: 'two-way prepositions, position verbs' },
      { slug: '16-reisen', title: 'Travelling', de: 'Gute Reise!', minutes: 35, blurb: 'Stations, tickets and hotels, dates and ordinal numbers, and the past of modal verbs.', grammar: 'ordinals and dates, Präteritum of modals' },
      { slug: '17-gesundheit', title: 'Health and the body', de: 'Gute Besserung!', minutes: 30, blurb: 'At the doctor’s, reflexive verbs, and giving advice with sollte.', grammar: 'reflexive verbs, sollte, wehtun' },
      { slug: '18-vergleichen', title: 'Comparing things', de: 'Größer, besser, am schönsten', minutes: 30, blurb: 'Comparatives and superlatives, als and wie, and the irregular ones.', grammar: 'comparative, superlative, als/wie' },
      { slug: '19-adjektive', title: 'Describing people and things', de: 'Der nette Nachbar', minutes: 40, blurb: 'Adjective endings, finally made sense of: one rule, three tables, lots of practice.', grammar: 'adjective endings' },
      { slug: '20-weil-dass', title: 'Because, that, if', de: 'Weil, dass, wenn', minutes: 35, blurb: 'Subordinate clauses send the verb to the end: giving reasons and opinions.', grammar: 'weil, dass, wenn, ob; verb-final clauses' },
      { slug: '21-arbeit', title: 'Work and study', de: 'Beruf und Arbeit', minutes: 35, blurb: 'Jobs, applications and phone calls, als versus wenn, and the future with werden.', grammar: 'als/wenn, werden + infinitive, Präteritum of sein/haben' },
      { slug: '22-feste', title: 'Festivals and the year', de: 'Feste feiern', minutes: 30, blurb: 'Celebrations across the German-speaking world, invitations, wishes and the genitive -s.', grammar: 'invitations, dative reflexives, Peters, von' },
      { slug: '23-a2-review', title: 'A2: putting it together', de: 'Wiederholung A2', minutes: 40, blurb: 'A longer story, a trip in scenes, and a review of all of A2.', grammar: 'review' },
    ],
  },
  {
    id: 'b1',
    title: 'In the thick of it',
    de: 'Mittendrin',
    tagline: 'Narrate, hypothesise, describe processes and argue a point: B1.',
    level: 'B1',
    lessons: [
      { slug: '24-praeteritum', title: 'Once upon a time', de: 'Es war einmal', minutes: 40, blurb: 'The simple past for stories, nachdem and the pluperfect.', grammar: 'Präteritum, Plusquamperfekt, nachdem/bevor' },
      { slug: '25-relativsaetze', title: 'The one who…', de: 'Der Mann, der …', minutes: 40, blurb: 'Relative clauses: der, die, das, dessen, deren, with prepositions, and was/wo.', grammar: 'relative clauses' },
      { slug: '26-passiv', title: 'It is being done', de: 'Das Passiv', minutes: 35, blurb: 'The passive voice in present, past and perfect, with modals, and von versus durch.', grammar: 'Vorgangspassiv, passive with modals' },
      { slug: '27-konjunktiv-ii', title: 'If only…', de: 'Wenn ich du wäre', minutes: 40, blurb: 'Konjunktiv II: wishes, polite requests, advice and unreal conditions.', grammar: 'würde, wäre, hätte, könnte; hätte … können' },
      { slug: '28-infinitiv-zu', title: 'In order to', de: 'Um … zu', minutes: 35, blurb: 'Infinitives with zu, um … zu, ohne … zu, statt … zu, and damit.', grammar: 'zu-infinitive, um/ohne/statt … zu, damit' },
      { slug: '29-verben-praepositionen', title: 'Waiting for, thinking of', de: 'Worauf wartest du?', minutes: 35, blurb: 'Verbs with fixed prepositions, and the da- and wo- words that go with them.', grammar: 'prepositional verbs, da-/wo-compounds' },
      { slug: '30-genitiv', title: 'Whose? The genitive', de: 'Wessen?', minutes: 35, blurb: 'The genitive case, wegen and trotz, and the n-nouns: der Kollege, den Kollegen.', grammar: 'genitive, genitive prepositions, n-declension' },
      { slug: '31-konnektoren', title: 'Linking ideas', de: 'Nicht nur …, sondern auch', minutes: 35, blurb: 'Two-part connectors, je … desto, trotzdem and obwohl: sounding joined-up.', grammar: 'two-part conjunctions, connecting adverbs' },
      { slug: '32-meinung', title: 'Opinions and discussion', de: 'Meiner Meinung nach', minutes: 35, blurb: 'Agreeing and disagreeing, indirect questions, lassen, and a formal email.', grammar: 'indirect questions, lassen, formal register' },
      { slug: '33-b1-review', title: 'B1: putting it together', de: 'Wiederholung B1', minutes: 45, blurb: 'A short story, a debate and a review of all of B1.', grammar: 'review' },
    ],
  },
  {
    id: 'b2',
    title: 'Fine-tuning',
    de: 'Feinschliff',
    tagline: 'Report, argue and write with the precision of an educated speaker: B2.',
    level: 'B2',
    lessons: [
      { slug: '34-konjunktiv-i', title: 'Reported speech', de: 'Er sagte, er sei …', minutes: 40, blurb: 'Konjunktiv I and indirect speech, as used in every German news report.', grammar: 'Konjunktiv I, indirect speech' },
      { slug: '35-passiv-alternativen', title: 'Beyond the passive', de: 'Das lässt sich machen', minutes: 35, blurb: 'The state passive, sein + zu, sich lassen, -bar, and when to use which.', grammar: 'Zustandspassiv, passive alternatives' },
      { slug: '36-partizipien', title: 'Participles as adjectives', de: 'Der lachende Mann', minutes: 40, blurb: 'Participles before nouns and the long attributes of written German.', grammar: 'Partizip I and II as adjectives, extended attributes' },
      { slug: '37-nominalstil', title: 'The nominal style', de: 'Nominalstil', minutes: 40, blurb: 'Turning verbs into nouns and back, and the fixed noun-verb pairs of formal German.', grammar: 'nominalisation, Funktionsverbgefüge' },
      { slug: '38-modalpartikeln', title: 'How Germans really talk', de: 'Na ja, halt', minutes: 35, blurb: 'Modal particles (doch, mal, ja, eben, halt) and the subjective use of modal verbs.', grammar: 'modal particles, subjective modal verbs' },
      { slug: '39-argumentieren', title: 'Making your case', de: 'Einerseits, andererseits', minutes: 40, blurb: 'Structured argument, advanced connectors, register and idioms for B2 writing and speaking.', grammar: 'advanced connectors, register, idioms' },
      { slug: '40-b2-review', title: 'B2: putting it together', de: 'Wiederholung B2', minutes: 45, blurb: 'A feature article, a negotiation and a review of all of B2.', grammar: 'review' },
    ],
  },
];

export const LESSONS: (LessonRef & { part: Part; number: number })[] = PARTS.flatMap((part) => part.lessons).map((l, i) => ({
  ...l,
  part: PARTS.find((p) => p.lessons.includes(l))!,
  number: i + 1,
}));

export function lessonBySlug(slug: string) {
  return LESSONS.find((l) => l.slug === slug);
}
