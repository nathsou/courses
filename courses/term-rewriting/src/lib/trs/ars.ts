/**
 * Abstract reduction systems on finitely many objects: a set of nodes and a relation →.
 * Decides the classic properties by graph search.
 */

export interface ARS {
  /** Node labels; nodes are their indices. */
  labels: string[];
  edges: [number, number][];
}

/** Parse "a -> b, b -> c, c -> a" (or one edge per line). */
export function parseARS(src: string): ARS {
  const labels: string[] = [];
  const id = (s: string) => {
    const k = labels.indexOf(s);
    if (k >= 0) return k;
    labels.push(s);
    return labels.length - 1;
  };
  const edges: [number, number][] = [];
  for (const part of src.split(/[\n,;]+/)) {
    const p = part.trim();
    if (!p) continue;
    const chain = p.split(/->|→/).map((s) => s.trim());
    if (chain.length === 1) {
      id(chain[0]!);
      continue;
    }
    for (let i = 0; i + 1 < chain.length; i++) {
      if (!chain[i] || !chain[i + 1]) throw new Error(`cannot read “${p}”`);
      edges.push([id(chain[i]!), id(chain[i + 1]!)]);
    }
  }
  return { labels, edges };
}

export const successors = (a: ARS, x: number): number[] => a.edges.filter(([s]) => s === x).map(([, t]) => t);

/** Everything reachable from x in zero or more steps (→*). */
export function reachable(a: ARS, x: number): Set<number> {
  const seen = new Set([x]);
  const stack = [x];
  while (stack.length) for (const y of successors(a, stack.pop()!)) if (!seen.has(y)) (seen.add(y), stack.push(y));
  return seen;
}

export const normalForms = (a: ARS): number[] => a.labels.map((_, i) => i).filter((i) => successors(a, i).length === 0);

export interface ARSProperties {
  terminating: boolean;
  /** Every element has a normal form. */
  weaklyNormalising: boolean;
  confluent: boolean;
  locallyConfluent: boolean;
  /** No element reduces to two distinct normal forms. */
  uniqueNormalForms: boolean;
  /** A node on a cycle, if not terminating. */
  cycle?: number[];
  /** A counterexample to confluence: x →* y, x →* z with no common reduct. */
  peak?: [number, number, number];
  /** A counterexample to local confluence (one-step peak). */
  localPeak?: [number, number, number];
}

function findCycle(a: ARS): number[] | undefined {
  const colour = new Map<number, 0 | 1 | 2>();
  const stack: number[] = [];
  let found: number[] | undefined;
  const dfs = (x: number): boolean => {
    colour.set(x, 1);
    stack.push(x);
    for (const y of successors(a, x)) {
      if (colour.get(y) === 1) {
        found = [...stack.slice(stack.indexOf(y)), y];
        return true;
      }
      if (!colour.get(y) && dfs(y)) return true;
    }
    stack.pop();
    colour.set(x, 2);
    return false;
  };
  for (let i = 0; i < a.labels.length; i++) if (!colour.get(i) && dfs(i)) return found;
  return undefined;
}

const joinable = (a: ARS, y: number, z: number): boolean => {
  const ry = reachable(a, y);
  for (const w of reachable(a, z)) if (ry.has(w)) return true;
  return false;
};

export function properties(a: ARS): ARSProperties {
  const n = a.labels.length;
  const cycle = findCycle(a);
  const nfs = new Set(normalForms(a));
  let weaklyNormalising = true, uniqueNormalForms = true;
  let peak: [number, number, number] | undefined, localPeak: [number, number, number] | undefined;
  for (let x = 0; x < n; x++) {
    const r = [...reachable(a, x)];
    const myNfs = r.filter((y) => nfs.has(y));
    if (myNfs.length === 0) weaklyNormalising = false;
    if (myNfs.length > 1) uniqueNormalForms = false;
    if (!peak)
      outer: for (const y of r)
        for (const z of r)
          if (y < z && !joinable(a, y, z)) {
            peak = [x, y, z];
            break outer;
          }
    if (!localPeak) {
      const s = successors(a, x);
      outer2: for (const y of s)
        for (const z of s)
          if (y < z && !joinable(a, y, z)) {
            localPeak = [x, y, z];
            break outer2;
          }
    }
  }
  return { terminating: !cycle, weaklyNormalising, confluent: !peak, locallyConfluent: !localPeak, uniqueNormalForms, cycle, peak, localPeak };
}
