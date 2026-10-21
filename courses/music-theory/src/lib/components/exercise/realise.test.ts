import { describe, expect, it } from 'vitest';
import { parseScore } from '$lib/notation/parse';
import { entryProblem, figureLabel, judge, readLine, realiseScore, slotsOf, toSatb, type RealiseSpec } from './realise';

const figured: RealiseSpec = { id: 't/1', key: 'C major', bass: 'c4 f g c', figures: ['', '', '7', ''] };

describe('realise', () => {
  it('reads a given line with sticky durations and bar lines', () => {
    const l = readLine("c4 f g2 | c,1 |");
    expect(l.map((n) => n.dur)).toEqual(['4', '4', '2', '1']);
    expect(l[2]!.barAfter).toBe(true);
    expect(l[3]!.pitch).toEqual({ letter: 'C', alter: 0, octave: 2 });
    expect(() => readLine('<c e g>4')).toThrow();
  });
  it('writes figures as stacked labels', () => {
    expect(figureLabel('64')).toBe('6|4');
    expect(figureLabel('#6')).toBe('♯6');
    expect(figureLabel('#')).toBe('♯');
    expect(figureLabel('')).toBe('');
  });
  it('builds slots with the harmony of each figure', () => {
    const s = slotsOf(figured);
    expect(s).toHaveLength(4);
    expect(s[2]!.harmony!.seventh).toBe(true);
    expect(s[0]!.given).toMatchObject({ voice: 3, midi: 48 });
  });
  it('accepts only four notes with the given voice in place', () => {
    const s = slotsOf(figured)[0]!;
    expect(entryProblem([48, 64, 67], s)).toMatch(/Four notes/);
    expect(entryProblem([36, 64, 67, 72], s)).toMatch(/bass/);
    expect(entryProblem([48, 64, 67, 72], s)).toBeUndefined();
  });
  it('draws a score that parses at every stage, in both styles', () => {
    const slots = slotsOf(figured);
    const chords = [[48, 64, 67, 72], [53, 65, 69, 72], [55, 65, 67, 71], [48, 64, 67, 72]].map(toSatb);
    for (const style of ['keyboard', 'satb'] as const) {
      for (let n = 0; n <= 4; n++) {
        const src = realiseScore({ ...figured, style }, slots, chords.slice(0, n));
        expect(() => parseScore(src)).not.toThrow();
      }
    }
  });
  it('judges a realisation with the rule engine', () => {
    const slots = slotsOf(figured);
    const good = [[48, 64, 67, 72], [53, 65, 69, 72], [55, 65, 67, 71], [48, 64, 67, 72]].map(toSatb);
    // G7 without its fifth → C: B4 rises to C5, F4 falls to E4.
    expect(judge(figured, slots, good).filter((f) => f.severity === 'fault')).toEqual([]);
    const parallel = [[48, 64, 67, 72], [53, 69, 72, 77], [55, 65, 71, 74], [48, 64, 67, 72]].map(toSatb);
    expect(judge(figured, slots, parallel).map((f) => f.rule)).toContain('parallel-octaves');
  });
});
