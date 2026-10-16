---
title: Templates and Solid
summary: A compiler reads the page you wrote, finds the few places that can change, and writes code that builds the page once and updates exactly those places. That is Solid, and the idea behind Vue Vapor and Svelte 5.
number: 12
duration: 60 minutes
prerequisites: [ownership-and-batching]
---

You now have a signals engine with ownership. A signal knows who read it, an effect re-runs when what it read changes, and an owner cleans up. The question for this chapter: **what would you write on top of it to make a page?**

## By hand

Here is a counter. It shows `Count: 0`, gives the paragraph the class `big` when the count passes five, and has a `+1` button. With the engine from chapters 9–11 you can write it with the DOM directly:

```ts
const root = document.createElement('div');
root.className = 'counter';

const title = document.createElement('h1');
title.textContent = 'Counter';

const p = document.createElement('p');
const text = document.createTextNode('');
p.append('Count: ', text);

const button = document.createElement('button');
button.textContent = '+1';
button.addEventListener('click', () => count.set(count.get() + 1));

root.append(title, p, button);

effect(() => { text.data = String(count.get()); });
effect(() => { p.className = count.get() > 5 ? 'big' : ''; });
```

It works, and it is as fast as DOM code can be. Press the button and exactly one text node is rewritten; at the sixth press, one attribute as well. No diff, no comparison, no virtual tree. There is nothing wasted, because *you* decided what depends on what.

It is also the code nobody wants to write. Thirteen lines for four elements; every node needs a variable, every dynamic bit needs its own effect, and a list of such things would need the reconciliation of chapter 5 by hand.

This is the job of a **:term[compiler]{id=compiler}**. The program you want to write is the *template*:

```jsx
<div class="counter">
  <h1>Counter</h1>
  <p class={count() > 5 ? 'big' : ''}>Count: {count()}</p>
  <button onClick={() => setCount(count() + 1)}>+1</button>
</div>
```

and the compiler writes the code above, or its faster cousin.

## What the compiler does

It reads the template and sorts what it finds into two kinds:

- **static**: the element names, the nesting, `class="counter"`, the text `Counter`, `Count: `, `+1`. They never change, so no code needs to watch them.
- **dynamic**: the *:term[holes]{id=hole}*, the `{…}` expressions: the text `{count()}`, the attribute `class={…}`, the handler. These are the only places that can ever need an update.

Then it writes three things.

**1. The static part becomes an HTML string, :term[cloned]{id=cloning} once.** Instead of `createElement` for every node, the compiler writes the static structure as HTML into a `<template>` :term[element]{id=template-element}, once for the whole program, and every instance of the component is `template.content.cloneNode(true)`. The browser’s parser builds the nodes, and cloning a prepared tree is usually faster than building one node at a time from JavaScript, which is why Solid, Vue’s Vapor mode and Svelte 5 all do it.

**2. It walks to the dynamic nodes.** After cloning, the code needs a handle on each node that has a hole. It reaches them by structure: `root.firstChild.nextSibling`. These are cheap pointer moves with no searching and no `querySelector`.

**3. Each hole becomes one effect.** `{count()}` becomes “insert the value of this function here, and re-run if what it read changes”; `class={…}` becomes “set this attribute, and re-run if what it read changes”. One hole, one effect, one DOM write.

Try it. Edit the template and read the compiled code beside it: this is the lab’s own template compiler, running on the signals engine you built. Press an action, and look at what the DOM did.

::template-lab{n="12.1"}

Two things to look for. In **Counter**, press `count + 1` repeatedly and watch the counter: each press is *one* operation, the text write, until the sixth, which is two (the text and the class). Then press once more: back to one, because the `class` effect re-ran, computed `big` again, and found the attribute already said so. In **Two holes**, `first` appears in two places; changing it writes two text nodes, and the static note is never touched. In none of them did the framework *look* for what had changed. It knew, because it had written down every place that could.

:::key
**A compiled template is a list of holes.** The compiler’s job is to turn *“re-render and compare”* into *“these four places, and when each one’s inputs change, redo that one”*. The comparison is gone, and the signals engine supplies the *when*.
:::

## Real output

This is no simplification of what Solid does. Here is the real output of Solid’s compiler (`babel-preset-solid` 1.9.16, captured for this course) for the counter above:

```js
var _tmpl$ = _$template(`<div class=counter><h1>Counter</h1><p>Count: </p><button>+1`);
export function Counter() {
  const [count, setCount] = createSignal(0);
  return (() => {
    var _el$ = _tmpl$(),
      _el$2 = _el$.firstChild,
      _el$3 = _el$2.nextSibling,
      _el$4 = _el$3.firstChild,
      _el$5 = _el$3.nextSibling;
    _$insert(_el$3, count, null);
    _el$5.$$click = () => setCount(count() + 1);
    _$effect(() => _$className(_el$3, count() > 5 ? 'big' : ''));
    return _el$;
  })();
}
_$delegateEvents(["click"]);
```

Read it against the three steps. The template string has no closing tags at the end: the HTML parser fills them in, and the compiler drops what it does not need. The `firstChild` and `nextSibling` chain is the walk. `_$insert(_el$3, count, null)` is the text hole, and note that it is passed `count`, the *getter itself*, not `count()`: the runtime calls it inside its own effect. `_$effect(() => _$className(…))` is the attribute hole.

One detail is different from our toy: the click handler is stored as `_el$5.$$click`, and `_$delegateEvents(["click"])` registers *one* listener on the document that finds the target and calls its `$$click`. Solid delegates the common events, so a list of a thousand buttons has one listener rather than a thousand, at the cost of a different event timing and some trouble with shadow DOM.

:::wild{framework="Solid" version="1.9"}
Solid’s compiler is a Babel plugin (`babel-preset-solid`), and the output above is what ships. The template string is hoisted out of the function so that parsing it happens once; the `(() => { … })()` wrapper is the component’s own scope for the node variables. Compile for the server (`generate: 'ssr'`) and the same component becomes string concatenation instead, which chapter 20 reads.
:::

## The component runs once

Look again at `Counter`. `createSignal(0)` and the walk happen *once*, when the component is created. Nothing in the function is ever called again. After that, the only code that runs is the holes’ effects.

This is the largest difference from the virtual DOM in the course so far, and it changes how you write code. In React a component is a function that is called on every update, so a plain `const label = count > 5 ? 'big' : ''` is recomputed every time. In Solid a component is a **setup function**: it runs once, and a plain `const` in it is computed once. Only things inside a hole stay live.

```debug
id: templates-and-solid/setup-once
title: The label that never changes
prompt: "This Solid component should say “Hello!” once the button has been pressed, but it says “Hello” forever, although `excited()` really does change. Click the line responsible."
lang: jsx
code: |
  function Greeting() {
    const [excited, setExcited] = createSignal(false);
    const label = excited() ? 'Hello!' : 'Hello';
    return (
      <div>
        <p>{label}</p>
        <button onClick={() => setExcited(!excited())}>Toggle</button>
      </div>
    );
  }
answer:
  line: 3
notes:
  2: "Creating the signal is right, and it happens once, as it should."
  6: "`{label}` is a hole, but all it reads is `label`, a plain string. It reads no signal, so the effect around it has nothing to subscribe to."
  7: "The handler writes the signal correctly. The problem is that nothing reads the signal in a place that can re-run."
explain: "The component body runs exactly once. `excited()` is called there, at setup, outside any effect, so it is read once and never again: `label` is the string `\"Hello\"` for the life of the component. Making it live means putting the read *inside* a hole: `<p>{excited() ? 'Hello!' : 'Hello'}</p>`, or making the value a function (`const label = () => excited() ? 'Hello!' : 'Hello'` with `{label()}` in the template), which is the same thing with a name, or a `createMemo`."
hints:
  - "Which of these lines is re-run when `excited` changes?"
```

The same rule explains Solid’s most-quoted pitfalls: **destructuring props** (`const { count } = props` reads the value once and keeps a stale copy), `if` statements in a component (they decide once, which is why Solid has the `<Show>` component, whose condition is itself a hole), and `array.map` for lists, which is why it has `<For>`. They are not special cases of a framework. They are what *setup runs once* means for ordinary JavaScript.

## Lists: rows that exist once

A list is a hole whose value is a set of nodes. Making that cheap is the job of `<For each={items()}>`, which is built on `mapArray`, and its design answers the question from chapter 5 in a different way. :cite[solid-docs]

`mapArray` keeps a map from *each item* to its row, the nodes made for it. When the list changes it looks every item up in the map. If the item is there, its row is kept, and the row moves if its position changed; if not, the mapping function runs, once, to make a row, inside its own root (chapter 11), so that disposing the row is automatic. Items that are gone have their rows disposed. The mapping function **never re-runs for an item that is still in the list**: the row *is* the result of one call.

That means the identity is the *item itself*, by reference: there is no `key` prop, because the items are the keys. A `For` over an array of strings uses the strings. This works with immutable updates that keep the same objects for the same items, and it falls apart when the list is rebuilt with new objects each time (fresh objects from a server response, say); the row for every item is thrown away and rebuilt. Solid’s answer, `<Index>`, keys by *position* instead.

Compare the two strategies on the Notes app from chapter 0. Do the three actions in each pane:

::notes-lens{strategies="diff,track" n="12.2" title="Notes: virtual DOM and compiled templates" subtitle="The same page and actions. The right-hand pane is built from compiled templates over signals."}

Look at the *Rename the first note* action in particular. With the virtual DOM, the lens shows one text write, after a comparison of the whole list that you cannot see. With compiled templates, the same one text write happens, and there was nothing to compare: the row’s text hole read the note’s `text` signal, and that signal is what was written.

## Build it

The three-step recipe is short enough to do by hand. In this exercise, you act as the compiler. You are given the template, and you write what the compiler would have written, using the runtime functions the compiler targets: `template`, `insert`, `effect`, `setAttribute` and `listen`.

```build
id: templates-and-solid/by-hand
title: Be the compiler
prompt: |
  Write `Counter(rt, count)` for this template, the way the compiler would: `<div class="counter"><h1>Counter</h1><p class={count() > 5 ? 'big' : ''}>Count: {count()}</p><button onClick={() => count.set(count.get() + 1)}>+1</button></div>`. Build it with **one** `rt.template(html)()` call (the static HTML, with the hole left out of the string), find the `p` and the `button` with `firstChild` / `nextSibling`, and attach one effect per hole: `rt.insert(p, accessor, null)` for the text, `rt.effect(() => rt.setAttribute(p, 'class', …))` for the class, and `rt.listen(button, 'click', handler)`. Return the root element.
starter: |
  import type { TemplateRuntime } from '@rx/template';
  import type { Signal } from '@rx/signals';

  // This works, but it rebuilds the whole subtree with innerHTML on every change, and loses the button's listener.
  export function Counter(rt: TemplateRuntime, count: Signal<number>) {
    const root = rt.template('<div class="counter"></div>')();
    rt.effect(() => {
      root.innerHTML = `<h1>Counter</h1><p class="${count.get() > 5 ? 'big' : ''}">Count: ${count.get()}</p><button>+1</button>`;
    });
    return root;
  }
solution: |
  import type { TemplateRuntime } from '@rx/template';
  import type { Signal } from '@rx/signals';
  import type { MElement } from '@rx/dom';

  const HTML = '<div class="counter"><h1>Counter</h1><p>Count: </p><button>+1</button></div>';

  export function Counter(rt: TemplateRuntime, count: Signal<number>) {
    // 1. the static structure, cloned
    const root = rt.template(HTML)();
    // 2. walk to the nodes that have holes
    const p = (root.firstChild as MElement).nextSibling as MElement;
    const button = p.nextSibling as MElement;
    // 3. one effect per hole
    rt.insert(p, () => count.get(), null);
    rt.effect(() => rt.setAttribute(p, 'class', count.get() > 5 ? 'big' : ''));
    rt.listen(button, 'click', () => count.set(count.get() + 1));
    return root;
  }
tests: |
  import { test, expect } from '@rx/test';
  import { createDocument } from '@rx/dom';
  import { createEngine } from '@rx/signals';
  import { createTemplateRuntime } from '@rx/template';
  import { Counter } from './solution.ts';

  function setup() {
    const doc = createDocument();
    const engine = createEngine('colour');
    const rt = createTemplateRuntime(doc, engine);
    const count = engine.signal(0);
    const root = Counter(rt, count);
    doc.body.appendChild(root);
    return { doc, count, root };
  }

  test('it renders the page', () => {
    const { root } = setup();
    expect(root.outerHTML).toBe('<div class="counter"><h1>Counter</h1><p>Count: 0</p><button>+1</button></div>');
  });

  test('the structure is cloned from one template, not created node by node', () => {
    const doc = createDocument();
    const engine = createEngine('colour');
    const rt = createTemplateRuntime(doc, engine);
    const mark = doc.ops.length;
    Counter(rt, engine.signal(0));
    const s = doc.statsSince(mark);
    // One clone for the structure; at most the text node of the {count()} hole is created.
    expect(s.created).toBeLessThanOrEqual(1);
  });

  test('a change rewrites exactly one text node', () => {
    const { doc, count } = setup();
    const mark = doc.ops.length;
    count.set(1);
    const s = doc.statsSince(mark);
    expect(s.total).toBe(1);
    expect(s.texts).toBe(1);
  });

  test('crossing five writes the text and the class; after that, only the text', () => {
    const { doc, count, root } = setup();
    count.set(5);
    const mark = doc.ops.length;
    count.set(6);
    expect(doc.statsSince(mark).total).toBe(2);
    expect(root.outerHTML).toContain('<p class="big">Count: 6</p>');
    const mark2 = doc.ops.length;
    count.set(7);
    expect(doc.statsSince(mark2).total).toBe(1);
  });

  test('clicking the button counts up, and it keeps counting', () => {
    const { count, root } = setup();
    const button = root.querySelector('button')!;
    button.click();
    button.click();
    button.click();
    expect(count.peek()).toBe(3);
    expect(root.outerHTML).toContain('Count: 3');
  });

  test('the h1 and the button are the same nodes before and after an update', () => {
    const { count, root } = setup();
    const h1 = root.querySelector('h1');
    const button = root.querySelector('button');
    count.set(9);
    expect(root.querySelector('h1')).toBe(h1);
    expect(root.querySelector('button')).toBe(button);
  });
hints:
  - "The static HTML contains `<p>Count: </p>`: the text node of the hole does not exist yet, `insert` creates it. `p` is `h1.nextSibling`, and `button` is `p.nextSibling`."
  - "The `class` hole needs `rt.effect`, because `rt.setAttribute` is a plain function: the effect is what re-runs it when `count` changes."
explain: "Three steps, and nothing else: one clone, a walk with `firstChild` and `nextSibling`, and one effect for each place that can change. Every compiled-template framework does this, with variations: Solid writes the walk as a chain of variables and a separate effect per hole, Svelte 5 uses `$.child` and `$.sibling` and one effect for the whole template, Vue Vapor uses `_child` and `_next` and one `_renderEffect`. The tests that matter are the two that count operations after a change: after the first render, the only DOM operations are the writes to the nodes that read the signal."
```

## Who else does this

The idea (*compile a template into direct DOM operations, with one effect per hole*) did not start with Solid, and has not stayed there.

- **Svelte 5** compiles the same counter to `$.from_html` (the cloned HTML), `$.child` and `$.sibling` (the walk), and `$.template_effect`, which reads signals that the compiler generates from `$state`. One difference worth noticing: all the holes of a template share **one** effect, which sets the class and the text together, and each setter skips the write if its value has not changed. Chapter 19 reads it side by side with Solid’s output.
- **Vue 3.6’s Vapor mode** is the same compile target for Vue’s templates: `_template`, `_child`, `_next`, then a single `_renderEffect` with `_setClassName` and `_setText`, running over Vue’s own reactivity system, without a virtual DOM. A Vue app may mix components in either mode. Chapter 13 shows both outputs.
- **Angular** compiles templates to *instructions* (`ɵɵdomElementStart`, `ɵɵtext`, `ɵɵtextInterpolate1`, `ɵɵadvance`) in two blocks, creation and update, a different design in which a change-detection pass runs the update block of a component and each instruction compares its value with the last one. It is not a set of per-hole effects (chapter 14 explains the change and where signals are heading).
- **Qwik and Lit** have their own versions: Lit’s tagged templates *do not* need a compiler, because the browser parses the static strings (chapter 16); Qwik adds the optimiser’s lazy-loading boundaries on top of signals (chapter 22).

:::programmer
**What a hole’s cost is.** Every hole is an effect, and every effect is an object, a subscription on each signal it reads, and an owner link. A page with ten thousand holes has ten thousand of them. That is the price of never comparing: memory and creation time instead of update time. The usual mitigations are the ones the compilers already use. Static parts cost nothing; one effect can serve several holes of the same template (as Svelte 5 and Vue Vapor do); and a list creates rows that each hold a few holes, rather than one huge update function. If creation time matters more than update time (a page you read once), the virtual DOM’s costs sit on the opposite side, which is why the benchmark in chapter 24 does not have a single winner.
:::

:::history{year=2015 title="S.js, Surplus and the road to Solid"}
Compiling templates to direct DOM instructions over a signals library was worked out in JavaScript by Adam Haile’s **S.js** (a synchronous, glitch-free reactive library) and **Surplus** (a compiler from JSX to DOM instructions over S), a few years before Solid. :cite[s-js] :cite[surplus] Ryan Carniato’s **Solid** (first public in 2018) took the same :term[fine-grained]{id=fine-grained} approach, added a design that lets it run on both the server and the client, and made it the centre of a framework. :cite[solid-docs] Svelte had been compiling templates to DOM code since 2016 (chapters 17 and 18), but on a different model of *when* to update; it moved to signals in Svelte 5.
:::

:::whatchanged
For *compile*: **the holes that the compiler found in your template**, each one wired to the signals it reads. Together with *track*, the question is answered twice, once at build time (where are the places that can change?) and once at run time (which of them did?). Nothing is compared, and nothing outside the holes is ever visited again.
:::

## What’s next

Solid’s answer to *what changed?* is a compiler and a signals engine. Vue’s is a signals engine without a compiler requirement, a Proxy that discovers dependencies on ordinary objects, and a compiler that makes its virtual DOM nearly as precise. Chapter 13 reads Vue’s reactivity from the inside, then its compiler’s hints.
