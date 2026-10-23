/** Writing score text from pitches: for widgets and exercises that draw what the reader plays. */
import { type Pitch } from '$lib/music/pitch';

/** "C4" → "c'", "F#3" → "f#", "Bb2" → "bb,". */
export function pitchToken(p: Pitch): string {
  const acc = p.alter === 1 ? '#' : p.alter === 2 ? '##' : p.alter === -1 ? 'b' : p.alter === -2 ? 'bb' : '';
  const marks = p.octave >= 3 ? "'".repeat(p.octave - 3) : ','.repeat(3 - p.octave);
  return p.letter.toLowerCase() + acc + marks;
}

const group = (ps: Pitch[], dur: string) => (ps.length === 0 ? `s${dur}` : ps.length === 1 ? `${pitchToken(ps[0]!)}${dur}` : `<${ps.map(pitchToken).join(' ')}>${dur}`);

/**
 * A one-bar score holding pitches as a chord of semibreves. `staff` 'grand' splits them at middle C
 * (C4 and above in the treble). Key is written as "\key g \major" text, or omitted.
 */
export function chordScore(pitches: Pitch[], opts: { staff?: 'treble' | 'bass' | 'grand'; key?: string } = {}): string {
  const key = opts.key ?? '';
  const staff = opts.staff ?? 'grand';
  if (staff !== 'grand') return `${key} \\hidetime \\staff ${staff} ${group(pitches, '1')} |`;
  const high = pitches.filter((p) => p.octave >= 4);
  const low = pitches.filter((p) => p.octave < 4);
  return `${key} \\hidetime \\staff treble ${group(high, '1')} | \\staff bass ${group(low, '1')} |`;
}

/** Notes in sequence, one per beat, on one staff or split across a grand staff. */
export function melodyScore(pitches: Pitch[], opts: { staff?: 'treble' | 'bass'; key?: string; dur?: string } = {}): string {
  const d = opts.dur ?? '4';
  return `${opts.key ?? ''} \\hidetime \\time ${pitches.length}/4 \\staff ${opts.staff ?? 'treble'} ${pitches.map((p) => pitchToken(p) + d).join(' ')} |`;
}

/** "\key ef \major"-style text for a key given as tonic and mode ("Eb", "major"). */
export function keyText(tonic: string, mode: 'major' | 'minor'): string {
  const m = /^([A-G])(#|b|♯|♭)?$/.exec(tonic);
  if (!m) return '';
  const acc = m[2] === '#' || m[2] === '♯' ? '#' : m[2] === 'b' || m[2] === '♭' ? 'b' : '';
  return `\\key ${m[1]!.toLowerCase()}${acc} \\${mode}`;
}
