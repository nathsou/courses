/**
 * A cosmic ray in the configuration memory of an iCE40: flip one bit of an XOR gate's bitstream and see whether
 * the chip still computes the XOR. synth builds the gate (`run`), then decodes the flipped bitstream back into
 * cells and simulates them for the four input pairs (a testbench session on the bitstream, with the bit flipped:
 * synth: crates/synth-playground/src/tb.rs).
 *
 * The census, which flips every bit of the tiles the gate uses, takes most of a minute, so it is recorded in
 * `upset-census.json`; `upset.test.ts` checks it against synth (UPDATE_UPSET=1 records it again).
 */
import type { Bitstream, BitstreamTile, RunResult, Synth } from '$lib/synth/api';
import { run, tbRun, tbStart, tbStop } from '$lib/synth/api';
import { pinsOf } from '$lib/studio/ice40/board';
import recorded from './upset-census.json';

export const XOR_SOURCE = 'module xor_gate(in a: bool, in b: bool, out y: bool) {\n    y = a ^ b;\n}\n';
/** A bare HX1K: the placer chooses the three pins. */
export const PART = { part: 'hx1k', package: 'vq100' } as const;
export const EXPECTED = '0110';

export interface Built {
  result: RunResult;
  pins: string;
  /** The tiles the gate uses (its logic cell's and its pads'), with their width in bits. */
  tiles: { x: number; y: number; w: number; kind: string }[];
  total: number;
}

export async function buildXor(synth: Synth): Promise<Built> {
  const result = await run(synth, { files: [{ name: 'xor.weft', text: XOR_SOURCE }], ...PART, pins: '' });
  if (!result.ok || !result.chip || !result.bitstream) throw new Error(result.error ?? 'synth failed');
  const used = new Set(result.chip.cells.filter((c) => c.bel !== 'gb').map((c) => `${c.x},${c.y}`));
  const tiles = result.bitstream.tiles
    .filter((t) => used.has(`${t.x},${t.y}`))
    .map((t) => ({ x: t.x, y: t.y, w: t.w, kind: t.k === 2 ? 'logic' : 'I/O' }))
    .sort((a, b) => a.x - b.x || a.y - b.y);
  return { result, pins: pinsOf(result.chip), tiles, total: tiles.reduce((s, t) => s + 16 * t.w, 0) };
}

export interface BitMeaning {
  set: boolean;
  /** `cell` (a logic cell's LUT, carry or flip-flop), `route`, `buf` (onto a cell input), `io`, or `none`. */
  kind: string;
  name: string;
}

/** What a bit of a tile does in this configuration, from synth's reading of the bits that are set. */
export function meaning(bs: Bitstream, x: number, y: number, bit: number): BitMeaning {
  const t: BitstreamTile | undefined = bs.tiles.find((u) => u.x === x && u.y === y);
  const set = !!t?.set.includes(bit);
  const f = t?.f.find((g) => g.b.includes(bit));
  if (!f) return { set, kind: 'none', name: set ? 'set' : 'a bit this design leaves at 0' };
  const kind = f.k === 'cfg' ? (f.n.startsWith('logic cell') ? 'cell' : 'io') : f.k;
  return { set, kind, name: f.n };
}

/** The XOR's output for the four input pairs (a, b) = 00, 01, 10, 11, after flipping `flips`. */
export async function outputs(synth: Synth, built: Built, flips: [number, number, number][]): Promise<string> {
  const s = await tbStart(synth, { bitstream: built.result.bin!, ...PART, pins: built.pins, flips });
  if (!s.ok) return `error: ${s.error}`;
  try {
    const ops = [0, 1, 2, 3].flatMap((v) => [{ set: { a: v >> 1, b: v & 1 } }, { read: ['y'] }]);
    const r = await tbRun(synth, s.id, ops);
    return r.reads.map((x) => String(x.values!.y ?? '?')).join('');
  } finally {
    await tbStop(synth, s.id);
  }
}

export interface Census {
  total: number;
  /** `[x, y, bit]` of every bit whose flip breaks the XOR. */
  critical: [number, number, number][];
}

export const CENSUS = recorded as unknown as Census;

/** The n-th ray of a reproducible sequence: which bit of the used tiles it hits. */
export function ray(n: number, built: Built, seed = 2024): [number, number, number] {
  let s = (seed + n * 0x9e3779b9) >>> 0;
  s ^= s << 13;
  s ^= s >>> 17;
  s ^= s << 5;
  let i = (s >>> 0) % built.total;
  for (const t of built.tiles) {
    if (i < 16 * t.w) return [t.x, t.y, i];
    i -= 16 * t.w;
  }
  return [built.tiles[0]!.x, built.tiles[0]!.y, 0];
}
