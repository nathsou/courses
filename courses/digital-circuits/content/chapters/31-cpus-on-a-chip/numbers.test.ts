/**
 * The numbers Chapter 31 quotes, checked against what produces them: synth's fits of Octet and of the RV32I core on
 * an iCE40 HX8K, and the reference interpreters for the cycle counts.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, test, vi } from 'vitest';
import '$lib/sim/netlist/catalog';
import { flatten } from '$lib/sim/netlist/flatten';
import { nodeSynth } from '$lib/synth/node';
import { OctetMachine, assembleOrThrow as octetAsm, octetProgram } from '$lib/sim/cpu/octet';
import { Rv32Machine, assembleOrThrow as rv32Asm, rv32Program } from '$lib/sim/cpu/rv32i';
import { buildCpu } from '../22-control/hardware/cpu';
import { referenceParts } from '../21-datapath/hardware/rig';
import { fitOctet, fitRv32 } from './widgets/chip';
import { BUDGET } from './widgets/budget';

vi.setConfig({ testTimeout: 600_000 });
const synth = nodeSynth();
const stats = (r: Awaited<ReturnType<typeof fitOctet>>['result'], id: string) => r.stages.find((s) => s.id === id)!.stats;

describe('Octet on the HX8K (the table of “Fitting Octet on an iCE40”)', async () => {
  const walk = octetAsm(readFileSync(new URL('./programs/walk.asm', import.meta.url), 'utf8'), 'walk');
  const fit = await fitOctet(synth, walk.image);
  const r = fit.result;

  test('539 logic cells: 409 LUTs, 155 flip-flops, 26 carry cells; 2 block RAMs', () => {
    expect(r.chip!.usage).toMatchObject({ lc: 539, ram: 2, lc_total: 7680 });
    const m = stats(r, 'mapped');
    expect(m.SB_LUT4).toBe(409);
    expect((m.SB_DFF ?? 0) + (m.SB_DFFE ?? 0) + (m.SB_DFFESR ?? 0) + (m.SB_DFFESS ?? 0) + (m.SB_DFFSR ?? 0) + (m.SB_DFFSS ?? 0)).toBe(155);
    expect(m.SB_CARRY).toBe(26);
    expect(Math.round((100 * 539) / 7680)).toBe(7);
    expect(Math.round((100 * 539) / 1280)).toBe(42);
  });

  test('155 flip-flops: 129 registers and 26 in the synchronisers', () => {
    const registers = 8 * 11 + 4 + 3 + 8 * 4 + 1 + 1; // PC SP IR MAR A B T R0-R3; flags; step; LEDS HEX LFSR console byte; strobe; indirect
    expect(registers).toBe(129);
    expect(2 + 2 * 12).toBe(26);
  });

  test('80.6 MHz, 12.4 ns: from the step counter, ten LUTs, to the RANDOM register’s enable; 7.9 ns of wires', () => {
    const c = r.timing!.clocks[0]!;
    expect(+c.fmax_mhz.toFixed(1)).toBe(80.6);
    expect(+c.period_ns.toFixed(1)).toBe(12.4);
    expect(c.path[0]!.cell).toMatch(/^stage/);
    expect(c.path.at(-1)!.cell).toMatch(/^lfsr/);
    expect(c.path.at(-1)!.pin).toBe('CEN');
    expect(c.path.filter((s) => s.pin === 'O').length - 1).toBe(10);
    let wires = 0;
    let prev = 0;
    for (const s of c.path) {
      if (!/^(O|COUT|Q|LO)$/.test(s.pin)) wires += s.t - prev;
      prev = s.t;
    }
    expect(+wires.toFixed(1)).toBe(7.9);
  });

  test('592 nets, routed in 6 iterations', () => {
    expect(r.log.find((l) => l.startsWith('routing:'))).toBe('routing: 592 nets, 6152 wires used, 6 iterations');
  });

  test('the HX8K has 32 block RAMs of 4,096 bits: 131,072 bits', () => {
    expect(r.chip!.usage.ram_total).toBe(32);
    expect(32 * 4096).toBe(131_072);
  });
});

describe('the RV32I core (Figure 31.3 and the text around it)', () => {
  test('3,568 cells with flip-flops, 1,467 with block RAM: 2,101 cells, 59 % of the core, and 46 % of the HX8K', () => {
    const ff = BUDGET.fits['rv32-flip-flops'];
    const ram = BUDGET.fits['rv32-block-ram'];
    expect([ff.cells, ram.cells, ram.rams, ff.mhz, ram.mhz]).toEqual([3568, 1467, 4, 42, 59.5]);
    expect(ff.cells - ram.cells).toBe(2101);
    expect(Math.round((100 * (ff.cells - ram.cells)) / ff.cells)).toBe(59);
    expect(Math.round((100 * ff.cells) / 7680)).toBe(46);
    expect(ff.flipFlopCells).toBe(1100);
    expect(+(ff.cells / BUDGET.fits.octet.cells).toFixed(1)).toBe(6.6);
  });

  test('the register file is 992 flip-flops; 2 × 32 × 31 = 1,984 two-way multiplexers; 1,290 LUTs with block RAM', async () => {
    const walk = rv32Asm(readFileSync(new URL('./programs/rv32-walk.asm', import.meta.url), 'utf8'), 'rv32-walk');
    const [ff, ram] = [await fitRv32(synth, walk, 'flip-flops'), await fitRv32(synth, walk, 'block RAM')];
    const dff = (r: typeof ff) => Object.entries(stats(r.result, 'mapped')).filter(([k]) => k.startsWith('SB_DFF')).reduce((s, [, v]) => s + v, 0);
    expect(dff(ff) - dff(ram)).toBe(992);
    expect(2 * 32 * 31).toBe(1984);
    expect(stats(ram.result, 'mapped').SB_LUT4).toBe(1290);
    expect(stats(ff.result, 'mapped').SB_LUT4).toBe(2398);
    // The first placement of the flip-flop core did not route, and synth placed again.
    expect(ff.result.log.some((l) => l.startsWith('routing congestion not resolved'))).toBe(true);
  });
});

describe('the drawn Octet, in elements', () => {
  test('3,604 elements with the parts bin’s gates (hardwired), 334 with the simulator’s blocks', () => {
    const size = (level: 'blocks' | 'parts') => flatten(buildCpu({ control: 'hardwired', level, memory: 'ram' }).circuit, referenceParts).elements.length;
    expect(size('parts')).toBe(3604);
    expect(size('blocks')).toBe(334);
  });
});

describe('the two CPUs on the jobs of Chapter 23', () => {
  const job = (id: string) => {
    const p = octetAsm(octetProgram(id).source, id);
    const m = new OctetMachine().load(p);
    m.run();
    const q = rv32Asm(rv32Program(id).source, id);
    const r = new Rv32Machine();
    r.load(q);
    r.run();
    return { octet: { bytes: p.size, steps: m.steps, cycles: m.cycles }, rv32: { bytes: q.size, steps: r.steps, cycles: 2 * r.steps } };
  };

  test('multiply: Octet 49 bytes, 60 instructions, 329 cycles; RV32I 64 bytes, 29 instructions, 58 cycles; 4.1, 1.4 and 1.0 µs', () => {
    const mul = job('multiply');
    expect(mul.octet).toEqual({ bytes: 49, steps: 60, cycles: 329 });
    expect(mul.rv32).toEqual({ bytes: 64, steps: 29, cycles: 58 });
    expect(+(329 / 80.6).toFixed(1)).toBe(4.1);
    expect(+(58 / 42.0).toFixed(1)).toBe(1.4);
    expect(+(58 / 59.5).toFixed(1)).toBe(1.0);
  });

  test('Fibonacci: 29 bytes and 474 cycles against 104 bytes and 192 cycles; Octet a seventh of the cells', () => {
    const fib = job('fibonacci');
    expect([fib.octet.bytes, fib.octet.cycles, fib.rv32.bytes, fib.rv32.cycles]).toEqual([29, 474, 104, 192]);
    expect(Math.round(BUDGET.fits['rv32-flip-flops'].cells / BUDGET.fits.octet.cells)).toBe(7);
  });
});
