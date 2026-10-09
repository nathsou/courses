---
title: Lattices and fixpoints
summary: The mathematics behind every dataflow analysis. Facts ordered by precision, joins where paths meet, and why iterating until nothing changes terminates with the right answer.
number: 13
duration: 65 minutes
prerequisites: [code-paths]
---

A control-flow graph says which statements can follow which. The questions rules ask are about what is *true* along those paths: at this `return`, can `x` be anything other than 1? Is this variable read again before it is overwritten? Which assignments could have produced the value read here? A **dataflow analysis** answers such questions for every point of a function at once, by attaching a fact to each point and propagating facts along the edges of the graph until they stop changing. This chapter is about why that works: why it stops, and what the answer means. The next two chapters apply it.

## Facts, ordered by what they say

Take one question, which constant a variable holds, and the facts an analysis can state about one variable at one point:

- **⊥** (bottom): no value has reached this point yet. Either the variable has not been assigned on any path seen so far, or no path reaches the point at all.
- **a constant**, `0`, `1`, `"ready"`: on every path that reaches the point, the variable holds this value.
- **⊤** (top): it may hold different values on different paths; it is not a constant.

These facts are ordered by how much they claim. ⊥ claims the most (nothing can be here), ⊤ the least (anything can). Writing `a ⊑ b` for "`a` is at least as precise as `b`", every constant sits above ⊥ and below ⊤, and two different constants are not comparable. Such an order, reflexive, antisymmetric and transitive but not necessarily total, is a **partial order**.

Where two paths meet, the analysis must combine their facts into one that is true on both: if one path brings `x = 1` and the other `x = 2`, the only true statement is ⊤. The combination is the **join**, written `⊔`: the least upper bound, the most precise fact that is above both. A partial order in which every two elements have a join, and dually a **meet** `⊓` (greatest lower bound), is a **lattice**.

::lattice-lab{n="13.1" presets="flat,powerset,sign,notlattice"}

The flat lattice of constants is one example. The subsets of a set of variables, ordered by inclusion, are another, with union as join: that is the lattice of the next two chapters' analyses. Signs are a third, a coarse abstraction of numbers that Part V will refine into intervals. The last order in the figure is not a lattice: `a` and `b` have two upper bounds, `c` and `d`, and neither is smaller, so there is no single best way to combine `a` and `b`. Analyses avoid such orders, because at a join they would have to pick one and lose soundness or precision arbitrarily.

An analysis tracks one fact per variable, so its real lattice is a product: a map from variables to flat values, joined variable by variable. Products of lattices are lattices.

```quiz
q: "In the lattice of subsets of {a, b, c}, ordered by inclusion, what are {a, b} ⊔ {b, c} and {a, b} ⊓ {b, c}?"
options:
  - text: "{a, b, c} and {b}"
    correct: true
    why: "The join is the smallest set containing both, their union; the meet is the largest set contained in both, their intersection."
  - text: "{b} and {a, b, c}"
    why: "It is the other way round: the join goes up, towards larger sets."
  - text: "{a, b, c} and ∅"
    why: "∅ is a lower bound, but not the greatest: {b} is contained in both and is larger."
```

## Height, and why iteration stops

The **height** of a lattice is the length of its longest chain `⊥ ⊏ x₁ ⊏ x₂ ⊏ … ⊏ ⊤`. The flat lattice has height 2, whatever the number of constants; the subsets of `n` variables have height `n`; a product of `k` flat lattices has height `2k`. Height matters because of how analyses run: every fact starts at ⊥ and can only move *up* as the analysis learns about more paths. A fact in a lattice of height `h` can change at most `h` times. With a finite height, the whole computation must stop.

Some useful lattices have infinite height. Intervals of integers, `[0, 0] ⊏ [0, 1] ⊏ [0, 2] ⊏ …`, can grow forever around a loop. Part V shows how analyses over such lattices still terminate, by **widening**: deliberately jumping up the lattice faster than the facts require.

## Transfer functions and fixpoints

Each node of the graph has a **transfer function**, which says how the node changes the facts: for constant propagation, `x = y + 1` sets `x` to the fact for `y` plus one (and to ⊤ if `y` is ⊤), and leaves the other variables alone. The analysis then states a system of equations, one pair per node `n`:

- `IN[n] = ⊔ { OUT[p] | p is a predecessor of n }`, the facts arriving from every path;
- `OUT[n] = fₙ(IN[n])`, the facts after the node.

with `IN[entry]` fixed to the facts at the function's start (parameters are ⊤). A solution is an assignment of facts to points that satisfies every equation at once: a **fixpoint** of the function `F` that recomputes all equations from the current facts. There can be many fixpoints (⊤ everywhere often is one, and says nothing). The analysis wants the **least** one, the most precise solution consistent with the equations.

Two conditions make it easy to find. The transfer functions must be **monotone**: more precise facts in give facts at least as precise out (`a ⊑ b` implies `f(a) ⊑ f(b)`). And the lattice must have finite height. Then the least fixpoint is reached by starting with ⊥ everywhere and applying `F` repeatedly, `⊥ ⊑ F(⊥) ⊑ F(F(⊥)) ⊑ …`, until nothing changes: monotonicity keeps the sequence going up, finite height stops it, and the theorem of Kleene and Tarski says that where it stops is the least fixpoint. :cite[tarski1955] This is the framework Gary Kildall described for compiler optimisations in 1973, and that Kam and Ullman generalised as **monotone frameworks**: almost every classical dataflow analysis is an instance of it, chosen by its lattice, its direction, and its transfer functions. :cite[kildall1973,kam1977]

## Worklists

Recomputing every equation until nothing changes is correct but wasteful: after the first rounds, most nodes' inputs have stopped changing. A **worklist** algorithm recomputes only what may change:

1. Set every `OUT` to ⊥, and put every node on the worklist.
2. Take a node off the worklist. Join its predecessors' `OUT` into its `IN`, apply its transfer function.
3. If its `OUT` changed, put its successors on the worklist.
4. Repeat until the worklist is empty.

The order in which nodes are taken does not change the result, only the number of steps. For a forward analysis, **reverse postorder** (a node before its successors, except along back edges) is a good initial order: each node is visited after its predecessors, and only loops make the algorithm revisit nodes.

Step through constant propagation on the function below. Each box is a node of the function's control-flow graph, built statement by statement; the fact under it is its `OUT`. Watch `y` and `n` become ⊤ when the loop's back edge brings their new values to the loop's head, while `x` stays `1` and `z` becomes `11`.

:::fixpoint-stepper{n="13.2" analysis="constants"}
```js
function f(n) {
  let x = 1;
  let y = 2;
  let z;
  while (n > 0) {
    y = y + 1;
    n = n - 1;
  }
  z = x + 10;
  return z + y;
}
```
:::

Edit the function: add a `break`, an `if` inside the loop, a variable that is set to the same constant on both branches of an `if`. The figure supports declarations, assignments, `if`, loops, `break`, `continue`, `return` and `throw`.

## Exercise: a worklist solver

```helper
id: lattices-and-fixpoints/worklist
title: A worklist solver
prompt: |
  Implement `solveForward` in `helpers/fixpoint.ts`: the worklist algorithm for a forward analysis on a graph given by successor and predecessor lists. `IN[entry]` is `problem.boundary`; every other `IN` is the join of the predecessors' `OUT` (⊥ for a node without predecessors). Start with every `OUT` at ⊥ and every node on the worklist, in the order of `graph.nodes`. The tests also check that you do not recompute nodes needlessly.
files:
  helpers/fixpoint.ts: |
    export interface Graph {
      /** Node ids, in the order to put them on the worklist initially. */
      nodes: number[];
      entry: number;
      succ: Record<number, number[]>;
      pred: Record<number, number[]>;
    }

    export interface Problem<T> {
      bottom: T;
      join(a: T, b: T): T;
      equal(a: T, b: T): boolean;
      /** The fact at the entry. */
      boundary: T;
      transfer(node: number, input: T): T;
    }

    export function solveForward<T>(graph: Graph, problem: Problem<T>): { input: Record<number, T>; output: Record<number, T> } {
      const input: Record<number, T> = {};
      const output: Record<number, T> = {};
      // TODO
      return { input, output };
    }
tests:
  fixpoint.test.ts: |
    import { test, expect } from 'workbench:test';
    import { solveForward, type Graph, type Problem } from '../rules/helpers/fixpoint.js';

    // Facts are sets of labels, as sorted arrays; each node adds its own label.
    const sets = (onTransfer?: (n: number) => void): Problem<string[]> => ({
      bottom: [],
      join: (a, b) => [...new Set([...a, ...b])].sort(),
      equal: (a, b) => a.join() === b.join(),
      boundary: ['start'],
      transfer: (n, x) => {
        onTransfer?.(n);
        return [...new Set([...x, `n${n}`])].sort();
      },
    });
    const graph = (edges: [number, number][], nodes: number[]): Graph => {
      const succ: Record<number, number[]> = {};
      const pred: Record<number, number[]> = {};
      for (const n of nodes) (succ[n] = []), (pred[n] = []);
      for (const [a, b] of edges) succ[a]!.push(b), pred[b]!.push(a);
      return { nodes, entry: nodes[0]!, succ, pred };
    };

    test('a straight line', () => {
      const r = solveForward(graph([[0, 1], [1, 2]], [0, 1, 2]), sets());
      expect(r.output[2]).toEqual(['n0', 'n1', 'n2', 'start']);
      expect(r.input[1]).toEqual(['n0', 'start']);
    });
    test('a diamond joins both branches', () => {
      const r = solveForward(graph([[0, 1], [0, 2], [1, 3], [2, 3]], [0, 1, 2, 3]), sets());
      expect(r.input[3]).toEqual(['n0', 'n1', 'n2', 'start']);
    });
    test('a loop reaches a fixpoint', () => {
      const r = solveForward(graph([[0, 1], [1, 2], [2, 1], [1, 3]], [0, 1, 2, 3]), sets());
      expect(r.input[1]).toEqual(['n0', 'n1', 'n2', 'start']);
      expect(r.output[3]).toEqual(['n0', 'n1', 'n2', 'n3', 'start']);
    });
hiddenTests:
  more.test.ts: |
    import { test, expect } from 'workbench:test';
    import { solveForward, type Graph, type Problem } from '../rules/helpers/fixpoint.js';

    const sets = (onTransfer?: (n: number) => void): Problem<string[]> => ({
      bottom: [],
      join: (a, b) => [...new Set([...a, ...b])].sort(),
      equal: (a, b) => a.join() === b.join(),
      boundary: ['start'],
      transfer: (n, x) => {
        onTransfer?.(n);
        return [...new Set([...x, `n${n}`])].sort();
      },
    });
    const graph = (edges: [number, number][], nodes: number[]): Graph => {
      const succ: Record<number, number[]> = {};
      const pred: Record<number, number[]> = {};
      for (const n of nodes) (succ[n] = []), (pred[n] = []);
      for (const [a, b] of edges) succ[a]!.push(b), pred[b]!.push(a);
      return { nodes, entry: nodes[0]!, succ, pred };
    };

    test('an unreachable node stays at bottom on input', () => {
      const r = solveForward(graph([[0, 1], [2, 1]], [0, 1, 2]), sets());
      expect(r.input[2]).toEqual([]);
      expect(r.input[1]).toEqual(['n0', 'n2', 'start']);
    });
    test('nested loops', () => {
      const r = solveForward(graph([[0, 1], [1, 2], [2, 3], [3, 2], [3, 1], [1, 4]], [0, 1, 2, 3, 4]), sets());
      expect(r.input[2]).toEqual(['n0', 'n1', 'n2', 'n3', 'start']);
      expect(r.output[4]).toEqual(['n0', 'n1', 'n2', 'n3', 'n4', 'start']);
    });
    test('the entry can be inside a loop', () => {
      const r = solveForward(graph([[0, 1], [1, 0]], [0, 1]), sets());
      expect(r.input[0]).toEqual(['start']);
    });
    test('no needless work on a straight line', () => {
      let calls = 0;
      const nodes = Array.from({ length: 50 }, (_, i) => i);
      solveForward(graph(nodes.slice(1).map((i) => [i - 1, i] as [number, number]), nodes), sets(() => calls++));
      expect(calls).toBeLessThanOrEqual(100);
    });
answer:
  helpers/fixpoint.ts: |
    export interface Graph {
      nodes: number[];
      entry: number;
      succ: Record<number, number[]>;
      pred: Record<number, number[]>;
    }

    export interface Problem<T> {
      bottom: T;
      join(a: T, b: T): T;
      equal(a: T, b: T): boolean;
      boundary: T;
      transfer(node: number, input: T): T;
    }

    export function solveForward<T>(graph: Graph, problem: Problem<T>): { input: Record<number, T>; output: Record<number, T> } {
      const input: Record<number, T> = {};
      const output: Record<number, T> = {};
      for (const n of graph.nodes) {
        input[n] = problem.bottom;
        output[n] = problem.bottom;
      }
      const worklist = [...graph.nodes];
      const queued = new Set(worklist);
      while (worklist.length) {
        const n = worklist.shift()!;
        queued.delete(n);
        input[n] = n === graph.entry ? problem.boundary : (graph.pred[n] ?? []).reduce((acc, p) => problem.join(acc, output[p]!), problem.bottom);
        const out = problem.transfer(n, input[n]!);
        if (problem.equal(out, output[n]!)) continue;
        output[n] = out;
        for (const s of graph.succ[n] ?? []) {
          if (!queued.has(s)) {
            worklist.push(s);
            queued.add(s);
          }
        }
      }
      return { input, output };
    }
hints:
  - "Keep a set of the nodes currently on the worklist, so that a node is not queued twice."
  - "The entry's input is the boundary, whatever its predecessors say: a back edge to the entry does not change the facts at the function's start."
  - "Only a changed `OUT` puts successors back on the worklist. With the initial order, a straight line of 50 nodes needs one transfer per node."
solution: |
  The algorithm is a dozen lines, and everything in this part of the course runs on it, SonarJS's liveness helper included. Its correctness rests on the two conditions above, which the solver cannot check: if a transfer function is not monotone, or the lattice has infinite height, the loop may never stop. Production solvers add two refinements. They pick the initial order carefully (reverse postorder for forward problems), which this exercise left to the caller through `graph.nodes`. And they work on basic blocks rather than statements, applying a block's statements' transfer functions in sequence, so that the worklist holds far fewer items.
```

## Precision: all paths, or the fixpoint?

What would a perfect answer be? For each point, take every path from the entry to that point, apply the transfer functions along it, and join the results over all paths: the **meet-over-all-paths** solution (MOP; with joins, it would be "join over all paths", but the name is historical). There can be infinitely many paths, so MOP is not computed directly. The fixpoint solution (MFP) joins facts *at every merge point* instead of at the end, and Kildall showed that it is equal to MOP when the transfer functions are **distributive**, `f(a ⊔ b) = f(a) ⊔ f(b)`, and at least as large (less precise) when they are only monotone.

Liveness and reaching definitions are distributive. Constant propagation is not, and here is the classic example:

:::fixpoint-stepper{n="13.3" analysis="constants" title="Joining too early"}
```js
function g(c) {
  let x;
  let y;
  if (c) {
    x = 1;
    y = 2;
  } else {
    x = 2;
    y = 1;
  }
  const z = x + y;
  return z;
}
```
:::

On each path, `z` is 3. But the fixpoint joins `x` and `y` separately where the branches meet, `1 ⊔ 2 = ⊤` for both, and `⊤ + ⊤` is ⊤. The analysis lost the correlation between `x` and `y` by keeping one fact per variable. Keeping facts per path would fix this example and make the analysis exponential in the number of branches; Part VIII's symbolic execution makes that trade deliberately.

## Where SonarJS uses this

SonarJS does not have a general dataflow framework. It has a few analyses, each written for one purpose on ESLint's code paths, which are instances of the same scheme: liveness in its `lva` helper, used by S1854 to find dead stores (chapter 14), and a value-set analysis that combines reaching definitions with the values assigned, used by S4165 to find redundant assignments (chapter 15). TypeScript's narrowing, which SonarJS consumes through types (chapter 9), is a dataflow analysis too, computed lazily: the checker walks backwards from a reference through the flow graph it built while binding the program, and iterates around loops until the narrowed type is stable.

## What comes next

The next chapter runs the framework backwards, from the end of a function towards its start, to find which variables are still needed, and turns it into a rule.
