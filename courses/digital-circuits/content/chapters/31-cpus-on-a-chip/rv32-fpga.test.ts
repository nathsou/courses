/**
 * The RV32I core on a real iCE40, from its bits: synth fits the board's design on an HX8K with the register file in
 * flip-flops and in block RAM, and the chip decoded from each bitstream runs the walking light as the interpreter
 * does. The sizes and speeds are the ones Figure 31.3 and the text quote.
 */
import { readFileSync } from 'node:fs';
import { afterAll, describe, expect, test, vi } from 'vitest';
import { nodeSynth } from '$lib/synth/node';
import { Rv32Machine, assembleOrThrow } from '$lib/sim/cpu/rv32i';
import { Chip, fitRv32 } from './widgets/chip';
import { BUDGET } from './widgets/budget';

vi.setConfig({ testTimeout: 600_000 });
const synth = nodeSynth();
const walkSource = readFileSync(new URL('./programs/rv32-walk.asm', import.meta.url), 'utf8');
const walk = assembleOrThrow(walkSource, 'rv32-walk');
const chips: Chip[] = [];
afterAll(async () => {
  for (const c of chips) await c.stop();
});

/** The LED values the interpreter writes, in order, without repeats. */
function referenceLeds(steps: number): number[] {
  const m = new Rv32Machine();
  m.load(walk);
  const leds: number[] = [];
  m.board.hooks.onLeds = (v) => leds.push(v);
  for (let i = 0; i < steps && !m.halted; i++) m.step();
  return leds.filter((v, i) => v !== (i ? leds[i - 1] : 0));
}

describe.each(['flip-flops', 'block RAM'] as const)('the RV32I core with its register file in %s', (registers) => {
  test('fits the HX8K as Figure 31.3 says, and runs the walking light from its bits', async () => {
    const fit = await fitRv32(synth, walk, registers);
    const want = BUDGET.fits[registers === 'flip-flops' ? 'rv32-flip-flops' : 'rv32-block-ram'];
    expect(fit.result.chip!.usage.lc).toBe(want.cells);
    expect(fit.result.chip!.usage.ram).toBe(want.rams);
    expect(+fit.result.timing!.clocks[0]!.fmax_mhz.toFixed(1)).toBe(want.mhz);
    const chip = await Chip.start(synth, fit);
    chips.push(chip);
    const seen: number[] = [];
    for (let i = 0; i < 40; i++) {
      const out = await chip.run(40, { sw: 0, btn: 0 });
      if (out.values.led !== seen.at(-1)) seen.push(out.values.led!);
    }
    expect(seen.filter((v) => v !== 0).slice(0, 16)).toEqual(referenceLeds(2000).slice(0, 16));
  });
});
