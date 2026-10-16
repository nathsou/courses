---
title: 'Before frameworks: events and dirty checking'
summary: Observers, observable models, and AngularJS’s digest loop. How a framework that cannot see assignments finds out what changed, and what that costs per watcher.
number: 3
duration: 45 minutes
prerequisites: [ui-as-a-function]
---

Chapter 2 left the programmer with two bad choices: rebuild the page and lose its state, or keep it and write every update by hand. The obvious third idea is to make the *data* tell the page when it changes. If that worked well, the page would only ever be told about real changes, and nobody would have to remember anything.

It worked well enough to carry a generation of applications, and the ways it fell short are the reason the rest of this course exists.

## Observers

The pattern is the oldest one in user interfaces: an object keeps a list of listeners and calls them when it changes.

```ts
class Model<T extends object> {
  private listeners = new Map<string, Set<(value: unknown) => void>>();
  constructor(private data: T) {}
  get<K extends keyof T>(key: K): T[K] { return this.data[key]; }
  set<K extends keyof T>(key: K, value: T[K]) {
    if (this.data[key] === value) return;
    this.data[key] = value;
    this.listeners.get(key as string)?.forEach((fn) => fn(value));
  }
  on(key: string, fn: (value: unknown) => void) {
    (this.listeners.get(key) ?? this.listeners.set(key, new Set()).get(key)!).add(fn);
  }
}

const note = new Model({ text: 'Buy milk', done: false });
note.on('text', (t) => (li.textContent = String(t)));   // wire the DOM to the data
note.set('text', 'Buy oat milk');                         // the li updates
```

This is Backbone’s model, nearly: `model.set('text', …)` fires a `change:text` event and a `change` event, and a Backbone view subscribes to the ones it cares about. :cite[backbone-docs] It is the *exact* answer to chapter 0’s question: the data knows what changed, because the change went through `set`.

It has three weaknesses, and each one is a source of bugs in every codebase that relies on it.

**You wire it by hand.** Every binding is a line of code: `note.on('text', …)`. The pairs in chapter 2’s grid are still there; they have moved from handlers to subscriptions.

**Derived values are your problem.** The summary line depends on the number of notes and on how many are done. When a note’s `done` changes, *something* must fire a change for the summary, and that something is hand-written. Forget it, and the line goes stale, quietly, as before.

**You must clean up.** A view that subscribes to a model and is then removed from the page is still referenced by the model’s listener list. It is never freed and it keeps running its updates on nodes that are no longer there. Backbone’s `stopListening`, and a generation of conference talks about “zombie views”, were the answer.

### Knockout got further, in 2010

Steve Sanderson’s Knockout, released in 2010, took the observer pattern one step further than most of its contemporaries, and the step is worth noticing because it is the idea of Part III.

```js
const first = ko.observable('Ann');
const last = ko.observable('Lee');
const full = ko.computed(() => first() + ' ' + last());   // no list of dependencies

full();          // "Ann Lee"
first('Beth');   // full() is now "Beth Lee", and anything bound to it updates
```

Knockout’s `ko.computed` does not ask you to list what it depends on. It *runs* the function and records which observables were read while it ran. Those are its dependencies. When any of them changes, it runs again. This is **automatic dependency tracking** :cite[knockout-docs]: the answer you will build in chapter 9 and meet in every signal library. Knockout had it before React existed. What it lacked was a way to apply it to plain JavaScript objects: you had to wrap every value in `ko.observable()` and call it as a function.

## The other answer: look at everything

AngularJS (Google, first released in 2010; version 1.0 in 2012) chose differently. It wanted you to write plain objects:

```js
$scope.name = 'Ann';
$scope.price = 4;
```

and to write `{{name}}` in the template. There was no `set` call, no observable wrapper, nothing for the framework to hook. In 2010 an assignment to a property of a plain object could not be intercepted. So the framework could not be *told* that `$scope.name` had changed. It had to **go and look**.

That is :term[dirty checking]{id=dirty-checking}. For every binding in a template, AngularJS registers a **watcher**: a function that reads the current value, and a listener to call if it is not what it read last time. To find out what has changed, it calls *every* watcher, compares each result with the remembered one, and calls the listeners of those that differ.

There is one more twist. A listener can change the scope (copy a value somewhere, compute a total), and then some *other* watcher’s value may have changed as a consequence. So one pass is not enough. The framework repeats the whole pass until a pass finds nothing different. The loop is called the **digest** :cite[angularjs-scope], and the door to it is `$apply`: AngularJS wrapped every entry point (a click handler, a timer, an HTTP response) in `$scope.$apply(fn)`, which runs your code and then digests.

```js
$digest() {
  let pass = 0, dirty;
  do {
    dirty = false;
    for (const w of this.watchers) {
      const now = w.watchFn(this);
      if (now !== w.last) { w.listenerFn(now, w.last, this); w.last = now; dirty = true; }
    }
    if (dirty && ++pass >= 10) throw new Error('10 $digest() iterations reached. Aborting!');
  } while (dirty);
}
```

That is essentially the real thing, and you will write it yourself below. First, watch one run.

::digest-loop{n="3.1"}

Do three things in the figure.

1. **Change the name.** Watch the table: *pass 1* finds `name` changed and calls its listener, the one labelled *name (→ shout)*, which writes `scope.shout`. The watcher on `shout` sits earlier in the list, so in pass 1 it had already been read and did not see the new value. *Pass 2* sees `shout` change and fires its listener. *Pass 3* finds nothing different and the loop stops. The last pass is always the clean one: the digest does not know it is finished until it has looked and found nothing.
2. **Change the quantity.** The total updates in the first pass. But the digest still runs a *second* pass, in which every watcher is called again to confirm that nothing else moved.
3. **Raise the idle watchers.** They watch values that never change. Watch the count of watcher calls and the time grow with them, although nothing the page shows is different. A digest’s cost is *(watchers) × (passes)*, whatever changed.

```predict
q: A page has 500 watchers. A user types one character, the digest runs, and every listener that fires changes nothing that another watcher reads. How many times is a watcher function called in total?
options:
  - text: Once, for the watcher bound to the text box.
    why: It cannot know which watcher is the relevant one. It has no idea what changed; that is the premise of dirty checking.
  - text: 500, in one pass.
    why: One pass over 500 watchers finds the change and calls its listener. But the digest cannot stop there; it has to look again to be sure the listener did not change anything else.
  - text: 1,000. One pass finds the change; a second pass confirms that nothing else did.
    correct: true
    why: The last pass is always a clean one. With no cascade, the cost is two passes over every watcher on the page, however little changed.
```

:::programmer
**The folk limit.** AngularJS applications had a rule of thumb that went around for years: keep a page under about two thousand watchers. It was never a hard limit; it was the point where a digest on an ordinary laptop started to be noticeable. Developers learned to count watchers in the console, to use one-time bindings (`{{::name}}`, which removes the watcher after the first stable value), and to avoid long `ng-repeat`s of rows with many bindings each. All of this is how it feels to live with a cost that grows with the *size of the page* rather than with the size of the *change*.
:::

## Writing the loop

The core of dirty checking is short. In this exercise you build a `Scope` with `$watch`, `$digest` and `$apply`, tested against the behaviour of the real digest: the listener runs on the first digest, with the old value equal to the new one; a listener that changes the scope causes another pass; and a digest that never settles gives up after ten passes.

```build
id: before-frameworks/scope
title: Write the digest
prompt: |
  Complete `Scope`. `$watch(watchFn, listenerFn)` registers a watcher. `$digest()` repeats passes over all watchers until a pass finds no change, calls `listenerFn(newValue, oldValue, scope)` for each watcher whose `watchFn(scope)` result differs from the last one (on its first call the old value passed is the new value), and returns the number of passes, including the final clean one. After ten passes that still found changes, throw `10 $digest() iterations reached. Aborting!`. `$apply(fn)` runs `fn(scope)` and then digests. Compare values with `===`, but treat `NaN` as equal to `NaN`.
starter: |
  interface Watcher {
    watchFn: (scope: Scope) => any;
    listenerFn: (newValue: any, oldValue: any, scope: Scope) => void;
    last: any;
  }

  const UNSET = Symbol('unset');

  export class Scope {
    [key: string]: any;
    private watchers: Watcher[] = [];

    $watch(watchFn: Watcher['watchFn'], listenerFn: Watcher['listenerFn'] = () => {}): void {
      // TODO: remember the watcher, with a "last" value that nothing can equal yet
    }

    private digestOnce(): boolean {
      // TODO: one pass over the watchers; return whether any value had changed
      return false;
    }

    $digest(): number {
      // TODO: repeat digestOnce until it returns false; give up after 10 passes that found changes
      return 0;
    }

    $apply<T>(fn: (scope: Scope) => T): T {
      // TODO: run fn, then digest (even if fn throws)
      return fn(this);
    }
  }
solution: |
  interface Watcher {
    watchFn: (scope: Scope) => any;
    listenerFn: (newValue: any, oldValue: any, scope: Scope) => void;
    last: any;
  }

  const UNSET = Symbol('unset');

  export class Scope {
    [key: string]: any;
    private watchers: Watcher[] = [];

    $watch(watchFn: Watcher['watchFn'], listenerFn: Watcher['listenerFn'] = () => {}): void {
      this.watchers.push({ watchFn, listenerFn, last: UNSET });
    }

    private digestOnce(): boolean {
      let dirty = false;
      for (const w of [...this.watchers]) {
        const now = w.watchFn(this);
        const same = now === w.last || (Number.isNaN(now) && Number.isNaN(w.last));
        if (!same) {
          const old = w.last === UNSET ? now : w.last;
          w.last = now;
          w.listenerFn(now, old, this);
          dirty = true;
        }
      }
      return dirty;
    }

    $digest(): number {
      let passes = 0;
      let dirty: boolean;
      do {
        dirty = this.digestOnce();
        passes++;
        if (dirty && passes >= 10) throw new Error('10 $digest() iterations reached. Aborting!');
      } while (dirty);
      return passes;
    }

    $apply<T>(fn: (scope: Scope) => T): T {
      try {
        return fn(this);
      } finally {
        this.$digest();
      }
    }
  }
tests: |
  import { test, expect } from '@rx/test';
  import { Scope } from './solution.ts';

  test('the listener runs on the first digest, with old === new', () => {
    const scope = new Scope();
    scope.name = 'Ann';
    const calls: unknown[][] = [];
    scope.$watch((s) => s.name, (n, o) => calls.push([n, o]));
    scope.$digest();
    expect(calls).toEqual([['Ann', 'Ann']]);
  });

  test('it runs again only when the value changes', () => {
    const scope = new Scope();
    scope.n = 1;
    let calls = 0;
    scope.$watch((s) => s.n, () => calls++);
    scope.$digest();
    scope.$digest();
    scope.n = 2;
    scope.$digest();
    expect(calls).toBe(2);
  });

  test('a listener that changes the scope causes another pass', () => {
    const scope = new Scope();
    scope.a = 1;
    scope.b = 0;
    scope.$watch((s) => s.a, (a) => (scope.b = a * 2));
    const seen: number[] = [];
    scope.$watch((s) => s.b, (b) => seen.push(b));
    const passes = scope.$digest();
    expect(seen).toEqual([2]);
    expect(passes).toBe(2);
  });

  test('a clean digest is a single pass', () => {
    const scope = new Scope();
    scope.$watch(() => 1);
    scope.$digest();
    expect(scope.$digest()).toBe(1);
  });

  test('two watchers that keep changing each other are stopped after ten passes', () => {
    const scope = new Scope();
    scope.x = 0;
    scope.y = 0;
    scope.$watch((s) => s.x, () => scope.y++);
    scope.$watch((s) => s.y, () => scope.x++);
    expect(() => scope.$digest()).toThrow('10 $digest() iterations reached');
  });

  test('$apply runs the function and then digests', () => {
    const scope = new Scope();
    scope.v = 0;
    let heard = -1;
    scope.$watch((s) => s.v, (v) => (heard = v));
    scope.$apply((s) => (s.v = 5));
    expect(heard).toBe(5);
  });

  test('NaN does not make a watcher dirty forever', () => {
    const scope = new Scope();
    scope.$watch(() => NaN);
    expect(scope.$digest()).toBe(2);
  });
hints:
  - "A watcher's `last` value starts as something no value can equal, so that the first call is always a change. On that first call, pass the new value as the old one."
  - "`digestOnce` returns true if any listener ran. `$digest` loops while it does."
explain: "That is the whole algorithm. Everything else in AngularJS’s version (child scopes, deep comparison, `$evalAsync`, `$watchCollection`) is an optimisation or a convenience around this loop."
```

## Why not just watch the assignment?

It is fair to ask why AngularJS did not intercept `scope.name = 'x'`. In 2010 it could not. A plain property has no hook. There were three later developments, and the progression is the story of Part III.

- **Getters and setters.** ES5 (2009) let you define a property with `Object.defineProperty(obj, 'name', { get, set })` and so intercept reads and writes of *properties that you declare in advance*. Vue 1 and 2 used this: it walks an object, turns every property into a getter/setter pair, and records which computation was running at each read. It cannot see a property added later (`vm.newProp = 1` needed `Vue.set`), nor an array index assignment.
- **`Object.observe`.** A proposed ES7 API that notified you asynchronously of *any* change to an object. Chrome shipped it in 2014 and Angular 2 was designed with it in mind; it was withdrawn in 2015, when the frameworks it was meant for had moved to other designs, and removed from browsers soon after.
- **`Proxy`.** ES2015 added objects whose operations (get, set, has, delete) are all interceptable. All the major browsers had it by 2016. A proxy can see everything: the new property, the array index, the `delete`. It is what Vue 3 and several other libraries use, and chapter 13 builds it.

Meanwhile the dirty-checking approach fell out of fashion for a more basic reason than any of these: its cost is a function of the page, not of the change. Angular, the 2016 rewrite, kept the idea of checking but changed *how often* and *how much* (chapter 14); and AngularJS itself reached the end of its support at the start of 2022.

:::whatchanged
For *dirty-checking*: **everything that could have changed**, re-read, over and over, until a whole pass finds nothing. It never needs to be told what changed, which is its strength (plain objects, no wrappers) and its weakness (the cost of a digest is watchers × passes, whatever actually moved).
:::

## What’s next

The next part keeps the framework looking for changes but makes the *comparison* the cheap part, by comparing a description of the page instead of the page itself. Chapter 4 builds the core of a virtual DOM.
