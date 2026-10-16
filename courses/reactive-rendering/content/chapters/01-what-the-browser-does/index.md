---
title: What the browser does with your writes
summary: From a DOM write to pixels. Style, layout, paint and composite; the writes that only invalidate, the reads that force the browser to catch up, and a loop that makes a page crawl without doing anything that looks expensive.
number: 1
duration: 40 minutes
prerequisites: [the-question]
---

Chapter 0 counted :term[DOM]{id=dom} operations, as if each cost the same. They do not, and the difference is what every strategy in this course is trying to exploit. This chapter opens the browser far enough to see what a write costs, and, more usefully, *when* it is paid.

Start with a loop that looks harmless. It gives every item on the page the same width as its own height.

```js
for (const el of items) {
  const h = el.offsetHeight;
  el.style.width = h + 'px';
}
```

Two lines, one read and one write per item. Run it over a hundred items on a page of a couple of thousand nodes and it takes a visible fraction of a second; split it into two loops and it takes a few milliseconds. Nothing in the code says why.

```predict
q: Now rewrite the loop as two loops: *all the reads first*, then *all the writes*. What happens to the amount of layout work the browser does?
options:
  - text: Nothing changes. Reads and writes are the same operations in a different order.
    why: The operations are the same. The work the browser does in response is not, because the cost is charged at the moment of a read, not at the moment of a write.
  - text: It drops from about one layout per item to about one in total.
    correct: true
    why: That is the whole story of this chapter. Writes only mark things out of date. A read of something that depends on layout forces the browser to bring layout up to date first, so alternating the two makes it recompute layout every time.
  - text: It goes up, because the browser now has to remember every height.
    why: Remembering a hundred numbers costs nothing next to a layout of the page.
```

## The pipeline

The browser turns your HTML, CSS and script into pixels through a chain of stages :cite[kosaka-browser]. On the main thread, in order:

1. **Script** runs: your code and the framework's. It reads and writes the DOM.
2. **Style** works out, for each element, which CSS rules apply and what its computed values are.
3. **:term[Layout]{id=layout}** works out where every box goes and how big it is. It is the expensive stage, because one box's size can depend on its parent's, its siblings' and its children's.
4. **:term[Paint]{id=paint}** records what to draw in each layer: backgrounds, borders, text.
5. **Composite** (on a separate thread, the *compositor*) combines the painted layers into the final picture, and can move, fade or scale a layer without involving the main thread at all.

Normally this happens once per frame, after your script has finished and before the screen refreshes. Around sixty times a second leaves about sixteen milliseconds for the whole chain, script included.

The key fact is how script and the pipeline talk to each other. **A DOM write does not draw anything and does not even compute anything.** Setting `el.style.width` changes the element's specified style and sets a flag: *style is out of date*, and, because a width can move other boxes, *layout is out of date*. Nothing is recomputed. The browser waits until the end of the frame and does the work once, however many writes there were.

:::key
Writes **invalidate**. The browser recomputes **later, once**. That is a dirty-bit strategy, and it is the same idea this whole course is about, applied by the browser to your DOM writes. Frameworks lean on it: they can write to the DOM as often as they like, as long as nothing forces the recomputation to happen early.
:::

## Reads that force the browser to catch up

Some reads cannot be answered from stale data. If you ask an element for `offsetHeight`, or call `getBoundingClientRect()`, the browser has to give you the *current* number, which means making style and layout current first, right now, in the middle of your script. This is called a **forced synchronous layout** (or *forced reflow*), and it is the one way for script to make the browser do the expensive work early and repeatedly.

A :term[forced layout]{id=forced-layout} is only as expensive as the layout that had to be redone, which is why it matters how many nodes the page has and how much of it the write could affect. And it is only forced if something is out of date. A read of `offsetHeight` with nothing invalidated is answered straight from the last layout.

Interleaving is what hurts. The write invalidates; the next read forces; the next write invalidates again. The browser does the whole pipeline's front half (style and layout) once per item instead of once per frame. This is *layout thrashing*.

The figure runs the loop above, and four variations, through a model of the pipeline. The costs are plausible and rounded: layout grows with the size of the page. The *counts* are exact and are the point.

::pipeline-stepper{n="1.1"}

Switch between the snippets with the same number of items. The batched version and the interleaved version do the same reads and the same writes. Then look at the off-page build: building a hundred children in a fragment and attaching them once forces nothing, because **a node that is not attached to the page cannot invalidate it**. That is the reason MiniDom’s counters, and the lens in chapter 0, keep *live* operations apart from the rest, and the reason every strategy in this course assembles a subtree off the page and attaches it with one insertion.

```numeric
id: what-the-browser-does/forced
title: Counting forced layouts
prompt: The interleaved loop runs over 50 items (each iteration reads `offsetHeight`, then writes `style.width`). How many forced layouts does it cause? Remember that a read is only forced when something is out of date.
answer: 49
unit: forced layouts
tolerance: 0
explain: "The first read finds nothing invalidated, so it is answered at once. Its write invalidates; the second read must lay the page out first. So reads 2 to 50 are forced: 49 forced layouts. The final write’s invalidation is paid for once, at the end of the frame, like everything in the batched version."
```

## What is cheap and what is not

This gives a rough ordering, from cheap to expensive. It is a guide to thinking about writes, not a table to memoise.

- **Writes to detached nodes** cost allocation and nothing else.
- **Compositor-only properties** (`transform`, `opacity`) skip layout. This is why animations should use them instead of `left` or `width`.
- **Paint-only changes** (`color`, `background`) invalidate style and paint but not layout.
- **Changes that can move boxes** (size, display, adding or removing nodes) invalidate layout, which is the expensive stage.
- **Anything followed by a layout-dependent read** is charged immediately, and as often as you alternate.

Two consequences matter for the rest of the course. First, *which* nodes you touch matters more than how many: a thousand text writes inside one stable box are cheaper than one change that resizes the container. Second, a framework that batches its writes into one phase, with no reads in between, gets this for free. Many frameworks make that separation explicit: React’s *render* phase reads and computes, its *commit* phase writes; its `useLayoutEffect` is the documented place where you may read layout after a commit, and the place where thrashing sneaks back in.

```debug
id: what-the-browser-does/thrash
title: The accordion
prompt: "This function opens one panel of an accordion and then makes the rest of the panels match its height. It is called inside a scroll handler and visibly stutters. Click the line that forces the layout on every iteration."
lang: js
code: |
  function sync(panels, open) {
    open.classList.add('open');
    for (const panel of panels) {
      if (panel === open) continue;
      panel.style.height = open.offsetHeight + 'px';
    }
  }
answer:
  line: 5
notes:
  2: "This write invalidates layout once. One invalidation is fine."
  4: "A cheap comparison, nothing to do with the DOM."
explain: "`open.offsetHeight` is read inside the loop, right after the previous iteration’s write to `panel.style.height`. Each read finds layout out of date and forces it. Reading `open.offsetHeight` once, before the loop, makes every iteration a write: one forced layout before the loop, and one more at the end of the frame."
hints:
  - "Look for a read of a layout value that sits inside a loop that also writes."
  - "Does `open.offsetHeight` change between iterations?"
```

## Where the browser gets its speed, and where frameworks get theirs

It is worth noticing what the browser is doing for you here. When you write ten times in a row, the browser does not run layout ten times; it notes, ten times, that layout is out of date, and then runs it once. It does not know *what* changed in any useful sense: it only knows that *something* did, and the stages recompute whatever is dirty. That is a perfectly good answer to *what changed?*, because the browser’s own bookkeeping is below the level where it matters, and because it was designed to be cheap to ask.

Frameworks work one level up, on a different question: not “is layout out of date?” but “which of my thousands of nodes should I write to, and with what?” The browser’s dirty bits make *writing* cheap and *reading* expensive, and the strategies you will meet differ mostly in how few writes they make and how well they stay off the reads.

:::wild
**In the Performance panel.** Chrome’s DevTools mark forced layouts in a recording: an event for *Recalculate Style* or *Layout* triggered from a script is flagged with a warning that a forced reflow is a likely bottleneck, and links to the line of code that read the property. Paul Irish’s list of what forces layout (the comprehensive version) is the reference that every web performance article cites. :cite[irish-forces-layout]
:::

:::whatchanged
In the browser itself: *nothing is known at write time*. Each write sets a dirty bit; style and layout are recomputed once, at the end of the frame, for whatever is dirty. Reads that need an up-to-date answer (`offsetHeight`) break that bargain by forcing the recomputation early, and thrash if they alternate with writes. Every framework below sits on top of this and tries to write rarely, in one batch, to nodes that are not yet on the page.
:::

## What’s next

The browser is fast at one big update and slow at many interleaved ones, so a good strategy decides *what to write* before writing anything. Chapter 2 starts with the simplest decision procedure there is, rebuilding everything, and with what goes wrong when you stop doing that.
