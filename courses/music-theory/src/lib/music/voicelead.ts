/**
 * Four-part writing: the rule engine behind the `realise` exercise (docs/PLAN.md §6, `voicelead`).
 *
 * A chord is four MIDI notes, soprano first: [S, A, T, B]. Each rule has an id, a severity and a sentence
 * of explanation; an exercise chooses which rules apply. The rules are the conventions of common-practice
 * chorale writing, not laws: the course reports "faults found" or "no faults found", never "correct".
 */
import { chordTones, identifyChord, type Chord } from './chord';
import { fromDiatonic, diatonic, letterIndex, mod, pitchClass, signatureAlterations, type Pitch, type PitchClassName } from './pitch';
import { fifthsOf, type Key } from './scale';

/** Notes of one chord, highest voice first. Four voices are soprano, alto, tenor, bass. */
export type Satb = number[];

export const VOICES = ['soprano', 'alto', 'tenor', 'bass'] as const;

/** Names of the voices for a texture of n voices. */
export function voiceNames(n: number): readonly string[] {
  if (n === 4) return VOICES;
  if (n === 3) return ['upper voice', 'middle voice', 'bass'];
  return ['upper voice', 'lower voice'];
}

export type RuleId =
  | 'range'
  | 'spacing'
  | 'span'
  | 'crossing'
  | 'overlap'
  | 'parallel-fifths'
  | 'parallel-octaves'
  | 'contrary-fifths-octaves'
  | 'hidden-fifths-octaves'
  | 'leading-note'
  | 'doubled-leading-note'
  | 'seventh'
  | 'chord-tones'
  | 'incomplete'
  | 'doubled-third'
  | 'leap'
  | 'dissonance'
  | 'perfect-ends'
  | 'unison'
  | 'too-far'
  | 'repeated';

export type Severity = 'fault' | 'warning';

export interface Rule {
  id: RuleId;
  severity: Severity;
  /** One sentence: what the rule asks and why. */
  explain: string;
}

export const RULES: Record<RuleId, Rule> = {
  range: { id: 'range', severity: 'fault', explain: 'Each voice stays in a comfortable singing range: soprano C4–G5, alto G3–D5, tenor C3–G4, bass E2–C4.' },
  spacing: { id: 'spacing', severity: 'fault', explain: 'Adjacent upper voices stay within an octave of each other; only the bass may be further from the tenor.' },
  span: { id: 'span', severity: 'fault', explain: 'In keyboard style the right hand plays the three upper voices, so they fit within an octave.' },
  crossing: { id: 'crossing', severity: 'fault', explain: 'Voices keep their order: no voice goes above the voice written above it.' },
  overlap: { id: 'overlap', severity: 'warning', explain: 'A voice should not move past the note the next voice held a moment before; the ear loses track of which line is which.' },
  'parallel-fifths': { id: 'parallel-fifths', severity: 'fault', explain: 'Two voices a perfect fifth apart should not both move to another perfect fifth: the two lines fuse into one and lose their independence.' },
  'parallel-octaves': { id: 'parallel-octaves', severity: 'fault', explain: 'Two voices an octave (or unison) apart should not both move to another octave: one voice simply doubles the other.' },
  'contrary-fifths-octaves': { id: 'contrary-fifths-octaves', severity: 'warning', explain: 'Fifths or octaves in consecutive chords by contrary motion are heard much as parallels are; avoid them except at a final cadence.' },
  'hidden-fifths-octaves': { id: 'hidden-fifths-octaves', severity: 'warning', explain: 'The outer voices should not move in the same direction into a fifth or octave with the soprano leaping: the arrival is exposed (hidden, or direct, fifths and octaves).' },
  'leading-note': { id: 'leading-note', severity: 'fault', explain: 'The leading note in the soprano or bass of a dominant chord rises a semitone to the tonic when the next chord contains it.' },
  'doubled-leading-note': { id: 'doubled-leading-note', severity: 'fault', explain: 'Never double the leading note: it has to rise to the tonic, and two voices doing so make parallel octaves.' },
  seventh: { id: 'seventh', severity: 'fault', explain: 'The seventh of a seventh chord falls by step to the next chord (or stays, if the next chord keeps it).' },
  'chord-tones': { id: 'chord-tones', severity: 'fault', explain: 'Every voice sings a note of the chord.' },
  incomplete: { id: 'incomplete', severity: 'fault', explain: 'A chord needs its root and third (and its seventh, if it is a seventh chord); only the fifth may be left out.' },
  'doubled-third': { id: 'doubled-third', severity: 'warning', explain: 'In a root-position major chord, double the root (or the fifth), not the third.' },
  leap: { id: 'leap', severity: 'fault', explain: 'No voice leaps more than an octave; upper voices move mostly by step or small leaps.' },
  dissonance: { id: 'dissonance', severity: 'fault', explain: 'Note against note, every interval is a consonance: unison, third, fifth, sixth or octave (or their compounds). Seconds, fourths, sevenths and the tritone are dissonant.' },
  'perfect-ends': { id: 'perfect-ends', severity: 'fault', explain: 'Begin on a perfect consonance (unison, fifth or octave) and end on a unison or octave.' },
  unison: { id: 'unison', severity: 'warning', explain: 'Avoid the unison except at the beginning and the end: for a moment there is one voice instead of two.' },
  'too-far': { id: 'too-far', severity: 'warning', explain: 'Keep two voices within about a tenth of each other, so that they sound like a pair.' },
  repeated: { id: 'repeated', severity: 'warning', explain: 'A repeated note stalls the line; move to a new note.' },
};

/** Ranges by voice, MIDI, inclusive: soprano C4–G5, alto G3–D5, tenor C3–G4, bass E2–C4. */
export const RANGES: readonly [number, number][] = [
  [60, 79],
  [55, 74],
  [48, 67],
  [40, 60],
];

export type Style = 'satb' | 'keyboard' | 'species';

/** Rules applied by default. Keyboard style drops the vocal ranges and spacing for the right hand's span. */
export const DEFAULT_RULES: Record<Style, RuleId[]> = {
  satb: ['range', 'spacing', 'crossing', 'overlap', 'parallel-fifths', 'parallel-octaves', 'contrary-fifths-octaves', 'hidden-fifths-octaves', 'leading-note', 'doubled-leading-note', 'seventh', 'chord-tones', 'incomplete', 'doubled-third', 'leap'],
  keyboard: ['span', 'crossing', 'parallel-fifths', 'parallel-octaves', 'contrary-fifths-octaves', 'hidden-fifths-octaves', 'leading-note', 'doubled-leading-note', 'seventh', 'chord-tones', 'incomplete', 'doubled-third', 'leap'],
  species: ['crossing', 'dissonance', 'perfect-ends', 'unison', 'too-far', 'repeated', 'parallel-fifths', 'parallel-octaves', 'contrary-fifths-octaves', 'hidden-fifths-octaves', 'leap'],
};

/** What a chord is meant to be: its spelt tones from the root up (root, third, fifth, seventh). */
export interface Harmony {
  tones: PitchClassName[];
  /** True when the fourth tone is a seventh. */
  seventh: boolean;
  /** Major or minor triad / seventh quality is read from the tones. */
}

export interface Fault {
  rule: RuleId;
  severity: Severity;
  /** Index of the chord (for motion faults, the chord moved to). */
  at: number;
  /** Motion faults: the chord moved from (at − 1). */
  from?: number;
  voices: number[];
  /** One sentence naming what was found. */
  text: string;
}

const pcOf = (t: PitchClassName) => pitchClass(t);

export function harmonyFromChord(c: Chord): Harmony {
  const tones = chordTones(c).map((p) => ({ letter: p.letter, alter: p.alter }));
  return { tones, seventh: tones.length === 4 };
}

/** The harmony of four played notes, if they make a triad or seventh chord (fifth possibly omitted). */
export function harmonyOfNotes(notes: number[], fifths = 0): Harmony | undefined {
  const found = identifyChord(notes, fifths).find((i) => !/sus/.test(i.chord.quality));
  return found ? harmonyFromChord(found.chord) : undefined;
}

// ───────────────────────── Figured bass ─────────────────────────

/** Shorthand figures and the full set of intervals above the bass they stand for. */
const FULL: Record<string, number[]> = {
  '': [3, 5],
  '3': [3, 5],
  '5': [3, 5],
  '53': [3, 5],
  '6': [3, 6],
  '63': [3, 6],
  '64': [4, 6],
  '7': [3, 5, 7],
  '73': [3, 5, 7],
  '75': [3, 5, 7],
  '753': [3, 5, 7],
  '65': [3, 5, 6],
  '653': [3, 5, 6],
  '43': [3, 4, 6],
  '643': [3, 4, 6],
  '42': [2, 4, 6],
  '2': [2, 4, 6],
  '642': [2, 4, 6],
};

export interface Figures {
  /** Intervals above the bass, as generic numbers (3, 5, 6 …). */
  intervals: number[];
  /** Accidentals by interval number: +1 sharp (raise), −1 flat (lower), 0 natural. */
  accidentals: Record<number, number>;
}

/**
 * Read figures written as text: "6", "64", "7", "65", "43", "42", with accidentals before a number ("#6",
 * "b7", "n3") or on their own, which then apply to the third ("#", "6#" is 6 with a raised third).
 * Accidentals may be ASCII or ♯ ♭ ♮.
 */
export function parseFigures(text: string): Figures {
  const s = text.replace(/\s|\//g, '').replace(/♯/g, '#').replace(/♭/g, 'b').replace(/♮/g, 'n');
  const accidentals: Record<number, number> = {};
  const nums: number[] = [];
  const re = /([#bn+]?)(\d?)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) && m[0] !== '') {
    const acc = m[1] === '#' || m[1] === '+' ? 1 : m[1] === 'b' ? -1 : m[1] === 'n' ? 0 : undefined;
    const n = m[2] ? Number(m[2]) : 3;
    if (m[2]) nums.push(n);
    if (acc !== undefined) accidentals[n] = acc;
  }
  const keyStr = [...new Set(nums)].sort((a, b) => b - a).join('');
  const full = FULL[keyStr];
  if (!full) throw new Error(`Figures not understood: “${text}”`);
  return { intervals: full, accidentals };
}

/**
 * The harmony a figured bass note asks for, in a key: each figure counts letters up from the bass and
 * takes the key signature's accidental unless the figure says otherwise (so the raised leading note of a
 * minor key is written "#", as in Baroque figures). Returns the spelt chord tones from the root up.
 */
export function figuredHarmony(bass: Pitch, figures: string, key: Key): Harmony {
  const f = parseFigures(figures);
  const sig = signatureAlterations(fifthsOf(key));
  const base = diatonic(bass);
  const notes: PitchClassName[] = [{ letter: bass.letter, alter: bass.alter }];
  for (const n of f.intervals) {
    const p = fromDiatonic(base + n - 1, 0);
    const keyAlter = sig[p.letter];
    const acc = f.accidentals[n];
    const alter = acc === undefined ? keyAlter : acc === 0 ? 0 : keyAlter + acc;
    notes.push({ letter: p.letter, alter });
  }
  return stackInThirds(notes);
}

/** Order spelt notes root, third, fifth, seventh by finding the letter from which all others are thirds. */
function stackInThirds(notes: PitchClassName[]): Harmony {
  const unique = notes.filter((n, i) => notes.findIndex((o) => o.letter === n.letter) === i);
  for (const r of unique) {
    const dist: number[] = unique.map((n) => mod(letterIndex(n.letter) - letterIndex(r.letter), 7));
    if (dist.every((d) => [0, 2, 4, 6].includes(d))) {
      const ordered = [0, 2, 4, 6].map((d) => unique[dist.indexOf(d)]).filter((x): x is PitchClassName => !!x);
      return { tones: ordered, seventh: dist.includes(6) };
    }
  }
  throw new Error('Not a chord in thirds');
}

// ───────────────────────── Checking ─────────────────────────

export interface CheckOptions {
  key: Key;
  /** Harmony of each chord when known (from figures or numerals); rules about chord tones skip unknown ones. */
  harmonies?: (Harmony | undefined)[];
  style?: Style;
  rules?: RuleId[];
}

const DISSONANT = [1, 2, 5, 6, 10, 11];
const INTERVAL_NAME: Record<number, string> = { 1: 'second', 2: 'second', 5: 'fourth', 6: 'tritone', 10: 'seventh', 11: 'seventh' };

/** Check chords (four voices, or two for species counterpoint) against the chosen rules. Faults are listed in score order. */
export function checkVoiceLeading(chords: Satb[], opts: CheckOptions): Fault[] {
  const style = opts.style ?? 'satb';
  const n = chords[0]?.length ?? 4;
  const NAMES = voiceNames(n);
  const B = n - 1;
  const pair = (i: number, j: number) => `${NAMES[i]} and ${NAMES[j]}`;
  const on = new Set(opts.rules ?? DEFAULT_RULES[style]);
  const out: Fault[] = [];
  const add = (rule: RuleId, at: number, voices: number[], text: string, from?: number) => {
    if (on.has(rule)) out.push({ rule, severity: RULES[rule].severity, at, voices, text, ...(from === undefined ? {} : { from }) });
  };
  const tonic = pcOf(opts.key.tonic);
  const leading = mod(tonic - 1, 12);
  const harmonyAt = (k: number) => opts.harmonies?.[k];
  const isDominant = (h: Harmony | undefined) => !!h && [mod(tonic + 7, 12), leading].includes(pcOf(h.tones[0]!)) && h.tones.some((t) => pcOf(t) === leading);

  chords.forEach((c, k) => {
    // Within the chord.
    if (style === 'satb' && n === 4) {
      c.forEach((m, v) => {
        const [lo, hi] = RANGES[v]!;
        if (m < lo || m > hi) add('range', k, [v], `The ${NAMES[v]} is ${m < lo ? 'below' : 'above'} its range.`);
      });
    }
    for (let v = 0; v < n - 2; v++) if (c[v]! - c[v + 1]! > 12) add('spacing', k, [v, v + 1], `More than an octave between ${pair(v, v + 1)}.`);
    if (n === 4 && c[0]! - c[2]! > 12) add('span', k, [0, 2], 'The three upper voices span more than an octave: too wide for one hand.');
    for (let v = 0; v < n - 1; v++) if (c[v]! < c[v + 1]!) add('crossing', k, [v, v + 1], `The ${NAMES[v + 1]} is above the ${NAMES[v]}.`);
    if (n === 2) {
      const iv = c[0]! - c[1]!;
      const ic = mod(iv, 12);
      if (DISSONANT.includes(ic)) add('dissonance', k, [0, 1], `A dissonance: the voices are a ${INTERVAL_NAME[ic]} apart.`);
      const last = k === chords.length - 1;
      if (k === 0 && ![0, 7].includes(ic)) add('perfect-ends', k, [0, 1], 'The first interval is not a unison, fifth or octave.');
      if (last && ic !== 0) add('perfect-ends', k, [0, 1], 'The last interval is not a unison or octave.');
      if (iv === 0 && k > 0 && !last) add('unison', k, [0, 1], 'A unison in the middle of the line.');
      if (iv > 16) add('too-far', k, [0, 1], 'The voices are more than a tenth apart.');
    }

    const h = harmonyAt(k);
    if (h) {
      const pcs = h.tones.map(pcOf);
      const outside = c.map((m, v) => (pcs.includes(mod(m, 12)) ? -1 : v)).filter((v) => v >= 0);
      if (outside.length) add('chord-tones', k, outside, `${cap(outside.map((v) => NAMES[v]).join(' and '))} ${outside.length > 1 ? 'are' : 'is'} not in the chord.`);
      const present = new Set(c.map((m) => mod(m, 12)));
      const missing = [0, 1, ...(h.seventh ? [3] : [])].filter((i) => !present.has(pcs[i]!));
      if (missing.length) add('incomplete', k, [], `The chord has no ${missing.map((i) => ['root', 'third', 'fifth', 'seventh'][i]).join(' or ')}.`);
      const third = pcs[1]!;
      const majorThird = mod(third - pcs[0]!, 12) === 4;
      if (!h.seventh && majorThird && mod(c[B]!, 12) === pcs[0] && c.filter((m) => mod(m, 12) === third).length > 1 && !isDominant(h))
        add('doubled-third', k, c.map((m, v) => (mod(m, 12) === third ? v : -1)).filter((v) => v >= 0), 'The third of a root-position major chord is doubled.');
    }
    if (!h || isDominant(h)) {
      const lv = c.map((m, v) => (mod(m, 12) === leading ? v : -1)).filter((v) => v >= 0);
      if (lv.length > 1 && (h || isDominantPcs(c, tonic))) add('doubled-leading-note', k, lv, 'The leading note is doubled.');
    }

    // Motion from the previous chord.
    if (k === 0) return;
    const p = chords[k - 1]!;
    for (let v = 0; v < n; v++) {
      if (Math.abs(c[v]! - p[v]!) > 12) add('leap', k, [v], `The ${NAMES[v]} leaps more than an octave.`, k - 1);
    }
    if (n === 2) for (let v = 0; v < 2; v++) if (c[v] === p[v]) add('repeated', k, [v], `The ${NAMES[v]} repeats its note.`, k - 1);
    for (let v = 0; v < n - 1; v++) {
      if (c[v + 1]! > p[v]!) add('overlap', k, [v, v + 1], `The ${NAMES[v + 1]} moves above the note the ${NAMES[v]} just left.`, k - 1);
      else if (c[v]! < p[v + 1]!) add('overlap', k, [v, v + 1], `The ${NAMES[v]} moves below the note the ${NAMES[v + 1]} just left.`, k - 1);
    }
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const mi = c[i]! - p[i]!;
      const mj = c[j]! - p[j]!;
      if (mi === 0 || mj === 0) continue;
      const before = mod(p[i]! - p[j]!, 12);
      const after = mod(c[i]! - c[j]!, 12);
      if (before !== after || (after !== 0 && after !== 7)) continue;
      // Both voices moved and kept a perfect fifth or octave (compound or not).
      if (Math.sign(mi) === Math.sign(mj)) add(after === 7 ? 'parallel-fifths' : 'parallel-octaves', k, [i, j], `Parallel ${after === 7 ? 'fifths' : 'octaves'} between ${pair(i, j)}.`, k - 1);
      else add('contrary-fifths-octaves', k, [i, j], `Consecutive ${after === 7 ? 'fifths' : 'octaves'} by contrary motion between ${pair(i, j)}.`, k - 1);
    }
    {
      const ms = c[0]! - p[0]!;
      const mb = c[B]! - p[B]!;
      const after = mod(c[0]! - c[B]!, 12);
      const before = mod(p[0]! - p[B]!, 12);
      if (ms !== 0 && mb !== 0 && Math.sign(ms) === Math.sign(mb) && (after === 0 || after === 7) && before !== after && Math.abs(ms) > 2)
        add('hidden-fifths-octaves', k, [0, B], `Hidden ${after === 7 ? 'fifth' : 'octave'}: the outer voices move the same way into it with a leap in the ${NAMES[0]}.`, k - 1);
    }
    const hp = harmonyAt(k - 1);
    const hasTonic = c.some((m) => mod(m, 12) === tonic);
    if ((hp ? isDominant(hp) : isDominantPcs(p, tonic)) && hasTonic) {
      for (const v of [0, B]) {
        // The bass of V–I falls a fifth from the root; only a leading note in the bass (V6, vii°6) must rise.
        if (mod(p[v]!, 12) === leading && c[v]! - p[v]! !== 1) add('leading-note', k, [v], `The leading note in the ${NAMES[v]} does not rise to the tonic.`, k - 1);
      }
    }
    if (hp?.seventh) {
      const sev = pcOf(hp.tones[3]!);
      const h = harmonyAt(k);
      const kept = h && pcOf(h.tones[0]!) === pcOf(hp.tones[0]!);
      if (!kept) for (let v = 0; v < n; v++) {
        if (mod(p[v]!, 12) !== sev) continue;
        const d = c[v]! - p[v]!;
        if (!(d === -1 || d === -2)) add('seventh', k, [v], `The seventh, in the ${NAMES[v]}, does not fall by step.`, k - 1);
      }
    }
  });
  return out;
}

/** Without a given harmony: whether a chord sounds like V or vii° (contains the leading note and degree 2 or 4 or 5). */
function isDominantPcs(c: readonly number[], tonic: number): boolean {
  const pcs = c.map((m) => mod(m, 12));
  const leading = mod(tonic - 1, 12);
  return pcs.includes(leading) && (pcs.includes(mod(tonic + 2, 12)) || pcs.includes(mod(tonic + 7, 12)));
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Spell a played note by the chord it belongs to, falling back to the key. */
export function spellIn(m: number, h: Harmony | undefined, fallback: (m: number) => Pitch): Pitch {
  const t = h?.tones.find((x) => pitchClass(x) === mod(m, 12));
  if (!t) return fallback(m);
  const natural = m - t.alter;
  return { letter: t.letter, alter: t.alter, octave: Math.floor(natural / 12) - 1 };
}
