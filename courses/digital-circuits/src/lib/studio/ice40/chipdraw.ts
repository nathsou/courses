/**
 * The geometry of an iCE40 die as synth describes it (`RunResult.chip`, synth: crates/synth-playground/src/
 * chip.rs), for the chip view: tiles on a grid, the eight logic cells of a logic tile, the pads of the I/O
 * ring, and the routing nodes that the routed nets use, drawn along the tiles they span. Pure functions over
 * the data, so the tests can check them without a canvas.
 *
 * Tile (x, y) has y = 0 at the bottom of the die, as in the iCE40's documentation; the drawing puts it at the
 * bottom too.
 */
import type { Chip, ChipCell, ChipNet } from '$lib/synth/api';

export const TILE_KIND = ['corner', 'io', 'logic', 'ram-bottom', 'ram-top'] as const;
export type TileKind = (typeof TILE_KIND)[number];

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** The kind of tile (x, y). */
export function tileKind(chip: Chip, x: number, y: number): TileKind {
  return TILE_KIND[chip.tiles[y * chip.gw + x] ?? 0] ?? 'corner';
}

/** A tile's square, in units of tiles, with y growing downwards for drawing. */
export function tileRect(chip: Chip, x: number, y: number): Rect {
  return { x, y: chip.gh - 1 - y, w: 1, h: 1 };
}

/** Where a placed cell is drawn: logic cells in two columns of four inside their tile, pads in two halves. */
export function cellRect(chip: Chip, c: Pick<ChipCell, 'bel' | 'x' | 'y' | 'z'>): Rect {
  const t = tileRect(chip, c.x, c.y);
  if (c.bel === 'lc') {
    const col = Math.floor(c.z / 4);
    const row = 3 - (c.z % 4);
    return { x: t.x + 0.12 + col * 0.4, y: t.y + 0.1 + row * 0.2, w: 0.36, h: 0.16 };
  }
  if (c.bel === 'io') {
    const half = c.z === 0 ? 0 : 1;
    return { x: t.x + 0.15 + half * 0.4, y: t.y + 0.3, w: 0.3, h: 0.4 };
  }
  if (c.bel === 'ram') return { x: t.x + 0.1, y: t.y - 0.9, w: 0.8, h: 1.8 };
  return { x: t.x + 0.3, y: t.y + 0.3, w: 0.4, h: 0.4 };
}

export const centre = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

/** A small, stable offset for a wire's name, so that parallel tracks in one channel do not overlap. */
function track(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return ((h % 9) - 4) * 0.045;
}

/**
 * How a routing node is drawn: a span-4 or span-12 wire as a line along the tiles it crosses, offset into
 * its channel; a local track, a cell's input or output as a dot at its tile; the global networks not at all
 * (they reach every tile).
 */
export function nodeSegment(chip: Chip, node: (string | number)[]): Segment | null {
  const [name, cls, x, y, x0, y0, x1, y1] = node as [string, string, number, number, number, number, number, number];
  if (cls === 'Global' || cls === 'LcGlobal') return null;
  const off = track(name);
  const cy = (ty: number) => chip.gh - 1 - ty + 0.5;
  if (/Sp\d+H|SpanH|Sp4H|Sp12H/.test(cls)) return { x1: x0 + 0.5, y1: cy(y) + 0.42 + off * 0.3, x2: x1 + 0.5, y2: cy(y) + 0.42 + off * 0.3 };
  if (/Sp\d+V|SpanV|Sp4V|Sp12V/.test(cls)) return { x1: x + 0.42 + off * 0.3, y1: cy(y0), x2: x + 0.42 + off * 0.3, y2: cy(y1) };
  return { x1: x + 0.5 + off, y1: cy(y) + off, x2: x + 0.5 + off, y2: cy(y) + off };
}

/** The segments of a routed net, and the switches (pips) it turns on, as points. */
export function netGeometry(chip: Chip, net: ChipNet): { segments: Segment[]; pips: { x: number; y: number }[] } {
  const seen = new Set<number>();
  const segments: Segment[] = [];
  const pips: { x: number; y: number }[] = [];
  for (const [a, b, px, py] of net.pips) {
    for (const n of [a, b]) {
      if (seen.has(n)) continue;
      seen.add(n);
      const node = chip.nodes[n];
      const s = node && nodeSegment(chip, node);
      if (s) segments.push(s);
    }
    pips.push({ x: px + 0.5, y: chip.gh - 1 - py + 0.5 });
  }
  return { segments, pips };
}

/** The cells on the critical path of a clock, by index into `chip.cells`. */
export function pathCells(chip: Chip, path: { cell: string }[]): Set<number> {
  const names = new Set(path.map((p) => p.cell));
  const out = new Set<number>();
  chip.cells.forEach((c, i) => {
    if (names.has(c.name)) out.add(i);
  });
  return out;
}

/** What a placed cell is, in a few words, from synth's description of its configuration. */
export function describeCell(c: ChipCell): string {
  const info = new Map(c.info);
  if (c.bel === 'lc') {
    const parts = [info.get('LUT') ? `LUT ${info.get('LUT')}` : 'no LUT'];
    if (info.get('carry')) parts.push('carry');
    if (info.get('flip-flop')) parts.push(`flip-flop (${info.get('flip-flop')})`);
    return parts.join(', ');
  }
  if (c.bel === 'io') return `pad ${c.pin ?? '?'}: input ${info.get('input') ?? '?'}, output ${info.get('output') ?? '?'}`;
  if (c.bel === 'gb') return 'global buffer: drives a clock network';
  if (c.bel === 'ram') return `block RAM: read mode ${info.get('read mode') ?? '?'}, write mode ${info.get('write mode') ?? '?'}`;
  return c.t;
}
