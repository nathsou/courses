/**
 * Intervals between spelt pitches: a number (counted on the letters: C up to E is a third) and a
 * quality (perfect, major, minor, augmented, diminished) fixed by the number of semitones.
 */
import { diatonic, fromDiatonic, midi, type Pitch } from './pitch';

export type Quality = 'P' | 'M' | 'm' | 'A' | 'd' | 'AA' | 'dd';

export interface Interval {
  /** 1 = unison, 2 = second … 8 = octave, 9 = ninth … */
  number: number;
  quality: Quality;
  semitones: number;
}

/** Semitones of the perfect or major interval of each simple number (index 1–7). */
const REFERENCE = [0, 0, 2, 4, 5, 7, 9, 11];
const PERFECT_CLASS = new Set([1, 4, 5]);

const simple = (n: number): number => ((n - 1) % 7) + 1;
const reference = (n: number): number => REFERENCE[simple(n)]! + 12 * Math.floor((n - 1) / 7);

function qualityOf(number: number, semitones: number): Quality | undefined {
  const diff = semitones - reference(number);
  if (PERFECT_CLASS.has(simple(number))) return ({ '-2': 'dd', '-1': 'd', '0': 'P', '1': 'A', '2': 'AA' } as Record<string, Quality>)[diff];
  return ({ '-3': 'dd', '-2': 'd', '-1': 'm', '0': 'M', '1': 'A', '2': 'AA' } as Record<string, Quality>)[diff];
}

/** The interval from the lower of two pitches to the higher. */
export function intervalBetween(a: Pitch, b: Pitch): Interval {
  let [lo, hi] = [a, b];
  if (diatonic(b) < diatonic(a) || (diatonic(b) === diatonic(a) && midi(b) < midi(a))) [lo, hi] = [b, a];
  const number = diatonic(hi) - diatonic(lo) + 1;
  const semitones = midi(hi) - midi(lo);
  const quality = qualityOf(number, semitones);
  if (!quality) throw new Error(`No interval name for ${number} letters and ${semitones} semitones`);
  return { number, quality, semitones };
}

const QUALITY_WORDS: Record<Quality, string> = { P: 'perfect', M: 'major', m: 'minor', A: 'augmented', d: 'diminished', AA: 'doubly augmented', dd: 'doubly diminished' };
const NUMBER_WORDS = ['', 'unison', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'octave', 'ninth', 'tenth', 'eleventh', 'twelfth', 'thirteenth'];

/** "major third", "perfect fifth", "augmented fourth". */
export function intervalName(i: Interval): string {
  const n = NUMBER_WORDS[i.number] ?? `${i.number}th`;
  return `${QUALITY_WORDS[i.quality]} ${n}`;
}

/** "M3", "P5", "A4". */
export const intervalShort = (i: Interval): string => `${i.quality}${i.number}`;

/** Parse "M3", "m7", "P5", "A4", "d5", "P8", "M9". */
export function parseInterval(s: string): Interval {
  const m = /^(AA|dd|P|M|m|A|d)(\d+)$/.exec(s.trim());
  if (!m) throw new Error(`Not an interval: “${s}”`);
  const quality = m[1] as Quality;
  const number = Number(m[2]);
  const perfect = PERFECT_CLASS.has(simple(number));
  const offsets: Partial<Record<Quality, number>> = perfect ? { dd: -2, d: -1, P: 0, A: 1, AA: 2 } : { dd: -3, d: -2, m: -1, M: 0, A: 1, AA: 2 };
  const off = offsets[quality];
  if (off === undefined || number < 1) throw new Error(`No ${quality}${number} interval`);
  return { number, quality, semitones: reference(number) + off };
}

/** Transpose a pitch up (or down) by an interval, keeping the spelling correct. */
export function transpose(p: Pitch, i: Interval | string, direction: 1 | -1 = 1): Pitch {
  const iv = typeof i === 'string' ? parseInterval(i) : i;
  const target = fromDiatonic(diatonic(p) + direction * (iv.number - 1));
  const alter = midi(p) + direction * iv.semitones - midi(target);
  return { ...target, alter };
}

/** Invert an interval within the octave: M3 ↔ m6, P4 ↔ P5, A4 ↔ d5, P1 ↔ P8. Compound intervals are reduced first. */
export function invert(i: Interval): Interval {
  let { number, semitones } = i;
  while (number > 8) {
    number -= 7;
    semitones -= 12;
  }
  const inv = 9 - number;
  const s = 12 - semitones;
  return { number: inv, quality: qualityOf(inv, s)!, semitones: s };
}
