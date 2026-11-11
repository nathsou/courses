import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { analyze, format, tbRun, tbStart, tbStop, type TbOp } from '$lib/synth/api';
import { nodeSynth } from '$lib/synth/node';
import { runTestSource } from '$lib/weft/testbench';
import { CONTROL_LINES, ROUTINES, referenceLines, routineOfByte, type ControlLine } from '../21-datapath/hardware/control-word';

/**
 * The Weft of Chapter 22 is the hardwired control unit in a form that a synthesiser reads. It must compile on synth
 * without a word, be in synth's format, pass its tests, and, above all, ask for exactly the lines that the
 * microprogram (which the gate-level circuits of both control units are tested against, in differential.test.ts) asks
 * for, in every step of every one of the 256 first bytes.
 */
const read = (name: string) => readFileSync(new URL(`./designs/${name}`, import.meta.url), 'utf8');
const synth = nodeSynth();

describe.each(['octet-decode', 'octet-sequencer'])('%s.weft', (name) => {
  const src = read(`${name}.weft`);
  const files = [{ name: `${name}.weft`, text: src }];
  test('compiles without a warning and is in synth’s format', async () => {
    expect((await analyze(synth, files)).diagnostics.map((d) => d.rendered)).toEqual([]);
    expect(await format(synth, src)).toBe(src);
  });
  test('its tests pass', async () => {
    const r = await runTestSource(synth, files, undefined, read(`${name}.tests`));
    expect(r.results.length).toBeGreaterThanOrEqual(1);
    for (const t of r.results) expect([t.name, t.pass, t.failed?.text]).toEqual([t.name, true, undefined]);
  });
});

describe('the decoder against the microprogram', () => {
  test('all 8 × 256 × 2 combinations of step, IR and jump outcome give the microprogram’s lines', async () => {
    const names: Record<string, ControlLine> = {
      oe_rd: 'OE_RD', oe_rs: 'OE_RS', oe_pc: 'OE_PC', oe_sp: 'OE_SP', oe_alu: 'OE_ALU', oe_mem: 'OE_MEM', oe_t: 'OE_T',
      ld_mar: 'LD_MAR', ld_ir: 'LD_IR', ld_a: 'LD_A', ld_b: 'LD_B', ld_t: 'LD_T', we_r: 'WE_R', ld_flags: 'LD_FLAGS',
      pc_ld: 'PC_LD', pc_inc: 'PC_INC', sp_inc: 'SP_INC', sp_dec: 'SP_DEC', mem_wr: 'MEM_WR', bsel_a: 'BSEL_A', bsel_1: 'BSEL_1', halt: 'HALT',
    };
    const outputs = [...Object.keys(names), 'alu_op', 'last'];
    const s = await tbStart(synth, { files: [{ name: 'octet-decode.weft', text: read('octet-decode.weft') }] });
    if (!s.ok) throw new Error(s.error);
    const cases: [number, number, number][] = [];
    for (let stage = 0; stage < 8; stage++) for (let ir = 0; ir < 256; ir++) for (const taken of [0, 1]) cases.push([stage, ir, taken]);
    const ops: TbOp[] = cases.flatMap(([stage, ir, taken]) => [{ set: { stage, ir, taken } }, { read: outputs }]);
    const r = await tbRun(synth, s.id, ops);
    await tbStop(synth, s.id);
    expect(r.ok, r.error).toBe(true);
    cases.forEach(([stage, ir, taken], k) => {
      const got = r.reads[k]!.values as Record<string, number>;
      const want = referenceLines(stage, ir, !!taken);
      const where = `stage ${stage}, ir 0x${ir.toString(16)}, taken ${taken}`;
      for (const [port, line] of Object.entries(names)) if (got[port] !== want[line]) throw new Error(`${where}: ${port} = ${got[port]}, microprogram says ${want[line]}`);
      if (got.alu_op !== (want.ALU_OP0 | (want.ALU_OP1 << 1) | (want.ALU_OP2 << 2))) throw new Error(`${where}: alu_op = ${got.alu_op}`);
      // `last` is the END bit of the step's micro-instruction.
      const routine = ROUTINES.find((x) => x.name === routineOfByte(ir))!;
      const end = stage >= 3 && stage - 3 < routine.steps.length ? routine.steps[stage - 3]!.fields.end : 0;
      if (got.last !== end) throw new Error(`${where}: last = ${got.last}, END = ${end}`);
    });
    expect(cases).toHaveLength(4096);
    expect(CONTROL_LINES).toHaveLength(25);
  });
});

describe('the Weft shown in the chapter is the Weft of the design files', () => {
  test('every line of every ```weft block appears, unchanged, in a design file', () => {
    const md = readFileSync(new URL('./index.md', import.meta.url), 'utf8');
    const all = new Set(read('octet-decode.weft').split('\n').map((l) => l.trim()));
    const blocks = [...md.matchAll(/```weft\n([\s\S]*?)```/g)].map((m) => m[1]!);
    expect(blocks.length).toBeGreaterThan(0);
    for (const b of blocks)
      for (const line of b.split('\n').map((l) => l.trim()).filter((l) => l && l !== '…'))
        expect(all.has(line), line).toBe(true);
  });
});
