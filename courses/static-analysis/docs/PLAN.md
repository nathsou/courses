# Course plan: *Every Path at Once*

The working plan for the course: decisions, through-lines, curriculum, interactive components, toolchain,
quality gates and milestones. Update it when a decision changes or a chapter lands.

The course teaches static analysis by having the reader **write real analysis rules**. The rules are ESLint
rules in TypeScript, the format SonarJS (Sonar's JavaScript and TypeScript analyser) writes its rules in. They are
edited in the browser with a TypeScript language server, run by the real ESLint and typescript-eslint on fixtures in
SonarJS's comment-based test format, and measured on a small corpus the way SonarJS's ruling tests measure them. The
first half teaches analysis as SonarJS does it today, with SonarJS's architecture and utilities as the running
example. The second half teaches the theory that goes beyond it: abstract interpretation, interprocedural analysis,
pointer analysis, taint analysis and symbolic execution, built as engines the reader drives from the same rule API,
with other analysers (Astrée, Infer, CodeQL, FlowDroid, KLEE and others) as the concrete examples.

## 1. Positioning

| | |
|---|---|
| **Question it answers** | How do tools find bugs in large codebases nobody has specified, how does a production analyser (SonarJS) actually do it, and how do I write such rules myself? |
| **Reader** | A programmer who reads and writes TypeScript or JavaScript. No compilers, no logic, no maths beyond school algebra, no security background. A SonarJS engineer is the most demanding reader: every claim about SonarJS must survive their reading. |
| **Standalone** | The course depends on no other course of the collection. Everything it uses is taught in it: grammars and ASTs, graphs, lattices, fixpoints, the TypeScript compiler API, web injection, SAT solving. No chapter tells the reader to read another course first. |
| **Not** | Not a tour of forty tools without running any; not a course in using SonarQube; not a formal-verification course (no specifications, no proofs of correctness). |

## 2. Decisions

| Topic | Decision | Notes |
|---|---|---|
| Title | **Every Path at Once**, subtitled *static analysis, from your first lint rule to taint tracking and symbolic execution* | Slug `static-analysis`, published at `/static-analysis/`. |
| Tracks | **Track A, SonarJS as it is** (chapters 0–21) and **Track B, beyond SonarJS** (22–33) | Every chapter carries its track. Reading paths: *SonarJS rule engineer* (0–21) and *the whole course*. |
| Theory and examples | Theory is taught for its own sake, as in any textbook; SonarJS (Track A) or other analysers (Track B) are the concrete examples | Track B examples: Astrée, Frama-C EVA and IKOS (abstract interpretation); Infer (summaries); FlowDroid and CodeQL (taint, Datalog); Doop and Soufflé (points-to); KLEE, SAGE and angr (symbolic execution); AFL and libFuzzer (fuzzing); the Clang Static Analyzer (path-sensitive checking). |
| Vocabulary | Sonar's terms, each defined at first use: issue, rule, rule key, RSPEC, quality profile, quality gate, new code, Security Hotspot, secondary location, quick fix, `NOSONAR`, software qualities | Sonar's terms keep Sonar's spelling ("sanitizer"); the rest is British English. |
| SonarJS facts | Pinned to **SonarJS commit `da2c4022381bbd9896bc275f6a3a5bd45e8e3263`** (8 October 2026). Every reference is a `:::source{path symbol}` callout; `npm run check:sources` clones that commit and fails if a path or symbol has gone | The repository's own `CLAUDE.md`, `.claude/skills/*` and parts of `docs/DEV.md` describe an older layout; the course is written from the code. |
| Licence | **No SonarJS code is copied.** The course kit is our own implementation with the same names and shapes; quotations are short, attributed and linked to the pinned commit | SonarJS is under the SONAR Source-Available License v1 (`LICENSE.txt`; the root `package.json` still says `LGPL-3.0-only`). |
| What SonarJS does not contain | Said plainly where it matters: no taint analysis (a separate closed plugin ran taint rules through the `EslintHook` API; `docs/sonar-cache.md` records that integration as removed in November 2025), no symbolic execution, no abstract-interpretation engine; S2583, S3649 and S5131 have no implementation in the repository | The course does not describe Sonar's closed engines beyond what the repository states. |
| Reader's work | **The reader writes rules** (and some helpers and analyses) in TypeScript | Unlike the collection's verification course, writing the analysis is the skill being taught. |
| Rule runtime | **Real ESLint 9 (`eslint/universal`) with `@typescript-eslint/parser` 8 and TypeScript 6** in a Web Worker, given an in-memory `ts.Program` so type-aware rules work | Versions match SonarJS's pins (ESLint 9.39.5, typescript-eslint 8.71.0, TypeScript 6.0.3). Node built-ins are stubbed for the worker bundle (`vite.config.ts`). |
| Editor | CodeMirror 6 with `@codemirror/lsp-client`, talking to **a TypeScript language server in a Web Worker** (TypeScript's `LanguageService` behind a small LSP adapter) | Diagnostics, completion, hover with the kit's documentation, signature help, go to definition (into read-only kit sources), references, rename and TypeScript's code fixes. |
| Tests | **SonarJS's comment-based format** (`// Noncompliant@+1 {{message}}`, `^^^` ranges, `^^<`/`^^>` secondary locations, `[[qf1]]` quick fixes), implemented by the course | Plus hidden fixtures per exercise, and a small *ruling* corpus with expected issues. |
| Track B engines | Our own, in TypeScript, over a small IR lowered from the ESTree of a JavaScript subset: dataflow framework, intervals with widening, call graphs, IFDS taint, Andersen and Steensgaard points-to, a Datalog engine, and a symbolic executor on our own CDCL SAT solver and bit-blaster | Integers in the symbolic executor are bounded with no-overflow side conditions, so every input it reports is a real JavaScript execution (an under-approximation, said so). |
| Running example | **Corkboard**, a small Express-style community noticeboard in TypeScript, with planted issues across Reliability, Security and Maintainability | Its runtime (`express`, `db`, `fs`, `fetch`, `logger`) is a typed fake; nothing is executed against a real database or network. |
| LLM | None | |
| Site | SvelteKit 2 + Svelte 5, `adapter-static`, TypeScript 6, the collection's Markdown-with-directives compiler | Scaffolded from Memory Management. |
| Design | **"Lamp and lattice"**: drafting paper with ink-blue and amber by day; a reviewer's desk at night, slate with an amber lamp | Shares the collection's `theme` key. The chapter emblem is the Hasse diagram of the powerset of four elements with the chapter number lit in binary. |
| Language | British English | |

## 3. Through-lines

1. **Every rule is an approximation.** Rice's theorem (chapter 1) says no rule decides an interesting property
   of programs exactly. Every rule picks its errors: false positives (issues on correct code) or false negatives
   (missed bugs). The *may/must grid* returns in every part.
2. **Write the rule.** Every chapter of Track A ships a rule; most chapters of Track B ship one too, now backed by an
   engine the reader has studied.
3. **The corpus keeps us honest.** Each rule runs on the corpus (Corkboard and three small projects with traps),
   and a *ruling diff* shows what changed. Precision and recall against the planted ground truth are shown where
   the corpus has one.
4. **Know where your facts come from.** Each SonarJS claim links to the pinned source; each Track B claim cites
   the paper or the tool's documentation.
5. **Everything is a fixpoint.** Liveness, reaching definitions, intervals, points-to, IFDS and Datalog are
   computed by the same idea: iterate until nothing changes.

## 4. Curriculum

### Prologue

| # | Chapter | Key ideas | Flagship interactive |
|---|---|---|---|
| 0 | One issue, end to end | An S1764 issue traced from the editor back to its rule; the first 10-line rule (`Math.random` through a fully qualified name, as S2245 does) | Rule workbench (first use) |
| 1 | Why every rule is approximate | The halting problem, Rice's theorem, false positives and negatives, may and must, Security Hotspots versus issues | Halting gadget; may/must grid |

### Track A, Part I: Trees

| # | Chapter | Key ideas | Flagship |
|---|---|---|---|
| 2 | Source to ESTree | Tokens, grammars, parse trees and ASTs; ESTree and TSESTree; SonarJS's parser order (typescript-eslint, then Babel as a module, then as a script; vue-eslint-parser) | AST explorer |
| 3 | Anatomy of a rule | ESLint's rule API: `create`, visitors, selectors, `context.report`, messages and options; the SonarJS rule folder; RSPEC and `generateMeta`; rebuild `areEquivalent` → S1764 | Rule workbench |
| 4 | Testing rules | Comment-based tests, RuleTester, hidden cases; writing fixtures that catch broken rules | Fixture adversary |
| 5 | Reporting | Messages, primary and secondary locations, cost, the `sonarRuntime` JSON encoding and its decoding, fixes versus suggestions, quick fixes | Issue anatomy |
| 6 | Cognitive Complexity | The metric and its rules; S3776; how the analyser runs S3776 in `silence-issues` mode to collect the metric; cyclomatic complexity, ncloc, CPD tokens | Complexity annotator |

### Track A, Part II: Names, modules and types

| # | Chapter | Key ideas | Flagship |
|---|---|---|---|
| 7 | Scopes | Scope analysis: scopes, variables, references; rebuild `getVariableFromName`, `getUniqueWriteUsage`, `getValueOfExpression` | Scope inspector |
| 8 | Modules and fully qualified names | Imports, `require`, re-exports; rebuild `getFullyQualifiedName`; dependency manifests and dependency-based rule filtering; S2245, S2068 | FQN resolver |
| 9 | Types | The TypeScript compiler API (programs, checkers, symbols, types, flags); parser services; how SonarJS creates programs (tsconfigs, orphan files, incremental programs); narrowing as flow-sensitivity (S2259) | Type inspector |
| 10 | Standing on other rules | Original, decorated and external rules; `interceptReport`, `mergeRules`; removing a false-positive class from an upstream rule | Decorate exercise |
| 11 | Regular expressions | Regexes as trees (regexpp), `createRegExpRule`; automata; why backtracking explodes; S5852 and `scslre` | Backtracking counter |

### Track A, Part III: Flow

| # | Chapter | Key ideas | Flagship |
|---|---|---|---|
| 12 | Code paths | Control-flow graphs and basic blocks; ESLint's code-path analysis (segments, events, loops, unreachable code); S3516, S3801 | Code-path viewer |
| 13 | Lattices and fixpoints | Partial orders, joins, height, monotone functions, Kleene iteration, worklists | Lattice lab; fixpoint stepper |
| 14 | Liveness and dead stores | Gen and kill, backward analysis; rebuild `lva` → S1854 | Fixpoint stepper (liveness) |
| 15 | Reaching definitions and value sets | Forward analysis, value-set domains; S4165 | Fixpoint stepper (reaching definitions) |
| 16 | How far without a control-flow graph? | S2589's branch-local facts against a flow-sensitive version on the corpus | Ruling diff |

### Track A, Part IV: SonarJS end to end

| # | Chapter | Key ideas | Flagship |
|---|---|---|---|
| 17 | From scanner to Node | The Java plugin and `WebSensor`; finding Node (setting, embedded runtime, host); the gRPC `AnalyzeProjectService` (`AnalyzeProject` stream, `CancelAnalysis`, `Lease`); the single worker thread and the queue of four | Follow the issue (part 1) |
| 18 | Inside one analysis | File stores, the three program paths and orphan files, the parser router, rule filters and option materialisation, `eslint-disable` remapping, issue and quick-fix transformation, metrics, highlighting, CPD tokens, embedded JavaScript, the protobuf ESTree | Follow the issue (part 2); *What happens if…* |
| 19 | The IDE and the server | SonarQube for IDE against SonarQube Server and Cloud: incremental programs, caches, pull-request analysis and `SKIP_UNCHANGED` | Comparison table; scenarios |
| 20 | Shipping a rule | RSPEC → `generate-meta` → generated Java checks → Sonar way; unit, comment-based and ruling tests; `eslint-plugin-sonarjs`; the custom-rules API (`EslintHook`, `RulesBundle`) | Ship-it checklist exercise |
| 21 | False positives and trust | Why developers stop reading issues; Clean as You Code; triage statuses; reading a ruling diff; S6747's research log | Triage exercise |

### Track B, Part V: Approximate

| # | Chapter | Key ideas | Flagship |
|---|---|---|---|
| 22 | Intervals and widening | Abstract values, abstract execution of the IR, the interval domain, widening and narrowing, false alarms; Astrée and Frama-C EVA as examples | Interval stepper |
| 23 | Soundness | Concretisation and abstraction, Galois connections, best transformers, testing a domain's soundness against the interpreter | Galois view |
| 24 ◇ | Combining domains | Products, reduced products, trace partitioning, relational domains in brief (octagons) | Domain comparison |

### Track B, Part VI: Across functions and objects

| # | Chapter | Key ideas | Flagship |
|---|---|---|---|
| 25 | Call graphs | Callbacks, closures, methods; CHA, RTA and points-to-based call graphs; soundiness | Call-graph view |
| 26 | Summaries and IFDS | Inlining versus summaries, context sensitivity (call strings), IFDS as graph reachability, valid paths as matched parentheses; FlowDroid and Infer as examples | Exploded supergraph |
| 27 ◇ | Points-to analysis and Datalog | Aliasing; Andersen versus Steensgaard; union-find; Datalog with semi-naive evaluation; Doop, Soufflé and CodeQL | Points-to graph; Datalog console |

### Track B, Part VII: Taint

| # | Chapter | Key ideas | Flagship |
|---|---|---|---|
| 28 | How injection works | HTTP requests, SQL, HTML, shells and paths; SQL injection, XSS, path traversal, command injection, SSRF; parameterising and escaping | Injection playground |
| 29 | Taint analysis | Sources, sinks, sanitizers, validators, passthroughs; taint over the call graph; turning the S2077 Hotspot into a taint-proven rule (the course's, not Sonar's); CodeQL and FlowDroid as examples | Taint tracer |
| 30 ◇ | Implicit flows and noninterference | The pc label, Denning's lattice, security type systems, declassification | Leak-a-bit |

### Track B, Part VIII: Paths

| # | Chapter | Key ideas | Flagship |
|---|---|---|---|
| 31 | Symbolic execution | Symbolic values, path conditions, path trees, path explosion; satisfiability and a CDCL solver; bit-blasting; KLEE and the Clang Static Analyzer as examples; a path-sensitive null rule against S2259's narrowing | Path tree |
| 32 ◇ | Fuzzing and concolic testing | Random and coverage-guided fuzzing, magic numbers, DART and SAGE, hybrid fuzzing (Driller) | Fuzzer race |

### Epilogue

| # | Chapter | Key ideas |
|---|---|---|
| 33 | Where to go next | The ladder from patterns to paths; what each technique costs; directions for SonarJS-style analysers; further reading |

**Appendices.** A. Maths toolbox (sets, relations, orders, functions, induction, fixpoints). B. The rule API (ESLint
rules, code paths, parser services). C. The course kit (every helper, with its SonarJS counterpart). D. A map of
SonarJS (the pinned paths, by component). E. Glossary and bibliography.

## 5. Interactive components

| Component | What it does |
|---|---|
| **Rule workbench** | Rule editor (TypeScript language server), fixture editor, results (each expectation *matched*, *missing*, *unexpected* or *wrong location/message*; quick fixes as diffs), and an inspector tab (AST, scope, type, code path) synced to the fixture cursor. Hidden fixtures and the corpus run on *Submit*. Results are bound to the source they ran on and cleared on edit. Export as a SonarJS-shaped folder. |
| **AST explorer** | Source → ESTree tree; click a node to highlight its range; types and scopes on demand |
| **Code-path viewer** | ESLint's code-path segments for a function, laid out as a graph |
| **Fixpoint stepper** | A CFG with facts on every node; step the worklist, choose the order, toggle widening |
| **Lattice lab** | Hasse diagrams of small lattices; joins and meets |
| **Follow the issue** | The SonarJS pipeline as stages, with the real data shape at each boundary, and scenarios to predict |
| **Taint tracer, call-graph view, points-to graph, Datalog console, exploded supergraph, path tree, fuzzer race** | Track B engines, made visible |

### Exercise types (fenced YAML blocks)

| Type | The reader… | Checked by |
|---|---|---|
| `rule` | writes or completes a rule | the comment-based fixtures (visible and hidden); the corpus where given; the reference solution passes and the starter fails at build time |
| `helper` | implements a helper function (`areEquivalent`, `lva`, …) | unit tests run in the worker |
| `fixtures` | writes fixtures that catch every broken variant of a rule | each mutant must fail and the reference must pass |
| `quiz`, `predict` | answers before a figure does | answer key |
| `parsons` | orders the steps of an algorithm or pipeline | answer key |
| `numeric` | computes a value (complexity, fixpoint iterations) | answer and tolerance |

Feedback always names what was established: *fixtures passed (visible)*, *hidden fixtures passed*, *corpus
unchanged*, *tests passed*, *answer checked*.

## 6. Architecture

- `src/lib/sa/runtime/`: the rule runtime (Linter configuration, in-memory TypeScript programs, the standard
  library declarations, Corkboard's runtime declarations), the comment-based test parser and checker, the corpus.
- `src/lib/sa/kit/`: the course kit, mirroring SonarJS's helpers (`ast`, `equivalence`, `location`, `module`,
  `type`, `parser-services`, `ancestor`, `decorators`, `lva`, `reaching-definitions`, `regex`). Each file says
  which SonarJS module it corresponds to.
- `src/lib/sa/lsp/`: the TypeScript language server worker.
- `src/lib/sa/ir/`, `absint/`, `callgraph/`, `ifds/`, `pointsto/`, `datalog/`, `sat/`, `symex/`: Track B engines.
- `src/lib/components/`: the workbench and the widgets.
- `content/`: chapters, parts, appendices, glossary, bibliography, `corkboard/` (the running example).

Every engine module has Vitest tests. Every `rule` exercise is checked in CI: the reference solution passes its
visible and hidden fixtures and the starter does not.

## 7. Quality gates

`npm test` (engines, kit, comment-based checker, every exercise), `npm run check` (svelte-check), `npm run build`,
`npm run check:sources` (needs network: every SonarJS reference resolves at the pinned commit). Screenshots in
both themes and at 360 px for every widget.

## 8. Risks

| Risk | Mitigation |
|---|---|
| Worker bundle size (TypeScript, ESLint, typescript-eslint ≈ 5 MB) | Lazy-loaded on the first interactive use; prose and figures never wait for it |
| SonarJS moves | Pinned commit; `check:sources` lists the chapters to review when the pin moves |
| Saying more about Sonar than the code shows | Only the pinned repository and Sonar's public documentation are sources |

## 9. Status

See §10 at the end of the file (updated as chapters land).

## 10. Status log

- 2026-10-08: plan written; browser spike (ESLint 9 + typescript-eslint + TypeScript type checker in a worker) works.
