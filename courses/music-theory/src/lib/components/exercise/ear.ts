/**
 * Question generators for the `ear` exercise. Pure and seedable, so the tests can check every kind.
 */
import { intervalName, parseInterval } from '$lib/music/interval';
import { QUALITIES, type ChordQuality } from '$lib/music/chord';
import { scaleIntervals, type ScaleKind } from '$lib/music/scale';
import { isBlackKey, midi, parsePitch } from '$lib/music/pitch';

export type EarKind = 'highlow' | 'interval' | 'quality' | 'scale' | 'pitch' | 'echo' | 'custom';

export interface EarSpec {
  id: string;
  title?: string;
  prompt?: string;
  kind: EarKind;
  /** interval: names (m3, P5 …); quality: chord qualities; scale: scale kinds; echo: melody length as a number. */
  pool?: string[];
  harmonic?: boolean;
  rounds?: number;
  pass?: number;
  /** Lowest and highest root (MIDI). */
  range?: [number, number];
  /** Only white keys for `pitch` and `echo`. */
  white?: boolean;
  /** Custom questions: what to play, as groups of pitch names played one after another ("C4 E4 G4" is a chord), and the right option. */
  items?: { play: string[]; answer: string }[];
  options?: string[];
  hints?: string[];
  solution?: string;
}

export interface Question {
  /** Groups of MIDI notes, played one group after another (a group is a chord). */
  play: number[][];
  /** For answer buttons: the option values and their labels. */
  options: { value: string; label: string }[];
  answer: string;
  /** Answer by playing these notes back in order instead of choosing a button. */
  playback?: number[][];
}

/** A small deterministic generator (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T>(r: () => number, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)]!;

const QUALITY_LABEL: Partial<Record<ChordQuality, string>> = { maj: 'major', min: 'minor', dim: 'diminished', aug: 'augmented', '7': 'dominant seventh', maj7: 'major seventh', m7: 'minor seventh', m7b5: 'half-diminished', dim7: 'diminished seventh', sus2: 'sus2', sus4: 'sus4' };
const SCALE_LABEL: Partial<Record<ScaleKind, string>> = { major: 'major', 'natural-minor': 'natural minor', 'harmonic-minor': 'harmonic minor', 'melodic-minor': 'melodic minor', 'major-pentatonic': 'major pentatonic', 'minor-pentatonic': 'minor pentatonic' };

export function question(spec: EarSpec, r: () => number): Question {
  const [lo, hi] = spec.range ?? [55, 72];
  const root = () => lo + Math.floor(r() * (hi - lo + 1));
  switch (spec.kind) {
    case 'highlow': {
      let a = root();
      let b = root();
      while (b === a) b = root();
      return { play: [[a], [b]], options: [{ value: 'higher', label: 'The second is higher' }, { value: 'lower', label: 'The second is lower' }], answer: b > a ? 'higher' : 'lower' };
    }
    case 'interval': {
      const pool = spec.pool ?? ['M3', 'P5'];
      const name = pick(r, pool);
      const a = root();
      const b = a + parseInterval(name).semitones;
      return { play: spec.harmonic ? [[a, b]] : [[a], [b]], options: pool.map((p) => ({ value: p, label: intervalName(parseInterval(p)) })), answer: name };
    }
    case 'quality': {
      const pool = (spec.pool ?? ['maj', 'min']) as ChordQuality[];
      const q = pick(r, pool);
      const a = root();
      const notes = QUALITIES[q].intervals.map((i) => a + parseInterval(i).semitones);
      return { play: spec.harmonic === false ? notes.map((n) => [n]).concat([notes]) : [notes], options: pool.map((p) => ({ value: p, label: QUALITY_LABEL[p] ?? p })), answer: q };
    }
    case 'scale': {
      const pool = (spec.pool ?? ['major', 'natural-minor']) as ScaleKind[];
      const k = pick(r, pool);
      const a = root();
      const notes = [...scaleIntervals(k).map((i) => a + i.semitones), a + 12];
      return { play: notes.map((n) => [n]), options: pool.map((p) => ({ value: p, label: SCALE_LABEL[p] ?? p })), answer: k };
    }
    case 'pitch': {
      let a = root();
      while (spec.white && isBlackKey(a)) a = root();
      return { play: [[a]], options: [], answer: String(a), playback: [[a]] };
    }
    case 'echo': {
      const n = Number(spec.pool?.[0] ?? 3);
      const notes: number[] = [];
      while (notes.length < n) {
        const a = root();
        if (spec.white && isBlackKey(a)) continue;
        if (notes.length && Math.abs(a - notes.at(-1)!) > 7) continue;
        notes.push(a);
      }
      return { play: notes.map((x) => [x]), options: [], answer: notes.join(' '), playback: notes.map((x) => [x]) };
    }
    case 'custom': {
      const item = pick(r, spec.items ?? []);
      const opts = spec.options ?? [...new Set((spec.items ?? []).map((i) => i.answer))];
      return { play: item.play.map((g) => g.trim().split(/\s+/).map((n) => midi(parsePitch(n)))), options: opts.map((o) => ({ value: o, label: o })), answer: item.answer };
    }
  }
}
