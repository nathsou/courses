---
number: 9
title: Compiling rewrite rules
summary: Compile all the rules for a symbol into a decision tree that inspects each position of a term at most once, then generate JavaScript from the trees, as Girafe does, and race it against the interpreter.
duration: About 1½ hours
prerequisites: [indexing]
theorems: [Decision trees implement first-match semantics]
techniques: [running decision trees]
---

An interpreter re-reads the rules at every step: for each candidate rule it walks the pattern and the term together, and when the match fails it starts again with the next rule, often re-inspecting the same positions. A compiler reads the rules once, ahead of time, and produces code that does only the necessary tests. This chapter compiles rewrite systems the way functional-language compilers compile pattern matching, and then all the way to JavaScript. It follows Girafe, which compiles rules to JavaScript, OCaml or Haskell through exactly these decision trees.:cite[girafe]

Throughout, systems are constructor systems in Girafe style: rules are tried **in order** (priority), left-hand sides are linear, and evaluation is innermost, so the arguments of a defined symbol are already normal forms when its rules are tried.

## Matching many patterns at once

Consider the rules for merging two lists:

```girafe static
Merge(Nil, ys) -> ys
Merge(xs, Nil) -> xs
Merge(:(x, xs), :(y, ys)) -> :(x, :(y, Merge(xs, ys)))
```

Trying them one by one on `Merge(:(1, a), :(2, b))` inspects the first argument (not `Nil`, so rule 1 fails), then the second (not `Nil`, so rule 2 fails), then the first again and the second again for rule 3. A **decision tree** asks each question once:

```girafe static
switch x1
  case Nil:  rule 1
  case ::    switch x2
               case Nil: rule 2
               case ::   rule 3
               default:  no rule
  default:   switch x2
               case Nil: rule 2
               default:  no rule
```

Here `x1` and `x2` are the arguments and `x1.2` would be the second argument of the first argument (positions, as in Chapter 1). The `default` branches handle a term built from a symbol that no rule mentions, such as `Merge(Foo, Nil)`: with priority semantics and no rule matching, the term is a normal form.

## Compiling a clause matrix

Luc Maranget's algorithm builds such trees from a **clause matrix**: one row per rule, one column per position still to be tested, and in each cell the pattern found there.:cite[maranget2008] It works column by column.

:::algorithm[Compiling a decision tree]
Given a list of positions $o_1, \ldots, o_m$ and a matrix of pattern rows (each with its rule number):

1. If there are no rows, return **fail** (no rule applies).
2. If the first row contains only variables, return a **leaf** for its rule: it matches whatever the remaining positions hold. Earlier rows are already ruled out by the path taken, later rows have lower priority.
3. Otherwise choose a column $i$ in which the first row has a symbol. For each constructor $c$ of arity $k$ appearing in column $i$, build the **specialised** matrix: keep the rows with $c$ in column $i$, replacing that cell by $c$'s $k$ argument patterns, and the rows with a variable there, replacing it by $k$ wildcards; the positions become $o_i.1, \ldots, o_i.k$ followed by the others. Build also the **default** matrix: the rows with a variable in column $i$, with the column removed. Return a **switch** on $o_i$ with one branch per constructor and a default branch, compiled recursively.
:::

:::theorem{status=sketched}
For linear patterns, the tree tests each position at most once along any path, and for every term it selects the first rule (in order) whose left-hand side matches, or none if no rule matches.
:::

:::proof
Each switch tests a position $o_i$ and removes it from the list (replacing it by its sub-positions), so no path tests a position twice. For correctness, induction on the size of the matrix: a row survives into the branch for $c$ exactly when its cell in column $i$ is $c(\ldots)$ or a variable, which is exactly when it can still match a term with $c$ at $o_i$; the default branch keeps exactly the rows with a variable there. Row order is preserved in every sub-matrix, so the first row that reaches an all-variable state is the first rule that matches. Linearity is needed in step 2: a variable occurring twice would require an equality test that the tree does not perform.
:::

Which column to choose in step 3 does not affect correctness, but it affects the size of the tree and the number of tests. Maranget studies heuristics, such as preferring columns in which more rows have a constructor ("necessity"). Girafe uses such a heuristic; the course's compiler simply takes the first suitable column.

## From trees to JavaScript

With a decision tree per defined symbol, code generation is direct. Each defined symbol becomes a JavaScript function of its arguments; terms are objects `{ n: name, a: args }`. A switch becomes a chain of `if` tests on `.n`, a leaf returns the right-hand side, and in the right-hand side every defined symbol becomes a **function call**. That last point is where innermost evaluation pays off: a call evaluates its arguments first, exactly like JavaScript, so the host language's call stack does the rewriting.

::compile-view{rules="#priority\nFib(0) -> 0\nFib(S(0)) -> S(0)\nFib(S(S(n))) -> Fib(S(n)) + Fib(n)\n0 + y -> y\nS(x) + y -> S(x + y)\n#infixl 6 +" query="Fib(S(S(S(S(S(S(S(S(S(S(S(S(S(S(S(S(S(0))))))))))))))))))"}

On Peano arithmetic the compiled code is typically tens of times faster than the interpreter in your browser (the widget measures it, so the number you see is real). Externals become JavaScript arithmetic on big integers, and the built-in `if` becomes a conditional expression whose branches are evaluated only when chosen.

Real compilers for rewriting go further. The ASF+SDF compiler and Maude both compile matching and use sharing (Chapter 7); lazy rewriting can be compiled to eager code by the transformation of Fokkink, Kamperman and Walters, which Girafe implements as a compiler pass;:cite[fokkink2000] and tail calls must be turned into loops, or deep recursions overflow the stack (Girafe does this too).

```quiz
q: 'Why does the compiler require left-linear rules?'
options:
  - text: 'A repeated variable needs an equality test between two subterms, and a decision tree only tests the symbol at each position.'
    correct: true
    why: 'Girafe handles non-linear rules with a separate pass that left-linearises them, turning `Eq(x, x) -> True` into `Eq(x, y) -> True` guarded by an equality test.'
  - text: 'Because non-linear rules are not confluent.'
    why: 'Linearity and confluence are different properties; non-linear systems can be confluent.'
  - text: 'Because JavaScript has no structural equality.'
    why: 'Equality can be written as a function; the problem is that the decision tree has no node for it.'
```

## Running a decision tree

The trees in the reference engine have three kinds of node: `{ k: 'fail' }`, `{ k: 'leaf', rule, bindings }` and `{ k: 'switch', occ, cases, default }`, where `occ` is a position (an array whose first element is the argument index) and each case is `{ ctor, arity, tree }`. Write the function that runs one.

```code
id: compiling/run-tree
title: Running a decision tree
provides: [treeTests]
prompt: |
  Write `treeTests(tree, args)`, which follows a decision tree on the arguments `args` of a defined symbol and returns `{ rule, tests }`: the index of the selected rule (or `null` at a `fail` node) and the number of `switch` nodes visited.

  At a switch, the tested subterm is `args[occ[0]]`, then its argument `occ[1]`, and so on. Take the case whose `ctor` and `arity` equal the subterm's name and number of arguments; if there is none (or the subterm is a variable), take `default`.
starter: |
  import type { DTree, Term } from 'trs';

  export function treeTests(tree: DTree, args: readonly Term[]): { rule: number | null; tests: number } {
    return { rule: null, tests: 0 };
  }
tests: |
  import { test, expect } from 'test';
  import { treeTests } from 'solution';
  import { decisionTree, rules, term } from 'trs';

  const merge = rules('Merge(Nil, ys) -> ys\nMerge(xs, Nil) -> xs\nMerge(:(x, xs), :(y, ys)) -> :(x, :(y, Merge(xs, ys)))');
  const T = decisionTree(merge, 2);
  const run = (a, b) => treeTests(T, [term(a), term(b)]);
  test('first rule', () => {
    expect(run('Nil', ':(A, Nil)')).toEqual({ rule: 0, tests: 1 });
  });
  test('second and third rules', () => {
    expect(run(':(A, Nil)', 'Nil')).toEqual({ rule: 1, tests: 2 });
    expect(run(':(A, Nil)', ':(B, Nil)')).toEqual({ rule: 2, tests: 2 });
  });
  test('the default branch', () => {
    expect(run('Foo', 'Nil')).toEqual({ rule: 1, tests: 2 });
    expect(run('Foo', 'Bar')).toEqual({ rule: null, tests: 2 });
    expect(run('x', 'y')).toEqual({ rule: null, tests: 2 });
  });
  test('nested positions', () => {
    const R = rules('F(S(S(n))) -> Two\nF(S(0)) -> One\nF(0) -> Zero');
    const t = decisionTree(R, 1);
    expect(treeTests(t, [term('S(S(S(0)))')])).toEqual({ rule: 0, tests: 2 });
    expect(treeTests(t, [term('S(0)')])).toEqual({ rule: 1, tests: 2 });
    expect(treeTests(t, [term('0')]).rule).toBe(2);
  });
solution: |
  import type { DTree, Term } from 'trs';

  export function treeTests(tree: DTree, args: readonly Term[]): { rule: number | null; tests: number } {
    let tests = 0;
    let t = tree;
    for (;;) {
      if (t.k === 'fail') return { rule: null, tests };
      if (t.k === 'leaf') return { rule: t.rule, tests };
      let u = args[t.occ[0]];
      for (const i of t.occ.slice(1)) u = (u as Extract<Term, { type: 'fn' }>).args[i];
      tests++;
      const c = u.type === 'fn' ? t.cases.find((x) => x.ctor === u.name && x.arity === u.args.length) : undefined;
      t = c ? c.tree : t.default;
    }
  }
hints:
  - 'A loop over the tree is enough: no recursion needed. Count one test per switch node.'
  - 'Positions inside a switch always exist, because the switch above them checked the constructors on the way down.'
```

:::key
- A decision tree tests each position at most once and selects the first matching rule.
- Maranget's algorithm specialises a clause matrix one column at a time; the column choice changes size, not meaning.
- With innermost evaluation, rules compile to ordinary functions: defined symbols become calls, and the host language's evaluation order does the rest.
:::

:::exercises
1. Build by hand the decision tree for `And(True, True) -> True`, `And(x, y) -> False`. How many tests does `And(False, True)` take? What would a smarter column choice change?
2. Find a set of rules for which choosing a different first column gives an exponentially smaller tree. (Hint: many columns, each relevant to one rule.)
3. Left-linearise `Eq(x, x) -> True`, `Eq(x, y) -> False` into linear rules plus a test, as Girafe's pass does, and compile the result.
4. The generated code recurses once per nested call. Which of the list programs of Chapter 6 overflow the stack for long lists, and how would tail calls help?
:::
