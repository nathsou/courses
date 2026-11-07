---
number: 6
title: Programming with rules
summary: Constructors and defined symbols, priority, built-in arithmetic, conditional rules and laziness, then the algebra system’s first simplifier and derivative.
duration: About 1½ hours
prerequisites: [strategies]
theorems: [Constructor systems as functional programs]
techniques: [writing Girafe programs]
---

Chapter 0 claimed that four Peano rules are a program. This chapter takes the claim seriously. Rewrite rules are a complete programming language: functional, with pattern matching, and without loops or assignment. Girafe was designed as exactly that, a small rule language that other languages can be compiled to.:cite[girafe] We look at how programs are written in it, at the few extensions that make programming comfortable (priority, built-in numbers, conditions, laziness), and at what they mean for the theory. Then we start the computer-algebra system.

## Constructors and defined symbols

In the Peano rules, `0` and `S` never appear at the root of a left-hand side: no rule ever rewrites them. They build values. `+` and `*` do appear there: they are computed away.

:::definition[Constructor system]
In a system $R$, the **defined symbols** are the root symbols of left-hand sides; all others are **constructors**. A **constructor term** contains only constructors and variables. $R$ is a **constructor system** if every left-hand side has the form $f(t_1, \ldots, t_n)$ with $f$ defined and every $t_i$ a constructor term.
:::

Constructor systems are what functional programmers write. A defined symbol is a function, its rules are the clauses of a definition by pattern matching, and constructor terms are data. Lists are built from `Nil` and the binary `:` ("cons"), so `:(A, :(B, Nil))` is the list $[A, B]$:

```girafe title="Lists" tools="run,trace"
Append(Nil, ys) -> ys
Append(:(x, xs), ys) -> :(x, Append(xs, ys))
Rev(Nil) -> Nil
Rev(:(x, xs)) -> Append(Rev(xs), :(x, Nil))
Map(f, Nil) -> Nil
Map(f, :(x, xs)) -> :(Ap(f, x), Map(f, xs))
Ap(Twice, x) -> Pair(x, x)
? Rev(:(A, :(B, :(C, Nil))))
? Map(Twice, :(A, :(B, Nil)))
```

`Map` takes a "function" as an argument by naming it with a constructor (`Twice`) and applying it with an explicit `Ap` symbol: there are no lambdas in first-order rewriting, but this **defunctionalised** style recovers higher-order programming. Compilers from functional languages to rewriting, such as Croco to Girafe, produce exactly this.

A function is **completely defined** if every ground term $f(c_1, \ldots, c_n)$ with constructor-term arguments is reducible. `Rev` is completely defined on lists; `Append` would not be if it lacked its `Nil` rule. When every defined symbol is completely defined (the system is **sufficiently complete**) and the system is terminating and confluent, the normal form of every ground term is a constructor term: every computation returns a value.

## Priority

Girafe tries rules **in order**, and the first one that matches wins. That allows a catch-all rule at the end:

```girafe static
IsZero(0) -> True
IsZero(x) -> False
```

As an unordered set, these two rules overlap (`IsZero(0)` matches both) and the system is not confluent: `IsZero(0)` rewrites to `True` and to `False`. With priority it is a perfectly good definition. In this course a rule file is an unordered set, as in the theory, unless it contains the pragma `#priority`, which switches to Girafe's semantics.

```girafe title="With and without #priority" tools="run,trace"
#priority
IsZero(0) -> True
IsZero(x) -> False
? IsZero(0)
? IsZero(S(0))
```

Delete the `#priority` line and use *Trace* with strategy *you choose*: `IsZero(0)` now has two redexes at the root. Priority is a **strategy** in the sense of Chapter 5, a rule for choosing among redexes, and like every strategy it can make a non-confluent system behave deterministically. Its theory is subtler than it looks (a lower-priority rule is supposed to fire only if no higher one could *ever* apply, even after the arguments are rewritten), but with innermost evaluation the arguments are already normal forms, and "first rule that matches" is exactly right.

Priority is convenient, but it hides overlaps that the confluence tools of Part V would otherwise report. When a system must be confluent as a set (a simplifier whose rules are applied in any order, or rules used for proofs), write the complementary cases explicitly instead.

## Built-in numbers and conditions

Peano numerals are good for theory and terrible for computing: $1000$ is a term of size 1001. Girafe has **externals**, symbols starting with `@` that compute on integer constants: `@add(2, 3)` rewrites to `5`, `@lt(2, 3)` to `True`. The full list is in Appendix B. There is also a built-in `if(c, a, b)`, which rewrites to `a` or `b` once `c` is `True` or `False`, and whose branches are evaluated only after the condition has been decided.

```girafe title="Built-in arithmetic" tools="run"
#priority
Fact(0) -> 1
Fact(n) -> @mul(n, Fact(@sub(n, 1)))
Fib(n) -> if(@lt(n, 2), n, @add(Fib(@sub(n, 1)), Fib(@sub(n, 2))))
Len(Nil) -> 0
Len(:(_, tl)) -> @add(Len(tl), 1)
? Fact(25)
? Fib(20)
? Len(:(A, :(B, :(C, Nil))))
```

`_` is a variable that is never used; each `_` is a different variable. Integers are arbitrary-precision, so `Fact(25)` is exact. `Fib(20)` takes almost 100,000 rewrite steps, because the naive definition recomputes the same values over and over; Chapter 7 makes it fast without changing the rules.

A **conditional rule** applies only when its conditions hold for the matched instance. The course writes `l -> r if s ->* t`, which holds when the normal form of $s$ (instantiated) is an instance of $t$, and `if s == t`, which holds when both sides have the same normal form:

```girafe title="Conditional rules" tools="run"
Max(x, y) -> x if @ge(x, y) ->* True
Max(x, y) -> y if @lt(x, y) ->* True
Insert(x, Nil) -> :(x, Nil)
Insert(x, :(y, ys)) -> :(x, :(y, ys)) if @le(x, y) ->* True
Insert(x, :(y, ys)) -> :(y, Insert(x, ys)) if @gt(x, y) ->* True
Sort(Nil) -> Nil
Sort(:(x, xs)) -> Insert(x, Sort(xs))
? Max(3, 8)
? Sort(:(5, :(1, :(4, :(2, Nil)))))
```

Conditional rewriting is a large subject of its own (evaluating a condition is itself rewriting, so termination and confluence become entangled); here conditions are just a convenience.

## Laziness

Girafe's `?` marks laziness. On a left-hand side, `If(True, a?, b?) -> a` declares that the second and third arguments of `If` are **lazy**: innermost evaluation leaves them alone until a rule has been chosen. On a right-hand side, `t?` **freezes** `t`: it is not evaluated until a match needs to look inside it. With a frozen tail, a list can be infinite:

```girafe title="An infinite list" tools="run,trace"
#priority
Nats(n) -> :(n, Nats(@add(n, 1))?)
Take(0, xs) -> Nil
Take(n, :(x, xs)) -> :(x, Take(@sub(n, 1), xs))
? Take(5, Nats(0))
```

`Nats(0)` would never terminate under innermost evaluation, since its normal form would be the infinite list $0, 1, 2, \ldots$. The freeze stops evaluation at the tail; when `Take` matches its second rule, it needs the argument to be a `:`, so the frozen tail is thawed by exactly one step. This is laziness simulated inside an innermost engine, the subject of Fokkink, Kamperman and Walters's *Lazy rewriting on eager machinery*, which Girafe follows.:cite[fokkink2000]

## The algebra system, version 1

Now the first version of the computer-algebra system that runs through Parts I–VII. Expressions are built from numbers `N(k)` (wrapping an integer, so that rules can tell numbers from other symbols), the variable `X`, and `+` and `*`. The rules fold constants, apply the identities for 0 and 1, and differentiate.

```girafe title="The algebra system, version 1" tools="run,trace"
#priority
#infixl 6 +
#infixl 7 *
N(a) + N(b) -> N(@add(a, b))
N(a) * N(b) -> N(@mul(a, b))
N(0) + x -> x
x + N(0) -> x
N(0) * x -> N(0)
x * N(0) -> N(0)
N(1) * x -> x
x * N(1) -> x
x + x -> N(2) * x
D(X) -> N(1)
D(N(k)) -> N(0)
D(u + v) -> D(u) + D(v)
D(u * v) -> D(u) * v + u * D(v)
? D(X * X)
? D(X * X * X)
? D(N(3) * X * X + N(5) * X + N(7))
```

The derivative of $X^2$ comes out as $2X$, a real improvement on Chapter 0. The other two are correct but not simplified: $X^3$ gives `N(2) * X * X + X * X` rather than $3X^2$, and $3X^2 + 5X + 7$ gives `N(2) * (N(3) * X) + N(5)` rather than $6X + 5$. The rules cannot regroup products or collect like terms, because that needs associativity and commutativity. Adding `x * y -> y * x` would make the system loop. Over the next chapters the algebra system will be made fast (Part III), proved terminating (Part IV) and confluent (Part V), and finally taught associativity and commutativity properly (Part VII).

```code
id: programming-with-rules/reverse
title: Reversal in linear time
prompt: |
  `Rev` above takes quadratic time: reversing a list of length $n$ makes $O(n^2)$ steps, because each `Append` walks the whole reversed prefix. Write rules for a `Rev` that takes linear time, using an accumulator: `Rev(xs) -> RevAcc(xs, Nil)`.

  Export your rules as a string named `source`. The tests run them with the reference engine on lists of 1,000 elements and count the steps.
starter: |
  export const source = `
  Rev(Nil) -> Nil
  Rev(:(x, xs)) -> Append(Rev(xs), :(x, Nil))
  Append(Nil, ys) -> ys
  Append(:(x, xs), ys) -> :(x, Append(xs, ys))
  `;
tests: |
  import { test, expect } from 'test';
  import { source } from 'solution';
  import { parseStrict, evaluate, fromProgram, term, show, f } from 'trs';

  const list = (n) => { let t = f('Nil'); for (let i = n; i >= 1; i--) t = f(':', f(String(i)), t); return t; };
  const sys = () => fromProgram(parseStrict(source));
  test('reverses a short list', () => {
    expect(show(evaluate(sys(), term('Rev(:(A, :(B, :(C, Nil))))')).term)).toBe(':(C, :(B, :(A, Nil)))');
    expect(show(evaluate(sys(), term('Rev(Nil)')).term)).toBe('Nil');
  });
  test('reverses 1,000 elements in linear time', () => {
    const r = evaluate(sys(), f('Rev', list(1000)), { fuel: 100000 });
    expect(r.normal).toBe(true);
    expect(show(r.term).startsWith(':(1000, :(999,')).toBe(true);
    expect(r.steps).toBeLessThan(2100);
  });
solution: |
  export const source = `
  Rev(xs) -> RevAcc(xs, Nil)
  RevAcc(Nil, acc) -> acc
  RevAcc(:(x, xs), acc) -> RevAcc(xs, :(x, acc))
  `;
hints:
  - '`RevAcc(xs, acc)` should mean “the reverse of xs, followed by acc”.'
  - 'Moving the head of `xs` onto the front of `acc` is one step per element.'
```

```code
id: programming-with-rules/cas-fold
title: Teach the algebra system to regroup
prompt: |
  Add rules to the algebra system (given in the starter) so that the derivative of $3X^2 + 5X + 7$ simplifies all the way to `N(6) * X + N(5)` and the derivative of $X \cdot X \cdot X$ to `N(3) * (X * X)`. Keep `#priority`.

  Hints are available, but try first: the two missing facts are about multiplying a number by a product that starts with a number, and about adding `x` to a multiple of `x`.
starter: |
  export const source = `
  #priority
  #infixl 6 +
  #infixl 7 *
  N(a) + N(b) -> N(@add(a, b))
  N(a) * N(b) -> N(@mul(a, b))
  N(0) + x -> x
  x + N(0) -> x
  N(0) * x -> N(0)
  x * N(0) -> N(0)
  N(1) * x -> x
  x * N(1) -> x
  x + x -> N(2) * x
  D(X) -> N(1)
  D(N(k)) -> N(0)
  D(u + v) -> D(u) + D(v)
  D(u * v) -> D(u) * v + u * D(v)
  `;
tests: |
  import { test, expect } from 'test';
  import { source } from 'solution';
  import { parseStrict, evaluate, fromProgram, parseTerm, show } from 'trs';

  const run = (q) => {
    const p = parseStrict(source);
    return show(evaluate(fromProgram(p), parseTerm(q, p.fixity), { fuel: 100000 }).term, p.fixity);
  };
  test('3X² + 5X + 7 differentiates to 6X + 5', () => {
    expect(run('D(N(3) * X * X + N(5) * X + N(7))')).toBe('N(6) * X + N(5)');
  });
  test('X³ differentiates to 3X²', () => {
    expect(run('D(X * X * X)')).toBe('N(3) * (X * X)');
  });
  test('the old results still hold', () => {
    expect(run('D(X * X)')).toBe('N(2) * X');
    expect(run('N(2) * N(3) + N(4)')).toBe('N(10)');
  });
solution: |
  export const source = `
  #priority
  #infixl 6 +
  #infixl 7 *
  N(a) + N(b) -> N(@add(a, b))
  N(a) * N(b) -> N(@mul(a, b))
  N(0) + x -> x
  x + N(0) -> x
  N(0) * x -> N(0)
  x * N(0) -> N(0)
  N(1) * x -> x
  x * N(1) -> x
  N(a) * (N(b) * x) -> N(@mul(a, b)) * x
  (N(a) * x) * y -> N(a) * (x * y)
  x * (N(a) * y) -> N(a) * (x * y)
  N(a) * x + x -> N(@add(a, 1)) * x
  x + N(a) * x -> N(@add(a, 1)) * x
  x + x -> N(2) * x
  D(X) -> N(1)
  D(N(k)) -> N(0)
  D(u + v) -> D(u) + D(v)
  D(u * v) -> D(u) * v + u * D(v)
  `;
hints:
  - 'For 6X: `N(a) * (N(b) * x) -> N(@mul(a, b)) * x`.'
  - 'For 3X²: the derivative produces `N(2) * X * X + X * X`, that is `(N(2) * X) * X + X * X`. Regroup a product that starts with a number, `(N(a) * x) * y -> N(a) * (x * y)`, then add a multiple of x to x with `N(a) * x + x -> N(@add(a, 1)) * x`.'
```

:::key
- Constructor systems are functional programs: defined symbols are functions, constructor terms are values.
- `#priority` makes the first matching rule win: a strategy that hides overlaps.
- Externals compute on integers; `if` evaluates its branches lazily; conditions guard rules; `t?` freezes a term until a match needs it.
- The algebra system can fold constants and differentiate, but needs associativity and commutativity to collect like terms.
:::

:::exercises
1. Write `Filter(p, xs)` in the defunctionalised style, with `Ap(IsEven, n)` defined by rules on integers.
2. Is the list system at the top of the chapter a constructor system? Is it confluent as an unordered set? Reason it out now, and check your answer with the *Confluence* tab of the workbenches in Chapter 16.
3. Write `Primes`, the infinite list of primes, with a lazy sieve: `Sieve(:(p, xs)) -> :(p, Sieve(Filter(…, xs))?)`.
4. Show that a rule `l -> r if s ->* t` with variables in $t$ that are not in $l$ can bind them for use in $r$. Write `DivMod(x, y)` returning a pair and use it in a conditional rule this way.
:::
