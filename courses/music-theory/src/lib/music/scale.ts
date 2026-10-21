/** Scales and keys: patterns of intervals above a tonic, spelt one letter per degree where the scale has seven notes. */
import { transpose, type Interval, parseInterval } from './interval';
import { letterIndex, LETTERS, midi, mod, pitchClass, type Letter, type Pitch, type PitchClassName } from './pitch';

export type ScaleKind =
  | 'major' | 'natural-minor' | 'harmonic-minor' | 'melodic-minor' | 'major-pentatonic' | 'minor-pentatonic'
  | 'dorian' | 'phrygian' | 'lydian' | 'mixolydian' | 'locrian'
  | 'blues' | 'whole-tone' | 'octatonic-hw' | 'octatonic-wh' | 'bebop-dominant';

const PATTERNS: Record<ScaleKind, string[]> = {
  major: ['P1', 'M2', 'M3', 'P4', 'P5', 'M6', 'M7'],
  'natural-minor': ['P1', 'M2', 'm3', 'P4', 'P5', 'm6', 'm7'],
  'harmonic-minor': ['P1', 'M2', 'm3', 'P4', 'P5', 'm6', 'M7'],
  'melodic-minor': ['P1', 'M2', 'm3', 'P4', 'P5', 'M6', 'M7'],
  'major-pentatonic': ['P1', 'M2', 'M3', 'P5', 'M6'],
  'minor-pentatonic': ['P1', 'm3', 'P4', 'P5', 'm7'],
  // The modes of the major scale (Ionian is major, Aeolian natural minor).
  dorian: ['P1', 'M2', 'm3', 'P4', 'P5', 'M6', 'm7'],
  phrygian: ['P1', 'm2', 'm3', 'P4', 'P5', 'm6', 'm7'],
  lydian: ['P1', 'M2', 'M3', 'A4', 'P5', 'M6', 'M7'],
  mixolydian: ['P1', 'M2', 'M3', 'P4', 'P5', 'M6', 'm7'],
  locrian: ['P1', 'm2', 'm3', 'P4', 'd5', 'm6', 'm7'],
  // The blues scale: minor pentatonic with the flattened fifth.
  blues: ['P1', 'm3', 'P4', 'd5', 'P5', 'm7'],
  'whole-tone': ['P1', 'M2', 'M3', 'A4', 'A5', 'A6'],
  // Octatonic (diminished) scales: half step first, or whole step first.
  'octatonic-hw': ['P1', 'm2', 'm3', 'M3', 'A4', 'P5', 'M6', 'm7'],
  'octatonic-wh': ['P1', 'M2', 'm3', 'P4', 'd5', 'm6', 'M6', 'M7'],
  // Mixolydian with a passing major seventh, so that chord tones fall on the beats.
  'bebop-dominant': ['P1', 'M2', 'M3', 'P4', 'P5', 'M6', 'm7', 'M7'],
};

/** Display names of scale kinds. */
export const SCALE_NAMES: Record<ScaleKind, string> = {
  major: 'major (Ionian)', 'natural-minor': 'natural minor (Aeolian)', 'harmonic-minor': 'harmonic minor', 'melodic-minor': 'melodic minor',
  'major-pentatonic': 'major pentatonic', 'minor-pentatonic': 'minor pentatonic', dorian: 'Dorian', phrygian: 'Phrygian', lydian: 'Lydian',
  mixolydian: 'Mixolydian', locrian: 'Locrian', blues: 'blues', 'whole-tone': 'whole-tone', 'octatonic-hw': 'octatonic (half–whole)',
  'octatonic-wh': 'octatonic (whole–half)', 'bebop-dominant': 'bebop dominant',
};

export function scaleIntervals(kind: ScaleKind): Interval[] {
  return PATTERNS[kind].map(parseInterval);
}

/** The notes of a scale, ascending from `tonic`, one octave (the upper tonic is not repeated). */
export function scale(tonic: Pitch, kind: ScaleKind = 'major'): Pitch[] {
  return scaleIntervals(kind).map((i) => transpose(tonic, i));
}

/** Steps between consecutive degrees, in semitones, including the step back up to the tonic. */
export function stepPattern(kind: ScaleKind): number[] {
  const s = scaleIntervals(kind).map((i) => i.semitones);
  return s.map((x, i) => (s[i + 1] ?? 12) - x);
}

// ───────────────────────── Keys ─────────────────────────

export type Mode = 'major' | 'minor';

export interface Key {
  tonic: PitchClassName;
  mode: Mode;
}

/** Sharps (positive) or flats (negative) in the key signature. */
export function fifthsOf(key: Key): number {
  // Position on the line of fifths (… F C G D A E B …, C = 0); a sharp moves 7 places right, a flat 7 left.
  const base: Record<Letter, number> = { C: 0, D: 2, E: 4, F: -1, G: 1, A: 3, B: 5 };
  const f = base[key.tonic.letter] + 7 * key.tonic.alter;
  return key.mode === 'major' ? f : f - 3;
}

/** The key with a given signature: 0 → C major / A minor, 1 → G major / E minor, −3 → E♭ major / C minor. */
export function keyFromFifths(fifths: number, mode: Mode = 'major'): Key {
  const f = mode === 'major' ? fifths : fifths + 3;
  const order: Letter[] = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
  const i = mod(f + 1, 7);
  const alter = Math.floor((f + 1) / 7);
  return { tonic: { letter: order[i]!, alter }, mode };
}

/** Diatonic notes of a key (natural minor for minor keys), from the tonic, in octave 4. */
export function keyScale(key: Key): Pitch[] {
  return scale({ ...key.tonic, octave: 4 }, key.mode === 'major' ? 'major' : 'natural-minor');
}

/** Scale degree (1–7) of a spelt note in a key, or undefined when the letter matches but the note is altered. */
export function degreeOf(p: PitchClassName, key: Key): number | undefined {
  const notes = keyScale(key);
  const d = mod(letterIndex(p.letter) - letterIndex(key.tonic.letter), 7);
  return pitchClass(notes[d]!) === pitchClass(p) ? d + 1 : undefined;
}

/** All twelve major keys in circle-of-fifths order from G♭ (6 flats) to F♯ (6 sharps). */
export const CIRCLE: readonly number[] = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];

export function sameKey(a: Key, b: Key): boolean {
  return a.mode === b.mode && a.tonic.letter === b.tonic.letter && a.tonic.alter === b.tonic.alter;
}

/** True if the MIDI note belongs to the key (natural minor in minor keys). */
export function inKey(m: number, key: Key): boolean {
  return keyScale(key).some((p) => mod(midi(p) - m, 12) === 0);
}

export { LETTERS };
