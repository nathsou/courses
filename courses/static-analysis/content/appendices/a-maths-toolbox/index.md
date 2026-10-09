---
number: A
title: Maths toolbox
summary: Sets, relations, orders, lattices, functions, fixpoints, Galois connections, logic and the arithmetic of bits, as the course uses them.
---

This appendix collects the mathematics the course relies on, with the notation it uses and the chapter where each idea does its work. Nothing here goes beyond what those chapters need.

## Sets and relations

A **set** is a collection of distinct elements: `{a, b, c}`. `x ∈ S` says that `x` is an element of `S`; `S ⊆ T` that every element of `S` is in `T`. The **union** `S ∪ T` holds the elements of either, the **intersection** `S ∩ T` the elements of both, and `∅` is the empty set. The **powerset** of `S`, the set of all its subsets, is the lattice of liveness and reaching definitions (chapters 14 and 15).

A **relation** between two sets is a set of pairs: "variable `v` may point to object `o`" is a relation between variables and objects (chapter 27). A relation on one set may be:

- **reflexive**: every element is related to itself;
- **antisymmetric**: if `a` is related to `b` and `b` to `a`, then `a = b`;
- **transitive**: if `a` is related to `b` and `b` to `c`, then `a` to `c`.

The **transitive closure** of a relation adds every pair implied by transitivity: the reachability of a graph is the transitive closure of its edges, and Datalog computes it with two rules (chapter 27).

## Orders and lattices

A **partial order** `⊑` is reflexive, antisymmetric and transitive. In analysis, `a ⊑ b` reads "`a` is at least as precise as `b`" (chapter 13). Two elements need not be comparable: the constants 1 and 2 are not.

An **upper bound** of `a` and `b` is an element above both; the **least upper bound**, or **join** `a ⊔ b`, is the smallest of them, if there is one. Dually, the **greatest lower bound**, or **meet**, is `a ⊓ b`. A **lattice** is a partial order in which every two elements have a join and a meet; it is **complete** if every subset has one. `⊥` (bottom) is the least element, `⊤` (top) the greatest.

The **height** of a lattice is the length of its longest strictly increasing chain. Finite height guarantees that iteration stops (chapter 13); intervals have infinite height and need widening (chapter 22).

The **product** of two lattices orders pairs component by component, and is a lattice; an analysis's facts, one per variable, form a product (chapters 13 and 24).

## Functions and fixpoints

A function `f` on a partial order is **monotone** if `a ⊑ b` implies `f(a) ⊑ f(b)`. A **fixpoint** of `f` is an `x` with `f(x) = x`; the **least fixpoint** is the smallest one. A **post-fixpoint** satisfies `f(x) ⊑ x` (chapter 22).

The theorem every dataflow analysis rests on, in the form of Kleene and Tarski: if `f` is monotone on a lattice of finite height, the sequence `⊥, f(⊥), f(f(⊥)), …` increases and reaches the least fixpoint of `f` in finitely many steps. :cite[tarski1955] The worklist algorithm of chapter 13 computes the same fixpoint with less work.

A function on sets is **distributive** if `f(X ∪ Y) = f(X) ∪ f(Y)`; distributive problems can be solved one element at a time, which is what IFDS exploits (chapter 26).

## Galois connections

Two monotone functions, an **abstraction** `α` from sets of concrete values to abstract values and a **concretisation** `γ` back, form a **Galois connection** when, for every set `S` and abstract value `a`:

$$\alpha(S) \sqsubseteq a \iff S \subseteq \gamma(a)$$

Then `S ⊆ γ(α(S))` and `α(γ(a)) ⊑ a`. An abstract function `f♯` is **sound** for a concrete `f` when `f(γ(a)) ⊆ γ(f♯(a))`, and the **best transformer** is `α ∘ f ∘ γ` (chapter 23).

## Induction

To prove that a property holds at every step of an iteration, prove that it holds at the start and that each step preserves it: **induction**. The soundness of an analysis is proved this way, over the steps of the fixpoint iteration; so is the correctness of a loop invariant. The course uses induction informally, in arguments such as "each variable's interval changes at most twice once widening applies" (chapter 22).

## Logic

A **propositional formula** combines Boolean variables with `∧` (and), `∨` (or) and `¬` (not). A **literal** is a variable or its negation, a **clause** a disjunction of literals, and a formula in **conjunctive normal form** (CNF) a conjunction of clauses: the input of a SAT solver (chapter 31). A formula is **satisfiable** if some assignment of its variables makes it true. Every formula can be put in CNF with a linear number of new variables by the **Tseitin transformation**.

## Integers as bits

A `w`-bit **two's complement** integer represents values from `−2^(w−1)` to `2^(w−1) − 1`. The value of bits `b₀ … b_(w−1)`, least significant first, is `Σ bᵢ·2ⁱ` for `i < w − 1`, minus `b_(w−1)·2^(w−1)`. Negation is "invert every bit, add one"; `a − b` is `a + ¬b + 1`. An addition **overflows** when its exact result does not fit in `w` bits, which a bit-blaster can detect by computing in `w + 1` bits and checking that the top two bits agree (chapter 31).

## Complexity

`O(n)` says that a cost grows at most in proportion to `n` for large `n`; `O(n³)` in proportion to its cube. The course uses it to compare analyses: linear for most rules, cubic for the closure of zones and octagons (chapter 24) and for inclusion-based points-to analysis in the worst case (chapter 27), polynomial for IFDS (chapter 26), exponential for the number of paths through a program (chapter 31). A problem is **NP-complete** when it is among the hardest whose solutions can be checked quickly; SAT was the first (chapter 31). :cite[cook1971]
