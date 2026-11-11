/** The chapter's playground programs: each compiles cleanly; starting points that are exercises fail their tests and their solutions pass. */
import { describe, expect, it } from 'vitest';
import { analyze, format } from '$lib/synth/api';
import { nodeSynth } from '$lib/synth/node';
import { runTestSource } from '$lib/weft/testbench';
import { SNIPPETS } from './widgets/snippets';

const synth = nodeSynth();
const passes = async (code: string, tests: string, top?: string) => {
  const r = await runTestSource(synth, [{ name: 'snippet.weft', text: code }], top, tests);
  return r.ok && r.results.every((t) => t.pass);
};

describe('the chapter 29 snippets', () => {
  for (const [id, s] of Object.entries(SNIPPETS)) {
    it(`${id}: formatted, and ${s.solution ? 'fails until fixed' : 'passes its tests'}`, async () => {
      for (const code of [s.code, s.solution].filter((c): c is string => !!c)) {
        expect(await format(synth, code), id).toBe(code);
        const a = await analyze(synth, [{ name: 'snippet.weft', text: code }], { top: s.top });
        expect(a.diagnostics.filter((d) => d.severity === 'error').map((d) => d.rendered)).toEqual([]);
      }
      if (!s.tests) return;
      if (s.solution) {
        expect(await passes(s.code, s.tests, s.top)).toBe(false);
        expect(await passes(s.solution, s.tests, s.top)).toBe(true);
      } else expect(await passes(s.code, s.tests, s.top)).toBe(true);
    });
  }
});
