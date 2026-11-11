/**
 * The check every chapter's playground programs go through (`content/chapters/<ch>/snippets.test.ts`): in
 * synth's format, compiling without an error (or, for a program that shows something Weft refuses, with
 * one), and passing their tests, or, for an exercise with a solution, failing them until fixed.
 */
import { expect } from 'vitest';
import { analyze, format } from '$lib/synth/api';
import { nodeSynth } from '$lib/synth/node';
import { runTestSource } from './testbench';

export interface CheckedSnippet {
  top?: string;
  code: string;
  tests?: string;
  solution?: string;
  rejected?: boolean;
}

export async function checkSnippet(id: string, s: CheckedSnippet): Promise<void> {
  const synth = nodeSynth();
  const passes = async (code: string) => {
    const r = await runTestSource(synth, [{ name: 'snippet.weft', text: code }], s.top, s.tests!);
    return r.ok && r.results.every((t) => t.pass);
  };
  for (const code of [s.code, s.solution].filter((c): c is string => !!c)) {
    expect(await format(synth, code), `${id} is formatted`).toBe(code);
    const a = await analyze(synth, [{ name: 'snippet.weft', text: code }], { top: s.top });
    const errors = a.diagnostics.filter((d) => d.severity === 'error').map((d) => d.rendered);
    if (s.rejected && code === s.code) expect(errors.length, `${id} is rejected`).toBeGreaterThan(0);
    else expect(errors, id).toEqual([]);
  }
  if (!s.tests) return;
  if (s.solution) {
    expect(await passes(s.code), `${id} fails before the fix`).toBe(false);
    expect(await passes(s.solution), `${id} passes after the fix`).toBe(true);
  } else expect(await passes(s.code), `${id} passes its tests`).toBe(true);
}
