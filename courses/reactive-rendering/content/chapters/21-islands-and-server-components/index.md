---
title: Islands and server components
summary: Most of most pages never changes. Hydrate only the parts that do (islands), or keep the rest of the components on the server for good (server components).
number: 21
duration: 60 minutes
prerequisites: [ssr-and-hydration]
---

Chapter 20 ended with a bill. Hydration re-runs *every* component in the browser, and ships all their code, so that the page can respond. Now look at a typical page: a blog post. A header, an article of fifty paragraphs, a like button, a comments form, a footer. Of those, **two components ever respond to anything**. Forty-eight paragraphs, the header and the footer are text and links, and the browser will never need to run the code that made them.

Hydrating the paragraphs is waste, and there are two ways to stop. One is an **architecture**: split the page into static HTML and small interactive *islands*. The other is a **programming model**: let some components run on the server and *never reach the browser at all*.

## Islands

An island is a piece of the page that is hydrated on its own, surrounded by HTML that is never hydrated. The page is HTML; the islands are small programs that take over the parts of it that need to be alive.

```html
<article> …forty-eight static paragraphs… </article>

<div data-island="LikeButton" data-client="load" data-props='{"initial":3}'>
  <button>♥ 3</button>          <!-- the server-rendered HTML of the island -->
</div>

<div data-island="Comments" data-client="visible" data-props='{"post":42}'>
  …form and list…
</div>
```

Each island carries three things: **which component** it is, **its props**, written into the page as data, and **when to wake it**. A small runtime finds them and starts each one: nothing else on the page runs.

Astro made this approach popular and calls the timing a *client directive*: `client:load` (hydrate immediately), `client:idle` (when the browser is idle), `client:visible` (when it scrolls into view), `client:only` (do not server-render it at all). :cite[astro-islands] The term *islands architecture* was popularised by Jason Miller in 2020, for the shape of the idea: a sea of static HTML with islands of interactivity. :cite[miller-islands]

Use the figure to put numbers on it. The page below has six components. In **Hydrate everything**, everything is a component of one application, and all of it ships. Switch to **Islands**, and only the three that need the browser do.

::page-budget{n="21.1" mode="all"}

Two things to notice. First, the *Article body*: it needs a Markdown library of 58 KB to turn the post into elements. In *Hydrate everything*, the browser downloads that library and runs it again, to produce HTML that it already has. Once the article is not an island, the library is gone from the page. Second, the **runtime** (45 KB here, to make the numbers visible) is paid once, as soon as there is any island. In a framework designed around islands it is much smaller: Astro itself ships no runtime for a page without islands.

:::key
**An island is a hydration boundary.** Inside it, everything is a normal application; outside it, there is no application at all, only HTML. The cost of interactivity becomes proportional to the *interactive parts*, not to the size of the page.
:::

### The islands’ limits

Because islands are independent, three things get harder:

- **No shared tree.** Each island is a separate application root. State cannot be passed through props from one to another, so they communicate through something outside the tree: a store, a custom event, the URL.
- **Props are data.** They travel in the HTML as JSON, so they must be serializable. A function cannot be an island’s prop.
- **Static children are not composable.** An island cannot easily wrap static content that the server rendered: that HTML is outside its tree. (Frameworks provide *slots* for this, with their own limits.)

And page navigation is usually a **normal page load**: each page is a document, and clicking a link fetches a new one, which suits content sites and fights with app-like behaviour that persists across routes.

## Build it

The runtime half of an island system is small. This exercise writes it: find the islands in the page, read their props, and hydrate each one at the right time. The browser APIs are passed in (`whenIdle` and `whenVisible`) so that tests can trigger them by hand.

```build
id: islands-and-server-components/runtime
title: Write the islands runtime
prompt: |
  Implement `hydrateIslands(root, registry, env)`. Find every element in `root` that has a `data-island` attribute. Its value is the island's name: look it up in `registry`, a map from name to a function `(element, props) => void` (an unknown name is an error: throw `Error("Unknown island: <name>")`). Its props are the JSON in `data-props` (no attribute means `{}`). `data-client` says when to hydrate: `"load"` (the default) hydrates now; `"idle"` calls `env.whenIdle(callback)` and hydrates when the callback runs; `"visible"` calls `env.whenVisible(element, callback)` and hydrates when that callback runs. An island must be hydrated at most once, even if its callback fires twice.
starter: |
  import type { MElement } from '@rx/dom';

  type Registry = Record<string, (el: MElement, props: any) => void>;
  interface Env {
    whenIdle(run: () => void): void;
    whenVisible(el: MElement, run: () => void): void;
  }

  export function hydrateIslands(root: MElement, registry: Registry, env: Env): void {
    // TODO
  }
solution: |
  import type { MElement } from '@rx/dom';

  type Registry = Record<string, (el: MElement, props: any) => void>;
  interface Env {
    whenIdle(run: () => void): void;
    whenVisible(el: MElement, run: () => void): void;
  }

  export function hydrateIslands(root: MElement, registry: Registry, env: Env): void {
    for (const el of root.querySelectorAll('[data-island]')) {
      const name = el.getAttribute('data-island')!;
      const component = registry[name];
      if (!component) throw new Error(`Unknown island: ${name}`);
      const props = JSON.parse(el.getAttribute('data-props') ?? '{}');
      let done = false;
      const start = () => {
        if (done) return;
        done = true;
        component(el, props);
      };
      const when = el.getAttribute('data-client') ?? 'load';
      if (when === 'idle') env.whenIdle(start);
      else if (when === 'visible') env.whenVisible(el, start);
      else start();
    }
  }
tests: |
  import { test, expect } from '@rx/test';
  import { createDocument } from '@rx/dom';
  import { hydrateIslands } from './solution.ts';

  function page(html: string) {
    const doc = createDocument();
    const root = doc.createElement('div');
    doc.body.appendChild(root);
    root.innerHTML = html;
    return root;
  }
  function envStub() {
    const idle: (() => void)[] = [];
    const visible = new Map<unknown, () => void>();
    return {
      idle,
      visible,
      env: {
        whenIdle: (run: () => void) => void idle.push(run),
        whenVisible: (el: unknown, run: () => void) => void visible.set(el, run),
      },
    };
  }

  test('an island with no data-client hydrates at once, with its props', () => {
    const root = page('<p>text</p><div data-island="Like" data-props=\'{"initial":3}\'><button>3</button></div>');
    const calls: [string, unknown][] = [];
    const { env } = envStub();
    hydrateIslands(root, { Like: (el, props) => void calls.push([el.tagName ?? 'x', props]) }, env);
    expect(calls.length).toBe(1);
    expect(calls[0]![1]).toEqual({ initial: 3 });
  });

  test('missing props mean an empty object', () => {
    const root = page('<div data-island="A"></div>');
    let seen: unknown;
    hydrateIslands(root, { A: (_el, props) => void (seen = props) }, envStub().env);
    expect(seen).toEqual({});
  });

  test('"idle" waits for the idle callback', () => {
    const root = page('<div data-island="A" data-client="idle"></div>');
    const { env, idle } = envStub();
    let n = 0;
    hydrateIslands(root, { A: () => void n++ }, env);
    expect(n).toBe(0);
    idle[0]!();
    expect(n).toBe(1);
  });

  test('"visible" waits for that element to become visible', () => {
    const root = page('<div data-island="A" data-client="visible" id="a"></div><div data-island="B" data-client="visible" id="b"></div>');
    const { env, visible } = envStub();
    const log: string[] = [];
    hydrateIslands(root, { A: () => void log.push('A'), B: () => void log.push('B') }, env);
    expect(log).toEqual([]);
    const b = root.querySelector('#b')!;
    visible.get(b)!();
    expect(log).toEqual(['B']);
    visible.get(root.querySelector('#a')!)!();
    expect(log).toEqual(['B', 'A']);
  });

  test('an island hydrates at most once', () => {
    const root = page('<div data-island="A" data-client="visible"></div>');
    const { env, visible } = envStub();
    let n = 0;
    hydrateIslands(root, { A: () => void n++ }, env);
    const run = [...visible.values()][0]!;
    run();
    run();
    expect(n).toBe(1);
  });

  test('an unknown island is an error that names it', () => {
    const root = page('<div data-island="Nope"></div>');
    expect(() => hydrateIslands(root, {}, envStub().env)).toThrow('Unknown island: Nope');
  });

  test('plain elements are never touched', () => {
    const root = page('<p>a</p><div data-island="A"></div><p>b</p>');
    let n = 0;
    hydrateIslands(root, { A: () => void n++ }, envStub().env);
    expect(n).toBe(1);
  });
hints:
  - "`root.querySelectorAll('[data-island]')` finds the islands. Read the three attributes with `getAttribute`."
  - "Wrap the hydration in a function that sets a flag the first time it runs, and give that function to whichever trigger applies."
explain: "That is the whole of an island runtime: a query, a JSON parse and three triggers. Astro's is a custom element (`<astro-island>`) that does this when the browser upgrades it, with `client:visible` implemented using an `IntersectionObserver` and `client:idle` using `requestIdleCallback`. The cost model it creates is the reason for the figure: nothing runs for static HTML, and each island pays for itself, when it is needed."
```

## Server components

React took the same observation and answered with a programming model instead of an architecture. In a **React Server Component**, the component runs *only on the server*, and what reaches the browser is not its code, nor its HTML, but its **output** as data. :cite[rsc-rfc]

Look at the difference in what you can write:

```jsx
// A server component. Its code never ships. It may be async, and read the database directly.
async function Article({ id }) {
  const post = await db.posts.get(id);                      // runs on the server
  const html = markdownToElements(post.body);               // a 58 KB library that stays home
  return <article><h1>{post.title}</h1>{html}<Like postId={id} initial={post.likes} /></article>;
}

// A client component. It is ordinary React: state, effects, events. Its code ships.
'use client';
function Like({ postId, initial }) {
  const [likes, setLikes] = useState(initial);
  return <button onClick={() => setLikes(likes + 1)}>♥ {likes}</button>;
}
```

The `'use client'` directive marks a **boundary**. Everything above it is server-only; the file it appears in, and what it imports, is client code. A server component can render a client component and pass it props; a client component cannot import a server one, though it can *receive* server-rendered elements as `children`.

What travels over the network is a stream of **rows**. Switch the figure to *Server components* and read the payload it builds, produced by the lab’s own serializer.

::page-budget{n="21.2" mode="rsc"}

Each row is a piece of the tree. The first holds the page as nested elements: `["$","header",null,{…}]` is an element, with its type, its key and its props. The server components have **vanished**: what is left is the elements they returned. Where a client component should go there is a reference, `"$L1"`, which points to another row: a *module reference* that tells the browser which JavaScript file to load. The props are written next to it, as JSON.

That is why **props crossing the boundary must be serializable**: they are literally written into the stream. A function cannot cross; React’s answer, for events that need server code, is a **Server Action**: a function marked `'use server'`, which crosses as a reference the browser calls back over the network.

The browser reads the rows, loads the referenced modules, and builds the same element tree it would have built by itself. Then it renders (and hydrates) as in chapter 20, with one difference: **the server components in that tree are already data.** They never run in the browser, they have no state, and they cost no JavaScript. The 58 KB of Markdown library in the figure is gone.

:::key
**Server components move the hydration boundary to the *module*.** There is no dependence on the page’s layout: any component can be server-only or client, and the framework works out what to ship from the import graph. Islands choose their boundary by the page’s HTML; RSC chooses it by where `'use client'` is written.
:::

### What RSC adds to islands

The structure is different from islands in more than where the boundary is.

- **One tree.** Server and client components belong to a single React tree. A client component can contain server components as children; context, props and keys work across the line, within the rules of serialization.
- **Navigation without a reload.** Clicking a link asks the server for the *new payload* for the next route, and React **merges it into the existing client tree**: the server parts are replaced, and client components that remain (a sidebar with state, a playing video) keep their state. An MPA of islands cannot do this.
- **Direct data access.** `await db.query(…)` is in the component. There is no API layer in between, no loading state to write for it, and nothing sent to the client but the result.
- **Streaming.** Rows can be sent as they become ready: a slow component does not hold up the rest, and a Suspense boundary in the payload becomes a placeholder that the stream later fills.

And it brings costs. The mental model has two worlds, with rules about what may cross. The server must be a *running application*, not a folder of static files; payloads are written in a framework-specific format. And the client still hydrates *its* components, so the valley of chapter 20 narrows without disappearing.

```predict
q: "In the figure's *Server components* mode, you mark the Article body as a client component, because a teammate wants to use `useState` in it. What happens to the page's cost?"
options:
  - text: "Nothing changes: it is the same component, in the same page."
    why: "It is the same *source*, but where it runs has changed, and with it what ships. The directive is a statement about the JavaScript the browser will download."
  - text: "The page ships the component and its libraries: the 58 KB Markdown library goes into the bundle again, and the article is hydrated."
    correct: true
    why: "A client component's code, and everything it imports, is sent to the browser. The Markdown conversion that ran on the server for free now has to run in the browser as well, to hydrate the same article. A common design rule follows: put the `'use client'` boundary as low in the tree as it can go, around the one button, not around the page."
  - text: "The page gets faster, because the work moves from the server to the browser."
    why: "The browser has to download, parse and run more, and the server still renders the HTML. It is only the first of the two clients that is saved by doing the work on the server."
```

## Other paths to the same place

The chapter’s question, *how little of the app does the browser need to run?*, has other answers.

- **Angular’s `@defer (hydrate on …)`** hydrates a block on viewport, idle, interaction or a timer: islands-by-trigger *inside* a single Angular application.
- **Vue and Nuxt** offer lazy hydration for components and, in Nuxt, *server components* and *islands* of their own.
- **Astro’s server islands** let a static page include a server-rendered piece that is fetched after load.
- **Qwik** removes the rerun entirely. That is chapter 22.

:::programmer
**Deciding where to put the boundary.** With islands or server components the question for each component is the same: *does it need to respond in the browser?* If it has state, effects or event handlers that change what is on the screen, yes. If it only turns data into elements, no. Static-looking components that *contain* an interactive one (a card with a like button) are the cases that need design: with islands, the card is HTML and the button is an island; with RSC, the card is a server component and the button a client component that it renders.
:::

:::wild{framework="React, Astro" version="2026"}
React Server Components became a stable part of React 19 (December 2024), but they need a framework that implements the server half: Next.js (the App Router, since 2023) is the main one, with others such as Waku. Astro (1.0 in 2022) is the best-known islands framework, and its islands can be written in React, Vue, Svelte, Solid or others, each with its own runtime. Fresh (Deno) and Marko use islands as well.
:::

:::history{year=2020 title="Two answers to the same cost"}
Islands were described in 2019 and 2020 as an *architecture* for sites whose pages are mostly content, in blog posts that gave the idea its name. :cite[miller-islands] In December 2020 the React team published an RFC and demo for **Zero-Bundle-Size React Server Components**, Dan Abramov, Lauren Tan, Joseph Savona and Sebastian Markbåge’s answer for apps that are not mostly content. :cite[rsc-rfc] Next.js 13’s App Router (2022 beta, stable in 13.4, 2023) shipped them to most React developers, and Astro 1.0 (2022) did the same for islands.
:::

:::whatchanged
For *skip*: **the components that never change in the browser are not shipped, not run and not hydrated.** Islands skip by *place in the page*; server components skip by *module*. The server still ran everything; the client is spared the second run, for the parts that are only ever data.
:::

## What’s next

Both approaches still re-run the interactive parts in the browser. Chapter 22 is about the last step: not running them at all until a click, by writing down in the HTML where everything is and what to do about it.
