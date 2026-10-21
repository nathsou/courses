/**
 * The `improvise` exercise, without the DOM: a chart of chord symbols, a backing track that loops it, and the
 * classification of what the reader played against the chord sounding at that moment. Nothing is marked right or
 * wrong: the notes are sorted into chord tones, tensions and outside notes for the reader to look at.
 */
import { chordTones, parseChordSymbol, type Chord } from '$lib/music/chord';
import { mod, pitchClass } from '$lib/music/pitch';
import type { ScheduledNote } from '$lib/audio/engine.svelte';

export interface ImproviseSpec {
  id: string;
  title?: string;
  prompt?: string;
  hints?: string[];
  /** One entry per bar: "Dm7", or two chords sharing the bar: "Dm7 G7". */
  chart: string[];
  tempo?: number;
  /** Times through the chart. */
  choruses?: number;
  /** Swung quavers in the comping (default true). */
  swing?: boolean;
  /** Keyboard range shown. */
  range?: [number, number];
  /** Beats per bar (default 4). */
  beats?: number;
}

export interface Slot {
  chord: Chord;
  symbol: string;
  /** Start and length in beats, from the start of the chart. */
  start: number;
  length: number;
  bar: number;
}

export function chartSlots(chart: string[], beats = 4): Slot[] {
  const out: Slot[] = [];
  chart.forEach((bar, b) => {
    const syms = bar.trim().split(/\s+/);
    const len = beats / syms.length;
    syms.forEach((sym, k) => out.push({ chord: parseChordSymbol(sym), symbol: sym, start: b * beats + k * len, length: len, bar: b }));
  });
  return out;
}

export type Category = 'chord' | 'tension' | 'outside';

/**
 * How a note sits against a chord: a chord tone; a tension (a ninth, eleventh or thirteenth, natural or, over a
 * dominant seventh, altered); or outside. A natural eleventh over a major or dominant chord clashes with the
 * third, so it counts as outside there.
 */
export function classify(m: number, chord: Chord): Category {
  const root = pitchClass(chord.root);
  const pcs = chordTones(chord).map(pitchClass);
  const pc = mod(m, 12);
  if (pcs.includes(pc)) return 'chord';
  const iv = mod(pc - root, 12);
  const majorThird = pcs.includes(mod(root + 4, 12));
  const dominant = majorThird && pcs.includes(mod(root + 10, 12));
  const tensions = [2, 9, ...(majorThird ? [] : [5]), ...(dominant ? [1, 3, 6, 8] : []), ...(majorThird && !dominant ? [6] : [])];
  return tensions.includes(iv) ? 'tension' : 'outside';
}

export interface Played {
  midi: number;
  /** Seconds from the first downbeat. */
  time: number;
}

export interface Placed extends Played {
  /** Beat position from the start of the take (0 = first downbeat). */
  beat: number;
  slot: Slot;
  category: Category;
  /** On (or within a swung quaver of) beat 1 or 3 of the bar. */
  strong: boolean;
}

/** Place played notes on the chart (looped `choruses` times) and classify them. Notes outside the take are dropped. */
export function analyse(played: Played[], slots: Slot[], tempo: number, choruses: number, beats = 4): Placed[] {
  const chartBeats = (Math.max(...slots.map((s) => s.bar)) + 1) * beats;
  const total = chartBeats * choruses;
  const out: Placed[] = [];
  for (const p of played) {
    const beat = (p.time * tempo) / 60;
    // A note played a little early still belongs to the chord it anticipates.
    const at = beat + 0.12;
    if (at < 0 || at >= total) continue;
    const inChart = mod(at, chartBeats);
    const slot = slots.find((s) => inChart >= s.start && inChart < s.start + s.length) ?? slots[0]!;
    const inBar = mod(beat, beats);
    const strong = [0, 2].some((b) => Math.abs(inBar - b) < 0.25) || Math.abs(inBar - beats) < 0.25;
    out.push({ ...p, beat, slot, category: classify(p.midi, slot.chord), strong });
  }
  return out;
}

export interface Summary {
  total: number;
  chord: number;
  tension: number;
  outside: number;
  /** Of the notes on strong beats, how many were chord tones. */
  strongChord: number;
  strong: number;
}

export function summarise(placed: Placed[]): Summary {
  const by = (c: Category) => placed.filter((p) => p.category === c).length;
  const strong = placed.filter((p) => p.strong);
  return { total: placed.length, chord: by('chord'), tension: by('tension'), outside: by('outside'), strong: strong.length, strongChord: strong.filter((p) => p.category === 'chord').length };
}

/** The right hand of the backing: third, seventh (or sixth) and a fifth or ninth, kept between G3 and A4. */
export function compVoicing(chord: Chord): number[] {
  const root = pitchClass(chord.root);
  const pcs = chordTones(chord).map(pitchClass).filter((pc) => pc !== root);
  const pick = pcs.length > 3 ? [pcs[0]!, pcs[2]!, pcs[3]!] : pcs;
  return pick.map((pc) => 55 + mod(pc - 55, 12)).sort((a, b) => a - b);
}

/**
 * The backing track: a one-bar count-in of clicks is left to the caller; this is the chords. Left hand: root on 1,
 * fifth on 3. Right hand: comping on 1 and on the (swung) "and" of 2. Times in seconds from the first downbeat.
 */
export function backing(slots: Slot[], tempo: number, choruses: number, swing = true, beats = 4): ScheduledNote[] {
  const beat = 60 / tempo;
  const chartBeats = (Math.max(...slots.map((s) => s.bar)) + 1) * beats;
  const and = swing ? 2 / 3 : 0.5;
  const out: ScheduledNote[] = [];
  for (let c = 0; c < choruses; c++) {
    for (const s of slots) {
      const t0 = (c * chartBeats + s.start) * beat;
      const root = 36 + mod(pitchClass(s.chord.root) - 36, 12);
      const fifth = root + (chordTones(s.chord).some((p) => mod(pitchClass(p) - pitchClass(s.chord.root), 12) === 6) ? 6 : 7);
      const rh = compVoicing(s.chord);
      out.push({ midi: root, time: t0, duration: Math.min(2, s.length) * beat * 0.95, velocity: 72 });
      if (s.length >= 4) out.push({ midi: fifth > 52 ? fifth - 12 : fifth, time: t0 + 2 * beat, duration: 2 * beat * 0.95, velocity: 66 });
      for (const m of rh) {
        out.push({ midi: m, time: t0, duration: beat * 0.9, velocity: 52 });
        if (s.length >= 2) out.push({ midi: m, time: t0 + (1 + and) * beat, duration: beat * 0.5, velocity: 48 });
      }
    }
  }
  return out;
}
