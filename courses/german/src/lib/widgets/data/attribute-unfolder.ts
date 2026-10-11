/**
 * Extended participle attributes and the relative clauses they unfold into. Both strings mark
 * their pieces with `{…}`; `am` and `um` give each span's group (an index into `kind`), so the
 * matching pieces share a colour.
 */

export type AttrKind = 'art' | 'noun' | 'rel' | 'mid' | 'part';

export interface AttrPreset {
  id: string;
  attr: string;
  am: number[];
  unfold: string;
  um: number[];
  /** What each group is. */
  kind: AttrKind[];
  en: string;
  /** How the participle becomes a verb (English, {German} allowed). */
  explain: string;
}

export const ATTR_PRESETS: AttrPreset[] = [
  {
    id: 'reform',
    attr: '{die} {von der Regierung} {geplante} {Reform}',
    am: [0, 2, 3, 1],
    unfold: '{die} {Reform}, {die} {von der Regierung} {geplant wird}',
    um: [0, 1, 4, 2, 3],
    kind: ['art', 'noun', 'mid', 'part', 'rel'],
    en: 'the reform planned by the government',
    explain: '{geplant} is the Partizip II of {planen}, a verb with an object, so the meaning is passive (it is being planned): {werden} + Partizip II. The participle shows no tense; context decides between {geplant wird}, {geplant wurde} and {geplant worden ist}.',
  },
  {
    id: 'bahnhof',
    attr: '{der} {seit Jahren} {leer stehende} {Bahnhof}',
    am: [0, 2, 3, 1],
    unfold: '{der} {Bahnhof}, {der} {seit Jahren} {leer steht}',
    um: [0, 1, 4, 2, 3],
    kind: ['art', 'noun', 'mid', 'part', 'rel'],
    en: 'the station that has been standing empty for years',
    explain: '{stehend} is a Partizip I: active, and happening at the same time. So the verb simply returns to the present tense: {leer steht}.',
  },
  {
    id: 'preise',
    attr: '{die} {im letzten Jahr} {stark} {gestiegenen} {Preise}',
    am: [0, 2, 3, 4, 1],
    unfold: '{die} {Preise}, {die} {im letzten Jahr} {stark} {gestiegen sind}',
    um: [0, 1, 5, 2, 3, 4],
    kind: ['art', 'noun', 'mid', 'mid', 'part', 'rel'],
    en: 'the prices that rose sharply last year',
    explain: '{gestiegen} is the Partizip II of {steigen}, which has no object and forms its perfect with {sein}. So the meaning is active and completed: {gestiegen sind}, not a passive.',
  },
  {
    id: 'problem',
    attr: '{das} {zu lösende} {Problem}',
    am: [0, 2, 1],
    unfold: '{das} {Problem}, {das} {gelöst werden muss}',
    um: [0, 1, 3, 2],
    kind: ['art', 'noun', 'part', 'rel'],
    en: 'the problem that has to be solved',
    explain: '{zu} + Partizip I is the gerundive: something that must (or can) be done. Unfold it with a modal verb and the passive: {gelöst werden muss}, or actively: {das man lösen muss}.',
  },
  {
    id: 'taxis',
    attr: '{die} {vor dem Bahnhof} {wartenden} {Taxis}',
    am: [0, 2, 3, 1],
    unfold: '{die} {Taxis}, {die} {vor dem Bahnhof} {warten}',
    um: [0, 1, 4, 2, 3],
    kind: ['art', 'noun', 'mid', 'part', 'rel'],
    en: 'the taxis waiting outside the station',
    explain: '{wartend} is a Partizip I: active, at the same time. The verb goes back to the present: {warten}, plural to agree with {die Taxis}.',
  },
  {
    id: 'flughafen',
    attr: '{der} {gestern} {in Berlin} {eröffnete} {Flughafen}',
    am: [0, 2, 3, 4, 1],
    unfold: '{der} {Flughafen}, {der} {gestern} {in Berlin} {eröffnet wurde}',
    um: [0, 1, 5, 2, 3, 4],
    kind: ['art', 'noun', 'mid', 'mid', 'part', 'rel'],
    en: 'the airport opened in Berlin yesterday',
    explain: '{eröffnet} is the Partizip II of {eröffnen}, a verb with an object: passive. {gestern} puts it in the past, so {eröffnet wurde}.',
  },
  {
    id: 'risiko',
    attr: '{das} {nicht} {zu unterschätzende} {Risiko}',
    am: [0, 2, 3, 1],
    unfold: '{das} {Risiko}, {das} {nicht} {unterschätzt werden darf}',
    um: [0, 1, 4, 2, 3],
    kind: ['art', 'noun', 'mid', 'part', 'rel'],
    en: 'the risk that must not be underestimated',
    explain: 'The gerundive again ({zu} + Partizip I). With {nicht} it means must not: {nicht unterschätzt werden darf}.',
  },
];

export const ATTR_STEPS: { kind: AttrKind[]; title: string; explain: string }[] = [
  {
    kind: ['art', 'noun'],
    title: 'Article and noun',
    explain: 'Find the article and the noun it belongs to: they frame the whole attribute. Everything in between describes the noun.',
  },
  {
    kind: ['rel'],
    title: 'Relative pronoun',
    explain: 'After the noun, a comma and a relative pronoun with the same gender and number. It is the subject of the new clause, so it is nominative.',
  },
  {
    kind: ['mid'],
    title: 'The details',
    explain: 'Everything between the article and the participle moves into the relative clause, in the same order.',
  },
  {
    kind: ['part'],
    title: 'Participle → verb',
    explain: '',
  },
];

export interface AttrQuizItem {
  de: string;
  options: string[];
  answer: string;
  explain: string;
}

/** The reverse direction: fold a relative clause into an attribute. The first option is right. */
export const ATTR_QUIZ: AttrQuizItem[] = [
  {
    de: 'das Buch, das von allen gelesen wird',
    options: ['das von allen gelesene Buch', 'das von allen lesende Buch', 'das von allen gelesen Buch'],
    answer: 'das von allen gelesene Buch',
    explain: 'It is being read (passive): Partizip II {gelesen}, and as an adjective it needs its ending: {gelesene}.',
  },
  {
    de: 'die Kinder, die im Garten spielen',
    options: ['die im Garten spielenden Kinder', 'die im Garten gespielten Kinder', 'die im Garten spielende Kinder'],
    answer: 'die im Garten spielenden Kinder',
    explain: 'Active, happening now: Partizip I {spielend}. After {die} in the plural the ending is -en.',
  },
  {
    de: 'der Zug, der gerade angekommen ist',
    options: ['der gerade angekommene Zug', 'der gerade ankommende Zug', 'der gerade angekommen Zug'],
    answer: 'der gerade angekommene Zug',
    explain: '{ankommen} takes {sein}: its Partizip II is active and completed. {der ankommende Zug} would be a train arriving right now.',
  },
  {
    de: 'die Aufgabe, die bis Freitag erledigt werden muss',
    options: ['die bis Freitag zu erledigende Aufgabe', 'die bis Freitag erledigte Aufgabe', 'die bis Freitag erledigende Aufgabe'],
    answer: 'die bis Freitag zu erledigende Aufgabe',
    explain: '“Must be done” is the gerundive: {zu} + Partizip I + ending, {zu erledigende}.',
  },
  {
    de: 'der Brief, den meine Oma geschrieben hat',
    options: ['der von meiner Oma geschriebene Brief', 'der meine Oma geschriebene Brief', 'der von meiner Oma schreibende Brief'],
    answer: 'der von meiner Oma geschriebene Brief',
    explain: 'The letter was written: Partizip II. The doer comes in with {von} + dative: {von meiner Oma}.',
  },
  {
    de: 'die Preise, die ständig steigen',
    options: ['die ständig steigenden Preise', 'die ständig gestiegenen Preise', 'die ständig steigende Preise'],
    answer: 'die ständig steigenden Preise',
    explain: 'Rising now: Partizip I {steigend}, plural ending -en. {gestiegen} would mean they have already risen.',
  },
  {
    de: 'das Kind, das laut weint',
    options: ['das laut weinende Kind', 'das laut geweinte Kind', 'das laut weinend Kind'],
    answer: 'das laut weinende Kind',
    explain: 'Active and now: Partizip I {weinend} + -e after {das}.',
  },
  {
    de: 'die Stadt, die im Krieg zerstört wurde',
    options: ['die im Krieg zerstörte Stadt', 'die im Krieg zerstörende Stadt', 'die im Krieg zerstört Stadt'],
    answer: 'die im Krieg zerstörte Stadt',
    explain: 'Passive and past: Partizip II {zerstört} + -e.',
  },
];
