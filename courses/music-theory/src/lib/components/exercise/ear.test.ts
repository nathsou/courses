import { describe, expect, it } from 'vitest';
import { question, rng, type EarSpec } from './ear';

const many = (spec: EarSpec, n = 200) => {
  const r = rng(7);
  return Array.from({ length: n }, () => question(spec, r));
};

describe('ear questions', () => {
  it('higher or lower: two different notes, answer matches', () => {
    for (const q of many({ id: 'x', kind: 'highlow' })) {
      const [a, b] = [q.play[0]![0]!, q.play[1]![0]!];
      expect(a).not.toBe(b);
      expect(q.answer).toBe(b > a ? 'higher' : 'lower');
    }
  });
  it('intervals: the notes are the named distance apart', () => {
    const semis: Record<string, number> = { m3: 3, M3: 4, P5: 7, P8: 12 };
    for (const q of many({ id: 'x', kind: 'interval', pool: ['m3', 'M3', 'P5', 'P8'], harmonic: true })) {
      const [a, b] = q.play[0]!;
      expect(b! - a!).toBe(semis[q.answer]);
      expect(q.options.map((o) => o.label)).toContain('perfect fifth');
    }
  });
  it('chord qualities: right shape above the root', () => {
    for (const q of many({ id: 'x', kind: 'quality', pool: ['maj', 'min', 'dim', 'aug'] })) {
      const n = q.play[0]!;
      const shape = n.map((m) => m - n[0]!).join(',');
      expect(shape).toBe({ maj: '0,4,7', min: '0,3,7', dim: '0,3,6', aug: '0,4,8' }[q.answer]);
    }
  });
  it('pitch and echo questions want the notes played back, white keys only when asked', () => {
    for (const q of many({ id: 'x', kind: 'pitch', white: true, range: [48, 72] })) {
      expect([1, 3, 6, 8, 10]).not.toContain(q.playback![0]![0]! % 12);
    }
    for (const q of many({ id: 'x', kind: 'echo', pool: ['4'], white: true })) {
      expect(q.playback!.length).toBe(4);
    }
  });
  it('is deterministic for a seed', () => {
    const a = question({ id: 'x', kind: 'interval', pool: ['m3', 'M3'] }, rng(3));
    const b = question({ id: 'x', kind: 'interval', pool: ['m3', 'M3'] }, rng(3));
    expect(a).toEqual(b);
  });
});
