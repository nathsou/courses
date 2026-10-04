---
number: 27
title: Better abstractions
summary: 'Intervals forget how variables relate. Octagons keep x ± y ≤ c, polyhedra any linear inequality, each at a higher price. Then a different idea: abstract a program by the truth of a few predicates, and when the abstraction finds a counterexample that the program cannot follow, learn new predicates from it (CEGAR). Either way, the invariants found can be handed to the verifier, which trusts nothing it has not checked.'
duration: About 1 hour
---

Chapter 26 ended on a false alarm. The fixed heartbeat handler checks that the request is long enough before it loops, yet the interval analysis still warns that the index may be out of bounds, because it describes each variable on its own: `i` is between 0 and +∞, the length is at least 0, and nothing links them. The fact that would remove the alarm is a **relation**, `i < len(request)`. This chapter is about abstractions that can hold such facts, and about how to choose one.

## Relational domains

The **octagon** domain, introduced by Antoine Miné, keeps constraints of the form ±x ± y ≤ c: a bound on the sum or the difference of any two variables, as well as on each variable alone.:cite[mine2006] In two dimensions such a region is an octagon, hence the name. The heartbeat's `i < len(request)` is one of them (i − len ≤ −1), and so is `lo ≤ hi`. Octagons are stored as a matrix of bounds over the variables and their negations; keeping the bounds consistent with each other (if i − n ≤ −1 and n − m ≤ 0 then i − m ≤ −1) is a shortest-path computation, cubic in the number of variables. The domain was built into Astrée, where relations between pairs of variables were needed to avoid false alarms.:cite[mine2006,blanchet2003]

**Polyhedra**, from Patrick Cousot and Nicolas Halbwachs in 1978, go all the way: any conjunction of linear inequalities, a·x + b·y + … ≤ c, with any coefficients and any number of variables.:cite[cousot1978] They can express `y = 2·x`, or `x + y + z ≤ n`. The cost is in the operations: joining two polyhedra means computing a convex hull, and the number of faces can grow exponentially with the number of variables.

The plot below shows the states of a loop at its head, collected by running it, and three shapes around them: the box that the interval analysis computes, the octagon that the octagon analysis computes, and the convex hull of the states, the smallest polyhedron that contains them. The assertion below the loop is a half-plane; a domain proves it when its shape lies entirely on the safe side.

:::domain-compare{title="Walking towards each other" fn="walk" x="x" y="y" assertion="x + y <= 10" plane='{"a": 1, "b": 1, "c": 10}'}
```vouch
fn walk() {
  var x = 0
  var y = 10
  while x < 10 {
    x = x + 1
    y = y - 1
  }
  assert x + y <= 10
}
```
:::

The intervals know that x lies between 0 and 10 and that y is at most 10, and so they allow x + y = 20. The octagon knows x + y = 10 exactly: a constraint on a sum of two variables, which is its speciality. Here is a loop where even that is not enough:

:::domain-compare{title="Twice as fast" fn="double" x="x" y="y" assertion="y <= 2 * x" plane='{"a": -2, "b": 1, "c": 0}'}
```vouch
fn double() {
  var x = 0
  var y = 0
  while x < 10 {
    x = x + 1
    y = y + 2
  }
  assert y <= 2 * x
}
```
:::

The states lie on the line y = 2·x. An octagon can only draw lines at 45 degrees or parallel to the axes, so the best it can say is that y lies above x; its widening then loses the upper bound on y − x, which grows by one each time round. The smallest polyhedron containing the states is the segment itself, and it proves the assertion. A polyhedra analysis would find y = 2·x at the loop head; it is the most expensive of the three domains, and the only one of them that can express this relation.

```quiz
q: 'You need to prove `0 <= i < len(a)` for array accesses inside loops that count i up to len(a). Which is the cheapest domain that can do it?'
options:
  - text: Intervals.
    why: 'They can prove 0 ≤ i, but i < len(a) relates two variables, and intervals hold each variable on its own.'
  - text: Octagons.
    correct: true
    why: 'i − len(a) ≤ −1 is a difference of two variables, exactly the form octagons keep, at a cost quadratic in space and cubic in time in the number of variables.'
  - text: Polyhedra.
    why: 'They would work too, but they are more expensive than necessary: the relation has the form octagons can already express.'
```

## The analyser as an oracle

An abstract interpreter computes invariants: the state at a loop head is one. The verifier of Part IV needs invariants and cannot find them. The obvious combination is to let the analyser propose and the verifier check. The analyser is then an **untrusted oracle**: if it is wrong, through a bug or an unsound shortcut, the verifier rejects the invariant and nothing is lost. If it is right, the verifier's proof is the guarantee, and the analyser's code need not be trusted at all. Both widgets above have a button that writes the octagon's loop-head state into the code as an `invariant` and runs the verifier on it. For the first loop, the verifier proves the invariant and the assertion. For the second, it proves that the invariant holds, but the assertion does not follow from it: the oracle told the truth, just not enough of it, and the verifier says so.

## Predicates instead of numbers

A different kind of abstraction keeps no numbers at all. Choose a few **predicates** about the program's variables, such as `i < n` and `i == n`, and describe each program point by which combinations of their truth values can occur there. This is **predicate abstraction**, from Susanne Graf and Hassen Saïdi in 1997.:cite[graf1997] The abstract program has finitely many states, so its reachable states can be computed exactly, with an SMT solver deciding which combinations each statement can lead to.

Which predicates? Edmund Clarke, Orna Grumberg, Somesh Jha, Yuan Lu and Helmut Veith proposed in 2000 to let the counterexamples choose: **counterexample-guided abstraction refinement**, or CEGAR.:cite[clarke2000] Start with the predicates the assertions mention. If the abstraction reaches a failing assertion, take the abstract path that gets there and check it against the real program: compute the condition under which an input would follow it, edge by edge, backwards. If an input can, the bug is real. If none can, the counterexample is **spurious**: the abstraction was too coarse, and the conditions computed along the path say what it lacked. Add them as predicates and start again. Thomas Ball and Sriram Rajamani's SLAM toolkit applied the loop to the C code of Windows device drivers, checking rules such as the correct use of locks.:cite[ball2001]

:::cegar-loop{title="Learning a predicate" fn="count"}
```vouch
fn count(n: int)
  requires n > 0
{
  var i = 0
  var s = 0
  while i < n {
    s = s + i
    i = i + 1
  }
  assert i == n
}
```
:::

With the single predicate `n == i`, the abstraction cannot tell whether the loop has gone too far: it finds a path that leaves the loop with `i != n`. The path is spurious, since it would require 0 ≥ n, and the conditions along it supply `i < n`. In the second round, the two predicates together describe the loop head as "i < n, or i == n", and the assertion holds. Hand the invariant to the verifier: the oracle's answer is checked.

Now a loop with a real bug. The counter goes up in steps of two, so for an odd n it jumps past n and the loop exits with `i != n`.

:::cegar-loop{title="A real counterexample" fn="by_twos"}
```vouch
fn by_twos(n: int)
  requires n >= 0
{
  var i = 0
  while i < n {
    i = i + 2
  }
  assert i == n
}
```
:::

```quiz
q: 'CEGAR finds an abstract path to a failing assertion, and the solver says no input can follow it. What happens next?'
options:
  - text: The assertion is reported as failing.
    why: 'Only a path some input can follow is a real failure. This one is spurious.'
  - text: New predicates are taken from the conditions along the path, and the abstraction is computed again.
    correct: true
    why: 'That is the refinement step. With the new predicates, the abstraction can tell apart the states that made the path look possible, so the same path cannot be found again.'
  - text: The assertion is proved.
    why: 'Not yet: other abstract paths may reach the failing assertion. Only when none does is it proved.'
```

CEGAR is not guaranteed to stop. Each round rules out at least one abstract path, but a loop can produce infinitely many (one for each number of iterations), and the predicates learnt from each may never generalise into the invariant that would cover them all. The course's version gives up after eight rounds. Production tools add better ways of choosing predicates, Craig interpolants among them, but none escapes the undecidability that the fixed-size proofs of Part V worked around.

:::history
**Three routes to the same invariants.** Cousot and Halbwachs's polyhedra (1978) were the first relational domain, and long remained the most precise one in common use.:cite[cousot1978] Graf and Saïdi's predicate abstraction (1997) came from model checking, not from abstract interpretation, though it is an abstract interpretation too.:cite[graf1997] CEGAR (2000) made the choice of abstraction automatic, and SLAM (2001) put it to work on device drivers.:cite[clarke2000,ball2001] Miné's octagons (2006) found the middle ground that an industrial analyser needed.:cite[mine2006] *How we got here (Part VI)* follows what happened to these tools once they met real codebases.
:::

:::hood
**The course's versions.** Octagons are in `src/lib/fv/absint/octagon.ts`: a difference-bound matrix over the variables and their negations, strong closure with integer tightening, and an exact transfer function for assignments of the form x := ±y + c. The polyhedron in the plots is the convex hull of the sampled states, not the result of a polyhedra analysis, which the course does not implement. CEGAR is in `cegar.ts`: a control-flow graph from the chapter 17 translation, explicit sets of predicate valuations, the SMT solver for each abstract step, weakest preconditions to check abstract paths, and the atoms of those preconditions as new predicates. `handoff.ts` writes an invariant into the code and runs the Part IV verifier.
:::

:::proved
**What did we prove?** When the verifier accepts an analyser's invariant, the function's assertions and checks hold for every input satisfying its precondition, by the verifier's proof. When CEGAR reports *safe*, the assertions hold for every such input, by the abstraction's exhaustive search; its invariants, checked by the verifier, make the result independent of the CEGAR implementation. When CEGAR reports a real counterexample, the interpreter replays it.
:::

## What comes next

Part VI ends here. Part VII puts the course's tools together on one system, the Ledger, and then asks the question every verified result raises: [what exactly was proved](/chapters/what-did-we-prove/), and what was assumed?

## Further reading

- Miné's article presents the octagon domain in full.:cite[mine2006]
- Clarke and colleagues' paper introduces counterexample-guided abstraction refinement.:cite[clarke2000]
- Ball and Rajamani's paper describes SLAM.:cite[ball2001]
