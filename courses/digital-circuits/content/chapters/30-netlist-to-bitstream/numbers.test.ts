import { describe, expect, test, vi } from 'vitest';
import { nodeSynth } from '$lib/synth/node';
import type { RunResult } from '$lib/synth/api';
import { implement } from '$lib/studio/ice40/run';
import { HX8K_CT256, STUDIO_DESIGNS, studioFiles } from '$lib/studio/ice40/designs';
import { designSource } from '$lib/widgets/weft/designs';
import { galAdapter } from '$lib/studio/adapters/gal';
import { cpldAdapter } from '$lib/studio/adapters/cpld';
import { setup } from './widgets/corrupt';

/**
 * The numbers Chapter 30 quotes about synth's flow, checked against synth. synth is pinned (synth.json), and with a
 * fixed seed every stage is deterministic, so the figures are checked exactly; when the pin moves, re-measure and
 * update the text.
 */
vi.setConfig({ testTimeout: 300_000 });
const synth = nodeSynth();
const HX1K = { name: 'iCE40 HX1K, VQ100 package', part: 'hx1k', package: 'vq100', pcf: '' };
const stats = (r: RunResult, id: string) => r.stages.find((s) => s.id === id)!.stats;
const line = (r: RunResult, start: string) => r.log.find((l) => l.startsWith(start)) ?? '';

describe('the counter on the Go Board (Figure 30.1)', async () => {
  const d = STUDIO_DESIGNS.counter!;
  const r = await implement(synth, studioFiles(d), { target: d.target, top: d.top, trace: true });

  test('seven word-level cells; a carry chain lowered and taken back off; 9 AND gates and 6 flip-flops', () => {
    expect(stats(r, 'elaborated')).toEqual({ Add: 1, And: 1, Dff: 2, Mux: 2, Not: 1 });
    expect(stats(r, 'gates_lowered')).toMatchObject({ AND: 0, FF: 6, 'carry chains': 1 });
    expect(stats(r, 'gates_optimised')).toMatchObject({ AND: 9, FF: 6, 'carry chains': 0 });
    expect(r.log.some((l) => l.includes('carry chains mapped to LUTs'))).toBe(true);
  });

  test('4 LUTs, 4 SB_DFFE and 2 SB_DFF; 6 logic cells and 6 pads; 8 nets, routed in one iteration with 45 wires', () => {
    expect(stats(r, 'mapped')).toMatchObject({ SB_LUT4: 4, SB_DFFE: 4, SB_DFF: 2 });
    expect(stats(r, 'packed')).toEqual({ ICESTORM_LC: 6, SB_IO: 6 });
    expect(r.chip!.nets).toHaveLength(8);
    expect(line(r, 'routing:')).toBe('routing: 8 nets, 45 wires used, 1 iterations');
    expect(r.trace!.route).toHaveLength(1);
    expect(line(r, 'placement:')).toMatch(/in 57 temperature steps$/);
    expect(r.log).toContain('6 LUTs with permuted inputs');
  });

  test('timing: 1.94 ns, 514 MHz, from a synchroniser flip-flop (0.64 ns) to the clock enable of the counter’s tile', () => {
    const c = r.timing!.clocks[0]!;
    expect(line(r, 'clock clk:')).toMatch(/^clock clk: 1.94 ns/);
    expect(Math.round(c.fmax_mhz)).toBe(514);
    expect(c.path.map((s) => s.pin)).toEqual(['O', 'CEN']);
    expect(c.path[0]!.t).toBeCloseTo(0.64, 2);
    expect(c.path[0]!.cell).toMatch(/^enable/);
  });

  test('the file is 32,216 bytes; 706 of 175,872 bits are set', () => {
    expect(r.bitstream!.bytes).toBe(32_216);
    expect([r.bitstream!.set_bits, r.bitstream!.tile_bits]).toEqual([706, 175_872]);
  });

  test('over five seeds the counter runs at about 390 to 590 MHz', async () => {
    const f: number[] = [];
    for (const seed of [1, 2, 3, 4, 5]) f.push((await implement(synth, studioFiles(d), { target: d.target, top: d.top, seed })).timing!.clocks[0]!.fmax_mhz);
    expect(Math.round(Math.min(...f) / 10) * 10).toBe(390);
    expect(Math.round(Math.max(...f) / 10) * 10).toBe(590);
  });
});

describe('the ALU (synthesis, mapping, packing, placement, routing)', async () => {
  const a = STUDIO_DESIGNS.alu!;
  const r = await implement(synth, studioFiles(a), { target: a.target, top: a.top, trace: true });

  test('1,770 AND nodes lowered, 1,526 optimised; 559 structural choices', () => {
    expect(stats(r, 'gates_lowered').AND).toBe(1770);
    expect(stats(r, 'gates_optimised').AND).toBe(1526);
    expect(r.log.some((l) => l.startsWith('559 structural choices'))).toBe(true);
  });

  test('mapping: 563 LUTs first, 523 after recovery at the same depth; 588 SB_LUT4 and 95 SB_CARRY; 653 cells (64 only carry)', () => {
    expect(r.log.some((l) => l.startsWith('first mapping: 563 LUTs'))).toBe(true);
    const mapped = r.log.find((l) => l.startsWith('mapped in'))!;
    expect(mapped).toMatch(/523 LUTs/);
    expect(r.log.filter((l) => l.startsWith('remapping round'))).toHaveLength(5);
    expect(stats(r, 'mapped')).toMatchObject({ SB_LUT4: 588, SB_CARRY: 95 });
    expect(r.chip!.usage.lc).toBe(653);
    expect(r.log).toContain('64 logic cells used for carry only');
    expect(new Set(r.chip!.cells.filter((c) => c.bel === 'lc').map((c) => `${c.x},${c.y}`)).size).toBe(104);
    expect(r.log).toContain('500 LUTs with permuted inputs');
  });

  test('placement: 557 units, wirelength 20,383 to 4,689 in 81 temperature steps', () => {
    expect(line(r, 'placement:')).toBe('placement: 557 units, 753 nets, wirelength 20383 -> 4689 in 81 temperature steps');
    expect(r.trace!.place).toHaveLength(81);
  });

  test('routing: 696 nets, overused nodes 232, 94, 12, 0; rerouted nets 696, 288, 108, 18', () => {
    expect(r.trace!.route.map((x) => x.overused)).toEqual([232, 94, 12, 0]);
    expect(r.trace!.route.map((x) => x.nets)).toEqual([696, 288, 108, 18]);
    expect(Math.round((100 * 232) / 6973)).toBe(3);
    expect(line(r, 'routing:')).toBe('routing: 696 nets, 6973 wires used, 4 iterations');
  });

  test('two more seeds: wirelengths 4,668 and 4,933', async () => {
    const w: string[] = [];
    for (const seed of [2, 3]) w.push(line(await implement(synth, studioFiles(a), { target: a.target, top: a.top, seed }), 'placement:'));
    expect(w.map((l) => l.match(/-> (\d+)/)![1])).toEqual(['4668', '4933']);
  });
});

describe('the mapper on small functions and wider counters', () => {
  test('an 8-input parity is 21 AND nodes and 3 LUTs, three levels deep as a chain', async () => {
    const r = await implement(synth, [{ name: 'p.weft', text: 'module parity(in a: bool, in b: bool, in c: bool, in d: bool, in e: bool, in f: bool, in g: bool, in h: bool, out y: bool) {\n    y = a ^ b ^ c ^ d ^ e ^ f ^ g ^ h;\n}\n' }], { target: HX1K });
    expect(stats(r, 'gates_optimised').AND).toBe(21);
    expect(r.log.find((l) => l.startsWith('mapped in'))).toMatch(/3 LUTs, delay 3\.00 LUT levels/);
  });

  test('a 16-bit counter with an enable is 17 logic cells, with 14 carry cells', async () => {
    const r = await implement(synth, [{ name: 'c.weft', text: 'module c16(in clk: clock, in enable: bool @clk, out count: uint<16>) {\n    reg value: uint<16> = 0;\n    if enable { value := value +% 1; }\n    count = value;\n}\n' }], { target: HX1K });
    expect(r.chip!.usage.lc).toBe(17);
    expect(stats(r, 'mapped').SB_CARRY).toBe(14);
    expect(Math.floor(1280 / 17)).toBeGreaterThanOrEqual(70);
  });

  test('the counter with enable and clear on a bare HX1K: 8 logic cells in two tiles, 796 bits set', async () => {
    const s = await setup(synth);
    expect(s.result.chip!.usage.lc).toBe(8);
    expect(new Set(s.cells.map((c) => `${c.x},${c.y}`)).size).toBe(2);
    expect(s.result.bitstream!.set_bits).toBe(796);
  });

  test('the real lab: the counter with a 23-bit divider on the Go Board is about 36 cells at around 180 MHz', async () => {
    const top = 'module top(in clk: clock, out led: uint<4>) {\n    reg div: uint<23> = 0;\n    div := div +% 1;\n    inst c = counter(clk: clk, enable: div == 0, clear: false);\n    led = c.count;\n}\n';
    const r = await implement(synth, [{ name: 'counter.weft', text: designSource('counter')! }, { name: 'top.weft', text: top }], { target: 'go-board', top: 'top' });
    expect(r.ok).toBe(true);
    expect(Math.abs(r.chip!.usage.lc - 36)).toBeLessThanOrEqual(2);
    expect(Math.abs(r.timing!.clocks[0]!.fmax_mhz - 180)).toBeLessThan(25);
  });
});

describe('one design, three chips (the table of Chapter 30)', () => {
  const eq = `# @title 4-bit counter
# @clock CLK
Q0.R = !CLR & (Q0 ^ EN)
Q1.R = !CLR & (Q1 ^ (EN & Q0))
Q2.R = !CLR & (Q2 ^ (EN & Q0 & Q1))
Q3.R = !CLR & (Q3 ^ (EN & Q0 & Q1 & Q2))
WRAPPED = EN & Q0 & Q1 & Q2 & Q3
`;
  test('GAL22V10: 5 of 10 macrocells, 15 product terms (2, 3, 4 and 5 for the registers), 53 fuses', () => {
    const g = galAdapter.program(eq);
    expect(g.ok).toBe(true);
    if (!g.ok) return;
    expect(g.fit.summary).toBe('5 of 10 macrocells, 15 of 130 product terms, 53 fuses connected');
    const rows = (g.fit.report.find((s) => s.title === 'Outputs') as { table: { rows: string[][] } }).table.rows;
    expect(Object.fromEntries(rows.map((r) => [r[0], r[4]]))).toEqual({ WRAPPED: '1/16', Q0: '2/14', Q1: '3/12', Q2: '4/10', Q3: '5/8' });
  });

  test('vCPLD-32: 5 of 32 macrocells, 9 product terms, T flip-flops with 2 terms each, in one function block', () => {
    const c = cpldAdapter.program(eq);
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    expect(c.fit.summary).toBe('5 of 32 macrocells, 9 of 160 product terms, 0 borrowed');
    const rows = (c.fit.report.find((s) => s.title === 'Outputs') as { table: { rows: string[][] } }).table.rows;
    expect(rows.filter((r) => r[3] === 'T flip-flop').map((r) => r[5])).toEqual(['2', '2', '2', '2']);
    const fbs = (c.fit.report.find((s) => s.title === 'Function blocks') as { table: { rows: string[][] } }).table.rows;
    expect(fbs.filter((r) => r[1] !== '0/8')).toHaveLength(1);
  });

  test('a 16-bit counter cannot fit a GAL22V10: 16 registers against 10 macrocells; bit 15 needs 17 terms against at most 16', () => {
    const q = Array.from({ length: 16 }, (_, i) => i);
    const lines = q.map((i) => `Q${i}.R = !CLR & (Q${i} ^ (EN${q.slice(0, i).map((j) => ` & Q${j}`).join('')}))`);
    const g = galAdapter.program(`# @title 16-bit counter\n# @clock CLK\n${lines.join('\n')}\n`);
    expect(g.ok).toBe(false);
  });
});
