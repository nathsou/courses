/**
 * Octet in Weft (`designs/octet.weft`) in synth's simulator, against the reference interpreter of
 * `src/lib/sim/cpu/octet`: the machine of Chapters 21 and 22, described in text instead of drawn.
 *
 * Both machines run the same program. The interpreter executes one instruction and says how many clock cycles the
 * ISA gives it; the Weft machine is clocked that many times. After **every instruction** the registers, the flags,
 * PC, SP, all 240 bytes of RAM, the LEDs, the hex register and the console must agree, the cycle count must be the
 * ISA's, and the Weft machine must be exactly at the end of the instruction (its step counter back at 0). On the
 * way, in some of the programs, the control lines of every cycle must be the ones Chapter 22's microprogram asks for.
 */
import { readFileSync } from 'node:fs';
import { afterAll, describe, expect, test, vi } from 'vitest';
import { nodeSynth } from '$lib/synth/node';
import { analyze, format } from '$lib/synth/api';
import { DECODE_TABLE, OCTET_CONDITIONS, OctetMachine, assembleOrThrow, compareStates, octetProgram, randomProgram, type OctetProgram } from '$lib/sim/cpu/octet';
import { Prng } from '$lib/sim/cpu/common/prng';
import { CONTROL_LINES, referenceLines, type ControlLine } from '../21-datapath/hardware/control-word';
import { WeftOctet, octetFiles, octetSource, snapshot, withProgram } from './widgets/octet-weft';

vi.setConfig({ testTimeout: 600_000 });
const synth = nodeSynth();

/** The Weft name of each of Chapter 22's control lines. */
const LINE_NAME: Record<ControlLine, string> = {
  OE_RD: 'oe_rd', OE_RS: 'oe_rs', OE_PC: 'oe_pc', OE_SP: 'oe_sp', OE_ALU: 'oe_alu', OE_MEM: 'oe_mem', OE_T: 'oe_t',
  LD_MAR: 'ld_mar', LD_IR: 'ld_ir', LD_A: 'ld_a', LD_B: 'ld_b', LD_T: 'ld_t', WE_R: 'we_r', LD_FLAGS: 'ld_flags',
  PC_LD: 'pc_ld', PC_INC: 'pc_inc', SP_INC: 'sp_inc', SP_DEC: 'sp_dec', MEM_WR: 'mem_wr',
  ALU_OP0: 'alu_op', ALU_OP1: 'alu_op', ALU_OP2: 'alu_op', BSEL_A: 'bsel_a', BSEL_1: 'bsel_1', HALT: 'halt',
};
const TRACED = ['ir', ...new Set(Object.values(LINE_NAME).map((n) => `control.${n}`))];

const SWITCHES = 0xa5;
const BUTTONS = 0b0101;
const octet = await WeftOctet.start(synth);
afterAll(() => octet.stop());

/**
 * Run the interpreter for at most `limit` instructions, then the Weft machine for the same cycles in one batch, and
 * compare after every instruction; throws at the first difference. With `lines`, the control lines of every cycle
 * are checked against the microprogram.
 */
async function lockstep(program: OctetProgram | ArrayLike<number>, limit: number, label: string, lines = false): Promise<{ n: number; ref: OctetMachine; last: ReturnType<typeof snapshot> }> {
  const image = 'image' in program ? program.image : program;
  const ref = new OctetMachine();
  ref.load(program as OctetProgram);
  ref.board.switches = SWITCHES;
  ref.board.buttons = BUTTONS;
  const steps: { pc: number; ir: number; taken: boolean; cycles: number; want: ReturnType<OctetMachine['snapshot']> }[] = [];
  while (!ref.halted && steps.length < limit) {
    const pc = ref.pc;
    const ir = ref.memory[pc]!;
    const taken = OCTET_CONDITIONS[ir & 0xf]!.test(ref.flags);
    const cycles = ref.step();
    steps.push({ pc, ir, taken, cycles, want: ref.snapshot() });
  }
  const run = await octet.run(image, steps.map((s) => s.cycles), { switches: SWITCHES, buttons: BUTTONS, trace: lines ? TRACED : [] });
  let cycle = 0;
  let total = 0;
  let last = snapshot(run, 0, 0, 0, steps[0]!.want);
  steps.forEach((s, i) => {
    if (lines) {
      for (let k = 0; k < s.cycles; k++) checkLines(run.during[cycle + k]!, k, s.ir, s.taken, `${label}: instruction ${i + 1} at ${s.pc}`);
    }
    cycle += s.cycles;
    total += s.cycles;
    last = snapshot(run, i, total, i + 1, s.want);
    const diff = compareStates(s.want, last, { timing: true });
    if (diff.length) throw new Error(`${label}: after instruction ${i + 1} (${DECODE_TABLE[s.ir]!.mnemonic} at 0x${s.pc.toString(16)}): ${diff.join('; ')}`);
    if (!ref.halted || i < steps.length - 1) {
      if (run.states[i]!.stage !== 0) throw new Error(`${label}: after instruction ${i + 1} the step counter is ${run.states[i]!.stage}, not 0`);
    }
  });
  return { n: steps.length, ref, last };
}

/** The control lines during this cycle are what the microprogram says for this step of this instruction. */
function checkLines(during: Record<string, number>, step: number, firstByte: number, taken: boolean, where: string): void {
  const ir = step >= 3 ? during.ir! : firstByte;
  const want = referenceLines(step, ir, taken);
  for (const line of CONTROL_LINES) {
    if (line.startsWith('ALU_OP')) continue;
    const got = during[`control.${LINE_NAME[line]}`];
    if (got !== want[line]) throw new Error(`${where}, cycle ${step}: ${line} is ${got}, the microprogram says ${want[line]}`);
  }
  const op = during['control.alu_op'];
  if (op !== (want.ALU_OP0 | (want.ALU_OP1 << 1) | (want.ALU_OP2 << 2))) throw new Error(`${where}, cycle ${step}: alu_op is ${op}`);
}

describe('octet.weft as a Weft file', () => {
  test('it compiles, with the ALU of Chapter 21 and the control logic of Chapter 22, without a warning, and is formatted', async () => {
    const a = await analyze(synth, octetFiles(), { top: 'octet', testbench: false });
    expect(a.diagnostics).toEqual([]);
    expect(await format(synth, octetSource)).toBe(octetSource);
  });

  test('the program in the file is walk.asm, assembled', async () => {
    const walk = assembleOrThrow(readFileSync(new URL('./programs/walk.asm', import.meta.url), 'utf8'), 'walk');
    expect(await format(synth, withProgram(octetSource, walk))).toBe(octetSource);
  });

  test('a light walks along the LEDs: on at cycle 24, then a step every 125 cycles', async () => {
    const r = await octet.run(assembleOrThrow(readFileSync(new URL('./programs/walk.asm', import.meta.url), 'utf8'), 'walk').image, [23, 1, 125, 125]);
    expect(r.states.map((s) => s.leds)).toEqual([0, 1, 2, 4]);
  });
});

describe('Octet in Weft and the interpreter, instruction by instruction', () => {
  test('every one of the 256 first bytes, from random registers and flags', async () => {
    let checked = 0;
    for (let byte = 0; byte < 256; byte++) {
      const rng = new Prng(byte * 7);
      const alu = rng.pick(['ADD', 'SUB', 'AND', 'OR', 'XOR', 'CMP']);
      const source = [
        ...[0, 1, 2, 3].map((r) => `LDI R${r}, ${rng.int(0, 255)}`),
        `${alu} R${rng.int(0, 3)}, R${rng.int(0, 3)}`,
        `.byte ${byte}, ${rng.pick([0x30, 0xc4, 0xd0, 0xf8, 0xf9, 0xfa, 0xfb, 0xfd])}`,
        'HLT',
      ].join('\n');
      checked += (await lockstep(assembleOrThrow(source), 14, `byte 0x${byte.toString(16)}`, byte % 4 === 0)).n;
    }
    expect(checked).toBeGreaterThan(256 * 5);
  });

  test('100 random programs (jumps, stack, calls, loads and stores) run to their HLT', async () => {
    let instructions = 0;
    for (let seed = 1; seed <= 100; seed++) {
      const p = randomProgram(seed, { length: 30 + (seed % 40) });
      const r = await lockstep(p.program, 2000, `random ${seed}`, seed % 10 === 0);
      instructions += r.n;
      expect(r.ref.halted, `random ${seed} halts`).toBe(true);
    }
    expect(instructions).toBeGreaterThan(2500);
  });

  test('50 random programs that also use the switches, buttons, LEDs, hex display, console and RANDOM', async () => {
    for (let seed = 1000; seed < 1050; seed++) {
      const p = randomProgram(seed, { length: 40, io: true });
      const r = await lockstep(p.program, 2000, `random io ${seed}`);
      expect(r.ref.halted).toBe(true);
    }
  });

  test.each(['blink', 'multiply', 'fibonacci', 'hello', 'sort', 'reaction', 'count'])('the course’s %s program', async (id) => {
    const r = await lockstep(assembleOrThrow(octetProgram(id).source, id), id === 'count' ? 6000 : 20_000, id, id === 'sort');
    expect(r.n).toBeGreaterThan(20);
  });

  test('the programs that run to their end end where the interpreter says, and show it on the board', async () => {
    const m = await lockstep(assembleOrThrow(octetProgram('multiply').source, 'multiply'), 20_000, 'multiply');
    expect([m.last.board.hex, m.last.board.leds, m.last.halted]).toEqual([0x00, 143, true]);
    const f = await lockstep(assembleOrThrow(octetProgram('fibonacci').source, 'fibonacci'), 20_000, 'fibonacci');
    expect(f.last.board.hex).toBe(233);
    const h = await lockstep(assembleOrThrow(octetProgram('hello').source, 'hello'), 20_000, 'hello');
    expect(String.fromCharCode(...h.last.board.console)).toBe('HELLO, WORLD\n');
  });
});

describe('reset and the board', () => {
  test('the four digits show the program counter (left) and the HEX register (right)', async () => {
    const files = octetFiles(assembleOrThrow('LDI R0, 0xA7\nST [HEX], R0\nHLT\n'));
    const o = await WeftOctet.start(synth, files);
    const { tbRun } = await import('$lib/synth/api');
    const r = await tbRun(synth, o.id, [{ step: 20 }, { read: ['seg3', 'seg2', 'seg1', 'seg0', 'halted'] }]);
    await o.stop();
    // PC = 5 after HLT: 0 and 5; HEX = 0xA7: A and 7.
    expect(r.reads[0]!.values).toEqual({ seg3: 0x3f, seg2: 0x6d, seg1: 0x77, seg0: 0x07, halted: 1 });
  });

  test('the reset button, two clocks after it is pressed, puts the programmer’s model back and keeps the program', async () => {
    const { tbRun } = await import('$lib/synth/api');
    const o = await WeftOctet.start(synth);
    const r = await tbRun(synth, o.id, [
      { step: 300 },
      { read: ['pc', 'leds'] },
      { set: { rst_button: 1 } },
      { step: 3 },
      { set: { rst_button: 0 } },
      { step: 2 },
      { read: ['pc', 'sp', 'r', 'leds', 'hex', 'z'] },
      { step: 24 },
      { read: ['leds'] },
    ]);
    await o.stop();
    expect(r.reads[0]!.values!.leds).not.toBe(0);
    expect(r.reads[1]!.values).toEqual({ pc: 0, sp: 0xf0, r: 0, leds: 0, hex: 0, z: 0 });
    expect(r.reads[2]!.values!.leds).toBe(1);
  });
});
