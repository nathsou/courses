---
number: 31
title: Rewriting computes everything
summary: Turing machines as rewrite rules, string rewriting and Thue’s word problem, Post’s correspondence problem, and the price of universality. Termination, confluence and the word problem are undecidable.
duration: About 1½ hours
prerequisites: [rewriting, knuth-bendix]
theorems: [Rewrite systems simulate Turing machines, The word problem for semigroups is undecidable, Termination is undecidable, Confluence is undecidable]
techniques: [reductions between problems]
---

Throughout the course, termination and confluence had to be *proved*, with orders, interpretations, critical pairs, each method working on some systems and failing on others. Why is there no general algorithm? Because rewriting is as powerful as any computer, and the classic undecidability results for computers carry over. This chapter shows how, and where the boundary lies.

## Turing machines as rules

A Turing machine has a finite set of states, a tape of cells holding symbols (all blank except finitely many), and a head over one cell. A transition $\delta(q, a) = (q', b, R)$ says: in state $q$ reading $a$, write $b$, move right, enter $q'$. Encode a configuration as a term $Q_q(\mathit{left}, \mathit{right})$, where $\mathit{right}$ is the tape from the head onwards and $\mathit{left}$ the tape to its left, nearest cell first, each a list of cells $T_a(\ldots)$ ending in $E$ (blank forever). Then each transition is one or a few rules:

$$
\begin{aligned}
\delta(q, a) = (q', b, R): &\quad Q_q(l, T_a(r)) \to Q_{q'}(T_b(l), r) \\
\delta(q, a) = (q', b, L): &\quad Q_q(T_c(l), T_a(r)) \to Q_{q'}(l, T_c(T_b(r))) \quad\text{for each symbol } c
\end{aligned}
$$

plus variants for when the head meets the end $E$ of the explicit tape (it extends with a blank). A halting state has no rules, so a halted configuration is a normal form. One rewrite step is exactly one machine step:

::turing-lab

These are the **busy beavers** of Tibor Radó (1962): among all machines with $n$ states and two symbols that halt when started on a blank tape, the ones that write the most 1s.:cite[rado1962] The two-state champion writes four 1s in six steps. The three-state machine shown writes six 1s (the maximum for three states) in 14 steps; the most steps any halting three-state machine takes is 21, by a different machine (Lin and Radó, 1965).:cite[lin-rado1965] The busy beaver function grows faster than any computable function, which is another face of the undecidability below.

```numeric
id: rewriting-computes/bb2
title: The two-state busy beaver
prompt: 'How many rewrite rules does the course generate for the two-state busy beaver? (Open the list of rules under the widget.)'
answer: 12
tolerance: 0
explain: 'A right move gives one rule, plus one for meeting the end of the tape when the symbol read is the blank 0. A left move gives one rule per symbol that can be to the left of the head (0 or 1) plus one for the left end, and again twice as many when reading the blank. So: A0 (right, reading blank) 2, A1 (left) 3, B0 (left, reading blank) 6, B1 (right) 1: twelve rules.'
```

:::theorem{status=sketched}
For every Turing machine $M$ there is a finite rewrite system $R_M$ such that $M$ halts from a configuration exactly when $R_M$ reaches a normal form from the corresponding term, and the normal form encodes the final configuration.
:::

:::proof
The construction above: the rules are deterministic (at most one rule applies to a configuration term, since the state and the symbol under the head select it), so the reduction from the start term is exactly the run of $M$. Terms that are not configurations need no consideration for this statement.
:::

So rewriting is **Turing-complete**, and every undecidable problem about Turing machines yields one about rewrite systems.

## String rewriting and the word problem

Long before Turing, Axel Thue studied in 1914 systems of rules that replace substrings by substrings, such as $ab \leftrightarrow ba$, and asked whether two strings can be transformed into each other: the **word problem** for what are now called **Thue systems** (or presentations of semigroups).:cite[thue1914] A string $a_1 a_2 \cdots a_n$ is a term $a_1(a_2(\cdots a_n(E)))$ with unary symbols, so string rewriting is the special case of term rewriting where every symbol is unary, and everything in this course applies to it (Chapter 21 completed a string presentation of $S_3$).

:::theorem{name="Post; Markov" year=1947 status=sketched}
There is a finite Thue system whose word problem is undecidable.
:::

Emil Post and Andrey Markov proved this independently in 1947, by encoding Turing machine configurations as strings (the head and state as a single letter inside the tape) and transitions as string rules, used in both directions.:cite[post1947,markov1947] The delicate part is that equations go both ways, so the encoding must make backward steps harmless; the deterministic nature of the machine ensures that a conversion between a start configuration and a halting one implies a real computation. Novikov and Boone extended the result to groups in the 1950s, a much harder construction.:cite[novikov1955,boone1959] By Birkhoff's theorem (Chapter 18), it follows that equational logic is undecidable: there is a finite set of equations $E$ for which "$E \vdash s = t$" has no algorithm. Completion (Chapter 19) must therefore fail or diverge on such $E$, for every order.

## Post’s correspondence problem

A different classic, convenient for proving other problems undecidable: given dominoes, each with a string on top and one at the bottom, is there a non-empty sequence of them (repeats allowed) whose top row reads the same as its bottom row?

::pcp-lab

The instance in the widget is from Sipser's textbook and has the solution 2, 1, 3, 2, 4.:cite[sipser2012]

:::theorem{name="Post" year=1946 status=stated}
Post's correspondence problem is undecidable.
:::

Post proved it in 1946, by reduction from a decision problem about his own "normal systems".:cite[post1946] The search button explores sequences up to a bounded length, and can find solutions; it can never conclude that none exists, and no algorithm can, in general.

## Termination and confluence are undecidable

:::theorem{name="Huet and Lankford" year=1978 status=sketched}
It is undecidable whether a finite rewrite system terminates (on all terms).
:::

:::proof
Reduce from the halting problem. The construction of the previous section gives a system that terminates *from the start term* iff the machine halts. Termination on **all** terms (uniform termination) is the harder part, because arbitrary terms include configurations from which the machine never halts, and garbage terms that encode no configuration at all. Huet and Lankford built systems in which every term terminates iff the machine halts from every configuration, a property (uniform halting) that is itself undecidable.:cite[huet-lankford1978]
:::

The result is very robust: termination is undecidable even for systems with a **single** left-linear rule, as Max Dauchet showed in 1989.:cite[dauchet1989] Every termination method of Part IV is therefore incomplete, and the competitions of Chapter 14 will never run out of hard problems.

:::corollary{status=sketched}
Confluence of finite rewrite systems is undecidable.
:::

:::proof
For example, from the word problem: given a Thue system and two strings $s$ and $t$, build a system that is confluent iff $s$ and $t$ are not equivalent, or reduce from the halting problem with a system whose confluence depends on whether a machine halts. For *terminating* systems, by contrast, confluence is decidable (Chapter 16): the undecidability lives entirely in non-terminating systems.
:::

## Where the boundary lies

| Problem | General systems | Decidable for |
|---|---|---|
| reachability $s \to^* t$ | undecidable | terminating systems (search); ground systems (Chapter 32) |
| termination | undecidable, even for one rule | ground systems; right-ground systems |
| confluence | undecidable | terminating systems (critical pairs); ground systems |
| word problem $s =_E t$ | undecidable | equations with a finite convergent completion |

```code
id: rewriting-computes/strings
title: String rewriting
prompt: |
  Write `normalString(rules, s, fuel)`: repeatedly replace the **leftmost** occurrence of the left side of the **first** rule that occurs anywhere in the string (rules are tried in order), until no rule applies; return the result. Throw an error if more than `fuel` steps are taken.
starter: |
  export function normalString(rules: [string, string][], s: string, fuel = 10000): string {
    return s;
  }
tests: |
  import { test, expect } from 'test';
  import { normalString } from 'solution';

  test('sorting a string with ba -> ab', () => {
    expect(normalString([['ba', 'ab']], 'babab')).toBe('aabbb');
  });
  test('rules are tried in order', () => {
    expect(normalString([['aa', ''], ['a', 'b']], 'aaa')).toBe('b');
  });
  test('erasing a unary number', () => {
    // unary to nothing: each "1" removes itself when followed by the end marker
    expect(normalString([['1#', '#']], '111#')).toBe('#');
  });
  test('non-termination is detected', () => {
    expect(() => normalString([['a', 'aa']], 'a', 100)).toThrow();
  });
solution: |
  export function normalString(rules: [string, string][], s: string, fuel = 10000): string {
    for (let n = 0; n <= fuel; n++) {
      const r = rules.find(([u]) => s.includes(u));
      if (!r) return s;
      const i = s.indexOf(r[0]);
      s = s.slice(0, i) + r[1] + s.slice(i + r[0].length);
    }
    throw new Error('out of fuel');
  }
hints:
  - 'Find the first rule whose left side occurs in the string (`includes`), replace its leftmost occurrence (`indexOf`), and loop.'
```

:::key
- Configurations of a Turing machine are terms; transitions are rules; rewriting is Turing-complete.
- String rewriting is term rewriting with unary symbols; the word problem for finite Thue systems (Post, Markov, 1947) and Post's correspondence problem are undecidable.
- Termination (even with one rule) and confluence are undecidable; confluence becomes decidable with termination.
:::

:::exercises
1. Write the rules for a Turing machine that adds 1 to a binary number, and run it with the workbench.
2. Encode the PCP instance of the widget as a string rewriting problem: two strings are joinable iff the instance has a solution.
3. Why does the Turing machine encoding need extra rules for the ends of the tape? What would go wrong with a fixed-length tape?
4. Show that termination of a single *string* rewriting rule $u \to v$ is decidable when $|v| < |u|$. (It is known to be open in general for one string rule.)
:::
