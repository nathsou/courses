/**
 * Time slicing: why React rewrote its reconciler as Fiber, as a deterministic simulation.
 *
 * Two pieces:
 * 1. `Fiber`: a component tree stored as a linked list (child / sibling / return pointers) so that a walk over it can
 *    stop after any unit of work and resume later. A recursive walk cannot: its place in the tree lives on the
 *    call stack.
 * 2. `simulate`: a virtual-clock model of the main thread. A render is a list of work units with costs in
 *    milliseconds. In `sync` mode a render runs to the end; in `concurrent` mode it runs in slices, yields between
 *    them, lets urgent work (typing) go first, and throws away a half-finished low-priority render when newer input
 *    makes it stale. Time is virtual, so every run is reproducible.
 */

export interface TreeNode {
  name: string;
  /** Milliseconds this component takes to render. */
  cost: number;
  children?: TreeNode[];
}

export interface Fiber {
  name: string;
  cost: number;
  child: Fiber | null;
  sibling: Fiber | null;
  return: Fiber | null;
}

/** Build the linked-list form of a tree. */
export function toFibers(tree: TreeNode, parent: Fiber | null = null): Fiber {
  const fiber: Fiber = { name: tree.name, cost: tree.cost, child: null, sibling: null, return: parent };
  let prev: Fiber | null = null;
  for (const c of tree.children ?? []) {
    const f = toFibers(c, fiber);
    if (prev) prev.sibling = f;
    else fiber.child = f;
    prev = f;
  }
  return fiber;
}

/** The order a depth-first render visits the tree: parent before children, siblings left to right. */
export function preorder(tree: TreeNode): string[] {
  return [tree.name, ...(tree.children ?? []).flatMap(preorder)];
}

/** A balanced tree with `leaves` leaf components, each costing `leafCost`, under a root and one row component per `fan` leaves. */
export function bigList(leaves: number, leafCost: number, fan = 10): TreeNode {
  const rows: TreeNode[] = [];
  for (let i = 0; i < leaves; i += fan) {
    const n = Math.min(fan, leaves - i);
    rows.push({ name: `Row${i / fan}`, cost: 0.2, children: Array.from({ length: n }, (_, k) => ({ name: `Item${i + k}`, cost: leafCost })) });
  }
  return { name: 'List', cost: 0.5, children: rows };
}

export function totalCost(tree: TreeNode): number {
  return tree.cost + (tree.children ?? []).reduce((a, c) => a + totalCost(c), 0);
}

export interface Unit {
  label: string;
  cost: number;
}

export function units(tree: TreeNode): Unit[] {
  const out: Unit[] = [];
  const walk = (n: TreeNode) => {
    out.push({ label: n.name, cost: n.cost });
    n.children?.forEach(walk);
  };
  walk(tree);
  return out;
}

export interface Keystroke {
  /** When the key goes down, in ms. */
  at: number;
  /** What was typed (for labels). */
  label: string;
}

export interface SimConfig {
  mode: 'sync' | 'concurrent';
  /** The expensive render each keystroke causes (e.g. filtering a long list). */
  list: TreeNode;
  keystrokes: Keystroke[];
  /** Time slice in concurrent mode (React's scheduler uses 5 ms). */
  sliceMs?: number;
  /** Cost of the event handler plus rendering the input box itself. */
  echoMs?: number;
  /** Cost of committing a finished render to the DOM. */
  commitMs?: number;
  /** In concurrent mode, the list render is a low-priority "transition" that a keystroke interrupts. */
  frameMs?: number;
}

export type SegmentKind = 'echo' | 'render' | 'commit' | 'discard' | 'idle';

export interface Segment {
  start: number;
  end: number;
  kind: SegmentKind;
  label: string;
  /** Which keystroke the work belongs to. */
  key: number;
}

export interface KeyResult {
  key: number;
  label: string;
  arrival: number;
  /** When the input box showed the keystroke. */
  echoAt: number;
  latency: number;
  /** When the list showed the result (null if superseded by a later keystroke). */
  listAt: number | null;
}

export interface SimResult {
  mode: 'sync' | 'concurrent';
  segments: Segment[];
  keys: KeyResult[];
  end: number;
  /** The longest stretch with no chance for the browser to paint or handle input. */
  longestBlock: number;
  /** Frame windows (default 16.7 ms) with no chance to paint: the user sees these as jank. */
  droppedFrames: number;
  /** Every frame window from the first keystroke to the end, and whether it had a chance to paint. */
  frames: { start: number; end: number; dropped: boolean }[];
  /** Moments at which the main thread gave the browser a turn (slice boundaries and idle time). */
  yields: number[];
  /** Milliseconds of rendering thrown away because newer input made it stale. */
  wasted: number;
  worstLatency: number;
}

export function simulate(cfg: SimConfig): SimResult {
  const slice = cfg.sliceMs ?? 5;
  const echoMs = cfg.echoMs ?? 1;
  const commitMs = cfg.commitMs ?? 2;
  const frameMs = cfg.frameMs ?? 16.7;
  const listUnits = units(cfg.list);
  const listCost = listUnits.reduce((a, u) => a + u.cost, 0);
  const keys = [...cfg.keystrokes].sort((a, b) => a.at - b.at);
  const segments: Segment[] = [];
  const results: KeyResult[] = keys.map((k, i) => ({ key: i, label: k.label, arrival: k.at, echoAt: NaN, latency: NaN, listAt: null }));
  /** Moments at which the browser could paint or take input (a yield point or idle time). */
  const gaps: number[] = [];
  let wasted = 0;
  let t = 0;
  const push = (kind: SegmentKind, label: string, key: number, dur: number) => {
    if (dur <= 0) return;
    const last = segments[segments.length - 1];
    if (last && last.kind === kind && last.key === key && last.end === t && kind !== 'idle') {
      last.end = t + dur;
      last.label = label;
    } else segments.push({ start: t, end: t + dur, kind, label, key });
    t += dur;
  };

  let nextKey = 0; // next keystroke not yet handled
  if (cfg.mode === 'sync') {
    // One block per keystroke: handler, render of the input box AND the list, commit. No yielding.
    while (nextKey < keys.length) {
      const k = keys[nextKey]!;
      if (t < k.at) {
        gaps.push(t);
        push('idle', 'idle', nextKey, k.at - t);
        gaps.push(t);
      }
      const i = nextKey++;
      push('echo', `input ${k.label}`, i, echoMs);
      push('render', `render list (${listUnits.length} components)`, i, listCost);
      push('commit', 'commit', i, commitMs);
      results[i]!.echoAt = t;
      results[i]!.listAt = t;
    }
  } else {
    // Concurrent: urgent keystrokes first; the list render is sliced, restartable and low priority.
    let current: { key: number; done: number } | null = null; // units completed of the current list render
    const handleKeystrokes = () => {
      while (nextKey < keys.length && keys[nextKey]!.at <= t) {
        const i = nextKey++;
        const k = keys[i]!;
        push('echo', `input ${k.label}`, i, echoMs);
        push('commit', 'commit input', i, commitMs / 2);
        results[i]!.echoAt = t;
        gaps.push(t);
        if (current && current.done > 0) {
          const lost = listUnits.slice(0, current.done).reduce((a, u) => a + u.cost, 0);
          wasted += lost;
          // Show the thrown-away work as a marker at this point in time.
          segments.push({ start: t, end: t, kind: 'discard', label: `discard ${lost.toFixed(0)} ms`, key: current.key });
        }
        current = { key: i, done: 0 };
      }
    };
    for (;;) {
      handleKeystrokes();
      if (current) {
        // Work for one slice, between units (a unit is never interrupted).
        const sliceStart = t;
        const ck: { key: number; done: number } = current;
        while (ck.done < listUnits.length && t - sliceStart < slice) {
          const u = listUnits[ck.done]!;
          push('render', `render list ${ck.done + 1}/${listUnits.length}`, ck.key, u.cost);
          ck.done++;
        }
        gaps.push(t);
        if (ck.done >= listUnits.length) {
          // Nothing newer arrived during the slices: commit.
          handleKeystrokes();
          if (current === ck) {
            push('commit', 'commit list', ck.key, commitMs);
            results[ck.key]!.listAt = t;
            current = null;
          }
        }
      } else if (nextKey < keys.length) {
        gaps.push(t);
        push('idle', 'idle', nextKey, keys[nextKey]!.at - t);
      } else break;
    }
  }

  for (const r of results) r.latency = r.echoAt - r.arrival;
  // The longest uninterrupted busy block: the widest span between two chances to yield that contains work.
  let longest = 0;
  const points = [...new Set([0, ...gaps, t])].sort((x, y) => x - y);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const busy = segments.some((seg) => seg.kind !== 'idle' && seg.kind !== 'discard' && seg.start < b - 1e-9 && seg.end > a + 1e-9);
    if (busy) longest = Math.max(longest, b - a);
  }
  const end = t;
  // A frame window is "dropped" when no yield or idle point falls inside it.
  const gapTimes = gaps.slice().sort((a, b) => a - b);
  let dropped = 0;
  const frames: SimResult['frames'] = [];
  const firstEvent = keys[0]?.at ?? 0;
  for (let f = Math.floor(firstEvent / frameMs) * frameMs; f + frameMs <= end; f += frameMs) {
    const miss = !gapTimes.some((g) => g >= f && g < f + frameMs);
    if (miss) dropped++;
    frames.push({ start: f, end: f + frameMs, dropped: miss });
  }
  return {
    mode: cfg.mode,
    segments: segments.filter((s) => s.end > s.start || s.kind === 'discard'),
    keys: results,
    end,
    longestBlock: longest,
    droppedFrames: dropped,
    frames,
    yields: [...new Set(gapTimes.map((g) => Math.round(g * 100) / 100))],
    wasted,
    worstLatency: Math.max(0, ...results.map((r) => r.latency)),
  };
}

/** Five keystrokes 60 ms apart into a list that takes about 130 ms to render. */
export function typingScenario(mode: 'sync' | 'concurrent', leaves = 200, leafCost = 0.6): SimConfig {
  return {
    mode,
    list: bigList(leaves, leafCost),
    keystrokes: ['r', 'e', 'a', 'c', 't'].map((label, i) => ({ at: 10 + i * 60, label })),
  };
}
