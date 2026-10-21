/**
 * Tuning: ratios and cents, and the temperaments of Chapter 42 as offsets from equal temperament, per pitch class,
 * with C as the reference (C is the same in all of them). A note in a temperament is played as a fractional MIDI
 * number: midi + offset / 100.
 */
import { mod } from './pitch';

/** Cents of a frequency ratio: 1200 × log2(ratio). */
export const cents = (ratio: number): number => 1200 * Math.log2(ratio);

export const PYTHAGOREAN_COMMA = cents(3 ** 12 / 2 ** 19); // ≈ 23.46
export const SYNTONIC_COMMA = cents(81 / 80); // ≈ 21.51

export type Temperament = 'equal' | 'pythagorean' | 'just' | 'meantone' | 'werckmeister';

export const TEMPERAMENT_NAMES: Record<Temperament, string> = {
  equal: 'Equal temperament',
  pythagorean: 'Pythagorean',
  just: 'Just intonation (C major)',
  meantone: 'Quarter-comma meantone',
  werckmeister: 'Werckmeister III',
};

/** Fifths from C for each pitch class in a chain from E♭ to G♯ (the usual layout of Pythagorean and meantone keyboards). */
const FIFTHS_FROM_C = [0, 7, 2, -3, 4, -1, 6, 1, 8, 3, -2, 5];

/** A chain of equal fifths of `fifth` cents, from E♭ to G♯, as offsets from equal temperament. */
function chain(fifth: number): number[] {
  return FIFTHS_FROM_C.map((n, pc) => {
    const raw = mod(n * fifth, 1200);
    let off = raw - pc * 100;
    if (off > 600) off -= 1200;
    if (off < -600) off += 1200;
    return off;
  });
}

/** 5-limit just intonation on C: C D E F G A B from the ratios 9/8, 5/4, 4/3, 3/2, 5/3, 15/8; chromatic notes 16/15, 6/5, 45/32, 8/5, 9/5. */
const JUST_RATIOS = [1, 16 / 15, 9 / 8, 6 / 5, 5 / 4, 4 / 3, 45 / 32, 3 / 2, 8 / 5, 5 / 3, 9 / 5, 15 / 8];

/** Werckmeister III (1691), as deviations from equal temperament with C at 0. */
const WERCKMEISTER = [0, -9.775, -7.82, -5.865, -9.775, -1.955, -11.73, -3.91, -7.82, -11.73, -3.91, -7.82];

export function offsets(t: Temperament): number[] {
  switch (t) {
    case 'pythagorean':
      return chain(cents(3 / 2));
    case 'meantone':
      // Quarter-comma: each fifth narrowed by a quarter of the syntonic comma, so four fifths make a pure major third.
      return chain(cents(3 / 2) - SYNTONIC_COMMA / 4);
    case 'just':
      return JUST_RATIOS.map((r, pc) => cents(r) - pc * 100);
    case 'werckmeister':
      return [...WERCKMEISTER];
    default:
      return Array(12).fill(0);
  }
}

/** A MIDI note in a temperament, as a fractional MIDI number. */
export function tuned(m: number, t: Temperament): number {
  return m + offsets(t)[mod(Math.round(m), 12)]! / 100;
}

/** Size in cents of the interval from note a to note b (MIDI) in a temperament. */
export function intervalCents(a: number, b: number, t: Temperament): number {
  return (tuned(b, t) - tuned(a, t)) * 100;
}

/** Pure intervals for comparison, in cents. */
export const PURE: Record<string, number> = {
  'major third': cents(5 / 4),
  'minor third': cents(6 / 5),
  'perfect fifth': cents(3 / 2),
  'perfect fourth': cents(4 / 3),
};
