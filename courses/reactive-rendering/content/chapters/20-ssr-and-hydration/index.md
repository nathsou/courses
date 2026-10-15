---
title: SSR and hydration
summary: Run the components on the server, send the HTML, and make the page work. Rendering to a string is easy. Taking the result over in the browser, without losing it, is the problem every framework has to solve.
number: 20
duration: 60 minutes
prerequisites: [templates-and-solid, five-compilers]
---

Every chapter so far assumed that the page is built *in the browser*. The HTML file is nearly empty, a script runs, and the script creates the page. It is simple, and it has an obvious cost: until the script has been downloaded, parsed and run, there is nothing to see.

The alternative is to run the components **on the server**, send finished HTML, and let the browser show it while the script is still on its way. That is *server-side rendering*, and it raises a harder question than it answers.

## Rendering to a string

The first half is easy. A component is a function from state to a description of the page (chapter 2). On the server there is no DOM, but a description can be turned into a string just as well as into nodes:

```js
renderToString(h('p', { class: 'note' }, 'Hello, ', name, '!'))
// '<p class="note">Hello, <!-- -->Ada<!-- -->!</p>'
```

A few details differ from browser rendering, and they follow from what a server *is*:

- **Components run once.** There is no “after the page is shown”, so `useEffect` never runs and `useState` returns its initial value. State that changes on a click has no click to wait for.
- **Everything is escaped.** The result is a string that a browser will *parse*, so `<` in a name must become `&lt;`, and a quote in an attribute `&quot;`. Forgetting this is the classic injection bug.
- **Adjacent text is separated.** Two text nodes next to each other would be merged by the HTML parser into one. React writes `<!-- -->` between them, so that the client finds the same two nodes it would have created itself (that is the `<!-- -->` in the example).
- **Event handlers are dropped.** A function cannot be written into HTML. `onClick` is simply omitted, and that is the seed of the whole problem.

```build
id: ssr-and-hydration/render-to-string
title: Write renderToString
prompt: |
  Implement `renderToString(node)`. A node is a string, a number, `true`/`false`/`null`/`undefined` (renders nothing), an array of nodes, or an element `{ type, props, children }` made by `h` (given). `type` is a tag name or a component function: call a component with `{ ...props, children }` and render what it returns. Escape `&`, `<` and `>` in text, and `&`, `"` in attribute values. `className` becomes `class`; attributes whose value is `null`, `undefined` or `false` are left out; `true` writes just the name; handler props (`onClick`, `onInput`... an `on` followed by a capital letter) are omitted. The void tags `input`, `br`, `img` and `hr` have no closing tag. When two text nodes would be adjacent in the output, put `<!-- -->` between them.
starter: |
  export type Child = string | number | boolean | null | undefined | Element | Child[];
  export interface Element {
    type: string | ((props: any) => Child);
    props: Record<string, any>;
    children: Child[];
  }

  export const h = (type: Element['type'], props: Record<string, any> | null, ...children: Child[]): Element => ({ type, props: props ?? {}, children });

  export function renderToString(node: Child): string {
    // TODO
    return '';
  }
solution: |
  export type Child = string | number | boolean | null | undefined | Element | Child[];
  export interface Element {
    type: string | ((props: any) => Child);
    props: Record<string, any>;
    children: Child[];
  }

  export const h = (type: Element['type'], props: Record<string, any> | null, ...children: Child[]): Element => ({ type, props: props ?? {}, children });

  const VOID = new Set(['input', 'br', 'img', 'hr']);
  const escapeText = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const escapeAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

  function attrs(props: Record<string, any>): string {
    let out = '';
    for (const [name, value] of Object.entries(props)) {
      if (/^on[A-Z]/.test(name)) continue; // functions cannot be written into HTML
      if (value === null || value === undefined || value === false) continue;
      const key = name === 'className' ? 'class' : name;
      out += value === true ? ` ${key}` : ` ${key}="${escapeAttr(String(value))}"`;
    }
    return out;
  }

  export function renderToString(node: Child): string {
    let out = '';
    let prevWasText = false;
    const walk = (n: Child): void => {
      if (Array.isArray(n)) return n.forEach(walk);
      if (n === null || n === undefined || typeof n === 'boolean') return;
      if (typeof n === 'string' || typeof n === 'number') {
        if (prevWasText) out += '<!-- -->';
        out += escapeText(String(n));
        prevWasText = true;
        return;
      }
      if (typeof n.type === 'function') return walk(n.type({ ...n.props, children: n.children }));
      prevWasText = false;
      out += `<${n.type}${attrs(n.props)}>`;
      if (VOID.has(n.type)) return;
      n.children.forEach(walk);
      prevWasText = false;
      out += `</${n.type}>`;
    };
    walk(node);
    return out;
  }
tests: |
  import { test, expect } from '@rx/test';
  import { h, renderToString } from './solution.ts';

  test('elements, attributes and text', () => {
    expect(renderToString(h('p', { className: 'note', id: 'a' }, 'Hello'))).toBe('<p class="note" id="a">Hello</p>');
  });

  test('numbers render, and true, false, null and undefined render nothing', () => {
    expect(renderToString(h('p', null, 3, true, false, null, undefined))).toBe('<p>3</p>');
  });

  test('text and attribute values are escaped', () => {
    expect(renderToString(h('p', { title: 'say "hi" & go' }, '<b>1 & 2</b>'))).toBe('<p title="say &quot;hi&quot; &amp; go">&lt;b&gt;1 &amp; 2&lt;/b&gt;</p>');
  });

  test('handlers and empty attributes are left out; true writes the bare name', () => {
    const html = renderToString(h('button', { onClick: () => {}, disabled: true, hidden: false, title: null }, 'Go'));
    expect(html).toBe('<button disabled>Go</button>');
  });

  test('void tags have no closing tag and no children', () => {
    expect(renderToString(h('div', null, h('input', { type: 'text' }), h('br', null)))).toBe('<div><input type="text"><br></div>');
  });

  test('components are called with their props and children', () => {
    const Card = ({ title, children }: any) => h('section', null, h('h2', null, title), children);
    expect(renderToString(h(Card, { title: 'Hi' }, h('p', null, 'body')))).toBe('<section><h2>Hi</h2><p>body</p></section>');
  });

  test('arrays are flattened', () => {
    expect(renderToString(h('ul', null, ['a', 'b'].map((x) => h('li', null, x))))).toBe('<ul><li>a</li><li>b</li></ul>');
  });

  test('adjacent text nodes are separated so the browser keeps them apart', () => {
    expect(renderToString(h('p', null, 'Hello, ', 'Ada', '!'))).toBe('<p>Hello, <!-- -->Ada<!-- -->!</p>');
  });

  test('text after an element needs no separator', () => {
    expect(renderToString(h('p', null, 'a', h('b', null, 'b'), 'c'))).toBe('<p>a<b>b</b>c</p>');
  });

  test('a null between two texts does not hide that they are adjacent', () => {
    expect(renderToString(h('p', null, 'a', null, 'b'))).toBe('<p>a<!-- -->b</p>');
  });
hints:
  - "Walk the tree and append to one output string. Keep a flag `prevWasText`: set it when you write text, clear it when you write a tag."
  - "A component is just a function: call it with `{ ...props, children }` and render whatever it returns."
explain: "That is the core of `react-dom/server` and every framework's string renderer: a tree walk that appends strings. The only subtle rule is the comment between adjacent text nodes, which exists purely so that the client's tree matches: the next section is about why that matters. Real renderers add streaming (writing the string in chunks as parts become ready), Suspense boundaries, and `<script>` data for the client."
```

## The second half: taking it over

Now the browser has a page. It looks right. And it is *dead*: there are no event listeners, because the server could not send functions. The components' state lives nowhere; `useState` was never attached to a component instance that survives. To become an application, the page needs the framework **in the browser**, which means downloading the JavaScript and *running the components again*.

The simple way would be to throw the server’s HTML away and render from scratch: that is the client-only render again, plus a flash. **Hydration** does something cleverer: it runs the components in the browser *again*, and instead of creating DOM nodes, it **walks the existing HTML and claims each node** for the component that would have made it. When it is done, the DOM is the same, the framework has its tree of component instances (with state), and the event listeners are attached.

Try it. The server rendered the component to a string; the page shows that HTML, but nothing is listening. Press **Hydrate** and look at what it did.

::hydration-lab{n="20.1"}

With the first preset (*Matching*), hydration is almost free in DOM terms: every node is **claimed**, none is created, none is rewritten, and the one DOM operation the lens shows is the listener on the button. Try *+1* before hydrating: nothing, because nothing is listening. Then hydrate and click again.

Hydration’s job is four things at once: **claim** the DOM nodes, **attach** the handlers the HTML could not carry, **rebuild** the component state and closures (by running the components), and **run** the effects that the server skipped. The first is cheap. The other three are the *entire cost of running the application*, paid a second time.

## What goes wrong

Hydration only works if the client’s render **produces the same tree** as the server’s. Walking and claiming nodes is a *trust exercise*: the client assumes that the *n*th child of the `div` is the thing its *n*th vnode would have created. When that is false, the framework has three bad options: crash, silently produce a page where handlers are attached to the wrong elements, or detect the mismatch and rebuild. React logs a warning and falls back to client rendering for the part that mismatched; the lab does the same and tells you where.

Switch the figure through the mismatching presets:

- **The time differs.** The component calls something that depends on *when* it runs. The text is wrong for a moment, and in the lab the client rewrites it.
- **Browser-only branch.** The component looks at the window width during render. The server has no window, so it renders the narrow version; the client renders the wide one. A whole element is missing from the server HTML, and the client has to create it.
- **Random ids.** The server and client each generate an id. The `label` and the `input` now disagree about each other, and the attributes differ.

```debug
id: ssr-and-hydration/clock
title: The warning in the console
prompt: "This component works perfectly in a client-only app. With server rendering, the console says the server HTML did not match the client. Click the line responsible."
lang: jsx
code: |
  function Clock() {
    const now = new Date().toLocaleTimeString();
    const [visible, setVisible] = useState(true);
    return (
      <div>
        <p>It is {now}</p>
        <button onClick={() => setVisible(!visible)}>Toggle</button>
        {visible && <p>Visible</p>}
      </div>
    );
  }
answer:
  line: 2
notes:
  3: "State that starts the same on both sides is fine: the server rendered `visible` as true, and so will the client."
  6: "This is where the mismatch shows up, but it is a symptom: the cause is the value being printed."
  10: "A conditional on state is fine as long as the state starts the same on both sides."
explain: "`new Date()` gives a different answer on the server and on the client: the render is not a function of its props and state alone. Hydration assumes that it is. The fixes are to render the time on the server and send it to the client with the HTML, or to render something stable first and update after hydration, in an effect: `const [now, setNow] = useState(null); useEffect(() => setNow(new Date()), [])`. The same applies to `Math.random()`, `window` checks, locale and timezone formatting, and anything else that depends on *where* or *when* the code runs."
hints:
  - "Which line reads something that is different on the server and in the browser?"
```

The cure the figure’s last preset shows is the one to remember: **make the first client render equal the server’s, and update after hydration.** The `useEffect` in that preset runs only on the client, only after hydration, so it cannot cause a mismatch. It does cause an update, a visible one, as the sidebar pops in.

## What hydration costs

Hydration repeats work. The server ran the components to produce HTML; the browser has to run *the same components* on the same data to build its own tree. The HTML arrived in the first place so that people would not wait for JavaScript, and now the JavaScript, plus all the data that the components need, plus the work of walking the page, is exactly what they are waiting for. The server’s work is being done twice.

Here is the arithmetic as a model. Server rendering makes the content **visible** early. It cannot make it **interactive** any earlier, and it adds hydration to the work that has to happen before the page responds. The shaded region is the “uncanny valley”: the page looks ready, and taps do nothing.

::valley{n="20.2"}

Slide the JavaScript size up and switch to the slower phone. The visible moment barely moves, because it depends on the HTML. The interactive moment moves a lot, because it depends on the JavaScript and the CPU. The valley between them, where users tap and nothing happens, widens. The model’s constants are round numbers, so do not quote the milliseconds. The *shape* is what the numbers show: two clocks, and server rendering moves only one.

:::key
**Hydration trades a blank page for a dead one.** It makes the first paint fast, and leaves the page unresponsive until the framework has re-run the application in the browser. Every idea in the next two chapters is a way to shrink that interval by *not re-running* some or all of the application.
:::

## How each framework leaves hints

Hydration needs the HTML to carry enough information for the client to match it, or the client has to re-derive that information by running the same code in the same order. The strategies differ:

| | How the client finds its place in the server HTML |
|---|---|
| **React** | By walking in render order. `<!-- -->` separates adjacent text, and `<!--$-->` and `<!--/$-->` mark Suspense boundaries, so that parts can hydrate separately. |
| **Solid** | Hydration keys: each element a component creates dynamically is written with a `data-hk` key, and text holes are wrapped in `<!--$-->…<!--/-->`. Solid’s server output has a call to `ssrHydrationKey()` for this. |
| **Svelte 5** | Comment markers around blocks (`<!--[-->` and `<!--]-->`), and a walk in the same order the compiler wrote. |
| **Angular** | A serialized description of the DOM structure, in an `ngh` attribute and in the page’s state transfer, that the client uses to match nodes without re-deriving the structure. |
| **Lit** | Comment markers (`<!--lit-part-->`) for each part, which the client finds with the same tree walk as chapter 16. |

Each of these is a different answer to the same question, *how do I know which DOM node is mine?*, with different trade-offs between HTML size and client work. The cost of the weakest answer, “walk in the same order and hope”, is the mismatch problem above.

:::programmer
**Data has to travel too.** A component that fetched user data on the server renders from it. The client has to render from the *same* data, or the trees will differ, so the data is written into the page too: a `<script type="application/json">` or an inline assignment. Look at the source of a server-rendered app and you will usually find the data twice: once as HTML, once as JSON. This is a second cost of hydration, and one of the things the next two chapters set out to avoid.
:::

:::wild{framework="React" version="19"}
React 19 reports hydration mismatches with a diff in the console (it shows both versions of the text or attributes) and, since 18, hydrates **selectively**: server HTML streamed with Suspense boundaries is hydrated boundary by boundary, and a click on a part that has not yet hydrated raises that part’s priority. Angular offers *incremental hydration* (`@defer (hydrate on …)` blocks that hydrate on viewport, interaction or idle), and Vue has lazy hydration strategies (`hydrateOnIdle`, `hydrateOnVisible`) for async components. All of them are ways of making the valley narrower without removing it.
:::

:::history{year=2016 title="From Next.js to streaming"}
Server rendering of single-page applications reached many developers through Next.js (2016), which made React’s `renderToString` plus client takeover the default. React could already reuse server markup in `ReactDOM.render` (with a checksum, in version 15); version 16 (2017) added `hydrate`, and version 18 (2022) added `hydrateRoot` with streaming and Suspense. :cite[react-hydration] Solid, Vue, Angular (version 16, 2023) and Svelte all added their own. The trend of the next two chapters is the reverse: avoiding the second run.
:::

:::whatchanged
For *skip*, a first step: **the server already did the work of the first render**, and the client claims its result. The client still has to run the components to build state and closures, so the saving is in DOM creation, not in code that has to run. The chapters that follow remove that remaining cost, by hydrating less (islands, chapter 21) and by not hydrating at all (resumability, chapter 22).
:::

## What’s next

Chapter 21 asks what happens if most of the page never needs to come alive: a blog post with one interactive widget. The answer is to send JavaScript for the widget only, and, in React’s version, to keep the rest of the components on the server permanently.
