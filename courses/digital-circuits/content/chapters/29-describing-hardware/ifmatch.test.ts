/** The if-versus-match figure shows synth's own measurements (`ifmatch-measured.json`; UPDATE_IFMATCH=1 rewrites it). */
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { format, run } from '$lib/synth/api';
import { nodeSynth } from '$lib/synth/node';
import { SELECTOR_BITS, STYLES, andDepth, key, pickSource, type Measure } from './widgets/ifmatch';

const synth = nodeSynth();
const file = new URL('./widgets/ifmatch-measured.json', import.meta.url);

describe('if chain, match and priority chain on synth', () => {
  it('measures what the figure shows', async () => {
    const out: Record<string, Measure> = {};
    for (const style of STYLES) {
      for (const k of SELECTOR_BITS) {
        const source = pickSource(style, k);
        expect(await format(synth, source), `${style} ${k} is formatted`).toBe(source);
        const r = await run(synth, { files: [{ name: 'pick.weft', text: source }], stop: 'synth', testbench: true });
        expect(r.ok, r.error).toBe(true);
        const st = (id: string) => r.stages.find((s) => s.id === id)!;
        out[key(style, k)] = {
          style,
          arms: 2 ** k,
          muxes: st('elaborated').stats.Mux ?? 0,
          ands: st('gates_optimised').stats.AND ?? 0,
          depthWritten: andDepth(st('gates_lowered').graph!),
          depthOptimised: andDepth(st('gates_optimised').graph!),
          luts: st('mapped').stats.SB_LUT4 ?? 0,
        };
      }
    }
    if (process.env.UPDATE_IFMATCH) writeFileSync(file, `${JSON.stringify(out, null, 2)}\n`);
    else expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual(out);
  });

  it('a chain on one selector and a match end up the same; a priority chain does not', () => {
    const m = JSON.parse(readFileSync(file, 'utf8')) as Record<string, Measure>;
    for (const k of SELECTOR_BITS) {
      expect(m[key('if', k)]!.depthOptimised).toBe(m[key('match', k)]!.depthOptimised);
      expect(m[key('if', k)]!.luts).toBe(m[key('match', k)]!.luts);
    }
    expect(m[key('priority', 4)]!.depthOptimised).toBeGreaterThan(2 * m[key('match', 4)]!.depthOptimised);
  });
});
