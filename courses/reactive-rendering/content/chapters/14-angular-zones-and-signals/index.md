---
title: 'Angular: zones, then signals'
summary: Angular does not track what changed. It checks everything, and a patched browser tells it when. Then it learned to be told, and signals let it skip the walk.
number: 14
duration: 60 minutes
prerequisites: [before-frameworks, vue-proxies-and-hints]
---

Everything in Part III so far has been about *discovering* what changed: a Proxy that records reads, a compiler that finds the holes. Angular’s answer for most of its life has been the opposite: **do not know**. Check the bindings, compare their values with the last ones, write what differs. Chapter 3 met this as AngularJS’s *digest cycle*. Modern Angular does it with a very different machine, and is now in the middle of replacing the part that decides *when*.

## The update block

An Angular template is compiled, ahead of time, into a function with two halves. Here is what Angular 22’s compiler (`ngc`) wrote for the counter of this course:

```js
template: function Counter_Template(rf, ctx) {
  if (rf & 1) {          // creation: runs once
    i0.ɵɵdomElementStart(0, "div", 0)(1, "h1");
    i0.ɵɵtext(2, "Counter");
    i0.ɵɵdomElementEnd();
    i0.ɵɵdomElementStart(3, "p");
    i0.ɵɵtext(4);
    i0.ɵɵdomElementEnd();
    i0.ɵɵdomElementStart(5, "button", 1);
    i0.ɵɵdomListener("click", function Counter_Template_button_click_5_listener() { return ctx.count.set(ctx.count() + 1); });
    i0.ɵɵtext(6, "+1");
    i0.ɵɵdomElementEnd()();
  }
  if (rf & 2) {          // update: runs on every change-detection pass
    i0.ɵɵadvance(3);
    i0.ɵɵclassProp("big", ctx.count() > 5);
    i0.ɵɵadvance();
    i0.ɵɵtextInterpolate1("Count: ", ctx.count());
  }
}
```

The first half (`rf & 1`, “creation mode”) builds the nodes, once, in a straight line of instructions with no virtual tree. The second half (`rf & 2`, “update mode”) is the part that matters here. It is a list of *bindings*: “set the class `big` to the value of this expression”, “set the text to this interpolation”. Each instruction **evaluates its expression, compares it with the value it stored on the last pass, and writes to the DOM only if it differs.** `ɵɵadvance(3)` moves a cursor to the right node, in the same spirit as `nextSibling`.

So the DOM writes are as minimal as in Solid, one text node when the count changes, but the *finding out* is different. There is no subscription. To know that `count()` changed, Angular has to *run the :term[update block]{id=update-block} and look*. The cost of an update is therefore:

> **the number of bindings in every view that is checked**, whether or not any of them changed.

(It is AngularJS’s watchers with the watchers compiled into straight-line code, and without the repeat-until-stable loop. A single top-down pass is usually enough, and development mode runs a second one to check that it was.)

Which views are checked, and *when*, are the two questions of this chapter.

## When: zone.js

If nothing tells Angular that something changed, how does it know when to run the pass? It cannot watch your code. What it can do is notice the **moments when your code gets to run**.

JavaScript in a browser runs in *tasks*: a click handler, a timer callback, a promise reaction, a `fetch` response. Between tasks, the program’s state cannot change; during one, it can. So the moment a task *finishes* is the moment to look. If every place where tasks start can be wrapped, Angular gets the signal for free.

That is **zone.js**. It replaces the browser’s asynchronous APIs, `setTimeout`, `addEventListener`, `Promise.prototype.then`, `XMLHttpRequest`, and dozens more, with versions that run your callback *inside a zone* and tell the zone when the callback is done. Angular listens to its zone, and when a task ends and no more work is queued, it runs :term[change detection]{id=change-detection} on the whole application. :cite[zonejs]

You do not need to take that on trust: it takes about twenty lines.

```build
id: angular-zones-and-signals/zone
title: Patch the browser so a task's end is observable
prompt: |
  Write `patch(host, onTaskEnd)`. `host` has `setTimeout(fn)` and `addEventListener(type, fn)` (a tiny stand-in for the browser). Replace both with versions that wrap the callback you are given, so that when the wrapped callback finishes, `onTaskEnd()` is called, even if it throws (the error must still propagate). If a wrapped callback runs *inside* another wrapped callback (a handler that calls into something that is also wrapped), only the outermost one calls `onTaskEnd`: nested tasks are one task. Everything else about `setTimeout` and `addEventListener` must still work: the callback receives the same arguments.
starter: |
  type Host = {
    setTimeout(fn: () => void, ms?: number): unknown;
    addEventListener(type: string, fn: (...args: any[]) => void): void;
  };

  export function patch(host: Host, onTaskEnd: () => void): void {
    // TODO: replace host.setTimeout and host.addEventListener with wrapping versions
  }
solution: |
  type Host = {
    setTimeout(fn: () => void, ms?: number): unknown;
    addEventListener(type: string, fn: (...args: any[]) => void): void;
  };

  export function patch(host: Host, onTaskEnd: () => void): void {
    let depth = 0;

    /** Run `fn` as a task: when the outermost one finishes, report it. */
    const wrap = <A extends unknown[]>(fn: (...args: A) => void) =>
      function (this: unknown, ...args: A) {
        depth++;
        try {
          return fn.apply(this, args);
        } finally {
          if (--depth === 0) onTaskEnd();
        }
      };

    const originalSetTimeout = host.setTimeout.bind(host);
    const originalAddEventListener = host.addEventListener.bind(host);
    host.setTimeout = (fn, ms) => originalSetTimeout(wrap(fn), ms);
    host.addEventListener = (type, fn) => originalAddEventListener(type, wrap(fn));
  }
tests: |
  import { test, expect } from '@rx/test';
  import { patch } from './solution.ts';

  function makeHost() {
    const timers: (() => void)[] = [];
    const listeners: Record<string, ((...a: any[]) => void)[]> = {};
    return {
      setTimeout(fn: () => void, _ms?: number) {
        timers.push(fn);
        return timers.length;
      },
      addEventListener(type: string, fn: (...a: any[]) => void) {
        (listeners[type] ??= []).push(fn);
      },
      runTimers() {
        while (timers.length) timers.shift()!();
      },
      fire(type: string, ...args: any[]) {
        for (const l of listeners[type] ?? []) l(...args);
      },
    };
  }

  test('a timer callback runs, then the task-end hook', () => {
    const host = makeHost();
    const log: string[] = [];
    patch(host, () => log.push('task end'));
    host.setTimeout(() => log.push('timer'));
    host.runTimers();
    expect(log).toEqual(['timer', 'task end']);
  });

  test('an event listener runs with its arguments, then the hook', () => {
    const host = makeHost();
    const log: string[] = [];
    patch(host, () => log.push('task end'));
    host.addEventListener('click', (e: { x: number }) => log.push(`click ${e.x}`));
    host.fire('click', { x: 7 });
    expect(log).toEqual(['click 7', 'task end']);
  });

  test('every task gets its own hook call', () => {
    const host = makeHost();
    let ends = 0;
    patch(host, () => ends++);
    host.setTimeout(() => {});
    host.setTimeout(() => {});
    host.runTimers();
    host.addEventListener('click', () => {});
    host.fire('click');
    expect(ends).toBe(3);
  });

  test('the hook runs even if the callback throws, and the error still propagates', () => {
    const host = makeHost();
    let ends = 0;
    patch(host, () => ends++);
    host.setTimeout(() => {
      throw new Error('boom');
    });
    expect(() => host.runTimers()).toThrow('boom');
    expect(ends).toBe(1);
  });

  test('nested wrapped callbacks are one task', () => {
    const host = makeHost();
    const log: string[] = [];
    patch(host, () => log.push('task end'));
    host.addEventListener('inner', () => log.push('inner'));
    host.addEventListener('outer', () => {
      log.push('outer start');
      host.fire('inner');
      log.push('outer end');
    });
    host.fire('outer');
    expect(log).toEqual(['outer start', 'inner', 'outer end', 'task end']);
  });

  test('a timer scheduled inside a task is a separate task', () => {
    const host = makeHost();
    const log: string[] = [];
    patch(host, () => log.push('task end'));
    host.setTimeout(() => {
      log.push('first');
      host.setTimeout(() => log.push('second'));
    });
    host.runTimers();
    expect(log).toEqual(['first', 'task end', 'second', 'task end']);
  });
hints:
  - "A wrapper is a function that calls the original, then calls `onTaskEnd`. Use `try … finally` so a throw still reports."
  - "Share a depth counter between all wrappers: increment on the way in, decrement on the way out, and report only when it returns to zero."
explain: "Real zone.js does far more: it keeps a *tree* of zones, wraps promises and microtasks as well as macrotasks, tracks how many tasks are still pending so Angular can tell when the zone is *stable*, and propagates context (which zone am I in?) through async calls. But this is the core, and it is also the reason for zone.js's limits: it can only wrap APIs it knows about (new browser APIs must be patched in), it cannot patch native `async`/`await` (so Angular's build downlevels them to promises), and it makes every task end in a check, as the next figure shows."
```

When the zone says “a task ended”, Angular runs `ApplicationRef.tick()`, which walks the component tree from the root. Which brings us to the second question.

## Which: the whole tree, or only some

Angular’s components form a tree of **views**. A tick starts at the root view and, by default, *checks every view*: it runs each view’s update block, comparing every binding. That is a bounded and predictable cost, and with a thousand-binding application it takes a millisecond or two; with a hundred thousand it takes the frame.

Angular’s tool for narrowing the walk is **`OnPush`**: `changeDetection: ChangeDetectionStrategy.OnPush` on a component says *“do not re-check me unless I have been marked.”* A view with :term[OnPush]{id=onpush} is marked when:

- one of its inputs receives a different **reference** (not a mutated object: it compares with `===`);
- an event handler in it, or in a descendant, runs;
- you call `markForCheck()`, or an `async` pipe delivers a new value;
- a signal its template read changes (more on that in a moment).

A clean OnPush view is skipped together with **its entire subtree**, which is where the savings are. The figure models the tree of an app: 15 views and 62 bindings. Press the events in each combination, and look at what the walk visits.

::change-detection{n="14.1"}

Work through these:

1. **Default everywhere, zone.js on.** Every event, including an unrelated timer, re-evaluates all 62 bindings. Even `Unrelated timer`, which changes nothing in the app, runs the full tick: :term[zone.js]{id=zone-js} knows only that *a task ended*.
2. **OnPush everywhere.** The timer now re-evaluates only the root (3 bindings; the root here is a Default view, as in most apps, where a root component is rarely OnPush). A click in Row3 re-evaluates Row3 *and every ancestor* on the way down: 25 bindings, since `markForCheck` marks the whole path. The marking has to reach all the ancestors because the walk goes top-down, and a clean ancestor would hide the dirty row.
3. **Switch to zoneless.** The unrelated timer now causes **no check at all**: nothing notified Angular, so it did not look. This is the saving that zone-free Angular is after.
4. **The signal** is the interesting row. With OnPush and a signal read by Row3’s template: 7 bindings, Row3’s four plus the root’s three. The ancestors in between (Main and Table) are **walked through, not re-evaluated**: a signal does not mark them dirty, it only says “something below needs a visit”.

:::key
**Angular has two separate questions, and had one answer to both.** *When* to look (after every task, which is what zone.js is for) and *where* to look (the whole tree, narrowed by OnPush). Signals answer both: *when* is “a signal was written”, and *where* is “the views that read it”.
:::

## Signals and zoneless

Angular’s signals (introduced in version 16, 2023) are the same three primitives as chapter 9: `signal`, `computed`, `effect`, read by calling them (`count()`) and written with `.set` and `.update`. :cite[angular-signals] The part specific to Angular is what happens when a **template reads a signal**. Look at the compiled update block above: `ctx.count()` is called while the view is being checked, so the view becomes a *consumer* of the signal, like an effect, and when `count` is written the signal *notifies* the view, which marks itself and its ancestors for traversal. The tick that follows re-evaluates the bindings of views that were notified, and no others.

Once views are told when something they read has changed, nobody needs zone.js to guess. **Zoneless** change detection removes it and runs a tick only when notified: by a signal that a template reads, an event listener in a template, `markForCheck`, the `async` pipe, `setInput`, or a view being attached or removed. :cite[angular-zoneless] It was introduced as experimental in version 18, became stable in 20.2, and version 21 makes it the default for new applications, which is why there is almost no more `zone.js` in new Angular projects.

What it costs is the **discipline** that zone.js made unnecessary. In a zone application you can write `this.items = await fetch(…)` on a plain field and the screen updates, because the task ended and Angular checked. Without the zone, that assignment notifies no one and nothing happens. :term[Zoneless]{id=zoneless} code puts state in signals (or something that notifies, like `async`), which is the ergonomics that every library in this part has asked of its users.

:::programmer
**Why `ExpressionChangedAfterItHasBeenChecked` exists.** The pass goes top-down and one-way: parent bindings are evaluated before the children are created and checked. If a child’s code then changes something a *parent* binding already read, the parent’s DOM is stale, and nothing will fix it until the next tick. In development mode Angular runs the pass twice and throws if the second pass finds a different value. The error is a consequence of “check, don’t track”: a tracking system would simply have re-marked the parent. Signals avoid part of the problem, since a write notifies the views that read it, but a write made *during* a template’s evaluation is still an error.
:::

:::wild{framework="Angular" version="22"}
The compiled output above is from `@angular/compiler-cli` 22.2.3. Angular’s signal graph is its own implementation, shared as `@angular/core/primitives/signals`, and is built on version counters: each producer has a version, and each consumer remembers the versions it saw. A consumer that is notified polls its producers’ versions before it recomputes. That is the “dirty or check” scheme of chapter 10, with numbers instead of colours. Angular also has `linkedSignal` (a computed that can be written), `resource` (an async signal), and `effect`, which runs as part of change detection, not immediately on write.
:::

```numeric
id: angular-zones-and-signals/bindings
title: Counting bindings
prompt: |
  In the sample app of the figure (every view OnPush except the root, which is Default), a click handler runs inside **Row3**. Row3 has 4 bindings, its parent Table has 10, Table's parent Main has 8, and the root App has 3. How many template bindings does the tick re-evaluate? Check your answer against the figure.
answer: 25
unit: bindings
tolerance: 0
explain: "An event in a view marks that view and every ancestor dirty, so all four views on the path are checked: App (3) + Main (8) + Table (10) + Row3 (4) = 25. The other rows, the header and the sidebar are OnPush and clean, so their subtrees are skipped. A signal read by Row3 instead of an event would check only App (Default) and Row3: 3 + 4 = 7."
```

:::history{year=2016 title="From digest to zones to signals"}
AngularJS (2010) put a watcher on every binding and looped until nothing changed (chapter 3). Angular 2 (2016) compiled the watchers into straight-line update code, and needed a way to know when to run it: it took **zone.js**, written for Angular by Brian Ford and modelled on Dart’s zones, which wrapped the browser’s asynchronous APIs. :cite[zonejs] `OnPush` (2016) was the first escape from checking everything. In May 2023 Angular 16 shipped signals in developer preview, the library arriving after Solid, Preact and Vue had shown the model, and the stated aim was to make zone.js optional. Zoneless change detection followed: experimental in 18 (2024), developer preview in 20 (2025), stable in 20.2, and default for new applications in 21.
:::

:::whatchanged
For *dirty-check* in Angular: **every binding of every view that is checked**, found out by running the compiled update block and comparing with the last values. The *where* has narrowed from the whole tree to OnPush and signal-notified views, and the *when* from “after every task” to “when notified”. Angular began as the example of checking and is becoming a signals framework with the old machinery as the fallback.
:::

## What’s next

Angular’s signals, Solid’s, Vue’s refs, Preact’s, Svelte’s: they are all the same three primitives with different spellings, and each library has its own copy of the engine. Chapter 15 looks at the attempt to agree on one: the TC39 **Signals** proposal, and what it takes to write an `effect` from a standard `Watcher`.
