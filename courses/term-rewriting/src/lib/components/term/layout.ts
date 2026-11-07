/** Layouts for drawing terms as trees and relations as layered graphs. Pure functions, no DOM. */
import type { Position, Term } from '$lib/trs/term';

export interface TreeNode {
  term: Term;
  pos: Position;
  label: string;
  x: number;
  y: number;
  isVar: boolean;
  parent?: number;
}

/** A simple tidy layout: leaves left to right, parents centred over their children. Units: x in leaf slots, y in levels. */
export function layoutTree(t: Term, label: (t: Term) => string = (u) => u.name): { nodes: TreeNode[]; width: number; height: number } {
  const nodes: TreeNode[] = [];
  let leaf = 0;
  let maxDepth = 0;
  const go = (u: Term, pos: number[], depth: number, parent?: number): number => {
    const i = nodes.length;
    nodes.push({ term: u, pos, label: label(u), x: 0, y: depth, isVar: u.type === 'var', parent });
    maxDepth = Math.max(maxDepth, depth);
    if (u.type === 'var' || u.args.length === 0) {
      nodes[i]!.x = leaf++;
    } else {
      const xs = u.args.map((a, k) => nodes[go(a, [...pos, k], depth + 1, i)]!.x);
      nodes[i]!.x = (xs[0]! + xs.at(-1)!) / 2;
    }
    return i;
  };
  go(t, [], 0);
  return { nodes, width: Math.max(1, leaf), height: maxDepth + 1 };
}

export interface GraphLayout {
  x: number[];
  y: number[];
  layers: number;
  width: number;
}

/**
 * A layered layout for a directed graph explored from node 0: layer = BFS distance, then a few
 * barycentre sweeps to reduce crossings.
 */
export function layoutLayers(n: number, edges: readonly { from: number; to: number }[]): GraphLayout {
  const layer = new Array<number>(n).fill(-1);
  if (n) layer[0] = 0;
  const queue = n ? [0] : [];
  const out = Array.from({ length: n }, () => [] as number[]);
  const inc = Array.from({ length: n }, () => [] as number[]);
  for (const e of edges) {
    out[e.from]!.push(e.to);
    inc[e.to]!.push(e.from);
  }
  while (queue.length) {
    const u = queue.shift()!;
    for (const w of out[u]!) if (layer[w] === -1) (layer[w] = layer[u]! + 1, queue.push(w));
  }
  for (let i = 0; i < n; i++) if (layer[i] === -1) layer[i] = 0;
  const layers = Math.max(0, ...layer) + 1;
  const rows: number[][] = Array.from({ length: layers }, () => []);
  for (let i = 0; i < n; i++) rows[layer[i]!]!.push(i);
  const order = new Array<number>(n).fill(0);
  rows.forEach((r) => r.forEach((u, k) => (order[u] = k)));
  for (let sweep = 0; sweep < 4; sweep++) {
    for (let l = 1; l < layers; l++) {
      const r = rows[l]!;
      const bary = (u: number) => {
        const ps = inc[u]!.filter((p) => layer[p]! < l);
        return ps.length ? ps.reduce((a, p) => a + order[p]!, 0) / ps.length : order[u]!;
      };
      r.sort((a, b) => bary(a) - bary(b));
      r.forEach((u, k) => (order[u] = k));
    }
  }
  const width = Math.max(1, ...rows.map((r) => r.length));
  const x = new Array<number>(n).fill(0), y = new Array<number>(n).fill(0);
  rows.forEach((r, l) => r.forEach((u, k) => ((x[u] = (k + 0.5) * (width / r.length)), (y[u] = l))));
  return { x, y, layers, width };
}

/** Lay out nodes on a circle (for small relations drawn by the reader). */
export function layoutCircle(n: number): { x: number[]; y: number[] } {
  const x: number[] = [], y: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / Math.max(1, n);
    x.push(Math.cos(a));
    y.push(Math.sin(a));
  }
  return { x, y };
}
