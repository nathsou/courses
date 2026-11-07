# Course plan: *Term Rewriting Systems*

The working plan for the course: decisions, through-lines, curriculum, the engine, interactive components,
quality gates and status. Update it when a decision changes or a chapter lands.

*Term Rewriting Systems* teaches term rewriting from first principles to research tools. The reader writes a complete
rewriting engine in TypeScript as they go (terms, matching, rewriting, strategies, hash-consing, indexing, decision
trees, path orders, unification, critical pairs, completion, AC matching, e-graphs, strategy combinators) and learns
the theory that says when it terminates and when its answers are unique. Rule files are written in Girafe syntax
(<https://github.com/nathsou/girafe>) and every listing runs in the page.

## 1. Positioning

| | |
|---|---|
| **Question it answers** | What is rewriting, how do you build a fast and correct rewriting engine, and how do you prove that a set of rules terminates and gives unique answers? |
| **Reader** | A mix of four readers, served by one spine: the *engine builder* (writes the engine), the *theory reader* (wants the proofs), the *applied reader* (simplifiers, optimisers, e-graphs) and the *semantics reader* (rewriting as the meaning of programs). The baseline is a programmer with school algebra. |
| **Standalone** | The course depends on no other course of the collection. Relations, orders, induction and well-foundedness are taught in it (Appendix A). Topics shared with other courses are taught in full here; a `:::bridge` may link out (CIC for β-confluence, Formal Verification chapter 12 for congruence closure, Incompleteness for undecidability, SSA to Silicon for compiler passes). |
| **Not** | Not a survey of tools without running anything; not a proof-assistant course (no machine-checked proofs). |

## 2. Decisions (agreed 6 November 2026, from a grilling session)

| Topic | Decision | Notes |
|---|---|---|
| Title | **Term Rewriting Systems**, subtitled *From your first rule to completion, e-graphs and the λ-calculus* (renamed from *Normal Forms* on 7 November 2026) | Slug `term-rewriting`, published at `/term-rewriting/`. |
| Reader | All four readers above | Reading paths on the home page: engine builder, theory, applied, semantics (`PATHS` in `content/outline.ts`). |
| Spine | **Theory in textbook order + one growing engine** | Terms, matching, rewriting, abstract reduction, strategies, performance, termination, confluence, completion, rewriting modulo, transformation, semantics, computability. Each part ends with a payoff built on the reader's engine. |
| Maths and proofs | **Assume little, prove a lot** | Appendix A teaches the background. Theorems carry `status=proved|sketched|stated`; core results are proved in full (Newman's lemma, the critical pair lemma, the multiset order, Higman's lemma, soundness of completion steps); Kruskal's tree theorem is sketched; deep results (Birkhoff, undecidability of termination via Huet–Lankford) are proved or sketched as the chapter says. Long proofs use `::::zoom` (Idea / Sketch / Proof). |
| What the reader types | **The rule language (Girafe syntax) + TypeScript** | Rule files for systems; TypeScript for engine algorithms, checked by tests. |
| Carry-forward | **Carry forward, with a swap** | An engine exercise (`code` with `provides`) that passes is saved; later exercises import `engine`, which is the reference with the reader's functions in place. A per-module switch on the *Your engine* page (`/engine/`) turns a module off. Feedback says which functions were the reader's. Widgets and figures always use the reference engine. |
| Scope | Core + all four extensions | Core: abstract reduction, terms and matching, strategies, termination, confluence, unification, Knuth–Bendix. Extensions: rewriting modulo AC and e-graphs; rewriting as semantics; strategies and transformation; computability. **Performance optimisations** (added after the grilling): a whole part on sharing, indexing and compilation. |
| Threads | **Each part has a home thread** | *The algebra system* (CAS): Parts I–V and VII. *The prover*: Part VI. *The toy language*: Parts VIII–X. All three appear in the prologue and meet in the epilogue. |
| Notation | **Girafe syntax** | Prefix terms, lower-case variables, `_` wildcards, `--` comments, `t?` laziness, `@add` externals, built-in `if`. |
| Girafe code | **Notation only; a new engine** | The course owns its engine (`src/lib/trs`), compatible with Girafe's examples. Girafe's ideas (Maranget decision trees, lazy rewriting on eager machinery, compiling to JavaScript) become Chapter 9. |
| Rule order | **A file is a set; `#priority` opts into Girafe's first-match semantics** | The theory chapters work on unordered systems; priority is introduced in Chapter 6 as one strategy among others. |
| Extensions to Girafe | `==` equations (as in the TPDB format), `#` pragmas, `[Label]` rules, `if` conditions with `->*` and `==`, `?` queries (`? s == t` goals), **opt-in infix** (`#infixl 6 +`) | Prefix always stays valid; both spellings parse to the same term, so answer keys compare trees. Infix operators need spaces around them. |
| Size | **34 chapters (0–33), 5 optional (◇)** | Each chapter is split into named sessions with a stopping point. |
| Site | SvelteKit 2 + Svelte 5, `adapter-static`, the collection's Markdown-with-directives compiler | Scaffolded from *The Prime Staircase*. |
| Design | **“Redex”**: squared paper, blue-black ink, a deep teal for rules and normal forms, one warm colour for the redex about to be contracted; by night a slate blackboard with chalk-yellow accents | Tokens in `src/app.css` (`--redex`, `--nf`). The chapter emblem is a small term tree with its redex lit. |
| Language | British English | |
| LLM | None | |

## 3. Through-lines

1. **Replace equals by equals.** Every part is the same move, studied from another side: which redex, how fast,
   does it stop, is the answer unique, can the rules be completed, what if equality itself is modulo a theory.
2. **Build the engine.** Engine chapters end with a module that joins the reader's engine. The *Your engine* page
   shows what is theirs.
3. **Normal forms are the point.** Termination says they exist, confluence says they are unique; together they turn
   a set of equations into a decision procedure.
4. **Undecidable in general, solvable in practice.** Termination and confluence are undecidable (Part X), yet the
   methods of Parts IV–VI settle almost every system a person writes.
5. **Every listing runs.** Each ```girafe block is a workbench.

## 4. Curriculum

| # | Part | Chapter | Builds / flagship |
|---|---|---|---|
| 0 | Prologue | Rewriting by hand | Workbench in manual mode; the three threads |
| 1 | I Terms and rewriting | Terms | `positions`, `at`, `replaceAt`; term explorer |
| 2 | | Substitution and matching | `apply`, `match`; matching stepper |
| 3 | | Rewriting | `rootRewrite`, `allReducts`; reduction graph |
| 4 | | Abstract reduction | ARS lab; Newman's lemma (proved) |
| 5 | II Programs and strategies | Strategies | `normalizeInnermost`, `outermostStep`, `normalizeOutermost`; strategy race |
| 6 | | Programming with rules | `#priority`, externals, laziness; the CAS's first simplifier and `d/dx` |
| 7 | III Making it fast | Sharing and memoisation | `HashCons`; sharing benchmark |
| 8 | | Term indexing | `DiscriminationTree`; index view |
| 9 | | Compiling rewrite rules | `treeTests`; decision trees and the JavaScript backend |
| 10 | IV Termination | Well-founded orders | multiset order (proved); hydra game |
| 11 | | Polynomial interpretations | `interpret`; interpretation checker |
| 12 | | Path orders | `lpo`; proof trees |
| 13 ◇ | | Why path orders terminate | Higman (proved), Kruskal (sketched); Kruskal's game |
| 14 ◇ | | Dependency pairs | dependency graph |
| 15 | V Confluence | Unification | `unify`; unification stepper |
| 16 | | Critical pairs | `criticalPairs`; critical pair lemma (proved) |
| 17 | | Orthogonality | parallel moves (sketched); decreasing diagrams (stated) |
| 18 | VI Completion | Equational reasoning | proof builder; Birkhoff (proved soundness, sketched completeness) |
| 19 | | Knuth–Bendix completion | `complete`; completion animator |
| 20 | | Unfailing completion | prover (exponent-2 groups are abelian) |
| 21 ◇ | | Completion elsewhere | group presentations, congruence closure, Buchberger |
| 22 | VII Rewriting modulo | Rewriting modulo AC | `flatten`, `acEqual`; AC matcher |
| 23 | | E-graphs | `UnionFind`; e-graph view |
| 24 | | Equality saturation | saturation; peephole optimiser |
| 25 | VIII Transformation | Strategy combinators | strategy interpreter |
| 26 | | Program transformation | the toy language's optimiser |
| 27 | IX Semantics | Reduction semantics | the toy language's interpreter |
| 28 | | λ-calculus and combinators | λ lab; λυ |
| 29 ◇ | | Higher-order rewriting | |
| 30 | | Rewriting logic | state-space search |
| 31 | X Computability | Rewriting computes everything | Turing machines; PCP |
| 32 ◇ | | Decidable islands | tree automata |
| 33 | Epilogue | Where rewriting lives | |

Appendices: A. The mathematics toolbox. B. The rule language. C. The engine. D. Glossary, timeline and bibliography.

## 5. The engine (`src/lib/trs`)

Pure TypeScript, no DOM, tested with Vitest (`core.test.ts`, `more.test.ts`).

| Module | Contents |
|---|---|
| `term.ts` | `Term`, positions, replacement, substitutions, printing with fixity |
| `parse.ts` | the rule language (Girafe + extensions), diagnostics with positions |
| `match.ts`, `unify.ts` | matching (with trace), Martelli–Montanari unification (with trace) |
| `rewrite.ts` | redexes, strategies, normalisation, reduction graphs, built-ins, laziness, conditions, the fast evaluator |
| `ars.ts` | finite abstract reduction systems and their properties |
| `orders.ts`, `poly.ts`, `termination.ts` | embedding, multiset/lexicographic extensions, LPO/RPO/KBO with explanations, polynomial interpretations and search, precedence search, dependency pairs, loop detection, a prover |
| `confluence.ts` | critical pairs, joinability, orthogonality, a confluence checker |
| `completion.ts` | Knuth–Bendix completion (logged), ordered rewriting, unfailing completion as a prover |
| `ac.ts` | flattening, AC matching (with extension), rewriting modulo AC, state-space search |
| `egraph.ts` | e-graphs with rebuilding, e-matching, saturation, extraction |
| `strategy.ts` | strategy combinators and their parser |
| `share.ts`, `indexing.ts`, `compile.ts` | hash-consing and memoised evaluation; discrimination trees; decision trees and the JavaScript backend |
| `lambda.ts`, `machines.ts`, `automata.ts` | λ-terms, bracket abstraction, SKI, λυ; Turing machines, string rewriting, PCP; tree automata |

## 6. Interactive components

| Component | What it does |
|---|---|
| **Workbench** (every ```girafe block) | Editable rules with live diagnostics; tabs *Run*, *Trace* (tree view, strategies or click-a-redex), *Termination*, *Confluence*, *Completion* (with `? s == t` goals proved by unfailing completion), *Strategy*, *Saturate*. Options: `tools`, `query`, `strategy`, `title`, `caption`, `readonly`, `order`. `static` makes a plain listing. |
| Shared widgets (`src/lib/widgets`) | MatchStepper, ReductionGraph, ArsLab, StrategyRace, UnifyStepper, ShareBench, IndexView, CompileView, HydraGame, PolyInterp, LpoProof, EmbeddingGame, DependencyGraph, CriticalPairs, ProofBuilder, CompletionAnimator, ACMatcher, EGraphView, LambdaLab, StateSpace, TuringLab, PcpLab, AutomatonView |
| *Your engine* (`/engine/`) | The reader's modules, with switches |

### Exercise types (fenced YAML blocks)

| Type | The reader… | Checked by |
|---|---|---|
| `code` | writes TypeScript; with `provides: [names]` it is an engine module | hidden tests in a worker; CI checks that the reference passes, the starter fails, and the reference still passes when every earlier engine module is the reader's (the references) |
| `numeric`, `quiz` | answers before a figure does | answer key |
| `parsons`, `blanks`, `bug`, `prove` | orders, completes, debugs or writes a proof | answer key or model answer |

## 7. Quality gates

`npm test` (engine, exercise contracts, content), `npm run check` (svelte-check), `npm run build`. From the monorepo
root: `npm run build`, `npm run audit`, `python3 scripts/check-course-navigation.py`. Screenshots in both themes and at
360 px for the workbench and the widgets.

## 8. Risks

| Risk | Mitigation |
|---|---|
| Four readers make the course sprawl | One spine, home threads per part, ◇ chapters, reading paths |
| Reader bugs break later exercises | The swap; feedback names the reader's functions; widgets always use the reference |
| Undecidable problems hang the page | Every engine call has fuel, node or iteration limits; searches are bounded and say so |
| Factual errors in history | Dates and attributions are in `content/bibliography.yaml` and `content/timeline.yaml`; when unsure, say less |

## 9. Status (6 November 2026)

All 34 chapters and the four appendices are written. The engine (58 unit tests), the workbench, 24 widgets and the
*Your engine* page are implemented; 14 engine modules carry forward, and every code exercise is checked in CI
(reference passes, starter fails, reference passes on the carried-forward engine). The built course passes the
collection's audit (41 pages, no issues) and a browser crawl of every page with every workbench tab exercised.

Known limits: the confluence checker ignores rule conditions; the course's unfailing completion computes all critical
pairs rather than ordered ones; the decision-tree compiler needs left-linear rules.
