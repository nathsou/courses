---
title: Time slicing
summary: A render that cannot be interrupted freezes the page. Fibers turn the recursion into a loop you can pause, and priorities let typing jump the queue.
number: 8
duration: 55 minutes
prerequisites: [who-re-renders]
---

Chapter 7 treated rendering as work that costs *time*. This chapter is about the one property of that time that matters most to a person using the page: whether it can be **interrupted**.

JavaScript in a browser runs on one main thread, and that same thread handles clicks, keystrokes, scrolling and painting. While a function is running, nothing else on the page can happen: no click is handled, no frame is painted. An update that takes sixty milliseconds is invisible. One that takes six hundred is a frozen tab.

## The freeze

Here is the problem in its sharpest form. A search box filters a long list. Each keystroke must do two things: show the character in the box, which is cheap and urgent, and re-render the filtered list, which is expensive and not urgent. A person typing fast would be happy for the list to lag a little, as long as the box keeps up.

In a renderer that cannot stop, the two are tied together. The keystroke’s handler updates state, the framework re-renders the whole tree, including a list that takes 130 ms, and *only then* does the browser get to paint the character. Type five letters and each one waits for the renders of all the letters before it.

Run it. The figure simulates the main thread on a virtual clock: five keystrokes sixty milliseconds apart, into a list of 200 items that costs about 130 ms to render. The pink bands in the background are frames the browser could not paint.

::frame-timeline{n="8.1"}

In *Synchronous* mode, the timeline is one long block of blue, and the worst wait before a character appears is hundreds of milliseconds, growing with each key. That is a page that feels broken, though every individual function in it is doing exactly what it should.

## Why it cannot be interrupted

The obvious fix is to pause the render when a keystroke arrives, handle it, and carry on. But for a render written as ordinary recursion, there is nothing to pause. React’s original reconciler (now called the *stack reconciler*) walked the component tree with plain recursive function calls:

```ts
function renderTree(element) {
  const children = callComponent(element);       // render this component
  for (const child of children) renderTree(child);   // recurse
}
```

The program’s *place in the tree* lives on the call stack. You cannot stop in the middle, return to the browser and come back later, because returning unwinds the stack and the place is gone. A running recursion either finishes or is abandoned.

This was a central reason the React team rewrote the core of the library between 2016 and 2017. The new reconciler, **Fiber**, shipped in React 16 in September 2017. :cite[acdlite-fiber]

## Fibers: a tree you can pause

A *fiber* is a unit of work: one component (or element) in the tree, stored as an ordinary object. What makes it different from the recursion is that the tree is stored as a **linked list**: every fiber has a pointer to its first `child`, to its next `sibling`, and back up to its parent, `return`.

```ts
interface Fiber {
  name: string;
  child: Fiber | null;     // first child
  sibling: Fiber | null;   // next sibling
  return: Fiber | null;    // parent
}
```

With those three pointers a depth-first walk needs no stack. Given any fiber, the *next* one is determined by the fiber alone: its child if it has one; otherwise its sibling; otherwise climb up through `return` until some ancestor has a sibling.

```ts
function nextFiber(fiber) {
  if (fiber.child) return fiber.child;
  for (let f = fiber; f; f = f.return) if (f.sibling) return f.sibling;
  return null;
}
```

And now the walk can be written as a **loop** whose entire state is *one variable*: the next unit of work.

```ts
let next = rootFiber;
function workLoop(shouldYield) {
  while (next && !shouldYield()) {
    performUnitOfWork(next);       // render one component
    next = nextFiber(next);
  }
  // either finished (next === null), or yielding with `next` remembering where we were
}
```

To pause, return. To resume, call `workLoop` again later; `next` is still there. Between units of work the loop asks `shouldYield()`, and React’s scheduler answers *yes* once about five milliseconds have passed since it started, hands control back to the browser so that input can be handled and frames painted, and arranges to be called again (React uses a `MessageChannel` message, which runs as soon as the browser has had a turn). The result is that a 130 ms render is not one 130 ms block, but twenty-six slices of five milliseconds with the browser getting a turn between each.

```build
id: time-slicing/work-loop
title: Write the work loop
prompt: |
  `toFibers(tree)` (from `@rx/scheduler`) turns a tree into fibers with `child`, `sibling` and `return` pointers. Implement `nextFiber(fiber)`, which returns the fiber that comes after this one in a depth-first, parents-before-children walk (or `null` at the end), using *only those pointers* (no recursion, no array of the whole tree). Then implement `workLoop(next, visit, shouldYield)`: while there is a next fiber and `shouldYield()` is false, call `visit(fiber)` and move on; return the fiber to resume from (`null` when the walk is finished). The tests pause the walk every few units and resume it, and require that every fiber is visited exactly once, in the order a recursive walk would.
starter: |
  import type { Fiber } from '@rx/scheduler';

  /** The fiber after `fiber` in depth-first order, or null. Uses child, sibling and return only. */
  export function nextFiber(fiber: Fiber): Fiber | null {
    // TODO
    return null;
  }

  /** Visit fibers until finished or told to yield. Returns where to resume from (null when done). */
  export function workLoop(next: Fiber | null, visit: (f: Fiber) => void, shouldYield: () => boolean): Fiber | null {
    // TODO
    return next;
  }
solution: |
  import type { Fiber } from '@rx/scheduler';

  export function nextFiber(fiber: Fiber): Fiber | null {
    if (fiber.child) return fiber.child;
    for (let f: Fiber | null = fiber; f; f = f.return) {
      if (f.sibling) return f.sibling;
    }
    return null;
  }

  export function workLoop(next: Fiber | null, visit: (f: Fiber) => void, shouldYield: () => boolean): Fiber | null {
    while (next && !shouldYield()) {
      visit(next);
      next = nextFiber(next);
    }
    return next;
  }
tests: |
  import { test, expect } from '@rx/test';
  import { toFibers, preorder } from '@rx/scheduler';
  import { nextFiber, workLoop } from './solution.ts';

  const tree = {
    name: 'App', cost: 1, children: [
      { name: 'Header', cost: 1 },
      { name: 'List', cost: 1, children: [
        { name: 'Row1', cost: 1, children: [{ name: 'Cell1', cost: 1 }, { name: 'Cell2', cost: 1 }] },
        { name: 'Row2', cost: 1 },
      ] },
      { name: 'Footer', cost: 1 },
    ],
  };

  test('nextFiber follows child, then sibling, then climbs', () => {
    const app = toFibers(tree);
    expect(nextFiber(app)!.name).toBe('Header');
    expect(nextFiber(app.child!)!.name).toBe('List');            // Header has no child: its sibling
    const cell2 = app.child!.sibling!.child!.child!.sibling!;
    expect(cell2.name).toBe('Cell2');
    expect(nextFiber(cell2)!.name).toBe('Row2');                  // climb to Row1, then its sibling
    expect(nextFiber(app.child!.sibling!.sibling!)).toBeNull();   // Footer is last
  });

  test('without yielding, the walk visits every fiber once, in recursive order', () => {
    const seen: string[] = [];
    const rest = workLoop(toFibers(tree), (f) => seen.push(f.name), () => false);
    expect(rest).toBeNull();
    expect(seen).toEqual(preorder(tree));
  });

  test('yielding returns the next unvisited fiber', () => {
    const seen: string[] = [];
    let budget = 3;
    const rest = workLoop(toFibers(tree), (f) => seen.push(f.name), () => budget-- <= 0);
    expect(seen).toEqual(['App', 'Header', 'List']);
    expect(rest!.name).toBe('Row1');
  });

  test('pausing every two units and resuming still visits every fiber once, in order', () => {
    const seen: string[] = [];
    let next: any = toFibers(tree);
    let slices = 0;
    while (next && slices < 50) {
      let budget = 2;
      next = workLoop(next, (f) => seen.push(f.name), () => budget-- <= 0);
      slices++;
    }
    expect(seen).toEqual(preorder(tree));
    expect(slices).toBe(4); // 8 fibers, 2 per slice
  });

  test('a loop told to yield at once does nothing', () => {
    const root = toFibers(tree);
    const seen: string[] = [];
    expect(workLoop(root, (f) => seen.push(f.name), () => true)).toBe(root);
    expect(seen).toEqual([]);
  });
hints:
  - "`nextFiber`: if there is a child, go down; otherwise look for a sibling here, then at the parent, then at the grandparent…"
  - "`workLoop` checks `shouldYield()` *before* each unit, and returns whatever `next` is when it stops."
explain: "That is the structural heart of Fiber: a depth-first walk whose whole state is one pointer. Real fibers carry much more (props, state, effect flags, alternates for double buffering), and the walk also has a *complete* step on the way back up, where the diff results are collected. But everything that makes rendering interruptible is in these two functions."
```

## Priorities, and throwing work away

Being able to pause is only half of it. The other half is deciding what to run when you resume. React 18 sorts updates into **lanes**, priorities with different urgency. A keystroke or a click is *discrete* and urgent: it should be rendered and committed at once. A state update marked as a **transition** (`startTransition(() => setQuery(q))`, or the value returned by `useDeferredValue`) is declared by the programmer to be *not urgent*: it can be rendered in the background, interrupted, and even abandoned.

Switch the figure to *Time-sliced, interruptible*. Three things change.

**Each keystroke is echoed within a slice.** The input’s update is high priority; it is rendered and committed the moment the current slice ends. The worst wait for a character is now at most about a slice plus the cost of the echo itself.

**The list renders in the background, in slices.** The blue is now cut up by yield points, and the pink dropped-frame bands disappear: the browser gets a turn about every five milliseconds, so it can always paint.

**Stale work is thrown away.** When the second keystroke arrives, the half-built list for the first one is out of date. The framework *discards it* (the pink vertical lines) and starts again for the newer value. The figure counts the wasted rendering. By the final keystroke, only the last list is rendered all the way through and committed; the lists for `r`, `re`, `rea` and `reac` were never shown to anyone.

That is why the render phase *must* be pure (chapter 7). If a render has side effects, throwing it away leaves them behind. If rendering is free of them, abandoning a render is free, except for the time it took.

:::question
Nothing in the model *commits* a half-finished render. Why is the commit phase not sliced in the same way?
:::

:::details[Answer]
Because a commit makes changes to the DOM, and a person can see a half-applied commit: a list with some rows updated and some not, a layout in the middle of a change. The render phase can be interrupted because it only produces a description; the commit must be one uninterrupted step so that what appears on screen is always a consistent state. React makes the *render* concurrent and keeps the *commit* synchronous, and the commit is usually short because the diff has already found the minimum.
:::

## What interruptible rendering costs

Concurrency in rendering is not free, and the costs show up as new rules.

**Tearing.** If a render is split across several slices, and during that time something outside React (a Redux store, a global variable, a browser API such as `matchMedia`) changes, then different components in the *same* render may read different values: one half of the screen from before the change, the other half from after. That inconsistency is called tearing. React’s answer is the `useSyncExternalStore` hook, through which external stores must be read: it detects a change during a render and forces that render to finish synchronously, accepting a frozen frame to avoid showing an inconsistent screen.

**Double rendering.** In development, React’s Strict Mode calls component functions twice, to catch impurity. It is the testing counterpart to the fact that concurrent rendering may call them any number of times.

**Wasted work.** You saw it in the figure. In the worst case (a constant stream of high-priority updates) a low-priority render could be restarted forever. The scheduler handles that with expiry times: a pending transition eventually becomes urgent.

**Suspense.** A component that needs data can suspend: it signals that it is not ready, and the framework keeps showing the previous UI while the new one renders in the background, rather than showing a loading state immediately. This is what interruptible rendering is for, beyond typing: navigation that keeps the old page until the new one is ready.

:::wild
**Scheduling in the browser.** React’s scheduler runs in a `MessageChannel` message handler, because it runs promptly and, unlike `setTimeout`, is not clamped to a minimum delay. The platform has since grown primitives for exactly this problem: `scheduler.postTask()` with priorities, and `scheduler.yield()`, a way to give the browser a turn in the middle of a long task and then continue. The ideas are the same as the ones in this chapter, offered to every kind of code and not only to renderers.
:::

Other frameworks reach the same goal with different means. Vue’s and Solid’s updates are targeted at single nodes and so are rarely long enough to need slicing; Svelte makes the same argument for compilation. The slicing machinery exists in React because its strategy, re-running components and comparing, can legitimately do a lot of work at once, and because React’s promise is that *any* update, however large, will not block input.

:::whatchanged
For *time-sliced rendering*: nothing new, but **in what order, and what can be abandoned**. A fiber walk finds the same changes a recursive one would; what is new is that it can stop between components, run higher-priority work first, discard a render that a newer update made stale, and commit only when a render is finished. The question *what changed?* is answered as before; the new question is *how much of the answer do we need now?*
:::

## What’s next

Part II has now built a complete virtual DOM strategy: describe, diff, patch, keep state in slots, memoise, and slice. Part III starts from the opposite premise. Instead of re-running code to find out what changed, record, when the code first runs, which values each part of it read. Chapter 9 builds that from scratch around a global variable and a spreadsheet.
