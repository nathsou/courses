---
title: The JavaScript you need
summary: 'Closures, getters and setters, Proxy, the event loop and microtasks, WeakMap and tagged templates: only what the chapters lean on.'
number: A
---

The course is written in TypeScript, and almost everything in it is ordinary JavaScript. This appendix is for the handful of features that the chapters lean on hard, with the one sentence about each that matters for this course.

## Closures

A function remembers the variables of the scope in which it was created, not their values at that time. Reading them later gives their *current* values:

```js
function counter() {
  let n = 0;
  return () => ++n;
}
const next = counter();
next(); // 1
next(); // 2
```

Two chapters depend on this. In chapter 6, a component’s hook state is held in a closure over the renderer’s slot array. In chapter 7, a **stale closure** is a function that was created during an older render and remembers *that render’s* `count`, because each render creates its own variables.

## Objects, identity and `Object.is`

Two objects are equal only if they are the *same object*. `{ a: 1 } === { a: 1 }` is `false`. This is why a framework can ask “did this prop change?” with a pointer comparison, and why creating a new object or function on each render defeats `memo` (chapter 7). `Object.is(a, b)` is the comparison the reactive libraries use. It differs from `===` in two cases only: `NaN` equals itself, and `+0` is not `-0`.

## Getters and setters

A property can be defined by functions that run when it is read or written:

```js
const box = {
  _v: 1,
  get value() { console.log('read'); return this._v; },
  set value(x) { console.log('write'); this._v = x; },
};
box.value;      // logs "read"
box.value = 2;  // logs "write"
```

This is how Vue 2 made objects reactive, how a Vue `ref` has its `.value`, and how a Svelte 5 module returns reactive state across a module boundary (`get count() { return count; }`).

## Proxy

A `Proxy` wraps an object and lets you intercept operations on it: reading a property (`get`), writing (`set`), `in` (`has`), `delete`, and listing keys (`ownKeys`).

```js
const target = { a: 1 };
const proxy = new Proxy(target, {
  get(t, key, receiver) { console.log('get', key); return Reflect.get(t, key, receiver); },
  set(t, key, value, receiver) { console.log('set', key); return Reflect.set(t, key, value, receiver); },
});
proxy.a;       // get a
proxy.b = 2;   // set b
```

`Reflect.get` and `Reflect.set` do the default thing. Chapter 13 builds Vue’s reactivity out of exactly this. A proxy is a different object from its target, which is why `reactive(raw) !== raw`.

## The event loop and microtasks

JavaScript in a browser runs one task at a time. A *task* is a click handler, a timer callback, a script. After each task, and before the browser paints, it runs every pending **microtask**: promise callbacks and `queueMicrotask`. So:

```js
console.log('a');
setTimeout(() => console.log('timer'), 0);
Promise.resolve().then(() => console.log('microtask'));
console.log('b');
// a, b, microtask, timer
```

Frameworks use microtasks to batch: set three signals in a row and the effect runs once, in the microtask after the handler returns (chapter 11). They use `requestAnimationFrame` and idle callbacks to schedule work around painting (chapter 8).

## Modules and `import()`

`import x from './x.js'` loads a module at start-up. `import('./x.js')` loads it on demand and returns a promise. Lazy loading by `import()` is how resumable frameworks fetch a handler only when it is first used (chapter 22) and how the page of chapter 18 loads the Svelte compiler.

## WeakMap

A `WeakMap` maps objects to values without keeping the objects alive: when the key object is garbage collected, the entry goes with it. It cannot be iterated. Vue’s table of dependencies (`targetMap`, chapter 13) is a `WeakMap` from each reactive object to its properties’ subscribers, so that tracking an object never prevents it from being freed.

## Tagged templates

A template literal with a function in front of it calls the function with the static strings and the values:

```js
function tag(strings, ...values) { return { strings, values }; }
const f = (x) => tag`a${x}b`;
f(1).strings === f(2).strings;   // true: the same array, every time this site runs
```

The `strings` array is created once per place in the source and is frozen. That property is what lit-html uses as a cache key (chapter 16).

## Classes, `this` and arrow functions

An ordinary function’s `this` depends on how it is called; an arrow function’s `this` is the one around it. That is why event handlers in classes are often written as arrows, and why destructuring a method off an object (`const { increment } = counter`) can break it. Framework code in the course mostly avoids classes, and uses closures.

## TypeScript

The code in the course is TypeScript. Types are erased before it runs (the exercise sandbox uses Sucrase to strip them), so nothing in the chapters depends on a type, but they document what each function expects. `T extends object`, `Record<string, unknown>` and `Partial<T>` are the notations you will meet most.

What does this print?

```js
let n = 1;
const show = () => console.log(n);
n = 2;
show();
```

```quiz
q: "What does the code above print?"
options:
  - text: "1, because `n` was 1 when `show` was created."
    why: "A closure remembers the variable, not its value at creation. Reading it later gives the current value."
  - text: "2, because the closure reads the variable when it runs."
    correct: true
    why: "`show` closes over the variable `n`. By the time it runs, `n` is 2. This is the root of every stale-closure bug, where the *variable* is a fresh one per render and the function remembers an older one."
  - text: "undefined, because `n` was reassigned."
    why: "Reassigning a variable does not remove it. The closure sees whatever value the variable holds at the moment of the read."
```
