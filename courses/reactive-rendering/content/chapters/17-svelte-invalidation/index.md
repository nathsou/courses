---
title: Svelte 4, and the compiler that invalidates
summary: Svelte 3 and 4 answered "what changed?" before the page ran. The compiler numbers each variable, turns every assignment into a bit, and writes an update function made of bit tests.
number: 17
duration: 55 minutes
prerequisites: [templates-and-solid, lit-templates]
---

There are now three ways in the course to find out *what changed*, and each costs something somewhere:

- **Compare** the new output with the old (the virtual DOM, Lit’s parts).
- **Record reads** at run time and notify (signals, Vue).
- **Check everything** after any event (Angular’s default).

Svelte, from 2016, took a fourth road, and in versions 3 and 4 (2019 to 2023) it was its identity: **let the compiler do it, and leave almost nothing for the runtime.** :cite[harris-rethinking]

## What a compiler can see

Consider a component:

```html
<script>
  let count = 0;
  $: double = count * 2;
</script>

<div class="counter">
  <h1>Counter</h1>
  <p class:big={count > 5}>Count: {count} (double {double})</p>
  <button on:click={() => count += 1}>+1</button>
</div>
```

The compiler reads this file in full. It knows every variable declared in the script, and it can find *every assignment to them*: the `count += 1` in the handler is an assignment to `count`, written in the same file. It also knows which pieces of the template mention which variable: the first text node uses `count`; the second uses `double`; the class toggle uses `count`.

So it can answer *what depends on what* **statically**, before the program runs: there is no need to discover it through reads at run time, as signals do. What remains for run time is just: *“which variable was assigned?”*, which it can arrange to learn at the moment of assignment, by *rewriting the assignment*:

```js
// you wrote:                 // the compiler writes:
count += 1                    $$invalidate(0, count += 1)
```

`$$invalidate(0, …)` says “variable number 0 has a new value”. That is the entire reactive primitive. Everything else is the **update function** the compiler writes from the template, which tests those numbers.

Try it. The component below is the real output of Svelte 4.2.19’s compiler, running on the lab’s runtime. Each variable is one bit (`count` is bit 0, `double` is bit 1). Press the button and read which lines of the update function ran.

::dirty-bits{n="17.1"}

Look at the right-hand code. When you click `+1`, the handler invalidates `count`, so bit 0 is set. Then something else sets bit 1: `double`. That is the `$:` line, which the compiler has turned into a function that runs before each update and invalidates `double` whenever `count` is dirty. The flush then runs `p`, the update function, with the mask `0b11`: both `if` blocks run, and so does the class toggle, which also tests bit 0.

Then press **three times in one tick**: three :term[invalidations]{id=invalidation}, **one** flush. The assignments only set bits and schedule a flush (in a microtask, in the browser); `p` runs once, with the final values. This is chapter 11’s batching, built into the compiler’s runtime: the update is a function of the *final* state, never of the intermediate ones.

## The shape of the output

Here is the whole thing the compiler wrote, trimmed to its structure. The real output is in the course repository, in `docs/captured/svelte4.counter.js`, and the figure above runs it.

```js
function create_fragment(ctx) {
  let div, h1, t1, p, t2, t3, t4, t5, t6, t7, button;
  return {
    c() { /* create:  element("div"), text("Count: "), text(ctx[0]) ... */ },
    m(target, anchor) { /* mount:   insert(target, div, anchor); append(div, h1) ... */ },
    p(ctx, [dirty]) { /* update */
      if (dirty & /*count*/ 1) set_data(t3, ctx[0]);
      if (dirty & /*double*/ 2) set_data(t5, ctx[1]);
      if (dirty & /*count*/ 1) toggle_class(p, "big", ctx[0] > 5);
    },
    d(detaching) { /* destroy: detach(div) ... */ }
  };
}

function instance($$self, $$props, $$invalidate) {
  let double;
  let count = 0;
  const click_handler = () => $$invalidate(0, count += 1);
  $$self.$$.update = () => {
    if ($$self.$$.dirty & /*count*/ 1) $$invalidate(1, double = count * 2);   // the $: line
  };
  return [count, double, click_handler];                                     // ctx: the numbered variables
}
```

A component is **two functions**:

- `instance` runs once and holds the component’s state. It returns `ctx`, an array in which each variable has its number.
- `create_fragment` returns an object with four methods, **c**reate, **m**ount, **u**p**d**ate (`p`) and **d**estroy, which are the lifecycle of the DOM the component owns.

There is no tree. The text nodes `t3` and `t5` are plain local variables, and `p` writes to them. The `set_data` function compares with the node’s old text and writes only if different. For one component, the cost of an update is **the number of :term[bit tests]{id=bitmask}**, which is the number of dependencies in the template, with a DOM write for each one that fires.

:::key
**The compiler turns “what changed?” into a number.** The runtime never discovers dependencies. They were written into `p` as bit tests by a compiler that read your code. What the runtime does is keep the one integer per component, `dirty`, which says which variables were assigned since the last flush.
:::

## Lists

A loop in the template becomes a *block*: a small fragment per item, with its own `c`, `m`, `p` and `d`.

```html
<ul>{#each items as item}<li>{item}</li>{/each}</ul>
```

With no `key`, blocks are matched **by position**, like Lit’s arrays and chapter 5’s index algorithm: the *i*th block is updated with the *i*th item. Here is the real compiled update:

```js
p(ctx, [dirty]) {
  if (dirty & /*items*/ 1) {
    each_value = ensure_array_like(ctx[0]);
    let i;
    for (i = 0; i < each_value.length; i += 1) {
      const child_ctx = get_each_context(ctx, each_value, i);
      if (each_blocks[i]) {
        each_blocks[i].p(child_ctx, dirty);          // update the existing block with the new item
      } else {
        each_blocks[i] = create_each_block(child_ctx);   // a new block for an extra item
        each_blocks[i].c();
        each_blocks[i].m(ul, null);
      }
    }
    for (; i < each_blocks.length; i += 1) each_blocks[i].d(1);   // destroy the surplus
    each_blocks.length = each_value.length;
  }
}
```

Reverse the list and each block’s `p` finds a different string and rewrites its text. With `{#each items as item (item.id)}` the compiler uses a keyed variant that matches blocks by key and moves their DOM, as in chapter 5. (The lab’s keyed version reuses chapter 5’s algorithm. Svelte’s own is a simpler pair of scans that may make more moves than the optimal ones, which is why the Notes app’s *Compile* pane and the benchmark of chapter 24 differ in the details.) Note that an `{#each}` block always runs when `items` is dirty, *whatever* about it changed: the compiler cannot see inside the array.

## What the compiler cannot see

A static analysis is exactly as good as what it can see, and that has three consequences, which anyone who used Svelte 3 or 4 knows by heart.

**Assignments only.** The compiler rewrites *assignments* in the component. It does not see a method call that mutates an array in place:

```js
items.push('x');          // no assignment: no $$invalidate: nothing updates
items = [...items, 'x'];  // an assignment: updates
items = items;            // also works: it is just a way of saying "I changed it"
```

```debug
id: svelte-invalidation/push
title: The list that does not grow
prompt: "In Svelte 4, pressing *Add* appends an item to the array (a `console.log` shows it has grown), but the list on the page does not change. Click the line responsible."
lang: svelte
code: |
  <script>
    let items = ['a', 'b'];
    function add() {
      items.push('c');
      console.log(items.length);
    }
  </script>

  <ul>
    {#each items as item}
      <li>{item}</li>
    {/each}
  </ul>
  <button on:click={add}>Add</button>
answer:
  line: 4
notes:
  2: "The declaration is fine; the compiler gives `items` a number and writes the update code for the `{#each}`."
  5: "`console.log` neither changes nor invalidates anything."
  14: "The handler is fine: it calls `add`, which is a function in the component that the compiler sees. What it does inside matters."
explain: "`items.push('c')` mutates the array and contains no assignment, so the compiler had nothing to rewrite into `$$invalidate(0, …)`. Nothing is marked dirty, so no update runs. The fix is to assign: `items = [...items, 'c']`, or `items.push('c'); items = items;`. (Svelte 5’s `$state` proxies arrays, so `push` is reactive; see the next chapter.)"
hints:
  - "What would the compiler have had to see in this function to know that `items` changed?"
```

**Dependencies of `$:` are read off the text.** The compiler works out that `$: double = count * 2` depends on `count` by looking for variable names *in that statement*. A call to a function that reads other variables hides them:

```js
let count = 0, factor = 3;
const scaled = () => count * factor;
$: total = scaled();      // depends on... nothing the compiler can see: it only sees `scaled`
```

```predict
q: "Given the `$:` statement above, what happens when `count` is assigned a new value?"
options:
  - text: "`total` is recomputed, because `scaled` reads `count`."
    why: "That is what a signals library would do: `scaled` runs inside the tracking scope and its reads are recorded. The Svelte 4 compiler only reads the *statement's text*."
  - text: "`total` is not recomputed, unless `scaled` itself is assigned."
    correct: true
    why: "The statement `total = scaled()` mentions one variable that could change, `scaled`, which is a constant. With nothing to depend on, the compiler runs it once at the start. The standard fix is to pass the values in, so they appear in the text: `$: total = scaled(count, factor)`."
  - text: "It throws an error at compile time."
    why: "It compiles without a warning. This is one of the quiet traps of the design."
```

**Reactivity belongs to `.svelte` files.** `$$invalidate` is inserted by the compiler *in components*. A plain `.js` module with a counter variable has no such rewriting, and a function in a module cannot be made reactive. Svelte 3 and 4 solved this with **stores** (`writable`, with `$store` syntax in components for auto-subscription), but the rule remained: reactive *logic* lives in components, and logic outside has to use a different mechanism. This restriction, more than any performance concern, is why Svelte 5 replaced the design with signals (chapter 18).

## Build it

The runtime half of the design is small. Write the scheduler: given components with a `ctx` and a `dirty` mask, implement `invalidate` and `flush`.

```build
id: svelte-invalidation/scheduler
title: Write $$invalidate and the flush
prompt: |
  Implement `createRuntime(schedule)`, returning `{ invalidate, flush }`. A component is `{ ctx: any[]; dirty: number[]; p(ctx, dirty): void }`, with `dirty` starting as `[-1]` (the sentinel for *clean*). `invalidate(component, i, value)` stores `value` in `ctx[i]` and returns it; if `safeNotEqual(old, value)` (given), it marks bit `i` dirty: the first mark of a clean component resets its mask to zeros, adds it to the list of dirty components and calls `schedule(flush)` (once per batch, not once per mark); bit `i` lives in word `Math.floor(i / 31)` at position `i % 31`. `flush()` calls each dirty component's `p(ctx, dirty)` once with its mask and leaves the component clean again (`dirty = [-1]`).
starter: |
  export interface Component {
    ctx: any[];
    dirty: number[];
    p(ctx: any[], dirty: number[]): void;
  }

  // Objects are always "changed": a mutation in place would otherwise go unnoticed. Primitives are compared.
  const safeNotEqual = (a: unknown, b: unknown) => (a != a ? b == b : a !== b || (a !== null && typeof a === 'object') || typeof a === 'function');

  export function createRuntime(schedule: (job: () => void) => void) {
    function invalidate(component: Component, i: number, value: unknown): unknown {
      // TODO
      component.ctx[i] = value;
      return value;
    }
    function flush(): void {
      // TODO
    }
    return { invalidate, flush };
  }
solution: |
  export interface Component {
    ctx: any[];
    dirty: number[];
    p(ctx: any[], dirty: number[]): void;
  }

  const safeNotEqual = (a: unknown, b: unknown) => (a != a ? b == b : a !== b || (a !== null && typeof a === 'object') || typeof a === 'function');

  export function createRuntime(schedule: (job: () => void) => void) {
    const dirtyComponents: Component[] = [];
    let scheduled = false;

    function makeDirty(component: Component, i: number): void {
      if (component.dirty[0] === -1) {
        dirtyComponents.push(component);
        if (!scheduled) {
          scheduled = true;
          schedule(flush);
        }
        component.dirty.fill(0);
      }
      component.dirty[(i / 31) | 0]! |= 1 << i % 31;
    }

    function invalidate(component: Component, i: number, value: unknown): unknown {
      const old = component.ctx[i];
      component.ctx[i] = value;
      if (safeNotEqual(old, value)) makeDirty(component, i);
      return value;
    }

    function flush(): void {
      scheduled = false;
      for (const component of dirtyComponents.splice(0)) {
        const dirty = component.dirty;
        component.dirty = [-1];
        component.p(component.ctx, dirty);
      }
    }

    return { invalidate, flush };
  }
tests: |
  import { test, expect } from '@rx/test';
  import { createRuntime, type Component } from './solution.ts';

  function setup() {
    const jobs: (() => void)[] = [];
    const rt = createRuntime((job) => jobs.push(job));
    const calls: number[][] = [];
    const component: Component = { ctx: [0, 'a', 10], dirty: [-1], p: (_ctx, dirty) => void calls.push([...dirty]) };
    const run = () => jobs.splice(0).forEach((j) => j());
    return { rt, component, calls, jobs, run };
  }

  test('an assignment sets the variable’s bit and schedules one flush', () => {
    const { rt, component, calls, jobs, run } = setup();
    rt.invalidate(component, 0, 1);
    expect(jobs.length).toBe(1);
    expect(component.ctx[0]).toBe(1);
    run();
    expect(calls).toEqual([[1]]);
  });

  test('several assignments make one update with all the bits', () => {
    const { rt, component, calls, jobs, run } = setup();
    rt.invalidate(component, 0, 1);
    rt.invalidate(component, 1, 'b');
    rt.invalidate(component, 0, 2);
    expect(jobs.length).toBe(1);
    run();
    expect(calls).toEqual([[0b11]]);
  });

  test('an unchanged primitive is not an invalidation', () => {
    const { rt, component, jobs, run } = setup();
    rt.invalidate(component, 0, 0);
    expect(jobs.length).toBe(0);
    run();
  });

  test('an object is always considered changed', () => {
    const { rt, component, calls, run } = setup();
    const list: string[] = [];
    rt.invalidate(component, 2, list);
    run();
    calls.length = 0;
    list.push('x');
    rt.invalidate(component, 2, list);
    run();
    expect(calls).toEqual([[1 << 2]]);
  });

  test('the component is clean after the flush and can be dirtied again', () => {
    const { rt, component, calls, jobs, run } = setup();
    rt.invalidate(component, 0, 1);
    run();
    expect(component.dirty).toEqual([-1]);
    rt.invalidate(component, 1, 'z');
    expect(jobs.length).toBe(1);
    run();
    expect(calls).toEqual([[1], [2]]);
  });

  test('variables beyond 30 use the next word of the mask', () => {
    const { rt, component, calls, run } = setup();
    component.ctx = Array.from({ length: 40 }, () => 0);
    rt.invalidate(component, 35, 1);
    run();
    expect(calls).toEqual([[0, 1 << 4]]);
  });

  test('two components are each updated once, in the order they were dirtied', () => {
    const { rt, jobs, run } = setup();
    const order: string[] = [];
    const a: Component = { ctx: [0], dirty: [-1], p: () => void order.push('a') };
    const b: Component = { ctx: [0], dirty: [-1], p: () => void order.push('b') };
    rt.invalidate(b, 0, 1);
    rt.invalidate(a, 0, 1);
    rt.invalidate(b, 0, 2);
    expect(jobs.length).toBe(1);
    run();
    expect(order).toEqual(['b', 'a']);
  });
hints:
  - "A clean component has `dirty[0] === -1`. The first invalidation must replace that sentinel with zeros (`fill(0)`) before setting any bit, or the `-1` would have every bit set."
  - "`schedule(flush)` is called once while a flush is pending: keep a `scheduled` flag, and reset it at the start of `flush`."
explain: "This is `$$invalidate`, `make_dirty` and `flush` from `svelte/internal`, with the components' own `update` functions left out. The mask is split into 31-bit words so that bit operations stay on small positive integers in JavaScript engines. Note what is *not* here: no dependency graph, no subscription sets, no comparison of anything but the assigned value. The whole intelligence of the system is in `p`, which the compiler wrote."
```

## Where this design sits

| | Svelte 3 and 4 | Signals (Solid) | Virtual DOM |
|---|---|---|---|
| Who knows the dependencies | the compiler, from the text | the runtime, from reads | nobody: re-run and compare |
| What an assignment costs | set a bit | notify subscribers | schedule a re-render |
| What an update costs | one bit test per dependency | one effect per hole that changed | the diff of the component’s tree |
| Memory per binding | none (a line of code) | a subscription | a vnode |
| What breaks it | mutation without assignment; hidden reads | reads outside tracking | needless re-renders |
| Where reactivity can live | components, and stores | anywhere | components, and hooks |

It is the cheapest design at run time, and it has the weakest model of what is reactive: *whatever the compiler can see*. The next chapter is what happened when Svelte kept the compiler and replaced the bits with signals.

:::wild{framework="Svelte" version="4.2"}
Svelte 4.2.19 is the last of the 4.x line, and the compiler output in this chapter is its real output (see `docs/captured/svelte4.counter.js`). Svelte 3’s arrival in April 2019 was the big change; version 4 (June 2023) was mostly housekeeping, with a smaller package and modern tooling. Svelte 4 is still maintained. Since version 5 (October 2024), new code is written with runes.
:::

:::history{year=2016 title="Svelte, from a compiler to a way of thinking"}
Rich Harris started Svelte in 2016 as a compiler from templates to JavaScript that does not ship a framework runtime: “disappearing framework”. Version 3 (2019) added the *invalidation* model of this chapter, as a rethinking of reactivity: “instead of a virtual DOM, the compiler turns assignments into updates”. :cite[harris-rethinking] It argued, in a much-quoted post, that the virtual DOM is overhead *when you have a compiler that can do better*. :cite[harris-vdom] The model worked so well in components, and so poorly outside them, that Svelte 5 kept the compiler and replaced the mechanism.
:::

:::whatchanged
For *compile* in Svelte 3 and 4: **the variables that were assigned**, as bits, each of which the compiler connected in advance to the template lines that use it. This is the most static of the answers in the course; it is also the one that most needs the compiler to be able to see everything.
:::

## What’s next

In 2024 Svelte kept the compiler and the templates, and changed what the compiler emits: `let count = $state(0)` is a *signal*, and the template’s holes read signals. Chapter 18 reads Svelte 5’s output, and what the move cost and bought.
