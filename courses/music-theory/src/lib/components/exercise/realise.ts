/**
 * The `realise` exercise, without the DOM: a given bass (figured, or with numerals) or a given soprano, one
 * chord of four voices to play over each of its notes, a score drawing what has been played, and the rule
 * engine's verdict on it.
 */
import { chordFromRoman } from '$lib/music/chord';
import { midi, parsePitch, spell, type Letter, type Pitch } from '$lib/music/pitch';
import { checkVoiceLeading, figuredHarmony, harmonyFromChord, harmonyOfNotes, spellIn, type Fault, type Harmony, type RuleId, type Satb, type Style } from '$lib/music/voicelead';
import { keyText, pitchToken } from '$lib/notation/write';
import { parseKey } from './play';

export interface RealiseSpec {
  id: string;
  title?: string;
  prompt?: string;
  hints?: string[];
  solution?: string;
  key?: string;
  /** keyboard (default): three voices in the right hand, bass in the left. satb: vocal ranges and spacing. species: two voices, note against note. */
  style?: Style;
  time?: string;
  /** The given bass line in score notation ("c4 f g c2"), or the given soprano. One chord per note. */
  bass?: string;
  soprano?: string;
  /** Figures under each bass note ("", "6", "64", "7", "#"). */
  figures?: string[];
  /** Roman numerals for each chord, shown under the bass and used to check chord tones. */
  numerals?: string[];
  rules?: RuleId[];
  range?: [number, number];
  tempo?: number;
  /** One realisation, chord by chord ("C3 E4 G4 C5"), shown after an attempt; the tests check it has no faults. */
  example?: string[];
}

export interface Slot {
  /** Duration as written ("4", "2."). */
  dur: string;
  /** The given note and which voice it is (0 the top voice, voices − 1 the bass). */
  given: { voice: number; pitch: Pitch; midi: number };
  harmony?: Harmony;
  /** What is written under the bass: figures or a numeral. */
  label?: string;
  /** A bar line follows this slot. */
  barAfter: boolean;
}

const NOTE = /^([a-g])(##|#|bb|b|n)?([',]*)(\d+\.*)?$/;

/** Read a single line of notes (no chords, rests or ties) into pitches and durations. */
export function readLine(line: string): { pitch: Pitch; dur: string; barAfter: boolean }[] {
  const out: { pitch: Pitch; dur: string; barAfter: boolean }[] = [];
  let dur = '4';
  for (const tok of line.trim().split(/\s+/)) {
    if (tok === '|') {
      if (out.length) out[out.length - 1]!.barAfter = true;
      continue;
    }
    const m = NOTE.exec(tok);
    if (!m) throw new Error(`realise: “${tok}” is not a single note`);
    const acc = m[2] ?? '';
    const alter = acc === '#' ? 1 : acc === '##' ? 2 : acc === 'b' ? -1 : acc === 'bb' ? -2 : 0;
    const marks = m[3] ?? '';
    const octave = 3 + (marks.match(/'/g)?.length ?? 0) - (marks.match(/,/g)?.length ?? 0);
    if (m[4]) dur = m[4];
    out.push({ pitch: { letter: m[1]!.toUpperCase() as Letter, alter, octave }, dur, barAfter: false });
  }
  return out;
}

export function keyOf(spec: RealiseSpec) {
  const k = parseKey(spec.key);
  const p = parsePitch(k.tonic);
  return { ...k, key: { tonic: { letter: p.letter, alter: p.alter }, mode: k.mode } };
}

/** Number of voices: two in species counterpoint, otherwise four. */
export const voicesOf = (spec: RealiseSpec): number => (spec.style === 'species' ? 2 : 4);

export function slotsOf(spec: RealiseSpec): Slot[] {
  const { key } = keyOf(spec);
  const voice = spec.bass ? voicesOf(spec) - 1 : 0;
  const line = readLine(spec.bass ?? spec.soprano ?? '');
  return line.map((n, i) => {
    let harmony: Harmony | undefined;
    let label: string | undefined;
    if (spec.numerals?.[i]) {
      harmony = harmonyFromChord(chordFromRoman(spec.numerals[i]!, key));
      label = spec.numerals[i];
    } else if (spec.figures && spec.bass) {
      const f = spec.figures[i] ?? '';
      harmony = figuredHarmony(n.pitch, f, key);
      label = figureLabel(f);
    }
    return { dur: n.dur, given: { voice, pitch: n.pitch, midi: midi(n.pitch) }, harmony, label, barAfter: n.barAfter };
  });
}

/** Figures as stacked text for the engraver: "64" → "6|4", "#6" → "♯6", "#" → "♯". */
export function figureLabel(f: string): string {
  const s = f.replace(/#/g, '♯').replace(/b(?=\d|$)/g, '♭').replace(/n(?=\d|$)/g, '♮');
  const parts = s.match(/[♯♭♮]?\d|[♯♭♮]/g) ?? [];
  return parts.join('|');
}

/** Why a played chord cannot be entered, or undefined when it can. */
export function entryProblem(notes: number[], slot: Slot, voices = 4): string | undefined {
  if (notes.length !== voices) return `${voices === 2 ? 'Two notes' : 'Four notes'}, one per voice: you played ${notes.length}.`;
  const sorted = [...notes].sort((a, b) => b - a);
  const v = slot.given.voice;
  if (sorted[v] !== slot.given.midi) return v > 0 ? `The lowest note should be the given ${voices === 2 ? 'line' : 'bass'}, as written.` : `The highest note should be the given ${voices === 2 ? 'line' : 'melody note'}, as written.`;
  return undefined;
}

/** Notes as voices, highest first (soprano, alto, tenor, bass). */
export const toSatb = (notes: number[]): Satb => [...notes].sort((a, b) => b - a);

/** Spelt pitches of an entered chord. */
export function spellChord(c: Satb, slot: Slot, fifths: number): Pitch[] {
  const h = slot.harmony ?? harmonyOfNotes([...c], fifths);
  return c.map((m) => (m === slot.given.midi ? slot.given.pitch : spellIn(m, h, (x) => spell(x, fifths))));
}

const group = (ps: Pitch[], dur: string) => (ps.length === 1 ? pitchToken(ps[0]!) + dur : `<${ps.map(pitchToken).join(' ')}>${dur}`);

/**
 * Score text for the exercise: the given line with figures or numerals, and each chord played so far.
 * Keyboard style puts the three upper voices in the treble as one chord; SATB style writes soprano and
 * alto on the treble staff and tenor and bass on the bass staff, two voices each.
 */
export function realiseScore(spec: RealiseSpec, slots: Slot[], entered: (Satb | undefined)[]): string {
  const { fifths, tonic, mode } = keyOf(spec);
  const head = `${keyText(tonic, mode)} \\time ${spec.time ?? '4/4'}${spec.tempo ? ` \\tempo ${spec.tempo}` : ''}`;
  const bar = (s: Slot) => (s.barAfter ? ' |' : '');
  const n = voicesOf(spec);
  const lines = { s: [] as string[], a: [] as string[], t: [] as string[], b: [] as string[], rh: [] as string[] };
  slots.forEach((slot, i) => {
    const c = entered[i];
    const p = c ? spellChord(c, slot, fifths) : undefined;
    const below = slot.label ? `_"${slot.label}"` : '';
    const given = pitchToken(slot.given.pitch) + slot.dur;
    const sp = `s${slot.dur}`;
    // Upper voices.
    if (p) {
      lines.rh.push(group(p.slice(0, 3), slot.dur));
      lines.s.push(pitchToken(p[0]!) + slot.dur);
      lines.a.push(pitchToken(p[1]!) + slot.dur);
      lines.t.push(pitchToken(p[2]!) + slot.dur);
    } else {
      lines.rh.push(slot.given.voice === 0 ? given : sp);
      lines.s.push(slot.given.voice === 0 ? given : sp);
      lines.a.push(sp);
      lines.t.push(sp);
    }
    if (p && n === 2) lines.rh[lines.rh.length - 1] = pitchToken(p[0]!) + slot.dur;
    lines.b.push((p ? pitchToken(p[n - 1]!) + slot.dur : slot.given.voice === n - 1 ? given : sp) + below);
    for (const k of ['s', 'a', 't', 'b', 'rh'] as const) lines[k][lines[k].length - 1] += bar(slot);
  });
  const end = (xs: string[]) => xs.join(' ') + (slots.at(-1)?.barAfter ? '' : ' |');
  if ((spec.style ?? 'keyboard') !== 'satb') return `${head} \\staff treble ${end(lines.rh)} \\staff bass ${end(lines.b)}`;
  return `${head} \\staff treble ${end(lines.s)} \\voice ${end(lines.a)} \\staff bass ${end(lines.t)} \\voice ${end(lines.b)}`;
}

/** Check a complete realisation. */
export function judge(spec: RealiseSpec, slots: Slot[], entered: Satb[]): Fault[] {
  const { key, fifths } = keyOf(spec);
  const harmonies = slots.map((s, i) => s.harmony ?? harmonyOfNotes([...entered[i]!], fifths));
  return checkVoiceLeading(entered, { key, harmonies, style: spec.style ?? 'keyboard', rules: spec.rules });
}

/** The example realisation as chords. */
export function exampleChords(spec: RealiseSpec): Satb[] {
  return (spec.example ?? []).map((c) => toSatb(c.trim().split(/\s+/).map((n) => midi(parsePitch(n)))));
}

/** "Chord 3" or "Chords 2–3". */
export function where(f: Fault): string {
  return f.from === undefined ? `Chord ${f.at + 1}` : `Chords ${f.from + 1}–${f.at + 1}`;
}
