---
title: Who re-renders, and why
summary: Render versus commit, why a parent drags its children along, memo and its traps, stale closures, and the React Compiler that writes the memoisation for you.
number: 7
duration: 60 minutes
prerequisites: [components-and-hooks]
---

Chapter 6 ended on a cost. When a component’s state changes, the component’s function is called again, and so are the functions of every component *below* it. A counter in the root of an application re-runs the root, and the header, and the sidebar, and every row of every table, to produce a new tree that will, after the diff, differ from the old one in a single text node.

This is not a bug. It follows from the design, and it is the reason the whole vocabulary of memoisation exists. This chapter shows exactly who re-renders and why, then the three tools for stopping it.

## Two phases

Every virtual DOM update has two phases, and the names matter because they say what is allowed in each.

**Render** is calling components. It evaluates functions, builds descriptions, and diffs them against the previous ones to work out *what should change*. It does not touch the DOM. Because it has no effect on the outside world, a render can be repeated, paused, thrown away or run twice, and none of those makes any difference to the page. This is why component functions must be *pure*: the same props and state must give the same output, and rendering must not mutate anything that existed before it started.

**Commit** applies the result. It performs the DOM operations found by the diff, in one batch, and then runs what must follow the DOM being updated: refs are attached, layout effects run synchronously (before the browser can paint), and passive effects (`useEffect`) are scheduled to run soon after. :cite[react-render-commit]

The word “re-render” in a React conversation almost always means the first phase alone. A component that re-renders has had its function *called*. That does not mean the DOM changed (usually it does not), and in the lens a re-render with an unchanged output costs zero DOM operations. It costs the work of calling the function and comparing what it returned.

So the interesting question is the one the lens cannot see: how many component functions did we call, and were their results needed?

## The default: everything below

When a component’s state changes, React (and the lab’s virtual DOM) marks *that component* dirty and re-renders it. The component returns a new description, `h(Header, …)`, `h(Counter, …)`, `h(Sidebar, …)`. To diff it against the old description, the framework walks it, and at each component element it has the same decision to make: the old and new elements have the same type; can the old instance’s output be reused?

By default the answer is **no, call it again**. The framework has no way of knowing that `Header` only uses its `title`, which did not change. It has *no idea what a component reads*. All it knows is that it was handed a new element. So it calls it, compares the result, and moves on to its children, which get the same treatment.

Run it below with every switch off. Press **Count +1**: the root re-renders and so does everything under it, including the three `Item`s, which showed exactly the same thing before.

::render-counter{n="7.1"}

Now work down the switches.

**Move the state.** With *Where the search text lives* set to *In Search*, typing a letter re-renders only `Search`: its state is below the root, so only it and its children are called. *Lifted into App*, the same keystroke re-renders the whole tree. This is the cheapest fix and the one to reach for first: keep state as close as possible to where it is used.

**Bail out with `memo`.** Switch on *memo()* and press **Count +1**. `Header` and `Sidebar` are now skipped: `memo` wraps a component so that, when its parent re-renders, it compares its new props with the old ones (shallowly, with `Object.is` on each) and returns its old output if they are equal. The `Item`s are not even reached: their parent was skipped.

**Break it.** Now switch on *Pass a new array and function to Sidebar on every render*. Press **Count +1** again. `Sidebar` re-renders, and with it all three `Item`s, though nothing about them changed. A new array and a new arrow function are never `Object.is`-equal to the last ones, even if they hold the same things. This is the commonest way for `memo` to silently do nothing.

```predict
q: A parent passes `<Row item={item} onSelect={() => select(item.id)} />` to a `memo`-wrapped `Row`, and re-renders often. What does the `memo` achieve?
options:
  - text: Row is skipped whenever `item` is the same, because memo compares props.
    why: It compares *all* props. The arrow function passed as `onSelect` is a new function on every render, so it is never equal to the last one.
  - text: Nothing. The inline function makes the props different on every render.
    correct: true
    why: A new function object is created each time the parent runs, so the shallow comparison always finds a difference and Row re-renders every time, with the cost of the comparison added. The fix is `useCallback`, or passing the id and letting Row call a stable handler.
  - text: Row is skipped only when the parent re-renders for reasons unrelated to Row’s props.
    why: Memo cannot tell why the parent rendered. It compares props, nothing else.
```

## A trap in the other direction

There is a second, quieter way that a parent can *avoid* re-rendering a child, and it needs no `memo` at all.

When a component re-renders, it builds new elements for its children. But if one of its children is an element that was built *elsewhere*, and handed in unchanged, for instance through `props.children`, then it is the **identical object** as in the previous render. If the framework finds that the new element is the same object as the old one, there is nothing to compare: its output depends only on its props, and its props did not change. React bails out on exactly this, and so does the lab: the render counter’s *same element* skips are this rule.

```tsx
function Layout({ children }) {
  const [open, setOpen] = useState(false);
  return <div className={open ? 'open' : ''}>{children}</div>;  // re-renders when `open` changes…
}
// …but `children` is created by the parent, once: the same element object each time,
// so React does not call the children's components again.
```

That is why “lifting content up” through `children` stops a re-render, and why `memo` is sometimes unnecessary: the parent that owns the state is not the one that created the content.

## Stale closures

Memoisation speeds things up when it is right and breaks things when it is wrong. The kind of wrong that is hardest to see is the **:term[stale closure]{id=stale-closure}**, and chapter 6 gave you its cause: every render creates new functions, and each function *captures the values of the render that created it*.

Normally this is the right behaviour. A click handler created in render 3 uses the `count` of render 3. The trouble comes with long-lived functions, subscriptions, timers, and anything saved by an effect that does not re-run:

```debug
id: who-re-renders/stale-closure
title: Saving the wrong number
prompt: "A counter subscribes to a `save` event when it mounts. After clicking the button twice and then emitting `save`, the log says “saving 0”. Click the line that makes the handler see a stale value."
lang: ts
code: |
  import { h, useState, useEffect } from '@rx/vdom';

  export function Counter({ bus, log }) {
    const [count, setCount] = useState(0);
    useEffect(() => {
      return bus.on('save', () => log.push('saving ' + count));
    }, []);
    return h('button', { onClick: () => setCount(count + 1) }, count);
  }
answer:
  line: 7
notes:
  6: "The handler reads `count`: a value from the render that created it. That is correct behaviour, and the reason the next line matters."
  5: "Returning the unsubscribe function is right: the effect cleans up after itself."
explain: "`[]` promises that the effect depends on nothing that changes, so it runs once, on mount, and the handler it registers closes over the first render’s `count`, which is 0, forever. Listing `[count]` makes the effect run again whenever `count` changes: the old handler is unsubscribed (the cleanup) and a new one, with the current count, is subscribed. The fix is not clever; the bug is that the dependency array is a promise the programmer makes by hand, and the lint rule `react-hooks/exhaustive-deps` exists because people break it."
tests: |
  import { test, expect } from '@rx/test';
  import { createDocument } from '@rx/dom';
  import { createRoot, h } from '@rx/vdom';
  import { Counter } from './solution.ts';

  test('the saved value is the current count', () => {
    const doc = createDocument();
    const root = createRoot(doc, doc.body, { autoFlush: false });
    const handlers: (() => void)[] = [];
    const bus = { on(_e: string, fn: () => void) { handlers.push(fn); return () => handlers.splice(handlers.indexOf(fn), 1); } };
    const log: string[] = [];
    root.render(h(Counter, { bus, log }));
    const button = doc.body.firstChild as any;
    button.click();
    root.flush();
    button.click();
    root.flush();
    handlers.forEach((f) => f());
    expect(log).toEqual(['saving 2']);
  });
fix:
  7: "  }, [count]);"
hints:
  - "What does the empty dependency array tell the framework about when to run the effect again?"
```

## Writing the memo

`useMemo` and `useCallback` are the same slot list as `useState`, with a comparison. A slot holds `{ value, deps }`; on each render, the hook compares the new dependencies with the stored ones and recomputes the value only if they differ. `useCallback(fn, deps)` is `useMemo(() => fn, deps)`.

```build
id: who-re-renders/use-memo
title: Write useMemo
prompt: |
  The runner and `useState` are written for you (they are the previous chapter's). Implement `useMemo(compute, deps)`: on the first render, call `compute()` and store `{ value, deps }` in the next slot; on later renders, if `deps` is undefined, or has a different length, or any entry differs from the stored one by `Object.is`, call `compute()` again and store the result; otherwise return the stored value without calling it. Then `useCallback(fn, deps)` is one line.
starter: |
  type Instance = { hooks: unknown[]; cursor: number; render: () => void };
  let current: Instance | null = null;

  export function useState<T>(initial: T): [T, (next: T) => void] {
    const inst = current!;
    const i = inst.cursor++;
    if (!(i in inst.hooks)) inst.hooks[i] = initial;
    return [inst.hooks[i] as T, (next) => {
      inst.hooks[i] = next;
      inst.render();
    }];
  }

  export function useMemo<T>(compute: () => T, deps?: unknown[]): T {
    // TODO
    return compute();
  }

  export function useCallback<F extends (...args: any[]) => any>(fn: F, deps?: unknown[]): F {
    // TODO
    return fn;
  }

  export function mount<O>(component: () => O, onRender: (out: O) => void): { rerender(): void } {
    const inst: Instance = {
      hooks: [],
      cursor: 0,
      render() {
        const outer = current;
        current = inst;
        inst.cursor = 0;
        try {
          onRender(component());
        } finally {
          current = outer;
        }
      },
    };
    inst.render();
    return { rerender: () => inst.render() };
  }
solution: |
  type Instance = { hooks: unknown[]; cursor: number; render: () => void };
  let current: Instance | null = null;

  export function useState<T>(initial: T): [T, (next: T) => void] {
    const inst = current!;
    const i = inst.cursor++;
    if (!(i in inst.hooks)) inst.hooks[i] = initial;
    return [inst.hooks[i] as T, (next) => {
      inst.hooks[i] = next;
      inst.render();
    }];
  }

  export function useMemo<T>(compute: () => T, deps?: unknown[]): T {
    const inst = current!;
    const i = inst.cursor++;
    const slot = inst.hooks[i] as { value: T; deps: unknown[] | undefined } | undefined;
    const changed =
      !slot || deps === undefined || slot.deps === undefined || slot.deps.length !== deps.length || deps.some((d, k) => !Object.is(d, slot.deps![k]));
    if (!changed) return slot!.value;
    const value = compute();
    inst.hooks[i] = { value, deps };
    return value;
  }

  export function useCallback<F extends (...args: any[]) => any>(fn: F, deps?: unknown[]): F {
    return useMemo(() => fn, deps);
  }

  export function mount<O>(component: () => O, onRender: (out: O) => void): { rerender(): void } {
    const inst: Instance = {
      hooks: [],
      cursor: 0,
      render() {
        const outer = current;
        current = inst;
        inst.cursor = 0;
        try {
          onRender(component());
        } finally {
          current = outer;
        }
      },
    };
    inst.render();
    return { rerender: () => inst.render() };
  }
tests: |
  import { test, expect } from '@rx/test';
  import { mount, useCallback, useMemo, useState } from './solution.ts';

  test('computes once while the dependencies are unchanged', () => {
    let calls = 0;
    const m = mount(() => useMemo(() => (calls++, 42), [1, 2]), () => {});
    m.rerender();
    m.rerender();
    expect(calls).toBe(1);
  });

  test('recomputes when a dependency changes', () => {
    const seen: number[] = [];
    let set!: (n: number) => void;
    let calls = 0;
    mount(() => {
      const [n, setN] = useState(1);
      set = setN;
      return useMemo(() => (calls++, n * 10), [n]);
    }, (o) => seen.push(o));
    set(2);
    set(2);
    set(3);
    expect(seen).toEqual([10, 20, 20, 30]); // set(2) twice is two renders; the second finds the same dependency
    expect(calls).toBe(3);
  });

  test('without dependencies it recomputes on every render', () => {
    let calls = 0;
    const m = mount(() => useMemo(() => ++calls), () => {});
    m.rerender();
    m.rerender();
    expect(calls).toBe(3);
  });

  test('the cached value keeps its identity', () => {
    const seen: object[] = [];
    const m = mount(() => useMemo(() => ({}), []), (o) => seen.push(o));
    m.rerender();
    expect(seen[0]).toBe(seen[1]);
  });

  test('useCallback returns the same function while its dependencies are unchanged', () => {
    const fns: (() => void)[] = [];
    let set!: (n: number) => void;
    mount(() => {
      const [n, setN] = useState(0);
      set = setN;
      return useCallback(() => n, [n]);
    }, (f) => fns.push(f));
    set(0);
    set(1);
    expect(fns[0]).toBe(fns[1]);
    expect(fns[2]).not.toBe(fns[1]);
  });

  test('a change in the length of the dependency list counts as a change', () => {
    let calls = 0;
    let deps: unknown[] = [1];
    const m = mount(() => useMemo(() => ++calls, deps), () => {});
    deps = [1, 2];
    m.rerender();
    expect(calls).toBe(2);
  });
hints:
  - "The slot stores both the value and the dependency list it was computed with."
  - "`Object.is` is the comparison, not `===`: it treats `NaN` as equal to itself."
explain: "The same slot list, now holding values and the dependencies that produced them. A dependency array is a promise, checked by a comparison, and the cost of the comparison is the cost of memoisation: it is cheap, not free."
```

:::question
If memoisation is just a comparison, why is it not the default? Think of a component whose props are always new objects, and of what the comparison costs when it never succeeds.
:::

:::details[Answer]
Because a comparison that usually fails is pure overhead, and because correctness depends on the *programmer’s* dependency lists. A default that compared every prop of every component on every render would slow down the common case (props that differ) for the benefit of the rare one, and it would break components that depend on something other than their props (a mutable object, context, a ref). Memoisation is an optimisation that needs evidence.
:::

## The compiler does it for you

The reason `memo`, `useMemo` and `useCallback` are tedious is that they are *mechanical*. The programmer has to work out, by hand, what each value depends on, and write it down, and keep it right. A compiler can do that.

The **React Compiler** (a Babel plugin, released as version 1.0 in October 2025) reads each component and hook, works out the data flow, and rewrites the function to cache its results. It does not wrap components in `memo`; it memoises at a finer grain, inside the function, per value and per element. :cite[react-compiler-docs] Here is the real output for the counter from chapter 19’s comparison, from `babel-plugin-react-compiler` 1.0.0. The component is exactly the one you would write by hand, and the output is what the compiler turns it into:

```js
export function Counter() {
  const $ = _c(9);                                  // a cache of 9 slots, one per cached value
  const [count, setCount] = useState(0);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {   // nothing is cached yet: first render
    t0 = _jsx("h1", { children: "Counter" });         // <h1> depends on nothing: built once, kept forever
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  const t1 = count > 5 ? "big" : "";
  let t2;
  if ($[1] !== count || $[2] !== t1) {              // <p> depends on count and the class: rebuilt if either changed
    t2 = _jsxs("p", { className: t1, children: ["Count: ", count] });
    $[1] = count; $[2] = t1; $[3] = t2;
  } else {
    t2 = $[3];
  }
  let t3;
  if ($[4] !== count) {                             // the button's onClick closes over count
    t3 = _jsx("button", { onClick: () => setCount(count + 1), children: "+1" });
    $[4] = count; $[5] = t3;
  } else {
    t3 = $[5];
  }
  let t4;
  if ($[6] !== t2 || $[7] !== t3) {                 // the outer <div>, if either child element is new
    t4 = _jsxs("div", { className: "counter", children: [t0, t2, t3] });
    $[6] = t2; $[7] = t3; $[8] = t4;
  } else {
    t4 = $[8];
  }
  return t4;
}
```

Read it as the answer to this chapter’s question. The compiler gave the static `<h1>` an identity that never changes. When the diff runs, `h1` is *the same object as last time*, so the “same element” bail-out applies and there is nothing to compare. It has memoised the `<p>`’s element on `count`, and so on up the tree. The render-counter’s *Cache every element* switch does by hand what the compiler does automatically: every element is rebuilt only when its inputs changed, and the framework skips the rest.

Three things to understand about what that buys and what it does not.

**It makes the :term[render phase]{id=render-phase} cheaper, not the DOM phase.** The diff still happens; it simply finds identical objects and stops early. The saving is in component calls and in comparisons.

**It relies on the rules of React.** The compiler may only reorder, skip or cache work if your components are pure: no mutating props or state, no reading mutable globals during render. It checks, and *skips* components it cannot prove safe, which is why code written before it often compiles but is not optimised.

**It changes who is responsible.** A hand-written `useMemo` is a promise by a person. A compiler-written cache slot is a promise by a program, checked against the data flow it computed. Stale-dependency bugs of the kind in the exercise above stop being possible in the code the compiler writes, which is the strongest argument for it.

:::wild
**Other frameworks never ask this question.** Vue re-renders a component only if the reactive state *that component’s render function read* changed, or if the props it received did (an update to a parent does not drag its children along unless their props differ). Solid and Svelte 5 do not re-run components at all; they update the nodes that read the changed value (Part III and IV). Angular’s `OnPush` strategy (chapter 14) is `memo` at the template level. Each of these answers *who re-renders?* by knowing what a component read, not by calling it to find out.
:::

:::whatchanged
For *component re-rendering*: **this component, and by default everything it returns**, because a function that was handed new elements cannot be known to ignore them. `memo` narrows that to the subtrees whose props differ (shallowly). The :term[React Compiler]{id=react-compiler} narrows it further, per element, and takes the dependency bookkeeping off the programmer. What the strategy never does is know *what a component read*, so it re-renders to find out.
:::

## What’s next

Rendering is cheap when the tree is small and expensive when it is not, and in a synchronous renderer a long render freezes the page. Chapter 8 is about how React restructured its core so that rendering can be paused, resumed and interrupted, and about the data structure, the *fiber*, that makes that possible.
