---
title: Trees as values
summary: Elements as plain objects, a diff that is linear because it cheats on purpose, and a patch that touches only what differs. Build the core of a virtual DOM.
number: 4
duration: 55 minutes
prerequisites: [ui-as-a-function]
---

The two roads of chapter 2 are the ends of a seesaw. *Rebuild* throws everything away and keeps nothing; *update by hand* keeps everything and writes the update logic itself. The :term[virtual DOM]{id=virtual-dom} is the first answer to sit in the middle: **rebuild the *description*, keep the nodes.**

The description is cheap to rebuild because it is not the DOM. It is a tree of plain objects, in memory, with no layout and no attributes to compute, no style, no events. The nodes are expensive, so the system keeps them and only touches the ones where the new description disagrees with the old.

This chapter builds the two halves of that: a description you can write (`h`), and a comparison that finds the difference (`diff`) and applies it (`patch`).

## A page as a value

An *element* of a virtual DOM is an object that says what a DOM node should be. This is the whole definition:

```ts
type VNode = { type: string; props: Record<string, unknown>; children: (VNode | string)[] };

const h = (type: string, props: Record<string, unknown> | null, ...children: (VNode | string)[]): VNode =>
  ({ type, props: props ?? {}, children });
```

and with it a page is a function call that returns a tree of them:

```ts
const view = (notes: { text: string; done: boolean }[]) =>
  h('div', { class: 'notes' },
    h('p', null, `${notes.length} notes`),
    h('ul', null, ...notes.map((n) => h('li', { class: n.done ? 'done' : '' }, n.text))));
```

JSX is only syntax for this. `<li class="done">{text}</li>` compiles to `h('li', { class: 'done' }, text)` (or, in modern builds, to `jsx('li', { class: 'done', children: text })`; chapter 19 shows the output). A virtual DOM element is a value. It can be stored, compared, passed to a function, thrown away. Building one allocates a few small objects and touches nothing the browser cares about.

Mounting a description is a recursive walk that creates the real nodes. It builds each subtree *before* attaching it, so the whole tree costs one live insertion (chapter 1):

```ts
function createDom(doc: MiniDocument, v: VNode | string): MNode {
  if (typeof v === 'string') return doc.createTextNode(v);
  const el = doc.createElement(v.type);
  for (const [k, val] of Object.entries(v.props)) el.setAttribute(k, String(val));
  for (const child of v.children) el.appendChild(createDom(doc, child));
  return el;
}
```

## The comparison, and the cheat

Now the real question. The state changed, `view` returned a new tree, and the DOM still shows the old one. How do you turn one into the other with the fewest operations?

That problem has a name, *tree edit distance*: the smallest sequence of insertions, deletions and relabelings that turns one tree into another. It is well studied and it is not cheap: the classic algorithm of Zhang and Shasha runs in time roughly proportional to the product of the sizes and depths of the two trees, and the best general algorithms are still cubic in the worst case. :cite[zhang-shasha-1989] :cite[bille-2005] React’s own documentation said, when it first described the algorithm, that the state of the art had a complexity “in the order of O(n³)” and that a thousand elements would then need a billion comparisons. :cite[react-reconciliation]

So the algorithm *cheats*, in a way that is carefully chosen: it gives up on finding the best possible edit and settles for a good one, using two assumptions about how UIs behave.

:::key
**Assumption 1: elements of different types produce different subtrees.** If a `div` becomes a `section`, do not try to turn the old subtree into the new one. Throw the old subtree away and build the new one.

**Assumption 2: compare siblings with siblings, and only at the same depth.** The *i*-th child of the old node is compared with the *i*-th child of the new node. A node is never matched with one that moved to a different level. (Chapter 5 adds an escape hatch for reordering within a list: keys.)
:::

With those two, the comparison is a single walk over both trees at the same time, visiting each node once. It is linear in the size of the tree.

## The patch

The walk looks like this. It takes the DOM node that currently shows the old description and updates it to show the new one:

```ts
function patch(parent: MElement, dom: MNode, oldV: VNode | string, newV: VNode | string): MNode {
  // 1. Text against text: update the text if it differs.
  // 2. Different kinds, or different types: replace the node and everything below it.
  // 3. Same type: update the attributes that differ, then patch the children pairwise,
  //    appending any extra new children and removing any extra old ones.
}
```

Each rule is a statement about *which operation* is needed, and the three of them cover everything:

| Old vs new | DOM operations |
|---|---|
| Same text | none |
| Different text | one text write |
| Same type, same props | none (for this node; then recurse) |
| Same type, a prop differs | one attribute write per prop that differs |
| Different type | create the new subtree, insert it, remove the old one |
| New has extra children | create and insert them |
| Old has extra children | remove them |

Notice what the rules never do: they never *read* the DOM. All the comparisons are between two descriptions, both in memory. That is the other half of why this works (it satisfies chapter 1’s rule: no reads between writes) and why it can be fast even when it compares thousands of nodes.

Try it. The lab below takes a “before” and an “after” as HTML, mounts the first, and patches to the second. Read the lens after each preset, and then edit the HTML to try cases of your own. The `innerHTML` switch shows what the same update costs by rebuilding.

::diff-lab{n="4.1"}

Work through the presets with the lens open. **Text**: one text write, and every node keeps its identity. **Attribute**: two attribute writes. **Tag changes**: the `p` that became a `section` is replaced (created, inserted, removed), but *its sibling is untouched*, because Assumption 2 compares siblings one at a time. **Add** and **Remove**: new items are created and extra ones removed, at the end. **Reorder**: the one you will not like. The list `a b c d` becomes `d a b c`, and the diff, comparing by position, sees four items whose text changed; it rewrites all four text nodes and moves nothing.

```predict
q: A `<div>` containing a large, deeply nested form is changed so that the outer element is a `<section>` instead of a `<div>`, with exactly the same children. What does the diff do with the form?
options:
  - text: Nothing. Only the outer tag name changed, so it updates that and keeps the children.
    why: You can’t change a DOM element’s tag name, and the diff does not try to find a clever way round that. A different type means a different subtree.
  - text: It rebuilds the entire form, with new nodes for everything, and anything the user typed into it is lost.
    correct: true
    why: Assumption 1: elements of different types produce different subtrees. It doesn’t look at the children at all. The cost is the whole subtree, and the DOM state (typed values, focus) goes with it. This is why wrapper elements that change type are a classic cause of lost input.
  - text: It compares the children one by one and rebuilds only the ones that differ.
    why: That would need to know that the children correspond, and it assumed they do not, as soon as the types differ.
```

## Build the patch

Here is the real thing, at the scale where you can write all of it. The starter has `h` and `createDom`; `patch` is the part to write. The tests check *which DOM operations happen*, not only that the result is right, because a patch that rebuilds everything is also right.

```build
id: trees-as-values/patch
title: Write patch
prompt: |
  Complete `patch(parent, dom, oldV, newV)`. `dom` is the DOM node that currently shows `oldV`; `parent` is its parent. Update `dom` in place so that it shows `newV`, and return the node that shows it (the same `dom` when it could be kept, a new one when it had to be replaced). Follow the table above: text is updated in place; a different tag, or a text node against an element, replaces the node (`parent.replaceChild`); the same tag has its attributes brought up to date (remove the ones that are gone, set the ones that differ) and its children patched pairwise by position, with extra new children appended and extra old children removed. Use `createDom(parent.doc, v)` to build new nodes.
starter: |
  import type { MElement, MNode, MiniDocument } from '@rx/dom';

  export type VNode = { tag: string; props: Record<string, string>; children: (VNode | string)[] };

  export const h = (tag: string, props: Record<string, string> | null = null, ...children: (VNode | string)[]): VNode => ({ tag, props: props ?? {}, children });

  /** Build the DOM for a description. The subtree is complete before anything attaches it. */
  export function createDom(doc: MiniDocument, v: VNode | string): MNode {
    if (typeof v === 'string') return doc.createTextNode(v);
    const el = doc.createElement(v.tag);
    for (const [k, val] of Object.entries(v.props)) el.setAttribute(k, val);
    for (const c of v.children) el.appendChild(createDom(doc, c));
    return el;
  }

  /** Make `dom` (which shows `oldV`) show `newV`. Returns the node that shows `newV`. */
  export function patch(parent: MElement, dom: MNode, oldV: VNode | string, newV: VNode | string): MNode {
    // TODO: this version rebuilds everything, which is correct and does far too much work.
    const fresh = createDom(parent.doc, newV);
    parent.replaceChild(fresh, dom);
    return fresh;
  }
solution: |
  import type { MElement, MNode, MiniDocument } from '@rx/dom';

  export type VNode = { tag: string; props: Record<string, string>; children: (VNode | string)[] };

  export const h = (tag: string, props: Record<string, string> | null = null, ...children: (VNode | string)[]): VNode => ({ tag, props: props ?? {}, children });

  export function createDom(doc: MiniDocument, v: VNode | string): MNode {
    if (typeof v === 'string') return doc.createTextNode(v);
    const el = doc.createElement(v.tag);
    for (const [k, val] of Object.entries(v.props)) el.setAttribute(k, val);
    for (const c of v.children) el.appendChild(createDom(doc, c));
    return el;
  }

  export function patch(parent: MElement, dom: MNode, oldV: VNode | string, newV: VNode | string): MNode {
    const replace = () => {
      const fresh = createDom(parent.doc, newV);
      parent.replaceChild(fresh, dom);
      return fresh;
    };
    if (typeof oldV === 'string' || typeof newV === 'string') {
      if (typeof oldV === 'string' && typeof newV === 'string') {
        if (oldV !== newV) (dom as any).data = newV;
        return dom;
      }
      return replace();
    }
    if (oldV.tag !== newV.tag) return replace();
    const el = dom as MElement;
    for (const k of Object.keys(oldV.props)) if (!(k in newV.props)) el.removeAttribute(k);
    for (const [k, v] of Object.entries(newV.props)) if (oldV.props[k] !== v) el.setAttribute(k, v);
    const common = Math.min(oldV.children.length, newV.children.length);
    for (let i = 0; i < common; i++) patch(el, el.children[i]!, oldV.children[i]!, newV.children[i]!);
    for (let i = common; i < newV.children.length; i++) el.appendChild(createDom(parent.doc, newV.children[i]!));
    for (let i = oldV.children.length - 1; i >= common; i--) el.removeChild(el.children[i]!);
    return el;
  }
tests: |
  import { test, expect } from '@rx/test';
  import { createDocument } from '@rx/dom';
  import { h, createDom, patch } from './solution.ts';

  function run(a: any, b: any) {
    const doc = createDocument();
    const dom = createDom(doc, a);
    doc.body.appendChild(dom);
    const ids = () => doc.body.querySelectorAll('*').map((e: any) => e.id);
    const before = ids();
    const mark = doc.mark();
    const out = patch(doc.body, dom, a, b);
    return { doc, out, dom, stats: doc.statsSince(mark), before, after: ids() };
  }

  test('identical trees: no operations, same node', () => {
    const t = () => h('div', { class: 'a' }, h('p', null, 'x'));
    const r = run(t(), t());
    expect(r.stats.total).toBe(0);
    expect(r.out).toBe(r.dom);
  });

  test('changed text: one text write, no nodes created', () => {
    const r = run(h('p', null, 'one'), h('p', null, 'two'));
    expect(r.stats).toMatchObject({ texts: 1, created: 0, inserted: 0, removed: 0, total: 1 });
    expect(r.doc.body.textContent).toBe('two');
  });

  test('changed, added and removed attributes', () => {
    const r = run(h('b', { class: 'a', title: 't' }), h('b', { class: 'b', id: 'x' }));
    expect(r.stats.attrs).toBe(3); // class changed, title removed, id added
    expect((r.doc.body.firstChild as any).attrs.has('title')).toBe(false);
    expect((r.doc.body.firstChild as any).getAttribute('id')).toBe('x');
  });

  test('a different tag replaces the node; its sibling keeps its identity', () => {
    const r = run(h('div', null, h('p', null, 'a'), h('p', null, 'b')), h('div', null, h('section', null, 'a'), h('p', null, 'b')));
    expect(r.doc.body.innerHTML).toBe('<div><section>a</section><p>b</p></div>');
    expect(r.stats.removed).toBe(1);
    const p = r.doc.body.querySelector('p') as any;
    expect(r.before).toContain(p.id);
  });

  test('extra new children are appended, extra old children removed', () => {
    const grow = run(h('ul', null, h('li', null, 'a')), h('ul', null, h('li', null, 'a'), h('li', null, 'b')));
    expect(grow.doc.body.innerHTML).toBe('<ul><li>a</li><li>b</li></ul>');
    expect(grow.stats).toMatchObject({ created: 2, texts: 0, removed: 0 });
    const shrink = run(h('ul', null, h('li', null, 'a'), h('li', null, 'b'), h('li', null, 'c')), h('ul', null, h('li', null, 'a')));
    expect(shrink.doc.body.innerHTML).toBe('<ul><li>a</li></ul>');
    expect(shrink.stats).toMatchObject({ removed: 2, created: 0 });
  });

  test('a text node replaced by an element, and the reverse', () => {
    const r = run(h('p', null, 'x'), h('p', null, h('b', null, 'x')));
    expect(r.doc.body.innerHTML).toBe('<p><b>x</b></p>');
    const s = run(h('p', null, h('b', null, 'x')), h('p', null, 'x'));
    expect(s.doc.body.innerHTML).toBe('<p>x</p>');
  });

  test('unchanged parts of a bigger tree are not touched', () => {
    const page = (n: string) => h('div', { class: 'card' }, h('h2', null, 'Notes'), h('ul', null, h('li', null, 'a'), h('li', null, 'b')), h('p', null, n));
    const r = run(page('3 notes'), page('4 notes'));
    expect(r.stats).toMatchObject({ total: 1, texts: 1 });
  });
hints:
  - "Handle the text cases first. Then different tags. Only the remaining case, the same tag, needs attributes and children."
  - "After patching the common children, look at the leftover ones: new children are created with `createDom` and appended; old children are removed from the end."
explain: "About twenty lines. This is a virtual DOM without components, keys or hooks: and, notice, without ever reading the DOM. The comparison is between two descriptions. The real implementations (React’s reconciler, Vue’s patch, Preact’s diff) are this function plus the rest of chapters 5–8."
```

```numeric
id: trees-as-values/count
title: Counting the patch
prompt: |
  The page `<ul><li>a</li><li>b</li></ul>` is patched to `<ul class="x"><li>a</li><li>B</li><li>c</li></ul>`. How many DOM operations does the patch perform in total? Count every attribute write, text write, element or text node created, and insertion. Check your count against the **Add** preset in the diff lab.
answer: 6
unit: operations
tolerance: 0
explain: "One attribute write (`class` on the `ul`), one text write (`b` becomes `B`), and for the new item: create the `li`, create its text node, insert the text into the `li`, insert the `li` into the `ul`: four. 1 + 1 + 4 = 6. Notice that only the last of the four, inserting the `li` into the `ul`, is a live write; the other three happen on nodes that are not yet on the page."
```

## What the diff cannot see

The two assumptions make the diff fast, and each has a price.

The price of **Assumption 2**, comparing by position, showed up in the *Reorder* preset. When items move, position-based comparison cannot tell *“this is the same item in a new place”* from *“this is a different item that now occupies this slot”*. It chooses the second, rewrites the contents of every slot, and, worse, any DOM state attached to a slot stays *with the slot*: the text typed into the second item’s input is now sitting in whatever item has moved into second place. Chapter 5 fixes this with keys and shows how React and Vue each decide what to move.

The price of **Assumption 1** is that component boundaries and element types matter. Wrapping a form in a `<div>` in one render and a `<section>` in the next discards it. A component defined *inside* another component’s render function is a new type on every call and is rebuilt every time. These are classic performance and state-loss bugs, and the cause of each is a sentence in the box above.

:::history{year=1989 title="Tree edit distance, and why nobody uses it for this"}
Kaizhong Zhang and Dennis Shasha’s 1989 paper gave the first practical algorithms for the edit distance between ordered, labelled trees, motivated by comparing RNA structures. Their algorithm and its successors compute a *provably minimal* edit script, which is exactly what a UI library would like to have, and it is far too slow to run on every state change. Bille’s 2005 survey collects the results: improvements shave factors off the cost without escaping its cubic order in the worst case. The virtual DOM is the observation that for user interfaces you do not need the minimum; you need a good answer in linear time, and two heuristic assumptions about how UIs change get you one. :cite[zhang-shasha-1989] :cite[bille-2005]
:::

:::whatchanged
For the *virtual DOM*: **whatever differs between the old description and the new one**, found by walking both trees together, one level at a time, and treating a change of type as a change of everything below. The comparison is linear, reads nothing from the DOM, and does its work in memory; the writes are the minimum the two heuristics can find.
:::

## What’s next

The *Reorder* preset is the first thing a diff by position gets wrong. Chapter 5 is about lists: why keys exist, what happens to input state without them, and the algorithms (React’s “last placed index”, Vue’s longest increasing subsequence) that decide what to move.
