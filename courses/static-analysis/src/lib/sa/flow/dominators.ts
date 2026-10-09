/**
 * Post-dominators and control dependence (chapter 30). A node `p` post-dominates `n` when every path from `n` to
 * the exit goes through `p`. A node is control-dependent on a condition when one of the condition's branches
 * always leads to it and the other may avoid it: the condition decides whether it runs.
 */
import type { Cfg } from './cfg.js';

/** For each node, the set of nodes that post-dominate it (itself included). */
export function postDominators(cfg: Cfg): Set<number>[] {
  const all = new Set(cfg.nodes.map((n) => n.id));
  const pdom = cfg.nodes.map((n) => (n.id === cfg.exit ? new Set([n.id]) : new Set(all)));
  let changed = true;
  while (changed) {
    changed = false;
    for (const n of cfg.nodes) {
      if (n.id === cfg.exit) continue;
      let meet: Set<number> | undefined;
      for (const s of n.succ) meet = meet ? new Set([...meet].filter((x) => pdom[s]!.has(x))) : new Set(pdom[s]);
      const next = new Set(meet ?? []);
      next.add(n.id);
      if (next.size !== pdom[n.id]!.size || [...next].some((x) => !pdom[n.id]!.has(x))) {
        pdom[n.id] = next;
        changed = true;
      }
    }
  }
  return pdom;
}

/** The immediate post-dominator of each node (undefined for the exit, and for nodes that cannot reach it). */
export function immediatePostDominators(cfg: Cfg): (number | undefined)[] {
  const pdom = postDominators(cfg);
  return cfg.nodes.map((n) => {
    const strict = [...pdom[n.id]!].filter((x) => x !== n.id);
    // The immediate one is the strict post-dominator that all the others post-dominate.
    return strict.find((c) => strict.every((o) => pdom[c]!.has(o)));
  });
}

/** For each node, the conditions it is control-dependent on (Ferrante, Ottenstein and Warren's construction). */
export function controlDependence(cfg: Cfg): Set<number>[] {
  const pdom = postDominators(cfg);
  const ipdom = immediatePostDominators(cfg);
  const deps = cfg.nodes.map(() => new Set<number>());
  for (const a of cfg.nodes) {
    if (a.succ.length < 2) continue;
    for (const b of a.succ) {
      if (pdom[a.id]!.has(b) && b !== a.id) continue;
      // Walk up the post-dominator tree from b to a's immediate post-dominator.
      const stop = ipdom[a.id];
      const seen = new Set<number>();
      for (let x: number | undefined = b; x !== undefined && x !== stop && !seen.has(x); x = ipdom[x]) {
        seen.add(x);
        deps[x]!.add(a.id);
      }
    }
  }
  return deps;
}
