---
number: 30
title: Rewriting logic
summary: Rules as transitions, not equations. Concurrent state as a multiset, rewriting modulo AC as a model of concurrency, and searching every reachable state for deadlocks and safety violations, as Maude does.
duration: About 1½ hours
prerequisites: [ac-rewriting, reduction-semantics]
theorems: [Rewriting logic: equations for states, rules for transitions]
techniques: [modelling concurrent systems with rules]
---

Every system so far has been read as a set of equations, or as a program that computes one answer. Non-terminating, non-confluent systems were problems to be fixed. **Rewriting logic**, proposed by José Meseguer in 1992,:cite[meseguer1992] reads rules differently: a rule $l \to r$ is a possible **transition** of a system from a state matching $l$ to a state matching $r$. Non-determinism is not a defect but the point (a concurrent system can do many things), and the interesting questions are about all possible behaviours: can the system reach a bad state? can it get stuck?

## Equations and rules

A rewriting logic theory has two parts:

- **Equations** $E$ describe the **states**: which terms denote the same state. Typically $E$ includes associativity and commutativity of the operator that puts parts of a state together, so that a state is a multiset of components, plus other equations that compute (oriented into a convergent system, as in Part VI).
- **Rules** $R$ describe **transitions**. They need not terminate or be confluent; $R$ is rewritten *modulo* $E$ (Chapter 22).

In the state $c_1 \,\&\, c_2 \,\&\, \cdots$, with $\&$ associative and commutative, a rule that matches a few components can fire wherever they are, and two rules that match disjoint components can fire **concurrently**: their order does not matter. Rewriting modulo AC is a model of concurrency.

## A vending machine

Maude's classic example: a vending machine sells cakes for a dollar and apples for three quarters, and gives a dollar for four quarters. Money and goods float around in a multiset:

::state-space{rules="#ac &\n#infixl 5 &\nDollar -> Cake\nDollar -> Apple & Quarter\nQuarter & Quarter & Quarter & Quarter -> Dollar" start="Dollar & Dollar" goal="Cake & Apple & x"}

From two dollars, the machine can reach every state in the graph. The highlighted states contain a cake and an apple: they answer the question "can I get a cake and an apple with two dollars?" (yes: buy the cake with one dollar and the apple with the other, keeping a quarter). The green states are **deadlocks**: no rule applies. Change the start state to three dollars and search for `Cake & Cake & Apple & Apple & x`.

That is the essence of **reachability analysis**: explore the graph of states breadth-first from the initial state, and report a path to any state matching a pattern. Maude's `search` command does exactly this, and its LTL model checker goes further, checking temporal properties of all infinite behaviours.:cite[clavel2007]

## Mutual exclusion

Two processes share a critical section. The first protocol lets a process enter whenever it likes; the second makes it take a token, which there is only one of:

::state-space{rules="#ac &\n#infixl 5 &\nIdle(p) -> Crit(p)\nCrit(p) -> Idle(p)" start="Idle(P1) & Idle(P2)" goal="Crit(p) & Crit(q)" title="No protocol"}

::state-space{rules="#ac &\n#infixl 5 &\nIdle(p) & Token -> Crit(p)\nCrit(p) -> Idle(p) & Token" start="Idle(P1) & Idle(P2) & Token" goal="Crit(p) & Crit(q)" title="With a token"}

Without the token, the state with both processes critical is reachable (orange). With it, the search explores all three reachable states and finds none: the protocol is safe, and the exploration is a proof, because the state space is finite and fully explored. For infinite state spaces, search can find bugs but not prove their absence; then one needs abstractions, invariants or the deductive methods of verification.

```quiz
q: 'In the token protocol, why can the rule `Idle(p) & Token -> Crit(p)` fire for either process?'
options:
  - text: 'The state is a multiset modulo AC, so the pattern matches any one Idle component together with the token, wherever they are.'
    correct: true
    why: 'AC matching (with extension) picks any sub-multiset that matches; each choice of p is a different transition.'
  - text: 'Because the rule has a variable p.'
    why: 'The variable alone would not help if the components had to be adjacent in a fixed order; AC is what makes their positions irrelevant.'
  - text: 'It cannot: it fires only for the first process.'
    why: 'Both transitions appear in the state graph.'
```

## Rewriting logic as a framework

Meseguer's thesis is that rewriting logic is a **semantic framework** in which many models of computation and many logics can be represented naturally: Petri nets (places as a multiset of tokens, transitions as rules), process calculi, actors and object systems (objects and messages floating in a multiset "soup"), and the operational semantics of programming languages (Chapter 27, now with concurrency). The Maude language implements it efficiently, with equations executed by a fast rewriting engine (with the hash-consing and matching techniques of Part III) and rules explored by search and model checking.:cite[clavel2007] The K framework builds on the same ideas for programming-language semantics.:cite[rosu-serbanuta2010]

```code
id: rewriting-logic/peterson
title: A safe protocol
prompt: |
  Model two processes `P1` and `P2` sharing a critical section **without** a single shared token: instead, each process has a flag, `Flag(p, Down)` or `Flag(p, Up)`, and a process may enter only when the other's flag is down. Write rules (as `source`, with `#ac &`) so that from `Idle(P1) & Idle(P2) & Flag(P1, Down) & Flag(P2, Down)`:

  - every process can eventually get into the critical section (`Crit(P1)` and `Crit(P2)` are both reachable),
  - the two processes are never critical at the same time.

  (A process could raise its flag, then enter when the other flag is down, then lower its flag when it leaves. Does that protocol deadlock? The tests do not mind deadlocks; they check safety and reachability.)
starter: |
  export const source = `
  #ac &
  #infixl 5 &
  Idle(p) -> Crit(p)
  Crit(p) -> Idle(p)
  `;
tests: |
  import { test, expect } from 'test';
  import { source } from 'solution';
  import { parseStrict, parseTerm, searchStates, goalPattern } from 'trs';

  const prog = () => parseStrict(source);
  const start = 'Idle(P1) & Idle(P2) & Flag(P1, Down) & Flag(P2, Down)';
  const search = (goal) => {
    const p = prog();
    return searchStates({ rules: p.rules, ac: p.ac }, parseTerm(start, p.fixity), goalPattern(parseTerm(goal, p.fixity), p.ac), 2000);
  };
  test('P1 can enter', () => expect(search('Crit(P1) & x').found).not.toBe(null));
  test('P2 can enter', () => expect(search('Crit(P2) & x').found).not.toBe(null));
  test('never both', () => {
    const r = search('Crit(P1) & Crit(P2) & x');
    expect(r.found).toBe(null);
    expect(r.exhausted).toBe(true);
  });
solution: |
  export const source = `
  #ac &
  #infixl 5 &
  Idle(p) & Flag(p, Down) -> Wait(p) & Flag(p, Up)
  Wait(P1) & Flag(P2, Down) -> Crit(P1) & Flag(P2, Down)
  Wait(P2) & Flag(P1, Down) -> Crit(P2) & Flag(P1, Down)
  Crit(p) & Flag(p, Up) -> Idle(p) & Flag(p, Down)
  `;
hints:
  - 'Three phases per process: raise your flag (`Idle` to `Wait`), enter if the other flag is down (`Wait` to `Crit`), lower your flag on leaving (`Crit` to `Idle`).'
  - 'Write the entering rule once per process, so that “the other flag” is explicit: `Wait(P1) & Flag(P2, Down) -> Crit(P1) & Flag(P2, Down)`.'
```

:::key
- In rewriting logic, equations define states (modulo AC, a state is a multiset) and rules define transitions; non-determinism is concurrency.
- Reachability search explores the state graph; on a finite graph it proves safety, on an infinite one it finds bugs.
- Rewriting logic is a semantic framework (Maude, K) for concurrent systems, Petri nets, objects and languages.
:::

:::exercises
1. Does the flag protocol of the exercise deadlock? Find the deadlocked state with the state-space widget, and fix the protocol (this is the problem Peterson's algorithm solves).
2. Model the dining philosophers with three philosophers and three forks, and find the deadlock.
3. Why do the vending machine's rules not need to terminate or be confluent? What would confluence mean for this system?
4. Model a Petri net with two places and one transition that consumes two tokens from the first place and produces one in the second. What does the state space look like from five tokens?
:::
