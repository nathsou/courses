/**
 * The tool chooser's data (chapter 30): real verification tools, what they check, and where the course built a
 * small version of their idea. `rosetta` names the tool's section in appendix E, when it has one.
 */
export type Target = 'code' | 'design' | 'hardware' | 'math';
export type Lang = 'c' | 'rust' | 'java' | 'ada' | 'other' | 'any';
export type Want = 'proof' | 'bugs' | 'sound' | 'bounded';
export type Design = 'protocol' | 'data' | 'param';

export interface Tool {
  id: string;
  name: string;
  family: string;
  blurb: string;
  targets: Target[];
  langs?: Lang[];
  wants?: Want[];
  designs?: Design[];
  /** Chapter slugs where the course builds its idea. */
  chapters: { slug: string; label: string }[];
  rosetta?: string;
  cite: string[];
}

export const TOOLS: Tool[] = [
  {
    id: 'dafny',
    name: 'Dafny',
    family: 'deductive verifier',
    blurb: 'A programming language with contracts, loop invariants, lemmas and ghost code, verified through Boogie and the Z3 SMT solver, and compiled to executable code. The closest relative of Vouch.',
    targets: ['code'],
    langs: ['other'],
    wants: ['proof'],
    chapters: [{ slug: 'specifications-and-contracts', label: '16–20' }],
    rosetta: 'dafny',
    cite: ['leino2010'],
  },
  {
    id: 'why3',
    name: 'Why3',
    family: 'deductive verifier',
    blurb: 'Programs in WhyML, with verification conditions sent to a choice of automatic provers and proof assistants.',
    targets: ['code'],
    langs: ['other'],
    wants: ['proof'],
    chapters: [{ slug: 'weakest-preconditions', label: '17' }],
    cite: ['filliatre2013'],
  },
  {
    id: 'framac',
    name: 'Frama-C',
    family: 'C analysis platform',
    blurb: 'Plug-ins for C programs specified in ACSL: WP for deductive proofs, Eva for abstract interpretation.',
    targets: ['code'],
    langs: ['c'],
    wants: ['proof', 'sound'],
    chapters: [{ slug: 'specifications-and-contracts', label: '16' }, { slug: 'abstract-interpretation', label: '26' }],
    rosetta: 'acsl',
    cite: ['kirchner2015'],
  },
  {
    id: 'spark',
    name: 'SPARK',
    family: 'deductive verifier',
    blurb: 'A subset of Ada designed for verification, whose proofs show the absence of run-time errors and, with more contracts, functional correctness.',
    targets: ['code'],
    langs: ['ada'],
    wants: ['proof', 'sound'],
    chapters: [{ slug: 'specifications-and-contracts', label: '16' }],
    cite: ['barnes2003'],
  },
  {
    id: 'viper',
    name: 'Viper (with Prusti)',
    family: 'permission-based verifier',
    blurb: 'An intermediate language and verifiers for permission-based reasoning in the style of separation logic. Front ends, such as Prusti for Rust, translate other languages into it.',
    targets: ['code'],
    langs: ['rust', 'other'],
    wants: ['proof'],
    chapters: [{ slug: 'the-heap', label: '21' }, { slug: 'linked-structures-and-ownership', label: '22' }],
    rosetta: 'viper',
    cite: ['muller2016', 'astrauskas2019'],
  },
  {
    id: 'verus',
    name: 'Verus',
    family: 'deductive verifier',
    blurb: 'Verification of Rust code with SMT, using Rust’s ownership and linear ghost types to keep the verification conditions simple.',
    targets: ['code'],
    langs: ['rust'],
    wants: ['proof'],
    chapters: [{ slug: 'linked-structures-and-ownership', label: '22' }],
    cite: ['lattuada2023'],
  },
  {
    id: 'key',
    name: 'KeY',
    family: 'deductive verifier',
    blurb: 'Java programs specified in JML, proved in a dynamic logic by symbolic execution, automatically or interactively. It found the bug in TimSort.',
    targets: ['code'],
    langs: ['java'],
    wants: ['proof'],
    chapters: [{ slug: 'symbolic-execution', label: '15' }, { slug: 'quantifiers-ghosts-and-lemmas', label: '19' }],
    cite: ['ahrendt2016', 'degouw2015'],
  },
  {
    id: 'cbmc',
    name: 'CBMC',
    family: 'bounded model checker',
    blurb: 'Bounded model checking of C programs: loops unrolled to a bound, the program and its assertions encoded into SAT, and counterexample traces to step through.',
    targets: ['code'],
    langs: ['c'],
    wants: ['bounded', 'bugs'],
    chapters: [{ slug: 'unrolling-time', label: '10' }, { slug: 'bits-and-arrays', label: '14' }],
    cite: ['clarke2004'],
  },
  {
    id: 'klee',
    name: 'KLEE',
    family: 'symbolic executor',
    blurb: 'Symbolic execution of LLVM bitcode, generating a test input for each path explored, and an input for each error found.',
    targets: ['code'],
    langs: ['c'],
    wants: ['bugs'],
    chapters: [{ slug: 'symbolic-execution', label: '15' }],
    cite: ['cadar2008'],
  },
  {
    id: 'infer',
    name: 'Infer',
    family: 'static analyser',
    blurb: 'A compositional analyser based on separation logic and bi-abduction, run on every code change at Facebook (now Meta).',
    targets: ['code'],
    langs: ['c', 'java'],
    wants: ['bugs'],
    chapters: [{ slug: 'the-heap', label: '21' }, { slug: 'linked-structures-and-ownership', label: '22' }],
    cite: ['calcagno2015'],
  },
  {
    id: 'astree',
    name: 'Astrée',
    family: 'abstract interpreter',
    blurb: 'A sound analyser for embedded C, specialised to safety-critical control software, that proves the absence of run-time errors with few or no false alarms.',
    targets: ['code'],
    langs: ['c'],
    wants: ['sound'],
    chapters: [{ slug: 'abstract-interpretation', label: '26' }, { slug: 'better-abstractions', label: '27' }],
    cite: ['blanchet2003'],
  },
  {
    id: 'tla',
    name: 'TLA+ (TLC, Apalache)',
    family: 'specification language and model checkers',
    blurb: 'Systems as state machines in set theory and temporal logic. TLC explores states one by one; Apalache encodes them for an SMT solver.',
    targets: ['design'],
    designs: ['protocol'],
    chapters: [{ slug: 'state-machines', label: '1–4' }],
    rosetta: 'tla',
    cite: ['lamport1994', 'yu1999', 'konnov2019'],
  },
  {
    id: 'alloy',
    name: 'Alloy',
    family: 'relational model finder',
    blurb: 'Structures described by relations and constraints, checked for counterexamples up to a bound with a SAT solver.',
    targets: ['design'],
    designs: ['data'],
    chapters: [{ slug: 'small-worlds', label: '9' }],
    rosetta: 'alloy',
    cite: ['jackson2006'],
  },
  {
    id: 'ivy',
    name: 'Ivy',
    family: 'protocol verifier',
    blurb: 'Protocols modelled in a decidable fragment of logic, so that each inductive invariant check gets a definite answer, with counterexamples to induction drawn as small graphs.',
    targets: ['design'],
    designs: ['param', 'protocol'],
    chapters: [{ slug: 'for-every-n', label: '25' }],
    cite: ['padon2016'],
  },
  {
    id: 'spin',
    name: 'SPIN',
    family: 'explicit-state model checker',
    blurb: 'Concurrent processes in Promela, checked against LTL properties by explicit search with partial-order reduction.',
    targets: ['design'],
    designs: ['protocol'],
    chapters: [{ slug: 'interleavings', label: '2' }, { slug: 'eventually', label: '3' }],
    cite: ['holzmann1997'],
  },
  {
    id: 'nuxmv',
    name: 'nuXmv',
    family: 'symbolic model checker',
    blurb: 'The successor of NuSMV, for synchronous transition systems: finite-state ones with BDD and SAT-based algorithms, IC3 among them, and infinite-state ones, with integers and reals, with SMT-based ones.',
    targets: ['design', 'hardware'],
    designs: ['protocol'],
    chapters: [{ slug: 'decision-diagrams', label: '11' }, { slug: 'ic3', label: '23–24' }],
    cite: ['cavada2014'],
  },
  {
    id: 'abc',
    name: 'ABC',
    family: 'hardware synthesis and verification',
    blurb: 'Logic synthesis and verification of circuits as and-inverter graphs, with equivalence checking and property-directed reachability (IC3).',
    targets: ['hardware'],
    chapters: [{ slug: 'unrolling-time', label: '10' }, { slug: 'ic3', label: '24' }],
    cite: ['brayton2010', 'een2011'],
  },
  {
    id: 'lean',
    name: 'Lean',
    family: 'proof assistant',
    blurb: 'A functional programming language and interactive theorem prover based on dependent type theory, implemented largely in itself.',
    targets: ['math', 'code'],
    langs: ['any'],
    wants: ['proof'],
    chapters: [{ slug: 'what-did-we-prove', label: '29' }],
    cite: ['demoura2021'],
  },
  {
    id: 'rocq',
    name: 'Rocq (formerly Coq)',
    family: 'proof assistant',
    blurb: 'A proof assistant based on the calculus of inductive constructions, in which CompCert was built and proved. Renamed from Coq in 2025.',
    targets: ['math', 'code'],
    langs: ['any'],
    wants: ['proof'],
    chapters: [{ slug: 'what-did-we-prove', label: '29' }],
    cite: ['bertot2004', 'rocq2025', 'leroy2009'],
  },
  {
    id: 'isabelle',
    name: 'Isabelle/HOL',
    family: 'proof assistant',
    blurb: 'A proof assistant for higher-order logic, in which seL4 was verified.',
    targets: ['math', 'code'],
    langs: ['any'],
    wants: ['proof'],
    chapters: [{ slug: 'what-did-we-prove', label: '29' }],
    cite: ['nipkow2002', 'klein2009'],
  },
];

export interface Answers {
  target?: Target;
  lang?: Lang;
  want?: Want;
  design?: Design;
}

/** Score each tool against the answers; higher is a better match, 0 is not a match. */
export function score(t: Tool, a: Answers): number {
  if (!a.target || !t.targets.includes(a.target)) return 0;
  let s = t.targets[0] === a.target ? 4 : 2;
  if (a.target === 'code') {
    if (a.lang) {
      if (t.langs?.includes(a.lang)) s += 3;
      else if (t.langs?.includes('any')) s += 1;
      else if (a.lang === 'other' && t.langs?.includes('other')) s += 3;
      else return 0;
    }
    if (a.want) {
      if (t.wants?.includes(a.want)) s += t.wants[0] === a.want ? 3 : 2;
      else return 0;
    }
  }
  if (a.target === 'design' && a.design) {
    if (t.designs?.includes(a.design)) s += t.designs[0] === a.design ? 3 : 2;
    else return 0;
  }
  return s;
}

function ranked(a: Answers): Tool[] {
  return TOOLS.map((t) => ({ t, s: score(t, a) }))
    .filter((x) => x.s > 0)
    .sort((x, y) => y.s - x.s || TOOLS.indexOf(x.t) - TOOLS.indexOf(y.t))
    .map((x) => x.t);
}

/** The matching tools, best first; when nothing matches every answer, the matches without the last answer. */
export function choose(a: Answers): { tools: Tool[]; relaxed?: 'want' | 'lang' } {
  const tools = ranked(a);
  if (tools.length || a.target !== 'code') return { tools };
  const noWant = ranked({ ...a, want: undefined });
  if (noWant.length) return { tools: noWant, relaxed: 'want' };
  return { tools: ranked({ target: a.target }), relaxed: 'lang' };
}
