---
number: 15
title: Unification
summary: Solve equations between terms. Most general unifiers, Martelli and Montanari’s rules with a proof that they are correct, the occurs check, and the cost of solutions, with unification for your engine.
duration: About 1½ hours
prerequisites: [matching]
theorems: [Unifiable terms have a most general unifier, The Martelli–Montanari rules are correct]
techniques: [unification]
---

Matching asks for $\sigma$ with $l\sigma = t$: only one side has variables to fill. **Unification** asks for $\sigma$ with $s\sigma = t\sigma$, where both sides may contain variables, even shared ones. It is the central operation of logic programming and type inference, and in this course it finds the places where two rules overlap (Chapter 16), which is the key to deciding confluence and to completion.

## Unifiers and most general unifiers

:::definition[Unifier]
A **unifier** of $s$ and $t$ is a substitution $\sigma$ with $s\sigma = t\sigma$. A unifier $\sigma$ is **most general** (an *mgu*) if every unifier $\tau$ is an instance of it: $\tau = \sigma\rho$ for some $\rho$.
:::

`F(x, G(y))` and `F(G(z), x)` are unified by $\{x \mapsto G(z), y \mapsto z\}$, which turns both into `F(G(z), G(z))`. They are also unified by $\{x \mapsto G(A), y \mapsto A, z \mapsto A\}$, but that one is an instance of the first ($\rho = \{z \mapsto A\}$): it commits to more than necessary. The mgu is the solution that commits to nothing it does not have to; it is unique up to renaming of variables.

Some pairs have no unifier at all, for two different reasons: a **clash** of symbols, as in `F(x)` against `G(y)`, or a **cycle**, as in `x` against `F(x)`: any solution would need $x\sigma$ to be a proper subterm of itself.

## The Martelli–Montanari rules

Alberto Martelli and Ugo Montanari presented unification as the rewriting of a set of equations into a solved form.:cite[martelli-montanari1982] A problem is a set of equations $s_1 \doteq t_1, \ldots, s_n \doteq t_n$ to solve simultaneously. Apply these rules until none applies:

| Rule | From | To |
|---|---|---|
| **Delete** | $t \doteq t$ | (remove it) |
| **Decompose** | $f(s_1, \ldots, s_n) \doteq f(t_1, \ldots, t_n)$ | $s_1 \doteq t_1, \ldots, s_n \doteq t_n$ |
| **Orient** | $t \doteq x$, with $t$ not a variable | $x \doteq t$ |
| **Eliminate** | $x \doteq t$, with $x \notin \mathrm{Var}(t)$ and $x$ occurring elsewhere | $x \doteq t$, and replace $x$ by $t$ in every other equation |
| **Clash** | $f(\ldots) \doteq g(\ldots)$ with $f \ne g$ (or different arities) | fail |
| **Occurs check** | $x \doteq t$ with $x \in \mathrm{Var}(t)$ and $t \ne x$ | fail |

A problem in **solved form** has the shape $x_1 \doteq t_1, \ldots, x_k \doteq t_k$ with distinct $x_i$ that occur nowhere else; it *is* the substitution $\{x_1 \mapsto t_1, \ldots, x_k \mapsto t_k\}$. Step through the rules:

::unify-stepper

:::theorem{status=proved}
Applying the rules in any order terminates. It fails exactly when the problem has no unifier; otherwise it ends in a solved form, and that substitution is an idempotent most general unifier.
:::

:::proof
**Termination.** Measure a problem by the triple (number of variables that are not yet *solved*, i.e. do not occur exactly once as the left side of an equation and nowhere else; total size of all terms; number of equations of the form $t \doteq x$ with $t$ not a variable), ordered lexicographically. Eliminate makes $x$ solved and cannot unsolve another variable (a solved variable occurs nowhere else, in particular not in $t$), so it decreases the first component. Delete and Decompose leave the first component the same or smaller and decrease the size. Orient decreases the third component without changing the others. The lexicographic order on triples of natural numbers is well-founded (Chapter 10).

**Each rule preserves the set of unifiers.** For Delete, Decompose and Orient this is immediate from the definition of substitution ($f(\vec s)\sigma = f(\vec t)\sigma$ iff $s_i\sigma = t_i\sigma$ for all $i$). For Eliminate: if $x\sigma = t\sigma$, then replacing $x$ by $t$ anywhere does not change the result of applying $\sigma$. Clash and the occurs check are justified by the reasons above: different root symbols are never made equal, and $x\sigma$ cannot equal $t\sigma$ when $x\sigma$ is a proper subterm of it.

**The result.** When no rule applies and nothing failed, every equation is $x \doteq t$ (Orient, Decompose, Delete and Clash handle the others) with $x \notin \mathrm{Var}(t)$ (the occurs check) and $x$ occurring nowhere else (Eliminate): a solved form. Its substitution $\theta$ unifies it (no left variable occurs on any right side, so $x\theta = t = t\theta$). If $\tau$ is any unifier of the original problem, it unifies the solved form, so $x\tau = t\tau$ for each equation, which says $\tau = \theta\tau$: every unifier is an instance of $\theta$. And $\theta\theta = \theta$, since the right sides contain no solved variables.
:::

```quiz
q: 'What does unification return for `F(x, x)` and `F(G(y), G(A))`?'
options:
  - text: '{x ↦ G(A), y ↦ A}'
    correct: true
    why: 'Decompose gives x ≐ G(y) and x ≐ G(A). Eliminating x turns the second into G(y) ≐ G(A), which decomposes to y ≐ A.'
  - text: '{x ↦ G(y)}'
    why: 'That makes the first arguments equal but not the second: x = G(y) and x = G(A) must hold together.'
  - text: 'Failure: G(y) and G(A) clash.'
    why: 'They have the same root symbol; only y ≐ A remains, which is solvable.'
```

## The occurs check

Most Prolog systems skip the occurs check by default, for speed: it costs a traversal of $t$ at every elimination. Without it, unifying `x` with `F(x)` "succeeds" and creates a cyclic structure, an infinite term $F(F(F(\ldots)))$. That can be a feature (some Prologs reason about such rational trees deliberately) but for rewriting it would be a bug: a critical pair computed from a cyclic "unifier" is not a real overlap. The course's engine always performs the check.

## How big is a unifier?

Unify the variables $x_1, x_2, \ldots, x_n$ with these equations:

$$ x_1 \doteq F(x_0, x_0), \quad x_2 \doteq F(x_1, x_1), \quad \ldots, \quad x_n \doteq F(x_{n-1}, x_{n-1}). $$

The mgu maps $x_n$ to a complete binary tree of depth $n$: its size as a tree is $2^{n+1} - 1$. Written out, the solution is exponentially larger than the problem. Represented as a DAG, with the copies of $x_{n-1}$ shared, it is linear. Mike Paterson and Mark Wegman gave a linear-time unification algorithm on such shared representations,:cite[paterson-wegman1978] and Martelli and Montanari's own algorithm runs in almost linear time with a union-find structure (the same structure that will power e-graphs in Chapter 23). The rule-based algorithm above, applied to trees, can take exponential time, which is acceptable for the small terms of rewrite rules.

```numeric
id: unification/exponential
title: An exponential unifier
prompt: 'Solve $x_1 \doteq F(x_0, x_0)$, $x_2 \doteq F(x_1, x_1)$, $x_3 \doteq F(x_2, x_2)$. How many nodes does the term assigned to $x_3$ have, as a tree?'
answer: 15
tolerance: 0
explain: '$x_3 \mapsto F(F(F(x_0, x_0), F(x_0, x_0)), F(F(x_0, x_0), F(x_0, x_0)))$: 7 F nodes and 8 leaves, $2^4 - 1 = 15$.'
```

Unification was introduced by J. Alan Robinson in 1965, as the engine of his **resolution** principle for automated theorem proving;:cite[robinson1965] the idea that it computes a *most general* solution is what made resolution complete, and it remains the core of every logic programming language and of Hindley–Milner type inference.

## Unification in your engine

```code
id: unification/unify
title: Unification
provides: [unify]
prompt: |
  Write `unify(s, t)`: an idempotent most general unifier of `s` and `t` as a `Map`, or `null` if they are not unifiable. Implement the Martelli–Montanari rules with a list of equations to solve and a substitution built so far. Do not forget the occurs check.

  `apply` (from your engine) and `occurs` and `equal` (from `trs`) will help.
starter: |
  import type { Term, Subst } from 'trs';
  import { occurs, equal } from 'trs';
  import { apply } from 'engine';

  export function unify(s: Term, t: Term): Subst | null {
    return equal(s, t) ? new Map() : null;
  }
tests: |
  import { test, expect } from 'test';
  import { unify } from 'solution';
  import { term, show, apply, variant, equal } from 'trs';

  const solve = (a, b) => { const s = term(a), t = term(b); const u = unify(s, t); return u && { s, t, u }; };
  test('a unifier makes both sides equal', () => {
    const r = solve('F(x, G(y))', 'F(G(z), x)');
    expect(show(apply(r.u, r.s))).toBe(show(apply(r.u, r.t)));
    expect(variant(apply(r.u, r.s), term('F(G(z), G(z))'))).toBe(true);
  });
  test('the result is most general', () => {
    const r = solve('F(x, y)', 'F(y, z)');
    expect(variant(apply(r.u, r.s), term('F(z, z)'))).toBe(true);
  });
  test('it is idempotent', () => {
    const r = solve('F(x, x)', 'F(G(y), G(A))');
    expect(show(apply(r.u, r.s))).toBe('F(G(A), G(A))');
    for (const [, v] of r.u) expect(equal(apply(r.u, v), v)).toBe(true);
  });
  test('clashes fail', () => {
    expect(unify(term('F(x)'), term('G(x)'))).toBe(null);
    expect(unify(term('F(x, A)'), term('F(B, B)'))).toBe(null);
    expect(unify(term('F(x)'), term('F(x, y)'))).toBe(null);
  });
  test('the occurs check fails', () => {
    expect(unify(term('x'), term('F(x)'))).toBe(null);
    expect(unify(term('F(x, G(x))'), term('F(y, y)'))).toBe(null);
  });
  test('variables on both sides, and a variable against itself', () => {
    expect(unify(term('x'), term('x')).size).toBe(0);
    const r = solve('Ap(Ap(K, x), y)', 'Ap(z, A)');
    expect(show(apply(r.u, r.t))).toBe(show(apply(r.u, r.s)));
  });
solution: |
  import type { Term, Subst } from 'trs';
  import { occurs, equal } from 'trs';
  import { apply } from 'engine';

  export function unify(s: Term, t: Term): Subst | null {
    const todo: [Term, Term][] = [[s, t]];
    let sigma = new Map<string, Term>();
    while (todo.length) {
      let [a, b] = todo.pop()!;
      a = apply(sigma, a);
      b = apply(sigma, b);
      if (equal(a, b)) continue;
      if (a.type === 'fn' && b.type === 'fn') {
        if (a.name !== b.name || a.args.length !== b.args.length) return null;
        a.args.forEach((x, i) => todo.push([x, b.args[i]]));
        continue;
      }
      if (a.type === 'fn') [a, b] = [b, a];
      const x = (a as { name: string }).name;
      if (occurs(x, b)) return null;
      const bind = new Map([[x, b]]);
      const next = new Map<string, Term>();
      for (const [y, u] of sigma) next.set(y, apply(bind, u));
      next.set(x, b);
      sigma = next;
    }
    return sigma;
  }
hints:
  - 'Keep a stack of equations and a substitution `sigma`. Before handling an equation, apply `sigma` to both sides: that performs Eliminate lazily.'
  - 'When you bind `x ↦ t`, also apply `{x ↦ t}` to every value already in `sigma`, so that it stays idempotent.'
```

:::key
- A unifier makes two terms equal; an mgu is one of which every other unifier is an instance, and it exists whenever any unifier does.
- Martelli–Montanari: Delete, Decompose, Orient, Eliminate, and fail on a clash or an occurs-check violation.
- Solutions can be exponentially large as trees; shared representations make unification (almost) linear.
:::

:::exercises
1. Find the mgu of `F(G(x, y), z)` and `F(z, G(u, H(u)))`, or show that none exists.
2. Show that the mgu is unique up to renaming: if $\sigma$ and $\sigma'$ are both mgus, then $\sigma' = \sigma\rho$ for a substitution $\rho$ that maps variables to variables injectively (on the relevant variables).
3. Show that matching is a special case of unification: if the variables of $t$ are renamed to fresh constants, an mgu of $l$ and $t$ is a matcher.
4. Unify $x_n$ with $y_n$ in the problem $x_i \doteq F(x_{i-1}, x_{i-1})$, $y_i \doteq F(y_{i-1}, y_{i-1})$ for $i = 1, \ldots, n$. How many steps does the naive algorithm take, and how would sharing help?
:::
