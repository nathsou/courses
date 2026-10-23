/**
 * What a score says about one of its notes, for the hover and keyboard explanations in Score.svelte:
 * the pitches, the note value, the interval from the note before, and the harmony sounding at that moment.
 * Pure: names are returned as pitches and British terms, and the component spells them in the reader's settings.
 */
import { chordTones, identifyChord, romanNumeral, romanText, type Chord } from '$lib/music/chord';
import { intervalBetween, type Interval } from '$lib/music/interval';
import { midi, mod, pitchClass, type Pitch, type PitchClassName } from '$lib/music/pitch';
import { ticks, type Denominator } from '$lib/music/rhythm';
import { keyFromFifths, keyScale, type Key } from '$lib/music/scale';
import type { Score, ScoreEvent } from './parse';

export const VALUE_NAMES: Record<Denominator, string> = { 1: 'semibreve', 2: 'minim', 4: 'crotchet', 8: 'quaver', 16: 'semiquaver', 32: 'demisemiquaver' };

export interface ValueName {
  /** British name of the undotted value: "crotchet". */
  base: string;
  dots: number;
  /** 3 for a triplet. */
  tuplet?: number;
  rest: boolean;
}

export interface Explained {
  event: ScoreEvent;
  /** The event's pitches, lowest first. */
  pitches: Pitch[];
  value: ValueName;
  /** Between the two notes of a two-note event. */
  interval?: Interval;
  /** From the previous note in the same voice (single notes only): direction 1 up, −1 down, 0 the same note. */
  step?: { interval: Interval; dir: 1 | -1 | 0 };
  /** The chord formed by everything sounding at this moment, on every staff, when it has a name. */
  harmony?: { chord: Chord; roman?: string; key: Key };
}

const sounding = (score: Score, tick: number): Pitch[] =>
  score.staves.flatMap((s) => s.events).filter((e) => e.kind === 'note' && e.start <= tick && e.start + ticks(e.duration) > tick).flatMap((e) => e.pitches);

/** Spell an identified chord with the letters the score actually uses. */
function respell(c: Chord, pitches: Pitch[]): Chord {
  const find = (p: PitchClassName): PitchClassName => {
    const q = pitches.find((x) => pitchClass(x) === pitchClass(p));
    return q ? { letter: q.letter, alter: q.alter } : p;
  };
  return { ...c, root: find(c.root), ...(c.bass ? { bass: find(c.bass) } : {}) };
}

/** The Roman numeral, when every note of the chord belongs to the key (minor keys allow the raised leading note). */
function diatonicRoman(c: Chord, key: Key): string | undefined {
  const scale = keyScale(key).map(pitchClass);
  const allowed = new Set(scale);
  const tonicPc = scale[0]!;
  if (key.mode === 'minor') allowed.add(mod(tonicPc + 11, 12));
  if (!chordTones(c).every((t) => allowed.has(pitchClass(t)))) return undefined;
  const r = romanNumeral(c, key);
  // Measured against natural minor, the leading-note chord reads "♯vii°"; it is written vii°.
  if (key.mode === 'minor' && r.prefix === '♯' && /^vii|^VII/i.test(r.numeral)) r.prefix = '';
  return romanText(r);
}

export function explain(score: Score, id: number): Explained | undefined {
  const staff = score.staves.find((s) => s.events.some((e) => e.id === id));
  const event = staff?.events.find((e) => e.id === id);
  if (!staff || !event || event.spacer) return undefined;
  const pitches = [...event.pitches].sort((a, b) => midi(a) - midi(b));
  const value: ValueName = { base: VALUE_NAMES[event.duration.value], dots: event.duration.dots, rest: event.kind === 'rest', ...(event.duration.tuplet ? { tuplet: event.duration.tuplet[0] } : {}) };
  const out: Explained = { event, pitches, value };
  if (event.kind === 'rest') return out;
  if (pitches.length === 2) {
    try {
      out.interval = intervalBetween(pitches[0]!, pitches[1]!);
    } catch {
      /* no standard name (a doubly altered interval): leave it out */
    }
  }
  if (pitches.length === 1) {
    const voice = staff.events.filter((e) => e.voice === event.voice);
    const prev = voice[voice.indexOf(event) - 1];
    if (prev?.kind === 'note' && prev.pitches.length === 1) {
      const a = prev.pitches[0]!;
      const b = pitches[0]!;
      try {
        out.step = { interval: intervalBetween(a, b), dir: midi(b) > midi(a) ? 1 : midi(b) < midi(a) ? -1 : 0 };
      } catch {
        /* as above */
      }
    }
  }
  const all = sounding(score, event.start);
  if (new Set(all.map(pitchClass)).size >= 3) {
    const found = identifyChord(all.map(midi), score.fifths)[0];
    if (found && !found.omitted.length) {
      const key = keyFromFifths(score.fifths, score.mode);
      const chord = respell(found.chord, all);
      out.harmony = { chord, key, ...(diatonicRoman(chord, key) ? { roman: diatonicRoman(chord, key) } : {}) };
    }
  }
  return out;
}

/** Note and rest events in reading order: by time, then from the top staff down, then by voice. */
export function readingOrder(score: Score): number[] {
  return score.staves
    .flatMap((s, si) => s.events.filter((e) => !e.spacer).map((e) => ({ e, si })))
    .sort((a, b) => a.e.start - b.e.start || a.si - b.si || a.e.voice - b.e.voice)
    .map(({ e }) => e.id);
}
