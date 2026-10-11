/**
 * Real and unreal conditions, every form written out. In `de`, the `{…}` spans are the verb
 * forms; `kind` says what each one is: `ind` indicative, `k2` Konjunktiv II (hätte, wäre,
 * würde, ginge), `inf` infinitive or participle, `doch` the wish particle.
 */

export type KKind = 'ind' | 'k2' | 'inf' | 'doch';

export interface KForm {
  de: string;
  kind: KKind[];
  en: string;
  note?: string;
}

export interface KNone {
  none: true;
  note: string;
}

export type KSlot = 'real' | 'present' | 'presentAlt' | 'past' | 'wish' | 'wishAlt' | 'wishPast' | 'wishAltPast' | 'inverted' | 'invertedPast';

export interface KScenario {
  id: string;
  title: string;
  forms: Record<KSlot, KForm | KNone>;
}

export const K_SCENARIOS: KScenario[] = [
  {
    id: 'kino',
    title: '{Zeit haben} → {ins Kino gehen}',
    forms: {
      real: { de: 'Wenn ich Zeit {habe}, {gehe} ich ins Kino.', kind: ['ind', 'ind'], en: 'If I have time, I’ll go to the cinema.' },
      present: { de: 'Wenn ich Zeit {hätte}, {würde} ich ins Kino {gehen}.', kind: ['k2', 'k2', 'inf'], en: 'If I had time, I would go to the cinema.' },
      presentAlt: {
        de: 'Wenn ich Zeit {hätte}, {ginge} ich ins Kino.',
        kind: ['k2', 'k2'],
        en: 'If I had time, I would go to the cinema.',
        note: '{ginge} is the one-word Konjunktiv II of {gehen}. Correct, but it sounds written or a little old-fashioned; in speech, {würde gehen}.',
      },
      past: { de: 'Wenn ich Zeit {gehabt} {hätte}, {wäre} ich ins Kino {gegangen}.', kind: ['inf', 'k2', 'k2', 'inf'], en: 'If I had had time, I would have gone to the cinema.' },
      wish: { de: 'Wenn ich {doch} Zeit {hätte}!', kind: ['doch', 'k2'], en: 'If only I had time!' },
      wishAlt: { de: '{Hätte} ich {doch} Zeit!', kind: ['k2', 'doch'], en: 'If only I had time!' },
      wishPast: { de: 'Wenn ich {doch} Zeit {gehabt} {hätte}!', kind: ['doch', 'inf', 'k2'], en: 'If only I had had time!' },
      wishAltPast: { de: '{Hätte} ich {doch} Zeit {gehabt}!', kind: ['k2', 'doch', 'inf'], en: 'If only I had had time!' },
      inverted: { de: '{Hätte} ich Zeit, {würde} ich ins Kino {gehen}.', kind: ['k2', 'k2', 'inf'], en: 'If I had time, I would go to the cinema.' },
      invertedPast: { de: '{Hätte} ich Zeit {gehabt}, {wäre} ich ins Kino {gegangen}.', kind: ['k2', 'inf', 'k2', 'inf'], en: 'Had I had the time, I would have gone to the cinema.' },
    },
  },
  {
    id: 'reich',
    title: '{reich sein} → {eine Weltreise machen}',
    forms: {
      real: { de: 'Wenn ich einmal reich {bin}, {mache} ich eine Weltreise.', kind: ['ind', 'ind'], en: 'When I’m rich one day, I’ll travel round the world.' },
      present: { de: 'Wenn ich reich {wäre}, {würde} ich eine Weltreise {machen}.', kind: ['k2', 'k2', 'inf'], en: 'If I were rich, I would travel round the world.' },
      presentAlt: {
        none: true,
        note: '{machen} is a weak verb: its one-word form {machte} looks exactly like the past tense, so German uses {würde machen}.',
      },
      past: { de: 'Wenn ich reich {gewesen} {wäre}, {hätte} ich eine Weltreise {gemacht}.', kind: ['inf', 'k2', 'k2', 'inf'], en: 'If I had been rich, I would have travelled round the world.' },
      wish: { de: 'Wenn ich {doch} reich {wäre}!', kind: ['doch', 'k2'], en: 'If only I were rich!' },
      wishAlt: { de: '{Wäre} ich {doch} reich!', kind: ['k2', 'doch'], en: 'If only I were rich!' },
      wishPast: { de: 'Wenn ich {doch} reich {gewesen} {wäre}!', kind: ['doch', 'inf', 'k2'], en: 'If only I had been rich!' },
      wishAltPast: { de: '{Wäre} ich {doch} reich {gewesen}!', kind: ['k2', 'doch', 'inf'], en: 'If only I had been rich!' },
      inverted: { de: '{Wäre} ich reich, {würde} ich eine Weltreise {machen}.', kind: ['k2', 'k2', 'inf'], en: 'If I were rich, I would travel round the world.' },
      invertedPast: { de: '{Wäre} ich reich {gewesen}, {hätte} ich eine Weltreise {gemacht}.', kind: ['k2', 'inf', 'k2', 'inf'], en: 'Had I been rich, I would have travelled round the world.' },
    },
  },
  {
    id: 'grillen',
    title: '{das Wetter schön sein} → {grillen}',
    forms: {
      real: { de: 'Wenn das Wetter schön {ist}, {grillen} wir.', kind: ['ind', 'ind'], en: 'If the weather is nice, we’ll have a barbecue.' },
      present: { de: 'Wenn das Wetter schön {wäre}, {würden} wir {grillen}.', kind: ['k2', 'k2', 'inf'], en: 'If the weather were nice, we would have a barbecue.' },
      presentAlt: {
        none: true,
        note: '{grillen} is weak: {grillten} would look exactly like the past tense, so only {würden grillen} works.',
      },
      past: { de: 'Wenn das Wetter schön {gewesen} {wäre}, {hätten} wir {gegrillt}.', kind: ['inf', 'k2', 'k2', 'inf'], en: 'If the weather had been nice, we would have had a barbecue.' },
      wish: { de: 'Wenn das Wetter {doch} schön {wäre}!', kind: ['doch', 'k2'], en: 'If only the weather were nice!' },
      wishAlt: { de: '{Wäre} das Wetter {doch} schön!', kind: ['k2', 'doch'], en: 'If only the weather were nice!' },
      wishPast: { de: 'Wenn das Wetter {doch} schön {gewesen} {wäre}!', kind: ['doch', 'inf', 'k2'], en: 'If only the weather had been nice!' },
      wishAltPast: { de: '{Wäre} das Wetter {doch} schön {gewesen}!', kind: ['k2', 'doch', 'inf'], en: 'If only the weather had been nice!' },
      inverted: { de: '{Wäre} das Wetter schön, {würden} wir {grillen}.', kind: ['k2', 'k2', 'inf'], en: 'If the weather were nice, we would have a barbecue.' },
      invertedPast: { de: '{Wäre} das Wetter schön {gewesen}, {hätten} wir {gegrillt}.', kind: ['k2', 'inf', 'k2', 'inf'], en: 'Had the weather been nice, we would have had a barbecue.' },
    },
  },
  {
    id: 'bus',
    title: '{den Bus nicht verpassen} → {pünktlich sein}',
    forms: {
      real: { de: 'Wenn ich den Bus nicht {verpasse}, {bin} ich pünktlich.', kind: ['ind', 'ind'], en: 'If I don’t miss the bus, I’ll be on time.' },
      present: {
        de: 'Wenn ich den Bus nicht {verpassen} {würde}, {wäre} ich pünktlich.',
        kind: ['inf', 'k2', 'k2'],
        en: 'If I didn’t miss the bus, I would be on time.',
        note: '{verpasste} would look like the past tense, so the wenn-clause takes {würde}. In the main clause, {wäre} is far more natural than {würde sein}.',
      },
      presentAlt: {
        none: true,
        note: '{verpassen} is weak: {verpasste} looks exactly like the past tense, so there is no useful one-word form.',
      },
      past: { de: 'Wenn ich den Bus nicht {verpasst} {hätte}, {wäre} ich pünktlich {gewesen}.', kind: ['inf', 'k2', 'k2', 'inf'], en: 'If I hadn’t missed the bus, I would have been on time.' },
      wish: { none: true, note: 'A wish about now hardly makes sense here: the regret is about something that has already happened. Switch to the past.' },
      wishAlt: { none: true, note: 'Switch to the past.' },
      wishPast: { de: 'Wenn ich {doch} den Bus nicht {verpasst} {hätte}!', kind: ['doch', 'inf', 'k2'], en: 'If only I hadn’t missed the bus!' },
      wishAltPast: { de: '{Hätte} ich {doch} den Bus nicht {verpasst}!', kind: ['k2', 'doch', 'inf'], en: 'If only I hadn’t missed the bus!' },
      inverted: { de: '{Würde} ich den Bus nicht {verpassen}, {wäre} ich pünktlich.', kind: ['k2', 'inf', 'k2'], en: 'If I didn’t miss the bus, I would be on time.' },
      invertedPast: { de: '{Hätte} ich den Bus nicht {verpasst}, {wäre} ich pünktlich {gewesen}.', kind: ['k2', 'inf', 'k2', 'inf'], en: 'Had I not missed the bus, I would have been on time.' },
    },
  },
];

export const K_EXPLAIN: Record<'real' | 'present' | 'past' | 'wish' | 'inverted' | 'presentAlt', { title: string; explain: string }> = {
  real: {
    title: 'Real condition',
    explain: 'It may well happen, so both halves are in the **indicative**. The wenn-clause sends its verb to the end; the whole clause then counts as position 1, so the main clause starts with its verb.',
  },
  present: {
    title: 'Unreal: now or in the future',
    explain: '**Konjunktiv II**. {sein}, {haben} and the modal verbs use their own forms ({wäre}, {hätte}, {könnte}); almost every other verb uses {würde} + infinitive at the end.',
  },
  presentAlt: {
    title: 'The one-word form',
    explain: 'Strong verbs also have a one-word Konjunktiv II from the past stem plus umlaut: {ging} → {ginge}, {kam} → {käme}, {gab} → {gäbe}. Common in writing; in speech mostly for {wäre}, {hätte}, the modals and a few others.',
  },
  past: {
    title: 'Unreal: in the past',
    explain: '{hätte} or {wäre} + Partizip II, in both halves. {hätte} or {wäre} is the same choice as in the perfect: {ich bin gegangen} → {ich wäre gegangen}. No {würde} here.',
  },
  wish: {
    title: 'A wish',
    explain: 'The wenn-clause on its own, with {doch} or {nur}, and an exclamation mark. Or drop {wenn} and start with the verb.',
  },
  inverted: {
    title: 'Without wenn',
    explain: 'Drop {wenn} and put the verb first: {Hätte ich Zeit, …}. Same meaning, a little more written. The main clause often adds {dann} or {so}.',
  },
};

export interface KQuizItem {
  de: string;
  answer: string[];
  hint: string;
  en: string;
  explain: string;
}

export const K_QUIZ: KQuizItem[] = [
  { de: 'Wenn ich mehr Geld ___, würde ich mir ein neues Fahrrad kaufen.', answer: ['hätte'], hint: 'haben', en: 'If I had more money, I would buy myself a new bike.', explain: '{haben} → {hätte}: no {würde haben}.' },
  { de: 'Wenn du hier ___, wäre alles einfacher.', answer: ['wärst', 'wärest'], hint: 'sein', en: 'If you were here, everything would be easier.', explain: '{du wärst}: the Konjunktiv II of {sein} takes the usual du-ending.' },
  { de: 'Wenn es nicht so kalt ___, würden wir draußen sitzen.', answer: ['wäre'], hint: 'sein', en: 'If it weren’t so cold, we would sit outside.', explain: '{es wäre}.' },
  { de: 'Wenn ich das gewusst ___, wäre ich früher gekommen.', answer: ['hätte'], hint: 'haben', en: 'If I had known that, I would have come earlier.', explain: 'Unreal past: {ich habe gewusst} → {ich hätte gewusst}.' },
  { de: 'Wenn wir den früheren Zug genommen hätten, ___ wir schon da.', answer: ['wären'], hint: 'sein', en: 'If we had taken the earlier train, we would already be there.', explain: 'The result is about now: {wir wären schon da}.' },
  { de: 'Wenn Mia Zeit hätte, ___ sie uns beim Umzug helfen.', answer: ['würde'], hint: 'werden', en: 'If Mia had time, she would help us with the move.', explain: '{würde} + infinitive at the end: {würde … helfen}.' },
  { de: 'Wenn ich du ___, würde ich das nicht machen.', answer: ['wäre'], hint: 'sein', en: 'If I were you, I wouldn’t do that.', explain: '{Wenn ich du wäre} (or {An deiner Stelle}…): the classic piece of advice.' },
  { de: '___ ich das früher gewusst, hätte ich dich angerufen.', answer: ['Hätte', 'hätte'], hint: 'haben', en: 'Had I known that earlier, I would have phoned you.', explain: 'No {wenn}: the verb comes first.' },
  { de: 'Wenn er gestern gekommen ___, hätten wir zusammen gekocht.', answer: ['wäre'], hint: 'sein', en: 'If he had come yesterday, we would have cooked together.', explain: '{kommen} takes {sein} in the perfect, so {er wäre gekommen}.' },
  { de: 'Wenn ich mehr Zeit hätte, ___ ich öfter Sport machen.', answer: ['könnte'], hint: 'können', en: 'If I had more time, I could do more sport.', explain: 'Modal verbs have their own Konjunktiv II: {können} → {könnte}.' },
  { de: 'Wenn sie schneller gelaufen ___, hätte sie den Bus noch erreicht.', answer: ['wäre'], hint: 'sein', en: 'If she had run faster, she would still have caught the bus.', explain: '{laufen} takes {sein}: {sie wäre gelaufen}.' },
  { de: 'Wenn ich doch nur mehr Zeit ___!', answer: ['hätte'], hint: 'haben', en: 'If only I had more time!', explain: 'A wish: the wenn-clause alone, with {doch nur}.' },
];
