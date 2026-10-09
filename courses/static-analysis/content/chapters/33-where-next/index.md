---
title: Where to go next
summary: The course as a ladder, from matching syntax to reasoning about paths. What each rung can see and what it costs, how to choose one for a rule, open directions, and further reading.
number: 33
duration: 25 minutes
prerequisites: [false-positives]
---

Chapter 0 started from one issue, S1764 on `page > 0 && page > 0`, and asked how a program could know that. Thirty-two chapters later, the answer is a ladder of techniques, each seeing more than the one below it and costing more to climb. This last chapter puts the rungs side by side, and points beyond the course.

## The ladder

| Rung | Sees | Costs | In this course | In practice |
|---|---|---|---|---|
| **Syntax** | the shape of the code: trees, tokens, selectors | linear in the file; precise for what it checks | S1764, S1110, S1940 (chapters 2–5, 20) | most rules of every linter |
| **Names** | declarations, references, scopes, imports, fully qualified names | linear, with a scope analysis | S1481, S4830, S2077's call matching (7, 8) | unused code, API misuse, security hotspots |
| **Types** | what the compiler knows, including narrowing | a TypeScript program per tsconfig, built once per analysis and shared by the files it contains | S2259, S2871 (9) | type-dependent rules |
| **Code paths** | which statement can follow which; reachability | linear in the function | S3801, S128 (12) | dead code, missing returns, fall-through |
| **Dataflow** | facts at every point of a function, by fixpoint | a few passes over the function | S1854, S4165, S2589 (13–16) | dead stores, constants, nullness, liveness |
| **Abstract interpretation** | numeric properties over infinite domains, with widening | depends on the domain: linear to cubic per operation | intervals, zones (22–24) | Astrée, Frama-C EVA, IKOS |
| **Across functions** | call graphs, summaries, realizable paths | the whole program, or summaries of it | IFDS, S2699's helpers (25, 26) | FlowDroid, Infer, CodeQL |
| **The heap** | aliasing, objects, fields | cubic in practice for inclusion-based analysis; more with contexts | Andersen, Steensgaard, Datalog (27) | Doop, CodeQL, Soufflé |
| **Taint** | data from sources to sinks, across all of the above | the sum of the rungs it uses, plus models of libraries | Express taint rules (29) | Sonar's security analysis, CodeQL, FlowDroid |
| **Paths** | one path at a time, with a solver | exponential in branches, bounded by budgets | symbolic execution (31) | Clang Static Analyzer, KLEE |
| **Running it** | real executions on generated inputs | as many executions as the budget allows | fuzzing, concolic testing (32) | AFL, libFuzzer, SAGE |

Two observations stand out. The rungs are cumulative: taint analysis needs names to find sources, types or call graphs to resolve calls, dataflow to follow values, and summaries to cross functions. And the cost grows faster than the insight: each rung up multiplies the time and memory an analysis needs, and the number of ways it can be wrong.

## Choosing a rung

The rule of thumb that SonarJS's rules follow, and that chapter 21 argued for, is to use the lowest rung that answers the question precisely enough, and to stay silent where it cannot. Try it on a few rule ideas.

```quiz
q: "A rule should report `JSON.parse(text)` calls that are not inside a `try` block. Which is the lowest rung that implements it well?"
options:
  - text: "Syntax: look for the call and walk up its ancestors for a `try` statement."
    correct: true
    why: "The question is about the shape of the code. A selector or an ancestor walk answers it exactly. (Whether an exception escapes through a caller's `try` is a different, interprocedural question, which the rule deliberately does not ask.)"
  - text: "Dataflow: compute whether an exception can propagate to the function's exit."
    why: "That answers a broader question. For the rule as stated, it is more machinery than needed."
  - text: "Symbolic execution: find an input that makes `JSON.parse` throw."
    why: "Every string that is not JSON makes it throw; there is nothing to find."
```

```quiz
q: "A rule should report a variable that is assigned a value that is never read before being overwritten or going out of scope."
options:
  - text: "Names: a variable with a write and no read."
    why: "That is S1481's question, unused variables. A variable can be read in general and still have a particular write whose value is never read."
  - text: "Dataflow: liveness at each write."
    correct: true
    why: "It is S1854, dead stores (chapter 14). The question is about which writes reach which reads along paths, which is exactly what a backward dataflow analysis computes."
  - text: "Across functions: follow the variable into callees."
    why: "Local variables are not visible to callees, except through closures, which the rule treats as a reason to stay silent."
```

```quiz
q: "A rule should report SQL queries built from a request parameter, across helper functions and files, without a sanitizer."
options:
  - text: "Syntax: concatenations passed to `db.query`."
    why: "That is S2077's approach: it asks for a review because it cannot tell where the pieces come from."
  - text: "Taint analysis over a call graph, with models of the framework's sources and the database's sinks."
    correct: true
    why: "The question is about the origin of a value and the path it takes, across functions. Chapter 29 built exactly that, and its limits: aliasing, callbacks, and the models."
  - text: "Running it: fuzz the endpoint with SQL fragments."
    why: "Dynamic testing can find such bugs, and security teams do it, but it needs a running application and finds only what its inputs reach."
```

## Open directions

Static analysis is an old field, and an active one. A few of the questions that shape analysers like SonarJS today, in general terms:

- **Analysing changes, not programs.** Clean as You Code (chapter 21) and pull-request analysis (chapter 18) look at what changed. Analyses that cross files need summaries that can be updated incrementally, so that a change costs in proportion to its size, as Infer showed at scale (chapter 26).
- **Combining rungs.** Types, dataflow and call graphs are each available to a rule; using them together, cheaply and predictably, is mostly engineering.
- **Models of libraries and frameworks.** Most of the precision of a taint analysis, and most of its maintenance, is in what it knows about the code it does not analyse. Generating and checking such models is a research topic of its own.
- **Code nobody wrote by hand.** Generated code, minified bundles (chapter 18), and, increasingly, code written by tools as well as by people. At the pinned commit, the plugin creates one built-in quality profile per profile name in its rules' metadata, and there are two: *Sonar way*, and *Sonar agentic AI*, whose rules are, with two exceptions, a subset of Sonar way's. The repository says no more about the second than its name.

::source{path="sonar-plugin/sonar-javascript-plugin/src/main/java/org/sonar/plugins/javascript/JavaScriptProfilesDefinition.java" symbol="CheckList.getDefaultQualityProfileNames()" title="One built-in profile per name in the rules' metadata"}

## Further reading

The course has cited its sources chapter by chapter; the bibliography collects them. For going further, a few books and resources cover more ground than any chapter could:

- Anders Møller and Michael Schwartzbach's *Static Program Analysis* lecture notes cover lattices, dataflow, interprocedural analysis, points-to analysis and abstract interpretation, with exercises, and are freely available. :cite[moller2024]
- Flemming Nielson, Hanne Riis Nielson and Chris Hankin's *Principles of Program Analysis* is the classic graduate text, with dataflow, constraint-based analysis, abstract interpretation and type systems in one framework. :cite[nielson1999]
- Xavier Rival and Kwangkeun Yi's *Introduction to Static Analysis* teaches abstract interpretation from the ground up, with a focus on building analysers; Patrick Cousot's *Principles of Abstract Interpretation* is the theory by its originator. :cite[rival2020,cousot2021]
- Daniel Kroening and Ofer Strichman's *Decision Procedures* explains the solvers behind symbolic execution, from SAT to the theories of SMT. :cite[kroening2016]
- Andreas Zeller and colleagues' *The Fuzzing Book* teaches test generation by building fuzzers, step by step, and is free online. :cite[zeller2024]
- The SonarJS repository itself, at the commit this course pins, with its `docs` directory and its rules' tests, is the most complete account of how a production analyser for JavaScript works. :cite[sonarjs]

## The last word

Every analysis in this course is wrong somewhere: that is Rice's theorem, and chapter 1 started from it. What distinguishes a useful analysis is not that it is never wrong but that its errors are chosen: silence where a report would cost more trust than it buys, soundness where a missed bug costs more than a false alarm, and an honest account, to the people who read its results, of which is which.
