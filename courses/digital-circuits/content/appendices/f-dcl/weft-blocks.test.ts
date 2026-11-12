/**
 * Every ```weft block of the appendix is real Weft: synth compiles it without a warning, it is in synth's
 * format, and the ```tests block right after it (if any) passes. Blocks that are meant to fail carry `error`
 * in the fence info (```weft error title="A") and must produce at least one error.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { analyze, format } from '$lib/synth/api';
import { nodeSynth } from '$lib/synth/node';
import { runTestSource } from '$lib/weft/testbench';
import { fencedBlocks } from '../../chapters/29-describing-hardware/fences';

const md = readFileSync(new URL('./index.md', import.meta.url), 'utf8');
const blocks = fencedBlocks(md, 'weft');
const synth = nodeSynth();

describe('the Weft blocks of the appendix', () => {
  it('has a good number of them, with tests', () => {
    expect(blocks.length).toBeGreaterThanOrEqual(8);
    expect(blocks.filter((b) => /\berror\b/.test(b.meta)).length).toBe(0);
    expect(blocks.filter((b) => b.tests).length).toBeGreaterThanOrEqual(3);
  });

  for (const b of blocks) {
    const broken = /\berror\b/.test(b.meta);
    it(`line ${b.line}: ${broken ? 'is rejected by synth' : 'compiles, is formatted and passes its tests'}`, async () => {
      const files = [{ name: `appendix-${b.line}.weft`, text: b.code }];
      const a = await analyze(synth, files);
      const errors = a.diagnostics.filter((d) => d.severity === 'error');
      if (broken) {
        expect(errors.length).toBeGreaterThan(0);
        return;
      }
      expect(a.diagnostics.map((d) => d.rendered)).toEqual([]);
      expect(await format(synth, b.code)).toBe(b.code);
      if (b.tests) {
        const r = await runTestSource(synth, files, undefined, b.tests);
        expect(r.error).toBeUndefined();
        expect(r.results.filter((t) => !t.pass).map((t) => [t.name, t.error, t.failed])).toEqual([]);
      }
    });
  }
});
