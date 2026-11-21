---
number: 9
title: 'Verification: finding the bugs before silicon does'
summary: 'Tests, random stimulus, coverage, assertions and exhaustive proof, and why a respin costs millions.'
duration: 75 minutes
prerequisites: [rtl]
---

:::check
If you can do these without the chapter, skim it and move on.

```answer
id: verification/check-exhaustive
title: Testing every case
prompt: 'You want to test a 32-bit adder on every pair of inputs, at a billion tests per second. How many years would it take? (Nearest year is fine.)'
answer: 585
tolerance: 10
unit: years
why: 'There are 2³² × 2³² = 2⁶⁴ ≈ 1.8 × 10¹⁹ pairs. At 10⁹ per second that is 1.8 × 10¹⁰ seconds, about 585 years. Exhaustive testing is hopeless beyond tiny designs; proof does not enumerate cases one by one.'
```

```quiz
q: A design passes a million cycles of random tests against a reference model. What has been established?
options:
  - text: That it matches the model on those million cycles, and nothing more.
    correct: true
    why: 'Tests show the presence of bugs, never their absence. How much the million cycles are worth depends on what they reached, which is what coverage measures.'
  - text: That it is correct, with high probability.
    why: 'Only if the random inputs are likely to reach every behaviour, and bugs hide precisely in the rare corners random inputs seldom reach.'
  - text: That it is correct, since a million cycles is more than it has states.
    why: 'Cycles are not states: the same few states may be visited over and over while others are never reached.'
```
:::

The counter below has a bug, the most common kind: an off-by-one. A test bench drives it and a correct reference model with the same random inputs and compares them every cycle. Run it with the default settings, then with more cycles, then with fewer resets. Then press the button that proves.

::bug-hunt

With resets in a fifth of the cycles and the counter enabled half the time, the bug is almost never found: to show it, the counter must be enabled nine times in a row without a reset, and then once more. The coverage bins show why: the values near 9 are rarely reached, and the corner case, "enabled while at 9", almost never. The proof does not sample. It explores every state the counter can reach, and finds the shortest path to the failure: eleven cycles.

## Why verification dominates

A software bug found after release is fixed with a patch. A logic bug found after tape-out means new masks, at millions to tens of millions of dollars for a leading-edge process, and months while new wafers go through the fab, while competitors ship. A bug found after customers have the chips can cost far more.

:::history{year=1994 title="The Pentium division bug" people="Thomas Nicely"}
In 1994 Thomas Nicely, a mathematician at Lynchburg College computing sums of reciprocals of twin primes, found that his Pentium processor sometimes divided wrongly, in about the fourth significant digit. Intel's floating-point divider used the SRT algorithm, which looks up partial quotients in a table; five entries of the table had been left out. Only about one division in nine billion random ones was affected, so ordinary testing had missed it.:cite[edelman1997] After a public outcry Intel offered to replace every affected chip and took a charge of $475 million. Formal proof of arithmetic units became routine in the industry soon after.
:::

So chip projects spend more effort on verification than on design: separate verification teams, often larger than the design teams, and simulation farms running around the clock. Even so, industry surveys find that fewer than a third of chip projects get working silicon from their first tape-out.:cite[foster2022]

## Tests

A **test bench** is a program that drives a design and checks it. It has three parts:

1. **Stimulus**: input values, cycle by cycle.
2. **A reference model**: an independent description of what the design should do, usually written at a higher level (often in C++ or Python), to which the design's outputs are compared every cycle. This comparison is called a **scoreboard**.
3. **Checks**: assertions about the design's internal behaviour.

Stimulus can be **directed** (hand-written for a specific scenario) or **constrained random** (random values within rules, like "reset rarely"). Directed tests reach the cases their author thought of; random tests reach cases nobody thought of, but only the likely ones, as the widget showed.

:::software[Property-based testing]
Constrained-random verification is what software calls property-based testing (QuickCheck, Hypothesis): generate random inputs within constraints, check properties, shrink failures to small examples. Chip verification came to it independently, at industrial scale, and adds two things software testing rarely has: a formal measure of what was exercised (functional coverage), and the expectation of proof for the parts that matter most.
:::

## Coverage

A test suite that passes says nothing about the behaviours it never exercised. **Coverage** measures what was exercised.

- **Code coverage** records which lines and branches of the RTL ever executed, as in software.
- **Functional coverage** records behaviours the verification plan lists: "the counter has shown each value 0–9", "it has wrapped while enabled", "two resets in a row", each a **bin** to be filled.

A typical project writes a plan with thousands of bins, runs random tests and watches coverage grow; when it stalls, engineers write directed tests or tune the random constraints to reach the empty bins. In the widget, lowering the chance of reset fills the bins near 9 and soon finds the bug.

## Assertions

An **assertion** states something that must be true in every cycle. It is checked continuously during simulation, and it is also the input to a proof. Assertions catch bugs where they happen, inside the design, instead of many cycles later when a wrong value reaches an output.

```rtl
id: verification/catch
title: An assertion that catches the bug
prompt: 'This is the buggy counter. Without changing how it behaves, add an `assert` that holds in every reachable state of a correct counter but fails on this one.'
mode: catch
code: |
  // One digit of a clock: counts 0, 1, …, 9, 0, … while en is 1.
  input en
  input rst
  reg q: 4 = 0
  output tc = en && q == 9
  output digit: 4 = q
  q <= rst ? 0 : !en ? q : q == 10 ? 0 : q + 1
reference: |
  input en
  input rst
  reg q: 4 = 0
  output tc = en && q == 9
  output digit: 4 = q
  q <= rst ? 0 : !en ? q : q == 9 ? 0 : q + 1
solution: |
  // One digit of a clock: counts 0, 1, …, 9, 0, … while en is 1.
  input en
  input rst
  reg q: 4 = 0
  output tc = en && q == 9
  output digit: 4 = q
  q <= rst ? 0 : !en ? q : q == 10 ? 0 : q + 1
  assert q <= 9    // a decimal digit is never more than 9
hints:
  - What value can the buggy counter hold that a decimal digit never should?
why: 'The assertion states the specification’s invariant, a digit is at most 9, independently of how the counter is built. It fails in the eleventh cycle of the shortest run, the one the proof found above.'
```

Now fix the design. The check proves your design equivalent to a correct counter in every reachable state, for every input sequence.

```rtl
id: verification/fix
title: Fix the counter
prompt: 'Fix the bug. Keep the assertion: it should hold in every reachable state.'
code: |
  input en
  input rst
  reg q: 4 = 0
  output tc = en && q == 9
  output digit: 4 = q
  q <= rst ? 0 : !en ? q : q == 10 ? 0 : q + 1
  assert q <= 9
reference: |
  input en
  input rst
  reg q: 4 = 0
  output tc = en && q == 9
  output digit: 4 = q
  q <= rst ? 0 : !en ? q : q == 9 ? 0 : q + 1
solution: |
  input en
  input rst
  reg q: 4 = 0
  output tc = en && q == 9
  output digit: 4 = q
  q <= rst ? 0 : !en ? q : q == 9 ? 0 : q + 1
  assert q <= 9
why: 'With the wrap at 9, the assertion is proved in all ten reachable states and the design is proved equivalent to the reference. The same check runs after every change in a real project, so a fix cannot quietly break something else.'
```

## Proof

How does a tool prove an assertion for every input sequence, without enumerating sequences? By enumerating **states** instead. A design's future depends only on its current register values and its inputs, so if every reachable state has been checked with every input, every sequence has been covered. Search outwards from the power-on state, breadth first, adding each new state reached:

::state-space

That is **explicit-state model checking**. Breadth-first search also gives the shortest counterexample, which is why the proof's waveform is as short as possible. The counter has 16 possible states, of which 10 (or 11, with the bug) are reachable, and 4 input combinations: 64 transitions to check. The trouble is growth. Each flip-flop doubles the number of states, and a processor core has hundreds of thousands of flip-flops. Nobody enumerates $2^{100\,000}$ states.

Real formal tools avoid enumeration. They encode "there is a sequence of $k$ cycles from power-on to a state where the assertion fails" as a Boolean formula and hand it to a **SAT solver**, which searches the space of assignments cleverly instead of exhaustively (**bounded model checking**). They prove that an assertion, if true in some state, remains true after any cycle (**induction**), so that no depth bound is needed. And they use the structure of the design to cut the problem into pieces. Formal verification is used everywhere proof is cheaper than doubt: arithmetic units, cache-coherence protocols, bus interfaces, and above all **equivalence checking**.

:::key
Simulation checks the cases you run. Proof checks every reachable state, by exploring states rather than input sequences, symbolically when there are too many to list. Equivalence checking proves that two descriptions of a design behave identically, and it is what keeps each step of the flow honest.
:::

**Equivalence checking** proves that two versions of a design compute the same outputs from the same inputs: the RTL and the gate netlist after synthesis, the netlist before and after a timing fix, the old RTL and a refactored one. Since the two usually share their registers, it reduces to proving that their combinational logic is equivalent, which SAT solvers do well. Every exercise in this part is checked this way.

## Summary

- Bugs found after tape-out cost new masks and months; verification takes more effort than design.
- A test bench applies stimulus, compares with a reference model (a scoreboard) and checks assertions. Random stimulus finds the unexpected but only reaches likely behaviour.
- Coverage measures what the tests exercised; empty bins show where to aim.
- Assertions state invariants, checked in simulation and by proof. Model checking explores reachable states, giving shortest counterexamples; symbolic methods (SAT, induction) scale it. Equivalence checking proves that two versions of a design agree.
