---
number: 23
title: E-graphs
summary: Rewriting destroys the term it rewrites. An e-graph keeps every equal form at once, compactly, using hash-consed e-nodes, union-find and congruence, with egg’s rebuilding to keep it fast. Union-find for your engine.
duration: About 1½ hours
prerequisites: [ac-rewriting, sharing]
theorems: [E-graphs maintain congruence closure, Rebuilding restores the invariants]
techniques: [union-find]
---

Every rewrite step so far has been destructive: when $(a \cdot 2) / 2$ becomes $(a \ll 1) / 2$, the old term is gone. That is a problem whenever rules compete. A compiler that rewrites $x \cdot 2$ to the cheaper shift $x \ll 1$ has made it impossible to apply $(x \cdot y) / y \to x$, which would have simplified the whole expression to $a$. Which rule to apply first is the **phase-ordering problem**, and confluence does not help: such rule sets are deliberately not confluent, because their purpose is to find the *best* of many equal forms, not a canonical one.

The alternative is to never throw anything away: keep every term that rewriting produces, all known to be equal, and choose among them at the end. Done naively that explodes. Done with an **e-graph**, it is compact enough to be practical, and this chapter builds one. The next chapter uses it.

## E-nodes and e-classes

:::definition[E-graph]
An **e-graph** is a set of **e-classes**, each a set of **e-nodes**. An e-node is a function symbol together with a list of e-classes as children (not terms: classes). Every e-node belongs to exactly one e-class.
:::

An e-class represents a set of terms, all equal: a term $f(t_1, \ldots, t_n)$ is represented by a class if that class contains an e-node $f(c_1, \ldots, c_n)$ whose child classes represent $t_1, \ldots, t_n$. Because children are classes, one e-node stands for every combination of the terms its children represent. A small e-graph can therefore represent exponentially many terms, even infinitely many if it has cycles.

Add $(a \cdot 2) / 2$ to an empty e-graph and apply the rules, one round at a time. Watch the root class (outlined) gain new e-nodes as equalities are discovered, and notice that the old nodes stay:

::e-graph-view{rules="/(*(x, y), z) -> *(x, /(y, z))\n/(x, x) -> 1\n*(x, 1) -> x\n*(x, 2) -> <<(x, 1)" term="/(*(a, 2), 2)"}

After a few rounds the root class contains both $(a \cdot 2) / 2$ and $a$ itself, and also $(a \ll 1) / 2$: all the forms rewriting has found, at once.

## Three data structures in one

An e-graph combines three ideas from earlier chapters.

**Hash-consing (Chapter 7).** A table, the **memo**, maps each e-node to its class, so the same node is never added twice. Adding a term is bottom-up: add the children, then look up the node; if it exists, return its class.

**Union-find.** E-classes are identified by numbers, merged by a union-find structure: each class has a parent pointer, `find(c)` follows pointers to the canonical representative, and `union(c, d)` makes one representative point to the other. With **path compression** (pointing every visited class straight at the root) and **union by size** (attaching the smaller tree under the larger), a sequence of $m$ operations on $n$ elements takes $O(m \, \alpha(n))$ time, where $\alpha$ is the inverse Ackermann function, which is at most 4 for any $n$ you will meet.

**Congruence.** When two classes merge, other classes may have to merge too: if $a$ and $b$ become equal, then $f(a)$ and $f(b)$ must be equal as well. An e-graph maintains the **congruence closure** of the equalities asserted so far, which is exactly the decision procedure for ground equations of Chapter 21.

:::definition[E-graph invariants]
1. **Congruence:** two e-nodes with the same symbol and the same canonical children belong to the same class.
2. **Canonical memo:** the memo maps each e-node, with canonical children, to its class.
:::

## Rebuilding

Merging two classes breaks both invariants: e-nodes elsewhere that pointed to the old classes now have non-canonical children, and some of them may have become congruent. The classic algorithms repair this immediately after each merge. Max Willsey and colleagues, in the egg library, observed that during equality saturation many merges happen in a batch and the repairs can wait:cite[willsey2021]

:::algorithm[Rebuilding]
Each e-class keeps a list of its **parents**: the e-nodes that have it as a child, with their own classes. `union` only merges the two classes in the union-find, concatenates their node and parent lists, and puts the new root on a worklist. `rebuild` then processes the worklist: for each class, re-canonicalise each parent e-node; if two parents have become identical, they are congruent, so merge their classes (which may add to the worklist); update the memo. Repeat until the worklist is empty.
:::

:::theorem{status=sketched}
When `rebuild` returns, both invariants hold again.
:::

:::proof
Every e-node whose canonical form changed has a child that was merged, so it appears in the parent list of a class on the worklist and is re-canonicalised. Two nodes that become congruent after a merge both have the merged class among their children, so they meet in the same parent list, where the deduplication detects them and merges their classes. Each merge reduces the number of classes, so the loop terminates. Willsey et al. prove the invariants carefully and show that deferring the repairs to batch boundaries is asymptotically and practically faster.
:::

## Matching in an e-graph

To apply a rule $l \to r$, find every class that contains a term matching $l$: that is **e-matching**. It is a backtracking search: to match $f(p_1, \ldots, p_n)$ in a class, try each e-node $f(c_1, \ldots, c_n)$ of that class and match $p_i$ in class $c_i$; a pattern variable binds to a whole class. Each match adds the corresponding instance of $r$ to the e-graph and merges its class with the matched one. Nothing is ever deleted: rewriting has become **monotone**.

Simplify, the theorem prover behind ESC/Java, pioneered e-matching for instantiating quantifiers, and the technique is used inside every SMT solver for the same purpose;:cite[detlefs2005] the formal verification course of this collection shows congruence closure at work in an SMT solver.

```quiz
q: 'After `union(a, b)` and `rebuild`, the e-graph contains e-nodes F(a) and F(b). What do you expect?'
options:
  - text: 'They are in the same e-class, by congruence.'
    correct: true
    why: 'Rebuilding re-canonicalises the parents of the merged class: both become F(c) for the new representative c, and identical nodes are merged.'
  - text: 'They stay in different classes until a rule says F(a) = F(b).'
    why: 'Congruence is built in: no rule is needed.'
  - text: 'One of them is deleted.'
    why: 'E-graphs never delete; the two nodes become one node in one class.'
```

## Union-find in your engine

```code
id: e-graphs/union-find
title: Union-find
provides: [UnionFind]
prompt: |
  Write a class `UnionFind` over the elements `0, 1, 2, …`:

  - `make()` adds a new singleton set and returns its element;
  - `find(x)` returns the representative of `x`'s set, compressing paths as it goes;
  - `union(a, b)` merges the two sets (attach the smaller under the larger) and returns the new representative, or `-1` if they were already one set;
  - `same(a, b)` and the getter `count` (the number of elements made so far).
starter: |
  export class UnionFind {
    make(): number {
      return 0;
    }
    find(x: number): number {
      return x;
    }
    union(a: number, b: number): number {
      return -1;
    }
    same(a: number, b: number): boolean {
      return a === b;
    }
    get count(): number {
      return 0;
    }
  }
tests: |
  import { test, expect } from 'test';
  import { UnionFind } from 'solution';

  test('singletons', () => {
    const u = new UnionFind();
    expect([u.make(), u.make(), u.make()]).toEqual([0, 1, 2]);
    expect(u.count).toBe(3);
    expect(u.same(0, 1)).toBe(false);
    expect(u.find(2)).toBe(2);
  });
  test('union is transitive', () => {
    const u = new UnionFind();
    for (let i = 0; i < 6; i++) u.make();
    u.union(0, 1); u.union(2, 3); u.union(1, 3);
    expect(u.same(0, 2)).toBe(true);
    expect(u.same(0, 4)).toBe(false);
    expect(u.find(0)).toBe(u.find(3));
  });
  test('union reports whether anything changed', () => {
    const u = new UnionFind();
    u.make(); u.make();
    expect(u.union(0, 1)).not.toBe(-1);
    expect(u.union(1, 0)).toBe(-1);
  });
  test('large inputs stay fast', () => {
    const u = new UnionFind();
    const n = 200000;
    for (let i = 0; i < n; i++) u.make();
    for (let i = 1; i < n; i++) u.union(i - 1, i);
    const t = performance.now();
    for (let i = 0; i < n; i++) u.find(i);
    expect(u.same(0, n - 1)).toBe(true);
    expect(performance.now() - t).toBeLessThan(1000);
  });
solution: |
  export class UnionFind {
    private parent: number[] = [];
    private size: number[] = [];
    make(): number {
      this.parent.push(this.parent.length);
      this.size.push(1);
      return this.parent.length - 1;
    }
    find(x: number): number {
      let root = x;
      while (this.parent[root] !== root) root = this.parent[root];
      while (this.parent[x] !== root) {
        const next = this.parent[x];
        this.parent[x] = root;
        x = next;
      }
      return root;
    }
    union(a: number, b: number): number {
      let x = this.find(a), y = this.find(b);
      if (x === y) return -1;
      if (this.size[x] < this.size[y]) [x, y] = [y, x];
      this.parent[y] = x;
      this.size[x] += this.size[y];
      return x;
    }
    same(a: number, b: number): boolean {
      return this.find(a) === this.find(b);
    }
    get count(): number {
      return this.parent.length;
    }
  }
hints:
  - 'Two arrays: `parent` (each element starts as its own parent) and `size`.'
  - '`find` in two passes: walk up to the root, then walk again pointing every element at the root. Use loops, not recursion, so that long chains do not overflow the stack.'
```

:::key
- An e-graph is a set of e-classes of e-nodes whose children are classes; it represents many equal terms compactly.
- It combines hash-consing (the memo), union-find (classes) and congruence closure.
- egg defers congruence repair to `rebuild`, which restores the invariants in batches. E-matching finds rule instances; nothing is ever deleted.
:::

:::exercises
1. How many terms does the e-graph with classes $c_0 = \{a\}$, $c_1 = \{f(c_0), g(c_0)\}$, $c_2 = \{h(c_1, c_1)\}$ represent in $c_2$?
2. Give an e-graph with a cycle and describe the infinite set of terms its root class represents.
3. Show that union by size alone (no path compression) keeps trees of depth $O(\log n)$.
4. Assert $a = b$ in an e-graph containing $f^{10}(a)$ and $f^{10}(b)$. How many merges does rebuilding perform?
:::
