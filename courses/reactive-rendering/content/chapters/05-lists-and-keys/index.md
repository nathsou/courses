---
title: Lists and keys
summary: Why a reordered list breaks the state of its inputs, how keys fix it, and how React’s and Vue’s algorithms decide what to move, down to the longest increasing subsequence.
number: 5
duration: 60 minutes
prerequisites: [trees-as-values]
---

Chapter 4 ended with a list that the diff got wrong. `a b c d` became `d a b c`, and comparing by position it saw four items whose text had changed. Nothing in its output was *incorrect*: the page showed the right words. But the nodes that showed them had been given to the wrong items.

For text, that is only wasteful. For anything that carries state, it is a bug.

## Whose state is it?

The figure below runs one reorder on a real list. Every row has a text box. Choose **By position**, type a few words into different boxes, press **Apply the reorder**, and read the table that appears.

::list-reconciler{n="5.1" strategy="index"}

With the position algorithm, the label next to each box moves and the *box stays where it was*. The note you wrote for `a` is still in the first slot, which now belongs to `d`. The table’s red rows show it.

This is not a rare edge case. It is what happens to every list of components that have any state of their own (a text box, a checkbox, an expanded section, a hover animation) when the list is sorted, filtered, deleted from or inserted into anywhere except the end.

The fix is to tell the diff what *identity* means. If each item has a **key**, a value that is the same for the same logical item across renders, the diff can match old and new children by key, not by position, and a reorder becomes a *move*: the same node, in a new place, keeping everything attached to it.

Switch the figure to either of the other algorithms and repeat the experiment. The typed text now follows its item. What differs between those two is how many nodes they move to get there.

## What makes a good key

A key has to be **stable** (the same item gets the same key on every render), **unique among its siblings** (not across the page), and **tied to the item, not to its position.**

```predict
q: A list of notes can be reordered and deleted from. Which `key` is right?
options:
  - text: The note’s index in the array.
    why: The index is a position. Deleting the first note gives every later note a new key, so every row is matched to its neighbour’s old node. This is the by-position algorithm in disguise, and it is the classic source of “my input shows the wrong text” bugs.
  - text: A random value generated on each render.
    why: A key that changes on every render matches nothing. Every row is thrown away and rebuilt on every render, losing its state each time and doing the most work.
  - text: A stable id stored with the note when it was created.
    correct: true
    why: The id is the same before and after any reorder, insertion or deletion, and unique within the list. It is the note’s identity.
```

A key is a hint to the diff, not a prop: it is not passed to the component. And it changes meaning when it appears at the *top* of a component rather than in a list: changing a component’s `key` tells the framework that it is now a *different* component, so its state is discarded and it is mounted fresh. That is a legitimate tool: `<ProfileForm key={userId} />` resets the form whenever the user changes, with no code to reset it.

```debug
id: lists-and-keys/index-key
title: The note that kept the wrong text
prompt: "In this component each note has a text box for a comment. Users report that after deleting the first note, the *second* note shows the first one’s comment. Click the line responsible."
lang: jsx
code: |
  function Notes({ notes, onDelete }) {
    return (
      <ul>
        {notes.map((note, i) => (
          <li key={i}>
            {note.title}
            <input placeholder="Comment" />
            <button onClick={() => onDelete(note.id)}>Delete</button>
          </li>
        ))}
      </ul>
    );
  }
answer:
  line: 5
notes:
  4: "`map` is fine. The question is what each child is told its identity is."
  8: "The handler uses `note.id`, which is the right kind of identity: stable and tied to the note. The `key` should use it too."
explain: "`key={i}` is the position. After the first note is deleted, the note that was second becomes index 0 and is matched to the first row’s node, which still holds the deleted note’s comment. Using `key={note.id}` lets the diff match by identity: the first row’s node is removed with the first note, and the second row’s node, with its comment, stays."
hints:
  - "What does the diff match a child to when the key is just its index?"
```

## Two algorithms

Given old and new lists of keys, the diff has to produce a short list of DOM operations. For a keyed list, every old child falls into one of three groups: matched with a new child that is in the *right relative place*, matched but *out of order*, or unmatched and to be removed. New children with no old match are created. The art is in the middle group.

### React: the last placed index

React’s algorithm walks the new list from the left, remembering the largest old position it has passed (`lastPlacedIndex`). For each new child it finds the matching old child by key. If that child’s old position is *behind* the one already placed, it must move; otherwise it stays, and the marker advances.

```
old: a b c d      new: d a b c
walk:  d (old pos 3)  → placed, marker = 3
       a (old pos 0)  → 0 < 3: move
       b (old pos 1)  → 1 < 3: move
       c (old pos 2)  → 2 < 3: move
```

It is simple and quick, and it has a characteristic weakness. Moving the *last* item to the front pushes the marker to the end immediately, so every other item looks as if it has fallen behind and is moved. Three moves where one would do. Moving the *first* item to the end costs one move.

### Vue 3: trim the ends, then keep the longest stable run

Vue’s `patchKeyedChildren` (and the algorithms in Inferno and ivi that it follows) does two things React’s does not. It first **trims**: it skips over matching children at the start, and then at the end, since in real UIs most updates are insertions, removals or edits somewhere in the middle. Then, for the unmatched middle, it asks a sharper question: *which of the surviving items are already in the correct order relative to each other?* Those can be left alone. Only the rest have to move.

Take the new order and write down, for each item, its position in the old order. For `d a b c` that is `3 0 1 2`. A set of items that are already in the right relative order is exactly an *increasing subsequence* of that sequence; the biggest such set is the **longest increasing subsequence** (LIS). Here it is `0 1 2`, the items `a b c`. Those stay. Only `d` moves: one DOM move instead of three.

The number of moves is therefore the number of surviving items minus the length of their LIS. That is the minimum possible, because every item outside a stable run has to be moved by something.

The LIS itself is found in O(n log n) with *patience sorting*: deal the numbers into piles from left to right, each onto the leftmost pile whose top is not smaller than it, or starting a new pile. The number of piles is the length of the LIS. Step through it:

::lis-stepper{n="5.2" numbers="3 1 4 0 2 6 5"}

:::note
The pile tops alone are not the subsequence; real implementations record, for each number, the pile top it was placed on, and walk back from the last pile to recover the sequence. The library’s `lis` in `rx/keyed.ts` does this in about twenty lines.
:::

## Seeing the difference

Back in the reconciler, run the same reorders with both algorithms and compare the *move* counts. Some results to look for: **Last to front** is where Vue’s wins most clearly. **First to end** is a tie. **Swap two** (`a e c d b f`) costs Vue the two items that swapped, and React the three that fell behind its marker. **Insert** and **Remove** cost no moves in either, because the trimming and the marker both handle them. **Reverse** is the worst case for both: five moves of six.

```numeric
id: lists-and-keys/react-moves
title: React’s moves
prompt: React’s algorithm turns the list `a b c d e` into `e a b c d` (the last item moves to the front). How many DOM moves does it perform?
answer: 4
unit: moves
tolerance: 0
explain: "`e` is placed first (old position 4), so the marker is 4 and each of `a`, `b`, `c`, `d` (old positions 0–3) is behind it and has to move: 4 moves. Vue’s algorithm finds that `a b c d` is already in order and moves only `e`: 1 move."
```

```build
id: lists-and-keys/lis
title: Write the longest increasing subsequence
prompt: |
  Write `lis(seq)`: given an array of numbers, return the **indices** (into `seq`, in increasing order) of a longest strictly increasing subsequence. Entries equal to `-1` stand for items with no counterpart (new items); they must never be part of the result. For `[3, 0, 1, 2]` the answer is `[1, 2, 3]`. If several subsequences have the same maximal length, any one is fine. An O(n²) solution passes; the O(n log n) patience-sorting version is the one real frameworks use.
starter: |
  export function lis(seq: readonly number[]): number[] {
    // TODO
    return [];
  }
solution: |
  export function lis(seq: readonly number[]): number[] {
    const tails: number[] = []; // tails[k]: index of the smallest tail of an increasing subsequence of length k + 1
    const prev = new Array<number>(seq.length).fill(-1);
    for (let i = 0; i < seq.length; i++) {
      const x = seq[i]!;
      if (x < 0) continue;
      let lo = 0;
      let hi = tails.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (seq[tails[mid]!]! < x) lo = mid + 1;
        else hi = mid;
      }
      if (lo > 0) prev[i] = tails[lo - 1]!;
      tails[lo] = i;
    }
    const out: number[] = [];
    let k = tails.length ? tails[tails.length - 1]! : -1;
    while (k >= 0) {
      out.push(k);
      k = prev[k]!;
    }
    return out.reverse();
  }
tests: |
  import { test, expect } from '@rx/test';
  import { lis } from './solution.ts';

  const valid = (seq: number[], idx: number[]) =>
    idx.every((v, i) => i === 0 || (v > idx[i - 1]! && seq[v]! > seq[idx[i - 1]!]!)) && idx.every((i) => seq[i]! >= 0);

  test('the example from the prompt', () => {
    expect(lis([3, 0, 1, 2])).toEqual([1, 2, 3]);
  });

  test('empty, single and already sorted', () => {
    expect(lis([])).toEqual([]);
    expect(lis([7])).toEqual([0]);
    expect(lis([0, 1, 2, 3])).toEqual([0, 1, 2, 3]);
  });

  test('strictly decreasing input has an LIS of length 1', () => {
    expect(lis([3, 2, 1, 0])).toHaveLength(1);
  });

  test('-1 entries are skipped', () => {
    const seq = [-1, 4, -1, 2, 7, -1, 9];
    const idx = lis(seq);
    expect(idx.map((i) => seq[i])).toEqual([2, 7, 9]);
  });

  test('the result is a valid increasing subsequence of the maximum length, on 300 random inputs', () => {
    let seed = 7;
    const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
    for (let t = 0; t < 300; t++) {
      const seq = Array.from({ length: 1 + Math.floor(rnd() * 9) }, () => Math.floor(rnd() * 12));
      let best = 0;
      for (let mask = 0; mask < 1 << seq.length; mask++) {
        let last = -1;
        let n = 0;
        let ok = true;
        for (let i = 0; i < seq.length && ok; i++) {
          if (mask & (1 << i)) {
            if (seq[i]! <= last) ok = false;
            last = seq[i]!;
            n++;
          }
        }
        if (ok) best = Math.max(best, n);
      }
      const got = lis(seq);
      expect(valid(seq, got)).toBe(true);
      expect(got.length).toBe(best);
    }
  });
hints:
  - "For each index, the best subsequence ending there is one longer than the best among the earlier, smaller values."
  - "For the O(n log n) version: keep `tails[k]`, the index of the smallest tail value among increasing subsequences of length k + 1. Binary-search it for each new value, and record a `prev` link."
explain: "This is the function every keyed virtual DOM that moves minimally depends on. In Vue’s source it is called `getSequence`, and it runs only when the diff has seen that nodes have moved."
```

## Beyond React and Vue

Every framework with a virtual DOM, and several without one, must solve this. They differ in details more than in kind.

:::wild
**Keys in other frameworks.** Vue spells it `:key`. Svelte’s keyed block is `{#each items as item (item.id)}`; without the `(item.id)` the block updates by position. Solid has two components for the two behaviours: `<For>` is keyed by the item’s reference and moves nodes when items move, `<Index>` is keyed by position and keeps nodes in place while *their contents* update. Angular’s `@for` block *requires* a `track` expression and refuses to compile without one, which turns a bug into a build error. Lit’s `repeat(items, keyFn, template)` is the keyed form; the default array rendering updates by position, as chapter 16 shows.
:::

Two further details matter when you read their source. **Fragments, text and component boundaries** complicate it: a component can return several nodes, so “the node to move” can be a run of siblings, and a keyed child that is itself a component must move its whole output. And **moving nodes has a hidden cost**: in a browser, moving a node that contains an iframe, a playing video or a focused input can reset it. A recent addition to the DOM, `moveBefore`, moves a node *without* resetting that state; chapter 26 comes back to it.

:::whatchanged
For *keyed lists in a virtual DOM*: **the items whose keys appear in both lists, and, among those, only the ones outside the longest stable run**. Matching by key preserves identity (and with it every piece of DOM state); the LIS minimises the moves. A reorder is a handful of `insertBefore` calls, and a position-based diff is the same reorder done as a rewrite.
:::

## What’s next

Keys decide which nodes are the *same*. Chapter 6 adds the other half of what React made popular: components that are functions called again on every render, whose state must survive each call. That is the problem hooks solve, and it comes with a rule that turns out to be a statement about how they are implemented.
