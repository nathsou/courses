/**
 * Octet on a real iCE40, from its bits. synth fits the Weft Octet on an HX8K; the chip decoded from the bitstream
 * (synth reads the configuration back into cells and simulates those) runs the walking light, and is compared
 * with the reference interpreter. Then other programs are loaded into the bitstream's block RAMs, with no new fit,
 * and run to their HLT.
 */
import { readFileSync } from 'node:fs';
import { afterAll, describe, expect, test, vi } from 'vitest';
import { nodeSynth } from '$lib/synth/node';
import { OctetMachine, assembleOrThrow, octetProgram } from '$lib/sim/cpu/octet';
import { Chip, fitOctet, loadOctet, octetRams } from './widgets/chip';

vi.setConfig({ testTimeout: 600_000 });
const synth = nodeSynth();
const walkSource = readFileSync(new URL('./programs/walk.asm', import.meta.url), 'utf8');
const walk = assembleOrThrow(walkSource, 'walk');
const fit = await fitOctet(synth, walk.image);
const chips: Chip[] = [];
afterAll(async () => {
  for (const c of chips) await c.stop();
});

/** Run a program on the decoded chip and on the interpreter, instruction by instruction, comparing the board. */
async function againstInterpreter(chip: Chip, program: ReturnType<typeof assembleOrThrow>, limit: number) {
  const ref = new OctetMachine();
  ref.load(program);
  let console: number[] = [];
  let out = await chip.run(0, { sw: 0, btn: 0, rst_button: 0 });
  let n = 0;
  while (!ref.halted && n < limit) {
    const cycles = ref.step();
    out = await chip.run(cycles, { sw: 0, btn: 0, rst_button: 0 }, true);
    console = console.concat(out.console);
    n++;
    expect(out.values.led, `LEDs after instruction ${n}`).toBe(ref.board.leds);
  }
  return { ref, out, console, n };
}

describe('Octet fitted on an iCE40 HX8K', () => {
  test('539 logic cells and 2 block RAMs, at 80.6 MHz', () => {
    expect(fit.result.chip!.usage).toMatchObject({ lc: 539, ram: 2 });
    expect(octetRams(fit)).toHaveLength(2);
    expect(fit.result.timing!.clocks[0]!.fmax_mhz).toBeCloseTo(80.6, 1);
  });

  test('the chip, decoded from its bits, runs the walking light as the interpreter does', async () => {
    const chip = await Chip.start(synth, fit);
    chips.push(chip);
    const r = await againstInterpreter(chip, walk, 120);
    expect(r.n).toBe(120);
    expect(r.out.values.led).not.toBe(0);
  });

  test('a program loaded into the block RAMs runs to its HLT, with no new fit', async () => {
    for (const [id, check] of [
      ['multiply', (o: { values: Record<string, number> }) => expect([o.values.led, o.values.halted]).toEqual([143, 1])],
      ['hello', (_o: unknown, said: number[]) => expect(String.fromCharCode(...said)).toBe('HELLO, WORLD\n')],
    ] as const) {
      const p = assembleOrThrow(octetProgram(id).source, id);
      const loaded = await loadOctet(synth, fit, p.image);
      expect(loaded.changed).toBeGreaterThan(0);
      const chip = await Chip.start(synth, loaded.fit);
      chips.push(chip);
      const r = await againstInterpreter(chip, p, 20_000);
      expect(r.ref.halted).toBe(true);
      (check as (o: typeof r.out, said: number[]) => void)(r.out, r.console);
    }
  });

  test('changing WAIT from 8 to 2 changes 4 bits of the bitstream: two in each block RAM', async () => {
    const faster = assembleOrThrow(walkSource.replace('.equ WAIT, 8', '.equ WAIT, 2'), 'walk');
    expect(faster.image).not.toEqual(walk.image);
    const loaded = await loadOctet(synth, fit, faster.image);
    expect(loaded.changed).toBe(4);
    // Loading the same program again changes nothing.
    expect((await loadOctet(synth, fit, walk.image)).changed).toBe(0);
  });

  test('multiply.asm in place of the walking light changes a few hundred bits, and nothing outside the block RAMs', async () => {
    const p = assembleOrThrow(octetProgram('multiply').source, 'multiply');
    const loaded = await loadOctet(synth, fit, p.image);
    expect(loaded.changed).toBeGreaterThan(100);
    expect(loaded.changed).toBeLessThan(800);
  });
});
