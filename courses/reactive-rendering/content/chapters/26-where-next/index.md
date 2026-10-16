---
title: Where this is going
summary: Compilers that write memoisation, signals in the platform, DOM APIs that move nodes without resetting them, and why the six answers keep converging.
number: 26
duration: 45 minutes
prerequisites: [five-compilers, resumability]
---

Look back at the six answers of chapter 0. *Rebuild* it from scratch; *dirty-check* every value; *diff* a description; *track* the reads; *compile* the dependencies; *skip* the work. They looked like six camps. The last twenty-five chapters have shown something different: **they are six tools, and every framework in use combines several.** And the combinations are moving, year by year, in one direction.

## The map, with a year slider

Here are the frameworks of the course placed on two axes: how much each one **finds out before the page runs** (left to right), and how much of the application the **browser has to run** to become interactive (top to bottom). Slide the year from 2010 to 2026 and watch them move.

::the-map{n="26.1"}

The positions are judgement, from what the chapters showed, and not measurements: do not read the third decimal. The *trails* are the point. React starts in the top left (a runtime that discovers everything, in the browser) and moves right and down: a compiler decides memoisation, and server components keep code off the client. Angular moves from “check everything” towards “be told by signals”. Vue moves from a virtual DOM towards Vapor. Svelte rewrote its mechanism (bits, then signals) and stayed on the right. The islands, resumable and morphing families have been at the bottom the whole time, and the rest are coming towards them.

Press the answer buttons to highlight each. They are all over the map.

## Four trends

**The compiler is taking over the work.** Chapters 12 to 19 were a series of compilers that decide more at build time: Solid found the holes, Svelte 3 decided the dependencies, Vue found static trees and patch flags, React’s Compiler (1.0, October 2025) found what to memoise in code that *was not written for it*. The direction is clear. The limit is also clear: a compiler can only prove what your code lets it prove, and the frameworks that give the compiler the most to work with ask the most from your code.

**Signals have become common ground.** Seven libraries, one idea, and a standard proposal (chapter 15, at stage 1 at the time of writing). Angular, Vue, Svelte, Solid, Preact, Qwik and MobX all have the same three primitives. Even React, which does not have them, is increasingly used with them: libraries bring signals to React components, and the Compiler’s memoisation is the same *what depends on what* analysis in a different form. The remaining differences are about **when** (batching, scheduling) and **who owns** (disposal), the parts the standard deliberately leaves open.

**Work moves to the server, and the browser runs less.** SSR with hydration (chapter 20) made the first paint fast and left a dead page. Islands, server components and resumability (chapters 21 and 22) cut what the browser runs. HTML-over-the-wire (chapter 23) removes most of it. There is now almost no framework without a server story, and the debate is about *where the boundary is drawn* and how much the programmer must know about it.

**The platform is catching up.** Several things that frameworks had to build by themselves are now, or are becoming, part of the browser:

- **Moving nodes without resetting them.** For twenty years a DOM node that moved was *removed and inserted*, and a removal reset focus, scroll position, iframes and animations. That is the reason keyed lists, morphing, and chapter 5’s whole subject exist. :term[`Node.moveBefore()`]{id=move-before}, which shipped in Chrome in early 2025, moves a node **atomically**, preserving that state, and other browsers are following. It lets a keyed reorder keep an input’s focus.
- **Transitions between states.** The :term[View Transitions]{id=view-transitions} API animates between two versions of the page, in a single document or across navigations, and so does the work that frameworks and morphing libraries had to do themselves to make page changes feel continuous.
- **Server-rendered web components.** Declarative Shadow DOM lets the server write a component’s shadow tree as HTML, so components that are not framework-specific can be server-rendered, which is what Lit’s SSR relies on.
- **Template parts in the platform.** A proposal for *DOM Parts* would put chapter 16’s idea, a template with holes whose values can be updated cheaply, in the browser itself. Early days.
- **Faster navigations.** Speculation rules let the browser prefetch or prerender the next page, which makes multi-page applications (the islands and morphing world) feel as quick as single-page ones.
- **Signals**, as chapter 15 described.

:::key
**The trend is to move work out of the framework**, upward into compilers, downward into the browser, and sideways onto the server, until what remains in the library is what no one else can do for it. The six answers survive as the questions each layer has to answer.
:::

## What is still open

**Async in the reactive graph.** A signal holds a value that exists now. A `fetch` does not. Every framework has an answer (Suspense and transitions in React, `resource` in Angular, `createResource` in Solid, `await` in Svelte 5’s templates) and none is settled. The questions are about what the UI shows *while* the value is on its way, and what happens when a newer request overtakes an older one: chapter 8’s scheduling problem again.

**Mutations and forms.** Reading data is well served. *Writing* it (optimistic updates, retries, conflict handling, forms that work with and without JavaScript) is an area in which every framework has recently introduced a new primitive, from React’s Actions to SvelteKit’s form actions.

**State that lives in both places.** When a server component and a client component share an idea of state, which owns it? Resumability serialises it; RSC passes props; local-first systems keep a database in the browser and sync. The right answer depends on the application, which is why this question is still being asked.

**Cost you can see.** The benchmark of chapter 24 counted DOM operations because those are what a strategy decides. Whole-application cost (memory, bundle size, startup, accessibility updates, the work of layout and paint) is harder to attribute, and the tools to see it are still catching up to the tools to build it.

**Teaching.** There are very few places where a person can *see* what a framework does with a change. The lab behind this course is an attempt to make that a normal thing to be able to do.

```predict
q: "A new framework is announced. It has a compiler, signals, server rendering with partial hydration, and a virtual DOM for components that need it. Which of the six answers does it use?"
options:
  - text: "Compile, because that is the headline feature."
    why: "It is one of them. The other three features each correspond to another answer, and the description is the sign that this is not a framework with one."
  - text: "Four of them: compile, track, diff and skip, each where it fits."
    correct: true
    why: "This is the real situation of almost every framework: a mixture, chosen by the part of the application. The useful questions are not *which answer does it use* but *where does each part of my application land, and what does that cost?* The three questions of chapter 25 sort any such framework."
  - text: "None: it must have invented a new answer."
    why: "It is a *combination*. New frameworks are mostly new combinations, with new trade-offs between the same six."
```

## Where to read more

The sources of the chapters are in the bibliography at the end of the course. A shorter list for reading further:

- **Reactivity.** Ryan Carniato’s *A Hands-on Introduction to Fine-Grained Reactivity* for the code of chapters 9 to 11, :cite[carniato-fgr] the Signals proposal and its polyfill for the standard, :cite[tc39-signals] and Milo Mighdoll’s Reactively for the three-colour algorithm. :cite[reactively]
- **Virtual DOM and Fiber.** The React team’s own reconciliation notes and Andrew Clark’s *React Fiber Architecture*. :cite[react-reconciliation] :cite[acdlite-fiber]
- **Compilers.** Rich Harris on Svelte 3, :cite[harris-rethinking] and each framework’s playground (Solid, Vue SFC, Svelte, the React Compiler playground) for reading real output: the best teacher is the output.
- **The server side.** Jason Miller on islands, :cite[miller-islands] the React Server Components RFC, :cite[rsc-rfc] and the Qwik documentation on resumability. :cite[qwik-resumable]
- **Benchmarks.** The js-framework-benchmark, and reading its method before its table. :cite[krause-benchmark]

:::programmer
**What to do next.** Pick a small application, perhaps the Notes app of chapter 0, and port it by hand into two frameworks you have not used, then read the output of their compilers and look at the DOM operations in the browser’s developer tools. In the lab of this course, change one thing in one adapter (key the rows differently, batch a write, delay an effect) and run the benchmark of chapter 24 to see where the cost moves. The best way to learn what a strategy is for is to find the change that breaks it.
:::

:::history{year=2013 title="Thirteen years on one question"}
React’s first public demonstration was in 2013, at JSConf US, and it opened the period this course covers: **the question of how a user interface should find out what changed** became the main subject of front-end engineering. In those thirteen years it has been answered with a virtual DOM, with a compiler, with signals, with the server, and with an old idea (morphing) made newly cheap. :cite[react-reconciliation] There is no sign that it has a final answer, which is a good reason to understand the six.
:::

:::whatchanged
This is the end of the course, and the answer to *what changed?* is the answer to your own application. It is *where you look* (the data, the tree, the DOM), *when* (every event, every write, build time, the server), and *who tells you* (you, the framework, a compiler, the browser). Everything in the table of chapter 25 is a way to choose.
:::

## The last exercise

There is no code to write here. Choose a page you use every day, and answer the three questions of chapter 25: *what does it find out before the page runs, how does it find out what changed afterwards, and what does the browser have to run before it responds?* Open the developer tools and check. Then look at where the page sits on the map. If it surprised you, you now have a better model than the one you started with.
