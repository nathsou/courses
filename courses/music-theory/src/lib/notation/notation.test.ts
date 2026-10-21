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

describe('engraver v1', () => {
  const count = (src: string, cls: string, width = 80) => layoutScore(parseScore(src), { width }).prims.filter((p) => 'cls' in p && p.cls === cls).length;

  it('reads a second voice and checks its length', () => {
    const s = parseScore(String.raw`\staff treble e''2 d''2 | \voice c''2 b'2 | \staff bass <g c'>2 <g b>2 | \voice c2 g,2 |`);
    expect(s.staves[0]!.events.map((e) => e.voice)).toEqual([0, 0, 1, 1]);
    expect(() => parseScore(String.raw`\staff treble e''1 | \voice c''2`)).toThrow(/different lengths/);
  });

  it('draws two voices with opposite stems', () => {
    const l = layoutScore(parseScore(String.raw`\staff treble e''2 d''2 | \voice c''2 b'2 |`), { width: 60 });
    const stems = l.prims.filter((p) => p.k === 'line' && p.cls === 'stem') as { y1: number; y2: number }[];
    expect(stems.filter((s) => s.y2 < s.y1).length).toBe(2); // up
    expect(stems.filter((s) => s.y2 > s.y1).length).toBe(2); // down
  });

  it('moves a second voice a second away from the first', () => {
    const l = layoutScore(parseScore(String.raw`\staff treble d''2 d''2 | \voice c''2 b'2 |`), { width: 60 });
    const x = (id: number) => l.events.get(id)!.x;
    expect(x(2)).toBeGreaterThan(x(0)); // C5 against D5: shifted
    expect(x(3)).toBe(x(1)); // B4 against D5: a third, no shift
  });

  it('reads triplets and numbers them', () => {
    const s = parseScore(String.raw`\tuplet 3/2 { c''8 d'' e'' } f''4 g''2 |`);
    expect(s.staves[0]!.events.slice(0, 3).map((e) => e.start)).toEqual([0, 160, 320]);
    expect(count(String.raw`\tuplet 3/2 { c''8 d'' e'' } f''4 g''2 |`, 'tuplet')).toBe(1);
    expect(count(String.raw`\tuplet 3/2 { c''4 d'' e'' } g''2 |`, 'tupletbr')).toBe(4);
  });

  it('styles bar lines', () => {
    expect(count(String.raw`c''1 \bar "||" | d''1 |`, 'bar')).toBe(4); // double (2), final (2)
    expect(() => parseScore(String.raw`c''2 \bar "||" d''2 |`)).toThrow(/at a bar line/);
    expect(count(String.raw`\bar "|:" c''1 | d''1 \bar ":|" |`, 'bar')).toBeGreaterThan(4);
  });

  it('stacks figures and raises inversion figures after a numeral', () => {
    expect(count(String.raw`c'1_"6|4" |`, 'figure')).toBe(2);
    expect(count(String.raw`c'1_"V65" |`, 'rfig')).toBe(2);
    expect(count(String.raw`c'1_"I6" |`, 'rfig')).toBe(1);
    expect(count(String.raw`c'1_"IV" |`, 'rfig')).toBe(0);
  });

  it('writes note names under single notes when asked', () => {
    const l = layoutScore(parseScore("c'4 d'4 e'4 <c' e'>4 |"), { width: 60, noteName: (p) => p.letter });
    expect(l.prims.filter((p) => p.k === 'text' && p.cls === 'notename').map((p) => (p as { s: string }).s)).toEqual(['C', 'D', 'E']);
  });
});

describe('engraving reference', async () => {
  const { GALLERY } = await import('./gallery');
  for (const g of GALLERY) {
    it(g.title, () => {
      for (const width of [36, 60, 110]) {
        const l = layoutScore(parseScore(g.src), { width });
        expect(l.prims.length).toBeGreaterThan(10);
        for (const p of l.prims) if (p.k === 'line') expect(Math.max(p.x1, p.x2)).toBeLessThanOrEqual(Math.max(width, 24) + 0.01);
      }
    });
  }
});

describe('writing score text', async () => {
  const { pitchToken, chordScore, keyText } = await import('./write');
  const { parsePitch, midi } = await import('$lib/music/pitch');
  it('round-trips pitches through tokens', () => {
    for (const n of ['C4', 'F#3', 'Bb2', 'E##5', 'Abb1', 'C8', 'A0']) {
      const ev = parseScore(pitchToken(parsePitch(n)) + '1 |').staves[0]!.events[0]!;
      expect(midi(ev.pitches[0]!)).toBe(midi(parsePitch(n)));
    }
  });
  it('splits a chord across the grand staff and leaves an empty staff blank', () => {
    const s = parseScore(chordScore(['C3', 'E4', 'G4'].map((n) => parsePitch(n)), { key: keyText('Eb', 'major') }));
    expect(s.fifths).toBe(-3);
    expect(s.staves[0]!.events[0]!.pitches.length).toBe(2);
    expect(s.staves[1]!.events[0]!.pitches.length).toBe(1);
    const empty = parseScore(chordScore([parsePitch('C5')]));
    expect(empty.staves[1]!.events[0]!.spacer).toBe(true);
    const l = layoutScore(empty, { width: 40 });
    expect(l.prims.filter((p) => 'cls' in p && p.cls === 'rest').length).toBe(0);
  });
});

describe('partial ties', () => {
  it('ties only the notes that continue into the next chord', () => {
    const l = layoutScore(parseScore("<c'' e''>2~ <c'' g''>2 |"), { width: 40 });
    expect(l.prims.filter((p) => 'cls' in p && p.cls === 'tie').length).toBe(1);
  });
});
