---
number: 33
title: Where rewriting lives
summary: The three threads meet, and a tour of the tools where rewriting lives today, from Maude and K to egg, the termination and confluence competitions, and the simplifiers inside proof assistants and compilers.
duration: About 45 minutes
prerequisites: [rewriting-logic]
theorems: []
techniques: []
---

The course began with one move, replacing equals by equals, applied by hand to three problems. Look back at where each of them has gone.

## The three threads, together

**The algebra system** started as twelve rules for derivatives that could not write $3X^2$. It became a program (Chapter 6), was made fast by sharing, indexing and compilation (Part III), proved terminating with a quadratic interpretation (Chapter 11), checked for confluence and found wanting until sums were taken modulo associativity and commutativity (Chapters 16 and 22), and finally searched for the simplest equal expression with an e-graph (Chapter 24). That is, in miniature, the architecture of a real computer algebra system: a rewriting core, canonical forms for associative-commutative operators, and search guided by a cost.

**The prover** started from the three group axioms. Knuth–Bendix completion turned them into ten rules that decide every group identity (Chapter 19); unfailing completion proved that groups of exponent two are abelian, where plain completion failed (Chapter 20); and the same machinery decides the word problem of finite presentations (Chapter 21). Part X explained why no prover can be complete for every set of equations.

**Pebble** started as terms to transform. Strategies built its optimiser (Chapters 25 and 26), rewrite rules gave it a semantics and an interpreter (Chapter 27), closures gave it functions (Chapter 28). And Chapter 9's compiler can compile its interpreter. Here is Pebble's interpreter, compiled to JavaScript through decision trees, racing itself:

::compile-view{rules="#priority\nRun(e) -> Eval(e, Empty)\nEval(Lit(n), env) -> Lit(n)\nEval(V(x), env) -> Lookup(x, env)\nEval(Add(a, b), env) -> Plus(Eval(a, env), Eval(b, env))\nEval(Mul(a, b), env) -> Times(Eval(a, env), Eval(b, env))\nEval(Lt(a, b), env) -> Less(Eval(a, env), Eval(b, env))\nEval(If(c, a, b), env) -> Branch(Eval(c, env), a, b, env)\nEval(Let(x, e, body), env) -> Eval(body, Bind(x, Eval(e, env), env))\nEval(While(c, body, x), env) -> Loop(Eval(c, env), c, body, x, env)\nLoop(Lit(0), c, body, x, env) -> Lookup(x, env)\nLoop(Lit(n), c, body, x, env) -> Eval(While(c, body, x), Bind(x, Eval(body, env), env))\nPlus(Lit(a), Lit(b)) -> Lit(@add(a, b))\nTimes(Lit(a), Lit(b)) -> Lit(@mul(a, b))\nLess(Lit(a), Lit(b)) -> if(@lt(a, b), Lit(1), Lit(0))\nBranch(Lit(0), a, b, env) -> Eval(b, env)\nBranch(Lit(n), a, b, env) -> Eval(a, env)\nLookup(x, Bind(y, v, env)) -> if(@equ(x, y), v, Lookup(x, env))" query="Run(Let(I, Lit(0), While(Lt(V(I), Lit(1000)), Add(V(I), Lit(1)), I)))"}

A language defined by rewrite rules, interpreted by rewriting, and compiled by compiling its rewrite rules: the three layers of a language implementation, all built from the same idea.

## Tools

The ideas of this course are alive in widely used software.

**Rewriting languages.** *Maude* implements rewriting logic, with equations modulo associativity, commutativity and identity, rules for concurrency, search and an LTL model checker;:cite[clavel2007] it is used to specify and analyse protocols and programming languages. The *K framework* defines programming languages by rewrite rules and derives interpreters, symbolic executors and verifiers from them; complete semantics of C, Java, JavaScript and the Ethereum virtual machine have been written in K.:cite[rosu-serbanuta2010] *Stratego* and the *Spoofax* language workbench pioneered strategies for program transformation,:cite[visser2004] and ASF+SDF, with its ATerm library, pioneered maximal sharing (Chapter 7);:cite[vandenbrand2000] its successor, Rascal, continues the line. Girafe, whose syntax this course uses, compiles rules to JavaScript, OCaml and Haskell.:cite[girafe]

**Equality saturation.** *egg* and *egglog* bring e-graphs to compilers, numerical tools (Herbie) and program synthesis.:cite[willsey2021,zhang2023,panchekha2015]

**Termination and confluence provers.** *AProVE* and *TTT2* prove termination of rewrite systems and of programs in real languages, translated into rewriting; *CSI* proves confluence. They compete every year in the Termination Competition and the Confluence Competition, on the TPDB and COPS problem collections.:cite[giesl2017,korp2009,zankl2011,tpdb,cops] Some of their proofs can be checked by certified checkers, verified in proof assistants.

**Theorem provers.** *Waldmeister* is a specialised equational prover based on unfailing completion;:cite[hillenbrand1997] *E* and *Vampire*, the strongest first-order provers, are built on superposition, the generalisation of completion to first-order logic, with heavy use of term indexing.

**Proof assistants and compilers.** Isabelle's simplifier is a higher-order conditional rewriting engine, central to almost every proof; Lean's `simp` and Rocq's `rewrite` and `autorewrite` play similar roles. GHC, the Haskell compiler, lets library authors state rewrite rules (the `RULES` pragma) that the optimiser applies, which is how list fusion removes intermediate data structures. Computer algebra systems such as Mathematica are built around pattern-matching rewrite rules.

## Further reading

- Franz Baader and Tobias Nipkow, *Term Rewriting and All That* (1998): the standard textbook, closest to the core of this course.:cite[baader-nipkow1998]
- Terese, *Term Rewriting Systems* (2003): the encyclopaedia, including orthogonality, strategies, higher-order rewriting and infinitary rewriting.:cite[terese2003]
- Nachum Dershowitz and Jean-Pierre Jouannaud, "Rewrite systems" (1990), and Jan Willem Klop, "Term rewriting systems" (1992): two classic surveys.:cite[dershowitz-jouannaud1990,klop1992]
- Hubert Comon and colleagues, *Tree Automata Techniques and Applications*: everything about Chapter 32.:cite[comon-tata]
- Max Willsey and colleagues, "egg: fast and extensible equality saturation" (2021): the best entry point to e-graphs.:cite[willsey2021]

## What you have built

If you followed the engine-builder path, you have written, in TypeScript: terms and positions, substitution and matching, one-step rewriting, innermost and outermost normalisation, a hash-consing table, a discrimination tree, a decision-tree runner, a polynomial interpreter, the lexicographic path order, unification, critical pairs, Knuth–Bendix completion, AC flattening and union-find. That is the core of a real rewriting engine. The [Your engine](/engine/) page lists every module you wrote, and every exercise ran on it.

:::key
- One idea, replacing equals by equals, runs computer algebra, theorem proving, program transformation, semantics and optimisation.
- Its central questions (termination, confluence, the word problem) are undecidable in general and solvable in practice, with the methods of this course.
- Maude, K, Stratego, egg, AProVE, CSI, Waldmeister and the simplifiers of proof assistants and compilers are where the ideas live today.
:::
