/**
 * Note names in the three systems the reader can choose: letters (C D E … B), fixed-do solfège
 * (Do Re Mi … Si; Ré in French) and German (C D E … H, where B means B♭ and sharps and flats are
 * the suffixes -is and -es). Octave numbers are scientific in every system (middle C is 4).
 */
import type { Letter, Pitch, PitchClassName } from './pitch';
import { letterIndex } from './pitch';

export type NoteNameSystem = 'letters' | 'solfege' | 'german';

export interface NameOptions {
  system?: NoteNameSystem;
  /** Use Ré rather than Re (French). */
  accentedRe?: boolean;
  /** Plain ASCII accidentals (#, b) instead of ♯ and ♭. */
  ascii?: boolean;
}

const SOLFEGE = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si'];

function accidental(alter: number, ascii: boolean): string {
  if (alter === 0) return '';
  if (ascii) return alter > 0 ? '#'.repeat(alter) : 'b'.repeat(-alter);
  if (alter === 2) return '𝄪';
  if (alter === -2) return '𝄫';
  return (alter > 0 ? '♯' : '♭').repeat(Math.abs(alter));
}

function germanName(letter: Letter, alter: number): string {
  if (alter > 0) return (letter === 'B' ? 'H' : letter) + 'is'.repeat(alter);
  if (alter === 0) return letter === 'B' ? 'H' : letter;
  // Flats: E → Es, A → As, B → B (one flat) or Heses (two); otherwise the suffix -es.
  if (letter === 'B') return alter === -1 ? 'B' : 'Heses';
  if (letter === 'E') return alter === -1 ? 'Es' : 'Eses';
  if (letter === 'A') return alter === -1 ? 'As' : 'Asas';
  return letter + 'es'.repeat(-alter);
}

/** The name of a spelt note without its octave: "F♯", "Fa♯", "Fis". */
export function noteName(p: PitchClassName, opts: NameOptions = {}): string {
  const system = opts.system ?? 'letters';
  if (system === 'german') return germanName(p.letter, p.alter);
  const base = system === 'solfege' ? SOLFEGE[letterIndex(p.letter)]!.replace(/^Re$/, opts.accentedRe ? 'Ré' : 'Re') : p.letter;
  return base + accidental(p.alter, opts.ascii ?? false);
}

/** The name of a pitch with its octave: "C4", "Do4", "Fis3". */
export function pitchName(p: Pitch, opts: NameOptions = {}): string {
  return noteName(p, opts) + String(p.octave);
}
