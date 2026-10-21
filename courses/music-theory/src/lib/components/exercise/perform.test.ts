import { describe, expect, it } from 'vitest';
import { judgeTimed, matchesOnset, onsetsOf } from './perform';
import { parseScore } from '$lib/notation/parse';

describe('perform: onsets', () => {
  it('lists note starts in seconds, skipping rests and tied-over notes', () => {
    const s = parseScore(String.raw`\tempo 60 c'4 r4 d'4~ d'4 | <c' e' g'>1 |`);
    const o = onsetsOf(s);
    expect(o.map((x) => x.time)).toEqual([0, 2, 4]);
    expect(o[2]!.pitches).toEqual([60, 64, 67]);
  });
  it('merges staves into one chord per moment and handles an upbeat', () => {
    const s = parseScore(String.raw`\tempo 60 \partial 4 \staff treble g'4 | c''1 | \staff bass r4 | c1 |`);
    const o = onsetsOf(s);
    expect(o.map((x) => x.time)).toEqual([-1, 0]);
    expect(o[1]!.pitches).toEqual([48, 72]);
  });
  it('follows a tempo override', () => {
    expect(onsetsOf(parseScore(String.raw`\tempo 60 c'4 d'4 e'2 |`), 120).map((x) => x.time)).toEqual([0, 0.5, 1]);
  });
});

describe('perform: judging', () => {
  const onsets = onsetsOf(parseScore(String.raw`\tempo 60 c'4 d'4 <e' g'>2 |`));
  it('passes presses within the tolerance', () => {
    const r = judgeTimed(onsets, [{ midi: 60, time: 0.03 }, { midi: 62, time: 0.97 }, { midi: 64, time: 2.01 }, { midi: 67, time: 2.02 }], { toleranceMs: 60, pitches: true });
    expect(r.verdicts.map((v) => v.verdict)).toEqual(['ok', 'ok', 'ok']);
    expect(r.passed).toBe(true);
  });
  it('names early, late, wrong, missed and extra', () => {
    const r = judgeTimed(onsets, [{ midi: 60, time: -0.12 }, { midi: 61, time: 1.0 }, { midi: 72, time: 3.0 }], { toleranceMs: 60, pitches: true });
    expect(r.verdicts.map((v) => v.verdict)).toEqual(['early', 'wrong', 'missed']);
    expect(r.extra.map((p) => p.midi)).toEqual([72]);
    expect(r.passed).toBe(false);
  });
  it('ignores pitch when only the rhythm counts', () => {
    const r = judgeTimed(onsets, [{ midi: 40, time: 0 }, { midi: 41, time: 1.05 }, { midi: 42, time: 2.1 }], { toleranceMs: 60, pitches: false });
    expect(r.verdicts.map((v) => v.verdict)).toEqual(['ok', 'ok', 'late']);
  });
  it('matches held chords without timing', () => {
    expect(matchesOnset([67, 64], onsets[2]!)).toBe(true);
    expect(matchesOnset([64], onsets[2]!)).toBe(false);
  });
});
