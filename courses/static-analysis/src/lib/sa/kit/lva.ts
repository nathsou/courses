/**
 * Live variable analysis over ESLint's code-path segments. Counterpart of SonarJS's `rules/helpers/lva.ts`, used
 * there by S1854 (dead stores) and here in chapter 14.
 *
 * A variable is *live* at a point if some path from that point reads it before writing it. Liveness flows
 * backwards: a segment's live-in set is what it reads before writing (`gen`) plus what is live after it and not
 * overwritten in it (`out − kill`).
 *
 *     in(s)  = gen(s) ∪ (out(s) − kill(s))
 *     out(s) = ⋃ in(t) for every successor t of s
 *
 * Iterating these equations from empty sets until nothing changes reaches the least fixpoint (chapter 13).
 */
import type { Rule, Scope } from 'eslint';

export class LiveVariables {
  /** Variables read in the segment before any write to them in the segment (upward-exposed uses). */
  gen = new Set<Scope.Variable>();
  /** Variables written in the segment. */
  kill = new Set<Scope.Variable>();
  /** Live at the start of the segment. */
  in = new Set<Scope.Variable>();
  /** Live at the end of the segment. */
  out = new Set<Scope.Variable>();
  /** The segment's references, in evaluation order. */
  references: Scope.Reference[] = [];

  constructor(readonly segment: Rule.CodePathSegment) {}

  /** Records a reference evaluated in this segment (call in evaluation order). */
  add(ref: Scope.Reference): void {
    const v = ref.resolved;
    if (!v) return;
    // A read counts for gen only if the segment has not already written the variable.
    if (ref.isRead() && !this.kill.has(v)) this.gen.add(v);
    if (ref.isWrite()) this.kill.add(v);
    this.references.push(ref);
  }

  /** Recomputes out and in from the successors; returns true if `in` grew. */
  propagate(all: Map<string, LiveVariables>): boolean {
    const out = new Set<Scope.Variable>();
    for (const next of this.segment.nextSegments) for (const v of all.get(next.id)?.in ?? []) out.add(v);
    this.out = out;
    const before = this.in.size;
    for (const v of this.gen) this.in.add(v);
    for (const v of out) if (!this.kill.has(v)) this.in.add(v);
    return this.in.size !== before;
  }
}

/** Runs the backward worklist algorithm to the fixpoint. */
export function lva(all: Map<string, LiveVariables>): number {
  const worklist = [...all.values()].map((l) => l.segment);
  let steps = 0;
  while (worklist.length) {
    const segment = worklist.pop()!;
    steps++;
    const facts = all.get(segment.id);
    if (facts?.propagate(all)) for (const prev of segment.prevSegments) worklist.push(prev);
  }
  return steps;
}
