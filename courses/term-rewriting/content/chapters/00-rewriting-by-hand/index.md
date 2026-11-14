---
number: 0
title: Rewriting by hand
summary: Differentiate an expression, multiply two numbers and prove an identity about groups, all by the same move, replacing equals by equals, and write your first rules in Girafe.
duration: About 1 hour
theorems: [Equals may be replaced by equals]
techniques: [reading and writing rules]
---

In school algebra you learn a single trick and use it for years: if two things are equal, you may replace one by the other. To simplify $2(x + 0) \cdot 1$ you replace $x + 0$ by $x$, then $2x \cdot 1$ by $2x$. Nobody tells you which replacement to make first, and nobody needs to, because you always end up at $2x$.

This course is about that trick, made precise enough for a computer to carry out, and then studied as a subject in its own right. Each replacement is a **rewrite step**. A rule such as $x + 0 \to x$ says that any expression of the shape "something plus zero" may be replaced by the something. You keep rewriting until no rule applies; what is left is a **normal form**.

That one mechanism turns out to compute everything a computer can compute, to decide whether two expressions are equal in an algebra, to power the simplifiers inside computer-algebra systems and the optimisers inside compilers, and to give a precise meaning to programming languages. It also raises questions that have kept researchers busy for a century. Does the rewriting always stop? If you choose a different replacement first, do you still reach the same answer? If you only have equations, which way should you turn them into rules?

This prologue shows the mechanism at work on three problems and gives you the notation the rest of the course uses.

## Three problems, one move

### Differentiating

Here are the rules of differentiation, written as rewrite rules. `D(e)` stands for $\frac{d}{dX}e$, where `X` is the variable we differentiate by. The first six rules are calculus; the last six are the simplifications you would make by hand.

```girafe title="Differentiation and simplification" tools="run,trace"
#infixl 6 +
#infixl 7 *
D(X) -> 1
D(0) -> 0
D(1) -> 0
D(2) -> 0
D(u + v) -> D(u) + D(v)
D(u * v) -> D(u) * v + u * D(v)
0 * x -> 0
x * 0 -> 0
1 * x -> x
x * 1 -> x
0 + x -> x
x + 0 -> x
? D(X * X)
? D(2 * X + 1)
? D(X * X * X)
```

The box above is a **workbench**: the rules are live. The *Run* tab shows each query `? …` and its normal form. Switch to *Trace* to watch `D(X * X)` become `X + X` one step at a time: the highlighted subterm is the next one to be replaced.

The third query shows the limits of these rules. The derivative of $X^3$ comes out as $(X + X) \cdot X + X \cdot X$, which is correct but not what a person would write. To get $3 \cdot X \cdot X$ the rules would have to know that $+$ and $\cdot$ are associative and commutative, and those facts cannot simply be added as rules (Chapter 22 explains why, and what to do instead). The small computer-algebra system that begins here is the first of the course's three running threads.

### Computing

Numbers can be built from a constant `0` and a successor symbol `S`: $1$ is `S(0)`, $2$ is `S(S(0))`, and so on. Addition and multiplication then take four rules, each saying what to do with a zero and what to do with a successor:

```girafe title="Peano arithmetic" tools="run,trace"
#infixl 6 +
#infixl 7 *
0 + y -> y
S(x) + y -> S(x + y)
0 * y -> 0
S(x) * y -> y + x * y
? S(S(0)) * S(S(0))
```

The trace takes nine steps to reach `S(S(S(S(0))))`, which is $4$. These four rules are a program. They have no loops, no variables that change and no instructions; the "computation" is only the replacement of equals by equals. Chapter 6 shows that real programs (list functions, interpreters, even a compiler pass) look just like this, and the third running thread, a small programming language whose interpreter and optimiser are rewrite systems, starts in Part VIII.

### Proving

A **group** is a set with a product $\cdot$, a neutral element $e$ and inverses $x^{-1}$, satisfying three equations:

$$
(x \cdot y) \cdot z = x \cdot (y \cdot z), \qquad e \cdot x = x, \qquad x^{-1} \cdot x = e.
$$

Suppose you want to prove that $(a \cdot b^{-1})^{-1} = b \cdot a^{-1}$ in every group. A student would do it in a few clever lines. Chapter 19 will show how to turn the three equations into ten rewrite rules, mechanically, with the property that **two expressions are equal in every group exactly when they have the same normal form**. Proving the identity then takes no cleverness at all: rewrite both sides and compare.

```girafe title="The ten rules for groups (from Chapter 19)" tools="run,trace"
#infixl 7 *
E * x -> x
I(x) * x -> E
(x * y) * z -> x * (y * z)
I(x) * (x * z) -> z
x * E -> x
I(E) -> E
x * I(x) -> E
I(I(x)) -> x
x * (I(x) * z) -> z
I(x * y) -> I(y) * I(x)
? I(a * I(b)) == b * I(a)
? I(I(a) * I(b)) == b * a
? a * b == b * a
```

A query of the form `? s == t` asks whether the two sides have the same normal form. The first two are identities of group theory; the third is not (groups need not be commutative), and the two sides stay different. Here `I(x)` is $x^{-1}$ and `E` is $e$; `a` and `b` are variables, so each answer holds for all values of them. This is the second thread: an equational theorem prover, built in Part VI.

:::key
Three problems, one mechanism: find a subterm that matches the left-hand side of a rule, replace it by the corresponding right-hand side, repeat until no rule applies.
:::

## Your first rules

The rules in this course are written in the syntax of **Girafe**, a small rewriting language and compiler by Nathan Soufflet.:cite[girafe] A program is a list of rules, one per line:

```girafe static
-- a comment runs to the end of the line
Not(True) -> False
Not(False) -> True
And(True, x) -> x
And(False, x) -> False
```

The conventions are few:

- A name that starts with a **lower-case letter** is a **variable**: `x`, `y`, `tl`, `acc'`. A variable in a rule stands for any term.
- Every other name is a **function symbol**: `Not`, `True`, `S`, `0`, `+`, `:`, `Nil`. Symbols can be built from letters, digits and the characters `. - ~ + * & | / ^ % $ @ # ; : _ = ' > < !`, so `+`, `++` and `=>` are all names.
- A symbol applied to arguments is written with parentheses and commas: `And(x, Not(y))`. A symbol with no arguments, such as `True` or `0`, is a **constant**.
- `left -> right` is a rule. Every variable on the right must also appear on the left, so that the rule always knows what to put there.
- `? term` asks the workbench to evaluate a term; `? s == t` asks whether two terms have the same normal form.

The course adds a few extensions to Girafe, introduced when they are needed and collected in [Appendix B](/appendix/language/). The one you have already seen is `#infixl 6 +`, which declares `+` as a left-associative infix operator with precedence 6, so that `S(x) + y` may be written instead of `+(S(x), y)`. Both spellings stay valid and mean the same term. Infix operators need spaces around them, because `x+y` (without spaces) is a single name in Girafe.

```quiz
q: 'In the rule `Len(:(h, tl)) -> S(Len(tl))`, which names are variables?'
options:
  - text: '`h` and `tl`'
    correct: true
    why: 'They start with a lower-case letter. `Len`, `:` and `S` are function symbols.'
  - text: '`h`, `tl` and `:`'
    why: '`:` is a function symbol (it is the list constructor, often called cons). Only names starting with a lower-case letter are variables.'
  - text: '`Len` and `S`'
    why: 'Capitalised names are function symbols.'
  - text: 'All of them: the rule must work for any list.'
    why: 'The rule works for any list because `h` and `tl` are variables; the symbols are fixed.'
```

## You choose the redex

When several subterms could be rewritten, which one should go first? In the workbench below the strategy is set to *you choose*: every subterm that some rule can rewrite is outlined in the tree, and clicking one rewrites it. Try reaching the normal form of $(1 + 0) \cdot (0 + 1)$ in different orders.

```girafe title="Choose the redex yourself" tools="trace" strategy="manual"
#infixl 6 +
#infixl 7 *
0 + y -> y
S(x) + y -> S(x + y)
x + 0 -> x
0 * y -> 0
S(x) * y -> y + x * y
? (S(0) + 0) * (0 + S(0))
```

However you play, you end at `S(0)`. That is not luck: Chapter 16 proves that these rules can never lead to two different normal forms. Now delete the rule `x + 0 -> x` and add `x + 0 -> 0` instead. Some orders still give `S(0)`, others give `0`. A system where the order does not matter is called **confluent**, and deciding confluence is one of the central problems of the subject.

Here is the other central problem. Add the rule `x + y -> y + x` (addition is commutative, after all) and run the query again: the *Run* tab gives up after many thousands of steps, because the new rule can swap the two arguments back and forth for ever. A system in which rewriting always stops is called **terminating**. Part IV develops methods that prove termination for most systems that people write, and Part X proves that no method can work for all of them.

```numeric
id: rewriting-by-hand/peano-steps
title: Counting steps
prompt: 'Using the four Peano rules (without the rule `x + 0 -> x`), how many rewrite steps does it take to reduce `S(S(0)) * S(S(0))` to its normal form? (Use the *Trace* tab.)'
answer: 9
tolerance: 0
explain: 'Every strategy takes nine steps here: two uses of the second multiplication rule and one of the first, then six addition steps to compute 2 + (2 + 0). In general the count depends on the order chosen; Chapter 5 is about that.'
```

## How the course works

**Three threads.** Each part of the course has a home thread on which its ideas land: the computer-algebra system (Parts I–V and VII), the equational prover (Part VI) and the toy programming language (Parts VIII–X). They meet again in the epilogue.

**Your engine.** Exercises marked *Build your engine* ask you to implement a piece of a rewriting engine in TypeScript: terms and positions, matching, rewriting, strategies, hash-consing, indexing, decision trees, path orders, unification, critical pairs, completion, AC matching and union-find. Once your code passes its tests, it is kept, and later exercises run on your engine, with the course's reference implementation filling in whatever you have not written yet. The [Your engine](/engine/) page shows which pieces are yours and lets you switch any of them off.

**Proofs at the right depth.** Every theorem is labelled *proved* (in full, here), *sketched* (the main steps, with what is left out named) or *stated* (with a reference). Longer proofs open as an idea first; expand them as far as you like.

**Four ways through.** The home page lists four reading paths: for building the engine, for the theory, for applications and for semantics. Chapters marked ◇ are optional.

:::exercises
1. Add rules to the differentiation system for `D(e1 - e2)` and for a constant `3`, and check them on `D(3 * X - X)`.
2. Write rules for `Max(x, y)` on Peano numbers. (Hint: three rules suffice, two of them for the cases where one argument is `0`.)
3. In the group rules, use the trace to find the normal form of `I(a * b) * a`. Which rules fire, and in what order?
4. In the system `F(x) -> G(x, x)` and `A -> B`, list every term that `F(A)` can reach. How many normal forms are there, and how many steps does the shortest route take?
:::
