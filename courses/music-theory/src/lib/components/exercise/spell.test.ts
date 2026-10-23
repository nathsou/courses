import { describe, expect, it } from 'vitest';
import { checkSpelling, respellNote } from './spell';
import { pitchName } from '$lib/music/names';
import { parsePitch } from '$lib/music/pitch';

const P = (...n: string[]) => n.map((x) => parsePitch(x));

describe('spelling', () => {
  const item = { ask: '', answer: ['Eb4', 'G4', 'Bb4'] };
  it('accepts the right names in any octave and order', () => {
    expect(checkSpelling(P('Bb3', 'Eb4', 'G5'), item).ok).toBe(true);
  });
  it('tells a spelling mistake from wrong notes', () => {
    expect(checkSpelling(P('D#4', 'G4', 'Bb4'), item)).toMatchObject({ ok: false, why: 'spelling' });
    expect(checkSpelling(P('E4', 'G4', 'Bb4'), item)).toMatchObject({ ok: false, why: 'notes' });
    expect(checkSpelling(P('Eb4', 'G4'), item)).toMatchObject({ ok: false, why: 'missing' });
    expect(checkSpelling(P('Eb4', 'G4', 'Bb4', 'C5'), item)).toMatchObject({ ok: false, why: 'extra' });
  });
  it('checks octaves when asked', () => {
    const exact = { ...item, octave: true };
    expect(checkSpelling(P('Eb4', 'G4', 'Bb4'), exact).ok).toBe(true);
    expect(checkSpelling(P('Eb5', 'G4', 'Bb4'), exact)).toMatchObject({ ok: false, why: 'octave' });
  });
});

describe('respelling', () => {
  it('cycles through every spelling of a key', () => {
    const cycle = (n: string) => {
      const out: string[] = [];
      let p = parsePitch(n);
      for (let i = 0; i < 3; i++) {
        p = respellNote(p);
        out.push(pitchName(p, { ascii: true }));
      }
      return out;
    };
    expect(cycle('F4')).toEqual(['E#4', 'Gbb4', 'F4']);
    expect(cycle('C#4')).toEqual(['Db4', 'B##3', 'C#4']);
    expect(cycle('B3')).toEqual(['Cb4', 'A##3', 'B3']);
  });
});
