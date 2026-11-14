/**
 * Run the configured chip from its bits and compare it with the RTL simulator, cycle by cycle (Figure 30.6). synth
 * builds the 4-bit counter of Chapter 29 for a bare iCE40 HX1K; the reader edits the truth tables of its logic
 * cells, which flips the tile bits that hold them (`lut_bits`, as synth reports them). What runs is the decoded
 * bitstream: synth reads the edited configuration back into cells and simulates them (a testbench session on the
 * bitstream), beside a testbench session on the Weft source, and the two are compared after every clock.
 */
import type { RunResult, Synth, TbOp, TbRan } from '$lib/synth/api';
import { run as runSynth, tbRun, tbStart, tbStop } from '$lib/synth/api';
import { pinsOf } from '$lib/studio/ice40/board';
import { designSource } from '$lib/widgets/weft/designs';

export const PART = { part: 'hx1k', package: 'vq100' } as const;

/** The counter's pins, in the clock's domain (a testbench drives them between edges). */
export const TOP = `/// The counter of Chapter 29 on the pins of a bare HX1K.
module counter_pins(in clk: clock, in enable: bool @clk, in clear: bool @clk, out count: uint<4>, out wrapped: bool) {
    inst c = counter(clk: clk, enable: enable, clear: clear);
    count = c.count;
    wrapped = c.wrapped;
}
`;

const files = () => [
  { name: 'counter.weft', text: designSource('counter')! },
  { name: 'counter-pins.weft', text: TOP },
];

export interface LutCell {
  /** Index in the chip's cells. */
  index: number;
  /** The cell's name without synth's suffix: the signal it drives. */
  label: string;
  x: number;
  y: number;
  z: number;
  /** The tile bit holding each entry of the table. */
  bits: number[];
  /** What drives each of the LUT's inputs I0…I3: a port, another cell, or null (unconnected, reads 0). */
  inputs: (string | null)[];
  /** The table synth wrote. */
  table: number;
  /** Whether the cell's flip-flop is used. */
  ff: boolean;
  /** What the cell's output reaches: other cells, or the output pins. */
  drives: string[];
}

export interface Setup {
  result: RunResult;
  pins: string;
  cells: LutCell[];
}

const label = (name: string) => name.replace(/\$(lc|sb_io)$/, '').replace(/^c\./, '').replace(/\$/g, '');

export async function setup(synth: Synth): Promise<Setup> {
  const result = await runSynth(synth, { files: files(), top: 'counter_pins', ...PART, pins: '' });
  if (!result.ok || !result.chip || !result.bitstream) throw new Error(result.error ?? 'synth failed');
  const chip = result.chip;
  const driver = new Map(chip.nets.map((n) => [n.name, chip.cells[n.driver]?.name ?? n.name]));
  const cells: LutCell[] = [];
  chip.cells.forEach((c, index) => {
    if (c.bel !== 'lc' || !c.lut_bits || !c.lut_inputs) return;
    const t = result.bitstream!.tiles.find((u) => u.x === c.x && u.y === c.y)!;
    const set = new Set(t.set);
    cells.push({
      index,
      label: label(c.name),
      x: c.x,
      y: c.y,
      z: c.z,
      bits: c.lut_bits,
      inputs: c.lut_inputs.map((n) => (n === null ? null : label(driver.get(n) ?? n))),
      table: c.lut_bits.reduce((acc, b, i) => (set.has(b) ? acc | (1 << i) : acc), 0),
      ff: !!new Map(c.info).get('flip-flop'),
      drives: [...new Set(chip.nets.filter((n) => n.driver === index).flatMap((n) => n.sinks.map((k) => label(chip.cells[k]!.name))))].filter((d) => d !== label(c.name)),
    });
  });
  cells.sort((a, b) => a.label.localeCompare(b.label, 'en', { numeric: true }));
  return { result, pins: pinsOf(chip), cells };
}

/** Whether entry r of a cell's table can ever be read: an unconnected input is 0. */
export const reachable = (c: LutCell, r: number): boolean => c.inputs.every((p, k) => p !== null || !((r >> k) & 1));

/** The bits to flip in synth's bitstream for the cells to hold `tables` (by cell index; others unchanged). */
export function flipsFor(s: Setup, tables: ReadonlyMap<number, number>): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (const c of s.cells) {
    const t = tables.get(c.index);
    if (t === undefined) continue;
    c.bits.forEach((b, i) => {
      if (((t ^ c.table) >> i) & 1) out.push([c.x, c.y, b]);
    });
  }
  return out;
}

export type Stimulus = 'held' | 'varied';

/** Whether `enable` is high during cycle `i` (1-based): always, or high except every third cycle. */
export const enableAt = (stimulus: Stimulus, i: number): boolean => stimulus === 'held' || i % 3 !== 0;

export interface Trace {
  count: number[];
  wrapped: number[];
}

/** Clock a session `cycles` times with `clear` low and the enable of the stimulus, reading the outputs each time. */
async function drive(synth: Synth, id: number, stimulus: Stimulus, cycles: number): Promise<Trace> {
  const ops: TbOp[] = [{ set: { clear: 0 } }];
  for (let i = 1; i <= cycles; i++) ops.push({ set: { enable: enableAt(stimulus, i) ? 1 : 0 } }, { step: 1 }, { read: ['count', 'wrapped'] });
  const r: TbRan = await tbRun(synth, id, ops);
  if (!r.ok) throw new Error(r.error ?? 'simulation failed');
  return { count: r.reads.map((x) => Number(x.values!.count)), wrapped: r.reads.map((x) => Number(x.values!.wrapped)) };
}

/** The counter according to the RTL simulator. */
export async function rtl(synth: Synth, stimulus: Stimulus, cycles = 20): Promise<Trace> {
  const s = await tbStart(synth, { files: files(), top: 'counter_pins' });
  if (!s.ok) throw new Error(s.error);
  try {
    return await drive(synth, s.id, stimulus, cycles);
  } finally {
    await tbStop(synth, s.id);
  }
}

/** The counter according to the chip, decoded from synth's bitstream with `flips` applied. */
export async function onChip(synth: Synth, s: Setup, flips: [number, number, number][], stimulus: Stimulus, cycles = 20): Promise<Trace> {
  const t = await tbStart(synth, { bitstream: s.result.bin!, ...PART, pins: s.pins, flips });
  if (!t.ok) throw new Error(t.error);
  try {
    return await drive(synth, t.id, stimulus, cycles);
  } finally {
    await tbStop(synth, t.id);
  }
}

export interface Comparison {
  /** Cycle (1-based) of the first disagreement, or 0 if the two agree throughout. */
  first: number;
  /** The outputs that ever disagreed. */
  outputs: string[];
}

export function compare(a: Trace, b: Trace): Comparison {
  let first = 0;
  const outputs = new Set<string>();
  for (let i = 0; i < a.count.length; i++) {
    const bad = [a.count[i] !== b.count[i] ? 'count' : '', a.wrapped[i] !== b.wrapped[i] ? 'wrapped' : ''].filter(Boolean);
    if (bad.length && !first) first = i + 1;
    for (const o of bad) outputs.add(o);
  }
  return { first, outputs: [...outputs] };
}
