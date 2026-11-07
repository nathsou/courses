/**
 * Confluence: overlaps and critical pairs, joinability, orthogonality, and a confluence checker
 * that combines the critical pair lemma with Newman's lemma.
 */
import type { Rule } from './parse';
import { apply, at, equal, fnPositions, isLinear, replaceAt, show, vars, type Position, type Subst, type Term } from './term';
import { renameApartAll, unify } from './unify';
import { normalize, redexes, system, type RewriteSystem } from './rewrite';
import { proveTermination, type TerminationProof } from './termination';

export interface CriticalPair {
  /** The rule whose left-hand side contains the overlap (outer) and the rule that overlaps it (inner). */
  outer: number;
  inner: number;
  /** Position in the outer left-hand side. */
  pos: Position;
  /** The most general unifier. */
  mgu: Subst;
  /** The overlapped term σ(l_outer): the peak. */
  peak: Term;
  /** Rewriting the peak with the inner rule at pos, and with the outer rule at the root. */
  left: Term;
  right: Term;
}

/** Rename rule j's variables apart from rule i's. */
function renamed(r: Rule, avoid: Iterable<string>): Rule {
  const [lhs, rhs] = renameApartAll([r.lhs, r.rhs], avoid);
  return { ...r, lhs: lhs!, rhs: rhs! };
}

/** All critical pairs, including those of a rule with itself (except the trivial root overlap). */
export function criticalPairs(rules: readonly Rule[]): CriticalPair[] {
  const out: CriticalPair[] = [];
  rules.forEach((outerRule, outer) => {
    rules.forEach((innerRule0, inner) => {
      const innerRule = renamed(innerRule0, [...vars(outerRule.lhs), ...vars(outerRule.rhs)]);
      for (const pos of fnPositions(outerRule.lhs)) {
        if (pos.length === 0 && outer === inner) continue;
        const mgu = unify(at(outerRule.lhs, pos), innerRule.lhs);
        if (!mgu) continue;
        const peak = apply(mgu, outerRule.lhs);
        const left = apply(mgu, replaceAt(outerRule.lhs, pos, innerRule.rhs));
        const right = apply(mgu, outerRule.rhs);
        out.push({ outer, inner, pos, mgu, peak, left, right });
      }
    });
  });
  // A root overlap of rules i and j appears twice (as (i, j) and (j, i)); keep one.
  return out.filter((cp, k) => !(cp.pos.length === 0 && cp.outer > cp.inner && out.some((o, m) => m !== k && o.pos.length === 0 && o.outer === cp.inner && o.inner === cp.outer)));
}

export interface Joinability {
  pair: CriticalPair;
  leftNF: Term;
  rightNF: Term;
  joinable: boolean;
  /** False when normalisation ran out of fuel (the answer is then only "not shown joinable"). */
  decided: boolean;
}

/** Try to join a pair by normalising both sides (fine for terminating systems). */
export function joinPair(sys: RewriteSystem, pair: CriticalPair, fuel = 2000): Joinability {
  const a = normalize(sys, pair.left, { fuel, keepSteps: 0 });
  const b = normalize(sys, pair.right, { fuel, keepSteps: 0 });
  return { pair, leftNF: a.term, rightNF: b.term, joinable: equal(a.term, b.term), decided: a.normal && b.normal };
}

/** Left-linear and no critical pairs. */
export function isOrthogonal(rules: readonly Rule[]): boolean {
  return rules.every((r) => isLinear(r.lhs)) && criticalPairs(rules).length === 0;
}

/** Every critical pair is trivial (its two sides are equal). With left-linearity: weakly orthogonal. */
export function isWeaklyOrthogonal(rules: readonly Rule[]): boolean {
  return rules.every((r) => isLinear(r.lhs)) && criticalPairs(rules).every((cp) => equal(cp.left, cp.right));
}

export type ConfluenceVerdict =
  | { result: 'confluent'; reason: 'orthogonal' | 'weakly orthogonal' | 'terminating and all critical pairs joinable'; termination?: TerminationProof; joins: Joinability[] }
  | { result: 'not confluent'; witness: { peak: Term; left: Term; right: Term }; joins: Joinability[] }
  | { result: 'unknown'; reason: string; joins: Joinability[] };

/**
 * Decide confluence when one of the classic criteria applies:
 * orthogonality (no termination needed), or termination + joinable critical pairs (Knuth–Bendix).
 * A critical pair with two distinct normal forms proves non-confluence.
 */
export function checkConfluence(rules: readonly Rule[]): ConfluenceVerdict {
  const sys = system(rules);
  const cps = criticalPairs(rules);
  const joins = cps.map((cp) => joinPair(sys, cp));
  for (const j of joins) {
    if (!j.joinable && j.decided && redexes(sys, j.leftNF).length === 0 && redexes(sys, j.rightNF).length === 0) {
      return { result: 'not confluent', witness: { peak: j.pair.peak, left: j.leftNF, right: j.rightNF }, joins };
    }
  }
  if (isOrthogonal(rules)) return { result: 'confluent', reason: 'orthogonal', joins };
  if (isWeaklyOrthogonal(rules)) return { result: 'confluent', reason: 'weakly orthogonal', joins };
  const termination = proveTermination(rules);
  if (termination.result === 'terminating') {
    if (joins.every((j) => j.joinable)) return { result: 'confluent', reason: 'terminating and all critical pairs joinable', termination, joins };
    return { result: 'unknown', reason: 'some critical pair did not join', joins };
  }
  if (joins.every((j) => j.joinable)) return { result: 'unknown', reason: 'the critical pairs join (so the system is locally confluent), but termination could not be shown', joins };
  return { result: 'unknown', reason: 'no criterion applies', joins };
}

export function describeConfluence(v: ConfluenceVerdict): string {
  if (v.result === 'confluent') return `Confluent (${v.reason}).`;
  if (v.result === 'not confluent') return `Not confluent: ${show(v.witness.peak)} has the distinct normal forms ${show(v.witness.left)} and ${show(v.witness.right)}.`;
  return `Unknown: ${v.reason}.`;
}
