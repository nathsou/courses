import { describe, expect, test } from 'vitest';
import { TOOLS, choose } from './tools';
import { PARTS } from '../../../outline';

describe('the tool chooser', () => {
  test('recommends the obvious tool first', () => {
    expect(choose({ target: 'code', lang: 'c', want: 'sound' }).tools[0]!.id).toBe('astree');
    expect(choose({ target: 'code', lang: 'c', want: 'bounded' }).tools[0]!.id).toBe('cbmc');
    expect(choose({ target: 'code', lang: 'rust', want: 'proof' }).tools.map((t) => t.id).slice(0, 2).sort()).toEqual(['verus', 'viper']);
    expect(choose({ target: 'code', lang: 'java', want: 'proof' }).tools[0]!.id).toBe('key');
    expect(choose({ target: 'code', lang: 'ada', want: 'proof' }).tools[0]!.id).toBe('spark');
    expect(choose({ target: 'design', design: 'param' }).tools[0]!.id).toBe('ivy');
    expect(choose({ target: 'design', design: 'data' }).tools[0]!.id).toBe('alloy');
    expect(choose({ target: 'hardware' }).tools[0]!.id).toBe('abc');
    expect(choose({ target: 'math' }).tools.map((t) => t.id)).toEqual(['lean', 'rocq', 'isabelle']);
  });

  test('every answer combination has a recommendation', () => {
    for (const lang of ['c', 'rust', 'java', 'ada', 'other'] as const)
      for (const want of ['proof', 'bugs', 'sound', 'bounded'] as const) {
        const r = choose({ target: 'code', lang, want });
        expect(r.tools.length, `${lang} ${want}`).toBeGreaterThan(0);
      }
  });

  test('chapter links point at real chapters', () => {
    const slugs = new Set(PARTS.flatMap((p) => p.chapters.map((c) => c.slug)));
    for (const t of TOOLS) for (const c of t.chapters) expect(slugs.has(c.slug), `${t.id}: ${c.slug}`).toBe(true);
  });
});
