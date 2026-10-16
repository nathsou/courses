---
title: A standard for signals
summary: Every library has the same three primitives and its own copy of the engine. A TC39 proposal would put the graph in the language and leave effects, scheduling and ownership to frameworks. Build an effect from its Watcher.
number: 15
duration: 50 minutes
prerequisites: [ownership-and-batching, angular-zones-and-signals]
---

Look back over chapters 9 to 14. Solid’s `createSignal`, Vue’s `ref`, Preact’s `signal`, Angular’s `signal`, MobX’s `observable`, Svelte 5’s `$state`, Qwik’s `useSignal`: seven spellings of the same idea, and seven engines underneath, each with its own dependency tracking, glitch-avoidance, cutoff rules and cleanup. Their authors compare notes, and the algorithms of chapter 10 are close to each other, but a signal made by one library cannot be read by an effect from another.

In 2024 a group of those authors proposed to fix that in the language itself.

## The proposal

The **TC39 Signals proposal** adds a `Signal` object to JavaScript. TC39 is the committee that specifies the language, and a proposal moves through *stages*, from 0 (an idea) to 4 (finished: shipped in engines and added to the next edition of the standard). Signals entered **stage 1** in April 2024, which means that the committee agrees the problem is worth solving and the design is open to change. :cite[tc39-signals] It has been a collaboration of people who maintain Angular, Ember, MobX, Preact, Qwik, RxJS, Solid, Svelte, Vue and others: the first time the competing designs have been merged on purpose.

It has a **polyfill**, a library that behaves as the standard would, and this chapter runs it for real. The surface is small:

```js
const counter = new Signal.State(0);                               // a writable cell
const isEven  = new Signal.Computed(() => (counter.get() & 1) == 0);   // derived, lazy, cached
const parity  = new Signal.Computed(() => (isEven.get() ? 'even' : 'odd'));

counter.set(1);
parity.get();   // "odd"
```

`State` and `Computed` are chapter 9’s `signal` and `computed`: reads inside a `Computed` subscribe it, and a `Computed` is recomputed lazily, cached, and checks whether its sources really changed before it recomputes (chapter 10’s dirty-and-check). Both take an `equals` option for cutoff. Cycles throw. And *there is no `effect`*.

The omission is deliberate. An effect is not just “run this when a signal changes”: it also decides *when* (synchronously? in a microtask? before paint? during Angular’s change detection?), *in what order* (parents before children?), *with which cleanup*, and *owned by what*. These are the questions on which the frameworks of chapters 11 to 14 differ, and some of them are their identity. So the proposal gives them the graph, and a lower-level tool to build effects on, which lives under `Signal.subtle` to say that it is for library authors.

## The Watcher

A `Watcher` is a *sink* that is not a computation: it can be told to watch signals, and gets a callback when one of them might have changed.

```js
const watcher = new Signal.subtle.Watcher(() => {
  // notify: called when a watched signal becomes dirty
});
watcher.watch(someComputed);
watcher.getPending();     // the watched computeds that are dirty and need re-reading
```

An effect is then a `Computed` that does the work as a side effect of being computed, watched by a `Watcher` that schedules its re-reading:

```js
function effect(fn) {
  let cleanup;
  const node = new Signal.Computed(() => {
    cleanup?.();
    cleanup = fn();                 // the effect body runs inside a Computed, so it tracks its reads
  });
  watcher.watch(node);
  node.get();                       // run it once now
  return () => { watcher.unwatch(node); cleanup?.(); };
}
```

The three rules of the protocol are what the next figure shows:

1. **`notify` runs synchronously, inside the write**, the moment a watched signal is marked dirty. This is chapter 10’s “mark” phase. Because the graph is half-updated at that moment, `notify` is **forbidden from reading or writing any signal**. It may only schedule.
2. The Watcher notifies **once**, then is silent until it is re-armed with `watcher.watch()` with no arguments. A hundred writes produce one notification; the framework’s scheduler does the rest.
3. When the scheduler runs, it asks `getPending()` for the dirty computeds and **reads them** (`get()`). That is chapter 10’s “pull” phase: each is recomputed if its sources really changed, and not otherwise.

Try it. `count` feeds `parity`, which the effect reads. The scheduler here is a button, so the gap between *notified* and *ran* is visible.

::watcher-lab{n="15.1"}

Press `count + 1` three times before running the flush: three writes, **one** notify (the Watcher is silent after the first, until it is re-armed), and then the single flush runs the effect once, with the final value. Now press `count + 2` and run the flush: the Watcher was notified and the flush was queued, but the effect **does not run**, since `parity` recomputed to the same string. The cutoff happens *inside the standard’s graph*, where every framework would get it for free.

:::key
**The standard stops where frameworks differ.** It standardises *what is a dependency* and *what is stale*, the part the libraries had converged on, and leaves *when to run* and *who cleans up* to the Watcher’s user. That is the same split as the book’s: chapter 10 is the graph, and chapter 11 is the scheduler.
:::

## Build an effect

Now write the library half. The scheduler is injected, so that your tests can run it by hand: `enqueue(job)` takes a function to run later, which in a browser would be `queueMicrotask`.

```build
id: a-standard-for-signals/effect
title: Write effect() on top of Signal.subtle.Watcher
prompt: |
  Implement `createEffects(enqueue)`, which returns `effect(fn)`. `fn` may return a cleanup function. The effect runs once at creation and again after any signal it read changes, but **not synchronously**: a write only makes the Watcher call back, and the callback may only call `enqueue(flush)`, once however many writes happen before the flush. The flush reads every pending computed, then re-arms the Watcher with `watcher.watch()`. The returned function disposes the effect and runs its last cleanup. The cleanup of the previous run must run before the next run.
starter: |
  import { Signal } from '@rx/tc39';

  export function createEffects(enqueue: (job: () => void) => void) {
    // TODO: one Watcher for all effects. notify() must only call enqueue(); it must not read or write signals.

    function effect(fn: () => void | (() => void)): () => void {
      // TODO: wrap fn in a Computed, watch it, read it once now
      fn();
      return () => {};
    }
    return { effect };
  }
solution: |
  import { Signal } from '@rx/tc39';

  export function createEffects(enqueue: (job: () => void) => void) {
    let queued = false;

    const watcher = new Signal.subtle.Watcher(() => {
      // Runs inside the write that dirtied a signal: schedule, do not read or write.
      if (!queued) {
        queued = true;
        enqueue(flush);
      }
    });

    function flush() {
      queued = false;
      for (const pending of watcher.getPending()) pending.get(); // pull: recompute, which runs the effect bodies
      watcher.watch(); // re-arm
    }

    function effect(fn: () => void | (() => void)): () => void {
      let cleanup: void | (() => void);
      const node = new Signal.Computed(() => {
        if (typeof cleanup === 'function') cleanup();
        cleanup = fn();
      });
      watcher.watch(node);
      node.get();
      return () => {
        watcher.unwatch(node);
        if (typeof cleanup === 'function') cleanup();
        cleanup = undefined;
      };
    }

    return { effect };
  }
tests: |
  import { test, expect } from '@rx/test';
  import { Signal } from '@rx/tc39';
  import { createEffects } from './solution.ts';

  function setup() {
    const jobs: (() => void)[] = [];
    const { effect } = createEffects((job) => jobs.push(job));
    const flush = () => {
      while (jobs.length) jobs.shift()!();
    };
    return { effect, flush, jobs };
  }

  test('runs once at creation', () => {
    const { effect } = setup();
    const log: string[] = [];
    effect(() => void log.push('ran'));
    expect(log).toEqual(['ran']);
  });

  test('a write does not run the effect synchronously', () => {
    const { effect, jobs } = setup();
    const s = new Signal.State(0);
    const seen: number[] = [];
    effect(() => void seen.push(s.get()));
    s.set(1);
    expect(seen).toEqual([0]);
    expect(jobs.length).toBe(1);
  });

  test('the flush runs the effect with the latest value', () => {
    const { effect, flush } = setup();
    const s = new Signal.State(0);
    const seen: number[] = [];
    effect(() => void seen.push(s.get()));
    s.set(1);
    flush();
    expect(seen).toEqual([0, 1]);
  });

  test('many writes, one job, one run', () => {
    const { effect, flush, jobs } = setup();
    const s = new Signal.State(0);
    const seen: number[] = [];
    effect(() => void seen.push(s.get()));
    s.set(1);
    s.set(2);
    s.set(3);
    expect(jobs.length).toBe(1);
    flush();
    expect(seen).toEqual([0, 3]);
  });

  test('it keeps working for later writes (the watcher is re-armed)', () => {
    const { effect, flush } = setup();
    const s = new Signal.State(0);
    const seen: number[] = [];
    effect(() => void seen.push(s.get()));
    s.set(1);
    flush();
    s.set(2);
    flush();
    s.set(3);
    flush();
    expect(seen).toEqual([0, 1, 2, 3]);
  });

  test('a computed that comes out equal does not re-run the effect', () => {
    const { effect, flush } = setup();
    const n = new Signal.State(2);
    const even = new Signal.Computed(() => n.get() % 2 === 0);
    const seen: boolean[] = [];
    effect(() => void seen.push(even.get()));
    n.set(4);
    flush();
    expect(seen).toEqual([true]);
    n.set(5);
    flush();
    expect(seen).toEqual([true, false]);
  });

  test('cleanup runs before the next run and at disposal', () => {
    const { effect, flush } = setup();
    const s = new Signal.State(0);
    const log: string[] = [];
    const stop = effect(() => {
      const v = s.get();
      log.push(`run ${v}`);
      return () => log.push(`cleanup ${v}`);
    });
    s.set(1);
    flush();
    stop();
    expect(log).toEqual(['run 0', 'cleanup 0', 'run 1', 'cleanup 1']);
  });

  test('a disposed effect does not run again', () => {
    const { effect, flush } = setup();
    const s = new Signal.State(0);
    let runs = 0;
    const stop = effect(() => void (s.get(), runs++));
    stop();
    s.set(1);
    flush();
    expect(runs).toBe(1);
  });

  test('two effects are independent', () => {
    const { effect, flush } = setup();
    const a = new Signal.State(0);
    const b = new Signal.State(0);
    const log: string[] = [];
    effect(() => void log.push(`a${a.get()}`));
    effect(() => void log.push(`b${b.get()}`));
    b.set(1);
    flush();
    expect(log).toEqual(['a0', 'b0', 'b1']);
  });
hints:
  - "The Watcher callback runs *inside* `set`: calling `get()` on any signal there throws. It should only call `enqueue(flush)`."
  - "Use a `queued` flag so that a burst of writes enqueues one flush; reset it at the start of `flush`."
  - "A Watcher stays silent after notifying until you call `watcher.watch()` with no arguments."
explain: "The whole effect system is the Watcher plus a `Computed` that does work. Compare with chapter 11: the owner/cleanup logic is the three lines about `cleanup`, and the batching is the `queued` flag. Everything else (the graph, glitch-freedom, cutoff) is inside the standard. A framework would add ownership (who disposes this effect?), ordering (parent effects before children) and its own scheduler, which is exactly where Angular, Solid and Lit differ."
```

## One name for seven things

Now that you have seen the engine, here is the same program in each library. The shape is always the same: a writable cell, a derived value and an effect.

| | writable | derived | effect | read | write |
|---|---|---|---|---|---|
| **TC39 (proposal)** | `new Signal.State(0)` | `new Signal.Computed(fn)` | built from `Watcher` | `s.get()` | `s.set(v)` |
| **Solid** | `createSignal(0)` | `createMemo(fn)` | `createEffect(fn)` | `s()` | `setS(v)` |
| **Vue** | `ref(0)` | `computed(fn)` | `watchEffect(fn)` | `s.value` | `s.value = v` |
| **Preact Signals** | `signal(0)` | `computed(fn)` | `effect(fn)` | `s.value` | `s.value = v` |
| **Angular** | `signal(0)` | `computed(fn)` | `effect(fn)` | `s()` | `s.set(v)` |
| **Svelte 5** | `let s = $state(0)` | `$derived(expr)` | `$effect(fn)` | `s` | `s = v` |
| **Qwik** | `useSignal(0)` | `useComputed$(fn)` | `useTask$(fn)` | `s.value` | `s.value = v` |
| **MobX** | `observable.box(0)` | `computed(fn)` | `autorun(fn)` | `s.get()` | `s.set(v)` |

Appendix D lists the full programs. The differences in the table are the differences in *how much the language hides*: Svelte’s compiler removes the call syntax altogether; Vue, Preact and Qwik use a property accessor; Solid, Angular, MobX and the proposal use explicit calls.

## What the standard would give, and what it would not

**Interop.** If two libraries used the same `Signal.State`, a Solid component and a Lit component could read one signal, and a store written once could drive any of them. That is the pitch. Lit’s experimental `@lit-labs/signals` package already does it with the polyfill: a Lit element that uses its `SignalWatcher` mixin and reads a polyfilled signal re-renders when it changes, whatever created the signal.

**Smaller libraries and better tools.** If the graph is built in, libraries are smaller, and devtools can inspect any signal graph (`introspectSources` and `introspectSinks` are in the proposal for this).

**Performance and correctness, shared.** A native implementation can be faster than JavaScript, and one *correct* implementation (cycles, glitches, exceptions) replaces seven.

What it will not give you:

- **Effects, scheduling and ownership.** You have to bring those, as the exercise did, and these are the parts you notice most in practice. Two libraries that share a graph still disagree about when effects run, so a Solid effect and an Angular effect reading the same signal will run at different moments.
- **Async.** A `Computed` is synchronous. There is no standard answer yet for a signal that depends on a `fetch`, which Solid’s `createResource` and Angular’s `resource` each handle differently.
- **Certainty.** Stage 1 means design changes are expected, and a feature that every framework has already implemented in a slightly different way is hard to standardise: whichever semantics the standard picks, some framework has to change, and “subtle” differences like the order of effect runs are what real applications depend on.

:::programmer
**Should you use it today?** For applications, no: the polyfill’s own README warns against production use, and the proposal may change. For *libraries*, it is a good bet to write state management that exposes `Signal.State`-compatible objects, since a thin adapter can bridge them to a framework’s own signals, and `signal-utils` already provides collections and async helpers built on the polyfill. For learning, it is the best place to read what the *minimal* signal engine is.
:::

:::history{year=2024 title="Stage 1"}
The proposal was started by Rob Eisenberg and Daniel Ehrenberg and presented to TC39 in 2024, building on years of conversations between framework authors, and reached stage 1 that April. :cite[tc39-signals] It is an unusual proposal: it standardises something that has been implemented, many times, in userland, by people who were glad to compete but had come to the same answer. The earlier model for this is `Promise`: A+ promises were a convention shared by libraries long before the language had one. Whether it moves to stage 2 depends on whether those libraries can agree on the details of the graph.
:::

:::whatchanged
Nothing new for the core question, which is the point: for *track*, the standard says **the same thing every library already says**, and moves the engine out of each of them. The frameworks keep what they do with it: Solid compiles holes to effects, Vue wraps components, Angular notifies views, Lit re-renders elements.
:::

## What’s next

The proposal has a user already: **Lit**, whose templates need no compiler at all. Chapter 16 reads how Lit finds the holes in a tagged template at runtime, and what “parts” are.
