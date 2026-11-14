/**
 * The RV32I core on the board (`designs/rv32-board.weft` around `content/designs/rv32i.weft`) in synth's simulator,
 * with its register file in flip-flops and in block RAM. Both must do what the reference interpreter does with the
 * same program: the devices see the same writes in the same order.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, test, vi } from 'vitest';
import { nodeSynth } from '$lib/synth/node';
import { analyze, format, tbRun, tbStart, tbStop } from '$lib/synth/api';
import { Prng } from '$lib/sim/cpu/common/prng';
import { Rv32Machine, assembleOrThrow, type Rv32Program } from '$lib/sim/cpu/rv32i';
import { RV32_ROM_WORDS, programWords, rv32BoardFiles, rv32Params, rv32iSource, withRom, wrapperSource, type Registers } from './widgets/rv32-board';

vi.setConfig({ testTimeout: 600_000 });
const synth = nodeSynth();
const walkSource = readFileSync(new URL('./programs/rv32-walk.asm', import.meta.url), 'utf8');
const walk = assembleOrThrow(walkSource, 'rv32-walk');

/** Run the board's design for `cycles` clocks, recording every change of the LEDs and of the hex digits. */
async function trace(program: Rv32Program, cycles: number, registers: Registers = 'flip-flops', inputs: { sw?: number; btn?: number } = {}) {
  const s = await tbStart(synth, { files: rv32BoardFiles(program), top: 'rv32_board', params: rv32Params(registers) });
  if (!s.ok) throw new Error(s.error);
  const watched = ['led', 'seg0', 'seg1', 'seg2', 'seg3', 'trap', 'hex'];
  const r = await tbRun(synth, s.id, [{ set: { sw: inputs.sw ?? 0, btn: inputs.btn ?? 0 } }, { step: cycles, trace: watched }]);
  await tbStop(synth, s.id);
  if (!r.ok) throw new Error(r.error);
  const rows = r.reads.map((x) => Object.fromEntries(watched.map((w) => [w, Number(x.values![w])])));
  const changes = (k: string) => rows.map((x) => x[k]!).filter((v, i, a) => v !== (i ? a[i - 1] : 0));
  return { rows, leds: changes('led'), hex: changes('hex'), trap: rows.reduce((t, x) => t || x.trap!, 0) };
}

/** What the interpreter says the devices saw, as changes. */
function reference(source: string, steps: number, board: { switches?: number; buttons?: number } = {}) {
  const m = new Rv32Machine();
  m.load(assembleOrThrow(source, 'ref'));
  m.board.switches = board.switches ?? 0;
  m.board.buttons = board.buttons ?? 0;
  const leds: number[] = [];
  const hex: number[] = [];
  m.board.hooks.onLeds = (v) => leds.push(v);
  m.board.hooks.onHex = (v) => hex.push(v & 0xffff);
  for (let i = 0; i < steps && !m.halted; i++) m.step();
  const dedupe = (a: number[]) => a.filter((v, i) => v !== (i ? a[i - 1] : 0));
  return { leds: dedupe(leds), hex: dedupe(hex) };
}

describe('the design', () => {
  test('compiles in both forms without a warning, and is formatted', async () => {
    for (const registers of ['flip-flops', 'block RAM'] as const) {
      const a = await analyze(synth, rv32BoardFiles(walk), { top: 'rv32_board', testbench: false });
      expect(a.diagnostics, registers).toEqual([]);
    }
    expect(await format(synth, wrapperSource)).toBe(wrapperSource);
    expect(await format(synth, rv32iSource)).toBe(rv32iSource);
  });

  test('the ROM holds a program, and refuses one that is too long', () => {
    expect(withRom(wrapperSource, [0x13, 0, 0x73])).toContain('0x00000013, 0x00000000, 0x00000073, 0x00000000,');
    expect(() => withRom(wrapperSource, new Array(RV32_ROM_WORDS + 1).fill(1))).toThrow(/64 words/);
    expect(programWords(walk)).toHaveLength(walk.instructions);
  });
});

describe('the walking light on the RV32I core', () => {
  test('lights the LEDs in the interpreter’s order and counts its steps on the hex display', async () => {
    const want = reference(walkSource, 1500);
    const got = await trace(walk, 4000);
    expect(got.leds.slice(0, 30)).toEqual(want.leds.slice(0, 30));
    expect(got.hex.slice(0, 30)).toEqual(want.hex.slice(0, 30));
    expect(got.leds.slice(0, 16)).toEqual([1, 2, 4, 8, 16, 32, 64, 128, 64, 32, 16, 8, 4, 2, 1, 2]);
  });

  test('every instruction takes two clock cycles: the first LED lights at cycle 10, the next 40 cycles later', async () => {
    const got = await trace(walk, 60);
    expect(got.rows.findIndex((x) => x.led === 1) + 1).toBe(10);
    expect(got.rows.findIndex((x) => x.led === 2) + 1).toBe(50);
  });

  test('the switches are read by a load, through their synchroniser', async () => {
    // The switches take two cycles to pass the synchroniser: two `nop`s, and the first load sees them.
    const p = assembleOrThrow('nop\nnop\nlw t0, SWITCHES(zero)\nsw t0, LEDS(zero)\nlw t1, BUTTONS(zero)\nsw t1, HEX(zero)\nebreak\n', 'io');
    const got = await trace(p, 24, 'flip-flops', { sw: 0xa5, btn: 0b0110 });
    expect(got.leds).toEqual([0xa5]);
    expect(got.hex).toEqual([6]);
    expect(got.trap).toBe(3); // ebreak
  });
});

describe('the register file in block RAM', () => {
  const ops = ['add', 'sub', 'xor', 'or', 'and', 'slt', 'sltu', 'sll', 'srl', 'sra'];
  const opsImm = ['addi', 'xori', 'ori', 'andi', 'slti', 'sltiu'];
  const shiftsImm = ['slli', 'srli', 'srai'];

  /** A dependent chain of arithmetic on x0 to x7, each result shown on the hex display (its low 16 bits). */
  function chain(seed: number): string {
    const rng = new Prng(seed);
    const r = () => `x${rng.int(0, 7)}`;
    const lines = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => `lui x${i}, ${rng.int(0, 0xfffff)}`).slice(1);
    for (let i = 0; i < 26; i++) {
      const rd = r();
      const kind = rng.int(0, 2);
      lines.push(kind === 0 ? `${rng.pick(ops)} ${rd}, ${r()}, ${r()}` : kind === 1 ? `${rng.pick(opsImm)} ${rd}, ${r()}, ${rng.int(-2048, 2047)}` : `${rng.pick(shiftsImm)} ${rd}, ${r()}, ${rng.int(0, 31)}`);
      lines.push(`sw ${rd}, HEX(zero)`);
    }
    lines.push('ebreak');
    return lines.join('\n');
  }

  test('has the same effect as the flip-flops, on 25 random chains of dependent instructions, and as the interpreter', async () => {
    for (let seed = 1; seed <= 25; seed++) {
      const source = chain(seed);
      const p = assembleOrThrow(source, `chain ${seed}`);
      expect(p.instructions, `chain ${seed}`).toBeLessThanOrEqual(RV32_ROM_WORDS);
      const flops = await trace(p, 2 * p.instructions + 4);
      const ram = await trace(p, 2 * p.instructions + 4, 'block RAM');
      const ref = reference(source, 200);
      expect(flops.hex, `chain ${seed}: flip-flops against the interpreter`).toEqual(ref.hex);
      expect(ram.hex, `chain ${seed}: block RAM against the interpreter`).toEqual(ref.hex);
      expect(ram.trap).toBe(3);
    }
  });

  test('the walking light, cycle by cycle, is identical', async () => {
    const a = await trace(walk, 3000);
    const b = await trace(walk, 3000, 'block RAM');
    expect(b.rows).toEqual(a.rows);
  });
});
