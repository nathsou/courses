import { readFileSync } from 'node:fs';
import YAML from 'yaml';
import { afterAll, describe, expect, test, vi } from 'vitest';
import { nodeSynth } from '$lib/synth/node';
import { OctetMachine, assembleOrThrow } from '$lib/sim/cpu/octet';
import { WeftOctet } from './widgets/octet-weft';
import { OCTET_BOARD_PROGRAMS, RV32_BOARD_PROGRAMS } from './widgets/programs';

/**
 * The quiz, parsons and bug blocks of Chapter 31 are valid YAML of the shape the exercise components read, and every program of the
 * chapter's boards assembles and runs on Octet in Weft exactly as it does on the interpreter.
 */
const md = readFileSync(new URL('./index.md', import.meta.url), 'utf8');
const blocks = [...md.matchAll(/```(quiz|parsons|bug)\n([\s\S]*?)```/g)].map((m) => ({ kind: m[1]!, spec: YAML.parse(m[2]!) as Record<string, unknown> }));

describe('exercise blocks', () => {
  test('there are quizzes, a parsons problem and a bug hunt, and a predict before each of the two figures that answer it', () => {
    const kinds = blocks.map((b) => b.kind);
    expect(kinds.filter((k) => k === 'quiz').length).toBeGreaterThanOrEqual(5);
    expect(kinds).toContain('parsons');
    expect(kinds).toContain('bug');
    expect(md.indexOf('```quiz')).toBeLessThan(md.indexOf('::circuit{src="31-cpus-on-a-chip/circuits/memory-read.json"'));
    const ask = md.indexOf('q: \'Octet took 539 logic cells.');
    expect(ask).toBeGreaterThan(0);
    expect(ask).toBeLessThan(md.indexOf('::cell-budget'));
  });
  for (const [i, b] of blocks.entries()) {
    test(`block ${i + 1} (${b.kind}) is well formed`, () => {
      if (b.kind === 'quiz') {
        const options = b.spec.options as { text: string; correct?: boolean; why: string }[];
        expect(typeof b.spec.q).toBe('string');
        expect(options.length).toBeGreaterThanOrEqual(3);
        expect(options.filter((o) => o.correct).length).toBe(1);
        for (const o of options) {
          expect(typeof o.text).toBe('string');
          expect(typeof o.why).toBe('string');
        }
      } else if (b.kind === 'parsons') {
        expect((b.spec.lines as string[]).length).toBeGreaterThan(3);
        expect((b.spec.distractors as string[]).every((l) => typeof l === 'string')).toBe(true);
      } else {
        const lines = b.spec.lines as string[];
        expect(b.spec.wrong as number).toBeLessThan(lines.length);
        expect(typeof b.spec.why).toBe('string');
        for (const k of Object.keys(b.spec.notes as Record<string, string>)) expect(Number(k)).toBeLessThan(b.spec.wrong as number);
      }
    });
  }
});

vi.setConfig({ testTimeout: 300_000 });
const synth = nodeSynth();

describe('the quoted arithmetic', () => {
  test('ADD (6 cycles) and JMP (5) in a loop at 80.6 MHz: 7.3 million turns, 14.7 million instructions a second', () => {
    expect(+(80.6e6 / 11 / 1e6).toFixed(2)).toBe(7.33);
    expect(+((2 * 80.6e6) / 11 / 1e6).toFixed(1)).toBe(14.7);
  });
  test('0 − 20 is 0xEC and 0 − 8 is 0xF8, as a byte', () => {
    expect((0 - 20) & 0xff).toBe(0xec);
    expect((0 - 8) & 0xff).toBe(0xf8);
  });
  test('240 bytes of flip-flops would be 1,920, more than the 1,280 cells of an HX1K', () => {
    expect(240 * 8).toBe(1920);
    expect(1920).toBeGreaterThan(1280);
  });
});

const octet = await WeftOctet.start(synth);
afterAll(() => octet.stop());

describe('the programs of the boards', () => {
  test('the Octet picker has the chapter’s two programs and the course’s five, and all assemble', () => {
    expect(OCTET_BOARD_PROGRAMS.map((p) => p.id)).toEqual(['walk', 'switches', 'blink', 'count', 'fibonacci', 'multiply', 'hello']);
    for (const p of OCTET_BOARD_PROGRAMS) expect(assembleOrThrow(p.source, p.id).size, p.id).toBeGreaterThan(0);
    expect(RV32_BOARD_PROGRAMS).toHaveLength(1);
  });

  test.each(OCTET_BOARD_PROGRAMS.map((p) => [p.id, p] as const))('%s runs on Octet in Weft as on the interpreter (LEDs, hex, console, every instruction)', async (id, p) => {
    const program = assembleOrThrow(p.source, id);
    const ref = new OctetMachine();
    ref.load(program);
    ref.board.switches = 0x5a;
    ref.board.buttons = 0b0011;
    const groups: number[] = [];
    const want: { leds: number; hex: number; console: string }[] = [];
    while (!ref.halted && groups.length < 4000) {
      groups.push(ref.step());
      want.push({ leds: ref.board.leds, hex: ref.board.hex, console: ref.board.consoleText });
    }
    const r = await octet.run(program.image, groups, { switches: 0x5a, buttons: 0b0011 });
    const got = r.states.map((s, i) => ({ leds: s.leds, hex: s.hex, console: String.fromCharCode(...r.console.slice(0, i + 1).flat()) }));
    expect(got).toEqual(want);
    expect(groups.length).toBeGreaterThan(10);
  });
});
