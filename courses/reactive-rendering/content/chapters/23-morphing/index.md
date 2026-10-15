---
title: Morphing the DOM
summary: The opposite split. The browser holds no components and no signals; the server renders a new page after each action, and the browser makes the old DOM look like it.
number: 23
duration: 50 minutes
prerequisites: [trees-as-values, lists-and-keys, ssr-and-hydration]
---

Every chapter since 9 has been a variation on one assumption: **the browser runs the application**. The components, the signals, the state and the update logic live in JavaScript on the page, and the server, if it appears at all, sends a first page and some data.

There is a family of tools that reverses this. In **htmx**, **Hotwire Turbo**, **Phoenix LiveView**, **Laravel Livewire** and **Unpoly**, the application runs on the server. The browser’s job is to send events and show the HTML that comes back. There are no components in the browser, no signals, no virtual DOM, no hydration: nothing to rebuild, because nothing was ever torn down.

```html
<button hx-post="/like" hx-target="#likes">♥ 3</button>   <!-- htmx -->
```

A click sends a request. The server updates its state, renders the part of the page that changed (or all of it), and replies with **HTML**. The browser puts that HTML on the page.

“Puts it on the page” is the whole problem of this chapter.

## Two ways to put HTML on the page

The first is the obvious one: replace the old nodes with the new HTML.

```js
target.innerHTML = html;
```

It is simple, and it is chapter 0’s *rebuild* strategy: all the old nodes are thrown away, and new ones are parsed and created. Everything the **page owned** about those nodes goes with them. The text a user typed into a field. The focus, and the caret inside the field. A checkbox the user ticked. The scroll position of a list, a video that is playing, a CSS transition in progress, an open `<details>` element. None of it is in the HTML the server sent, because the server did not know about it; all of it was in the DOM nodes.

The second is to **morph**: make the old DOM look like the new HTML, by changing as little as possible. Where an old node matches a new one (the same tag, the same `id`), keep it: update its attributes, and recurse into its children. Insert only what is new, and remove only what vanished. The nodes the user was interacting with *survive*, so everything they own survives too.

Try both. The server renders an inbox. First **type something in the search box**, **tick the checkbox**, and then **click back into the search box**, so that it is focused. Then press the buttons that make the server send a new page, and look at what survives. Do it with *:term[Morphing]{id=morphing}*, then with *innerHTML*.

::morph-lab{n="23.1"}

With *innerHTML*, every press recreates every element (the last line counts how many are still the same objects: none) and the typed text, the tick and the focus are gone. With *Morphing*, the same HTML produces a handful of operations (a new `li`, a changed class), the search box is still the same node, with its focus and its text. Note the *Reverse the order* action: the messages are the same, in a new order. Morphing **moves** the existing `li` nodes instead of rewriting their text, because they have `id`s.

Morphing is not magic, and the figure shows where it stops. **The ticked box is lost** even with morphing. A morph makes the old DOM look like the *new HTML*, and the new HTML says the box is unticked, because the server did not know that you had ticked it. The search box survived for a narrower reason: it was *focused*, and a morph does not overwrite the value of the control you are typing in. Click somewhere else and press an action, and the text goes too. In real applications this is solved by the server (it received the form’s values and renders them back into the HTML) or by marking elements as **:term[preserved]{id=preserved-element}**: htmx’s `hx-preserve`, Turbo’s `data-turbo-permanent`. Tick *Mark the two form fields as preserved* in the figure and repeat: now both survive, as the library leaves those nodes alone.

:::key
**A morph is a diff between a DOM and an HTML string.** It is chapter 4’s tree diff with the old tree being the *live DOM* and the new tree being the *parsed response*, and chapter 5’s **keys** are the `id` attributes. It needs no components, because the thing being preserved is the browser’s own state.
:::

## How a morph decides

The algorithm is the one from chapters 4 and 5, with the DOM’s own vocabulary. For the children of an old element and a new one:

1. **Match by `id`.** A new node with an `id` is matched with the old node that has the same one, *wherever it is*: it is moved into place if needed. This is a keyed list, with the `id` as the key. If no old node has that id, the node is new.
2. **Match by position and kind.** A new node without an `id` is matched with the old node at the cursor if it can stand in for it: same node type, same tag, and no `id` of its own that belongs to someone else.
3. **Look a little ahead.** If the node at the cursor does not fit, scan a bounded number of the following old nodes for one that does. Real implementations bound this search, because an unbounded one makes a long list quadratic.
4. **Otherwise, insert** the new node.

Then everything in the old list that was not matched is **removed**. For each matched pair, the attributes are brought into line, and the algorithm recurses. Two details protect what the user is doing: the value of the **focused** input is not overwritten (the user is typing in it), and a node the user *dirtied* keeps its dirty state, since the HTML has no way to say it.

```build
id: morphing/morph
title: Write morph
prompt: |
  Implement `morph(parent, html)`: make the children of `parent` equal to the HTML, reusing nodes. Parse with `parent.doc.fragmentFromHTML(html)` and walk its children. A new element with an `id` matches the old child with the same `id` and the same tag, wherever it is (move it to the cursor if needed). Any other new node matches the old child at the cursor if both are the same kind (same node type, and for elements the same tag) and the old one has no `id`. A match is updated in place: text nodes get the new `data`; elements get their attributes brought into line (set what differs, remove what is gone), then their children are morphed the same way. A new node with no match is inserted at the cursor; old children never matched are removed at the end. Do not touch the DOM when nothing differs, and do not recreate the input the user is typing in.
starter: |
  import type { MElement } from '@rx/dom';

  // This works, but throws the old nodes away: typed text and focus are lost.
  export function morph(parent: MElement, html: string): void {
    parent.innerHTML = html;
  }
solution: |
  import { MElement, MText } from '@rx/dom';
  import type { MNode } from '@rx/dom';

  const idOf = (n: MNode): string | null => (n instanceof MElement ? n.getAttribute('id') : null);
  const sameKind = (a: MNode, b: MNode): boolean => a.nodeType === b.nodeType && !(a instanceof MElement && b instanceof MElement && a.tag !== b.tag);

  export function morph(parent: MElement, html: string): void {
    morphChildren(parent, parent.doc.fragmentFromHTML(html));
  }

  function morphChildren(oldParent: MElement, newParent: MElement): void {
    const newKids = [...newParent.children]; // a snapshot: inserting moves nodes out of newParent
    const oldById = new Map<string, MNode>();
    for (const c of oldParent.children) {
      const id = idOf(c);
      if (id) oldById.set(id, c);
    }
    let cursor: MNode | null = oldParent.firstChild;
    for (const next of newKids) {
      const id = idOf(next);
      let match: MNode | null = null;
      if (id) {
        const found = oldById.get(id);
        if (found && found.parent === oldParent && sameKind(found, next)) match = found;
      } else if (cursor && idOf(cursor) === null && sameKind(cursor, next)) {
        match = cursor;
      }
      if (!match) {
        oldParent.insertBefore(next, cursor); // new
        continue;
      }
      if (match === cursor) cursor = match.nextSibling;
      else oldParent.insertBefore(match, cursor); // an id matched out of order: move it here
      patch(match, next);
    }
    while (cursor) {
      const after: MNode | null = cursor.nextSibling;
      oldParent.removeChild(cursor);
      cursor = after;
    }
  }

  function patch(old: MNode, next: MNode): void {
    if (old instanceof MText && next instanceof MText) {
      if (old.data !== next.data) old.data = next.data;
    } else if (old instanceof MElement && next instanceof MElement) {
      for (const [name, value] of next.attrs) if (old.getAttribute(name) !== value) old.setAttribute(name, value);
      for (const name of [...old.attrs.keys()]) if (!next.attrs.has(name)) old.removeAttribute(name);
      morphChildren(old, next);
    }
  }
tests: |
  import { test, expect } from '@rx/test';
  import { createDocument } from '@rx/dom';
  import { morph } from './solution.ts';

  function setup(html: string) {
    const doc = createDocument();
    const root = doc.createElement('div');
    doc.body.appendChild(root);
    root.innerHTML = html;
    doc.clearLog();
    return { doc, root };
  }

  test('identical HTML does nothing', () => {
    const { doc, root } = setup('<ul><li id="a">A</li><li id="b">B</li></ul>');
    morph(root, '<ul><li id="a">A</li><li id="b">B</li></ul>');
    // Parsing the incoming HTML is logged as a parse; nothing may be written to the page.
    expect(doc.ops.filter((o) => o.kind !== 'html')).toHaveLength(0);
  });

  test('text and attributes change in place, and the elements are the same objects', () => {
    const { doc, root } = setup('<div class="a"><p>one</p></div>');
    const p = root.querySelector('p');
    morph(root, '<div class="b"><p>two</p></div>');
    expect(root.innerHTML).toBe('<div class="b"><p>two</p></div>');
    expect(root.querySelector('p')).toBe(p);
    expect(doc.statsSince(0)).toMatchObject({ attrs: 1, texts: 1, created: 0, inserted: 0, removed: 0 });
  });

  test('a removed attribute is removed', () => {
    const { root } = setup('<button class="x" disabled>Go</button>');
    morph(root, '<button class="x">Go</button>');
    expect(root.querySelector('button')!.hasAttribute('disabled')).toBe(false);
  });

  test('the input you are typing in keeps its node, its focus and its text', () => {
    const { doc, root } = setup('<form><input id="q" value=""><span>0 results</span></form>');
    const input = root.querySelector('#q')!;
    input.focus();
    input.userInput('rea');
    morph(root, '<form><input id="q" value=""><span>12 results</span></form>');
    expect(root.querySelector('#q')).toBe(input);
    expect(doc.activeElement).toBe(input);
    expect(input.value).toBe('rea');
    expect(root.querySelector('span')!.textContent).toBe('12 results');
  });

  test('items with ids are recognised after they move', () => {
    const { root } = setup('<ul><li id="a">A</li><li id="b">B</li><li id="c">C</li></ul>');
    const [a, b, c] = root.querySelectorAll('li');
    morph(root, '<ul><li id="c">C</li><li id="a">A</li><li id="b">B</li></ul>');
    const after = root.querySelectorAll('li');
    expect(after[0]).toBe(c);
    expect(after[1]).toBe(a);
    expect(after[2]).toBe(b);
  });

  test('a new item is inserted and a vanished one removed, and the others are untouched', () => {
    const { doc, root } = setup('<ul><li id="a">A</li><li id="c">C</li></ul>');
    const [a, c] = root.querySelectorAll('li');
    morph(root, '<ul><li id="a">A</li><li id="b">B</li><li id="c">C</li></ul>');
    expect(root.querySelectorAll('li').map((l) => l.id)).toEqual([a!.id, root.querySelectorAll('li')[1]!.id, c!.id]);
    expect(root.querySelectorAll('li')[0]).toBe(a);
    expect(root.querySelectorAll('li')[2]).toBe(c);
    morph(root, '<ul><li id="a">A</li></ul>');
    expect(root.querySelectorAll('li')).toHaveLength(1);
    expect(root.querySelector('li')).toBe(a);
    void doc;
  });

  test('nodes without ids are matched by position and kind', () => {
    const { root } = setup('<div><p>one</p><p>two</p></div>');
    const [p1, p2] = root.querySelectorAll('p');
    morph(root, '<div><p>uno</p><p>dos</p><p>tres</p></div>');
    const ps = root.querySelectorAll('p');
    expect(ps[0]).toBe(p1);
    expect(ps[1]).toBe(p2);
    expect(ps.map((p) => p.textContent)).toEqual(['uno', 'dos', 'tres']);
  });

  test('a different tag cannot stand in', () => {
    const { root } = setup('<div><span>hi</span></div>');
    const span = root.querySelector('span');
    morph(root, '<div><p>hi</p></div>');
    expect(root.innerHTML).toBe('<div><p>hi</p></div>');
    expect(root.querySelector('p')).not.toBe(span);
  });
hints:
  - "Index the old children that have ids in a Map first. Walk the new children with a `cursor` pointing at the next unmatched old child."
  - "Inserting a node from the parsed fragment moves it out of that fragment, so take a snapshot of the fragment's children before the loop."
  - "When an id-matched node is not at the cursor, `oldParent.insertBefore(match, cursor)` moves it there without recreating it."
explain: "About forty lines are the core of morphdom and idiomorph. Real libraries add many protections this one skips: they bound the look-ahead (so that a long unkeyed list does not go quadratic), skip a focused control's value, preserve scroll positions and video playback by never touching those nodes, handle `<script>` and custom elements, and offer hooks (`beforeNodeMorphed`) for the cases where the library's guess is wrong. The principle is the one you have written: **identity by `id`, then by position and kind, and everything else is a minimal patch**."
```

## Not only morphing: sending less

Parsing a string, walking two trees, and sending whole HTML on each action is a lot of bytes and work. The tools in this family have found ways to cut it.

**Partial responses.** In htmx, the response is usually a *fragment*, not a page. `hx-target` says which element to swap, so the server renders only the like button and the browser swaps only that. Turbo’s *frames* and *streams* do the same: a stream is a list of tiny instructions (“replace `#likes` with this”, “append this to `#messages`”).

**Page refreshes with morphing.** Turbo 8 (2023) took the other path: re-render the *whole page*, send all of it, and let the browser morph it, so that the server can stay as simple as a classic web application while the browser keeps scroll position, focus and form state. :cite[turbo-morphing]

**Diffing on the server.** Phoenix LiveView keeps a WebSocket open and a copy of the page’s state *on the server*. Its templates are split into **statics** and **dynamics**, exactly as in chapter 16: the static strings are sent to the browser once, and later updates send only the dynamic values that changed, as a small JSON patch, which the browser applies to its copy of the template. :cite[liveview] So LiveView puts a diff in the *server*, using template structure as the key, and the browser still morphs the rendered result into the page with `morphdom`. It is lit-html on the server side of a wire.

| | What crosses the wire | How the browser applies it |
|---|---|---|
| **htmx** | an HTML fragment | swap into a target; `innerHTML` by default, morphing with an extension |
| **Turbo** | frames, streams, whole pages | replace, or morph (Turbo 8) |
| **LiveView** | a diff of dynamic values | patch with morphdom |
| **Livewire** | a diff of component state and HTML | morph |

## What this answers

*What changed?* The server does not say. It re-renders everything that might have changed and sends the answer; the *browser* works out the difference, by diffing the live DOM against it. This is the first answer of the course, **rebuild**, at the scale of the whole network. The reason it is no longer wasteful is the second half: a morph keeps what the user owns, and fragments, streams and diffs keep the bytes small.

The trade-offs belong to the *split*, not the algorithm:

- **A round trip for every interaction.** Anything that must respond instantly (a drag, a hover, typing that filters a list) needs the server in the loop or a bit of client code. This is why htmx projects add Alpine.js or Stimulus: small local state in the browser, for the things that cannot wait.
- **No hydration and no duplicated logic.** The components exist once, on the server, in one language, with direct access to the database. Nothing runs twice.
- **The server holds the session.** With a WebSocket as in LiveView, every connected user has state in server memory; with request-per-action designs it does not.
- **Almost no JavaScript.** The browser needs a small library: 15 KB, not 150.

```predict
q: "A user is typing into a search box. Every keystroke triggers a request, and the server sends back the whole results page, which the browser swaps in with `innerHTML`. What is the most likely complaint?"
options:
  - text: "The search results are wrong, because the server cannot see the text that has been typed."
    why: "The text is sent with the request (that is what the request is for), so the results are right. The problem is about what happens to the box itself."
  - text: "The box loses focus and the caret jumps after each response, so typing is interrupted."
    correct: true
    why: "`innerHTML` throws away the input the user is typing in, and a new input is created, with no focus and no text. Every response steals the focus. The standard fixes are to swap only the results container and not the box, to give the input an `id` and swap with morphing so the node survives, or to use a framework that preserves focused elements. This is the first thing everyone building a live search with HTML over the wire runs into."
  - text: "Nothing: the browser restores focus by itself, since the input has the same id."
    why: "The browser does not do this. An element with the same id in new HTML is a new element; the old one, and its focus, are gone."
```

:::programmer
**Choosing between this and the rest of Part V.** It depends on where the *state that matters* lives. If it is mostly on the server (a database, a session, a record being edited), the server-rendered split is natural, and the question becomes how to preserve the little state the browser owns. If it is mostly in the browser (a drawing, a game, a spreadsheet, an editor), a client application is the better fit, and the server is an API. Most real products are a mixture, which is why every framework in this part of the course now has a mode for each.
:::

:::wild{framework="htmx, Turbo, LiveView" version="2026"}
htmx 2 (2024) takes :term[Idiomorph]{id=idiomorph} as a swap extension (`hx-swap="morph"`); Turbo 8 (2023) morphs page refreshes with Idiomorph, adopted from the htmx project; Phoenix LiveView and Livewire (Laravel) both morph with their own variants of morphdom. Rails’ “Hotwire” bundle is Turbo and Stimulus; “HTMX + Alpine” is the same split with different parts.
:::

:::history{year=2011 title="pjax, Turbolinks, morphdom"}
The idea of replacing part of a page with a server’s HTML goes back to AJAX itself (the `innerHTML` of 2005’s “Ajax” era). **pjax** (GitHub, 2011) combined it with the History API, so that page changes were fast and the URL stayed correct. Its descendant **Turbolinks** (Rails, 2012) swapped the page body. **morphdom** (Patrick Steele-Idem, 2014, for the Marko framework at eBay) was the first widely used DOM-morphing library. :cite[morphdom] **Idiomorph** (Carson Gross, 2022) matches nodes using the sets of ids found inside them; this chapter’s `morph` follows its approach. :cite[idiomorph] Turbo 8, htmx and LiveView adopted morphing between 2022 and 2024.
:::

:::whatchanged
For *rebuild*, again, with the cost moved: **everything the server re-rendered**, and the browser finds the difference by diffing the DOM against the HTML it received. What is kept is what the browser owns: typed text, focus, scroll, a video. It is the same answer as chapter 0’s first, and it works now because the diff is cheap and the unit of identity is a plain `id`.
:::

## What’s next

We have now seen seven answers to the same question. Chapter 24 puts seven strategies on the same benchmark, the same page and the same scenarios, and reads the numbers.
