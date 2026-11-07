---
number: 26
title: Program transformation
summary: Desugaring, constant folding, dead-branch elimination and inlining for the toy language Pebble, written as rules and staged with strategies, and why conditional rules make the passes readable.
duration: About 1½ hours
prerequisites: [strategy-combinators]
theorems: [Substitution of a closed value cannot capture variables]
techniques: [writing compiler passes as rules]
---

A compiler is a pipeline of transformations: parse, desugar the convenient constructs into a small core, simplify, optimise, generate code. Most of the middle stages are naturally rewrite rules ("replace `x * 1` by `x`") applied according to a strategy ("everywhere, until nothing changes"). This chapter writes a small optimiser for Pebble in that style.

## Pebble

Pebble programs are terms built from:

| Construct | Meaning |
|---|---|
| `Lit(n)` | an integer literal |
| `V(X)` | a variable (variable names are constants: `X`, `Y`, `Count`…) |
| `Add(a, b)`, `Mul(a, b)`, `Lt(a, b)` | arithmetic and comparison (`Lt` gives `Lit(1)` or `Lit(0)`) |
| `If(c, a, b)` | `a` if `c` is non-zero, else `b` |
| `Let(X, e, body)` | evaluate `body` with `X` bound to the value of `e` |
| `Neg(e)`, `Sub(a, b)` | sugar: negation and subtraction |

Chapter 27 gives Pebble an interpreter, Chapter 28 adds functions. Here we only transform programs, without running them.

Note the representation of object-language variables: `V(X)` with `X` a *constant*, not a Girafe variable. The program's variables are data to the rewrite rules, which have their own variables (`a`, `b`, `e`, …) ranging over program fragments. Mixing the two levels up is the classic mistake when writing transformations as rules.

## The passes

Each pass is a set of labelled rules plus a strategy:

- **Desugaring** turns `Neg(e)` into `Sub(Lit(0), e)` and `Sub(a, b)` into `Add(a, Mul(Lit(-1), b))`, so that later passes only see the core language.
- **Constant folding and algebraic simplification** compute literal arithmetic and remove additions of zero and multiplications by one and zero.
- **Dead-branch elimination** replaces `If(Lit(n), a, b)` by `a` or `b`. The first case needs a condition: $n \ne 0$. A conditional rule says it directly; without conditions, it would need a rule for every non-zero literal, or an auxiliary symbol.
- **Inlining** replaces `Let(X, Lit(n), body)` by `body` with `Lit(n)` substituted for `V(X)`. Substitution is itself a set of rules, pushing a `Subst` node down the program.

```girafe title="A Pebble optimiser" tools="strategy"
[Neg] Neg(e) -> Sub(Lit(0), e)
[Sub] Sub(a, b) -> Add(a, Mul(Lit(-1), b))
[AddLit] Add(Lit(a), Lit(b)) -> Lit(@add(a, b))
[MulLit] Mul(Lit(a), Lit(b)) -> Lit(@mul(a, b))
[AddZero] Add(e, Lit(0)) -> e
[ZeroAdd] Add(Lit(0), e) -> e
[MulOne] Mul(e, Lit(1)) -> e
[MulZero] Mul(e, Lit(0)) -> Lit(0)
[ZeroMul] Mul(Lit(0), e) -> Lit(0)
[IfTrue] If(Lit(n), a, b) -> a if @neq(n, 0) ->* True
[IfFalse] If(Lit(0), a, b) -> b
[Inline] Let(x, Lit(n), body) -> Subst(body, x, Lit(n))
[SubVar] Subst(V(y), x, v) -> v if @equ(x, y) ->* True
[SubOther] Subst(V(y), x, v) -> V(y) if @equ(x, y) ->* False
[SubLit] Subst(Lit(n), x, v) -> Lit(n)
[SubAdd] Subst(Add(a, b), x, v) -> Add(Subst(a, x, v), Subst(b, x, v))
[SubMul] Subst(Mul(a, b), x, v) -> Mul(Subst(a, x, v), Subst(b, x, v))
[SubIf] Subst(If(c, a, b), x, v) -> If(Subst(c, x, v), Subst(a, x, v), Subst(b, x, v))
#strategy desugar = innermost(Neg <+ Sub)
#strategy subst = SubVar <+ SubOther <+ SubLit <+ SubAdd <+ SubMul <+ SubIf
#strategy simplify = AddLit <+ MulLit <+ AddZero <+ ZeroAdd <+ MulOne <+ MulZero <+ ZeroMul <+ IfTrue <+ IfFalse
#strategy optimise = desugar ; innermost(simplify <+ Inline <+ subst)
? Let(X, Lit(3), Add(Mul(V(X), V(Y)), Neg(Mul(Lit(0), V(Z)))))
? If(Sub(Lit(2), Lit(2)), V(A), Add(V(B), Lit(0)))
? Let(X, Lit(2), Let(Y, Add(V(X), Lit(1)), Mul(V(X), V(Y))))
```

Choose `optimise` in the *Strategy* tab. The first program becomes `Mul(Lit(3), V(Y))`: the variable `X` was inlined, the dead term `-(0 · Z)` was folded away, and the desugared subtraction disappeared with it. The second program's condition folds to `Lit(0)`, so the `If` picks its else-branch. The third gets stuck at a `Subst` node in front of a `Let`: the substitution rules do not know how to go inside a `Let`. That is your exercise below, and it has a trap.

```quiz
q: 'Why does the `optimise` strategy run `desugar` first, separately, instead of including `Neg <+ Sub` in the innermost loop?'
options:
  - text: 'It does not change the result here, but staging keeps each pass simple: after desugaring, the simplifier only ever sees the core language.'
    correct: true
    why: 'Including the sugar rules in the loop would also work for these rules. Staging matters when later rules would otherwise have to handle both the sugar and the core forms.'
  - text: 'Because innermost cannot apply two kinds of rules.'
    why: 'innermost(s) applies whatever s applies; s can be a choice of many rules.'
  - text: 'Because desugaring does not terminate inside innermost.'
    why: 'The desugaring rules terminate in any order.'
```

## Rules without strategies

Without strategies, a transformation written as plain rules must walk the program itself, with an explicit traversal function, and rely on priority for the "otherwise" cases:

```girafe static
#priority
Opt(Add(a, b)) -> FoldAdd(Opt(a), Opt(b))
Opt(Mul(a, b)) -> FoldMul(Opt(a), Opt(b))
Opt(e) -> e
FoldAdd(Lit(a), Lit(b)) -> Lit(@add(a, b))
FoldAdd(e, Lit(0)) -> e
FoldAdd(a, b) -> Add(a, b)
…
```

It works (it is what a functional programmer would write) but the traversal is tangled with the rules, every new construct needs a new `Opt` case, and a second pass needs a second traversal function. Strategies factor all of that out: the rules state facts about programs, and `innermost`, `topdown` and `;` say how to use them.

## Capture

Inlining substitutes a value for a variable, and substitution in a language with binders has a famous trap: **variable capture**. Substituting `V(Y)` for `X` in `Let(Y, Lit(1), Add(V(X), V(Y)))` naively gives `Let(Y, Lit(1), Add(V(Y), V(Y)))`, in which the free `Y` has been captured by the inner `Let`. The optimiser above only ever substitutes literals, which contain no variables, so it cannot capture.

:::proposition{status=proved}
Substituting a closed term (one with no free object-language variables, such as a literal) for a variable never captures.
:::

:::proof
Capture happens when a free variable of the substituted term ends up inside a binder for the same name. A closed term has no free variables.
:::

A shadowing binder still matters: substituting for `X` inside `Let(X, e, body)` must stop at the body, because the inner `X` is a different variable. Chapter 28 avoids names altogether, with de Bruijn indices.

## Your turn: inlining across `Let`

```code
id: program-transformation/subst-let
title: Substitution through a Let
prompt: |
  The starter contains the optimiser above. Add substitution rules for `Let` (and add them to the `subst` strategy) so that the third program optimises to `Lit(6)`. Respect shadowing: inside `Let(X, e, body)`, a substitution for `X` must reach `e` but not `body`.

  The tests run the strategy `optimise` with the reference engine.
starter: |
  export const source = `
  [Neg] Neg(e) -> Sub(Lit(0), e)
  [Sub] Sub(a, b) -> Add(a, Mul(Lit(-1), b))
  [AddLit] Add(Lit(a), Lit(b)) -> Lit(@add(a, b))
  [MulLit] Mul(Lit(a), Lit(b)) -> Lit(@mul(a, b))
  [AddZero] Add(e, Lit(0)) -> e
  [ZeroAdd] Add(Lit(0), e) -> e
  [MulOne] Mul(e, Lit(1)) -> e
  [MulZero] Mul(e, Lit(0)) -> Lit(0)
  [ZeroMul] Mul(Lit(0), e) -> Lit(0)
  [IfTrue] If(Lit(n), a, b) -> a if @neq(n, 0) ->* True
  [IfFalse] If(Lit(0), a, b) -> b
  [Inline] Let(x, Lit(n), body) -> Subst(body, x, Lit(n))
  [SubVar] Subst(V(y), x, v) -> v if @equ(x, y) ->* True
  [SubOther] Subst(V(y), x, v) -> V(y) if @equ(x, y) ->* False
  [SubLit] Subst(Lit(n), x, v) -> Lit(n)
  [SubAdd] Subst(Add(a, b), x, v) -> Add(Subst(a, x, v), Subst(b, x, v))
  [SubMul] Subst(Mul(a, b), x, v) -> Mul(Subst(a, x, v), Subst(b, x, v))
  [SubIf] Subst(If(c, a, b), x, v) -> If(Subst(c, x, v), Subst(a, x, v), Subst(b, x, v))
  #strategy desugar = innermost(Neg <+ Sub)
  #strategy subst = SubVar <+ SubOther <+ SubLit <+ SubAdd <+ SubMul <+ SubIf
  #strategy simplify = AddLit <+ MulLit <+ AddZero <+ ZeroAdd <+ MulOne <+ MulZero <+ ZeroMul <+ IfTrue <+ IfFalse
  #strategy optimise = desugar ; innermost(simplify <+ Inline <+ subst)
  `;
tests: |
  import { test, expect } from 'test';
  import { source } from 'solution';
  import { parseStrict, parseTerm, runStrategy, envFromProgram, show } from 'trs';

  const run = (q) => { const r = runStrategy('optimise', parseTerm(q), envFromProgram(parseStrict(source))); return r.term ? show(r.term) : r.error; };
  test('nested lets are inlined', () => {
    expect(run('Let(X, Lit(2), Let(Y, Add(V(X), Lit(1)), Mul(V(X), V(Y))))')).toBe('Lit(6)');
  });
  test('shadowing is respected', () => {
    expect(run('Let(X, Lit(1), Let(X, Lit(5), V(X)))')).toBe('Lit(5)');
    expect(run('Let(X, Lit(1), Add(Let(X, V(Z), V(X)), V(X)))')).toBe('Add(Let(X, V(Z), V(X)), Lit(1))');
  });
  test('the earlier examples still work', () => {
    expect(run('Let(X, Lit(3), Add(Mul(V(X), V(Y)), Neg(Mul(Lit(0), V(Z)))))')).toBe('Mul(Lit(3), V(Y))');
  });
solution: |
  export const source = `
  [Neg] Neg(e) -> Sub(Lit(0), e)
  [Sub] Sub(a, b) -> Add(a, Mul(Lit(-1), b))
  [AddLit] Add(Lit(a), Lit(b)) -> Lit(@add(a, b))
  [MulLit] Mul(Lit(a), Lit(b)) -> Lit(@mul(a, b))
  [AddZero] Add(e, Lit(0)) -> e
  [ZeroAdd] Add(Lit(0), e) -> e
  [MulOne] Mul(e, Lit(1)) -> e
  [MulZero] Mul(e, Lit(0)) -> Lit(0)
  [ZeroMul] Mul(Lit(0), e) -> Lit(0)
  [IfTrue] If(Lit(n), a, b) -> a if @neq(n, 0) ->* True
  [IfFalse] If(Lit(0), a, b) -> b
  [Inline] Let(x, Lit(n), body) -> Subst(body, x, Lit(n))
  [SubVar] Subst(V(y), x, v) -> v if @equ(x, y) ->* True
  [SubOther] Subst(V(y), x, v) -> V(y) if @equ(x, y) ->* False
  [SubLit] Subst(Lit(n), x, v) -> Lit(n)
  [SubAdd] Subst(Add(a, b), x, v) -> Add(Subst(a, x, v), Subst(b, x, v))
  [SubMul] Subst(Mul(a, b), x, v) -> Mul(Subst(a, x, v), Subst(b, x, v))
  [SubIf] Subst(If(c, a, b), x, v) -> If(Subst(c, x, v), Subst(a, x, v), Subst(b, x, v))
  [SubLetSame] Subst(Let(y, e, b), x, v) -> Let(y, Subst(e, x, v), b) if @equ(x, y) ->* True
  [SubLet] Subst(Let(y, e, b), x, v) -> Let(y, Subst(e, x, v), Subst(b, x, v)) if @equ(x, y) ->* False
  #strategy desugar = innermost(Neg <+ Sub)
  #strategy subst = SubVar <+ SubOther <+ SubLit <+ SubAdd <+ SubMul <+ SubIf <+ SubLetSame <+ SubLet
  #strategy simplify = AddLit <+ MulLit <+ AddZero <+ ZeroAdd <+ MulOne <+ MulZero <+ ZeroMul <+ IfTrue <+ IfFalse
  #strategy optimise = desugar ; innermost(simplify <+ Inline <+ subst)
  `;
hints:
  - 'Two rules, guarded like `SubVar` and `SubOther`: one when the `Let` binds the same name as the substitution, one when it binds a different name.'
  - 'Same name: substitute in the bound expression only, `Let(y, Subst(e, x, v), b)`. Different name: substitute in both.'
```

:::key
- Compiler passes are rule sets plus strategies: desugar, fold, simplify, eliminate dead branches, inline.
- Object-language variables are data (`V(X)`); rule variables range over program fragments.
- Conditional rules state side conditions directly. Substituting closed values cannot capture; binders still need care for shadowing.
:::

:::exercises
1. Add **strength reduction**: `Mul(e, Lit(2))` becomes `Add(e, e)`. Where in the pipeline should it go, and why could it hurt if placed before inlining?
2. Add **common subexpression elimination** for one simple case: `Add(e, e)` becomes `Let(T, e, Add(V(T), V(T)))`. What goes wrong if the name `T` is already used? How do compilers avoid it?
3. Write a pass that removes `Let(X, e, body)` when `V(X)` does not occur in `body` (dead code). It needs a condition that checks occurrence; write the occurrence check as rules.
4. Is the `simplify` rule set confluent as an unordered system? Use a workbench with the *Confluence* tab on the unlabelled rules.
:::
