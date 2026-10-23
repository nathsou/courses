import { describe, expect, it } from 'vitest';
import {
  chordFromRoman,
  chordSymbol,
  diatonicTriads,
  enharmonic,
  fifthsOf,
  frequency,
  identifyChord,
  intervalBetween,
  intervalName,
  intervalShort,
  invert,
  keyFromFifths,
  midi,
  noteName,
  parseChordSymbol,
  parseInterval,
  parsePitch,
  pitchName,
  romanNumeral,
  romanText,
  scale,
  spell,
  stepPattern,
  ticks,
  transpose,
  voicing,

  type Key,
} from './index';

const P = (s: string) => parsePitch(s);
const names = (ps: { letter: string; alter: number }[]) => ps.map((p) => noteName(p as never, { ascii: true })).join(' ');

describe('pitch', () => {
  it('maps to MIDI numbers and frequencies', () => {
    expect(midi(P('C4'))).toBe(60);
    expect(midi(P('A4'))).toBe(69);
    expect(midi(P('A0'))).toBe(21);
    expect(midi(P('C8'))).toBe(108);
    expect(midi(P('B#3'))).toBe(60);
    expect(midi(P('Cb4'))).toBe(59);
    expect(frequency(69)).toBe(440);
    expect(frequency(81)).toBeCloseTo(880);
    expect(frequency(60)).toBeCloseTo(261.626, 3);
  });

  it('spells by key signature', () => {
    expect(pitchName(spell(66, 0), { ascii: true })).toBe('F#4');
    expect(pitchName(spell(70, 0), { ascii: true })).toBe('Bb4');
    expect(pitchName(spell(66, -6), { ascii: true })).toBe('Gb4');
    expect(pitchName(spell(71, -6), { ascii: true })).toBe('Cb5');
    expect(pitchName(spell(65, 6), { ascii: true })).toBe('E#4');
    expect(pitchName(spell(61, -1), { ascii: true })).toBe('Db4');
    expect(pitchName(spell(65, 1), { ascii: true })).toBe('F4'); // F natural in G major
    expect(pitchName(spell(71, -1), { ascii: true })).toBe('B4'); // B natural in F major
  });

  it('respells enharmonically', () => {
    expect(pitchName(enharmonic(P('C#4'))!, { ascii: true })).toBe('Db4');
    expect(pitchName(enharmonic(P('Cb4'))!, { ascii: true })).toBe('B3');
  });
});

describe('note names', () => {
  it('in letters, solfège and German', () => {
    expect(noteName(P('F#'))).toBe('F♯');
    expect(noteName(P('D'), { system: 'solfege', accentedRe: true })).toBe('Ré');
    expect(noteName(P('D'), { system: 'solfege' })).toBe('Re');
    expect(noteName(P('Bb'), { system: 'solfege' })).toBe('Si♭');
    expect(noteName(P('B'), { system: 'german' })).toBe('H');
    expect(noteName(P('Bb'), { system: 'german' })).toBe('B');
    expect(noteName(P('Eb'), { system: 'german' })).toBe('Es');
    expect(noteName(P('Ab'), { system: 'german' })).toBe('As');
    expect(noteName(P('Db'), { system: 'german' })).toBe('Des');
    expect(noteName(P('F#'), { system: 'german' })).toBe('Fis');
    expect(noteName(P('B#'), { system: 'german' })).toBe('His');
    expect(pitchName(P('C4'), { system: 'solfege' })).toBe('Do4');
  });
});

describe('intervals', () => {
  it('names intervals between spelt pitches', () => {
    const cases: [string, string, string][] = [
      ['C4', 'E4', 'M3'],
      ['C4', 'Eb4', 'm3'],
      ['E4', 'C5', 'm6'],
      ['F4', 'B4', 'A4'],
      ['B4', 'F5', 'd5'],
      ['C4', 'G4', 'P5'],
      ['C4', 'C5', 'P8'],
      ['C4', 'D5', 'M9'],
      ['C#4', 'Db4', 'd2'],
      ['C4', 'C#4', 'A1'],
    ];
    for (const [a, b, want] of cases) expect(intervalShort(intervalBetween(P(a), P(b))), `${a}–${b}`).toBe(want);
    expect(intervalName(intervalBetween(P('F4'), P('B4')))).toBe('augmented fourth');
  });

  it('transposes with correct spelling', () => {
    expect(pitchName(transpose(P('E4'), 'M3'), { ascii: true })).toBe('G#4');
    expect(pitchName(transpose(P('Bb3'), 'P5'), { ascii: true })).toBe('F4');
    expect(pitchName(transpose(P('C4'), 'm3', -1), { ascii: true })).toBe('A3');
    expect(pitchName(transpose(P('F#4'), 'd5'), { ascii: true })).toBe('C5');
  });

  it('inverts', () => {
    expect(intervalShort(invert(parseInterval('M3')))).toBe('m6');
    expect(intervalShort(invert(parseInterval('A4')))).toBe('d5');
    expect(intervalShort(invert(parseInterval('P1')))).toBe('P8');
    expect(intervalShort(invert(parseInterval('P8')))).toBe('P1');
    expect(intervalShort(invert(parseInterval('M9')))).toBe('m7');
  });

  it('round-trips every interval name through semitones', () => {
    for (const s of ['P1', 'm2', 'M2', 'm3', 'M3', 'P4', 'A4', 'd5', 'P5', 'm6', 'M6', 'm7', 'M7', 'P8']) {
      const i = parseInterval(s);
      expect(intervalShort(intervalBetween(P('C4'), transpose(P('C4'), i)))).toBe(s);
    }
  });
});

describe('scales and keys', () => {
  it('spells the twelve major scales with one letter per degree', () => {
    for (let f = -7; f <= 7; f++) {
      const key = keyFromFifths(f);
      const notes = scale({ ...key.tonic, octave: 4 });
      expect(new Set(notes.map((n) => n.letter)).size).toBe(7);
      expect(fifthsOf(key)).toBe(f);
      // Every note but the tonic's letter-mates uses only the signature's accidental.
      expect(notes.every((n) => Math.sign(n.alter) === 0 || Math.sign(n.alter) === Math.sign(f))).toBe(true);
    }
    expect(names(scale(P('D4')))).toBe('D E F# G A B C#');
    expect(names(scale(P('Eb4')))).toBe('Eb F G Ab Bb C D');
    expect(names(scale(P('A4'), 'harmonic-minor'))).toBe('A B C D E F G#');
  });

  it('knows the major-scale step pattern', () => {
    expect(stepPattern('major')).toEqual([2, 2, 1, 2, 2, 2, 1]);
    expect(stepPattern('harmonic-minor')).toEqual([2, 1, 2, 2, 1, 3, 1]);
  });

  it('relates keys and signatures', () => {
    expect(names([keyFromFifths(-3).tonic])).toBe('Eb');
    expect(names([keyFromFifths(-3, 'minor').tonic])).toBe('C');
    expect(names([keyFromFifths(6).tonic])).toBe('F#');
    expect(names([keyFromFifths(-6).tonic])).toBe('Gb');
    expect(fifthsOf({ tonic: P('F#'), mode: 'minor' })).toBe(3);
  });
});

describe('chords', () => {
  const C: Key = { tonic: P('C'), mode: 'major' };
  const Am: Key = { tonic: P('A'), mode: 'minor' };

  it('parses and prints chord symbols', () => {
    for (const s of ['C', 'Am', 'G7', 'F/A', 'Bdim', 'Ebmaj7', 'F#m7', 'Esus4', 'Caug', 'Bdim7']) {
      expect(chordSymbol(parseChordSymbol(s), { ascii: true }).replace('m7♭5', 'm7b5')).toBe(s);
    }
    expect(chordSymbol(parseChordSymbol('Bm7b5'))).toBe('Bm7♭5');
  });

  it('voices chords in close position', () => {
    expect(voicing(parseChordSymbol('C')).map((p) => pitchName(p))).toEqual(['C3', 'E3', 'G3']);
    expect(voicing(parseChordSymbol('C/E')).map((p) => pitchName(p))).toEqual(['E3', 'G3', 'C4']);
    expect(voicing(parseChordSymbol('G7/F'), 3).map((p) => pitchName(p))).toEqual(['F3', 'G3', 'B3', 'D4']);
  });

  it('identifies held notes', () => {
    const name = (notes: number[], f = 0) => chordSymbol(identifyChord(notes, f)[0]!.chord, { ascii: true });
    expect(name([60, 64, 67])).toBe('C');
    expect(name([64, 67, 72])).toBe('C/E');
    expect(name([57, 60, 64])).toBe('Am');
    expect(name([55, 59, 62, 65])).toBe('G7');
    expect(name([43, 59, 65])).toBe('G7'); // fifth left out
    expect(identifyChord([43, 59, 65])[0]!.omitted).toEqual(['5']);
    expect(name([58, 62, 65], -1)).toBe('Bb');
    expect(name([61, 65, 68], -4)).toBe('Db');
    expect(name([61, 65, 68], 4)).toBe('C#');
    expect(identifyChord([60])).toEqual([]);
    expect(identifyChord([60, 61, 62])).toEqual([]);
  });

  it('writes Roman numerals', () => {
    const rn = (s: string, k: Key) => romanText(romanNumeral(parseChordSymbol(s), k));
    expect(['C', 'G', 'Am', 'F'].map((s) => rn(s, C))).toEqual(['I', 'V', 'vi', 'IV']);
    expect(rn('G7', C)).toBe('V7');
    expect(rn('C/E', C)).toBe('I6');
    expect(rn('C/G', C)).toBe('I64');
    expect(rn('G7/B', C)).toBe('V65');
    expect(rn('Bdim', C)).toBe('vii°');
    expect(rn('Bb', C)).toBe('♭VII');
    expect(rn('E', Am)).toBe('V');
    expect(rn('Dm', Am)).toBe('iv');
  });

  it('builds chords from Roman numerals', () => {
    const sym = (r: string, k: Key = C) => chordSymbol(chordFromRoman(r, k), { ascii: true });
    expect(['I', 'V', 'vi', 'IV'].map((r) => sym(r))).toEqual(['C', 'G', 'Am', 'F']);
    expect(sym('V7')).toBe('G7');
    expect(sym('I7')).toBe('Cmaj7');
    expect(sym('ii7')).toBe('Dm7');
    expect(sym('V65')).toBe('G7/B');
    expect(sym('I6')).toBe('C/E');
    expect(sym('bVII')).toBe('Bb');
    expect(sym('V', { tonic: P('Eb'), mode: 'major' })).toBe('Bb');
  });

  it('lists the diatonic triads', () => {
    expect(diatonicTriads(C).map((c) => chordSymbol(c, { ascii: true }))).toEqual(['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim']);
    expect(diatonicTriads(Am).map((c) => chordSymbol(c, { ascii: true }))).toEqual(['Am', 'Bdim', 'C', 'Dm', 'Em', 'F', 'G']);
  });
});

describe('rhythm', () => {
  it('counts ticks', () => {
    expect(ticks({ value: 4, dots: 0 })).toBe(480);
    expect(ticks({ value: 4, dots: 1 })).toBe(720);
    expect(ticks({ value: 2, dots: 2 })).toBe(1680);
    expect(ticks({ value: 8, dots: 0, tuplet: [3, 2] })).toBe(160);
  });
});

describe('minor-key chords from numerals', () => {
  it('builds the common-practice set in A minor', () => {
    const key = { tonic: parsePitch('A'), mode: 'minor' as const };
    expect(['i', 'ii°', 'III', 'iv', 'V', 'VI', '#vii°'].map((r) => chordSymbol(chordFromRoman(r, key), { ascii: true }))).toEqual(['Am', 'Bdim', 'C', 'Dm', 'E', 'F', 'G#dim']);
    const Cmaj = { tonic: { letter: 'C', alter: 0 }, mode: 'major' } as const;
    expect(['V/V', 'V7/V', 'V7/ii', 'V/vi', 'vii°7/V', 'viiø7/V', 'V7/IV', 'vii°/ii', 'V65/V'].map((r) => chordSymbol(chordFromRoman(r, Cmaj), { ascii: true }))).toEqual(['D', 'D7', 'A7', 'E', 'F#dim7', 'F#m7b5', 'C7', 'C#dim', 'D7/F#']);
    expect(chordSymbol(chordFromRoman('V7/III', key), { ascii: true })).toBe('G7');
  });
});

describe('voicing progressions', async () => {
  const { voiceProgression, functionOf } = await import('./voicing');
  it('keeps the right hand close and the bass on the root', () => {
    const key: Key = { tonic: P('C'), mode: 'major' };
    const v = voiceProgression(['I', 'IV', 'V', 'I'].map((r) => chordFromRoman(r, key)));
    expect(v.map((x) => x.bass.letter)).toEqual(['C', 'F', 'G', 'C']);
    const moves = v.slice(1).map((x, i) => x.upper.reduce((a, p, j) => a + Math.abs(midi(p) - midi(v[i]!.upper[j]!)), 0));
    expect(moves).toEqual([3, 6, 3]); // C–E–G to C–F–A to B–D–G to C–E–G
  });
  it('uses the written bass of an inversion', () => {
    const key: Key = { tonic: P('C'), mode: 'major' };
    expect(voiceProgression([chordFromRoman('I6', key)])[0]!.bass.letter).toBe('E');
  });
  it('names functions', () => {
    expect(['I', 'ii', 'IV', 'V7', 'vi', 'vii°', 'iii', 'V/V', 'ii65', 'IV6'].map(functionOf)).toEqual(['tonic', 'predominant', 'predominant', 'dominant', 'tonic', 'dominant', 'tonic', 'dominant', 'predominant', 'predominant']);
  });
});

describe('non-chord tones', async () => {
  const { classify } = await import('./melody');
  const C = [0, 4, 7];
  const G = [7, 11, 2];
  const F = [5, 9, 0];
  const n = (midi: number, chord: number[], tied = false) => ({ midi, chord, tied });
  it('finds passing, neighbour, appoggiatura, escape, suspension and anticipation notes', () => {
    expect(classify([n(72, C), n(74, C), n(76, C)])).toEqual(['chord', 'passing', 'chord']);
    expect(classify([n(81, F), n(79, F), n(81, F)])).toEqual(['chord', 'neighbour', 'chord']);
    expect(classify([n(67, C), n(74, C), n(72, C)])).toEqual(['chord', 'appoggiatura', 'chord']);
    expect(classify([n(72, C), n(74, C), n(67, C)])).toEqual(['chord', 'escape', 'chord']);
    expect(classify([n(72, F), n(72, G, true), n(71, G)])).toEqual(['chord', 'suspension', 'chord']);
    expect(classify([n(76, G), n(72, G), n(72, C)])).toEqual(['other', 'anticipation', 'chord']);
  });
});

describe('extended chord symbols', async () => {
  const { parseChordSymbol, chordTones, romanNumeral, romanText } = await import('./chord');
  const C = { tonic: { letter: 'C', alter: 0 }, mode: 'major' } as const;
  const names = (s: string) => chordTones(parseChordSymbol(s)).map((p) => p.letter + (p.alter > 0 ? '#' : p.alter < 0 ? 'b' : '')).join(' ');
  it('parses and prints added-note, extended and altered chords', () => {
    for (const s of ['C6', 'Cm6', 'Cadd9', 'G7sus4', 'Cm(maj7)', 'G7#5', 'G9', 'Cmaj9', 'Dm9', 'G7b9', 'G7#9', 'G7#11', 'Cmaj7#11', 'Dm11', 'G13'])
      expect(chordSymbol(parseChordSymbol(s), { ascii: true })).toBe(s);
    expect(names('G13')).toBe('G B D F A E');
    expect(names('G7b9')).toBe('G B D F Ab');
    expect(names('Cmaj7#11')).toBe('C E G B F#');
    expect(chordSymbol(parseChordSymbol('C-7'), { ascii: true })).toBe('Cm7');
    expect(chordSymbol(parseChordSymbol('CΔ9'), { ascii: true })).toBe('Cmaj9');
  });
  it('identifies sixths and ninths, with or without the fifth', () => {
    expect(chordSymbol(identifyChord([48, 52, 55, 57])[0]!.chord, { ascii: true })).toBe('C6');
    expect(chordSymbol(identifyChord([45, 52, 55, 60])[0]!.chord, { ascii: true })).toBe('Am7');
    expect(chordSymbol(identifyChord([43, 59, 65, 69])[0]!.chord, { ascii: true })).toBe('G9');
  });
  it('writes numerals for extended chords without inversion figures', () => {
    expect(romanText(romanNumeral(parseChordSymbol('G9'), C))).toBe('V9');
    expect(romanText(romanNumeral(parseChordSymbol('Dm7'), C))).toBe('ii7');
    expect(romanText(romanNumeral(parseChordSymbol('G7#5'), C))).toBe('V+7');
  });
});
