---
title: Svelte 5 and runes
summary: Svelte kept the compiler and replaced the bits with signals. The compiler now turns $state into a signal, template holes into effects, and leaves what never changes as plain values.
number: 18
duration: 55 minutes
prerequisites: [svelte-invalidation, signals-from-scratch]
---

Chapter 17’s design had a ceiling. Reactivity depended on a compiler that could *see* every assignment and every dependency, in `.svelte` files only. Version 5 (October 2024) kept the compiler, kept the template syntax, and swapped the mechanism underneath: **the compiler now writes signals**, and the update code reads and writes them. The new surface syntax is a handful of **runes**: `$state`, `$derived`, `$effect`, `$props`.

```svelte
<script>
  let count = $state(0);
  let double = $derived(count * 2);

  $effect(() => {
    document.title = `count is ${count}`;
  });
</script>

<p>{count} × 2 = {double}</p>
<button onclick={() => count++}>+1</button>
```

A :term[rune]{id=rune} looks like a function, and is not one. It is a *marker for the compiler*: `$state(0)` is not imported from anywhere, it exists only at compile time, and the compiler replaces it with something else. That is the mechanism of this chapter.

## Compile it

The real Svelte 5 compiler runs in this page. Choose **Counter** and read the output on the right. It is the same program as chapters 12 to 15, and it is worth reading line by line.

::live-compile{n="18.1" preset="counter"}

Here is the captured output for the counter (Svelte 5.57), with the three parts to look for:

```js
var root = $.from_html(`<div class="counter"><h1>Counter</h1> <p> </p> <button>+1</button></div>`);

export default function Counter($$anchor) {
  let count = $.state(0);                                  // 1. $state is a signal
  var div = root();
  var p = $.sibling($.child(div), 2);
  var text = $.only_child(p);
  var button = $.sibling(p, 2);
  $.reset(div);

  $.template_effect(() => {                                // 2. one effect for the template's holes
    $.set_class(p, 1, $.clsx($.get(count) > 5 ? 'big' : ''));
    $.set_text(text, `Count: ${$.get(count) ?? ''}`);
  });

  $.delegated('click', button, () => $.update(count));     // 3. count++ is a write to the signal
  $.append($$anchor, div);
}
```

1. **`let count = $.state(0)`.** A signal, the `signal` of chapter 9. Every *read* of `count` in your code has become `$.get(count)`, and every *write* is `$.set(count, …)` or `$.update(count)`. This is the same trick as chapter 17’s `$$invalidate`: the compiler rewrites your plain-looking variable access, and the program you wrote has no `.value` or `()` anywhere.
2. **`$.template_effect(() => { … })`.** All the holes of the template (the class and the text) sit in **one effect**. It reads `count` through `$.get`, which subscribes the effect to the signal; when `count` is written, the effect is scheduled, and its setters (`$.set_class`, `$.set_text`) write only if their values have changed. This is chapter 12’s compiled template with chapter 17’s *per-template* grouping.
3. **The structure** is built once with a cloned `from_html` template and a walk with `$.child` and `$.sibling`, as in Solid and Vue Vapor.

So the new Svelte is Solid’s design, written by a different compiler for a different surface syntax. Where the course’s earlier question was *“how does the framework know what changed?”*, Svelte 4 answered with a bit and Svelte 5 with a signal read.

:::key
**Runes are a notation for signals.** `$state` makes a signal, `$derived` a computed, `$effect` an effect, and the compiler inserts the reads and writes. What differs between Solid and Svelte 5 is *where the ceremony lives*: Solid asks you to call `count()`; Svelte lets you write `count` and the compiler does the rest.
:::

## What the compiler does with each rune

Switch the figure to **Derived and effect**, then to **Blocks**, and look for each of these.

**`$state`** becomes `$.state(value)` for a primitive, and for an object or array becomes `$.proxy(value)`: a deep Proxy like chapter 13’s `reactive`, so `todos.push(x)` and `todo.done = true` are reactive. This closes chapter 17’s `items.push` hole: the array is a proxy, and *its* property writes are tracked.

**`$derived(expr)`** becomes `$.derived(() => expr)`, a lazy cached computed with the dirty-and-check protocol of chapter 10. `$derived.by(fn)` takes a block of code.

**`$effect(fn)`** becomes `$.user_effect(fn)`, an effect owned by the component (chapter 11): it runs after the DOM has updated, tracks whatever it reads, and its cleanup (returned function) runs before each re-run and on destroy. `$effect.pre` runs before the DOM update, and `$effect.root` creates an owner that you dispose yourself.

**The template** becomes `from_html` clones, a walk, and `$.template_effect` for the holes. Control flow gets its own function, `$.if(node, …)` and `$.each(node, …)`, each of which creates an effect that *renders a branch or a list of rows as children of its own owner*, which is the ownership tree of chapter 11 once more: when the condition turns false, the branch’s effects are disposed with it.

Now the part that can surprise you. In the **Blocks** preset, `name` is declared with `$state('Ada')` but nothing ever assigns to it. Look at the compiled output:

```js
let name = 'Ada';                       // not $.state(...): a plain constant
...
h1.textContent = 'Hello Ada';           // and the text is written once, at creation
```

```predict
q: "A component declares `let name = $state('Ada')` and uses `{name}` in the template, but never assigns to `name`. What does the compiler write for it?"
options:
  - text: "A signal, `$.state('Ada')`, and a template effect that reads it."
    why: "That would be the straightforward translation, and it would be correct. But it would pay for a signal and a subscription for a value that cannot change."
  - text: "A plain value, `'Ada'`, and the text is written once at creation."
    correct: true
    why: "The compiler sees every assignment in the file. With none, the `$state` is a constant, so it creates no signal, no subscription and no effect. This is the static-analysis half of Svelte surviving into the signals design. (If the variable is exported, bound with `bind:` or captured by something the compiler cannot follow, it stays a signal.)"
  - text: "A compile error, since a `$state` that is never updated is useless."
    why: "It is allowed: state that is not yet changed by anything is common while writing a component. The compiler just does not charge you for it."
```

```numeric
id: svelte-runes/effects
title: Counting template effects
prompt: |
  In the **Blocks** component of the figure, the compiler's client output contains some number of `$.template_effect(...)` calls. Read the **template effect** count under the code. How many are there? Then explain it to yourself: why is it not 4, one for each place in the template that reads a signal?
answer: 2
unit: template effects
tolerance: 0
explain: "Two: one for the main template, which groups the `h1` class, the `h1` text and the paragraph text, and one inside each row of the `{#each}`, which groups the row's class and text. The `{#if}` branch has nothing dynamic in it, so it gets none. The compiler groups holes **by template**, and every `{#if}` branch and `{#each}` row is its own template, with its own lifetime. A row's effect lives and dies with the row, which is why it cannot be merged into the parent's."
```

## Universal reactivity

The restriction that ended chapter 17 was “reactivity lives in components”. Runes lift it. The compiler also processes files named `.svelte.js` or `.svelte.ts`, and runes work in them:

```js
// counter.svelte.js
export function createCounter() {
  let count = $state(0);
  return {
    get count() { return count; },       // getters keep it reactive across the module boundary
    increment() { count++; }
  };
}
```

A component that calls `createCounter()` and reads `counter.count` in its template subscribes to the underlying signal, with no store or special syntax. A function that returns a getter is the idiom, because `return { count }` would read the signal once, at that moment, and copy the number: the same capture problem as destructuring in Solid and Vue.

```debug
id: svelte-runes/destructure
title: The to-do that does not tick
prompt: "In Svelte 5, `todo` is a `$state` object. Ticking the box sets `todo.done = true` and the object does change (a log shows it), but the label next to it stays “open”. Click the line responsible."
lang: svelte
code: |
  <script>
    let todo = $state({ text: 'milk', done: false });
    let { done } = todo;
  </script>

  <label>
    <input type="checkbox" bind:checked={todo.done} />
    {todo.text}
  </label>
  <p>{done ? 'closed' : 'open'}</p>
answer:
  line: 3
notes:
  2: "`$state` on an object makes a deep proxy, and the `bind:checked` writes through it. That part is fine."
  10: "`{done ? ...}` reads a plain `const`-like local. The template is fine; what it reads is the problem."
explain: "Destructuring reads `todo.done` once, at setup, and stores the boolean in a new variable. The new variable is a plain value, not a signal and not a property of the proxy; nothing connects it to `todo`. The same capture problem as chapters 12 and 13. Read it where it is used: `{todo.done ? 'closed' : 'open'}`, or make it a `$derived`: `let done = $derived(todo.done)`."
hints:
  - "Which line copies a value out of the proxy?"
```

## Is it still a compiler framework?

Yes, and the *division of labour* has shifted. In Svelte 3 and 4 the compiler did nearly everything, and the runtime was a few hundred bytes of helpers. In Svelte 5 the runtime is a signals engine (with its own scheduling, ownership, and a dirty-and-check core in the style of chapter 10), and the compiler turns your component into calls to it. The compiler’s special position remains: it is what makes `count` and `count++` *look* like plain JavaScript, and what lets it *remove* signals from values that never change.

Svelte 5 also made reactivity granular at the **template** level, as Solid and Vapor are, and not component level as in React and Vue’s default. A change to one `$state` runs the effects that read it, not the component function. That function, as in Solid, runs **once**.

:::wild{framework="Svelte" version="5.5x"}
Everything in this chapter was compiled by Svelte 5.57; the output format is an implementation detail of the compiler and runtime (`svelte/internal/client`), and it has changed between minor versions. The *behaviour* is stable, and the rune API is public. Svelte’s `SvelteMap`, `SvelteSet`, `SvelteDate` and `SvelteURL` are reactive versions of the built-in classes, since a Proxy cannot see inside them. Since 5.36, components can use `await` in templates and in `$derived` as an experiment, which is a place where signals have little prior art.
:::

:::programmer
**Runes versus the proposal.** The TC39 `Signal.State` of chapter 15 looks like `$state` without the compiler: `s.get()` for `count`, `s.set(v)` for `count = v`. A framework could build runes on the standard graph. Svelte 5 implements its own, because it needs the ownership and effect scheduling of its component model; whether future versions use the standard’s core is a question for the proposal to settle.
:::

:::history{year=2024 title="Why the rewrite"}
Svelte 5 was released in October 2024, after a year in preview, with the announcement of runes in September 2023. The reasons, in the maintainers’ own words, were the limits of chapter 17’s design: reactivity only in `.svelte` files, the arbitrary ordering of `$:` statements, and the `items = items` idiom. :cite[svelte-runes-docs] The migration was gradual: Svelte 5 compiles old-syntax components too, and mixes both in one app.
:::

:::whatchanged
For *compile* in Svelte 5, and for *track* at the same time: **the signals each :term[template effect]{id=template-effect} read**, with the compiler writing the reads, and removing the signals that never change. It is the closest the course gets to having both answers at once: a build-time pass that decides what *can* be reactive, and a run-time engine that finds out what *was*.
:::

## What’s next

Chapters 12 to 18 gave each framework its own compiler or runtime. Chapter 19 puts the compiled outputs for the same counter side by side (React, React with the Compiler, Solid, Vue, Vue Vapor, Svelte 5, Angular) and asks what each one *decided* before the page ran.
