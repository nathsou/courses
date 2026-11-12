import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { nodeSynth } from '$lib/synth/node';
import { buildXor, CENSUS, EXPECTED, meaning, outputs, type Census } from './upset';

const synth = nodeSynth();
const file = new URL('./upset-census.json', import.meta.url);

describe('configuration upsets on an iCE40 (Figure 28.5)', () => {
  it('the XOR gate works from its bitstream, and a census of its tiles finds the critical bits', async () => {
    const built = await buildXor(synth);
    expect(built.tiles.map((t) => t.kind).sort()).toEqual(['I/O', 'I/O', 'I/O', 'logic']);
    expect(await outputs(synth, built, [])).toBe(EXPECTED);
    if (process.env.UPDATE_UPSET) {
      const critical: Census['critical'] = [];
      for (const t of built.tiles) for (let i = 0; i < 16 * t.w; i++) if ((await outputs(synth, built, [[t.x, t.y, i]])) !== EXPECTED) critical.push([t.x, t.y, i]);
      writeFileSync(file, `${JSON.stringify({ total: built.total, critical })}\n`);
      return;
    }
    const rec = JSON.parse(readFileSync(file, 'utf8')) as Census;
    expect(rec.total).toBe(built.total);
    // Every recorded critical bit breaks the gate, and a sample of the others does not.
    for (const c of rec.critical) expect(await outputs(synth, built, [c]), String(c)).not.toBe(EXPECTED);
    const crit = new Set(rec.critical.map((c) => c.join(',')));
    let checked = 0;
    for (const t of built.tiles) {
      for (let i = 7; i < 16 * t.w && checked < 120; i += 37) {
        if (crit.has(`${t.x},${t.y},${i}`)) continue;
        expect(await outputs(synth, built, [[t.x, t.y, i]]), `${t.x},${t.y},${i}`).toBe(EXPECTED);
        checked++;
      }
    }
    // The bits of the logic cell are read back as its LUT; most bits do not matter.
    const lc = built.result.chip!.cells.find((c) => c.bel === 'lc')!;
    const lut = built.result.bitstream!.tiles.find((t) => t.x === lc.x && t.y === lc.y)!;
    const lutBits = lut.f.find((f) => f.n.startsWith('logic cell'))!.b;
    for (const b of lutBits) expect(meaning(built.result.bitstream!, lut.x, lut.y, b).kind).toBe('cell');
    expect(rec.critical.length).toBeGreaterThan(10);
    expect(rec.critical.length / rec.total).toBeLessThan(0.1);
    expect(CENSUS.critical.length).toBe(rec.critical.length);
  });
});
