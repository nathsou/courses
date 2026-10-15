---
title: Lit and tagged templates
summary: No compiler, no virtual DOM, no signals. A language feature that gives a template its identity, and a library that finds the holes once and compares each hole's value after that.
number: 16
duration: 50 minutes
prerequisites: [templates-and-solid]
---

Chapter 12 compiled a template into code, and chapter 13 had a compiler give hints to a diff. Both needed a build step. Here is a library that needs none, runs in a plain `<script>` tag, and still avoids diffing a tree. It is **Lit** (formerly lit-html, from Google’s Polymer team), and its trick comes from the language.

## A template that knows its call site

JavaScript has a feature called *tagged template literals*. If you write a function name in front of a template literal, the function is called with the template split into two parts: the **static strings** between the holes, and the **values** of the holes:

```js
function html(strings, ...values) {
  return { strings, values };
}

const view = (name, n) => html`<p>Hello, ${name}. You have ${n} messages.</p>`;
view('Ada', 3);
// strings: ['<p>Hello, ', '. You have ', ' messages.</p>']
// values:  ['Ada', 3]
```

Here is the property that makes Lit possible, and it is in the language specification: **the `strings` array is the same object every time the same expression is evaluated.** The array is created once for each place in the source where the tagged template appears, and frozen. `view('Ada', 3).strings === view('Grace', 7).strings` is `true`; a different line of code with identical text gets a *different* array.

```predict
q: "Two functions in the same file contain tagged templates with exactly the same text, `html`<p>${x}</p>``. How many times does Lit prepare (parse) this template?"
options:
  - text: Once, because the text is the same.
    why: "Lit cannot afford to compare text on every render. It caches by the *identity* of the strings array, which is a cheap pointer comparison, and which the language promises is stable per place in the source."
  - text: Twice, once for each place in the code.
    correct: true
    why: "Each tagged template expression has its own `strings` array, so each is a separate cache key, even with identical text. The duplication costs one extra parse at start-up, and buys a cache lookup that never inspects a string."
  - text: Once per render, because the values differ.
    why: "The values do not affect the template. They are what is poured *into* it. The strings, and so the prepared template, are the same every render."
```

That is the whole idea. The array’s identity *is* the template’s identity, so the library gets what the compilers of chapters 12 and 13 produced at build time, without a build. The *call site* is the compile step: the first time a given site runs, Lit prepares a template for its strings, and after that, the same strings array means the same template.

## First render: prepare, clone, find the parts

On the first call for a given `strings` array Lit does three things:

1. **Prepare.** It joins the strings with a *marker* where each hole was, one that the HTML parser accepts in that position (a comment between tags, a recognisable attribute value inside a tag), and parses the result into a `<template>` element. This is the browser’s parser doing the work, the same one that parsed the page.
2. **Find the parts.** It walks the parsed template once and notes where each marker ended up, as a *path*: “the third child of the first child”. Each marker becomes a **part**: a child part (a node position), an attribute part, a property part (`.value=${…}`), a boolean part (`?disabled=${…}`) or an event part (`@click=${…}`).
3. **Clone and fill.** It clones the template’s content (chapter 12’s cheap cloning again), follows each part’s path to the live node, and hands every part its value.

On every later call with the same strings, steps 1 and 2 are skipped. The parts are already there, and rendering is just **handing each part its new value**:

```js
// what `render` does, after the first time
parts.forEach((part, i) => part.setValue(values[i]));

// and a part's setValue is a comparison
setValue(value) {
  if (Object.is(value, this.last)) return;      // same as last time: do nothing
  this.last = value;
  this.write(value);                            // textContent, setAttribute, ...
}
```

See it. The figure is the real mini-Lit of this course, running on the lab’s DOM. In the counter, each hole is a part, and the table shows which parts did something in the last render.

::parts-lab{n="16.1"}

Press `render again, nothing changed`: every part receives the value it already has, and the DOM sees **no operations at all**. The comparison *is* the diff. Then press `count = 6`: two parts wrote, `Count:`’s text and the class, and the static `<p>` and button are untouched. The event part is *bound once*: when the first render attached the listener, it attached a wrapper that calls the latest handler, so a new closure each render costs nothing.

:::key
**Lit re-runs your template function and compares per hole.** Your `view` function runs in full on every update, and builds a small object, `{ strings, values }`. That is cheap. The expensive thing, finding what changed in the DOM, is replaced by one `Object.is` per hole. The cost of an update is the number of holes, not the size of the tree and not the number of nodes.
:::

## What a hole can hold

A child part accepts several kinds of value, and each has its own rule for the *next* render:

- **A primitive** (string, number, `null`): a text node is created once and its `data` rewritten when the value changes.
- **Another `html` result**: if its `strings` are the same as last time, the same nested instance is **updated in place** with the new values, a recursive version of the loop above. If they are different (a conditional that switched branch), the old nested instance is removed and a new one is made. This is a tree-diff of one level of depth, by template identity: “same template” or “different template”, with no prop comparison.
- **An array** of values or results: by default, **by position**. The *n*th item goes to the *n*th part.
- **A `repeat()` directive**: a keyed list, by the algorithm of chapter 5.

Compare the last two in the figure. Switch to **List (array)** and press *Reverse*: the rows are the same *template* in a different order, so each position gets a new value and every row’s text is rewritten. Nothing moves. Switch to **List (repeat)** and press it again: the keys let it recognise rows, which **move**, and no text is rewritten. This is chapter 5 all over again, from the other side: an unkeyed list is exactly “by position”, and the answer to *which rows are which?* has to be given by the program when the library cannot know.

(There is a subtle thing worth noticing. Rewriting the text of three `<li>` elements is cheap. Reordering matters when rows have *state*, like a focused input or a half-typed text field: by position, the state stays in the same element while the text above it changes, which is the “my input shows the wrong text” bug of chapter 5.)

## Build it

You have all the ideas. This exercise writes the core: `html`, and a `render` that prepares once and then compares each hole. It handles text holes only, which is enough to show the structure.

```build
id: lit-templates/render
title: Write html and render
prompt: |
  Implement `html` (a tag that returns `{ strings, values }`) and `render(result, container)`. The first time a container is rendered with a given `strings` array, put the strings together with `<!--hole-->` where each value goes, set `container.innerHTML` to that, find the `hole` comment nodes, and insert a text node holding each value right after its comment. After that, **if `strings` is the same array object as last time**, only write to the text nodes whose value is different (`Object.is`), and touch nothing else. A different `strings` array means a different template: prepare it from scratch.
starter: |
  import type { MElement } from '@rx/dom';

  export const html = (strings: readonly string[], ...values: unknown[]) => ({ strings, values });

  // This works, but throws away and rebuilds the page on every render.
  export function render(result: { strings: readonly string[]; values: unknown[] }, container: MElement): void {
    let out = result.strings[0]!;
    result.values.forEach((v, i) => (out += String(v) + result.strings[i + 1]!));
    container.innerHTML = out;
  }
solution: |
  import { MComment, MText } from '@rx/dom';
  import type { MElement, MNode } from '@rx/dom';

  type Result = { strings: readonly string[]; values: unknown[] };

  export const html = (strings: readonly string[], ...values: unknown[]): Result => ({ strings, values });

  interface Instance {
    strings: readonly string[];
    texts: MText[];
    last: unknown[];
  }
  const instances = new WeakMap<MElement, Instance>();

  function findHoles(node: MNode, out: MComment[]): void {
    if (node instanceof MComment && node.data === 'hole') out.push(node);
    else if ('children' in node) for (const c of (node as MElement).children) findHoles(c, out);
  }

  export function render(result: Result, container: MElement): void {
    let inst = instances.get(container);
    if (!inst || inst.strings !== result.strings) {
      // first render of this template: prepare it
      container.innerHTML = result.strings.join('<!--hole-->');
      const holes: MComment[] = [];
      findHoles(container, holes);
      const texts = holes.map((marker, i) => {
        const text = container.doc.createTextNode(String(result.values[i]));
        marker.parent!.insertBefore(text, marker.nextSibling);
        return text;
      });
      inst = { strings: result.strings, texts, last: [...result.values] };
      instances.set(container, inst);
      return;
    }
    // same template: hand each part its value; a part that sees the same value does nothing
    result.values.forEach((v, i) => {
      if (Object.is(v, inst!.last[i])) return;
      inst!.last[i] = v;
      inst!.texts[i]!.data = String(v);
    });
  }
tests: |
  import { test, expect } from '@rx/test';
  import { createDocument } from '@rx/dom';
  import { html, render } from './solution.ts';

  const view = (name: string, n: number) => html`<p>Hello, ${name}. You have ${n} messages.</p>`;
  const other = (name: string) => html`<h1>${name}</h1>`;

  function setup() {
    const doc = createDocument();
    const root = doc.createElement('div');
    doc.body.appendChild(root);
    return { doc, root };
  }
  const text = (root: { innerHTML: string }) => root.innerHTML.replace(/<!--hole-->/g, '');

  test('the first render shows the values', () => {
    const { root } = setup();
    render(view('Ada', 3), root);
    expect(text(root)).toBe('<p>Hello, Ada. You have 3 messages.</p>');
  });

  test('a changed value is written to its own text node, and only that', () => {
    const { doc, root } = setup();
    render(view('Ada', 3), root);
    const mark = doc.ops.length;
    render(view('Ada', 4), root);
    const s = doc.statsSince(mark);
    expect(text(root)).toBe('<p>Hello, Ada. You have 4 messages.</p>');
    expect(s.total).toBe(1);
    expect(s.texts).toBe(1);
  });

  test('rendering the same values does no DOM work at all', () => {
    const { doc, root } = setup();
    render(view('Ada', 3), root);
    const mark = doc.ops.length;
    render(view('Ada', 3), root);
    expect(doc.statsSince(mark).total).toBe(0);
  });

  test('the nodes are reused: the paragraph is the same object after an update', () => {
    const { root } = setup();
    render(view('Ada', 3), root);
    const p = root.querySelector('p');
    render(view('Grace', 9), root);
    expect(root.querySelector('p')).toBe(p);
  });

  test('two holes change independently', () => {
    const { doc, root } = setup();
    render(view('Ada', 3), root);
    const mark = doc.ops.length;
    render(view('Grace', 3), root);
    expect(doc.statsSince(mark).texts).toBe(1);
  });

  test('a different template replaces the old one', () => {
    const { root } = setup();
    render(view('Ada', 3), root);
    render(other('Hi'), root);
    expect(text(root)).toBe('<h1>Hi</h1>');
    render(other('Bye'), root);
    expect(text(root)).toBe('<h1>Bye</h1>');
  });

  test('the same text on a different line is a different template', () => {
    const { root } = setup();
    const a = (x: string) => html`<b>${x}</b>`;
    const b = (x: string) => html`<b>${x}</b>`;
    expect(a('1').strings).not.toBe(b('1').strings);
    render(a('x'), root);
    render(b('y'), root);
    expect(text(root)).toBe('<b>y</b>');
  });
hints:
  - "`result.strings` is the same array object for every call from the same line. Remember the last one for each container (a WeakMap keyed by the container works) and compare with `===`."
  - "Joining with `<!--hole-->` and parsing puts a comment node at each hole; the text node goes right after it."
  - "On later renders you only need the list of text nodes and the values from the last render."
explain: "That is the entire engine of lit-html's text and child parts, minus the other kinds of part (attributes, properties, events, nested templates, arrays) and minus the optimisations (the real library clones a `<template>` instead of re-parsing with innerHTML, and finds holes with a TreeWalker over a comment marker it controls). The structure is the same: *identity of the strings decides whether there is a new template; the parts compare their values*."
```

## Lit’s components: re-render on demand

Everything so far is the `html` function and `render`. Lit’s other half is **LitElement**, a base class for web components: you declare reactive properties, and the element re-renders when one changes.

```js
class Counter extends LitElement {
  static properties = { count: { type: Number } };
  count = 0;
  render() {
    return html`<p>Count: ${this.count}</p><button @click=${() => this.count++}>+1</button>`;
  }
}
```

Behind `this.count++` is a setter that notes the change and calls `requestUpdate()`. Requests are **batched in a microtask** (chapter 11’s batch boundary), so setting three properties in a row re-runs `render()` once. Then `render()` returns a template result, which goes through the part comparison above. So Lit’s answer to *what changed?* has two layers: a property setter says that *this element* may be stale, and the parts say *which holes* changed.

Look at the cost structure. Updating one element re-runs its whole `render` function, which builds a new array of values and compares each. No tree diff, no dependency tracking between holes. If a template has fifty holes and only one changed, fifty comparisons happen. In practice this is fast: comparisons are the cheapest operations a computer does. The design is a *dirty-check at the hole level*, with a property setter to tell it when to check.

And since Lit has no opinion about state, it is easy to bring one: `@lit-labs/signals` (chapter 15) lets a Lit element track signals it reads in `render`, and request an update when they change.

:::wild{framework="Lit" version="3.3"}
In the real library, the markers are `<?lit$123456$>` processing-instruction-like comments for child parts, and attribute values get a `$lit$` suffix, chosen so that the browser’s HTML parser keeps them where they were put. Lit also uses `<template>` elements and `document.importNode`, and a `TreeWalker` to find the markers, and it has directives (`repeat`, `classMap`, `styleMap`, `until`, `guard`, `cache`) that are *custom parts*, functions that take over how a hole is rendered. Lit’s reactive elements use the platform’s custom elements and shadow DOM: the “component” is a real DOM element.
:::

:::programmer
**Where Lit sits among the strategies.** It is the one library in Part III with no compiler *and* no virtual DOM *and* no signals required. It sits at *dirty-check* in the course’s taxonomy: it re-runs the render function and compares values, like Angular, but per hole, with a template-shaped comparison that a vdom diff has to discover. In terms of the benchmark in chapter 24, that makes it cheap to update when few holes change, and linear in holes when many do. The price of running without a build tool is that Lit cannot know at build time which holes are static: it treats every hole as possibly dynamic, and it pays no costs for the static parts because they are never in a hole.
:::

:::history{year=2017 title="lit-html"}
lit-html was presented by Justin Fagnani of the Polymer team in 2017 as a template library built on tagged template literals, the language feature added in ES2015. :cite[lit-docs] It was an answer to two things: virtual DOM libraries such as React did work to find differences that a template’s *shape* made unnecessary, and compiled templates such as Angular’s or Svelte’s needed a build. It was folded into LitElement to make Lit 2 in 2021 and Lit 3 in 2023. The same strings-array trick appears elsewhere: `htm`, a JSX-like tagged template for Preact, relies on it to cache its parse, and Solid’s `solid-js/html` uses the same idea for people who want no compiler.
:::

:::whatchanged
For *dirty-check* at the finest scale: **each hole’s value against its last value**. The template’s identity (from the language) says the shape is unchanged; the parts say which values are. Rendering is a loop over holes, so its cost is proportional to the *holes*, never to the document.
:::

## What’s next

Chapters 12 to 16 have been about *runtime* answers. The next two chapters look at Svelte, the framework whose answer is mostly *compile-time*: first the Svelte 3 and 4 design, in which the compiler works out which variables each piece of the template depends on and writes the update code, and then Svelte 5, which swapped that for signals.
