/**
 * Chords: a root, a quality and optionally a bass note other than the root (an inversion or a slash
 * chord). Chord symbols ("Am", "G7", "F/A"), Roman numerals in a key ("vi", "V7", "I6"), and
 * identification of the chord a reader is holding down from its MIDI notes.
 */
import { intervalBetween, parseInterval, transpose } from './interval';
import { noteName, type NameOptions } from './names';
import { letterIndex, midi, mod, parsePitch, pitchClass, spell, type Pitch, type PitchClassName } from './pitch';
import { fifthsOf, keyScale, type Key } from './scale';

export type ChordQuality = 'maj' | 'min' | 'dim' | 'aug' | 'sus2' | 'sus4' | '7' | 'maj7' | 'm7' | 'm7b5' | 'dim7';

interface QualityInfo {
  intervals: string[];
  symbol: string;
  name: string;
  /** Roman numeral written in upper case (major or augmented third above the root). */
  upper: boolean;
  /** Suffix after a Roman numeral. */
  roman: string;
}

export const QUALITIES: Record<ChordQuality, QualityInfo> = {
  maj: { intervals: ['P1', 'M3', 'P5'], symbol: '', name: 'major triad', upper: true, roman: '' },
  min: { intervals: ['P1', 'm3', 'P5'], symbol: 'm', name: 'minor triad', upper: false, roman: '' },
  dim: { intervals: ['P1', 'm3', 'd5'], symbol: 'dim', name: 'diminished triad', upper: false, roman: '°' },
  aug: { intervals: ['P1', 'M3', 'A5'], symbol: 'aug', name: 'augmented triad', upper: true, roman: '+' },
  sus2: { intervals: ['P1', 'M2', 'P5'], symbol: 'sus2', name: 'suspended second', upper: true, roman: 'sus2' },
  sus4: { intervals: ['P1', 'P4', 'P5'], symbol: 'sus4', name: 'suspended fourth', upper: true, roman: 'sus4' },
  '7': { intervals: ['P1', 'M3', 'P5', 'm7'], symbol: '7', name: 'dominant seventh', upper: true, roman: '7' },
  maj7: { intervals: ['P1', 'M3', 'P5', 'M7'], symbol: 'maj7', name: 'major seventh', upper: true, roman: 'maj7' },
  m7: { intervals: ['P1', 'm3', 'P5', 'm7'], symbol: 'm7', name: 'minor seventh', upper: false, roman: '7' },
  m7b5: { intervals: ['P1', 'm3', 'd5', 'm7'], symbol: 'm7♭5', name: 'half-diminished seventh', upper: false, roman: 'ø7' },
  dim7: { intervals: ['P1', 'm3', 'd5', 'd7'], symbol: 'dim7', name: 'diminished seventh', upper: false, roman: '°7' },
};

export interface Chord {
  root: PitchClassName;
  quality: ChordQuality;
  /** Bass note when it is not the root. */
  bass?: PitchClassName;
}

/** Chord tones from the root up, spelt (octave 4 for the root). */
export function chordTones(c: Chord): Pitch[] {
  const root = { ...c.root, octave: 4 };
  return QUALITIES[c.quality].intervals.map((i) => transpose(root, parseInterval(i)));
}

/** 0 = root position, 1 = first inversion, 2 = second, 3 = third; undefined for a bass outside the chord. */
export function inversion(c: Chord): number | undefined {
  if (!c.bass) return 0;
  const i = chordTones(c).findIndex((t) => t.letter === c.bass!.letter && t.alter === c.bass!.alter);
  return i < 0 ? undefined : i;
}

/**
 * A close-position voicing: chord tones stacked upwards from the bass, the bass (if any) placed below
 * the root. `octave` is the octave of the lowest note.
 */
export function voicing(c: Chord, octave = 3): Pitch[] {
  const tones = chordTones(c);
  const found = inversion(c);
  const inv = found ?? 0;
  const ordered = [...tones.slice(inv), ...tones.slice(0, inv)];
  const out: Pitch[] = [];
  for (const t of ordered) {
    let p: Pitch = { ...t, octave };
    while (out.length && midi(p) <= midi(out.at(-1)!)) p = { ...p, octave: p.octave + 1 };
    out.push(p);
  }
  if (c.bass && found === undefined) out.unshift({ ...c.bass, octave: octave - 1 });
  return out;
}

export function chordSymbol(c: Chord, opts: NameOptions = {}): string {
  const root = noteName(c.root, opts);
  const bass = c.bass && !(c.bass.letter === c.root.letter && c.bass.alter === c.root.alter) ? `/${noteName(c.bass, opts)}` : '';
  const symbol = opts.ascii ? QUALITIES[c.quality].symbol.replace('♭', 'b') : QUALITIES[c.quality].symbol;
  return root + symbol + bass;
}

const SYMBOL_SUFFIXES: [RegExp, ChordQuality][] = [
  [/^(maj7|M7|Δ7?)$/, 'maj7'],
  [/^(m7(b5|♭5)|ø7?)$/, 'm7b5'],
  [/^(dim7|°7|o7)$/, 'dim7'],
  [/^(m7|min7|-7)$/, 'm7'],
  [/^7$/, '7'],
  [/^(dim|°|o)$/, 'dim'],
  [/^(aug|\+)$/, 'aug'],
  [/^sus2$/, 'sus2'],
  [/^sus4?$/, 'sus4'],
  [/^(m|min|-)$/, 'min'],
  [/^(maj|M)?$/, 'maj'],
];

/** Parse a chord symbol: "C", "Am", "G7", "F/A", "B♭maj7", "C♯m7♭5", "Bdim", "Esus4". */
export function parseChordSymbol(s: string): Chord {
  const m = /^([A-G](?:##|#|bb|b|♯|♭)?)([^/]*)(?:\/([A-G](?:#|b|♯|♭)?))?$/.exec(s.trim());
  if (!m) throw new Error(`Not a chord symbol: “${s}”`);
  const root = parsePitch(m[1]!);
  const suffix = m[2]!;
  const quality = SYMBOL_SUFFIXES.find(([re]) => re.test(suffix))?.[1];
  if (!quality) throw new Error(`Unknown chord quality “${suffix}” in “${s}”`);
  const chord: Chord = { root: { letter: root.letter, alter: root.alter }, quality };
  if (m[3]) {
    const b = parsePitch(m[3]);
    chord.bass = { letter: b.letter, alter: b.alter };
  }
  return chord;
}

// ───────────────────────── Roman numerals ─────────────────────────

const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const TRIAD_FIGURES = ['', '6', '64'];
const SEVENTH_FIGURES = ['7', '65', '43', '42'];

export interface RomanNumeral {
  /** "♭" or "♯" before the numeral when the root is not in the key. */
  prefix: string;
  /** "V", "vi", "ii". */
  numeral: string;
  /** "°", "+", "ø", "maj" … */
  quality: string;
  /** Inversion figures: "6", "64", "7", "65", "43", "42". */
  figures: string;
}

/** The Roman numeral of a chord in a key (major keys, and minor keys measured against natural minor). */
export function romanNumeral(c: Chord, key: Key): RomanNumeral {
  const deg = mod(letterIndex(c.root.letter) - letterIndex(key.tonic.letter), 7);
  const diatonicRoot = keyScale(key)[deg]!;
  const diff = mod(pitchClass(c.root) - pitchClass(diatonicRoot) + 6, 12) - 6;
  const prefix = diff > 0 ? '♯'.repeat(diff) : '♭'.repeat(-diff);
  const info = QUALITIES[c.quality];
  const numeral = info.upper ? NUMERALS[deg]! : NUMERALS[deg]!.toLowerCase();
  const seventh = info.intervals.length === 4;
  const inv = inversion(c) ?? 0;
  let quality = info.roman;
  let figures = seventh ? SEVENTH_FIGURES[inv]! : TRIAD_FIGURES[inv]!;
  if (seventh) quality = quality.replace(/7$/, '');
  return { prefix, numeral, quality, figures };
}

export const romanText = (r: RomanNumeral): string => r.prefix + r.numeral + r.quality + r.figures;

// ───────────────────────── Identification ─────────────────────────

export interface Identified {
  chord: Chord;
  /** Chord tones the player left out ("5" for a seventh chord without its fifth). */
  omitted: string[];
}

/**
 * Name the chord formed by a set of MIDI notes. Returns every reading that fits, best first: complete
 * chords before chords with an omitted fifth, then readings whose root is the bass, then roots spelt
 * within the key. `fifths` is the key signature used for spelling.
 */
export function identifyChord(notes: number[], fifths = 0): Identified[] {
  if (notes.length < 2) return [];
  const pcs = new Set(notes.map((n) => mod(n, 12)));
  const bassPc = mod(Math.min(...notes), 12);
  const out: (Identified & { score: number })[] = [];
  for (const rootPc of pcs) {
    for (const [q, info] of Object.entries(QUALITIES) as [ChordQuality, QualityInfo][]) {
      const steps = info.intervals.map((i) => mod(rootPc + parseInterval(i).semitones, 12));
      const want = new Set(steps);
      const omitFifth = info.intervals.length === 4 ? new Set(steps.filter((_, i) => i !== 2)) : undefined;
      const exact = eq(pcs, want);
      const omitted = !exact && omitFifth && eq(pcs, omitFifth);
      if (!exact && !omitted) continue;
      const r = spell(rootPc + 60, fifths);
      const chord: Chord = { root: { letter: r.letter, alter: r.alter }, quality: q };
      if (bassPc !== rootPc) {
        const tones = chordTones(chord);
        const b = tones.find((t) => pitchClass(t) === bassPc)!;
        chord.bass = { letter: b.letter, alter: b.alter };
      }
      const score = (exact ? 100 : 0) + (bassPc === rootPc ? 10 : 0) + (Math.abs(r.alter) === 0 ? 1 : 0);
      out.push({ chord, omitted: omitted ? ['5'] : [], score });
    }
  }
  return out.sort((a, b) => b.score - a.score).map(({ chord, omitted }) => ({ chord, omitted }));
}

function eq(a: Set<number>, b: Set<number>): boolean {
  return a.size === b.size && [...a].every((x) => b.has(x));
}

/** Whether two chords are the same root, quality and bass (spelling-sensitive). */
export function sameChord(a: Chord, b: Chord): boolean {
  const bassA = a.bass ?? a.root;
  const bassB = b.bass ?? b.root;
  return a.quality === b.quality && a.root.letter === b.root.letter && a.root.alter === b.root.alter && bassA.letter === bassB.letter && bassA.alter === bassB.alter;
}

/** Diatonic triads of a key, I to vii° (natural minor in minor keys). */
export function diatonicTriads(key: Key): Chord[] {
  const notes = keyScale(key);
  return notes.map((root, i) => {
    const third = notes[(i + 2) % 7]!;
    const fifth = notes[(i + 4) % 7]!;
    const t = intervalBetween(root, { ...third, octave: third.octave + (i + 2 >= 7 ? 1 : 0) }).semitones;
    const f = intervalBetween(root, { ...fifth, octave: fifth.octave + (i + 4 >= 7 ? 1 : 0) }).semitones;
    const quality: ChordQuality = t === 4 ? (f === 8 ? 'aug' : 'maj') : f === 6 ? 'dim' : 'min';
    return { root: { letter: root.letter, alter: root.alter }, quality };
  });
}

/**
 * A chord from a Roman numeral in a key: "I", "V7", "vi", "ii", "IV", "♭VII". Inversions as figures: "I6", "V65".
 * Applied chords name their target after a slash: "V/V", "V7/ii", "vii°7/V" are built in the major key of the
 * target's root, so that the applied leading note is always raised.
 */
export function chordFromRoman(text: string, key: Key): Chord {
  const slash = text.lastIndexOf('/');
  if (slash > 0) {
    const target = chordFromRoman(text.slice(slash + 1), key);
    return chordFromRoman(text.slice(0, slash), { tonic: target.root, mode: 'major' });
  }
  const m = /^(♭|♯|b|#)?(VII|VI|V|IV|III|II|I|vii|vi|v|iv|iii|ii|i)(°|ø|\+)?(maj7|7|65|43|42|64|6)?$/.exec(text.trim());
  if (!m) throw new Error(`Not a Roman numeral: “${text}”`);
  const deg = NUMERALS.indexOf(m[2]!.toUpperCase());
  const upper = m[2] === m[2]!.toUpperCase();
  const base = keyScale(key)[deg]!;
  const shift = m[1] === '♭' || m[1] === 'b' ? -1 : m[1] === '♯' || m[1] === '#' ? 1 : 0;
  const root: PitchClassName = { letter: base.letter, alter: base.alter + shift };
  const fig = m[4] ?? '';
  const seventh = ['maj7', '7', '65', '43', '42'].includes(fig);
  let quality: ChordQuality;
  if (m[3] === '°') quality = seventh ? 'dim7' : 'dim';
  else if (m[3] === 'ø') quality = 'm7b5';
  else if (m[3] === '+') quality = 'aug';
  else if (seventh) quality = fig === 'maj7' ? 'maj7' : upper ? '7' : 'm7';
  else quality = upper ? 'maj' : 'min';
  // An upper-case seventh takes the key's own seventh above the root: I7 and IV7 in a major key are major sevenths, V7 is a dominant seventh.
  if (seventh && fig !== 'maj7' && upper && !m[3]) {
    const diatonicSeventh = transpose({ ...root, octave: 4 }, 'm7');
    const scaleHasMinorSeventh = keyScale(key).some((p) => pitchClass(p) === pitchClass(diatonicSeventh));
    quality = scaleHasMinorSeventh ? '7' : 'maj7';
  }
  const chord: Chord = { root, quality };
  const inv = seventh ? ['7', '65', '43', '42'].indexOf(fig === 'maj7' ? '7' : fig) : ['', '6', '64'].indexOf(fig);
  if (inv > 0) {
    const t = chordTones(chord)[inv]!;
    chord.bass = { letter: t.letter, alter: t.alter };
  }
  return chord;
}

export { fifthsOf, midi };
