---
number: 1
title: Terms
summary: Signatures, terms as trees, positions, subterms and replacement, the data structure the whole course is built on, and the first module of your engine.
duration: About 1 hour
prerequisites: [rewriting-by-hand]
theorems: [Replacement lemmas]
techniques: ['positions, at and replaceAt']
---

Rewriting replaces parts of expressions. Before we can say precisely what a "part" is, or what it means for a rule to "match", we need a precise notion of expression. In this course expressions are **terms**: trees whose nodes are labelled by function symbols and whose leaves may also be variables. This chapter fixes the vocabulary and builds the first module of your engine.

## Signatures and terms

:::definition[Signature]
A **signature** $\Sigma$ is a set of function symbols, each with a natural number called its **arity**: the number of arguments it takes. Symbols of arity 0 are **constants**.
:::

For Peano arithmetic the signature is $\{0/0,\ S/1,\ +/2,\ \times/2\}$, writing $f/n$ for a symbol $f$ of arity $n$. For the groups of Chapter 0 it is $\{E/0,\ I/1,\ \cdot/2\}$.

:::definition[Term]
Fix a signature $\Sigma$ and a set $V$ of variables, disjoint from $\Sigma$. The set $T(\Sigma, V)$ of **terms** is the smallest set such that

1. every variable $x \in V$ is a term, and
2. if $f \in \Sigma$ has arity $n$ and $t_1, \ldots, t_n$ are terms, then $f(t_1, \ldots, t_n)$ is a term.

A term with no variables is **ground**; $T(\Sigma)$ is the set of ground terms.
:::

"Smallest set" means that nothing else is a term: every term is built by finitely many uses of the two clauses. That is what makes **structural induction** work: to prove that every term has some property, prove it for variables, and prove it for $f(t_1, \ldots, t_n)$ assuming it for $t_1, \ldots, t_n$. (Appendix A reviews induction if it is rusty.)

Girafe does not ask you to declare the signature. It is read off the rules: every name that starts with a lower-case letter is a variable, every other name is a symbol, and its arity is the number of arguments it is used with. Using a symbol with two different arities is allowed but almost always a mistake.

## Terms are trees

The term `F(G(x), H(A, y))` is a tree: `F` at the root, with two children, the subtrees for `G(x)` and `H(A, y)`. Variables and constants are leaves. In pictures, variables are drawn in dashed, rounded boxes.

::term-explorer

Every node of the tree is identified by the path that leads to it from the root.

:::definition[Positions, subterms and replacement]
The set $\mathrm{Pos}(t)$ of **positions** of a term $t$ is a set of finite sequences of positive integers:

- if $t$ is a variable, $\mathrm{Pos}(t) = \{\varepsilon\}$, where $\varepsilon$ is the empty sequence (the root);
- if $t = f(t_1, \ldots, t_n)$, then $\mathrm{Pos}(t) = \{\varepsilon\} \cup \{\, i.p : 1 \le i \le n,\ p \in \mathrm{Pos}(t_i) \,\}$.

The **subterm** of $t$ at position $p$, written $t|_p$, is defined by $t|_\varepsilon = t$ and $f(t_1, \ldots, t_n)|_{i.p} = t_i|_p$.

**Replacing** the subterm at $p$ by a term $s$ gives $t[s]_p$, defined by $t[s]_\varepsilon = s$ and
$f(t_1, \ldots, t_n)[s]_{i.p} = f(t_1, \ldots, t_i[s]_p, \ldots, t_n)$.
:::

In `F(G(x), H(A, y))` the positions are $\varepsilon, 1, 1.1, 2, 2.1, 2.2$, and the subterm at $2.1$ is `A`. Two positions are **parallel**, written $p \parallel q$, when neither is a prefix of the other: then the subterms at $p$ and $q$ are disjoint parts of the tree, and replacing one does not disturb the other. We write $p \le q$ when $p$ is a prefix of $q$ (the node at $q$ lies inside the subtree at $p$).

A few more measures are useful later. The **size** $|t|$ is the number of nodes, which is $|\mathrm{Pos}(t)|$. The **depth** is the length of the longest position. $\mathrm{Var}(t)$ is the set of variables of $t$. A term is **linear** if no variable occurs in it twice.

```quiz
q: 'In the term `F(G(x), H(A, y))`, which pair of positions is parallel?'
options:
  - text: '1.1 and 2'
    correct: true
    why: 'Neither is a prefix of the other: one is inside `G(x)`, the other is `H(A, y)`.'
  - text: '2 and 2.2'
    why: '2 is a prefix of 2.2: the node `y` lies inside `H(A, y)`.'
  - text: 'ε and 1'
    why: 'The root ε is a prefix of every position.'
  - text: '1 and 1.1'
    why: '1 is a prefix of 1.1.'
```

```numeric
id: terms/positions
title: Counting positions
prompt: 'How many positions does the term `+(S(S(0)), *(S(0), y))` have?'
answer: 8
tolerance: 0
explain: 'One per node: `+`, `S`, `S`, `0`, `*`, `S`, `0` and `y`.'
```

## Three facts about replacement

The definitions are recursive, so their properties are proved by induction on the position. These three are used constantly, often without comment.

:::lemma{status=proved}
For all terms $t$, $s$, $u$ and positions $p, q$ of $t$:

1. $(t[s]_p)|_p = s$: after replacing, the new subterm is where we put it.
2. $t[t|_p]_p = t$: replacing a subterm by itself changes nothing.
3. If $p \parallel q$, then $(t[s]_p)[u]_q = (t[u]_q)[s]_p$: replacements at parallel positions commute.
:::

:::proof
All three by induction on $p$. For (1), if $p = \varepsilon$ then $t[s]_\varepsilon = s$ and $s|_\varepsilon = s$. If $p = i.p'$ and $t = f(t_1, \ldots, t_n)$, then $t[s]_p = f(\ldots, t_i[s]_{p'}, \ldots)$, whose subterm at $i.p'$ is $(t_i[s]_{p'})|_{p'} = s$ by the induction hypothesis. Part (2) is the same argument.

For (3), $p \parallel q$ means neither is $\varepsilon$, so $p = i.p'$ and $q = j.q'$. If $i \ne j$, the two replacements change different arguments of the root and obviously commute. If $i = j$, then $p' \parallel q'$ and both sides are $f(\ldots, (t_i[s]_{p'})[u]_{q'}, \ldots) = f(\ldots, (t_i[u]_{q'})[s]_{p'}, \ldots)$ by the induction hypothesis.
:::

Part (3) is the reason Chapter 17 can contract several non-overlapping redexes "at once": the order does not matter.

## Terms in your engine

The engine represents a term as a small immutable object:

```ts
type Term =
  | { type: 'var'; name: string }
  | { type: 'fn'; name: string; args: readonly Term[] };

type Position = readonly number[];
```

A position is an array of argument indices. **In code, indices start at 0**, as arrays do: the mathematical position $2.1$ is the array `[1, 0]`. The course's printer `showPos` converts back to the 1-based notation. The reference engine, which exercises may import as `trs`, also provides `v(name)` and `f(name, ...args)` to build terms, `term(source)` to parse one, and `show(t)` to print it.

Immutability matters. Rewriting produces new terms constantly, and if a rewrite step modified a term in place, every other piece of code holding a reference to it (a trace, a cache, the other side of an equation) would silently see the change. Instead, `replaceAt` rebuilds only the nodes on the path from the root to $p$ and **shares** every other subtree with the original. A replacement at depth $d$ therefore allocates $d + 1$ nodes, however large the term is. Chapter 7 takes this idea of sharing much further.

```code
id: terms/positions-at-replace
title: Positions, subterms and replacement
provides: [positions, at, replaceAt]
prompt: |
  Implement the three basic operations on terms:

  - `positions(t)`: every position of `t`, in **pre-order** (a node before its arguments, arguments left to right);
  - `at(t, p)`: the subterm $t|_p$; throw an `Error` if `p` is not a position of `t`;
  - `replaceAt(t, p, s)`: the term $t[s]_p$, without modifying `t`, sharing every subterm that does not change.

  Positions are arrays of 0-based argument indices. These three functions join your engine: later exercises call them.
starter: |
  import type { Term, Position } from 'trs';

  export function positions(t: Term): Position[] {
    return [];
  }

  export function at(t: Term, p: Position): Term {
    return t;
  }

  export function replaceAt(t: Term, p: Position, s: Term): Term {
    return t;
  }
tests: |
  import { test, expect } from 'test';
  import { positions, at, replaceAt } from 'solution';
  import { term, show, showPos } from 'trs';

  const t = term('F(G(x), H(A, y))');
  test('positions, in pre-order', () => {
    expect(positions(t).map(showPos)).toEqual(['ε', '1', '1.1', '2', '2.1', '2.2']);
  });
  test('a variable and a constant have one position each', () => {
    expect(positions(term('x')).map(showPos)).toEqual(['ε']);
    expect(positions(term('Nil')).map(showPos)).toEqual(['ε']);
  });
  test('at', () => {
    expect(show(at(t, []))).toBe('F(G(x), H(A, y))');
    expect(show(at(t, [1, 0]))).toBe('A');
    expect(show(at(t, [0, 0]))).toBe('x');
  });
  test('at throws for a position that does not exist', () => {
    expect(() => at(t, [2])).toThrow();
    expect(() => at(t, [0, 0, 0])).toThrow();
  });
  test('replaceAt', () => {
    expect(show(replaceAt(t, [1], term('K')))).toBe('F(G(x), K)');
    expect(show(replaceAt(t, [1, 1], term('S(z)')))).toBe('F(G(x), H(A, S(z)))');
    expect(show(replaceAt(t, [], term('K')))).toBe('K');
  });
  test('replaceAt leaves its input unchanged and shares untouched subterms', () => {
    const u = replaceAt(t, [1, 0], term('B'));
    expect(show(t)).toBe('F(G(x), H(A, y))');
    expect(u.type === 'fn' && t.type === 'fn' && u.args[0] === t.args[0]).toBe(true);
  });
  test('size equals the number of positions', () => {
    const big = term('+(S(S(0)), *(S(0), +(y, Z)))');
    expect(positions(big).length).toBe(10);
  });
solution: |
  import type { Term, Position } from 'trs';

  export function positions(t: Term): Position[] {
    const out: Position[] = [[]];
    if (t.type === 'fn') {
      t.args.forEach((a, i) => {
        for (const p of positions(a)) out.push([i, ...p]);
      });
    }
    return out;
  }

  export function at(t: Term, p: Position): Term {
    let cur = t;
    for (const i of p) {
      if (cur.type === 'var' || i < 0 || i >= cur.args.length) throw new Error('no such position');
      cur = cur.args[i];
    }
    return cur;
  }

  export function replaceAt(t: Term, p: Position, s: Term): Term {
    if (p.length === 0) return s;
    if (t.type === 'var') throw new Error('no such position');
    const [i, ...rest] = p;
    if (i < 0 || i >= t.args.length) throw new Error('no such position');
    const args = t.args.slice();
    args[i] = replaceAt(t.args[i], rest, s);
    return { type: 'fn', name: t.name, args };
  }
hints:
  - 'For `positions`, start with `[[]]` (the root) and, for each argument `i`, put `i` in front of every position of that argument.'
  - 'For `replaceAt`, copy the argument array with `slice()`, replace one entry by a recursive call, and build a new node. The other entries are the old subterms, so they are shared.'
```

:::key
- A term is a variable or a symbol applied to terms; it is a tree, and its nodes are named by positions.
- $t|_p$ is the subterm at $p$; $t[s]_p$ replaces it. Replacements at parallel positions commute.
- In code, positions are 0-based arrays, and replacement rebuilds only the path to $p$.
:::

:::exercises
1. Prove by structural induction that $|\mathrm{Pos}(t)| = |t|$ and that $\mathrm{depth}(t) < |t|$.
2. Show that $(t[s]_p)[u]_p = t[u]_p$, and that if $q = p.q'$ then $(t[s]_p)|_q = s|_{q'}$.
3. How many terms of size 5 are there over the signature $\{A/0, F/1, G/2\}$? (Count by the root symbol.)
4. A term with $n$ binary symbols and no unary ones has how many leaves? Prove it.
:::
