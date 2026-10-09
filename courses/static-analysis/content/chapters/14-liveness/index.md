---
title: Liveness and dead stores
summary: A backward dataflow analysis, the live variables of every point, and the rule that uses them to find values written and never read.
number: 14
duration: 55 minutes
prerequisites: [lattices-and-fixpoints]
---

```js
function price(order) {
  let total = order.subtotal;
  total = order.subtotal + order.shipping;
  return total;
}
```

The first assignment to `total` is useless: whatever it stores is overwritten before anything reads it. A compiler would remove it silently. A rule should report it, because a useless assignment is often a symptom: a line left behind by a refactoring, or a computation whose result was meant to be used and is not. S1854, *Unused assignments should be removed*, reports such **dead stores**, and it needs to know, at each assignment, whether the value can still be read. That is the question of **liveness**.

## Live variables

A variable is **live** at a point of a program if some path from that point reads it before writing it. At a point where a variable is not live, its current value does not matter: nothing will ever see it. An assignment to a variable that is not live just after the assignment is a dead store.

Liveness looks *forward* in the program, at what happens next, so the analysis that computes it runs *backward*: facts flow from the end of the function towards its start, against the edges of the control-flow graph. In the framework of chapter 13:

- the facts are sets of variables, ordered by inclusion, joined by union (a variable is live if it is live on *some* path: a **may** analysis);
- at the function's exit, nothing is live;
- for each node, with `OUT` the set live just after it and `IN` the set live just before it:

```text
OUT[n] = ⋃ IN[s] for every successor s of n
IN[n]  = uses(n) ∪ (OUT[n] − defs(n))
```

A node makes the variables it reads live, and kills the ones it writes: their old values are not needed any more. The transfer functions are distributive, so the fixpoint is exactly the meet-over-all-paths answer.

Step through liveness on this function. The fact under each node is the set of variables live *before* it (`IN`), computed from the bottom up.

:::fixpoint-stepper{n="14.1" analysis="liveness" subtitle="Live variables flow backward, from uses to the definitions that feed them."}
```js
function label(user, admin) {
  let text = 'guest';
  if (admin) {
    text = 'admin';
  } else {
    text = user.name;
  }
  let suffix = '';
  for (const role of user.roles) {
    suffix = suffix + role;
  }
  return text + suffix;
}
```
:::

`text` is not live after `let text = 'guest'`: both branches of the `if` overwrite it before the `return` reads it, so the initial value is dead. `suffix` is live around the whole loop, because each iteration reads the previous iteration's value.

## Blocks: gen and kill

Production implementations do not run the equations statement by statement. They summarise each basic block by two sets and iterate over blocks:

- **gen**: the variables the block reads before writing them, its *upward-exposed uses*;
- **kill**: the variables the block writes.

and `IN[b] = gen[b] ∪ (OUT[b] − kill[b])`. Once the fixpoint gives each block its `OUT`, the liveness at any point inside the block is recovered by walking the block's statements backwards from `OUT`, applying each statement's transfer function.

SonarJS's helper `lva` does exactly this over ESLint's code path segments. Each segment gets a `LiveVariables` object, to which a rule adds the segment's references in evaluation order; `lva` then runs the backward worklist algorithm, putting a segment's predecessors back on the worklist when its `IN` grows.

::source{path="packages/analysis/src/jsts/rules/helpers/lva.ts" symbol="export function lva"}

One detail differs from the textbook. In SonarJS's helper, `gen` holds every variable the segment *reads*, not only those read before being written. For a segment `x = 1; use(x);`, the textbook `gen` is empty (the read sees the value just written), while SonarJS's contains `x`, which makes `x` live at the start of the segment. The analysis is coarser, never finer: it can only make more variables live, so S1854 can only report fewer dead stores. In this function the first assignment is dead, and with SonarJS's helper it is not reported, because the segment after the `if` reads `x` (after writing it):

```js
function f(c) {
  let x = compute();
  if (c) {
    log(c);
  }
  x = 1;
  use(x);
}
```

For a rule that reports dead code, erring on the side of "maybe live" is the safe direction. The course kit's `lva` implements the textbook `gen`; the exercise below runs on it, and finds this dead store.

## Evaluation order

To walk a segment backwards, a rule must record its references in the order they are *evaluated*, which is not the order of the tree. In `x = x + 1`, the walk meets the `x` on the left first, but the right-hand side is evaluated before the assignment writes. Getting this wrong turns every increment into a dead store followed by a read.

S1854 handles it with an **assignment context**: on entering an assignment (or a declarator with an initialiser), it starts buffering references, sorting each into the left-hand side or the right-hand side by walking up from its identifier; on leaving the assignment, it adds the right-hand side's references first, then the left-hand side's.

::source{path="packages/analysis/src/jsts/rules/S1854/rule.ts" symbol="function popAssignmentContext"}

## What counts as a dead store worth reporting

A dead store is a fact; whether to report it is a decision, and S1854's exceptions encode years of feedback about which dead stores people mean:

- **Defensive initialisations** with a "basic value" (`0`, `1`, `''`, `true`, `false`, `null`, `undefined`, `[]`, `{}`): `let count = 0;` followed by an assignment on every path is a habit, not a mistake.
- **Names starting with `_`**, the convention for "deliberately unused".
- **Increments and decrements**, `i++` at the end of a loop body whose result is never used, and **assignments of `null`**, which release memory for the garbage collector.
- **Variables used in more than one code path**: a variable written in a function and read in a callback, or the reverse, is shared across code paths, and the intra-procedural analysis cannot see the reads in the other function.
- **Variables read in a `catch` or `finally` block**: an exception can interrupt the code between the write and the next write, so the first write may be the value the handler sees.
- **Destructuring with a rest element** (the same idiom as in chapter 7) and **default parameter values**.
- **Local variables only**: a module-level variable can be read by any function, at any time.

::source{path="packages/analysis/src/jsts/rules/S1854/rule.ts" symbol="function shouldReportReference"}

## Exercise: dead stores

The starter does the plumbing: it creates a `LiveVariables` for each segment, adds references in evaluation order (with an assignment context), records which code paths use each variable, and runs `lva` at the end of the program. Write the check.

```rule
id: liveness/dead-stores
title: Unused assignments
key: S1854
corpus: true
types: false
inspector: [paths, scopes]
prompt: |
  Implement `checkSegment`: walk the segment's references backwards, starting from the variables live at its end (`facts.out`). A write to a variable that is not live at that point is a dead store; after a write, the variable is not live (before it); after a read, it is. Report dead stores on the reference's identifier, unless `shouldReport` says otherwise. Implement `shouldReport` with these exceptions: non-local variables (`isLocal`), variables used in more than one code path, names starting with `_`, increments and decrements, assignments of `null`, and declarations initialised with a basic value (`isBasicValue`).
files:
  rule.ts: |
    import type { Rule, Scope } from 'eslint';
    import type estree from 'estree';
    import { generateMeta } from '../helpers/generate-meta.js';
    import { LiveVariables, lva } from '../helpers/lva.js';

    type Node = estree.Node & { parent?: Node; range: [number, number] };
    type Assignment = estree.AssignmentExpression | estree.VariableDeclarator;

    /** 0, 1, '', true, false, null, undefined, [], {} and their negations. */
    function isBasicValue(node: estree.Node | null | undefined): boolean {
      if (!node) return false;
      switch (node.type) {
        case 'Literal':
          return node.value === '' || [0, 1, null, true, false].includes(node.value as never);
        case 'Identifier':
          return node.name === 'undefined';
        case 'UnaryExpression':
          return isBasicValue(node.argument);
        case 'ObjectExpression':
          return node.properties.length === 0;
        case 'ArrayExpression':
          return node.elements.length === 0;
        default:
          return false;
      }
    }

    export const rule: Rule.RuleModule = {
      meta: generateMeta(
        { sonarKey: 'S1854' },
        { messages: { removeAssignment: 'The value assigned to "{{variable}}" is never read. Use it or remove this assignment.' } },
      ),
      create(context) {
        const facts = new Map<string, LiveVariables>();
        let segments: Rule.CodePathSegment[] = [];
        const segmentStack: Rule.CodePathSegment[][] = [];
        const codePaths: string[] = [];
        const usedIn = new Map<Scope.Variable, Set<string>>();
        const assignments: { node: Assignment; lhs: Scope.Reference[]; rhs: Scope.Reference[] }[] = [];

        function isLocal(variable: Scope.Variable) {
          const block = variable.scope.block as estree.Node;
          return block.type !== 'Program';
        }

        function record(ref: Scope.Reference) {
          const assignment = assignments.at(-1);
          if (assignment) {
            const target = assignment.node.type === 'AssignmentExpression' ? assignment.node.left : assignment.node.id;
            const [start, end] = (target as Node).range;
            const [at] = (ref.identifier as Node).range;
            (at >= start && at < end ? assignment.lhs : assignment.rhs).push(ref);
          } else {
            for (const s of segments) facts.get(s.id)?.add(ref);
          }
        }

        function shouldReport(ref: Scope.Reference): boolean {
          // TODO: the exceptions.
          return true;
        }

        function checkSegment(segmentFacts: LiveVariables) {
          // TODO: walk the references backwards from segmentFacts.out.
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
            facts.set(segment.id, new LiveVariables(segment));
            segments.push(segment);
          },
          onCodePathSegmentEnd() {
            segments.pop();
          },
          ':matches(AssignmentExpression, VariableDeclarator[init])'(node: Assignment) {
            assignments.push({ node, lhs: [], rhs: [] });
          },
          ':matches(AssignmentExpression, VariableDeclarator[init]):exit'() {
            const { lhs, rhs } = assignments.pop()!;
            for (const r of [...rhs, ...lhs]) record(r);
          },
          Identifier(node: estree.Identifier) {
            const ref = context.sourceCode.getScope(node).references.find((r) => r.identifier === node);
            if (!ref?.resolved) return;
            record(ref);
            const paths = usedIn.get(ref.resolved) ?? new Set<string>();
            paths.add(codePaths.at(-1)!);
            usedIn.set(ref.resolved, paths);
          },
          'Program:exit'() {
            lva(facts);
            for (const f of facts.values()) checkSegment(f);
          },
        } as Rule.RuleListener;
      },
    };
fixtures:
  stores.fixture.js: |
    function price(order) {
      let total = order.subtotal; // Noncompliant {{The value assigned to "total" is never read. Use it or remove this assignment.}}
    //    ^^^^^
      total = order.subtotal + order.shipping;
      return total;
    }

    function label(user, admin) {
      let text = 'guest'; // Noncompliant
      if (admin) {
        text = 'admin';
      } else {
        text = user.name;
      }
      return text;
    }

    function maybe(user, admin) {
      let text = 'guest';
      if (admin) {
        text = 'admin';
      }
      return text;
    }

    function count(items) {
      let n = 0;
      for (const item of items) {
        n = n + item.quantity;
      }
      let last = items.length - 1;
      last++;
      return n;
    }

    function exits(c) {
      let x = compute(c); // Noncompliant
      if (c) {
        log(c);
      }
      x = 1;
      use(x);
    }

    function conventions(buffer) {
      let _ignored = buffer.read();
      _ignored = buffer.read();
      let data = buffer.read();
      use(data);
      data = null;
      let flag = false;
      flag = buffer.ready;
      return flag;
    }
hidden:
  more.fixture.js: |
    let moduleLevel = 1;
    moduleLevel = 2;
    export function read() {
      return moduleLevel;
    }

    function closures(start) {
      let ready = false;
      start(() => {
        ready = true;
      });
      return () => ready;
    }

    function twice(x) {
      let y = x * 2; // Noncompliant
      y = x * 3;
      y = y + 1; // Noncompliant
      return x;
    }

    function loop(n) {
      let i = 0;
      while (i < n) {
        i = i + 2;
      }
      return i;
    }
answer:
  rule.ts: |
    import type { Rule, Scope } from 'eslint';
    import type estree from 'estree';
    import { generateMeta } from '../helpers/generate-meta.js';
    import { LiveVariables, lva } from '../helpers/lva.js';

    type Node = estree.Node & { parent?: Node; range: [number, number] };
    type Assignment = estree.AssignmentExpression | estree.VariableDeclarator;

    function isBasicValue(node: estree.Node | null | undefined): boolean {
      if (!node) return false;
      switch (node.type) {
        case 'Literal':
          return node.value === '' || [0, 1, null, true, false].includes(node.value as never);
        case 'Identifier':
          return node.name === 'undefined';
        case 'UnaryExpression':
          return isBasicValue(node.argument);
        case 'ObjectExpression':
          return node.properties.length === 0;
        case 'ArrayExpression':
          return node.elements.length === 0;
        default:
          return false;
      }
    }

    export const rule: Rule.RuleModule = {
      meta: generateMeta(
        { sonarKey: 'S1854' },
        { messages: { removeAssignment: 'The value assigned to "{{variable}}" is never read. Use it or remove this assignment.' } },
      ),
      create(context) {
        const facts = new Map<string, LiveVariables>();
        let segments: Rule.CodePathSegment[] = [];
        const segmentStack: Rule.CodePathSegment[][] = [];
        const codePaths: string[] = [];
        const usedIn = new Map<Scope.Variable, Set<string>>();
        const assignments: { node: Assignment; lhs: Scope.Reference[]; rhs: Scope.Reference[] }[] = [];

        function isLocal(variable: Scope.Variable) {
          const block = variable.scope.block as estree.Node;
          return block.type !== 'Program';
        }

        function record(ref: Scope.Reference) {
          const assignment = assignments.at(-1);
          if (assignment) {
            const target = assignment.node.type === 'AssignmentExpression' ? assignment.node.left : assignment.node.id;
            const [start, end] = (target as Node).range;
            const [at] = (ref.identifier as Node).range;
            (at >= start && at < end ? assignment.lhs : assignment.rhs).push(ref);
          } else {
            for (const s of segments) facts.get(s.id)?.add(ref);
          }
        }

        function shouldReport(ref: Scope.Reference): boolean {
          const variable = ref.resolved!;
          const parent = (ref.identifier as Node).parent;
          if (!isLocal(variable) || (usedIn.get(variable)?.size ?? 0) > 1) return false;
          if (variable.name.startsWith('_')) return false;
          if (parent?.type === 'UpdateExpression') return false;
          if (parent?.type === 'AssignmentExpression' && parent.right.type === 'Literal' && parent.right.value === null) return false;
          if (ref.init && isBasicValue(ref.writeExpr as estree.Node | null)) return false;
          return true;
        }

        function checkSegment(segmentFacts: LiveVariables) {
          const live = new Set(segmentFacts.out);
          for (const ref of [...segmentFacts.references].reverse()) {
            const variable = ref.resolved;
            if (!variable) continue;
            if (ref.isWrite()) {
              if (!live.has(variable) && shouldReport(ref)) {
                context.report({ node: ref.identifier, messageId: 'removeAssignment', data: { variable: variable.name } });
              }
              live.delete(variable);
            }
            if (ref.isRead()) live.add(variable);
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
            facts.set(segment.id, new LiveVariables(segment));
            segments.push(segment);
          },
          onCodePathSegmentEnd() {
            segments.pop();
          },
          ':matches(AssignmentExpression, VariableDeclarator[init])'(node: Assignment) {
            assignments.push({ node, lhs: [], rhs: [] });
          },
          ':matches(AssignmentExpression, VariableDeclarator[init]):exit'() {
            const { lhs, rhs } = assignments.pop()!;
            for (const r of [...rhs, ...lhs]) record(r);
          },
          Identifier(node: estree.Identifier) {
            const ref = context.sourceCode.getScope(node).references.find((r) => r.identifier === node);
            if (!ref?.resolved) return;
            record(ref);
            const paths = usedIn.get(ref.resolved) ?? new Set<string>();
            paths.add(codePaths.at(-1)!);
            usedIn.set(ref.resolved, paths);
          },
          'Program:exit'() {
            lva(facts);
            for (const f of facts.values()) checkSegment(f);
          },
        } as Rule.RuleListener;
      },
    };
hints:
  - "Start with `const live = new Set(segmentFacts.out)` and iterate over `[...segmentFacts.references].reverse()`. For a read-write reference such as `n += 1`, handle the write first, then the read: walking backwards, the read happens before the write."
  - "`ref.init` is true for the write of a declaration's initialiser, and `ref.writeExpr` is the expression written."
  - "The parent of the identifier tells increments (`UpdateExpression`) and `x = null` (an `AssignmentExpression` whose `right` is the literal `null`) apart."
solution: |
  The analysis gives each segment the variables live at its end; the rule finishes the job inside the segment with the same transfer function, one reference at a time. `exits` is the dead store that SonarJS's coarser `gen` misses and the textbook version finds: `x = 1; use(x)` reads `x` only after writing it, so the value of `compute(c)` is dead on both paths. In `count`, `last++` is a dead store too, an increment whose result nothing reads, and the exception keeps it quiet: at the end of loops and functions, such increments are usually harmless habits. In `closures`, `ready` is written in the callback and read in the arrow function returned: each code path, analysed alone, sees a write that nothing reads, and the "more than one code path" exception is what keeps the rule from reporting both. SonarJS's rule has the remaining exceptions: reads in `catch` and `finally`, destructuring with a rest element, default parameters, and enum members.
```

## Variables that are never read at all

If no reference anywhere reads a variable, every write to it is dead, and a rule could report each of them. S1481 already reports a variable that is declared and never used (chapter 7); S1854 reports the assignments of a variable that is written several times and never read. The two rules share the work by asking different questions: is the *variable* useless, or is this *value*? Chapter 21 comes back to this division of labour between rules, which keeps one mistake from raising three issues.

## What comes next

Liveness asks, at each point, which *variables* matter later. The next chapter asks the forward question: which *assignments* can have produced the value of a variable here? Its answer, reaching definitions, lets a rule see that an assignment is redundant because the variable already holds that value.
