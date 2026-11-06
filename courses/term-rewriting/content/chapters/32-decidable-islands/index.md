---
number: 32
title: Decidable islands
summary: Where the undecidable questions become decidable. Ground systems, bottom-up tree automata, and the regular set of normal forms of a left-linear system, which decides sufficient completeness.
duration: About 1 hour
prerequisites: [rewriting-computes]
theorems: [Normal forms of left-linear systems form a regular tree language, Termination and confluence of ground systems are decidable]
techniques: [tree automata]
---

Chapter 31 showed that the central questions of rewriting are undecidable in general. Not everywhere, though: restricting the rules can make them decidable, and the main tool for proving it is the **tree automaton**, the analogue for terms of the finite automata that recognise regular languages of strings. This optional chapter introduces tree automata and visits the main decidable islands.

## Tree automata

:::definition[Bottom-up tree automaton]
A (bottom-up, finite) **tree automaton** has a finite set of states $Q$, a set of **final** states, and **transitions** of the form $f(q_1, \ldots, q_n) \to q$ for symbols $f$ of arity $n$ and states $q_i, q$. A ground term reaches a state by induction: $f(t_1, \ldots, t_n)$ reaches $q$ if each $t_i$ reaches $q_i$ and $f(q_1, \ldots, q_n) \to q$ is a transition. The automaton **accepts** a term that reaches a final state; the set of accepted terms is a **regular tree language**.
:::

Read a term from the leaves up, labelling each node with a state, the way a string automaton reads a string from left to right. A transition system is itself a ground rewrite system, with states as constants. Regular tree languages share the good properties of regular string languages, as Comon and colleagues' book develops at length:cite[comon-tata]

- membership is decidable in linear time (run the automaton);
- **emptiness** is decidable: compute the set of reachable states (states reached by some term) as a fixpoint, and check whether a final state is among them, which also produces a smallest accepted term as a witness;
- they are closed under union, intersection (run two automata in parallel, on pairs of states) and complement (for deterministic automata, swap final and non-final states), so inclusion and equivalence are decidable too.

## The normal forms of a left-linear system

Which ground terms are normal forms? For a left-linear system the answer is a regular tree language, and an automaton can be built from the rules.

:::theorem{status=sketched}
For a finite left-linear system over a finite signature, the set of ground normal forms is a regular tree language, recognised by an automaton computable from the rules.
:::

:::proof
Let $P$ be the set of proper subterms of left-hand sides, with variables replaced by a wildcard. A term's state is the set of patterns in $P$ it matches (a finite set of sets). Reading $f(t_1, \ldots, t_n)$ with the children in states $S_1, \ldots, S_n$, the term matches a pattern $f(p_1, \ldots, p_n)$ exactly when each $p_i$ is the wildcard or belongs to $S_i$; this is where left-linearity is needed, since a repeated variable would require comparing two subterms. If some left-hand side matches, the term is reducible and the transition is omitted (the term is rejected); otherwise the new state is the set of matched patterns. Every subterm of a normal form is a normal form, so rejecting reducible nodes rejects exactly the reducible terms. All states are accepting.
:::

::automaton-view{rules="+(0, y) -> y\n+(S(x), y) -> S(+(x, y))" depth=2}

For Peano addition, the normal forms are exactly the terms without `+`: the numerals. The automaton finds this on its own: its accepted terms are `0`, `S(0)`, `S(S(0))`, ….

This construction decides properties that look hard. **Sufficient completeness** (Chapter 6), that every ground term with a defined symbol at the root is reducible, becomes: the intersection of the normal-form automaton with the automaton for "terms with a defined root" is empty. More generally, **ground reducibility** (is every ground instance of a term reducible?) is decidable for left-linear systems this way, and it is the basis of **inductionless induction**, which proves inductive theorems by completion.

```quiz
q: 'Why does the normal-form construction require left-linear rules?'
options:
  - text: 'A pattern like `F(x, x)` needs to know whether two subterms are equal, and a finite automaton cannot compare arbitrarily large subterms.'
    correct: true
    why: 'The set of terms F(t, t) is not a regular tree language. (Extensions of tree automata with equality constraints handle some such cases.)'
  - text: 'Because non-left-linear systems do not terminate.'
    why: 'Termination is unrelated; the construction never rewrites anything.'
  - text: 'Because the automaton reads terms from the leaves.'
    why: 'Top-down automata have the same limitation.'
```

## Ground systems

A **ground** system has no variables in its rules, like the congruence closure equations of Chapter 21. For ground systems most questions become decidable:

- **Termination** of a ground system is decidable (Huet and Lankford): a ground system fails to terminate exactly when some left-hand side rewrites, in a bounded search, to a term containing itself (a loop), which can be detected.:cite[huet-lankford1978]
- **Reachability** $s \to^* t$ and joinability are decidable: the set of terms reachable from a regular language by a ground system is again regular, and can be computed by an automaton construction.
- **Confluence** of ground systems is decidable: Max Dauchet and Sophie Tison showed in 1990 that the whole first-order theory of ground rewriting (formulas built from $\to^*$ with quantifiers) is decidable, using tree automata over tuples of terms;:cite[dauchet-tison1990] confluence is one such formula.

Beyond ground systems, decidability extends to various "shallow", "right-ground" and "linear growing" classes, and tree automata techniques are also used to approximate reachability for general systems, which gives sound (but incomplete) proofs of non-reachability, for example for verifying that a protocol cannot reach a bad state.

```code
id: decidable-islands/run-automaton
title: Running a tree automaton
prompt: |
  A tree automaton is given by a list of transitions `{ symbol, from: string[], to: string }` and a set of final states. Write `statesOf(transitions, t)` (the set of states a ground term can reach; automata may be non-deterministic) and `accepts(transitions, final, t)`.
starter: |
  import type { Term } from 'trs';

  type Tr = { symbol: string; from: string[]; to: string };

  export function statesOf(transitions: Tr[], t: Term): Set<string> {
    return new Set();
  }

  export function accepts(transitions: Tr[], final: Set<string>, t: Term): boolean {
    return false;
  }
tests: |
  import { test, expect } from 'test';
  import { statesOf, accepts } from 'solution';
  import { term } from 'trs';

  // Even and odd numerals.
  const T = [
    { symbol: '0', from: [], to: 'even' },
    { symbol: 'S', from: ['even'], to: 'odd' },
    { symbol: 'S', from: ['odd'], to: 'even' },
  ];
  test('parity', () => {
    expect([...statesOf(T, term('S(S(S(0)))'))]).toEqual(['odd']);
    expect(accepts(T, new Set(['even']), term('S(S(0))'))).toBe(true);
    expect(accepts(T, new Set(['even']), term('S(0)'))).toBe(false);
  });
  test('unknown symbols reach no state', () => {
    expect(statesOf(T, term('F(0)')).size).toBe(0);
  });
  test('non-determinism: a term may reach several states', () => {
    const N = [
      { symbol: 'A', from: [], to: 'p' },
      { symbol: 'A', from: [], to: 'q' },
      { symbol: 'F', from: ['p', 'q'], to: 'ok' },
    ];
    expect(accepts(N, new Set(['ok']), term('F(A, A)'))).toBe(true);
    expect(accepts(N, new Set(['ok']), term('F(A, F(A, A))'))).toBe(false);
  });
solution: |
  import type { Term } from 'trs';

  type Tr = { symbol: string; from: string[]; to: string };

  export function statesOf(transitions: Tr[], t: Term): Set<string> {
    if (t.type === 'var') return new Set();
    const args = t.args.map((a) => statesOf(transitions, a));
    const out = new Set<string>();
    for (const tr of transitions) {
      if (tr.symbol !== t.name || tr.from.length !== t.args.length) continue;
      if (tr.from.every((q, i) => args[i].has(q))) out.add(tr.to);
    }
    return out;
  }

  export function accepts(transitions: Tr[], final: Set<string>, t: Term): boolean {
    return [...statesOf(transitions, t)].some((q) => final.has(q));
  }
hints:
  - 'Compute the state sets of the arguments first, then keep every transition for the root symbol whose source states are all available.'
```

:::key
- Tree automata recognise regular tree languages: membership, emptiness, intersection and complement are decidable.
- The ground normal forms of a left-linear system form a regular language, which decides sufficient completeness and ground reducibility.
- For ground systems, termination, reachability and confluence are decidable (the first-order theory of ground rewriting is decidable).
:::

:::exercises
1. Build by hand an automaton accepting the lists (built from `Nil` and `:`) of even length.
2. Compute the normal-form automaton of the system `F(A) -> B`, `G(F(x)) -> x`. Which ground terms are normal forms?
3. Show that the set $\{F(t, t)\}$ of terms with two equal arguments is not regular (pump a large term).
4. Use the automaton of normal forms to check whether `Rev` from Chapter 6 is completely defined on lists.
:::
