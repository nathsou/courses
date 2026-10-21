/**
 * Voicing a progression at the piano: the left hand takes the bass (the root, or the written bass of an
 * inversion), the right hand a close three- or four-note chord, each chord placed as near as possible to the
 * one before (the smallest total movement of the right hand), as a pianist would play it.
 */
import { chordTones, type Chord } from './chord';
import { midi, pitchClass, type Pitch } from './pitch';

/** Stack tones upwards from `octave`, starting with tone `inv` (0 = root position). */
export function stack(tones: Pitch[], inv: number, octave: number): Pitch[] {
  const v: Pitch[] = [];
  for (const t of [...tones.slice(inv), ...tones.slice(0, inv)]) {
    let p = { ...t, octave };
    while (v.length && midi(p) <= midi(v.at(-1)!)) p = { ...p, octave: p.octave + 1 };
    v.push(p);
  }
  return v;
}

export interface Voiced {
  chord: Chord;
  /** Left hand: one bass note. */
  bass: Pitch;
  /** Right hand: close position, low to high. */
  upper: Pitch[];
}

export interface VoiceOptions {
  /** Lowest and highest right-hand note (MIDI). */
  lo?: number;
  hi?: number;
  /** Lowest and highest bass note. */
  bassLo?: number;
  bassHi?: number;
}

/** Voice a progression with smooth right-hand movement and a bass in the left hand's middle register. */
export function voiceProgression(chords: Chord[], opts: VoiceOptions = {}): Voiced[] {
  const lo = opts.lo ?? 55;
  const hi = opts.hi ?? 79;
  const bassLo = opts.bassLo ?? 40;
  const bassHi = opts.bassHi ?? 55;
  const out: Voiced[] = [];
  for (const c of chords) {
    const tones = chordTones(c);
    const want = c.bass ?? c.root;
    let bass: Pitch = { ...want, octave: 2 };
    while (midi(bass) < bassLo) bass = { ...bass, octave: bass.octave + 1 };
    while (midi(bass) > bassHi) bass = { ...bass, octave: bass.octave - 1 };
    // The bass's previous octave, if close, keeps the line smooth.
    const prevBass = out.at(-1)?.bass;
    if (prevBass) {
      const alt = [{ ...bass, octave: bass.octave - 1 }, { ...bass, octave: bass.octave + 1 }].filter((b) => midi(b) >= bassLo - 2 && midi(b) <= bassHi + 2);
      for (const b of alt) if (Math.abs(midi(b) - midi(prevBass)) < Math.abs(midi(bass) - midi(prevBass))) bass = b;
    }
    const prev = out.at(-1)?.upper.map(midi);
    let best: Pitch[] | undefined;
    let bestCost = Infinity;
    for (let inv = 0; inv < tones.length; inv++)
      for (const oct of [3, 4, 5]) {
        const v = stack(tones, inv, oct);
        if (midi(v[0]!) < lo || midi(v.at(-1)!) > hi) continue;
        const cost = prev ? v.reduce((a, p, i) => a + Math.abs(midi(p) - (prev[i] ?? prev.at(-1)!)), 0) : Math.abs(midi(v[0]!) - 62) + inv * 0.5;
        if (cost < bestCost) {
          bestCost = cost;
          best = v;
        }
      }
    out.push({ chord: c, bass, upper: best ?? stack(tones, 0, 4) });
  }
  return out;
}

/** The function of a chord in a key, from its Roman numeral: tonic, predominant or dominant. */
export function functionOf(roman: string): 'tonic' | 'predominant' | 'dominant' | undefined {
  const r = roman.replace(/^[♭♯b#]/, '').replace(/(maj7|ø7|°7|7|65|43|42|64|6|°|ø|\+)$/g, '').replace(/(maj7|ø7|°7|7|65|43|42|64|6|°|ø|\+)$/g, '');
  const base = r.split('/')[0]!;
  if (roman.includes('/')) return 'dominant'; // applied chords act as dominants of their target
  const u = base.toUpperCase();
  if (u === 'I' || u === 'VI' || u === 'III') return 'tonic';
  if (u === 'II' || u === 'IV') return 'predominant';
  if (u === 'V' || u === 'VII') return 'dominant';
  return undefined;
}

export { pitchClass };
