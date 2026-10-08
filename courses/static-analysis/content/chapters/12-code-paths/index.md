---
title: Code paths
summary: Control-flow graphs, the code paths ESLint computes for every function, and two SonarJS rules that ask which parts of a function can run after which.
number: 12
duration: 55 minutes
prerequisites: [scopes]
---

Some questions are not about what the code says but about the order in which it can run. Can the end of this `switch` case be reached, so that execution falls into the next case? Can this function reach its closing brace without a `return`, while other paths return a value? Is this assignment overwritten before anything reads it? The tree answers none of these directly, because a tree records nesting, not succession. This part of the course is about the structure that does: the **control-flow graph**, and the analyses that run on it.

## Control-flow graphs

A **control-flow graph** (CFG) has a node for each piece of straight-line code and an edge from one piece to another when execution can go from the first to the second. The pieces are traditionally **basic blocks**: maximal sequences of statements that execute one after the other, entered only at the top and left only at the bottom. A branch ends a block, and so does a jump target. The graph has an **entry**, where execution of the function starts, and exits, where it returns or throws. Frances Allen's 1970 paper made the CFG the standard representation for analysing programs, and every analyser since, compilers and linters alike, has one. :cite[allen1970]

```ts
function grade(score: number) {
  let label = 'fail';          // block 1
  if (score >= 50) {           //   … ends with a branch
    label = 'pass';            // block 2
  }
  return label;                // block 3: two predecessors
}
```

Three blocks: block 1 has two successors, block 2 and block 3; block 3 has two predecessors, block 1 (when the condition is false) and block 2. A loop adds a **back edge**, from the end of its body to its condition. A `return` or a `throw` sends an edge to an exit, and the code after it, in the same block, has no incoming edge at all: it is **unreachable**.

**Reachability** is the first question a CFG answers: is there a path from the entry to this block? It is a graph search, and it is *syntactic* reachability. The CFG does not know that `if (1 > 2)` never takes its branch, that `process.exit()` never returns, or that a function called on some path always throws. Every edge the syntax allows is in the graph, so the graph over-approximates the paths the program can take: code the CFG calls unreachable is truly dead, but code it calls reachable may still never run.

## ESLint's code paths

ESLint builds a control-flow graph for every function, and one for the top level of the file, before rules run; it calls them **code paths**. A `CodePath` has:

- `initialSegment`, the segment where it starts;
- `finalSegments`, the segments where it ends, split into `returnedSegments` (the function returns, explicitly or by reaching its end) and `thrownSegments`;
- `upper` and `childCodePaths`, linking the code paths of nested functions.

Its nodes are **code path segments**, ESLint's version of basic blocks. A segment has an `id`, `nextSegments` and `prevSegments` (and `allNextSegments`, `allPrevSegments`, which include unreachable ones), and `reachable`. Segments are not exactly basic blocks: ESLint starts a new segment at every fork and join of control flow, so a segment can be shorter than the block a compiler textbook would draw, and segments do not list the nodes they contain.

Explore the code paths of a few functions. The graph shows each segment with the code it covers; dashed segments are unreachable, and loops are drawn as back edges. ESLint opens an unreachable segment after every `return` and `throw`, which stays empty when nothing follows, as in `grade`.

:::ast-explorer{n="12.1" title="Code paths" tabs="paths,tree" subtitle="ESLint's control-flow graph for each function. Move the cursor into a function to see its code path."}
```ts
function grade(score: number) {
  let label = 'fail';
  if (score >= 50) {
    label = 'pass';
  }
  return label;
}

function first(items: string[], wanted: string) {
  for (const item of items) {
    if (item === wanted) {
      return item;
    }
  }
  throw new Error(`${wanted} not found`);
  console.log('never');
}

function kind(code: number) {
  switch (code) {
    case 1:
      return 'one';
    case 2:
      console.log('two');
    case 3:
      return 'two or three';
  }
}
```
:::

Rules do not receive the graph as a data structure. They receive **events**, interleaved with the node listeners as ESLint walks the tree:

| Event | When |
|---|---|
| `onCodePathStart(codePath, node)`, `onCodePathEnd(codePath, node)` | entering and leaving a function or the program |
| `onCodePathSegmentStart(segment, node)`, `onCodePathSegmentEnd(segment, node)` | a reachable segment begins or ends |
| `onUnreachableCodePathSegmentStart`, `onUnreachableCodePathSegmentEnd` | the same, for unreachable segments |
| `onCodePathSegmentLoop(fromSegment, toSegment, node)` | a back edge is created |

At any moment of the walk, the **current segments** are the segments that contain the node being visited. There can be several: after an `if` without `else`, until ESLint creates the join segment, the code after it belongs to the segment of the `then` branch and to the segment that skipped it. ESLint used to expose them as `codePath.currentSegments`; that property was removed in ESLint 9, and rules now track them themselves, which is why SonarJS's code-path rules all start with the same bookkeeping:

```ts
let currentSegments = new Set<Rule.CodePathSegment>();
const stack: Set<Rule.CodePathSegment>[] = [];
return {
  onCodePathStart() { stack.push(currentSegments); currentSegments = new Set(); },
  onCodePathEnd() { currentSegments = stack.pop()!; },
  onCodePathSegmentStart(s) { currentSegments.add(s); },
  onCodePathSegmentEnd(s) { currentSegments.delete(s); },
  onUnreachableCodePathSegmentStart(s) { currentSegments.add(s); },
  onUnreachableCodePathSegmentEnd(s) { currentSegments.delete(s); },
  …
};
```

The stack saves the outer function's segments while a nested function is walked. With it, a node listener can ask "is the code here reachable?": `[...currentSegments].some((s) => s.reachable)`. One more detail of timing matters: when ESLint leaves a function, it calls the `:exit` listeners of the function node *before* `onCodePathEnd`, so in `FunctionDeclaration:exit`, the current segments are the ones that reach the closing brace.

## Exercise: falling through

S128, *Switch cases should end with an unconditional "break" statement*, reports a case whose end can be reached, so that execution falls into the next case. That is exactly a reachability question, asked when ESLint leaves a `SwitchCase`: are any of the current segments reachable? A case with no statements is a deliberate grouping (`case 'e': case 'f':`), the last case falls out of the `switch` rather than into another case, and a comment right after a case is taken as a statement of intent (`// falls through`).

One gap in the graph matters in practice: ESLint's code paths do not know that `process.exit()` never returns. SonarJS's rule records the segments that contain a call to `process.exit`, and when a case's end looks reachable, it searches *backwards* from each current segment, through `prevSegments`, for a path to the case's first segment that avoids them. If every path back goes through an exit, the end is not really reachable.

::source{path="packages/analysis/src/jsts/rules/S128/rule.ts" symbol="function isAfterProcessExitCall"}

```rule
id: code-paths/switch-fallthrough
title: Falling through a case
key: S128
types: false
inspector: [paths, tree]
prompt: |
  The starter tracks the current segments and records, for each case, the first segment that starts inside it (`firstSegment`), and the segments containing a `process.exit(…)` call (`exitSegments`). Complete `'SwitchCase:exit'`: report on the `case` keyword (or `default`) when the case has statements, is not the last case of its `switch`, has no comment right after it, and has a current segment that is reachable and can be reached from the case's first segment without going through an exit segment.
files:
  rule.ts: |
    import type { Rule } from 'eslint';
    import type estree from 'estree';
    import { generateMeta } from '../helpers/generate-meta.js';

    type Segment = Rule.CodePathSegment;

    export const rule: Rule.RuleModule = {
      meta: generateMeta(
        { sonarKey: 'S128' },
        { messages: { switchEnd: 'End this switch case with an unconditional break, continue, return or throw statement.' } },
      ),
      create(context) {
        let currentSegments = new Set<Segment>();
        const stack: Set<Segment>[] = [];
        let lastStarted: Segment | undefined;
        const pendingCases: estree.SwitchCase[] = [];
        const firstSegment = new Map<estree.SwitchCase, Segment>();
        const exitSegments = new Set<string>();

        /** Is there a path back from `segment` to `start` that does not go through a `process.exit` call? */
        function reachesWithoutExit(segment: Segment, start: Segment): boolean {
          // TODO: a backward search through prevSegments.
          return true;
        }

        return {
          onCodePathStart() {
            stack.push(currentSegments);
            currentSegments = new Set();
          },
          onCodePathEnd() {
            currentSegments = stack.pop()!;
          },
          onCodePathSegmentStart(segment: Segment) {
            currentSegments.add(segment);
            lastStarted = segment;
            const pending = pendingCases.pop();
            if (pending) firstSegment.set(pending, segment);
          },
          onCodePathSegmentEnd(segment: Segment) {
            currentSegments.delete(segment);
          },
          onUnreachableCodePathSegmentStart(segment: Segment) {
            currentSegments.add(segment);
          },
          onUnreachableCodePathSegmentEnd(segment: Segment) {
            currentSegments.delete(segment);
          },
          CallExpression(node: estree.CallExpression) {
            const { callee } = node;
            if (callee.type === 'MemberExpression' && callee.object.type === 'Identifier' && callee.object.name === 'process' && callee.property.type === 'Identifier' && callee.property.name === 'exit' && lastStarted) {
              exitSegments.add(lastStarted.id);
            }
          },
          SwitchCase(node: estree.SwitchCase) {
            pendingCases.push(node);
          },
          'SwitchCase:exit'(node: estree.SwitchCase & { parent: estree.SwitchStatement }) {
            // TODO
          },
        } as Rule.RuleListener;
      },
    };
fixtures:
  fallthrough.fixture.js: |
    function label(kind, code) {
      switch (kind) {
        case 'a': // Noncompliant {{End this switch case with an unconditional break, continue, return or throw statement.}}
      //^^^^
          console.log('a');
        case 'b':
          console.log('b');
          break;
        case 'c': // Noncompliant
          if (code) {
            return 'C';
          }
        case 'd':
          if (code) {
            return 'D';
          } else {
            throw new Error('no code');
          }
        case 'e':
        case 'f':
          console.log('e or f');
          // falls through
        case 'g':
          process.exit(1);
        case 'h':
          return 'H';
        default:
          console.log('last');
      }
    }
hidden:
  more.fixture.js: |
    function loop(items) {
      for (const item of items) {
        switch (item.kind) {
          case 1:
            continue;
          case 2: // Noncompliant
            item.run();
          case 3:
            break;
        }
      }
    }
    function exits(kind) {
      switch (kind) {
        case 'x':
          if (kind.length) {
            process.exit(1);
          } else {
            process.exit(2);
          }
        case 'y': // Noncompliant
          if (kind.length) process.exit(1);
        case 'z':
          return 1;
        default:
      }
    }
    function nested(kind) {
      switch (kind) {
        case 1:
          [1, 2].forEach((n) => console.log(n));
          return;
        case 2:
          return;
      }
    }
answer:
  rule.ts: |
    import type { Rule } from 'eslint';
    import type estree from 'estree';
    import { generateMeta } from '../helpers/generate-meta.js';

    type Segment = Rule.CodePathSegment;

    export const rule: Rule.RuleModule = {
      meta: generateMeta(
        { sonarKey: 'S128' },
        { messages: { switchEnd: 'End this switch case with an unconditional break, continue, return or throw statement.' } },
      ),
      create(context) {
        let currentSegments = new Set<Segment>();
        const stack: Set<Segment>[] = [];
        let lastStarted: Segment | undefined;
        const pendingCases: estree.SwitchCase[] = [];
        const firstSegment = new Map<estree.SwitchCase, Segment>();
        const exitSegments = new Set<string>();

        function reachesWithoutExit(segment: Segment, start: Segment): boolean {
          const todo = [segment];
          const seen = new Set<string>();
          while (todo.length) {
            const current = todo.pop()!;
            if (seen.has(current.id)) continue;
            seen.add(current.id);
            if (exitSegments.has(current.id)) continue;
            if (current === start) return true;
            todo.push(...current.prevSegments);
          }
          return false;
        }

        return {
          onCodePathStart() {
            stack.push(currentSegments);
            currentSegments = new Set();
          },
          onCodePathEnd() {
            currentSegments = stack.pop()!;
          },
          onCodePathSegmentStart(segment: Segment) {
            currentSegments.add(segment);
            lastStarted = segment;
            const pending = pendingCases.pop();
            if (pending) firstSegment.set(pending, segment);
          },
          onCodePathSegmentEnd(segment: Segment) {
            currentSegments.delete(segment);
          },
          onUnreachableCodePathSegmentStart(segment: Segment) {
            currentSegments.add(segment);
          },
          onUnreachableCodePathSegmentEnd(segment: Segment) {
            currentSegments.delete(segment);
          },
          CallExpression(node: estree.CallExpression) {
            const { callee } = node;
            if (callee.type === 'MemberExpression' && callee.object.type === 'Identifier' && callee.object.name === 'process' && callee.property.type === 'Identifier' && callee.property.name === 'exit' && lastStarted) {
              exitSegments.add(lastStarted.id);
            }
          },
          SwitchCase(node: estree.SwitchCase) {
            pendingCases.push(node);
          },
          'SwitchCase:exit'(node: estree.SwitchCase & { parent: estree.SwitchStatement }) {
            if (node.consequent.length === 0 || node.parent.cases.at(-1) === node) return;
            if (context.sourceCode.getCommentsAfter(node).length > 0) return;
            const start = firstSegment.get(node);
            const fallsThrough = [...currentSegments].some((s) => s.reachable && (!start || reachesWithoutExit(s, start)));
            if (fallsThrough) context.report({ messageId: 'switchEnd', loc: context.sourceCode.getFirstToken(node)!.loc });
          },
        } as Rule.RuleListener;
      },
    };
hints:
  - "Start with the plain reachability check: `[...currentSegments].some((s) => s.reachable)`, plus the three exclusions (no statements, last case, comment after)."
  - "The backward search is a depth-first search from `segment` over `prevSegments`, which stops at segments in `exitSegments` and succeeds when it meets `start`. Keep a set of visited ids: loops make the graph cyclic."
solution: |
  The exclusions are design, the reachability is the analysis. `case 'c'` is reported because one path through it, the one where `code` is falsy, reaches its end; `case 'd'` is not, because both branches leave. The `process.exit` search patches a blind spot of the graph with a second, smaller analysis over it: in `exits`, both branches of case `'x'` exit, so every path back from the end of the case is blocked, while in `'y'` the path through the implicit `else` is not. That search walks the graph directly, through `prevSegments`, rather than through events: the events tell a rule *where* it is, the segments let it look around. SonarJS's version has the same structure; it marks the segment that was current when the call was visited, as this one does.
```

## Exercise: returning consistently

S3801, *Functions should use "return" consistently*, reports a function that returns a value on some paths and nothing on others. An explicit `return;` without a value is one way to return nothing; reaching the closing brace is another, the **implicit return**, and only the code path knows whether that can happen. The issue goes on the function's name, with a secondary location on each `return` (*Return with value* or *Return without value*) and, for an implicit return, on the closing brace (*Implicit return without value*).

::source{path="packages/analysis/src/jsts/rules/S3801/rule.ts" symbol="function checkFunctionForImplicitReturn"}

```rule
id: code-paths/consistent-return
title: Returning consistently
key: S3801
types: false
inspector: [paths, tree]
prompt: |
  For each function, record its `return` statements, and at the function's `:exit` listener, whether one of the current segments is reachable (an implicit return). Report when the function returns a value somewhere and also returns without a value, explicitly or implicitly. Use `getMainFunctionTokenLocation(fn, parent, context)` for the location, and the secondary locations and messages described above, with `report` from `../helpers/location.js`. This time, write the segment bookkeeping yourself.
files:
  rule.ts: |
    import type { Rule } from 'eslint';
    import type estree from 'estree';
    import { generateMeta } from '../helpers/generate-meta.js';
    import { getMainFunctionTokenLocation, report, toSecondaryLocation } from '../helpers/location.js';

    type FunctionNode = estree.FunctionDeclaration | estree.FunctionExpression | estree.ArrowFunctionExpression;

    export const rule: Rule.RuleModule = {
      meta: generateMeta({ sonarKey: 'S3801', hasSecondaries: true }, {}),
      create(context) {
        // TODO
        return {};
      },
    };
fixtures:
  returns.fixture.js: |
    function find(items, id) { // Noncompliant {{Refactor this function to use "return" consistently.}}
      for (const item of items) {
        if (item.id === id) {
          return item;
        }
      }
    }

    function check(user) { // Noncompliant
      if (!user) {
        return;
      }
      return user.name;
    }

    function always(x) {
      if (x) {
        return 1;
      }
      return 2;
    }

    function never(x) {
      if (x) {
        return;
      }
      console.log(x);
    }

    function throws(x) {
      if (x) {
        return x;
      }
      throw new Error('no x');
    }

    const repo = {
      lookup(key) { // Noncompliant
    //^^^^^^
        if (key) {
          return key.value;
    //    ^^^^^^^^^^^^^^^^^< {{Return with value}}
        }
      },
    //^< {{Implicit return without value}}
    };
hidden:
  more.fixture.js: |
    const arrow = (x) => { // Noncompliant
      if (x) return x;
    };
    const short = (x) => x;
    function outer(xs) {
      xs.forEach((x) => {
        if (x) return;
      });
      return xs.length;
    }
    function loopForever(queue) {
      while (true) {
        if (queue.done) return queue.value;
      }
    }
    function switchy(kind) { // Noncompliant
      switch (kind) {
        case 1:
          return 'one';
        case 2:
          return;
        default:
          return 'many';
      }
    }
answer:
  rule.ts: |
    import type { Rule } from 'eslint';
    import type estree from 'estree';
    import { generateMeta } from '../helpers/generate-meta.js';
    import { getMainFunctionTokenLocation, report, toSecondaryLocation } from '../helpers/location.js';

    type FunctionNode = estree.FunctionDeclaration | estree.FunctionExpression | estree.ArrowFunctionExpression;
    type Segment = Rule.CodePathSegment;

    export const rule: Rule.RuleModule = {
      meta: generateMeta({ sonarKey: 'S3801', hasSecondaries: true }, {}),
      create(context) {
        let currentSegments = new Set<Segment>();
        const segmentStack: Set<Segment>[] = [];
        const returnStack: estree.ReturnStatement[][] = [];

        function check(node: estree.Node) {
          const fn = node as FunctionNode & { parent?: estree.Node };
          const returns = returnStack.at(-1) ?? [];
          const implicit = fn.body.type === 'BlockStatement' && [...currentSegments].some((s) => s.reachable);
          const withValue = returns.some((r) => r.argument);
          const withoutValue = implicit || returns.some((r) => !r.argument);
          if (!withValue || !withoutValue) return;
          const secondaries = returns.map((r) => toSecondaryLocation(r, r.argument ? 'Return with value' : 'Return without value'));
          if (implicit) {
            const brace = context.sourceCode.getLastToken(fn, (t) => t.value === '}');
            if (brace) secondaries.push(toSecondaryLocation(brace, 'Implicit return without value'));
          }
          report(
            context,
            { message: 'Refactor this function to use "return" consistently.', loc: getMainFunctionTokenLocation(fn, fn.parent, context) ?? fn.loc! },
            secondaries,
          );
        }

        return {
          onCodePathStart() {
            segmentStack.push(currentSegments);
            currentSegments = new Set();
            returnStack.push([]);
          },
          onCodePathEnd() {
            currentSegments = segmentStack.pop()!;
            returnStack.pop();
          },
          onCodePathSegmentStart(s: Segment) {
            currentSegments.add(s);
          },
          onCodePathSegmentEnd(s: Segment) {
            currentSegments.delete(s);
          },
          onUnreachableCodePathSegmentStart(s: Segment) {
            currentSegments.add(s);
          },
          onUnreachableCodePathSegmentEnd(s: Segment) {
            currentSegments.delete(s);
          },
          ReturnStatement(node: estree.ReturnStatement) {
            returnStack.at(-1)?.push(node);
          },
          'FunctionDeclaration:exit': check,
          'FunctionExpression:exit': check,
          'ArrowFunctionExpression:exit': check,
        } as Rule.RuleListener;
      },
    };
hints:
  - "Keep a stack of return lists alongside the stack of segment sets, pushed in `onCodePathStart` and popped in `onCodePathEnd`. The program has a code path too, so the stacks are never empty inside a function."
  - "In `'FunctionDeclaration:exit'` (and the two other function types), the current segments are still the function's: `:exit` runs before `onCodePathEnd`."
  - "An arrow function with an expression body, `(x) => x`, always returns a value: only a block body can have an implicit return."
solution: |
  The rule needs one bit of flow information, whether the end of the function is reachable, and gets it for free from the code path at the right moment. The rest is bookkeeping per function, kept in stacks because functions nest: the `return` inside the `forEach` callback belongs to the callback, not to `outer`. The code path also gets `loopForever` right, which a syntactic rule would not: `while (true)` has no exit edge in ESLint's graph, so the closing brace is unreachable and the function never returns implicitly. And it shows the over-approximation: a function whose last statement calls something that always throws would still look like it can reach its end. SonarJS's version uses types to remove two such cases: a `switch` that covers every member of a union type, and a final call to a function whose return type is `never`. It also skips functions whose declared return type includes `void`, `undefined` or `never`.
```

## Syntax as a shortcut

Not every rule about flow uses code paths. S3626, *Jump statements should not be redundant*, reports a `return;` at the end of a function or a `continue;` at the end of a loop body, which change nothing. Its implementation is a handful of selectors such as `':function > BlockStatement > ReturnStatement'`, plus a check that the statement is the last of its block. That is a syntactic approximation of a flow question ("does removing this jump change where execution goes?"), and for these shapes it is exact. When the syntax answers the question, a rule should not build anything heavier: the code path is free, but the reasoning on top of it is not.

## What comes next

Reachability is the simplest question a CFG answers: whether there is a path. The questions of the next chapters are about *what is true* along the paths: which variables may still be read, which assignments may still be the current value. They are answered by propagating facts through the graph until nothing changes, and the mathematics that guarantees this terminates, with the right answer, is the subject of the next chapter.
