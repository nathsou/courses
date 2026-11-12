/**
 * Every reference design compiles without warnings, together (a board's top module uses the designs it puts on
 * the chip), and passes its tests on synth's simulator.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { analyze } from '$lib/synth/api';
import { nodeSynth } from '$lib/synth/node';
import { runTestSource } from '$lib/weft/testbench';

const dir = new URL('./', import.meta.url);
const names = readdirSync(dir).filter((f) => f.endsWith('.weft'));
const files = names.map((name) => ({ name, text: readFileSync(new URL(name, dir), 'utf8') }));
/** The module a file defines last: its top. */
const topOf = (text: string) => [...text.matchAll(/^module (\w+)/gm)].at(-1)![1]!;

describe('reference designs', () => {
  it('compile together without a diagnostic, as the modules of a chip', async () => {
    const a = await analyze(nodeSynth(), files, { testbench: false });
    expect(a.diagnostics.map((d) => d.rendered)).toEqual([]);
  });

  for (const f of files) {
    let tests: string | undefined;
    try {
      tests = readFileSync(new URL(f.name.replace(/\.weft$/, '.tests'), dir), 'utf8');
    } catch {
      continue;
    }
    it(`${f.name} passes its tests`, async () => {
      const r = await runTestSource(nodeSynth(), files, topOf(f.text), tests!);
      expect(r.error).toBeUndefined();
      for (const t of r.results) expect([t.name, t.pass, t.error, t.failed]).toEqual([t.name, true, undefined, undefined]);
    });
  }
});
