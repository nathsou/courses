---
number: 16
title: Critical pairs
summary: Where two left-hand sides overlap, the critical pair lemma that reduces local confluence to finitely many checks, a decision procedure for confluence of terminating systems, and critical pairs in your engine.
duration: About 1½ hours
prerequisites: [unification, abstract-reduction]
theorems: [The critical pair lemma, The Knuth–Bendix criterion]
techniques: [critical pairs]
---

Newman's lemma (Chapter 4) reduces confluence of a terminating system to local confluence: every one-step peak $t_1 \leftarrow s \to t_2$ must be joinable. But a system has infinitely many peaks, one for every term and every pair of redexes in it. This chapter shows that only finitely many of them matter: the **critical pairs**, computed by unification from the rules alone. That turns confluence of terminating systems into something a computer can decide.

## Three kinds of peak

Take a term $s$ with two redexes, at positions $p_1$ and $p_2$, for rules $l_1 \to r_1$ and $l_2 \to r_2$. There are three possibilities.

**Disjoint redexes.** If $p_1 \parallel p_2$, the redexes do not touch. Contract the other one on each side: by the replacement lemma of Chapter 1, both orders give the same term in one more step each. Always joinable.

**Nested, but not overlapping.** Say $p_2$ is below $p_1$, and the inner redex sits entirely inside the part of $l_1\sigma$ matched by a variable $x$ of $l_1$. Contracting the inner redex changes the value of $x$; then $l_1$ still matches, with $x$ bound to the new value. If $x$ occurs $k$ times in $r_1$, the other side needs $k$ inner steps to catch up, one per copy. Always joinable. (Draw it: the outer rule `F(x) -> G(x, x)` with the inner redex `A -> B` inside `x`.)

**Overlapping.** The inner redex sits at a *non-variable* position of $l_1$: the two left-hand sides genuinely share symbols. Here nothing guarantees joinability, and these are the cases to check.

## Critical pairs

All overlaps of two rules are instances of finitely many most general ones, found by unification.

:::definition[Critical pair]
Let $l_1 \to r_1$ and $l_2 \to r_2$ be rules with their variables renamed apart, and $p$ a non-variable position of $l_1$ such that $l_1|_p$ and $l_2$ are unifiable, with mgu $\sigma$. (If both are the same rule, exclude $p = \varepsilon$: a rule trivially overlaps itself at the root.) Then the term $l_1\sigma$ can be rewritten in two ways,
$$ l_1\sigma[r_2\sigma]_p \;\leftarrow\; l_1\sigma \;\to\; r_1\sigma, $$
and the pair $\langle l_1\sigma[r_2\sigma]_p,\ r_1\sigma\rangle$ is a **critical pair**; $l_1\sigma$ is its **peak**.
:::

For the three group axioms written as rules, $E \cdot x \to x$, $x^{-1} \cdot x \to E$ and $(x \cdot y) \cdot z \to x \cdot (y \cdot z)$, the associativity rule overlaps the other two (and itself) inside its left-hand side. For example, unifying $(x \cdot y)$ with $E \cdot x'$ gives the peak $(E \cdot y) \cdot z$, which rewrites to $y \cdot z$ by the first rule and to $E \cdot (y \cdot z)$ by associativity, and that one rewrites to $y \cdot z$ too. Explore all three:

::critical-pairs{rules="*(E, x) -> x\n*(I(x), x) -> E\n*(*(x, y), z) -> *(x, *(y, z))"}

The second pair does not join. The peak $(x^{-1} \cdot x) \cdot z$ gives $E \cdot z \to z$ on one side and $x^{-1} \cdot (x \cdot z)$ on the other, which is a normal form: the rules cannot prove that $x^{-1} \cdot (x \cdot z) = z$, although it follows from the axioms. Knuth–Bendix completion (Chapter 19) adds exactly this as a new rule.

## The critical pair lemma

:::theorem{name="Critical pair lemma (Knuth and Bendix; Huet)" status=proved}
A rewrite system is locally confluent if and only if all its critical pairs are joinable.
:::

::::zoom{levels="Idea, Proof"}
:::level[Idea]
A critical pair is itself a peak, so local confluence makes it joinable. Conversely, every one-step peak is disjoint (always joinable), a variable overlap (always joinable), or an instance of a critical pair inside a context. Joinability survives instantiation and contexts (Chapter 3), so it is enough that the critical pairs join.
:::
:::level[Proof]
($\Rightarrow$) A critical pair $\langle t_1, t_2\rangle$ comes from the peak $t_1 \leftarrow l_1\sigma \to t_2$, which local confluence makes joinable.

($\Leftarrow$) Let $t_1 \leftarrow s \to t_2$ with redexes at $p_1, p_2$ for rules $l_1 \to r_1$, $l_2 \to r_2$ and substitutions $\sigma_1, \sigma_2$.

*Case $p_1 \parallel p_2$.* $t_1 = s[r_1\sigma_1]_{p_1}$ still contains $l_2\sigma_2$ at $p_2$, and $t_2$ still contains $l_1\sigma_1$ at $p_1$; contracting them gives $s[r_1\sigma_1]_{p_1}[r_2\sigma_2]_{p_2}$ from both sides (replacements at parallel positions commute).

*Case nested*, say $p_2 = p_1.q$ (the other order is symmetric). By closure under contexts we may assume $p_1 = \varepsilon$, so $s = l_1\sigma_1$ and $s|_q = l_2\sigma_2$.

- *Variable overlap:* $q = q_1.q_2$ where $l_1|_{q_1}$ is a variable $x$. Then $\sigma_1(x) \to \sigma_1'(x)$ by the inner step, where $\sigma_1'$ agrees with $\sigma_1$ except $\sigma_1'(x) = \sigma_1(x)[r_2\sigma_2]_{q_2}$. From $t_2 = l_1\sigma_1[r_2\sigma_2]_q$, rewrite the other occurrences of $x$ in $l_1\sigma_1$ in the same way to reach $l_1\sigma_1'$, then apply the outer rule: $l_1\sigma_1' \to r_1\sigma_1'$. From $t_1 = r_1\sigma_1$, rewrite every occurrence of $\sigma_1(x)$ in $r_1\sigma_1$ to reach $r_1\sigma_1'$. Joinable.
- *Critical overlap:* $q$ is a non-variable position of $l_1$. Then $(l_1|_q)\sigma_1 = l_2\sigma_2$. With the rules renamed apart, $\sigma_1 \cup \sigma_2$ is a single substitution that unifies $l_1|_q$ and $l_2$, so it is an instance $\sigma\rho$ of their mgu $\sigma$. Hence the peak is the instance by $\rho$ of the critical peak $l_1\sigma[r_2\sigma]_q \leftarrow l_1\sigma \to r_1\sigma$. By assumption the critical pair joins; joinability is preserved by substitution (and, for the general $p_1$, by contexts). $\blacksquare$
:::
::::

The lemma is in Knuth and Bendix's 1970 paper for the case they needed;:cite[knuth-bendix1970] Gérard Huet stated and proved it for arbitrary systems in 1980.:cite[huet1980] With Newman's lemma it gives:

:::corollary{name="The Knuth–Bendix criterion" status=proved}
A terminating system is confluent if and only if all its critical pairs are joinable. For a finite terminating system this is decidable: compute the finitely many critical pairs, normalise both sides of each (normalisation terminates), and compare.
:::

Without termination only half of the criterion survives. A critical pair that does not join still refutes confluence: the system `F(x) -> A`, `F(x) -> B` is caught by its critical pair `<A, B>`. But joinable critical pairs no longer prove anything: a non-terminating system can have all its critical pairs joinable and still not be confluent (Exercise 3). Chapter 17 shows what can replace termination: left-linear systems with no critical pairs at all are confluent even when they do not terminate.

## Is the algebra system confluent?

The identity rules of the algebra system have critical pairs, but all of them are trivial (such as `0 * 1`, which both rules send to `0`). Add the two distributivity laws and check again:

```girafe title="Identities and distributivity" tools="confluence,run"
#infixl 6 +
#infixl 7 *
0 + x -> x
x + 0 -> x
0 * x -> 0
x * 0 -> 0
1 * x -> x
x * 1 -> x
x * (y + z) -> x * y + x * z
(x + y) * z -> x * z + y * z
? (A + B) * (C + D)
```

One pair does not join: $(x + y) \cdot (z + w)$ expands to $(xz + xw) + (yz + yw)$ by distributing on the left first, and to $(xz + yz) + (xw + yw)$ by distributing on the right first. Both are correct; they differ only by associativity and commutativity of $+$. No rule can fix that without looping (Chapter 12), which is why the algebra system has to wait for rewriting *modulo* associativity and commutativity in Chapter 22.

```quiz
q: 'A terminating system has one critical pair whose two sides have different normal forms. What can you conclude?'
options:
  - text: 'The system is not confluent: the peak term rewrites to two different normal forms.'
    correct: true
    why: 'The peak l₁σ reaches both normal forms; in a confluent system they would have to be equal.'
  - text: 'Nothing: maybe another strategy would join them.'
    why: 'In a terminating system, two distinct normal forms of one term are a counterexample to confluence, whatever the strategy.'
  - text: 'The system does not terminate after all.'
    why: 'Confluence and termination are independent properties.'
```

## Critical pairs in your engine

```code
id: critical-pairs/critical-pairs
title: Critical pairs
provides: [criticalPairs]
prompt: |
  Write `criticalPairs(rules)`, returning objects `{ outer, inner, pos, mgu, peak, left, right }` where `outer` and `inner` are rule indices, `pos` is the position in the outer left-hand side, `left` is the side rewritten by the inner rule, and `right = r_outer σ`.

  - Rename the inner rule's variables apart from the outer rule's (use `renameApartAll([lhs, rhs], avoid)` from `trs`).
  - Try every non-variable position of the outer left-hand side, excluding the root when outer and inner are the same rule.
  - A root overlap of two *different* rules would be found twice (as (i, j) and as (j, i)): keep only the one with `outer < inner`.

  Use `unify`, `apply`, `positions`, `at` and `replaceAt` from your engine.
starter: |
  import type { Rule, Term, Subst } from 'trs';
  import { renameApartAll, vars } from 'trs';
  import { unify, apply, positions, at, replaceAt } from 'engine';

  export function criticalPairs(rules: readonly Rule[]) {
    const out: { outer: number; inner: number; pos: number[]; mgu: Subst; peak: Term; left: Term; right: Term }[] = [];
    return out;
  }
tests: |
  import { test, expect } from 'test';
  import { criticalPairs } from 'solution';
  import { rules, show, normalize, system, equal, variant, term } from 'trs';

  const groups = rules('*(E, x) -> x\n*(I(x), x) -> E\n*(*(x, y), z) -> *(x, *(y, z))');
  test('the group axioms have three critical pairs', () => {
    const cps = criticalPairs(groups);
    expect(cps.length).toBe(3);
    expect(cps.every((c) => c.outer === 2)).toBe(true);
  });
  test('each is a real peak', () => {
    const sys = system(groups);
    for (const c of criticalPairs(groups)) {
      const reducts = normalize(sys, c.peak, { fuel: 1 }).steps; // the peak is reducible
      expect(reducts.length).toBe(1);
    }
  });
  test('the inverse overlap does not join', () => {
    const sys = system(groups);
    const bad = criticalPairs(groups).filter((c) => !equal(normalize(sys, c.left).term, normalize(sys, c.right).term));
    expect(bad.length).toBe(1);
    expect(variant(bad[0].peak, term('*(*(I(x), x), z)'))).toBe(true);
  });
  test('orthogonal systems have none', () => {
    expect(criticalPairs(rules('+(0, y) -> y\n+(S(x), y) -> S(+(x, y))'))).toEqual([]);
  });
  test('two rules with the same left-hand side give one root pair', () => {
    const cps = criticalPairs(rules('F(x) -> A\nF(x) -> B'));
    expect(cps.length).toBe(1);
    expect([show(cps[0].left), show(cps[0].right)].sort()).toEqual(['A', 'B']);
  });
  test('a rule overlapping itself below the root', () => {
    expect(criticalPairs(rules('F(F(x)) -> G(x)')).length).toBe(1);
  });
solution: |
  import type { Rule, Term, Subst } from 'trs';
  import { renameApartAll, vars } from 'trs';
  import { unify, apply, positions, at, replaceAt } from 'engine';

  export function criticalPairs(rules: readonly Rule[]) {
    const out: { outer: number; inner: number; pos: number[]; mgu: Subst; peak: Term; left: Term; right: Term }[] = [];
    rules.forEach((o, outer) => {
      rules.forEach((i0, inner) => {
        const [l2, r2] = renameApartAll([i0.lhs, i0.rhs], [...vars(o.lhs), ...vars(o.rhs)]);
        for (const pos of positions(o.lhs)) {
          if (at(o.lhs, pos).type === 'var') continue;
          if (pos.length === 0 && outer >= inner) continue;
          const mgu = unify(at(o.lhs, pos), l2);
          if (!mgu) continue;
          out.push({ outer, inner, pos: [...pos], mgu, peak: apply(mgu, o.lhs), left: apply(mgu, replaceAt(o.lhs, pos, r2)), right: apply(mgu, o.rhs) });
        }
      });
    });
    return out;
  }
hints:
  - 'Two nested loops over the rules (outer, inner), and inside them a loop over the positions of the outer left-hand side.'
  - 'Skip variable positions, and skip the root when `outer >= inner`: that excludes a rule against itself at the root and the duplicate root overlaps.'
```

:::key
- Peaks with disjoint or variable-overlapping redexes always join; only genuine overlaps matter.
- Critical pairs are the most general overlaps, found by unification; there are finitely many.
- Critical pair lemma: locally confluent iff all critical pairs join. With termination: confluence is decidable.
:::

:::exercises
1. Compute all critical pairs of `F(G(x)) -> H(x)` and `G(A) -> B`. Is the system confluent?
2. In the variable-overlap case of the proof, why does the rule `F(x, x) -> A` cause no problem, even though contracting a redex in one copy of `x` makes the two arguments different? (Look again at what has to be rewritten.)
3. Check that the system `A -> B`, `B -> A`, `A -> C`, `B -> D` has only joinable critical pairs, yet is not confluent. Which hypothesis of the Knuth–Bendix criterion fails?
4. Prove that a left-linear system without critical pairs is confluent if it terminates, without using the critical pair lemma.
:::
