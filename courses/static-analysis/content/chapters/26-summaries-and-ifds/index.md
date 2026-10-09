---
title: Summaries and IFDS
summary: Analysing across calls without analysing every function once per caller. Inlining, context-insensitive analysis and its unrealizable paths, calling contexts, and the IFDS framework that turns a whole class of analyses into graph reachability with summaries.
number: 26
duration: 60 minutes
prerequisites: [call-graphs]
---

A call graph says where calls go. This chapter is about carrying facts along those edges: an argument's taint into the callee's parameter, the callee's return value back to the caller. The running problem is the one Part VII is about, **taint**: which variables may hold data that came from an untrusted **source**, and does any of it reach a **sink**, a function that must not receive it? To keep the focus on the interprocedural machinery, this chapter's sources and sinks are two functions called `source()` and `sink(x)`, and a third, `sanitize(x)`, returns a clean value. Chapter 29 replaces them with real APIs.

## Three ways to cross a call

**Inlining.** Analyse the callee's body at each call, as if its code were pasted there. Every call is analysed in its own context, so the result is precise. The cost is the problem: a function called from ten places is analysed ten times, each of its callees ten times as often, and recursion would never end, so inlining analysers stop at a fixed depth and lose soundness beyond it.

**Context-insensitive analysis.** Analyse each function once, with the join of the facts from all its callers, and return the result to all of them. Calls and returns become ordinary edges of one big graph, the **supergraph**. It is cheap, and it mixes callers up. In the module below, `id` is called once with a secret and once with a constant. The facts entering `id` are joined: `x` may be tainted. The fact leaving `id` goes back to both calls, so `b`, which holds the string `'public'`, is reported as tainted at `sink(b)`. That is a false positive created by a path that no execution can take: into `id` from the first call, out of it to the second.

**Context-sensitive analysis.** Keep facts from different calling contexts apart. One way is **call strings**: tag each fact with the last `k` call sites that led to it, and analyse each function once per tag. The other is **summaries**: compute, once per function, how facts at its entry become facts at its exit, and apply that summary at every call. :cite[sharir1981] Summaries are the approach this chapter develops.

:::ifds-view{n="26.1" title="One function, two callers"}
```js
function id(x) {
  return x;
}
function main() {
  const secret = source();
  const a = id(secret);
  const b = id('public');
  sink(b);
  sink(a);
}
```
:::

Untick the box above the graph to see the context-insensitive analysis report `sink(b)`.

## Realizable paths

The difference between the two answers is which paths count. Label each call edge with an opening parenthesis numbered by its call site, `(₁` for the call on line 6 and `(₂` for the one on line 7, and each return edge with the matching closing one, `)₁` and `)₂`. A path through the supergraph spells a string of parentheses. The paths an execution can actually follow are those where each closing parenthesis matches the most recent unmatched opening one: `(₁ )₁` returns to line 6, `(₂ )₂` to line 7, and `(₁ )₂`, entering from line 6 and returning to line 7, is not **realizable**. Calls that have not returned yet may stay open: the analysis can stop inside a callee.

Asking whether a fact can reach a point along a realizable path is a **context-free-language reachability** problem: reachability in a graph, restricted to paths whose labels form a word of a context-free language, here balanced parentheses. :cite[reps1998] The context-insensitive analysis answers plain reachability instead, which includes every unrealizable path.

## Exercise: realizable paths

```helper
id: summaries-and-ifds/realizable
title: Is this path realizable?
prompt: |
  Implement `realizable` in `helpers/paths.ts`. A path is a list of steps: `{ kind: 'call', site }` enters a callee from a call site, `{ kind: 'return', site }` returns from a callee to the statement after the call site `site`, and `{ kind: 'step' }` stays in a function. The path starts in the entry function. It is realizable if every return goes back to the call site of the most recent call that has not returned yet. Calls that never return are allowed; a return with no call to match is not (the entry function cannot return to a caller).
files:
  helpers/paths.ts: |
    export type Step = { kind: 'call'; site: number } | { kind: 'return'; site: number } | { kind: 'step' };

    export function realizable(path: Step[]): boolean {
      // TODO
      return true;
    }
tests:
  paths.test.ts: |
    import { test, expect } from 'workbench:test';
    import { realizable } from '../rules/helpers/paths.js';

    test('matched calls and returns', () => {
      expect(realizable([{ kind: 'call', site: 1 }, { kind: 'step' }, { kind: 'return', site: 1 }])).toBe(true);
    });
    test('returning to the wrong call', () => {
      expect(realizable([{ kind: 'call', site: 1 }, { kind: 'return', site: 2 }])).toBe(false);
    });
hiddenTests:
  more.test.ts: |
    import { test, expect } from 'workbench:test';
    import { realizable } from '../rules/helpers/paths.js';

    test('nesting', () => {
      expect(realizable([{ kind: 'call', site: 1 }, { kind: 'call', site: 2 }, { kind: 'return', site: 2 }, { kind: 'return', site: 1 }])).toBe(true);
      expect(realizable([{ kind: 'call', site: 1 }, { kind: 'call', site: 2 }, { kind: 'return', site: 1 }, { kind: 'return', site: 2 }])).toBe(false);
    });
    test('open calls are fine', () => {
      expect(realizable([{ kind: 'call', site: 1 }, { kind: 'call', site: 3 }, { kind: 'step' }])).toBe(true);
      expect(realizable([])).toBe(true);
    });
    test('a return without a call is not', () => {
      expect(realizable([{ kind: 'step' }, { kind: 'return', site: 1 }])).toBe(false);
      expect(realizable([{ kind: 'call', site: 1 }, { kind: 'return', site: 1 }, { kind: 'return', site: 1 }])).toBe(false);
    });
    test('the same site twice, as in recursion', () => {
      expect(realizable([{ kind: 'call', site: 4 }, { kind: 'call', site: 4 }, { kind: 'return', site: 4 }, { kind: 'return', site: 4 }])).toBe(true);
    });
answer:
  helpers/paths.ts: |
    export type Step = { kind: 'call'; site: number } | { kind: 'return'; site: number } | { kind: 'step' };

    export function realizable(path: Step[]): boolean {
      const open: number[] = [];
      for (const step of path) {
        if (step.kind === 'call') open.push(step.site);
        else if (step.kind === 'return' && open.pop() !== step.site) return false;
      }
      return true;
    }
```

## IFDS: dataflow as graph reachability

Reps, Horwitz and Sagiv showed that a large class of interprocedural analyses can be solved precisely, on realizable paths only, in polynomial time. :cite[reps1995] The class is **IFDS**, for the four conditions a problem must meet:

- **Interprocedural**: it crosses calls;
- **Finite**: its facts are drawn from a finite set `D`, here the variables of each function plus one for its return value;
- **Distributive**: each flow function satisfies `f(X ∪ Y) = f(X) ∪ f(Y)`, so it can be computed one fact at a time;
- **Subsets**: the lattice is the subsets of `D`, joined by union, as in liveness and reaching definitions.

Taint is distributive: whether `x` is tainted after `x = y + z` depends on `y` alone *or* on `z` alone, never on the two together. Constant propagation is not: the value of `x` after `x = y + z` needs both values at once. IFDS does not apply to it directly; its generalisation, IDE, handles some such problems.

Distributivity is what makes the trick work. A flow function over subsets of `D` is determined by what it does to each fact alone, plus what it generates from nothing. Represent the "nothing" by a special fact **Λ** (zero), which holds everywhere reachable. Then each flow function is a small bipartite graph from the facts before the statement to the facts after it:

| Statement | Edges |
|---|---|
| `x = source()` | Λ → Λ, Λ → x; every other fact to itself; x → nothing (its old value is gone) |
| `x = y + 1` | y → y, y → x; every other fact except x to itself |
| `x = sanitize(y)` | y → y; every other fact except x to itself |
| anything else | every fact to itself |

Stack these graphs along the supergraph, one copy of the facts per statement, and the result is the **exploded supergraph** of 26.1: a node for each (statement, fact) pair, an edge for each edge of each flow function. Fact `d` may hold before statement `n` exactly when (n, d) is reachable from (entry of the main function, Λ) along a realizable path. Taint analysis has become graph reachability.

At a call, the flow functions come in three kinds: **call** edges map arguments to parameters (`secret` → `x`); **return** edges map the callee's return value to the variable that receives it (`<ret>` → `a`); **call-to-return** edges carry the caller's other facts past the call, killing the variable being assigned. In the figure, they are the dashed green, dashed orange and dotted lines.

## The tabulation algorithm

The IFDS algorithm finds the reachable nodes without enumerating paths. It works with **path edges**, within one function: ⟨entry, d₁⟩ → ⟨n, d₂⟩ means "if d₁ holds at the function's entry, d₂ holds at n". It extends them along the flow functions, with a worklist, until no more can be added. When a path edge reaches the function's exit, ⟨entry, d₁⟩ → ⟨exit, d₂⟩, it is recorded as a **summary edge** of the function: d₁ in, d₂ out. At every call where d₁ enters the function, the summary is applied, mapping d₂ back through the return flow function to that call's own return site. Then the analysis continues in the caller from the path edges *of that call*, not any other. Each function body is processed once per entry fact, whatever the number of its callers, and returns always match their calls. With `E` edges in the supergraph and `D` facts per function, the work is bounded by O(E·D³).

In 26.1, `id` gets the summaries Λ → Λ and `x` → `<ret>`. At line 6, `secret` enters as `x`, so the second summary applies and `a` becomes tainted. At line 7, only Λ enters, so only the first applies, and `b` stays clean. The counts under the leaks compare the work of the two modes.

The module below adds recursion and a sanitizer. `check` calls itself before returning its argument, so its summary only settles after the recursive call's summary does: the tabulation algorithm handles that like any other path edge, with no special case. With the box ticked, only `sink(bad)` is reported; unticked, `sink(ok)` joins it, for the same reason as `sink(b)` in 26.1. The sanitized value is clean in both modes.

:::ifds-view{n="26.2" title="Recursion and sanitizers"}
```js
function check(v, depth) {
  if (depth > 0) {
    return check(v, depth - 1);
  }
  return v;
}
function main() {
  const t = source();
  const ok = check('constant', 2);
  const bad = check(t, 1);
  sink(ok);
  sink(bad);
  sink(sanitize(bad));
}
```
:::

## Summaries in practice

**FlowDroid** is a taint analysis for Android apps built on an IFDS solver. :cite[arzt2014] Its facts are not just variables but **access paths** such as `intent.extras.password`, truncated at a fixed length to keep the set finite. It runs a second, on-demand IFDS analysis backwards to find the aliases of a tainted object when a field is written, and it models the Android lifecycle (which callbacks the system calls, in which order) as the entry point of the supergraph. Much of its precision, and most of its configuration, is in the models of sources, sinks and library code: the subject of chapter 29.

**Infer**, developed at Facebook (now Meta), takes summaries further. It analyses each procedure once, bottom-up through the call graph, and stores a summary that describes the procedure's effect in any calling context. A change to one file only requires re-analysing the procedures that changed and, if their summaries changed, their callers. That is what allowed it to run on every code change at the company's scale, reporting on the diff under review. :cite[calcagno2015] The idea is the same as Clean as You Code's focus on new code (chapter 21): analysis cost and attention both proportional to what changed.

SonarJS's S2699, from the previous chapter, is a tiny instance: its "does this function contain an assertion?" result, memoised per visited node, is a summary of each helper function, reused by every test that calls it. It differs from the tabulation algorithm in how it treats recursion. A function whose result is requested while it is still being computed counts as having no assertions, and that answer is not revisited later. A fixpoint algorithm would revisit it; the rule accepts the rare imprecision for a one-pass visit.

## What comes next

Every fact in this chapter was a variable. Real programs store tainted data in objects and read it back through other names: `user.name = input; save(user)`, or `const a = b; a.x = secret; sink(b.x)`. Following values through the heap requires knowing which names refer to the same object, the question of the next chapter.
