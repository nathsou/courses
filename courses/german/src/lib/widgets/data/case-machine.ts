/**
 * CaseMachine: nouns, verbs and preset sentences. Nouns are declined by $lib/de/declension;
 * `kind` says whether a noun is a person or animal ("anim") or a thing.
 */
type Gender = 'm' | 'f' | 'n' | 'pl';

export interface CaseNoun {
  id: string;
  sg: string;
  g: Gender;
  pl?: string;
  /** n-declension (der Nachbar, den Nachbarn). */
  weak?: boolean;
  kind: 'anim' | 'thing';
  en: string;
}

export type ObjectRole = 'acc' | 'dat';

export interface CaseVerb {
  id: string;
  /** Infinitive, third person singular and plural. */
  de: string;
  sg: string;
  pl: string;
  /** Objects in their normal order after the verb (dative before accusative). */
  objects: ObjectRole[];
  /** What may fill each role. */
  subject: 'anim' | 'thing';
  acc?: 'anim' | 'thing' | 'any';
  dat?: 'anim';
  /** English: third person singular and plural, and how the objects follow. */
  en: string;
  enPl: string;
  /** English pattern: S, V, D (dative), A (accusative). */
  pattern: string;
  note?: string;
}

export const CASE_NOUNS: CaseNoun[] = [
  { id: 'dog', sg: 'Hund', g: 'm', pl: 'Hunde', kind: 'anim', en: 'dog' },
  { id: 'man', sg: 'Mann', g: 'm', pl: 'Männer', kind: 'anim', en: 'man' },
  { id: 'neighbour', sg: 'Nachbar', g: 'm', pl: 'Nachbarn', weak: true, kind: 'anim', en: 'neighbour' },
  { id: 'teacher', sg: 'Lehrerin', g: 'f', pl: 'Lehrerinnen', kind: 'anim', en: 'teacher' },
  { id: 'woman', sg: 'Frau', g: 'f', pl: 'Frauen', kind: 'anim', en: 'woman' },
  { id: 'cat', sg: 'Katze', g: 'f', pl: 'Katzen', kind: 'anim', en: 'cat' },
  { id: 'child', sg: 'Kind', g: 'n', pl: 'Kinder', kind: 'anim', en: 'child' },
  { id: 'children', sg: 'Kinder', g: 'pl', kind: 'anim', en: 'children' },
  { id: 'ball', sg: 'Ball', g: 'm', pl: 'Bälle', kind: 'thing', en: 'ball' },
  { id: 'apple', sg: 'Apfel', g: 'm', pl: 'Äpfel', kind: 'thing', en: 'apple' },
  { id: 'flower', sg: 'Blume', g: 'f', pl: 'Blumen', kind: 'thing', en: 'flower' },
  { id: 'book', sg: 'Buch', g: 'n', pl: 'Bücher', kind: 'thing', en: 'book' },
  { id: 'photo', sg: 'Foto', g: 'n', pl: 'Fotos', kind: 'thing', en: 'photo' },
  { id: 'flowers', sg: 'Blumen', g: 'pl', kind: 'thing', en: 'flowers' },
];

export const CASE_VERBS: CaseVerb[] = [
  { id: 'see', de: 'sehen', sg: 'sieht', pl: 'sehen', objects: ['acc'], subject: 'anim', acc: 'any', en: 'sees', enPl: 'see', pattern: 'S V A' },
  { id: 'bite', de: 'beißen', sg: 'beißt', pl: 'beißen', objects: ['acc'], subject: 'anim', acc: 'anim', en: 'bites', enPl: 'bite', pattern: 'S V A' },
  { id: 'look', de: 'suchen', sg: 'sucht', pl: 'suchen', objects: ['acc'], subject: 'anim', acc: 'any', en: 'is looking for', enPl: 'are looking for', pattern: 'S V A' },
  { id: 'give', de: 'geben', sg: 'gibt', pl: 'geben', objects: ['dat', 'acc'], subject: 'anim', dat: 'anim', acc: 'thing', en: 'gives', enPl: 'give', pattern: 'S V D A' },
  { id: 'present', de: 'schenken', sg: 'schenkt', pl: 'schenken', objects: ['dat', 'acc'], subject: 'anim', dat: 'anim', acc: 'thing', en: 'gives', enPl: 'give', pattern: 'S V D A as a present' },
  { id: 'show', de: 'zeigen', sg: 'zeigt', pl: 'zeigen', objects: ['dat', 'acc'], subject: 'anim', dat: 'anim', acc: 'thing', en: 'shows', enPl: 'show', pattern: 'S V D A' },
  {
    id: 'help',
    de: 'helfen',
    sg: 'hilft',
    pl: 'helfen',
    objects: ['dat'],
    subject: 'anim',
    dat: 'anim',
    en: 'helps',
    enPl: 'help',
    pattern: 'S V D',
    note: '{helfen} takes the dative, although English “help” has a direct object.',
  },
  {
    id: 'belong',
    de: 'gehören',
    sg: 'gehört',
    pl: 'gehören',
    objects: ['dat'],
    subject: 'thing',
    dat: 'anim',
    en: 'belongs to',
    enPl: 'belong to',
    pattern: 'S V D',
    note: 'With {gehören} the thing is the subject and the owner is in the dative.',
  },
];

/** Presets the widget offers as buttons. */
export const CASE_PRESETS = [
  { id: 'bite', label: 'Man bites dog', verb: 'bite', nom: 'dog', acc: 'man', de: 'Der Hund beißt den Mann.', en: 'The dog bites the man.' },
  { id: 'give', label: 'A present', verb: 'give', nom: 'man', dat: 'child', acc: 'ball', de: 'Der Mann gibt dem Kind den Ball.', en: 'The man gives the child the ball.' },
  { id: 'help', label: 'helfen + dative', verb: 'help', nom: 'teacher', dat: 'children', de: 'Die Lehrerin hilft den Kindern.', en: 'The teacher helps the children.' },
] as const;

/** Fixed sentences the widget explains with. */
export const CASE_EXAMPLES = {
  bite: { de: 'Der Hund beißt den Mann.', en: 'The dog bites the man.' },
  biteFront: { de: 'Den Mann beißt der Hund.', en: 'The dog bites the man (it is the man the dog bites).' },
  manBites: { de: 'Der Mann beißt den Hund.', en: 'The man bites the dog.' },
  ball: { de: 'Den Ball gibt der Mann dem Kind.', en: 'The man gives the child the ball (the ball, not something else).' },
};
