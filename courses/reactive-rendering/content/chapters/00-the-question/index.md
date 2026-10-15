---
title: The question
summary: Every UI framework answers one question. When the state changes, which parts of the page must change, and how do we find them? Watch three answers side by side, through a lens that flashes every DOM node an update touches.
number: 0
duration: 35 minutes
---

Here is a line of code you have written a thousand times, in one framework or another:

```js
count++
```

A moment later the number on the screen is different. Nothing in that line mentions the page. Somewhere between the assignment and the pixels, something decided *which* piece of the page had to change, and changed that piece and, with luck, nothing else.

That decision is the subject of this course. Every framework you have used makes it, and they make it in very different ways: React compares a new description of the page with the old one; Solid remembers which expressions read `count` and re-runs only those; Svelte works out at build time which text node depends on it; Angular, for a long time, looked at everything that *might* have changed; htmx asks the server for the new HTML and lets the browser reconcile it. Underneath the syntax, they are different answers to the same question.

:::key
**What changed?** When the state of a program changes, which parts of the page must change, and how does the system find them without doing more work than the change deserves?
:::

You will build a small, working version of each answer: a virtual DOM, a signals engine, a template compiler, a hydrator, a resumable page. They are not toys in the sense of being fake. They run, they have tests, and you can read all of them. They are small because the ideas are small, and because the real frameworks, which you will also meet, are those ideas plus a decade of corners.

## A page, three ways

The page below is a list of notes. It has a search box, a summary line (“3 notes, 1 done”) and the notes themselves. Three versions of it are running right now, each built with a different strategy. They behave identically from the outside. What differs is how each one learns that something changed, and therefore which DOM nodes it touches.

Before you press anything, a prediction. You will type `mil` in each pane’s search box and then press **Rename the first note**.

```predict
q: After typing “mil” into all three search boxes and renaming the first note, in which pane will the search box be empty again?
options:
  - text: In none of them. Renaming a note has nothing to do with the search box.
    why: That is what we would like to be true, and in two of the three panes it is. Whether it is true depends on how the pane applies the change.
  - text: In the first pane only (rebuild).
    correct: true
    why: The first pane throws away its DOM and builds a new one from a string, so the new search box is a new element, with nothing typed in it. The other two panes never touch the search box, so the browser’s own state in it (the text, the cursor, the focus) survives.
  - text: In the second and third panes, which have to do the most work to find what changed.
    why: The reverse. The panes that are careful to find the one thing that changed never touch anything else.
```

::notes-lens{strategies="rebuild,diff,track" n="0.1" title="The Notes app, three ways" subtitle="Same page, same actions, three strategies. Do the actions; read the lens."}

Try it in this order. Type in each search box; press **Rename the first note**; look at the counters under each pane; then press **Add a note** and look again.

## How to read the lens

Each pane has three parts.

**The page** is the app itself, drawn as real HTML. You can click a note to toggle it and type in the search box. This is how you feel what a strategy keeps and what it throws away.

**The tree** is the same document drawn as nested boxes. Every node the last action touched is outlined in fuchsia and flashes when it changes. A ✎ means the node’s text or an attribute was rewritten; a + means the node was inserted. A node that is not outlined was not touched, and that is the good news.

**The counters** say what the last action cost, measured in *DOM operations*: every `createElement`, `insertBefore`, `setAttribute`, text write and `innerHTML` the strategy performed. “Live” operations are the ones performed on nodes already attached to the page, which are the ones a browser would have to style, lay out and paint. Operations on nodes that are still being assembled off-page are much cheaper, which is why the counter keeps them apart.

:::note
The document in these figures is not the browser’s. It is *MiniDom*, a small DOM written for this course, with the same shape of API (`createElement`, `appendChild`, `setAttribute`, events that bubble, `innerHTML`) and a log of every operation. It is what lets the lens count exactly, and it lets the same renderer code run in your browser, in a test and in the exercises’ sandbox. [Appendix B](/appendix/minidom/) lists what it models and what it leaves out.
:::

## Reading the results

After **Rename the first note**, the three panes show very different numbers for the same change.

The first pane, *Rebuild*, parsed eleven nodes: the entire page, to change one word. Its search box is a new element. The fix for that (save the text, rebuild, put it back, restore the cursor, restore the focus) is the kind of code that grows in every codebase that takes this route, and it is why this strategy was abandoned for anything interactive.

The second pane, *Diff*, built a description of the whole page, compared it with the description it kept from last time, and found one text node that differed. It rewrote that node. It did a great deal of *comparing*, which the counters do not show, and a minimum of *writing*, which they do.

The third pane, *Track*, did not compare anything. The text node for that note had been told, when it was created, which value it depended on, and when that value changed it was told to update. One write, and no search for what to write.

:::question
All three panes end up with the same page. Which of them did the most work to find out *what* changed, and which the most work to *change* it? Are those the same pane?
:::

:::details[Answer]
They are not the same pane. The rebuild pane did almost no work to find out what changed (it did not try: it assumed everything had) and the most work to change it. The diff pane did a lot of work to find out and very little to change it. The tracking pane did very little of either, but only because it did the work of recording dependencies earlier, when the page was built. Every strategy in this course moves the cost of knowing *what changed* to a different moment: when the change happens, when the page is built, when the code is compiled, or on the server.
:::

## Two costs, and a third

It is tempting to say that the best strategy is the one with the fewest operations in the counter. It is not that simple, and the rest of the course is largely about why.

**The cost of finding out.** The diff pane built and compared a whole tree to learn that one string changed. For a list of three notes that is nothing. For a list of ten thousand, on every keystroke, it is a frame budget. The tracking pane paid at a different time: each text node holds a subscription, and subscriptions cost memory and setup.

**The cost of changing.** Writes to the DOM are not all equal. Writing a text node is cheap; replacing a whole subtree discards the nodes’ state, and the browser then has to rebuild its own bookkeeping for them. Chapter 1 looks at what a write costs the browser, and why *which* nodes you touch matters more than how many.

**The cost of getting it right.** A strategy that updates the page by hand can be the fastest in the table and the most fragile in the codebase: every state change needs a matching DOM change, written by a person, and forgotten by a person. Chapter 2 shows what that bookkeeping looks like when it grows.

And there is a fourth cost that has nothing to do with updates: **the cost of getting started.** A page rendered on the server arrives ready to read, but it cannot respond to a click until JavaScript has run. Part V is about the strategies that attack that cost, and they change the question itself.

## Six answers

The chapters of this course are organised around six answers to *what changed?* Each one is a way of knowing, and each has an honest weakness.

| Answer | How it knows | Where you will meet it | Its weakness |
|---|---|---|---|
| ⟳ **Rebuild** | It does not know. It assumes everything changed. | `innerHTML` templates, early Backbone views, server-rendered pages | Loses DOM state; does work proportional to the page |
| ≟ **Dirty-check** | It re-reads every value that could have changed and compares with last time. | AngularJS’s digest loop, Angular’s default change detection | Cost grows with the number of bindings, whatever changed |
| ⇄ **Diff** | It builds a new description of the page and compares it with the old one. | React, Preact, Vue’s virtual DOM, Elm | The comparison itself; components that re-render more than they need to |
| ⛓ **Track** | It records which code read which value, and re-runs that code when the value is written. | Solid, Vue’s reactivity, Preact Signals, Angular signals, Svelte 5 | Dependencies discovered at run time can be hard to see; glitches and leaks if built carelessly |
| ⚙ **Compile** | A compiler works out ahead of time which DOM depends on which value. | Svelte, Solid’s templates, Vue’s compiler hints, the React Compiler, Angular’s Ivy | Needs a build step; the shape of the UI must be known in advance |
| ☁ **Skip** | The server knows, or sends HTML, or the page resumes without running anything. | Server rendering, islands, server components, Qwik, htmx | Moves work and latency to the server and the network |

No real framework uses just one. React is *diff*, with *compile* growing around it and *skip* in server components. Vue is *track* feeding a *diff* that *compile* has pre-digested. Angular was *dirty-check*, is becoming *track*, and has had *compile* since Ivy. Svelte 5 is *compile* generating *track*. The map is not a set of boxes; it is a set of directions, and frameworks move along them. Chapter 26 draws the map again with everything on it.

You can see the answers as a progression, and the course is ordered that way, but that is a convenience of teaching and not a history. They overlap in time and keep borrowing from each other.

```numeric
id: the-question/nodes
title: Counting the rebuild
prompt: The rebuild pane builds the page from a string with `innerHTML`. With four notes on the list, how many DOM nodes does it parse (elements and text nodes) on its next action? Press **Add a note** in the figure above, then perform another action, and read the “parsed” counter, or work it out from the structure first.
answer: 13
unit: nodes
tolerance: 0
explain: "The page is a `div`, an `input`, a `p` with one text node, and a `ul`: five nodes. Each of the four notes is an `li` with one text node: eight more. 5 + 8 = 13. Every action in the rebuild pane parses the whole page, whatever it changed; the other panes’ counters do not grow with the length of the list."
```

## How this course works

**It is built from its own parts.** Every strategy above is implemented in the course’s *reactive lab*, a small library written in TypeScript against MiniDom. The Notes app in the figure is built six ways from the same lab. When a chapter explains the virtual DOM, you build its core, and the figure in the chapter then runs *your* understanding of it, in the sense that you will have read and written the same fifty lines. [Appendix C](/appendix/reactive-lab/) lists every module.

**Exercises say what they establish.** Build exercises run your code against tests in a sandbox in your browser. A green result means *these tests passed on this code*, and it goes stale if you edit. Predictions, calculations and find-the-bug exercises check what you understood about a mechanism. The exercises are optional in the sense that you can read straight through; they are the part that makes the ideas stick.

**Real frameworks are quoted, with versions.** Where a chapter says what React, Vue, Solid, Svelte, Angular, Lit or Qwik does, it says which version, and for the compiler chapters the output shown is the real compiler’s, captured from a real build. Frameworks change fast, so the course is organised around mechanisms, which change slowly. The versions it refers to are on the [home page](/).

**Every chapter ends with the same question.** The *What changed?* box at the end of each chapter answers the question for that chapter’s strategy in a few lines, so that by the end you can compare them.

:::whatchanged
For this chapter, the question itself. The *rebuild* pane assumed everything; the *diff* pane found one text node by comparing two trees; the *track* pane never looked, because the text node had been told what to depend on. The same page, three different histories.
:::

## What’s next

Part I starts at the bottom. Before choosing a strategy, it helps to know what the browser charges for a write, because that cost is what every strategy is trying to avoid. Chapter 1 looks at what the browser does with the writes you make, and then the *rebuild* strategy gets its fair hearing in chapter 2.
