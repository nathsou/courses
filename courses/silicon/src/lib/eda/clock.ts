/**
 * Clock distribution: three ways of wiring one clock source to many flip-flops, and the delay to each by
 * Elmore's formula for an RC tree. Wires run as rectilinear L shapes (horizontal, then vertical); the network is
 * unbuffered and driven by one driver, which exaggerates the delays but not the differences between them.
 */
import { rng } from './sim';

export interface Point {
  x: number; // µm
  y: number; // µm
}

/** A tree of wires: node 0 is the clock source; every other node hangs from its parent by an L-shaped wire. */
export interface ClockTree {
  nodes: (Point & { parent: number })[];
  /** The node at each flip-flop, in the order of the sinks given. */
  sinkNodes: number[];
}

/** Wire and pin parameters: a mid-level metal layer and a flip-flop's clock input, round illustrative numbers. */
export const CLOCK_WIRE = {
  r: 0.1, // Ω per µm
  c: 0.2e-15, // F per µm
  pin: 1e-15, // F per flip-flop clock pin
  driver: 20, // Ω, the clock driver's output resistance
};

export const manhattan = (a: Point, b: Point) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/** Flip-flops in a regular array, as in a register file or an array of identical processing elements. */
export function grid(per: number, size: number): Point[] {
  return Array.from({ length: per * per }, (_, i) => ({ x: (size * ((i % per) + 0.5)) / per, y: (size * (Math.floor(i / per) + 0.5)) / per }));
}

/** Flip-flops scattered at random over a square block of side `size` µm. */
export function scatter(count: number, size: number, seed: number): Point[] {
  const r = rng(seed);
  return Array.from({ length: count }, () => ({ x: size * (0.04 + 0.92 * r()), y: size * (0.04 + 0.92 * r()) }));
}

/** The least wire: a rectilinear minimum spanning tree over the source and the sinks (Prim's algorithm). */
export function spanningTree(source: Point, sinks: Point[]): ClockTree {
  const pts = [source, ...sinks];
  const inTree = new Array(pts.length).fill(false);
  const best = pts.map((p) => manhattan(p, source));
  const parent = new Array(pts.length).fill(0);
  inTree[0] = true;
  for (let k = 1; k < pts.length; k++) {
    let next = -1;
    for (let i = 1; i < pts.length; i++) if (!inTree[i] && (next < 0 || best[i]! < best[next]!)) next = i;
    inTree[next] = true;
    for (let i = 1; i < pts.length; i++) {
      const d = manhattan(pts[i]!, pts[next]!);
      if (!inTree[i] && d < best[i]!) {
        best[i] = d;
        parent[i] = next;
      }
    }
  }
  return { nodes: pts.map((p, i) => ({ ...p, parent: i === 0 ? -1 : parent[i]! })), sinkNodes: sinks.map((_, i) => i + 1) };
}

/** A spine: a horizontal trunk through the source, with a vertical branch from the trunk to every sink. */
export function spine(source: Point, sinks: Point[]): ClockTree {
  const nodes: ClockTree['nodes'] = [{ ...source, parent: -1 }];
  const sinkNodes = new Array<number>(sinks.length);
  for (const side of [-1, 1]) {
    const order = sinks
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => (side < 0 ? s.x < source.x : s.x >= source.x))
      .sort((a, b) => side * (a.s.x - b.s.x));
    let prev = 0;
    for (const { s, i } of order) {
      nodes.push({ x: s.x, y: source.y, parent: prev });
      prev = nodes.length - 1;
      nodes.push({ ...s, parent: prev });
      sinkNodes[i] = nodes.length - 1;
    }
  }
  return { nodes, sinkNodes };
}

/**
 * An H-tree of `depth` levels centred on the block (4^depth leaves, every one the same wire length from the
 * centre), then a local wire from each sink to its nearest leaf.
 */
export function hTree(size: number, depth: number, sinks: Point[]): ClockTree {
  const nodes: ClockTree['nodes'] = [{ x: size / 2, y: size / 2, parent: -1 }];
  let leaves = [0];
  let w = size / 2;
  for (let level = 0; level < depth; level++) {
    const next: number[] = [];
    for (const c of leaves) {
      const { x, y } = nodes[c]!;
      for (const dx of [-1, 1]) {
        nodes.push({ x: x + (dx * w) / 2, y, parent: c });
        const arm = nodes.length - 1;
        for (const dy of [-1, 1]) {
          nodes.push({ x: x + (dx * w) / 2, y: y + (dy * w) / 2, parent: arm });
          next.push(nodes.length - 1);
        }
      }
    }
    leaves = next;
    w /= 2;
  }
  const sinkNodes = sinks.map((s) => {
    let best = leaves[0]!;
    for (const l of leaves) if (manhattan(nodes[l]!, s) < manhattan(nodes[best]!, s)) best = l;
    nodes.push({ ...s, parent: best });
    return nodes.length - 1;
  });
  return { nodes, sinkNodes };
}

export interface ClockTiming {
  /** Delay from the driver's input to every node, in seconds. */
  delay: number[];
  /** Delay to each sink, in the order of the sinks. */
  arrival: number[];
  skew: number;
  latest: number;
  wire: number; // µm
  capacitance: number; // F
}

/**
 * Elmore delay: each wire is a distributed RC line, and the delay to a node is the sum, over the wires on the
 * way, of each wire's resistance times the capacitance it drives (half its own, plus everything beyond it).
 */
export function clockTiming(tree: ClockTree, p = CLOCK_WIRE): ClockTiming {
  const { nodes } = tree;
  const len = nodes.map((n) => (n.parent < 0 ? 0 : manhattan(n, nodes[n.parent]!)));
  const pins = new Array(nodes.length).fill(0);
  for (const s of tree.sinkNodes) pins[s] += p.pin;
  // Order the nodes from the root outwards, then sum the load below every node on the way back.
  const children = nodes.map(() => [] as number[]);
  nodes.forEach((n, i) => n.parent >= 0 && children[n.parent]!.push(i));
  const order = [0];
  for (let k = 0; k < order.length; k++) order.push(...children[order[k]!]!);
  const below = nodes.map((_, i) => pins[i]);
  for (let k = order.length - 1; k > 0; k--) {
    const i = order[k]!;
    below[nodes[i]!.parent] += below[i] + p.c * len[i]!;
  }
  const total = below[0]!;
  const delay = new Array(nodes.length).fill(0);
  delay[0] = p.driver * total;
  for (const i of order.slice(1)) delay[i] = delay[nodes[i]!.parent] + p.r * len[i]! * ((p.c * len[i]!) / 2 + below[i]);
  const arrival = tree.sinkNodes.map((s) => delay[s]);
  return {
    delay,
    arrival,
    skew: Math.max(...arrival) - Math.min(...arrival),
    latest: Math.max(...arrival),
    wire: len.reduce((a, b) => a + b, 0),
    capacitance: total,
  };
}
