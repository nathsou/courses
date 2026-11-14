import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { nodeSynth } from '$lib/synth/node';
import { analyze, run } from '$lib/synth/api';
import { BOARDS } from './boards';
import { implement } from './run';
import { cellRect, describeCell, netGeometry, pathCells, tileKind, tileRect } from './chipdraw';

const synth = nodeSynth();
const counter = readFileSync(new URL('../../../../content/designs/counter.weft', import.meta.url), 'utf8');
const top = readFileSync(new URL('../../../../content/designs/counter-chip.weft', import.meta.url), 'utf8');

describe('the boards', () => {
  it('have synth’s own pin files', async () => {
    const devices = (await synth.call('devices', {})) as { part: string; pins: Record<string, string>; clock_hz: Record<string, number> }[];
    for (const b of Object.values(BOARDS)) {
      const d = devices.find((x) => x.part === b.part)!;
      expect(d.pins[b.package]).toBe(b.pcf);
      expect(d.clock_hz[b.package]).toBe(b.clockHz);
    }
  });
});

describe('the counter on the Go Board, drawn', () => {
  it('is placed on the die with its routes, timing and trace', async () => {
    const files = [{ name: 'counter.weft', text: counter }, { name: 'counter-chip.weft', text: top }];
    expect((await analyze(synth, files, { testbench: false })).diagnostics.map((d) => d.rendered)).toEqual([]);
    const r = await implement(synth, files, { board: 'go-board', trace: true });
    expect(r.ok, r.error).toBe(true);
    const chip = r.chip!;
    expect([chip.gw, chip.gh]).toEqual([14, 18]);
    expect(tileKind(chip, 0, 0)).toBe('corner');
    expect(tileKind(chip, 0, 5)).toBe('io');
    expect(tileKind(chip, 1, 1)).toBe('logic');
    const lcs = chip.cells.filter((c) => c.bel === 'lc');
    expect(lcs.length).toBe(chip.usage.lc);
    for (const c of lcs) {
      const cr = cellRect(chip, c);
      const t = tileRect(chip, c.x, c.y);
      expect(cr.x).toBeGreaterThanOrEqual(t.x);
      expect(cr.x + cr.w).toBeLessThanOrEqual(t.x + 1);
      expect(cr.y).toBeGreaterThanOrEqual(t.y);
      expect(cr.y + cr.h).toBeLessThanOrEqual(t.y + 1);
      expect(describeCell(c)).toMatch(/LUT|flip-flop/);
    }
    const g = chip.nets.map((n) => netGeometry(chip, n));
    expect(g.reduce((s, x) => s + x.segments.length, 0)).toBeGreaterThan(5);
    expect(pathCells(chip, r.timing!.clocks[0]!.path).size).toBeGreaterThan(0);
    expect(r.trace!.place.length).toBeGreaterThan(5);
    expect(r.trace!.route.at(-1)!.overused).toBe(0);
    // The pads are where the board's pin file puts them.
    const led0 = chip.cells.find((c) => c.name.startsWith('led[0]'))!;
    expect(led0.pin).toBe('56');
    void run;
  });
});
