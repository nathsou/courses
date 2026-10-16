/**
 * Reconciling two lists of keyed children: the heart of every virtual DOM.
 *
 * `reconcile(oldKeys, newKeys, strategy)` returns a *plan*, a list of steps that turns the old list into the new one,
 * without touching any DOM. The virtual DOM (vdom.ts) executes the plan on MiniDom, and the chapter's figures draw
 * it. Three strategies, in increasing order of cleverness:
 *
 * - `index`: pair the i-th old child with the i-th new child and ignore keys. Reorders become rewrites.
 * - `lastIndex`: React's reconcileChildrenArray: match by key, move a child only when it was behind the furthest
 *   old position seen so far.
 * - `lis`: Vue 3's and Inferno's patchKeyedChildren: trim equal ends, then keep a longest increasing subsequence of
 *   the surviving children where it is and move only the rest.
 */

export type Key = string | number;

/** Where an inserted or moved child goes: next to a child that is already in its final position. */
export type Anchor = { before: number } | { after: number } | 'start' | 'end';

export type Step =
  /** Reuse old child `from` for new child `to`; it is already in the right place. */
  | { op: 'patch'; from: number; to: number }
  /** Reuse old child `from` for new child `to`, moving it next to `anchor` (an index in the *new* list). */
  | { op: 'move'; from: number; to: number; anchor: Anchor }
  /** Create new child `to` and put it next to `anchor`. */
  | { op: 'insert'; to: number; anchor: Anchor }
  /** Destroy old child `from`. */
  | { op: 'remove'; from: number };

export type Strategy = 'index' | 'lastIndex' | 'lis';

export const STRATEGIES: { id: Strategy; label: string }[] = [
  { id: 'index', label: 'By position (no keys)' },
  { id: 'lastIndex', label: 'By key, React-style' },
  { id: 'lis', label: 'By key, with a longest increasing subsequence' },
];

/**
 * Indices (into `seq`) of a longest strictly increasing subsequence, in increasing order. Entries of -1 are ignored
 * (they stand for "no counterpart"). O(n log n): patience sorting with predecessor links.
 */
export function lis(seq: readonly number[]): number[] {
  const tails: number[] = []; // tails[k] = index in seq of the smallest tail of an increasing subsequence of length k+1
  const prev = new Array<number>(seq.length).fill(-1);
  for (let i = 0; i < seq.length; i++) {
    const x = seq[i]!;
    if (x < 0) continue;
    let lo = 0;
    let hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (seq[tails[mid]!]! < x) lo = mid + 1;
      else hi = mid;
    }
    if (lo > 0) prev[i] = tails[lo - 1]!;
    tails[lo] = i;
  }
  const out: number[] = [];
  let k = tails.length ? tails[tails.length - 1]! : -1;
  while (k >= 0) {
    out.push(k);
    k = prev[k]!;
  }
  return out.reverse();
}

export function reconcile(oldKeys: readonly Key[], newKeys: readonly Key[], strategy: Strategy): Step[] {
  if (strategy === 'index') return byIndex(oldKeys.length, newKeys.length);
  return strategy === 'lastIndex' ? byLastIndex(oldKeys, newKeys) : byLis(oldKeys, newKeys);
}

function byIndex(nOld: number, nNew: number): Step[] {
  const steps: Step[] = [];
  const common = Math.min(nOld, nNew);
  for (let i = 0; i < common; i++) steps.push({ op: 'patch', from: i, to: i });
  for (let i = common; i < nNew; i++) steps.push({ op: 'insert', to: i, anchor: 'end' });
  for (let i = common; i < nOld; i++) steps.push({ op: 'remove', from: i });
  return steps;
}

/** React's algorithm: walk the new list left to right, remembering the furthest old position already passed. */
function byLastIndex(oldKeys: readonly Key[], newKeys: readonly Key[]): Step[] {
  const steps: Step[] = [];
  let i = 0;
  // Pass 1: while keys line up, patch in place.
  while (i < oldKeys.length && i < newKeys.length && oldKeys[i] === newKeys[i]) {
    steps.push({ op: 'patch', from: i, to: i });
    i++;
  }
  if (i === newKeys.length) {
    for (let k = i; k < oldKeys.length; k++) steps.push({ op: 'remove', from: k });
    return steps;
  }
  if (i === oldKeys.length) {
    for (let k = i; k < newKeys.length; k++) steps.push({ op: 'insert', to: k, anchor: 'end' });
    return steps;
  }
  // Pass 2: index the remaining old children by key.
  const remaining = new Map<Key, number>();
  for (let k = i; k < oldKeys.length; k++) remaining.set(oldKeys[k]!, k);
  let lastPlaced = i;
  for (let j = i; j < newKeys.length; j++) {
    const from = remaining.get(newKeys[j]!);
    const anchor: Anchor = j === 0 ? 'start' : { after: j - 1 };
    if (from === undefined) {
      steps.push({ op: 'insert', to: j, anchor });
      continue;
    }
    remaining.delete(newKeys[j]!);
    if (from < lastPlaced) steps.push({ op: 'move', from, to: j, anchor });
    else {
      lastPlaced = from;
      steps.push({ op: 'patch', from, to: j });
    }
  }
  for (const from of remaining.values()) steps.push({ op: 'remove', from });
  return steps;
}

/** Vue 3's algorithm: trim both ends, then move only what is outside a longest increasing subsequence. */
function byLis(oldKeys: readonly Key[], newKeys: readonly Key[]): Step[] {
  const steps: Step[] = [];
  let i = 0;
  let e1 = oldKeys.length - 1;
  let e2 = newKeys.length - 1;
  // 1. sync from the start
  while (i <= e1 && i <= e2 && oldKeys[i] === newKeys[i]) {
    steps.push({ op: 'patch', from: i, to: i });
    i++;
  }
  // 2. sync from the end
  while (i <= e1 && i <= e2 && oldKeys[e1] === newKeys[e2]) {
    steps.push({ op: 'patch', from: e1, to: e2 });
    e1--;
    e2--;
  }
  if (i > e1) {
    // 3. old list exhausted: insert the rest of the new one
    for (let j = e2; j >= i; j--) steps.push({ op: 'insert', to: j, anchor: j + 1 < newKeys.length ? { before: j + 1 } : 'end' });
    return steps;
  }
  if (i > e2) {
    // 4. new list exhausted: remove the rest of the old one
    for (let k = i; k <= e1; k++) steps.push({ op: 'remove', from: k });
    return steps;
  }
  // 5. the unknown middle
  const s1 = i;
  const s2 = i;
  const toPatch = e2 - s2 + 1;
  const keyToNew = new Map<Key, number>();
  for (let j = s2; j <= e2; j++) keyToNew.set(newKeys[j]!, j);
  const newToOld = new Array<number>(toPatch).fill(-1); // newToOld[j - s2] = old index, or -1
  let moved = false;
  let maxNew = 0;
  for (let k = s1; k <= e1; k++) {
    const j = keyToNew.get(oldKeys[k]!);
    if (j === undefined || newToOld[j - s2]! !== -1) {
      steps.push({ op: 'remove', from: k });
      continue;
    }
    newToOld[j - s2] = k;
    if (j >= maxNew) maxNew = j;
    else moved = true;
  }
  const stay = new Set(moved ? lis(newToOld) : newToOld.map((_, idx) => idx));
  for (let idx = toPatch - 1; idx >= 0; idx--) {
    const j = s2 + idx;
    const anchor: Anchor = j + 1 < newKeys.length ? { before: j + 1 } : 'end';
    const from = newToOld[idx]!;
    if (from === -1) steps.push({ op: 'insert', to: j, anchor });
    else if (stay.has(idx)) steps.push({ op: 'patch', from, to: j });
    else steps.push({ op: 'move', from, to: j, anchor });
  }
  return steps;
}

export interface PlanStats {
  patches: number;
  moves: number;
  inserts: number;
  removes: number;
  /** Children whose DOM node was kept for a *different* key: any state inside them now belongs to the wrong item. */
  misattributed: number;
}

export function planStats(oldKeys: readonly Key[], newKeys: readonly Key[], steps: readonly Step[]): PlanStats {
  const s: PlanStats = { patches: 0, moves: 0, inserts: 0, removes: 0, misattributed: 0 };
  for (const st of steps) {
    if (st.op === 'insert') s.inserts++;
    else if (st.op === 'remove') s.removes++;
    else {
      if (st.op === 'move') s.moves++;
      else s.patches++;
      if (oldKeys[st.from] !== newKeys[st.to]) s.misattributed++;
    }
  }
  return s;
}

/**
 * Run a plan on an abstract list of keys, returning the resulting order. For tests and figures: if a strategy is
 * correct, applying its plan to `oldKeys` yields exactly `newKeys` (for `index`, the *positions* are right but the
 * identities are not; the returned list shows which old key's node ends up in each position).
 */
export function applyPlan(oldKeys: readonly Key[], newKeys: readonly Key[], steps: readonly Step[]): (Key | null)[] {
  // The list of live nodes, each tagged with the *new* index it serves (or null while still unplaced).
  type Node = { label: Key; to: number | null };
  const list: Node[] = oldKeys.map((label) => ({ label, to: null }));
  const byOld = [...list];
  const byNew = new Map<number, Node>();
  const place = (node: Node, anchor: Anchor) => {
    const at = list.indexOf(node);
    if (at >= 0) list.splice(at, 1);
    let idx: number;
    if (anchor === 'end') idx = list.length;
    else if (anchor === 'start') idx = 0;
    else {
      const ref = list.indexOf(byNew.get('before' in anchor ? anchor.before : anchor.after)!);
      if (ref < 0) throw new Error('anchor not placed yet');
      idx = 'before' in anchor ? ref : ref + 1;
    }
    list.splice(idx, 0, node);
  };
  for (const st of steps) {
    if (st.op === 'remove') {
      list.splice(list.indexOf(byOld[st.from]!), 1);
    } else if (st.op === 'patch') {
      const node = byOld[st.from]!;
      node.to = st.to;
      byNew.set(st.to, node);
    } else if (st.op === 'move') {
      const node = byOld[st.from]!;
      node.to = st.to;
      byNew.set(st.to, node);
      place(node, st.anchor);
    } else {
      const node: Node = { label: newKeys[st.to]!, to: st.to };
      byNew.set(st.to, node);
      place(node, st.anchor);
    }
  }
  return list.map((n) => n.label);
}
