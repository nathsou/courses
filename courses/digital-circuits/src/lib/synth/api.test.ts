import { describe, expect, it } from 'vitest';
import { analyze, format, run, tbRun, tbStart, tbStop, toBigInt } from './api';
import { nodeSynth } from './node';

const synth = nodeSynth();
const counter = {
  name: 'counter.weft',
  text: `module counter(in clk: clock, in enable: bool, out count: uint<4>) {
    reg value: uint<4> = 0;
    if enable { value := value +% 1; }
    count = value;
}
`,
};

describe('synth', () => {
  it('analyses Weft and reports its mistakes', async () => {
    const ok = await analyze(synth, [counter]);
    expect(ok.diagnostics).toEqual([]);
    expect(ok.refs.some((r) => r.hover.includes('uint<4>'))).toBe(true);
    const bad = await analyze(synth, [{ name: 'x.weft', text: 'module m(out x: uint<2>) { x = 7; }\n' }]);
    expect(bad.diagnostics[0]!.severity).toBe('error');
    expect(bad.diagnostics[0]!.at?.line).toBe(1);
  });

  it('formats Weft', async () => {
    expect(await format(synth, 'module m(out x: bool) {\nx = true;\n}\n')).toBe('module m(out x: bool) {\n    x = true;\n}\n');
  });

  it('drives a testbench session', async () => {
    const s = await tbStart(synth, { files: [counter] });
    if (!s.ok) throw new Error(s.error);
    expect(s.clocks).toEqual(['clk']);
    const r = await tbRun(synth, s.id, [{ set: { enable: true } }, { step: 3, trace: ['count'] }]);
    expect(r.reads.map((x) => x.values?.count)).toEqual([1, 2, 3]);
    await tbStop(synth, s.id);
  });

  it('runs the iCE40 flow, which keeps top-level inputs asynchronous', async () => {
    const unsynced = await run(synth, { files: [counter], part: 'hx1k', package: 'vq100', effort: 0.3 });
    expect(unsynced.ok).toBe(false);
    expect(unsynced.diagnostics[0]!.helps?.join(' ')).toContain('sync(enable)');
    const top = { name: 'top.weft', text: counter.text.replace('if enable', 'let en = sync(enable);\n    if en') };
    const r = await run(synth, { files: [top], part: 'hx1k', package: 'vq100', effort: 0.3 });
    expect(r.ok).toBe(true);
    expect(r.stages.map((s) => s.id)).toContain('mapped');
    expect(r.chip?.usage.lc).toBeGreaterThan(0);
    expect(r.timing?.clocks[0]?.clock).toBe('clk');
  });

  it('reads signed values', () => {
    expect(toBigInt(255, 8, true)).toBe(-1n);
    expect(toBigInt('0x80000000000000', 56)).toBe(1n << 55n);
  });
});
