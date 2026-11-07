---
number: C
title: The engine
summary: Every function of the reference engine that exercises can import from trs, the modules of your own engine and how they are carried forward.
duration: Reference
---

The course's reference engine is a TypeScript library with no dependencies on the page. Exercises import it as `trs`; your own engine is available as `engine`.

## Your engine

Exercises labelled *Build your engine* implement functions with exactly the signatures below. When your code passes an exercise's tests it is saved (in this browser), and every later exercise that imports from `engine` runs your function in place of the reference one. Functions you have not written yet come from the reference. The [Your engine](/engine/) page lists your modules and lets you switch each one off; the feedback of every exercise says which functions were yours.

| Chapter | Functions |
|---|---|
| 1 Terms | `positions(t)`, `at(t, p)`, `replaceAt(t, p, s)` |
| 2 Matching | `apply(sigma, t)`, `match(pattern, term, sigma?)` |
| 3 Rewriting | `rootRewrite(rules, t)`, `allReducts(rules, t)` |
| 5 Strategies | `normalizeInnermost(rules, t, fuel?)`, `outermostStep(rules, t)`, `normalizeOutermost(rules, t, fuel?)` |
| 7 Sharing | `class HashCons` |
| 8 Indexing | `class DiscriminationTree` |
| 9 Compiling | `treeTests(tree, args)` |
| 11 Interpretations | `interpret(I, t)` |
| 12 Path orders | `lpo(prec)` |
| 15 Unification | `unify(s, t)` |
| 16 Critical pairs | `criticalPairs(rules)` |
| 19 Completion | `complete(equations, gt, opts?)` |
| 22 AC | `flatten(t, ac)`, `acEqual(s, t, ac)` |
| 23 E-graphs | `class UnionFind` |

Figures and workbenches always use the reference engine, so a bug in your code never changes the text.

## Data

```ts
type Term = { type: 'var'; name: string } | { type: 'fn'; name: string; args: readonly Term[] };
type Position = readonly number[];            // 0-based argument indices; [] is the root
type Subst = ReadonlyMap<string, Term>;       // variable name ↦ term
interface Rule { lhs: Term; rhs: Term; label?: string; conditions?: Condition[] }
```

## The reference, by module

| Module | Main exports |
|---|---|
| terms | `v`, `f`, `c`, `isVar`, `isFn`, `equal`, `at`, `replaceAt`, `positions`, `fnPositions`, `vars`, `isLinear`, `isGround`, `size`, `depth`, `symbols`, `occurs`, `apply`, `compose`, `renameVars`, `show`, `showPos`, `showSubst`, `key` |
| parsing | `parseProgram(src)` (never throws; diagnostics), `parseStrict(src)`, `parseTerm(src, fixity?)`, `term(src)`, `rules(src)`, `showRule` |
| matching | `match`, `matchInto`, `matches`, `matchTrace` |
| rewriting | `system`, `fromProgram`, `redexes`, `step(sys, t, strategy)`, `normalize(sys, t, opts)`, `evaluate(sys, t, opts)` (fast innermost), `reductionGraph`, `rootRewrite`, `allReducts`, `normalizeInnermost`, `outermostStep`, `normalizeOutermost`, `builtin`, `conditionsHold` |
| unification | `unify(s, t, trace?)`, `unifyAll`, `renameApart`, `renameApartAll`, `variant` |
| orders | `precedence([...])`, `lpo`, `rpo`, `kbo`, `rpoExplain`, `lpoExplain`, `embeds`, `multisetGreater`, `lexGreater`, `orient` |
| termination | `poly` (polynomials: `constant`, `variable`, `add`, `sub`, `mul`, `substitute`, `positive`, `parsePoly`, `showPoly`), `interpretation`, `interpret`, `checkInterpretation`, `findLinearInterpretation`, `findPrecedence`, `dependencyPairs`, `dependencyGraph`, `sccs`, `dpProve`, `findLoop`, `proveTermination` |
| confluence | `criticalPairs`, `joinPair`, `isOrthogonal`, `isWeaklyOrthogonal`, `checkConfluence` |
| completion | `complete`, `normalizeWith`, `overlaps`, `canonical`, `orderedNormalize`, `prove`, `skolemize` |
| AC | `flatten`, `unflatten`, `acEqual`, `acMatch`, `acNormalize`, `acReducts`, `searchStates`, `goalPattern` |
| e-graphs | `EGraph` (`add`, `union`, `rebuild`, `find`, `ematch`, `extract`), `saturate`, `simplify`, `UnionFind` |
| strategies | `parseStrategy`, `run`, `runStrategy`, `envFromProgram` |
| performance | `HashCons`, `dagSize`, `evaluateShared`, `DiscriminationTree`, `preorder`, `decisionTree`, `treeTests`, `showTree`, `compileToJS` |
| semantics and computability | `parseLambda`, `bracketAbstraction`, `SKI`, `toDeBruijn`, `LAMBDA_UPSILON`, `tmRules`, `tmStart`, `readConfig`, `solvePCP`, `normalFormAutomaton`, `accepts`, `groundTerms` |

The source is in `courses/term-rewriting/src/lib/trs/` of the course repository, with its tests alongside.
