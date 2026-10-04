---
number: VI
title: 'How we got here: approximate'
summary: 'From compiler dataflow analysis in 1973 to abstract interpretation in 1977, the analysis of Ariane 5''s software after its first flight failed, Astrée on flight-control code, and predicate abstraction and CEGAR in Microsoft''s driver checker. And the industrial lesson: an analysis that cries wolf is not used, however sound it is.'
duration: About 15 minutes
---

Parts IV and V asked people for specifications and invariants and gave back proofs. Part VI asks for nothing and gives back guarantees about everything the program might do, at a price: false alarms. That trade has its own history, which starts not with verification but with compilers.

## Dataflow analysis

A compiler that wants to keep a value in a register, reuse a computation or remove dead code must know, at each point of the program, facts that hold on every path: which variables are live, which expressions are already computed. In 1973 Gary Kildall gave a single framework for such analyses: facts form a lattice, each block of code transforms them, facts are joined where paths meet, and the computation repeats until nothing changes.:cite[kildall1973] Compilers still compute liveness this way.

## A theory of approximation

Patrick and Radhia Cousot saw that Kildall's iteration was an instance of something general. In their 1977 paper, any analysis is an approximation of the program's exact semantics: a set of abstract values, a correspondence with sets of concrete states, abstract operations that over-approximate the concrete ones, and a fixpoint computed in finite time, with **widening** to force convergence and **narrowing** to recover precision.:cite[cousot1977] Soundness is then a theorem, not a hope: every concrete behaviour is accounted for in the abstract result. A year later Cousot and Nicolas Halbwachs added the first relational domain, convex polyhedra, which can discover linear relations among variables.:cite[cousot1978]

## After Ariane 501

On 4 June 1996 the first Ariane 5 was lost because a conversion in reused software overflowed on a trajectory that the software had never been designed for.:cite[lions1996] Among the inquiry board's recommendations was more thorough testing of the software against realistic flight data. Abstract interpretation was applied to the launcher's embedded Ada software after the accident: an analyser looking for run-time errors, such as overflows, out-of-bounds indices and divisions by zero, was reported to discover the error of flight 501 automatically.:cite[lacan1998] Chapter 26 re-enacts the error on a small scale.

The flagship came next. **Astrée**, built by Bruno Blanchet, the Cousots and their colleagues, was designed for a family of safety-critical embedded programs, and in 2003 showed that an analyser specialised to such programs could prove the absence of run-time errors in them with few or no false alarms.:cite[blanchet2003] Antoine Miné's octagon domain, a relational domain cheaper than polyhedra, was part of what made that precision possible.:cite[mine2006]

## Predicates, counterexamples and drivers

A second line came from model checking. In 1997 Susanne Graf and Hassen Saïdi abstracted a system by the truth values of a set of predicates and built its abstract state graph with a theorem prover.:cite[graf1997] In 2000 Edmund Clarke, Orna Grumberg, Somesh Jha, Yuan Lu and Helmut Veith closed the loop: when the abstraction produces a counterexample that the real system cannot follow, analyse it and refine the abstraction, until the counterexample is real or none is left (CEGAR).:cite[clarke2000] Thomas Ball and Sriram Rajamani's SLAM toolkit applied predicate abstraction and refinement to C, checking Windows device drivers against rules such as the correct use of locks.:cite[ball2001] SLAM became the engine of Microsoft's Static Driver Verifier, which checks drivers against the rules of the Windows driver interface.:cite[ball2006]

## The industrial lesson

Soundness is only half of what makes an analyser useful. In 2010, engineers from Coverity, a company that sold a bug-finding tool built on static analysis, described what they had learnt from running it on billions of lines of other people's code. Their tool was deliberately unsound. What decided whether it was used was whether developers trusted its reports: an analysis that produced many reports which turned out to be wrong was soon ignored, and a true report that a developer did not understand was treated as false.:cite[bessey2010] The sound analysers answered the same pressure differently: Astrée by specialising to one family of programs until its false alarms were few,:cite[blanchet2003] Infer by reporting only on the code a developer had just changed, at the moment of review, so that each report was about code its reader had in mind.:cite[calcagno2015]

Chapter 26's triage step, which looks for an input that confirms each alarm, is a small version of the same idea: an alarm with a replayed failing input is hard to dismiss.

::timeline{part="VI"}

## In this part

- **Chapter 26, Abstract interpretation.** Signs and intervals, joins and fixpoints, widening, soundness and false alarms; Ariane 5 and Heartbleed, re-enacted.
- **Chapter 27, Better abstractions.** Octagons and polyhedra, predicate abstraction and CEGAR, and invariants handed to the verifier.
