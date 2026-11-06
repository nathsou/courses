---
number: 17
title: Orthogonality
summary: Systems without overlaps are confluent even when they do not terminate, by parallel moves. Why left-linearity matters, and decreasing diagrams, the general method behind modern confluence provers.
duration: About 1 hour
prerequisites: [critical-pairs]
theorems: [Orthogonal systems are confluent, The parallel moves lemma, Decreasing diagrams]
techniques: [parallel reduction]
---

The Knuth–Bendix criterion needs termination. Programming languages do not terminate, in general, and yet their evaluation is deterministic in the sense that matters: a program cannot have two different results. The λ-calculus is the classic case (Church and Rosser proved its confluence in 1936, and Chapter 28 returns to it), and so is every functional program written as a constructor system without overlapping clauses. This chapter explains why.

## Orthogonal systems

:::definition[Orthogonal]
A system is **orthogonal** if it is left-linear (no variable occurs twice in a left-hand side) and has no critical pairs. It is **weakly orthogonal** if it is left-linear and all its critical pairs are trivial (both sides equal).
:::

The Peano rules, the list functions of Chapter 6 written without catch-alls, and combinatory logic are all orthogonal. A redex in an orthogonal system can be destroyed by contracting another redex only by being *erased* or *copied* along with an argument, never by having part of its pattern rewritten from under it.

:::theorem{name="Rosen; Huet" status=sketched}
Every orthogonal system is confluent. More generally, every weakly orthogonal system is confluent.
:::

Look at a reduction graph of an orthogonal system: every fork closes into a diamond, possibly a stretched one when a step copies a redex.

::reduction-graph{rules="#infixl 6 +\n0 + y -> y\nS(x) + y -> S(x + y)\nDouble(x) -> x + x" term="Double(0 + S(0)) + (0 + 0)" title="An orthogonal system"}

The proof cannot follow Newman's route, since there is no termination to induct on. A single step does not have the diamond property either: if `Double(x) -> x + x` copies a redex, the other side needs *two* steps to catch up. The trick, due to William Tait and Per Martin-Löf for the λ-calculus, is to change the notion of step.

:::definition[Parallel reduction]
$s \rightrightarrows t$ (a **parallel step**) if $t$ is obtained from $s$ by contracting any set of redexes at pairwise parallel positions, all at once.
:::

A parallel step can contract zero redexes, so $\rightrightarrows$ is reflexive; every single step is a parallel step, and every parallel step is a sequence of single steps. Hence $\rightrightarrows^*$ and $\to^*$ are the same relation, and the two relations are confluent together.

:::lemma{name="Parallel moves" status=sketched}
In an orthogonal system, $\rightrightarrows$ has the diamond property: if $t_1 \leftleftarrows s \rightrightarrows t_2$, then $t_1 \rightrightarrows u \leftleftarrows t_2$ for some $u$.
:::

:::proof
Let $P_1$ and $P_2$ be the sets of redexes contracted. Contract on each side the **residuals** of the other side's redexes: what is left of them after the first step. Because the system is orthogonal, a redex of $P_2$ is either disjoint from every redex of $P_1$ (it survives unchanged), or lies inside the substitution part of one (it is copied, erased or moved, but stays a redex, by left-linearity), or contains some (and then it remains a redex after they are contracted, since they lie in its variable part). The residuals of $P_2$ after $P_1$ are pairwise parallel, so they form one parallel step; symmetrically for $P_1$. Both orders end in the same term, the result of contracting "all of $P_1 \cup P_2$". Terese gives the full argument.:cite[terese2003]
:::

A relation with the diamond property is confluent (a peak of $m$ and $n$ steps is filled by $m \times n$ diamonds, like tiling a rectangle), so $\rightrightarrows$ is confluent, and therefore so is $\to$. Barry Rosen proved the confluence of orthogonal tree-manipulating systems in 1973;:cite[rosen1973] Huet extended it to weakly orthogonal and to "parallel closed" systems in 1980.:cite[huet1980]

## Why left-linearity matters

Without left-linearity, a system with no critical pairs can fail to be confluent. Jan Willem Klop found the standard example::cite[klop1980]

```girafe title="Klop’s counterexample" tools="trace,confluence" strategy="manual"
D(x, x) -> E
C(x) -> D(x, C(x))
A -> C(A)
? C(A)
```

There are no critical pairs (no left-hand side overlaps another), but `D(x, x)` needs two equal arguments. From `C(A)` you can reach `E` (try it: make the two arguments of `D` equal before applying the first rule) and also `C(E)`, and these two terms have no common reduct. The intuition: rewriting one copy of a repeated variable makes the copies different, and only further rewriting can make them equal again, which in a non-terminating system may be out of reach. The *Confluence* tab can only report "unknown" here: there are no critical pairs to fail, and no termination to make their absence conclusive.

## Decreasing diagrams

Orthogonality and the Knuth–Bendix criterion are two special cases of a single method, due to Vincent van Oostrom.:cite[vanoostrom1994]

:::theorem{name="Decreasing diagrams" who="van Oostrom" year=1994 status=stated}
Suppose every step of an ARS carries a label from a well-founded order. Write $\to_{<\alpha}$ for a step whose label is below $\alpha$, and $\to_{<\alpha\beta}$ for one whose label is below $\alpha$ or below $\beta$. If every local peak $b \leftarrow_\alpha a \to_\beta c$ can be joined as
$$ b \to^*_{<\alpha} \cdot \to^{=}_{\beta} \cdot \to^*_{<\alpha\beta} d \quad\text{and}\quad c \to^*_{<\beta} \cdot \to^{=}_{\alpha} \cdot \to^*_{<\alpha\beta} d, $$
then the system is confluent. (Here $\to^{=}$ is zero or one step.)
:::

With all labels equal and the valleys made of single steps, this is the diamond property; with labels given by the source term in a terminating system, it is Newman's lemma. Modern confluence provers such as CSI search for labellings automatically,:cite[zankl2011] and compete each year on the Confluence Problems database.:cite[cops]

```quiz
q: 'A left-linear system has one critical pair, and its two sides are identical terms. Is it confluent?'
options:
  - text: 'Yes: it is weakly orthogonal, so it is confluent even if it does not terminate.'
    correct: true
    why: 'Trivial critical pairs behave like no overlap at all in the parallel moves argument.'
  - text: 'Only if it terminates.'
    why: 'Weak orthogonality gives confluence without termination.'
  - text: 'No: any critical pair breaks confluence.'
    why: 'Critical pairs are only a problem when their sides cannot be joined.'
```

## Orthogonality in code

```code
id: orthogonality/is-orthogonal
title: Is it orthogonal?
prompt: |
  Write `classify(rules)`, returning `'orthogonal'`, `'weakly orthogonal'` or `'neither'`. Use `criticalPairs` from your engine and `isLinear` and `equal` from `trs`.
starter: |
  import type { Rule } from 'trs';
  import { isLinear, equal } from 'trs';
  import { criticalPairs } from 'engine';

  export function classify(rules: readonly Rule[]): 'orthogonal' | 'weakly orthogonal' | 'neither' {
    return 'neither';
  }
tests: |
  import { test, expect } from 'test';
  import { classify } from 'solution';
  import { rules } from 'trs';

  test('Peano arithmetic is orthogonal', () => {
    expect(classify(rules('+(0, y) -> y\n+(S(x), y) -> S(+(x, y))\n*(0, y) -> 0\n*(S(x), y) -> +(y, *(x, y))'))).toBe('orthogonal');
  });
  test('combinatory logic is orthogonal', () => {
    expect(classify(rules('Ap(I, x) -> x\nAp(Ap(K, x), y) -> x\nAp(Ap(Ap(S, x), y), z) -> Ap(Ap(x, z), Ap(y, z))'))).toBe('orthogonal');
  });
  test('trivial overlaps: parallel or', () => {
    expect(classify(rules('Or(True, x) -> True\nOr(x, True) -> True\nOr(False, False) -> False'))).toBe('weakly orthogonal');
  });
  test("Klop's example is not left-linear", () => {
    expect(classify(rules('D(x, x) -> E\nC(x) -> D(x, C(x))\nA -> C(A)'))).toBe('neither');
  });
  test('a real overlap', () => {
    expect(classify(rules('F(G(x)) -> A\nG(B) -> C'))).toBe('neither');
  });
solution: |
  import type { Rule } from 'trs';
  import { isLinear, equal } from 'trs';
  import { criticalPairs } from 'engine';

  export function classify(rules: readonly Rule[]): 'orthogonal' | 'weakly orthogonal' | 'neither' {
    if (!rules.every((r) => isLinear(r.lhs))) return 'neither';
    const cps = criticalPairs(rules);
    if (cps.length === 0) return 'orthogonal';
    return cps.every((c) => equal(c.left, c.right)) ? 'weakly orthogonal' : 'neither';
  }
hints:
  - 'Check left-linearity first; then count the critical pairs, and if there are some, check whether both sides of each are equal.'
```

:::key
- Orthogonal = left-linear + no critical pairs. Orthogonal (and weakly orthogonal) systems are confluent without termination.
- The proof uses parallel reduction, which has the diamond property (parallel moves).
- Non-left-linear rules can break confluence even without overlaps (Klop's example).
- Decreasing diagrams unify both confluence criteria.
:::

:::exercises
1. Show that the parallel-or system above is confluent by checking its critical pairs, and explain why a sequential implementation of `Or` must choose which argument to evaluate first.
2. Prove that a relation with the diamond property is confluent.
3. Find the reductions of `C(A)` to `E` and to `C(E)` in Klop's system, and argue that `E` and `C(E)` have no common reduct.
4. In an orthogonal system, can a term have two different normal forms? Can it have a normal form and also an infinite reduction?
:::
