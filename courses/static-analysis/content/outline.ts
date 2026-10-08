/**
 * The course outline: single source of truth for navigation. A chapter becomes readable when a matching
 * `chapters/<nn>-<slug>/index.md` exists; until then it is listed as planned. Slugs are fixed.
 */

export interface OutlineEntry {
  slug: string;
  number: string;
  title: string;
  summary: string;
  /** The flagship interactive. */
  flagship?: string;
  /** Optional deeper chapter (◇): the core path skips it. */
  optional?: boolean;
  /** A: SonarJS as it is; B: beyond SonarJS. */
  track?: 'A' | 'B';
  /** Year of the chapter's key historical moment, for the course map. */
  year?: number;
  event?: string;
}

export interface OutlinePart {
  id: string;
  title: string;
  /** Part opener page. */
  essay?: string;
  blurb: string;
  track?: 'A' | 'B';
  chapters: OutlineEntry[];
}

export const COURSE_TITLE = 'Every Path at Once';
export const COURSE_SUBTITLE = 'Static analysis, from your first lint rule to taint tracking and symbolic execution';

/** The SonarJS commit every reference in the course points to. */
export const SONARJS_COMMIT = 'da2c4022381bbd9896bc275f6a3a5bd45e8e3263';
export const SONARJS_SHORT = 'da2c402';

export const PARTS: OutlinePart[] = [
  {
    id: '0',
    title: 'Prologue',
    blurb: 'One issue followed from the editor back to the ten lines of code that raised it, and the theorem that says every rule must be wrong sometimes.',
    chapters: [
      { slug: 'one-issue', number: '0', title: 'One issue, end to end', summary: 'An issue in your editor, the rule that raised it, and your first rule: ten lines that find Math.random wherever it hides.', flagship: 'Rule workbench', track: 'A' },
      { slug: 'every-rule-is-approximate', number: '1', title: 'Why every rule is approximate', summary: 'The halting problem, Rice’s theorem, false positives and false negatives, and rules that ask for a review instead of a verdict.', flagship: 'The impossible analyser', track: 'A', year: 1953, event: 'Rice’s theorem' },
    ],
  },
  {
    id: 'I',
    title: 'Trees',
    essay: 'trees',
    track: 'A',
    blurb: 'From text to syntax trees, the anatomy of a rule, how rules are tested, and how they report what they find.',
    chapters: [
      { slug: 'source-to-estree', number: '2', title: 'Source to ESTree', summary: 'Tokens, grammars and abstract syntax trees; ESTree and its TypeScript extension; the three parsers SonarJS tries, in order.', flagship: 'AST explorer', track: 'A', year: 2013, event: 'ESLint’s first release' },
      { slug: 'anatomy-of-a-rule', number: '3', title: 'Anatomy of a rule', summary: 'Visitors and selectors, the rule context, a SonarJS rule folder, and your own areEquivalent behind S1764.', flagship: 'Rule workbench', track: 'A' },
      { slug: 'testing-rules', number: '4', title: 'Testing rules', summary: 'Comment-based fixtures, RuleTester, hidden cases, and writing fixtures that catch broken rules.', flagship: 'Fixture adversary', track: 'A' },
      { slug: 'reporting', number: '5', title: 'Reporting', summary: 'Messages, primary and secondary locations, cost, the sonarRuntime encoding, and quick fixes.', flagship: 'Issue anatomy', track: 'A' },
      { slug: 'cognitive-complexity', number: '6', title: 'Cognitive Complexity', summary: 'A metric designed to match how hard code is to understand, the rule that enforces it, and the analyser that borrows it.', flagship: 'Complexity annotator', track: 'A', year: 2018, event: 'Cognitive Complexity at TechDebt' },
    ],
  },
  {
    id: 'II',
    title: 'Names, modules and types',
    essay: 'names-modules-and-types',
    track: 'A',
    blurb: 'What a name refers to, where an import comes from, what TypeScript knows about a value, and how to stand on other people’s rules.',
    chapters: [
      { slug: 'scopes', number: '7', title: 'Scopes', summary: 'Scopes, variables and references; following a variable to the one place it is written.', flagship: 'Scope inspector', track: 'A' },
      { slug: 'modules-and-fqns', number: '8', title: 'Modules and fully qualified names', summary: 'Imports, require and destructuring, resolved to names that do not care what a file calls things.', flagship: 'Rule workbench', track: 'A' },
      { slug: 'types', number: '9', title: 'Types', summary: 'The TypeScript compiler API, parser services, how SonarJS builds programs, and narrowing as flow-sensitivity for free.', flagship: 'Type inspector', track: 'A', year: 2012, event: 'TypeScript 0.8' },
      { slug: 'standing-on-other-rules', number: '10', title: 'Standing on other rules', summary: 'Original, decorated and external rules: reusing ESLint’s rules and removing their false positives.', flagship: 'Decorate exercise', track: 'A' },
      { slug: 'regular-expressions', number: '11', title: 'Regular expressions', summary: 'Regexes as trees, automata, why backtracking explodes, and how S5852 finds the explosion.', flagship: 'Backtracking counter', track: 'A', year: 1968, event: 'Thompson’s regex search' },
    ],
  },
  {
    id: 'III',
    title: 'Flow',
    essay: 'flow',
    track: 'A',
    blurb: 'Control-flow graphs, lattices and fixpoints, and the dataflow analyses SonarJS runs on ESLint’s code paths.',
    chapters: [
      { slug: 'code-paths', number: '12', title: 'Code paths', summary: 'Basic blocks and control-flow graphs, ESLint’s code-path segments, and rules that reason about every path.', flagship: 'Code-path viewer', track: 'A' },
      { slug: 'lattices-and-fixpoints', number: '13', title: 'Lattices and fixpoints', summary: 'Partial orders, joins, monotone functions and the worklist algorithm that finds the least fixpoint.', flagship: 'Fixpoint stepper', track: 'A', year: 1973, event: 'Kildall’s unified approach' },
      { slug: 'liveness', number: '14', title: 'Liveness and dead stores', summary: 'Backward analysis with gen and kill sets, and your own liveness analysis behind S1854.', flagship: 'Fixpoint stepper', track: 'A' },
      { slug: 'reaching-definitions', number: '15', title: 'Reaching definitions and value sets', summary: 'Forward analysis, value sets, and the redundant assignments of S4165.', flagship: 'Fixpoint stepper', track: 'A' },
      { slug: 'without-a-cfg', number: '16', title: 'How far without a control-flow graph?', summary: 'S2589 finds gratuitous conditions with branch-local facts; a flow-sensitive version, compared on the corpus.', flagship: 'Ruling diff', track: 'A' },
    ],
  },
  {
    id: 'IV',
    title: 'SonarJS end to end',
    essay: 'sonarjs-end-to-end',
    track: 'A',
    blurb: 'The whole analyser: from the scanner’s Java plugin to a Node.js process, through parsers, programs and rules, and back as issues.',
    chapters: [
      { slug: 'scanner-to-node', number: '17', title: 'From scanner to Node', summary: 'The Java plugin, finding Node.js, the gRPC service, the lease, and one analysis at a time.', flagship: 'Follow the issue', track: 'A' },
      { slug: 'inside-one-analysis', number: '18', title: 'Inside one analysis', summary: 'File stores, programs, the parser router, rule filters, issue decoding, metrics, highlighting and CPD tokens.', flagship: 'What happens if…', track: 'A' },
      { slug: 'ide-and-server', number: '19', title: 'The IDE and the server', summary: 'SonarQube for IDE against SonarQube Server and Cloud: incremental programs, caches and pull-request analysis.', flagship: 'Scenarios', track: 'A' },
      { slug: 'shipping-a-rule', number: '20', title: 'Shipping a rule', summary: 'RSPEC, generated metadata and Java checks, Sonar way, ruling tests, eslint-plugin-sonarjs and custom rules.', flagship: 'Ship-it checklist', track: 'A' },
      { slug: 'false-positives', number: '21', title: 'False positives and trust', summary: 'Why developers stop reading issues, Clean as You Code, triage, and the research behind one rule’s exceptions.', flagship: 'Triage', track: 'A', year: 2010, event: 'A few billion lines of code later' },
    ],
  },
  {
    id: 'V',
    title: 'Approximate',
    essay: 'approximate',
    track: 'B',
    blurb: 'Abstract interpretation: compute facts about every execution at once by computing with descriptions of values instead of values.',
    chapters: [
      { slug: 'intervals-and-widening', number: '22', title: 'Intervals and widening', summary: 'Abstract values, abstract execution, the interval domain, and widening to make loops terminate.', flagship: 'Interval stepper', track: 'B', year: 1977, event: 'Cousot and Cousot' },
      { slug: 'soundness', number: '23', title: 'Soundness', summary: 'Abstraction and concretisation, Galois connections, best transformers, and testing a domain against the interpreter.', flagship: 'Galois view', track: 'B' },
      { slug: 'combining-domains', number: '24', title: 'Combining domains', summary: 'Products, reduced products, trace partitioning, and relational domains in brief.', flagship: 'Domain comparison', track: 'B', optional: true, year: 2001, event: 'Miné’s octagons' },
    ],
  },
  {
    id: 'VI',
    title: 'Across functions and objects',
    essay: 'across-functions-and-objects',
    track: 'B',
    blurb: 'Call graphs, summaries, IFDS as graph reachability, and the pointer analyses that tell you which objects a name can hold.',
    chapters: [
      { slug: 'call-graphs', number: '25', title: 'Call graphs', summary: 'Callbacks, closures and methods; call graphs from names, classes and points-to; soundiness.', flagship: 'Call-graph view', track: 'B' },
      { slug: 'summaries-and-ifds', number: '26', title: 'Summaries and IFDS', summary: 'Inlining versus summaries, context sensitivity, and IFDS: dataflow as reachability along matched calls and returns.', flagship: 'Exploded supergraph', track: 'B', year: 1995, event: 'Reps, Horwitz and Sagiv' },
      { slug: 'points-to-and-datalog', number: '27', title: 'Points-to analysis and Datalog', summary: 'Aliasing, Andersen against Steensgaard, and pointer analysis as four Datalog rules.', flagship: 'Datalog console', track: 'B', optional: true, year: 1994, event: 'Andersen’s thesis' },
    ],
  },
  {
    id: 'VII',
    title: 'Taint',
    essay: 'taint',
    track: 'B',
    blurb: 'Untrusted data flowing into dangerous places: injection explained from the ground up, then tracked through a program.',
    chapters: [
      { slug: 'how-injection-works', number: '28', title: 'How injection works', summary: 'HTTP, SQL, HTML, shells and paths; SQL injection, XSS, path traversal, command injection and SSRF; why parameters and escaping work.', flagship: 'Injection playground', track: 'B', year: 1998, event: 'SQL injection described in Phrack' },
      { slug: 'taint-analysis', number: '29', title: 'Taint analysis', summary: 'Sources, sinks, sanitizers, validators and passthroughs; taint across functions; a Hotspot turned into a proof of a vulnerability.', flagship: 'Taint tracer', track: 'B', year: 2014, event: 'FlowDroid' },
      { slug: 'implicit-flows', number: '30', title: 'Implicit flows and noninterference', summary: 'Leaking a secret one branch at a time, the pc label, and security type systems.', flagship: 'Leak-a-bit', track: 'B', optional: true, year: 1976, event: 'Denning’s lattice model' },
    ],
  },
  {
    id: 'VIII',
    title: 'Paths',
    essay: 'paths',
    track: 'B',
    blurb: 'Symbolic execution: run the program on symbols instead of values, and ask a solver which inputs take each path.',
    chapters: [
      { slug: 'symbolic-execution', number: '31', title: 'Symbolic execution', summary: 'Path conditions, path trees, satisfiability, a SAT solver and bit-blasting, and a path-sensitive null check.', flagship: 'Path tree', track: 'B', year: 1976, event: 'King’s symbolic execution' },
      { slug: 'fuzzing-and-concolic', number: '32', title: 'Fuzzing and concolic testing', summary: 'Random and coverage-guided fuzzing, magic numbers, and concrete-plus-symbolic execution.', flagship: 'Fuzzer race', track: 'B', optional: true, year: 2005, event: 'DART' },
    ],
  },
  {
    id: 'E',
    title: 'Epilogue',
    blurb: 'Where the techniques sit relative to one another, and where to go next.',
    chapters: [{ slug: 'where-next', number: '33', title: 'Where to go next', summary: 'The ladder from patterns to paths, what each step costs, and further reading.', flagship: 'The ladder' }],
  },
];

export interface AppendixEntry {
  slug: string;
  number: string;
  title: string;
  summary: string;
}

export const APPENDICES: AppendixEntry[] = [
  { slug: 'maths-toolbox', number: 'A', title: 'Maths toolbox', summary: 'Sets, relations, orders, functions, induction and fixpoints.' },
  { slug: 'rule-api', number: 'B', title: 'The rule API', summary: 'ESLint rules, contexts, selectors, code paths and parser services, at a glance.' },
  { slug: 'the-kit', number: 'C', title: 'The course kit', summary: 'Every helper, what it does, and its SonarJS counterpart.' },
  { slug: 'sonarjs-map', number: 'D', title: 'A map of SonarJS', summary: 'The repository at the pinned commit, component by component.' },
  { slug: 'glossary-and-bibliography', number: 'E', title: 'Glossary and bibliography', summary: 'Every term and every source.' },
];

export const READING_PATHS: { id: string; title: string; blurb: string; chapters: string[] }[] = [
  {
    id: 'sonarjs',
    title: 'SonarJS rule engineer',
    blurb: 'Track A: write, test and ship rules the way SonarJS does, and know the analyser end to end.',
    chapters: PARTS.flatMap((p) => p.chapters).filter((c) => c.track === 'A').map((c) => c.slug),
  },
  {
    id: 'theory',
    title: 'The theory of static analysis',
    blurb: 'The core of both tracks: trees, flow, abstract interpretation, interprocedural and taint analysis, symbolic execution.',
    chapters: ['one-issue', 'every-rule-is-approximate', 'source-to-estree', 'anatomy-of-a-rule', 'code-paths', 'lattices-and-fixpoints', 'liveness', 'intervals-and-widening', 'soundness', 'call-graphs', 'summaries-and-ifds', 'how-injection-works', 'taint-analysis', 'symbolic-execution', 'where-next'],
  },
];
