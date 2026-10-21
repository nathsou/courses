/**
 * SMuFL code points in Bravura (static/fonts/Bravura.woff2, SIL OFL) and the few engraving metrics the
 * layout needs, in staff spaces. The font's em is four staff spaces, so it is drawn at 4 × the space.
 * Metrics are from Bravura's metadata (glyph advance widths and engraving defaults).
 */

export const G = {
  gClef: '',
  fClef: '',
  brace: '',
  noteheadWhole: '',
  noteheadHalf: '',
  noteheadBlack: '',
  dot: '',
  flat: '',
  natural: '',
  sharp: '',
  doubleSharp: '',
  doubleFlat: '',
} as const;

export const ACCIDENTAL_GLYPH: Record<number, string> = { [-2]: G.doubleFlat, [-1]: G.flat, 0: G.natural, 1: G.sharp, 2: G.doubleSharp };

export const REST_GLYPH: Record<number, string> = { 1: '', 2: '', 4: '', 8: '', 16: '', 32: '' };

export const FLAG_UP: Record<number, string> = { 8: '', 16: '', 32: '' };
export const FLAG_DOWN: Record<number, string> = { 8: '', 16: '', 32: '' };

export const M = {
  noteheadBlack: 1.18,
  noteheadWhole: 1.688,
  restWhole: 1.128,
  stem: 0.12,
  staffLine: 0.13,
  legerLine: 0.16,
  thinBarline: 0.16,
  thickBarline: 0.5,
} as const;
