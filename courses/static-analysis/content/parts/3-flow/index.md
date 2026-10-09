---
number: III
title: 'How we got here: dataflow analysis'
summary: Dataflow analysis was invented to make compiled programs faster. From flow graphs at IBM to Kildall's lattices and monotone frameworks, and from optimising compilers to the code paths ESLint gives every rule.
duration: About 10 minutes
---

Part III's analyses, liveness, reaching definitions, constant propagation, were not invented to find bugs. They were invented to make programs run faster, by compilers that needed to know which computations they could remove or move. Bug-finding borrowed them later.

## Optimising compilers

The first FORTRAN compiler, delivered by IBM in 1957, was built on a bet: that a compiler could produce code nearly as fast as a skilled programmer's assembly, or nobody would use the language. Winning the bet meant analysing programs: which values are used, which computations repeat, which variables can live in registers. Through the 1960s, the analysis became a discipline.

Frances Allen, at IBM, gave it its central structure. Her 1970 paper on **control flow analysis** described programs as graphs of basic blocks, defined the notions (dominators, intervals, loops) that optimisers still use, and showed how to compute facts over the graph. :cite[allen1970] She received the Turing Award in 2006, the first woman to do so, for this work and its decades of consequences. John Cocke, her colleague, worked on the same problems, and their joint work on program optimisation laid much of the ground for the compilers that followed.

## One framework

Each early analysis came with its own algorithm. In 1973 Gary Kildall, then teaching at the Naval Postgraduate School, showed that they were all the same algorithm: facts drawn from a **lattice**, a transfer function per node, joins where paths meet, and iteration until nothing changes. :cite[kildall1973] Kildall went on to write CP/M, the first widely used operating system for personal computers; his framework lives on in every optimising compiler. In 1977 John Kam and Jeffrey Ullman identified the conditions under which the iteration gives the right answer, and how fast: **monotone frameworks**. :cite[kam1977] The same year, the Cousots showed that the same iteration computes approximations of the program's executions, the start of Part V. Chapter 13 is this framework, and Tarski's fixpoint theorem behind it. :cite[tarski1955]

The textbook that taught a generation of compiler writers these analyses, Aho, Sethi and Ullman's *Compilers: Principles, Techniques, and Tools*, the "dragon book" of 1986, put dataflow analysis in every computer science curriculum. :cite[aho1986]

## From optimisation to bugs

An optimiser and a bug finder ask similar questions with different consequences. A variable written and never read is a store the optimiser can delete, and a dead store a rule can report (chapter 14). A condition that is always true is a branch the optimiser can remove, and a gratuitous condition a rule can report (chapter 16). The analyses transfer almost unchanged; what changes is the cost of being wrong, which for a bug finder is a developer's attention (chapter 21).

## Code paths in ESLint

Linters walked trees for decades without graphs. ESLint added **code path analysis** in its version 2, in 2016: as it traverses the tree, it builds the control-flow graph of each function as segments, and tells rules when segments start and end. :cite[eslintcodepath] It made rules such as "consistent return" and "no fall-through" (chapter 12) reliable, and gave SonarJS the graph on which its dataflow rules run: S1854's liveness and S4165's value sets in chapters 14 and 15 are Kildall's framework over ESLint's segments.

::timeline{part="III"}
