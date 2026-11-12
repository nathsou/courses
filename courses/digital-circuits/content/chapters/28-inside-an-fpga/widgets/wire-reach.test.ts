import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { nodeSynth } from '$lib/synth/node';
import { DELAYS, fastest } from './wire-reach';

const file = new URL('./ice40-delays.json', import.meta.url);

describe('crossing a row of iCE40 tiles (Figure 28.3)', () => {
  test('the delays are synth’s, for the HX1K (UPDATE_DELAYS=1 records them)', async () => {
    const d = (await nodeSynth().call('delays', { part: 'hx1k' })) as Record<string, unknown>;
    const keep = Object.fromEntries(['lut', 'lut_in3', 'carry', 'clk_to_q', 'setup', 'odrv4', 'odrv12', 'sp12to4', 'local', 'inmux', 'span4_h', 'span12_h'].map((k) => {
      const v = d[k];
      return [k, Array.isArray(v) ? v.map((x) => Math.round(x as number)) : Math.round(v as number)];
    }));
    if (process.env.UPDATE_DELAYS) writeFileSync(file, `${JSON.stringify(keep, null, 2)}\n`);
    else expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual(keep);
  });

  test('the next tile is a neighbour link: a local track and the cell input, about 0.6 ns', () => {
    const r = fastest(1, 'neighbour');
    expect(r.hops.map((h) => h.wire)).toEqual(['neighbour']);
    expect(r.delay).toBeCloseTo((DELAYS.local + DELAYS.inmux) / 1000, 9);
  });

  test('a long row: repeaters in every tile are slow, span wires fast', () => {
    const n = fastest(24, 'neighbour');
    const f = fastest(24, 'four');
    const a = fastest(24, 'all');
    expect(n.hops).toHaveLength(24);
    expect(f.delay).toBeLessThan(n.delay / 3);
    expect(a.delay).toBeLessThan(f.delay);
    expect(a.hops.map((h) => h.wire)).toEqual(['span12', 'span12']);
  });

  test('never slower with more kinds of wire, at every distance', () => {
    for (let d = 1; d < 36; d++) {
      expect(fastest(d, 'four').delay).toBeLessThanOrEqual(fastest(d, 'neighbour').delay + 1e-9);
      expect(fastest(d, 'all').delay).toBeLessThanOrEqual(fastest(d, 'four').delay + 1e-9);
    }
  });
});
