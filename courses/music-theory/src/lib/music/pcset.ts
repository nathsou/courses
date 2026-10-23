/**
 * Pitch-class sets and twelve-tone rows (Chapter 41). Pitch classes are integers 0–11 with C = 0 ("integer notation").
 */
import { mod } from './pitch';

export const pcs = (notes: number[]): number[] => [...new Set(notes.map((n) => mod(n, 12)))].sort((a, b) => a - b);

/** Rotations of a sorted set, each starting from a different member. */
function rotations(set: number[]): number[][] {
  return set.map((_, i) => [...set.slice(i), ...set.slice(0, i)]);
}

const span = (r: number[]) => mod(r.at(-1)! - r[0]!, 12);

/**
 * Normal form: the rotation packed most tightly to the left (smallest span from first to last; ties broken by the
 * smaller interval from the first to the second-last, then third-last …), transposed nowhere.
 */
export function normalForm(notes: number[]): number[] {
  const set = pcs(notes);
  if (set.length <= 1) return set;
  let best = rotations(set);
  for (let k = set.length - 1; k >= 1 && best.length > 1; k--) {
    const size = (r: number[]) => mod(r[k]! - r[0]!, 12);
    const min = Math.min(...best.map(size));
    best = best.filter((r) => size(r) === min);
  }
  // Remaining ties (symmetrical sets): the one starting on the lowest pitch class.
  return best.sort((a, b) => a[0]! - b[0]!)[0]!;
}

/** Transposed to start on 0. */
const zero = (r: number[]) => r.map((x) => mod(x - r[0]!, 12));

/** Prime form: the more packed of the normal forms of the set and its inversion, transposed to 0. */
export function primeForm(notes: number[]): number[] {
  if (pcs(notes).length === 0) return [];
  const a = zero(normalForm(notes));
  const b = zero(normalForm(notes.map((n) => -n)));
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i]! < b[i]! ? a : b;
  return a;
}

/** Interval-class vector: how many of each interval class 1–6 the set contains. */
export function intervalVector(notes: number[]): number[] {
  const set = pcs(notes);
  const v = [0, 0, 0, 0, 0, 0];
  for (let i = 0; i < set.length; i++)
    for (let j = i + 1; j < set.length; j++) {
      const d = mod(set[j]! - set[i]!, 12);
      v[Math.min(d, 12 - d) - 1]!++;
    }
  return v;
}

/** Forte names of the trichords, by prime form. */
export const TRICHORDS: Record<string, string> = {
  '012': '3-1',
  '013': '3-2',
  '014': '3-3',
  '015': '3-4',
  '016': '3-5',
  '024': '3-6',
  '025': '3-7',
  '026': '3-8',
  '027': '3-9',
  '036': '3-10',
  '037': '3-11',
  '048': '3-12',
};

export const primeText = (p: number[]): string => p.map((x) => (x === 10 ? 'T' : x === 11 ? 'E' : String(x))).join('');

// ───────────────────────── Twelve-tone rows ─────────────────────────

export const transposeRow = (row: number[], n: number) => row.map((x) => mod(x + n, 12));
export const invertRow = (row: number[]) => row.map((x) => mod(2 * row[0]! - x, 12));
export const retrograde = (row: number[]) => [...row].reverse();

/** Whether a row uses each pitch class exactly once. */
export const isRow = (row: number[]) => row.length === 12 && new Set(row.map((x) => mod(x, 12))).size === 12;

/**
 * The 12 × 12 matrix: row k is the prime form transposed to start on the k-th note of the inversion, so reading
 * across gives the primes (P), back gives the retrogrades (R), down the inversions (I), up the retrograde-inversions
 * (RI). Labels use the starting pitch class (P0 starts on C).
 */
export function matrix(row: number[]): number[][] {
  const inv = invertRow(row);
  return inv.map((start) => transposeRow(row, start - row[0]!));
}
