/** Durations in ticks (480 per crotchet), metre and the arithmetic of bars. */

export const PPQ = 480;
export const WHOLE = 4 * PPQ;

/** Note values by their power-of-two denominator: 1 = semibreve, 2 = minim, 4 = crotchet, 8 = quaver, 16 = semiquaver, 32. */
export type Denominator = 1 | 2 | 4 | 8 | 16 | 32;

export interface Duration {
  value: Denominator;
  dots: number;
  /** Tuplet ratio as [actual, normal]: [3, 2] for a triplet. */
  tuplet?: [number, number];
}

export function ticks(d: Duration): number {
  let t = WHOLE / d.value;
  let add = t;
  for (let i = 0; i < d.dots; i++) {
    add /= 2;
    t += add;
  }
  if (d.tuplet) t = (t * d.tuplet[1]) / d.tuplet[0];
  return t;
}

export interface TimeSignature {
  beats: number;
  unit: Denominator;
}

export const barTicks = (ts: TimeSignature): number => ts.beats * (WHOLE / ts.unit);

/** Compound metres (6/8, 9/8, 12/8) group their beats in threes. */
export const isCompound = (ts: TimeSignature): boolean => ts.unit >= 8 && ts.beats % 3 === 0 && ts.beats > 3;

/** Ticks per felt beat: a dotted crotchet in 6/8, a crotchet in 4/4. */
export const beatTicks = (ts: TimeSignature): number => (isCompound(ts) ? 3 : 1) * (WHOLE / ts.unit);

/** Milliseconds per tick at a tempo in felt beats per minute. */
export const msPerTick = (bpm: number, ts: TimeSignature): number => 60000 / bpm / beatTicks(ts);
