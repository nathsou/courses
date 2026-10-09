---
title: Reaching definitions and value sets
summary: The forward counterpart of liveness. Which assignments can produce the value read at a point, the value sets SonarJS tracks instead, and a subtle difference between "no definition" and "undefined".
number: 15
duration: 55 minutes
prerequisites: [liveness]
---

Liveness looked forward from each point: will this variable be read? Many questions look backward instead: where can the value read here come from? If every assignment that can reach `return mode` assigns `'off'`, the function always returns `'off'`. If the only assignment that can reach a read is the declaration `let x;`, the read sees `undefined`. If a variable already holds the value an assignment is about to give it, on every path, the assignment is redundant. All three are answered by **reaching definitions**.

## Reaching definitions

A **definition** is a statement that assigns a variable: an assignment, a declaration (with or without an initialiser), a parameter (defined at the function's entry), a `for…of` variable. A definition `d` of `x` **reaches** a point `p` if there is a path from `d` to `p` along which `x` is not redefined.

The analysis runs forward, and it is a may analysis: a definition reaches a point if it does along *some* path, so facts are sets of definitions joined by union. Each node kills the other definitions of the variables it defines, and generates its own:

```text
IN[n]  = ⋃ OUT[p] for every predecessor p of n
OUT[n] = gen(n) ∪ (IN[n] − kill(n))
```

with `IN[entry]` holding the parameters' definitions. Step through it; definitions are named after their variable and the line where they happen.

:::fixpoint-stepper{n="15.1" analysis="reaching" subtitle="Definitions flow forward until each is killed by another definition of the same variable."}
```js
function mode(enabled, level) {
  let result = 'off';
  let count;
  if (enabled) {
    result = 'on';
    count = 1;
  }
  while (level > 0) {
    count = level;
    level = level - 1;
  }
  return result + count;
}
```
:::

At the `return`, two definitions of `result` reach (`result@2` through the path that skips the `if`, `result@5` through the other), and three of `count`, including `count@3`: the declaration without an initialiser. On a path that skips both the `if` and the loop, `count` is still `undefined` when it is read, and the analysis says so.

The pairs of a use and the definitions that reach it are **use-definition chains**, the raw material of many other analyses. Constant propagation can be built on them: if every definition reaching a use assigns the same constant, the use has that constant.

## Value sets

SonarJS's helper for reaching definitions does not track *which* assignments reach a point, but *what they assigned*. For each variable, its facts are the set of values that may reach: the source text of literal values (`'off'`, `1`, `true`), or **unknown** when one of the reaching assignments wrote something the helper cannot name, such as a call's result. An assignment of another variable, `b = a`, copies `a`'s current value set. The value sets form a lattice for each variable: no value (⊥) at the bottom, then finite sets of literals ordered by inclusion, then unknown (⊤) at the top, which absorbs everything at a join.

::source{path="packages/analysis/src/jsts/rules/helpers/reaching-definitions.ts" symbol="export function resolveAssignedValues"}

This is a combination of reaching definitions and constant propagation, tailored to one rule. S4165, *Assignments should not be redundant*, reports an assignment of a value the variable already holds on every path:

```js
let level = 'low';
if (risky) {
  level = 'low'; // Review this redundant assignment: "level" already holds the assigned value along all execution paths.
}
```

At the assignment, the value set of `level` is `{'low'}`, a single value, and the assigned value is `'low'`. Like S1854, the rule finds the value sets at the start of each segment with the fixpoint, then replays the segment's assignments in order.

::source{path="packages/analysis/src/jsts/rules/S4165/rule.ts" symbol="function checkSegment"}

## No definition is not `undefined`

In the lattice, a variable missing from the facts means that *no definition reaches* the point: ⊥. That is not the same as holding the value `undefined`, and confusing the two makes the analysis unsound. Consider:

```js
function f(c) {
  let x;
  if (c) {
    x = 1;
  }
  x = 1;
  return x;
}
```

The declaration `let x;` has no initialiser, and eslint-scope records no write reference for it. A helper that builds its definitions from write references therefore never sees `let x;` as a definition. On the path that skips the `if`, `x` is missing from the facts (⊥); on the other path, it holds `{1}`; their join is `{1}`, and the last assignment looks redundant. It is not: when `c` is false, `x` is `undefined` until that line. Following the logic of SonarJS's helper at the pinned commit, which joins only the variables present in the predecessors' facts, S4165 raises an issue here. Parameters have the same problem: a parameter reassigned on one branch looks, after the branch, as if it held only the assigned value.

The fix is to give every variable a definition on every path from the entry: `let x;` defines `x` as `undefined`, and a parameter is defined at the entry with an unknown value. Then ⊥ only ever means what it should, that the point is unreachable or the variable is not in scope yet. The course kit's helper makes this possible with a definition kind for `let x;`; the exercise uses it.

## Exercise: redundant assignments

```rule
id: reaching-definitions/redundant-assignments
title: Redundant assignments
key: S4165
types: false
inspector: [paths, scopes]
prompt: |
  The starter records each write reference as a `Definition` of the segment it is in, and runs the fixpoint. Complete it. (1) Record the missing definitions: each parameter at the start of its function, with an unknown value (`expr: null`), and each `let x;` without initialiser, with `expr: 'undefined'`. (2) Implement `checkSegment`: replay the segment's definitions from `segmentFacts.in`, and report a definition whose variable already holds exactly one value, the same single value it assigns (not unknown), on the definition's expression. Skip variables with a single definition (`definitionCount`), and variables used in more than one code path.
files:
  rule.ts: |
    import type { Rule, Scope } from 'eslint';
    import type estree from 'estree';
    import { generateMeta } from '../helpers/generate-meta.js';
    import { ReachingDefinitions, reachingDefinitions, resolveAssignedValues, UNKNOWN, type Definition } from '../helpers/reaching-definitions.js';

    type FunctionNode = estree.FunctionDeclaration | estree.FunctionExpression | estree.ArrowFunctionExpression;

    export const rule: Rule.RuleModule = {
      meta: generateMeta(
        { sonarKey: 'S4165' },
        { messages: { reviewAssignment: 'Review this redundant assignment: "{{symbol}}" already holds the assigned value along all execution paths.' } },
      ),
      create(context) {
        const facts = new Map<string, ReachingDefinitions>();
        let segments: Rule.CodePathSegment[] = [];
        const segmentStack: Rule.CodePathSegment[][] = [];
        const codePaths: string[] = [];
        const usedIn = new Map<Scope.Variable, Set<string>>();

        const definitionCount = new Map<Scope.Variable, number>();

        function define(definition: Definition) {
          definitionCount.set(definition.variable, (definitionCount.get(definition.variable) ?? 0) + 1);
          for (const s of segments) facts.get(s.id)?.add(definition);
        }

        function checkSegment(segmentFacts: ReachingDefinitions) {
          // TODO
        }

        return {
          onCodePathStart(codePath: Rule.CodePath) {
            segmentStack.push(segments);
            segments = [];
            codePaths.push(codePath.id);
          },
          onCodePathEnd() {
            segments = segmentStack.pop()!;
            codePaths.pop();
          },
          onCodePathSegmentStart(segment: Rule.CodePathSegment) {
            facts.set(segment.id, new ReachingDefinitions(segment));
            segments.push(segment);
          },
          onCodePathSegmentEnd() {
            segments.pop();
          },
          ':function'(node: FunctionNode) {
            // TODO: a definition with an unknown value for each parameter.
          },
          'VariableDeclarator:not([init])'(node: estree.VariableDeclarator) {
            // TODO: `let x;` defines x as undefined.
          },
          Identifier(node: estree.Identifier) {
            const ref = context.sourceCode.getScope(node).references.find((r) => r.identifier === node);
            if (!ref?.resolved) return;
            const paths = usedIn.get(ref.resolved) ?? new Set<string>();
            paths.add(codePaths.at(-1)!);
            usedIn.set(ref.resolved, paths);
            if (ref.isWrite()) define({ variable: ref.resolved, expr: (ref.writeExpr as estree.Node | null) ?? null, scope: ref.from, node: (ref.writeExpr as estree.Node | null) ?? node });
          },
          'Program:exit'() {
            reachingDefinitions(facts);
            for (const f of facts.values()) checkSegment(f);
          },
        } as Rule.RuleListener;
      },
    };
fixtures:
  redundant.fixture.js: |
    function reset(state) {
      let count = 0;
      count = 0; // Noncompliant {{Review this redundant assignment: "count" already holds the assigned value along all execution paths.}}
    //        ^
      return count + state;
    }

    function branches(risky) {
      let level = 'low';
      if (risky) {
        level = 'low'; // Noncompliant
      }
      return level;
    }

    function toggle(enabled) {
      let mode = 'off';
      if (enabled) {
        mode = 'on';
      }
      mode = 'off';
      return mode;
    }

    function alias() {
      const one = 1;
      let b = one;
      b = 1; // Noncompliant
      return b;
    }

    function declaredOnly(c) {
      let x;
      if (c) {
        x = 1;
      }
      x = 1;
      return x;
    }

    function parameter(p, c) {
      if (c) {
        p = 1;
      }
      p = 1;
      return p;
    }
hidden:
  more.fixture.js: |
    function sequence() {
      let s = 'a';
      s = 'b';
      s = 'b'; // Noncompliant
      return s;
    }

    function loop(n) {
      let done = false;
      while (n > 0) {
        done = false; // Noncompliant
        n--;
      }
      return done;
    }

    function insideLoop(xs) {
      for (const x of xs) {
        let flag = true;
        use(flag, x);
      }
    }

    function closure(run) {
      let v = 1;
      run(() => {
        v = 2;
      });
      v = 1;
      return v;
    }

    function unknownValue(read) {
      let data = read();
      data = read();
      return data;
    }

    function undefinedTwice(c) {
      let y;
      if (c) {
        y = undefined; // Noncompliant
      }
      return y;
    }
answer:
  rule.ts: |
    import type { Rule, Scope } from 'eslint';
    import type estree from 'estree';
    import { generateMeta } from '../helpers/generate-meta.js';
    import { ReachingDefinitions, reachingDefinitions, resolveAssignedValues, UNKNOWN, type Definition } from '../helpers/reaching-definitions.js';

    type FunctionNode = estree.FunctionDeclaration | estree.FunctionExpression | estree.ArrowFunctionExpression;

    export const rule: Rule.RuleModule = {
      meta: generateMeta(
        { sonarKey: 'S4165' },
        { messages: { reviewAssignment: 'Review this redundant assignment: "{{symbol}}" already holds the assigned value along all execution paths.' } },
      ),
      create(context) {
        const facts = new Map<string, ReachingDefinitions>();
        let segments: Rule.CodePathSegment[] = [];
        const segmentStack: Rule.CodePathSegment[][] = [];
        const codePaths: string[] = [];
        const usedIn = new Map<Scope.Variable, Set<string>>();

        const definitionCount = new Map<Scope.Variable, number>();

        function define(definition: Definition) {
          definitionCount.set(definition.variable, (definitionCount.get(definition.variable) ?? 0) + 1);
          for (const s of segments) facts.get(s.id)?.add(definition);
        }

        function checkSegment(segmentFacts: ReachingDefinitions) {
          const current = new Map(segmentFacts.in);
          for (const d of segmentFacts.definitions) {
            const before = current.get(d.variable);
            const assigned = resolveAssignedValues(d, current);
            if (
              d.expr !== null &&
              d.expr !== 'undefined' &&
              before?.size === 1 &&
              assigned.size === 1 &&
              !assigned.has(UNKNOWN) &&
              [...before][0] === [...assigned][0] &&
              (definitionCount.get(d.variable) ?? 0) > 1 &&
              (usedIn.get(d.variable)?.size ?? 0) <= 1
            ) {
              context.report({ node: d.node, messageId: 'reviewAssignment', data: { symbol: d.variable.name } });
            }
            current.set(d.variable, assigned);
          }
        }

        return {
          onCodePathStart(codePath: Rule.CodePath) {
            segmentStack.push(segments);
            segments = [];
            codePaths.push(codePath.id);
          },
          onCodePathEnd() {
            segments = segmentStack.pop()!;
            codePaths.pop();
          },
          onCodePathSegmentStart(segment: Rule.CodePathSegment) {
            facts.set(segment.id, new ReachingDefinitions(segment));
            segments.push(segment);
          },
          onCodePathSegmentEnd() {
            segments.pop();
          },
          ':function'(node: FunctionNode) {
            for (const variable of context.sourceCode.getDeclaredVariables(node)) {
              if (variable.defs.some((d) => d.type === 'Parameter')) define({ variable, expr: null, scope: context.sourceCode.getScope(node), node });
            }
          },
          'VariableDeclarator:not([init])'(node: estree.VariableDeclarator) {
            for (const variable of context.sourceCode.getDeclaredVariables(node)) {
              define({ variable, expr: 'undefined', scope: context.sourceCode.getScope(node), node });
            }
          },
          Identifier(node: estree.Identifier) {
            const ref = context.sourceCode.getScope(node).references.find((r) => r.identifier === node);
            if (!ref?.resolved) return;
            const paths = usedIn.get(ref.resolved) ?? new Set<string>();
            paths.add(codePaths.at(-1)!);
            usedIn.set(ref.resolved, paths);
            if (ref.isWrite()) define({ variable: ref.resolved, expr: (ref.writeExpr as estree.Node | null) ?? null, scope: ref.from, node: (ref.writeExpr as estree.Node | null) ?? node });
          },
          'Program:exit'() {
            reachingDefinitions(facts);
            for (const f of facts.values()) checkSegment(f);
          },
        } as Rule.RuleListener;
      },
    };
hints:
  - "`context.sourceCode.getDeclaredVariables(node)` returns the variables a function declares: its parameters (and its own name, for a declaration; keep those with a `Parameter` definition). For a declarator, it returns the declared variables."
  - "In `checkSegment`, start from `new Map(segmentFacts.in)` and, for each definition in order, compare the values before it with `resolveAssignedValues(definition, current)`, then update `current`."
  - "The definitions you add for parameters and `let x;` are not assignments the user wrote: do not report them (their `expr` is `null` or `'undefined'`)."
solution: |
  The fixpoint gives each segment the value sets at its start, and the rule replays the segment, exactly as S1854 replayed liveness backwards. The two definitions you added are what makes `declaredOnly` and `parameter` quiet: the path that skips the `if` now carries `{undefined}` or unknown, the join is not a single value, and nothing is reported. Without them, both functions get an issue, which is what SonarJS's helper does at the pinned commit. In `undefinedTwice`, the definition of `y` as `undefined` also lets the rule see a genuinely redundant `y = undefined`, a true positive the unsound version could not find. The single-definition exception keeps `insideLoop` quiet: the back edge brings `flag = true` from the previous iteration to the declaration, which would otherwise look redundant. And `closure` shows why value sets, like liveness, stop at the function's boundary: the callback may or may not run before `v = 1`.
```

## Precision, again

Value sets are a small step towards a real abstract domain. They keep a *set* of constants rather than collapsing two constants into ⊤ as chapter 13's constant propagation did, so they know that `mode` is `'on'` or `'off'`, which is enough for S4165. They lose everything else: a call's result, an arithmetic expression, a value read from an object. Part V asks how to choose a domain systematically, and what it costs to keep more.

## What comes next

Every analysis of this part needed a control-flow graph, and every rule that used one had to manage segments, evaluation order and code-path boundaries. The next chapter asks how far a rule can get without any of that, with a SonarJS rule that reasons about conditions branch by branch, and compares it with a flow-sensitive version on a corpus.
