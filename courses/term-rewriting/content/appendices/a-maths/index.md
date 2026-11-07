---
number: A
title: The mathematics toolbox
summary: Sets, relations and their closures, orders, induction on numbers and on structures, and well-founded induction, everything the proofs in the course use.
duration: Reference
---

The course assumes school algebra and nothing more. This appendix collects the few notions from discrete mathematics that the proofs use, with short proofs where they are needed.

## Relations and closures

A **relation** $R$ on a set $A$ is a set of pairs $(a, b)$ with $a, b \in A$; write $a \mathrel{R} b$. Rewriting is about one relation, $\to$, and the relations built from it:

| Notation | Name | Meaning |
|---|---|---|
| $\to^0$ | identity | $a \to^0 b$ iff $a = b$ |
| $\to^{n+1}$ | $n + 1$ steps | $a \to^n c \to b$ for some $c$ |
| $\to^+$ | transitive closure | $a \to^n b$ for some $n \ge 1$ |
| $\to^*$ | reflexive transitive closure | $a \to^n b$ for some $n \ge 0$ |
| $\to^=$ | reflexive closure | $a = b$ or $a \to b$ |
| $\leftarrow$ | inverse | $a \leftarrow b$ iff $b \to a$ |
| $\leftrightarrow$ | symmetric closure | $a \to b$ or $b \to a$ |
| $\leftrightarrow^*$ | equivalence closure | the smallest equivalence relation containing $\to$ |

Each closure is the *smallest* relation with the property that contains $\to$. For example, $\to^*$ is reflexive and transitive, contains $\to$, and is contained in every reflexive transitive relation that contains $\to$.

A relation is **reflexive** if $a \mathrel{R} a$ for all $a$; **symmetric** if $a \mathrel{R} b$ implies $b \mathrel{R} a$; **transitive** if $a \mathrel{R} b$ and $b \mathrel{R} c$ imply $a \mathrel{R} c$; an **equivalence** if it is all three. An equivalence on terms that is closed under contexts (if $s \sim t$ then $f(\ldots, s, \ldots) \sim f(\ldots, t, \ldots)$) is a **congruence**; equational provability (Chapter 18) is the smallest congruence closed under substitution that contains the axioms.

## Orders

A **strict order** $>$ is irreflexive ($a > a$ never holds) and transitive; it is then also asymmetric. A **quasi-order** (preorder) $\ge$ is reflexive and transitive; it need not be antisymmetric. An order is **total** if any two distinct elements are comparable.

A strict order is **well-founded** if there is no infinite descending chain $a_0 > a_1 > a_2 > \cdots$. Equivalently (with the axiom of choice), every non-empty set has a **minimal** element, one with nothing below it in the set. The natural numbers are well-founded; the integers and the rationals are not. Chapter 10 builds new well-founded orders from old ones: lexicographic products and multiset orders.

## Induction

**Mathematical induction.** To prove $P(n)$ for all natural numbers, prove $P(0)$, and prove $P(n + 1)$ assuming $P(n)$. **Strong induction**: prove $P(n)$ assuming $P(m)$ for all $m < n$.

**Structural induction.** Terms are defined inductively (Chapter 1): every term is a variable or $f(t_1, \ldots, t_n)$ for smaller terms. To prove $P(t)$ for all terms, prove it for variables, and prove $P(f(t_1, \ldots, t_n))$ assuming $P(t_1), \ldots, P(t_n)$. The same principle applies to positions, to derivations in a proof system (induction on the derivation, Chapter 18) and to anything else defined by finitely many construction rules.

## Well-founded induction

:::theorem{name="Well-founded induction" status=proved}
Let $>$ be a well-founded relation on $A$ and $P$ a property of elements of $A$. If, for every $a$, $P(b)$ for all $b < a$ implies $P(a)$, then $P(a)$ holds for every $a \in A$.
:::

:::proof
Suppose $P(a_0)$ fails for some $a_0$. By the hypothesis, $P$ must fail for some $a_1 < a_0$ (otherwise $P(a_0)$ would follow). In the same way $P$ fails for some $a_2 < a_1$, and so on: an infinite descending chain $a_0 > a_1 > a_2 > \cdots$, contradicting well-foundedness.
:::

Mathematical induction is the case $A = \mathbb{N}$; structural induction is the case of the proper-subterm order. In rewriting the most useful instance is **noetherian induction** on a terminating relation: if $\to$ terminates, $\to^+$ is well-founded (read $a \to^+ b$ as "$b$ is below $a$"), so to prove $P(a)$ one may assume $P(b)$ for every $b$ that $a$ rewrites to. Newman's lemma (Chapter 4) is proved this way.

## König's lemma

:::lemma{name="König’s lemma" status=proved}
An infinite tree in which every node has finitely many children has an infinite path from the root.
:::

:::proof
Call a node *big* if it has infinitely many descendants. The root is big. A big node has finitely many children, so at least one of them is big. Starting at the root and always moving to a big child gives an infinite path.
:::

König's lemma turns "infinitely many things" into "an infinite chain". It proves that the multiset order is well-founded (Chapter 10) and that a finitely branching, terminating system has only finitely many reducts from each term.

## Multisets

A **multiset** over $A$ is a function $M : A \to \mathbb{N}$ that is non-zero on finitely many elements: it records how often each element occurs. $\{a, a, b\}$ is the multiset with $M(a) = 2$, $M(b) = 1$. Union adds multiplicities, difference subtracts them (stopping at zero). Chapter 10 defines the multiset order and proves it well-founded.
