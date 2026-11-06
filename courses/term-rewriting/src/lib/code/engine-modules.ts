/**
 * The modules of the reader's engine, in course order. Each is a `code` exercise with a `provides`
 * list; once it passes, its exports with those names replace the reference engine's in `engine`.
 * (A content test checks this list against the exercises in the chapters.)
 */
export interface EngineModuleInfo {
  /** The exercise id. */
  id: string;
  /** The chapter slug. */
  chapter: string;
  title: string;
  provides: string[];
}

export const ENGINE_MODULES: EngineModuleInfo[] = [
  { id: 'terms/positions-at-replace', chapter: 'terms', title: 'Positions, subterms and replacement', provides: ['positions', 'at', 'replaceAt'] },
  { id: 'matching/apply-match', chapter: 'matching', title: 'Substitution and matching', provides: ['apply', 'match'] },
  { id: 'rewriting/root-and-reducts', chapter: 'rewriting', title: 'One rewrite step', provides: ['rootRewrite', 'allReducts'] },
  { id: 'strategies/normalizers', chapter: 'strategies', title: 'Innermost and outermost normalisation', provides: ['normalizeInnermost', 'outermostStep', 'normalizeOutermost'] },
  { id: 'sharing/hash-cons', chapter: 'sharing', title: 'A hash-consing table', provides: ['HashCons'] },
  { id: 'indexing/discrimination-tree', chapter: 'indexing', title: 'A discrimination tree', provides: ['DiscriminationTree'] },
  { id: 'compiling/run-tree', chapter: 'compiling', title: 'Running a decision tree', provides: ['treeTests'] },
  { id: 'interpretations/interpret', chapter: 'interpretations', title: 'Interpreting a term', provides: ['interpret'] },
  { id: 'path-orders/lpo', chapter: 'path-orders', title: 'The lexicographic path order', provides: ['lpo'] },
  { id: 'unification/unify', chapter: 'unification', title: 'Unification', provides: ['unify'] },
  { id: 'critical-pairs/critical-pairs', chapter: 'critical-pairs', title: 'Critical pairs', provides: ['criticalPairs'] },
];
