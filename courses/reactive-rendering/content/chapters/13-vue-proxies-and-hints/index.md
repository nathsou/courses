---
title: Vue, proxies and hints
summary: Vue makes ordinary objects reactive with a Proxy and a table of who read what, and then uses a virtual DOM whose diff is told by the compiler where to look.
number: 13
duration: 60 minutes
prerequisites: [templates-and-solid]
---

Solid’s signals are explicit: you call `count()` to read and `setCount(…)` to write, and that visible ceremony is how the engine knows what is going on. Vue made a different bet. You write ordinary JavaScript, objects, reads and assignments, and the library works out the rest:

```js
const state = reactive({ count: 0, user: { name: 'Ada' } });

watchEffect(() => console.log(state.user.name));   // logs "Ada"
state.user.name = 'Grace';                         // logs "Grace"
```

There are no getters or setters in your code, and no marker on `state` that says it is special. This chapter is about how that works, what it costs, and what Vue does with it after that: a virtual DOM that is not nearly as expensive as the one in chapter 4, because the compiler has told it where to look.

## How a Proxy sees you

A `Proxy` wraps an object and lets you intercept the operations done to it: reads (`get`), writes (`set`), `in` checks (`has`), `delete`, and iteration (`ownKeys`). That is what makes the trick possible. When an effect reads `state.user.name`, the proxy hears about it:

- `get(state, 'user')` is called, and the proxy records *“the running effect read property `user` of this object”*, then returns the nested object, itself wrapped in a proxy.
- `get(user, 'name')` is called, recording *“the running effect read `name` of that object”*.

When someone later writes `state.user.name = 'Grace'`, the proxy’s `set` hears it, looks up *that object, that property*, and re-runs every effect recorded there.

The bookkeeping is a single table, which Vue’s source calls `targetMap`: **object → property → set of effects**. Two functions maintain it, and they are the two verbs of this whole chapter:

```ts
function track(target, key) {            // called from every `get`
  if (!activeEffect) return;
  targetMap.get(target).get(key).add(activeEffect);
}

function trigger(target, key) {          // called from every `set`
  for (const effect of targetMap.get(target)?.get(key) ?? []) effect.run();
}
```

It is the `current` variable of chapter 9 again: the table is the per-signal subscriber set, with one set per *property* instead of per signal. Try it. The four effects below read an object in different ways. Do the actions in order and read both the effects that ran and the table.

::dep-table{n="13.1"}

Things to check:

- **Rename** re-runs `heading` and `summary` (they read `name`), and not the others.
- **Count + 1** re-runs only `badge`, the one effect that reads `count`. Press it until `count` passes five: the table gains a row, `state.user.age` ← `badge`, because on that run the effect took the branch that reads the age for the first time. From then on **Birthday** re-runs `badge` as well as `summary`. The dependencies follow the run, as in chapter 9.
- **Add a property** re-runs only `fields`: it is the one that asked for `Object.keys(state.user)`, which the proxy hears as an `ownKeys` call and records against a special key meaning “the set of keys”.
- **Replace the object** re-runs every effect, because they all read `state.user`: the *property* `user` of the root changed, even though no one touched `name`.
- **Write the same value** does nothing: `set` compares the old and new values first.

:::key
**Vue tracks property reads on objects.** The unit of subscription is “this object’s property”, found at run time by a Proxy, and nothing in your code has to say so. The price is that the proxy is *invisible but not transparent*: it is a different object from the one you wrapped.
:::

## What the invisible wrapper costs

Everything that is surprising about Vue’s reactivity follows from the one fact that `reactive(obj)` returns a *new object*, a Proxy, and only reads and writes *through* it are noticed.

**Identity.** `reactive(raw) !== raw`. Putting a raw object into a `Set` and checking for the proxy, or comparing the two with `===`, gives the wrong answer. Vue offers `toRaw` and caches the proxy for each object so that `reactive(raw) === reactive(raw)`.

**Destructuring cuts the wire.** `const { count } = state` reads `state.count` once, *outside any effect*, and stores a number in a local variable. The local variable is not a proxy. Assigning to it does nothing and reading it tracks nothing. It is the same trap as Solid’s destructured props, from a different cause.

```predict
q: "What does this log?\n\n```js\nconst state = reactive({ count: 0 });\nconst { count } = state;\nwatchEffect(() => console.log(count));\nstate.count++;\n```"
options:
  - text: "`0`, then `1`."
    why: "That would need the effect to read `state.count` through the proxy. It reads the local variable `count`, a plain number copied out of the proxy before the effect existed."
  - text: "`0` only."
    correct: true
    why: "The destructuring is a read of `state.count`, outside any effect, so it tracks nothing. The effect reads a local `const` equal to `0`; it has no dependencies at all and never re-runs. Vue’s answer is `toRef(state, 'count')` and `toRefs(state)`, which turn properties into refs that stay connected to the object."
  - text: "`1` only."
    why: "The effect runs once, immediately, when it is created, and sees the value as it was then: `0`."
```

**A hole in the net.** A Proxy can only intercept operations on *its target*. Vue 2 used `Object.defineProperty` instead, and had a hole: it could not see a property being **added** or **deleted**, since there was no getter on a property that did not yet exist, so Vue 2 needed `Vue.set(obj, 'newKey', value)`. Vue 3’s Proxy hears `set` of a new key and `deleteProperty`, and the `ownKeys` of iteration, so the hole is closed. In exchange Vue 3 requires a browser with Proxy, which cannot be polyfilled, and that is why Vue 2 lived on for a while for IE11.

**Primitives need a box.** A proxy wraps objects. A number cannot be wrapped, so a bare `count` cannot be reactive; Vue gives you `ref(0)`, an object with one property called `.value`, whose getter tracks and whose setter triggers. That is the `.value` that everyone writes in Vue scripts, and it is the signal of this course with the name changed: `ref` is `signal`, `computed` is `computed`, `watchEffect` is `effect`. (In templates, and in the `<script setup>` compiler, `.value` is added for you.) Vue 3.5 also reworked how the dependency tables are stored: links between a source and a subscriber are version-checked, and chapter 10’s dirty-and-check design is how its computed values avoid needless recomputation.

## An effect per component

So far this is the mechanism of chapters 9 and 10 with a table instead of a signal. What does Vue do with it?

This is the part that is *not* Solid. Vue’s default does not compile each hole into an effect. It wraps the whole **component** in one:

```ts
// In effect, for each mounted component:
const update = () => {
  const vnode = component.render();              // read the reactive state; this tracks it
  patch(component.subTree, vnode);               // the virtual DOM diff of chapter 4
  component.subTree = vnode;
};
effect(update);                                   // re-run when anything `render` read is written
```

When the component renders, every reactive property it reads becomes a dependency of *that component’s update effect*. When one of them is written, the effect is queued (and, as in chapter 11, queued once, however many writes happen before the next microtask), and re-running it re-renders **that component only**. A parent’s re-render happens only if the parent read something that changed, and a child is re-rendered by a parent’s update only if the props the parent passes to it changed: Vue compares the props shallowly itself, so `memo` and `useMemo` are not needed.

Compare that with React, where `setState` marks a component and the re-render cascades to every child unless you opt out (chapter 7). The two answers to “who re-renders?” are the same question answered in opposite directions:

| | React | Vue |
|---|---|---|
| What starts an update | `setState` in a component | a write to a reactive property that the component’s render read |
| Which components re-render | the component, then *all* its children, unless they are memoized | exactly the components that read the changed property, plus children whose props changed |
| What stops the cascade | you (`memo`, `useMemo`, the Compiler) | Vue, by dependency tracking and a props comparison |

So Vue pays for fine-grained tracking *at component granularity*, and then uses a virtual DOM inside each component. That leaves the diff of chapter 4 to do, and the compiler to make cheap.

## The compiler tells the diff where to look

A virtual DOM’s worst case is a big template, mostly static, with a small dynamic part: a page with a hundred paragraphs and a counter. The diff would walk all hundred paragraphs and compare them against themselves to find, again, that nothing changed. But the Vue compiler *reads the template*: it can see that the paragraphs are plain text. It does three things with that knowledge. Here is the real output of the Vue compiler (3.6.0-rc.11), for this chapter’s counter:

```js
const _hoisted_1 = { class: "counter" }

export function render(_ctx, _cache, $props, $setup, $data, $options) {
  return (_openBlock(), _createElementBlock("div", _hoisted_1, [
    _cache[1] || (_cache[1] = _createElementVNode("h1", null, "Counter", -1 /* CACHED */)),
    _createElementVNode("p", {
      class: _normalizeClass($setup.count > 5 ? 'big' : '')
    }, "Count: " + _toDisplayString($setup.count), 3 /* TEXT, CLASS */),
    _createElementVNode("button", {
      onClick: _cache[0] || (_cache[0] = $event => ($setup.count++))
    }, "+1")
  ]))
}
```

1. **Hoisting.** `const _hoisted_1 = { class: "counter" }` is created once at module level, not on every render. The static `<h1>` is created on the first render and cached in `_cache[1]` (the flag `-1 /* CACHED */`). On a re-render the render function returns the *same vnode object*, and the diff skips it with one identity check.
2. **Patch flags.** The `<p>` carries `3 /* TEXT, CLASS */`: a bit set that says *only the text and the class can change*. The diff compares those two fields and does not look at the other properties, or at the children.
3. **The block tree.** `_openBlock()` and `_createElementBlock` start a *block*: while it is open, every vnode created with a patch flag is added to the block’s flat `dynamicChildren` list. On update, the diff walks that list, here just the `<p>`, in order, and never visits the static nodes in between. The hundred paragraphs are not compared against anything.

Put a number on it. The card below has a dynamic title, a dynamic counter, and any number of static paragraphs. The same re-render is diffed with and without the three hints:

::hints-lab{n="13.2"}

Slide the number of static paragraphs up. The plain diff’s work grows with the page, and the hinted diff’s does not: it looks at three vnodes whether the page has ten paragraphs or four hundred. In both cases the DOM gets one text write. The hints are what lets Vue’s virtual DOM stay close to the cost of a compiled template, as long as the template is *static enough*, and the template language makes that likely, since a template can only say what the compiler can analyse. A hand-written render function, which can do anything, gets none of it unless it opts in.

:::key
**A template restricts what you can say, so the compiler can promise more.** JSX is JavaScript and can build vnodes from anything; a Vue template cannot. The restriction is the price of the compiler’s hints, and for chapters to come it is a recurring trade: *the less a framework lets you do, the more it can do ahead of time.*
:::

## Build it

Time to write the core of the reactivity. This exercise implements `reactive`, `effect`, and the two functions of the table. It leaves out computed, refs and scheduling, which you have built in chapters 9–11, and concentrates on what is new: the proxy and the per-property table.

```build
id: vue-proxies-and-hints/reactive
title: Write reactive(), track() and trigger()
prompt: |
  Implement `reactive(obj)`, `effect(fn)`, `track(target, key)` and `trigger(target, key)`. `reactive` returns a Proxy whose `get` tracks `(target, key)` and returns nested objects wrapped (lazily, and the same proxy for the same object each time; `reactive(proxy)` returns the proxy), and whose `set` triggers when the value actually changed. A key that is *added* or *deleted* must also trigger effects that iterated the object with `Object.keys` (hint: track a special `ITERATE` key in `ownKeys`). `effect(fn)` runs `fn` at once and again whenever something it read is written; before each run it forgets its old dependencies, so branches that are no longer taken fall away.
starter: |
  type Effect = { run(): void; deps: Set<Effect>[] };

  const targetMap = new WeakMap<object, Map<PropertyKey, Set<Effect>>>();
  const ITERATE = Symbol('iterate');
  let activeEffect: Effect | null = null;

  export function track(target: object, key: PropertyKey): void {
    // TODO: record that the running effect read `key` of `target`
  }

  export function trigger(target: object, key: PropertyKey): void {
    // TODO: re-run the effects that read `key` of `target`
  }

  export function effect(fn: () => void): void {
    // TODO: run fn with itself as the active effect; re-run when a dependency is written
    fn();
  }

  export function reactive<T extends object>(target: T): T {
    // TODO: return a Proxy that calls track() in get and trigger() in set
    return target;
  }
solution: |
  type Effect = { run(): void; deps: Set<Effect>[] };

  const targetMap = new WeakMap<object, Map<PropertyKey, Set<Effect>>>();
  const proxies = new WeakMap<object, object>();
  const isProxy = new WeakSet<object>();
  const ITERATE = Symbol('iterate');
  let activeEffect: Effect | null = null;

  export function track(target: object, key: PropertyKey): void {
    if (!activeEffect) return;
    let depsMap = targetMap.get(target);
    if (!depsMap) targetMap.set(target, (depsMap = new Map()));
    let dep = depsMap.get(key);
    if (!dep) depsMap.set(key, (dep = new Set()));
    dep.add(activeEffect);
    activeEffect.deps.push(dep);
  }

  export function trigger(target: object, key: PropertyKey): void {
    const dep = targetMap.get(target)?.get(key);
    if (!dep) return;
    // Copy: running an effect changes the set (it unsubscribes and resubscribes).
    for (const e of [...dep]) if (e !== activeEffect) e.run();
  }

  export function effect(fn: () => void): void {
    const e: Effect = {
      deps: [],
      run() {
        for (const dep of e.deps) dep.delete(e); // forget the old dependencies
        e.deps.length = 0;
        const outer = activeEffect;
        activeEffect = e;
        try {
          fn();
        } finally {
          activeEffect = outer;
        }
      },
    };
    e.run();
  }

  export function reactive<T extends object>(target: T): T {
    if (isProxy.has(target)) return target; // already reactive
    const existing = proxies.get(target);
    if (existing) return existing as T;
    const proxy = new Proxy(target, {
      get(t, key, receiver) {
        track(t, key);
        const value = Reflect.get(t, key, receiver);
        return typeof value === 'object' && value !== null ? reactive(value) : value;
      },
      set(t, key, value, receiver) {
        const had = Object.prototype.hasOwnProperty.call(t, key);
        const old = (t as any)[key];
        const ok = Reflect.set(t, key, value, receiver);
        if (!had) trigger(t, ITERATE);
        if (!had || !Object.is(old, value)) trigger(t, key);
        return ok;
      },
      deleteProperty(t, key) {
        const had = Object.prototype.hasOwnProperty.call(t, key);
        const ok = Reflect.deleteProperty(t, key);
        if (had && ok) {
          trigger(t, ITERATE);
          trigger(t, key);
        }
        return ok;
      },
      has(t, key) {
        track(t, key);
        return Reflect.has(t, key);
      },
      ownKeys(t) {
        track(t, ITERATE);
        return Reflect.ownKeys(t);
      },
    });
    proxies.set(target, proxy);
    isProxy.add(proxy);
    return proxy as T;
  }
tests: |
  import { test, expect } from '@rx/test';
  import { reactive, effect } from './solution.ts';

  test('an effect runs now and when a property it read is written', () => {
    const s = reactive({ n: 1 });
    const seen: number[] = [];
    effect(() => void seen.push(s.n));
    s.n = 2;
    s.n = 3;
    expect(seen).toEqual([1, 2, 3]);
  });

  test('only the property that was read triggers it', () => {
    const s = reactive({ a: 1, b: 1 });
    let runs = 0;
    effect(() => void (s.a, runs++));
    s.b = 2;
    expect(runs).toBe(1);
  });

  test('writing an equal value does nothing', () => {
    const s = reactive({ n: 1 });
    let runs = 0;
    effect(() => void (s.n, runs++));
    s.n = 1;
    expect(runs).toBe(1);
  });

  test('nested objects are reactive, and the same proxy comes back each time', () => {
    const s = reactive({ user: { name: 'Ada' } });
    const seen: string[] = [];
    effect(() => void seen.push(s.user.name));
    s.user.name = 'Grace';
    expect(seen).toEqual(['Ada', 'Grace']);
    expect(s.user).toBe(s.user);
    expect(reactive(s)).toBe(s);
  });

  test('replacing a nested object triggers readers of the parent property', () => {
    const s = reactive({ user: { name: 'Ada' } });
    const seen: string[] = [];
    effect(() => void seen.push(s.user.name));
    s.user = { name: 'Edsger' };
    expect(seen).toEqual(['Ada', 'Edsger']);
  });

  test('branches that are no longer taken are forgotten', () => {
    const s = reactive({ flag: true, a: 'a', b: 'b' });
    const seen: string[] = [];
    effect(() => void seen.push(s.flag ? s.a : s.b));
    s.b = 'b2'; // not read yet
    s.flag = false;
    s.a = 'a2'; // no longer read
    s.b = 'b3';
    expect(seen).toEqual(['a', 'b2', 'b3']);
  });

  test('adding and deleting a key triggers an effect that iterated the keys', () => {
    const s = reactive<{ [k: string]: number }>({ a: 1 });
    const seen: string[] = [];
    effect(() => void seen.push(Object.keys(s).join(',')));
    s.b = 2;
    delete s.a;
    expect(seen).toEqual(['a', 'a,b', 'b']);
  });

  test('changing an existing key does not trigger an effect that only listed the keys', () => {
    const s = reactive<{ [k: string]: number }>({ a: 1 });
    let runs = 0;
    effect(() => void (Object.keys(s), runs++));
    s.a = 99;
    expect(runs).toBe(1);
  });

  test('an effect that writes what it reads does not run itself forever', () => {
    const s = reactive({ n: 0 });
    let runs = 0;
    effect(() => {
      runs++;
      s.n = s.n + 1;
    });
    expect(runs).toBe(1);
    expect(s.n).toBe(1);
  });
hints:
  - "`targetMap` is a `WeakMap` from the raw target object to a `Map` from key to a `Set` of effects. Create the inner map and set lazily."
  - "Each effect remembers the sets it was added to (`deps`), so before each run it can remove itself from all of them."
  - "In `set`, a key that did not exist before also changes the object's *keys*: trigger `ITERATE` as well."
explain: "About fifty lines make the heart of Vue 3's reactivity: a `WeakMap` so tables disappear with their objects, a `Map` per object, a `Set` per property, and `activeEffect` to know who is reading. Real Vue adds many cases this version skips: arrays (`length` and index keys are tracked separately), `Map` and `Set` collections (they need their own handlers), `readonly` and `shallow` variants, computed values with the dirty-and-check protocol of chapter 10, and a scheduler so an effect triggered five times in one tick runs once."
```

## Vapor: the same compiler without the diff

Vue has a third layer, now in release candidates for 3.6: **Vapor mode**. It is Vue’s answer to the question of whether you can skip the virtual DOM and keep the templates. Here is what the compiler writes for the same counter in Vapor mode:

```js
const t0 = _template("<div class=counter><h1>Counter</h1><p> </p><button>+1", 1)

export function render(_ctx, $props, $emit, $attrs, $slots) {
  const n2 = t0()
  const n0 = _next(_child(n2))
  const n1 = _next(n0)
  const x0 = _txt(n0)
  _on(n1, "click", () => (_ctx.count++))
  _renderEffect(() => {
    const _count = _ctx.count
    _setClassName(n0, ((_count > 5) ? 1 : 0), "big")
    _setText(x0, "Count: " + _toDisplayString(_count))
  })
  return n2
}
```

Compare it with chapter 12’s Solid output. The template becomes a cloned string, the walk is `_child` and `_next`, and `_renderEffect` is an effect on the *same reactivity system* that this chapter described: it reads `_ctx.count`, which subscribes it to that property, and re-runs when it is written. No vnode is made, and no diff runs. Vue’s reactivity (Proxy, refs, computed) is the same as in the default mode; only the part that turns a template into DOM operations is different.

Vue’s pitch is that you do not have to choose a rendering model for the whole app: the default is the virtual DOM with hints; Vapor mode can be used per component (`<script setup vapor>`) or for a whole app, and a Vapor component can be used inside a virtual DOM one and the other way round, through an interop layer. As of this writing, Vapor mode is in 3.6’s release candidates, and the reactivity core underneath it has been rewritten as a port of `alien-signals`, a very small signals engine designed around the same push-pull-with-flags scheme as chapter 10.

:::wild{framework="Vue" version="3.5 and 3.6 rc"}
Vue 3.5 (September 2024) reworked reactivity so that dependencies are stored as a doubly linked list of *links* between sources and subscribers, cutting memory and the cost of re-tracking. The 3.6 release candidates build on that with `alien-signals` and add Vapor mode as an opt-in. The reactivity package, `@vue/reactivity`, is independent of Vue’s renderer, and works with any renderer or none.
:::

:::programmer
**Why `ref` has `.value`.** `ref(0)` has to be an object so that a getter and a setter can exist, and `.value` is the visible price. Vue’s `<script setup>` compiler adds `.value` to the reads and writes of refs in templates, and the experimental Reactivity Transform that would have added it everywhere was removed in 3.4 after a long debate. Svelte 5’s runes (chapter 18) go all the way: the *compiler* rewrites `count++` on a `$state` variable to a signal write, which is why Svelte code has no `.value` at all.
:::

:::history{year=2014 title="From defineProperty to Proxy"}
Vue 1 and 2 (2014 and 2016) made objects reactive by walking them once and replacing each property with a getter/setter pair (`Object.defineProperty`), the technique that Knockout’s observables and Backbone’s `set` had approached from different sides. :cite[vue-reactivity-docs] It could not see properties added later, nor array index writes, which is why Vue 2 had `Vue.set` and the odd array-method wrappers. Vue 3 (2020) switched to `Proxy`, ES2015’s object-level interception, and dropped Internet Explorer 11 with it. MobX followed the same path from `defineProperty` to `Proxy` in version 5.
:::

:::whatchanged
For *track* in Vue: **the properties the component’s render function read**, found by a Proxy and stored in a per-object table. The compiler then narrows the *diff*, with hoisting, patch flags and the block tree, so that the virtual DOM compares only the nodes that can have changed. In Vapor mode the diff is gone and each hole is an effect again.
:::

## What’s next

Angular made the *opposite* choice for almost its whole life: no tracking at all, but a library (zone.js) that notices every browser event and timer and then checks the whole tree. Chapter 14 builds that, then looks at how Angular has been moving to signals.
