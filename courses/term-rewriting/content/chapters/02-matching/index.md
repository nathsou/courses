---
number: 2
title: Substitution and matching
summary: Substitutions, instances and the matching algorithm that decides whether a rule applies, with a proof that it is correct and a module for your engine.
duration: About 1 hour
prerequisites: [terms]
theorems: [Matching is decidable in linear time, Matchers are unique]
techniques: ['apply and match']
---

A rule `S(x) + y -> S(x + y)` applies to `S(0) + S(S(0))` because the term has the shape of the left-hand side: put `0` for `x` and `S(S(0))` for `y` and the two become identical. Finding those values is **matching**. Every rewrite step starts with a match, so matching is the inner loop of every rewriting engine, and this chapter makes it precise.

## Substitutions

:::definition[Substitution]
A **substitution** $\sigma$ is a map from variables to terms that changes only finitely many variables; that finite set is its **domain** $\mathrm{Dom}(\sigma)$. We write $\sigma = \{x_1 \mapsto t_1, \ldots, x_n \mapsto t_n\}$.

Applying $\sigma$ to a term replaces every occurrence of every variable at once:
$x\sigma = \sigma(x)$, and $f(t_1, \ldots, t_n)\sigma = f(t_1\sigma, \ldots, t_n\sigma)$.
:::

With $\sigma = \{x \mapsto \mathtt{S(0)},\ y \mapsto x\}$, the term $\mathtt{+}(x, y)$ becomes $\mathtt{+}(\mathtt{S(0)}, x)$. Notice that $y$ became $x$ and that new $x$ was not replaced again: substitution is simultaneous, not repeated.

Substitutions can be composed. $\sigma\tau$ means "first $\sigma$, then $\tau$", so that $t(\sigma\tau) = (t\sigma)\tau$ for every term $t$. A term $t$ is an **instance** of $s$ if $t = s\sigma$ for some $\sigma$; we then say $s$ is **more general** than $t$ and write $s \lesssim t$. For example `F(x, y)` is more general than `F(x, x)`, which is more general than `F(A, A)`. Two terms that are instances of each other differ only in the names of their variables: they are **variants**, like `F(x, y)` and `F(u, v)`.

```quiz
q: 'Which term is an instance of `F(x, G(x))`?'
options:
  - text: '`F(S(y), G(S(y)))`'
    correct: true
    why: 'Take σ = {x ↦ S(y)}.'
  - text: '`F(A, G(B))`'
    why: 'x would have to be both A and B.'
  - text: '`F(x, y)`'
    why: 'It goes the other way: `F(x, G(x))` is an instance of `F(x, y)` (take y ↦ G(x)), but no substitution turns `G(x)` into the variable `y`.'
  - text: '`F(G(x), x)`'
    why: 'The first argument would force x ↦ G(x), and then the second argument would be `G(G(x))`, not `x`: no substitution turns `G(x)` into a variable.'
```

## The matching problem

:::definition[Matching]
Given terms $l$ (the **pattern**) and $t$, a **matcher** is a substitution $\sigma$ with $l\sigma = t$. The matching problem asks whether one exists, and to find it.
:::

Matching is one-sided: only the pattern's variables may be instantiated. A variable in $t$ is treated like a constant. (When both sides may be instantiated, the problem is **unification**, which is harder and the subject of Chapter 15.)

The algorithm follows the definition of a term. Walk the pattern and the term together, from the root:

:::algorithm[Matching]
**Input:** a pattern $l$, a term $t$. **Output:** a matcher $\sigma$, or failure. Start with $\sigma = \{\}$ and compare $(l, t)$:

1. If $l$ is a variable $x$: if $x$ is not yet bound, bind $x \mapsto t$; if it is bound to $t$, continue; if it is bound to some other term, **fail**.
2. If $l = f(l_1, \ldots, l_n)$: if $t = f(t_1, \ldots, t_n)$ with the same symbol, compare each $(l_i, t_i)$ in turn; otherwise (a different symbol, or $t$ a variable) **fail**.
:::

Step through it on a few examples. The second part of step 1, comparing a bound variable with a term, only happens in **non-linear** patterns, where a variable occurs twice, as in `Eq(x, x) -> True`.

::match-stepper

:::theorem{status=proved}
The matching algorithm terminates. It returns $\sigma$ exactly when a matcher exists, and then $\sigma$ is the only matcher with domain $\mathrm{Var}(l)$. Without non-linear variables it takes time proportional to the size of $l$.
:::

:::proof
**Termination and cost.** Each comparison descends one level in $l$, and each node of $l$ is compared once, so there are at most $|l|$ comparisons. For linear patterns each comparison takes constant time. (For non-linear ones, step 1 compares two terms for equality, which costs up to their size.)

**Soundness.** By induction on $l$, if the algorithm succeeds from a substitution $\sigma_0$ it returns an extension $\sigma$ of $\sigma_0$ with $l\sigma = t$. For a variable this is step 1. For $f(l_1, \ldots, l_n)$, the comparisons give substitutions $\sigma_1 \subseteq \cdots \subseteq \sigma_n$ with $l_i\sigma_i = t_i$; since later substitutions only extend earlier ones, $l_i\sigma_n = t_i$ for all $i$, so $l\sigma_n = f(t_1, \ldots, t_n) = t$.

**Completeness and uniqueness.** Suppose $l\tau = t$ for some $\tau$. Every binding the algorithm makes is of the form $x \mapsto t|_p$ where $p$ is a position of $x$ in $l$, and $\tau(x) = (l\tau)|_p = t|_p$, so every binding agrees with $\tau$. Hence no step fails (a clash would contradict $l\tau = t$, a conflicting binding would contradict that both bindings equal $\tau(x)$), and the result is $\tau$ restricted to $\mathrm{Var}(l)$. Any matcher with domain $\mathrm{Var}(l)$ is determined by the values of these variables, which $t$ forces, so it is unique.
:::

Uniqueness is a real convenience: when a rule matches, there is exactly one way to instantiate its right-hand side. That will fail for matching **modulo** equations such as commutativity (Chapter 22), where `x + y` matches `a + b` in two ways.

## Matching in your engine

The engine represents a substitution as a `Map<string, Term>` from variable names to terms. Write `apply` and `match`: they join your engine and later exercises use them to rewrite.

```code
id: matching/apply-match
title: Substitution and matching
provides: [apply, match]
prompt: |
  Implement

  - `apply(sigma, t)`: the term $t\sigma$ (variables outside the domain stay as they are);
  - `match(pattern, term, sigma?)`: a matcher extending `sigma` (default: empty), or `null`.

  `match` must not modify the map it is given: copy it first. Remember that a variable already bound must be bound to an **equal** term (the reference engine exports `equal(s, t)`).
starter: |
  import type { Term, Subst } from 'trs';
  import { equal } from 'trs';

  export function apply(sigma: Subst, t: Term): Term {
    return t;
  }

  export function match(pattern: Term, term: Term, sigma: Subst = new Map()): Subst | null {
    return null;
  }
tests: |
  import { test, expect } from 'test';
  import { apply, match } from 'solution';
  import { term, show } from 'trs';

  const s = (m) => (m === null ? null : [...m].map(([k, v]) => `${k}=${show(v)}`).sort().join(', '));

  test('apply replaces all variables at once', () => {
    const sigma = new Map([['x', term('S(0)')], ['y', term('x')]]);
    expect(show(apply(sigma, term('+(x, y)')))).toBe('+(S(0), x)');
    expect(show(apply(sigma, term('F(z, A)')))).toBe('F(z, A)');
  });
  test('a pattern variable takes the whole subterm', () => {
    expect(s(match(term('+(S(x), y)'), term('+(S(0), S(S(0)))')))).toBe('x=0, y=S(S(0))');
    expect(s(match(term('x'), term('F(A, B)')))).toBe('x=F(A, B)');
  });
  test('symbols must agree', () => {
    expect(match(term('+(S(x), y)'), term('+(0, S(0))'))).toBe(null);
    expect(match(term('F(x)'), term('G(x)'))).toBe(null);
    expect(match(term('F(x)'), term('F(A, B)'))).toBe(null);
  });
  test('variables of the term are constants for matching', () => {
    expect(match(term('F(A)'), term('F(z)'))).toBe(null);
    expect(s(match(term('F(x)'), term('F(z)')))).toBe('x=z');
  });
  test('non-linear patterns need equal subterms', () => {
    expect(s(match(term('Eq(x, x)'), term('Eq(S(0), S(0))')))).toBe('x=S(0)');
    expect(match(term('Eq(x, x)'), term('Eq(S(0), 0)'))).toBe(null);
  });
  test('an existing substitution is extended, not modified', () => {
    const start = new Map([['x', term('B')]]);
    expect(match(term('F(x, y)'), term('F(A, C)'), start)).toBe(null);
    expect(s(match(term('F(x, y)'), term('F(B, C)'), start))).toBe('x=B, y=C');
    expect(start.size).toBe(1);
  });
  test('matching and apply agree', () => {
    const l = term('Ap(Ap(Ap(S, x), y), z)'), t = term('Ap(Ap(Ap(S, K), K), F(u))');
    expect(show(apply(match(l, t), l))).toBe(show(t));
  });
solution: |
  import type { Term, Subst } from 'trs';
  import { equal } from 'trs';

  export function apply(sigma: Subst, t: Term): Term {
    if (t.type === 'var') return sigma.get(t.name) ?? t;
    return { type: 'fn', name: t.name, args: t.args.map((a) => apply(sigma, a)) };
  }

  export function match(pattern: Term, term: Term, sigma: Subst = new Map()): Subst | null {
    const out = new Map(sigma);
    const go = (p: Term, t: Term): boolean => {
      if (p.type === 'var') {
        const bound = out.get(p.name);
        if (bound === undefined) {
          out.set(p.name, t);
          return true;
        }
        return equal(bound, t);
      }
      if (t.type === 'var' || t.name !== p.name || t.args.length !== p.args.length) return false;
      return p.args.every((a, i) => go(a, t.args[i]));
    };
    return go(pattern, term) ? out : null;
  }
hints:
  - 'Copy the map once (`new Map(sigma)`) and fill the copy in a recursive helper that returns true or false.'
  - 'In the helper: a pattern variable is either unbound (bind it), or bound (compare with `equal`). A pattern symbol needs a term with the same name and the same number of arguments.'
```

## How fast must matching be?

A rewriting engine tries to match every rule against many subterms. With $R$ rules and a term of size $n$, a naive search tries up to $R \cdot n$ matches per rewrite step, and most of them fail at the root symbol. Two ideas from Part III cut this down: **indexing** the rules by their symbols, so that only plausible rules are tried at all (Chapter 8), and compiling all the rules for one symbol into a **decision tree** that inspects each position of the term at most once (Chapter 9).

:::key
- A substitution replaces variables simultaneously; an instance of $l$ is a term $l\sigma$.
- Matching finds $\sigma$ with $l\sigma = t$, walking $l$ and $t$ together. It is linear in $|l|$ for linear patterns, and its result is unique.
- Matching is one-sided; the two-sided problem, unification, comes in Chapter 15.
:::

:::exercises
1. Prove that $t(\sigma\tau) = (t\sigma)\tau$, where $\sigma\tau$ maps each $x$ to $(x\sigma)\tau$.
2. Show that $\lesssim$ is a preorder (reflexive and transitive) and that $s \lesssim t$ and $t \lesssim s$ hold exactly when $s$ and $t$ are variants.
3. Give a pattern $l$ and a term $t$ for which matching does $|l|$ comparisons but $|t|$ is much larger than $|l|$. What does this say about the cost of a rewrite step?
4. Extend `match` so that it reports the number of comparisons it made. On which inputs does the non-linear check cost the most?
:::
