---
number: 12
title: Path orders
summary: Simplification orders, the recursive and lexicographic path orders and the Knuth–Bendix order, syntactic orders that compare terms directly, with an LPO for your engine.
duration: About 1½ hours
prerequisites: [interpretations]
theorems: [Simplification orders are well-founded, LPO is a simplification order]
techniques: [LPO]
---

Polynomial interpretations translate terms into numbers and compare those. **Path orders** compare terms directly, by their symbols. They are easy to compute, they prove termination of systems such as Ackermann's function that no polynomial can handle, and one of them, the lexicographic path order, is the workhorse of Knuth–Bendix completion in Part VI.

## Simplification orders

A natural requirement on an order on terms is that a term is bigger than its own parts.

:::definition[Simplification order]
A **simplification order** is a strict order on terms that is closed under substitutions and contexts (Chapter 10) and has the **subterm property**: $f(\ldots, t, \ldots) > t$ for every term and argument.
:::

A strictly monotone polynomial interpretation gives a simplification order as soon as each $[f](\ldots, x, \ldots)$ is strictly bigger than $x$, for instance when every polynomial has a positive constant term. Notice what the definition does *not* ask: well-foundedness. It comes for free.

:::theorem{name="Dershowitz" year=1982 status=sketched}
Over a finite signature, every simplification order is well-founded, and so is a reduction order.
:::

The proof rests on Kruskal's tree theorem: in any infinite sequence of terms over a finite signature, some term is **embedded** in a later one, meaning that the earlier one can be obtained from the later one by deleting symbols. A simplification order makes a term larger than any term embedded in it, so an infinite descending chain would contain an earlier term smaller than a later one, a contradiction. Chapter 13 proves Higman's lemma, the one-dimensional case, and sketches Kruskal's theorem.:cite[dershowitz1982]

The consequence for us: to build reduction orders, it is enough to build simplification orders, and we never need to argue about well-foundedness again.

## The recursive and lexicographic path orders

Fix a **precedence** $\succ$, a strict order on the function symbols. The idea of a path order is to compare two terms first by their root symbols, and to fall back on their arguments when the roots do not decide.

:::definition[The lexicographic path order]
$s >_{\mathrm{lpo}} t$ holds if $t$ is a variable that occurs in $s$ and $s \ne t$, or $s = f(s_1, \ldots, s_m)$, $t = g(t_1, \ldots, t_n)$ and one of the following holds:

1. **(subterm)** $s_i \ge_{\mathrm{lpo}} t$ for some $i$;
2. **(precedence)** $f \succ g$ and $s >_{\mathrm{lpo}} t_j$ for every $j$;
3. **(same root)** $f = g$, the arguments decrease lexicographically ($s_1 = t_1, \ldots, s_{k-1} = t_{k-1}$ and $s_k >_{\mathrm{lpo}} t_k$ for some $k$), and $s >_{\mathrm{lpo}} t_j$ for every $j > k$.

Here $\ge$ means $>$ or $=$.
:::

The **multiset path order** (MPO, also called RPO without status) replaces case 3 by a comparison of the multisets $\{s_1, \ldots, s_m\} >_{\mathrm{mul}} \{t_1, \ldots, t_n\}$, using the order being defined; general **recursive path orders** let each symbol choose lexicographic or multiset status. Nachum Dershowitz introduced the recursive path order in 1979–82;:cite[dershowitz1982] the lexicographic version is due to Sam Kamin and Jean-Jacques Lévy (1980).:cite[kamin-levy1980]

The conditions "$s > t_j$ for every $j$" in cases 2 and 3 are what make the order transitive and closed under substitution: they guarantee that $s$ is bigger than everything in $t$, not just than its root.

Here is the third rule of Ackermann's function under LPO with the precedence $\mathtt{Ack} \succ \mathtt{S}$. Step through the proof tree, and change the precedence to see it fail:

::lpo-proof

The root symbols are equal, so case 3 applies: the first arguments decrease (`S(m) > m` by the subterm case), and then the left side must be bigger than the remaining argument `Ack(S(m), n)`, which holds by case 3 again, because now the *second* arguments decrease. That nested lexicographic argument is precisely the double induction a mathematician would give for Ackermann's function.

:::theorem{status=sketched}
For any precedence, $>_{\mathrm{lpo}}$ is a simplification order. If the precedence is total, $>_{\mathrm{lpo}}$ is total on ground terms.
:::

:::proof
The subterm property is case 1 (with $s_i = t$). Irreflexivity, transitivity, closure under substitutions and under contexts are each proved by induction on the sizes of the terms involved; Baader and Nipkow give the details.:cite[baader-nipkow1998] For example, closure under contexts: if $s > t$ then $f(\ldots, s, \ldots)$ and $f(\ldots, t, \ldots)$ have the same root, the arguments decrease lexicographically at the position of $s$, and $f(\ldots, s, \ldots)$ is bigger than every later argument by the subterm case. Totality on ground terms: compare roots by the precedence, then arguments lexicographically, by induction.
:::

Totality on ground terms matters for Chapter 20, where unfailing completion needs an order that can compare any two ground terms.

## The Knuth–Bendix order

Donald Knuth and Peter Bendix designed their completion procedure around a different order, which first compares terms by **weight**.:cite[knuth-bendix1970]

:::definition[The Knuth–Bendix order]
Give each symbol $f$ a weight $w(f) \ge 0$ and each variable the weight $w_0 > 0$; the weight $w(t)$ of a term is the sum of the weights of its symbols and variables. Fix a precedence. Then $s >_{\mathrm{kbo}} t$ if every variable occurs in $s$ at least as often as in $t$, and

1. $w(s) > w(t)$, or
2. $w(s) = w(t)$ and either $s = f^k(t)$ for a unary $f$ and $k \ge 1$ (with $t$ a variable), or $s = f(\ldots)$, $t = g(\ldots)$ with $f \succ g$, or $f = g$ and the arguments decrease lexicographically.
:::

Some side conditions (constants weigh at least $w_0$; a unary symbol of weight $0$ must be maximal in the precedence) make it a simplification order. The variable condition is the price of comparing by weight: without it, $f(x)$ could beat $g(x, x)$ by weight, and substituting a heavy term for $x$ would reverse the comparison. KBO is fast to compute (a weight sum and a lexicographic comparison), and it is the default order of most equational provers.

## Which order for which rules?

| Rule | LPO ($\ast \succ +$) | MPO | KBO | Polynomials |
|---|---|---|---|---|
| associativity: $(x + y) + z \to x + (y + z)$ | yes | no | yes | yes |
| distributivity: $x \ast (y + z) \to x \ast y + x \ast z$ | yes | yes | no (duplicates $x$) | yes |
| Ackermann's function | yes | no | no | no |
| commutativity: $x + y \to y + x$ | no | no | no | no |

Associativity needs a lexicographic comparison: the multiset of arguments $\{x + y, z\}$ is not bigger than $\{x, y + z\}$. Distributivity duplicates $x$, which KBO's variable condition forbids. And no reduction order at all can orient commutativity, since $x + y \to y + x$ applied twice returns to the start. That last row is why Chapter 20 needs unfailing completion and Chapter 22 rewriting modulo commutativity.

```quiz
q: 'With the precedence `* > +`, which rule does KBO (all weights 1) fail to orient, while LPO succeeds?'
options:
  - text: '`*(x, +(y, z)) -> +(*(x, y), *(x, z))`'
    correct: true
    why: 'The variable x occurs once on the left and twice on the right, so the variable condition fails: no choice of weights can save it.'
  - text: '`+(+(x, y), z) -> +(x, +(y, z))`'
    why: 'Both sides have equal weight and the same root; the first arguments decrease (x + y > x), so KBO orients it.'
  - text: '`+(x, 0) -> x`'
    why: 'The left side is heavier, so KBO orients it.'
  - text: '`+(x, y) -> +(y, x)`'
    why: 'Neither order can orient commutativity.'
```

## Finding a precedence

A path order needs a precedence. For a handful of symbols, trying all orders works: the *Termination* tab of every workbench tries each total precedence for LPO, then KBO, then MPO, before polynomial interpretations and dependency pairs. Real tools encode the choice of precedence (and statuses and weights) as a SAT problem, which scales to hundreds of symbols.

```girafe title="Find a precedence" tools="termination,run"
#infixl 6 +
#infixl 7 *
x * (y + z) -> x * y + x * z
(x + y) * z -> x * z + y * z
(x * y) * z -> x * (y * z)
(x + y) + z -> x + (y + z)
? (A + B) * (C + D)
```

## The LPO in your engine

```code
id: path-orders/lpo
title: The lexicographic path order
provides: [lpo]
prompt: |
  Write `lpo(prec)`, which returns the comparison function `(s, t) => s >lpo t` for a precedence `prec`: a `Map` from symbol names to ranks, where `f ≻ g` means both are ranked and `prec.get(f) > prec.get(g)`.

  Follow the definition case by case. You will need structural equality (`equal` from `trs`) for $\ge$ and for skipping equal arguments in case 3.
starter: |
  import type { Term } from 'trs';
  import { equal } from 'trs';

  export function lpo(prec: ReadonlyMap<string, number>) {
    return (s: Term, t: Term): boolean => false;
  }
tests: |
  import { test, expect } from 'test';
  import { lpo } from 'solution';
  import { term, precedence, rules } from 'trs';

  const gt = (p, a, b) => lpo(precedence(p))(term(a), term(b));
  test('variables', () => {
    expect(gt([], 'F(x)', 'x')).toBe(true);
    expect(gt([], 'F(y)', 'x')).toBe(false);
    expect(gt(['F'], 'x', 'F(x)')).toBe(false);
    expect(gt([], 'x', 'x')).toBe(false);
  });
  test('the subterm case', () => {
    expect(gt([], 'F(G(x))', 'G(x)')).toBe(true);
    expect(gt([], 'F(G(x))', 'x')).toBe(true);
  });
  test('the precedence case', () => {
    expect(gt(['*', '+'], '*(x, y)', '+(y, x)')).toBe(true);
    expect(gt(['+', '*'], '*(x, y)', '+(y, x)')).toBe(false);
  });
  test('the same-root case is lexicographic', () => {
    expect(gt([], '+(+(x, y), z)', '+(x, +(y, z))')).toBe(true);
    expect(gt([], '+(x, +(y, z))', '+(+(x, y), z)')).toBe(false);
  });
  test('irreflexive, and commutativity cannot be oriented', () => {
    expect(gt(['+'], '+(x, y)', '+(x, y)')).toBe(false);
    expect(gt(['+'], '+(x, y)', '+(y, x)')).toBe(false);
  });
  test("Ackermann's function terminates", () => {
    const o = lpo(precedence(['Ack', 'S']));
    for (const r of rules('Ack(0, n) -> S(n)\nAck(S(m), 0) -> Ack(m, S(0))\nAck(S(m), S(n)) -> Ack(m, Ack(S(m), n))')) expect(o(r.lhs, r.rhs)).toBe(true);
  });
  test('distributivity with * above +', () => {
    expect(gt(['*', '+'], '*(x, +(y, z))', '+(*(x, y), *(x, z))')).toBe(true);
  });
solution: |
  import type { Term } from 'trs';
  import { equal } from 'trs';

  export function lpo(prec: ReadonlyMap<string, number>) {
    const above = (f: string, g: string) => {
      const a = prec.get(f), b = prec.get(g);
      return a !== undefined && b !== undefined && a > b;
    };
    const occurs = (x: string, t: Term): boolean => (t.type === 'var' ? t.name === x : t.args.some((a) => occurs(x, a)));
    const gt = (s: Term, t: Term): boolean => {
      if (t.type === 'var') return !equal(s, t) && occurs(t.name, s);
      if (s.type === 'var') return false;
      if (s.args.some((si) => equal(si, t) || gt(si, t))) return true;
      if (above(s.name, t.name)) return t.args.every((tj) => gt(s, tj));
      if (s.name === t.name && s.args.length === t.args.length) {
        let k = 0;
        while (k < s.args.length && equal(s.args[k], t.args[k])) k++;
        if (k === s.args.length) return false;
        return gt(s.args[k], t.args[k]) && t.args.slice(k + 1).every((tj) => gt(s, tj));
      }
      return false;
    };
    return gt;
  }
hints:
  - 'Handle a variable on the right first: `s > x` iff `x` occurs in `s` and `s` is not `x` itself. A variable on the left is never greater than anything.'
  - 'Then try the three cases in order. In case 3, skip the equal leading arguments, compare the first differing pair, and check `s` against every later argument of `t`.'
```

:::key
- A simplification order (closed under substitutions and contexts, with the subterm property) is automatically well-founded over a finite signature.
- LPO compares roots by a precedence and arguments lexicographically; MPO compares arguments as multisets; KBO compares weights first and needs the variable condition.
- No reduction order orients commutativity.
:::

:::exercises
1. Prove that LPO is irreflexive: $s >_{\mathrm{lpo}} s$ never holds. (Induction on $s$; the subterm case is the delicate one.)
2. Show that the system `F(F(x)) -> F(G(F(x)))` is not proved terminating by any simplification order. (Find a term embedded in its own reduct.) Does it terminate?
3. Find weights that make KBO orient the ten group rules of Chapter 0 with the precedence `I > * > E`. (The weight of `I` matters.)
4. Show that if $s >_{\mathrm{lpo}} t$ then every variable of $t$ occurs in $s$. Why is this needed for closure under substitution?
:::
