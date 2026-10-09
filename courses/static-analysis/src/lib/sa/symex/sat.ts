/**
 * A CDCL SAT solver (chapter 31): conflict-driven clause learning, as in MiniSat and its descendants, at a scale
 * for figures. Variables are 1, 2, 3…; a literal is a variable or its negation (-v). A formula is a list of
 * clauses, each a disjunction of literals.
 *
 * - Unit propagation with two watched literals per clause.
 * - On a conflict, analysis to the first unique implication point (1-UIP), a learned clause, and a backjump to
 *   the second-highest decision level in that clause.
 * - Decisions by variable activity (VSIDS): variables in recent conflicts are tried first; phase saving.
 * - Restarts after a growing number of conflicts (Luby sequence).
 */

export type Lit = number;

export interface SatStats {
  decisions: number;
  propagations: number;
  conflicts: number;
  learned: number;
  restarts: number;
}

export type SatResult = { sat: true; model: boolean[]; stats: SatStats } | { sat: false; stats: SatStats };

const luby = (i: number): number => {
  // The i-th element (1-based) of 1, 1, 2, 1, 1, 2, 4, 1, 1, 2, 1, 1, 2, 4, 8, …
  for (let k = 1; ; k++) {
    if (i === 2 ** k - 1) return 2 ** (k - 1);
    if (i >= 2 ** (k - 1) && i < 2 ** k - 1) return luby(i - 2 ** (k - 1) + 1);
  }
};

export function solve(numVars: number, input: Lit[][], options: { maxConflicts?: number } = {}): SatResult {
  const stats: SatStats = { decisions: 0, propagations: 0, conflicts: 0, learned: 0, restarts: 0 };
  const maxConflicts = options.maxConflicts ?? 200_000;
  // Assignment: 0 unassigned, 1 true, -1 false, per variable.
  const value = new Int8Array(numVars + 1);
  const level = new Int32Array(numVars + 1);
  const reason: (number | -1)[] = new Array(numVars + 1).fill(-1);
  const activity = new Float64Array(numVars + 1);
  const phase = new Int8Array(numVars + 1).fill(-1);
  let bump = 1;
  const trail: Lit[] = [];
  const trailLim: number[] = [];
  const clauses: Lit[][] = [];
  const watches = new Map<Lit, number[]>();
  const watch = (lit: Lit, ci: number) => {
    const w = watches.get(lit);
    if (w) w.push(ci);
    else watches.set(lit, [ci]);
  };
  const litValue = (l: Lit) => (l > 0 ? value[l]! : -value[-l]!);
  const decisionLevel = () => trailLim.length;
  const assign = (l: Lit, from: number) => {
    const v = Math.abs(l);
    value[v] = l > 0 ? 1 : -1;
    level[v] = decisionLevel();
    reason[v] = from;
    trail.push(l);
  };

  // Load the clauses: remove duplicates, drop tautologies, enqueue units.
  const units: Lit[] = [];
  for (const c0 of input) {
    const c = [...new Set(c0)];
    if (c.some((l) => c.includes(-l))) continue;
    if (c.length === 0) return { sat: false, stats };
    if (c.length === 1) {
      units.push(c[0]!);
      continue;
    }
    const ci = clauses.push(c) - 1;
    watch(c[0]!, ci);
    watch(c[1]!, ci);
  }
  for (const u of units) {
    const v = litValue(u);
    if (v === -1) return { sat: false, stats };
    if (v === 0) assign(u, -1);
  }

  let qhead = 0;
  /** Unit propagation; returns the index of a conflicting clause, or -1. */
  const propagate = (): number => {
    while (qhead < trail.length) {
      const p = trail[qhead++]!;
      const falseLit = -p;
      const ws = watches.get(falseLit);
      if (!ws) continue;
      let i = 0;
      let j = 0;
      while (i < ws.length) {
        const ci = ws[i++]!;
        const c = clauses[ci]!;
        // Keep the false literal in position 1.
        if (c[0] === falseLit) [c[0], c[1]] = [c[1]!, c[0]!];
        if (litValue(c[0]!) === 1) {
          ws[j++] = ci;
          continue;
        }
        // Look for a new literal to watch.
        let found = false;
        for (let k = 2; k < c.length; k++) {
          if (litValue(c[k]!) !== -1) {
            [c[1], c[k]] = [c[k]!, c[1]!];
            watch(c[1]!, ci);
            found = true;
            break;
          }
        }
        if (found) continue;
        ws[j++] = ci;
        if (litValue(c[0]!) === -1) {
          // Conflict: keep the remaining watches and stop.
          while (i < ws.length) ws[j++] = ws[i++]!;
          ws.length = j;
          return ci;
        }
        stats.propagations++;
        assign(c[0]!, ci);
      }
      ws.length = j;
    }
    return -1;
  };

  /** 1-UIP conflict analysis: the learned clause (asserting literal first) and the level to backjump to. */
  const analyze = (conflict: number): { learnt: Lit[]; back: number } => {
    const seen = new Uint8Array(numVars + 1);
    const learnt: Lit[] = [0];
    let counter = 0;
    let p: Lit = 0;
    let index = trail.length - 1;
    let clause = clauses[conflict]!;
    for (;;) {
      for (const q of clause) {
        if (q === p) continue;
        const v = Math.abs(q);
        if (seen[v] || level[v] === 0) continue;
        seen[v] = 1;
        activity[v]! += bump;
        if (level[v] === decisionLevel()) counter++;
        else learnt.push(q);
      }
      // The next literal of the current level on the trail that took part.
      while (!seen[Math.abs(trail[index]!)]) index--;
      p = trail[index]!;
      index--;
      seen[Math.abs(p)] = 0;
      counter--;
      if (counter === 0) break;
      clause = clauses[reason[Math.abs(p)] as number]!;
    }
    learnt[0] = -p;
    let back = 0;
    let maxAt = 1;
    for (let k = 1; k < learnt.length; k++) {
      const lv = level[Math.abs(learnt[k]!)]!;
      if (lv > back) (back = lv), (maxAt = k);
    }
    // The literal of the backjump level goes second, so that it is watched.
    if (learnt.length > 1) [learnt[1], learnt[maxAt]] = [learnt[maxAt]!, learnt[1]!];
    bump *= 1.05;
    if (bump > 1e100) {
      for (let v = 1; v <= numVars; v++) activity[v]! *= 1e-100;
      bump *= 1e-100;
    }
    return { learnt, back };
  };

  const cancelUntil = (lvl: number) => {
    if (decisionLevel() <= lvl) return;
    for (let k = trail.length - 1; k >= trailLim[lvl]!; k--) {
      const v = Math.abs(trail[k]!);
      phase[v] = value[v]!;
      value[v] = 0;
      reason[v] = -1;
    }
    trail.length = trailLim[lvl]!;
    trailLim.length = lvl;
    qhead = trail.length;
  };

  const pick = (): Lit => {
    let best = 0;
    let bestAct = -1;
    for (let v = 1; v <= numVars; v++) if (value[v] === 0 && activity[v]! > bestAct) (best = v), (bestAct = activity[v]!);
    return best === 0 ? 0 : phase[best] === 1 ? best : -best;
  };

  let restartAt = 100 * luby(1);
  let sinceRestart = 0;
  for (;;) {
    const conflict = propagate();
    if (conflict >= 0) {
      stats.conflicts++;
      sinceRestart++;
      if (decisionLevel() === 0) return { sat: false, stats };
      if (stats.conflicts > maxConflicts) throw new Error('SAT solver: conflict limit reached');
      const { learnt, back } = analyze(conflict);
      cancelUntil(back);
      if (learnt.length === 1) assign(learnt[0]!, -1);
      else {
        const ci = clauses.push(learnt) - 1;
        watch(learnt[0]!, ci);
        watch(learnt[1]!, ci);
        stats.learned++;
        assign(learnt[0]!, ci);
      }
    } else {
      if (sinceRestart >= restartAt) {
        stats.restarts++;
        sinceRestart = 0;
        restartAt = 100 * luby(stats.restarts + 1);
        cancelUntil(0);
        continue;
      }
      const l = pick();
      if (l === 0) {
        const model = Array.from({ length: numVars + 1 }, (_, v) => value[v] === 1);
        return { sat: true, model, stats };
      }
      stats.decisions++;
      trailLim.push(trail.length);
      assign(l, -1);
    }
  }
}
