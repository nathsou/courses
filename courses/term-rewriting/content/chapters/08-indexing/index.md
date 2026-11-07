---
number: 8
title: Term indexing
summary: Find the few rules that might apply to a term without trying them all, with discrimination trees, the index used by automated provers, built into your engine.
duration: About 1 hour
prerequisites: [sharing]
theorems: [Discrimination trees retrieve every generalisation]
techniques: [discrimination trees]
---

A rewrite step starts by finding a rule whose left-hand side matches some subterm. The simplest engine tries every rule at every position. That is fine for the dozen rules of the algebra system, but automated theorem provers routinely hold hundreds of thousands of equations, each of which might rewrite each subterm of each new formula. Most attempts fail immediately, at the root symbol or one level down. **Term indexing** organises the rules so that the failing attempts are never made.

## Retrieval problems

Given a set of indexed terms $L$ (our left-hand sides) and a query term $t$, the useful questions are:

- **generalisations**: which $l \in L$ have $t$ as an instance? (Which rules can rewrite $t$ at the root? This is rewriting's question.)
- **instances**: which $l \in L$ are instances of $t$? (Which stored terms does a new rule simplify? Completion asks this when a new rule arrives, Chapter 19.)
- **unifiable terms**: which $l \in L$ unify with $t$? (Which rules overlap with a new one? Critical pairs, Chapter 16.)

An index may return a few false candidates (they are then checked by ordinary matching) but must never miss a real one. An index that returns exactly the answers is a **perfect filter**.

The cheapest index of all, which the course's engine already uses, groups rules by the symbol at the root of their left-hand side: a term `+(…)` is only tried against rules for `+`. **Top-symbol hashing** removes most failures for programs, where each defined symbol has a few rules. It does nothing for a set of many rules with the same root, which is exactly the situation of a simplifier: every rule of the algebra system starts with `+`, `*` or `D`.

## Discrimination trees

Write a term in pre-order (each symbol before its arguments) and replace each variable by `*`. Because every symbol has a fixed arity, the sequence determines the term's shape. For example `+(S(x), y)` becomes `+ S * *`. A **discrimination tree** is a trie of these sequences: one path per left-hand side, with common prefixes shared.

:::algorithm[Retrieving generalisations from a discrimination tree]
To find the stored patterns that may match a term $t$, walk the tree while reading $t$ in pre-order, keeping a list of subterms still to read:

1. If the list is empty, return the patterns stored at the current node.
2. Otherwise let $u$ be the first subterm in the list.
   - Follow the edge `*`, if any, skipping $u$ entirely (a pattern variable matches any subterm).
   - If $u = f(u_1, \ldots, u_n)$, also follow the edge $f$, replacing $u$ in the list by $u_1, \ldots, u_n$.
:::

Both branches may be explored, so retrieval is a small backtracking search, but it only ever follows paths that agree with the term so far. Here is the tree for a set of rules; type a query to see which rules survive.

::index-view{rules="#infixl 6 +\n#infixl 7 *\nN(a) + N(b) -> N(@add(a, b))\nN(0) + x -> x\nx + N(0) -> x\nN(a) * N(b) -> N(@mul(a, b))\nN(0) * x -> N(0)\nx * N(0) -> N(0)\nN(1) * x -> x\nx * N(1) -> x\nx + x -> N(2) * x\nD(X) -> N(1)\nD(u + v) -> D(u) + D(v)\nD(u * v) -> D(u) * v + u * D(v)" term="+(*(X, N(1)), N(0))"}

:::proposition{status=proved}
For every term $t$, the retrieval algorithm returns every stored pattern of which $t$ is an instance. For linear patterns it returns exactly those.
:::

:::proof
Suppose $l\sigma = t$. Read $l$ in pre-order: each symbol of $l$ corresponds to the same symbol at the corresponding position of $t$, and each variable of $l$ to a whole subterm of $t$. The algorithm can follow exactly this path through the tree: at a symbol of $l$ it takes the symbol edge (the term has the same symbol there), and at a variable it takes the `*` edge, skipping the subterm $\sigma(x)$. So it reaches the leaf where $l$ is stored.

Conversely, a path the algorithm follows to a leaf of $l$ shows that $t$ has every symbol of $l$ at the corresponding position, with arbitrary subterms where $l$ has variables. If each variable occurs once, setting each variable to its subterm is a matcher. With a repeated variable, the two subterms might differ: the tree does not record which `*` is which variable, so it returns a candidate that ordinary matching then rejects.
:::

```quiz
q: 'The tree stores the single pattern `Eq(x, x)` (key `Eq * *`). What does retrieval return for the query `Eq(A, B)`?'
options:
  - text: 'The pattern, as a candidate that matching then rejects.'
    correct: true
    why: 'Both `*` edges skip a subterm without remembering it, so the tree cannot tell that the two variables are the same. The index is not a perfect filter for non-linear patterns.'
  - text: 'Nothing: A and B are different.'
    why: 'The discrimination tree does not compare the subterms skipped by `*`.'
  - text: 'An error.'
    why: 'Retrieval never fails; it only returns candidates.'
```

```numeric
id: indexing/tree-size
title: Counting tree nodes
prompt: 'A discrimination tree stores the four patterns `+(0, y)`, `+(S(x), y)`, `*(0, y)` and `*(S(x), y)`. How many nodes does it have, not counting the root?'
answer: 12
tolerance: 0
explain: 'The keys are `+ 0 *`, `+ S * *`, `* 0 *` and `* S * *`. Under `+` the tree has the nodes `+`, `+ 0`, `+ 0 *`, `+ S`, `+ S *` and `+ S * *`: six. The same for `*`.'
```

## Indexes in practice

Discrimination trees are one of a family. **Path indexing** stores, for each path from the root to a symbol, the set of terms with that symbol there, and intersects the sets. **Substitution trees** share common substitutions rather than common prefixes, and support all three retrieval problems well. **Fingerprint indexing** compares a few positions of each term in a vector, cheaply ruling most terms out. McCune's experiments with discrimination trees and path indexing in the Otter prover, and the survey by Sekar, Ramakrishnan and Voronkov, are the classic references.:cite[mccune1992,sekar2001] Every competitive prover combines several indexes, chosen per retrieval problem.

For rewriting a single term with a fixed set of rules, one can do better still: compile the rules once into code that inspects each position of the term at most once. That is the next chapter.

## A discrimination tree for your engine

```code
id: indexing/discrimination-tree
title: A discrimination tree
provides: [DiscriminationTree]
prompt: |
  Write a generic class `DiscriminationTree<V>` with

  - `insert(pattern, value)`: store `value` under the pre-order key of `pattern` (symbols as `name/arity`, variables as `*`);
  - `retrieve(t)`: the values of every stored pattern that might match `t`, using the algorithm above.

  The order of the returned values does not matter (the tests sort them).
starter: |
  import type { Term } from 'trs';

  export class DiscriminationTree<V> {
    private all: V[] = [];
    insert(pattern: Term, value: V): void {
      this.all.push(value);
    }
    retrieve(t: Term): V[] {
      return [];
    }
  }
tests: |
  import { test, expect } from 'test';
  import { DiscriminationTree } from 'solution';
  import { rules, term } from 'trs';

  const R = rules('+(0, y) -> y\n+(S(x), y) -> S(+(x, y))\n*(0, y) -> 0\n*(S(x), y) -> +(y, *(x, y))\n+(x, 0) -> x\nEq(x, x) -> True\nF(A, x) -> One\nF(x, B) -> Two\nF(x, y) -> Three');
  const tree = () => { const d = new DiscriminationTree(); R.forEach((r, i) => d.insert(r.lhs, i)); return d; };
  const get = (q) => tree().retrieve(term(q)).slice().sort((a, b) => a - b);

  test('only plausible rules are returned', () => {
    expect(get('+(S(0), S(0))')).toEqual([1]);
    expect(get('*(0, A)')).toEqual([2]);
  });
  test('variables in patterns match anything, including the same subterm twice', () => {
    expect(get('+(0, 0)')).toEqual([0, 4]);
    expect(get('F(A, B)')).toEqual([6, 7, 8]);
    expect(get('F(C, C)')).toEqual([8]);
  });
  test('non-linear patterns give candidates', () => {
    expect(get('Eq(A, B)')).toEqual([5]);
  });
  test('a query with variables only matches patterns with variables there', () => {
    expect(get('+(z, w)')).toEqual([]);
    expect(get('+(z, 0)')).toEqual([4]);
  });
  test('nothing for unknown symbols', () => {
    expect(get('G(A)')).toEqual([]);
  });
solution: |
  import type { Term } from 'trs';

  interface Node<V> { children: Map<string, Node<V>>; values: V[] }

  const symKey = (t: Term) => (t.type === 'var' ? '*' : `${t.name}/${t.args.length}`);

  function preorder(t: Term, out: string[] = []): string[] {
    out.push(symKey(t));
    if (t.type === 'fn') for (const a of t.args) preorder(a, out);
    return out;
  }

  export class DiscriminationTree<V> {
    private root: Node<V> = { children: new Map(), values: [] };
    insert(pattern: Term, value: V): void {
      let n = this.root;
      for (const k of preorder(pattern)) {
        let c = n.children.get(k);
        if (!c) n.children.set(k, (c = { children: new Map(), values: [] }));
        n = c;
      }
      n.values.push(value);
    }
    retrieve(t: Term): V[] {
      const out: V[] = [];
      const go = (n: Node<V>, todo: Term[]) => {
        if (todo.length === 0) { out.push(...n.values); return; }
        const [head, ...rest] = todo;
        const star = n.children.get('*');
        if (star) go(star, rest);
        if (head.type === 'fn') {
          const c = n.children.get(symKey(head));
          if (c) go(c, [...head.args, ...rest]);
        }
      };
      go(this.root, [t]);
      return out;
    }
  }
hints:
  - 'Store the tree as nested nodes `{ children: Map<string, Node>, values: V[] }`; the key of a symbol is `name/arity` so that `F/1` and `F/2` differ.'
  - 'Retrieval is a recursive function of a node and a list of subterms still to read. A variable in the *query* can only be matched by a `*` in the pattern.'
```

:::key
- Most match attempts fail early; indexing avoids making them.
- A discrimination tree is a trie of pre-order symbol strings, with `*` for variables. Retrieval follows both the `*` edge and the symbol edge.
- It returns every generalisation, exactly for linear patterns; repeated variables need a final matching check.
:::

:::exercises
1. Adapt retrieval to find **instances** of the query among the stored terms: now a variable in the *query* must skip a whole stored subterm. Why is this harder to do with a pre-order trie?
2. Estimate the cost of retrieval in the worst case, for patterns of size $k$ and a query of size $n$.
3. Design a variant of the tree that records variable *names* in its keys, so that it is a perfect filter for non-linear patterns. What does it cost?
4. Use the discrimination tree inside an innermost normaliser and measure, on the algebra system's rules, how many matching attempts it saves on `D(N(3) * X * X + N(5) * X + N(7))`.
:::
