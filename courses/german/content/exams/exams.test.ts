import { describe, expect, it } from 'vitest';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Paper } from './types';

const files = readdirSync(__dirname).filter((f) => /^[ab][12]\.ts$/.test(f));

describe('level checks', () => {
  it('exist for every level', () => {
    expect(files.sort()).toEqual(['a1.ts', 'a2.ts', 'b1.ts', 'b2.ts']);
  });
  for (const f of files) {
    it(`${f} is well formed`, async () => {
      const mod = (await import(join(__dirname, f))) as Record<string, Paper>;
      const papers = Object.values(mod);
      expect(papers.length).toBeGreaterThan(0);
      for (const p of papers) {
        expect(p.sections.map((s) => s.skill)).toContain('listening');
        expect(p.sections.map((s) => s.skill)).toContain('reading');
        for (const s of p.sections)
          for (const q of s.questions) {
            if (q.type === 'choose' || q.type === 'fill') {
              expect(q.answer, `${p.id} ${s.title}`).toBeLessThan(q.options.length);
              expect(new Set(q.options).size).toBe(q.options.length);
            }
            if (q.type === 'fill') expect(q.de).toContain('___');
            if (s.skill === 'listening') expect(q.type === 'fill' ? false : !!(q.text ?? s.text), `${p.id} ${s.title}: listening needs a text to play`).toBe(true);
          }
      }
    });
  }
});
