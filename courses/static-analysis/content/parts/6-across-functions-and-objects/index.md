---
number: VI
title: 'How we got here: across functions and objects'
summary: Interprocedural analysis, pointer analysis and Datalog. Two approaches from 1981, a reduction to graph reachability, pointer analyses that took twenty years to scale, and a logic language that turned analyses into queries.
duration: About 10 minutes
---

Part VI crosses function boundaries and follows values into objects. Both problems are as old as the analyses of Part III; both took decades to become practical.

## Calls

Micha Sharir and Amir Pnueli described the two basic approaches to interprocedural analysis in 1981: the **call-string** approach, which tags facts with the calls that led to them, and the **functional** approach, which summarises each procedure's effect and applies the summary at every call. :cite[sharir1981] In 1995 Thomas Reps, Susan Horwitz and Mooly Sagiv showed that a whole class of analyses, the IFDS problems, could be solved precisely along the paths where calls and returns match, by reducing them to reachability in a graph; :cite[reps1995] Reps later showed how many program analyses are graph reachability problems of this kind, with paths restricted by a context-free language. :cite[reps1998] Chapter 26 builds the exploded supergraph of their paper.

Call graphs for object-oriented languages came from compilers again: class hierarchy analysis :cite[dean1995] and rapid type analysis :cite[bacon1996] were designed in the 1990s to replace virtual calls by direct ones. For JavaScript, where functions are values and properties can be anything, Feldthaus and colleagues showed in 2013 that a field-based, flow-insensitive analysis is cheap enough for editors and precise enough for their purposes. :cite[feldthaus2013]

## Pointers

Knowing which names may refer to the same memory is the hardest of the classic analyses. In his 1994 thesis, Lars Ole Andersen described an inclusion-based points-to analysis for C. :cite[andersen1994] Two years later, Bjarne Steensgaard gave a unification-based one that runs in almost linear time and gives less precise answers. :cite[steensgaard1996] Through the 1990s, hundreds of papers explored the space between them, and in 2001 Michael Hind's survey asked, in its title, *Pointer analysis: haven't we solved this problem yet?* :cite[hind2001] The answer was that the algorithms existed, and that making them precise and fast on real programs was the remaining problem.

## Datalog

Datalog, a logic programming language without function symbols, had been studied for databases since the 1980s: its programs always terminate, and their meaning is a least fixpoint. In 2004 John Whaley and Monica Lam showed that context-sensitive points-to analyses for Java could be written as a few Datalog rules and solved efficiently, using binary decision diagrams to represent the huge relations. :cite[whaley2004] Martin Bravenboer and Yannis Smaragdakis's Doop framework made the declarative approach the state of the art for Java points-to analysis in 2009, :cite[bravenboer2009] and the Soufflé engine, from Oracle Labs and academic partners, compiled such programs to fast parallel code. :cite[jordan2016]

The same idea reached industry through **Semmle**, a company spun out of Oege de Moor's research at Oxford, whose QL language compiles object-oriented queries to Datalog over a database extracted from the code. :cite[avgustinov2016] GitHub acquired Semmle in 2019 and made its engine **CodeQL** part of its code scanning.

## Summaries at scale

Facebook's Infer, open-sourced in 2015, took the functional approach to its conclusion: compositional analysis, one summary per procedure, computed bottom-up and reused, so that a change only requires re-analysing what changed. Running on every code change at the company's scale, it showed that interprocedural analysis could fit into code review. :cite[calcagno2015]

::timeline{part="VI"}
