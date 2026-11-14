---
number: 25
title: Strategy combinators
summary: Separate the rules from the order in which to apply them. Sequence, choice, try, repeat, all and one, from which innermost, outermost and every traversal become two-line programs, as in Stratego and ELAN.
duration: About 1½ hours
prerequisites: [strategies, programming-with-rules]
theorems: [Innermost and outermost as strategy expressions]
techniques: [strategy combinators]
---

Chapter 5 treated strategies as built into the engine: innermost or outermost, chosen once for everything. Program transformation needs much finer control. A compiler pass may want to simplify only inside function bodies, apply some rules once at the top and others everywhere, or stop rewriting as soon as one rule succeeds. Encoding such control in the rules themselves (with extra symbols that mark where to work) makes rules unreadable. The alternative, developed in the languages ELAN and Stratego in the 1990s, is a small language of **strategies** built from a few combinators.:cite[borovansky1998,visser1998]

From here on the running thread is a small programming language, **Pebble**, whose programs are terms: literals `Lit(n)`, variables `V(X)`, arithmetic `Add`, `Mul`, comparisons `Lt`, conditionals `If`, and later `Let`, functions and application. This chapter rewrites Pebble programs with strategies; the next one builds an optimiser from them, and Chapter 27 gives Pebble its meaning.

## Strategies

A **strategy** is a partial function from terms to terms: applied to a term, it either produces a term or **fails**. A rule labelled `[Fold]` is a strategy that rewrites at the root if its left-hand side matches and fails otherwise. Strategies combine:

| Strategy | Meaning |
|---|---|
| `id`, `fail` | succeed without change; always fail |
| `A` | apply the rule labelled `A` at the root (or a named strategy) |
| `rules` | apply the first rule that matches, at the root |
| `s1 ; s2` | apply `s1`, then `s2` to its result; fail if either fails |
| `s1 <+ s2` | **left choice**: apply `s1`; if it fails, apply `s2` to the original term |
| `try(s)` | `s <+ id`: apply `s` if it can, otherwise do nothing |
| `repeat(s)` | apply `s` until it fails |
| `all(s)` | apply `s` to every argument (fail if it fails on one) |
| `one(s)` | apply `s` to the first argument where it succeeds (fail if none) |
| `some(s)` | apply `s` to every argument where it succeeds, at least one |
| `where(s)` | test `s`: succeed, leaving the term unchanged, iff `s` succeeds |
| `not(s)` | succeed, leaving the term unchanged, iff `s` fails |

The key ingredients are the **one-level traversals** `all`, `one` and `some`: they move the strategy one level down, to the arguments. Everything else is built from them.

## Traversals as definitions

With a recursive definition, traversals of the whole term follow:

```girafe static
topdown(s)   = s ; all(topdown(s))
bottomup(s)  = all(bottomup(s)) ; s
oncetd(s)    = s <+ one(oncetd(s))
alltd(s)     = s <+ all(alltd(s))
innermost(s) = bottomup(try(s ; innermost(s)))
outermost(s) = repeat(oncetd(s))
```

Read `innermost(s)` carefully: first normalise all arguments (`bottomup`), then try `s` at the root; if it succeeds, the result may have new redexes, so call `innermost(s)` on it again. That is leftmost-innermost normalisation from Chapter 5, written as a strategy, and `outermost(s)` (find the first redex top-down, contract it, repeat) is leftmost-outermost. The engine provides these traversals built in.

Here is constant folding for Pebble, with the rules labelled and three different strategies. The *Strategy* tab applies the chosen strategy to each query and lists the rules it applied, in order.

```girafe title="Constant folding with strategies" tools="strategy,run"
[AddLit] Add(Lit(a), Lit(b)) -> Lit(@add(a, b))
[MulLit] Mul(Lit(a), Lit(b)) -> Lit(@mul(a, b))
[AddZero] Add(e, Lit(0)) -> e
[MulOne] Mul(e, Lit(1)) -> e
#strategy fold = innermost(AddLit <+ MulLit <+ AddZero <+ MulOne)
#strategy foldOnce = oncetd(AddLit <+ MulLit)
#strategy topOnly = try(AddLit <+ MulLit)
? Add(Mul(Lit(2), Lit(3)), Add(V(X), Lit(0)))
? Mul(Add(Lit(1), Lit(1)), Mul(V(Y), Lit(1)))
? Add(Add(Lit(1), Lit(2)), Lit(3))
```

`fold` simplifies everything. `foldOnce` performs a single folding step, at the first place top-down where one applies. `topOnly` looks only at the root, and does nothing here, because the roots are not foldable yet. Type your own strategy in the box: on the third query, `bottomup(try(AddLit <+ MulLit))` folds everything in one pass, because arguments are folded before their parents, and `topdown(try(AddLit <+ MulLit))` does not, because it visits the root before the inner sum is ready.

```quiz
q: 'What does `topdown(try(AddLit))` do to `Add(Add(Lit(1), Lit(2)), Lit(3))`?'
options:
  - text: 'It produces `Add(Lit(3), Lit(3))`: the root is tried first (and fails), then the inner Add is folded, but the root is not revisited.'
    correct: true
    why: 'topdown applies s at a node before its children, and never comes back up. bottomup or innermost would finish the job.'
  - text: 'It produces `Lit(6)`.'
    why: 'That needs the root to be folded after its child, which bottomup does and topdown does not.'
  - text: 'It fails, because AddLit does not match the root.'
    why: 'try turns failure into success without change.'
```

## Why combinators

Strategies make three things easy that are awkward otherwise.

**Scoped rewriting.** `alltd(InLet ; simplify)` applies `simplify` only inside the subterms where `InLet` matches, leaving everything else untouched.

**Rules that are not confluent, used deliberately.** `inline <+ keep` encodes "inline if possible, otherwise keep", a choice that a set of rules cannot express without priority.

**Staged transformations.** A compiler is a sequence of passes: `desugar ; repeat(simplify) ; generate`. Each pass is a strategy, and their composition is too.

Eelco Visser, Zine-el-Abidine Benaissa and Andrew Tolmach introduced this style of "programmable rewriting strategies" in 1998 to build program optimisers;:cite[visser1998] Stratego/XT and the Spoofax language workbench built a large ecosystem on it,:cite[visser2004] and ELAN, from Nancy, pioneered strategies as a language for rule-based computation.:cite[borovansky1998]

## Combinators in code

In TypeScript, a strategy is just a function from a term to a term or `null`. Then the combinators are higher-order functions.

```code
id: strategy-combinators/combinators
title: Strategy combinators as functions
prompt: |
  With `type S = (t: Term) => Term | null`, write the combinators `seq(s1, s2)`, `choice(s1, s2)`, `tryS(s)`, `repeat(s)`, `all(s)`, `one(s)`, and then the traversals `bottomup(s)` and `innermost(s)`, following the definitions in this chapter. `all` and `one` apply `s` to the arguments of a function symbol; on a variable or a constant, `all(s)` succeeds without change and `one(s)` fails.
starter: |
  import type { Term } from 'trs';
  import { f } from 'trs';

  export type S = (t: Term) => Term | null;

  export const seq = (s1: S, s2: S): S => (t) => null;
  export const choice = (s1: S, s2: S): S => (t) => null;
  export const tryS = (s: S): S => (t) => t;
  export const repeat = (s: S): S => (t) => t;
  export const all = (s: S): S => (t) => t;
  export const one = (s: S): S => (t) => null;
  export const bottomup = (s: S): S => (t) => s(t);
  export const innermost = (s: S): S => (t) => t;
tests: |
  import { test, expect } from 'test';
  import { seq, choice, tryS, repeat, all, one, bottomup, innermost } from 'solution';
  import { term, show } from 'trs';

  // A hand-written strategy: fold an addition of two literals at the root.
  const addLit = (t) => t.type === 'fn' && t.name === 'Add' && t.args.every((a) => a.type === 'fn' && a.name === 'Lit') ? term(`Lit(${Number(t.args[0].args[0].name) + Number(t.args[1].args[0].name)})`) : null;
  const sh = (x) => (x === null ? null : show(x));
  test('seq and choice', () => {
    expect(sh(seq(addLit, (t) => t)(term('Add(Lit(1), Lit(2))')))).toBe('Lit(3)');
    expect(sh(seq(addLit, addLit)(term('Add(Lit(1), Lit(2))')))).toBe(null);
    expect(sh(choice(addLit, (t) => term('No'))(term('V(X)')))).toBe('No');
  });
  test('try and repeat', () => {
    expect(sh(tryS(addLit)(term('V(X)')))).toBe('V(X)');
    const dec = (t) => (t.type === 'fn' && t.name === 'S' ? t.args[0] : null);
    expect(sh(repeat(dec)(term('S(S(S(0)))')))).toBe('0');
  });
  test('all and one', () => {
    expect(sh(all(addLit)(term('F(Add(Lit(1), Lit(1)), Add(Lit(2), Lit(2)))')))).toBe('F(Lit(2), Lit(4))');
    expect(sh(all(addLit)(term('F(Add(Lit(1), Lit(1)), V(X))')))).toBe(null);
    expect(sh(one(addLit)(term('F(V(X), Add(Lit(1), Lit(1)), Add(Lit(2), Lit(2)))')))).toBe('F(V(X), Lit(2), Add(Lit(2), Lit(2)))');
    expect(sh(one(addLit)(term('C')))).toBe(null);
    expect(sh(all(addLit)(term('C')))).toBe('C');
  });
  test('bottomup folds in one pass', () => {
    expect(sh(bottomup(tryS(addLit))(term('Add(Add(Lit(1), Lit(2)), Add(Lit(3), Lit(4)))')))).toBe('Lit(10)');
  });
  test('innermost normalises', () => {
    expect(sh(innermost(addLit)(term('F(Add(Add(Lit(1), Lit(2)), Lit(3)))')))).toBe('F(Lit(6))');
  });
solution: |
  import type { Term } from 'trs';
  import { f } from 'trs';

  export type S = (t: Term) => Term | null;

  export const seq = (s1: S, s2: S): S => (t) => { const a = s1(t); return a === null ? null : s2(a); };
  export const choice = (s1: S, s2: S): S => (t) => s1(t) ?? s2(t);
  export const tryS = (s: S): S => (t) => s(t) ?? t;
  export const repeat = (s: S): S => (t) => { let cur = t; for (;;) { const n = s(cur); if (n === null) return cur; cur = n; } };
  export const all = (s: S): S => (t) => {
    if (t.type === 'var') return t;
    const args: Term[] = [];
    for (const a of t.args) { const r = s(a); if (r === null) return null; args.push(r); }
    return f(t.name, ...args);
  };
  export const one = (s: S): S => (t) => {
    if (t.type === 'var') return null;
    for (let i = 0; i < t.args.length; i++) {
      const r = s(t.args[i]);
      if (r !== null) return f(t.name, ...t.args.slice(0, i), r, ...t.args.slice(i + 1));
    }
    return null;
  };
  export const bottomup = (s: S): S => (t) => seq(all(bottomup(s)), s)(t);
  export const innermost = (s: S): S => (t) => bottomup(tryS(seq(s, innermost(s))))(t);
hints:
  - 'Each combinator returns a new function `(t) => …`. Recursive definitions such as `bottomup` must delay the recursive call until a term arrives: write `(t) => seq(all(bottomup(s)), s)(t)`, not `seq(all(bottomup(s)), s)`.'
  - '`innermost(s)` is `bottomup(try(s ; innermost(s)))`, exactly as in the text.'
```

:::key
- A strategy maps a term to a term or fails. Rules are strategies; `;`, `<+`, `try`, `repeat` combine them.
- One-level traversals (`all`, `one`, `some`) plus recursion give every traversal: topdown, bottomup, innermost, outermost.
- Strategies separate *what* to rewrite from *where and when*, which is what program transformations need.
:::

:::exercises
1. Write `downup(s) = s ; all(downup(s)) ; s` and find a use for it.
2. With the non-confluent rules `[A] F(G) -> One` and `[B] G -> Two`, compare `innermost(A <+ B)` and `outermost(A <+ B)` on `F(G)`. Why do they differ?
3. Write a strategy that applies `fold` only inside the second argument of every `If`.
4. Prove that `innermost(s)`, when it terminates, returns a term in which `s` fails at every position.
:::
