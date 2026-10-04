---
number: A
title: Logic primer
summary: 'The logic the course uses, in one place: propositions and their connectives, satisfiability and validity, quantifiers and how to negate them, sets, relations and functions, and induction. Each section says where the course first needs it.'
---

The course introduces logic as it needs it. This appendix collects it for reference, with the notation of the course and its spelling in Vouch. Nothing here is beyond school algebra; what takes practice is reading formulas precisely.

## Propositions

A **proposition** is a statement that is true or false: `x > 3`, `the lock is free`. Propositions combine with **connectives**:

| Connective | Written | Vouch | True when |
|---|---|---|---|
| not | ¬P | `!P` | P is false |
| and | P ∧ Q | `P && Q` | both are true |
| or | P ∨ Q | `P \|\| Q` | at least one is true (both may be) |
| implies | P ⟹ Q | `P ==> Q` | P is false, or Q is true |
| if and only if | P ⟺ Q | `P <==> Q` | both have the same value |

Implication is the one that surprises people. P ⟹ Q says nothing when P is false: "if the account is frozen, the withdrawal is at most 100" is true of every open account, whatever is withdrawn. That is what makes `requires` work: a contract is the implication *precondition ⟹ postcondition*, and it holds trivially for inputs the precondition excludes. It is also the source of a classic specification bug, written `&&` where `==>` was meant (chapter 29's court has one).

Some equivalences used throughout:

- ¬(P ∧ Q) is ¬P ∨ ¬Q, and ¬(P ∨ Q) is ¬P ∧ ¬Q (De Morgan's laws);
- P ⟹ Q is ¬P ∨ Q, and also ¬Q ⟹ ¬P (the contrapositive);
- ¬(P ⟹ Q) is P ∧ ¬Q: an implication fails only when its premise holds and its conclusion does not. A counterexample is exactly such a case.

## Satisfiable, valid, unsatisfiable

A formula with variables is **satisfiable** if some assignment of values makes it true, and **valid** if every assignment does. The two are linked by negation: F is valid exactly when ¬F is **unsatisfiable**. This is how every prover in the course works. To show that a program meets its contract for all inputs, it builds a formula that says "the contract fails on this input" and asks a solver whether it is satisfiable. A satisfying assignment is a counterexample; an answer of *unsatisfiable*, with its proof, means the contract holds for all inputs (chapters 6 and 8).

A formula is in **conjunctive normal form** (CNF) when it is an *and* of **clauses**, each an *or* of **literals** (a variable or its negation): (x ∨ ¬y) ∧ (y ∨ z). SAT solvers take CNF; chapter 6 shows how to turn any formula into it without blowing up its size.

```quiz
q: 'A solver reports that ¬F is unsatisfiable. What does that say about F?'
options:
  - text: F is valid.
    correct: true
    why: 'No assignment makes ¬F true, so every assignment makes F true.'
  - text: F is unsatisfiable.
    why: 'That would follow if F itself were unsatisfiable. Here it is ¬F.'
  - text: Nothing, until a model of F is found.
    why: 'An unsatisfiability answer is a statement about every assignment: it is enough.'
```

## Quantifiers

**Predicates** are propositions with parameters: `sorted(a)`, `x < y`. **Quantifiers** say for how many values a predicate holds:

| Quantifier | Written | Vouch | Means |
|---|---|---|---|
| for all | ∀x. P(x) | `forall x :: P(x)` | P holds for every x |
| there exists | ∃x. P(x) | `exists x :: P(x)` | P holds for at least one x |

Quantifiers are usually restricted to a range, with an implication for `forall` and a conjunction for `exists`:

- "every element of a is positive": `forall k :: 0 <= k < len(a) ==> a[k] > 0`;
- "some element of a is zero": `exists k :: 0 <= k < len(a) && a[k] == 0`.

Mixing them up is a common error. `exists k :: 0 <= k < len(a) ==> a[k] == 0` is true of every array, because any k outside the range makes the implication true.

Negation swaps them: ¬∀x. P(x) is ∃x. ¬P(x) ("not every element is positive" means "some element is not"), and ¬∃x. P(x) is ∀x. ¬P(x). The order of different quantifiers matters: ∀x. ∃y. y > x (every number has a larger one) is true of the integers; ∃y. ∀x. y > x (some number is larger than all) is false.

A variable bound by a quantifier is **bound**; any other variable is **free**. In `forall k :: a[k] <= m`, k is bound and `a` and `m` are free: the formula is a statement about `a` and `m`.

Satisfiability of formulas with quantifiers is undecidable in general. Chapter 19 shows how SMT solvers handle them anyway, by instantiating them with well-chosen terms; chapter 25 uses a fragment where the problem becomes decidable.

## Sets, relations and functions

A **set** is a collection without order or repetition: {1, 2, 3}. x ∈ S means x is an element of S (`x in S`). A ∪ B, A ∩ B and A \ B are union, intersection and difference; A ⊆ B means every element of A is in B; |S| is the number of elements (`#S`).

A **relation** between sets A and B is a set of pairs (a, b). `parent` relates each person to their parents; `<` relates integers. Relations can be **composed** (the parents of the parents are the grandparents: in Vouch's worlds, `p.parent.parent`), and their **transitive closure** relates a to b when a chain of steps leads from one to the other (ancestors: `p.^parent`). Chapter 9 builds models out of relations.

A **function** from A to B is a relation that relates each element of A to exactly one element of B. `Shard -> RM` in a system is a function: every shard has exactly one state. A **partial** function relates each element to at most one.

A **multiset** is a set that counts repetitions: {1, 1, 2} has three elements. Two arrays are permutations of each other exactly when their multisets of elements are equal, which is how chapter 19 says that a sort rearranges its input.

## Induction

To prove that P(n) holds for every natural number n, **induction** proves two things: P(0) (the base case), and P(n) ⟹ P(n + 1) for every n (the step). Together they reach every number, one step at a time.

The same pattern has many forms in the course:

- **structural induction** over a list or a tree: prove P for the empty list, and for a list with a first element, assuming P for the rest. A recursive lemma with a `decreases` clause is such a proof (chapter 19).
- **loop invariants** are induction over the iterations of a loop: true on entry (the base), preserved by each iteration (the step), so true on exit (chapter 18).
- **inductive invariants** of systems are induction over the steps of every run: true in every initial state, preserved by every action (chapter 23).
- **well-founded induction** uses any measure that decreases and cannot decrease forever, such as `hi - lo` in a binary search; it is what `decreases` checks, and what proves that loops terminate (chapter 18).

When the step fails, the property may still be true but not **inductive**: it does not carry enough information to be preserved. The cure is to strengthen it, proving something more, so that the stronger statement carries itself from step to step. Much of Parts IV and V is about finding those stronger statements.

:::bridge{course=proofs chapter=induction}
*Proofcraft* teaches induction, and proof in general, from the beginning, with exercises checked step by step.
:::

## Temporal logic

Properties of runs, not of single states, use temporal operators (chapter 3): □P, `always P`, P holds in every state of the run; ◇P, `eventually P`, in some state; P ~> Q, *leads to*, every P is followed by a Q. A run that violates *always* has a finite counterexample, a path to a bad state. A run that violates *eventually* must be infinite: a **lasso**, a path that ends in a cycle repeated forever.

## Notation

| Course | Vouch | Read as |
|---|---|---|
| ¬, ∧, ∨ | `!`, `&&`, `\|\|` | not, and, or |
| ⟹, ⟺ | `==>`, `<==>` | implies, if and only if |
| ∀, ∃ | `forall`, `exists` | for all, there exists |
| ∈, ∉ | `in`, `!in` | is an element of, is not |
| \|S\| | `#S` | the size of S |
| P ∗ Q | `P ** Q` | P and Q, on separate parts of the heap (chapter 21) |
| x ↦ v | `x \|-> v` | x points to v (chapter 21) |
| {P} c {Q} | `requires P` … `ensures Q` | a Hoare triple: from P, c ends in Q (chapter 16) |
| wp(c, Q) | | the weakest precondition of c for Q (chapter 17) |
| □, ◇ | `always`, `eventually` | in every state, in some state (chapter 3) |
