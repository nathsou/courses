/**
 * Static timing analysis of a mapped netlist. Every path starts at a primary input or a flip-flop's output and
 * ends at a flip-flop's input or a primary output. Arrival times propagate forwards (latest for setup, earliest
 * for hold), required times backwards; slack = required − arrival. A cell's delay is its intrinsic delay plus a
 * term for the capacitance it drives, divided by its size: upsizing a cell speeds it up but loads its driver.
 */
import { DFF, LOAD_DELAY, cellByName, type Netlist } from './techmap';

export interface TimingOptions {
  /** Clock period, ps. */
  period: number;
  /** Arrival time of primary inputs after the clock edge, ps. */
  inputDelay?: number;
  /** Time the outside world needs from primary outputs before the next edge, ps. */
  outputDelay?: number;
  /** Load of a primary output, in units of an inverter's input. */
  outputLoad?: number;
  /** Drive strength of each instance (1 = the library's size). */
  sizes?: Record<string, number>;
  /** Clock arrival at each flip-flop relative to the ideal edge (skew), ps. */
  skew?: Record<string, number>;
}

export interface Endpoint {
  name: string;
  kind: 'flop' | 'output';
  arrival: number;
  required: number;
  slack: number;
  /** Earliest arrival and hold slack (flip-flops only). */
  early?: number;
  holdSlack?: number;
}

export interface TimingResult {
  arrival: Map<string, number>;
  early: Map<string, number>;
  required: Map<string, number>;
  /** Delay of each instance, ps. */
  delay: Map<string, number>;
  endpoints: Endpoint[];
  worst: Endpoint;
  /** Nets along the worst path, from its start point to its end point. */
  critical: string[];
  /** Instances along the worst path. */
  criticalCells: string[];
  /** Shortest clock period with no negative slack (ignoring I/O constraints only if there are none). */
  minPeriod: number;
  worstHold: number;
}

export function loads(nl: Netlist, opts: TimingOptions): Map<string, number> {
  const size = (id: string) => opts.sizes?.[id] ?? 1;
  const load = new Map<string, number>();
  const add = (net: string, c: number) => load.set(net, (load.get(net) ?? 0) + c);
  for (const i of nl.instances) for (const n of i.ins) add(n, cellByName(i.cell)!.cin * size(i.id));
  for (const f of nl.flops) add(f.d, DFF.cin);
  for (const o of nl.outputs) add(o.net, opts.outputLoad ?? 2);
  return load;
}

export function analyse(nl: Netlist, opts: TimingOptions): TimingResult {
  const size = (id: string) => opts.sizes?.[id] ?? 1;
  const skew = (id: string) => opts.skew?.[id] ?? 0;
  const load = loads(nl, opts);
  const arrival = new Map<string, number>();
  const early = new Map<string, number>();
  const from = new Map<string, { inst?: string; net?: string }>();
  for (const n of nl.inputs) {
    arrival.set(n, opts.inputDelay ?? 0);
    early.set(n, opts.inputDelay ?? 0);
  }
  for (const f of nl.flops) {
    const t = skew(f.id) + DFF.clkToQ;
    arrival.set(f.q, t);
    early.set(f.q, t);
    from.set(f.q, { inst: f.id });
  }
  for (const c of ['0', '1']) {
    arrival.set(c, -Infinity);
    early.set(c, Infinity);
  }
  const delay = new Map<string, number>();
  for (const i of nl.instances) {
    const cell = cellByName(i.cell)!;
    const d = cell.delay + (LOAD_DELAY * (load.get(i.out) ?? 0)) / size(i.id);
    delay.set(i.id, d);
    let worstIn = -Infinity;
    let worstNet: string | undefined;
    let bestIn = Infinity;
    for (const n of i.ins) {
      const a = arrival.get(n) ?? 0;
      if (a > worstIn) {
        worstIn = a;
        worstNet = n;
      }
      bestIn = Math.min(bestIn, early.get(n) ?? 0);
    }
    arrival.set(i.out, (worstIn === -Infinity ? 0 : worstIn) + d);
    early.set(i.out, (bestIn === Infinity ? 0 : bestIn) + d);
    from.set(i.out, { inst: i.id, net: worstNet });
  }
  const endpoints: Endpoint[] = [];
  const required = new Map<string, number>();
  const need = (net: string, t: number) => required.set(net, Math.min(required.get(net) ?? Infinity, t));
  for (const f of nl.flops) {
    const req = opts.period + skew(f.id) - DFF.setup;
    const a = arrival.get(f.d) ?? 0;
    const e = early.get(f.d) ?? 0;
    need(f.d, req);
    endpoints.push({ name: f.id, kind: 'flop', arrival: a, required: req, slack: req - a, early: e, holdSlack: e - (skew(f.id) + DFF.hold) });
  }
  for (const o of nl.outputs) {
    if (o.net === '0' || o.net === '1') continue;
    const req = opts.period - (opts.outputDelay ?? 0);
    const a = arrival.get(o.net) ?? 0;
    need(o.net, req);
    endpoints.push({ name: o.name, kind: 'output', arrival: a, required: req, slack: req - a });
  }
  for (const i of [...nl.instances].reverse()) {
    const r = required.get(i.out);
    if (r === undefined) continue;
    for (const n of i.ins) need(n, r - delay.get(i.id)!);
  }
  const worst = endpoints.reduce((w, e) => (e.slack < w.slack ? e : w));
  // Trace the worst path back from its end point.
  const critical: string[] = [];
  const criticalCells: string[] = [];
  let net: string | undefined = worst.kind === 'flop' ? nl.flops.find((f) => f.id === worst.name)!.d : nl.outputs.find((o) => o.name === worst.name)!.net;
  while (net) {
    critical.unshift(net);
    const f = from.get(net);
    if (!f) break;
    if (f.inst) criticalCells.unshift(f.inst);
    net = f.net;
  }
  const flopEnds = endpoints.filter((e) => e.kind === 'flop');
  const minPeriod = Math.max(...endpoints.map((e) => opts.period - e.slack));
  const worstHold = flopEnds.length ? Math.min(...flopEnds.map((e) => e.holdSlack!)) : Infinity;
  return { arrival, early, required, delay, endpoints, worst, critical, criticalCells, minPeriod, worstHold };
}
