---
title: Soundness
summary: What it means for an abstract value to describe concrete ones, and for an analysis to be sound. Concretisation and abstraction, Galois connections, best transformers, and testing a domain against an interpreter.
number: 23
duration: 55 minutes
prerequisites: [intervals-and-widening]
---

Chapter 1 called an analysis **sound** for a property when it never misses a real instance of it, and said that soundness is usually obtained by over-approximating what a program can do. The interval analysis of chapter 22 was built on that intuition: an interval "contains" the values a variable can hold, an abstract operation "covers" the concrete one. This chapter makes the intuition precise. It defines what an abstract value means, states what each part of an analysis must guarantee for the whole to be sound, and turns that guarantee into something a test can check.

## What an abstract value means

An abstract value stands for a set of concrete values. The function that gives the set is the **concretisation**, written γ (gamma):

- in the interval domain, `γ([a, b]) = { n | a ≤ n ≤ b }`;
- in the domain of signs, `γ(+) = { 1, 2, 3, … }`, `γ(0) = { 0 }`, `γ(⊤)` is every integer and `γ(⊥) = ∅`;
- in the domain of parity, `γ(even) = { …, −2, 0, 2, … }`.

γ is monotone: a less precise abstract value stands for more concrete ones, `a ⊑ b` implies `γ(a) ⊆ γ(b)`. The order of chapter 13, "at least as precise as", now has a meaning: `a ⊑ b` when `a` says at least as much as `b` about the values.

Going the other way, the **abstraction** α (alpha) of a set of concrete values `S` is the most precise abstract value whose concretisation contains `S`. For intervals, α of `{−2, 0, 3}` is `[−2, 3]`; for signs, it is ⊤, since the set has negative, zero and positive values; for parity, also ⊤.

Click integers below to build a set, and switch domains to see how each abstracts it. The band shows γ(α(S)): everything the abstract value admits, which always includes `S` and usually more.

::galois-view{n="23.1" exprs="" title="Abstraction and concretisation" caption="Each domain keeps different information about the same set. Intervals keep its extent, signs which side of zero it is on, parity whether its elements are even, constants whether it has a single element."}

## Galois connections

α and γ fit together in a precise way. For every set `S` and abstract value `a`:

:::equation{#galois caption="The Galois connection between sets of values and abstract values."}
$$\alpha(S) \sqsubseteq a \iff S \subseteq \gamma(a)$$
:::

In words: `a` is a correct description of `S` exactly when `a` is above the best description of `S`. A pair of functions with this property is a **Galois connection**, after the correspondence of the same shape in Galois theory, and it is the framework the Cousots gave abstract interpretation in 1977 and developed in 1979. :cite[cousot1977,cousot1979] Two consequences follow from it directly:

- `S ⊆ γ(α(S))`: abstracting, then concretising, never loses a value. It may add some: `{0, 10}` becomes `[0, 10]`, which admits 1 to 9.
- `α(γ(a)) ⊑ a`: concretising, then abstracting, gives back `a` or something more precise. In the domains of this chapter it gives back `a` exactly.

Not every useful domain has an α. The domain of convex polyhedra, which describes sets of points in space by linear inequalities, has no best description of a disc: every polygon around it can be refined by a polygon with one more side. Such domains are used with γ alone, and their operations are designed to be sound without a "best" to compare with. :cite[cousot1992]

```quiz
q: "In the domain of signs, what is α({3, 5, 8})? And what is γ of it?"
options:
  - text: "+, and γ(+) is every positive integer."
    correct: true
    why: "+ is the most precise sign whose concretisation contains the three numbers. Its concretisation contains infinitely many more: the domain cannot say how big the values are."
  - text: "[3, 8], and γ is {3, 4, 5, 6, 7, 8}."
    why: "That is the interval domain's answer. Signs only know which side of zero the values are on."
  - text: "⊤, because the set has more than one element."
    why: "⊤ is for sets with values of different signs. These are all positive."
```

## From values to analyses

The same idea lifts from values to whole program states, and from operations to whole analyses. At each point of a function, the set of states that executions can reach there is the **collecting semantics**: the least fixpoint of equations shaped like chapter 13's, with sets of concrete states as facts, union as the join, and the program's real operations as transfer functions. It is exact, and it is what Rice's theorem says no analysis can compute in general: the sets are infinite, and their fixpoint is not reached in finite time.

An abstract analysis replaces each set of states with an abstract value, and each concrete transfer function `f` with an abstract one `f♯`. Its correctness rests on one local condition per transfer function. For every abstract value `a`:

:::equation{#local-soundness caption="Local soundness: the abstract transfer function covers every concrete result."}
$$f(\gamma(a)) \subseteq \gamma(f^\sharp(a))$$
:::

Every concrete result of running the statement from a state described by `a` must be described by `f♯(a)`. When every transfer function, every edge refinement and the join satisfy it, a theorem of the Cousots guarantees that the abstract fixpoint describes the collecting semantics: every state that some execution reaches at a point is in γ of the analysis's fact there. Widening keeps this, since a widened fact is above the facts it replaces. That is what *sound* means precisely, and why each alarm the interval analysis did not raise is a proof: if no fact at a division admits a divisor of 0, no execution divides by 0.

Edge refinements are transfer functions too. On the edge where `x > 100` holds, the concrete function keeps only the states where the condition holds; the abstract one meets `x`'s interval with `[101, +∞]`. Both drop exactly the states that cannot take the edge, so the refinement is sound. A refinement that dropped one state too many, `[102, +∞]` for instance, would be unsound: an execution with `x = 101` would reach a point the analysis believes it describes completely.

## Best transformers

Among all sound abstract versions of a concrete function `f`, one is the most precise: the **best transformer**

:::equation{#best caption="The best transformer: concretise, apply, abstract."}
$$f^\sharp_{\text{best}}(a) = \alpha(f(\gamma(a)))$$
:::

It concretises, applies the real function to every value, and abstracts the result. Every sound `f♯` satisfies `f♯best(a) ⊑ f♯(a)`. The best transformer is rarely what an analysis computes, because `γ(a)` is usually infinite. Analyses evaluate expressions **compositionally** instead, applying each operator's abstract version to its operands' abstract values, and composition loses precision whenever the same value is used twice.

Choose an expression in the figure. It shows the concrete results `f(S)`, the analysis's compositional result, and the best transformer's. With `x ∈ [−2, 3]`, `x * x` evaluates to `[−2, 3] × [−2, 3] = [−6, 9]`, while the best transformer gives `[0, 9]`: the multiplication's abstract version does not know that its operands are the same number. `x - x` is the extreme case: intervals, signs and constants all lose the fact that the result is 0. Parity does better once `x`'s parity is known, `odd − odd = even`, and signs get `x * x` right once `x`'s sign is known, `− × − = +`: their abstract operations happen to keep the information that matters. Choose a set of odd numbers, or of negative ones, to see it.

::galois-view{n="23.2" set="-2,0,3" exprs="x * x|x - x|x + 1|2 * x|(x + 1) * (x - 1)" initial="intervals" title="Compositional and best transformers" caption="The upper band is the analysis’s result, operation by operation; the lower band is the best transformer’s. Try the same set in each domain."}

```quiz
q: "With x ∈ [1, 3] in the interval domain, what are the analysis's result and the best transformer's for `(x + 1) * (x - 1)`?"
options:
  - text: "The analysis gives [0, 8]; the best transformer also gives [0, 8]."
    correct: true
    why: "Compositionally, [2, 4] × [0, 2] = [0, 8]. The concrete results for x = 1, 2, 3 are 0, 3 and 8, whose hull is [0, 8]. Here composition loses nothing, because both factors are non-negative and grow with x."
  - text: "The analysis gives [-8, 8]; the best transformer gives [0, 8]."
    why: "x − 1 is in [0, 2], not [−2, 2]: subtracting 1 from [1, 3] gives [0, 2]."
  - text: "The analysis gives [0, 8]; the best transformer gives {0, 3, 8}."
    why: "The best transformer's result is an abstract value: an interval, [0, 8]. The domain cannot express a set with holes."
```

Analysers recover some of the lost precision by rewriting expressions before evaluating them (`x * x` as a square, whose abstract version knows the result is non-negative), by tracking relations between variables (chapter 24), or, at a cost, by splitting an abstract value into smaller ones and evaluating each.

## Testing soundness

The local condition is easy to state and easy to get wrong: an off-by-one in a refinement, a forgotten sign case in a multiplication, a bound of `0 × ∞` computed as `NaN`. Proofs are one remedy. Tests are another, and the Galois connection says exactly what to test: run the concrete operation on values inside `γ(a)`, and check that every result is inside `γ(f♯(a))`.

The course tests its own domains this way, at two scales. For each domain of this chapter, it enumerates sets of integers and checks the Galois connection, then checks every operation against the concrete one on every value of the concretisation. For the interval analysis of chapter 22, it runs a **concrete interpreter** on the same control-flow graphs, with many inputs, records the state on arrival at each node, and checks that every recorded value lies in the analysis's interval for that node. A broken refinement or multiplication fails within a few inputs. Researchers apply the same idea to established analysers, generating programs by the thousands and comparing what different analysers claim about them; one such study found soundness or precision issues in most of the six analysers it tested. :cite[klinger2019]

## Exercise: find the counterexample

```helper
id: soundness/find-counterexample
title: A soundness tester for interval operations
prompt: |
  Implement `findCounterexample` in `helpers/soundness.ts`. It receives a concrete binary operation on integers and a proposed abstract version on intervals, and searches for a proof that the abstract version is unsound: two intervals `a` and `b` whose bounds are integers in `[-bound, bound]`, and two integers `x ∈ a` and `y ∈ b` such that `concrete(x, y)` is not in `abstract(a, b)`. Return the first one found, or `null` if the abstract operation is sound on every such pair of intervals. An abstract result of `null` (⊥) contains nothing.

  The tests pass both sound and unsound operations; for unsound ones, they check that the counterexample you return really is one.
files:
  helpers/soundness.ts: |
    export type Interval = { lo: number; hi: number } | null;

    export interface Counterexample {
      a: { lo: number; hi: number };
      b: { lo: number; hi: number };
      x: number;
      y: number;
      /** concrete(x, y) */
      value: number;
      /** abstract(a, b) */
      claimed: Interval;
    }

    export function findCounterexample(
      concrete: (x: number, y: number) => number,
      abstract: (a: { lo: number; hi: number }, b: { lo: number; hi: number }) => Interval,
      bound: number,
    ): Counterexample | null {
      // TODO: enumerate every interval with bounds in [-bound, bound], every pair, every x and y.
      return null;
    }
tests:
  soundness.test.ts: |
    import { test, expect } from 'workbench:test';
    import { findCounterexample, type Counterexample } from '../rules/helpers/soundness.js';

    const isReal = (c: Counterexample | null, concrete: (x: number, y: number) => number) =>
      !!c && c.a.lo <= c.x && c.x <= c.a.hi && c.b.lo <= c.y && c.y <= c.b.hi && c.value === concrete(c.x, c.y)
      && (!c.claimed || c.value < c.claimed.lo || c.value > c.claimed.hi);

    const add = (x: number, y: number) => x + y;
    const sub = (x: number, y: number) => x - y;

    test('a sound addition has no counterexample', () => {
      expect(findCounterexample(add, (a, b) => ({ lo: a.lo + b.lo, hi: a.hi + b.hi }), 3)).toBe(null);
    });
    test('a subtraction with the bounds the wrong way round is caught', () => {
      const c = findCounterexample(sub, (a, b) => ({ lo: a.lo - b.lo, hi: a.hi - b.hi }), 3);
      expect(isReal(c, sub)).toBe(true);
    });
hiddenTests:
  more.test.ts: |
    import { test, expect } from 'workbench:test';
    import { findCounterexample, type Counterexample } from '../rules/helpers/soundness.js';

    const isReal = (c: Counterexample | null, concrete: (x: number, y: number) => number) =>
      !!c && c.a.lo <= c.x && c.x <= c.a.hi && c.b.lo <= c.y && c.y <= c.b.hi && c.value === concrete(c.x, c.y)
      && (!c.claimed || c.value < c.claimed.lo || c.value > c.claimed.hi);

    const mul = (x: number, y: number) => x * y;
    const extremes = (a: { lo: number; hi: number }, b: { lo: number; hi: number }) => {
      const p = [a.lo * b.lo, a.lo * b.hi, a.hi * b.lo, a.hi * b.hi];
      return { lo: Math.min(...p), hi: Math.max(...p) };
    };

    test('the four-products multiplication is sound', () => {
      expect(findCounterexample(mul, extremes, 3)).toBe(null);
    });
    test('a multiplication that only multiplies matching bounds is caught', () => {
      const c = findCounterexample(mul, (a, b) => ({ lo: a.lo * b.lo, hi: a.hi * b.hi }), 3);
      expect(isReal(c, mul)).toBe(true);
    });
    test('a bottom result is unsound when a concrete result exists', () => {
      const c = findCounterexample(mul, () => null, 1);
      expect(isReal(c, mul)).toBe(true);
    });
    test('a remainder that forgets negative dividends is caught', () => {
      const rem = (x: number, y: number) => (y === 0 ? 0 : x % y);
      const naive = (a: { lo: number; hi: number }, b: { lo: number; hi: number }) => {
        const m = Math.max(Math.abs(b.lo), Math.abs(b.hi));
        return { lo: 0, hi: Math.max(0, m - 1) };
      };
      const c = findCounterexample(rem, naive, 3);
      expect(isReal(c, rem)).toBe(true);
      expect(c!.x).toBeLessThan(0);
    });
    test('a single wrong corner is found', () => {
      // Sound except when both intervals are exactly [3, 3].
      const almost = (a: { lo: number; hi: number }, b: { lo: number; hi: number }) =>
        a.lo === 3 && a.hi === 3 && b.lo === 3 && b.hi === 3 ? { lo: 0, hi: 8 } : extremes(a, b);
      const c = findCounterexample(mul, almost, 3);
      expect(isReal(c, mul)).toBe(true);
      expect(c!.value).toBe(9);
    });
answer:
  helpers/soundness.ts: |
    export type Interval = { lo: number; hi: number } | null;

    export interface Counterexample {
      a: { lo: number; hi: number };
      b: { lo: number; hi: number };
      x: number;
      y: number;
      value: number;
      claimed: Interval;
    }

    export function findCounterexample(
      concrete: (x: number, y: number) => number,
      abstract: (a: { lo: number; hi: number }, b: { lo: number; hi: number }) => Interval,
      bound: number,
    ): Counterexample | null {
      const intervals: { lo: number; hi: number }[] = [];
      for (let lo = -bound; lo <= bound; lo++) for (let hi = lo; hi <= bound; hi++) intervals.push({ lo, hi });
      for (const a of intervals) {
        for (const b of intervals) {
          const claimed = abstract(a, b);
          for (let x = a.lo; x <= a.hi; x++) {
            for (let y = b.lo; y <= b.hi; y++) {
              const value = concrete(x, y);
              if (!claimed || value < claimed.lo || value > claimed.hi) return { a, b, x, y, value, claimed };
            }
          }
        }
      }
      return null;
    }
```

Exhaustive testing over small bounds finds most bugs of this kind, because they are about signs, zero and the order of bounds, all of which small integers exercise. It proves nothing about large values, or about infinite bounds: a full test suite would add intervals with infinite bounds and check them against sampled values.

## Sound with respect to what?

A soundness theorem is relative to a semantics: the concrete meaning the analysis approximates. Astrée's results hold for C as its standard and the target platform define it, under hypotheses about the environment (the ranges of sensor inputs, for instance) that its users state. A sound analysis for JavaScript would need a semantics covering getters that run code, `eval`, prototypes modified at run time, and modules loaded dynamically; the course's interval analysis is sound only for its integer subset, which is why chapter 22 said so.

SonarJS's rules make the opposite choice, and say so in their design: they are not sound, and do not try to be. An issue should be right; a missed bug is the accepted cost (chapters 1 and 21). Both choices are coherent. They answer different questions: *can this program ever fail?* for software where a failure is unacceptable, and *is this code worth a developer's attention?* for software where attention is the budget. Many analysers in between are **soundy** in Livshits's sense, sound for a core of the language and explicit about the rest. :cite[livshits2015soundiness]

## What comes next

A single domain sees one kind of information. The next chapter, which is optional, combines domains: products that run several at once, reduced products that let them inform each other, partitioning that keeps paths apart, and relational domains that can finally express `i = j`.
