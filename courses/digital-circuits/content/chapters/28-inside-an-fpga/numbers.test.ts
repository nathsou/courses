import { describe, expect, test, vi } from 'vitest';
import { nodeSynth } from '$lib/synth/node';
import type { RunResult } from '$lib/synth/api';
import { implement } from '$lib/studio/ice40/run';
import { HX8K_CT256, STUDIO_DESIGNS, studioFiles } from '$lib/studio/ice40/designs';
import { designSource } from '$lib/widgets/weft/designs';
import { DELAYS, fastest } from './widgets/wire-reach';
import { buildXor, CENSUS } from './widgets/upset';
import { handCell } from './widgets/byhand';

/** The numbers Chapter 28 quotes about the iCE40 and synth's flow, checked against synth. */
vi.setConfig({ testTimeout: 300_000 });
const synth = nodeSynth();

/** The critical path of the first clock, split into the time spent reaching cell inputs (routing) and in cells. */
function split(r: RunResult): { period: number; wires: number } {
  const c = r.timing!.clocks[0]!;
  let wires = 0;
  let prev = 0;
  for (const s of c.path) {
    if (!/^(O|COUT|Q|LO)$/.test(s.pin)) wires += s.t - prev;
    prev = s.t;
  }
  return { period: c.period_ns, wires };
}

const one = (name: string, text: string) => [{ name, text }];

describe('the logic cell and its timing', () => {
  test('a LUT takes 0.45 ns, a carry 0.13 ns from cell to cell, and a 32-bit chain about 4.6 ns', () => {
    expect(DELAYS.lut / 1000).toBeCloseTo(0.45, 2);
    expect(DELAYS.carry / 1000).toBeCloseTo(0.13, 2);
    // 32 LUTs and the shortest wire to the next tile, against the carry chain.
    expect(Math.round(32 * (DELAYS.lut / 1000 + fastest(1, 'neighbour').delay))).toBe(33);
  });

  test('a 32-bit adder is 32 logic cells on one chain; registered at both ends, 156 MHz', async () => {
    const comb = await implement(synth, one('add.weft', 'module add(in a: uint<32>, in b: uint<32>, out s: uint<32>) {\n    s = a +% b;\n}\n'), { target: HX8K_CT256 });
    expect(comb.chip!.usage.lc).toBe(32);
    const reg = await implement(
      synth,
      one('add.weft', 'module add_reg(in clk: clock, in a: uint<32> @clk, in b: uint<32> @clk, out s: uint<32>) {\n    reg ra: uint<32> = 0;\n    reg rb: uint<32> = 0;\n    reg rs: uint<32> = 0;\n    ra := a;\n    rb := b;\n    rs := ra +% rb;\n    s = rs;\n}\n'),
      { target: HX8K_CT256 },
    );
    const c = reg.timing!.clocks[0]!;
    expect(c.period_ns).toBeCloseTo(6.4, 1);
    expect(Math.round(c.fmax_mhz)).toBe(156);
    const carry = c.path.filter((s) => s.pin === 'CIN');
    expect(carry.length).toBeGreaterThanOrEqual(30);
    expect(carry.at(-1)!.t - c.path[1]!.t).toBeCloseTo(4.6, 0);
  });
});

describe('the wires (Figure 28.3 and its quiz)', () => {
  test('across 30 tiles: 26.8 ns by neighbours, 5.0 with span 4, 4.8 with span 12; 11 tiles 4.3 ns, 12 tiles 1.7', () => {
    expect(fastest(1, 'neighbour').delay).toBeCloseTo(0.6, 1);
    expect(fastest(4, 'four').delay).toBeCloseTo(1.3, 1);
    expect(fastest(12, 'all').delay).toBeCloseTo(1.7, 1);
    const at30 = (['neighbour', 'four', 'all'] as const).map((s) => fastest(30, s));
    expect(at30.map((r) => r.hops.length)).toEqual([30, 9, 5]);
    expect(at30.map((r) => +r.delay.toFixed(1))).toEqual([26.8, 5.0, 4.8]);
    expect(+fastest(11, 'all').delay.toFixed(1)).toBe(4.3);
  });

  test('the registered ALU on an HX8K: about 10 ns, a little under half of it in the routing', async () => {
    const wrap = `${designSource('alu')!}
module alu_reg(in clk: clock, in a: uint<32> @clk, in b: uint<32> @clk, in f3: uint<3> @clk, in is_reg: bool @clk, in ir30: bool @clk, out y: uint<32>) {
    reg ra: uint<32> = 0;
    reg rb: uint<32> = 0;
    reg rf: uint<3> = 0;
    reg rr: bool = false;
    reg ri: bool = false;
    reg ry: uint<32> = 0;
    ra := a;
    rb := b;
    rf := f3;
    rr := is_reg;
    ri := ir30;
    let u = alu(rs1_value: ra, b: rb, f3: rf, is_reg: rr, ir30: ri);
    ry := u;
    y = ry;
}
`;
    const r = await implement(synth, one('alu.weft', wrap), { target: HX8K_CT256, top: 'alu_reg' });
    expect(r.ok).toBe(true);
    const { period, wires } = split(r);
    expect(period).toBeGreaterThan(9);
    expect(period).toBeLessThan(11);
    expect(wires).toBeCloseTo(4.4, 0);
    expect(wires / period).toBeGreaterThan(0.35);
    expect(wires / period).toBeLessThan(0.5);
  });
});

describe('the bits', () => {
  test('a logic tile is 16 rows of 54 bits; the HX1K has 175,872 in its tiles, and synth’s files are 32,216 and 135,096 bytes', async () => {
    const x = await buildXor(synth);
    const bs = x.result.bitstream!;
    expect(bs.tiles.find((t) => t.t === 'logic')!.w).toBe(54);
    expect(bs.tile_bits).toBe(175_872);
    expect(bs.bytes).toBe(32_216);
    expect(x.result.chip!.usage.lc_total).toBe(1280);
    const big = await implement(synth, one('xor.weft', 'module xor_gate(in a: bool, in b: bool, out y: bool) {\n    y = a ^ b;\n}\n'), { target: HX8K_CT256 });
    expect(big.bitstream!.bytes).toBe(135_096);
    expect(big.chip!.usage.lc_total).toBe(7680);
  });

  test('the census: 52 of 1,728 bits; 20 set bits of routing and pads, 4 table entries, the flip-flop flag and 27 bits left at 0', async () => {
    const hc = handCell(await buildXor(synth));
    expect(CENSUS.total).toBe(1728);
    expect(CENSUS.critical).toHaveLength(52);
    const bs = hc.built.result.bitstream!;
    const at = (x: number, y: number) => bs.tiles.find((t) => t.x === x && t.y === y)!;
    let table = 0, flag = 0, set = 0, unset = 0;
    for (const [x, y, b] of CENSUS.critical) {
      const inCell = x === hc.tile.x && y === hc.tile.y;
      if (inCell && hc.cell.lut_bits!.includes(b)) table++;
      else if (inCell && b === hc.cell.dff_bit) flag++;
      else if (at(x, y).set.includes(b)) set++;
      else unset++;
    }
    expect([set, table, flag, unset]).toEqual([20, 4, 1, 27]);
    expect(Math.round((100 * 52) / 1728)).toBe(3);
    // Only the four entries with the unconnected inputs at 0 are critical.
    expect(hc.inputs.filter((p) => p === null)).toHaveLength(2);
  });

  test('a 16-bit multiplier (the low half) is 295 logic cells, nearly a quarter of an HX1K', async () => {
    const r = await implement(synth, one('mul.weft', 'module mul(in a: uint<16>, in b: uint<16>, out p: uint<16>) {\n    p = a *% b;\n}\n'), { target: HX8K_CT256 });
    expect(r.chip!.usage.lc).toBe(295);
    expect(295 / 1280).toBeGreaterThan(0.2);
    expect(295 / 1280).toBeLessThan(0.25);
  });
});

describe('the counter in the studio (Figure 28.7)', () => {
  test('6 of 1,280 cells in two tiles, 6 pads; 706 bits set, 108 in its tiles, 8 in nearly every other logic tile', async () => {
    const d = STUDIO_DESIGNS.counter!;
    const r = await implement(synth, studioFiles(d), { target: d.target, top: d.top });
    const lcs = r.chip!.cells.filter((c) => c.bel === 'lc');
    expect([r.chip!.usage.lc, r.chip!.usage.lc_total, r.chip!.usage.io, r.chip!.usage.io_total]).toEqual([6, 1280, 6, 72]);
    const tiles = new Set(lcs.map((c) => `${c.x},${c.y}`));
    expect(tiles.size).toBe(2);
    const enabled = lcs.filter((c) => new Map(c.info).get('flip-flop')?.includes('clock enable'));
    expect(enabled).toHaveLength(4);
    expect(new Set(enabled.map((c) => `${c.x},${c.y}`)).size).toBe(1);
    expect(lcs.map((c) => new Map(c.info).get('LUT'))).toContain("16'h00FF");
    const bs = r.bitstream!;
    expect(bs.set_bits).toBe(706);
    expect(bs.tile_bits).toBe(175_872);
    expect(bs.tiles.filter((t) => tiles.has(`${t.x},${t.y}`)).reduce((s, t) => s + t.set.length, 0)).toBe(108);
    const others = bs.tiles.filter((t) => t.t === 'logic' && !tiles.has(`${t.x},${t.y}`));
    expect(others.filter((t) => t.set.length === 8).length).toBeGreaterThan(others.length - 3);
    expect(others[0]!.f.filter((f) => f.n.startsWith('ColBufCtrl'))).toHaveLength(8);
  });

  test('the real lab: synth’s starter design for the Go Board is 27 logic cells with 24 carry cells', async () => {
    const top = 'module top<CLK_HZ: int = 25_000_000, W: int = bits_for(CLK_HZ) + 1>(\n    in  clk: clock,\n    out led: uint<4>,\n) {\n    reg count: uint<W> = 0;\n    count := count +% 1;\n    led = count[W - 1:W - 4];\n}\n';
    const r = await implement(synth, one('top.weft', top), { target: 'go-board', top: 'top' });
    expect(r.ok).toBe(true);
    expect(r.chip!.usage.lc).toBe(27);
    expect(r.timing!.clocks[0]!.fmax_mhz).toBeGreaterThan(150);
  });
});
