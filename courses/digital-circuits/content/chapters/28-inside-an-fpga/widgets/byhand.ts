/**
 * Programming one logic cell of a real iCE40 by hand. synth builds the XOR gate of Figure 28.5 (one logic cell and
 * three pads on an HX1K) and reports, for its logic cell, which tile bit holds each entry of the truth table
 * (`lut_bits`) and which net arrives at each of the LUT's physical inputs (`lut_inputs`). The reader writes the 16
 * entries; the widget flips the tile bits that differ from what synth wrote, and synth decodes the flipped
 * bitstream back into cells and runs them for the four input pairs. The routing stays as synth made it.
 */
import type { ChipCell, Synth } from '$lib/synth/api';
import { evalExpr, exprVars, parseExpr } from '$lib/pld/twolevel/expr';
import { outputs, type Built } from './upset';

export interface HandCell {
  built: Built;
  cell: ChipCell;
  /** The logic cell's tile, and its width in bits (a tile is 16 rows of `w` bits). */
  tile: { x: number; y: number; w: number };
  /** What arrives at each physical input I0…I3: a port of the design (`a`, `b`), or null (unconnected, reads 0). */
  inputs: (string | null)[];
  /** The truth table synth wrote, entry r being the output when I0 + 2·I1 + 4·I2 + 8·I3 = r. */
  table: number;
}

/** The logic cell of a built XOR gate, with its inputs named by the pads that drive them. */
export function handCell(built: Built): HandCell {
  const chip = built.result.chip!;
  const cell = chip.cells.find((c) => c.bel === 'lc');
  if (!cell?.lut_bits || !cell.lut_inputs) throw new Error('synth did not report the logic cell’s truth-table bits');
  const port = (net: string | null): string | null => {
    if (net === null) return null;
    const n = chip.nets.find((m) => m.name === net);
    const driver = n ? chip.cells[n.driver] : undefined;
    return driver?.name.replace(/\$sb_io$/, '') ?? net;
  };
  const t = built.result.bitstream!.tiles.find((u) => u.x === cell.x && u.y === cell.y)!;
  const set = new Set(t.set);
  const table = cell.lut_bits.reduce((acc, b, i) => (set.has(b) ? acc | (1 << i) : acc), 0);
  return { built, cell, tile: { x: t.x, y: t.y, w: t.w }, inputs: cell.lut_inputs.map(port), table };
}

/** The entry of the table that the inputs select, for given values of the design's ports. */
export function entryFor(hc: HandCell, values: Record<string, number>): number {
  return hc.inputs.reduce<number>((r, p, k) => r | ((p !== null && values[p] ? 1 : 0) << k), 0);
}

/** Whether entry r can ever be read: an unconnected input is 0, so an entry with that input at 1 never is. */
export const reachable = (hc: HandCell, r: number): boolean => hc.inputs.every((p, k) => p !== null || !((r >> k) & 1));

/** What y should be, for (a, b) = 00, 01, 10, 11, if the decoded chip does what the table says. */
export function predicted(hc: HandCell, table: number): string {
  return [0, 1, 2, 3].map((v) => String((table >> entryFor(hc, { a: v >> 1, b: v & 1 })) & 1)).join('');
}

export class HandExpressionError extends Error {}

/**
 * The truth table of an expression over the design's ports (a, b) or the LUT's inputs (I0…I3), written for the
 * physical inputs the ports arrive on.
 */
export function tableFromExpression(hc: HandCell, text: string): number {
  let e;
  try {
    e = parseExpr(text);
  } catch (err) {
    throw new HandExpressionError(err instanceof Error ? err.message : String(err));
  }
  const ports = hc.inputs.filter((p): p is string => p !== null);
  for (const v of exprVars(e)) if (!ports.includes(v) && !/^I[0-3]$/.test(v)) throw new HandExpressionError(`${v} is not an input: use ${ports.join(', ')} (or I0 to I3)`);
  let table = 0;
  for (let r = 0; r < 16; r++) {
    const value = (name: string): number => {
      if (/^I[0-3]$/.test(name)) return (r >> Number(name[1])) & 1;
      const k = hc.inputs.indexOf(name);
      return k < 0 ? 0 : (r >> k) & 1;
    };
    if (evalExpr(e, value)) table |= 1 << r;
  }
  return table;
}

/** The bits to flip in synth's bitstream for the cell to hold `table`. */
export function flipsFor(hc: HandCell, table: number): [number, number, number][] {
  const bits = hc.cell.lut_bits!;
  return bits.flatMap((b, i) => (((hc.table >> i) & 1) !== ((table >> i) & 1) ? [[hc.tile.x, hc.tile.y, b] as [number, number, number]] : []));
}

/** y for (a, b) = 00, 01, 10, 11, from the decoded bitstream with the cell holding `table`. */
export function onChip(synth: Synth, hc: HandCell, table: number): Promise<string> {
  return outputs(synth, hc.built, flipsFor(hc, table));
}

export interface Goal {
  id: string;
  label: string;
  /** y for (a, b) = 00, 01, 10, 11. */
  want: string;
}

export const GOALS: Goal[] = [
  { id: 'xor', label: 'a XOR b', want: '0110' },
  { id: 'and', label: 'a AND b', want: '0001' },
  { id: 'or', label: 'a OR b', want: '0111' },
  { id: 'nand', label: 'a NAND b', want: '1110' },
  { id: 'andnot', label: 'a AND NOT b', want: '0010' },
];

export const hex = (t: number): string => `0x${(t & 0xffff).toString(16).toUpperCase().padStart(4, '0')}`;
