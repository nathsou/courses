---
title: Resumability
summary: Hydration runs the application again to rediscover what the server already knew. Resumability writes it down instead (the state, the handlers, the subscriptions) and lets the browser pick up where the server left off.
number: 22
duration: 55 minutes
prerequisites: [ssr-and-hydration, islands-and-server-components, signals-from-scratch]
---

Think about what hydration is *for*. The server sent HTML, and it looks right. The browser then downloads the application and runs it to recover three things:

1. **Where each component is**: which DOM nodes belong to which component, so updates can find them.
2. **The state**: the values the components hold, which `useState` rebuilds by running its initializer.
3. **The behaviour**: the event handlers, which are closures over that state, and which cannot be written into HTML.

The server *knew all three* when it rendered. It had the state, it ran the handlers’ definitions, it built the tree. And then it threw all of it away, wrote only the HTML, and asked the browser to work them out again by re-running the code.

Islands (chapter 21) cut the number of components that must do this. They do not question the idea. What if the server wrote down the three things instead?

## Writing it down

**Resumability** is the design that does. The server renders the page and also serializes what the browser needs to *continue* from that point, rather than start over. :cite[qwik-resumable] There are three pieces:

**The state**, as JSON in the page. Every signal and store the page uses, with its value.

**The behaviour**, as *references*. An event handler is a closure, which cannot be serialized, but its **code** can be given an address: *this file, this function*. The HTML says it:

```html
<button on:click="increment.js#increment" q:id="0">
  Clicked <span q:bind="count">3</span> times
</button>
```

`on:click="increment.js#increment"` reads “when clicked, load `increment.js` and call its `increment`”. This reference is called a **QRL** in Qwik, the framework that made the design its identity.

**The subscriptions**, also as markers. `q:bind="count"` says that this text depends on the signal `count`. Chapter 9’s dependency record (*which effect reads which signal*) was built at run time by running the effects. Here the server writes it into the page, so that no code has to run to rebuild it.

Now the browser has everything that hydration was trying to recover, and none of it required running the components:

- **Load:** install *one* tiny listener (the **loader**, about a kilobyte) for the event types the page uses. No application code runs.
- **On a click:** the loader finds the closest element with `on:click`, reads its reference, **fetches that one file**, parses the state JSON for the first time, and runs the function with the state restored.
- **The function** does what the handler did: it writes a signal. The write finds the nodes subscribed to that signal (`q:bind="count"`) and updates them. **No component is re-rendered**, because no component exists in the browser.

Try it. The page is a counter, a rename button and a save button. Choose **Hydrate** first and read the log; then choose **Resume**, and click.

::resume-lab{n="22.1"}

The numbers at the top say it. With hydration, the page must run about **50 KB** of JavaScript before it responds, however little you do afterwards. With resumability, it runs **740 bytes**, and spends more only on what you use: click the counter, and 420 bytes arrive. Click the rename button, and another 2 KB. The save handler, 5 KB, is *never downloaded* if you never press Save. The cost of the page is proportional to **what you did**, not to what the page contains.

Watch the lens, too. A click rewrites exactly one text node. There was no component function to call and no tree to diff, no signal engine to start: just the handler and the DOM nodes that were bound to what it wrote.

:::key
**Hydration re-runs; resumability resumes.** The state, the handler references and the subscriptions travel *in the HTML*, so the browser can continue the application instead of restarting it. The cost moves from load time, paid by everyone, to interaction time, paid by whoever interacts.
:::

## What it takes

Looks free. It is not, and the price is paid in the *programming model*, where the design reaches into your code.

**Closures must be serializable, or splittable.** A handler like `() => setCount(count + 1)` closes over `count` and `setCount`. To give it an address, the build must extract it into its own file, and the things it captured must be *restorable* from the page: here, signals, which are in the JSON. Qwik’s **optimizer** does the extraction, at the places you mark with a `$` suffix:

```jsx
export default component$(() => {
  const count = useSignal(3);
  return <button onClick$={() => count.value++}>Clicked {count.value} times</button>;
});
```

`component$` and `onClick$` are not ordinary functions: each `$` tells the optimizer *“this closure is a lazy-loadable unit”*. It becomes a separate exported function in a separate chunk, and the HTML refers to it by name. The code `count.value++` is the real code, and `count` is captured by reference to its serialized state.

**What can be captured is limited.** Anything that is captured by a lazy closure must be serializable: primitives, plain objects, signals, and a few built-ins. A class instance with methods, a live database connection, a function value: none of these survives being written as JSON. Qwik offers `noSerialize()` for things that are rebuilt on the client, and an error message at build time for those that cannot be.

**The first interaction waits for the network.** A hydrated page has already paid; a resumable page pays on first use: the click fetches a file. If the network is slow, the first click feels slow. The framework answers with **prefetching**: it knows from the build which chunks a page can need, and it fetches them in the background at low priority, through a service worker or modulepreload hints, so that most are in the cache before anyone clicks. The design moves the work from *before the page responds* to *while the user is reading*.

**State is written twice.** The state exists as the rendered HTML and as JSON. It is the same cost as hydration data, but this is also all the client needs: it does not need the components that produced it.

:::programmer
**Where the line is.** The question of the whole of Part V is where to put the boundary between work done once, on the server, and work the browser must do. Hydration puts everything on both sides. Islands cut the page into regions. Server components cut by module. Resumability cuts *between the render and the event*: the render happens on the server and never in the browser (until something changes that needs re-rendering, which Qwik does with ordinary components, downloaded on demand), and the handler runs in the browser, alone.
:::

## Build the loader

The browser half is small: a delegating listener, lazy state and lazy chunks, and updates by subscription. This exercise writes it. `symbols` stands in for the network (looking a chunk up there is the “fetch”), and the page was rendered by the lab’s server half.

```build
id: resumability/loader
title: Write the resume loader
prompt: |
  Implement `resume(container, stateJson, events, symbols)`. It must do **nothing** at load except add one listener on `container` for each event type in `events`. When an event arrives: walk up from `event.target` to the closest element that has an attribute `on:<type>` (for a click, `on:click`); read its value `"<chunk>#<symbol>"`; on the first event only, parse `stateJson` (it is `{"signals": {...}}`); look up `symbols[symbol]` (throw `Error("Chunk <chunk> has no symbol <symbol>")` if missing); record the chunk in `fetched` as `{ chunk, bytes }` **once**, however often it is used; and run `def.run(ctx, event)`. `ctx.get(name)` reads a signal. `ctx.set(name, value)` stores it and sets the `textContent` of every element in `container` with the attribute `q:bind=<name>`. Return `{ fetched, idle, get jsBytes, get stateParsed }`, where `idle()` resolves when all handlers so far have finished, `jsBytes` is `740` plus the bytes of the fetched chunks, and `stateParsed` says whether the JSON has been parsed yet. Handlers run in order, one after another, asynchronously (a fetch takes a tick).
starter: |
  import type { MElement } from '@rx/dom';

  interface SymbolDef {
    chunk: string;
    bytes: number;
    run(ctx: { get(name: string): unknown; set(name: string, value: unknown): void }, event: any): void;
  }

  export function resume(container: MElement, stateJson: string, events: readonly string[], symbols: Record<string, SymbolDef>) {
    const fetched: { chunk: string; bytes: number }[] = [];
    // TODO: one delegating listener per event type; everything else waits for a click
    return {
      fetched,
      idle: () => Promise.resolve(),
      get jsBytes() {
        return 740;
      },
      get stateParsed() {
        return false;
      },
    };
  }
solution: |
  import type { MElement } from '@rx/dom';

  interface SymbolDef {
    chunk: string;
    bytes: number;
    run(ctx: { get(name: string): unknown; set(name: string, value: unknown): void }, event: any): void;
  }

  export function resume(container: MElement, stateJson: string, events: readonly string[], symbols: Record<string, SymbolDef>) {
    const fetched: { chunk: string; bytes: number }[] = [];
    let state: { signals: Record<string, unknown> } | null = null;
    let pending: Promise<void> = Promise.resolve();

    const ctx = {
      get: (name: string) => state!.signals[name],
      set(name: string, value: unknown) {
        state!.signals[name] = value;
        for (const el of container.querySelectorAll(`[q:bind=${name}]`)) el.textContent = String(value);
      },
    };

    const handle = (event: any) => {
      // Find the closest element that says what to do with this event.
      let el: MElement | null = event.target;
      while (el && !el.hasAttribute(`on:${event.type}`)) el = el.parent as MElement | null;
      if (!el) return;
      const [chunk, symbol] = el.getAttribute(`on:${event.type}`)!.split('#') as [string, string];
      pending = pending.then(async () => {
        state ??= JSON.parse(stateJson); // the first event pays for parsing the state
        const def = symbols[symbol];
        if (!def) throw new Error(`Chunk ${chunk} has no symbol ${symbol}`);
        if (!fetched.some((f) => f.chunk === chunk)) fetched.push({ chunk, bytes: def.bytes });
        await Promise.resolve(); // the network
        def.run(ctx, event);
      });
    };
    for (const type of events) container.addEventListener(type, handle);

    return {
      fetched,
      idle: () => pending,
      get jsBytes() {
        return 740 + fetched.reduce((a, f) => a + f.bytes, 0);
      },
      get stateParsed() {
        return state !== null;
      },
    };
  }
tests: |
  import { test, expect } from '@rx/test';
  import { createDocument } from '@rx/dom';
  import { resume } from './solution.ts';

  const symbols = {
    increment: { chunk: 'inc.js', bytes: 310, run: (c: any) => c.set('count', c.get('count') + 1) },
    rename: { chunk: 'rename.js', bytes: 450, run: (c: any) => c.set('name', 'Bob') },
  };
  const HTML =
    '<div><p>Hello <span q:bind="name">Ann</span></p>' +
    '<button on:click="inc.js#increment" q:id="0">Clicked <span q:bind="count">3</span></button>' +
    '<button on:click="rename.js#rename" q:id="1">Rename</button></div>';
  const STATE = JSON.stringify({ signals: { count: 3, name: 'Ann' } });

  function setup() {
    const doc = createDocument();
    const root = doc.createElement('div');
    doc.body.appendChild(root);
    root.innerHTML = HTML;
    doc.clearLog();
    return { doc, root, r: resume(root, STATE, ['click'], symbols) };
  }

  test('at load it adds one listener and does nothing else', () => {
    const { doc, r } = setup();
    expect(doc.ops).toHaveLength(1);
    expect(r.fetched).toEqual([]);
    expect(r.stateParsed).toBe(false);
    expect(r.jsBytes).toBe(740);
  });

  test('a click fetches one chunk, parses the state, and updates the bound text', async () => {
    const { root, r } = setup();
    root.querySelector('[q:id="0"]')!.click();
    await r.idle();
    expect(root.querySelector('[q:bind=count]')!.textContent).toBe('4');
    expect(r.fetched).toEqual([{ chunk: 'inc.js', bytes: 310 }]);
    expect(r.jsBytes).toBe(740 + 310);
    expect(r.stateParsed).toBe(true);
  });

  test('only the bound text is written: nothing is created, inserted or removed', async () => {
    const { doc, root, r } = setup();
    const mark = doc.mark();
    root.querySelector('[q:id="0"]')!.click();
    await r.idle();
    expect(doc.statsSince(mark)).toMatchObject({ texts: 1, created: 0, inserted: 0, removed: 0 });
  });

  test('a chunk is fetched once, however many times it is used; others stay unloaded', async () => {
    const { root, r } = setup();
    const button = root.querySelector('[q:id="0"]')!;
    button.click();
    button.click();
    button.click();
    await r.idle();
    expect(root.querySelector('[q:bind=count]')!.textContent).toBe('6');
    expect(r.fetched).toHaveLength(1);
  });

  test('a click on a child finds the handler on its ancestor', async () => {
    const { root, r } = setup();
    root.querySelector('[q:bind=count]')!.click();
    await r.idle();
    expect(root.querySelector('[q:bind=count]')!.textContent).toBe('4');
  });

  test('a click where nothing is listening does nothing', async () => {
    const { root, r } = setup();
    root.querySelector('p')!.click();
    await r.idle();
    expect(r.fetched).toEqual([]);
    expect(r.stateParsed).toBe(false);
  });

  test('state is shared between handlers', async () => {
    const { root, r } = setup();
    root.querySelector('[q:id="1"]')!.click();
    root.querySelector('[q:id="0"]')!.click();
    await r.idle();
    expect(root.querySelector('[q:bind=name]')!.textContent).toBe('Bob');
    expect(root.querySelector('[q:bind=count]')!.textContent).toBe('4');
    expect(r.jsBytes).toBe(740 + 310 + 450);
  });
hints:
  - "Walk up from `event.target` with `el.parent` until `el.hasAttribute('on:click')` (use the event's `type`)."
  - "Chain each handler onto a `pending` promise so they run in order, and have `idle()` return that promise."
  - "`state ??= JSON.parse(stateJson)` inside the handler parses lazily, on the first event."
explain: "That is a resumable loader: delegation, lazy state, lazy chunks, subscription-based updates. Qwik's `qwikloader` does the same in about a kilobyte of JavaScript, with `import()` as the fetch, with `q:id` and `q:ctx` markers for finding component state, and with the `[0 1]` suffix on a QRL that lists which captured variables the closure needs. The test that matters is the third: a click causes exactly one DOM write, with no rendering anywhere."
```

## Where it sits

Put the four strategies of the last three chapters in one table:

| | JavaScript run before the page responds | What a click does | What the programmer gives up |
|---|---|---|---|
| **Client rendering** | everything, and the page is blank until then | runs the component, diffs or updates | nothing, but nothing is visible early |
| **SSR + hydration** | everything | the same | a dead page for a while; every component runs twice |
| **Islands / server components** | only the islands, or only client components | the same, in the islands | a boundary to design, serializable props |
| **Resumability** | the loader: 1 KB | fetch one function, run it, update subscribers | serializable closures, a build step, a first-interaction fetch |

Each row moves the work from *before the page responds* toward *when it is needed*, and each pays with a rule about what you may write. Resumability is the furthest: it asks the most of your code, and makes the least of the load.

:::wild{framework="Qwik" version="1.20"}
Qwik was created by Miško Hevery (who also created AngularJS) at Builder.io, and its optimizer is written in Rust. A Qwik page’s HTML contains `on:click="chunk.js#symbol[0 1]"` attributes, `q:` markers for components and subscriptions, and a `<script type="qwik/json">` with the serialized state. `qwikloader` is about 1 KB. Qwik’s prefetching reads the build’s bundle graph to preload the chunks a route can need. The other frameworks have borrowed parts of the idea without adopting all of it: Angular’s *event replay* records clicks that happen before hydration finishes and replays them afterwards, using a small global listener in the same spirit as the loader.
:::

:::history{year=2021 title="Resumability"}
Miško Hevery described hydration as “replaying” the application, a cost caused by a design decision (the server forgets), and presented resumability as the alternative in 2021 and 2022 with the first public versions of Qwik. :cite[qwik-resumable] The idea of pausing a program in one place and continuing it in another is old; the new part for the web is doing it *without* shipping the code: the page carries the state and the addresses of functions, not the functions.
:::

:::whatchanged
For *skip*, in full: **the browser does not re-run what the server already did.** What changed is recorded in the HTML as a subscription (`q:bind`), what to do about a click is recorded as an address (`on:click`), and the state is JSON. The answer to *what changed?* is the one from chapter 9, with the subscription table moved from memory into the page.
:::

## What’s next

All of these chapters assumed the server sends a page and the browser keeps it. Chapter 23 looks at a different split: let the server send *new HTML* each time, and have the browser change what is on the screen to match it, without a framework’s virtual DOM or signals.
