/**
 * Maze routing (Lee's algorithm, with costs: Dijkstra) on a grid with two metal layers. Metal 1 prefers
 * horizontal wires and metal 2 vertical ones: going against a layer's preferred direction costs more, and a via
 * between layers costs more still. Nets are routed one at a time; each one's wires become obstacles for the
 * next, so the order matters. A multi-pin net grows from its first pin, connecting the nearest unconnected pin
 * to everything already connected.
 */

export interface Cell3 {
  x: number;
  y: number;
  z: 0 | 1;
}

export interface RouteGrid {
  w: number;
  h: number;
  /** Blocked cells, "x,y,z". */
  blocked: Set<string>;
  /** Metal layers available (default 2). With one, wires cannot cross. */
  layers?: 1 | 2;
}

export interface RouteNet {
  name: string;
  pins: [number, number][];
}

export const COSTS = { preferred: 1, against: 3, via: 2 };

export const key = (c: Cell3) => `${c.x},${c.y},${c.z}`;

export interface Wavefront {
  /** Every cell reached, with its cost from the sources, in the order reached. */
  reached: { c: Cell3; d: number }[];
  path: Cell3[] | null;
}

/** Cheapest path from any source cell to the target pin (either layer), avoiding blocked and occupied cells. */
export function search(g: RouteGrid, occupied: Set<string>, sources: Cell3[], target: [number, number], costs = COSTS): Wavefront {
  const dist = new Map<string, number>();
  const prev = new Map<string, Cell3>();
  const reached: { c: Cell3; d: number }[] = [];
  // A small binary heap keyed on distance.
  const heap: { c: Cell3; d: number }[] = [];
  const push = (c: Cell3, d: number) => {
    heap.push({ c, d });
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p]!.d <= heap[i]!.d) break;
      [heap[p], heap[i]] = [heap[i]!, heap[p]!];
      i = p;
    }
  };
  const pop = () => {
    const top = heap[0]!;
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < heap.length && heap[l]!.d < heap[m]!.d) m = l;
        if (r < heap.length && heap[r]!.d < heap[m]!.d) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i]!, heap[m]!];
        i = m;
      }
    }
    return top;
  };
  for (const s of sources) {
    dist.set(key(s), 0);
    push(s, 0);
  }
  const layers = g.layers ?? 2;
  const free = (c: Cell3) => c.x >= 0 && c.y >= 0 && c.x < g.w && c.y < g.h && c.z < layers && !g.blocked.has(key(c)) && !occupied.has(key(c));
  while (heap.length) {
    const { c, d } = pop();
    if (d > (dist.get(key(c)) ?? Infinity)) continue;
    reached.push({ c, d });
    if (c.x === target[0] && c.y === target[1]) {
      const path = [c];
      for (let p = prev.get(key(c)); p; p = prev.get(key(p))) path.unshift(p);
      return { reached, path };
    }
    const steps: [Cell3, number][] = [
      [{ x: c.x + 1, y: c.y, z: c.z }, c.z === 0 ? costs.preferred : costs.against],
      [{ x: c.x - 1, y: c.y, z: c.z }, c.z === 0 ? costs.preferred : costs.against],
      [{ x: c.x, y: c.y + 1, z: c.z }, c.z === 1 ? costs.preferred : costs.against],
      [{ x: c.x, y: c.y - 1, z: c.z }, c.z === 1 ? costs.preferred : costs.against],
      [{ x: c.x, y: c.y, z: (1 - c.z) as 0 | 1 }, costs.via],
    ];
    for (const [n, w] of steps) {
      const isTarget = n.x === target[0] && n.y === target[1] && n.z < layers;
      if (!isTarget && !free(n)) continue;
      if (isTarget && g.blocked.has(key(n))) continue;
      const nd = d + w;
      if (nd < (dist.get(key(n)) ?? Infinity)) {
        dist.set(key(n), nd);
        prev.set(key(n), c);
        push(n, nd);
      }
    }
  }
  return { reached, path: null };
}

export interface Routed {
  routes: Map<string, Cell3[]>;
  failed: string[];
  /** Total cost of the wires laid. */
  length: number;
  vias: number;
}

/** Cells a pin occupies (both layers: a pin is a stack of contacts). */
const pinCells = (x: number, y: number, layers: 1 | 2 = 2): Cell3[] =>
  layers === 1
    ? [{ x, y, z: 0 }]
    : [
        { x, y, z: 0 },
        { x, y, z: 1 },
      ];

/** Route nets in the given order. */
export function routeAll(g: RouteGrid, nets: RouteNet[], costs = COSTS): Routed {
  const occupied = new Set<string>();
  const owner = new Map<string, string>();
  // Every net's pins are reserved from the start, so no other net may run over them.
  for (const n of nets) for (const [x, y] of n.pins) for (const c of pinCells(x, y, g.layers)) owner.set(key(c), n.name);
  for (const k of owner.keys()) occupied.add(k);
  const routes = new Map<string, Cell3[]>();
  const failed: string[] = [];
  let length = 0;
  let vias = 0;
  for (const n of nets) {
    const mine = new Set(n.pins.flatMap(([x, y]) => pinCells(x, y, g.layers).map(key)));
    const blocked = new Set([...occupied].filter((k) => !mine.has(k)));
    const tree: Cell3[] = pinCells(...n.pins[0]!, g.layers);
    const left = n.pins.slice(1);
    let ok = true;
    while (left.length) {
      // Connect the pin closest (in Manhattan distance) to the tree so far.
      left.sort((a, b) => Math.min(...tree.map((t) => Math.abs(t.x - a[0]) + Math.abs(t.y - a[1]))) - Math.min(...tree.map((t) => Math.abs(t.x - b[0]) + Math.abs(t.y - b[1]))));
      const target = left.shift()!;
      const r = search(g, blocked, tree, target, costs);
      if (!r.path) {
        ok = false;
        break;
      }
      for (let i = 1; i < r.path.length; i++) {
        const a = r.path[i - 1]!;
        const b = r.path[i]!;
        length += a.z !== b.z ? 0 : 1;
        vias += a.z !== b.z ? 1 : 0;
      }
      tree.push(...r.path, ...pinCells(...target, g.layers));
    }
    if (!ok) failed.push(n.name);
    const uniq = [...new Map(tree.map((c) => [key(c), c])).values()];
    routes.set(n.name, uniq);
    for (const c of uniq) occupied.add(key(c));
  }
  return { routes, failed, length, vias };
}
