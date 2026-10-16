---
title: 'Seven strategies, one benchmark'
summary: The same page, the same eight scenarios and seven of the course's strategies, measured by counting what each does to the DOM. No strategy wins everything, and the way each one loses is the lesson.
number: 24
duration: 60 minutes
prerequisites: [lists-and-keys, templates-and-solid, lit-templates, svelte-invalidation, morphing]
---

For twenty-three chapters each strategy has been judged on its own terms, on its own example. Now put them in the same room.

The **js-framework-benchmark** (Stefan Krause’s long-running project) is the closest thing the field has to a common test. :cite[krause-benchmark] It builds one page in each framework: a table of rows with a label, an id and a button. And it runs the same scenarios against all of them: create a thousand rows, replace them, update every tenth label, select a row, swap two rows, remove one, append a thousand more, clear. It measures time in a real browser, and its results are argued about every year, mostly because a table of times invites the reading *“framework X is 1.3 times faster than framework Y”*, which says less than it appears to.

This chapter does something different. It runs the same eight scenarios against **seven strategies from this course**, each one implemented in the lab on the same fake DOM: a string rebuild with `innerHTML`, the virtual DOM without keys and with them, Lit-style templates, signals with compiled templates, Svelte 4’s bitmasks, and DOM morphing. The **counts** of what each does to the DOM are exact, and the page it produces is checked to be identical across all seven. What it measures is not *how fast* but **how much work**: nodes built, and operations on the live page. That is the part of the cost that the strategy decides, rather than the engine or the machine.

Press the button. It takes a few seconds.

::bench-matrix{n="24.1"}

Read it in four passes.

## Pass one: look at one row

Pick **Update every 10th row**. Five of the strategies do exactly 100 operations, one text write per row changed, whatever the strategy: virtual DOM, Lit, signals, Svelte 4. It is the cheapest result that is possible. The two that do not are *innerHTML* and *morph*, which each take the whole table as a string and work from it: **8,001** units for `innerHTML` (one parse of eight thousand nodes), and **8,101** for morph (the parse, plus the hundred writes). The strategies that discover the change by comparison (the diff), by subscription (signals) or by checking a bit (Svelte 4) all find the same hundred places. The strategies that *do not* look do the same thing as before, to everything.

Now pick **Select a row**: *one* operation for everyone except the two string strategies. That is the whole claim of chapter 0, in a table: changing one attribute should cost one attribute write.

## Pass two: look for the surprises

Pick **Replace all 1,000 rows**, the scenario where the old and new rows have different data. Which strategy wins?

```predict
q: "All 1,000 rows are replaced with 1,000 new ones: different ids, different labels. Which strategy does the least work in the *Work* count?"
options:
  - text: "Signals with compiled templates, because they update only what changed."
    why: "Every row changed, so there is nothing to skip. And each new row is a new item, so the list algorithm removes a thousand old rows and creates a thousand new ones."
  - text: "The virtual DOM without keys."
    correct: true
    why: "Unkeyed, it matches row *i* of the old list with row *i* of the new, finds the same structure, and just rewrites the two text cells in each: about 2,000 text writes and nothing created or removed. The keyed strategies see 1,000 new keys, so they remove every old row and build every new one. This is the unkeyed algorithm's one good scenario: data replaced in place, with nothing about the rows that needs to survive."
  - text: "innerHTML, because it is a single operation."
    why: "One call, but eight thousand nodes parsed and built. The work column counts them; a count of *operations* alone would have made this the winner."
```

That is the surprise of the table: the *worst* algorithm for reordering is the best for replacing. It is not wrong to call it the worst, because the difference is in what each one assumes about the data.

Then **Create 1,000 rows** shows another: `innerHTML` is the cheapest of all. One parse by the browser’s own native parser builds all eight thousand nodes, and nothing built by JavaScript, one `createElement` at a time, can beat it. That is the reason the compiled-template frameworks clone *prepared HTML* (chapter 12) instead of creating nodes. Look at the numbers for Lit and signals, though: a clone still makes every node, and this count charges for each one, plus the markers and text nodes their holes add, so here they come out above the virtual DOM. What cloning saves is engine time per node, which a count cannot show. Svelte 4’s generated code creates each node with `createElement` and inserts most of them into the live page one by one, so it costs the most here.

## Pass three: switch what you count

Switch the figure to **Live operations**, which counts only operations on nodes that are attached to the page. These are the ones a browser has to react to with styling, layout and paint. Now `innerHTML` is the *best* in every row: its one operation is the one insertion of everything. The tables are turned, and the strategies that win by *work* now lose by *live operations*, because they attach a thousand rows one at a time, where `innerHTML` builds them all off-page and attaches once.

Neither table is the truth. The first hides a thousand rows of work inside the word “parse”; the second hides a thousand rows of attachment inside the word “one”. A benchmark that reports one number has chosen what to hide, and that is the first thing to learn from reading one.

Then switch to **Wall-clock ms**. These are real measurements of JavaScript on the lab’s fake DOM, and they will not agree with the rest. They are the number the other benchmark’s readers want, and the one that says the least about a browser, where rendering, layout and paint dominate.

## Pass four: the bottom row

The last row is the **geometric mean** of each strategy’s ratio to the best in each scenario. It is how the js-framework-benchmark reduces a table to one number per framework. In the *Work* view it comes out roughly as follows: the keyed virtual DOM, signals and Lit are all about three times the per-row best; Svelte 4 about four and a half; the unkeyed virtual DOM about seven; `innerHTML` about sixty and morph about 150.

Do not read this as a ranking. Read it as a *profile* of where each strategy loses. The ones at the bottom lose badly on a few rows (the string strategies on *update*, *select*, *swap* and *remove*: where one thing changes), and the ones at the top lose a little on many rows (they never win *create*).

```numeric
id: one-benchmark/remove
title: Removing one row without keys
prompt: |
  The page has 1,000 rows. Each row has two text cells, its id and its label. The **unkeyed** virtual DOM removes the fifth row (index 4). Because it matches children by position, every row after the fifth takes over the data of its successor. About how many text writes does that cost? (The ids all differ; ignore the occasional pair of labels that happen to be equal.) Check against the table.
answer: 1990
unit: text writes
tolerance: 10
explain: "There are 995 rows after the removed one, each of which now shows the next row's data: two text cells each, so 2 × 995 = 1,990 writes (the table shows 1,987 because three pairs of neighbouring labels happen to be equal). The last row is then removed. The *keyed* strategies, which recognise rows by id, simply remove the one row: a single operation. This is the bug-turned-number behind chapter 5's advice to use keys."
```

## Why no strategy wins

Look across the table instead of down it, and the same four facts show up.

**Cost follows what the strategy does *not know*.** The string strategies know nothing about what changed, so they pay for the whole page every time, and are best only when the whole page changed. The virtual DOM knows the previous tree, so it can find the changes by comparison: it pays a walk and wins on small changes. Signals and Svelte 4 know the dependencies in advance and pay nothing to find the changes. But finding the changes is only a part of the cost. The rest is *creating*, and there the native parser has the advantage.

**Identity is a decision.** Keys, ids and “the item itself” (as in Solid’s `For`) answer *which row is which?* The unkeyed answer is “by position”, and it is right for *replace*, and disastrous for *remove*.

**Static structure is free if you know it is static.** Templates (Lit, signals, Svelte) do not diff the parts they know cannot change. The virtual DOM does, unless a compiler tells it (chapter 13).

**Benchmarks pick their scenarios.** The eight here are ones where a reordering, a replacement or an update of a tenth of the rows is all that happens. Real applications mostly do one tiny thing, or the whole screen at once, and the scenario that matters for yours is probably not in the table.

:::key
**Every strategy is a bet on the shape of change.** The string rebuild bets that everything changes; the virtual DOM bets that you cannot say what changes but it is usually little; signals bet that you can say exactly. Each one wins where its bet is right and loses where it is wrong, which is why a table of times can hide more than it shows.
:::

## Hand-write the baseline

The js-framework-benchmark has an entry called *:term[vanilla]{id=vanilla}*: hand-written DOM code, with no framework, which sets the floor everything else is measured against. It is the answer to the question every table of this kind needs, *how much of this is the strategy, and how much is irreducible?* Write it for this page.

```build
id: one-benchmark/vanilla
title: Write the vanilla baseline
prompt: |
  Write `createApp(doc, container)`, which returns `{ create, update10th, select, swap, remove }` for a table of rows `{ id, label }`. Each row is `<tr><td>{id}</td><td>{label}</td></tr>` in a `<tbody>` that you append to `container`. `create(rows)` replaces the rows (build them detached, then attach each once). `update10th()` appends `" !!!"` to the label of every 10th row (indices 0, 10, 20...) by writing the **text node's data**. `select(i)` gives row *i* the class `danger` and takes it away from the previously selected row. `swap(a, b)` swaps rows at positions *a* and *b* with the fewest possible moves. `remove(i)` removes the row at position *i*. Keep your own list of rows and their DOM nodes; **never read the DOM back**. The starter does everything with `innerHTML`; the tests count operations.
starter: |
  import type { MElement, MiniDocument } from '@rx/dom';

  export interface Row {
    id: number;
    label: string;
  }

  export function createApp(doc: MiniDocument, container: MElement) {
    const tbody = doc.createElement('tbody');
    container.appendChild(tbody);
    let rows: Row[] = [];
    let selected = -1;
    const draw = () => {
      tbody.innerHTML = rows.map((r) => `<tr${r.id === selected ? ' class="danger"' : ''}><td>${r.id}</td><td>${r.label}</td></tr>`).join('');
    };
    return {
      create(next: Row[]) {
        rows = next;
        draw();
      },
      update10th() {
        rows = rows.map((r, i) => (i % 10 === 0 ? { ...r, label: r.label + ' !!!' } : r));
        draw();
      },
      select(i: number) {
        selected = rows[i]!.id;
        draw();
      },
      swap(a: number, b: number) {
        [rows[a], rows[b]] = [rows[b]!, rows[a]!];
        draw();
      },
      remove(i: number) {
        rows.splice(i, 1);
        draw();
      },
    };
  }
solution: |
  import type { MElement, MiniDocument, MText } from '@rx/dom';

  export interface Row {
    id: number;
    label: string;
  }

  interface Entry {
    row: Row;
    tr: MElement;
    label: MText;
  }

  export function createApp(doc: MiniDocument, container: MElement) {
    const tbody = doc.createElement('tbody');
    container.appendChild(tbody);
    let entries: Entry[] = [];
    let selected: Entry | null = null;

    function build(row: Row): Entry {
      const tr = doc.createElement('tr');
      const idCell = doc.createElement('td');
      idCell.appendChild(doc.createTextNode(String(row.id)));
      const labelCell = doc.createElement('td');
      const label = doc.createTextNode(row.label);
      labelCell.appendChild(label);
      tr.appendChild(idCell);
      tr.appendChild(labelCell);
      return { row, tr, label };
    }

    return {
      create(rows: Row[]) {
        for (const e of entries) tbody.removeChild(e.tr);
        selected = null;
        entries = rows.map(build); // built detached: not live operations
        for (const e of entries) tbody.appendChild(e.tr); // one live insertion per row
      },
      update10th() {
        entries.forEach((e, i) => {
          if (i % 10 !== 0) return;
          e.row = { ...e.row, label: e.row.label + ' !!!' };
          e.label.data = e.row.label; // one text write
        });
      },
      select(i: number) {
        const next = entries[i]!;
        if (selected === next) return;
        selected?.tr.removeAttribute('class');
        next.tr.setAttribute('class', 'danger');
        selected = next;
      },
      swap(a: number, b: number) {
        if (a === b) return;
        const [lo, hi] = a < b ? [a, b] : [b, a];
        const first = entries[lo]!;
        const second = entries[hi]!;
        const afterSecond = second.tr.nextSibling;
        tbody.insertBefore(second.tr, first.tr); // move the later row before the earlier one
        tbody.insertBefore(first.tr, afterSecond); // and the earlier one to where the later one was
        entries[lo] = second;
        entries[hi] = first;
      },
      remove(i: number) {
        const [gone] = entries.splice(i, 1);
        tbody.removeChild(gone!.tr);
        if (selected === gone) selected = null;
      },
    };
  }
tests: |
  import { test, expect } from '@rx/test';
  import { createDocument } from '@rx/dom';
  import { createApp } from './solution.ts';

  const rows = (n: number, start = 1) => Array.from({ length: n }, (_, i) => ({ id: start + i, label: `row ${start + i}` }));
  const html = (doc: { body: { innerHTML: string } }) => doc.body.innerHTML;
  function setup(n = 1000) {
    const doc = createDocument();
    const app = createApp(doc, doc.body);
    app.create(rows(n));
    const mark = doc.mark();
    return { doc, app, mark };
  }

  test('create builds the table', () => {
    const doc = createDocument();
    const app = createApp(doc, doc.body);
    app.create(rows(3));
    expect(html(doc)).toBe('<tbody><tr><td>1</td><td>row 1</td></tr><tr><td>2</td><td>row 2</td></tr><tr><td>3</td><td>row 3</td></tr></tbody>');
  });

  test('create attaches each row once, and builds nodes detached', () => {
    const doc = createDocument();
    const app = createApp(doc, doc.body);
    const mark = doc.mark();
    app.create(rows(1000));
    const s = doc.statsSince(mark);
    expect(s.live).toBeLessThanOrEqual(1001);
    expect(s.created).toBeLessThanOrEqual(5001);
    expect(s.parsed).toBe(0);
  });

  test('replacing the rows removes the old ones and shows the new ones', () => {
    const { doc, app } = setup(5);
    app.create(rows(2, 100));
    expect(html(doc)).toBe('<tbody><tr><td>100</td><td>row 100</td></tr><tr><td>101</td><td>row 101</td></tr></tbody>');
  });

  test('update10th makes exactly 100 text writes and nothing else', () => {
    const { doc, app, mark } = setup();
    app.update10th();
    const s = doc.statsSince(mark);
    expect(s.total).toBe(100);
    expect(s.texts).toBe(100);
    expect(doc.body.querySelectorAll('tr')[10]!.textContent).toBe('11row 11 !!!');
    expect(doc.body.querySelectorAll('tr')[11]!.textContent).toBe('12row 12');
  });

  test('select is one attribute write, and moving the selection is two', () => {
    const { doc, app, mark } = setup();
    app.select(4);
    expect(doc.statsSince(mark).total).toBe(1);
    const mark2 = doc.mark();
    app.select(7);
    expect(doc.statsSince(mark2).total).toBe(2);
    const trs = doc.body.querySelectorAll('tr');
    expect(trs[4]!.hasAttribute('class')).toBe(false);
    expect(trs[7]!.getAttribute('class')).toBe('danger');
  });

  test('swap moves two rows, with two insertions', () => {
    const { doc, app, mark } = setup();
    app.swap(1, 998);
    const s = doc.statsSince(mark);
    expect(s.inserted).toBe(2);
    expect(s.total).toBe(2);
    const trs = doc.body.querySelectorAll('tr');
    expect(trs[1]!.textContent).toBe('999row 999');
    expect(trs[998]!.textContent).toBe('2row 2');
    expect(trs).toHaveLength(1000);
  });

  test('swap works with the rows in either order, and next to each other', () => {
    const { doc, app } = setup(6);
    app.swap(4, 1);
    app.swap(2, 3);
    const labels = doc.body.querySelectorAll('tr').map((t) => t.textContent);
    expect(labels).toEqual(['1row 1', '5row 5', '4row 4', '3row 3', '2row 2', '6row 6']);
  });

  test('remove is one removal, and later operations still use the right rows', () => {
    const { doc, app, mark } = setup();
    app.remove(4);
    const s = doc.statsSince(mark);
    expect(s.total).toBe(1);
    expect(s.removed).toBe(1);
    app.select(4);
    expect(doc.body.querySelectorAll('tr')[4]!.textContent).toBe('6row 6');
    expect(doc.body.querySelectorAll('tr')[4]!.getAttribute('class')).toBe('danger');
  });
hints:
  - "Keep an array of `{ row, tr, label }` entries. The label's text node is what `update10th` writes to."
  - "To swap rows `a < b`, move the later row before the earlier one, then move the earlier one before the node that followed the later one: two `insertBefore` calls."
  - "Build each row without attaching it (its `createElement` and `appendChild` calls on detached nodes are not live operations), then append the finished row once."
explain: "A hundred lines of straight DOM code reach the floor in every scenario: one text write per changed label, one attribute for a selection, two insertions for a swap, one removal. Notice what you had to do yourself, though: you tracked identity (the entries array is a keyed list), you remembered the previously selected row, and you hand-maintained the invariant that the array and the page agree. Every strategy in the table, apart from the string rebuilds, is a way of getting the same operation counts while writing none of that by hand. The benchmark's most honest column is this one: how close to *vanilla* each approach gets, and what it costs you in code."
```

## What the table cannot tell you

A benchmark of this kind has real uses. It tells you what a strategy *can* do and what it cannot, and the shape of its worst cases. It does not tell you:

- **What it costs to write.** Your hundred lines of vanilla code have the best numbers and the highest cost in maintenance. The rest of the course is about getting numbers like those from code that is easier to write.
- **What happens at scale.** A page of a thousand identical rows is not a page with two hundred different components, each doing something small.
- **What users feel.** Rendering, layout and paint, input latency and memory dominate in a real browser, and a strategy’s share of them is often small.
- **How it behaves under your data.** Whether lists are reordered or replaced, whether rows have state, how often the whole page changes, decide the winner.

:::programmer
**Reading a framework benchmark.** Ask four questions of any table you meet. *What was counted* (time, operations, memory, bytes shipped), *what scenarios* (and whether any of them look like your app), *what the implementations were allowed to do* (keyed or unkeyed? hand-optimised? the same page, checked?), and *what is hidden by the summary* (a :term[geometric mean]{id=geometric-mean} averages a catastrophic scenario with a good one). Then discount everything by the question of how much of your application’s time is spent where the benchmark measures.
:::

:::wild{framework="js-framework-benchmark" version="2026"}
Stefan Krause’s benchmark has run since 2015 and includes dozens of implementations, with *keyed* and *non-keyed* categories (as this chapter’s *replace all* shows, the difference matters), startup time, memory and bundle size alongside the scenarios. It measures real browser time using the Chrome DevTools trace, which includes layout and paint, and is the most-cited source for comparative claims. The mini-benchmark here is built on the same scenarios, on the lab’s fake DOM, to count what the strategies do and leave the browser out.
:::

:::history{year=2015 title="The benchmark that framework authors argue about"}
Krause’s benchmark started in 2015 as a way to compare Angular, React and Vue-style frameworks on identical work, and grew into the field’s reference. :cite[krause-benchmark] Its main influence has been on how the frameworks are *written*: many of the choices in this part of the course (keyed reconciliation, templates cloned from HTML, signals with fine-grained rows) were tuned against it. Authors of frameworks, including those of Solid, Inferno, ivi and Svelte, have cited it in design discussions, and its critics point out that optimising for it can distort a framework toward one kind of page.
:::

:::whatchanged
Five of the six answers, side by side, with a price attached to each. **Rebuild** costs a parse of everything and wins at creating. **Diff** costs a walk and wins when little changes. **Track** and **compile** cost nothing to find what changed and win at updates, at the price of subscriptions, a compiler, or both. **Skip** is the strategy that keeps work from happening at all and is not in this table, because its costs are paid before the page loads. The table is a map of *where each strategy hurts*, rather than a ranking.
:::

## What’s next

The last two chapters turn the table into decisions. Chapter 25 is optional: design your own renderer, choosing a strategy for each part of a page. Chapter 26 looks at what comes next for the field, and where to read more.
