/**
 * Placement in rows of standard cells. Each row is an ordered list of cells packed from the left; the cost is the
 * total half-perimeter wirelength (HPWL) of the nets, the usual stand-in for routed length. Simulated annealing
 * improves a placement by random swaps and moves, accepting some that make it worse while the "temperature" is
 * high, so as not to get stuck.
 */
import { rng } from './sim';
import { DFF, cellByName, type Netlist } from './techmap';

export interface PlaceCell {
  id: string;
  label: string;
  width: number;
}

export interface PlaceNet {
  name: string;
  /** Cell ids and fixed pin ids on this net. */
  pins: string[];
}

export interface IoPin {
  id: string;
  x: number;
  y: number;
  side: 'left' | 'right';
}

export interface Problem {
  cells: PlaceCell[];
  nets: PlaceNet[];
  io: IoPin[];
  rows: number;
  sites: number;
  /** Height of a row in site widths. */
  rowHeight: number;
}

export type Placement = string[][];

/** A placement problem from a mapped netlist: cells, flip-flops, nets and I/O pins at the left and right edges. */
export function problemFrom(nl: Netlist, rows = 4, utilisation = 0.8): Problem {
  const cells: PlaceCell[] = [
    ...nl.instances.map((i) => ({ id: i.id, label: i.cell, width: cellByName(i.cell)!.width })),
    ...nl.flops.map((f) => ({ id: f.id, label: 'DFF', width: DFF.width })),
  ];
  const total = cells.reduce((s, c) => s + c.width, 0);
  const sites = Math.ceil(total / rows / utilisation);
  const rowHeight = 6;
  const pins = new Map<string, string[]>();
  const on = (net: string, id: string) => {
    if (net === '0' || net === '1') return;
    if (!pins.has(net)) pins.set(net, []);
    pins.get(net)!.push(id);
  };
  for (const i of nl.instances) {
    on(i.out, i.id);
    for (const n of i.ins) on(n, i.id);
  }
  for (const f of nl.flops) {
    on(f.d, f.id);
    on(f.q, f.id);
  }
  const H = rows * rowHeight;
  const io: IoPin[] = [
    ...nl.inputs.map((n, k) => ({ id: `in:${n}`, x: -2, y: ((k + 1) * H) / (nl.inputs.length + 1), side: 'left' as const })),
    ...nl.outputs.map((o, k) => ({ id: `out:${o.name}`, x: sites + 2, y: ((k + 1) * H) / (nl.outputs.length + 1), side: 'right' as const })),
  ];
  for (const n of nl.inputs) on(n, `in:${n}`);
  for (const o of nl.outputs) on(o.net, `out:${o.name}`);
  const nets = [...pins.entries()].filter(([, p]) => p.length > 1).map(([name, p]) => ({ name, pins: [...new Set(p)] }));
  return { cells, nets, io, rows, sites, rowHeight };
}

export function rowWidth(p: Problem, row: string[]): number {
  const w = new Map(p.cells.map((c) => [c.id, c.width]));
  return row.reduce((s, id) => s + w.get(id)!, 0);
}

/** Centre of every cell and pin, in site units (x) and site units (y, rows stacked). */
export function positions(p: Problem, pl: Placement): Map<string, { x: number; y: number; w: number; row: number }> {
  const w = new Map(p.cells.map((c) => [c.id, c.width]));
  const out = new Map<string, { x: number; y: number; w: number; row: number }>();
  pl.forEach((row, r) => {
    let x = 0;
    for (const id of row) {
      const cw = w.get(id)!;
      out.set(id, { x: x + cw / 2, y: (r + 0.5) * p.rowHeight, w: cw, row: r });
      x += cw;
    }
  });
  for (const pin of p.io) out.set(pin.id, { x: pin.x, y: pin.y, w: 0, row: -1 });
  return out;
}

export function netHpwl(pos: ReturnType<typeof positions>, net: PlaceNet): number {
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const id of net.pins) {
    const q = pos.get(id)!;
    x0 = Math.min(x0, q.x);
    x1 = Math.max(x1, q.x);
    y0 = Math.min(y0, q.y);
    y1 = Math.max(y1, q.y);
  }
  return x1 - x0 + (y1 - y0);
}

export function hpwl(p: Problem, pl: Placement): number {
  const pos = positions(p, pl);
  return p.nets.reduce((s, n) => s + netHpwl(pos, n), 0);
}

/** A random legal placement: cells dealt to rows with room, in random order. */
export function randomPlacement(p: Problem, seed = 1): Placement {
  const r = rng(seed);
  const order = [...p.cells].sort(() => r() - 0.5);
  const rows: Placement = Array.from({ length: p.rows }, () => []);
  for (const c of order) {
    const options = rows.map((row, i) => i).filter((i) => rowWidth(p, rows[i]!) + c.width <= p.sites);
    const i = options[Math.floor(r() * options.length)] ?? 0;
    rows[i]!.push(c.id);
  }
  return rows;
}

export interface AnnealStep {
  placement: Placement;
  cost: number;
  temperature: number;
  accepted: number;
  tried: number;
}

/**
 * Simulated annealing. Yields the state after every batch of moves, so a widget can animate it; the final state is
 * the best placement found.
 */
export function* anneal(p: Problem, start: Placement, opts: { seed?: number; batches?: number; movesPerBatch?: number; t0?: number; cooling?: number } = {}): Generator<AnnealStep> {
  const r = rng(opts.seed ?? 7);
  const batches = opts.batches ?? 120;
  const per = opts.movesPerBatch ?? p.cells.length * 8;
  let temperature = opts.t0 ?? 20;
  const cooling = opts.cooling ?? 0.95;
  let cur = start.map((row) => [...row]);
  let cost = hpwl(p, cur);
  let best = cur.map((row) => [...row]);
  let bestCost = cost;
  const ids = p.cells.map((c) => c.id);
  for (let b = 0; b < batches; b++) {
    let accepted = 0;
    for (let m = 0; m < per; m++) {
      const next = cur.map((row) => [...row]);
      const a = ids[Math.floor(r() * ids.length)]!;
      const ra = next.findIndex((row) => row.includes(a));
      const ia = next[ra]!.indexOf(a);
      if (r() < 0.6) {
        const z = ids[Math.floor(r() * ids.length)]!;
        if (z === a) continue;
        const rz = next.findIndex((row) => row.includes(z));
        const iz = next[rz]!.indexOf(z);
        next[ra]![ia] = z;
        next[rz]![iz] = a;
      } else {
        const rt = Math.floor(r() * p.rows);
        next[ra]!.splice(ia, 1);
        const it = Math.floor(r() * (next[rt]!.length + 1));
        next[rt]!.splice(it, 0, a);
      }
      if (next.some((row) => rowWidth(p, row) > p.sites)) continue;
      const c = hpwl(p, next);
      if (c <= cost || r() < Math.exp((cost - c) / temperature)) {
        cur = next;
        cost = c;
        accepted++;
        if (c < bestCost) {
          best = next.map((row) => [...row]);
          bestCost = c;
        }
      }
    }
    temperature *= cooling;
    yield { placement: b === batches - 1 ? best : cur, cost: b === batches - 1 ? bestCost : cost, temperature, accepted, tried: per };
  }
}

/** Run annealing to the end. */
export function annealAll(p: Problem, start: Placement, opts: Parameters<typeof anneal>[2] = {}): AnnealStep {
  let last: AnnealStep | undefined;
  for (const s of anneal(p, start, opts)) last = s;
  return last!;
}
