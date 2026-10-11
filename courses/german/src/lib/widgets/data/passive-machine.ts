/**
 * Active → passive (and its alternatives), every result written out. In each German string the
 * `{…}` spans are the parts that change; `kind` names each span's role in order, which decides
 * its colour and the step that explains it. The active sentence uses the same kinds, so the
 * object of the active and the subject of the passive share a colour.
 */

export type PassiveTarget = 'praes' | 'praet' | 'perf' | 'plusq' | 'modal' | 'state' | 'man' | 'lassen' | 'zu' | 'bar';

export type PassiveKind =
  | 'subj'
  | 'dat'
  | 'obj'
  | 'man'
  | 'aux'
  | 'sein'
  | 'modal'
  | 'lassen'
  | 'verb'
  | 'part'
  | 'inf'
  | 'zu'
  | 'bar'
  | 'werden'
  | 'worden'
  | 'agent';

export interface PassiveTargetInfo {
  id: PassiveTarget;
  label: string;
  /** Which group of buttons it belongs to. */
  kind: 'tense' | 'state' | 'alt';
  explain: string;
}

export const PASSIVE_TARGETS: PassiveTargetInfo[] = [
  { id: 'praes', label: 'Präsens', kind: 'tense', explain: 'Process passive in the present: {werden} + Partizip II.' },
  { id: 'praet', label: 'Präteritum', kind: 'tense', explain: 'The usual past passive in writing: {wurde} + Partizip II.' },
  { id: 'perf', label: 'Perfekt', kind: 'tense', explain: 'Perfect passive: {ist} + Partizip II + {worden}.' },
  { id: 'plusq', label: 'Plusquamperfekt', kind: 'tense', explain: 'Pluperfect passive: {war} + Partizip II + {worden}.' },
  { id: 'modal', label: 'with a modal', kind: 'tense', explain: 'Modal verb + Partizip II + {werden} (the passive infinitive).' },
  { id: 'state', label: 'Zustandspassiv', kind: 'state', explain: 'The state passive: {sein} + Partizip II describes the result, not the action.' },
  { id: 'man', label: 'man', kind: 'alt', explain: 'An active sentence with {man}: the everyday alternative.' },
  { id: 'lassen', label: 'sich lassen', kind: 'alt', explain: '{sich lassen} + infinitive: it can be done.' },
  { id: 'zu', label: 'sein + zu', kind: 'alt', explain: '{sein} + {zu} + infinitive: it can or must be done.' },
  { id: 'bar', label: '-bar', kind: 'alt', explain: 'An adjective in -bar: it can be done.' },
];

/** What each kind of change means (with overrides by target). */
export const STEP_NOTES: Record<PassiveKind, { label: string; explain: string }> = {
  subj: { label: 'new subject', explain: 'The object of the active sentence becomes the subject, in the nominative. With a der-word you can see it: {den Wagen} → {der Wagen}.' },
  dat: { label: 'dative stays', explain: 'A dative object stays dative. The sentence then has no subject at all, so the verb is always 3rd person singular.' },
  obj: { label: 'object', explain: 'Still the accusative object: this is an active sentence.' },
  man: { label: 'man', explain: '{man} is a vague subject: one, people, they. The doer disappears, just as in a passive without {von}.' },
  aux: { label: 'werden', explain: '{werden} carries the tense and agrees with the subject.' },
  sein: { label: 'sein', explain: '{sein}, not {werden}.' },
  modal: { label: 'modal verb', explain: 'The modal verb carries the tense and agrees with the subject; everything else goes to the end.' },
  lassen: { label: 'sich lassen', explain: '{sich lassen} + infinitive means it can be done. It agrees with the subject: {lässt sich}, {lassen sich}.' },
  verb: { label: 'active verb', explain: 'An ordinary active verb, 3rd person singular to go with {man}.' },
  part: { label: 'Partizip II', explain: 'The main verb becomes its Partizip II and goes to the end of the clause.' },
  inf: { label: 'infinitive', explain: 'The main verb stays an infinitive, at the end.' },
  zu: { label: 'zu + infinitive', explain: '{zu} + infinitive at the end. It means can be done or must be done; context decides.' },
  bar: { label: '-bar adjective', explain: 'Verb stem + -bar makes an adjective meaning “can be …ed”: {reparierbar}, {machbar}, {lesbar}.' },
  werden: { label: 'werden at the end', explain: 'With a modal verb, {werden} stands at the end as an infinitive: Partizip II + {werden} is the passive infinitive.' },
  worden: { label: 'worden', explain: 'In the perfect tenses the participle of {werden} is {worden}, not {geworden}, and it comes last.' },
  agent: { label: 'von + dative', explain: 'The doer, if you want to mention it: {von} + dative ({vom} = {von dem}). Most German passives leave it out.' },
};

export const STEP_OVERRIDES: Partial<Record<PassiveTarget, Partial<Record<PassiveKind, { explain: string }>>>> = {
  praes: { aux: { explain: '{werden} in the present, agreeing with the subject: {wird} (singular), {werden} (plural).' } },
  praet: { aux: { explain: '{werden} in the Präteritum: {wurde} (singular), {wurden} (plural).' } },
  perf: { aux: { explain: 'The perfect of {werden} is made with {sein}: {ist}, {sind}. (With a modal verb it is {haben}: see the note.)' } },
  plusq: { aux: { explain: 'The pluperfect uses the past of {sein}: {war}, {waren}. (With a modal verb: {hatte}.)' } },
  state: { sein: { explain: '{sein}, not {werden}: the state passive describes the result, not the action.' } },
  zu: { sein: { explain: '{sein} + {zu} + infinitive, agreeing with the subject.' } },
  bar: { sein: { explain: '{sein} + the adjective.' } },
};

/** A marked German sentence and the kind of each span. */
export interface Marked {
  de: string;
  kind: PassiveKind[];
}

export interface PassiveResult {
  /** The active sentence for this tense (default: the preset's own). */
  active?: Marked;
  de: string;
  kind: PassiveKind[];
  en: string;
  note?: string;
}

export interface PassiveNone {
  none: true;
  note: string;
}

export interface PassivePreset {
  id: string;
  active: Marked;
  en: string;
  results: Record<PassiveTarget, PassiveResult | PassiveNone>;
}

const T: PassiveKind[] = ['subj', 'aux', 'agent', 'part'];
const P: PassiveKind[] = ['subj', 'aux', 'agent', 'part', 'worden'];
const M: PassiveKind[] = ['subj', 'modal', 'agent', 'part', 'werden'];

export const PASSIVE_PRESETS: PassivePreset[] = [
  {
    id: 'auto',
    active: { de: '{Der Mechaniker} {repariert} {das Auto}.', kind: ['agent', 'part', 'subj'] },
    en: 'The mechanic is repairing the car.',
    results: {
      praes: { de: '{Das Auto} {wird} {vom Mechaniker} {repariert}.', kind: T, en: 'The car is being repaired by the mechanic.' },
      praet: {
        active: { de: '{Der Mechaniker} {reparierte} {das Auto}.', kind: ['agent', 'part', 'subj'] },
        de: '{Das Auto} {wurde} {vom Mechaniker} {repariert}.',
        kind: T,
        en: 'The car was repaired by the mechanic.',
      },
      perf: {
        active: { de: '{Der Mechaniker} {hat} {das Auto} {repariert}.', kind: ['agent', 'aux', 'subj', 'part'] },
        de: '{Das Auto} {ist} {vom Mechaniker} {repariert} {worden}.',
        kind: P,
        en: 'The car has been repaired by the mechanic.',
      },
      plusq: {
        active: { de: '{Der Mechaniker} {hatte} {das Auto} {repariert}.', kind: ['agent', 'aux', 'subj', 'part'] },
        de: '{Das Auto} {war} {vom Mechaniker} {repariert} {worden}.',
        kind: P,
        en: 'The car had been repaired by the mechanic.',
      },
      modal: {
        active: { de: '{Der Mechaniker} {muss} {das Auto} {reparieren}.', kind: ['agent', 'modal', 'subj', 'part'] },
        de: '{Das Auto} {muss} {vom Mechaniker} {repariert} {werden}.',
        kind: M,
        en: 'The car must be repaired by the mechanic.',
      },
      state: {
        de: '{Das Auto} {ist} {repariert}.',
        kind: ['subj', 'sein', 'part'],
        en: 'The car is repaired (it’s fixed now).',
        note: 'Compare the process: {Das Auto wird repariert.} (the work is going on). The state passive rarely names the doer.',
      },
      man: {
        de: '{Man} {repariert} {das Auto}.',
        kind: ['man', 'verb', 'obj'],
        en: 'Someone is repairing the car.',
        note: 'The mechanic disappears: {man} is the everyday way to avoid naming the doer, especially in speech.',
      },
      lassen: {
        de: '{Das Auto} {lässt sich} {reparieren}.',
        kind: ['subj', 'lassen', 'inf'],
        en: 'The car can be repaired.',
        note: 'Same meaning as {Das Auto kann repariert werden.}',
      },
      zu: {
        de: '{Das Auto} {ist} {zu reparieren}.',
        kind: ['subj', 'sein', 'zu'],
        en: 'The car can be repaired (or: has to be repaired).',
        note: 'Ambiguous on its own: {Das Auto ist noch zu reparieren} = it can still be repaired; {Das Auto ist bis Freitag zu reparieren} = it must be repaired by Friday.',
      },
      bar: {
        de: '{Das Auto} {ist} {reparierbar}.',
        kind: ['subj', 'sein', 'bar'],
        en: 'The car is repairable.',
        note: '{reparieren} → {reparierbar}: the -ieren verb keeps its stem.',
      },
    },
  },
  {
    id: 'stadion',
    active: { de: '{Man} {baut} hier {ein neues Stadion}.', kind: ['man', 'part', 'subj'] },
    en: 'They are building a new stadium here.',
    results: {
      praes: {
        de: 'Hier {wird} {ein neues Stadion} {gebaut}.',
        kind: ['aux', 'subj', 'part'],
        en: 'A new stadium is being built here.',
        note: '{man} has no counterpart in the passive: it simply disappears. {Hier} stays in position 1, so the subject comes after the verb.',
      },
      praet: {
        active: { de: '{Man} {baute} hier {ein neues Stadion}.', kind: ['man', 'part', 'subj'] },
        de: 'Hier {wurde} {ein neues Stadion} {gebaut}.',
        kind: ['aux', 'subj', 'part'],
        en: 'A new stadium was built here.',
      },
      perf: {
        active: { de: '{Man} {hat} hier {ein neues Stadion} {gebaut}.', kind: ['man', 'aux', 'subj', 'part'] },
        de: 'Hier {ist} {ein neues Stadion} {gebaut} {worden}.',
        kind: ['aux', 'subj', 'part', 'worden'],
        en: 'A new stadium has been built here.',
      },
      plusq: {
        active: { de: '{Man} {hatte} hier {ein neues Stadion} {gebaut}.', kind: ['man', 'aux', 'subj', 'part'] },
        de: 'Hier {war} {ein neues Stadion} {gebaut} {worden}.',
        kind: ['aux', 'subj', 'part', 'worden'],
        en: 'A new stadium had been built here.',
      },
      modal: {
        active: { de: '{Man} {kann} hier {ein neues Stadion} {bauen}.', kind: ['man', 'modal', 'subj', 'part'] },
        de: 'Hier {kann} {ein neues Stadion} {gebaut} {werden}.',
        kind: ['modal', 'subj', 'part', 'werden'],
        en: 'A new stadium can be built here.',
      },
      state: {
        de: '{Das neue Stadion} {ist} schon {gebaut}.',
        kind: ['subj', 'sein', 'part'],
        en: 'The new stadium has already been built (it’s finished).',
        note: 'Once it exists it is {das neue Stadion}. The state passive describes the finished result.',
      },
      man: { none: true, note: 'This sentence already uses {man}: it is the active alternative to {Hier wird ein neues Stadion gebaut.}' },
      lassen: {
        de: 'Hier {lässt sich} {ein neues Stadion} {bauen}.',
        kind: ['lassen', 'subj', 'inf'],
        en: 'A new stadium can be built here (there is room for one).',
      },
      zu: { none: true, note: 'Grammatical, but {Hier ist ein neues Stadion zu bauen} sounds like an official order. {sein + zu} belongs in rules and instructions.' },
      bar: { none: true, note: 'No everyday adjective here. -bar needs a verb whose object can have that quality: {reparierbar}, {lesbar}, {machbar}.' },
    },
  },
  {
    id: 'rechnung',
    active: { de: '{Die Firma} {muss} {die Rechnung} {bezahlen}.', kind: ['agent', 'modal', 'subj', 'part'] },
    en: 'The company has to pay the bill.',
    results: {
      praes: { de: '{Die Rechnung} {muss} {von der Firma} {bezahlt} {werden}.', kind: M, en: 'The bill must be paid by the company.' },
      praet: {
        active: { de: '{Die Firma} {musste} {die Rechnung} {bezahlen}.', kind: ['agent', 'modal', 'subj', 'part'] },
        de: '{Die Rechnung} {musste} {von der Firma} {bezahlt} {werden}.',
        kind: M,
        en: 'The bill had to be paid by the company.',
      },
      perf: {
        active: { de: '{Die Firma} {hat} {die Rechnung} {bezahlen} {müssen}.', kind: ['agent', 'aux', 'subj', 'part', 'modal'] },
        de: '{Die Rechnung} {hat} {von der Firma} {bezahlt} {werden} {müssen}.',
        kind: ['subj', 'aux', 'agent', 'part', 'werden', 'modal'],
        en: 'The bill has had to be paid by the company.',
        note: 'Correct, but heavy: with a modal verb the perfect takes {haben} and ends in a double infinitive ({werden müssen}). In practice people use the Präteritum: {Die Rechnung musste bezahlt werden.}',
      },
      plusq: {
        active: { de: '{Die Firma} {hatte} {die Rechnung} {bezahlen} {müssen}.', kind: ['agent', 'aux', 'subj', 'part', 'modal'] },
        de: '{Die Rechnung} {hatte} {von der Firma} {bezahlt} {werden} {müssen}.',
        kind: ['subj', 'aux', 'agent', 'part', 'werden', 'modal'],
        en: 'The bill had had to be paid by the company.',
        note: 'Grammatical but rare: with a modal verb the pluperfect takes {hatte} and a double infinitive.',
      },
      modal: { none: true, note: 'This sentence already has a modal verb ({muss}): see Präsens.' },
      state: {
        de: '{Die Rechnung} {ist} {bezahlt}.',
        kind: ['subj', 'sein', 'part'],
        en: 'The bill is paid.',
        note: 'The obligation has gone: the state passive only says how things are now.',
      },
      man: {
        de: '{Man} {muss} {die Rechnung} {bezahlen}.',
        kind: ['man', 'modal', 'obj', 'inf'],
        en: 'The bill has to be paid.',
        note: 'With {man}, the company is no longer mentioned.',
      },
      lassen: { none: true, note: '{sich lassen} expresses possibility, not obligation: {Die Rechnung lässt sich bezahlen} would mean the bill can be paid.' },
      zu: {
        de: '{Die Rechnung} {ist} {von der Firma} {zu bezahlen}.',
        kind: ['subj', 'sein', 'agent', 'zu'],
        en: 'The bill is to be paid by the company.',
        note: 'The official way to say must be done, typical of letters and rules: {Die Rechnung ist bis zum 15. März zu bezahlen.}',
      },
      bar: {
        de: '{Die Rechnung} {ist} {bezahlbar}.',
        kind: ['subj', 'sein', 'bar'],
        en: 'The bill is affordable.',
        note: 'Grammatical, but it means affordable (it can be paid), not must be paid: -bar only ever expresses possibility.',
      },
    },
  },
  {
    id: 'schwimmbad',
    active: { de: '{Die Stadt} {schließt} {das Schwimmbad} im Winter.', kind: ['agent', 'part', 'subj'] },
    en: 'The town closes the swimming pool in winter.',
    results: {
      praes: { de: '{Das Schwimmbad} {wird} im Winter {von der Stadt} {geschlossen}.', kind: T, en: 'The swimming pool is closed by the town in winter.' },
      praet: {
        active: { de: '{Die Stadt} {schloss} {das Schwimmbad} im Winter.', kind: ['agent', 'part', 'subj'] },
        de: '{Das Schwimmbad} {wurde} im Winter {von der Stadt} {geschlossen}.',
        kind: T,
        en: 'The swimming pool was closed by the town in winter.',
      },
      perf: {
        active: { de: '{Die Stadt} {hat} {das Schwimmbad} im Winter {geschlossen}.', kind: ['agent', 'aux', 'subj', 'part'] },
        de: '{Das Schwimmbad} {ist} im Winter {von der Stadt} {geschlossen} {worden}.',
        kind: P,
        en: 'The swimming pool was closed by the town in winter (spoken past).',
      },
      plusq: {
        active: { de: '{Die Stadt} {hatte} {das Schwimmbad} im Winter {geschlossen}.', kind: ['agent', 'aux', 'subj', 'part'] },
        de: '{Das Schwimmbad} {war} im Winter {von der Stadt} {geschlossen} {worden}.',
        kind: P,
        en: 'The swimming pool had been closed by the town in winter.',
      },
      modal: {
        active: { de: '{Die Stadt} {muss} {das Schwimmbad} im Winter {schließen}.', kind: ['agent', 'modal', 'subj', 'part'] },
        de: '{Das Schwimmbad} {muss} im Winter {von der Stadt} {geschlossen} {werden}.',
        kind: M,
        en: 'The swimming pool has to be closed by the town in winter.',
      },
      state: {
        de: '{Das Schwimmbad} {ist} im Winter {geschlossen}.',
        kind: ['subj', 'sein', 'part'],
        en: 'The swimming pool is closed in winter.',
        note: 'The sign on the door: a state. Compare the action: {Das Schwimmbad wird um 20 Uhr geschlossen.} (someone closes it at eight).',
      },
      man: {
        de: '{Man} {schließt} {das Schwimmbad} im Winter.',
        kind: ['man', 'verb', 'obj'],
        en: 'They close the swimming pool in winter.',
      },
      lassen: { none: true, note: '{Das Schwimmbad lässt sich schließen} would mean it can be closed, which says nothing about the town’s decision.' },
      zu: { none: true, note: '{Das Schwimmbad ist im Winter zu schließen} reads like an instruction in a regulation (it must be closed): possible there, odd here.' },
      bar: { none: true, note: '{schließbar} exists (lockable), but it describes a door or a box, not the town’s decision.' },
    },
  },
  {
    id: 'nachbarn',
    active: { de: '{Die Nachbarn} {helfen} {den alten Leuten}.', kind: ['agent', 'part', 'dat'] },
    en: 'The neighbours help the old people.',
    results: {
      praes: {
        de: '{Den alten Leuten} {wird} {von den Nachbarn} {geholfen}.',
        kind: ['dat', 'aux', 'agent', 'part'],
        en: 'The old people are helped by the neighbours.',
        note: '{helfen} takes the dative, and a dative stays dative in the passive. There is no subject, so the verb is singular: {wird}, never {werden}.',
      },
      praet: {
        active: { de: '{Die Nachbarn} {halfen} {den alten Leuten}.', kind: ['agent', 'part', 'dat'] },
        de: '{Den alten Leuten} {wurde} {von den Nachbarn} {geholfen}.',
        kind: ['dat', 'aux', 'agent', 'part'],
        en: 'The old people were helped by the neighbours.',
      },
      perf: {
        active: { de: '{Die Nachbarn} {haben} {den alten Leuten} {geholfen}.', kind: ['agent', 'aux', 'dat', 'part'] },
        de: '{Den alten Leuten} {ist} {von den Nachbarn} {geholfen} {worden}.',
        kind: ['dat', 'aux', 'agent', 'part', 'worden'],
        en: 'The old people have been helped by the neighbours.',
      },
      plusq: {
        active: { de: '{Die Nachbarn} {hatten} {den alten Leuten} {geholfen}.', kind: ['agent', 'aux', 'dat', 'part'] },
        de: '{Den alten Leuten} {war} {von den Nachbarn} {geholfen} {worden}.',
        kind: ['dat', 'aux', 'agent', 'part', 'worden'],
        en: 'The old people had been helped by the neighbours.',
      },
      modal: {
        active: { de: '{Die Nachbarn} {sollen} {den alten Leuten} {helfen}.', kind: ['agent', 'modal', 'dat', 'part'] },
        de: '{Den alten Leuten} {soll} {von den Nachbarn} {geholfen} {werden}.',
        kind: ['dat', 'modal', 'agent', 'part', 'werden'],
        en: 'The old people are to be helped by the neighbours.',
        note: 'Plural {sollen} becomes singular {soll}: there is no subject to agree with.',
      },
      state: { none: true, note: 'No state passive: {helfen} has no accusative object that could end up in a new state.' },
      man: {
        de: '{Man} {hilft} {den alten Leuten}.',
        kind: ['man', 'verb', 'dat'],
        en: 'The old people get help.',
      },
      lassen: { none: true, note: '{sich lassen} needs an accusative object to become the subject; {helfen} only has a dative.' },
      zu: { none: true, note: '{sein + zu} needs an accusative object to become the subject; {helfen} only has a dative.' },
      bar: { none: true, note: 'There is no -bar adjective from {helfen}: -bar is formed from verbs with an accusative object.' },
    },
  },
];
