/**
 * Reaching definitions with value sets. Counterpart of SonarJS's `rules/helpers/reaching-definitions.ts`, used
 * there by S4165 (redundant assignments) and here in chapter 15.
 *
 * For every variable, the analysis tracks the values that may reach a point: a set of literal values (as source
 * text, `1`, `'on'`, `undefined`), or UNKNOWN. It flows forwards over ESLint's code path segments: a segment's
 * in-facts are the join of its predecessors' out-facts, and each definition in the segment replaces the
 * variable's values.
 *
 * A variable missing from the facts has *no* definition reaching the point (the lattice's ⊥). That is different
 * from holding `undefined`, which is a value: a rule must record `let x;` as a definition of `undefined`, and a
 * parameter as a definition of an unknown value, or a path on which they are the only definitions will
 * contribute nothing at a join (chapter 15).
 */
import type { Rule, Scope } from 'eslint';
import type estree from 'estree';

/** Not a value we can name: absorbs every other value at joins. */
export const UNKNOWN = '?';

/** The values a variable may hold: literal texts, or the single element UNKNOWN. */
export type Values = ReadonlySet<string>;

/** For each variable, the values that may reach this point. A missing variable: no definition reaches it. */
export type Facts = Map<Scope.Variable, Values>;

/** A definition of `variable`: by an expression, or (`expr: 'undefined'`) by a declaration without initialiser. */
export interface Definition {
  variable: Scope.Variable;
  /** The expression written, `'undefined'` for `let x;`, or null when unknown (a parameter, a destructuring). */
  expr: estree.Node | 'undefined' | null;
  /** The scope the expression is evaluated in, to resolve identifiers. */
  scope: Scope.Scope;
  /** Where to report about this definition. */
  node: estree.Node;
}

/** Joins two value sets: their union, or UNKNOWN if either is unknown. */
export function joinValues(a: Values, b: Values): Values {
  if (a.has(UNKNOWN) || b.has(UNKNOWN)) return new Set([UNKNOWN]);
  return new Set([...a, ...b]);
}

function lookup(scope: Scope.Scope | null, name: string): Scope.Variable | undefined {
  for (let s = scope; s; s = s.upper) {
    const v = s.set.get(name);
    if (v) return v;
  }
  return undefined;
}

/**
 * The values a definition assigns, given the facts just before it: a literal's text, `undefined`, or the values
 * of another variable that the expression names. Anything else is UNKNOWN.
 */
export function resolveAssignedValues(definition: Definition, facts: Facts): Values {
  const { expr, variable } = definition;
  if (expr === 'undefined') return new Set(['undefined']);
  if (!expr) return new Set([UNKNOWN]);
  if (expr.type === 'Literal' && expr.raw && !('regex' in expr && expr.regex)) return new Set([expr.raw]);
  if (expr.type === 'Identifier') {
    // `undefined`, unless a declaration in the file shadows it (library globals have no definitions).
    if (expr.name === 'undefined' && !lookup(definition.scope, 'undefined')?.defs.length) return new Set(['undefined']);
    const other = lookup(definition.scope, expr.name);
    if (other && other !== variable) return facts.get(other) ?? new Set([UNKNOWN]);
  }
  return new Set([UNKNOWN]);
}

export class ReachingDefinitions {
  in: Facts = new Map();
  out: Facts = new Map();
  /** The segment's definitions, in evaluation order. */
  definitions: Definition[] = [];

  constructor(readonly segment: Rule.CodePathSegment) {}

  add(definition: Definition): void {
    this.definitions.push(definition);
  }

  /** Joins the predecessors' out-facts and replays the segment's definitions; returns true if `out` changed. */
  propagate(all: Map<string, ReachingDefinitions>): boolean {
    const inFacts: Facts = new Map();
    for (const prev of this.segment.prevSegments) {
      for (const [v, values] of all.get(prev.id)?.out ?? []) {
        const current = inFacts.get(v);
        inFacts.set(v, current ? joinValues(current, values) : values);
      }
    }
    this.in = inFacts;
    const out: Facts = new Map(inFacts);
    for (const d of this.definitions) out.set(d.variable, resolveAssignedValues(d, out));
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

/** Runs the forward worklist algorithm to the fixpoint; returns the number of steps. */
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
