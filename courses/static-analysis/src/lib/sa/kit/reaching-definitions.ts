/**
 * Reaching definitions with value sets. Counterpart of SonarJS's `rules/helpers/reaching-definitions.ts`, used
 * there by S4165 (redundant assignments) and here in chapter 15.
 *
 * For every variable, the analysis tracks the set of values that may reach a point: literal values it can name,
 * or "unknown". It flows forwards: a segment's in-facts are the union of its predecessors' out-facts, and each
 * assignment replaces the variable's set.
 */
import type { Rule, Scope } from 'eslint';
import type estree from 'estree';

/** A value an assignment can be described by: a literal (as text) or "unknown". */
export type Value = string;
export const UNKNOWN: Value = '?';

/** For each variable, the values that may reach this point. */
export type Facts = Map<Scope.Variable, Set<Value>>;

/** The description of an assigned expression: its source text if it is a literal or an identifier, else unknown. */
export function valueOf(expr: estree.Node | null | undefined, sourceCode: { getText(n: estree.Node): string }): Value {
  if (!expr) return 'undefined';
  if (expr.type === 'Literal') return sourceCode.getText(expr);
  if (expr.type === 'Identifier') return expr.name === 'undefined' ? 'undefined' : `@${expr.name}`;
  return UNKNOWN;
}

export interface Assignment {
  variable: Scope.Variable;
  value: Value;
  node: estree.Node;
}

export class ReachingDefinitions {
  in: Facts = new Map();
  out: Facts = new Map();
  /** The assignments evaluated in the segment, in order. */
  assignments: Assignment[] = [];
  constructor(readonly segment: Rule.CodePathSegment) {}

  /** Joins the predecessors' out-facts and replays the segment's assignments; returns true if `out` changed. */
  propagate(all: Map<string, ReachingDefinitions>): boolean {
    const inFacts: Facts = new Map();
    for (const prev of this.segment.prevSegments) {
      for (const [v, values] of all.get(prev.id)?.out ?? []) {
        const set = inFacts.get(v) ?? new Set();
        for (const x of values) set.add(x);
        inFacts.set(v, set);
      }
    }
    this.in = inFacts;
    const out: Facts = new Map([...inFacts].map(([v, s]) => [v, new Set(s)]));
    for (const a of this.assignments) out.set(a.variable, new Set([a.value]));
    const changed = !sameFacts(out, this.out);
    this.out = out;
    return changed;
  }
}

function sameFacts(a: Facts, b: Facts): boolean {
  if (a.size !== b.size) return false;
  for (const [v, s] of a) {
    const t = b.get(v);
    if (!t || t.size !== s.size || [...s].some((x) => !t.has(x))) return false;
  }
  return true;
}

/** Runs the forward worklist algorithm to the fixpoint. */
export function reachingDefinitions(all: Map<string, ReachingDefinitions>): number {
  const worklist = [...all.values()].map((r) => r.segment).reverse();
  let steps = 0;
  while (worklist.length) {
    const segment = worklist.pop()!;
    steps++;
    if (all.get(segment.id)?.propagate(all)) for (const next of segment.nextSegments) worklist.push(next);
  }
  return steps;
}
