import { describe, expect, it } from 'vitest';
import { startLevel } from './start';
import { PLACEMENT } from '$content/data/placement';
import { LESSONS } from '$content/outline';

describe('placement', () => {
  it('starts at the first level not passed', () => {
    expect(startLevel({ A1: 8, A2: 5 }, ['A1', 'A2', 'B1', 'B2'])).toBe('A2');
    expect(startLevel({ A1: 3 }, ['A1', 'A2', 'B1', 'B2'])).toBe('A1');
    expect(startLevel({ A1: 8, A2: 7, B1: 6, B2: 6 }, ['A1', 'A2', 'B1', 'B2'])).toBe('done');
  });
  it('has eight well-formed questions per level, each tied to a lesson of that level', () => {
    for (const level of ['A1', 'A2', 'B1', 'B2'] as const) {
      const qs = PLACEMENT.filter((q) => q.level === level);
      expect(qs).toHaveLength(8);
      for (const q of qs) {
        expect(LESSONS.find((l) => l.slug === q.lesson)?.part.level, q.lesson).toBe(level);
        expect(q.answer).toBeLessThan(q.options.length);
        if (q.de?.includes('___')) expect(q.options.length).toBeGreaterThan(1);
      }
    }
  });
});
