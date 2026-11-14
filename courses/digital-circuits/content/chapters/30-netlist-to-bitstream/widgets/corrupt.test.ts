import { describe, expect, test, vi } from 'vitest';
import { nodeSynth } from '$lib/synth/node';
import { compare, flipsFor, onChip, reachable, rtl, setup, type Setup, type Stimulus } from './corrupt';

vi.setConfig({ testTimeout: 300_000 });
const synth = nodeSynth();

/** Flip entry r of cell c's table alone, and say whether 20 clocks of the stimulus notice it. */
async function noticed(s: Setup, ref: Awaited<ReturnType<typeof rtl>>, index: number, r: number, stimulus: Stimulus): Promise<boolean> {
  const c = s.cells.find((x) => x.index === index)!;
  const t = await onChip(synth, s, flipsFor(s, new Map([[index, c.table ^ (1 << r)]])), stimulus);
  return compare(ref, t).first > 0;
}

/** The numbers of Figure 30.6's lab. */
describe('the chip from its bits (Figure 30.6)', async () => {
  const s = await setup(synth);
  const cell = (label: string) => s.cells.find((c) => c.label === label)!;

  test('the counter is eight logic cells: four with the count’s flip-flops, four plain LUTs', () => {
    expect(s.cells).toHaveLength(8);
    expect(s.cells.filter((c) => c.ff).map((c) => c.label)).toEqual(['value[0]', 'value[1]', 'value[2]', 'value[3]']);
    // The tables hold 128 bits, and only 48 of them can ever be read.
    expect(s.cells.length * 16).toBe(128);
    expect(s.cells.reduce((n, c) => n + Array.from({ length: 16 }, (_, r) => r).filter((r) => reachable(c, r)).length, 0)).toBe(48);
    // value[0] reads only itself: a NOT, two readable entries.
    expect(cell('value[0]').inputs.filter((p) => p !== null)).toEqual(['value[0]']);
  });

  test('as built, the chip counts 1, 2, … 15, 0, … and agrees with the RTL simulator on every cycle', async () => {
    const ref = await rtl(synth, 'held');
    expect(ref.count.slice(0, 16)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0]);
    expect(compare(ref, await onChip(synth, s, [], 'held')).first).toBe(0);
    const varied = await rtl(synth, 'varied');
    expect(varied.count.slice(0, 6)).toEqual([1, 2, 2, 3, 4, 4]);
    expect(compare(varied, await onChip(synth, s, [], 'varied')).first).toBe(0);
  });

  test('flipping an entry that is never read changes nothing; every flip of value[0]’s two read entries is seen at once', async () => {
    const ref = await rtl(synth, 'held');
    const c = cell('value[0]');
    for (let r = 0; r < 16; r++) {
      const t = await onChip(synth, s, flipsFor(s, new Map([[c.index, c.table ^ (1 << r)]])), 'held');
      const cmp = compare(ref, t);
      if (reachable(c, r)) expect(cmp.first, `entry ${r}`).toBeGreaterThan(0);
      if (reachable(c, r)) expect(cmp.first, `entry ${r}`).toBeLessThanOrEqual(2);
      else expect(cmp.first, `entry ${r}`).toBe(0);
    }
  });

  test('of the 48 readable bits, enable held high notices 38 and enable varied 39; neither notices all', async () => {
    const counts: Record<Stimulus, { seen: number; silent: string[] }> = { held: { seen: 0, silent: [] }, varied: { seen: 0, silent: [] } };
    for (const st of ['held', 'varied'] as const) {
      const ref = await rtl(synth, st);
      for (const c of s.cells) {
        for (let r = 0; r < 16; r++) {
          if (!reachable(c, r)) continue;
          if (await noticed(s, ref, c.index, r, st)) counts[st].seen++;
          else counts[st].silent.push(`${c.label}#${r}`);
        }
      }
    }
    expect(counts.held.seen).toBe(38);
    expect(counts.varied.seen).toBe(39);
    // The bits neither stimulus sees are in the cells that read `clear`, which neither raises, and in the cell of
    // `wrapped`, in rows that need the enable low while the count is 15.
    const both = counts.held.silent.filter((x) => counts.varied.silent.includes(x));
    expect(both.length).toBe(7);
    const at = (x: string, input: string) => {
      const c = cell(x.split('#')[0]!);
      const k = c.inputs.indexOf(input);
      return k >= 0 ? (Number(x.split('#')[1]) >> k) & 1 : -1;
    };
    expect(both.filter((x) => at(x, 'clear') === 1)).toHaveLength(4);
    // With the enable held high, every silent bit is in a cell that reads the enable, in a row with the enable low
    // or the clear high.
    expect(counts.held.silent).toHaveLength(10);
    expect(new Set(counts.held.silent.map((x) => x.split('#')[0])).size).toBe(3);
    for (const x of counts.held.silent) expect(at(x, 'enable') === 0 || at(x, 'clear') === 1, x).toBe(true);
    // Neither stimulus is a superset of the other.
    expect(counts.held.silent.some((x) => !counts.varied.silent.includes(x))).toBe(true);
    expect(counts.varied.silent.some((x) => !counts.held.silent.includes(x))).toBe(true);
  });

  test('inverting value[1]’s whole table gives wrong numbers: 3, 6, 5, 4, …', async () => {
    const c = cell('value[1]');
    const t = await onChip(synth, s, flipsFor(s, new Map([[c.index, c.table ^ 0xffff]])), 'held');
    expect(t.count.slice(0, 4)).toEqual([3, 6, 5, 4]);
  });
});
