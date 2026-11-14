---
number: 22
title: Rewriting modulo AC
summary: Commutativity cannot be a rule, so build it into equality instead. Flattening, AC matching and rewriting modulo AC, and the algebra system finally collects like terms.
duration: About 1½ hours
prerequisites: [knuth-bendix]
theorems: [Flattening decides AC-equality, AC matching is NP-complete]
techniques: [flattening and AC-equality]
---

Associativity and commutativity have been in the way since Chapter 0. The algebra system cannot write $3X^2$ because it cannot regroup or reorder products; the distributivity laws of Chapter 16 are not confluent because sums come out in different orders; completion fails on commutativity outright. The reason is always the same: $x + y = y + x$ is an equation that no reduction order can orient (Chapter 12). The way out is to stop treating it as a rule at all and build it into what "equal" means.

## Rewriting modulo an equational theory

Split the equations into two parts: a set of rules $R$, used left to right, and a set of equations $E$, such as associativity and commutativity, used as a notion of equality.

:::definition[Rewriting modulo E]
$s \to_{R/E} t$ if $s =_E s' \to_R t' =_E t$ for some $s', t'$: rewrite any term equal to $s$ modulo $E$, and the result is taken up to $E$ as well.
:::

This is the right relation but an expensive one: finding $s'$ means searching an equivalence class. Gerald Peterson and Mark Stickel showed how to avoid the search for theories with good matching algorithms:cite[peterson-stickel1981] instead of rewriting a member of the class, match the rule's left-hand side **modulo** $E$ against $s$ directly. For associativity and commutativity (AC) both steps, deciding $=_{AC}$ and matching modulo AC, have practical algorithms.

## Flattening

For an AC symbol such as $+$, the bracketing and the order of the arguments do not matter. So forget them: write a sum as one node with all its summands as children, and sort the children in a fixed order.

:::definition[Flattened form]
The **flattened form** of a term, for a set of AC symbols, replaces every maximal nest of an AC symbol $f$ by a single node $f(t_1, \ldots, t_n)$ of variable arity, whose arguments are the flattened forms of the non-$f$ subterms, sorted in a fixed total order on terms.
:::

So $a + ((c + a) + b)$ and $(b + a) + (a + c)$ both flatten to $+(a, a, b, c)$.

:::theorem{status=proved}
Two terms are equal modulo AC if and only if their flattened forms are identical.
:::

:::proof
($\Leftarrow$) Flattening only reassociates and reorders, so every term is AC-equal to its flattened form (read back as nested binary applications in any order). ($\Rightarrow$) It suffices to show that one application of associativity or commutativity inside a term does not change its flattened form. Both laws rearrange the summands of one maximal nest of $f$ without changing the multiset of its non-$f$ subterms, and flattening depends only on that multiset (it sorts it). Subterms outside the nest are untouched, and subterms inside it are flattened independently. By induction on the number of steps, AC-equal terms have the same flattened form.
:::

## AC matching

Matching modulo AC is where things get interesting. The pattern $x + y$ matches $a + b + c$ in six ways: $x$ can take any non-empty part of the summands and $y$ the rest. A pattern variable under an AC symbol stands for a *sub-multiset*, and a repeated variable must take equal sub-multisets: $x + x$ matches $a + b + a + b$ with $x = a + b$.

::ac-matcher

One more twist is needed for rewriting. The rule $x + 0 \to x$ already rewrites the sum $a + 0 + b$, because $x$ can take the sub-multiset $a + b$. But a rule such as `N(a) + N(b) -> N(@add(a, b))` should rewrite `N(1) + X + N(2)` too, and its pattern has exactly two summands, neither of which can absorb the `X`. Peterson and Stickel handle this with **extension**: a left-hand side $l$ with an AC root $f$ also matches part of a sum, and the leftover summands are carried along, as if the rule were $l + z \to r + z$ for a fresh $z$. Tick the *extension* box in the matcher to see it.

AC matching is a search problem, and it is genuinely hard.

:::theorem{name="Benanav, Kapur and Narendran" year=1987 status=stated}
Deciding whether a pattern matches a term modulo AC is NP-complete.
:::

In practice the patterns of rewrite rules are small and linear, and matching is fast; the hard cases need many variables under the same AC symbol.:cite[benanav1987] AC *unification* (both sides with variables) is more complex still, but it is finitary: there is always a finite complete set of unifiers, computed by Stickel's algorithm through linear Diophantine equations.:cite[stickel1981] It is what made AC-completion, and McCune's solution of the Robbins problem (Chapter 20), possible.

## The algebra system, version 2

Declare `+` and `*` as AC with the pragma `#ac`, and the algebra system can at last collect like terms. Every term is kept flattened, and rules apply modulo AC with extension:

```girafe title="The algebra system modulo AC" tools="run"
#ac + *
#infixl 6 +
#infixl 7 *
N(a) + N(b) -> N(@add(a, b))
N(a) * N(b) -> N(@mul(a, b))
N(0) + x -> x
N(0) * x -> N(0)
N(1) * x -> x
x + x -> N(2) * x
N(a) * x + x -> N(@add(a, 1)) * x
N(a) * x + N(b) * x -> N(@add(a, b)) * x
x * (y + z) -> x * y + x * z
D(X) -> N(1)
D(N(k)) -> N(0)
D(u + v) -> D(u) + D(v)
D(u * v) -> D(u) * v + u * D(v)
? D(X * X * X)
? D(N(3) * X * X + N(5) * X + N(7))
? (X + N(1)) * (X + N(1))
? X + N(2) * X + X * N(3)
```

Compare with Chapter 6: there are fewer rules (no left and right versions of each identity, no regrouping rules), and they do more. $D(X^3)$ is $3X^2$; $X + 2X + 3X$ is $6X$, with the summands found wherever they are in the sum. The product rule `D(u * v)` now splits a flattened product $X \cdot X \cdot X$ into some factor $u$ and the rest $v$, which is exactly the generalised product rule. What the system still cannot do is write $X \cdot X$ as $X^2$, or factor: those need rules for powers, and a choice of which form is "simplest", which is a question for the next two chapters.

```quiz
q: 'Why can the rule `x + 0 -> x` rewrite `A + 0 + B` modulo AC, although the pattern has two summands and the term three?'
options:
  - text: 'A variable under an AC symbol stands for a sub-multiset of the summands, so x takes A + B and 0 matches 0.'
    correct: true
    why: 'Matching modulo AC treats the summands as a multiset. (Extension would also allow a pattern without such a variable, like `N(a) + N(b)`, to match two numbers inside a longer sum.)'
  - text: 'Because flattening removes zeros.'
    why: 'Flattening only reassociates and sorts; removing 0 is the rule’s job.'
  - text: 'It cannot.'
    why: 'It can: x may stand for several summands.'
```

## Flattening in your engine

```code
id: ac-rewriting/flatten
title: Flattening and AC-equality
provides: [flatten, acEqual]
prompt: |
  Write

  - `flatten(t, ac)`: the flattened form of `t`, where `ac` is a `Set` of AC symbol names. Collect the arguments of nested AC nodes into one node, flattening below first; sort the arguments by the string `key(u)` (exported by `trs`) in increasing order. A node left with one argument is replaced by it.
  - `acEqual(s, t, ac)`: equality modulo AC.
starter: |
  import type { Term } from 'trs';
  import { key, equal, f } from 'trs';

  export function flatten(t: Term, ac: ReadonlySet<string>): Term {
    return t;
  }

  export function acEqual(s: Term, t: Term, ac: ReadonlySet<string>): boolean {
    return equal(s, t);
  }
tests: |
  import { test, expect } from 'test';
  import { flatten, acEqual } from 'solution';
  import { term, show } from 'trs';

  const AC = new Set(['+', '*']);
  test('nested sums become one node', () => {
    expect(show(flatten(term('+(a, +(+(c, a), b))'), AC))).toBe('+(a, a, b, c)');
  });
  test('arguments are sorted by key', () => {
    expect(show(flatten(term('+(F(x), A)'), AC))).toBe('+(A, F(x))');
  });
  test('different AC symbols are not mixed', () => {
    expect(show(flatten(term('+(*(b, a), +(c, *(a, b)))'), AC))).toBe('+(*(a, b), *(a, b), c)');
  });
  test('below other symbols too', () => {
    expect(show(flatten(term('F(+(+(b, a), c))'), AC))).toBe('F(+(a, b, c))');
  });
  test('AC-equality', () => {
    expect(acEqual(term('+(a, +(b, c))'), term('+(+(c, b), a)'), AC)).toBe(true);
    expect(acEqual(term('+(a, b)'), term('+(a, a)'), AC)).toBe(false);
    expect(acEqual(term('F(+(a, b), G(*(x, y)))'), term('F(+(b, a), G(*(y, x)))'), AC)).toBe(true);
    expect(acEqual(term('-(a, b)'), term('-(b, a)'), AC)).toBe(false);
  });
solution: |
  import type { Term } from 'trs';
  import { key, equal, f } from 'trs';

  export function flatten(t: Term, ac: ReadonlySet<string>): Term {
    if (t.type === 'var') return t;
    const args = t.args.map((a) => flatten(a, ac));
    if (!ac.has(t.name)) return f(t.name, ...args);
    const flat: Term[] = [];
    for (const a of args) {
      if (a.type === 'fn' && a.name === t.name) flat.push(...a.args);
      else flat.push(a);
    }
    if (flat.length === 1) return flat[0];
    flat.sort((x, y) => (key(x) < key(y) ? -1 : key(x) > key(y) ? 1 : 0));
    return f(t.name, ...flat);
  }

  export function acEqual(s: Term, t: Term, ac: ReadonlySet<string>): boolean {
    return equal(flatten(s, ac), flatten(t, ac));
  }
hints:
  - 'Flatten the arguments first. Then, for an AC node, splice in the arguments of any child with the same symbol (it is already flat).'
  - 'Sort with a comparator on `key(x)` and `key(y)`, then compare flattened forms with `equal`.'
```

:::key
- Rewriting modulo $E$ keeps equations such as AC out of the rules and inside equality.
- AC-equality is decided by flattening and sorting; AC matching treats arguments as multisets (NP-complete in general, fast in practice).
- Extension lets a rule rewrite part of a sum. With `#ac`, the algebra system collects like terms.
:::

:::exercises
1. List all AC matches of `x + y + z` against `a + b + c + d`. How many are there in general for $k$ variables and $n$ distinct summands?
2. Why must the sort order used in flattening be a total order on terms? What goes wrong with a partial one?
3. Add rules for powers to the algebra system (`x * x -> P(x, 2)`, `P(x, n) * x -> P(x, n + 1)`, …) and a derivative rule for `P`. Does `D(X * X * X)` now give `N(3) * P(X, 2)`?
4. The distributivity rule `x * (y + z) -> x * y + x * z` together with the collection rules: does the system terminate modulo AC? Give an argument.
:::
