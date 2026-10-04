---
number: VII
title: 'How we got here: trust'
summary: 'What a proof buys. Hoare''s 1996 question, how software got so reliable without proof; machine-checked proofs of a compiler and a kernel, and what testing found around them; the industrial turn, from Intel''s processors to Facebook''s code reviews and Amazon''s cloud; and the field as it stands, with proof assistants in production and language models proposing proofs that checkers decide.'
duration: About 15 minutes
---

Part IV told how the idea of proving programs met its critics: in 1979, the argument that nobody would read a program's proof, so nobody would believe it; in 1988, the argument that a proof is about a mathematical model, never about the machine. Part VII is about what a proof buys, and both arguments return in it, in more practical forms.

## Reliable without proof?

In 1996, Tony Hoare, whose 1969 logic was the foundation of that programme, asked how software had become reliable without it.:cite[hoare1969,hoare1996] "Fortunately," he wrote, "the problem of program correctness has turned out to be far less serious than predicted." The techniques that had worked were those of every other branch of engineering: rigorous management of design inspection and review, a wide range of targeted tests, the removal of errors from products already in use, and defensive programming and other deliberate over-engineering. His conclusion was measured: "Formal methods and proof play a small direct role in large scale programming; but they do provide a conceptual framework and basic understanding to promote the best of current practice, and point directions for future improvement.":cite[hoare1996]

It was an honest assessment from the field's founder, and it set the bar for what followed. A proof would have to earn its place next to testing and review, not replace them.

## Proofs that machines check

The answer to the 1979 critique came from proof assistants. A proof checked by Coq or Isabelle does not need to be read to be believed; it needs its checker to be trusted, and the checker is small. In 2006, Xavier Leroy described a compiler back end, from a C-like language to PowerPC assembly, written and proved correct in Coq;:cite[leroy2006] by 2009 it had become CompCert, a compiler for a large subset of C.:cite[leroy2009] The same year, Gerwin Klein and colleagues published the proof, in Isabelle/HOL, that the C code of the seL4 microkernel implements its abstract specification.:cite[klein2009]

The answer to the 1988 critique was to say precisely what was assumed, and then to test it. Csmith's random programs found bugs in every compiler its authors tried, and in CompCert only outside the verified part.:cite[yang2011] seL4's list of assumptions named the compiler, and in 2013 a proof that each compiled binary refines the C code removed it.:cite[sewell2013] Chapter 29 tells both stories.

## The industrial turn

Through the 2000s and 2010s the methods of this course moved into industry, each where it fitted best. Intel, whose Pentium had shipped in 1994 with a division bug, by 2009 reported verifying the execution engine of the Core i7 formally in place of most of its simulation-based testing.:cite[kaivola2009] Microsoft's Static Driver Verifier, built on SLAM, checked Windows drivers against the rules of the driver interface.:cite[ball2006] At Amazon Web Services, engineers wrote TLA+ specifications of distributed designs and found subtle bugs with its model checker;:cite[newcombe2015] the Zelkova service used SMT to answer questions about access policies, and by 2022 AWS reported about a billion SMT queries a day.:cite[backes2018,rungta2022] At Facebook, Infer analysed code changes as they were submitted for review. Peter O'Hearn called the approach *continuous reasoning*: formal reasoning that follows a changing codebase, analysing each change quickly and reporting to the programmer at the moment of review, rather than verifying a finished program once.:cite[calcagno2015,ohearn2018]

Verified systems kept growing. IronFleet (2015) carried proofs from a specification through a distributed protocol to its implementation;:cite[hawblitzel2015] a study two years later found bugs in such systems, nearly all at the edges of what was verified.:cite[fonseca2017] Both results are in chapter 28.

## Where the field stands

Three developments of the last few years would have surprised the critics of 1979. Verifiers now target mainstream systems languages: Prusti and Verus verify Rust code, using the ownership that Rust's compiler already checks.:cite[astrauskas2019,lattuada2023] Proof assistants are used in the design of production systems: AWS's Cedar authorization language was modelled in Lean, and important properties of its design were proved there.:cite[cutler2024] And language models write proofs: Baldur generated whole proofs of Isabelle/HOL theorems, each checked by Isabelle.:cite[first2023] The last two meet in the course's principle: an untrusted oracle is safe when a small checker decides.

What has not changed is the specification. The study of verified distributed systems found bugs in the specifications as well as around them,:cite[fonseca2017] and no checker can tell whether a specification says what its authors meant. Hoare's conceptual framework is still the main return on the investment: the discipline of saying exactly what a program must do.

::timeline{part="VII"}

## In this part

- **Chapter 28, Capstone: the verified Ledger.** A specification, a protocol, an implementation and the handlers between them, each checked by the engine that suits it, and the bug that slips between layers.
- **Chapter 29, What did we prove?** The trusted computing base, specification bugs, what testing found in verified systems, and Rice's theorem.
- **Chapter 30, The landscape** (the epilogue). Which tool for which job, language models as untrusted oracles, and where to go next.
