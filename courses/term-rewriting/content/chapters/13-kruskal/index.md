---
number: 13
title: Why path orders terminate
summary: Well-quasi-orders, Higman’s lemma with Nash-Williams’s minimal bad sequence argument, Kruskal’s tree theorem, and why every simplification order is well-founded.
duration: About 1½ hours
prerequisites: [path-orders]
theorems: [Higman’s lemma, Kruskal’s tree theorem, Simplification orders are well-founded]
techniques: [minimal bad sequences]
---

Chapter 12 promised that every simplification order over a finite signature is well-founded, so that path orders never need a separate well-foundedness proof. This optional chapter keeps the promise. The tool is one of the most beautiful results of combinatorics, Kruskal's tree theorem, and the proof technique, Nash-Williams's minimal bad sequence, is worth knowing for its own sake.

## Embedding

:::definition[Homeomorphic embedding]
The **embedding** relation $\trianglerighteq_{\mathrm{emb}}$ on terms is the smallest relation such that

- $x \trianglerighteq_{\mathrm{emb}} x$ for every variable $x$;
- if $s_i \trianglerighteq_{\mathrm{emb}} t$ for some argument $s_i$ of $s = f(s_1, \ldots, s_n)$, then $s \trianglerighteq_{\mathrm{emb}} t$ (delete the root);
- if $s_i \trianglerighteq_{\mathrm{emb}} t_i$ for all $i$, then $f(s_1, \ldots, s_n) \trianglerighteq_{\mathrm{emb}} f(t_1, \ldots, t_n)$.
:::

In words, $t$ is embedded in $s$ if $t$ can be obtained from $s$ by deleting nodes (each deletion keeps one child in the parent's place). For example `F(A, B)` is embedded in `F(G(A), H(B, C))`.

:::proposition{status=proved}
A simplification order contains strict embedding: if $s \trianglerighteq_{\mathrm{emb}} t$ and $s \ne t$, then $s > t$.
:::

:::proof
Induction on the definition. Deleting the root: $s = f(\ldots, s_i, \ldots) > s_i$ by the subterm property, and $s_i \ge t$ by induction, so $s > t$. Same root: replace the arguments one at a time; each replacement of $s_i$ by $t_i$ with $s_i > t_i$ decreases the term by closure under contexts, and the steps with $s_i = t_i$ change nothing.
:::

## Well-quasi-orders

:::definition[Well-quasi-order]
A **quasi-order** $\le$ (reflexive and transitive) is a **well-quasi-order** (wqo) if every infinite sequence $a_0, a_1, a_2, \ldots$ has indices $i < j$ with $a_i \le a_j$. A sequence with no such pair is **bad**; a wqo has no infinite bad sequences.
:::

The natural numbers are a wqo (an infinite sequence cannot decrease for ever, so some element is followed by a larger or equal one). A finite set with equality is a wqo (some element repeats). The integers are not, and an infinite antichain (pairwise incomparable elements) is never part of a wqo.

A useful equivalent: in a wqo, every infinite sequence has an infinite *increasing* subsequence $a_{i_0} \le a_{i_1} \le \cdots$. (Colour each pair $i < j$ by whether $a_i \le a_j$; by Ramsey's theorem there is an infinite set all of whose pairs have the same colour, and it cannot be the "not $\le$" colour, since that would be an infinite bad sequence.)

## Higman’s lemma

Order finite words over an alphabet by **subsequence**: $u \le v$ if $u$ can be obtained from $v$ by deleting letters. So `ace` $\le$ `abcde`.

:::theorem{name="Higman’s lemma" who="Graham Higman" year=1952 status=proved}
If $(A, \le)$ is a wqo, then finite words over $A$ ordered by the subsequence order (where letters are compared by $\le$: $a_1 \cdots a_m \le b_1 \cdots b_n$ if there are $j_1 < \cdots < j_m$ with $a_k \le b_{j_k}$) form a wqo.
:::

::::zoom{levels="Idea, Proof"}
:::level[Idea]
Suppose there were an infinite bad sequence of words. Choose one that is as short as possible at each position: a **minimal bad sequence**. Remove the first letter of each word; the shortened words, taken along a subsequence where the removed letters increase, form a bad sequence that is shorter at some position than the minimal one, which is impossible.
:::
:::level[Proof]
Suppose there is an infinite bad sequence of words. Build a **minimal** one, following Nash-Williams::cite[nash-williams1963] let $w_0$ be a shortest word that begins some infinite bad sequence; given $w_0, \ldots, w_{k-1}$, let $w_k$ be a shortest word such that $w_0, \ldots, w_k$ begins some infinite bad sequence. The resulting $w_0, w_1, \ldots$ is bad (every finite prefix extends to a bad sequence, so no pair $i < j$ has $w_i \le w_j$).

No $w_k$ is empty, since the empty word is $\le$ every word. Write $w_k = a_k v_k$ with $a_k \in A$. Because $A$ is a wqo, the sequence $a_0, a_1, \ldots$ has an infinite increasing subsequence $a_{k_0} \le a_{k_1} \le \cdots$ with $k_0 < k_1 < \cdots$.

Now look at the sequence
$$ w_0, w_1, \ldots, w_{k_0 - 1}, v_{k_0}, v_{k_1}, v_{k_2}, \ldots $$
It is bad. A pair inside the $w$'s is not good, as the $w$'s are bad. A pair $w_i \le v_{k_j}$ with $i < k_0$ would give $w_i \le v_{k_j} \le w_{k_j}$, a good pair of the original. A pair $v_{k_i} \le v_{k_j}$ with $i < j$ would give $w_{k_i} = a_{k_i} v_{k_i} \le a_{k_j} v_{k_j} = w_{k_j}$, since $a_{k_i} \le a_{k_j}$. So this sequence is bad, and at position $k_0$ it has the word $v_{k_0}$, shorter than $w_{k_0}$, contradicting the minimal choice of $w_{k_0}$. $\blacksquare$
:::
::::

Graham Higman proved the lemma in 1952 in a paper on "ordering by divisibility in abstract algebras";:cite[higman1952] the minimal bad sequence proof is due to Crispin Nash-Williams (1963), who used it to give a short proof of Kruskal's theorem.

## Kruskal’s tree theorem

Terms are trees, and embedding is the tree version of the subsequence order. Kruskal's theorem says it is a wqo.

:::theorem{name="Kruskal’s tree theorem" who="Joseph Kruskal" year=1960 status=sketched}
Over a finite signature (with finitely many variables), homeomorphic embedding is a well-quasi-order on terms: every infinite sequence of terms $t_0, t_1, \ldots$ has $i < j$ with $t_i$ embedded in $t_j$.
:::

The proof is the same minimal bad sequence argument, one level up. Take a minimal bad sequence of terms (minimal in size at each position). The set of all proper subterms of its terms is a wqo under embedding (a bad sequence of subterms would contradict minimality, as in Higman's proof). Each term is a root symbol from a finite set together with a word of arguments, and words of arguments from a wqo are a wqo by Higman's lemma. Combining the two with a pigeonhole on the finitely many root symbols produces a good pair, a contradiction.:cite[kruskal1960,nash-williams1963]

Play against the theorem. Each term you write may be one symbol larger than the last, and no earlier term may embed into a later one. However cleverly you choose, you will lose.

::embedding-game

The game is finite for every $k$, but its length grows astonishingly fast with $k$. Harvey Friedman studied such finite forms of Kruskal's theorem; the longest possible game for a related version with three labels, $\mathrm{TREE}(3)$, is a number so large that it dwarfs anything in ordinary mathematics, and Friedman showed that these finite statements, though true, cannot be proved in fairly strong formal systems of arithmetic.

## The payoff

:::theorem{name="Dershowitz" year=1982 status=proved}
Over a finite signature, every simplification order is well-founded.
:::

:::proof
Suppose $t_0 > t_1 > t_2 > \cdots$ is an infinite descending chain. The terms of a descending chain contain only finitely many variables (closure under substitution and the subterm property force $\mathrm{Var}(t_{i+1}) \subseteq \mathrm{Var}(t_i)$: otherwise substitute $t_i$ itself for a variable of $t_{i+1}$ that does not occur in $t_i$; the left side is unchanged and the right side now contains it as a subterm, so the right side would be the larger). By Kruskal's theorem there are $i < j$ with $t_i$ embedded in $t_j$. Since $t_i \ne t_j$ (a strict order has no cycles), the proposition above gives $t_j > t_i$. But also $t_i > t_j$ by transitivity, so $t_i > t_i$, contradicting irreflexivity.
:::

This is why every path order and every polynomial interpretation of the right shape terminates without further argument. It also explains their limits: a system whose rules can embed a left-hand side in its own reduct, such as `F(F(x)) -> F(G(F(x)))`, can never be proved terminating by a simplification order, even when it does terminate. Such systems are not **simply terminating**, and they need the methods of the next chapter.

```code
id: kruskal/embeds
title: Homeomorphic embedding
prompt: |
  Write `embeds(s, t)`: true if $t$ is embedded in $s$ (so $s \trianglerighteq_{\mathrm{emb}} t$), following the definition. Variables embed only into themselves.
starter: |
  import type { Term } from 'trs';

  export function embeds(s: Term, t: Term): boolean {
    return false;
  }
tests: |
  import { test, expect } from 'test';
  import { embeds } from 'solution';
  import { term } from 'trs';

  const e = (a, b) => embeds(term(a), term(b));
  test('a term embeds into itself', () => {
    expect(e('F(G(x), A)', 'F(G(x), A)')).toBe(true);
  });
  test('deleting nodes', () => {
    expect(e('F(G(A), H(B, C))', 'F(A, B)')).toBe(true);
    expect(e('F(G(A))', 'A')).toBe(true);
    expect(e('F(F(x))', 'F(x)')).toBe(true);
  });
  test('symbols must match in place', () => {
    expect(e('F(A)', 'G(A)')).toBe(false);
    expect(e('F(A, B)', 'F(B, A)')).toBe(false);
  });
  test('variables', () => {
    expect(e('F(x)', 'x')).toBe(true);
    expect(e('F(x)', 'y')).toBe(false);
    expect(e('x', 'F(x)')).toBe(false);
  });
  test('the reduct of F(F(x)) -> F(G(F(x))) embeds its left-hand side', () => {
    expect(e('F(G(F(x)))', 'F(F(x))')).toBe(true);
  });
solution: |
  import type { Term } from 'trs';

  export function embeds(s: Term, t: Term): boolean {
    if (s.type === 'var') return t.type === 'var' && s.name === t.name;
    if (s.args.some((a) => embeds(a, t))) return true;
    return t.type === 'fn' && s.name === t.name && s.args.length === t.args.length && s.args.every((a, i) => embeds(a, t.args[i]));
  }
hints:
  - 'Three cases, as in the definition: a variable on the left, deleting the root of `s` (some argument embeds `t`), or equal roots with all arguments embedding.'
```

:::key
- Embedding = deleting nodes. A simplification order makes a term bigger than everything embedded in it.
- Higman's lemma (words) and Kruskal's theorem (trees): no infinite sequence avoids embedding. Both by minimal bad sequences.
- Hence simplification orders are well-founded, and simplification orders cannot prove systems whose reducts embed their redexes.
:::

:::exercises
1. Show that the subsequence order on words over $\{a, b\}$ has no infinite antichain, directly from Higman's lemma, and give an infinite antichain for the *factor* (contiguous substring) order.
2. Where exactly does the proof of Kruskal's theorem use the finiteness of the signature? Give an infinite signature with an infinite bad sequence.
3. Prove that the union of a wqo with any relation that it contains is a wqo, and deduce that every quasi-order containing embedding is a wqo.
4. Find the longest game you can for $k = 1$ in the widget (the first term has at most one symbol, the second two, and so on).
:::
