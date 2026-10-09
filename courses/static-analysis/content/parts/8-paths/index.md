---
number: VIII
title: 'How we got here: symbolic execution and fuzzing'
summary: An idea from 1975 that had to wait thirty years for its solver. Symbolic execution's first systems, the SAT revolution that made it practical, concolic testing, and the fuzzers that started with a thunderstorm.
duration: About 10 minutes
---

Part VIII explores programs one path at a time. Its central idea is old; what made it practical was a revolution in a neighbouring field.

## The first symbolic executors

In 1975 and 1976, three groups described the same idea independently. Robert Boyer, Bernard Elspas and Karl Levitt built SELECT, which executed LISP programs symbolically to generate test data; :cite[boyer1975] Lori Clarke built a system for FORTRAN programs; :cite[clarke1976] and James King, at IBM, described **symbolic execution** as a generalisation of testing, and built EFFIGY. :cite[king1976] All three ran into the same wall: deciding whether a path condition is satisfiable. The constraint solvers of the 1970s handled linear arithmetic over small problems and little else, and the idea went quiet for a generation.

## The SAT revolution

SAT was the first problem shown to be NP-complete, in 1971. :cite[cook1971] For two decades that was read as a reason not to try. Then, in the second half of the 1990s, a series of solvers made industrial instances tractable: GRASP introduced conflict analysis and clause learning, :cite[marquessilva1999] Chaff added two watched literals and the VSIDS heuristic, :cite[moskewicz2001] and MiniSat packaged the techniques in a few thousand lines that everyone could read and extend. :cite[een2003] **SMT** solvers combined SAT with decision procedures for arithmetic, bit-vectors and arrays; Microsoft Research's Z3, released in 2008, became the most widely used. :cite[demoura2008] Chapter 31's solver is a small MiniSat.

## Symbolic execution returns

With solvers that worked, symbolic execution came back. **DART** in 2005 combined it with concrete execution, so that the program runs on real inputs and the solver only steers: concolic testing. :cite[godefroid2005,sen2005] **KLEE**, in 2008, executed real systems code symbolically, with a model of the operating system, and generated tests for the GNU coreutils with high coverage. :cite[cadar2008] **SAGE** ran concolic testing on file parsers at Microsoft for years, and found bugs that every other tool had missed. :cite[godefroid2008,bounimova2013] The **Clang Static Analyzer** made path-sensitive analysis a standard part of the C and C++ toolchain. :cite[clangsa]

## Fuzzing

Fuzzing has a well-known origin story. In 1988, line noise on a dial-up connection during a storm garbled Barton Miller's commands and crashed the UNIX utilities he was using. His class project, feeding random input to the utilities on purpose, crashed a quarter to a third of them. :cite[miller1990] For twenty years, fuzzing remained mostly random, or driven by grammars of the input format.

In 2013 Michał Zalewski released **american fuzzy lop**, which used lightweight instrumentation to measure branch coverage and kept the inputs that reached new branches. :cite[afl] It found hundreds of bugs in widely used libraries with no configuration, and coverage-guided fuzzing became standard practice; LLVM's libFuzzer and continuous fuzzing services for open-source projects followed. Hybrid fuzzers such as Driller combined it with the solver, :cite[stephens2016] and fuzzers learned to read the comparisons programs make, defeating most magic numbers without a solver at all. :cite[aschermann2019]

Static analysis and these dynamic techniques have grown up side by side, borrowing from each other: chapter 32 races them, and chapter 33 puts them back on the ladder.

::timeline{part="VIII"}
