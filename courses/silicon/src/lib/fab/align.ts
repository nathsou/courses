/**
 * Self-alignment, in one dimension along the channel. Before 1968 the source and drain were diffused first and
 * the aluminium gate placed afterwards by a second mask, with an overlay error; the gate had to be drawn longer
 * than the channel so that it still covered the channel when misplaced. With a silicon gate made first, the
 * source and drain are implanted using the gate itself as the mask, so they start at its edges wherever it
 * lands. Lengths in µm; the numbers are illustrative of a 1960s process.
 */

export type GateProcess = 'metal' | 'self';

export interface AlignInput {
  /** The channel length the designer wants. */
  length: number;
  /** For a metal gate: how far the drawn gate extends past each end of the channel. */
  overlap: number;
  /** Where the gate actually lands, relative to where it was meant to go (+ towards the drain). */
  misalign: number;
  /** For a self-aligned gate: how far the implanted dopant spreads sideways under the gate's edges. */
  lateral?: number;
}

export interface AlignResult {
  gate: [number, number];
  /** The source ends and the drain begins at these positions. */
  sourceEnd: number;
  drainStart: number;
  /** Lengths of channel not covered by the gate, on the source side and the drain side (no channel forms there). */
  gapSource: number;
  gapDrain: number;
  /** Lengths of gate over the source and over the drain. */
  overlapSource: number;
  overlapDrain: number;
  works: boolean;
  /** Gate capacitance relative to that of the channel under it alone (the overlaps add to it). */
  capacitance: number;
}

export const LATERAL = 0.2;

export function alignGate(process: GateProcess, a: AlignInput): AlignResult {
  const L = a.length;
  const lateral = a.lateral ?? LATERAL;
  let gate: [number, number];
  let sourceEnd: number;
  let drainStart: number;
  if (process === 'metal') {
    sourceEnd = -L / 2;
    drainStart = L / 2;
    gate = [-L / 2 - a.overlap + a.misalign, L / 2 + a.overlap + a.misalign];
  } else {
    gate = [-L / 2 + a.misalign, L / 2 + a.misalign];
    sourceEnd = gate[0] + lateral;
    drainStart = gate[1] - lateral;
  }
  const gapSource = Math.max(0, gate[0] - sourceEnd);
  const gapDrain = Math.max(0, drainStart - gate[1]);
  const overlapSource = Math.max(0, sourceEnd - gate[0]);
  const overlapDrain = Math.max(0, gate[1] - drainStart);
  const works = gapSource === 0 && gapDrain === 0;
  const channel = Math.max(0, drainStart - sourceEnd);
  const covered = channel - gapSource - gapDrain;
  return { gate, sourceEnd, drainStart, gapSource, gapDrain, overlapSource, overlapDrain, works, capacitance: (covered + overlapSource + overlapDrain) / channel };
}

/** The error function (Abramowitz and Stegun 7.1.26, accurate to about 1.5e-7). */
export function erf(x: number): number {
  const s = Math.sign(x);
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return s * y;
}

/** The fraction of metal-gate transistors that work when misalignment is Gaussian with standard deviation sigma. */
export function alignYield(overlap: number, sigma: number): number {
  return erf(overlap / (sigma * Math.SQRT2));
}
