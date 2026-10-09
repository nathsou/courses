---
title: Intervals and widening
summary: Running a program on ranges of values instead of values. The interval domain, abstract arithmetic, refining ranges along branches, and the widening and narrowing that make loops terminate over a lattice of infinite height.
number: 22
duration: 60 minutes
prerequisites: [lattices-and-fixpoints, false-positives]
---

Track A's analyses tracked facts with few possible values: constant or not, live or dead, truthy or falsy. Their lattices had finite height, so iteration stopped on its own. Many questions an analyser would like to answer are about *ranges* of numbers: can this divisor be zero? Is this index within the array? Can this loop counter overflow? Neither a constant nor ⊤ answers them: a variable that holds `1`, `2` or `3` depending on the path is ⊤ for constant propagation, and ⊤ cannot rule out zero.

This chapter replaces values with **intervals**, and the execution of a program with an **abstract execution** that runs every path at once on intervals. It is the first example of **abstract interpretation**, the theory that Patrick and Radhia Cousot set out in 1977 to describe static analyses as approximations of a program's executions. :cite[cousot1977] The next chapter states the theory; this one builds the analysis and runs into its central problem, termination.

## Abstract values

An **interval** `[a, b]` stands for every integer `n` with `a ≤ n ≤ b`. The bounds may be infinite: `[0, +∞]` is every non-negative integer, `[−∞, +∞]` is every integer and plays the role of ⊤. ⊥ stands for no value at all, as in chapter 13. Intervals are ordered by inclusion, `[1, 3] ⊑ [0, 10]`, and form a lattice:

- the **join** is the smallest interval containing both, their **hull**: `[0, 2] ⊔ [5, 9] = [0, 9]`;
- the **meet** is their intersection: `[0, 5] ⊓ [3, 9] = [3, 5]`, and ⊥ when they do not overlap.

The join already loses information: `[0, 0] ⊔ [10, 10] = [0, 10]` claims that the values 1 to 9 are possible, which neither side said. An interval cannot have holes. That is the price of the domain's simplicity, and it is a recurring source of false alarms.

As in chapter 13, the analysis tracks one interval per variable, so its facts are maps from variables to intervals, joined variable by variable. A domain that tracks each variable separately, without any relation between variables, is called **non-relational**.

This chapter treats numbers as unbounded integers. JavaScript's numbers are 64-bit floating-point values, with `NaN`, `-0`, `Infinity` and rounding; an analyser for real JavaScript would have to model all of them, and `+` on strings besides. Astrée, below, models floating-point rounding exactly for C, and the techniques are the same. The integer version keeps the ideas visible.

## Abstract arithmetic

To run a program on intervals, each operation needs an abstract version that takes intervals and returns an interval containing every possible result:

- `[a, b] + [c, d] = [a + c, b + d]`;
- `[a, b] − [c, d] = [a − d, b − c]`: the smallest difference subtracts the largest value from the smallest;
- `[a, b] × [c, d]`: the smallest and the largest of the four products `ac`, `ad`, `bc`, `bd`, since the sign of either operand can flip which is which.

The condition that matters is **soundness**: whatever values the operands take within their intervals, the result lies within the result interval. Precision is the other concern: the result should not be much larger than the set of values that can actually occur.

```quiz
q: "With `x ∈ [-2, 3]` and `y ∈ [4, 5]`, what interval does the analysis compute for `x * y`?"
options:
  - text: "[-10, 15]"
    correct: true
    why: "The four products of the bounds are −8, −10, 12 and 15. The smallest is −10 (−2 × 5) and the largest 15 (3 × 5)."
  - text: "[-8, 15]"
    why: "−8 is −2 × 4, but −2 × 5 = −10 is smaller."
  - text: "[0, 15]"
    why: "A negative `x` with a positive `y` gives negative products."
```

Abstract operations are sound but not always exact, even with exact inputs. With `x ∈ [0, 10]`, `x - x` evaluates to `[0, 10] − [0, 10] = [−10, 10]`, although it is always 0: the domain has no way to know that both operands are the same value. A non-relational domain forgets every relation between values, including equality.

## Running a function on intervals

An assignment `x = e` evaluates `e` on the intervals of its variables and gives the result to `x`. Conditions do more than choose a branch: like the truthiness analysis of chapter 16, the analysis **refines** the facts along each edge out of a condition. On the edge where `x > 100` is true, `x` is met with `[101, +∞]`; on the other, with `[−∞, 100]`. An edge where the meet is ⊥ for some variable cannot be taken, and the analysis treats the code it leads to as unreachable from that side.

The course's engine checks two kinds of **alarms** at the fixpoint, from the facts flowing into each node: a division or remainder whose divisor's interval contains 0, and an `assert(condition)` the intervals cannot prove. Step through the function below. The `if` chain clamps `x` into `y`, and the refinements give `y ∈ [0, 100]` at the `return`, so the divisor `y + 1` is in `[1, 101]`: the division is proven safe.

:::fixpoint-stepper{n="22.1" analysis="intervals" title="Clamping, proven" subtitle="Each edge out of a condition meets the facts with what the condition says on that side."}
```js
function scale(x) {
  let y;
  if (x > 100) {
    y = 100;
  } else if (x < 0) {
    y = 0;
  } else {
    y = x;
  }
  return 1000 / (y + 1);
}
```
:::

The same reasoning, without the refinements, would know nothing about `x` in the `else` branch, give `y` the interval `[−∞, +∞]`, and raise an alarm on the division. Refinement is what turns a domain into a useful analysis.

## Loops and infinite height

Chapter 13 required lattices of finite height, so that every fact could change only a bounded number of times. Intervals break this. Around a loop that increments a counter, the facts at the loop head grow one step at a time:

```
[0, 0] ⊏ [0, 1] ⊏ [0, 2] ⊏ [0, 3] ⊏ …
```

If the loop's bound is a constant, the chain ends there, after as many rounds as the loop runs. With `while (i < 10)`, about ten rounds; with `while (i < 1000000)`, a million. If the bound is unknown, it never ends. Run the stepper below with widening turned off: the solver gives up after its step limit, with the facts still growing.

:::fixpoint-stepper{n="22.2" analysis="intervals" controls="widening" title="A loop with an unknown bound" subtitle="Turn widening off to see the iteration climb forever; turn it on to see it jump."}
```js
function count(n) {
  let i = 0;
  while (i < n) {
    i = i + 1;
  }
  return 100 / (i + 1);
}
```
:::

## Widening

A **widening** operator `∇` replaces the join at a few chosen points, so that iteration climbs the lattice faster than the facts require. It must satisfy two conditions:

- `a ∇ b` is above both `a` and `b`, so that the result is still sound;
- for every increasing sequence `b₀, b₁, b₂, …`, the sequence `x₀ = b₀`, `xₖ₊₁ = xₖ ∇ bₖ₊₁` stabilises after finitely many steps.

The standard interval widening keeps a bound that is stable and sends a bound that moved to infinity:

```
[a, b] ∇ [c, d] = [ c < a ? −∞ : a,  d > b ? +∞ : b ]
```

A bound can move at most once, so each variable's interval changes at most twice more. Widening is only needed where an infinite chain can arise, which is around loops: every cycle in the control-flow graph contains a loop head, so widening at loop heads is enough to make the whole analysis terminate. The course's engine widens the input of each loop head from its third visit on, giving the loop one round to show its shape first.

In 22.2, with widening on, `i` at the loop head goes from `[0, 0]` to `[0, 1]` to `[0, +∞]`. The result is sound: `i` is never negative, so `i + 1` is never 0 and the division is proven safe. On the edge out of `while (i < n)`, the refinement also learns something about `n`: inside the loop, `n ≥ 1`, since `n > i ≥ 0`.

Widening trades precision for termination, and the trade can be expensive. Take the loop with a constant bound:

:::fixpoint-stepper{n="22.3" analysis="intervals" controls="widening,narrowing" title="Widening overshoots" subtitle="With widening alone, the assertion is a false alarm. Turn on narrowing to recover the bound."}
```js
function countToTen() {
  let i = 0;
  while (i < 10) {
    i = i + 1;
  }
  assert(i === 10);
  return 100 / i;
}
```
:::

With widening, `i` at the loop head becomes `[0, +∞]`, and after the loop, on the edge where `i < 10` is false, `[10, +∞]`. The assertion `i === 10` holds on every execution, yet the analysis cannot prove it: a **false alarm**, an alarm on code that cannot fail. The bound 10 was in the program all along, and widening jumped past it.

```quiz
q: "Without widening, how does 22.3's analysis end?"
options:
  - text: "It never terminates: intervals have infinite height."
    why: "The lattice has infinite height, but this particular chain does not climb forever: the refinement `i < 10` caps the facts inside the loop at `[0, 9]`, so the loop head's input stops at `[0, 10]`."
  - text: "It terminates after about ten rounds of the loop, with `i ∈ [0, 10]` at the loop head and no alarm."
    correct: true
    why: "Each round adds one value, and the refinement stops the growth at 10. Without widening the result is exact here, but the cost grows with the bound, and the trick fails whenever the bound is unknown, as in 22.2."
  - text: "It terminates immediately with `i ∈ [−∞, +∞]`."
    why: "Nothing makes the facts jump to ⊤ without widening; they climb one value at a time."
```

## Narrowing

The widened result is a **post-fixpoint**: applying the equations once more gives facts at least as precise, and still sound. **Narrowing** exploits this. After the widened iteration has stopped, it runs a few more rounds of the equations, which can only bring the facts down. To guarantee that these descending rounds stop as well, a **narrowing** operator `Δ` controls what may change at loop heads: the standard one for intervals only replaces infinite bounds with finite ones.

```
[a, b] Δ [c, d] = [ a = −∞ ? c : a,  b = +∞ ? d : b ]
```

In 22.3, the first round after widening recomputes the loop head from its two predecessors: `i = 0` from the entry, and `i ∈ [1, 10]` from the body, since the body only runs when `i < 10`. Their hull is `[0, 10]`, and the narrowing accepts the finite upper bound. After the loop, `i` is exactly 10, and the alarm disappears. Turn narrowing on in 22.3 to see it.

Narrowing does not always recover what widening lost. It works here because a condition in the loop, `i < 10`, caps the values the back edge can bring. When the bound only shows up after the loop, or in a relation between variables, nothing in the equations brings the facts back down. Analysers combine narrowing with other techniques: **widening with thresholds** (jumping to the next constant from a list, such as the constants in the program, before jumping to infinity), **delayed widening** (several plain rounds before the first widening), and choosing the widening points carefully. :cite[bourdoncle1993]

## False alarms that intervals cannot avoid

Some false alarms come from the domain itself. In the function below, `i` and `j` start equal and are incremented together, so they are equal after the loop. The intervals at the assertion are `i ∈ [0, +∞]` and `j ∈ [0, +∞]`, and nothing about two intervals can say that the values are equal. Narrowing does not help: the bound `n` is unknown.

```predict
q: "Does the interval analysis prove `assert(i === j)`?"
options:
  - text: "Yes, because both intervals are equal."
    why: "Two variables with the same interval can still hold different values: `i = 3` and `j = 7` are both in `[0, +∞]`."
  - text: "No: the assertion may fail as far as the domain can tell, so the analysis raises a false alarm."
    correct: true
    why: "The fact `i = j` is a relation between variables, and intervals are non-relational. Chapter 24's relational domains can express it."
  - text: "It depends on whether narrowing is enabled."
    why: "Narrowing can only bring back bounds that the equations cap; here nothing does."
```

:::fixpoint-stepper{n="22.4" analysis="intervals" controls="narrowing" title="A relation intervals cannot hold"}
```js
function pairs(n) {
  let i = 0;
  let j = 0;
  while (i < n) {
    i = i + 1;
    j = j + 1;
  }
  assert(i === j);
}
```
:::

This is the trade-off of Part V in miniature. A domain that can express more (relations, disjunctions, sets with holes) proves more and costs more. Chapter 24 combines domains to buy precision where it is needed.

## Exercise: interval arithmetic

```helper
id: intervals-and-widening/interval-arithmetic
title: Interval arithmetic and widening
prompt: |
  Implement the four functions in `helpers/intervals.ts`. An interval is `{ lo, hi }`, with `-Infinity` and `Infinity` allowed as bounds, or `null` for ⊥. Every function returns `null` when an operand is `null`, except `join`, for which ⊥ is the identity.

  - `join(a, b)`: the hull of two intervals.
  - `add(a, b)`: the sum.
  - `times(a, b)`: the product. Watch out for `0 * Infinity`, which is `NaN` in JavaScript: a bound of 0 times an infinite bound should give 0, since every value of the other interval times 0 is 0.
  - `widen(previous, next)`: the standard widening, where `previous` is the fact at the loop head so far and `next` the new one. Treat ⊥ as the identity on either side.
files:
  helpers/intervals.ts: |
    export type Interval = { lo: number; hi: number } | null;

    export function join(a: Interval, b: Interval): Interval {
      // TODO
      return null;
    }

    export function add(a: Interval, b: Interval): Interval {
      // TODO
      return null;
    }

    export function times(a: Interval, b: Interval): Interval {
      // TODO
      return null;
    }

    export function widen(previous: Interval, next: Interval): Interval {
      // TODO
      return null;
    }
tests:
  intervals.test.ts: |
    import { test, expect } from 'workbench:test';
    import { join, add, times, widen } from '../rules/helpers/intervals.js';

    test('join is the hull', () => {
      expect(join({ lo: 0, hi: 2 }, { lo: 5, hi: 9 })).toEqual({ lo: 0, hi: 9 });
      expect(join(null, { lo: 1, hi: 1 })).toEqual({ lo: 1, hi: 1 });
    });
    test('add', () => {
      expect(add({ lo: 1, hi: 2 }, { lo: -5, hi: 10 })).toEqual({ lo: -4, hi: 12 });
    });
    test('times takes the extreme products', () => {
      expect(times({ lo: -2, hi: 3 }, { lo: 4, hi: 5 })).toEqual({ lo: -10, hi: 15 });
    });
    test('widen sends moving bounds to infinity', () => {
      expect(widen({ lo: 0, hi: 1 }, { lo: 0, hi: 2 })).toEqual({ lo: 0, hi: Infinity });
      expect(widen({ lo: 0, hi: 1 }, { lo: 0, hi: 1 })).toEqual({ lo: 0, hi: 1 });
    });
hiddenTests:
  more.test.ts: |
    import { test, expect } from 'workbench:test';
    import { join, add, times, widen } from '../rules/helpers/intervals.js';

    test('bottom', () => {
      expect(join({ lo: 1, hi: 2 }, null)).toEqual({ lo: 1, hi: 2 });
      expect(join(null, null)).toBe(null);
      expect(add(null, { lo: 1, hi: 2 })).toBe(null);
      expect(times({ lo: 1, hi: 2 }, null)).toBe(null);
      expect(widen(null, { lo: 3, hi: 4 })).toEqual({ lo: 3, hi: 4 });
      expect(widen({ lo: 3, hi: 4 }, null)).toEqual({ lo: 3, hi: 4 });
    });
    test('infinite bounds', () => {
      expect(add({ lo: 0, hi: Infinity }, { lo: 1, hi: 1 })).toEqual({ lo: 1, hi: Infinity });
      expect(times({ lo: 0, hi: 0 }, { lo: -Infinity, hi: Infinity })).toEqual({ lo: 0, hi: 0 });
      expect(times({ lo: 0, hi: Infinity }, { lo: 2, hi: 2 })).toEqual({ lo: 0, hi: Infinity });
      expect(times({ lo: -1, hi: 1 }, { lo: -Infinity, hi: 0 })).toEqual({ lo: -Infinity, hi: Infinity });
    });
    test('negative operands', () => {
      expect(times({ lo: -3, hi: -2 }, { lo: -5, hi: -4 })).toEqual({ lo: 8, hi: 15 });
      expect(times({ lo: -3, hi: 2 }, { lo: -5, hi: 4 })).toEqual({ lo: -12, hi: 15 });
    });
    test('widen on both bounds', () => {
      expect(widen({ lo: 0, hi: 1 }, { lo: -1, hi: 1 })).toEqual({ lo: -Infinity, hi: 1 });
      expect(widen({ lo: 0, hi: 1 }, { lo: -1, hi: 5 })).toEqual({ lo: -Infinity, hi: Infinity });
    });
answer:
  helpers/intervals.ts: |
    export type Interval = { lo: number; hi: number } | null;

    export function join(a: Interval, b: Interval): Interval {
      if (!a) return b;
      if (!b) return a;
      return { lo: Math.min(a.lo, b.lo), hi: Math.max(a.hi, b.hi) };
    }

    export function add(a: Interval, b: Interval): Interval {
      if (!a || !b) return null;
      return { lo: a.lo + b.lo, hi: a.hi + b.hi };
    }

    // 0 × ±∞ is 0: every value of the other interval, times 0, is 0.
    const mul = (x: number, y: number) => (x === 0 || y === 0 ? 0 : x * y);

    export function times(a: Interval, b: Interval): Interval {
      if (!a || !b) return null;
      const products = [mul(a.lo, b.lo), mul(a.lo, b.hi), mul(a.hi, b.lo), mul(a.hi, b.hi)];
      return { lo: Math.min(...products), hi: Math.max(...products) };
    }

    export function widen(previous: Interval, next: Interval): Interval {
      if (!previous) return next;
      if (!next) return previous;
      return {
        lo: next.lo < previous.lo ? -Infinity : previous.lo,
        hi: next.hi > previous.hi ? Infinity : previous.hi,
      };
    }
```

## Intervals in practice

**Astrée** is the best-known industrial abstract interpreter. Built at the École normale supérieure in the early 2000s, it set out to prove the absence of run-time errors (division by zero, overflow, out-of-bounds accesses, invalid floating-point operations) in embedded C code generated from synchronous specifications. :cite[blanchet2003] In November 2003, it proved, automatically, the absence of any run-time error in the primary flight-control software of the Airbus A340, 132,000 lines of C analysed in 1 hour 20 minutes, with zero false alarms. :cite[astree] Intervals are its base domain, with widening thresholds, but the result needed much more: octagons for relations between variables, a domain for the digital filters common in control software, decision trees, and trace partitioning, each added because a family of false alarms required it. Chapter 24 returns to these. Astrée is now sold by AbsInt.

**Frama-C** is an open-source platform for analysing C, developed at CEA List and Inria. Its **EVA** plugin (*Evolved Value Analysis*) is an abstract interpreter: it computes, for each statement, the possible values of every variable (intervals, with congruence information and small sets of values), and turns each operation it cannot prove safe into an alarm, written as an assertion in Frama-C's specification language, which other plugins can then try to prove with deductive verification. :cite[cuoq2012]

Both are sound: an absence of alarms is a proof, which is what makes them worth their false alarms in avionics, nuclear and automotive software. Neither looks like SonarJS. Nothing in the pinned SonarJS computes numeric ranges in this way; the closest is S2251, which checks that a `for` loop's update moves its counter towards its stop condition. It reduces the update to its direction, `+1` for `i++` or `i += 2`, `−1` for `i--` or `i -= 1`, and compares it with the direction the condition requires, `<` and `<=` requiring growth. That is an abstraction of numbers to their signs, applied to two expressions, without any iteration, and it is enough for the bug it targets.

::source{path="packages/analysis/src/jsts/rules/S2251/rule.ts" symbol="function getWrongDirection" title="S2251: a loop update's direction" note="The update is reduced to a sign and compared with the sign the stop condition requires."}

## What comes next

The analysis of this chapter was justified by intuition: intervals "contain" the values, abstract operations "cover" the concrete ones. The next chapter makes this precise, with the two functions that connect abstract values to sets of concrete ones, and turns soundness into something that can be tested.
