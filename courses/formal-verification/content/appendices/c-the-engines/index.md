---
number: C
title: The engines
summary: 'Every engine in the course: what it checks, where it stops, the badge it can earn, and the certificate that backs its answer, with the checker that re-checks it or the admission that nothing does.'
---

Every answer in the course carries a **badge**, which says what was established, and a **certificate**, which says why it should be believed. This appendix lists the engines with both. It is the honest version of the course: where an engine's answer is not re-checked, it says so. The code is in `src/lib/fv`, one directory per engine; chapter 29's TCB map draws the same information as a picture.

## The badge ladder

From weakest to strongest:

| Badge | Means |
|---|---|
| *tested on n inputs* | no failure on the inputs tried; nothing about the others |
| *checked up to bound n* | no failure within the bound (steps, scope, unrolling); nothing beyond it |
| *all n states of instance I* | every reachable state of one finite instance |
| *verified for all inputs* (or *for every size*) | a proof |
| *violated* | a counterexample; *replayed* when the interpreter re-ran it and saw the failure |
| *unknown* | the engine gave up: a timeout, a construct it does not handle, or an incomplete method |

## Engines for systems

| Engine | Checks | Stops when | Certificate |
|---|---|---|---|
| **Explorer** (chapters 1–5, `explore/`) | invariants and deadlock, by visiting every reachable state, with symmetry reduction for `symmetric` types | the state space exceeds the time budget | for *holds*: none, the explorer is trusted. For *violated*: the trace, replayed by the interpreter |
| **Temporal checker** (chapter 3, `ltl/`) | `property` formulas, through a Büchi automaton for the negated property and a search of the product for fair accepting cycles | as the explorer | for *holds*: none. For *violated*: the lasso, replayed, with the property evaluated on it and the fairness of its cycle checked |
| **Refinement checker** (chapter 4, `explore/refine.ts`) | that every reachable step maps to a step of the specification, or to a stutter | as the explorer | none for *holds*; a replayed trace for *violated* |
| **BDD reachability** (chapter 11, `bdd/`) | invariants, by computing the reachable set symbolically | BDDs grow too large | the reachable set, exported as an inductive invariant and re-checked by SAT with DRAT proofs |
| **Bounded model checker** (chapter 10, `bmc/`) | invariants for runs up to k steps, by unrolling into SAT | the bound; nothing is said beyond it | a violation: the trace, replayed |
| **k-induction** (chapter 23, `ic3/kind.ts`) | invariants, by a base case (BMC) and an inductive step over k states | k grows past its limit without a proof | DRAT proofs of the base and step queries, re-checked when time allows |
| **IC3** (chapter 24, `ic3/ic3.ts`) | invariants, by building an inductive strengthening frame by frame | the time budget | the invariant it found, re-checked for initiation, consecution and implication with DRAT proofs |
| **Parameterised checker** (chapter 25, `param/`) | inductive invariants for every number of nodes, when the system is in the Bernays–Schönfinkel–Ramsey fragment | the system is outside the fragment (it says why) | DRAT proofs for every instance size up to the bound; the small-model argument itself is trusted |

## Engines for logic

| Engine | Checks | Stops when | Certificate |
|---|---|---|---|
| **SAT solver** (chapters 6–8, `sat/`) | satisfiability of CNF formulas, by conflict-driven clause learning | the time budget | a model, evaluated; or a DRAT proof of unsatisfiability, re-checked by the checker in `sat/check/` |
| **Constraint problems** (chapter 6, `problem/`) | `solve` and `count`, by encoding into SAT | the time budget | every solution checked by the interpreter; a count trusts the encoding |
| **Relational model finder** (chapter 9, `relational/`) | `check` and `run` in worlds, up to a scope | the scope | a counterexample or instance, checked by the interpreter; *no counterexample* with a DRAT proof (the encoding is trusted) |
| **SMT solver** (chapters 12–14, `smt/`) | formulas over equality and uninterpreted functions (congruence closure), linear integer arithmetic (simplex with branch and bound), bit-vectors (bit-blasting), arrays (read-over-write) and quantifiers (instantiation by E-matching) | non-linear arithmetic or quantifiers it cannot instantiate to a conclusion: it answers *unknown* | a model, evaluated; or a proof: DRAT for the Boolean part, and per theory lemma a certificate (Farkas coefficients, congruence chains, instances), re-checked in `smt/check/` |

## Engines for programs

| Engine | Checks | Stops when | Certificate |
|---|---|---|---|
| **Random testing** (chapter 0, `verify/`) | contracts on random inputs that satisfy the precondition | the number of runs | a failure: the run itself |
| **Symbolic executor** (chapter 15, `symex/`) | every path up to a bound on loop unrolling, with the SMT solver deciding which paths are feasible | the bound | each failing input, replayed |
| **Program verifier** (chapters 16–20, `vouch/vc/`) | contracts for all inputs: verification conditions by weakest preconditions, each sent to the SMT solver; vacuous preconditions are reported | a construct it does not handle (it falls back to testing and says so), or an *unknown* from the solver | the SMT certificates of every obligation. A counterexample is replayed; one that does not replay is shown as the solver's last candidate, *not confirmed* |
| **Separation-logic verifier** (chapters 21–22, `heap/`) | memory safety and heap contracts, by symbolic execution over symbolic heaps | a shape it cannot fold or unfold | for *verified*: none, the symbolic-heap prover is trusted. For *violated*: a replayed run when one exists (a leak cannot be replayed) |
| **Abstract interpreter** (chapters 26–27, `absint/`) | run-time checks (overflow, bounds, division, assertions) for all inputs, with signs, intervals or octagons | never: it always terminates, possibly with false alarms | for *proved*: none, the analyser is trusted. Alarms are triaged: a *confirmed* one has an input the interpreter replays. Its invariants can be handed to the program verifier, which checks them |
| **CEGAR** (chapter 27, `absint/cegar.ts`) | assertions, by predicate abstraction refined with counterexamples | eight rounds without success | *safe*: the abstraction's search (trusted), and invariants the verifier can re-check. *Real*: an input, replayed |

## What every result trusts

Every badge rests on the Vouch front end (the parser and type checker), on the interpreter as the definition of the language, and on the browser that runs it all. Every *verified* from a solver also rests on the translation that produced the solver's question: the VC generator, an encoder, or the unrolling of a system. Certificates re-check the solver's answer, not the question. Chapter 29 is about those limits, and about the same limits in industrial tools.
