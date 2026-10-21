import { describe, expect, it } from 'vitest';
import { parseScore, ScoreError } from './parse';
import { layoutScore } from './layout';
import { midi } from '$lib/music/pitch';

describe('score parser', () => {
  it('reads pitches, durations, chords, ties and text', () => {
    const s = parseScore(String.raw`\time 3/4 \key g \major d'4 g'2 | <c' e' g'>4.^"C" fn'8~ f'4_"I" |`);
    expect(s.fifths).toBe(1);
    expect(s.time).toEqual({ beats: 3, unit: 4 });
    const ev = s.staves[0]!.events;
    expect(ev.map((e) => e.pitches.map(midi))).toEqual([[62], [67], [60, 64, 67], [65], [65]]);
    expect(ev[2]!.above).toBe('C');
    expect(ev[2]!.duration).toEqual({ value: 4, dots: 1 });
    expect(ev[3]!.tie).toBe(true);
    expect(ev[3]!.forceNatural).toEqual([true]);
    expect(ev[4]!.below).toBe('I');
    expect(ev.map((e) => e.bar)).toEqual([1, 1, 2, 2, 2]);
  });

  it('reads accidentals and octave marks', () => {
    const ev = parseScore("bb'4 f#'' c, e##").staves[0]!.events;
    expect(ev.map((e) => e.pitches.map(midi)[0])).toEqual([70, 78, 36, 54]);
  });

  it('makes a grand staff and checks the staves agree', () => {
    const s = parseScore(String.raw`\staff treble c''2 e''2 | \staff bass c2 g,2 |`);
    expect(s.staves.map((x) => x.clef)).toEqual(['treble', 'bass']);
    expect(() => parseScore(String.raw`\staff treble c''1 \staff bass c2`)).toThrow(ScoreError);
  });

  it('handles an upbeat', () => {
    const s = parseScore(String.raw`\time 3/4 \partial 4 d'4 | g'2. |`);
    expect(s.staves[0]!.events.map((e) => [e.start, e.bar])).toEqual([[-480, 0], [0, 1]]);
    expect(s.length).toBe(480 + 1440);
  });

  it('rejects mistakes with a position', () => {
    expect(() => parseScore("c'4 d'4 | e'1")).toThrow(/Bar check failed/);
    expect(() => parseScore("c'2. d'2")).toThrow(/crosses a bar line/);
    expect(() => parseScore("h'4")).toThrow(/Cannot read/);
    expect(() => parseScore(String.raw`\foo`)).toThrow(/Unknown command/);
  });
});

describe('score layout', () => {
  const kinds = (src: string, width = 60) => {
    const l = layoutScore(parseScore(src), { width });
    const count = (cls: string) => l.prims.filter((p) => 'cls' in p && p.cls === cls).length;
    return { l, count };
  };

  it('draws staff, clef, key and time signatures, heads and bar lines', () => {
    const { count } = kinds(String.raw`\key d \major \time 4/4 c''4 d''4 e''4 f''4 | g''1 |`);
    expect(count('staff')).toBe(5);
    expect(count('clef')).toBe(1);
    expect(count('keysig')).toBe(2);
    expect(count('timesig')).toBe(2);
    expect(count('head')).toBe(5);
    expect(count('stem')).toBe(4);
    expect(count('bar')).toBe(3); // one thin, then thin + thick at the end
  });

  it('writes accidentals only where the key and the bar need them', () => {
    // G major: F♯ needs no sign; F natural needs one, once per bar; F♯ after it in the bar needs its sharp back.
    expect(kinds(String.raw`\key g \major f#'4 f#'4 f#'4 f#'4 | f#'1 |`).count('acc')).toBe(0);
    expect(kinds(String.raw`\key g \major f'4 f'4 f#'4 f#'4 | f'1 |`).count('acc')).toBe(3);
    // A written natural (fn) is always shown.
    expect(kinds(String.raw`\key g \major f'4 fn'4 f'2 |`).count('acc')).toBe(2);
  });

  it('beams quavers within a beat and flags lone ones', () => {
    const beamed = kinds("c''8 d''8 e''8 f''8 g''2 |").count;
    expect(beamed('beam')).toBe(2);
    expect(beamed('flag')).toBe(0);
    const lone = kinds("c''8 r8 c''8 r8 c''2 |").count;
    expect(lone('beam')).toBe(0);
    expect(lone('flag')).toBe(2);
    const semis = kinds("c''16 d''16 e''16 f''16 g''2. |").count;
    expect(semis('beam')).toBe(2);
  });

  it('adds ledger lines for middle C on the treble staff', () => {
    expect(kinds("c'1 |").count('ledger')).toBe(1);
    expect(kinds("a'1 |").count('ledger')).toBe(0);
    expect(kinds("c'''1 |").count('ledger')).toBe(2);
  });

  it('breaks into systems that fit the width', () => {
    const src = Array(12).fill("c''4 d''4 e''4 f''4 |").join(' ');
    const narrow = layoutScore(parseScore(src), { width: 40 });
    const wide = layoutScore(parseScore(src), { width: 160 });
    expect(narrow.systems.length).toBeGreaterThan(wide.systems.length);
    for (const p of narrow.prims) if (p.k === 'line') expect(Math.max(p.x1, p.x2)).toBeLessThanOrEqual(40.01);
  });

  it('draws a grand staff with a brace and shared bar lines', () => {
    const { l, count } = kinds(String.raw`\staff treble <e' g' c''>1 | \staff bass c1 |`);
    expect(count('brace')).toBe(1);
    expect(count('staff')).toBe(10);
    expect(l.events.size).toBe(2);
  });
});
