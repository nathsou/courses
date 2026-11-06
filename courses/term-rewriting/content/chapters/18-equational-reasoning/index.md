---
number: 18
title: Equational reasoning
summary: Equational logic and its models, Birkhoff’s theorem that proofs and rewriting agree, the word problem, and deciding equality with a convergent system.
duration: About 1½ hours
prerequisites: [critical-pairs]
theorems: [Birkhoff’s completeness theorem, Equational derivability is conversion]
techniques: [equational proofs, counter-models]
---

Part VI turns from rules to **equations**. An equation $s = t$ has no direction; it says the two sides are interchangeable. Mathematics is full of them (the group axioms, the laws of Boolean algebra, the specification of an abstract data type), and the questions are the logician's: what follows from a set of equations, how can we tell, and can a computer decide it? This chapter sets up the logic; the next two show how rewriting answers the questions, through completion.

## Equational logic

Fix a set $E$ of equations between terms (the **axioms**). An equation $s = t$ is **derivable** from $E$, written $E \vdash s = t$, if it can be obtained by the rules:

| Rule | |
|---|---|
| **Axiom** | $s = t$ for every $s = t$ in $E$ |
| **Reflexivity** | $t = t$ |
| **Symmetry** | from $s = t$ infer $t = s$ |
| **Transitivity** | from $s = t$ and $t = u$ infer $s = u$ |
| **Substitution** | from $s = t$ infer $s\sigma = t\sigma$ |
| **Congruence** | from $s_1 = t_1, \ldots, s_n = t_n$ infer $f(s_1, \ldots, s_n) = f(t_1, \ldots, t_n)$ |

These are the moves of every proof in algebra. Rewriting with equations in either direction does the same job in a single relation: let $\leftrightarrow_E$ be the rewrite relation of the rules $l \to r$ and $r \to l$ for each $l = r$ in $E$.

:::theorem{status=proved}
$E \vdash s = t$ if and only if $s \leftrightarrow_E^* t$.
:::

:::proof
($\Leftarrow$) A single step $u[l\sigma]_p \leftrightarrow u[r\sigma]_p$ is derivable: Axiom gives $l = r$, Substitution gives $l\sigma = r\sigma$ (or Symmetry first, for the other direction), and Congruence with Reflexivity on the other arguments, once per level of the position $p$, gives $u[l\sigma]_p = u[r\sigma]_p$. Chains of steps follow by Transitivity, and zero steps by Reflexivity.

($\Rightarrow$) By induction on the derivation. Axioms are one step; Reflexivity is zero steps; Symmetry reverses a conversion; Transitivity concatenates two; Substitution and Congruence use the closure of $\to_E$ under substitutions and contexts (Chapter 3), applied to each step of the conversion (for Congruence, convert one argument at a time).
:::

So "provable from $E$" and "convertible by the rules of $E$ in both directions" are the same relation, written $=_E$. An equational proof is a path in a graph of terms. You can build one by hand: here you must prove $a^{-1} \cdot (a \cdot b) = b$ from the three group axioms. Click a subterm, then an axiom to apply there (in either direction).

::proof-builder{axioms="*(*(x, y), z) == *(x, *(y, z))\n*(E, x) == x\n*(I(x), x) == E" from="*(I(a), *(a, b))" to="b" hint="three steps suffice"}

The hard part of proving is search: which axiom, where, in which direction? Even this short proof starts by making the term *bigger*, applying associativity backwards. A theorem prover that just tried everything would drown.

## Models

The other side of logic is meaning.

:::definition[Algebra, model]
An **algebra** for a signature is a set $A$ together with a function $f^A : A^n \to A$ for each symbol $f$ of arity $n$. An equation $s = t$ **holds** in $A$ if both sides evaluate to the same element for every assignment of elements of $A$ to the variables. $A$ is a **model** of $E$ if every equation of $E$ holds in it. $E \models s = t$ means that $s = t$ holds in every model of $E$.
:::

Every group is a model of the group axioms. **Soundness** says that derivable equations hold in all models: each rule of equational logic preserves truth in an algebra (check it, it is routine). So to show that something is *not* derivable, it is enough to find one model where it fails. The permutations of three objects form a group in which $a \cdot b \ne b \cdot a$ for some $a, b$; hence commutativity does not follow from the group axioms, and no amount of searching for a proof will ever find one.

:::theorem{name="Birkhoff" year=1935 status=sketched}
$E \models s = t$ if and only if $E \vdash s = t$.
:::

:::proof
Soundness ($\Leftarrow$) is the routine check above. For completeness ($\Rightarrow$), build one model in which only the derivable equations hold: the **term algebra modulo $E$**. Its elements are the equivalence classes $[t]$ of terms under $=_E$, and $f([t_1], \ldots, [t_n]) = [f(t_1, \ldots, t_n)]$, which is well defined because $=_E$ is a congruence. Evaluating a term $u$ under the assignment $x \mapsto [x]$ gives $[u]$, and under any assignment $x \mapsto [\sigma(x)]$ gives $[u\sigma]$. Every axiom $l = r$ holds: $[l\sigma] = [r\sigma]$ by Substitution. So this algebra is a model of $E$. If $E \models s = t$, then $s = t$ holds in it, in particular under $x \mapsto [x]$: $[s] = [t]$, that is, $E \vdash s = t$.
:::

Garrett Birkhoff proved this in 1935, in the paper that founded universal algebra.:cite[birkhoff1935] With the previous theorem it gives three equivalent views of one relation: semantic consequence, formal derivability, and conversion by rewriting.

## The word problem

:::definition[The word problem]
The **word problem** for $E$ asks, given terms $s$ and $t$, whether $E \vdash s = t$.
:::

For some $E$ it is undecidable: Part X builds a finite set of equations (even of the very simple kind that describe semigroups) for which no algorithm can answer it. For others it is decidable by rewriting. Chapter 4 showed the key fact:

:::corollary{status=proved}
If the rules $R$ obtained by orienting the equations of $E$ form a convergent system and $=_R \;=\; =_E$, then $E \vdash s = t$ if and only if $s$ and $t$ have the same $R$-normal form. The word problem for $E$ is decidable.
:::

That is what the workbench's `? s == t` queries do. With the ten group rules of Chapter 0, every identity of group theory is decided by normalising both sides:

```girafe title="Deciding group identities" tools="run,trace"
#infixl 7 *
E * x -> x
I(x) * x -> E
(x * y) * z -> x * (y * z)
I(x) * (x * z) -> z
x * E -> x
I(E) -> E
x * I(x) -> E
I(I(x)) -> x
x * (I(x) * z) -> z
I(x * y) -> I(y) * I(x)
? I(a) * (a * b) == b
? (a * b) * I(b) == a
? I(I(a) * b) * I(b * a) == E
? a * b == b * a
```

Two questions remain, and the next chapter answers both. Where did these ten rules come from? And how do we know that they derive exactly the same equations as the three axioms ($=_R$ equals $=_E$) and that they are convergent?

```quiz
q: 'You want to show that $x \cdot x = e$ does not follow from the group axioms. What is the simplest argument?'
options:
  - text: 'Find a group in which it fails, such as the integers modulo 3 under addition (1 + 1 ≠ 0).'
    correct: true
    why: 'By soundness, a derivable equation holds in every group; one counter-model refutes derivability.'
  - text: 'Search for a proof for a long time and give up.'
    why: 'Failing to find a proof shows nothing; a counter-model is a proof of non-derivability.'
  - text: 'Show that the group rules give different normal forms to the two sides.'
    why: 'That works too, but only because the ten rules are convergent and equivalent to the axioms, which is the next chapter’s theorem. A counter-model needs no such machinery.'
```

## Deciding equality in code

```code
id: equational-reasoning/decide
title: Deciding the word problem
prompt: |
  Write `equalModulo(rules, s, t)`: true if `s` and `t` have the same normal form under `rules` (assumed convergent). Use `normalizeInnermost` from your engine.

  Then export `proofTerm`, a term (as a string) equal to `E` in every group, built from `a`, `b`, `I` and `*`, with at least three `I`s, which the tests check with the ten group rules.
starter: |
  import type { Rule, Term } from 'trs';
  import { equal } from 'trs';
  import { normalizeInnermost } from 'engine';

  export function equalModulo(rules: readonly Rule[], s: Term, t: Term): boolean {
    return equal(s, t);
  }

  export const proofTerm = 'E';
tests: |
  import { test, expect } from 'test';
  import { equalModulo, proofTerm } from 'solution';
  import { rules, term } from 'trs';

  const G = rules(`*(E, x) -> x
  *(I(x), x) -> E
  *(*(x, y), z) -> *(x, *(y, z))
  *(I(x), *(x, z)) -> z
  *(x, E) -> x
  I(E) -> E
  *(x, I(x)) -> E
  I(I(x)) -> x
  *(x, *(I(x), z)) -> z
  I(*(x, y)) -> *(I(y), I(x))`);
  test('group identities', () => {
    expect(equalModulo(G, term('*(I(a), *(a, b))'), term('b'))).toBe(true);
    expect(equalModulo(G, term('I(*(a, b))'), term('*(I(b), I(a))'))).toBe(true);
  });
  test('non-identities', () => {
    expect(equalModulo(G, term('*(a, b)'), term('*(b, a)'))).toBe(false);
    expect(equalModulo(G, term('*(a, a)'), term('E'))).toBe(false);
  });
  test('your term equals E', () => {
    const t = term(proofTerm);
    expect(proofTerm.split('I(').length - 1).toBeGreaterThanOrEqual(3);
    expect(equalModulo(G, t, term('E'))).toBe(true);
  });
solution: |
  import type { Rule, Term } from 'trs';
  import { equal } from 'trs';
  import { normalizeInnermost } from 'engine';

  export function equalModulo(rules: readonly Rule[], s: Term, t: Term): boolean {
    return equal(normalizeInnermost(rules, s), normalizeInnermost(rules, t));
  }

  export const proofTerm = '*(I(*(a, b)), *(a, I(I(b))))';
hints:
  - 'Normalise both sides and compare with `equal`.'
  - 'For the term: $(ab)^{-1} \cdot (a \cdot (b^{-1})^{-1})$ is a good start. Check your candidate in the workbench above with a `? … == E` line.'
```

:::key
- Equational derivability, conversion by the equations in both directions, and truth in all models are the same relation (Birkhoff).
- A counter-model shows that an equation is not derivable.
- The word problem asks whether $E \vdash s = t$. A convergent system equivalent to $E$ decides it by comparing normal forms.
:::

:::exercises
1. Prove $x \cdot e = x$ from the three group axioms (left identity, left inverse, associativity). It takes several steps; start from $x \cdot e = x \cdot (x^{-1} \cdot x)$.
2. Show that $x \cdot y = y \cdot x$ does not follow from the axioms of a monoid (associativity and a two-sided identity), using strings under concatenation as a counter-model.
3. Show that the term algebra modulo $E$ is *free*: for any model $A$ and any assignment of the variables, there is exactly one homomorphism from it to $A$ extending the assignment.
4. Give a set $E$ and terms $s, t$ such that $s =_E t$ but no conversion between them stays within terms of size at most $|s| + |t|$.
:::
