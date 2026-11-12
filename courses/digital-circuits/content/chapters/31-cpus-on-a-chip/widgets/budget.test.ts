import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, test, vi } from 'vitest';
import { nodeSynth } from '$lib/synth/node';
import { assembleOrThrow as octetAsm } from '$lib/sim/cpu/octet';
import { assembleOrThrow as rv32Asm } from '$lib/sim/cpu/rv32i';
import { fitOctet, fitRv32, type Fit } from './chip';
import { BUDGET, type Budget, type FitId, type FitNumbers } from './budget';

vi.setConfig({ testTimeout: 600_000 });
const synth = nodeSynth();
const file = new URL('./budget.json', import.meta.url);

function numbers(f: Fit): FitNumbers {
  const lcs = f.result.chip!.cells.filter((c) => c.bel === 'lc');
  return {
    cells: lcs.length,
    flipFlopCells: lcs.filter((c) => !!new Map(c.info).get('flip-flop')).length,
    rams: f.result.chip!.usage.ram,
    mhz: +f.result.timing!.clocks[0]!.fmax_mhz.toFixed(1),
  };
}

describe('the cell budget (Figure 31.3)', () => {
  test('the three fits are as recorded', async () => {
    const walk = octetAsm(readFileSync(new URL('../programs/walk.asm', import.meta.url), 'utf8'), 'walk');
    const rv = rv32Asm(readFileSync(new URL('../programs/rv32-walk.asm', import.meta.url), 'utf8'), 'rv32-walk');
    const octet = await fitOctet(synth, walk.image);
    const fits: Record<FitId, FitNumbers> = {
      octet: numbers(octet),
      'rv32-flip-flops': numbers(await fitRv32(synth, rv, 'flip-flops')),
      'rv32-block-ram': numbers(await fitRv32(synth, rv, 'block RAM')),
    };
    const now: Budget = { capacity: octet.result.chip!.usage.lc_total, rams: octet.result.chip!.usage.ram_total, fits };
    if (process.env.UPDATE_BUDGET) writeFileSync(file, `${JSON.stringify(now, null, 2)}\n`);
    expect(now).toEqual(process.env.UPDATE_BUDGET ? now : BUDGET);
    expect(now.capacity).toBe(7680);
  });
});
