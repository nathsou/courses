---
title: Templates and compilers
summary: 'From a library that finds the holes at runtime to compilers that write the update code: how much of the answer can be worked out before the page runs.'
number: IV
---

Parts II and III left a question open: how much of the work of finding out *what changed* can be done before the program runs? A template is a program in a restricted language. It has static parts that never change and a few holes where values go. Someone who reads it can know, in advance, where the changes can possibly happen.

## Two ways to read a template

There are two places to read it. At **run time**, a library can find the holes the first time a template is used and remember them. lit-html (2017) does this with a language feature: a tagged template literal gives the library the same array of static strings every time the same line of code runs, and so the array’s identity is the template’s identity. :cite[lit-docs] The first render prepares the template and finds its parts; the next ones compare each hole’s value with the last. No compiler is needed, and no virtual DOM.

At **build time**, a compiler reads the template and writes the code. Svelte (2016) was the first mainstream framework designed around this, a compiler from templates to plain JavaScript with no framework runtime to ship. :cite[harris-vdom] Svelte 3 (2019) took it to the limit: the compiler turned every assignment into the setting of a bit in a mask and wrote an update function of bit tests, so that nothing at run time had to discover anything. :cite[harris-rethinking]

## The middle

Between those two extremes, the compilers of the big frameworks learned to *tell the runtime what they knew*. Vue 3’s compiler (2020) hoists static nodes, adds patch flags that say what can change on a node, and records a block tree of the dynamic nodes, so that its virtual DOM diff skips most of the template. :cite[vue-reactivity-docs] Angular has compiled templates ahead of time since version 2 (2016), and since its Ivy compiler (version 9, 2020) into creation and update blocks. React’s compiler writes memoization for code that was not written for it. In each case the *question* stayed the same and the amount settled before the page runs went up.

## Signals under the template

Solid (2018) and its successors combined the two ideas: compile the template into a cloned structure and a list of holes, and make each hole an effect on the signals engine of Part III. Svelte 5 (2024) did it too, rewriting its mechanism from bits to signals and keeping the compiler that makes `count++` look like plain JavaScript. :cite[svelte-runes-docs] Vue’s Vapor mode (in release candidates in 3.6) gives Vue templates the same compile target. These are different compilers writing very similar code, and the differences (one effect per hole or one per template, where components run once) are what chapter 19 reads side by side.

## What it costs

Every step of this road gives something up. A virtual DOM works with any JavaScript you write. A compiler can only use what it can prove, so each of these frameworks asks something of your code: a restricted template language, rules about assignment, a convention that components run once. The deal is the same each time: *give the compiler less to worry about and it will do more for you.*

Part IV reads each design from the inside, with real compiler output, and ends with the five frameworks’ compilers side by side on one counter.

::timeline{part="IV"}
