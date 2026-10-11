/**
 * Relative pronouns: one sentence for every antecedent and every role the pronoun can play in
 * its own clause. In `de`, span 0 is the relative pronoun (with its preposition) and span 1 the
 * verb at the end of the relative clause.
 */

export type RelGender = 'm' | 'f' | 'n' | 'pl';
export type RelCase = 'nom' | 'acc' | 'dat' | 'gen';

export interface RelNoun {
  id: RelGender;
  de: string;
  en: string;
}

export const REL_NOUNS: RelNoun[] = [
  { id: 'm', de: 'der Mann', en: 'the man' },
  { id: 'f', de: 'die Frau', en: 'the woman' },
  { id: 'n', de: 'das Kind', en: 'the child' },
  { id: 'pl', de: 'die Leute', en: 'the people' },
];

export interface RelRole {
  id: string;
  /** The case the pronoun takes. */
  kind: RelCase;
  label: string;
  explain: string;
}

export const REL_ROLES: RelRole[] = [
  {
    id: 'subj',
    kind: 'nom',
    label: 'subject',
    explain: 'The pronoun is the subject of its own clause (who lives there?), so it is **nominative**.',
  },
  {
    id: 'acc',
    kind: 'acc',
    label: 'accusative object',
    explain: 'The pronoun is the direct object of {sehen} (I saw whom?), so it is **accusative**. Only the masculine changes: {der} → {den}.',
  },
  {
    id: 'dat',
    kind: 'dat',
    label: 'dative object',
    explain: '{helfen} takes the dative (I helped whom?), so the pronoun is **dative**. Note the plural {denen}: longer than the article {den}.',
  },
  {
    id: 'gen',
    kind: 'gen',
    label: 'whose (genitive)',
    explain: 'Whose dog? **{dessen}** for der- and das-words, **{deren}** for die-words and plurals. They never change for the noun after them: {dessen Hund}, {dessen Katze}, {dessen Kinder}.',
  },
  {
    id: 'pmit',
    kind: 'dat',
    label: 'after mit (+ dative)',
    explain: 'The preposition comes first and decides the case: {mit} always takes the dative. English can leave the preposition at the end ("the man I play chess with"); German never can.',
  },
  {
    id: 'pfuer',
    kind: 'acc',
    label: 'after für (+ accusative)',
    explain: '{für} always takes the accusative, so the pronoun is accusative, and it stands right after the preposition at the start of the clause.',
  },
  {
    id: 'pvon',
    kind: 'dat',
    label: 'after von (+ dative)',
    explain: '{von} takes the dative: {von dem}, {von der}, {von denen}. "The man I told you about" = {der Mann, von dem ich dir erzählt habe}.',
  },
];

export interface RelSentence {
  noun: RelGender;
  role: string;
  /** Span 0: the relative pronoun (with any preposition); span 1: the verb at the end. */
  de: string;
  en: string;
}

export const REL_SENTENCES: RelSentence[] = [
  { noun: 'm', role: 'subj', de: 'Das ist der Mann, {der} neben uns {wohnt}.', en: 'That’s the man who lives next door to us.' },
  { noun: 'm', role: 'acc', de: 'Das ist der Mann, {den} ich gestern im Bus {gesehen habe}.', en: 'That’s the man (whom) I saw on the bus yesterday.' },
  { noun: 'm', role: 'dat', de: 'Das ist der Mann, {dem} ich gestern {geholfen habe}.', en: 'That’s the man I helped yesterday.' },
  { noun: 'm', role: 'gen', de: 'Das ist der Mann, {dessen} Hund immer {bellt}.', en: 'That’s the man whose dog is always barking.' },
  { noun: 'm', role: 'pmit', de: 'Das ist der Mann, {mit dem} ich oft Schach {spiele}.', en: 'That’s the man I often play chess with.' },
  { noun: 'm', role: 'pfuer', de: 'Das ist der Mann, {für den} ich ein Geschenk {gekauft habe}.', en: 'That’s the man I bought a present for.' },
  { noun: 'm', role: 'pvon', de: 'Das ist der Mann, {von dem} ich dir {erzählt habe}.', en: 'That’s the man I told you about.' },

  { noun: 'f', role: 'subj', de: 'Das ist die Frau, {die} neben uns {wohnt}.', en: 'That’s the woman who lives next door to us.' },
  { noun: 'f', role: 'acc', de: 'Das ist die Frau, {die} ich gestern im Bus {gesehen habe}.', en: 'That’s the woman I saw on the bus yesterday.' },
  { noun: 'f', role: 'dat', de: 'Das ist die Frau, {der} ich gestern {geholfen habe}.', en: 'That’s the woman I helped yesterday.' },
  { noun: 'f', role: 'gen', de: 'Das ist die Frau, {deren} Hund immer {bellt}.', en: 'That’s the woman whose dog is always barking.' },
  { noun: 'f', role: 'pmit', de: 'Das ist die Frau, {mit der} ich oft Schach {spiele}.', en: 'That’s the woman I often play chess with.' },
  { noun: 'f', role: 'pfuer', de: 'Das ist die Frau, {für die} ich ein Geschenk {gekauft habe}.', en: 'That’s the woman I bought a present for.' },
  { noun: 'f', role: 'pvon', de: 'Das ist die Frau, {von der} ich dir {erzählt habe}.', en: 'That’s the woman I told you about.' },

  { noun: 'n', role: 'subj', de: 'Das ist das Kind, {das} neben uns {wohnt}.', en: 'That’s the child who lives next door to us.' },
  { noun: 'n', role: 'acc', de: 'Das ist das Kind, {das} ich gestern im Bus {gesehen habe}.', en: 'That’s the child I saw on the bus yesterday.' },
  { noun: 'n', role: 'dat', de: 'Das ist das Kind, {dem} ich gestern {geholfen habe}.', en: 'That’s the child I helped yesterday.' },
  { noun: 'n', role: 'gen', de: 'Das ist das Kind, {dessen} Hund immer {bellt}.', en: 'That’s the child whose dog is always barking.' },
  { noun: 'n', role: 'pmit', de: 'Das ist das Kind, {mit dem} ich oft Schach {spiele}.', en: 'That’s the child I often play chess with.' },
  { noun: 'n', role: 'pfuer', de: 'Das ist das Kind, {für das} ich ein Geschenk {gekauft habe}.', en: 'That’s the child I bought a present for.' },
  { noun: 'n', role: 'pvon', de: 'Das ist das Kind, {von dem} ich dir {erzählt habe}.', en: 'That’s the child I told you about.' },

  { noun: 'pl', role: 'subj', de: 'Das sind die Leute, {die} neben uns {wohnen}.', en: 'Those are the people who live next door to us.' },
  { noun: 'pl', role: 'acc', de: 'Das sind die Leute, {die} ich gestern im Bus {gesehen habe}.', en: 'Those are the people I saw on the bus yesterday.' },
  { noun: 'pl', role: 'dat', de: 'Das sind die Leute, {denen} ich gestern {geholfen habe}.', en: 'Those are the people I helped yesterday.' },
  { noun: 'pl', role: 'gen', de: 'Das sind die Leute, {deren} Hund immer {bellt}.', en: 'Those are the people whose dog is always barking.' },
  { noun: 'pl', role: 'pmit', de: 'Das sind die Leute, {mit denen} ich oft Schach {spiele}.', en: 'Those are the people I often play chess with.' },
  { noun: 'pl', role: 'pfuer', de: 'Das sind die Leute, {für die} ich ein Geschenk {gekauft habe}.', en: 'Those are the people I bought a present for.' },
  { noun: 'pl', role: 'pvon', de: 'Das sind die Leute, {von denen} ich dir {erzählt habe}.', en: 'Those are the people I told you about.' },
];

/** The relative pronouns by case and gender. */
export const REL_TABLE: Record<RelCase, Record<RelGender, string>> = {
  nom: { m: 'der', f: 'die', n: 'das', pl: 'die' },
  acc: { m: 'den', f: 'die', n: 'das', pl: 'die' },
  dat: { m: 'dem', f: 'der', n: 'dem', pl: 'denen' },
  gen: { m: 'dessen', f: 'deren', n: 'dessen', pl: 'deren' },
};

/** The definite article, to show where the relative pronoun differs from it. */
export const ARTICLE_TABLE: Record<RelCase, Record<RelGender, string>> = {
  nom: { m: 'der', f: 'die', n: 'das', pl: 'die' },
  acc: { m: 'den', f: 'die', n: 'das', pl: 'die' },
  dat: { m: 'dem', f: 'der', n: 'dem', pl: 'den' },
  gen: { m: 'des', f: 'der', n: 'des', pl: 'der' },
};

export const REL_OPTIONS = ['der', 'den', 'dem', 'dessen', 'die', 'deren', 'das', 'denen'];

export interface RelQuizItem {
  de: string;
  answer: string;
  en: string;
  explain: string;
}

export const REL_QUIZ: RelQuizItem[] = [
  { de: 'Der Zug, ___ um acht abfährt, ist immer voll.', answer: 'der', en: 'The train that leaves at eight is always full.', explain: '{der Zug}, subject of {abfahren}: nominative masculine.' },
  { de: 'Die Wohnung, ___ wir gemietet haben, ist sehr hell.', answer: 'die', en: 'The flat we have rented is very bright.', explain: '{die Wohnung}, object of {mieten}: accusative feminine looks like the nominative.' },
  { de: 'Das ist der Kollege, ___ ich die Unterlagen geschickt habe.', answer: 'dem', en: 'That’s the colleague I sent the documents to.', explain: 'You send something **to** someone: the person is dative, {dem} for {der Kollege}.' },
  { de: 'Die Nachbarn, ___ Kinder so laut sind, sind eigentlich sehr nett.', answer: 'deren', en: 'The neighbours whose children are so loud are actually very nice.', explain: 'Whose children? Plural antecedent: {deren}.' },
  { de: 'Kennst du das Café, in ___ wir uns kennengelernt haben?', answer: 'dem', en: 'Do you know the café where we met?', explain: '{in} + dative for a place (where?): {in dem}. You can also say {wo}: {das Café, wo wir uns kennengelernt haben}.' },
  { de: 'Wo ist das Buch, ___ du mir leihen wolltest?', answer: 'das', en: 'Where is the book you wanted to lend me?', explain: '{das Buch}, object of {leihen}: accusative neuter {das}.' },
  { de: 'Die Freunde, mit ___ ich in Urlaub fahre, kommen aus Graz.', answer: 'denen', en: 'The friends I’m going on holiday with come from Graz.', explain: '{mit} + dative plural: {denen}, not {den}.' },
  { de: 'Der Film, über ___ alle sprechen, läuft ab Donnerstag.', answer: 'den', en: 'The film everyone is talking about is on from Thursday.', explain: '{sprechen über} + accusative: {über den Film} → {über den}.' },
  { de: 'Das ist die Ärztin, ___ Praxis am Marktplatz liegt.', answer: 'deren', en: 'That’s the doctor whose practice is on the market square.', explain: 'Whose practice? Feminine antecedent: {deren}.' },
  { de: 'Der Junge, ___ ich den Weg gezeigt habe, war sehr dankbar.', answer: 'dem', en: 'The boy I showed the way to was very grateful.', explain: 'You show the way **to** someone: dative {dem}. ({den Weg} is the accusative object.)' },
  { de: 'Das Kind, ___ Eltern im Ausland arbeiten, wohnt bei seiner Oma.', answer: 'dessen', en: 'The child whose parents work abroad lives with their grandmother.', explain: 'Whose parents? Neuter antecedent: {dessen}, whatever comes after it.' },
  { de: 'Die Leute, ___ wir im Urlaub getroffen haben, besuchen uns im Sommer.', answer: 'die', en: 'The people we met on holiday are visiting us in the summer.', explain: 'Plural, object of {treffen}: accusative {die}.' },
];

/** The quiz sentences with the gap filled, as spoken after an answer (for the audio collector). */
export const REL_QUIZ_SPOKEN = REL_QUIZ.map((q) => q.de.replace('___', q.answer));
