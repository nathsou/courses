import { describe, expect, it } from 'vitest';
import { nodeSynth } from '$lib/synth/node';
import { buildXor } from './upset';
import { entryFor, flipsFor, GOALS, handCell, HandExpressionError, onChip, predicted, reachable, tableFromExpression } from './byhand';

const synth = nodeSynth();

describe('one logic cell of an iCE40, programmed by hand (Figure 28.6)', () => {
  it('reads synth’s XOR table and the inputs it arrives on', async () => {
    const hc = handCell(await buildXor(synth));
    expect(hc.inputs.filter((p) => p !== null).sort()).toEqual(['a', 'b']);
    expect(predicted(hc, hc.table)).toBe('0110');
    expect(flipsFor(hc, hc.table)).toEqual([]);
    // Only the four entries with the unconnected inputs at 0 can be read.
    expect(Array.from({ length: 16 }, (_, r) => r).filter((r) => reachable(hc, r))).toHaveLength(4);
    expect(entryFor(hc, { a: 0, b: 0 })).toBe(0);
  });

  it('a table typed as an expression runs on the decoded chip as predicted', async () => {
    const hc = handCell(await buildXor(synth));
    expect(predicted(hc, tableFromExpression(hc, 'a ^ b'))).toBe('0110');
    expect(() => tableFromExpression(hc, 'a & c')).toThrow(HandExpressionError);
    expect(await onChip(synth, hc, 0)).toBe('0000');
    for (const g of GOALS) {
      const t = tableFromExpression(hc, { xor: 'a ^ b', and: 'a & b', or: 'a | b', nand: '!(a & b)', andnot: 'a & !b' }[g.id]!);
      expect(predicted(hc, t), g.id).toBe(g.want);
      expect(await onChip(synth, hc, t), g.id).toBe(g.want);
    }
    // An entry that is never read changes nothing on the chip.
    const unread = Array.from({ length: 16 }, (_, r) => r).find((r) => !reachable(hc, r))!;
    expect(await onChip(synth, hc, hc.table ^ (1 << unread))).toBe('0110');
  });
});
