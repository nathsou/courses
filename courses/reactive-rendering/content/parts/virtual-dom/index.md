---
title: Virtual DOM
summary: 'From a talk at JSConf 2013 that many thought was a bad idea, to Fiber, hooks and a compiler that writes the memoisation: how re-rendering everything became the mainstream answer.'
number: II
---

In May 2013 Facebook open-sourced a library at JSConf US. The idea was blunt: **do not try to update the page when the data changes; describe the page again, from scratch, as a function of the data, and let the library work out the difference.** :cite[react-reconciliation] To many in the room it sounded like a step backwards. Rebuilding the whole interface on every change was precisely what hand-written update code and observers had been invented to avoid, and the first demonstrations also mixed markup into JavaScript, which was against the received wisdom of the time.

It worked because of a trick. The description is not the DOM; it is a tree of plain JavaScript objects, which are cheap to create. The expensive thing, writing to the real DOM, happens only where the new description differs from the last one. The difference between two trees is, in general, an expensive problem: the best known algorithms for the general tree edit distance take time at least cubic in the size of the trees. :cite[zhang-shasha-1989] The React team replaced the general problem by two assumptions that nearly always hold in user interfaces (elements of different types hold different subtrees, and a developer-supplied *key* says which child is which) and the diff became linear. :cite[react-reconciliation] The algorithm in chapter 4 is that one.

## Lists, and the trouble with identity

The assumptions have a weak point: lists. If a list of rows is reordered and the rows have no identity, the diff must match them by position, and every row’s state follows the *position*, not the row. Keys (chapter 5) are the answer, and the algorithms that use them, React’s last-placed-index and Vue’s longest-increasing-subsequence, differ in how few DOM moves they need. Vue (2014, with a virtual DOM from version 2 in 2016) and Inferno and ivi sharpened that part of the design. The questions of identity that keys answer return in Part IV, where a template’s identity is the identity of the strings that make it up, and in Part V, where an `id` attribute is the key of a morph.

## Components, state and time

A virtual DOM is only half of an idea. The other half is **components**: functions that take props and return a description. State had to live somewhere, and for years that meant classes. In 2018 the React team introduced hooks, which let a function component keep state by calling `useState` and friends in the same order on every render. :cite[react-hooks-intro] The design is clever and demanding: the call order *is* the identity of each piece of state, and the cost is the rules of hooks and the stale closures that come with re-running a function.

Under the hood, the reconciler was being rewritten. React 16 (2017) replaced the recursive diff with **Fiber**, a tree of linked units of work that can be paused between nodes. :cite[acdlite-fiber] That made it possible to split a long render into slices and give typing priority over a list update, which is chapter 8. React 18 (2022) made the machinery visible to programmers as transitions and concurrent features.

The last chapter of the story is about the cost of re-rendering everything. A parent that re-renders pulls its children along, and the standard answer was `memo`, `useMemo` and `useCallback`, written by hand and easy to get wrong. The **React Compiler** (1.0, October 2025) writes those caches itself. :cite[react-compiler-docs] It leaves the answer the same (describe the page again, and diff) and makes the describing cheaper. Vue’s compiler does something related to the diff itself (chapter 13). Part II ends where Part III begins, with a framework that asks whether the describing and diffing are needed at all.

::timeline{part="II"}
