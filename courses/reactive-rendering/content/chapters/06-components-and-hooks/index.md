---
title: Components and hooks
summary: Components that run again on every change, and state that survives it. useState as a list of slots, effects with dependencies, and why the rules of hooks are not arbitrary.
number: 6
duration: 55 minutes
prerequisites: [trees-as-values, lists-and-keys]
---

So far a description of the page has been a tree of elements built by a function. A *component* is the natural next step: a function that takes some inputs, called **props**, and returns a description. Components let you name a piece of UI, reuse it, and nest it.

```ts
const Note = ({ text, done }: { text: string; done: boolean }) =>
  h('li', { class: done ? 'done' : '' }, text);

const Notes = ({ notes }) => h('ul', null, notes.map((n) => h(Note, { key: n.id, ...n })));
```

The element `h(Note, …)` has a function where an element has a tag name. The diff treats it as another type: same function, same component, so update; a different function, a different component, so throw the old one away. To render a component, the framework calls it and gets back more elements, and repeats until there is nothing but tags and text.

That works until a component needs to *remember* something.

## The problem of the function that forgets

Take the simplest stateful component: a counter.

```ts
function Counter() {
  let count = 0;
  return h('button', { onClick: () => { count++; /* and now what? */ } }, `Clicked ${count} times`);
}
```

There are two things wrong, and they are the same thing. Clicking cannot update the page, because nothing tells the framework to run the function again. And if the framework *did* run it again, `count` would be zero again, because a local variable lives only as long as one call, and a component is called afresh on every render.

So the framework has to do two jobs for the component: **keep the state somewhere outside the function** so that it survives calls, and **give the function a way to say “my state changed, call me again.”** Both are what `useState` does.

```ts
function Counter() {
  const [count, setCount] = useState(0);
  return h('button', { onClick: () => setCount(count + 1) }, `Clicked ${count} times`);
}
```

On the first call, `useState(0)` returns `[0, setCount]`. A click calls `setCount(1)`, which stores the 1 *outside* the function and schedules another call. On the second call, `useState(0)` ignores its argument and returns `[1, setCount]`. Same line of code, different result, because something outside remembered.

## Where does the framework put it?

Here is the interesting design question. `useState` is a plain function call. It does not say *which component* it belongs to, and it does not give its state a name. The two calls in

```ts
const [count, setCount] = useState(0);
const [name, setName] = useState('Ann');
```

differ only by *position in the source*. So how does the framework tell them apart on the next render?

By position in the **call order**. This is the entire trick. For each component instance the framework keeps a list of **slots**. While the component runs, a cursor starts at zero. The first `useState` call takes slot 0, the second takes slot 1, and each call advances the cursor. The first time around the slots are empty, so each call creates its slot with the initial value. Every later render, the same calls in the same order find the same slots.

```ts
let current: { slots: unknown[]; cursor: number; rerender(): void } | null = null;

function useState<T>(initial: T) {
  const c = current!;
  const i = c.cursor++;
  if (!(i in c.slots)) c.slots[i] = initial;            // first render: create the slot
  const set = (next: T) => { c.slots[i] = next; c.rerender(); };
  return [c.slots[i] as T, set] as const;
}
```

That is nearly all there is. Before the framework calls a component it sets `current` to that component’s instance and the cursor to 0.

Watch it happen. The component below has three hooks. The table shows its slots after every render; the log shows what ran when.

::hook-slots{n="6.1"}

Press **+1** and watch three things. The `count` slot changes from 0 to 1 and the component renders again. The `useRef` slot, a box that survives renders and does not cause one, is mutated on every render and never triggers one. And the `useEffect` slot records its *dependencies*: when `count` changed, the effect’s dependency list differs from last time, so the old effect is cleaned up and the new one runs.

```predict
q: A component calls `useState` three times. After a re-render, which slot does the second call get?
options:
  - text: The slot that was created for it by name, because each hook call is identified by its variable name.
    why: The framework never sees variable names. By the time the function runs, `[name, setName]` is just two values returned by a call.
  - text: Slot 1, because it is the second call in this render, as it was the second call in the last one.
    correct: true
    why: The framework identifies a hook only by how many hooks have been called before it in this render. That is why hooks must be called in the same order every time.
  - text: Whichever slot is free.
    why: Slots are never free. Every slot that exists is read in order, one per call.
```

## The rules of hooks are a statement about this list

The documented rules for hooks look like arbitrary restrictions: *only call hooks at the top level; do not call them inside loops, conditions or nested functions; only call them from components.* Once you see the slot list, they are the same sentence.

If a hook is called inside an `if`, then on some renders it takes a slot and on others it does not. Every hook *after* it shifts position, and they read each other’s state. In the figure, tick **Call a hook inside a condition** and press **+1**: slot 2 held a ref last time and is now asked for a state, and the framework refuses to go on. Real React reports `Rendered more hooks than during the previous render` or, when an early `return` skips hooks, `Rendered fewer hooks than expected. This may be caused by an accidental early return statement.`, and its lint rule `react-hooks/rules-of-hooks` flags the code before it runs.

```debug
id: components-and-hooks/early-return
title: Signed in, sometimes
prompt: "This component works while `user` is set, and crashes with “Rendered more hooks than during the previous render” the first time the user signs in. Click the line that breaks the rules of hooks."
lang: ts
code: |
  import { h, useState } from '@rx/vdom';

  export function Greeting({ user }) {
    if (!user) {
      return h('p', null, 'Please sign in');
    }
    const [count, setCount] = useState(0);
    return h('button', { onClick: () => setCount(count + 1) }, 'Hello ', user, ' · ', count);
  }
answer:
  lines: [4, 5]
notes:
  7: "This hook is called conditionally, but not by an `if` of its own. The line above is the one to blame."
  8: "Fine: the render path that reaches here has called every hook."
explain: "While `user` is null the component returns before reaching `useState`, so its slot list is empty. When `user` becomes set, the component asks for slot 0 where it had none: more hooks than last time. A hook must be reached on *every* render, so every hook goes above any early return."
tests: |
  import { test, expect } from '@rx/test';
  import { createDocument } from '@rx/dom';
  import { createRoot, h } from '@rx/vdom';
  import { Greeting } from './solution.ts';

  test('signing in after signing out does not throw', () => {
    const doc = createDocument();
    const root = createRoot(doc, doc.body, { autoFlush: false });
    root.render(h(Greeting, { user: null }));
    expect(() => root.render(h(Greeting, { user: 'Ann' }))).not.toThrow();
    expect(doc.body.textContent).toBe('Hello Ann · 0');
  });
fix:
  4: "  const [count, setCount] = useState(0);\n  if (!user) {"
  7: ""
hints:
  - "Which hooks does a render with `user = null` call? Which does a render with a user call?"
```

Two other consequences follow from the list.

**State is tied to the position in the tree, not to the component’s name.** The framework remembers a component instance’s slots by matching the new element to the old one by type and key (chapters 4 and 5). Render the same component type in the same place with a different `key` and you get an instance with empty slots: the state is gone. That is the “reset with a key” trick from chapter 5, and it is why a component *defined inside another component’s body* loses its state on every render: it is a new function each time, so a new type.

**Each render captures its own values.** The click handler in `Counter` closes over the `count` of the render that created it. That is usually what you want, and it is also the source of the most common hooks bug, which chapter 7 is about.

## Writing the slots

Here is the mechanism as an exercise. You are given a tiny component runner, `mount`, that sets up the instance and the cursor before each call; write `useState` against it. The tests drive it with counters, two independent states, lazy initialisers and re-renders.

```build
id: components-and-hooks/use-state
title: Write useState
prompt: |
  `mount(component, onRender)` calls `component()` and passes its output to `onRender`, and returns `{ rerender() }`. Before each call it sets the module variable `current` to the component's instance (`{ hooks, cursor, render }`) and resets `cursor` to 0. Implement `useState(initial)`: use `current.hooks[current.cursor++]` as the slot; create it on the first render (if `initial` is a function, call it once to get the value), return `[value, setValue]`, and make `setValue(next)` store the new value (`next` may be a function of the previous value) and call `inst.render()` — but only if the value actually changed (`Object.is`). The setter must keep working after later renders, and must update *its own* slot even if it is called when `current` is something else.
starter: |
  type Instance = { hooks: unknown[]; cursor: number; render: () => void };
  let current: Instance | null = null;

  export function useState<T>(initial: T | (() => T)): [T, (next: T | ((prev: T) => T)) => void] {
    // TODO
    return [initial as T, () => {}];
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

  export function useState<T>(initial: T | (() => T)): [T, (next: T | ((prev: T) => T)) => void] {
    const inst = current;
    if (!inst) throw new Error('useState can only be called while a component is rendering');
    const i = inst.cursor++;
    if (!(i in inst.hooks)) inst.hooks[i] = typeof initial === 'function' ? (initial as () => T)() : initial;
    const set = (next: T | ((prev: T) => T)) => {
      const prev = inst.hooks[i] as T;
      const value = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
      if (Object.is(value, prev)) return;
      inst.hooks[i] = value;
      inst.render();
    };
    return [inst.hooks[i] as T, set];
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
  import { mount, useState } from './solution.ts';

  test('the initial value is used on the first render', () => {
    const out: string[] = [];
    mount(() => { const [n] = useState(5); return `n=${n}`; }, (o) => out.push(o));
    expect(out).toEqual(['n=5']);
  });

  test('state survives a re-render and the setter re-renders with the new value', () => {
    const out: string[] = [];
    let set!: (n: number) => void;
    mount(() => { const [n, setN] = useState(0); set = setN; return `n=${n}`; }, (o) => out.push(o));
    set(1);
    set(2);
    expect(out).toEqual(['n=0', 'n=1', 'n=2']);
  });

  test('two hooks keep separate slots, by call order', () => {
    const out: string[] = [];
    let setA!: (v: string) => void;
    let setB!: (v: number) => void;
    mount(() => {
      const [a, sa] = useState('x');
      const [b, sb] = useState(10);
      setA = sa; setB = sb;
      return `${a}${b}`;
    }, (o) => out.push(o));
    setB(11);
    setA('y');
    expect(out).toEqual(['x10', 'x11', 'y11']);
  });

  test('a function initialiser is called once', () => {
    let calls = 0;
    const m = mount(() => { const [n] = useState(() => (calls++, 7)); return n; }, () => {});
    m.rerender();
    m.rerender();
    expect(calls).toBe(1);
  });

  test('setting the same value does not render again', () => {
    let renders = 0;
    let set!: (n: number) => void;
    mount(() => { renders++; const [n, s] = useState(1); set = s; return n; }, () => {});
    set(1);
    expect(renders).toBe(1);
  });

  test('functional updates see the previous value', () => {
    const out: number[] = [];
    let set!: (f: (n: number) => number) => void;
    mount(() => { const [n, s] = useState(0); set = s; return n; }, (o) => out.push(o));
    set((n) => n + 5);
    set((n) => n * 2);
    expect(out).toEqual([0, 5, 10]);
  });

  test('a setter called later still updates its own slot', () => {
    const out: string[] = [];
    let setFirst!: (v: string) => void;
    mount(() => {
      const [a, s1] = useState('a');
      const [b] = useState('b');
      setFirst = s1;
      return a + b;
    }, (o) => out.push(o));
    setFirst('z');
    expect(out).toEqual(['ab', 'zb']);
  });
hints:
  - "Take the slot index with `const i = inst.cursor++` *before* creating the setter, so the setter remembers its own index and instance."
  - "`i in inst.hooks` tells you whether the slot exists yet."
explain: "Twelve lines. The real implementations keep the slots in a linked list on a *fiber* rather than an array and distinguish a mount from an update, but the structure is the same: a cursor, advancing through a list that belongs to the component instance."
```

## Effects: after the render, when something changed

State is half of what hooks provide. The other half is **effects**, for code that must run *because* something rendered, not as part of computing what to render: starting a subscription, setting the document’s title, measuring a node.

```ts
useEffect(() => {
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);          // the cleanup
}, [intervalMs]);                           // the dependencies
```

An effect has three parts, and each is worth stating exactly.

1. The function runs **after** the render has been committed to the DOM, not during it. Rendering must stay free of side effects, so that it can be thrown away or repeated (chapter 8).
2. The **dependency array** says when it must run again: React compares each entry with its value from the previous render using `Object.is`, and runs the effect again if any differ. An empty array means “only once”; no array means “after every render”.
3. The **cleanup** the function returns runs *before* the effect runs again with new dependencies, and when the component is removed.

In the figure’s log, the order after each +1 is: render, then `cleanup (count was 0)`, then `effect runs (count = 1)`. Cleanups of the effects that are about to re-run come first, then the new effects, which is also the order React uses.

The dependency array is the same slot list again: the effect’s slot stores the last dependencies it saw, and comparing them is the whole “should I run?” logic. And like state, the effect’s function is a *fresh closure each render*, capturing that render’s values. The dependency array is the programmer’s promise that the closure only needs to be replaced when those values change, and a wrong promise is a bug that the next chapter dissects.

:::wild
**Strict Mode.** In development, React’s `<StrictMode>` mounts every component, runs its effects, unmounts it, and mounts it again, so that an effect with a missing cleanup shows its leak immediately. If an effect works only once, the double-run is the symptom. In production it runs once.
:::

## Why hooks, and what else answers the same problem

Before hooks (React 16.8, February 2019 :cite[react-hooks-intro]) stateful components were *classes* with `this.state`, `setState` and lifecycle methods (`componentDidMount`, `componentDidUpdate`, `componentWillUnmount`). Their problems were that logic for a single concern was split across lifecycle methods (set up in one, tear down in another), that sharing stateful logic needed higher-order components or render props, and that `this` caused its own bugs. Hooks put related code together and let it be extracted into functions called `useSomething`. The price was the slot list, and the rules it brings.

It is worth noticing that the slot list exists *because the component function runs again on every render*. Components that run **once** do not need it. Vue’s `setup()` and Solid’s components run once, at creation; their state is ordinary closure variables holding signals, and there is no cursor and no rule about call order, because nothing is called twice. That is the central difference between the diffing strategy and the tracking strategy, and the subject of Part III.

:::history{year=2018 title="Hooks"}
Sophie Alpert and Dan Abramov introduced hooks at React Conf in October 2018, and they shipped in React 16.8 in February 2019. The proposal argued from three problems with classes (reusing stateful logic, components that become complicated and hard to read, and confusing classes), and answered with the slot list. Dan Abramov’s essay *A complete guide to useEffect* is the standard explanation of why effects capture the values of the render that created them. :cite[react-hooks-intro] :cite[abramov-useeffect]
:::

:::whatchanged
For *component state in a virtual DOM*: **this component**, when its setter is called. `setState` marks one component instance dirty; the next flush calls its function again, diffs the new output against the old, and, since nothing else knows what changed *inside* the function, calls its children again too. The slot list is how a function that is called afresh each time keeps a memory.
:::

## What’s next

Calling the component again also calls everything below it. Chapter 7 is about who re-renders when something changes, why the answer is “more than you think”, and the tools for cutting it down, from `memo`, which has traps, to a compiler that does it for you.
