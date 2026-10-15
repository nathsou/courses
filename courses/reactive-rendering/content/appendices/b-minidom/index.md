---
title: MiniDom reference
summary: The fake DOM every figure and exercise runs on. Its API, its operation log, and what it leaves out.
number: B
---

MiniDom is a small document model written for this course (`src/lib/rx/dom.ts`). It exists for three reasons: every renderer in the course can run on it, in a page, in a test and in the exercises’ sandbox, with no browser; it records every mutation, so the mutation lens can count and flash them exactly; and it is deterministic, so a figure does the same thing every time.

Its API follows the browser’s closely enough that code written against it reads like browser code.

## Creating a document

```ts
import { createDocument } from '@rx/dom';

const doc = createDocument();
doc.body;                       // the root element, tag "body"
const p = doc.createElement('p');
p.textContent = 'Hello';
doc.body.appendChild(p);
doc.body.innerHTML;             // '<p>Hello</p>'
```

| Member | What it does |
|---|---|
| `createElement(tag)` | A new element. Counts as one `create` operation. |
| `createTextNode(data)` | A new text node. |
| `createComment(data)` | A comment node, used as an anchor or marker. Not drawn. |
| `createFragment()` | A container whose children are moved into whatever it is inserted into. |
| `clone(node)` | A deep copy as *one* `clone` operation: what `cloneNode(true)` of a template costs. |
| `fragmentFromHTML(html)` | Parses a string into a fragment, as one `html` operation. |
| `body` / `root` | The root element. A node is *live* when it is attached below it. |
| `activeElement` | The focused element, or `null`. |

## Nodes

There are three node classes: `MElement`, `MText` and `MComment`. Every node has `id` (unique in its document), `parent`, `nextSibling`, `previousSibling`, `isConnected`, `touched` (the logical time of its last mutation), `remove()` and `cloneNode()`.

**`MElement`** has `tag`, `children`, `firstChild`, `lastChild`, `attrs` (a `Map`), `props` (properties that live apart from attributes: `value`, `checked`, and anything a figure wants to attach), `className`, `textContent`, `innerHTML` and `outerHTML`.

## Changing the tree

| Method | Notes |
|---|---|
| `appendChild(node)` | Moves the node if it already has a parent. |
| `insertBefore(node, ref)` | `ref = null` appends. Inserting a fragment inserts its children. |
| `removeChild(node)` | Throws if the node is not a child. |
| `replaceChild(node, old)` | An insert and a remove, as in a browser. |
| `replaceChildren(...nodes)` | Removes every child (one operation each), then appends. |
| `textContent = s` | On an element with a single text child, writes that node’s data (one operation); otherwise replaces the children. |
| `innerHTML = html` | Parses and replaces every child. One `html` operation counting the nodes created. Typed state in the old nodes is gone. |

## Attributes, properties and events

```ts
el.setAttribute('class', 'big');   el.getAttribute('class');   el.removeAttribute('class');
el.value = 'x';                    // a *property*: does not change the value attribute
el.userInput('typed');             // what a person typing does: changes .value, fires "input", is NOT logged
el.checked = true;
el.addEventListener('click', fn);  el.removeEventListener('click', fn);
el.click();                        // fire('click')
el.fire('input', { value: 'x' });  // dispatch; the event bubbles and can be stopped
el.focus();  el.blur();            // sets doc.activeElement
```

An event handler receives an `MEvent` with `type`, `target`, `currentTarget`, `detail`, `preventDefault()` and `stopPropagation()`. Typed values and scroll offsets, the state the browser owns, are modelled as properties on the node: that is why a node that is replaced forgets them and a node that is kept does not.

## Querying and parsing

`querySelector` and `querySelectorAll` support `*`, a tag, `.class`, `#id` and `[attribute]` or `[attribute=value]`, and compounds of them, with no combinators (`ul li` is rejected, loudly). `parseHTML(doc, html)` handles nested elements, quoted and unquoted attributes, void tags, comments and the entities `&lt; &gt; &amp; &quot; &#39; &nbsp;`; `toHTML(node)` serialises. `outline(node)` prints an indented tree, for tests.

## The operation log

Every mutation appends an operation to `doc.ops` and fires the callbacks registered with `doc.subscribe(fn)`.

| Kind | Recorded when | Fields |
|---|---|---|
| `create` | `createElement`, `createTextNode`, `createComment` | `tag` |
| `clone` | `doc.clone(node)` | `nodes`: how many nodes the copy has |
| `html` | `innerHTML = …`, `fragmentFromHTML` | `nodes` |
| `insert` | `appendChild`, `insertBefore` | `parent`, `before` |
| `remove` | `removeChild` | `parent` |
| `attr` | `setAttribute`, `removeAttribute` | `name`, `value` (null when removed) |
| `prop` | writing `value`, `checked`, `setProp` | `name`, `value` |
| `text` | writing a text node’s data | `value` |
| `listen`, `unlisten` | adding or removing a listener | `type` |

Every operation has a `live` flag: whether the node it touched was attached to the document at the time. `doc.mark()` returns a position in the log; `doc.statsSince(mark)` summarises what happened after it: `total`, `live`, `created`, `inserted`, `removed`, `attrs`, `props`, `texts`, `listeners` and `parsed`. The figures’ counters are exactly these numbers.

## What MiniDom leaves out

No layout, CSS or rendering (chapter 1’s model, `rx/pipeline.ts`, supplies the costs); no namespaces (SVG, MathML); no shadow DOM, no `<template>` element (templates are modelled by `fragmentFromHTML` and `clone`); no selection or scroll, except as properties a figure sets; no mutation observers; no real HTML parser (the one here handles well-formed fragments, not the browser’s error recovery). Operation counts measure what a strategy asks the DOM to do, and do not measure what a real browser takes to do it.
