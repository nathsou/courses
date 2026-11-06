---
number: 5
title: Strategies
summary: Innermost and outermost, call by value and call by name, which strategies are guaranteed to find a normal form, what each one costs, and two normalisers for your engine.
duration: About 1 hour
prerequisites: [abstract-reduction]
theorems: [Leftmost-outermost reduction is normalising for left-normal orthogonal systems, Innermost reduction finds no normal form that is not there]
techniques: ['normalizeInnermost and normalizeOutermost']
---

A rewrite system says *what* may be replaced, not *where to start*. An engine must choose, and a rule for choosing is a **strategy**. Chapter 3 showed that the choice can decide whether a normal form is reached at all; this chapter compares the standard strategies, says what is known about each, and builds two of them into your engine.

## Innermost and outermost

A redex is **innermost** if no proper subterm of it is a redex, and **outermost** if it is not inside another redex. The two classic strategies contract the leftmost of these:

- **Leftmost-innermost** reduction contracts the leftmost innermost redex. Arguments are reduced before the function applied to them: this is **call by value**, the evaluation order of ML, Java, Python and almost every mainstream language. It is Girafe's default.
- **Leftmost-outermost** reduction contracts the leftmost outermost redex. A function is applied before its arguments are evaluated, and arguments it does not use are never evaluated: this is **call by name**.

Trace the two on the same term. With innermost, `F(Loop)` evaluates `Loop` first and never stops; with outermost, the rule for `F` throws the argument away at once.

```girafe title="Innermost against outermost" tools="trace,run" strategy="outermost"
#infixl 6 +
0 + y -> y
S(x) + y -> S(x + y)
Double(x) -> x + x
F(x) -> 0
Loop -> Loop
? F(Loop)
? Double(S(0) + S(0))
```

The second query shows the price of outermost: `Double(S(0) + S(0))` becomes `(S(0) + S(0)) + (S(0) + S(0))`, and the copied argument is then computed twice. Innermost computes it once, then copies the result.

A third strategy, **parallel-outermost**, contracts *all* outermost redexes in one step. They sit at parallel positions, so by the replacement lemmas of Chapter 1 the order among them does not matter. Count the steps each strategy takes:

::strategy-race{rules="#infixl 6 +\n0 + y -> y\nS(x) + y -> S(x + y)\nDouble(x) -> x + x\nF(x) -> 0\nLoop -> Loop" terms="Double(Double(S(0) + S(0)))\nDouble(Double(Double(S(0))))\nF(Double(S(S(0)) + S(0)))\nF(Loop)"}

On `Double(Double(Double(S(0))))`, outermost takes twice as many steps as innermost, because each `Double` copies an unevaluated argument. On `F(…)`, outermost wins outright. Neither strategy is better in general.

:::note
**Call by need.** Lazy languages such as Haskell get the best of both: outermost order, so unused arguments are never evaluated, and **sharing**, so a copied argument is evaluated at most once. Instead of copying the term `S(0) + S(0)`, `Double` creates two pointers to one shared node; when one copy is evaluated, the other sees the result. Rewriting on shared terms (graphs rather than trees) is the subject of Chapter 7.
:::

## Normalising strategies

:::definition[Normalising strategy]
A strategy is **normalising** for a system if, whenever a term has a normal form, the strategy reaches one.
:::

Innermost is not normalising (`F(Loop)`), but it fails only in a specific way.

:::proposition{status=proved}
If a term $t$ is terminating (every reduction from $t$ is finite), every strategy reaches a normal form of $t$. In particular, in a terminating system every strategy is normalising.
:::

:::proof
Any strategy produces a reduction sequence from $t$; the sequence is finite because $t$ is terminating, and it ends only at a term with no redex, a normal form.
:::

So the choice of strategy matters only for systems that are not terminating, which is exactly where programming languages live: `Loop -> Loop` is a valid program. For those, outermost strategies are the safe ones, under a condition on the rules.

:::definition[Orthogonal, left-normal]
A system is **orthogonal** if its left-hand sides are linear and no two left-hand sides overlap (made precise in Chapter 16). It is **left-normal** if, in every left-hand side, all function symbols come before all variables when read left to right.
:::

The Peano rules are orthogonal and left-normal (`S(x) + y` reads `+ S x y`: symbols first, then variables). So is combinatory logic (Chapter 28).

:::theorem{name="O’Donnell" year=1977 status=stated}
For orthogonal systems, parallel-outermost reduction is normalising. For orthogonal left-normal systems, leftmost-outermost reduction is normalising.
:::

Both results are due to Michael O'Donnell;:cite[odonnell1977] the general theory, which identifies the **needed** redexes that every normalising strategy must eventually contract, is Huet and Lévy's.:cite[huet-levy1991] Terese's chapter on strategies proves them in full.:cite[terese2003] Left-normality matters: in the orthogonal system `F(x, A) -> B`, `C -> A`, `Loop -> Loop`, the term `F(Loop, C)` has the normal form `B`, but leftmost-outermost keeps rewriting `Loop`, because the only redex the rule for `F` needs is to its right. Try it in the workbench (strategy *leftmost-outermost*, then *parallel-outermost*).

```girafe title="Not left-normal" tools="trace" strategy="outermost"
F(x, A) -> B
C -> A
Loop -> Loop
? F(Loop, C)
```

## Strategies in your engine

Write the two classic normalisers. Use `rootRewrite` from your engine (Chapter 3): at each position the first matching rule wins.

```code
id: strategies/normalizers
title: Innermost and outermost normalisation
provides: [normalizeInnermost, outermostStep, normalizeOutermost]
prompt: |
  Implement, for a list of rules:

  - `normalizeInnermost(rules, t, fuel = 100000)`: the leftmost-innermost normal form. The natural way is recursive: normalise the arguments, then try `rootRewrite` at the root, and if it succeeds, normalise the result.
  - `outermostStep(rules, t)`: one leftmost-outermost step, or `null` if `t` is a normal form.
  - `normalizeOutermost(rules, t, fuel = 100000)`: repeat `outermostStep` until it returns `null`.

  Both normalisers must throw a `RangeError` once they have taken more than `fuel` steps.
starter: |
  import type { Rule, Term } from 'trs';
  import { f } from 'trs';
  import { rootRewrite } from 'engine';

  export function normalizeInnermost(rules: readonly Rule[], t: Term, fuel = 100_000): Term {
    return t;
  }

  export function outermostStep(rules: readonly Rule[], t: Term): Term | null {
    return null;
  }

  export function normalizeOutermost(rules: readonly Rule[], t: Term, fuel = 100_000): Term {
    return t;
  }
tests: |
  import { test, expect } from 'test';
  import { normalizeInnermost, outermostStep, normalizeOutermost } from 'solution';
  import { rules, term, show } from 'trs';

  const R = rules('+(0, y) -> y\n+(S(x), y) -> S(+(x, y))\nDouble(x) -> +(x, x)\nF(x) -> 0\nLoop -> Loop');
  test('innermost computes 2 + 1', () => {
    expect(show(normalizeInnermost(R, term('+(S(S(0)), S(0))')))).toBe('S(S(S(0)))');
  });
  test('innermost normalises arguments first, then the result', () => {
    expect(show(normalizeInnermost(R, term('Double(Double(S(0)))')))).toBe('S(S(S(S(0))))');
  });
  test('innermost runs out of fuel on F(Loop)', () => {
    expect(() => normalizeInnermost(R, term('F(Loop)'), 200)).toThrow();
  });
  test('one outermost step', () => {
    expect(show(outermostStep(R, term('Double(+(0, 0))')))).toBe('+(+(0, 0), +(0, 0))');
    expect(show(outermostStep(R, term('S(+(0, S(0)))')))).toBe('S(S(0))');
    expect(outermostStep(R, term('S(S(0))'))).toBe(null);
  });
  test('the leftmost outermost redex goes first', () => {
    expect(show(outermostStep(R, term('G(+(0, A), Double(B))')))).toBe('G(A, Double(B))');
  });
  test('outermost finds the normal form of F(Loop)', () => {
    expect(show(normalizeOutermost(R, term('F(Loop)')))).toBe('0');
    expect(show(normalizeOutermost(R, term('Double(Double(S(0)))')))).toBe('S(S(S(S(0))))');
  });
  test('outermost runs out of fuel on Loop', () => {
    expect(() => normalizeOutermost(R, term('Loop'), 200)).toThrow();
  });
solution: |
  import type { Rule, Term } from 'trs';
  import { f } from 'trs';
  import { rootRewrite } from 'engine';

  export function normalizeInnermost(rules: readonly Rule[], t: Term, fuel = 100_000): Term {
    const budget = { left: fuel };
    const go = (u: Term): Term => {
      for (;;) {
        if (u.type === 'var') return u;
        u = f(u.name, ...u.args.map(go));
        const next = rootRewrite(rules, u);
        if (next === null) return u;
        if (--budget.left < 0) throw new RangeError('out of fuel');
        u = next;
      }
    };
    return go(t);
  }

  export function outermostStep(rules: readonly Rule[], t: Term): Term | null {
    const here = rootRewrite(rules, t);
    if (here !== null) return here;
    if (t.type === 'var') return null;
    for (let i = 0; i < t.args.length; i++) {
      const r = outermostStep(rules, t.args[i]);
      if (r !== null) return f(t.name, ...t.args.slice(0, i), r, ...t.args.slice(i + 1));
    }
    return null;
  }

  export function normalizeOutermost(rules: readonly Rule[], t: Term, fuel = 100_000): Term {
    let cur = t;
    for (let i = 0; i < fuel; i++) {
      const next = outermostStep(rules, cur);
      if (next === null) return cur;
      cur = next;
    }
    throw new RangeError('out of fuel');
  }
hints:
  - 'Innermost: in a loop, replace `u` by `f(u.name, ...u.args.map(go))`, then try `rootRewrite`. If it gives a new term, loop again on it (its arguments may contain new redexes).'
  - 'Outermost step: try the root first; otherwise try the arguments from left to right and rebuild the term around the first one that changes.'
  - 'Share the fuel between all recursive calls of `go` with an object such as `{ left: fuel }`.'
```

## Which strategy, then?

| Strategy | Normalising? | Cost | Used by |
|---|---|---|---|
| leftmost-innermost | only for terminating terms | each argument evaluated once, even if unused | ML, Java, Girafe |
| leftmost-outermost | for left-normal orthogonal systems | unused arguments skipped; copied ones re-evaluated | the λ-calculus's normal order |
| parallel-outermost | for orthogonal systems | as outermost, many redexes per step | theory |
| outermost + sharing | as outermost | each argument at most once | Haskell (call by need) |

For terminating, confluent systems, such as the simplifiers of the algebra system, all strategies give the same answer, and the choice is only about speed. Innermost is usually the fastest there, and Part III makes it much faster.

:::key
- Innermost = call by value; outermost = call by name; parallel-outermost contracts every outermost redex at once.
- On terminating terms every strategy reaches a normal form; otherwise innermost may loop where outermost succeeds.
- Outermost strategies are normalising for orthogonal systems (leftmost-outermost needs left-normality), but may duplicate work; sharing removes the duplication.
:::

:::exercises
1. Find a term in the race's system for which outermost takes strictly fewer steps than innermost and both terminate.
2. Show that leftmost-innermost and rightmost-innermost reach the same normal form in any system where both terminate and rules are tried in the same order. Is this true without that last condition?
3. A redex is **needed** if it, or a descendant of it, is contracted in every reduction to normal form. Which redexes of `F(Loop, C)` are needed in the non-left-normal example?
4. Write a system and a term where parallel-outermost takes more contractions in total (counting each redex contracted) than innermost.
:::
