/** Checking for the `spell` exercise: notes written by the reader against the answer. Pure. */
import { midi, parsePitch, spellings, type Pitch } from '$lib/music/pitch';

export interface SpellItem {
  ask: string;
  answer: string[];
  /** Octaves count (default false: letters and accidentals only). */
  octave?: boolean;
}

export type SpellVerdict = { ok: true } | { ok: false; why: 'missing' | 'extra' | 'spelling' | 'octave' | 'notes'; detail: string };

const nameOf = (p: Pitch) => `${p.letter}${p.alter > 0 ? '#'.repeat(p.alter) : 'b'.repeat(-p.alter)}`;

export function checkSpelling(written: Pitch[], item: SpellItem): SpellVerdict {
  const want = item.answer.map((n) => parsePitch(n));
  if (item.octave) {
    const w = new Set(want.map((p) => `${nameOf(p)}${p.octave}`));
    const g = new Set(written.map((p) => `${nameOf(p)}${p.octave}`));
    if ([...w].every((x) => g.has(x)) && g.size === w.size) return { ok: true };
  } else {
    const w = new Set(want.map(nameOf));
    const g = new Set(written.map(nameOf));
    if ([...w].every((x) => g.has(x)) && [...g].every((x) => w.has(x))) return { ok: true };
  }
  // Why not: right keys, wrong names? Right names, wrong octave? Missing or extra notes?
  const pcs = (ps: Pitch[], oct: boolean) => new Set(ps.map((p) => (oct ? midi(p) : midi(p) % 12)));
  const sameKeys = (oct: boolean) => {
    const a = pcs(want, oct);
    const b = pcs(written, oct);
    return a.size === b.size && [...a].every((x) => b.has(x));
  };
  if (sameKeys(!!item.octave)) return { ok: false, why: 'spelling', detail: 'The right keys, but at least one note needs its other name.' };
  if (item.octave && sameKeys(false)) return { ok: false, why: 'octave', detail: 'The right notes, but not all in the right octave.' };
  const wantN = new Set(want.map(nameOf)).size;
  const gotN = new Set(written.map(nameOf)).size;
  if (gotN < wantN) return { ok: false, why: 'missing', detail: `${wantN - gotN} more ${wantN - gotN === 1 ? 'note' : 'notes'} needed.` };
  if (gotN > wantN) return { ok: false, why: 'extra', detail: `${gotN - wantN} too many.` };
  return { ok: false, why: 'notes', detail: 'Not these notes.' };
}

/** The next spelling of a written note: C♯ → D♭ → B𝄪 → C♯; F → E♯ → G𝄫 → F. */
export function respellNote(p: Pitch): Pitch {
  const all = spellings(p);
  const i = all.findIndex((q) => q.letter === p.letter && q.alter === p.alter);
  return all[(i + 1) % all.length] ?? p;
}
