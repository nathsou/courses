---
number: 29
title: What did we prove?
summary: 'A verified result is a theorem with hypotheses. Where they hide: in the specification, in the trusted computing base, and in the assumptions about everything the proof did not cover. What testing found in a verified compiler (CompCert and Csmith), what a verified kernel assumes (seL4), where the bugs in verified distributed systems were (Fonseca et al.), a court for planted specification bugs, and the limit no tool escapes (Rice''s theorem).'
duration: About 1 hour
---

Every chapter of this course ended with a box headed *What did we prove?* The answers were never simply "the program is correct". They said *for three shards*, *for every input satisfying the precondition*, *assuming the refinement mapping says what the bank means*, *the SMT proof was re-checked, the VC generator is trusted*. A verified result is a theorem, and a theorem has hypotheses. This chapter collects the hypotheses, and looks at what happened when people went looking for bugs in systems that had been verified.

The hypotheses hide in three places:

1. **the specification**, which may say something other than what was meant;
2. **the trusted computing base**, the tools and components the result relies on without checking them;
3. **the assumptions** about everything the proof did not cover: the compiler, the glue code, the network, the hardware.

A fourth limit is not a hypothesis but a theorem: no tool can decide every interesting question about every program.

## The trusted computing base

The **trusted computing base** (TCB) of a result is everything that must work correctly for the result to mean what it says. Some components are in it because nothing checks them; others are kept out of it by a certificate that something small and independent re-checks. This course was built around that second idea. The SAT solver of Part II is about 1,500 lines of optimised search, and it is not trusted: every UNSAT answer comes with a DRAT proof, and the checker that re-checks it is under 200 lines. A proof assistant built so that its proofs can be re-checked by a small independent kernel satisfies what is called the *de Bruijn criterion*.

:::bridge{course=cic chapter=intro}
*The Calculus of Inductive Constructions* starts from the de Bruijn criterion: a proof assistant whose proofs are terms, re-checked by a small type checker, so that the large, clever parts of the system need not be trusted.
:::

A certificate moves trust; it does not remove it. The DRAT proof shows that the formula the solver was given is unsatisfiable. It cannot show that the formula says what the program means: that is the job of the VC generator or the encoder, which no certificate in this course covers. Pick a result below to see which components it trusted.

::tcb-map{title="The trusted computing base"}

Two results stand out. A replayed counterexample trusts the least: whatever found it, the interpreter runs it again and sees the failure, so the search itself need not be trusted. A deployed program trusts the most, because the compiler that built it and the code around it join the base. The next three sections are about those last components, in real systems.

## A verified compiler, tested

CompCert, by Xavier Leroy, is a C compiler written and proved correct in the Coq proof assistant: the proof shows that the assembly code it generates behaves as the semantics of the source program prescribes.:cite[leroy2009] In 2011, Xuejun Yang, Yang Chen, Eric Eide and John Regehr published Csmith, a generator of random C programs that compares the outputs of different compilers on the same program. They reported more than 325 previously unknown bugs, 79 of them in GCC and 202 in LLVM.:cite[yang2011]

They put significant effort into CompCert too. They found six bugs that made CompCert 1.6 silently generate wrong code, all in its *unverified front end*, the part that translated C into the language where the verified part began. Partly in response, the verified part was extended to cover C's integer promotions and other implicit conversions. They found another problem in CompCert's model of the PowerPC: its semantics left out a limit on the width of one instruction's field, on the assumption that the assembler would reject out-of-range values, which it did. And then the result that made the paper famous: the middle-end bugs that Csmith found in every other compiler were absent. As of early 2011, after about six CPU-years of testing, the development version of CompCert was the only compiler they had tested in which Csmith could find no wrong-code errors.:cite[yang2011]

Both halves of that result matter. The proof worked: where CompCert was verified, testing found nothing. And testing was still needed: it found the bugs exactly where the verification stopped.

## A verified kernel, and its assumptions

seL4 is an operating system microkernel of 8,700 lines of C and 600 lines of assembler. In 2009, Gerwin Klein and colleagues published a machine-checked proof, in the Isabelle/HOL proof assistant, that its C implementation follows its abstract specification: the kernel never crashes and never performs an unsafe operation, and its behaviour in every situation is the one the specification describes. The proof was about 200,000 lines of Isabelle script.:cite[klein2009]

The paper states its assumptions plainly: "We assume the correctness of the compiler, assembly code, boot code, management of caches, and the hardware; we prove everything else." The boot code alone was about 1,200 lines.:cite[klein2009] Stating the assumptions so precisely is what made it possible to remove one of them. In 2013, Thomas Sewell, Magnus Myreen and Gerwin Klein extended the proof down to the binary that GCC produces, by *translation validation*: for each compilation, a proof that the machine code refines the C semantics. The compiler left the trusted computing base, without ever being verified itself.:cite[sewell2013]

## Verified distributed systems, tested

Chapter 28 used the study by Pedro Fonseca, Kaiyuan Zhang, Xi Wang and Arvind Krishnamurthy, who tested three verified distributed systems, IronFleet, Verdi and Chapar, and found sixteen bugs. None was in the verified protocols. Eleven were in the *shim layers*, the unverified code between the verified core and the operating system; the others were in specifications and in verification tools.:cite[fonseca2017]

The shim bugs were mismatched assumptions. A Verdi server assumed that one call to receive data from the network returns a whole client request; a call can return part of one, and the server then failed trying to decode it. Chapar's servers, whose causally consistent protocol was verified in Coq, applied updates twice when the network duplicated a packet, because the algorithm assumed a reliable network.:cite[fonseca2017,lesani2016] One tool bug is worth remembering. IronFleet's build tool read Dafny's output, and when the prover crashed it missed the message that said so: every program then passed verification, including programs that asserted false.:cite[fonseca2017] The authors found no shim bugs in IronFleet, the system with the fewest unverified components.:cite[fonseca2017]

Now audit. For each artefact below, click the component where its gap was.

::tcb-map{title="Audit: where was the gap?" start="audit"}

## The specification is code you have not tested

The specification is part of every trusted computing base, and it is the one component that no tool can check against what you meant, because what you meant is not written down anywhere else. It can be tested, though, and the tests look like those for code:

- **implementations that should fail.** If a function that is obviously wrong also meets the contract, the contract is too weak. Chapter 16's spec adversary does this with a bank of wrong implementations.
- **callers that should succeed.** If ordinary, correct uses of a function cannot be verified against its contract, the contract is too strong, or it promises too little for its callers to rely on.
- **vacuity checks.** If no input satisfies the precondition, every body verifies. Vouch's verifier checks this itself and reports a vacuous contract instead of a proof.

In the court below, each function verifies against a specification with a planted bug. Call the witnesses, then click the line at fault.

::spec-court{title="The spec court"}

```quiz
q: 'A sorting function is verified against `ensures sorted(result)`. What does the proof guarantee?'
options:
  - text: The function sorts its input.
    why: 'Returning the empty array also satisfies `sorted(result)`. The contract does not say the result is a rearrangement of the input.'
  - text: The result is sorted, and nothing more.
    correct: true
    why: 'Exactly what the postcondition says. To mean "sorts its input", it also needs `multiset(result) == multiset(a)`, the permutation clause of chapter 19.'
  - text: Nothing, until the contract is tested.
    why: 'The proof is sound: the result is sorted. Testing the contract tells you whether that is all you wanted.'
```

## The limit: Rice's theorem

Could a better tool remove the need for all this care? In 1953, H. Gordon Rice proved a theorem that answers no. Informally: every non-trivial property of what programs compute (one that some programs have and others lack, and that depends only on the function a program computes, not on how it is written) is undecidable.:cite[rice1953] "Never divides by zero", "always returns a sorted array", "conserves money": for each, there is no algorithm that answers correctly for every program.

:::bridge{course=incompleteness chapter=cmp.thy.hlt}
Rice's theorem follows from the undecidability of the halting problem: a decider for any non-trivial property could be turned into a decider for halting. *Incompleteness* proves that the halting function is not computable.
:::

Every tool in this course lives with the theorem, and each chapter's badge said how:

- **restrict the programs.** The explorer handles finite state spaces, and the parameterised checker of chapter 25 a decidable fragment of logic.
- **bound the question.** Bounded model checking and the relational model finder check up to a bound and say so.
- **ask for help.** The program verifier needs contracts, invariants and lemmas from the person, and checks them.
- **approximate.** Abstract interpretation answers every question, and some of its answers are false alarms.
- **give up.** An SMT solver facing nonlinear arithmetic or quantifiers may answer *unknown*, and a search may time out.

None of these is a weakness of a particular tool. The badge ladder of chapter 0 is the honest response to Rice's theorem: every result says which of these it did.

```quiz
q: 'A vendor claims its analyser finds every division by zero in any C program, with no false alarms, and always terminates. What follows from Rice''s theorem?'
options:
  - text: The claim is impossible, if the analyser takes arbitrary programs as they are.
    correct: true
    why: '"Can divide by zero" is a non-trivial property of what a program does. An analyser that is sound, has no false alarms and always terminates would decide it for every program.'
  - text: The claim is possible with enough computing power.
    why: 'Undecidability is not about speed: no algorithm exists, however much time it is given.'
  - text: The claim is fine as long as the analyser is sound.
    why: 'Soundness alone is easy: an analyser that flags every division is sound. What is impossible is soundness, no false alarms and termination, all three together, for every program.'
```

:::history
**Trusting trust.** In his Turing Award lecture, published in 1984, Ken Thompson described a compiler modified to insert a back door into a login program it compiled, and to insert the same modification into any new copy of the compiler built from clean source. Once installed, the attack leaves no trace in any source code, so reading the source, or verifying it, cannot reveal it.:cite[thompson1984] The trusted computing base of any result ends somewhere below the source code. Csmith (2011) and the study of verified distributed systems (2017) found where it was thin in practice;:cite[yang2011,fonseca2017] seL4's binary-level proof (2013) showed that one large component, the compiler, could be taken out of it.:cite[sewell2013]
:::

:::hood
**The course's own TCB.** The trusted directories are listed in the project notes: `logic/` (terms, formulas, the evaluator), `sat/check/` (the DRAT checker, under 200 lines) and `smt/check/` (the theory certificate checker, a few hundred lines). The front end and the interpreter are trusted too, and they are larger: the parser and type checker are several thousand lines. The VC generator, the encoders, the explorer and the abstract interpreter are trusted for the results they produce without certificates; every badge in the course names its checker, or says there is none.
:::

:::proved
**What did we prove?** Nothing new in this chapter, which is about what the other chapters proved. The spec court's cases are checked by the program verifier, and its witnesses' verdicts are its verdicts. The audit's real cases are summaries of the cited papers.
:::

## What comes next

[Chapter 30](/chapters/the-landscape/) maps the tools of the field onto what this course built: which tool for which job, how they relate, and where to go next.

## Further reading

- Yang and colleagues' Csmith paper, for how random testing found compiler bugs, and what it did not find in CompCert.:cite[yang2011]
- Klein and colleagues' seL4 paper, for a model statement of what a proof assumes.:cite[klein2009]
- Fonseca and colleagues' study of verified distributed systems.:cite[fonseca2017]
- Thompson's lecture is three pages long.:cite[thompson1984]
