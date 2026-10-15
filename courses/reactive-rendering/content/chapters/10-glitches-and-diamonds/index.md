---
title: Glitches and diamonds
summary: The engine from chapter 9 can show an effect a state that never existed. Break it on purpose, then fix it three ways, and learn what the fixes cost.
number: 10
duration: 55 minutes
prerequisites: [signals-from-scratch]
---

The engine you wrote in chapter 9 passes every test you were given, and it has a bug. The bug is not in any line. It is in the *order*: when a signal is written, what happens first, and what happens next.

## A state that never existed

Here is the smallest graph that shows it. A signal `a` feeds two computed values, `b = 2a` and `c = 3a`. A third, `d = b + c`, reads both. An effect logs `d`. The graph has the shape of a :term[diamond]{id=diamond}, and it has an invariant you can check by eye: whatever `a` is, `d` is `5a`.

```ts
const a = signal(1);
const b = computed(() => a.get() * 2);
const c = computed(() => a.get() * 3);
const d = computed(() => b.get() + c.get());
effect(() => console.log(d.get()));   // 5
a.set(2);                             // 10 … but what is logged in between?
```

Run it in the lab. The default strategy, *Eager push*, is the chapter 9 design: writing a signal tells its subscribers at once, and they recompute at once. Press the button and read the log of what the effect saw.

::graph-lab{n="10.1"}

The effect logs `5`, then `7`, then `10`. The value **7** is `4 + 3`: the new `b` added to the *old* `c`. There was never a moment when `a` was 1 and `b` was 4, or `a` was 2 and `c` was 3. The effect saw a state that no consistent version of the program ever had. This is called a **:term[glitch]{id=glitch}**, a term from circuit design, where a signal flickers through a wrong value while two paths settle.

Replay the trace. Use the slider to step through what the engine did, and watch the order:

1. `a` is written.
2. `a` tells its first subscriber, `b`. `b` marks itself dirty and tells **its** subscriber, `d`. `d` marks itself dirty and tells the effect.
3. The effect runs. It reads `d`, which is dirty, so `d` recomputes. It reads `b` (dirty: recompute, `4`) and `c`, which has not yet been told anything about `a`, so it is still clean, and returns its cached `3`.
4. Only now does `a` get round to its *second* subscriber, `c`.
5. `c` marks `d` dirty, `d` tells the effect, and the effect runs a second time, correctly.

The effect ran too early, because the engine was still in the middle of telling people about a change.

For a log line the harm is a wrong number for a moment. In a user interface it can be worse: an effect that ran on `a = 2, c = 3` may divide by something that is zero in the intermediate state, request data with a nonsense pair of parameters, or draw one frame in which a total does not equal the sum of its parts. And the work is wasted too: `d` and the effect ran twice for one write. Make a ladder of diamonds, one stacked on top of another, and the waste multiplies.

```numeric
id: glitches-and-diamonds/ladder
title: A ladder of diamonds
prompt: |
  Stack five diamonds: `a` feeds `b₁` and `c₁`, which feed `d₁`; then `d₁` feeds `b₂` and `c₂`, which feed `d₂`; and so on up to `d₅`. Using **eager push**, how many times does `d₅` recompute when `a` is written once? (Try 1, 2 and 3 diamonds in your head or on paper: the pattern is already there.) With either glitch-free strategy the answer is 1.
answer: 32
unit: recomputations
tolerance: 0
explain: "Each recomputation of `d₁` tells both `b₂` and `c₂`, and *each* of those tells `d₂`, so `d₂` recomputes twice for every time `d₁` does. One diamond: `d₁` runs twice. Two: `d₂` runs four times. Doubling per diamond, five diamonds give 2⁵ = 32. The engine in the lab shows 2, 4, 8 for three diamonds. The cost is exponential in the depth, for a graph whose size is linear, and every intermediate run is also a glitch."
```

## The cause: telling and running at the same time

The engine does two jobs in one motion: it **notifies** (this value is out of date) and it **recomputes** (here is the new value). Notifications travel depth-first along the edges, and each effect they reach runs on the spot, so it runs before notification has finished spreading. Any fix has to separate the two jobs, so that nothing recomputes until every node that *will* be out of date is known to be.

There are three well-known ways to do it.

## Fix 1: sort by height

Give every node a **height**: sources are at 0, and a computed node is one higher than the tallest node it reads. In the diamond, `a` is 0, `b` and `c` are 1, `d` is 2. When a source changes, collect the nodes that need recomputing into a queue ordered by height, and always run the lowest first. Then `b` and `c` both run before `d`, and `d` runs once, after both. This is *:term[topological order]{id=topological-order}*, and it was the standard answer of the reactive-programming literature. :cite[bainomugisha-2013]

Switch the figure to *Topological* and press the button. The log shows `5, 10`.

The price is paid elsewhere. The queue holds every node downstream of the write, and every one of them recomputes, whether anyone reads it or not. The node `x = 100a` has no readers: the effect never sees it, and no one else does. Topological order still computes it on every write. And heights must be kept up to date when dependencies change at run time, which is the case for any `IF` from chapter 9.

Now switch the graph to *:term[Cut-off]{id=cutoff}* and press `n = n + 2`. The value `n` changes, but `even` does not: it is `true` before and after. Topological still re-runs the effect that reads it, because the effect was downstream. The next fix handles this.

## Fix 2: mark first, compute on demand

Look at what is wrong with the first design: effects run before marking is finished. Do the marking *first*, as a separate pass, and only afterwards run the effects, which pull the values they need.

```ts
function set(next) {
  value = next;
  for (const r of subscribers) r.markStale();   // phase 1: notify only, run nothing
  flushEffects();                               // phase 2: run what was queued
}
```

In phase 1, `a` marks `b` and `c`, and each marks `d`, and `d` queues the effect; nobody recomputes anything. In phase 2, the effect runs and reads `d`, which is stale, so `d` recomputes by reading `b` (stale, so recompute) and `c` (stale, so recompute). Everything an effect can read has already been marked, so it can only read consistent values. And a computed is recomputed only if something reads it: `x`, which nobody reads, is marked and never run.

You will write this change in a moment. It is the smallest change that makes the engine correct: mark on write, compute on read. But it has one more problem.

## Fix 3: mark *maybe*, then check

If `n` changes from 2 to 4 and `even` is a computed that depends on it, then with Fix 2 everything downstream of `even` is marked stale. When the effect runs and recomputes `even`, the result is `true` again: unchanged. All the work downstream was needless, and the effect has run for nothing.

The way out is to mark two kinds of staleness:

- **dirty**: a source I read *did* change; I must recompute.
- **check**: something far upstream *may* have changed; I do not know yet.

The writer marks its direct subscribers dirty and everything further downstream *check*. Then, when a node is read:

- a **dirty** node recomputes;
- a **check** node first asks its sources, in order, to bring themselves up to date. If one of them *did* change, the node becomes dirty and recomputes; if none changed, it is clean again without running at all.

When a recomputation produces an equal value, it stops the spread: its own subscribers, marked *check*, will find their source unchanged and skip. This is a **cut-off**.

Switch the figure to *Three colours*, set the graph to *Cut-off*, and press `n = n + 2`. The trace shows `p` marked dirty and the effect marked check; `p` runs, gets `"even"` again, and the effect is *skipped*: it never ran. Press `n = n + 1`: `p` changes, so the effect runs.

This three-state scheme, *clean / check / dirty*, is the core of **Reactively** (Milo Mighdoll, 2022), whose small size and published benchmarks made it the reference for the design, :cite[reactively] and variants of it run in the modern signals libraries. Solid 2’s core has `REACTIVE_CHECK` and `REACTIVE_DIRTY` flags; Vue 3.6’s reactivity core (built on `alien-signals`) has `Dirty` and `Pending`; MobX has `STALE` and `POSSIBLY_STALE`; Angular’s and Preact’s signals keep a version number per source and compare it with what the reader last saw. The bookkeeping differs, but the question each asks is the same: *did a source really change?*

## Fix the engine

Chapter 9’s engine is below, in full. It passes all of its old tests, and it glitches. Make it correct, using the two-phase idea of Fix 2: reactions get a `mark()` that only passes the news on, and `run()` that does the work. `set` marks everything first and then flushes the queue of effects.

```build
id: glitches-and-diamonds/two-phase
title: Make the engine glitch-free
prompt: |
  The engine below is chapter 9's solution. It glitches on a diamond: an effect can run while some of its sources are stale. Fix it with two phases. Writing a signal must first **mark** everything downstream, running nothing, and then **flush** the effects that were queued, each at most once. A computed's `mark` flags it dirty and marks its own subscribers; an effect's `mark` puts it in a queue. Effects that write to signals while flushing must still work (the nested write queues more effects, flushed by the same loop). Computed values stay lazy: a computed that nothing reads must never recompute.
starter: |
  type Reaction = { mark(): void; run(): void; deps: Set<Source> };
  type Source = { subs: Set<Reaction> };

  let current: Reaction | null = null;

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
        // Tells each subscriber and lets it run right away: this is the bug.
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
      mark() {},
      run() {
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
      mark() {},
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
solution: |
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

  /** Phase 2: run queued effects until none are left. */
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
        for (const r of [...source.subs]) r.mark(); // phase 1: only say that things are stale
        flush(); // phase 2: now run
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
tests: |
  import { test, expect } from '@rx/test';
  import { signal, computed, effect } from './solution.ts';

  test('the diamond: the effect only ever sees consistent values', () => {
    const a = signal(1);
    const b = computed(() => a.get() * 2);
    const c = computed(() => a.get() * 3);
    const d = computed(() => b.get() + c.get());
    const seen: number[] = [];
    effect(() => void seen.push(d.get()));
    a.set(2);
    a.set(3);
    expect(seen).toEqual([5, 10, 15]);
  });

  test('d recomputes once per write, not once per path', () => {
    const a = signal(1);
    const b = computed(() => a.get() * 2);
    const c = computed(() => a.get() * 3);
    let runs = 0;
    const d = computed(() => (runs++, b.get() + c.get()));
    effect(() => void d.get());
    a.set(2);
    expect(runs).toBe(2); // the first run, plus one
  });

  test('an effect that reads both paths itself runs once per write', () => {
    const a = signal(1);
    const b = computed(() => a.get() + 1);
    const c = computed(() => a.get() + 2);
    let runs = 0;
    effect(() => void (b.get(), c.get(), runs++));
    a.set(5);
    expect(runs).toBe(2);
  });

  test('a longer diamond: a → b → c and a → c', () => {
    const a = signal(1);
    const b = computed(() => a.get() + 1);
    const c = computed(() => b.get() * 10 + a.get());
    const seen: number[] = [];
    effect(() => void seen.push(c.get()));
    a.set(2);
    expect(seen).toEqual([21, 32]);
  });

  test('a computed nobody reads is never recomputed', () => {
    const a = signal(1);
    let runs = 0;
    const unread = computed(() => (runs++, a.get() * 100));
    void unread;
    a.set(2);
    a.set(3);
    expect(runs).toBe(0);
  });

  test('an effect that writes a signal triggers the effects that read it', () => {
    const a = signal(1);
    const b = signal(0);
    const seen: number[] = [];
    effect(() => b.set(a.get() * 10));
    effect(() => void seen.push(b.get()));
    a.set(2);
    expect(seen).toEqual([10, 20]);
  });

  test('a disposed effect that is already queued does not run', () => {
    const a = signal(1);
    let runs = 0;
    let stop = () => {};
    effect(() => {
      if (a.get() === 2) stop(); // runs first, while the other effect is still waiting in the queue
    });
    stop = effect(() => void (a.get(), runs++));
    a.set(2);
    expect(runs).toBe(1);
  });

  test('dependencies are still dynamic', () => {
    const flag = signal(true);
    const x = signal(1);
    const y = signal(1);
    const seen: number[] = [];
    effect(() => void seen.push(flag.get() ? x.get() : y.get()));
    y.set(2);
    flag.set(false);
    x.set(9);
    expect(seen).toEqual([1, 2]);
  });
hints:
  - "Split the old `run` into two jobs: `mark` passes the news downstream and does nothing else; `run` recomputes. A computed never needs `run`: it recomputes when somebody reads it."
  - "Use a `Set` for the queue so an effect reached by two paths is queued once, and a `flushing` flag so that a write inside an effect does not start a second, nested flush."
explain: "The diamond is correct because by the time any effect runs, every node that can be out of date has already been marked, so a read recomputes from fresh sources. Two details are easy to forget. The queue is a Set so one effect reached by two paths runs once; and `flush` is guarded so a write made by an effect adds to the queue that is already being drained instead of starting a second pass in the middle of the first. What it still lacks: a computed that recomputes to an *equal* value marks its subscribers anyway (no cut-off), and writing two signals in a row runs effects twice (batching, chapter 11)."
```

## What the three fixes cost

| | Glitch-free | Does work nobody reads | Stops at equal values | Typical use |
|---|---|---|---|---|
| Eager push | no | yes | no | simple observers; event emitters |
| Topological queue | yes | yes (every downstream node) | no | spreadsheets, FRP libraries |
| Mark, then pull | yes | no | no | this chapter’s exercise |
| Dirty / check, then pull | yes | no | yes | Reactively, Solid, MobX, Vue 3.4+, Angular, Preact |

The table’s last row is the answer the field has converged on, and with *:term[push-pull]{id=push-pull}* it is the right name: **push** the news that something is stale; **pull** the values on demand. Writes cost in proportion to the part of the graph downstream of them; reads recompute only what they must.

:::key
**A write is two things.** *Say that things are out of date* (cheap, eager, mark-only) and *bring them up to date* (expensive, lazy, on demand). Glitches come from doing the second while still doing the first.
:::

:::programmer
**Seeing it in real libraries.** Make the diamond with Solid’s `createMemo`, Vue’s `computed`, Preact’s `computed` or Angular’s `computed` and log the effect: all print `5, 10`. Make it with RxJS `combineLatest(b$, c$)` and subscribe: the subscriber is called with the intermediate pair as well, because observables are eager push. RxJS and signals solve different problems (streams of events against values that are always defined), and glitches are a reason signals exist as a separate primitive.
:::

:::history{year=2022 title="Reactively, and the convergence"}
For many years each library had its own answer to the diamond. Vue 2 flushed watchers from an asynchronous queue sorted by creation order, which usually avoided glitches by running things late; Solid 1 had its own “stale” and “pending” marking. In 2022 Milo Mighdoll published **Reactively**, a very small library built on the clean / check / dirty scheme, with benchmarks showing that it could be both simple and fast. :cite[reactively] Other libraries were moving the same way (Preact Signals, Angular signals, `alien-signals`), and the three-state scheme became the usual way to explain, and to build, a push-pull core.
:::

:::whatchanged
Still: **whatever read the signal that was written**. This chapter adds the rule for *when*: nothing runs until the whole set of stale nodes is known, and nothing runs that no one reads. A node that recomputes to an equal value tells its readers there is nothing to do.
:::

## What’s next

The engine now answers *what changed* correctly. Three practical problems remain before a UI can be built on it: writing two signals back-to-back runs an effect twice; an effect created inside another effect is never cleaned up; and effects that allocate things (timers, listeners) must free them. Chapter 11 adds *batching* and *ownership*.
