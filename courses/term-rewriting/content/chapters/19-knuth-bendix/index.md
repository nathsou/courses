---
number: 19
title: Knuth–Bendix completion
summary: Turn equations into a convergent rewrite system by orienting them, adding critical pairs and simplifying. The group axioms become ten rules; why completion can fail or run for ever; and completion in your engine.
duration: About 2 hours
prerequisites: [equational-reasoning, path-orders]
theorems: [Completion preserves the equational theory, Fair successful completion produces a convergent system]
techniques: [completion]
---

In 1970 Donald Knuth and Peter Bendix published a procedure that takes a set of equations and, when it succeeds, returns a convergent rewrite system for them, and so a decision procedure for their word problem.:cite[knuth-bendix1970] It combines everything in Parts IV and V: a reduction order to orient equations into terminating rules, critical pairs to find where confluence fails, and rewriting to simplify. This chapter presents it, runs it on the group axioms, and asks you to implement it.

## The idea

Start with the equations $E$ and no rules. Repeatedly:

1. Take an equation, simplify both sides with the current rules, and if they are now equal, drop it.
2. Otherwise **orient** it with a reduction order $>$: if $s > t$ it becomes the rule $s \to t$; if $t > s$, the rule $t \to s$; if neither, **fail**.
3. Compute the critical pairs of the new rule with the existing ones, and add them as equations. They are consequences of the rules, so adding them changes nothing about what is provable, but they are exactly the places where confluence might fail.
4. Keep the rules **inter-reduced**: if the new rule can rewrite the left side of an old rule, turn that old rule back into an equation; if it can rewrite an old rule's right side, simplify the right side.

Stop when there are no equations left and every critical pair has been computed. The rules then terminate (every rule is oriented by $>$) and every critical pair joins (each was turned into an equation, simplified and either deleted or oriented), so by the Knuth–Bendix criterion of Chapter 16 they are confluent.

## The inference rules

Leo Bachmair recast completion as a set of inference rules on a pair $(E, R)$ of equations and rules,:cite[bachmair1991] which makes it easy to state what is preserved:

| Rule | From | To | Condition |
|---|---|---|---|
| **Delete** | $E \cup \{s = s\}, R$ | $E, R$ | |
| **Simplify** | $E \cup \{s = t\}, R$ | $E \cup \{u = t\}, R$ | $s \to_R u$ |
| **Orient** | $E \cup \{s = t\}, R$ | $E, R \cup \{s \to t\}$ | $s > t$ |
| **Compose** | $E, R \cup \{s \to t\}$ | $E, R \cup \{s \to u\}$ | $t \to_R u$ |
| **Collapse** | $E, R \cup \{s \to t\}$ | $E \cup \{u = t\}, R$ | $s \to_R u$ by a rule $l \to r$ with $s$ strictly bigger than $l$ (as a pattern) |
| **Deduce** | $E, R$ | $E \cup \{s = t\}, R$ | $s \leftarrow_R u \to_R t$ |

:::theorem{status=proved}
Each inference rule preserves the equational theory: if $(E, R)$ becomes $(E', R')$, then $=_{E \cup R}$ and $=_{E' \cup R'}$ are the same relation.
:::

:::proof
Each rule replaces an equation or rule by one that is equivalent given the rest. Delete removes a trivial equation. Simplify replaces $s = t$ by $u = t$ where $s \to_R u$, so $s =_R u$ and the two equations are interderivable in the presence of $R$. Orient changes an equation into a rule with the same two sides. Compose replaces $s \to t$ by $s \to u$ with $t \to_R u$ (by a rule other than $s \to t$ itself, since $t$ is smaller than $s$). Collapse moves $s \to t$ back to the equations, simplified with another rule. Deduce adds an equation derivable from $R$.
:::

The deeper result is that a run that does not fail, and is **fair** (every critical pair of the final rules is eventually deduced), ends with a convergent system equivalent to $E$. Huet gave the first complete proof in 1981;:cite[huet1981] Bachmair's proof shows that each inference step makes some *proof* of each equation smaller in a well-founded order on proofs, until every equation has a proof of the form $s \to^* \cdot \leftarrow^* t$, a rewrite proof.:cite[bachmair1991]

:::theorem{status=sketched}
If a fair completion run with a reduction order $>$ terminates without failure in a state $(\emptyset, R)$, then $R$ is convergent and $=_R$ equals $=_E$.
:::

## The group axioms become ten rules

Run completion on the three group axioms with the lexicographic path order and the precedence $I \succ \cdot \succ E$, and step through the inferences:

::completion-animator{equations="*(E, x) == x\n*(I(x), x) == E\n*(*(x, y), z) == *(x, *(y, z))" prec="I > * > E"}

After a couple of hundred inference steps, completion stops with ten rules: the ones used in Chapter 0 and Chapter 18. Watch the classic moments. The critical pair of left inverse and associativity yields $x^{-1} \cdot (x \cdot z) \to z$. Right identity $x \cdot e \to x$ and right inverse $x \cdot x^{-1} \to e$ appear, although neither was assumed. Finally $(x \cdot y)^{-1} \to y^{-1} \cdot x^{-1}$ arrives and some earlier rules collapse. This is the first example in Knuth and Bendix's paper.

The ten rules are a **canonical** presentation of group theory: any two terms are equal in all groups exactly when their normal forms coincide. Group theory's word problem, for the free group, is thereby decided by a short program.

## When completion fails or never stops

The outcome depends on the order, and there are three possible bad outcomes.

**Failure.** With the precedence $\cdot \succ I \succ E$, completion produces the equation $(x \cdot y)^{-1} = y^{-1} \cdot x^{-1}$, whose left side is no longer bigger than its right side (the root `*` of the right side now dominates `I`), nor the other way round: it cannot be oriented, and completion fails. The commutativity law $x + y = y + x$ fails with any order (Chapter 12). Chapter 20 shows how to keep going anyway.

**Divergence.** Some equations generate infinitely many rules. Completing the single equation $F(G(F(x))) = F(G(x))$ produces $F(G(G(F(x)))) \to F(G(G(x)))$, then $F(G^3(F(x))) \to F(G^3(x))$, and so on for ever. The system it is approaching is infinite: no finite convergent system exists for this order. Try it in the workbench (its *Completion* tab gives up after its step limit and shows the rules found so far).

```girafe title="Completion in the workbench" tools="completion"
#precedence F > G
F(G(F(x))) == F(G(x))
```

**Choosing badly.** A different order can turn failure into success: with $E \succ \cdot \succ I$, completion of the group axioms fails at once, and with $I \succ \cdot \succ E$ it succeeds. The Knuth–Bendix order with all weights equal to 1 does not finish within the step limit: the weights matter as much as the precedence. Real completion tools try several orders, or search for one.

```quiz
q: 'Completion stops in the state $(\emptyset, R)$ after processing every critical pair. Which property of $R$ comes from the reduction order, and which from the critical pairs?'
options:
  - text: 'Termination from the order (every rule decreases); local confluence from the critical pairs (all joinable); confluence from both, by Newman’s lemma.'
    correct: true
    why: 'That is the Knuth–Bendix criterion: a terminating system whose critical pairs all join is confluent.'
  - text: 'Confluence from the order; termination from the critical pairs.'
    why: 'The order guarantees termination; critical pairs say nothing about it.'
  - text: 'Both come from the critical pairs.'
    why: 'Critical pairs only control local confluence.'
```

## Completion in your engine

The reference engine provides three helpers: `normalizeWith(R, t)`, which normalises a term with a list of `[lhs, rhs]` pairs; `overlaps(outer, inner, sameRule)`, which returns the critical pairs of two such pairs; and `canonical(pair)`, which renames a pair's variables to `x, y, z, …`. Implement the main loop.

```code
id: knuth-bendix/complete
title: Knuth–Bendix completion
provides: [complete]
prompt: |
  Write `complete(equations, gt, opts?)`. `equations` is a list of `{ left, right }` (or `[left, right]` pairs) and `gt(s, t)` a reduction order. Return `{ status, rules, steps }` where `status` is `'success'`, `'failed'` (an equation could not be oriented; also return it as `stuck: [s, t]`) or `'gave up'` (after `opts.maxSteps`, default 2000, iterations or more than `opts.maxRules`, default 60, rules). `rules` is a list of `{ lhs, rhs }`; `steps` may be an empty array.

  Follow Huet's loop: while there are equations, take the smallest (by total size), simplify both sides, delete or orient it, then inter-reduce the rules (collapse rules whose left side the new rule rewrites; compose right sides). When there are no equations, take an unprocessed rule, mark it processed, and add its critical pairs with every processed rule (both ways, and with itself). When every rule is processed, succeed.
starter: |
  import type { Term } from 'trs';
  import { normalizeWith, overlaps, canonical, equal, size, at, positions, match } from 'trs';

  type Pair = [Term, Term];

  export function complete(equations: readonly ({ left: Term; right: Term } | Pair)[], gt: (s: Term, t: Term) => boolean, opts: { maxSteps?: number; maxRules?: number } = {}) {
    return { status: 'gave up' as const, rules: [] as { lhs: Term; rhs: Term }[], steps: [] as unknown[] };
  }
tests: |
  import { test, expect } from 'test';
  import { complete } from 'solution';
  import { parseStrict, lpo, precedence, term, normalize, system, equal } from 'trs';

  const eqs = (src) => parseStrict(src).equations;
  test('the group axioms complete to ten rules', () => {
    const r = complete(eqs('*(E, x) == x\n*(I(x), x) == E\n*(*(x, y), z) == *(x, *(y, z))'), lpo(precedence(['I', '*', 'E'])));
    expect(r.status).toBe('success');
    expect(r.rules.length).toBe(10);
    const sys = system(r.rules);
    const same = (a, b) => equal(normalize(sys, term(a)).term, normalize(sys, term(b)).term);
    expect(same('I(*(a, I(b)))', '*(b, I(a))')).toBe(true);
    expect(same('*(a, b)', '*(b, a)')).toBe(false);
  });
  test('commutativity fails', () => {
    const r = complete(eqs('+(x, y) == +(y, x)'), lpo(precedence(['+'])));
    expect(r.status).toBe('failed');
  });
  test('a small string-rewriting presentation', () => {
    const r = complete(eqs('F(F(x)) == G(x)'), lpo(precedence(['F', 'G'])));
    expect(r.status).toBe('success');
    expect(r.rules.length).toBe(2);
  });
  test('divergence is reported, not looped on', () => {
    const r = complete(eqs('F(G(F(x))) == F(G(x))'), lpo(precedence(['F', 'G'])), { maxRules: 12 });
    expect(r.status).toBe('gave up');
  });
solution: |
  import type { Term } from 'trs';
  import { normalizeWith, overlaps, canonical, equal, size, at, positions, match } from 'trs';

  type Pair = [Term, Term];

  export function complete(equations: readonly ({ left: Term; right: Term } | Pair)[], gt: (s: Term, t: Term) => boolean, opts: { maxSteps?: number; maxRules?: number } = {}) {
    const { maxSteps = 2000, maxRules = 60 } = opts;
    let E: Pair[] = equations.map((e) => (Array.isArray(e) ? [e[0], e[1]] : [e.left, e.right]) as Pair);
    let R: { pair: Pair; done: boolean }[] = [];
    const pairs = () => R.map((r) => r.pair);
    const reducible = (rule: Pair, t: Term) => positions(t).some((p) => at(t, p).type === 'fn' && match(rule[0], at(t, p)) !== null);
    const sz = ([a, b]: Pair) => size(a) + size(b);
    const result = (status, stuck?) => ({ status, rules: pairs().map(([lhs, rhs]) => ({ lhs, rhs })), steps: [], stuck });
    for (let n = 0; ; n++) {
      if (n > maxSteps || R.length > maxRules) return result('gave up');
      if (E.length) {
        E.sort((a, b) => sz(a) - sz(b));
        const [s0, t0] = E.shift()!;
        const s = normalizeWith(pairs(), s0), t = normalizeWith(pairs(), t0);
        if (equal(s, t)) continue;
        let rule: Pair;
        if (gt(s, t)) rule = canonical([s, t]);
        else if (gt(t, s)) rule = canonical([t, s]);
        else return result('failed', [s, t]);
        const kept: typeof R = [];
        for (const r of R) {
          if (reducible(rule, r.pair[0])) E.push(r.pair);
          else kept.push({ pair: [r.pair[0], normalizeWith([...pairs(), rule], r.pair[1])], done: r.done });
        }
        R = [...kept, { pair: rule, done: false }];
        continue;
      }
      const next = R.filter((r) => !r.done).sort((a, b) => sz(a.pair) - sz(b.pair))[0];
      if (!next) return result('success');
      next.done = true;
      for (const r of R) {
        if (!r.done) continue;
        E.push(...overlaps(next.pair, r.pair, r === next));
        if (r !== next) E.push(...overlaps(r.pair, next.pair, false));
      }
    }
  }
hints:
  - 'Keep the rules as `{ pair, done }` so you know which ones have had their critical pairs computed.'
  - 'After orienting a new rule, rebuild `R`: old rules whose left side the new rule rewrites go back to `E`; the others get their right side normalised with all the rules, the new one included.'
  - 'When `E` is empty, pick the smallest unprocessed rule, mark it done, and push its overlaps with every done rule (in both directions) and with itself.'
```

:::key
- Completion orients equations with a reduction order, adds critical pairs and inter-reduces, and every step preserves the equational theory.
- A fair run that succeeds yields a convergent system that decides the word problem; the group axioms give ten rules.
- Completion can fail (an unorientable equation), diverge (infinitely many rules), or depend on the choice of order.
:::

:::exercises
1. Run completion on the three group axioms with the extra axiom $x \cdot x = e$ (groups of exponent 2, which are always commutative, although commutativity is not among the axioms). What happens? (Chapter 20 completes the story.)
2. Complete $A \cdot B = B \cdot A$, $A \cdot A = E$, $B \cdot B = E$ with associativity and two-sided identity, using the precedence $\cdot \succ B \succ A \succ E$. How many elements does the group they present have, and how can you read that off the rules?
3. Explain why Collapse requires the rewriting rule to be strictly more general than the collapsed rule (consider a rule rewriting its own left side).
4. Show that the infinite system $F(G^n(F(x))) \to F(G^n(x))$ for $n \ge 1$ is convergent and equivalent to $F(G(F(x))) = F(G(x))$, so that the word problem is decidable even though completion never stops.
:::
