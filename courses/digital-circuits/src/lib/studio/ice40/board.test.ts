import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { nodeSynth } from '$lib/synth/node';
import { tbRun, tbStart, tbStop } from '$lib/synth/api';
import { implement } from './run';
import { busSet, busValue, busesOf, pinsOf } from './board';
import { HX8K_CT256 } from './designs';

const synth = nodeSynth();
const read = (n: string) => readFileSync(new URL(`../../../../content/designs/${n}.weft`, import.meta.url), 'utf8');

describe('a design running from its bitstream', () => {
  it('the counter on the Go Board counts while the button is held', async () => {
    const r = await implement(synth, [{ name: 'counter.weft', text: read('counter') }, { name: 'top.weft', text: read('counter-chip') }], { board: 'go-board' });
    expect(r.ok, r.error).toBe(true);
    const s = await tbStart(synth, { bitstream: r.bin!, part: 'hx1k', package: 'vq100', pins: pinsOf(r.chip!, r.target.pcf) });
    if (!s.ok) throw new Error(s.error);
    const buses = busesOf(s.ports);
    expect(buses.map((b) => [b.name, b.dir, b.width])).toEqual(expect.arrayContaining([['clk', 'in', 1], ['btn', 'in', 1], ['led', 'out', 4]]));
    const led = buses.find((b) => b.name === 'led')!;
    const t = await tbRun(synth, s.id, [{ set: { btn: 1 } }, { step: 2 }, { step: 6, trace: led.ports.map((p) => p.name) }]);
    await tbStop(synth, s.id);
    const counts = t.reads.map((x) => busValue(led, x.values!));
    // Two cycles through the synchroniser, then one a cycle.
    expect(counts).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('a design without a board gets the pins the placer chose', async () => {
    const r = await implement(synth, [{ name: 'alu.weft', text: read('alu') }], { target: HX8K_CT256, effort: 0.3 });
    expect(r.ok, r.error).toBe(true);
    const pcf = pinsOf(r.chip!, '');
    expect(pcf.split('\n').filter(Boolean)).toHaveLength(32 + 32 + 3 + 2 + 32);
    const s = await tbStart(synth, { bitstream: r.bin!, part: 'hx8k', package: 'ct256', pins: pcf });
    if (!s.ok) throw new Error(s.error);
    const bus = (n: string) => busesOf(s.ports).find((b) => b.name === n)!;
    const t = await tbRun(synth, s.id, [{ set: { ...busSet(bus('rs1_value'), 1234), ...busSet(bus('b'), 4321), ...busSet(bus('f3'), 0), ...busSet(bus('is_reg'), 0), ...busSet(bus('ir30'), 0) } }, { read: bus('result').ports.map((p) => p.name) }]);
    await tbStop(synth, s.id);
    expect(busValue(bus('result'), t.reads[0]!.values!)).toBe(5555);
  });
});
