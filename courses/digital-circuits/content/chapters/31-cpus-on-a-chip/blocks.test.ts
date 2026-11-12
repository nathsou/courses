/**
 * Every code block of the chapter that carries `from="path"` is an excerpt of that file, line for line (a line that is
 * only `…` or `// …` stands for lines left out). Every `asm` block is solvable (its solution passes every test and its
 * start does not) and its solution also runs on Octet in Weft. The `hdl` exercise is solvable. The diff of the
 * challenge applies to Chapter 22's control logic, and DEC works.
 */
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { afterAll, describe, expect, test, vi } from 'vitest';
import { checkAsm, type AsmInput } from '$lib/components/exercise/asm/run';
import { checkHdl, type HdlInput } from '$lib/components/exercise/hdl/check';
import { nodeSynth } from '$lib/synth/node';
import { OctetMachine, assembleOrThrow } from '$lib/sim/cpu/octet';
import { WeftOctet, aluSource, decodeSource, octetSource, withProgram } from './widgets/octet-weft';

vi.setConfig({ testTimeout: 300_000 });
const synth = nodeSynth();
const root = fileURLToPath(new URL('../../../', import.meta.url));
const md = readFileSync(new URL('./index.md', import.meta.url), 'utf8');

interface Block {
  lang: string;
  meta: string;
  code: string;
  line: number;
}
const blocks: Block[] = [];
for (const m of md.matchAll(/^```(\w+)([^\n]*)\n([\s\S]*?)\n```$/gm)) blocks.push({ lang: m[1]!, meta: m[2]!.trim(), code: m[3]!, line: md.slice(0, m.index).split('\n').length });

const from = (b: Block) => /from="([^"]+)"/.exec(b.meta)?.[1];

describe('excerpts', () => {
  const excerpts = blocks.filter((b) => from(b));
  test('the chapter quotes real code', () => {
    expect(excerpts.length).toBeGreaterThanOrEqual(10);
    expect(new Set(excerpts.map(from)).size).toBeGreaterThanOrEqual(5);
  });
  for (const b of excerpts) {
    test(`line ${b.line}: is in ${from(b)}`, () => {
      const path = existsSync(root + from(b)!) ? root + from(b)! : fileURLToPath(new URL(from(b)!, import.meta.url));
      const file = readFileSync(path, 'utf8');
      const parts = b.code.split(/\n\s*(?:\/\/ )?…\s*\n/);
      for (const part of parts) expect(file.includes(part), `not in the file:\n${part}`).toBe(true);
    });
  }
});

const octet = await WeftOctet.start(synth);
afterAll(() => octet.stop());

describe('the asm exercises', () => {
  const asm = blocks.filter((b) => b.lang === 'asm').map((b) => YAML.parse(b.code) as AsmInput);
  test('there are two, for the board', () => expect(asm.map((a) => a.id)).toEqual(['chip/echo', 'chip/nibble-sum']));
  for (const a of asm) {
    test(`${a.id}: the solution passes every test, the start does not`, () => {
      const r = checkAsm(a, a.solution!);
      expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
      expect(r.results.filter((x) => !x.pass).map((x) => [x.name, x.failures])).toEqual([]);
      expect(checkAsm(a, a.start!).pass).toBe(false);
      expect(a.tests.length).toBeGreaterThanOrEqual(4);
      expect((a.hints ?? []).length).toBeGreaterThanOrEqual(2);
    });

    test(`${a.id}: the solution runs the same on Octet in Weft, instruction by instruction, for every test's switches and buttons`, async () => {
      const program = assembleOrThrow(a.solution!, a.id);
      for (const t of a.tests) {
        const ref = new OctetMachine();
        ref.load(program);
        ref.board.switches = t.setup?.switches ?? 0;
        ref.board.buttons = t.setup?.buttons ?? 0;
        const groups: number[] = [];
        const want: { leds: number; hex: number }[] = [];
        for (let i = 0; i < 60; i++) {
          groups.push(ref.step());
          want.push({ leds: ref.board.leds, hex: ref.board.hex });
        }
        const r = await octet.run(program.image, groups, { switches: t.setup?.switches ?? 0, buttons: t.setup?.buttons ?? 0 });
        expect(r.states.map((s) => ({ leds: s.leds, hex: s.hex })), t.name).toEqual(want);
      }
    });
  }
});

describe('the hdl exercise', () => {
  const b = blocks.find((x) => x.lang === 'hdl')!;
  const input = YAML.parse(b.code) as HdlInput & { start: string; solution: string };
  test('the solution passes, the start does not', async () => {
    const good = await checkHdl(synth, input, input.solution);
    expect(good.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(good.pass, JSON.stringify(good.tests.filter((t) => !t.pass))).toBe(true);
    expect((await checkHdl(synth, input, input.start)).pass).toBe(false);
  });
});

describe('the challenge: DEC Rd', () => {
  /** The diff block of the chapter applied to Chapter 22's decoder: hunks are separated by `...`. */
  function patched(): string {
    const diff = blocks.find((x) => x.lang === 'diff')!.code.split('\n');
    const hunks: string[][] = [[]];
    for (const l of diff) l === '...' ? hunks.push([]) : hunks[hunks.length - 1]!.push(l);
    let src = decodeSource;
    for (const h of hunks) {
      const old = h.filter((l) => !l.startsWith('+')).map((l) => l.slice(1)).join('\n');
      const now = h.filter((l) => !l.startsWith('-')).map((l) => l.slice(1)).join('\n');
      expect(src.split(old).length - 1, `the hunk must match once: ${old}`).toBe(1);
      src = src.replace(old, () => now);
    }
    return src;
  }

  test('the patched design compiles, and DEC subtracts one with the flags of SUB Rd, 1; other bytes of opcode 0 still halt', async () => {
    const decode = patched();
    const files = (program: ReturnType<typeof assembleOrThrow>) => [
      { name: 'octet-alu.weft', text: aluSource },
      { name: 'octet-decode.weft', text: decode },
      { name: 'octet.weft', text: withProgram(octetSource, program) },
    ];
    const m = await WeftOctet.start(synth, files(assembleOrThrow('HLT\n')));
    try {
      for (const [byte, reg] of [[0x01, 0], [0x05, 1], [0x09, 2], [0x0d, 3]] as const) {
        for (const value of [0, 1, 0x7f, 0x80, 0xff]) {
          const r = await m.run(assembleOrThrow(`LDI R${reg}, ${value}\n.byte ${byte}\nHLT\n`).image, [5 + 5 + 4]);
          const s = r.states[0]!;
          const want = (value - 1) & 0xff;
          expect((s.r >> (8 * reg)) & 0xff, `DEC R${reg} of ${value}`).toBe(want);
          expect([s.z, s.c, s.n, s.v]).toEqual([+(want === 0), +(value < 1), want >> 7, +(value === 0x80)]);
          expect(s.halted).toBe(1);
        }
      }
      for (const byte of [0x00, 0x02, 0x03, 0x08, 0x0f]) {
        const r = await m.run(assembleOrThrow(`LDI R0, 9\n.byte ${byte}\nLDI R1, 7\nHLT\n`).image, [30]);
        expect((r.states[0]!.r >> 8) & 0xff, `byte ${byte}`).toBe(0);
        expect(r.states[0]!.halted).toBe(1);
      }
    } finally {
      await m.stop();
    }
  });
});
