---
title: Design your own
summary: Choose a strategy for a set of constraints, build a small framework against a test suite, and place the real frameworks on the map.
number: 25
duration: 75 minutes
optional: true
prerequisites: [one-benchmark]
---

This chapter is optional. The rest of the course has been *reading* strategies; here you *choose* and *build* one.

## Choose

Nothing in the last twenty-four chapters said that one answer is best. Each moves work from one place to another (from the browser to the server, from run time to build time, from the programmer to the framework), and pays for it with a rule about what you may write. So the right question is never “which framework is the fastest?” but *“what is the shape of this application’s change, and what can I afford to give up?”*

The **compass** puts that question in front of you. Describe an application with six sliders and a switch: how document-like it is, how much of it is interactive, how big an update is, how many items are on the screen, how weak the devices are, how instantly it must respond, whether it must arrive as HTML. Each *family* of strategies scores against your description, and the compass says what pushed it up or down.

::compass{n="25.1"}

Use the five starting points. Press **A news article** and read the top of the list: server rendering and islands, because the page is a document and almost none of it responds. Press **A spreadsheet**: signals and compiled templates, with Angular’s checking and the virtual DOM close behind, because every cell must respond at once and no server round trip is acceptable. **A chat application** and **A staff dashboard** sit between them, and the lists show it.

Then do what the compass is for, and disagree with it. The weights are one author’s judgement, written in the widget’s source for anyone to change. Move a slider and ask whether the ranking ought to move the way it did. Where would you put a *shop’s product page*? It has content (reviews, descriptions), a few interactive parts (an image gallery, a basket button), a need for search-engine HTML, and shoppers on slow phones. The compass says islands, with server rendering and morphing next. A real shop mixes: the page is HTML from the server, the gallery is an island, the basket is state held in the browser, and checkout is a server-rendered flow.

```predict
q: "A team is building an internal tool: forty screens of forms and tables over a database, used by staff on office computers, behind a login. Search engines never see it. Which strategy does the *least* to help them?"
options:
  - text: "Islands architecture, because the pages are not mostly static content."
    correct: true
    why: "Islands are for content with a few interactive parts: a blog, a docs site, a marketing page. A tool in which most of the screen is forms and tables that react to each other has no static sea for islands to sit in, and its users are on strong devices with no first-paint problem to solve. It is a tool built for a problem this application does not have."
  - text: "Signals with compiled templates, because the screens are full of live state."
    why: "This is a good fit for it: lots of local state, tables that update in place, and strong devices that can run a framework."
  - text: "Server-rendered HTML with morphing (htmx, Turbo, LiveView)."
    why: "A genuinely good fit for a database-backed internal tool: forms and tables over records are what the model does best, the round trip is invisible on an office network, and no frontend application has to be built."
```

:::key
**The strategies are not ranked, and the application chooses.** The same two questions decide almost every case: *where does the state live?* and *how much of each update is the whole page?* The rest is detail, and the detail matters.
:::

## Build

The best way to see what a strategy is for is to build the smallest version of it. The exercise below builds the kind of core that Solid and Vue Vapor are built around: a function that creates real DOM elements, in which **any function you pass is a reactive hole**, with the signals engine of chapters 9 to 11 doing the tracking.

It is a very small framework, and it has the property that every strategy in the course is trying to reach: a change to one signal writes **one** node, with nothing re-rendered or compared.

```build
id: design-your-own/h
title: Write a reactive h()
prompt: |
  Implement `createH(doc, engine)`, which returns `h(tag, props, ...children)`: it creates a real element with `doc.createElement`. For each prop: a name like `onClick` adds an event listener for `click`; a **function** value is a reactive attribute: run it inside `engine.effect` and set the attribute from its result (`false`, `null` and `undefined` remove the attribute, `true` sets it to the empty string; do not write an attribute whose value has not changed); anything else is a static attribute. For each child: a **function** is a reactive text node (create one text node, and in an effect write the function's result to its `data` only when it changed); a string or number is a static text node; an element is appended; an array is flattened. Nothing may be re-created when a signal changes.
starter: |
  import type { MiniDocument, MElement } from '@rx/dom';
  import type { Engine } from '@rx/signals';

  export function createH(doc: MiniDocument, engine: Engine) {
    return function h(tag: string, props: Record<string, unknown> | null, ...children: unknown[]): MElement {
      const el = doc.createElement(tag);
      // TODO: props (static, reactive, events) and children (static, reactive, nested)
      return el;
    };
  }
solution: |
  import { MElement, MNode } from '@rx/dom';
  import type { MiniDocument } from '@rx/dom';
  import type { Engine } from '@rx/signals';

  export function createH(doc: MiniDocument, engine: Engine) {
    function setAttr(el: MElement, name: string, value: unknown): void {
      if (value === false || value === null || value === undefined) {
        if (el.hasAttribute(name)) el.removeAttribute(name);
      } else {
        const text = value === true ? '' : String(value);
        if (el.getAttribute(name) !== text) el.setAttribute(name, text);
      }
    }

    function append(el: MElement, child: unknown): void {
      if (Array.isArray(child)) return child.forEach((c) => append(el, c));
      if (typeof child === 'function') {
        const text = doc.createTextNode('');
        el.appendChild(text);
        engine.effect(() => {
          const next = String((child as () => unknown)() ?? '');
          if (text.data !== next) text.data = next; // one text write, only when it changed
        });
      } else if (child instanceof MNode) {
        el.appendChild(child);
      } else if (child !== null && child !== undefined && child !== false) {
        el.appendChild(doc.createTextNode(String(child)));
      }
    }

    return function h(tag: string, props: Record<string, unknown> | null, ...children: unknown[]): MElement {
      const el = doc.createElement(tag);
      for (const [name, value] of Object.entries(props ?? {})) {
        if (/^on[A-Z]/.test(name)) el.addEventListener(name.slice(2).toLowerCase(), value as (e: unknown) => void);
        else if (typeof value === 'function') engine.effect(() => setAttr(el, name, (value as () => unknown)()));
        else setAttr(el, name, value);
      }
      for (const child of children) append(el, child);
      return el;
    };
  }
tests: |
  import { test, expect } from '@rx/test';
  import { createDocument } from '@rx/dom';
  import { createEngine } from '@rx/signals';
  import { createH } from './solution.ts';

  function setup() {
    const doc = createDocument();
    const engine = createEngine('colour');
    const h = createH(doc, engine);
    return { doc, engine, h };
  }

  test('static elements, attributes and text', () => {
    const { h } = setup();
    const el = h('p', { class: 'note', hidden: true, title: null }, 'Hello, ', 'world ', 3);
    expect(el.outerHTML).toBe('<p class="note" hidden="">Hello, world 3</p>');
  });

  test('elements nest, and arrays are flattened', () => {
    const { h } = setup();
    const el = h('ul', null, ['a', 'b'].map((x) => h('li', null, x)));
    expect(el.outerHTML).toBe('<ul><li>a</li><li>b</li></ul>');
  });

  test('a function child is a reactive text node: a change writes one text node', () => {
    const { doc, engine, h } = setup();
    const count = engine.signal(0);
    const el = h('p', null, 'Count: ', () => count.get());
    doc.body.appendChild(el);
    expect(el.outerHTML).toBe('<p>Count: 0</p>');
    const mark = doc.mark();
    count.set(1);
    const s = doc.statsSince(mark);
    expect(el.outerHTML).toBe('<p>Count: 1</p>');
    expect(s.total).toBe(1);
    expect(s.texts).toBe(1);
  });

  test('a function prop is a reactive attribute, written only when it changes', () => {
    const { doc, engine, h } = setup();
    const count = engine.signal(0);
    const el = h('p', { class: () => (count.get() > 5 ? 'big' : '') }, 'x');
    doc.body.appendChild(el);
    count.set(5);
    const mark = doc.mark();
    count.set(6);
    expect(doc.statsSince(mark).attrs).toBe(1);
    expect(el.getAttribute('class')).toBe('big');
    const mark2 = doc.mark();
    count.set(7);
    expect(doc.statsSince(mark2).total).toBe(0);
  });

  test('a false value removes a reactive attribute', () => {
    const { engine, h } = setup();
    const on = engine.signal(true);
    const el = h('button', { disabled: () => on.get() }, 'go');
    expect(el.hasAttribute('disabled')).toBe(true);
    on.set(false);
    expect(el.hasAttribute('disabled')).toBe(false);
  });

  test('onClick adds a click listener', () => {
    const { engine, h } = setup();
    const count = engine.signal(0);
    const button = h('button', { onClick: () => count.set(count.get() + 1) }, '+1');
    button.click();
    button.click();
    expect(count.peek()).toBe(2);
  });

  test('two holes update independently, and static parts are never touched', () => {
    const { doc, engine, h } = setup();
    const first = engine.signal('Ada');
    const last = engine.signal('Lovelace');
    const el = h('div', null, h('h1', null, 'Profile'), h('p', null, () => first.get(), ' ', () => last.get()), h('footer', null, 'static'));
    doc.body.appendChild(el);
    const mark = doc.mark();
    first.set('Grace');
    const s = doc.statsSince(mark);
    expect(s.total).toBe(1);
    expect(el.outerHTML).toBe('<div><h1>Profile</h1><p>Grace Lovelace</p><footer>static</footer></div>');
  });

  test('a small app: the counter of the course', () => {
    const { doc, engine, h } = setup();
    const count = engine.signal(0);
    const app = h(
      'div',
      { class: 'counter' },
      h('h1', null, 'Counter'),
      h('p', { class: () => (count.get() > 5 ? 'big' : '') }, 'Count: ', () => count.get()),
      h('button', { onClick: () => count.set(count.get() + 1) }, '+1'),
    );
    doc.body.appendChild(app);
    const button = app.querySelector('button')!;
    for (let i = 0; i < 5; i++) button.click();
    const mark = doc.mark();
    button.click(); // the sixth: the text and the class
    expect(doc.statsSince(mark).total).toBe(2);
    const mark2 = doc.mark();
    button.click(); // the seventh: only the text
    expect(doc.statsSince(mark2).total).toBe(1);
  });
hints:
  - "A reactive hole is `engine.effect(() => write(fn()))`: the effect re-runs when any signal `fn` read changes."
  - "For a function child, create the text node first and append it, then let the effect write to its `data`."
  - "To avoid redundant writes, compare with the current value before writing: `if (text.data !== next)`, and the same for attributes."
explain: "About thirty lines, and the core of a real framework: elements are created once, and every dynamic part is an effect on exactly one node. It is chapter 12's compiled output with the compiler removed: where the compiler would have found the holes, you passed functions. What this lacks is what the course has described since: a template compiler so that you write HTML rather than nested calls, lists with keyed rows (`mapArray`), ownership so that effects in a removed branch are disposed (chapter 11), a scheduler for batching, and server rendering and hydration. Each is an add-on to this core."
```

## Place

Now put the real frameworks on a map. Two questions place them, and they extend the questions of chapter 19. **What does the framework find out at build time, and what at run time?** And **where does the code run?**

| | Decided at build time | Discovered at run time | Runs in the browser |
|---|---|---|---|
| **React** | memoization (with the Compiler) | the changes, by diffing | everything, hydrated |
| **Next.js (RSC)** | which modules are client | the changes, by diffing client parts | client components only |
| **Vue** | static nodes, patch flags | which component read what | everything (default mode) |
| **Solid** | the holes of every template | which signals each hole read | everything, hydrated |
| **Svelte 5** | holes, constants, signals | which signals each effect read | everything, hydrated |
| **Angular** | the update block | which views to check (or notified) | everything, hydrated |
| **Lit** | nothing (no build needed) | each hole’s value against its last | the elements |
| **Astro** | which components are islands | whatever each island’s framework does | the islands |
| **Qwik** | the closures’ chunks and subscriptions | nothing at load: a click’s handler | the handler that ran |
| **htmx and Turbo** | nothing | the difference between DOM and HTML, by morphing | a small library |

Read the table against the six answers of chapter 0: **rebuild** survives in htmx; **dirty-check** is Angular’s; **diff** is React’s and Vue’s; **track** is Solid’s, Vue’s refs and Svelte 5’s; **compile** is everyone’s lean toward the left column; **skip** is Astro’s, RSC’s and Qwik’s. **Every real framework mixes them.** Vue is a diff *and* a tracker; Angular is a checker *and* a tracker; Next.js is a server renderer *and* a differ; Svelte 5 is a compiler *and* a tracker. The six answers are not six kinds of framework. They are six tools, and the frameworks are particular combinations.

:::programmer
**What to take from the course.** When you meet a new framework, or a new version of an old one, do not ask what it is called or whether it is fast. Ask the three questions. *What does it find out before the page runs? How does it find out what changed once it does? Where does the code run, and what does the browser have to download and execute before it responds?* The answers sort it into the map, and the map says what it is good at.
:::

:::whatchanged
All of them, together. This is the chapter where the six answers stop being a list and become the axes of a decision: *build time or run time, compare or record, browser or server*. A framework is a point in that space, and an application is a pattern of changes that is cheap in some places and costly in others.
:::

## What’s next

The last chapter looks forward: what the field is converging on, what is still open, and where to read more.
