---
number: 29
title: Higher-order rewriting
summary: Rules with binders, Klop’s combinatory reduction systems and Nipkow’s higher-order rewrite systems, and Miller’s pattern fragment, where higher-order unification becomes as well-behaved as first-order.
duration: About 1 hour
prerequisites: [lambda-and-combinators]
theorems: [Pattern unification is decidable with most general unifiers, Orthogonal higher-order systems are confluent]
techniques: [metavariables and patterns]
---

Chapter 28 squeezed the λ-calculus into first-order rewriting, at a price: combinators lose the structure of terms, explicit substitutions need eight rules for what is conceptually one. Many systems with binders are more naturally written with binders: β-reduction itself, the rules of logic (∀-elimination substitutes a term for a bound variable), program transformations that move code under a `let` or a `λ`, and the derivative operator of a computer algebra system that knows about $\frac{d}{dx}$. **Higher-order rewriting** extends rewriting to such terms. This optional chapter surveys the main ideas, without an implementation.

## Metavariables

The first-order rule `F(x) -> G(x, x)` has a variable `x` that matches any term. With binders, a rule needs variables that can depend on bound variables. In β-reduction,
$$ (\lambda x.\, Z(x))\; Y \;\to\; Z(Y), $$
$Z$ is a **metavariable** of arity 1: in a match, $Z$ is bound to a *function* (the body, abstracted over $x$), and $Z(Y)$ on the right applies it to $Y$, which performs the substitution. The rule is no longer a schema of meta-level operations: substitution is built into matching and instantiation.

Two frameworks make this precise.

**Combinatory reduction systems** (CRSs), introduced by Jan Willem Klop in his 1980 thesis,:cite[klop1980] have terms with a binding construct $[x]t$ and metavariables applied to arguments. β is the rule `Ap(Lam([x]Z(x)), Y) -> Z(Y)`.

**Higher-order rewrite systems** (HRSs), introduced by Tobias Nipkow in 1991,:cite[nipkow1991] use the simply typed λ-calculus itself as the language of terms: a rule is a pair of typed λ-terms, and rewriting is modulo $\beta\eta$. The two frameworks are closely related, and Terese compares them in detail.:cite[terese2003]

## Higher-order matching and unification

To apply a higher-order rule we must solve equations like $Z(a) = f(a, a)$ for a function variable $Z$. This has several solutions: $Z = \lambda x.\, f(x, x)$, $Z = \lambda x.\, f(a, x)$, $Z = \lambda x.\, f(x, a)$ and $Z = \lambda x.\, f(a, a)$. General higher-order unification is undecidable, and even when solutions exist there may be no most general one. That would make critical pairs, completion and most of Parts V–VI unusable.

Dale Miller found a fragment that behaves as well as first-order terms.:cite[miller1991]

:::definition[Pattern]
A **pattern** (in Miller's sense) is a term in which every free metavariable is applied only to distinct bound variables.
:::

$\lambda x.\, Z(x)$ and $\lambda x\, y.\, Z(y, x)$ are patterns; $Z(a)$ and $\lambda x.\, Z(x, x)$ are not.

:::theorem{name="Miller" year=1991 status=stated}
Unification of patterns is decidable, and unifiable patterns have a most general unifier, computable in linear time.
:::

The intuition: when $Z$ is applied only to distinct bound variables, the value of $Z$ is completely determined by the term it must match, as a λ-abstraction over exactly those variables. The left-hand sides of almost every higher-order rule anyone writes are patterns, β included (the left side is $(\lambda x.\, Z(x))\,Y$), so Nipkow could define higher-order critical pairs by pattern unification and prove a higher-order critical pair lemma.:cite[nipkow1991]

```quiz
q: 'Which of these is a pattern in Miller’s sense? (Z is a metavariable; x and y are bound.)'
options:
  - text: '`λx. λy. F(Z(y, x))`'
    correct: true
    why: 'Z is applied to distinct bound variables y and x.'
  - text: '`λx. Z(x, x)`'
    why: 'Z is applied to the same bound variable twice.'
  - text: '`Z(A)`'
    why: 'Z is applied to a constant, not a bound variable.'
  - text: '`λx. Z(F(x))`'
    why: 'Z is applied to a compound term.'
```

## What carries over

Much of the first-order theory lifts to higher-order systems whose left-hand sides are patterns:

- **Confluence.** Orthogonal CRSs and HRSs are confluent (Klop; van Oostrom and van Raamsdonk). The λ-calculus is the orthogonal system with the single rule β, so this generalises the Church–Rosser theorem. Critical pairs and the critical pair lemma work for pattern rules, so terminating pattern systems have decidable confluence.
- **Termination.** Termination is harder: β alone does not terminate on untyped terms. For typed systems there are higher-order versions of the recursive path order and of interpretations, and higher-order dependency pairs.
- **Applications.** Proof assistants (Isabelle, which Nipkow co-develops, rewrites with higher-order rules modulo $\beta\eta$; Lean and Coq/Rocq have `simp`-style tactics that rewrite under binders), program transformation systems that move code across binders, and logical frameworks such as Dedukti, which uses higher-order rewriting as its notion of computation.

A first-order engine like the one you have built can still run higher-order systems, by translating them into first-order ones with de Bruijn indices and explicit substitutions (Chapter 28). That is roughly what implementations of higher-order rewriting do internally.

:::key
- Higher-order rules use metavariables that may depend on bound variables; substitution becomes part of matching.
- CRSs (Klop) and HRSs (Nipkow) are the two main frameworks.
- General higher-order unification is undecidable; Miller patterns restore decidability and most general unifiers, so critical pairs and confluence results carry over.
:::

:::exercises
1. Write the η rule $\lambda x.\, Z\,x \to Z$ (with $x$ not free in $Z$) as a CRS rule. Is its left-hand side a pattern?
2. Write a higher-order rule for the derivative of a function given as a λ-term, $D(\lambda x.\, \sin(Z(x)))$, using the chain rule.
3. Find all solutions of $Z(a) = f(a, b)$ for a unary metavariable $Z$.
4. Why is $\lambda x.\, Z(x, x)$ excluded from Miller's patterns? Give an equation with this left side that has two incomparable solutions.
:::
