---
title: Combining domains
summary: When one domain is not enough. Products that run domains side by side, reduced products that let them inform each other, partitioning that keeps branches apart, and relational domains that relate variables, with what each costs.
number: 24
duration: 50 minutes
prerequisites: [soundness]
---

Each domain of the last two chapters sees one kind of information: intervals the extent of a value, parity whether it is even, signs which side of zero it lies on. Each false alarm of chapter 22 had a cause that some other domain could see. This chapter combines domains, in the four ways analysers do it, and measures each against the same functions. It is optional: Part VI does not depend on it.

All the analyses here run on the course's engine, with widening and two rounds of narrowing, and decide the same checks: every divisor must be non-zero, every `assert` must hold. The figures show, check by check, which analyses prove what.

## Products

The simplest combination runs two analyses side by side, each with its own facts, on the same graph. A fact of the **product** is a pair, joined and transferred component by component, and a check is proven if either component proves it.

Parity is the domain of chapter 23 extended to environments: it knows that `2 * k` is even whatever `k` is, that an even number plus one is odd, and that `x % 2 === 0` makes `x` even on the true branch. An odd number is never zero, so parity can prove some divisions safe that intervals cannot:

:::domain-compare{n="24.1" analyses="intervals,parity,product" title="Two domains, two kinds of proof"}
```js
function halves(k) {
  const d = 2 * k + 1;
  return 10 / d;
}
```
:::

Intervals know nothing about `k`, so `d` is in `[−∞, +∞]`. Parity knows `d` is odd. The product proves the division because one of its components does. Edit the function: replace `+ 1` with `+ 2` and the proof disappears in every row.

## Reduced products

A product's components ignore each other, and that wastes information. Consider a loop that counts in twos:

:::domain-compare{n="24.2" analyses="intervals,parity,product,reduced" title="Components that inform each other"}
```js
function evens() {
  let i = 0;
  while (i < 10) {
    i = i + 2;
  }
  assert(i === 10);
}
```
:::

Intervals find `i ∈ [10, 11]` after the loop: the last iteration starts at most at 9 and adds 2. Parity finds that `i` is even. Neither proves `i === 10` alone, and neither does their product, since each component decides the check on its own. But together they say more than either: an even integer in `[10, 11]` is 10.

A **reduced product** applies a **reduction** after each step: a function that tightens each component with what the other knows, without changing the set of states the pair describes. :cite[cousot1979] For intervals and parity, the reduction moves each bound inward until it has the right parity, `[10, 11] ∧ even` becoming `[10, 10] ∧ even`, and gives a single-valued interval its parity. Applied at the loop head, it also tightens the facts inside the loop, `[0, 11]` becoming `[0, 10]`. Click the cells of the last row to see the facts.

The reduction must be sound (the pair before and after describes the same states, or the second fewer by dropping impossible ones), and it is usually not applied after widening, where it could pull a widened bound back in and undo the guarantee of termination. Designing reductions is the hard part of combining domains: each pair of domains needs its own, and a reduction between more than two domains can need several rounds.

## Exercise: the reduction

```helper
id: combining-domains/reduce-interval
title: Reducing an interval with a parity
prompt: |
  Implement `reduce` in `helpers/reduce.ts`. It receives an interval (`{ lo, hi }`, bounds possibly infinite, or `null` for ⊥) and a parity, and returns the smallest interval containing every integer of the interval that has that parity, or `null` if there is none. Infinite bounds stay infinite. With parity `'top'`, the interval is unchanged; with `'bot'`, the result is ⊥.

  Watch out for negative numbers: in JavaScript, `-3 % 2` is `-1`, not `1`.
files:
  helpers/reduce.ts: |
    export type Interval = { lo: number; hi: number } | null;
    export type Parity = 'bot' | 'even' | 'odd' | 'top';

    export function reduce(interval: Interval, parity: Parity): Interval {
      // TODO
      return interval;
    }
tests:
  reduce.test.ts: |
    import { test, expect } from 'workbench:test';
    import { reduce } from '../rules/helpers/reduce.js';

    test('bounds move inward to the right parity', () => {
      expect(reduce({ lo: 10, hi: 11 }, 'even')).toEqual({ lo: 10, hi: 10 });
      expect(reduce({ lo: 0, hi: 11 }, 'even')).toEqual({ lo: 0, hi: 10 });
      expect(reduce({ lo: 0, hi: 11 }, 'odd')).toEqual({ lo: 1, hi: 11 });
    });
    test('top changes nothing', () => {
      expect(reduce({ lo: 1, hi: 4 }, 'top')).toEqual({ lo: 1, hi: 4 });
    });
hiddenTests:
  more.test.ts: |
    import { test, expect } from 'workbench:test';
    import { reduce } from '../rules/helpers/reduce.js';

    test('nothing left', () => {
      expect(reduce({ lo: 3, hi: 3 }, 'even')).toBe(null);
      expect(reduce({ lo: 1, hi: 4 }, 'bot')).toBe(null);
      expect(reduce(null, 'odd')).toBe(null);
    });
    test('negative bounds', () => {
      expect(reduce({ lo: -3, hi: -1 }, 'even')).toEqual({ lo: -2, hi: -2 });
      expect(reduce({ lo: -4, hi: 4 }, 'odd')).toEqual({ lo: -3, hi: 3 });
      expect(reduce({ lo: -5, hi: -5 }, 'odd')).toEqual({ lo: -5, hi: -5 });
    });
    test('infinite bounds stay', () => {
      expect(reduce({ lo: -Infinity, hi: 9 }, 'even')).toEqual({ lo: -Infinity, hi: 8 });
      expect(reduce({ lo: 1, hi: Infinity }, 'even')).toEqual({ lo: 2, hi: Infinity });
      expect(reduce({ lo: -Infinity, hi: Infinity }, 'odd')).toEqual({ lo: -Infinity, hi: Infinity });
    });
answer:
  helpers/reduce.ts: |
    export type Interval = { lo: number; hi: number } | null;
    export type Parity = 'bot' | 'even' | 'odd' | 'top';

    export function reduce(interval: Interval, parity: Parity): Interval {
      if (!interval || parity === 'bot') return null;
      if (parity === 'top') return interval;
      const want = parity === 'even' ? 0 : 1;
      // Math.abs, because -3 % 2 is -1 in JavaScript.
      const ok = (n: number) => !Number.isFinite(n) || Math.abs(n) % 2 === want;
      const lo = ok(interval.lo) ? interval.lo : interval.lo + 1;
      const hi = ok(interval.hi) ? interval.hi : interval.hi - 1;
      return lo > hi ? null : { lo, hi };
    }
```

## Keeping branches apart

The join is where non-relational domains lose the most. In the function below, `step` is 4 on one branch and −4 on the other, so after the join it is in `[−4, 4]`, which contains 0, and the division raises an alarm. Neither 4 nor −4 is zero; the problem is the hull, not the domain. Parity does not help: it knows `step` is even, and 0 is even.

:::domain-compare{n="24.3" analyses="intervals,product,partitioned" title="Joining too early"}
```js
function stride(x) {
  let step;
  if (x >= 0) {
    step = 4;
  } else {
    step = -4;
  }
  return x / step;
}
```
:::

**Trace partitioning** delays the join: the analysis keeps one fact per branch (more generally, per class of execution paths) and joins them only later, or never. :cite[mauborgne2005] The *partitioned intervals* row keeps up to four facts at each point instead of one, a disjunction such as `(x∈[0, +∞] step∈4) ∨ (x∈[−∞, −1] step∈−4)`, and decides a check by deciding it in every disjunct. Each disjunct proves `step ≠ 0`, so the division is proven. (With `1` and `−1` instead of `4` and `−4`, parity would prove it too: both are odd. Try it.)

Keeping facts apart multiplies the work by the number of facts kept, and the number of paths through a function grows exponentially with its branches: real partitioning chooses where to split (a branch whose outcome matters later, the iterations of a loop) and where to merge (the end of a function, a bounded number of disjuncts). The course's version merges at loop heads, through widening, and beyond four disjuncts. Astrée partitions by the outcome of chosen branches and by loop iterations, which removed whole families of false alarms in its flight-control analyses. :cite[blanchet2003]

TypeScript's types offer a familiar version of the same idea. A union of object types, such as `{ kind: 'circle'; radius: number } | { kind: 'square'; side: number }`, is a disjunction that keeps each alternative's fields together: testing `kind` tells the checker which other fields exist. A product of per-field types, `kind: 'circle' | 'square'` with `radius: number | undefined`, would lose exactly that link. SonarJS's type-dependent rules (chapter 9) see the narrowed types this produces.

## Relational domains

The last false alarm of chapter 22 had nothing to do with joins. After two counters are incremented together, `i` and `j` are equal, and no combination of facts about `i` alone and `j` alone can say so. A **relational** domain tracks constraints between variables.

The **zone** domain tracks constraints of the form `x − y ≤ c`, and bounds `x ≤ c` and `−x ≤ c`, for every pair of variables. They fit in a matrix with one row and one column per variable, plus one for a variable fixed at 0, called a **difference-bound matrix**: entry `(x, y)` holds the best known `c` with `x − y ≤ c`. Constraints combine along paths (from `x − y ≤ 2` and `y − z ≤ 3` follows `x − z ≤ 5`), so a matrix is put in a canonical form by computing all shortest paths, with the Floyd–Warshall algorithm; a negative cycle means the constraints are contradictory, and the point is unreachable. The operations follow:

- `i = j + c` sets `i − j` to exactly `c`; `i = i + c` shifts every constraint on `i`;
- a condition `i < j` adds `i − j ≤ −1` on its true edge;
- the join takes the larger bound of each entry, and widening drops every bound that grew.

:::domain-compare{n="24.4" analyses="intervals,reduced,partitioned,zones" title="A relation between variables"}
```js
function pairs(n) {
  let i = 0;
  let j = 0;
  while (i < n) {
    i = i + 1;
    j = j + 1;
  }
  assert(i === j);
  return 1 / (i - j + 1);
}
```
:::

Zones prove both checks: at the loop head, the fact `i − j = 0` survives every iteration, because both assignments shift the difference by the same amount, and the join and widening keep a bound that does not move. Antoine Miné introduced difference-bound matrices as an abstract domain, then **octagons**, which add constraints of the form `x + y ≤ c` and handle negations, with the same matrix techniques. :cite[mine2001dbm,mine2006octagon] Further up, **convex polyhedra** track arbitrary linear inequalities between variables, `2x + 3y − z ≤ 7`. :cite[cousot1978]

## What precision costs

| Domain | Represents | Cost per operation, for n variables |
|---|---|---|
| Intervals, parity, signs | each variable alone | linear in n |
| Zones, octagons | `±x ± y ≤ c` | cubic in n (the closure); quadratic memory |
| Polyhedra | any linear inequalities | exponential in the worst case |
| Partitioning over k facts | disjunctions | k times the underlying domain |

The cubic closure is why analysers do not run octagons over every variable of a large function. Astrée applies them to small **packs** of variables chosen syntactically (variables that appear together in an expression or a condition), and runs intervals over everything; the result is most of octagons' precision where it matters, at a fraction of the cost. :cite[blanchet2003] Combining domains is engineering: each one is added to remove a family of false alarms seen on real code, at a cost measured on real code, as SonarJS's authors weigh each refinement of a rule against its ruling diff.

## What comes next

Part V's analyses all stayed inside one function. Real code calls functions, passes callbacks and stores values in objects. Part VI follows values across those boundaries, starting with the question every interprocedural analysis must answer first: which function does this call call?
