---
number: 24
title: Equality saturation
summary: Apply every rule everywhere, never destructively, until nothing changes, then extract the cheapest term. A peephole optimiser that cannot get the phase order wrong, and the algebra system’s simplest form.
duration: About 1½ hours
prerequisites: [e-graphs]
theorems: [Saturation reaches every term provable by the rules, Extraction by tree cost is optimal]
techniques: [writing optimisation rules]
---

With an e-graph in hand, rewriting changes character. Rules no longer replace terms; they add equalities. Rules no longer need to terminate or be confluent; commutativity is just another rule. And the question "which rule first?" disappears, because every rule is applied everywhere. This approach is called **equality saturation**. Ross Tate, Michael Stepp, Zachary Tatlock and Sorin Lerner named it in 2009 for compiler optimisation,:cite[tate2009] building on the Denali superoptimiser of Joshi, Nelson and Randall,:cite[joshi2002] and the egg library of 2021 made it fast and easy to use.:cite[willsey2021]

## The loop

:::algorithm[Equality saturation]
Add the input term to an empty e-graph. Then repeat:

1. **Read:** find every match of every rule's left-hand side, by e-matching.
2. **Write:** for each match, add the corresponding instance of the right-hand side and merge its class with the matched class.
3. **Rebuild** the e-graph (Chapter 23).

Stop when an iteration merges nothing (the e-graph is **saturated**), or a limit on iterations or nodes is reached, or a goal is met. Finally **extract** a best term from the input's class.
:::

Doing all reads before any writes (as egg does) makes each iteration independent of the order in which rules are tried: the result of an iteration is determined by the e-graph at its start.

:::proposition{status=sketched}
If saturation stops because the e-graph is saturated, the input's class contains every term that the rules (used as equations, left to right and closed under congruence) can prove equal to the input. Without saturation, it contains every term reachable within the iterations performed.
:::

:::proof
Every rule application performed by ordinary rewriting from any term in the e-graph corresponds to a match found in some iteration, and the instance of the right-hand side is then added to the same class; congruence closure takes care of applications inside contexts. At saturation no rule application produces anything new, so the set of represented terms is closed under the rules.
:::

So a saturated e-graph is a complete, compact answer to "what is this equal to, according to these rules?" Saturation may never happen (associativity and commutativity together generate exponentially many forms of a long sum, and some rule sets generate infinitely many), so in practice the limits matter, and they make equality saturation a heuristic: it finds the best term among those it had time to discover.

## Extraction

Which term to return? Give each symbol a cost; the cost of a term is computed from its nodes, here the total number of nodes (its AST size), and extraction picks a cheapest term in the root class.

:::proposition{status=proved}
For a cost function that adds the costs of the children to the cost of the symbol (such as AST size), the bottom-up fixpoint "the best cost of a class is the minimum over its e-nodes of the node's cost plus its children's best costs" computes an optimal term for every class.
:::

:::proof
The fixpoint iteration only lowers costs and every cost it assigns is achieved by an actual term; it stops when no class can improve. A cheapest term $t = f(t_1, \ldots, t_n)$ in a class has cheapest children (otherwise replacing a child by a cheaper equal term would lower its cost), so by induction on the size of $t$ its cost is found.
:::

For cost functions that charge only once for a shared subterm (the size of a DAG, which is what a compiler pays for when it reuses a computed value), extraction is NP-hard in general, and real tools use integer linear programming or heuristics.

## A peephole optimiser

Here is a peephole optimiser for integer expressions. It knows that $x \cdot 2$ and $x \ll 1$ are interchangeable, that multiplication commutes and distributes, and that $(x \cdot y)/z = x \cdot (y / z)$. As a destructive rewrite system it would loop (commutativity) and depend on the order of rules (shifts against division). Run *Saturate*:

```girafe title="A peephole optimiser" tools="saturate"
*(x, 2) -> <<(x, 1)
<<(x, 1) -> *(x, 2)
/(*(x, y), z) -> *(x, /(y, z))
/(x, x) -> 1
*(x, 1) -> x
*(x, y) -> *(y, x)
+(x, 0) -> x
+(x, x) -> *(x, 2)
*(x, +(y, z)) -> +(*(x, y), *(x, z))
+(*(x, y), *(x, z)) -> *(x, +(y, z))
? /(*(a, 2), 2)
? /(*(2, a), 2)
? +(*(a, b), *(a, c))
? +(+(a, a), 0)
```

All four come out as expected: $(a \cdot 2)/2$ and $(2 \cdot a)/2$ become $a$ (commutativity found the second), $ab + ac$ is factored, and $(a + a) + 0$ becomes $a + a$, one of the cheapest forms (with AST size, $a + a$, $a \cdot 2$ and $a \ll 1$ tie). The first two queries hit the iteration limit rather than saturating: commutativity and the two directions of distributivity keep generating new forms, but the answer is found early. Change the cost model in your head: if shifts were cheaper than multiplications, extraction would prefer $a \ll 1$.

Equality saturation is used in production. Herbie rewrites floating-point expressions to make them more accurate, searching a space of algebraically equal forms;:cite[panchekha2015] egglog combines e-graphs with Datalog so that rules can compute analyses (such as "this value is a constant") while they rewrite;:cite[zhang2023] and compilers for machine learning and for hardware use e-graphs to search for better programs.

## The algebra system’s simplest form

The algebra system's simplifier has always been a compromise: rules that make terms smaller, applied in some order. With equality saturation it can instead state true equations in both directions and ask for the *smallest* equal term:

```girafe title="The simplest form of an expression" tools="saturate"
*(x, y) -> *(y, x)
+(x, y) -> +(y, x)
*(x, +(y, z)) -> +(*(x, y), *(x, z))
+(*(x, y), *(x, z)) -> *(x, +(y, z))
*(1, x) -> x
+(x, x) -> *(2, x)
? +(*(X, Y), *(Y, Z))
? +(*(2, X), *(X, 3))
```

$XY + YZ$ becomes $Y(X + Z)$, five nodes instead of seven. This is the "simplest form" that a computer algebra system is always asked for and can rarely define: here it is defined by the cost function, and found by search.

```code
id: equality-saturation/optimiser
title: Rules for an optimiser
prompt: |
  Write rules (as a string `source`, one rule per line, in Girafe syntax) such that equality saturation simplifies each of these to the given result, using AST size as the cost:

  - `-(+(a, b), b)` to `a`;
  - `+(a, -(b, a))` to `b`;
  - `*(-(a, a), c)` to `0`.

  You may use any true equations of integer arithmetic. Remember that each rule is used left to right only: add the reverse direction when you need it.
starter: |
  export const source = `
  +(x, 0) -> x
  `;
tests: |
  import { test, expect } from 'test';
  import { source } from 'solution';
  import { parseStrict, parseTerm, simplify, show } from 'trs';

  const run = (q) => show(simplify(parseTerm(q), parseStrict(source).rules, { iterations: 10, nodes: 3000 }).term);
  test('(a + b) − b = a', () => expect(run('-(+(a, b), b)')).toBe('a'));
  test('a + (b − a) = b', () => expect(run('+(a, -(b, a))')).toBe('b'));
  test('(a − a) · c = 0', () => expect(run('*(-(a, a), c)')).toBe('0'));
solution: |
  export const source = `
  +(x, 0) -> x
  +(x, y) -> +(y, x)
  -(x, x) -> 0
  -(+(x, y), z) -> +(x, -(y, z))
  +(x, -(y, z)) -> -(+(x, y), z)
  *(0, x) -> 0
  `;
hints:
  - '`(a + b) − b`: a rule that moves the subtraction inside, `-(+(x, y), z) -> +(x, -(y, z))`, gives `a + (b − b)`; then `-(x, x) -> 0` and `+(x, 0) -> x`.'
  - '`a + (b − a)`: the reverse of that rule gives `(a + b) − a`, and commutativity of `+` turns it into `(b + a) − a`.'
```

:::key
- Equality saturation applies every rule everywhere, non-destructively, until saturation or a limit, then extracts.
- No termination, confluence or phase ordering is needed; the cost function decides what "best" means.
- Extraction by additive (tree) cost is a simple fixpoint; by shared (DAG) cost it is NP-hard.
:::

:::exercises
1. Saturate $x + y + z$ with associativity and commutativity of $+$ (both directions of associativity). How many e-classes and e-nodes does the saturated e-graph have? How many terms does the root class represent?
2. Give a rule set for which the e-graph of a single small term grows without bound. Which limit stops it?
3. Change the cost of `<<` to be lower than that of `*` and predict the output of the peephole optimiser on `+(*(a, 2), *(b, 2))`.
4. Explain why extraction with DAG cost is harder than with tree cost, with an example where they choose different terms.
:::
