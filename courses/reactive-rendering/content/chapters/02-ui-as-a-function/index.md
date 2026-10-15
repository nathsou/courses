---
title: UI as a function of state
summary: The idea behind everything that follows. Describe the page for the current state and let something else make the DOM match. The simplest renderer, why it destroys what the user was doing, and the bookkeeping that replaces it.
number: 2
duration: 45 minutes
prerequisites: [the-question, what-the-browser-does]
---

Imagine you are writing the Notes app from chapter 0 and you have never heard of a framework. You have a list of notes in a variable, and a page that has to show it. There are two ways to think about the job.

The first is **imperative**: when something happens, say what to *do* to the page. “A note was added: create an `li`, put the text in it, append it to the list, and update the count at the top. A note was toggled: find its `li`, put a ✓ in front, update the count.” The program is a list of instructions for moving the page from the old state to the new one.

The second is **declarative**: say what the page should *look like* for a given state, and let something else get it there. “For these notes, the page is a search box, a line saying how many there are, and a list with one item per note.” The program never mentions a change. It only describes a state.

This chapter is about why the second way won, what it costs, and the first thing anyone tries when they adopt it.

## A function from state to page

Write the second way as a function:

```js
const view = (notes) => `
  <div class="notes">
    <input placeholder="Search…">
    <p>${notes.length} notes, ${notes.filter((n) => n.done).length} done</p>
    <ul>${notes.map((n) => `<li>${n.done ? '✓ ' : ''}${n.text}</li>`).join('')}</ul>
  </div>`;
```

This is a pure function. Given the same notes it returns the same string. Nothing in it can be out of date, because nothing in it remembers anything. The idea is usually written `UI = f(state)`, and it is the central idea of React, Elm, Vue’s templates, Svelte’s markup, Solid’s JSX and every other approach in this course. They disagree about nearly everything else.

The smallest thing that could apply it is a one-liner:

```js
function render(notes) {
  container.innerHTML = view(notes);
}
```

Call `render` after every change to the state and the page is correct. Always. There is no way for it to be stale and no update logic to write: you cannot forget to update the summary line, because the summary line is recomputed from the notes every time. This was the dream of the first template libraries (Mustache, Handlebars, Underscore templates, EJS), and the pattern of countless Backbone views: `this.$el.html(this.template(this.model.toJSON()))`.

It has exactly one problem, and chapter 0 already showed it.

## What a rebuild destroys

A DOM node is not just a description of what is on the screen. It also *holds state that your program does not know about*: what the user has typed into a box and where the caret is, which element has keyboard focus, whether a `<details>` is open, how far a list has been scrolled, where a CSS animation or transition currently is, which text is selected, whether a video is playing. The browser keeps all of it on the node, and none of it is in your `notes` array.

`innerHTML = …` replaces every node with a new one. The new nodes are correct, and empty of everything the user had done to the old ones. The function was pure; the page it was applied to was not.

The figure below has six such pieces of state. Use the left column to set some of them, then re-render *the same* application state in two ways: by rebuilding with `innerHTML`, and by patching in place (matching old nodes to new ones and updating only what differs, which you will build yourself over the next three chapters).

::rebuild-victims{n="2.1"}

:::programmer
**The usual patch.** Codebases that start with this pattern grow a layer of repairs: before rendering, save the focused element’s id and its caret, after rendering find the new element with the same id and restore them. Then the scroll positions. Then the open `<details>`. Then the animation, which cannot be restored at all, so it restarts. The repairs are real engineering and they are the reason every framework in this course exists: matching the new description to the *existing* nodes, so that the question never arises.
:::

You can feel the shape of that repair in an exercise. The function below rebuilds a container from an HTML string, as before, but must keep the typed text and the focus of any `<input>` that has an `id`.

```build
id: ui-as-a-function/keep-inputs
title: Rebuild, but keep the inputs
prompt: |
  Complete `rebuildKeepingInputs(container, html)`. It must replace the container's content with `html` (as `innerHTML` does), and, for every `<input>` that had an `id` before the rebuild and has the same `id` afterwards, restore what the user had typed (`el.value`) and, if it was focused, focus it again (`el.focus()`). `container.doc.activeElement` is the focused element. Inputs with no `id` cannot be matched; they simply start empty. Use `querySelectorAll('input')`.
starter: |
  import type { MElement } from '@rx/dom';

  export function rebuildKeepingInputs(container: MElement, html: string): void {
    container.innerHTML = html;
  }
solution: |
  import type { MElement } from '@rx/dom';

  export function rebuildKeepingInputs(container: MElement, html: string): void {
    const saved = new Map<string, { value: string; focused: boolean }>();
    for (const el of container.querySelectorAll('input')) {
      const id = el.getAttribute('id');
      if (id) saved.set(id, { value: el.value, focused: container.doc.activeElement === el });
    }
    container.innerHTML = html;
    for (const el of container.querySelectorAll('input')) {
      const s = saved.get(el.getAttribute('id') ?? '');
      if (!s) continue;
      el.value = s.value;
      if (s.focused) el.focus();
    }
  }
tests: |
  import { test, expect } from '@rx/test';
  import { createDocument } from '@rx/dom';
  import { rebuildKeepingInputs } from './solution.ts';

  const page = (title: string) => `<h1>${title}</h1><input id="a"><input id="b"><input>`;

  test('the rest of the page is rebuilt from the new HTML', () => {
    const doc = createDocument();
    doc.body.innerHTML = page('one');
    rebuildKeepingInputs(doc.body, page('two'));
    expect(doc.body.querySelector('h1')!.textContent).toBe('two');
  });

  test('typed text in an input with an id survives', () => {
    const doc = createDocument();
    doc.body.innerHTML = page('one');
    (doc.body.querySelector('#a') as any).userInput('hello');
    (doc.body.querySelector('#b') as any).userInput('world');
    rebuildKeepingInputs(doc.body, page('two'));
    expect((doc.body.querySelector('#a') as any).value).toBe('hello');
    expect((doc.body.querySelector('#b') as any).value).toBe('world');
  });

  test('focus survives, on the new element', () => {
    const doc = createDocument();
    doc.body.innerHTML = page('one');
    const old = doc.body.querySelector('#b') as any;
    old.focus();
    rebuildKeepingInputs(doc.body, page('two'));
    const now = doc.body.querySelector('#b') as any;
    expect(now).not.toBe(old);
    expect(doc.activeElement).toBe(now);
  });

  test('an input without an id cannot be matched and starts empty', () => {
    const doc = createDocument();
    doc.body.innerHTML = page('one');
    (doc.body.querySelectorAll('input')[2] as any).userInput('lost');
    rebuildKeepingInputs(doc.body, page('two'));
    expect((doc.body.querySelectorAll('input')[2] as any).value).toBe('');
  });
explain: "It works, for inputs with ids, and every limit of it is instructive: it knows about inputs and nothing else (not scroll positions, not `<details>`, not selections); it needs ids on everything; and the focus it restores is on a *different element* from the one the user was using, so a screen reader announces it again. The patch is not a framework. It is the beginning of one, written badly."
```

## The other road: update by hand

The alternative to rebuilding is the imperative way again, done carefully: keep references to the nodes, and write a handler for every change that updates the ones affected. That is how pre-framework JavaScript was written and how many pieces of performance-critical code are still written, and it has a property that matters: it is the *fastest possible* strategy. It touches exactly the nodes that must change and does no work finding them.

Its cost is somewhere else. For the Notes app there are five things that can happen to the state and five pieces of the page that depend on it: which items exist, each item’s text, each item’s ✓, the summary line and the empty-list message. Each handler must update exactly the pieces its action affects.

::bookkeeping-grid{n="2.2"}

Run the session with the first grid you are given. It looks plausible, and the page goes stale after the first toggle. This is the typical shape of the bug: nothing crashes, nothing is logged, and a *different* piece of the page than the one you were looking at is out of date. Twenty-five cells is a small app. The number of cells is (events) × (things on the page), and the number that matter is what the dependency structure of your program makes it. It grows with every feature, it is invisible in the code, and nothing checks it.

```debug
id: ui-as-a-function/forgotten-update
title: The badge that lags
prompt: "A counter shows its value in a `<span>` and an “even” or “odd” badge. After pressing **+1** the badge is wrong, but **−1** and **reset** work. Click the line after which the missing update belongs."
lang: ts
code: |
  export function createCounter(doc, root) {
    let count = 0;
    const label = doc.createElement('span');
    const badge = doc.createElement('b');
    label.textContent = 'Count: 0';
    badge.textContent = 'even';
    root.appendChild(label);
    root.appendChild(badge);
    return {
      increment() {
        count += 1;
        label.textContent = 'Count: ' + count;
      },
      decrement() {
        count -= 1;
        label.textContent = 'Count: ' + count;
        badge.textContent = count % 2 === 0 ? 'even' : 'odd';
      },
      reset() {
        count = 0;
        label.textContent = 'Count: 0';
        badge.textContent = 'even';
      },
    };
  }
answer:
  line: 12
notes:
  16: "This line is correct, and the next one is what `increment` is missing."
  11: "Updating the count is correct and necessary."
explain: "`increment` updates the label and forgets the badge, while `decrement` remembers both. There is no error to find: the bug is something that is *not there*, in the one handler out of three where the same two lines were not copied. The fix is simple (copy them), and so is the next bug, and the one after it."
tests: |
  import { test, expect } from '@rx/test';
  import { createDocument } from '@rx/dom';
  import { createCounter } from './solution.ts';

  test('the badge follows the count after increment', () => {
    const doc = createDocument();
    const c = createCounter(doc, doc.body);
    c.increment();
    expect(doc.body.textContent).toBe('Count: 1odd');
    c.increment();
    expect(doc.body.textContent).toBe('Count: 2even');
  });

  test('decrement and reset still work', () => {
    const doc = createDocument();
    const c = createCounter(doc, doc.body);
    c.decrement();
    expect(doc.body.textContent).toBe('Count: -1odd');
    c.reset();
    expect(doc.body.textContent).toBe('Count: 0even');
  });
fix:
  12: "      label.textContent = 'Count: ' + count;\n      badge.textContent = count % 2 === 0 ? 'even' : 'odd';"
hints:
  - "Compare `increment` with `decrement`: what does one do that the other does not?"
```

## What the declarative idea really gives you

Put the two roads side by side and a pattern appears.

**Rebuild** is correct by construction and pays at run time, in work and in lost DOM state. **Update by hand** is as fast as it can be and pays in the programmer, in bookkeeping that grows with the program and that nothing checks. Neither is acceptable, and what everything else in this course does is try to get *both*: the programmer writes `UI = f(state)`, the framework works out the minimal set of imperative updates, and the page keeps its nodes.

That gives a three-part job for any such system, and the next fourteen chapters are variations on how each part is done:

1. **Describe.** Evaluate the view for the current state. (A function call; a template; a compiled function.)
2. **Find what changed.** Compare with the previous description, or with a recorded set of dependencies, or with a precomputed map. This is the chapter-0 question.
3. **Apply.** Write the minimal set of DOM operations, in one batch, off the page where possible (chapter 1).

The first step is a solved problem; the third is mostly bookkeeping. The *middle step* is where frameworks differ and what the rest of the course is about.

:::history{year=2013 title="React is open-sourced"}
At JSConf US in 2013 Facebook open-sourced React, and the idea behind it, re-rendering everything and letting the library work out the DOM changes, was greeted with scepticism: it put markup inside JavaScript, and it appeared to re-render the whole page on every change. Pete Hunt’s talk *Rethinking best practices* made the case for the trade, that the cost of the comparison is repaid by never having to write the update logic, and for the first time a large share of front-end developers took the declarative idea seriously. :cite[hunt-rethinking]

The idea was not new. Functional reactive languages for the browser, Elm among them, explored the same shape; and every server-side template engine had always worked this way, because a server renders a page from scratch for every request. What was new was making it cheap enough to do in the browser, repeatedly, on every change.
:::

:::whatchanged
For *rebuild*: everything. It does not look for changes; it assumes them all and starts again, and so is correct by construction and loses all state that lives in the DOM. For *update by hand*: exactly what the programmer remembered to update. The rest of the course is about getting the second one’s efficiency from the first one’s correctness.
:::

## What’s next

The first framework answers in this course did not discard the idea of looking for changes; they tried to *detect* them in the data, at run time. Chapter 3 looks at observers and observable models, and at AngularJS’s *digest loop*, a strategy built on dirty checking everything and a ten-iteration safety limit.
