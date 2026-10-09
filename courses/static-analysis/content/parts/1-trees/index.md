---
number: I
title: 'How we got here: from lint to ESLint'
summary: Checking programs by their shape is as old as compilers. From a Bell Labs tool for C to a pluggable linter for JavaScript built on a shared tree format, by way of grammars, parser generators and a ten-day language.
duration: About 12 minutes
---

Part I is about rules that look at the shape of code: its tokens, its syntax tree, the patterns a selector can match. It is the oldest and still the most common kind of static analysis, and the tools that do it have a long family history.

## A program that read programs

Compilers had always rejected programs that broke the rules of the language. In the 1970s, C added a different problem: programs that the compiler accepted but that were almost certainly wrong, such as a function called with the wrong number of arguments in another file, or a value used before it was set. The C compiler was deliberately small and fast and did not look for such things. In 1978 Stephen Johnson, at Bell Labs, described a separate program that did: **lint**, named after the bits of fluff it picked out of the fabric. :cite[johnson1978lint] It ran over a whole program, compared declarations and uses across files, and reported constructs that were legal but suspicious. Johnson had also written yacc, the parser generator that much of Unix was built with: the same person built the tool that turned grammars into syntax trees and the tool that looked for bugs in them.

The separation lint made, between the compiler that must accept every valid program and a checker that may complain about valid ones, is the separation this course lives in. A linter's rules are opinions, and it can afford false positives that a compiler cannot.

## Grammars and trees

The machinery a linter rests on came from compilers. The ALGOL 60 report of 1960 described the language's syntax with a formal grammar in what became Backus–Naur form, and grammars made parsers something that could be generated rather than written by hand. A parser's output, the **abstract syntax tree**, keeps the structure of the program and drops its punctuation: an `if` statement is a node with a test, a consequent and an alternate, however it was laid out. Chapter 2 builds one; every rule of Part I walks one.

## A language written in ten days

JavaScript was written by Brendan Eich at Netscape in 1995, in a few weeks, to make web pages interactive. It spread with the browser, and its quirks spread with it: automatic semicolon insertion, `==` with its conversions, `var` scoped to the function rather than the block, `this` decided by the caller. A language with so many ways to write something legal and wrong was fertile ground for linters.

Douglas Crockford's **JSLint**, released in 2002, enforced his view of a good subset of the language, and was famous for refusing to compromise. :cite[jslint] JSHint, forked from it in 2011, made its checks configurable. Both had their rules built in. In 2013 Nicholas Zakas released **ESLint**, whose design choice was the opposite: every rule is a plug-in, a small module that receives the syntax tree and reports what it finds, and anyone can write one. :cite[zakas2013eslint] Chapter 3's rule anatomy is ESLint's.

## A shared tree

Pluggable rules need a stable tree to plug into. Mozilla's SpiderMonkey engine exposed its parser's tree as a documented JavaScript API around 2010, and independent parsers such as Esprima and Acorn produced the same shape. The community formalised it as **ESTree**, a specification of the node types for each edition of the language. :cite[estree] Every major JavaScript tool now speaks it, which is why a rule written for ESLint can run on trees produced by espree, Babel's parser or typescript-eslint's parser (chapter 2), and why SonarJS's rules are ESLint rules.

TypeScript, released in 2012, had its own compiler tree. The typescript-eslint project converts it into ESTree, with extra node types for TypeScript's syntax, and gives rules access to the type checker behind it. :cite[typescripteslint] That bridge is what Part II's type-dependent rules cross.

## Rules that measure

Not every rule looks for a bug. In 1976 Thomas McCabe proposed counting the independent paths through a function, **cyclomatic complexity**, as a measure of how hard it is to test. :cite[mccabe1976] In 2017 G. Ann Campbell, at SonarSource, proposed **Cognitive Complexity**, designed instead to match how hard code is for a person to understand: nesting costs more than sequence, and a `switch` costs less than a chain of `if`s. :cite[campbell2018] Chapter 6 implements it: a rule that walks a tree and adds up a score.

::timeline{part="I"}
