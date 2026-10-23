import { describe, expect, it } from 'vitest';
import { chordFromRoman } from './chord';
import { parsePitch, pitchClass } from './pitch';
import { checkVoiceLeading, figuredHarmony, harmonyFromChord, harmonyOfNotes, parseFigures, type Satb } from './voicelead';

const C = { tonic: { letter: 'C', alter: 0 }, mode: 'major' } as const;
const Am = { tonic: { letter: 'A', alter: 0 }, mode: 'minor' } as const;
const rules = (chords: Satb[], opts = {}) => checkVoiceLeading(chords, { key: C, ...opts }).map((f) => f.rule);
const names = (h: { tones: { letter: string; alter: number }[] }) => h.tones.map((t) => t.letter + (t.alter > 0 ? '#' : t.alter < 0 ? 'b' : ''));

describe('figured bass', () => {
  it('expands shorthand figures', () => {
    expect(parseFigures('').intervals).toEqual([3, 5]);
    expect(parseFigures('6').intervals).toEqual([3, 6]);
    expect(parseFigures('64').intervals).toEqual([4, 6]);
    expect(parseFigures('7').intervals).toEqual([3, 5, 7]);
    expect(parseFigures('65').intervals).toEqual([3, 5, 6]);
    expect(parseFigures('43').intervals).toEqual([3, 4, 6]);
    expect(parseFigures('42').intervals).toEqual([2, 4, 6]);
    expect(parseFigures('2').intervals).toEqual([2, 4, 6]);
  });
  it('reads accidentals, alone (the third) or before a figure', () => {
    expect(parseFigures('#').accidentals).toEqual({ 3: 1 });
    expect(parseFigures('6#').accidentals).toEqual({ 3: 1 });
    expect(parseFigures('#6').accidentals).toEqual({ 6: 1 });
    expect(parseFigures('♭7').accidentals).toEqual({ 7: -1 });
    expect(() => parseFigures('9')).toThrow();
  });
  it('finds the chord a figured bass note stands for', () => {
    expect(names(figuredHarmony(parsePitch('C3'), '', C))).toEqual(['C', 'E', 'G']);
    expect(names(figuredHarmony(parsePitch('E3'), '6', C))).toEqual(['C', 'E', 'G']);
    expect(names(figuredHarmony(parsePitch('G2'), '64', C))).toEqual(['C', 'E', 'G']);
    expect(names(figuredHarmony(parsePitch('G2'), '7', C))).toEqual(['G', 'B', 'D', 'F']);
    expect(names(figuredHarmony(parsePitch('B2'), '65', C))).toEqual(['G', 'B', 'D', 'F']);
    expect(names(figuredHarmony(parsePitch('F3'), '42', C))).toEqual(['G', 'B', 'D', 'F']);
    // In A minor the raised leading note must be figured.
    expect(names(figuredHarmony(parsePitch('E3'), '#', Am))).toEqual(['E', 'G#', 'B']);
    expect(names(figuredHarmony(parsePitch('E3'), '', Am))).toEqual(['E', 'G', 'B']);
    expect(figuredHarmony(parsePitch('G2'), '7', C).seventh).toBe(true);
  });
});

describe('voice-leading rules', () => {
  // I – IV – V – I in C, textbook voicing: no faults.
  const good: Satb[] = [
    [72, 67, 64, 48],
    [72, 69, 65, 53],
    [71, 67, 62, 55],
    [72, 67, 64, 48],
  ];
  const harm = ['I', 'IV', 'V', 'I'].map((r) => harmonyFromChord(chordFromRoman(r, C)));

  it('finds no faults in a textbook progression', () => {
    expect(checkVoiceLeading(good, { key: C, harmonies: harm })).toEqual([]);
  });
  it('finds parallel fifths and octaves', () => {
    // C–E–G–C to D–F–A–D, all moving up together.
    const r = rules([[72, 67, 64, 48], [74, 69, 65, 50]]);
    expect(r).toContain('parallel-octaves');
    expect(r).toContain('parallel-fifths');
  });
  it('does not call a fifth that stays put a parallel', () => {
    expect(rules([[72, 67, 64, 48], [72, 67, 65, 53]])).not.toContain('parallel-fifths');
  });
  it('flags consecutive octaves by contrary motion as a warning', () => {
    const f = checkVoiceLeading([[72, 67, 64, 48], [67, 62, 59, 55]], { key: C });
    expect(f.find((x) => x.rule === 'contrary-fifths-octaves')?.severity).toBe('warning');
  });
  it('flags hidden octaves in the outer voices with a soprano leap', () => {
    expect(rules([[76, 67, 60, 48], [79, 71, 62, 43]])).not.toContain('hidden-fifths-octaves');
    expect(rules([[69, 65, 60, 53], [74, 71, 59, 55]])).toContain('hidden-fifths-octaves');
  });
  it('checks spacing, crossing, ranges and span', () => {
    expect(rules([[84, 67, 64, 48]])).toContain('spacing');
    expect(rules([[84, 67, 64, 48]])).toContain('range');
    expect(rules([[64, 67, 60, 48]])).toContain('crossing');
    expect(checkVoiceLeading([[84, 67, 64, 48]], { key: C, style: 'keyboard' }).map((f) => f.rule)).toEqual(['span']);
  });
  it('checks the leading note and the seventh', () => {
    const v7 = harmonyFromChord(chordFromRoman('V7', C));
    const i = harmonyFromChord(chordFromRoman('I', C));
    // Soprano B leaps down to G: fault. The seventh F rises to G: fault.
    const bad: Satb[] = [[71, 65, 62, 55], [67, 67, 64, 48]];
    const r = checkVoiceLeading(bad, { key: C, harmonies: [v7, i] }).map((f) => f.rule);
    expect(r).toContain('leading-note');
    expect(r).toContain('seventh');
    // B rises to C, F falls to E: fine.
    const ok: Satb[] = [[71, 65, 62, 55], [72, 64, 60, 48]];
    expect(checkVoiceLeading(ok, { key: C, harmonies: [v7, i] })).toEqual([]);
  });
  it('checks doubling and completeness', () => {
    const v = harmonyFromChord(chordFromRoman('V', C));
    expect(checkVoiceLeading([[71, 67, 59, 55]], { key: C, harmonies: [v] }).map((f) => f.rule)).toContain('doubled-leading-note');
    const i = harmonyFromChord(chordFromRoman('I', C));
    expect(checkVoiceLeading([[72, 67, 60, 48]], { key: C, harmonies: [i] }).map((f) => f.rule)).toContain('incomplete');
    expect(checkVoiceLeading([[76, 67, 64, 48]], { key: C, harmonies: [i] }).map((f) => f.rule)).toContain('doubled-third');
    expect(checkVoiceLeading([[74, 67, 64, 48]], { key: C, harmonies: [i] }).map((f) => f.rule)).toContain('chord-tones');
  });
  it('respects the chosen rule set', () => {
    expect(checkVoiceLeading([[72, 67, 64, 48], [74, 69, 65, 50]], { key: C, rules: ['spacing'] })).toEqual([]);
  });
  it('reads the harmony of played notes', () => {
    const h = harmonyOfNotes([67, 65, 59, 43])!;
    expect(h.seventh).toBe(true);
    expect(pitchClass(h.tones[0]!)).toBe(7);
  });
  it('checks two-voice counterpoint, note against note', () => {
    const sp = (c: number[][]) => checkVoiceLeading(c, { key: C, style: 'species' }).map((f) => f.rule);
    // Over C D E D C: an octave, a sixth, a third, a sixth, an octave. Clean.
    expect(sp([[60, 48], [59, 50], [55, 52], [59, 50], [60, 48]])).toEqual([]);
    expect(sp([[64, 48], [62, 50]])).toContain('perfect-ends');
    expect(sp([[60, 48], [55, 50]])).toContain('dissonance');
    expect(sp([[60, 48], [62, 50]])).toContain('parallel-octaves');
    expect(sp([[60, 48], [52, 52], [60, 48]])).toContain('unison');
    expect(sp([[60, 48], [60, 50], [60, 48]])).toContain('repeated');
  });
});
