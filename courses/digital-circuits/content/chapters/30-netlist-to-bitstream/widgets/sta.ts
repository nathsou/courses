/**
 * Static timing analysis of a small timing graph, for Figure 30.5: one vertex per signal at a pin, cell edges with
 * fixed delays and net edges whose delays are given separately. A flip-flop is cut in two: its D pin ends a path
 * (with its set-up time) and its Q starts one (after its clock-to-output delay). The critical path is the slowest
 * path from a start to an end, and fmax = 1000 / period (MHz). synth's own analysis of a routed iCE40 design
 * (crates/arch-ice40/src/timing.rs) does the same, over every pin of the chip.
 */

export interface TimingEdge {
  from: number;
  to: number;
  /** Fixed delay, or the connection (index of the sink in `connections`) for net edges (−1 otherwise). */
  delay: number;
  conn: number;
  label: string;
}

export interface Connection {
  net: number;
  sink: number;
}

export interface TimingGraph {
  nv: number;
  edges: TimingEdge[];
  /** Launch delay of start vertices (−1 for others). */
  launch: Float64Array;
  /** Extra delay at endpoints (set-up), −1 for others. */
  capture: Float64Array;
  vertexName: string[];
  connections: Connection[];
  /** First connection index of each net. */
  netConn: Int32Array;
  order: Int32Array;
  cyclic: boolean;
}

export interface PathStep {
  kind: 'launch' | 'cell' | 'net' | 'capture';
  /** Vertex name or net name. */
  name: string;
  delay: number;
  /** Arrival time at the end of this step. */
  arrival: number;
  /** For net steps: the connection. */
  conn: number;
}

export interface TimingResult {
  /** Clock period the design supports, ns (the slowest path). */
  period: number;
  fmaxMHz: number;
  arrival: Float64Array;
  required: Float64Array;
  /** Slack and criticality (1 = critical) of every connection. */
  slack: Float64Array;
  crit: Float64Array;
  path: PathStep[];
  endpoint: string;
}

/** Analyse with the given delay of every connection (ns). */
export function analyse(g: TimingGraph, connDelay: ArrayLike<number>): TimingResult {
  const { nv, edges } = g;
  const arrival = new Float64Array(nv).fill(-Infinity);
  const from = new Int32Array(nv).fill(-1);
  for (let i = 0; i < nv; i++) if (g.launch[i]! >= 0) arrival[i] = g.launch[i]!;
  // Edges by target, in topological order of the target.
  const inStart = new Int32Array(nv + 1);
  for (const e of edges) inStart[e.to + 1]!++;
  for (let i = 0; i < nv; i++) inStart[i + 1] = inStart[i + 1]! + inStart[i]!;
  const inEdges = new Int32Array(edges.length);
  const fill = inStart.slice(0, nv);
  edges.forEach((e, i) => (inEdges[fill[e.to]!++] = i));
  const delayOf = (e: TimingEdge) => (e.conn >= 0 ? (connDelay[e.conn] ?? 0) : e.delay);
  for (const x of g.order) {
    let a = arrival[x]!;
    for (let k = inStart[x]!; k < inStart[x + 1]!; k++) {
      const e = edges[inEdges[k]!]!;
      const t = arrival[e.from]! + delayOf(e);
      if (t > a) {
        a = t;
        from[x] = inEdges[k]!;
      }
    }
    arrival[x] = a;
  }
  let period = 0;
  let worst = -1;
  for (let i = 0; i < nv; i++) {
    if (g.capture[i]! >= 0 && arrival[i]! > -Infinity) {
      const t = arrival[i]! + g.capture[i]!;
      if (t > period) {
        period = t;
        worst = i;
      }
    }
  }
  // Required times.
  const required = new Float64Array(nv).fill(Infinity);
  for (let i = 0; i < nv; i++) if (g.capture[i]! >= 0) required[i] = period - g.capture[i]!;
  for (let oi = g.order.length - 1; oi >= 0; oi--) {
    const x = g.order[oi]!;
    for (let k = inStart[x]!; k < inStart[x + 1]!; k++) {
      const e = edges[inEdges[k]!]!;
      const t = required[x]! - delayOf(e);
      if (t < required[e.from]!) required[e.from] = t;
    }
  }
  const slack = new Float64Array(g.connections.length);
  const crit = new Float64Array(g.connections.length);
  for (const e of edges) {
    if (e.conn < 0) continue;
    const s = required[e.to]! - arrival[e.from]! - delayOf(e);
    slack[e.conn] = Number.isFinite(s) ? s : period;
    crit[e.conn] = period > 0 ? Math.min(1, Math.max(0, 1 - slack[e.conn]! / period)) : 0;
  }
  // Critical path.
  const path: PathStep[] = [];
  if (worst >= 0) {
    const rev: PathStep[] = [{ kind: 'capture', name: g.vertexName[worst]!, delay: g.capture[worst]!, arrival: period, conn: -1 }];
    let x = worst;
    while (from[x]! >= 0) {
      const e = edges[from[x]!]!;
      rev.push({ kind: e.conn >= 0 ? 'net' : 'cell', name: e.label, delay: delayOf(e), arrival: arrival[x]!, conn: e.conn });
      x = e.from;
    }
    rev.push({ kind: 'launch', name: g.vertexName[x]!, delay: g.launch[x]! >= 0 ? g.launch[x]! : 0, arrival: g.launch[x]! >= 0 ? g.launch[x]! : 0, conn: -1 });
    path.push(...rev.reverse());
  }
  return { period, fmaxMHz: period > 0 ? 1000 / period : Infinity, arrival, required, slack, crit, path, endpoint: worst >= 0 ? g.vertexName[worst]! : '' };
}
