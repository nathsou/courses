---
title: Five compilers, one counter
summary: React, Solid, Vue, Svelte and Angular compile the same small component. What did each compiler decide before the page ran, and what is left for the runtime to find out?
number: 19
duration: 60 minutes
prerequisites: [templates-and-solid, vue-proxies-and-hints, angular-zones-and-signals, svelte-runes]
---

You have now met every framework’s answer to *what changed?* one at a time. This chapter puts the answers next to each other, on the smallest program in which they differ: a counter that shows its value, adds a class once the value passes five, and has a button.

All of the code below is real: it is what each framework’s compiler wrote for this component, captured on the versions in the figure for this course. :cite[captured]

::compiler-compare{n="19.1"}

Click through the tabs, in this order: **React**, **React + Compiler**, **Solid**, **Vue**, **Vue Vapor**, **Svelte 5**, **Svelte 4**, **Angular**. For each, read the three notes under the code before you read the code. Then answer, for yourself, the three questions that sort them.

## Three questions for any compiler

1. **What was decided before the page ran?** What does the compiler know about the component that the runtime never has to find out?
2. **What does the runtime still have to find out?** And when, and how: by re-running and comparing, by recording reads, or by being told?
3. **What is the unit of update?** When `count` changes, what runs again: the component, a block, one effect, one line?

Here are the answers, from the code you just read.

| | Decided before the page runs | What the runtime discovers | What runs when `count` changes |
|---|---|---|---|
| **React** | almost nothing: JSX becomes `jsx()` calls | everything, by re-running and diffing | the component function, then the diff of its whole tree |
| **React + Compiler** | which values each element depends on; a cache slot for each | whether each dependency *changed*, by `!==` | the function, with cached parts returned by identity so the diff skips them |
| **Vue** | static nodes (hoisted), the fields that can change (patch flags), the block of dynamic nodes | which component read which property, with a Proxy | the component’s render, then a diff of only the dynamic nodes |
| **Angular** | the creation steps and the list of bindings (update block) | which views to check (all, or those marked or notified) | the update block of each checked view |
| **Svelte 4** | the dependencies of every template line, as bits | which variables were assigned | one run of `p`, bit tests only |
| **Solid** | the structure and the holes; component runs once | which signals each hole read | the effects that read the signal |
| **Vue Vapor** | the structure and the holes | which refs the render effect read | the one render effect |
| **Svelte 5** | the structure, the holes, which variables can ever change | which signals the template effect read | the one template effect |

Read down the *“decided”* column and you see the course in one sentence. **The more the compiler decides, the less the runtime does on each update, and the more the framework depends on being able to see the code.** React’s default decides nothing and never needs to see anything, so it works on any JavaScript you can write. Svelte 4 decides nearly everything, and therefore cannot see through a function call (chapter 17).

## Reading the React Compiler’s output

React’s own compiler is the odd one out: it does not remove the re-render. Here is its output for the counter, from the figure:

```js
export function Counter() {
  const $ = _c(9);                                  // a cache of nine slots, owned by this component instance
  const [count, setCount] = useState(0);

  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {   // slot 0 is empty: first render
    t0 = _jsx("h1", { children: "Counter" });
    $[0] = t0;
  } else {
    t0 = $[0];                                              // later renders: the same object
  }

  const t1 = count > 5 ? "big" : "";
  let t2;
  if ($[1] !== count || $[2] !== t1) {              // slots 1 and 2 hold the inputs of the last time
    t2 = _jsxs("p", { className: t1, children: ["Count: ", count] });
    $[1] = count; $[2] = t1; $[3] = t2;             // slot 3 holds the result
  } else {
    t2 = $[3];
  }
  // … the button (slots 4 and 5) and the div (slots 6, 7 and 8) follow the same pattern
}
```

The compiler found what each element *depends on* and wrapped it in a check: “if the inputs are the same as last time, return what I returned last time”. That is `useMemo` for every expression, written for you. Look at what it makes possible: the `<h1>` is created once and returned by identity afterwards, and when React diffs the returned tree, a child element that is *the same object* as before is skipped without looking inside it. The compiler does not make the function cheaper. It makes the **diff** cheaper.

Notice what it did *not* cache. The button’s `onClick` is `() => setCount(count + 1)`, a function that mentions `count`, so the button depends on `count` and is rebuilt every time. Writing the update in its functional form, `setCount(c => c + 1)`, removes the dependency. The compiler’s output then has seven slots instead of nine, and the button joins the `<h1>` as cached from the first render on. That is a good illustration of a general fact: **the compiler can only be as precise as the dependencies in your code.**

```numeric
id: five-compilers/slots
title: Counting cache slots
prompt: |
  The compiler's output for the original counter has a cache of nine slots, used like this: the `<h1>` takes 1; the paragraph takes 3 (its two inputs, `count` and the class string, and its result); the button takes 2 (its input `count` and its result); the outer `<div>` takes 3 (its inputs, the paragraph and the button, and its result). 1 + 3 + 2 + 3 = 9. Now change the handler to `setCount(c => c + 1)`. The button no longer depends on anything that changes (`setCount` is stable), so it needs only its result slot, and the `<div>` depends on the paragraph alone, since the other children are cached from the start. How many slots does the compiler allocate now?
answer: 7
unit: slots
tolerance: 0
explain: "The `<h1>` takes 1. The paragraph still takes 3. The button, with no changing inputs, takes 1 (a slot that stays empty until the first render, as the `<h1>`'s). The `<div>` now depends only on the paragraph, so it takes 2 (the paragraph it saw last time, and its own result). 1 + 3 + 1 + 2 = 7. The real output is in `docs/captured/react.compiler.functional.js` in the course repository."
```

## What each compiler chose, and what it cost

**React** chose to keep the programming model simple (a function from state to a description, chapter 2) and make it fast after the fact, with a memoizing compiler. It gets to keep *any* JavaScript: hooks, conditionals, closures, anything. The price is that the work of the runtime, the diff, is never zero, and that the quality of memoization depends on the code being analyzable.

**Vue** chose a *restricted language* (templates) so that the compiler could promise the diff things that a JavaScript render function cannot: this part of the tree is static, this node’s text may change and nothing else does. Its virtual DOM becomes “almost a compiled template”, and Vapor mode then drops the diff altogether.

**Solid and Svelte 5 and Vapor** chose the *reactive graph* as the primary structure and let the compiler write the effects. They pay at creation, a few objects per hole, and gain on updates: constant work per changed value.

**Svelte 4** chose to compute *everything* statically. It was the smallest runtime and the lowest overhead, and the largest set of rules about what the compiler can see.

**Angular** chose *checking* and made the check very cheap, with straight-line compiled bindings and an `OnPush` strategy to skip subtrees. It is now adding signals, which let it skip even more.

None of these is a point on a single line from “worse” to “better”. They are different bets about where work should happen, and about what programmers should be asked to give up in return:

- A **restriction** on the language (Vue’s templates, Svelte’s rules about assignment, Solid’s “components run once”), in return for more precision.
- A **ceremony** (`.value`, `count()`, `$state`), in return for knowing exactly what is reactive.
- A **runtime cost** (the diff, the checking, the subscriptions), in return for working with any code.

:::key
**Every framework’s compiler is an answer to the same trade.** Work done at build time is work you do not do on a click, and it is paid for by what the compiler must be able to prove about your code. *Which* work moves is the choice. How far it moves, a compiler can only go as far as your program lets it.
:::

```predict
q: "You change a component so that the count is also logged by a function that the component imports from another file: `logChange(count)`, called while rendering. Which of the five frameworks' compilers can see inside `logChange` to find out what it reads?"
options:
  - text: "Svelte 5, because its compiler sees the whole project."
    why: "Compilers in this chapter work file by file. Svelte 5 would see the call to `logChange` and treat its result as opaque. Whatever signals `logChange` reads are found at run time, by the reads."
  - text: "None of them. Compilers work on one file at a time, and what happens inside the call is opaque."
    correct: true
    why: "The compiler can see that `count` is *passed* to the function, and that is all. Svelte 4 therefore cannot know what else the function depends on (the trap from chapter 17); React Compiler treats the call as a possible side effect and the result as unmemoizable; Solid, Vue and Svelte 5 find out at run time, when `logChange` reads signals or proxies inside an effect. The compile-time part of the work stops at the function boundary."
  - text: "Only React’s, because it runs on JavaScript and can follow imports."
    why: "It processes one file at a time as well. Whole-program analysis would need a different kind of tool, and the cost of building it would be much larger than the savings."
```

## Compiling for the server

Each of these compilers can also produce a different output for **the server**, a function that builds an HTML string instead of DOM nodes. This is how a page can arrive as HTML before any script runs, and chapter 20 is about it. A first glimpse, from Svelte 5 for the same counter:

```js
export default function Counter($$renderer) {
  let count = 0;
  $$renderer.push(`<div class="counter"><h1>Counter</h1> <p${$.attr_class($.clsx(count > 5 ? 'big' : ''))}>Count: ${$.escape(count)}</p> <button>+1</button></div>`);
}
```

There are no signals here, no effects and no DOM: `count` is a plain `let`, because on the server a component renders once and is thrown away. The compiler has changed what the program means, for the environment it is going to run in. Solid’s server output is a function that fills in a prepared string array, and React’s server renderer is a library that takes the same component and walks its output. The *source* is shared; the work that gets done is not.

:::programmer
**Reading compiler output is a good habit.** Every one of these tools has a playground or a flag that prints its output (Solid’s and Svelte’s playgrounds, Vue’s SFC Playground, `ngc`, and the React Compiler playground). Compiler output is not a stable interface, and the code that you read in this chapter is from the versions named in the figure and will not be the same after an upgrade, but the *shape* has been stable for years: the template, the walk, the holes, or the cache. When a framework surprises you, the fastest way to understand it is usually to look at what it wrote.
:::

:::wild{framework="all five" version="October 2026"}
React 19.3 with Compiler 1.0 (stable since October 2025), Solid 1.9 (2.0 in release candidate), Vue 3.5 stable and 3.6 in release candidate (Vapor), Svelte 5.5x, Angular 22. The captured outputs in the course repository are dated 15 October 2026, with the tool versions in `docs/captured/README.md`.
:::

:::history{year=2025 title="The compilers arrive"}
Compilation as a framework strategy is older than any of these (Svelte 1 in 2016; Angular’s ahead-of-time compiler in 2016; Vue’s template compiler since Vue 1). What changed in 2024 to 2026 is that **every major framework has one that is not optional for its best performance**. React Compiler reached 1.0 in October 2025. :cite[react-compiler-docs] Vue’s Vapor mode, Svelte 5’s signal-writing compiler and Angular’s signals-first templates all moved the dividing line the same way: more decided before the page runs, less discovered at run time.
:::

:::whatchanged
All of the six answers meet here. *Rebuild* is React’s function re-running; *diff* is what React and Vue do with what it returns; *track* is the reads that Solid, Vue and Svelte 5 record; *dirty-check* is Angular’s bindings; *compile* is the build step that each of them leans on. The final answer, *skip*, is the one this chapter only hinted at: not to run the code at all, because the server already did.
:::

## What’s next

The next three chapters are about **the server**. Chapter 20 is the problem every framework has to solve to use it: a page arrives as HTML, and the framework must take it over without throwing it away. That is hydration, and the three ways of making it cheaper.
