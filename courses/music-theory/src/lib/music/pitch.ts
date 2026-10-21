/**
 * Pitches: a letter, an alteration (sharps positive, flats negative) and an octave in scientific pitch
 * notation (middle C is C4; the octave number changes between B and C). MIDI note 60 is C4.
 */

export type Letter = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';

export const LETTERS: readonly Letter[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

/** Semitones above C of each natural note. */
const NATURAL: readonly number[] = [0, 2, 4, 5, 7, 9, 11];

export interface Pitch {
  letter: Letter;
  /** −2 … 2: double flat … double sharp. */
  alter: number;
  octave: number;
}

/** A spelt pitch without an octave (C♯, B♭). */
export interface PitchClassName {
  letter: Letter;
  alter: number;
}

export const letterIndex = (l: Letter): number => LETTERS.indexOf(l);

export const mod = (n: number, m: number): number => ((n % m) + m) % m;

export function midi(p: Pitch): number {
  return 12 * (p.octave + 1) + NATURAL[letterIndex(p.letter)]! + p.alter;
}

/** Pitch class 0–11 (C = 0) of a spelt pitch or a MIDI number. */
export function pitchClass(p: Pitch | PitchClassName | number): number {
  if (typeof p === 'number') return mod(p, 12);
  return mod(NATURAL[letterIndex(p.letter)]! + p.alter, 12);
}

/** Equal-tempered frequency in hertz, with A4 = 440 Hz by default. */
export function frequency(m: number, a4 = 440): number {
  return a4 * 2 ** ((m - 69) / 12);
}

/** Diatonic step number: C4 = 28 (7 × 4), D4 = 29 … used for staff positions and interval numbers. */
export function diatonic(p: Pitch): number {
  return 7 * p.octave + letterIndex(p.letter);
}

export function fromDiatonic(step: number, alter = 0): Pitch {
  return { letter: LETTERS[mod(step, 7)]!, alter, octave: Math.floor(step / 7) };
}

const ACCIDENTAL_ASCII: Record<string, number> = { '#': 1, '##': 2, x: 2, b: -1, bb: -2, '': 0 };
const ACCIDENTAL_UNICODE: Record<string, number> = { '♯': 1, '𝄪': 2, '♭': -1, '𝄫': -2, '♮': 0 };

/** Parse "C4", "F#3", "Bb5", "E♭4", "Cx4", "Dbb2". Without an octave, `octave` defaults to 4. */
export function parsePitch(s: string, octave = 4): Pitch {
  const m = /^([A-Ga-g])(##|#|x|bb|b|♯|♭|𝄪|𝄫|♮)?(-?\d+)?$/.exec(s.trim());
  if (!m) throw new Error(`Not a pitch: “${s}”`);
  const acc = m[2] ?? '';
  const alter = acc in ACCIDENTAL_ASCII ? ACCIDENTAL_ASCII[acc]! : ACCIDENTAL_UNICODE[acc]!;
  return { letter: m[1]!.toUpperCase() as Letter, alter, octave: m[3] === undefined ? octave : Number(m[3]) };
}

export const samePitch = (a: Pitch, b: Pitch): boolean => a.letter === b.letter && a.alter === b.alter && a.octave === b.octave;

// ───────────────────────── Spelling ─────────────────────────

/** Order of sharps (F C G D A E B); flats are the reverse. */
const SHARP_ORDER: readonly Letter[] = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];

/**
 * The alteration of each letter in a key signature with `fifths` sharps (positive) or flats (negative).
 * C major / A minor is 0; G major is 1; F major is −1.
 */
export function signatureAlterations(fifths: number): Record<Letter, number> {
  const out: Record<Letter, number> = { C: 0, D: 0, E: 0, F: 0, G: 0, A: 0, B: 0 };
  if (fifths > 0) for (const l of SHARP_ORDER.slice(0, fifths)) out[l] = 1;
  if (fifths < 0) for (const l of [...SHARP_ORDER].reverse().slice(0, -fifths)) out[l] = -1;
  return out;
}

/**
 * Spell a MIDI note in a key with `fifths` sharps or flats. Notes of the key take the key's spelling;
 * other notes are spelt with sharps in sharp keys and with flats in flat keys (and in C major: sharps,
 * except B♭ and E♭, which are the commoner chromatic notes there).
 */
export function spell(m: number, fifths = 0): Pitch {
  const pc = mod(m, 12);
  const sig = signatureAlterations(fifths);
  for (const l of LETTERS) {
    if (pitchClass({ letter: l, alter: sig[l] }) === pc) return withOctave(l, sig[l], m);
  }
  const preferFlats = fifths < 0 || (fifths === 0 && (pc === 10 || pc === 3));
  for (const l of LETTERS) {
    const alter = mod(pc - NATURAL[letterIndex(l)]! + 6, 12) - 6;
    if (alter === (preferFlats ? -1 : 1)) return withOctave(l, alter, m);
  }
  // Not reachable for |fifths| ≤ 7: every pitch class is a natural or one sharp or flat away from one.
  for (const l of LETTERS) if (NATURAL[letterIndex(l)] === pc) return withOctave(l, 0, m);
  throw new Error(`Cannot spell ${m}`);
}

/** The octave of a spelt note follows its letter: B♯3 sounds as C4, C♭4 sounds as B3. */
function withOctave(letter: Letter, alter: number, m: number): Pitch {
  const natural = m - alter;
  return { letter, alter, octave: Math.floor(natural / 12) - 1 };
}

/** Respell a pitch with a different letter (e.g. C♯4 → D♭4); undefined if it would need more than two accidentals. */
export function respell(p: Pitch, letter: Letter): Pitch | undefined {
  const m = midi(p);
  for (const octave of [p.octave - 1, p.octave, p.octave + 1]) {
    const q = { letter, alter: 0, octave };
    const alter = m - midi(q);
    if (Math.abs(alter) <= 2) return { letter, alter, octave };
  }
  return undefined;
}

/** The other common spelling of a black key (C♯ ↔ D♭); undefined for naturals without a common alternative. */
export function enharmonic(p: Pitch): Pitch | undefined {
  const i = letterIndex(p.letter);
  if (p.alter > 0) return respell(p, LETTERS[(i + 1) % 7]!);
  if (p.alter < 0) return respell(p, LETTERS[(i + 6) % 7]!);
  return undefined;
}

export const isBlackKey = (m: number): boolean => [1, 3, 6, 8, 10].includes(mod(m, 12));
