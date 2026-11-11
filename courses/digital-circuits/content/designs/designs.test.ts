/** Every reference design compiles without warnings and passes its tests on synth's simulator. */
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { analyze } from '$lib/synth/api';
import { nodeSynth } from '$lib/synth/node';
import { runTestSource } from '$lib/weft/testbench';

const dir = new URL('./', import.meta.url);
const designs = readdirSync(dir).filter((f) => f.endsWith('.weft'));

describe('reference designs', () => {
  for (const f of designs) {
    it(`${f} has no diagnostics and passes its tests`, async () => {
      const text = readFileSync(new URL(f, dir), 'utf8');
      const files = [{ name: f, text }];
      const a = await analyze(nodeSynth(), files);
      expect(a.diagnostics.map((d) => d.rendered)).toEqual([]);
      const testsFile = f.replace(/\.weft$/, '.tests');
      let tests = '';
      try {
        tests = readFileSync(new URL(testsFile, dir), 'utf8');
      } catch {
        return;
      }
      const r = await runTestSource(nodeSynth(), files, undefined, tests);
      expect(r.error).toBeUndefined();
      for (const t of r.results) expect([t.name, t.pass, t.error, t.failed]).toEqual([t.name, true, undefined, undefined]);
    });
  }
});
