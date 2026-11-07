---
number: 20
title: Unfailing completion
summary: Ordered rewriting, equations that are never oriented, and completion that cannot fail. A prover built from it shows that groups of exponent two are abelian, and the same idea solved the Robbins problem.
duration: About 1½ hours
prerequisites: [knuth-bendix]
theorems: [Unfailing completion is refutationally complete, Groups of exponent two are abelian]
techniques: [ordered rewriting, refutational theorem proving]
---

Knuth–Bendix completion stops dead at an equation it cannot orient. That is a pity, because such equations are everywhere (commutativity is the obvious one) and because we often do not need a complete decision procedure: we want to prove *one* theorem. **Unfailing completion**, developed in the late 1980s by Jieh Hsiang and Michaël Rusinowitch and by Leo Bachmair, Nachum Dershowitz and David Plaisted,:cite[hsiang-rusinowitch1987,bachmair-dershowitz-plaisted1989] keeps unorientable equations as equations and uses them anyway, in whichever direction makes a particular instance smaller. This chapter builds the course's equational prover on it.

## Ordered rewriting

Commutativity $x + y = y + x$ cannot be a rule, but its *instances* can often be compared. With a precedence $b \succ a$, LPO orients the ground instance $b + a = a + b$ as $b + a > a + b$. So use the equation as a rule on instances only, in the decreasing direction.

:::definition[Ordered rewriting]
Fix a reduction order $>$ that is **total on ground terms** (for example LPO with a total precedence). A term $u$ rewrites with an equation $s = t$ at position $p$ if $u|_p = s\sigma$ and $s\sigma > t\sigma$, giving $u[t\sigma]_p$; and likewise with $s$ and $t$ swapped. Oriented rules are used as usual.
:::

Ordered rewriting terminates, because every step decreases in the reduction order. Commutativity used this way sorts a sum: $b + a \to a + b$, but never the other way, and $a + b$ is a normal form.

## Completion without failure

Unfailing completion runs like Knuth–Bendix completion with two changes:

1. An equation that cannot be oriented is kept as an equation instead of causing failure, and used for ordered rewriting.
2. Critical pairs are also computed between equations (in both directions) and rules. Tools restrict these **ordered critical pairs** to overlaps whose peak is not smaller than its two sides, which keeps their number down; the course's prover computes them all, which is simpler and still correct.

The result is no longer guaranteed to be a convergent system for all terms, but it is **ground convergent**: ordered rewriting is terminating and confluent on ground terms. And that is enough for proving.

## Proving by refutation

To prove $\forall x\, \forall y.\ s = t$ from axioms $E$, replace the variables of the goal by fresh constants (a **Skolemised** goal, here `$x` and `$y`), extend the order to the new constants, and run unfailing completion on $E$. After each step, rewrite both sides of the goal with the current rules and equations.

:::theorem{name="Hsiang and Rusinowitch; Bachmair, Dershowitz and Plaisted" status=stated}
For a ground-total reduction order, unfailing completion with a fair choice of equations is refutationally complete: if $E \vdash s = t$, the two sides of the Skolemised goal eventually rewrite to the same term.
:::

So the procedure is a **semi-decision** procedure: it finds every proof that exists, given time. If completion saturates (no new equations appear) with the goal sides still different, the goal does not follow. If it runs for ever, we may never know: Part X shows that this cannot be avoided in general.

## Groups of exponent two are abelian

A classic first exercise in group theory: if $x \cdot x = e$ for every $x$, the group is commutative. The proof is short but not obvious ($ab = a(ab)(ab)b = a\,a\,b\,a\,b\,b = ba$, after inserting $(ab)(ab) = e$ in the right place). The prover finds it on its own. The *Completion* tab runs unfailing completion on the axioms and tries each goal `? s == t`:

```girafe title="The equational prover" tools="completion"
#infixl 7 *
#precedence I > * > E
E * x == x
I(x) * x == E
(x * y) * z == x * (y * z)
x * x == E
? a * b == b * a
? I(x) == x
```

Plain Knuth–Bendix completion of these axioms fails, since it eventually derives commutativity, which it cannot orient. The prover keeps commutativity as an equation and proves both goals. Remove the axiom `x * x == E` and the first goal is reported as not provable: completion saturates with the ten group rules, and the two sides of $a \cdot b = b \cdot a$ remain different normal forms.

```quiz
q: 'Unfailing completion saturates (no new equations) and the goal’s two sides have different normal forms. What follows?'
options:
  - text: 'The goal is not a consequence of the axioms.'
    correct: true
    why: 'The saturated system is ground convergent, so the Skolemised sides would have the same normal form if the goal were provable.'
  - text: 'Nothing: the prover might find a proof later.'
    why: 'After saturation there is nothing more to find; the procedure is complete.'
  - text: 'The axioms are inconsistent.'
    why: 'Inconsistency would make every equation provable, including the goal.'
```

## Robbins algebras

In 1933 Herbert Robbins conjectured that three equations (commutativity and associativity of $+$, and the single equation $n(n(x + y) + n(x + n(y))) = x$) are enough to axiomatise Boolean algebra. Tarski and his students worked on it, and it stayed open for over sixty years. In 1996 William McCune's prover EQP, a descendant of unfailing completion with associative-commutative unification (Chapter 22), found a proof after about eight days of computation.:cite[mccune1997] It was the first time an automated prover settled an open question that had resisted mathematicians, and the proof, once found, could be checked by hand.

Modern equational provers such as Waldmeister,:cite[hillenbrand1997] and the equational core of first-order provers (E, Vampire, which use the **superposition** calculus, the extension of unfailing completion to full first-order logic), are built on exactly the ideas of this chapter, with the term indexing of Chapter 8 and the sharing of Chapter 7 to make them fast.

## Ordered rewriting in code

```code
id: unfailing-completion/ordered-step
title: One ordered rewrite step
prompt: |
  Write `orderedRootStep(rules, equations, gt, t)`: try the rules (`[lhs, rhs]` pairs) at the root of `t`, then the equations (`[s, t]` pairs) in both directions, and return the first result; an equation may only be used if the instance decreases (`gt(instance of one side, instance of the other)`). Return `null` if nothing applies.
starter: |
  import type { Term } from 'trs';
  import { match, apply } from 'engine';

  type Pair = [Term, Term];

  export function orderedRootStep(rules: Pair[], equations: Pair[], gt: (a: Term, b: Term) => boolean, t: Term): Term | null {
    return null;
  }
tests: |
  import { test, expect } from 'test';
  import { orderedRootStep } from 'solution';
  import { term, show, lpo, precedence } from 'trs';

  const gt = lpo(precedence(['+', 'B', 'A']));
  const comm = [[term('+(x, y)'), term('+(y, x)')]];
  test('commutativity sorts', () => {
    expect(show(orderedRootStep([], comm, gt, term('+(B, A)')))).toBe('+(A, B)');
    expect(orderedRootStep([], comm, gt, term('+(A, B)'))).toBe(null);
  });
  test('equal arguments are not swapped', () => {
    expect(orderedRootStep([], comm, gt, term('+(A, A)'))).toBe(null);
  });
  test('rules come first', () => {
    const rules = [[term('+(x, 0)'), term('x')]];
    expect(show(orderedRootStep(rules, comm, lpo(precedence(['+', 'B', 'A', '0'])), term('+(B, 0)')))).toBe('B');
  });
  test('variables in the term are incomparable', () => {
    expect(orderedRootStep([], comm, gt, term('+(x, y)'))).toBe(null);
  });
solution: |
  import type { Term } from 'trs';
  import { match, apply } from 'engine';

  type Pair = [Term, Term];

  export function orderedRootStep(rules: Pair[], equations: Pair[], gt: (a: Term, b: Term) => boolean, t: Term): Term | null {
    for (const [l, r] of rules) {
      const s = match(l, t);
      if (s) return apply(s, r);
    }
    for (const [a, b] of equations) {
      for (const [l, r] of [[a, b], [b, a]]) {
        const s = match(l, t);
        if (!s) continue;
        const out = apply(s, r);
        if (gt(t, out)) return out;
      }
    }
    return null;
  }
hints:
  - 'For each equation, try both directions; after matching, compare the term with the instance of the other side using `gt`.'
```

:::key
- Ordered rewriting uses an equation on the instances it decreases, with an order total on ground terms.
- Unfailing completion never fails; it yields a ground-convergent system and a refutationally complete prover.
- Skolemise the goal, saturate, and compare normal forms; the prover shows that groups of exponent two are abelian.
:::

:::exercises
1. Add the goal `? (a * b) * I(b) == a` to the prover, then `? I(a * b) == b * a`. Why does the second hold in groups of exponent two but not in all groups?
2. Show that ordered rewriting with commutativity alone sorts any sum of constants, and give the normal form of `C + (A + B)` with associativity as a rule and commutativity as an equation. Is it fully sorted?
3. Use the prover to show $I(x \cdot y) = I(y) \cdot I(x)$ from the three group axioms alone. How many iterations does it take compared with $I(I(x)) = x$?
4. Why must the reduction order be total on ground terms for refutational completeness? Find a goal that a non-total order would miss.
:::
