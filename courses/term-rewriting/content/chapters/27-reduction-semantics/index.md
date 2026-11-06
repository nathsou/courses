---
number: 27
title: Reduction semantics
summary: What a program means, as rewriting. Small-step semantics on the program itself, evaluation contexts, and a big-step interpreter with environments, both for Pebble, and why confluence of a semantics means determinism.
duration: About 1½ hours
prerequisites: [program-transformation]
theorems: [Innermost reduction is call by value, A confluent semantics is deterministic]
techniques: [writing interpreters as rules]
---

The previous chapter transformed Pebble programs without saying what they mean. Meaning, for a programming language, is usually given by an **operational semantics**: a precise account of how a program runs. Rewriting provides two natural styles, and this chapter writes both for Pebble.

## Small steps on the program itself

The most direct semantics treats the program as a term and computation as rewriting it. An addition of two literals becomes a literal; a conditional on a literal becomes one of its branches; a `Let` whose bound expression is already a value substitutes it into the body:

```girafe title="A reduction semantics for Pebble" tools="trace,run" strategy="innermost"
Add(Lit(a), Lit(b)) -> Lit(@add(a, b))
Mul(Lit(a), Lit(b)) -> Lit(@mul(a, b))
Lt(Lit(a), Lit(b)) -> if(@lt(a, b), Lit(1), Lit(0))
If(Lit(0), a?, b?) -> b
If(Lit(n), a?, b?) -> a if @neq(n, 0) ->* True
Let(x, Lit(n), body?) -> Subst(body, x, Lit(n))
Subst(V(y), x, v) -> if(@equ(x, y), v, V(y))
Subst(Lit(n), x, v) -> Lit(n)
Subst(Add(a, b), x, v) -> Add(Subst(a, x, v), Subst(b, x, v))
Subst(Mul(a, b), x, v) -> Mul(Subst(a, x, v), Subst(b, x, v))
Subst(Lt(a, b), x, v) -> Lt(Subst(a, x, v), Subst(b, x, v))
Subst(If(c, a, b), x, v) -> If(Subst(c, x, v), Subst(a, x, v), Subst(b, x, v))
Subst(Let(y, e, b), x, v) -> Let(y, Subst(e, x, v), if(@equ(x, y), b, Subst(b, x, v)))
? Let(X, Lit(3), Let(Y, Add(V(X), Lit(1)), Mul(V(X), V(Y))))
? If(Lt(Lit(2), Lit(1)), Lit(10), Lit(20))
```

Every rule is a **reduction**: a small step of computation, contracted wherever it applies. A program's result is its normal form. Step through the first program in the *Trace* tab: the `Let` waits until its bound expression is a literal, then substitutes, and the arithmetic folds. The `?` marks make the branches of `If` and the body of `Let` lazy, so they are only evaluated once they are chosen.

Gordon Plotkin's **structural operational semantics** (1981) gave such step relations by inference rules,:cite[plotkin1981] and Matthias Felleisen's **reduction semantics** (1987) organised them around **evaluation contexts**.:cite[felleisen1987,felleisen-hieb1992] An evaluation context is a term with one hole $[\,]$ marking where the next step may happen:
$$ E ::= [\,] \mid \mathtt{Add}(E, e) \mid \mathtt{Add}(v, E) \mid \mathtt{If}(E, e, e) \mid \mathtt{Let}(X, E, e) \mid \cdots $$
where $v$ ranges over values (literals). The grammar says: evaluate the left argument of `Add` first, then the right one; evaluate the condition of `If` but not its branches; evaluate the bound expression of `Let` but not its body. A step is $E[r] \to E[r']$ for a reduction $r \to r'$.

In rewriting terms, evaluation contexts are a **strategy**. For these rules, leftmost-innermost reduction (with the lazy positions) contracts exactly the redex that the contexts allow:

:::proposition{status=sketched}
For the rules above, a leftmost-innermost step contracts the redex selected by the left-to-right, call-by-value evaluation contexts.
:::

:::proof
Innermost reduction contracts a redex only when its arguments contain no redexes, that is, when they are values (literals) or lazy. Among such redexes it picks the leftmost, so in `Add(a, b)` it finishes `a` before starting on `b`, and it never enters the lazy branches of an `If` or the body of a `Let`. That is the grammar of $E$, position by position.
:::

Switch the trace to *leftmost-outermost* and the same program evaluates in a different order (call by name) but to the same result. That is not an accident.

:::theorem{status=proved}
If a reduction semantics is confluent, every program has at most one result (normal form), whatever order of evaluation is used.
:::

:::proof
This is the first part of the theorem on convergent systems in Chapter 4: in a confluent system, a term has at most one normal form.
:::

Are the Pebble rules confluent? The two rules for `If` overlap at `If(Lit(0), a, b)`, but the second one only applies when $n \ne 0$: for conditional rules, a critical pair carries the conditions of both rules, and this one's condition, $0 \ne 0$, is false, so the overlap can never happen. (The course's confluence checker ignores conditions, so it would wrongly report this pair; tools for conditional rewriting do not.) The remaining rules do not overlap and are left-linear, so the semantics is deterministic by design, and an implementation is free to evaluate in any order, in parallel even, without changing results.

## A big-step interpreter

The second style is an **interpreter**: a function `Eval(e, env)` that takes a program and an **environment** (the values of its variables) and returns its value, recursively. Written as rules, with Girafe's priority:

```girafe title="An interpreter for Pebble" tools="run,trace"
#priority
Run(e) -> Eval(e, Empty)
Eval(Lit(n), env) -> Lit(n)
Eval(V(x), env) -> Lookup(x, env)
Eval(Add(a, b), env) -> Plus(Eval(a, env), Eval(b, env))
Eval(Mul(a, b), env) -> Times(Eval(a, env), Eval(b, env))
Eval(Lt(a, b), env) -> Less(Eval(a, env), Eval(b, env))
Eval(If(c, a, b), env) -> Branch(Eval(c, env), a, b, env)
Eval(Let(x, e, body), env) -> Eval(body, Bind(x, Eval(e, env), env))
Plus(Lit(a), Lit(b)) -> Lit(@add(a, b))
Times(Lit(a), Lit(b)) -> Lit(@mul(a, b))
Less(Lit(a), Lit(b)) -> if(@lt(a, b), Lit(1), Lit(0))
Branch(Lit(0), a, b, env) -> Eval(b, env)
Branch(Lit(n), a, b, env) -> Eval(a, env)
Lookup(x, Bind(y, v, env)) -> if(@equ(x, y), v, Lookup(x, env))
Lookup(x, Empty) -> Error(Unbound(x))
? Run(Let(X, Lit(3), Let(Y, Add(V(X), Lit(1)), Mul(V(X), V(Y)))))
? Run(If(Lt(Lit(2), Lit(1)), Lit(10), Lit(20)))
? Run(Add(V(Z), Lit(1)))
```

Here the program is **data**: the rules never rewrite `Add(…)` itself, only `Eval(Add(…), env)`. The environment is a list of bindings, and variables are looked up rather than substituted, which is how real interpreters avoid copying the body of a `Let`. The two semantics agree on every program (try the queries in both); proving that they always agree is a standard theorem about a language and its interpreter.

Notice how the interpreter's evaluation order comes from Girafe's innermost strategy: `Plus(Eval(a, env), Eval(b, env))` evaluates both arguments before `Plus` can match, and `Branch(Eval(c, env), a, b, env)` evaluates only the condition, because the branches are inside `Branch` as unevaluated data. The interpreter inherits call by value from its host, exactly as a Pebble interpreter written in OCaml would. An unbound variable produces a stuck term, `Plus(Error(Unbound(Z)), Lit(1))`: a normal form that is not a value, which is how rewriting semantics represent run-time errors.

```quiz
q: 'In the interpreter, why are the branches of `If` not evaluated before the condition?'
options:
  - text: 'The rule puts them inside `Branch` as program text (`a` and `b`), not as `Eval(a, env)`; only `Eval` makes things run.'
    correct: true
    why: 'Delaying evaluation by keeping code as data is the interpreter’s way of being lazy: no laziness annotations are needed.'
  - text: 'Because of the `?` laziness markers.'
    why: 'The interpreter has no `?` marks; those are in the small-step semantics.'
  - text: 'Because innermost evaluation is lazy.'
    why: 'Innermost evaluation is eager; it is the interpreter’s rules that keep the branches as data.'
```

## Semantics as executable specifications

Writing a semantics as rewrite rules gives an interpreter for free, and a semantics that can be *run* catches mistakes that a semantics on paper hides. The K framework (Grigore Roşu and colleagues) takes this to industrial scale: complete semantics of C, Java, JavaScript and the Ethereum virtual machine are written as rewrite rules in K, executed directly, and used to find bugs in compilers and smart contracts.:cite[rosu-serbanuta2010] Maude, based on rewriting logic (Chapter 30), plays the same role for concurrent systems.:cite[clavel2007]

```code
id: reduction-semantics/sequence-assign
title: A while loop
prompt: |
  Extend the interpreter with a loop. `While(c, body, X)` repeats: if `c` evaluates to `Lit(0)`, the loop ends and its value is the current value of the variable `X`; otherwise `body` is evaluated and its value becomes the new value of `X`, and the loop repeats. (Pebble has no assignment, so the loop updates a single variable `X`: `body` computes its next value.)

  For example, `Let(I, Lit(0), While(Lt(V(I), Lit(5)), Add(V(I), Lit(1)), I))` counts `I` up to `Lit(5)`.

  Export the complete rules as `source`; the tests run `Run(…)` with the reference engine.
starter: |
  export const source = `
  #priority
  Run(e) -> Eval(e, Empty)
  Eval(Lit(n), env) -> Lit(n)
  Eval(V(x), env) -> Lookup(x, env)
  Eval(Add(a, b), env) -> Plus(Eval(a, env), Eval(b, env))
  Eval(Mul(a, b), env) -> Times(Eval(a, env), Eval(b, env))
  Eval(Lt(a, b), env) -> Less(Eval(a, env), Eval(b, env))
  Eval(If(c, a, b), env) -> Branch(Eval(c, env), a, b, env)
  Eval(Let(x, e, body), env) -> Eval(body, Bind(x, Eval(e, env), env))
  Plus(Lit(a), Lit(b)) -> Lit(@add(a, b))
  Times(Lit(a), Lit(b)) -> Lit(@mul(a, b))
  Less(Lit(a), Lit(b)) -> if(@lt(a, b), Lit(1), Lit(0))
  Branch(Lit(0), a, b, env) -> Eval(b, env)
  Branch(Lit(n), a, b, env) -> Eval(a, env)
  Lookup(x, Bind(y, v, env)) -> if(@equ(x, y), v, Lookup(x, env))
  Lookup(x, Empty) -> Error(Unbound(x))
  `;
tests: |
  import { test, expect } from 'test';
  import { source } from 'solution';
  import { parseStrict, parseTerm, evaluate, fromProgram, show } from 'trs';

  const run = (q) => show(evaluate(fromProgram(parseStrict(source)), parseTerm(q), { fuel: 100000 }).term);
  test('counting to five', () => {
    expect(run('Run(Let(I, Lit(0), While(Lt(V(I), Lit(5)), Add(V(I), Lit(1)), I)))')).toBe('Lit(5)');
  });
  test('a loop that never runs', () => {
    expect(run('Run(Let(I, Lit(7), While(Lt(V(I), Lit(5)), Add(V(I), Lit(1)), I)))')).toBe('Lit(7)');
  });
  test('powers of two', () => {
    expect(run('Run(Let(P, Lit(1), While(Lt(V(P), Lit(1000)), Mul(V(P), Lit(2)), P)))')).toBe('Lit(1024)');
  });
  test('the old programs still work', () => {
    expect(run('Run(If(Lt(Lit(2), Lit(1)), Lit(10), Lit(20)))')).toBe('Lit(20)');
  });
solution: |
  export const source = `
  #priority
  Run(e) -> Eval(e, Empty)
  Eval(Lit(n), env) -> Lit(n)
  Eval(V(x), env) -> Lookup(x, env)
  Eval(Add(a, b), env) -> Plus(Eval(a, env), Eval(b, env))
  Eval(Mul(a, b), env) -> Times(Eval(a, env), Eval(b, env))
  Eval(Lt(a, b), env) -> Less(Eval(a, env), Eval(b, env))
  Eval(If(c, a, b), env) -> Branch(Eval(c, env), a, b, env)
  Eval(Let(x, e, body), env) -> Eval(body, Bind(x, Eval(e, env), env))
  Eval(While(c, body, x), env) -> Loop(Eval(c, env), c, body, x, env)
  Loop(Lit(0), c, body, x, env) -> Lookup(x, env)
  Loop(Lit(n), c, body, x, env) -> Eval(While(c, body, x), Bind(x, Eval(body, env), env))
  Plus(Lit(a), Lit(b)) -> Lit(@add(a, b))
  Times(Lit(a), Lit(b)) -> Lit(@mul(a, b))
  Less(Lit(a), Lit(b)) -> if(@lt(a, b), Lit(1), Lit(0))
  Branch(Lit(0), a, b, env) -> Eval(b, env)
  Branch(Lit(n), a, b, env) -> Eval(a, env)
  Lookup(x, Bind(y, v, env)) -> if(@equ(x, y), v, Lookup(x, env))
  Lookup(x, Empty) -> Error(Unbound(x))
  `;
hints:
  - 'Follow the pattern of `If`: `Eval(While(c, body, x), env) -> Loop(Eval(c, env), c, body, x, env)` evaluates the condition and keeps the rest as data.'
  - 'When the condition is non-zero, evaluate the body, bind the result to `x` (a new `Bind` in front shadows the old one), and evaluate the whole `While` again in the new environment.'
```

:::key
- A reduction semantics rewrites the program itself; evaluation contexts are a strategy, and innermost with lazy positions is call by value.
- A confluent semantics is deterministic: every evaluation order gives the same result.
- An interpreter keeps the program as data and uses environments; run-time errors are stuck terms. Semantics written as rules are executable (K, Maude).
:::

:::exercises
1. Write evaluation contexts for a right-to-left evaluation order, and change the rules or the strategy to match them.
2. Add `Div(a, b)` to both semantics, with division by zero producing a stuck term. Are the two semantics still in agreement?
3. Prove that the small-step rules terminate on every program (without `While`). Which measure works?
4. Make the interpreter call by name: bind a variable to the unevaluated expression and its environment (a **thunk**), and evaluate it on lookup. Which program shows the difference?
:::
