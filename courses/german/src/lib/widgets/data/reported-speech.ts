/**
 * Direct → indirect speech. `direct` and `indirect` mark the pieces that change with `{…}`;
 * `dm` and `im` give, for each span in order, the index of the change in `changes` it belongs to.
 */

export type ChangeKind = 'pron' | 'k1' | 'k2' | 'wuerde' | 'time' | 'conn' | 'cmd' | 'past';

export interface Change {
  kind: ChangeKind;
  label: string;
  note: string;
}

export interface Report {
  id: string;
  direct: string;
  dm: number[];
  indirect: string;
  im: number[];
  en: string;
  changes: Change[];
}

export const CHANGE_NAMES: Record<ChangeKind, { label: string }> = {
  pron: { label: 'pronoun' },
  k1: { label: 'Konjunktiv I' },
  k2: { label: 'Konjunktiv II instead' },
  wuerde: { label: 'würde instead' },
  time: { label: 'time word' },
  conn: { label: 'question → clause' },
  cmd: { label: 'command → sollen' },
  past: { label: 'past' },
};

export const REPORTS: Report[] = [
  {
    id: 'zeit',
    direct: 'Der Minister sagt: „{Wir} {haben} keine Zeit.“',
    dm: [0, 1],
    indirect: 'Der Minister sagt, {sie} {hätten} keine Zeit.',
    im: [0, 1],
    en: 'The minister says they have no time.',
    changes: [
      { kind: 'pron', label: '{wir} → {sie}', note: 'The speaker’s “we” is “they” from the reporter’s point of view.' },
      { kind: 'k2', label: '{haben} → {hätten}', note: 'Konjunktiv I would be {sie haben}, exactly like the indicative, so Konjunktiv II {hätten} takes over.' },
    ],
  },
  {
    id: 'morgen',
    direct: 'Der Minister sagte: „{Ich} {komme} {morgen}.“',
    dm: [0, 1, 2],
    indirect: 'Der Minister sagte, {er} {komme} {am nächsten Tag}.',
    im: [0, 1, 2],
    en: 'The minister said he would come the next day.',
    changes: [
      { kind: 'pron', label: '{ich} → {er}', note: 'The speaker is now talked about in the 3rd person.' },
      { kind: 'k1', label: '{er kommt} → {er komme}', note: 'Konjunktiv I is the stem + -e. In the 3rd person singular it differs from the indicative {kommt}, so it is used. The tense of {sagte} changes nothing: German does not “backshift” like English.' },
      { kind: 'time', label: '{morgen} → {am nächsten Tag}', note: 'Reported later, “tomorrow” no longer means tomorrow: {am nächsten Tag} or {am folgenden Tag}. Likewise {heute} → {an diesem Tag}, {hier} → {dort}.' },
    ],
  },
  {
    id: 'lage',
    direct: 'Die Ministerin betont: „Die Lage {ist} ernst.“',
    dm: [0],
    indirect: 'Die Ministerin betont, die Lage {sei} ernst.',
    im: [0],
    en: 'The minister stresses that the situation is serious.',
    changes: [
      { kind: 'k1', label: '{ist} → {sei}', note: '{sein} has the clearest Konjunktiv I: {ich sei, du seist, er sei, wir seien, ihr seiet, sie seien}. You will hear {sei} in every news bulletin.' },
    ],
  },
  {
    id: 'frage',
    direct: 'Lena fragt Jonas: „{Hast} {du} Zeit?“',
    dm: [2, 1],
    indirect: 'Lena fragt Jonas, {ob} {er} Zeit {habe}.',
    im: [0, 1, 2],
    en: 'Lena asks Jonas whether he has time.',
    changes: [
      { kind: 'conn', label: '{ob}', note: 'A yes/no question is reported with {ob} (whether), and the verb goes to the end.' },
      { kind: 'pron', label: '{du} → {er}', note: 'Jonas is now talked about, not talked to.' },
      { kind: 'k1', label: '{hast} → {habe}', note: 'Konjunktiv I {er habe} differs from the indicative {er hat}, so it is used. In conversation you will also hear {ob er Zeit hat}.' },
    ],
  },
  {
    id: 'wann',
    direct: 'Der Journalist fragt: „{Wann} {beginnt} die Reform?“',
    dm: [0, 1],
    indirect: 'Der Journalist fragt, {wann} die Reform {beginne}.',
    im: [0, 1],
    en: 'The journalist asks when the reform will begin.',
    changes: [
      { kind: 'conn', label: '{wann}', note: 'A W-question keeps its question word, which now introduces a subordinate clause: the verb goes to the end.' },
      { kind: 'k1', label: '{beginnt} → {beginne}', note: 'Konjunktiv I, 3rd person singular: stem + -e.' },
    ],
  },
  {
    id: 'anrufen',
    direct: 'Lena sagt zu Jonas: „{Ruf} {mich} {an}!“',
    dm: [0, 1, 0],
    indirect: 'Lena sagt zu Jonas, {er} {solle} {sie} {anrufen}.',
    im: [2, 0, 1, 0],
    en: 'Lena tells Jonas to call her.',
    changes: [
      { kind: 'cmd', label: '{Ruf … an!} → {solle … anrufen}', note: 'A command is reported with {sollen} in Konjunktiv I, and the verb returns to the infinitive at the end. (A polite request can take {mögen}: {er möge sie anrufen}, very formal.)' },
      { kind: 'pron', label: '{mich} → {sie}', note: 'Lena calls herself “me”; reported, she is {sie}.' },
      { kind: 'pron', label: '(du) → {er}', note: 'The person addressed, Jonas, becomes the subject {er}.' },
    ],
  },
  {
    id: 'preise',
    direct: 'Die Experten erklären: „Die Preise {steigen} weiter.“',
    dm: [0],
    indirect: 'Die Experten erklären, die Preise {würden} weiter {steigen}.',
    im: [0, 0],
    en: 'The experts explain that prices will keep rising.',
    changes: [
      { kind: 'wuerde', label: '{steigen} → {würden steigen}', note: 'Konjunktiv I {sie steigen} looks like the indicative, and Konjunktiv II {stiegen} looks like the past tense. When both fail, use {würde} + infinitive.' },
    ],
  },
  {
    id: 'bericht',
    direct: 'Der Minister sagt: „{Ich} {habe} den Bericht {gelesen}.“',
    dm: [0, 1, 1],
    indirect: 'Der Minister sagt, {er} {habe} den Bericht {gelesen}.',
    im: [0, 1, 1],
    en: 'The minister says he has read the report.',
    changes: [
      { kind: 'pron', label: '{ich} → {er}', note: 'The speaker is now talked about in the 3rd person.' },
      { kind: 'past', label: '{er hat gelesen} → {er habe gelesen}', note: 'The past in indirect speech: Konjunktiv I of {haben} or {sein} + Partizip II. {er habe} differs from {er hat}, so it can be used.' },
    ],
  },
  {
    id: 'taeter',
    direct: 'Die Polizei teilt mit: „Der Täter {war} allein.“',
    dm: [0],
    indirect: 'Die Polizei teilt mit, der Täter {sei} allein {gewesen}.',
    im: [0, 0],
    en: 'The police report that the offender was alone.',
    changes: [
      { kind: 'past', label: '{war} → {sei … gewesen}', note: 'Indirect speech has only one past: Präteritum, Perfekt and Plusquamperfekt all become {sei} or {habe} + Partizip II.' },
    ],
  },
  {
    id: 'stellen',
    direct: 'Die Firma kündigt an: „{Wir} {werden} 200 neue Stellen {schaffen}.“',
    dm: [0, 1, 1],
    indirect: 'Die Firma kündigt an, {sie} {werde} 200 neue Stellen {schaffen}.',
    im: [0, 1, 1],
    en: 'The company announces that it will create 200 new jobs.',
    changes: [
      { kind: 'pron', label: '{wir} → {sie}', note: '“We”, the company, becomes {sie}, and singular, because {die Firma} is singular.' },
      { kind: 'k1', label: '{werden} → {werde}', note: 'The future: Konjunktiv I of {werden} + infinitive. {sie werde} (singular) differs from {sie wird}.' },
    ],
  },
  {
    id: 'nachbarn',
    direct: 'Die Nachbarn sagen: „{Wir} {können} nichts machen.“',
    dm: [0, 1],
    indirect: 'Die Nachbarn sagen, {sie} {könnten} nichts machen.',
    im: [0, 1],
    en: 'The neighbours say they can’t do anything.',
    changes: [
      { kind: 'pron', label: '{wir} → {sie}', note: 'The speakers’ “we” is “they” in the report.' },
      { kind: 'k2', label: '{können} → {könnten}', note: 'Konjunktiv I {sie können} is identical to the indicative, so Konjunktiv II {könnten} replaces it.' },
    ],
  },
];

export interface K1Row {
  /** The Konjunktiv I form. */
  k1: string;
  /** The indicative, to compare. */
  ind: string;
  /** What indirect speech actually uses. */
  use: string;
}

export interface K1Verb {
  id: string;
  de: string;
  rows: K1Row[];
  note?: string;
}

/** Konjunktiv I next to the indicative; where they coincide, Konjunktiv II (or würde) steps in. */
export const K1_VERBS: K1Verb[] = [
  {
    id: 'sein',
    de: 'sein',
    rows: [
      { k1: 'ich sei', ind: 'ich bin', use: 'ich sei' },
      { k1: 'du seist', ind: 'du bist', use: 'du seist' },
      { k1: 'er sei', ind: 'er ist', use: 'er sei' },
      { k1: 'wir seien', ind: 'wir sind', use: 'wir seien' },
      { k1: 'ihr seiet', ind: 'ihr seid', use: 'ihr seiet' },
      { k1: 'sie seien', ind: 'sie sind', use: 'sie seien' },
    ],
  },
  {
    id: 'haben',
    de: 'haben',
    rows: [
      { k1: 'ich habe', ind: 'ich habe', use: 'ich hätte' },
      { k1: 'du habest', ind: 'du hast', use: 'du habest' },
      { k1: 'er habe', ind: 'er hat', use: 'er habe' },
      { k1: 'wir haben', ind: 'wir haben', use: 'wir hätten' },
      { k1: 'ihr habet', ind: 'ihr habt', use: 'ihr habet' },
      { k1: 'sie haben', ind: 'sie haben', use: 'sie hätten' },
    ],
  },
  {
    id: 'kommen',
    de: 'kommen',
    rows: [
      { k1: 'ich komme', ind: 'ich komme', use: 'ich käme' },
      { k1: 'du kommest', ind: 'du kommst', use: 'du kommest' },
      { k1: 'er komme', ind: 'er kommt', use: 'er komme' },
      { k1: 'wir kommen', ind: 'wir kommen', use: 'wir kämen' },
      { k1: 'ihr kommet', ind: 'ihr kommt', use: 'ihr kommet' },
      { k1: 'sie kommen', ind: 'sie kommen', use: 'sie kämen' },
    ],
  },
  {
    id: 'koennen',
    de: 'können',
    rows: [
      { k1: 'ich könne', ind: 'ich kann', use: 'ich könne' },
      { k1: 'du könnest', ind: 'du kannst', use: 'du könnest' },
      { k1: 'er könne', ind: 'er kann', use: 'er könne' },
      { k1: 'wir können', ind: 'wir können', use: 'wir könnten' },
      { k1: 'ihr könnet', ind: 'ihr könnt', use: 'ihr könnet' },
      { k1: 'sie können', ind: 'sie können', use: 'sie könnten' },
    ],
  },
  {
    id: 'werden',
    de: 'werden',
    rows: [
      { k1: 'ich werde', ind: 'ich werde', use: 'ich würde' },
      { k1: 'du werdest', ind: 'du wirst', use: 'du werdest' },
      { k1: 'er werde', ind: 'er wird', use: 'er werde' },
      { k1: 'wir werden', ind: 'wir werden', use: 'wir würden' },
      { k1: 'ihr werdet', ind: 'ihr werdet', use: 'ihr würdet' },
      { k1: 'sie werden', ind: 'sie werden', use: 'sie würden' },
    ],
  },
  {
    id: 'steigen',
    de: 'steigen',
    note: 'Konjunktiv II {sie stiegen} looks exactly like the past tense, so {würde} + infinitive takes over. ({ich stiege} exists but sounds dated.)',
    rows: [
      { k1: 'ich steige', ind: 'ich steige', use: 'ich würde steigen' },
      { k1: 'du steigest', ind: 'du steigst', use: 'du steigest' },
      { k1: 'er steige', ind: 'er steigt', use: 'er steige' },
      { k1: 'wir steigen', ind: 'wir steigen', use: 'wir würden steigen' },
      { k1: 'ihr steiget', ind: 'ihr steigt', use: 'ihr steiget' },
      { k1: 'sie steigen', ind: 'sie steigen', use: 'sie würden steigen' },
    ],
  },
];
