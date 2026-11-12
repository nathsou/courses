/**
 * Wires of different lengths on an iCE40: the fastest way from a logic cell's output to a cell `distance`
 * tiles along the same row, with the delays of the timing model synth uses (the IceStorm timing database,
 * recorded in `src/lib/synth/ice40-delays.json` and checked against synth by `wire-reach.test.ts`).
 *
 * - A cell's output reaches the neighbouring tiles' local tracks directly, but no further: to go one tile at a
 *   time, every tile on the way needs a LUT that passes the signal on (a *repeater*).
 * - Span-4 and span-12 wires cross 4 and 12 tiles. A cell drives one through an output driver (`odrv4`,
 *   `odrv12`); a wire drives the next through a multiplexer at its end; a span-12 can feed a span-4
 *   (`sp12to4`). Here every hop uses the wire's whole length (the delay of a span wire grows with the tiles
 *   used, and the last tile's figure is taken).
 * - At the destination, the signal crosses a local-track multiplexer and the cell's input multiplexer
 *   (`local`, `inmux`).
 *
 * Delays are in nanoseconds.
 */
import raw from '$lib/synth/ice40-delays.json';

export interface Ice40Delays {
  lut: number;
  lut_in3: number;
  carry: number;
  clk_to_q: number;
  setup: number;
  odrv4: number;
  odrv12: number;
  sp12to4: number;
  local: number;
  inmux: number;
  span4_h: number[];
  span12_h: number[];
}

export const DELAYS = raw as unknown as Ice40Delays;
const ns = (ps: number) => ps / 1000;

export type Wire = 'neighbour' | 'span4' | 'span12';
export type WireSet = 'neighbour' | 'four' | 'all';

export const WIRE_SETS: { id: WireSet; label: string; wires: Wire[]; title: string }[] = [
  { id: 'neighbour', label: 'Neighbours only', wires: ['neighbour'], title: 'A cell output reaches the next tile; a LUT in each tile passes it on' },
  { id: 'four', label: 'Span-4 wires', wires: ['neighbour', 'span4'], title: 'Wires that cross four tiles' },
  { id: 'all', label: 'Span-4 and span-12', wires: ['neighbour', 'span4', 'span12'], title: 'All the wires of an iCE40 row' },
];

export const SPAN: Record<Wire, number> = { neighbour: 1, span4: 4, span12: 12 };

export interface Hop {
  from: number;
  to: number;
  wire: Wire;
  /** What this hop costs: the multiplexer into the wire and the wire, or a repeater LUT. */
  delay: number;
}

export interface Reach {
  hops: Hop[];
  /** Total, ns, up to the destination cell's input. */
  delay: number;
}

/**
 * The fastest route over `distance` tiles (wires may overshoot and come back): a shortest path over states
 * (tile, what the signal is on). Leaving a cell, the signal takes a neighbour link (`local`), or an output
 * driver onto a span wire (`odrv4`, `odrv12`); every span wire costs its own delay over its whole length
 * (`span4_h[4]`, `span12_h[12]`), and feeds a wire of its kind, or a span-12 a span-4 (`sp12to4`). A
 * neighbour link ends in the next tile, where a repeater LUT (`inmux` and `lut_in3`) sends it on. At the
 * destination: `local` and `inmux` from a wire, `inmux` from a neighbour link.
 */
export function fastest(distance: number, set: WireSet, width = 40): Reach {
  const allowed = new Set(WIRE_SETS.find((s) => s.id === set)!.wires);
  if (distance < 1 || distance >= width) throw new RangeError('distance outside the row');
  type On = 'cell' | Wire;
  const d4 = DELAYS.span4_h[4]!;
  const d12 = DELAYS.span12_h[12]!;
  const moves = (on: On): { wire: Wire | 'repeat'; step: number; cost: number }[] => {
    const out: { wire: Wire | 'repeat'; step: number; cost: number }[] = [];
    if (on === 'cell' && allowed.has('neighbour')) out.push({ wire: 'neighbour', step: 1, cost: DELAYS.local });
    if (on === 'neighbour') out.push({ wire: 'repeat', step: 0, cost: DELAYS.inmux + DELAYS.lut_in3 });
    if (allowed.has('span4')) {
      const into = on === 'cell' ? DELAYS.odrv4 : on === 'span4' ? 0 : on === 'span12' ? DELAYS.sp12to4 : undefined;
      if (into !== undefined) out.push({ wire: 'span4', step: 4, cost: into + d4 });
    }
    if (allowed.has('span12')) {
      const into = on === 'cell' ? DELAYS.odrv12 : on === 'span12' ? 0 : undefined;
      if (into !== undefined) out.push({ wire: 'span12', step: 12, cost: into + d12 });
    }
    return out;
  };
  const key = (t: number, on: On) => `${t}:${on}`;
  const dist = new Map<string, number>([[key(0, 'cell'), 0]]);
  const prev = new Map<string, { t: number; on: On; hop?: Hop; repeat?: number }>();
  const open: [number, On][] = [[0, 'cell']];
  const done = new Set<string>();
  let best: { t: number; on: On; d: number } | undefined;
  while (open.length) {
    open.sort((a, b) => dist.get(key(...a))! - dist.get(key(...b))!);
    const [t, on] = open.shift()!;
    const k = key(t, on);
    if (done.has(k)) continue;
    done.add(k);
    const du = dist.get(k)!;
    if (t === distance && on !== 'cell') {
      const total = du + (on === 'neighbour' ? DELAYS.inmux : DELAYS.local + DELAYS.inmux);
      if (!best || total < best.d) best = { t, on, d: total };
    }
    for (const m of moves(on)) {
      for (const dir of m.step === 0 ? [0] : [1, -1]) {
        const nt = t + dir * m.step;
        if (nt < 0 || nt >= width) continue;
        const non: On = m.wire === 'repeat' ? 'cell' : m.wire;
        const nk = key(nt, non);
        const nd = du + m.cost;
        if (nd < (dist.get(nk) ?? Infinity) - 1e-9) {
          dist.set(nk, nd);
          prev.set(nk, m.wire === 'repeat' ? { t, on, repeat: m.cost } : { t, on, hop: { from: t, to: nt, wire: m.wire as Wire, delay: ns(m.cost) } });
          open.push([nt, non]);
        }
      }
    }
  }
  if (!best) throw new Error('no route');
  const hops: Hop[] = [];
  let carry = 0;
  for (let k = key(best.t, best.on); prev.has(k); ) {
    const p = prev.get(k)!;
    if (p.repeat !== undefined) carry += p.repeat;
    else {
      hops.unshift({ ...p.hop!, delay: p.hop!.delay + ns(carry) });
      carry = 0;
    }
    k = key(p.t, p.on);
  }
  return { hops, delay: ns(best.d) };
}
