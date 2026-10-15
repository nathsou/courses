---
title: Signals from scratch
summary: A spreadsheet is a reactive program. Build signal, computed and effect in forty lines around one global variable, and watch dependencies be discovered rather than declared.
number: 9
duration: 60 minutes
prerequisites: [before-frameworks, who-re-renders]
---

Part II answered *what changed?* by re-running code and comparing the results. This part answers it by recording, the first time code runs, **which values it read**, and re-running only that code when one of those values is written.

You have seen it twice already. Knockout’s `ko.computed` (chapter 3) and the “track” pane of chapter 0’s lens both work this way, and a spreadsheet has done it since 1979.

## A spreadsheet is a reactive program

In a spreadsheet you type `4` in `A2` and `3` in `B2`, and in `C2` you type `=A2*B2`. `C2` shows `12`. Change `A2` to `5` and `C2` shows `15`. You did not write an update handler, a subscription or a re-render. You declared a relationship, and the sheet maintains it.

Three kinds of thing are involved, and they are the three primitives of every :term[signals]{id=signal} library:

| In a spreadsheet | In a signals library | What it is |
|---|---|---|
| A cell holding a number | **signal** | A value that is written to, from outside |
| A cell holding a formula | **computed** (or *memo*, *derived*) | A value defined in terms of other values; never written directly |
| What is drawn on the screen | **effect** | Code that must run when what it reads has changed, to affect the outside world |

The sheet’s great trick is that you never say which cells a formula uses *except by using them*. `=A2*B2` depends on `A2` and `B2` because it mentions them. And a formula like `=IF(B1>0, C3, D3)` depends on `C3` or on `D3`, **depending on the value of `B1`**: whichever it actually evaluates.

Try it. The sheet below is built from the lab’s signals engine: each cell is a signal holding its text, each formula a computed that reads other cells, and each cell on the screen is written by an effect. Edit a number and read the trace under the grid.

::spreadsheet{n="9.1"}

Three experiments. **Orders**: change `A2` and see that only `C2`, `D2`, `C5` and `D5` re-run: the cells downstream of it, and no others. **Select** `C5` to see what it reads (the three `C` cells above it) and select `C2` to see who reads *it*. **A branch**: this sheet’s `B2` is `=IF(B1>0, C3, D3)`. Change `D3`: nothing re-runs, because with `B1 = 1` the formula reads `C3`, not `D3`. Now set `B1` to `0` and change `D3` again: it does, and changing `C3` no longer does. The dependencies of a formula follow the *evaluation*, not the text.

:::key
**Dependencies are discovered by running.** The formula was not asked what it depends on. It was *run*, and the things it read while running were recorded. Run it again, and the record is rebuilt, which is why a formula whose branch changes stops depending on what it no longer reads.
:::

## The one global variable

How can a computation know what it read? It cannot, unless the things it reads tell it. Signals do: when you read a signal, it checks *who is asking*.

The mechanism is a single module-level variable.

```ts
let current: Reaction | null = null;     // whoever is running right now

function signal<T>(initial: T) {
  const subscribers = new Set<Reaction>();
  let value = initial;
  return {
    get() {
      if (current) subscribers.add(current);   // "current" read me: remember it
      return value;
    },
    set(next: T) {
      if (Object.is(next, value)) return;
      value = next;
      for (const r of [...subscribers]) r.run();   // tell everyone who read me
    },
  };
}
```

and `effect` is the thing that *sets* `current`:

```ts
function effect(fn: () => void) {
  const reaction = { run() { current = reaction; try { fn(); } finally { current = null; } } };
  reaction.run();
}
```

That is the whole idea. While `fn` runs, `current` is the effect, so every signal `fn` reads adds the effect to its subscriber list. When one of those signals is later written, the effect is in its list and runs again. No dependency array, no declaration, no registration.

```ts
const count = signal(0);
effect(() => console.log('count is', count.get()));   // logs "count is 0"
count.set(1);                                         // logs "count is 1"
```

Three details turn this sketch into something that works.

**Re-collect the dependencies on every run.** Before an effect runs again it removes itself from every signal it subscribed to, and subscribes afresh as it runs. This is what makes `IF` work: a branch not taken in this run is not read, so it is not subscribed to. Without it, an effect would keep depending on everything it had *ever* read.

**Computed values are reactions that are also signals.** A `computed(fn)` is read like a signal, but when its sources change it does not run `fn` at once: it marks itself *dirty* and tells *its* subscribers. The next time someone reads it, it runs `fn` (with itself as `current`, so it subscribes to its own sources) and caches the result. Reading it twice between changes runs `fn` once.

**Writes stop at equal values.** `Object.is(next, value)` means writing the same thing triggers nothing.

## Build it

The three functions together are about forty lines. This exercise has you write them. The tests check the behaviours above: effects run now and on change, computeds cache, dependencies are dynamic, disposal works.

```build
id: signals-from-scratch/core
title: Write signal, computed and effect
prompt: |
  Implement `signal(initial)` (an object with `get()` and `set(next)`), `computed(fn)` (an object with `get()`) and `effect(fn)` (returns a function that disposes it). Use one module-level variable for the reaction that is currently running. Requirements: reading a signal, or a computed, inside a running effect or computed subscribes that reaction to it; every run of an effect or computed first drops its old subscriptions and collects new ones, so only what it read *this time* counts; `signal.set` with an equal value (`Object.is`) does nothing; setting a signal runs its subscribed effects; a computed runs `fn` lazily on first read, caches the result, and after a source changes recomputes on the next read (not before), while still notifying its own subscribers that it is out of date; a disposed effect never runs again.
starter: |
  type Reaction = { run(): void; deps: Set<Source> };
  type Source = { subs: Set<Reaction> };

  let current: Reaction | null = null;

  export function signal<T>(initial: T) {
    return {
      get(): T {
        // TODO: subscribe `current`, if there is one
        return initial;
      },
      set(next: T): void {
        // TODO: store it, and run the subscribers
      },
    };
  }

  export function computed<T>(fn: () => T) {
    return {
      get(): T {
        // TODO: lazy, cached, and itself readable by other reactions
        return fn();
      },
    };
  }

  export function effect(fn: () => void): () => void {
    // TODO: run now, re-run when a dependency changes, collect dependencies afresh each run
    fn();
    return () => {};
  }
solution: |
  type Reaction = { run(): void; deps: Set<Source> };
  type Source = { subs: Set<Reaction> };

  let current: Reaction | null = null;

  /** Run `fn` as `reaction`, dropping its old subscriptions first. */
  function track<T>(reaction: Reaction, fn: () => T): T {
    for (const dep of reaction.deps) dep.subs.delete(reaction);
    reaction.deps.clear();
    const outer = current;
    current = reaction;
    try {
      return fn();
    } finally {
      current = outer;
    }
  }

  function subscribe(source: Source): void {
    if (current) {
      source.subs.add(current);
      current.deps.add(source);
    }
  }

  export function signal<T>(initial: T) {
    const source: Source = { subs: new Set() };
    let value = initial;
    return {
      get(): T {
        subscribe(source);
        return value;
      },
      set(next: T): void {
        if (Object.is(next, value)) return;
        value = next;
        for (const r of [...source.subs]) r.run();
      },
    };
  }

  export function computed<T>(fn: () => T) {
    const source: Source = { subs: new Set() };
    let value!: T;
    let dirty = true;
    const reaction: Reaction = {
      deps: new Set(),
      run() {
        // A source changed: remember that, and tell whoever read us.
        if (dirty) return;
        dirty = true;
        for (const r of [...source.subs]) r.run();
      },
    };
    return {
      get(): T {
        subscribe(source);
        if (dirty) {
          value = track(reaction, fn);
          dirty = false;
        }
        return value;
      },
    };
  }

  export function effect(fn: () => void): () => void {
    let alive = true;
    const reaction: Reaction = {
      deps: new Set(),
      run() {
        if (alive) track(reaction, fn);
      },
    };
    reaction.run();
    return () => {
      alive = false;
      for (const dep of reaction.deps) dep.subs.delete(reaction);
      reaction.deps.clear();
    };
  }
tests: |
  import { test, expect } from '@rx/test';
  import { signal, computed, effect } from './solution.ts';

  test('an effect runs now and again whenever a signal it read changes', () => {
    const n = signal(1);
    const seen: number[] = [];
    effect(() => void seen.push(n.get()));
    n.set(2);
    n.set(3);
    expect(seen).toEqual([1, 2, 3]);
  });

  test('writing an equal value does nothing', () => {
    const n = signal(1);
    let runs = 0;
    effect(() => void (n.get(), runs++));
    n.set(1);
    expect(runs).toBe(1);
  });

  test('a computed is lazy and cached', () => {
    const a = signal(2);
    let calls = 0;
    const double = computed(() => (calls++, a.get() * 2));
    expect(calls).toBe(0);
    expect(double.get()).toBe(4);
    expect(double.get()).toBe(4);
    expect(calls).toBe(1);
  });

  test('a computed recomputes after its source changes, on the next read', () => {
    const a = signal(2);
    let calls = 0;
    const double = computed(() => (calls++, a.get() * 2));
    double.get();
    a.set(5);
    expect(calls).toBe(1);
    expect(double.get()).toBe(10);
    expect(calls).toBe(2);
  });

  test('an effect that reads a computed re-runs when the computed’s source changes', () => {
    const a = signal(1);
    const double = computed(() => a.get() * 2);
    const seen: number[] = [];
    effect(() => void seen.push(double.get()));
    a.set(2);
    a.set(3);
    expect(seen).toEqual([2, 4, 6]);
  });

  test('dependencies are dynamic: a branch not taken is not subscribed to', () => {
    const flag = signal(true);
    const x = signal('x1');
    const y = signal('y1');
    const seen: string[] = [];
    effect(() => void seen.push(flag.get() ? x.get() : y.get()));
    y.set('y2'); // not read yet
    expect(seen).toEqual(['x1']);
    flag.set(false);
    x.set('x2'); // no longer read
    y.set('y3');
    expect(seen).toEqual(['x1', 'y2', 'y3']);
  });

  test('a disposed effect never runs again', () => {
    const n = signal(0);
    let runs = 0;
    const stop = effect(() => void (n.get(), runs++));
    stop();
    n.set(1);
    expect(runs).toBe(1);
  });

  test('a computed chain: effect → computed → computed → signal', () => {
    const a = signal(1);
    const b = computed(() => a.get() + 1);
    const c = computed(() => b.get() * 10);
    const seen: number[] = [];
    effect(() => void seen.push(c.get()));
    a.set(2);
    expect(seen).toEqual([20, 30]);
  });
hints:
  - "A reaction needs to remember which sources it subscribed to (`deps`), so that it can leave them all before running again."
  - "A computed is *both*: it subscribes to its sources (as a reaction) and is subscribed to by others (as a source). Its `run` just marks it dirty and passes the news on."
explain: "About fifty lines with the helpers. It has two problems, which are the next two chapters: it can run an effect with a half-updated graph (glitches, chapter 10), and nothing ever disposes an effect that was created inside another one (ownership, chapter 11)."
```

## What you now have, and what it costs

With these three functions you can write the Notes app so that `count.set(…)` updates the page, with no diff and no comparison of descriptions, and the lens will show one text write. What makes that possible is that **the cost of finding what changed was paid earlier**, in a different currency. Every signal holds a set of subscribers, and every run of an effect or computed re-subscribes. That is memory, and it is work at *run* time on every read.

The trade is clear. A virtual DOM pays, on every update, to compare what it has. A signal pays, on every read, to remember that it was read, and then pays nothing to find out who to tell. Which is cheaper depends on how often values are read against how often they are written, how much of the page each write affects, and how much memory a subscription costs. For a page where one small thing changes at a time, signals do almost no work per update. For a page where *most* of the data changes at once, the bookkeeping is overhead.

:::programmer
**Signals in every library.** Every framework in Part III is this chapter, plus decisions about what chapters 10 and 11 raise. The names differ. Solid: `createSignal` (returning a getter and a setter), `createMemo`, `createEffect`. Vue: `ref` (read and write `.value`), `computed`, `watchEffect`. Preact Signals: `signal`, `computed`, `effect`, all with `.value`. Angular: `signal`, `computed`, `effect`, read by calling the signal like a function. Svelte 5: `$state`, `$derived`, `$effect`, with the reads and writes disguised as ordinary variable access by the compiler. Qwik: `useSignal`, `useComputed$`, `useTask$`. MobX: `observable`, `computed`, `autorun`. A proposal to standardise the core is the subject of chapter 15.
:::

## Where this comes from

:::history{year=1979 title="VisiCalc, and the long road to reactive UIs"}
Dan Bricklin and Bob Frankston’s VisiCalc (1979) was the first spreadsheet for personal computers, and its *natural order* of recalculation, where a cell is recomputed after the cells it depends on, was the idea that made it useful. The academic line, *functional reactive programming*, started with Conal Elliott and Paul Hudak’s *Functional Reactive Animation* in 1997, and was surveyed by Bainomugisha and colleagues in 2013. :cite[elliott-hudak-1997] :cite[bainomugisha-2013] A parallel line, *incremental computation*, asks how to recompute only what an input change affects; Adapton (2014) is a representative system. :cite[hammer-adapton-2014] The web arrived late: Knockout (2010), Meteor’s Tracker, MobX (2015) and Vue 2 (2016) brought dependency tracking to JavaScript, and Solid, Preact Signals and Angular made it the centre of a framework. Ryan Carniato’s *A Hands-on Introduction to Fine-Grained Reactivity* is the clearest short walkthrough of the code in this chapter. :cite[carniato-fgr]
:::

:::whatchanged
For *signals*: **whatever read the signal that was just written**, recorded at run time by a global variable that says who is currently running. No comparison, no search: the subscriber list is the answer. The price is a subscription set on every signal and a re-subscription on every run.
:::

## What’s next

The engine you just wrote has a bug that every first implementation has. When one signal feeds a computed through two different paths, an effect can see a state of the world that never existed. Chapter 10 breaks the engine on purpose, then fixes it three ways.
