---
number: 30
title: The landscape
summary: 'The course built a small version of each family of verification tool. This chapter maps them onto the field: which tool for which job, with a tool chooser; language models as one more untrusted oracle, which checkers make safe; the questions that remain open; a look back along the timeline; and where to go next.'
duration: About 45 minutes
---

Every engine in this course is a small version of a family of real tools. The explorer is a cousin of TLC and SPIN, the bounded model checker of CBMC, the program verifier of Dafny, the abstract interpreter of Astrée. The real tools are faster, handle real languages, and have decades of engineering behind them, but their ideas are the ones you have already met, and so are their limits. This last chapter is a map.

## The families

| Family | In this course | Tools |
|---|---|---|
| Explicit-state model checking | chapters 1–5 | TLC (for TLA+), SPIN |
| Bounded checking with SAT | chapters 9–10 | Alloy, CBMC |
| Symbolic model checking: BDDs, k-induction, IC3 | chapters 11, 23–24 | nuXmv, ABC |
| Proofs for every number of nodes | chapter 25 | Ivy |
| Symbolic execution | chapter 15 | KLEE, KeY |
| Deductive verification | chapters 16–20 | Dafny, Why3, Frama-C (WP), SPARK, KeY, Verus |
| Separation logic and ownership | chapters 21–22 | Viper and Prusti, Infer, Verus |
| Abstract interpretation | chapters 26–27 | Astrée, Frama-C (Eva) |
| Proof assistants | chapters 0 and 29 (bridges) | Lean, Rocq, Isabelle/HOL |

Three questions decide most choices. What is being checked: code, a design before the code, a circuit? How much can you write besides the code: contracts and invariants, or nothing at all? And which rung of the badge ladder do you need: a bug found, every input up to a bound, every input, or every input with no run-time error, proved without annotations? The chooser below asks them.

::tool-chooser{title="Which tool?"}

Some tools appear in several families, because the families are techniques, not products. Frama-C runs a deductive verifier and an abstract interpreter over the same annotated C. Verus is a deductive verifier that leans on ownership, as separation logic does. The tools also descend from one another: Simplify's ideas went into ESC/Java, then Boogie, then Dafny; Smallfoot's into Infer. [Appendix F](/appendices/timeline-and-family-tree/) draws the family tree, and the [Rosetta appendix](/appendices/rosetta/) shows the same small examples in Vouch and in several of these tools.

:::bridge{course=cic chapter=lean}
The proof assistants at the bottom of the table are where everything else can be checked from first principles. *The Calculus of Inductive Constructions* builds the logic of Rocq and Lean from the lambda calculus up, and ends with Lean.
:::

## Language models, one more untrusted oracle

Three times in this course an untrusted component did the hard part and a checker made the result safe. The SAT solver of chapter 8 finds a refutation, and a DRAT checker of under 200 lines confirms it. The analyser of chapter 27 proposes an invariant, and the verifier proves it. IC3 in chapter 24 builds an invariant by heuristic search, and the invariant is re-checked with DRAT proofs. In each case nothing depends on how the guess was made.

Language models fit the same slot. A model can propose a loop invariant, a lemma, a contract or a whole proof, and the verifier or the proof assistant decides. Baldur, by Emily First, Markus Rabe, Talia Ringer and Yuriy Brun, generated whole proofs of Isabelle/HOL theorems with a language model, had Isabelle check each one, and gave a second model the error message to repair the proofs that failed.:cite[first2023] A proof generated this way is as trustworthy as any other proof that Isabelle accepts, because Isabelle checks it.

The checker cannot protect the one component it does not check: the specification. A model that writes the contract as well as the proof can prove the wrong thing, perfectly. Chapter 29's court applies to a contract whoever wrote it, and a contract written by a model needs a person who reads it.

:::bridge{course=language-models chapter=reasoning}
*Language Models from Scratch* builds the models themselves, and its chapter on reasoning looks at how they are trained to produce long chains of steps. A proof checker is the strictest reader such a chain can have.
:::

```quiz
q: 'A language model writes a loop invariant, and the verifier proves the function with it. What has to be trusted?'
options:
  - text: The language model.
    why: 'No: if its invariant were wrong, the verifier would reject it, as it rejected the analyser''s in chapter 27.'
  - text: The verifier, the specification, and what the verifier trusts (chapter 29).
    correct: true
    why: 'The invariant is checked, so its origin does not matter. The contract it serves is not checked against anything, so it still needs a person.'
  - text: Nothing; the proof is machine-checked.
    why: 'The checker, the VC generator and the specification are still in the trusted computing base.'
```

## Open questions

Every part of the course ended at a limit, and the limits are where the field is working. The course's view of the questions that keep returning:

- **Specifications.** Writing them remains the hard part, and the study of verified distributed systems found bugs in specifications as well as around them.:cite[fonseca2017] How can a specification be tested, reviewed and maintained like the code it describes?
- **Invariants.** Every proof of a loop or a protocol in Parts IV and V needed an invariant, found by a person, by IC3, by an analyser or by a model. Each method finds some and misses others.
- **Proofs over time.** A proof is checked against one version of the code. The code changes; the proof must change with it, and its cost is paid again.
- **What lies below.** Chapter 29's trusted components: compilers, runtimes, operating systems and hardware, each verified or validated in some projects, and trusted in most.
- **Systems that are not written.** A program whose behaviour comes from training data has no source code that says what it should do, and the methods of this course start from such a statement.

## A look back

The timeline of this course starts in 1949, with Alan Turing's short note on checking a large routine, which already split the proof into assertions that can be checked one by one.:cite[turing1949] Robert Floyd (1967) and Tony Hoare (1969) turned that into a method for proving programs;:cite[floyd1967,hoare1969] Amir Pnueli (1977) brought temporal logic to the behaviour of programs over time;:cite[pnueli1977] Patrick and Radhia Cousot (1977) made approximation a theory.:cite[cousot1977] In 1981 and 1982, Edmund Clarke and Allen Emerson, and independently Jean-Pierre Queille and Joseph Sifakis, gave the first algorithms that check a temporal property against every state of a finite system.:cite[clarke1981,queille1982] The ACM's Turing Award for 2007 went to Clarke, Emerson and Sifakis "for their role in developing Model-Checking into a highly effective verification technology that is widely adopted in the hardware and software industries".:cite[acm2007turing]

Then came the engines: binary decision diagrams (1986), the Chaff SAT solver (2001), the Z3 SMT solver (2008).:cite[bryant1986,moskewicz2001,demoura2008] With them, the verified systems of Part VII became possible: a compiler and a kernel in 2009, distributed systems in 2015.:cite[leroy2009,klein2009,hawblitzel2015] [Appendix F](/appendices/timeline-and-family-tree/) has the whole timeline, and each part opens with an essay on its stretch of it.

## Where to go next

Pick one tool from the chooser and verify something small with it: the Ledger's `transfer`, a binary search, two-phase commit. The [Rosetta appendix](/appendices/rosetta/) has a starting point in several of them. Then, for depth:

- **Programs:** Leino's *Program Proofs* teaches specification and proof with Dafny, from the beginning.:cite[leino2023]
- **Systems:** Lamport's *Specifying Systems* is the book of TLA+;:cite[lamport2002] Jackson's *Software Abstractions* is the book of Alloy.:cite[jackson2006]
- **Model checking:** Baier and Katoen's *Principles of Model Checking* covers the theory of Parts I and II, and more.:cite[baier2008]
- **Solvers:** Kroening and Strichman's *Decision Procedures* goes inside SAT and SMT, as Parts II and III did.:cite[kroening2016]
- **Static analysis:** Rival and Yi's *Introduction to Static Analysis* is the textbook of abstract interpretation.:cite[rival2020]

:::bridge{course=proofs-are-programs chapter=lean}
*Proofs Are Programs* is the other way in: proofs as programs from the start, ending in Lean.
:::

:::proved
**What did we prove?** Nothing here: this chapter is a map. The tool descriptions summarise the cited papers; tools change faster than papers, so check each tool's own documentation for what it does today.
:::

## Further reading

- The Turing Award citation for model checking, and the laureates' lectures.:cite[acm2007turing]
- The Baldur paper, for one way of pairing a language model with a proof checker.:cite[first2023]
