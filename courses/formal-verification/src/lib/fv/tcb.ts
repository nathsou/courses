/**
 * The TCB meter (PLAN §5): for a verdict, the components its result depended on, and for each whether it was
 * trusted, re-checked by a certificate checker, or not needed at all. Chapter 29's TCB map draws the same idea for
 * whole kinds of results; this is the per-result strip shown in every badge.
 */
import type { Verdict } from './engines';

export type TcbRole = 'trusted' | 'checked' | 'untrusted';

export interface TcbPart {
  name: string;
  role: TcbRole;
}

/** What turned the question into something an engine can answer, or answered it by search. */
const TRANSLATION: Record<string, string> = {
  vc: 'VC generator',
  explore: 'explorer',
  explorer: 'explorer',
  refine: 'refinement checker',
  refinement: 'refinement checker',
  ltl: 'temporal checker',
  bdd: 'BDD encoding',
  bmc: 'unrolling to SAT',
  kind: 'encoding to SAT',
  ic3: 'encoding to SAT',
  param: 'encoding and small-model bound',
  relational: 'relational encoding',
  sat: 'encoding to SAT',
  heap: 'symbolic-heap prover',
  absint: 'abstract interpreter',
  symex: 'symbolic executor',
  test: 'input generator',
};

const SOLVER: Record<string, string> = { vc: 'SMT solver', symex: 'SMT solver', bdd: 'BDD package' };

export function tcbOf(v: Verdict): TcbPart[] {
  const parts: TcbPart[] = [
    { name: 'specification', role: 'trusted' },
    { name: 'front end', role: 'trusted' },
  ];
  const engine = TRANSLATION[v.engine] ?? v.engine;
  const solver = SOLVER[v.engine] ?? 'SAT solver';
  const c = v.certificate;
  const replayed = c.checked && (c.kind === 'trace' || c.kind === 'lasso' || c.kind === 'model' || c.kind === 'solutions');
  if (replayed) {
    // The interpreter re-ran the counterexample or checked the solution: how it was found does not matter.
    parts.push({ name: 'interpreter', role: 'trusted' }, { name: engine, role: 'untrusted' });
    return parts;
  }
  if (v.badge.kind === 'tested') {
    parts.push({ name: 'interpreter', role: 'trusted' }, { name: 'the inputs tried', role: 'trusted' });
    return parts;
  }
  const certified = c.checked && (c.kind === 'drat' || c.kind === 'smt-proof' || c.kind === 'inductive-invariant');
  parts.push({ name: engine, role: 'trusted' });
  if (certified) parts.push({ name: solver, role: 'checked' }, { name: 'certificate checker', role: 'trusted' });
  else if (c.kind === 'drat' || c.kind === 'smt-proof' || c.kind === 'inductive-invariant') parts.push({ name: solver, role: 'trusted' });
  return parts;
}
