/**
 * The TCB map (chapter 29): the components a verified result passes through, from the specification down to the
 * hardware, and for each kind of result in the course, which of them it trusted and which were checked
 * independently. The audit cases ask where a real "verified" artefact's gap was.
 */
export type ComponentId = 'spec' | 'frontend' | 'semantics' | 'translation' | 'solver' | 'checker' | 'compiler' | 'glue' | 'platform';

export interface Component {
  id: ComponentId;
  name: string;
  what: string;
  /** How the course handles it. */
  course: string;
  /** What has gone wrong here in real systems. */
  world: string;
}

export const COMPONENTS: Component[] = [
  {
    id: 'spec',
    name: 'The specification',
    what: 'The contracts, invariants and properties: what “correct” means.',
    course: 'Written by you. Nothing checks it against what you meant; vacuity checks, the spec adversary of chapter 16 and the spec court below test it.',
    world: 'Fonseca and colleagues found bugs in the specifications of verified distributed systems: properties that were incomplete, so that the proofs guaranteed less than their users assumed.',
  },
  {
    id: 'frontend',
    name: 'Front end',
    what: 'The parser, type checker and elaboration that turn text into the program and the formulas the tools see.',
    course: 'Vouch’s lexer, parser and type checker. Trusted: if they misread the program, every tool after them works on the wrong one.',
    world: 'Csmith found six wrong-code bugs in CompCert 1.6, all in its unverified front end, before the verified part was extended to cover them.',
  },
  {
    id: 'semantics',
    name: 'The semantics',
    what: 'What the language means: the rules every tool must agree on.',
    course: 'The reference interpreter in `vouch/interp` is the definition. The other tools are tested against it, and every counterexample is replayed on it.',
    world: 'CompCert’s PowerPC semantics left out a limit on the width of one instruction’s field; the assembler caught the out-of-range value that resulted. A formal model of the machine is a specification too.',
  },
  {
    id: 'translation',
    name: 'Translation to logic',
    what: 'The VC generator, the encoders to SAT and SMT, the explorer, the abstract interpreter: the code that turns “the program is correct” into a question a solver can answer, or answers it by search.',
    course: 'Trusted. A certificate shows that the solver answered the question it was given, not that the question was the right one.',
    world: 'Fonseca and colleagues found that IronFleet’s build tool misread the verifier’s output when the prover crashed, and reported every program as verified, including programs that asserted false. The bug was outside the verifier’s core, in the tooling around it.',
  },
  {
    id: 'solver',
    name: 'Solvers',
    what: 'The SAT and SMT solvers and the BDD package: large, fast, heavily optimised code.',
    course: 'Not trusted. A model is evaluated; an UNSAT answer comes with a DRAT proof and theory certificates (Farkas coefficients, congruence chains, instances) that a small checker re-checks.',
    world: 'Solvers have bugs like any large program. The SAT competitions validate claims of unsatisfiability with DRAT proofs (chapter 8).',
  },
  {
    id: 'checker',
    name: 'Certificate checkers',
    what: 'The small programs that re-check what the solvers claim.',
    course: 'Trusted, and kept small and plain on purpose (`sat/check`, `smt/check`).',
    world: 'The de Bruijn criterion: a proof assistant is trustworthy when its proofs can be checked by a small, independent kernel.',
  },
  {
    id: 'compiler',
    name: 'Compiler and linker',
    what: 'What turns the verified source into the code that runs.',
    course: 'Not involved: the course never compiles your code. Its proofs are about the source, under the interpreter’s semantics.',
    world: 'seL4’s 2009 proof assumed the C compiler correct; in 2013, translation validation extended the proof to the binary, removing the compiler from the trusted base.',
  },
  {
    id: 'glue',
    name: 'Glue',
    what: 'The unverified code around the verified core: input and output, networking, the event loop, the libraries it calls.',
    course: 'Chapter 28’s step handlers were glue until they were checked; the event loop and the network are still assumed (assumption A5).',
    world: 'Most of the bugs Fonseca and colleagues found were in the shim layers of verified distributed systems, such as a server that assumed a network receive returns a whole request.',
  },
  {
    id: 'platform',
    name: 'Runtime, OS and hardware',
    what: 'The JavaScript engine (for the course), the operating system and the processor.',
    course: 'Trusted, like everything below the checkers: the browser runs the checkers too.',
    world: 'seL4’s proof assumes the hardware, the assembly code and the boot code; IronFleet’s assumes Dafny, the .NET compiler and runtime, the operating system and the hardware.',
  },
];

export type Role = 'trusted' | 'checked' | 'untrusted' | 'none';

export interface ResultKind {
  id: string;
  label: string;
  chapter: string;
  roles: Record<ComponentId, Role>;
  note: string;
}

const base: Record<ComponentId, Role> = { spec: 'trusted', frontend: 'trusted', semantics: 'trusted', translation: 'trusted', solver: 'none', checker: 'none', compiler: 'none', glue: 'none', platform: 'trusted' };

export const RESULTS: ResultKind[] = [
  {
    id: 'cex',
    label: 'A counterexample, replayed',
    chapter: 'every chapter',
    roles: { ...base, translation: 'untrusted', solver: 'untrusted' },
    note: 'However the counterexample was found, the interpreter runs it again and sees the failure. The search need not be trusted; the specification, the front end and the interpreter must be.',
  },
  {
    id: 'smt',
    label: 'A function proved with SMT',
    chapter: 'chapters 16–20',
    roles: { ...base, solver: 'checked', checker: 'trusted' },
    note: 'The solver’s answers are re-checked, but the VC generator, which decides what was asked, is trusted, and so are the weakest-precondition rules it implements.',
  },
  {
    id: 'explore',
    label: 'All states explored',
    chapter: 'chapters 1–4',
    roles: { ...base },
    note: 'No certificate: the explorer’s word is the result. Its search is short and plain, and it is tested against the interpreter, but nothing re-checks a particular run.',
  },
  {
    id: 'induction',
    label: 'An invariant proved by k-induction or IC3',
    chapter: 'chapters 23–25',
    roles: { ...base, solver: 'checked', checker: 'trusted' },
    note: 'The SAT queries’ DRAT proofs are re-checked; the encoding of the system into propositional logic is trusted.',
  },
  {
    id: 'absint',
    label: 'Checks proved by abstract interpretation',
    chapter: 'chapter 26',
    roles: { ...base },
    note: 'The analyser’s result has no certificate: its transfer functions, joins and widening are trusted.',
  },
  {
    id: 'handoff',
    label: 'An analyser’s invariant, checked by the verifier',
    chapter: 'chapter 27',
    roles: { ...base, solver: 'checked', checker: 'trusted' },
    note: 'The analyser becomes an untrusted oracle: its invariant is written into the code and proved by the verifier, so the trust moves to the VC generator and the checkers.',
  },
  {
    id: 'deployed',
    label: 'A verified program, deployed',
    chapter: 'chapters 28–29',
    roles: { ...base, solver: 'checked', checker: 'trusted', compiler: 'trusted', glue: 'trusted' },
    note: 'Once the code runs for real, the compiler that built it and the glue around it join the trusted base, unless they are verified or validated too.',
  },
];

export interface Audit {
  id: string;
  title: string;
  story: string;
  answer: ComponentId;
  explain: string;
}

export const AUDITS: Audit[] = [
  {
    id: 'compcert',
    title: 'A verified compiler, 2011',
    story: 'CompCert is a C compiler whose optimisations and code generation are proved, in Coq, to preserve the meaning of the program. Random testing with Csmith made CompCert 1.6 for PowerPC compile a small function to code that returned 0 instead of 1.',
    answer: 'frontend',
    explain: 'The bug, and five others like it, were in CompCert’s unverified front end. Partly in response, the verified part was extended to cover C’s integer promotions and other implicit conversions.',
  },
  {
    id: 'chapar',
    title: 'A verified key-value store, 2017',
    story: 'Chapar is a key-value store whose servers implement a causally consistent protocol, verified in Coq. Under testing, a client could see the effect of an update without its cause. The packets between servers were sent over UDP, which can duplicate them.',
    answer: 'glue',
    explain: 'The verified algorithm assumed a reliable network. The unverified code that received packets did not discard duplicates, so updates were applied twice. The protocol was not at fault, and neither was its proof.',
  },
  {
    id: 'sel4',
    title: 'A verified kernel, 2009',
    story: 'seL4’s proof shows that its C code implements its abstract specification. The kernel that runs on the processor, though, is the machine code GCC produced from that C. A later project closed that gap.',
    answer: 'compiler',
    explain: 'The 2009 proof assumed the C compiler (with the assembly code, the boot code, cache management and the hardware). In 2013, translation validation proved that the binary refines the C semantics, removing the compiler from the trusted base.',
  },
  {
    id: 'ledger',
    title: 'The Ledger, chapter 28',
    story: 'With the “ten times the fee” switch on, every check in the dashboard passed, the step handlers included.',
    answer: 'spec',
    explain: 'The fee function had no specification of what it should compute, only that it cannot overflow. A proof can only be as good as the property it proves.',
  },
];
