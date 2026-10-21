/** Steps and checking for the `play` exercise (PlayExercise.svelte). */
import { chordSymbol, chordTones, parseChordSymbol } from '$lib/music/chord';
import { midi, parsePitch, pitchClass, mod } from '$lib/music/pitch';
import { fifthsOf, type Mode } from '$lib/music/scale';

export interface PlayStep {
  chord?: string;
  notes?: string[];
  label?: string;
}

export interface PlaySpec {
  id: string;
  title?: string;
  prompt?: string;
  hints?: string[];
  solution?: string;
  key?: string;
  range?: [number, number];
  steps: PlayStep[];
}

/** What a step wants: exact MIDI notes, or a set of pitch classes. */
export interface Target {
  exact?: number[];
  pcs?: number[];
}

export function parseKey(s: string | undefined): { fifths: number; tonic: string; mode: Mode } {
  const m = /^([A-G](?:#|b|♯|♭)?)\s*(major|minor)?$/.exec((s ?? 'C major').trim());
  if (!m) throw new Error(`Bad key “${s}”`);
  const p = parsePitch(m[1]!);
  const mode = (m[2] ?? 'major') as Mode;
  return { fifths: fifthsOf({ tonic: { letter: p.letter, alter: p.alter }, mode }), tonic: m[1]!, mode };
}

export function targetOf(step: PlayStep): Target {
  if (step.chord) return { pcs: [...new Set(chordTones(parseChordSymbol(step.chord)).map(pitchClass))] };
  const notes = step.notes ?? [];
  if (notes.every((n) => /\d$/.test(n))) return { exact: notes.map((n) => midi(parsePitch(n))) };
  return { pcs: [...new Set(notes.map((n) => pitchClass(parsePitch(n))))] };
}

/** Whether held keys satisfy a target, and which held keys are wrong. */
export function check(held: number[], t: Target): { ok: boolean; wrong: number[]; missing: number } {
  if (t.exact) {
    const want = new Set(t.exact);
    const wrong = held.filter((m) => !want.has(m));
    const missing = t.exact.filter((m) => !held.includes(m)).length;
    return { ok: !wrong.length && !missing, wrong, missing };
  }
  const want = new Set(t.pcs);
  const wrong = held.filter((m) => !want.has(mod(m, 12)));
  const have = new Set(held.map((m) => mod(m, 12)));
  const missing = [...want].filter((p) => !have.has(p)).length;
  return { ok: !wrong.length && !missing, wrong, missing };
}

export const stepLabel = (s: PlayStep): string => s.label ?? s.chord ?? (s.notes ?? []).join(' ');
