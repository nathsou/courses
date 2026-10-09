---
number: V
title: 'How we got here: abstract interpretation'
summary: A theory written in Grenoble in 1977 became the way to prove that flight software cannot crash. From the Cousots' lattices to a rocket that failed on an integer conversion, and the analysers built to make sure that does not happen again.
duration: About 10 minutes
---

Part V treats analysis as computing with descriptions of values. The theory behind it has a precise origin, and its most famous application a precise motivation.

## Grenoble, 1977

Patrick and Radhia Cousot, at the University of Grenoble, were working on proving properties of programs automatically. In 1976 they showed how to compute, for each variable, an interval of the values it may hold, with a widening to make loops terminate. :cite[cousot1976] In 1977 they generalised it: any static analysis that computes properties by iterating over a lattice can be seen as an approximation of the program's actual executions, related to them by an abstraction and a concretisation. They called it **abstract interpretation**. :cite[cousot1977] The 1979 paper added the methodology for designing such analyses: start from the concrete semantics, choose an abstraction, derive the abstract transformers. :cite[cousot1979]

The theory unified what was already known (Kildall's dataflow analyses are abstract interpretations with finite lattices) and explained what was missing: lattices of infinite height, like intervals, need widening, and the result is then a sound over-approximation, not an exact solution. Chapters 22 and 23 follow it step by step. In 1978 Patrick Cousot and Nicolas Halbwachs added a relational domain, **convex polyhedra**, which could discover linear invariants between variables. :cite[cousot1978]

## Ariane 5

On 4 June 1996, the first flight of the Ariane 5 rocket ended 37 seconds after launch, when the rocket veered off course and was destroyed. The inquiry board's report traced it to software reused from Ariane 4: a conversion of a 64-bit floating-point value related to the rocket's horizontal velocity into a 16-bit signed integer overflowed, because Ariane 5 flew faster than Ariane 4 ever had. The exception was not handled, the inertial reference system shut down, and so did its backup, which ran the same code. :cite[lions1996]

The failure was the kind of run-time error that an interval analysis is designed to rule out: a value outside the range of its type. After the accident, abstract interpretation was applied to the Ariane 5 flight software to check for such errors, :cite[lacan1998] and one of the researchers involved, Alain Deutsch, founded PolySpace to build industrial analysers on the same principles.

## Zero false alarms

In 2001, the Cousots and a team at the École normale supérieure set out to build an analyser that proved the absence of run-time errors in real embedded software, and that gave so few false alarms that engineers could check every one. **Astrée** reached that goal in November 2003 on the primary flight-control software of the Airbus A340, and was later used on the A380. :cite[blanchet2003,astree] Getting there took more than intervals: octagons, the relational domain Antoine Miné introduced in 2001 :cite[mine2001dbm,mine2006octagon]; domains for digital filters; trace partitioning; each added because a family of false alarms required it. That is chapter 24's subject.

Frama-C, an open-source platform from CEA and Inria, brought abstract interpretation to C code more broadly through its value analysis, now EVA. :cite[cuoq2012] Facebook's Infer (Part VI) and many industrial tools since use the same theory, often without saying so: every sound analysis is an abstract interpretation, whether its authors use the words or not.

::timeline{part="V"}
