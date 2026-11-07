/**
 * The course outline: single source of truth for navigation. A chapter becomes readable when a
 * matching `chapters/<nn>-<slug>/index.md` exists; until then it is listed as planned. Slugs are fixed.
 */

/** The three running threads: a computer-algebra system, an equational prover, a toy language. */
export type Thread = 'cas' | 'prover' | 'language' | 'all';

export interface OutlineEntry {
  slug: string;
  number: string;
  title: string;
  summary: string;
  /** The result or idea the chapter is built around (shown on the home page's timeline). */
  theorem?: string;
  /** Year of that result, for the timeline. */
  year?: number;
  /** Optional deeper chapter (◇): the core path skips it. */
  optional?: boolean;
  /** The engine module the reader writes in this chapter, if any. */
  builds?: string;
}

export interface OutlinePart {
  id: string;
  title: string;
  blurb: string;
  thread?: Thread;
  chapters: OutlineEntry[];
}

export const COURSE_TITLE = 'Term Rewriting Systems';
export const COURSE_SUBTITLE = 'From your first rule to completion, e-graphs and the λ-calculus';

export const THREADS: Record<Exclude<Thread, 'all'>, { name: string; blurb: string }> = {
  cas: { name: 'The algebra system', blurb: 'A small computer-algebra system: simplification, derivatives, normal forms of polynomials and the cheapest equivalent expression.' },
  prover: { name: 'The prover', blurb: 'An equational theorem prover: from rewriting to Knuth–Bendix completion and unfailing completion.' },
  language: { name: 'The toy language', blurb: 'A small programming language whose interpreter, optimiser and semantics are all rewrite systems.' },
};

export const PARTS: OutlinePart[] = [
  {
    id: '0',
    title: 'Prologue',
    thread: 'all',
    blurb: 'Three problems, one mechanism: simplify an expression, run a program, prove an identity, all by replacing equals by equals.',
    chapters: [
      { slug: 'rewriting-by-hand', number: '0', title: 'Rewriting by hand', summary: 'Differentiate an expression, add two numbers and prove a group identity by rewriting, then write your first rules in Girafe.' },
    ],
  },
  {
    id: 'I',
    title: 'Terms and rewriting',
    thread: 'cas',
    blurb: 'Terms as trees, substitution and matching, the rewrite relation, and the abstract properties every later part is about.',
    chapters: [
      { slug: 'terms', number: '1', title: 'Terms', summary: 'Signatures, terms as trees, positions, subterms and replacement: the data structure of the whole course.', builds: 'terms and positions' },
      { slug: 'matching', number: '2', title: 'Substitution and matching', summary: 'Substitutions, instances, and the algorithm that decides whether a rule applies.', builds: 'matching' },
      { slug: 'rewriting', number: '3', title: 'Rewriting', summary: 'Rules, redexes, one rewrite step, normal forms and the reduction graph of a term.', builds: 'one-step rewriting' },
      { slug: 'abstract-reduction', number: '4', title: 'Abstract reduction', summary: 'Termination, confluence, the Church–Rosser property and Newman’s lemma, for any relation at all.', theorem: 'Newman’s lemma', year: 1942 },
    ],
  },
  {
    id: 'II',
    title: 'Programs and strategies',
    thread: 'cas',
    blurb: 'Which redex to contract, and what that choice does to the answer, the cost and whether you get one at all; then rules as a programming language.',
    chapters: [
      { slug: 'strategies', number: '5', title: 'Strategies', summary: 'Innermost and outermost, call by value and call by need, normalising strategies and the cost of each.', builds: 'strategies', theorem: 'Leftmost-outermost normalises orthogonal systems', year: 1977 },
      { slug: 'programming-with-rules', number: '6', title: 'Programming with rules', summary: 'Constructors and defined symbols, priority, built-in arithmetic and laziness: the algebra system’s first simplifier and derivative.' },
    ],
  },
  {
    id: 'III',
    title: 'Making it fast',
    thread: 'cas',
    blurb: 'A rewriting engine spends its time copying terms and trying rules that do not apply. Sharing, indexing and compilation remove most of that work.',
    chapters: [
      { slug: 'sharing', number: '7', title: 'Sharing and memoisation', summary: 'Hash-consing, maximal sharing, constant-time equality and a table of normal forms that turns exponential runs linear.', builds: 'hash-consing', theorem: 'Maximal sharing in ATerms', year: 2000 },
      { slug: 'indexing', number: '8', title: 'Term indexing', summary: 'Discrimination trees: find the few rules that might apply without trying them all, as automated provers do.', builds: 'discrimination trees' },
      { slug: 'compiling', number: '9', title: 'Compiling rewrite rules', summary: 'Decision trees for matching, and a compiler from rules to JavaScript that runs several times faster than the interpreter.', builds: 'decision trees', theorem: 'Good decision trees', year: 2008 },
    ],
  },
  {
    id: 'IV',
    title: 'Termination',
    thread: 'cas',
    blurb: 'Does every computation stop? Undecidable in general, but there are powerful methods that measure each step as a descent.',
    chapters: [
      { slug: 'well-founded-orders', number: '10', title: 'Well-founded orders', summary: 'Orders with no infinite descent, lexicographic and multiset orders, and the hydra that cannot win.', theorem: 'The multiset order is well-founded', year: 1979 },
      { slug: 'interpretations', number: '11', title: 'Polynomial interpretations', summary: 'Map every term to a number that each rule decreases, and let the computer search for the polynomials.', builds: 'an interpretation checker', theorem: 'Polynomial interpretations', year: 1979 },
      { slug: 'path-orders', number: '12', title: 'Path orders', summary: 'The recursive and lexicographic path orders and the Knuth–Bendix order: syntactic orders that compare terms directly.', builds: 'LPO', theorem: 'The lexicographic path order', year: 1980 },
      { slug: 'kruskal', number: '13', title: 'Why path orders terminate', summary: 'Higman’s lemma, Kruskal’s tree theorem, and why every simplification order is well-founded.', optional: true, theorem: 'Kruskal’s tree theorem', year: 1960 },
      { slug: 'dependency-pairs', number: '14', title: 'Dependency pairs', summary: 'Look only at the recursive calls: the method behind every modern termination prover.', optional: true, theorem: 'Dependency pairs', year: 2000 },
    ],
  },
  {
    id: 'V',
    title: 'Confluence',
    thread: 'cas',
    blurb: 'Does every computation reach the same answer? For terminating systems the question reduces to finitely many critical pairs.',
    chapters: [
      { slug: 'unification', number: '15', title: 'Unification', summary: 'Solve equations between terms: most general unifiers, Martelli and Montanari’s rules and the occurs check.', builds: 'unification', theorem: 'Robinson’s unification algorithm', year: 1965 },
      { slug: 'critical-pairs', number: '16', title: 'Critical pairs', summary: 'Where two rules overlap, the critical pair lemma, and a confluence checker for the algebra system.', builds: 'critical pairs', theorem: 'The critical pair lemma', year: 1970 },
      { slug: 'orthogonality', number: '17', title: 'Orthogonality', summary: 'Systems without overlaps are confluent even when they do not terminate: parallel moves and decreasing diagrams.', theorem: 'Orthogonal systems are confluent (Rosen)', year: 1973 },
    ],
  },
  {
    id: 'VI',
    title: 'Completion',
    thread: 'prover',
    blurb: 'Turn equations into a convergent rewrite system, decide the word problem, and when that fails, prove theorems anyway.',
    chapters: [
      { slug: 'equational-reasoning', number: '18', title: 'Equational reasoning', summary: 'Equational logic, Birkhoff’s theorem, the word problem, and deciding equality with a convergent system.', theorem: 'Birkhoff’s completeness theorem', year: 1935 },
      { slug: 'knuth-bendix', number: '19', title: 'Knuth–Bendix completion', summary: 'Orient, deduce, simplify: the group axioms become ten rules, and you implement the procedure.', builds: 'completion', theorem: 'Knuth–Bendix completion', year: 1970 },
      { slug: 'unfailing-completion', number: '20', title: 'Unfailing completion', summary: 'Ordered rewriting, equations that cannot be oriented, and a prover that shows groups of exponent two are abelian.', theorem: 'Unfailing completion', year: 1989 },
      { slug: 'completion-elsewhere', number: '21', title: 'Completion elsewhere', summary: 'Groups given by generators and relations, congruence closure for ground equations, and Buchberger’s algorithm as completion.', optional: true, theorem: 'Buchberger’s algorithm', year: 1965 },
    ],
  },
  {
    id: 'VII',
    title: 'Rewriting modulo',
    thread: 'cas',
    blurb: 'Commutativity cannot be a rule. Rewrite modulo it instead, then go further: keep every equivalent form at once in an e-graph.',
    chapters: [
      { slug: 'ac-rewriting', number: '22', title: 'Rewriting modulo AC', summary: 'Flattening, AC matching and AC normal forms: the algebra system finally collects like terms.', builds: 'AC matching', theorem: 'AC completion (Peterson–Stickel)', year: 1981 },
      { slug: 'e-graphs', number: '23', title: 'E-graphs', summary: 'Union-find, hash-consed e-nodes, congruence and rebuilding: a data structure for many equal terms at once.', builds: 'an e-graph', theorem: 'Congruence closure (Nelson–Oppen)', year: 1980 },
      { slug: 'equality-saturation', number: '24', title: 'Equality saturation', summary: 'Apply every rule everywhere, never destructively, then extract the cheapest term: a peephole optimiser and the simplest form.', theorem: 'egg: fast and extensible equality saturation', year: 2021 },
    ],
  },
  {
    id: 'VIII',
    title: 'Transformation',
    thread: 'language',
    blurb: 'Separate the rules from the order in which to apply them: strategy combinators, and the compiler passes they make easy.',
    chapters: [
      { slug: 'strategy-combinators', number: '25', title: 'Strategy combinators', summary: 'Sequence, choice, try, repeat, all and one: innermost and outermost become two-line programs.', builds: 'a strategy interpreter', theorem: 'Building program optimizers with rewriting strategies', year: 1998 },
      { slug: 'program-transformation', number: '26', title: 'Program transformation', summary: 'Desugaring, constant folding, inlining and conditional rules: an optimiser for the toy language.' },
    ],
  },
  {
    id: 'IX',
    title: 'Semantics',
    thread: 'language',
    blurb: 'Rewriting as the meaning of programs: small-step semantics, the λ-calculus without binders, and rewriting logic for concurrent systems.',
    chapters: [
      { slug: 'reduction-semantics', number: '27', title: 'Reduction semantics', summary: 'Evaluation contexts, small-step and big-step semantics as rewrite systems: the toy language’s interpreter.', theorem: 'Evaluation contexts (Felleisen)', year: 1987 },
      { slug: 'lambda-and-combinators', number: '28', title: 'λ-calculus and combinators', summary: 'β-reduction, bracket abstraction into S, K and I, de Bruijn indices and explicit substitutions: binders without binders.', theorem: 'Combinatory logic (Schönfinkel)', year: 1924 },
      { slug: 'higher-order', number: '29', title: 'Higher-order rewriting', summary: 'Rules with binders, combinatory reduction systems and Miller’s pattern fragment.', optional: true, theorem: 'Combinatory reduction systems (Klop)', year: 1980 },
      { slug: 'rewriting-logic', number: '30', title: 'Rewriting logic', summary: 'Rules as transitions rather than equations: concurrent state as a multiset, and searching every reachable state.', theorem: 'Rewriting logic (Meseguer)', year: 1992 },
    ],
  },
  {
    id: 'X',
    title: 'Computability',
    thread: 'language',
    blurb: 'Rewriting can compute anything, which is why its central questions cannot all be answered, and where they can.',
    chapters: [
      { slug: 'rewriting-computes', number: '31', title: 'Rewriting computes everything', summary: 'Turing machines as rules, string rewriting and Post’s correspondence problem: termination, confluence and the word problem are undecidable.', theorem: 'The word problem for semigroups is undecidable', year: 1947 },
      { slug: 'decidable-islands', number: '32', title: 'Decidable islands', summary: 'Ground systems, tree automata and the regular set of normal forms.', optional: true, theorem: 'The theory of ground rewrite systems is decidable', year: 1990 },
    ],
  },
  {
    id: 'E',
    title: 'Epilogue',
    thread: 'all',
    blurb: 'The three threads meet, and the tools where rewriting lives today.',
    chapters: [
      { slug: 'where-rewriting-lives', number: '33', title: 'Where rewriting lives', summary: 'Maude, K, Stratego, egg, termination and confluence competitions, and the simplifiers inside proof assistants.' },
    ],
  },
];

export const APPENDICES: OutlineEntry[] = [
  { slug: 'maths', number: 'A', title: 'The mathematics toolbox', summary: 'Sets, relations, closures, orders, induction and well-founded induction: everything the proofs use.' },
  { slug: 'language', number: 'B', title: 'The rule language', summary: 'Girafe syntax and the course’s extensions: equations, pragmas, labels, conditions, queries and infix operators.' },
  { slug: 'engine', number: 'C', title: 'The engine', summary: 'Every function of the reference engine that exercises can import from trs, and how your own modules are carried forward.' },
  { slug: 'reference', number: 'D', title: 'Glossary, timeline and bibliography', summary: 'Every term, date and source in the course.' },
];

/** Reading paths through the course, for the four kinds of reader it was written for. */
export const PATHS: { id: string; name: string; blurb: string; chapters: string[] }[] = [
  { id: 'engine', name: 'Engine builder', blurb: 'Build a complete rewriting engine: every chapter with code to write.', chapters: ['0', '1', '2', '3', '5', '6', '7', '8', '9', '11', '12', '15', '16', '19', '22', '23', '24', '25'] },
  { id: 'theory', name: 'Theory', blurb: 'The classic theory with its proofs: abstract reduction, termination, confluence, completion and decidability.', chapters: ['0', '1', '2', '3', '4', '5', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '31', '32'] },
  { id: 'applied', name: 'Applied', blurb: 'Rewriting in use: simplifiers, fast engines, AC, e-graphs and optimisers.', chapters: ['0', '1', '2', '3', '5', '6', '7', '8', '9', '16', '22', '23', '24', '25', '26', '33'] },
  { id: 'semantics', name: 'Semantics', blurb: 'Rewriting as the meaning of programs: strategies, the λ-calculus, rewriting logic and computability.', chapters: ['0', '1', '2', '3', '4', '5', '6', '17', '25', '27', '28', '29', '30', '31', '33'] },
];
