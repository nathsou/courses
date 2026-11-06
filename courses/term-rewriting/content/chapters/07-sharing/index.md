---
number: 7
title: Sharing and memoisation
summary: Terms as graphs, hash-consing and maximal sharing, constant-time equality, and a table of normal forms that removes repeated work, with a hash-consing table for your engine.
duration: About 1 hour
prerequisites: [programming-with-rules]
theorems: [Maximal sharing makes equality a pointer comparison, Memoised normal forms are sound for deterministic strategies]
techniques: [hash-consing]
---

Your engine can now run programs, but it is slow in two ways that have nothing to do with the rules. It builds the same terms over and over, and it recomputes the normal forms of terms it has already normalised. This part of the course fixes both, and then compiles rules into code. None of it changes what a system computes: these are optimisations of the engine, not of the rules.

## Trees and graphs

Take the rule `Double(x) -> P(x, x)` and apply it twenty times to `A`, starting from `Double(Double(…Double(A)…))`. The result is a complete binary tree of `P`s with $2^{20}$ leaves: as a tree, it has $2{,}097{,}151$ nodes. Yet it took only 20 rewrite steps to build, and in the engine's memory it occupies 21 nodes. When the engine instantiates the right-hand side `P(x, x)`, both occurrences of `x` point to the *same* object; the term is a directed acyclic graph (a DAG), with the copies shared.

```numeric
id: sharing/dag-size
title: Distinct subterms
prompt: 'How many distinct subterms does `F(G(A), G(A), H(G(A)))` have (counting the whole term)? That is its size as a maximally shared graph.'
answer: 4
tolerance: 0
explain: 'The distinct subterms are `A`, `G(A)`, `H(G(A))` and the whole term; the tree has 8 nodes.'
```

Sharing is a mixed blessing. Memory stays small, but any operation that walks a term as a tree (printing it, computing its size, comparing it for equality) takes time proportional to the tree, $2^{20}$ here, not to the graph. And sharing is accidental: two equal terms built separately are different objects, so the engine cannot tell they are equal without comparing them node by node.

## Hash-consing

The fix is to make sharing systematic: never build a node that already exists.

:::definition[Hash-consing]
A **hash-consing table** maps each pair (symbol, list of children) to the unique node with that symbol and those children. Nodes are only built through the table: to build $f(t_1, \ldots, t_n)$, look up $(f, [t_1, \ldots, t_n])$, return the existing node if there is one, and otherwise create it, give it a fresh numeric id and store it.
:::

The key is cheap to compute because the children are themselves unique nodes: a child is identified by its id, so the key for $f(t_1, \ldots, t_n)$ is just the string `f(id₁,…,idₙ)`, whatever the size of the subterms.

:::proposition{status=proved}
If all terms are built through one hash-consing table, then two terms are structurally equal if and only if they are the same node. So equality takes constant time, and the number of nodes in memory is the number of distinct subterms.
:::

:::proof
By induction on the structure. Two equal leaves are built from the same key, so the table returns the same node. Two structurally equal terms $f(s_1, \ldots, s_n)$ and $f(t_1, \ldots, t_n)$ have $s_i = t_i$ structurally, hence, by induction, $s_i$ and $t_i$ are the same nodes; so the two keys are equal, and the table returns the same node. The converse is obvious.
:::

The idea is old. Andrei Ershov used a hash table to detect common subexpressions in a compiler in 1958;:cite[ershov1958] Eiichi Goto built a Lisp around it in 1974, and the name "hash consing" comes from Lisp's `cons`.:cite[goto1974] In term rewriting it is the core of the **ATerm** library behind the ASF+SDF meta-environment, whose designers report that maximal sharing typically saves large factors in memory on real programs;:cite[vandenbrand2000] in functional languages, Filliâtre and Conchon showed how to package it safely.:cite[filliatre-conchon2006] Two engineering details matter in practice. The table must not keep dead terms alive forever, so production libraries use weak references; and because nodes are shared, they must never be mutated.

## Memoising normal forms

Once each distinct term is a unique node with an id, the engine can remember results: a table `nf` from node ids to normal forms. Before normalising a node, look it up; after normalising, store the answer.

:::proposition{status=proved}
For a deterministic strategy (a function from terms to the next step, such as innermost with rules tried in order), caching normal forms never changes a result.
:::

:::proof
A deterministic strategy defines at most one normal form $\mathrm{nf}(t)$ for each term $t$, and it depends only on $t$ itself, not on where $t$ occurs or when. So whenever the cache holds an entry for $t$, that entry is $\mathrm{nf}(t)$, which is what the computation would have produced again.
:::

The condition matters. With a non-deterministic choice of redex (or a system whose answer depends on the strategy), the same term could legitimately reach different normal forms on different occasions, and the cache would fix one of them. For confluent and terminating systems the condition is automatic.

How much does memoisation buy? The naive Fibonacci rules recompute `Fib(n - 2)` inside `Fib(n - 1)`, so the number of calls grows like the Fibonacci numbers themselves. With hash-consing, every call `Fib(k)` is the same node every time it occurs, and the cache answers all calls after the first.

::share-bench

Three things to notice. Hash-consing alone does not reduce the number of rewrite steps: equal terms are now one object, but each one is still normalised every time it is met. The table of normal forms is what removes the repeated calls. And the steps that remain are mostly additions, which in Peano arithmetic cost one step per unit of the result: memoisation removes duplicated work, not work.

:::note
**Sharing at run time.** Hash-consing shares equal terms however they arose. Lazy languages share differently: when `Double(x)` copies its argument, both copies point to one node, and when one copy is evaluated the node is *overwritten* with its value, so the other copy sees the result. This is **graph rewriting**, and it is what makes call by need (Chapter 5) efficient: outermost order, and every argument evaluated at most once. The two kinds of sharing are complementary, and real implementations use one or both.
:::

## Hash-consing in your engine

```code
id: sharing/hash-cons
title: A hash-consing table
provides: [HashCons]
prompt: |
  Write a class `HashCons` that builds maximally shared terms. Each node it returns is an ordinary term object with one extra field, a numeric `id`:

  - `variable(name)` returns the unique variable node with that name;
  - `node(name, args)` returns the unique node `name(args…)`; the `args` are nodes from the same table;
  - `share(t)` converts any term into a shared one (bottom-up);
  - the getter `size` is the number of distinct nodes built so far;
  - `hits` counts how many times an existing node was returned instead of creating one.

  Use a `Map` from string keys to nodes. A node's key should depend only on its symbol and its children's ids.
starter: |
  import type { Term } from 'trs';

  export type Shared = Term & { readonly id: number };

  export class HashCons {
    hits = 0;
    get size(): number {
      return 0;
    }
    variable(name: string): Shared {
      return { type: 'var', name, id: 0 };
    }
    node(name: string, args: readonly Shared[]): Shared {
      return { type: 'fn', name, args, id: 0 };
    }
    share(t: Term): Shared {
      return t.type === 'var' ? this.variable(t.name) : this.node(t.name, t.args.map((a) => this.share(a)));
    }
  }
tests: |
  import { test, expect } from 'test';
  import { HashCons } from 'solution';
  import { term, show } from 'trs';

  test('equal terms become the same object', () => {
    const h = new HashCons();
    const a = h.share(term('F(G(x), G(x))'));
    const b = h.share(term('G(x)'));
    expect(a.args[0]).toBe(b);
    expect(a.args[1]).toBe(b);
    expect(h.share(term('F(G(x), G(x))'))).toBe(a);
  });
  test('different terms stay different', () => {
    const h = new HashCons();
    expect(h.share(term('F(x)')) === h.share(term('F(y)'))).toBe(false);
    expect(h.share(term('F(A)')) === h.share(term('G(A)'))).toBe(false);
    expect(h.share(term('F(A, B)')) === h.share(term('F(B, A)'))).toBe(false);
  });
  test('a variable and a constant with the same name are different', () => {
    const h = new HashCons();
    expect(h.share(term('F(x)')) === h.share(term('F(X)'))).toBe(false);
  });
  test('size counts distinct nodes, ids are distinct', () => {
    const h = new HashCons();
    const t = h.share(term('F(G(A), G(A), H(G(A)))'));
    expect(h.size).toBe(4);
    expect(new Set([t.id, t.args[0].id, t.args[2].id, t.args[0].args[0].id]).size).toBe(4);
    expect(show(t)).toBe('F(G(A), G(A), H(G(A)))');
  });
  test('hits count reuses', () => {
    const h = new HashCons();
    h.share(term('P(A, A)'));
    expect(h.hits).toBe(1);
  });
solution: |
  import type { Term } from 'trs';

  export type Shared = Term & { readonly id: number };

  export class HashCons {
    private table = new Map<string, Shared>();
    private next = 0;
    hits = 0;
    get size(): number {
      return this.table.size;
    }
    private intern(key: string, make: (id: number) => Shared): Shared {
      const found = this.table.get(key);
      if (found) {
        this.hits++;
        return found;
      }
      const node = make(this.next++);
      this.table.set(key, node);
      return node;
    }
    variable(name: string): Shared {
      return this.intern(`?${name}`, (id) => ({ type: 'var', name, id }));
    }
    node(name: string, args: readonly Shared[]): Shared {
      const key = args.length ? `${name}(${args.map((a) => a.id).join(',')})` : name;
      return this.intern(key, (id) => ({ type: 'fn', name, args, id }));
    }
    share(t: Term): Shared {
      return t.type === 'var' ? this.variable(t.name) : this.node(t.name, t.args.map((a) => this.share(a)));
    }
  }
hints:
  - 'The key of `name(args)` can be `name + "(" + ids + ")"`; give variables a key that cannot clash with a constant, such as `"?" + name`.'
  - 'Write one private helper that looks a key up and either returns the existing node (counting a hit) or creates one with the next id.'
```

:::key
- Substitution shares naturally, but equal terms built separately are different objects, and tree-walking operations pay for the tree.
- Hash-consing builds every distinct term once; structural equality becomes pointer equality.
- With a deterministic strategy, a table of normal forms keyed by node id is sound and removes repeated computations.
:::

:::exercises
1. With hash-consing, how much time does it take to compute the size *as a tree* of a shared term? Give an algorithm linear in the number of distinct nodes.
2. Hash-consing a term of size $n$ takes how many table lookups? What if the term is already shared?
3. Why is memoisation unsound for the system `Coin -> Heads`, `Coin -> Tails` with a random strategy? Construct a term whose result changes when a cache is used.
4. Implement `Fib` with built-in integers (Chapter 6) and compare the effect of memoisation with the Peano version. Why is the gain so much larger?
:::
