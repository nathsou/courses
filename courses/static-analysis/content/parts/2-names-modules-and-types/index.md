---
number: II
title: 'How we got here: names, modules and types'
summary: What a name means depends on where it is, which file it came from and what the compiler knows about it. Lexical scope, JavaScript's module systems, TypeScript's gradual types, and the regular expressions inside strings.
duration: About 12 minutes
---

Part II gives rules more than shapes: what a name refers to, which module a function was imported from, what type a value has. Each of these was a long-running argument in programming languages before it was a tool for analysis.

## Scope

The question "which declaration does this name refer to?" has two classic answers. In **lexical** (static) scope, the answer depends on where the name appears in the program text: look in the enclosing blocks, then their enclosing blocks. In **dynamic** scope, it depends on which functions are running: look in the caller, then its caller. ALGOL 60 chose lexical scope, early Lisps dynamic scope, and the field slowly settled on lexical scope, because it lets a reader, and an analyser, answer the question from the text alone. Scheme made lexical scope and closures its foundation in the 1970s.

JavaScript inherited lexical scope and closures, with a twist: `var` declarations belong to the whole function, not to the block they appear in, and are hoisted to its top. ECMAScript 2015 added `let` and `const`, scoped to blocks, and classes. Chapter 7's scope manager, which ESLint builds for every file, is the analysis that answers the question for each identifier; SonarJS's rules lean on it constantly.

## Modules

For its first fifteen years, JavaScript had no modules. Scripts shared one global scope, and libraries hid their internals in functions called immediately. Two systems filled the gap. **CommonJS**, adopted by Node.js from 2009, loads modules with a `require` call that returns an object, synchronously. **AMD**, from the RequireJS loader, declares dependencies as an array and receives them as callback parameters, so that browsers can load them asynchronously; chapter 10 met it in S107's exception for AMD callbacks. ECMAScript 2015 finally standardised **modules** with `import` and `export`, static declarations that tools can read without running anything.

A rule that wants to know whether a call is `child_process.exec` must see through all three, and through local renames and destructuring. Chapter 8's fully qualified names are SonarJS's answer: a name for each imported value that does not depend on what the file calls it.

## Types

JavaScript is dynamically typed: values have types, variables do not. Large codebases pushed for more. Google's Closure Compiler checked types written in comments; Microsoft released **TypeScript** in 2012, a superset of JavaScript with optional type annotations, designed by Anders Hejlsberg; Facebook's Flow followed in 2014. All three are forms of **gradual typing**, a theory that Jeremy Siek and Walid Taha formalised in 2006: typed and untyped code mix, with an `any` type at the boundary. :cite[siek2006]

TypeScript won, largely through its tooling: the same compiler that checks types powers editors' completion and navigation, through a language service. For static analysis, its most useful feature turned out to be **narrowing**: the compiler follows `if (x !== null)` and `typeof x === 'string'` through the control flow, and gives `x` a more precise type inside the branch. That is a flow-sensitive analysis that every type-dependent rule gets for free (chapter 9). It is also, as Part VIII shows, an analysis that joins paths, and misses what only path-sensitive reasoning can see.

## Languages inside strings

Some code hides in strings. Stephen Kleene described **regular expressions** in 1956, as an algebra of the events a finite automaton can recognise. :cite[kleene1956] Ken Thompson turned them into a tool in 1968, compiling an expression into an automaton that matches in linear time. :cite[thompson1968] Later implementations, in Perl and then in most languages, chose **backtracking** instead, which supports back-references and lookarounds and takes exponential time on some patterns. Russ Cox's articles brought the difference back to programmers' attention in 2007 :cite[cox2007], and a series of outages caused by a single regular expression, at Stack Overflow in 2016 and at Cloudflare in 2019, made **ReDoS** a household word. :cite[stackoverflow2016,cloudflare2019] Chapter 11 parses regular expressions into trees and finds the explosive ones, as SonarJS's S5852 does.

::timeline{part="II"}
