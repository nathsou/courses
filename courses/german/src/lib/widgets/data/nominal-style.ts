/**
 * Verbal style ↔ nominal style, and Funktionsverbgefüge. In each pair, `vm` and `nm` give each
 * marked span's group (an index into `kind` and `steps`), so matching pieces share a colour.
 */

export type NomKind = 'conn' | 'subj' | 'obj' | 'verb';

export interface NomPair {
  id: string;
  verbal: string;
  vm: number[];
  nominal: string;
  nm: number[];
  kind: NomKind[];
  /** One explanation per group. */
  steps: { label: string; explain: string }[];
  en: string;
}

export const NOM_PAIRS: NomPair[] = [
  {
    id: 'regen',
    verbal: '{Weil} {es} {regnete}, fiel das Spiel aus.',
    vm: [0, 1, 2],
    nominal: '{Wegen} {des Regens} fiel das Spiel aus.',
    nm: [0, 2],
    kind: ['conn', 'subj', 'verb'],
    steps: [
      { label: '{weil} → {wegen}', explain: 'The conjunction becomes a preposition: {wegen} + genitive.' },
      { label: '{es} → gone', explain: '{es} was only a dummy subject, so it simply disappears.' },
      { label: '{regnete} → {des Regens}', explain: 'The verb becomes a noun ({regnen} → {der Regen}), in the genitive after {wegen}. The tense disappears with the verb.' },
    ],
    en: 'Because it was raining → Because of the rain, the match was called off.',
  },
  {
    id: 'ankunft',
    verbal: '{Nachdem} {er} {angekommen war}, rief er seine Mutter an.',
    vm: [0, 1, 2],
    nominal: '{Nach} {seiner} {Ankunft} rief er seine Mutter an.',
    nm: [0, 1, 2],
    kind: ['conn', 'subj', 'verb'],
    steps: [
      { label: '{nachdem} → {nach}', explain: 'The conjunction becomes the preposition {nach} + dative.' },
      { label: '{er} → {seiner}', explain: 'The subject becomes a possessive: he arrived → his arrival.' },
      { label: '{angekommen war} → {Ankunft}', explain: '{ankommen} → {die Ankunft}: an irregular noun, best learnt together with the verb.' },
    ],
    en: 'After he had arrived → After his arrival, he phoned his mother.',
  },
  {
    id: 'geraet',
    verbal: '{Wenn} {man} {das Gerät} {benutzt}, muss man eine Schutzbrille tragen.',
    vm: [0, 1, 2, 3],
    nominal: '{Bei} {der Benutzung} {des Geräts} muss man eine Schutzbrille tragen.',
    nm: [0, 3, 2],
    kind: ['conn', 'subj', 'obj', 'verb'],
    steps: [
      { label: '{wenn} → {bei}', explain: '{wenn} (whenever) becomes {bei} + dative.' },
      { label: '{man} → gone', explain: 'The vague subject {man} simply disappears.' },
      { label: '{das Gerät} → {des Geräts}', explain: 'The object becomes a genitive after the new noun: using the device → the use of the device.' },
      { label: '{benutzt} → {der Benutzung}', explain: '{benutzen} → {die Benutzung}. Nouns in {-ung} are always feminine; here dative after {bei}.' },
    ],
    en: 'When you use the device → When using the device, you must wear safety goggles.',
  },
  {
    id: 'krankheit',
    verbal: '{Obwohl} {sie} {krank war}, ging sie zur Arbeit.',
    vm: [0, 1, 2],
    nominal: '{Trotz} {ihrer} {Krankheit} ging sie zur Arbeit.',
    nm: [0, 1, 2],
    kind: ['conn', 'subj', 'verb'],
    steps: [
      { label: '{obwohl} → {trotz}', explain: 'The conjunction becomes the preposition {trotz} + genitive.' },
      { label: '{sie} → {ihrer}', explain: 'The subject becomes a possessive, in the genitive after {trotz}: {ihrer Krankheit}.' },
      { label: '{krank war} → {Krankheit}', explain: '{krank sein} → {die Krankheit}. Nouns in {-heit} and {-keit} are always feminine.' },
    ],
    en: 'Although she was ill → Despite her illness, she went to work.',
  },
  {
    id: 'loesung',
    verbal: '{Um} {das Problem} {zu} {lösen}, gründete die Firma eine Arbeitsgruppe.',
    vm: [0, 1, 0, 2],
    nominal: '{Zur} {Lösung} {des Problems} gründete die Firma eine Arbeitsgruppe.',
    nm: [0, 2, 1],
    kind: ['conn', 'obj', 'verb'],
    steps: [
      { label: '{um … zu} → {zur}', explain: 'The purpose clause becomes {zu} + dative: {zur} = {zu der}.' },
      { label: '{das Problem} → {des Problems}', explain: 'The object becomes a genitive after the noun.' },
      { label: '{lösen} → {Lösung}', explain: '{lösen} → {die Lösung}.' },
    ],
    en: 'In order to solve the problem → To solve the problem, the company set up a working group.',
  },
  {
    id: 'vorbereitung',
    verbal: '{Während} {wir} {das Essen} {vorbereiteten}, hörten wir Musik.',
    vm: [0, 1, 2, 3],
    nominal: '{Während} {der Vorbereitung} {des Essens} hörten wir Musik.',
    nm: [0, 3, 2],
    kind: ['conn', 'subj', 'obj', 'verb'],
    steps: [
      { label: '{während} → {während}', explain: 'The same word with a new job: the conjunction becomes the preposition {während} + genitive.' },
      { label: '{wir} → gone', explain: 'The subject is clear from the main clause, so it is dropped.' },
      { label: '{das Essen} → {des Essens}', explain: 'The object becomes a genitive after the noun.' },
      { label: '{vorbereiteten} → {der Vorbereitung}', explain: '{vorbereiten} → {die Vorbereitung}, in the genitive after {während}.' },
    ],
    en: 'While we were preparing the meal → During the preparation of the meal, we listened to music.',
  },
  {
    id: 'beginn',
    verbal: '{Bevor} {das Konzert} {beginnt}, schalten alle ihre Handys aus.',
    vm: [0, 1, 2],
    nominal: '{Vor} {Beginn} {des Konzerts} schalten alle ihre Handys aus.',
    nm: [0, 2, 1],
    kind: ['conn', 'subj', 'verb'],
    steps: [
      { label: '{bevor} → {vor}', explain: '{vor} + dative; with {Beginn} the article is usually dropped.' },
      { label: '{das Konzert} → {des Konzerts}', explain: 'This time the subject becomes the genitive: the concert begins → the beginning of the concert.' },
      { label: '{beginnt} → {Beginn}', explain: '{beginnen} → {der Beginn}.' },
    ],
    en: 'Before the concert begins → Before the start of the concert, everyone switches off their phones.',
  },
];

export const NOM_EXPLAIN: Record<NomKind, { label: string }> = {
  conn: { label: 'connector → preposition' },
  subj: { label: 'subject → possessive or genitive' },
  obj: { label: 'object → genitive' },
  verb: { label: 'verb → noun' },
};

export interface Fvg {
  id: string;
  /** The Funktionsverbgefüge. */
  fvg: string;
  /** A simple verb with (nearly) the same meaning. */
  verb: string;
  en: string;
  ex: string;
  exVerb: string;
  note?: string;
}

export const FVGS: Fvg[] = [
  { id: 'entscheidung', fvg: 'eine Entscheidung treffen', verb: 'entscheiden', en: 'to make a decision', ex: 'Wir müssen bis Freitag eine Entscheidung treffen.', exVerb: 'Wir müssen bis Freitag entscheiden.' },
  { id: 'verfuegung', fvg: 'zur Verfügung stellen', verb: 'bereitstellen', en: 'to make available, to provide', ex: 'Die Firma stellt allen Mitarbeitern einen Laptop zur Verfügung.', exVerb: 'Die Firma stellt allen Mitarbeitern einen Laptop bereit.' },
  { id: 'frage', fvg: 'in Frage kommen', verb: 'möglich sein', en: 'to be an option', ex: 'Dieser Termin kommt leider nicht in Frage.', exVerb: 'Dieser Termin ist leider nicht möglich.', note: 'Also written {infrage kommen}; both spellings are correct.' },
  { id: 'kritik', fvg: 'Kritik üben', verb: 'kritisieren', en: 'to criticise', ex: 'Die Opposition übt scharfe Kritik am Plan der Regierung.', exVerb: 'Die Opposition kritisiert den Plan der Regierung scharf.', note: 'The thing criticised comes with {an} + dative.' },
  { id: 'bescheid', fvg: 'Bescheid geben', verb: 'informieren', en: 'to let someone know', ex: 'Gib mir bitte Bescheid, wenn du angekommen bist.', exVerb: 'Informier mich bitte, wenn du angekommen bist.', note: 'Everyday German: {Bescheid sagen} is just as common.' },
  { id: 'ausdruck', fvg: 'zum Ausdruck bringen', verb: 'ausdrücken', en: 'to express', ex: 'Er brachte seine Dankbarkeit zum Ausdruck.', exVerb: 'Er drückte seine Dankbarkeit aus.' },
  { id: 'kraft', fvg: 'in Kraft treten', verb: 'gültig werden', en: 'to come into force', ex: 'Das Gesetz tritt am 1. Januar in Kraft.', exVerb: 'Das Gesetz wird am 1. Januar gültig.' },
  { id: 'fragestellen', fvg: 'eine Frage stellen', verb: 'fragen', en: 'to ask a question', ex: 'Darf ich Ihnen eine Frage stellen?', exVerb: 'Darf ich Sie etwas fragen?' },
  { id: 'antrag', fvg: 'einen Antrag stellen', verb: 'beantragen', en: 'to apply for', ex: 'Sie hat einen Antrag auf Elterngeld gestellt.', exVerb: 'Sie hat Elterngeld beantragt.', note: 'What you apply for comes with {auf} + accusative.' },
  { id: 'anspruch', fvg: 'in Anspruch nehmen', verb: 'nutzen', en: 'to make use of', ex: 'Viele Kunden nehmen diesen Service in Anspruch.', exVerb: 'Viele Kunden nutzen diesen Service.' },
];
