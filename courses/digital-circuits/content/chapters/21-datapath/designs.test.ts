import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { analyze, format, tbRun, tbStart, tbStop, type TbOp } from '$lib/synth/api';
import { nodeSynth } from '$lib/synth/node';
import { runTestSource } from '$lib/weft/testbench';
import { OctetMachine } from '$lib/sim/cpu/octet';

/**
 * The Weft of Chapter 21 — the ALU with its flags, and the register file — compiles on synth without a word, is in
 * synth's format, passes its tests, and gives, for every operation, the results and flags that the reference
 * interpreter gives.
 */
const read = (name: string) => readFileSync(new URL(`./designs/${name}`, import.meta.url), 'utf8');
const synth = nodeSynth();

describe.each(['octet-alu', 'octet-regs'])('%s.weft', (name) => {
  const src = read(`${name}.weft`);
  const files = [{ name: `${name}.weft`, text: src }];
  test('compiles cleanly and is in synth’s format', async () => {
    expect((await analyze(synth, files)).diagnostics.map((d) => d.rendered)).toEqual([]);
    expect(await format(synth, src)).toBe(src);
  });
  test('its tests pass', async () => {
    const r = await runTestSource(synth, files, undefined, read(`${name}.tests`));
    expect(r.results.length).toBeGreaterThanOrEqual(2);
    for (const t of r.results) expect([t.name, t.pass, t.failed?.text]).toEqual([t.name, true, undefined]);
  });
});

describe('the ALU in Weft against the interpreter', () => {
  /** Run one instruction on the interpreter with R0 = a and R1 = b. */
  const ref = (byte: number, a: number, b: number) => {
    const m = new OctetMachine();
    m.memory[0] = byte;
    m.r[0] = a;
    m.r[1] = b;
    m.step();
    return { y: m.r[0]!, f: m.flags };
  };
  /** Runs the ALU on a list of (op, a, b) and returns its outputs. */
  async function alu(cases: [number, number, number][]) {
    const s = await tbStart(synth, { files: [{ name: 'octet-alu.weft', text: read('octet-alu.weft') }] });
    if (!s.ok) throw new Error(s.error);
    const ops: TbOp[] = cases.flatMap(([op, a, b]) => [{ set: { op, a, b } }, { read: ['y', 'z', 'c', 'n', 'v'] }]);
    const r = await tbRun(synth, s.id, ops);
    await tbStop(synth, s.id);
    return r.reads.map((x) => {
      const v = x.values as Record<string, number>;
      return { y: v.y, f: { z: !!v.z, c: !!v.c, n: !!v.n, v: !!v.v } };
    });
  }
  const values = [...Array(256).keys()];
  const bs = [0, 1, 2, 3, 0x0f, 0x10, 0x3f, 0x40, 0x7e, 0x7f, 0x80, 0x81, 0xc0, 0xf0, 0xfe, 0xff, 0x55, 0xaa, 0x96];

  test.each([
    ['ADD', 0, 0x81, true],
    ['SUB', 1, 0x91, true],
    ['CMP', 1, 0xd1, false],
    ['AND', 2, 0xa1, true],
    ['OR', 3, 0xb1, true],
    ['XOR', 4, 0xc1, true],
  ] as const)('%s: every A against nineteen Bs', async (_n, op, byte, stores) => {
    const cases = values.flatMap((a) => bs.map((b) => [op, a, b] as [number, number, number]));
    const got = await alu(cases);
    cases.forEach(([, a, b], k) => {
      const want = ref(byte, a, b);
      expect(got[k]!.f, `${a}, ${b}`).toEqual(want.f);
      if (stores) expect(got[k]!.y, `${a}, ${b}`).toBe(want.y);
    });
  });

  test.each([
    ['SHL (ADD A, A)', 0xe0, (a: number) => [0, a, a]],
    ['INC (ADD A, 1)', 0xe3, (a: number) => [0, a, 1]],
    ['SHR', 0xe1, (a: number) => [6, a, 0]],
    ['NOT', 0xe2, (a: number) => [7, a, 0]],
  ] as const)('%s: every A', async (_n, byte, input) => {
    const got = await alu(values.map((a) => input(a) as [number, number, number]));
    values.forEach((a, k) => {
      const want = ref(byte, a, 0);
      expect(got[k]!.y, `${a}`).toBe(want.y);
      expect(got[k]!.f, `${a}`).toEqual(want.f);
    });
  });
});

describe('the Weft shown in the chapter is the Weft of the design files', () => {
  test('every line of every ```weft block appears, unchanged, in a design file', () => {
    const md = readFileSync(new URL('./index.md', import.meta.url), 'utf8');
    const sources = ['octet-alu.weft', 'octet-regs.weft'].map((f) => read(f).split('\n').map((l) => l.trim()));
    const all = new Set(sources.flat());
    const blocks = [...md.matchAll(/```weft\n([\s\S]*?)```/g)].map((m) => m[1]!);
    expect(blocks.length).toBeGreaterThan(0);
    for (const b of blocks)
      for (const line of b.split('\n').map((l) => l.trim()).filter((l) => l && l !== '…'))
        expect(all.has(line), line).toBe(true);
  });
});
