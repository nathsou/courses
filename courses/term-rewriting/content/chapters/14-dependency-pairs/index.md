---
number: 14
title: Dependency pairs
summary: Look only at the recursive calls. Dependency pairs, the dependency graph and its cycles, the subterm criterion and reduction pairs, the method behind every modern termination prover.
duration: About 1½ hours
prerequisites: [kruskal]
theorems: [The dependency pair theorem, Cycles can be treated separately]
techniques: [dependency pairs]
---

Some systems terminate for reasons no simplification order can see. Division by repeated subtraction is the standard example:

```girafe title="Division" tools="termination,run"
Minus(x, 0) -> x
Minus(S(x), S(y)) -> Minus(x, y)
Quot(0, S(y)) -> 0
Quot(S(x), S(y)) -> S(Quot(Minus(x, y), S(y)))
? Quot(S(S(S(S(S(S(S(0))))))), S(S(0)))
```

In the last rule, the recursive call `Quot(Minus(x, y), S(y))` receives `Minus(x, y)`, which may be as large as `x`, but its *value* is smaller than `S(x)`. A simplification order cannot know that `Minus` makes things smaller. Replace `y` by `S(x)` and the rule becomes `Quot(S(x), S(S(x))) -> S(Quot(Minus(x, S(x)), S(S(x))))`, whose right side embeds its left side (delete `S` at the root, and `Minus` keeping its second argument). Chapter 13 showed that embedding defeats every simplification order. The *Termination* tab nevertheless proves the system terminating, using the method of this chapter, due to Thomas Arts and Jürgen Giesl (2000).:cite[arts-giesl2000]

## Dependency pairs

The idea is to stop comparing whole terms and compare only the **calls**: an infinite reduction must keep calling defined symbols, so it is enough to show that the arguments of calls cannot decrease for ever.

:::definition[Dependency pairs]
Let $D$ be the defined symbols of $R$. For each $f \in D$ introduce a fresh **marked** symbol $f^\sharp$ of the same arity. For every rule $l \to r$ and every subterm $u = g(u_1, \ldots, u_n)$ of $r$ with $g \in D$ that is not a proper subterm of $l$, the pair
$$ l^\sharp \to u^\sharp, \qquad\text{where } f(t_1, \ldots, t_m)^\sharp = f^\sharp(t_1, \ldots, t_m), $$
is a **dependency pair**.
:::

Division has three: `Minus#(S(x), S(y)) -> Minus#(x, y)`, `Quot#(S(x), S(y)) -> Quot#(Minus(x, y), S(y))` and `Quot#(S(x), S(y)) -> Minus#(x, y)`. Each records "this call may lead to that call". Marking the root keeps the outer layer apart from the rules: a dependency pair is applied only at the root, while the ordinary rules are free to rewrite the arguments in between.

:::definition[Chain]
A **chain** is a sequence of dependency pairs $s_1 \to t_1, s_2 \to t_2, \ldots$ (renamed apart) with substitutions $\sigma_i$ such that $t_i\sigma_i \to_R^* s_{i+1}\sigma_{i+1}$ for all $i$: between two calls, the arguments may be rewritten by the rules.
:::

:::theorem{name="Arts and Giesl" year=2000 status=sketched}
A system $R$ terminates if and only if there is no infinite chain of its dependency pairs.
:::

:::proof
If $R$ does not terminate, take a non-terminating term that is minimal, in the sense that all its proper subterms terminate. An infinite reduction from it must eventually apply a rule at the root, say $l\sigma \to r\sigma$ (before that, only arguments are rewritten, and they terminate). Then $r\sigma$ is non-terminating, so some subterm $u\sigma$ of $r\sigma$ with $u$ a defined-rooted subterm of $r$ is non-terminating and minimal: that is a dependency pair step $l^\sharp\sigma \to u^\sharp\sigma$. Repeating gives an infinite chain. (A subterm $u$ of $r$ that is a proper subterm of $l$ cannot be the culprit, since proper subterms of the minimal term terminate.) The converse direction, that an infinite chain gives an infinite reduction, follows by unmarking. Arts and Giesl give the full argument.
:::

## The dependency graph

Which pair can follow which? Draw an arrow from pair $s \to t$ to pair $s' \to t'$ if some instance of $t$ can rewrite to an instance of $s'$. That is undecidable in general, so tools approximate it: replace every defined-rooted subterm of $t$ by a fresh variable ("anything could come out of a call"), rename variables apart, and draw the arrow if the result unifies with $s'$ (unification is Chapter 15). An infinite chain must eventually stay inside one **strongly connected component** (a maximal set of pairs that can all reach each other), so each cycle can be handled separately.

::dependency-graph{rules="Minus(x, 0) -> x\nMinus(S(x), S(y)) -> Minus(x, y)\nQuot(0, S(y)) -> 0\nQuot(S(x), S(y)) -> S(Quot(Minus(x, y), S(y)))"}

Pair 3, `Quot#(…) -> Minus#(x, y)`, lies on no cycle: a chain can use it at most once, on its way from the `Quot` cycle to the `Minus` cycle. Each cycle is then removed by a simple argument.

## Removing cycles

**The subterm criterion.** Choose, for each marked symbol in a cycle, one argument position $\pi(f^\sharp)$. If every pair in the cycle has its chosen argument on the right a subterm of (or equal to) the chosen argument on the left, and strictly for at least one pair, that pair can be removed: along an infinite chain the chosen arguments would form a descending sequence of subterms, and the strict steps cannot occur infinitely often. Nao Hirokawa and Aart Middeldorp introduced this criterion in 2004.:cite[hirokawa-middeldorp2004] The `Minus` cycle falls to it immediately: $\pi(\mathtt{Minus}^\sharp) = 1$, and `x` is a proper subterm of `S(x)`.

**Reduction pairs.** The `Quot` cycle needs to know that `Minus(x, y)` is not bigger than `x`. Use a polynomial interpretation, but relax monotonicity: it only needs to be *weakly* monotone, and the rules only need to *weakly* decrease ($\ge$), because they are applied between calls; the pairs must weakly decrease, and a pair that strictly decreases can be removed. With $[\mathtt{Minus}](x, y) = x$, $[S](x) = x + 1$, $[0] = 0$ and $[\mathtt{Quot}^\sharp](x, y) = x$:

$$
\begin{aligned}
\mathtt{Minus}(x, 0) &: x \ge x, \\
\mathtt{Minus}(S(x), S(y)) &: x + 1 \ge x, \\
\mathtt{Quot}^\sharp(S(x), S(y)) \to \mathtt{Quot}^\sharp(\mathtt{Minus}(x, y), S(y)) &: x + 1 > x.
\end{aligned}
$$

(The two `Quot` rules must weakly decrease as well; $[\mathtt{Quot}](x, y) = x$ takes care of them, and the usable-rules refinement below removes the obligation altogether.) The interpretation of `Minus` ignores its second argument entirely, which a strictly monotone interpretation could not do: that is the extra freedom dependency pairs buy. The widget above finds both arguments automatically.

Refinements abound. **Usable rules** restrict the rules that must weakly decrease to those that can actually be used to rewrite the arguments in a given cycle; **argument filters** drop arguments before comparing with a path order; and the whole method is organised as the **dependency pair framework**, in which a termination problem is a set of pairs plus rules, and many **processors** (graph decomposition, the subterm criterion, reduction pairs, narrowing, …) each turn a problem into simpler ones. Every competitive termination prover today, including AProVE and TTT2,:cite[giesl2017,korp2009] is built on this framework, and the annual Termination Competition runs them on the Termination Problems Data Base, a collection of thousands of systems.:cite[tpdb]

```quiz
q: 'Why is `F#(F(x)) -> F#(x)` not a dependency pair of the rule `F(F(x)) -> F(G(F(x)))`?'
options:
  - text: '`F(x)` is a proper subterm of the left-hand side, so a minimal non-terminating term cannot have it as its culprit.'
    correct: true
    why: 'The refinement in the definition excludes such subterms. The only pair is `F#(F(x)) -> F#(G(F(x)))`, which has no cycle (G is not F), so the system terminates.'
  - text: '`F(x)` is not a defined symbol.'
    why: '`F` is defined: it is the root of the left-hand side.'
  - text: 'Because the rule is not left-linear.'
    why: 'The rule is left-linear.'
```

## Dependency pairs in code

```code
id: dependency-pairs/pairs
title: Computing dependency pairs
prompt: |
  Write `dependencyPairs(rules)`, returning the dependency pairs as strings `"lhs# -> rhs#"`, in order: by rule, then by position of the subterm in pre-order. Mark a symbol by appending `#` to its name. Leave out subterms that are proper subterms of the left-hand side.

  `positions`, `at`, `equal` and `show` from `trs` will help.
starter: |
  import type { Rule } from 'trs';
  import { positions, at, equal, show, f } from 'trs';

  export function dependencyPairs(rules: readonly Rule[]): string[] {
    return [];
  }
tests: |
  import { test, expect } from 'test';
  import { dependencyPairs } from 'solution';
  import { rules } from 'trs';

  test('division', () => {
    expect(dependencyPairs(rules('Minus(x, 0) -> x\nMinus(S(x), S(y)) -> Minus(x, y)\nQuot(0, S(y)) -> 0\nQuot(S(x), S(y)) -> S(Quot(Minus(x, y), S(y)))'))).toEqual([
      'Minus#(S(x), S(y)) -> Minus#(x, y)',
      'Quot#(S(x), S(y)) -> Quot#(Minus(x, y), S(y))',
      'Quot#(S(x), S(y)) -> Minus#(x, y)',
    ]);
  });
  test('constructors are not calls', () => {
    expect(dependencyPairs(rules('+(0, y) -> y\n+(S(x), y) -> S(+(x, y))'))).toEqual(['+#(S(x), y) -> +#(x, y)']);
  });
  test('proper subterms of the left-hand side are left out', () => {
    expect(dependencyPairs(rules('F(F(x)) -> F(G(F(x)))'))).toEqual(['F#(F(x)) -> F#(G(F(x)))']);
  });
  test('Ackermann', () => {
    expect(dependencyPairs(rules('Ack(0, n) -> S(n)\nAck(S(m), 0) -> Ack(m, S(0))\nAck(S(m), S(n)) -> Ack(m, Ack(S(m), n))'))).toEqual([
      'Ack#(S(m), 0) -> Ack#(m, S(0))',
      'Ack#(S(m), S(n)) -> Ack#(m, Ack(S(m), n))',
      'Ack#(S(m), S(n)) -> Ack#(S(m), n)',
    ]);
  });
solution: |
  import type { Rule } from 'trs';
  import { positions, at, equal, show, f } from 'trs';

  export function dependencyPairs(rules: readonly Rule[]): string[] {
    const defined = new Set(rules.map((r) => (r.lhs.type === 'fn' ? r.lhs.name : '')));
    const mark = (t) => f(t.name + '#', ...t.args);
    const out: string[] = [];
    for (const r of rules) {
      const properSubterms = positions(r.lhs).filter((p) => p.length > 0).map((p) => at(r.lhs, p));
      for (const p of positions(r.rhs)) {
        const u = at(r.rhs, p);
        if (u.type !== 'fn' || !defined.has(u.name)) continue;
        if (properSubterms.some((s) => equal(s, u))) continue;
        out.push(`${show(mark(r.lhs))} -> ${show(mark(u))}`);
      }
    }
    return out;
  }
hints:
  - 'The defined symbols are the roots of the left-hand sides.'
  - 'For each rule, walk the positions of the right-hand side in pre-order (that is the order `positions` returns) and keep the subterms whose root is defined and which do not occur strictly inside the left-hand side.'
```

:::key
- Dependency pairs record the calls a rule makes; a system terminates iff there is no infinite chain of them.
- The dependency graph splits the problem into cycles, each handled separately.
- The subterm criterion and reduction pairs (weakly monotone interpretations, rules only weakly decreasing) remove cycles, proving systems no simplification order can.
:::

:::exercises
1. Compute the dependency pairs and graph of Ackermann's function, and prove termination with the subterm criterion alone.
2. Show that the system `F(0, 1, x) -> F(x, x, x)`, `G(x, y) -> x`, `G(x, y) -> y` (Toyama's example) does not terminate, although its two parts terminate separately.:cite[toyama1987] Find the infinite reduction of `F(G(0, 1), G(0, 1), G(0, 1))`.
3. Why must the rules only weakly decrease in a reduction pair, and why may the interpretation be only weakly monotone?
4. Adapt the estimated dependency graph so that it is exact for systems without defined symbols below the root of right-hand sides.
:::
