import { describe, expect, it } from 'vitest';
import { parseChordSymbol } from '$lib/music/chord';
import { analyse, backing, chartSlots, classify, compVoicing, summarise } from './improvise';

describe('improvise', () => {
  it('reads a chart with one or two chords per bar', () => {
    const s = chartSlots(['Dm7 G7', 'Cmaj7']);
    expect(s.map((x) => [x.symbol, x.start, x.length])).toEqual([
      ['Dm7', 0, 2],
      ['G7', 2, 2],
      ['Cmaj7', 4, 4],
    ]);
  });
  it('classifies notes as chord tones, tensions or outside', () => {
    const G7 = parseChordSymbol('G7');
    expect(classify(71, G7)).toBe('chord'); // B
    expect(classify(69, G7)).toBe('tension'); // A, the ninth
    expect(classify(68, G7)).toBe('tension'); // A♭, ♭9 over a dominant
    expect(classify(72, G7)).toBe('outside'); // C, the eleventh against B
    const Dm7 = parseChordSymbol('Dm7');
    expect(classify(67, Dm7)).toBe('tension'); // G, the eleventh over a minor chord
    expect(classify(66, Dm7)).toBe('outside'); // F♯ against F
    const C = parseChordSymbol('Cmaj7');
    expect(classify(66, C)).toBe('tension'); // F♯, ♯11
    expect(classify(65, C)).toBe('outside'); // F, the avoid note
  });
  it('places played notes on the looped chart', () => {
    const slots = chartSlots(['Dm7', 'G7', 'Cmaj7', 'Cmaj7']);
    // At 120 bpm a beat is 0.5 s: bar 2 starts at 2 s, the second chorus at 8 s.
    const p = analyse(
      [
        { midi: 65, time: 0 },
        { midi: 71, time: 2.0 },
        { midi: 66, time: 8.5 },
        { midi: 60, time: 99 },
      ],
      slots,
      120,
      2,
    );
    expect(p.map((x) => [x.slot.symbol, x.category, x.strong])).toEqual([
      ['Dm7', 'chord', true],
      ['G7', 'chord', true],
      ['Dm7', 'outside', false],
    ]);
    expect(summarise(p)).toMatchObject({ total: 3, chord: 2, outside: 1, strong: 2, strongChord: 2 });
  });
  it('builds a backing track', () => {
    const notes = backing(chartSlots(['Dm7', 'G7']), 120, 2);
    expect(notes.length).toBeGreaterThan(0);
    expect(Math.max(...notes.map((n) => n.time))).toBeLessThan(8);
    expect(compVoicing(parseChordSymbol('G7'))).toEqual([59, 62, 65]);
  });
});
