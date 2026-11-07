/**
 * Syntactic matching: find σ with `pattern σ = term`, or report that none exists.
 */
import { equal, type Subst, type Term } from './term';

/**
 * Match `pattern` against `term`, extending `sigma`. Returns the extended substitution, or `null`.
 * A variable bound twice (a non-linear pattern) must be bound to equal terms.
 */
export function match(pattern: Term, term: Term, sigma: Subst = new Map()): Subst | null {
  const out = new Map(sigma);
  return matchInto(pattern, term, out) ? out : null;
}

/** Matching that extends a mutable map in place (the fast path used by the rewriter). */
export function matchInto(pattern: Term, term: Term, sigma: Map<string, Term>): boolean {
  if (pattern.type === 'var') {
    const bound = sigma.get(pattern.name);
    if (bound === undefined) {
      sigma.set(pattern.name, term);
      return true;
    }
    return equal(bound, term);
  }
  if (term.type === 'var' || term.name !== pattern.name || term.args.length !== pattern.args.length) return false;
  for (let i = 0; i < pattern.args.length; i++) if (!matchInto(pattern.args[i]!, term.args[i]!, sigma)) return false;
  return true;
}

/** Is `term` an instance of `pattern`? */
export const matches = (pattern: Term, term: Term): boolean => match(pattern, term) !== null;

/** A step of the matching algorithm, for the matching stepper. */
export interface MatchStep {
  pattern: Term;
  term: Term;
  outcome: 'bind' | 'same' | 'decompose' | 'clash' | 'conflict';
  note: string;
  sigma: Subst;
}

/** Matching with a trace of every comparison made (pre-order, left to right). */
export function matchTrace(pattern: Term, term: Term): { sigma: Subst | null; steps: MatchStep[] } {
  const steps: MatchStep[] = [];
  const sigma = new Map<string, Term>();
  const go = (p: Term, t: Term): boolean => {
    if (p.type === 'var') {
      const bound = sigma.get(p.name);
      if (bound === undefined) {
        sigma.set(p.name, t);
        steps.push({ pattern: p, term: t, outcome: 'bind', note: `bind ${p.name}`, sigma: new Map(sigma) });
        return true;
      }
      const ok = equal(bound, t);
      steps.push({ pattern: p, term: t, outcome: ok ? 'same' : 'conflict', note: ok ? `${p.name} is already bound to the same term` : `${p.name} is already bound to a different term`, sigma: new Map(sigma) });
      return ok;
    }
    if (t.type === 'var' || t.name !== p.name || t.args.length !== p.args.length) {
      steps.push({ pattern: p, term: t, outcome: 'clash', note: t.type === 'var' ? `a symbol cannot match the variable ${t.name}` : `symbol clash: ${p.name} against ${t.name}`, sigma: new Map(sigma) });
      return false;
    }
    steps.push({ pattern: p, term: t, outcome: 'decompose', note: `same symbol ${p.name}: compare the arguments`, sigma: new Map(sigma) });
    for (let i = 0; i < p.args.length; i++) if (!go(p.args[i]!, t.args[i]!)) return false;
    return true;
  };
  return { sigma: go(pattern, term) ? sigma : null, steps };
}
