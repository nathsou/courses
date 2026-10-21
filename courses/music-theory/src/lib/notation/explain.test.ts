import { describe, expect, it } from 'vitest';
import { chordSymbol } from '$lib/music/chord';
import { intervalName } from '$lib/music/interval';
import { explain, readingOrder } from './explain';
import { parseScore } from './parse';

const ids = (src: string) => readingOrder(parseScore(src));

describe('explain', () => {
  it('names a single note, its value and the step from the note before', () => {
    const s = parseScore("\\time 4/4 c'4 e'8. g'16 g'2 |");
    const [, second, , fourth] = readingOrder(s);
    const e = explain(s, second!)!;
    expect(e.pitches.map((p) => `${p.letter}${p.octave}`)).toEqual(['E4']);
    expect(e.value).toEqual({ base: 'quaver', dots: 1, rest: false });
    expect(intervalName(e.step!.interval)).toBe('major third');
    expect(e.step!.dir).toBe(1);
    expect(explain(s, fourth!)!.step!.dir).toBe(0);
  });

  it('names the interval of a two-note event, and rests', () => {
    const s = parseScore("\\time 4/4 <c' g'>2 r2 |");
    const [dyad, rest] = readingOrder(s);
    expect(intervalName(explain(s, dyad!)!.interval!)).toBe('perfect fifth');
    expect(explain(s, rest!)!.value).toEqual({ base: 'minim', dots: 0, rest: true });
  });

  it('finds the harmony across both staves, spelt as written, with its numeral when diatonic', () => {
    const s = parseScore("\\key e \\minor \\time 4/4 \\staff treble b'1 | \\staff bass <g b e'>1 |");
    const melody = readingOrder(s)[0]!;
    const h = explain(s, melody)!.harmony!;
    expect(chordSymbol(h.chord)).toBe('Em/G');
    expect(h.roman).toBe('i6');
  });

  it('writes the leading-note chord of a minor key as vii°, and leaves chromatic chords without a numeral', () => {
    const s = parseScore("\\key a \\minor \\time 4/4 <g# b d'>2 <e g# b d'>2 | <c' e' g' bb'>1 |");
    const [vii, v7, chromatic] = readingOrder(s);
    expect(explain(s, vii!)!.harmony!.roman).toBe('vii°');
    expect(explain(s, v7!)!.harmony!.roman).toBe('V7');
    const c7 = explain(s, chromatic!)!.harmony!;
    expect(chordSymbol(c7.chord)).toBe('C7');
    expect(c7.roman).toBeUndefined();
  });

  it('keeps notes still sounding in the harmony', () => {
    const s = parseScore("\\time 4/4 \\staff treble <c'' e''>1 | \\staff bass r2 g2 |");
    const g = readingOrder(s)[2]!;
    expect(chordSymbol(explain(s, g)!.harmony!.chord)).toBe('C/G');
  });

  it('orders events by time, then staff, and skips spacers', () => {
    const s = parseScore("\\time 2/4 \\staff treble c''4 s4 | \\staff bass c4 c4 |");
    expect(ids("\\time 2/4 \\staff treble c''4 s4 | \\staff bass c4 c4 |")).toHaveLength(3);
    const order = readingOrder(s).map((id) => s.staves.findIndex((st) => st.events.some((e) => e.id === id)));
    expect(order).toEqual([0, 1, 1]);
  });
});
