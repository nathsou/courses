---
number: 10
title: Well-founded orders
summary: Orders with no infinite descent, the lexicographic and multiset orders, reduction orders, and the hydra that cannot win however it regrows.
duration: About 1½ hours
prerequisites: [abstract-reduction]
theorems: [A system terminates iff it is contained in a reduction order, The lexicographic product is well-founded, The multiset order is well-founded]
techniques: [termination by a measure, König’s lemma]
---

Does every computation stop? For a rewrite system the question is whether $\to_R$ has an infinite chain. Part X will show that the question is undecidable: no algorithm answers it for every system. Yet for almost every system a person writes, termination can be proved, and proved mechanically. This part of the course develops the methods. They all share one idea: find a quantity that every rewrite step makes strictly smaller, in an order where things cannot get smaller for ever.

## Well-founded orders

:::definition[Well-founded order]
A **strict order** $>$ on a set $A$ is irreflexive and transitive. It is **well-founded** if there is no infinite descending chain $a_0 > a_1 > a_2 > \cdots$.
:::

The natural numbers with $>$ are well-founded: you cannot count down for ever. The integers are not ($0 > -1 > -2 > \cdots$), nor are the positive rationals ($1 > \frac12 > \frac13 > \cdots$). Well-foundedness is exactly what makes **well-founded induction** work, the principle we used to prove Newman's lemma in Chapter 4 (Appendix A proves it).

The basic method follows at once.

:::proposition{status=proved}
If there is a map $\varphi$ from terms to a set with a well-founded order $>$ such that $s \to_R t$ implies $\varphi(s) > \varphi(t)$, then $R$ terminates.
:::

:::proof
An infinite chain $t_0 \to t_1 \to \cdots$ would give an infinite descending chain $\varphi(t_0) > \varphi(t_1) > \cdots$.
:::

The difficulty is that "every step" means every rule, applied at every position, to every instance. Checking that rule by rule is the subject of the next three chapters. Here we build the well-founded orders that the measures land in.

## Lexicographic products

Ackermann's function is the classic example of a computation that terminates although no simple quantity decreases:

```girafe title="Ackermann’s function" tools="run,termination"
Ack(0, n) -> S(n)
Ack(S(m), 0) -> Ack(m, S(0))
Ack(S(m), S(n)) -> Ack(m, Ack(S(m), n))
? Ack(S(S(0)), S(S(0)))
```

In the third rule the first argument decreases, but the second becomes `Ack(S(m), n)`, which may be enormous. What decreases is the *pair* of arguments, compared first by the first component and only then by the second.

:::definition[Lexicographic product]
Given orders $>_1$ on $A$ and $>_2$ on $B$, the **lexicographic product** on $A \times B$ is: $(a, b) >_{\mathrm{lex}} (a', b')$ if $a >_1 a'$, or $a = a'$ and $b >_2 b'$.
:::

:::theorem{status=proved}
If $>_1$ and $>_2$ are well-founded, so is $>_{\mathrm{lex}}$.
:::

:::proof
In an infinite chain $(a_0, b_0) >_{\mathrm{lex}} (a_1, b_1) >_{\mathrm{lex}} \cdots$, the first components satisfy $a_0 \ge_1 a_1 \ge_1 \cdots$. Since $>_1$ is well-founded, they decrease strictly only finitely often, so from some index on they are all equal. From there each step must decrease the second component, giving an infinite chain in $>_2$. Contradiction.
:::

By induction, lexicographic products of any fixed length are well-founded. (Of *unbounded* length they are not: on strings over $\{a, b\}$, $b > ab > aab > \cdots$ is an infinite descending chain in the dictionary order.) Ackermann's rules terminate because the pair of arguments, read as numbers, decreases lexicographically in each recursive call; Chapter 12 turns this argument into a mechanical check, and the *Termination* tab above already finds it.

## Multisets

A **multiset** is a set in which elements may occur several times: $\{3, 3, 1\}$ differs from $\{3, 1\}$, but order does not matter. Multisets of numbers are compared by the following rule: you may remove an element and replace it by any finite number of *smaller* elements.

:::definition[Multiset order]
For a strict order $>$ on $A$ and finite multisets $M$, $N$ over $A$: $M >_{\mathrm{mul}} N$ if $N$ can be obtained from $M$ by removing a non-empty sub-multiset $X$ and adding a multiset $Y$, every element of which is smaller than some element of $X$.
:::

So $\{5, 1\} >_{\mathrm{mul}} \{4, 4, 4, 1\}$ (replace 5 by three 4s), and $\{3\} >_{\mathrm{mul}} \{2, 2, 2, 2, 1, 1\}$: one element can be traded for any number of smaller ones.

```numeric
id: well-founded-orders/multiset-game
title: Trading down
prompt: 'Starting from the multiset $\{2, 2\}$ of natural numbers, each move removes one element $k > 0$ and adds any number of copies of $k - 1$. Moves on a $0$ are not allowed. You choose how many copies to add each time; however you choose, the game ends. If you always add exactly two copies, how many moves does the game last?'
answer: 6
tolerance: 0
explain: 'Each 2 becomes two 1s (one move each, 2 moves), then each of the four 1s becomes two 0s (4 moves): 6 moves. In general a 2 costs 1 + 2 moves when you add two copies, and you could make the game as long as you like by adding more copies, but never infinite.'
```

:::theorem{name="Dershowitz and Manna" year=1979 status=proved}
If $>$ is well-founded on $A$, then $>_{\mathrm{mul}}$ is well-founded on finite multisets over $A$.
:::

::::zoom{levels="Idea, Proof"}
:::level[Idea]
Draw the history of an infinite descending chain as a tree. The root has the elements of $M_0$ as children; whenever an element $x$ is replaced by $y_1, \ldots, y_k$, give $x$ the children $y_1, \ldots, y_k$ (all smaller than $x$). Every step adds a node, so the tree is infinite; it is finitely branching, so by König's lemma it has an infinite path, and that path is an infinite descending chain in $A$.
:::
:::level[Proof]
Suppose $M_0 >_{\mathrm{mul}} M_1 >_{\mathrm{mul}} \cdots$. We may assume each step removes exactly one element $x$ and adds finitely many elements $y_1, \ldots, y_k$, each $y_j < x$ (a general step is a sequence of such steps: remove the elements of $X$ one at a time, each together with the elements of $Y$ below it, choosing for each $y$ one element of $X$ above it).

Build a tree. Its root is a new node $\bot$ whose children are the elements of $M_0$ (as separate nodes). When a step removes an element $x$, which is a leaf of the tree, and adds $y_1, \ldots, y_k$, add $k$ children labelled $y_1, \ldots, y_k$ below that leaf; if $k = 0$, add a single child labelled with a special mark $\ast$ that is never removed. At every moment the current multiset is the set of unmarked leaves.

Each step adds at least one node, so the tree is infinite. Each node has finitely many children. By **König's lemma**, an infinite, finitely branching tree has an infinite path from the root. Along it, after the root, labels strictly decrease (a child is smaller than its parent) and no node is $\ast$ (marked nodes are leaves). That is an infinite descending chain in $A$, contradicting well-foundedness. $\blacksquare$

(König's lemma: if a finitely branching tree is infinite, the root has a child with infinitely many descendants; move to it and repeat, which defines an infinite path.)
:::
::::

Multisets are what make termination arguments about *collections* of things work: a step may destroy one big thing and create many small ones, and the multiset order says this cannot go on for ever. Nachum Dershowitz and Zohar Manna introduced the multiset order for termination proofs in 1979,:cite[dershowitz-manna1979] and it is the engine inside the recursive path order of Chapter 12.

## The hydra

Laurie Kirby and Jeff Paris described a game that pushes this to the limit.:cite[kirby-paris1982] A hydra is a tree. Hercules cuts off a head (a leaf). If the head was attached directly to the root, nothing grows back. Otherwise, let $p$ be the node the head hung from and $g$ the node below $p$: the hydra grows $n$ new copies of $p$'s remaining branch, attached to $g$, where $n$ is the number of the current move. Try it:

::hydra-game

The hydra grows quickly. Yet Hercules always wins, whatever heads he chooses.

:::theorem{name="Kirby and Paris" year=1982 status=sketched}
Every strategy kills every hydra in finitely many moves. The statement "every strategy wins" is true, but cannot be proved in Peano arithmetic.
:::

The proof assigns to each hydra an ordinal number below $\varepsilon_0$, the limit of $\omega, \omega^\omega, \omega^{\omega^\omega}, \ldots$: a node with no children (a head) has ordinal $0$, and a node whose children have ordinals $\alpha_1 \ge \cdots \ge \alpha_k$ has ordinal $\omega^{\alpha_1} + \cdots + \omega^{\alpha_k}$, so each head contributes $\omega^0 = 1$ to its parent. The hydra's ordinal is that of its root. Cutting a head lowers one exponent by one, and the $n$ copies multiply a smaller term by $n$, so the ordinal strictly decreases, however large $n$ is. Ordinals below $\varepsilon_0$ are well-ordered, so the game ends. The unprovability part is deep: Peano arithmetic can prove the well-foundedness of each ordinal below $\varepsilon_0$ separately, but not of all of them together. The lesson for termination proofs is that a measure may need to be far more powerful than "a number that goes down"; the path orders of Chapter 12 can reach ordinals of this kind.

## Reduction orders

Termination methods for rewriting look for orders on *terms* that can be checked rule by rule.

:::definition[Reduction order]
A **reduction order** is a well-founded strict order $>$ on terms that is

- **closed under substitutions**: $s > t$ implies $s\sigma > t\sigma$;
- **closed under contexts** (monotone): $s > t$ implies $u[s]_p > u[t]_p$.
:::

:::theorem{status=proved}
A system $R$ terminates if and only if there is a reduction order $>$ with $l > r$ for every rule $l \to r$ of $R$.
:::

:::proof
If such an order exists and $s \to_R t$, then $s|_p = l\sigma$ and $t = s[r\sigma]_p$. From $l > r$, closure under substitutions gives $l\sigma > r\sigma$, and closure under contexts gives $s > t$. So every step decreases, and well-foundedness rules out infinite chains.

Conversely, if $R$ terminates, then $\to_R^+$ is itself a reduction order: it is transitive, irreflexive and well-founded because $R$ terminates (a cycle $s \to^+ s$ would give an infinite chain), and closed under substitutions and contexts by the proposition of Chapter 3. It contains every rule.
:::

The second half is useless in practice (to use $\to_R^+$ you would have to know termination already) but it says that the method loses nothing. The first half is the method: finitely many checks $l > r$, one per rule, instead of infinitely many steps. The next chapters construct reduction orders in two ways: by interpreting terms as numbers (Chapter 11) and by comparing their syntax directly (Chapter 12).

```code
id: well-founded-orders/multiset
title: The multiset order
prompt: |
  Write `multisetGreater(M, N)` for arrays of numbers (as multisets, under the usual order on numbers): true if $M >_{\mathrm{mul}} N$.

  A convenient characterisation: remove the elements the two multisets have in common (with multiplicity); then $M >_{\mathrm{mul}} N$ holds exactly when what is left of $M$ is non-empty and every element left in $N$ is smaller than some element left in $M$.
starter: |
  export function multisetGreater(M: number[], N: number[]): boolean {
    return M.length > N.length;
  }
tests: |
  import { test, expect } from 'test';
  import { multisetGreater } from 'solution';

  test('one element for many smaller ones', () => {
    expect(multisetGreater([5, 1], [4, 4, 4, 1])).toBe(true);
    expect(multisetGreater([3], [2, 2, 2, 2, 1, 1])).toBe(true);
  });
  test('removing elements decreases', () => {
    expect(multisetGreater([3, 2, 1], [3, 1])).toBe(true);
    expect(multisetGreater([3, 1], [3, 2, 1])).toBe(false);
  });
  test('equal multisets are not greater, whatever the order', () => {
    expect(multisetGreater([1, 2, 2], [2, 1, 2])).toBe(false);
    expect(multisetGreater([], [])).toBe(false);
  });
  test('a bigger element cannot be paid for by smaller ones', () => {
    expect(multisetGreater([4, 4, 4], [5])).toBe(false);
    expect(multisetGreater([5, 3], [5, 4])).toBe(false);
  });
  test('does not modify its arguments', () => {
    const M = [2, 1], N = [1, 1, 1];
    expect(multisetGreater(M, N)).toBe(true);
    expect(M).toEqual([2, 1]);
    expect(N).toEqual([1, 1, 1]);
  });
solution: |
  export function multisetGreater(M: number[], N: number[]): boolean {
    const m = M.slice(), n = N.slice();
    for (let i = m.length - 1; i >= 0; i--) {
      const j = n.indexOf(m[i]);
      if (j >= 0) { m.splice(i, 1); n.splice(j, 1); }
    }
    return m.length > 0 && n.every((y) => m.some((x) => x > y));
  }
hints:
  - 'Copy both arrays, then remove common elements one pair at a time (`indexOf` and `splice`).'
  - 'Then check: something is left in the copy of `M`, and every element left in the copy of `N` is below some element left in `M`.'
```

:::key
- Termination = no infinite chain = well-foundedness of $\to_R$.
- Lexicographic products and multiset orders of well-founded orders are well-founded (König's lemma for multisets).
- A system terminates iff some reduction order (well-founded, closed under substitutions and contexts) orients every rule. That reduces infinitely many steps to finitely many checks.
:::

:::exercises
1. Show that the lexicographic order on all finite strings over $\{a, b\}$ (dictionary order) is not well-founded, but the **length-lexicographic** order (shorter first, then dictionary order) is.
2. Prove that the multiset order of a total order is total.
3. Use the multiset order to prove that the system `F(S(x)) -> G(F(x), F(x))`, where `G` is a constructor, terminates. (Measure: the multiset of the arguments of all `F` nodes.)
4. In the hydra game, compute the ordinal of a hydra that is a path of three edges, and of the hydra after its top head is cut on move 1.
:::
