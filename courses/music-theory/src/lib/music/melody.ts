/**
 * Non-chord tones: classify each melody note against the chord sounding under it, from how it is approached
 * and left. The classic categories of common-practice melody (Chapter 16).
 */
import { mod } from './pitch';

export type NoteRole = 'chord' | 'passing' | 'neighbour' | 'appoggiatura' | 'escape' | 'suspension' | 'anticipation' | 'other';

export interface MelodyNote {
  midi: number;
  /** Pitch classes of the chord sounding under it. */
  chord: number[];
  /** Tied over from the previous note (same pitch, not restruck). */
  tied?: boolean;
}

const step = (a: number, b: number) => Math.abs(a - b) >= 1 && Math.abs(a - b) <= 2;

export function classify(notes: MelodyNote[]): NoteRole[] {
  return notes.map((n, i) => {
    const inChord = (m: number, c: number[]) => c.includes(mod(m, 12));
    if (inChord(n.midi, n.chord)) return 'chord';
    const prev = notes[i - 1];
    const next = notes[i + 1];
    if (n.tied && prev && prev.midi === n.midi && next && n.midi - next.midi >= 1 && n.midi - next.midi <= 2) return 'suspension';
    if (next && next.midi === n.midi && inChord(n.midi, next.chord) && !inChord(n.midi, n.chord)) return 'anticipation';
    if (!prev || !next) return 'other';
    const inStep = step(prev.midi, n.midi);
    const outStep = step(n.midi, next.midi);
    if (inStep && outStep) {
      const up1 = n.midi > prev.midi;
      const up2 = next.midi > n.midi;
      if (up1 === up2) return 'passing';
      if (prev.midi === next.midi) return 'neighbour';
      return 'other';
    }
    if (!inStep && outStep && prev.midi !== n.midi) return 'appoggiatura';
    if (inStep && !outStep) return 'escape';
    return 'other';
  });
}

export const ROLE_LABEL: Record<NoteRole, string> = {
  chord: 'chord tone',
  passing: 'passing note',
  neighbour: 'neighbour note',
  appoggiatura: 'appoggiatura',
  escape: 'escape note',
  suspension: 'suspension',
  anticipation: 'anticipation',
  other: 'other',
};

export const ROLE_SHORT: Record<NoteRole, string> = { chord: 'CT', passing: 'P', neighbour: 'N', appoggiatura: 'App', escape: 'E', suspension: 'S', anticipation: 'Ant', other: '?' };
