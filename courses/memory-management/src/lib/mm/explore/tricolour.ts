/**
 * A tiny model of incremental marking (PLAN §8, chapter 25): a few objects with two pointer fields each, root
 * variables, and the three colours. The collector and the mutator take turns in any order; the mutator's writes
 * to fields go through a write barrier. `explore` tries every interleaving, up to a bound on the mutator's moves,
 * and reports whether the collector can ever finish with an object that is reachable but still white: a lost
 * object, which the sweep would free while the program can still use it.
 */
export type Colour = 'white' | 'grey' | 'black';
export type Ref = number | null;

export interface Model {
  /** fields[o][f]: the object field f of object o points to, or null. */
  fields: Ref[][];
  roots: Ref[];
  colour: Colour[];
}

export interface BarrierApi {
  colour(o: number): Colour;
  /** White to grey (does nothing to grey or black objects). */
  shade(o: number): void;
  /** Black back to grey, to be scanned again. */
  regrey(o: number): void;
}

/** Called on every write `holder.field = value` while marking is in progress; `old` is the value overwritten. */
export type BarrierFn = (api: BarrierApi, holder: number, old: Ref, value: Ref) => void;

export const BARRIERS: Record<string, { label: string; fn: BarrierFn }> = {
  none: { label: 'No barrier', fn: () => {} },
  dijkstra: { label: 'Insertion (Dijkstra)', fn: (api, _h, _old, value) => value !== null && api.shade(value) },
  steele: { label: 'Insertion (Steele)', fn: (api, h, _old, value) => value !== null && api.colour(h) === 'black' && api.colour(value) === 'white' && api.regrey(h) },
  yuasa: { label: 'Deletion (Yuasa)', fn: (api, _h, old) => old !== null && api.shade(old) },
};

export function clone(m: Model): Model {
  return { fields: m.fields.map((f) => [...f]), roots: [...m.roots], colour: [...m.colour] };
}

export function reachable(m: Model): Set<number> {
  const seen = new Set<number>();
  const work = m.roots.filter((r): r is number => r !== null);
  while (work.length) {
    const o = work.pop()!;
    if (seen.has(o)) continue;
    seen.add(o);
    for (const c of m.fields[o]!) if (c !== null) work.push(c);
  }
  return seen;
}

function api(m: Model): BarrierApi {
  return {
    colour: (o) => m.colour[o]!,
    shade: (o) => {
      if (m.colour[o] === 'white') m.colour[o] = 'grey';
    },
    regrey: (o) => {
      if (m.colour[o] === 'black') m.colour[o] = 'grey';
    },
  };
}

/** Start a collection: everything white, the roots' targets grey. */
export function start(m: Model): Model {
  const n = clone(m);
  n.colour = n.colour.map(() => 'white');
  for (const r of n.roots) if (r !== null) n.colour[r] = 'grey';
  return n;
}

/** The collector scans one grey object: its children turn grey, it turns black. */
export function scan(m: Model, o: number): Model {
  const n = clone(m);
  for (const c of n.fields[o]!) if (c !== null && n.colour[c] === 'white') n.colour[c] = 'grey';
  n.colour[o] = 'black';
  return n;
}

/** The mutator writes `holder.field = value`, through the barrier. */
export function write(m: Model, holder: number, field: number, value: Ref, barrier: BarrierFn): Model {
  const n = clone(m);
  const old = n.fields[holder]![field]!;
  barrier(api(n), holder, old, value);
  n.fields[holder]![field] = value;
  return n;
}

/** The mutator writes a root variable (roots are not barriered; the collector rescans them at the end). */
export function writeRoot(m: Model, r: number, value: Ref): Model {
  const n = clone(m);
  n.roots[r] = value;
  return n;
}

/** Finish: rescan the roots, drain the grey objects, and return the objects that are reachable but white. */
export function finish(m: Model): { model: Model; lost: number[] } {
  let n = clone(m);
  for (const r of n.roots) if (r !== null && n.colour[r] === 'white') n.colour[r] = 'grey';
  for (;;) {
    const g = n.colour.indexOf('grey');
    if (g < 0) break;
    n = scan(n, g);
  }
  const reach = reachable(n);
  return { model: n, lost: [...reach].filter((o) => n.colour[o] === 'white') };
}

export type Step = { kind: 'scan'; o: number } | { kind: 'write'; holder: number; field: number; value: Ref } | { kind: 'root'; r: number; value: Ref };

export interface ExploreResult {
  states: number;
  /** The shortest sequence of steps that loses an object, if there is one. */
  counterexample?: { steps: Step[]; lost: number[] };
}

/**
 * Every interleaving of collector scans and mutator writes, breadth first, with at most `moves` mutator writes.
 * The collector finishes as soon as no object is grey. The mutator can only write pointers it can reach.
 */
export function explore(initial: Model, barrier: BarrierFn, moves = 3, maxStates = 200_000): ExploreResult {
  type Node = { m: Model; left: number; steps: Step[] };
  const key = (n: Node) => `${n.left}|${n.m.roots.join(',')}|${n.m.fields.map((f) => f.join(',')).join(';')}|${n.m.colour.join(',')}`;
  const first: Node = { m: start(initial), left: moves, steps: [] };
  const seen = new Set([key(first)]);
  const queue: Node[] = [first];
  while (queue.length && seen.size < maxStates) {
    const cur = queue.shift()!;
    const greys = cur.m.colour.flatMap((c, i) => (c === 'grey' ? [i] : []));
    if (!greys.length) {
      const { lost } = finish(cur.m);
      if (lost.length) return { states: seen.size, counterexample: { steps: cur.steps, lost } };
      continue;
    }
    const next: Node[] = greys.map((g) => ({ m: scan(cur.m, g), left: cur.left, steps: [...cur.steps, { kind: 'scan', o: g } as Step] }));
    if (cur.left > 0) {
      const reach = reachable(cur.m);
      const values: Ref[] = [null, ...reach];
      for (const h of reach) {
        cur.m.fields[h]!.forEach((old, f) => {
          for (const v of values) if (v !== old) next.push({ m: write(cur.m, h, f, v, barrier), left: cur.left - 1, steps: [...cur.steps, { kind: 'write', holder: h, field: f, value: v }] });
        });
      }
      cur.m.roots.forEach((old, r) => {
        for (const v of values) if (v !== old) next.push({ m: writeRoot(cur.m, r, v), left: cur.left - 1, steps: [...cur.steps, { kind: 'root', r, value: v }] });
      });
    }
    for (const n of next) {
      const k = key(n);
      if (!seen.has(k)) {
        seen.add(k);
        queue.push(n);
      }
    }
  }
  return { states: seen.size };
}

/** Small starting heaps for the explorer: a chain, a fan, and a chain closed into a cycle. */
export const SMALL_HEAPS: { name: string; model: Model }[] = [
  { name: 'a chain', model: { roots: [0, null], fields: [[1, null], [2, null], [null, null]], colour: ['white', 'white', 'white'] } },
  { name: 'a fan', model: { roots: [0, null], fields: [[1, 2], [null, null], [null, null]], colour: ['white', 'white', 'white'] } },
  { name: 'a cycle', model: { roots: [0, null], fields: [[1, null], [2, null], [0, null]], colour: ['white', 'white', 'white'] } },
];
