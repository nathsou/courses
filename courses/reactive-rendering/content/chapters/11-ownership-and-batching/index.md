---
title: 'Ownership, cleanup and batching'
summary: Two practical problems stand between a correct signals engine and a UI built on it. Writes that arrive together, and effects that create effects.
number: 11
duration: 55 minutes
prerequisites: [glitches-and-diamonds]
---

The engine from chapter 10 is *correct*: every effect sees a consistent graph, and no computed value is recomputed unless somebody reads it. A user interface asks two more things of it. It has to cope with programs that **write more than once** at a time, and with programs that **create effects while running effects**, which is what a component is.

## Writes that arrive together

An event handler often writes several signals. A form’s *Save* button sets the first name, then the last name, then a timestamp. The engine of chapter 10 flushes after every write, so an effect that reads two of them runs between the writes:

```ts
first.set('Grace');     // the effect runs: "Grace Lovelace"
last.set('Hopper');     // the effect runs again: "Grace Hopper"
```

The first run saw a name nobody has. It is the same kind of mistake as the glitch in chapter 10, with one difference: this time the *program* wrote the intermediate state, and the engine has no way to know that the two writes belong together.

::batch-demo{n="11.1"}

Switch the figure to the batched version. The fix is a function that says so:

```ts
batch(() => {
  first.set('Grace');
  last.set('Hopper');
});   // marks as it goes; flushes once, at the end
```

Inside `batch`, a write still *marks* everything stale (cheap, and immediate), but the flush of effects waits for the outermost `batch` to finish. Batches nest, and only the outermost one flushes. Reading a computed inside a batch still gives the right answer, since computeds are lazy and recompute from what has been written so far.

Libraries differ in **who calls the batch**:

- **You do.** Preact Signals, MobX (`runInAction`) and Solid’s `batch` take an explicit call; outside one, a write flushes at once. Angular’s `effect` and Svelte’s `$effect` are not synchronous at all: they are *scheduled*.
- **The framework does, around events and by time.** Vue queues effects and flushes them once, in a microtask after the current code finishes (that is what `nextTick` waits for). Svelte 5 batches updates into a microtask, and offers `flushSync()` for the rare time you need the DOM updated *now*. Angular runs effects as part of change detection.

The second group makes the common case need no extra code, at a price you may have met: after `count = 1`, reading the DOM straight away shows the *old* page, until the framework gets its turn. It is the mirror image of chapter 1’s deferred layout: the browser also postpones work after your writes, but there a read forces it to catch up; here you read a frozen snapshot, and it is the library that decides when the snapshot is refreshed.

:::key
**Batching is the answer to “when does the update happen?”** The graph answers *what*; the batch boundary answers *when*. Every framework has chosen a boundary: the end of a `batch`, the end of an event handler, the next microtask, the next frame.
:::

## Effects that create effects

The second problem is about structure. A page is made of nested pieces, and each piece may have effects. When the outer piece changes, its inner pieces are replaced, and their effects must go with them.

Here is a *card* that shows one user and listens to a clock on that user’s behalf, so it contains an effect that reads the clock. When the user changes, the card’s own effect runs again, and creates a new clock listener for the new user. What happens to the old one?

::owner-lab{n="11.2"}

With **plain effects**, nothing happens to it. Every “Show the next user” adds a listener, and every tick runs all of them, including those for people who are no longer on the screen. The page is correct on its face (the right user is shown) and wrong underneath: work and memory grow with every navigation, and the stale handlers, which hold their own user’s data, may write the wrong thing to the screen. This is the signals version of the oldest leak in UI programming: the event listener you forgot to remove.

Switch to **owned effects**, and the card’s tree loses its old child every time. The rule that does it is small:

> Every effect, and every root, **owns** the effects and cleanup functions created while it ran. When it re-runs, or is disposed, it disposes everything it owns first.

An owner is whatever is *running when something is created*, and the engine tracks that with one more global variable, next to the `current` reaction of chapter 9:

```ts
let owner: Scope | null = null;     // who is running now

function effect(fn) {
  const scope = { cleanups: [] };
  owner?.cleanups.push(dispose);    // my parent will dispose me
  // on every run: run my cleanups first, then run fn with owner = scope
}

function onCleanup(fn) { owner!.cleanups.push(fn); }
```

`current` answers *whom do I notify?* and `owner` answers *who disposes me?* They are separate questions and they often have different answers: a computed read in an effect is tracked by that effect, but created by whichever function happened to be running.

Three tools come out of it, and every signals library has them under some name:

| Concept | Solid | Vue | Svelte 5 | Angular |
|---|---|---|---|---|
| Run something *and* collect what it creates | `createRoot` | `effectScope()` | `$effect.root` | an injection context (a component, a service) |
| Register a cleanup with the current owner | `onCleanup` | `onScopeDispose`, `onWatcherCleanup` | return a function from `$effect` | `DestroyRef.onDestroy`; `effect((onCleanup) => …)` |
| Dispose the owner | the root’s `dispose` | `scope.stop()` | the function `$effect.root` returns | the component is destroyed |

Note the Angular column. In Solid, Vue and Angular, a **component** is an owner: the framework creates a root for it, runs your setup code inside it, and disposes the root when the component leaves the screen. That is why a `watch` or `effect` in a component needs no manual stop. In Vue, the same call made in a timeout, after `setup` has finished, has no owner, and the effect never stops: the famous “*it keeps running after the component is gone*” bug is the one in the figure.

```predict
q: "A Solid-style component runs `createEffect(() => { const id = setInterval(refresh, rate()); })`, where `rate` is a signal the user can change. The user changes `rate` three times. How many intervals are running?"
options:
  - text: One, with the latest rate.
    why: "The effect re-runs when `rate` changes, but re-running an effect does not undo what the *previous* run started. `setInterval` is a side effect the engine knows nothing about; only a cleanup would stop it."
  - text: Four.
    correct: true
    why: "Every run starts an interval and nothing stops the previous ones: the initial run plus three changes make four, all calling `refresh`. The fix is `onCleanup(() => clearInterval(id))`, which the effect’s owner runs before each re-run and when the component is disposed."
  - text: None, because effects cannot start timers.
    why: "Effects exist to do this: to touch the world outside the graph. The graph knows nothing about what they start, which is why cleanups exist."
```

## Build it

Time to add both features to the engine of chapter 10. Both are small and both change shared state in a way you need to be careful about: `batch` changes *when* the flush happens, and ownership changes *what a re-run does first*.

```build
id: ownership-and-batching/owner
title: Add batch, onCleanup and ownership
prompt: |
  The engine below is chapter 10's solution (glitch-free, with a flush queue). Add three exports. `batch(fn)` runs `fn` with flushing suspended and flushes once when the outermost batch ends (batches nest, and the result of `fn` is returned). `onCleanup(fn)` registers a cleanup with whoever is running (an effect or a root), and throws if there is none. `createRoot(fn)` runs `fn(dispose)` as an owner and returns its result; `dispose()` runs the cleanups. Effects own what is created while they run: an effect created inside another effect is disposed when the outer one re-runs or is disposed, and an effect's cleanups run **before** each re-run and at disposal.
starter: |
  type Reaction = { mark(): void; run(): void; deps: Set<Source> };
  type Source = { subs: Set<Reaction> };

  let current: Reaction | null = null;
  const queue = new Set<Reaction>();
  let flushing = false;

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

  function flush(): void {
    if (flushing) return;
    flushing = true;
    try {
      while (queue.size) {
        const [next] = queue;
        queue.delete(next!);
        next!.run();
      }
    } finally {
      flushing = false;
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
        for (const r of [...source.subs]) r.mark();
        flush();
      },
    };
  }

  export function computed<T>(fn: () => T) {
    const source: Source = { subs: new Set() };
    let value!: T;
    let dirty = true;
    const reaction: Reaction = {
      deps: new Set(),
      mark() {
        if (dirty) return;
        dirty = true;
        for (const r of [...source.subs]) r.mark();
      },
      run() {},
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
      mark() {
        if (alive) queue.add(reaction);
      },
      run() {
        if (alive) track(reaction, fn);
      },
    };
    reaction.run();
    return () => {
      alive = false;
      queue.delete(reaction);
      for (const dep of reaction.deps) dep.subs.delete(reaction);
      reaction.deps.clear();
    };
  }

  export function batch<T>(fn: () => T): T {
    // TODO
    return fn();
  }

  export function onCleanup(fn: () => void): void {
    // TODO
  }

  export function createRoot<T>(fn: (dispose: () => void) => T): T {
    // TODO
    return fn(() => {});
  }
solution: |
  type Reaction = { mark(): void; run(): void; deps: Set<Source> };
  type Source = { subs: Set<Reaction> };
  /** What is cleaned up when an effect re-runs or a root is disposed. */
  type Scope = { cleanups: (() => void)[] };

  let current: Reaction | null = null;
  let owner: Scope | null = null;
  const queue = new Set<Reaction>();
  let flushing = false;
  let depth = 0;

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

  function runCleanups(scope: Scope): void {
    // Most recent first, like unwinding a stack.
    for (const fn of scope.cleanups.splice(0).reverse()) fn();
  }

  function flush(): void {
    if (flushing || depth > 0) return;
    flushing = true;
    try {
      while (queue.size) {
        const [next] = queue;
        queue.delete(next!);
        next!.run();
      }
    } finally {
      flushing = false;
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
        for (const r of [...source.subs]) r.mark();
        flush();
      },
    };
  }

  export function computed<T>(fn: () => T) {
    const source: Source = { subs: new Set() };
    let value!: T;
    let dirty = true;
    const reaction: Reaction = {
      deps: new Set(),
      mark() {
        if (dirty) return;
        dirty = true;
        for (const r of [...source.subs]) r.mark();
      },
      run() {},
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
    const scope: Scope = { cleanups: [] };
    const reaction: Reaction = {
      deps: new Set(),
      mark() {
        if (alive) queue.add(reaction);
      },
      run() {
        if (!alive) return;
        runCleanups(scope); // what the last run created or registered goes first
        const outer = owner;
        owner = scope;
        try {
          track(reaction, fn);
        } finally {
          owner = outer;
        }
      },
    };
    const dispose = () => {
      alive = false;
      queue.delete(reaction);
      runCleanups(scope);
      for (const dep of reaction.deps) dep.subs.delete(reaction);
      reaction.deps.clear();
    };
    owner?.cleanups.push(dispose); // my owner disposes me
    reaction.run();
    return dispose;
  }

  export function batch<T>(fn: () => T): T {
    depth++;
    try {
      return fn();
    } finally {
      if (--depth === 0) flush();
    }
  }

  export function onCleanup(fn: () => void): void {
    if (!owner) throw new Error('onCleanup outside an effect or a root');
    owner.cleanups.push(fn);
  }

  export function createRoot<T>(fn: (dispose: () => void) => T): T {
    const scope: Scope = { cleanups: [] };
    const outer = owner;
    const outerCurrent = current;
    owner = scope;
    current = null; // a root is not tracked by whoever created it
    try {
      return fn(() => runCleanups(scope));
    } finally {
      owner = outer;
      current = outerCurrent;
    }
  }
tests: |
  import { test, expect } from '@rx/test';
  import { signal, computed, effect, batch, onCleanup, createRoot } from './solution.ts';

  test('batch: two writes, one run, with the final values', () => {
    const a = signal(1);
    const b = signal(1);
    const seen: string[] = [];
    effect(() => void seen.push(`${a.get()}/${b.get()}`));
    batch(() => {
      a.set(2);
      b.set(2);
    });
    expect(seen).toEqual(['1/1', '2/2']);
  });

  test('without batch each write runs the effect', () => {
    const a = signal(1);
    const b = signal(1);
    const seen: string[] = [];
    effect(() => void seen.push(`${a.get()}/${b.get()}`));
    a.set(2);
    b.set(2);
    expect(seen).toEqual(['1/1', '2/1', '2/2']);
  });

  test('batches nest: only the outermost flushes', () => {
    const a = signal(0);
    const seen: number[] = [];
    effect(() => void seen.push(a.get()));
    batch(() => {
      batch(() => a.set(1));
      expect(seen).toEqual([0]); // the inner batch ended, but we are still in the outer one
      a.set(2);
    });
    expect(seen).toEqual([0, 2]);
  });

  test('a computed read inside a batch is up to date', () => {
    const a = signal(1);
    const double = computed(() => a.get() * 2);
    let inside = 0;
    batch(() => {
      a.set(5);
      inside = double.get();
    });
    expect(inside).toBe(10);
  });

  test('batch returns the function’s result, and still flushes if it throws', () => {
    const a = signal(0);
    const seen: number[] = [];
    effect(() => void seen.push(a.get()));
    expect(batch(() => 42)).toBe(42);
    expect(() =>
      batch(() => {
        a.set(1);
        throw new Error('boom');
      }),
    ).toThrow('boom');
    expect(seen).toEqual([0, 1]);
  });

  test('cleanups run before a re-run and at disposal', () => {
    const n = signal(0);
    const log: string[] = [];
    createRoot((dispose) => {
      effect(() => {
        const v = n.get();
        onCleanup(() => log.push(`cleanup ${v}`));
        log.push(`run ${v}`);
      });
      n.set(1);
      dispose();
    });
    expect(log).toEqual(['run 0', 'cleanup 0', 'run 1', 'cleanup 1']);
  });

  test('effects created inside an effect are disposed when it re-runs', () => {
    const outer = signal(0);
    const inner = signal(0);
    const log: string[] = [];
    effect(() => {
      const o = outer.get();
      effect(() => void log.push(`inner ${o}/${inner.get()}`));
    });
    outer.set(1);
    inner.set(1);
    expect(log).toEqual(['inner 0/0', 'inner 1/0', 'inner 1/1']);
  });

  test('disposing an effect disposes the effects it created', () => {
    const n = signal(0);
    let runs = 0;
    const stop = effect(() => {
      effect(() => void (n.get(), runs++));
    });
    stop();
    n.set(1);
    expect(runs).toBe(1);
  });

  test('a disposed root stops everything inside it', () => {
    const n = signal(0);
    let runs = 0;
    const dispose = createRoot((d) => {
      effect(() => void (n.get(), runs++));
      effect(() => void (n.get(), runs++));
      return d;
    });
    n.set(1);
    dispose();
    n.set(2);
    expect(runs).toBe(4);
  });

  test('onCleanup outside an effect or a root is an error', () => {
    expect(() => onCleanup(() => {})).toThrow();
  });

  test('a root created inside an effect does not read for that effect', () => {
    const n = signal(0);
    let outerRuns = 0;
    effect(() => {
      outerRuns++;
      createRoot(() => void n.get());
    });
    n.set(1);
    expect(outerRuns).toBe(1);
  });
hints:
  - "Keep a second module-level variable, `owner`, next to `current`. An effect sets it to its own scope while its function runs, so anything created or registered meanwhile is recorded in that scope."
  - "A child effect registers its own `dispose` in its owner’s list of cleanups. Then 'dispose what I created' and 'run my cleanups' are the same loop."
  - "Do not forget that `flush` must do nothing while `depth > 0`, and that `batch` flushes in a `finally`."
explain: "Two global variables now: `current` says whom a read should notify, and `owner` says who disposes whatever is created. The effect’s `run` does its cleanups first, so by the time the function runs again, everything the last run made is gone. Real implementations add details we left out: owners form a tree with parent pointers so context can be looked up, errors thrown inside an effect are routed to the nearest error boundary on the owner chain, and a disposed computed also unsubscribes from its sources."
```

## Why this is the heart of component models

Look at what an owner tree is: a tree of things created by a function, each of which will be thrown away when its parent is. That is a **component tree**, with another name. In Solid, a component is a function that is called *once*, under an owner, and everything in it (effects, computed values, event listeners released with `onCleanup`) belongs to that component’s node. When a conditional branch turns off, the engine disposes that branch’s owner, which disposes everything created inside it, down to the last timer. Vue’s `setup`, Angular’s injection context and a Svelte component’s effects work the same way.

This is the part that a virtual DOM gets for free and signals have to build. In a virtual DOM, every render creates a fresh description, and the old one is thrown away by the garbage collector; effects are attached to *component instances* that the renderer mounts and unmounts. In a signals library nothing is re-rendered, so something else must say *this chunk of the program is over*, and that is the owner.

:::programmer
**Where the leaks hide.** If an effect or computed is created *outside* any owner, nothing will ever dispose it, and the engine cannot tell you: it has no way to know the code was meant to be temporary. Solid prints “computations created outside a `createRoot` or `render` will never be disposed” in development, which is that very warning. The usual causes are asynchronous: code that runs *after* the owner has finished, in a `setTimeout`, a `fetch(...).then`, or after an `await`. In Solid, `runWithOwner` restores an owner; in Vue 3.5, `onWatcherCleanup` must be called synchronously in the watcher; in Angular, creating an `effect` outside an injection context throws.
:::

:::history{year=2012 title="The zombie listener"}
The problem is older than signals. Early Backbone applications created a view per model, and views registered listeners on models; removing a view from the page did not remove its listeners, so models kept dead views alive and calling their handlers, the *zombie view*. Backbone 0.9.9 (2012) added `listenTo` and `stopListening` so that a view could remember what it had subscribed to and release it all at once. :cite[backbone-docs] An owner is the same idea made general: not a view that remembers its listeners, but a scope that remembers everything created inside it.
:::

:::whatchanged
No new answer to *what changed*: the mechanism of chapters 9 and 10 stays as it was. What this chapter adds is the **lifetime** of the machinery: *when* an update happens (the batch boundary) and *when a piece of the graph stops existing* (the owner’s disposal). A virtual DOM reaches the same two ends with its render loop and its unmount.
:::

## What’s next

The engine is now complete enough to build a user interface on. Chapter 12 does it: a template compiler turns HTML into code that creates the nodes once and wires each dynamic hole to an effect. That is what Solid does, and what Svelte 5, Vue’s Vapor mode and Angular’s new templates do in their own ways.
