---
title: Signals
summary: 'From the first spreadsheet to a proposal for the language itself: how recording what a computation reads became the way reactive programs say what depends on what.'
number: III
---

Every spreadsheet user has used a reactive program. In VisiCalc (1979) a cell holds a number or a formula, and when you change a number, the cells that depend on it show new values. :cite[bainomugisha-2013] Nobody tells the sheet which cells depend on which: the formulas say so by mentioning each other. Since Lotus 1-2-3 (1983), the sheet also works out the order in which to recompute them. That is the idea of this part of the course, and it is much older than the web.

## Reactive programming

Academic work in the 1990s generalised it. Conal Elliott and Paul Hudak’s *Functional Reactive Animation* (1997) treated values that change over time as first-class, and began a family of languages and libraries, surveyed by Bainomugisha and colleagues in 2013. :cite[elliott-hudak-1997] :cite[bainomugisha-2013] A parallel line, **incremental computation**, asked how to recompute only what a change affects. Systems such as Adapton (2014) made lazy, demand-driven recomputation precise. :cite[hammer-adapton-2014]

## Arriving in JavaScript

JavaScript got there from several directions. **Knockout** (2010) offered observables and `ko.computed`, whose dependencies were found by running the function and recording what it read. :cite[knockout-docs] **Vue** (2014) did the same with getters and setters on plain objects, and **MobX** (2015) with transparent observables. For a while the dominant idea was still the virtual DOM; the signals family grew quietly in the margins.

It was **Solid** (2018) that put the pieces together, by combining fine-grained signals with a compiler that turned each template into direct DOM instructions and one effect per hole. :cite[carniato-fgr] Ryan Carniato’s writing and streams explained the model, and others picked it up: Preact Signals and Reactively in 2022, Angular’s signals in 2023, Vue’s reactivity rewrites, and Svelte 5’s runes in 2024 all converged on the same three primitives. :cite[reactively]

## What the engines had to learn

A signal sounds simple and has several hard parts. The first engines had **glitches**: an effect could see a state that never existed, because it ran while the graph was half updated (chapter 10). Solving that meant separating the *marking* of what is stale from the *recomputing* of it, and led to the three-state *clean, check, dirty* scheme that most libraries now use. Writes needed **batching** and effects needed **ownership**, so that an effect created inside another is destroyed with it (chapter 11). Those are the problems that every engine solves, slightly differently, and the reason it is not obvious to standardise them.

## A standard

In 2024 a group of framework authors proposed to put the common core in the language. The TC39 Signals proposal defines `State`, `Computed` and a low-level `Watcher` from which effects can be built, and leaves scheduling and ownership to the libraries. :cite[tc39-signals] At the time of writing it is at stage 1. Whether it advances or not, it has already done something useful: it has made the shared core of these libraries visible.

Part III builds that core: a spreadsheet, the three primitives in forty lines, the glitch and its fixes, batching and ownership. Then it follows signals into Solid, Vue, Angular and the standard.

::timeline{part="III"}
