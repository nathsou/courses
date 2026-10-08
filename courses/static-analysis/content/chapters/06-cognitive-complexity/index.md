---
title: Cognitive Complexity
summary: A metric designed to match how hard code is to understand, the rule that enforces it, and the analyser that borrows the rule to compute the metric.
number: 6
duration: 55 minutes
prerequisites: [reporting]
---

Not every rule looks for a bug. Some measure. A function that is too hard to understand is not wrong, but it is where the next bug will be written, and where it will take longest to find. This chapter is about one measurement, **Cognitive Complexity**: what it counts, how SonarJS computes it, and an unusual detail of how the analyser uses it.

## Counting paths: cyclomatic complexity

The classic measure of a function's complexity is Thomas McCabe's **cyclomatic complexity** (1976): the number of linearly independent paths through the function's control-flow graph, which comes down to one plus the number of decision points. :cite[mccabe1976] It answers a precise question: how many test cases are needed to exercise every branch. It is a poor answer to a different question, how hard the code is to read. A `switch` with ten cases and a chain of ten nested `if`s both score about ten, and nobody finds them equally hard.

SonarJS still computes cyclomatic complexity, as a metric shown in SonarQube: one point for each function, `if`, conditional expression, `case`, loop and logical operator.

::source{path="packages/analysis/src/jsts/analysis/file-artifacts.ts" symbol="COMPLEXITY_NODES"}

## Counting what makes code hard to read

**Cognitive Complexity** was designed at SonarSource by G. Ann Campbell to measure understandability instead. Its white paper states three principles: :cite[campbell2018]

1. Ignore structures that let several statements be written readably as one (a method call, `?.`, the null-coalescing `??`).
2. Add one for each break in the linear flow of the code: a branch, a loop, a `catch`, a jump to a label, a sequence of logical operators.
3. Add more when such breaks are nested: a condition inside a loop inside a condition is harder to hold in your head than three conditions in a row.

In practice, increments come in two kinds:

| Kind | Structures | Adds |
|---|---|---|
| structural | `if`, `for`, `for…in`, `for…of`, `while`, `do…while`, `switch`, `catch`, `? :` | 1, plus the current nesting level |
| hybrid | `else if`, `else`, `break label`, `continue label`, each change of operator in a sequence of `&&` | 1 |

and the nesting level grows inside the branches of `if`/`else` and `? :`, inside loop bodies, `switch` cases and `catch` blocks. A whole `switch` costs one, however many cases it has: a `switch` reads as one decision.

Edit the code below and watch the increments. Hover over a mark for its value.

:::complexity-view{n="6.1"}
```ts
function sumOfPrimes(max: number): number {
  let total = 0;
  outer: for (let i = 2; i <= max; i++) {
    for (let j = 2; j < i; j++) {
      if (i % j === 0) {
        continue outer;
      }
    }
    total += i;
  }
  return total;
}

function getWords(count: number): string {
  switch (count) {
    case 1:
      return 'one';
    case 2:
      return 'a couple';
    case 3:
      return 'a few';
    default:
      return 'lots';
  }
}

function canPost(user: { admin: boolean; banned: boolean; age: number } | undefined, board: string): boolean {
  if (user && !user.banned && (user.admin || board !== 'staff') && user.age >= 13) {
    return true;
  }
  return false;
}
```
:::

`sumOfPrimes` and `getWords` have nearly the same cyclomatic complexity (4 and 5, as SonarJS counts it), and very different Cognitive Complexity (7 and 1): the nested loops and the jump to a label cost far more than four flat cases.

Look at `canPost`. Its condition has three `&&` and one `||`, and its operators cost 2. Read from left to right, the operators are `&& && || &&`: the first run of `&&` adds one, the `||` adds nothing, and the `&&` after it starts a new run and adds one. At the pinned commit, SonarJS never counts `||` or `??`: only runs of `&&` add, one per change of operator. In JavaScript, `||` and `??` are mostly written to supply default values (`options.port || 8080`), the kind of readable shorthand the first principle exempts. The white paper itself counts every sequence of like operators; this is one of the places where an implementation adapts the metric to its language.

::source{path="packages/analysis/src/jsts/rules/S3776/rule.ts" symbol="visitLogicalExpression"}

```quiz
q: "What is the Cognitive Complexity of `function f(a, b) { if (a) { if (b) { return 1; } } else { return 2; } return 0; }`?"
options:
  - text: "3"
    why: "Count again: the inner `if` is nested once."
  - text: "4"
    correct: true
    why: "Outer `if` +1, inner `if` +2 (1 plus 1 for nesting), `else` +1."
  - text: "5"
    why: "The `else` is a hybrid increment: +1 regardless of nesting."
```

## The rule: S3776

The rule S3776, *Cognitive Complexity of functions should not be too high*, reports a function whose complexity exceeds a threshold, 15 by default and configurable as a rule parameter in the quality profile. Its message gives the score and the threshold; its secondary locations are the increments, each labelled `+1` or `+3 (incl. 2 for nesting)`; and its cost is the score minus the threshold. RSPEC gives the rule a remediation function of 5 minutes plus 1 minute per point over the threshold, so a function at 25 adds 15 minutes of estimated effort.

The issue is placed on the function's name. For nested functions, each function's own complexity is computed with the nesting of its own control flow; a callback inside an `if` does not inherit the `if`'s nesting for its own issue.

SonarJS's implementation is a single-pass visitor over the tree, using the techniques of chapter 3: a stack of enclosing functions, pushed on `:function` and popped on `:function:exit`; a set of "nesting nodes" registered when a structure is entered (the `then` block of an `if`, the body of a loop) so that the generic `'*'` and `'*:exit'` listeners can raise and lower the nesting level as the walk enters and leaves them; and the report at `:function:exit`, when the whole body has been seen. It also adapts to JavaScript in a few places: `&&` used to render JSX conditionally adds nothing, and in a function recognised as a React component, nested functions do not count as nested in the file's total.

## The analyser borrows the rule

SonarQube shows Cognitive Complexity as a metric of every file, whether or not S3776 is in the project's quality profile. SonarJS computes it with the rule. When the analyser lints a main source file, it adds S3776 to the rules it runs, with the option `'silence-issues'`, and passes the rule a *metrics sink* through ESLint's settings. With that option the rule reports nothing; at `Program:exit` it writes the file's total into the sink, and the analyser reads it back with the other metrics.

::source{path="packages/analysis/src/jsts/analysis/analyzer.ts" symbol="COGNITIVE_COMPLEXITY_SILENCE_ISSUES_OPTION" title="S3776, injected silently" note="The rule entry ['error', 'silence-issues'] is added to the linter's rules for main files; the metrics sink travels in the settings."}

The file's total is not simply the sum of its functions' scores: a function nested inside a function with branching of its own counts with an extra level of nesting, as if it were part of the outer function. The per-function issues and the per-file metric therefore answer slightly different questions, and SonarJS's rule computes both in the same pass.

The other metrics of a file (lines of code, comment lines, functions, statements, classes, cyclomatic complexity) are computed separately, by one walk over the tree after the rules have run. Chapter 18 shows where that happens.

## Exercise: compute Cognitive Complexity

The starter below has the plumbing of S3776: the stack of functions, the nesting nodes, and the report with its secondary locations and cost. It counts only `if` statements, and wrongly. Complete it.

```rule
id: cognitive-complexity/implement
title: Cognitive Complexity, per function
key: S3776
options: [0]
types: false
inspector: [tree, paths]
prompt: |
  The rule runs with a threshold of 0, so every function with any complexity raises an issue whose message gives its score. Implement the increments in the table above, and the nesting: `else if` and `else` are hybrid; the `then` and `else` blocks, loop bodies, `switch` cases, `catch` blocks and both branches of `? :` raise the nesting; among logical operators, count each change of operator in a flattened run of `&&`, never `||` or `??`. Labelled `break` and `continue` add 1.
files:
  rule.ts: |
    import type { AST, Rule } from 'eslint';
    import type estree from 'estree';
    import { getMainFunctionTokenLocation, report, toSecondaryLocation } from '../helpers/location.js';
    import { generateMeta } from '../helpers/generate-meta.js';

    type FunctionNode = estree.FunctionDeclaration | estree.FunctionExpression | estree.ArrowFunctionExpression;
    type Point = { complexity: number; loc: AST.SourceLocation };

    const message = 'Refactor this function to reduce its Cognitive Complexity from {{complexityAmount}} to the {{threshold}} allowed.';

    export const rule: Rule.RuleModule = {
      meta: generateMeta({ sonarKey: 'S3776', hasSecondaries: true }, { messages: { refactorFunction: message }, schema: [{ type: 'number' }] }),
      create(context) {
        const threshold = typeof context.options[0] === 'number' ? context.options[0] : 15;
        const sourceCode = context.sourceCode;
        const functions: { points: Point[]; nesting: number }[] = [];
        const nestingNodes = new Set<estree.Node>();
        const current = () => functions[functions.length - 1];

        /** A structural increment: 1 plus the current nesting. */
        function structural(loc: AST.SourceLocation) {
          const f = current();
          if (f) f.points.push({ complexity: f.nesting + 1, loc });
        }
        /** A hybrid increment: always 1. */
        function hybrid(loc: AST.SourceLocation) {
          current()?.points.push({ complexity: 1, loc });
        }
        const firstToken = (node: estree.Node) => sourceCode.getFirstToken(node)!.loc;

        return {
          ':function'() {
            functions.push({ points: [], nesting: 0 });
          },
          ':function:exit'(node: estree.Node) {
            const f = functions.pop()!;
            const total = f.points.reduce((n, p) => n + p.complexity, 0);
            if (total <= threshold) return;
            const loc = getMainFunctionTokenLocation(node as FunctionNode, (node as estree.Node & { parent?: estree.Node }).parent, context);
            report(
              context,
              { messageId: 'refactorFunction', message, data: { complexityAmount: String(total), threshold: String(threshold) }, loc: loc ?? node.loc! },
              f.points.map((p) => toSecondaryLocation({ loc: p.loc }, p.complexity === 1 ? '+1' : `+${p.complexity} (incl. ${p.complexity - 1} for nesting)`)),
              total - threshold,
            );
          },
          '*'(node: estree.Node) {
            if (nestingNodes.has(node) && current()) current()!.nesting++;
          },
          '*:exit'(node: estree.Node) {
            if (nestingNodes.has(node)) {
              if (current()) current()!.nesting--;
              nestingNodes.delete(node);
            }
          },
          IfStatement(node: estree.IfStatement) {
            // TODO: `else if` is hybrid; the then block and a plain else block raise the nesting; `else` is hybrid.
            hybrid(firstToken(node));
          },
          // TODO: loops, switch, catch, conditional expressions, labelled jumps, && runs.
        } as Rule.RuleListener;
      },
    };
fixtures:
  cb.fixture.ts: |
    declare const xs: number[];
    declare let a: boolean, b: boolean, c: boolean;

    function plain(n: number) {
      return n + 1;
    }
    function oneIf(n: number) { // Noncompliant {{Refactor this function to reduce its Cognitive Complexity from 1 to the 0 allowed.}}
    //       ^^^^^
      if (n > 0) return 1;
    //^^< {{+1}}
      return 0;
    }
    function chain(n: number) { // Noncompliant {{Refactor this function to reduce its Cognitive Complexity from 3 to the 0 allowed.}}
      if (n > 0) return 1;
      else if (n < 0) return -1;
      else return 0;
    }
    function nested() { // Noncompliant {{Refactor this function to reduce its Cognitive Complexity from 3 to the 0 allowed.}}
      for (const x of xs) {
        if (x > 0) return x;
      }
      return 0;
    }
    function logic() { // Noncompliant {{Refactor this function to reduce its Cognitive Complexity from 3 to the 0 allowed.}}
      if (a && b || c && a) return 1;
      return 0;
    }
    function defaults(port?: number, host?: string) {
      return [port ?? 8080, host || 'localhost'];
    }
    function sign(n: number) { // Noncompliant {{Refactor this function to reduce its Cognitive Complexity from 3 to the 0 allowed.}}
      return n > 0 ? 'positive' : n < 0 ? 'negative' : 'zero';
    }
hidden:
  more.fixture.ts: |
    declare const xs: number[];
    function words(k: number) { // Noncompliant {{Refactor this function to reduce its Cognitive Complexity from 3 to the 0 allowed.}}
      switch (k) {
        case 1: return k > 0 ? 'one' : 'none';
        default: return 'many';
      }
    }
    function careful() { // Noncompliant {{Refactor this function to reduce its Cognitive Complexity from 8 to the 0 allowed.}}
      try {
        outer: while (true) {
          for (const x of xs) {
            if (x) continue outer;
          }
        }
      } catch (e) {
        return null;
      }
      return 1;
    }
    function withCallback() { // Noncompliant {{Refactor this function to reduce its Cognitive Complexity from 1 to the 0 allowed.}}
      if (xs.length) {
        xs.forEach((x) => { // Noncompliant {{Refactor this function to reduce its Cognitive Complexity from 1 to the 0 allowed.}}
          if (x) console.log(x);
        });
      }
    }
    function loops() { // Noncompliant {{Refactor this function to reduce its Cognitive Complexity from 7 to the 0 allowed.}}
      for (let i = 0; i < 3; i++) {}
      for (const k in {}) {}
      while (xs.length) {}
      do {} while (xs.length);
      do { if (xs) {} } while (false);
    }
answer:
  rule.ts: |
    import type { AST, Rule } from 'eslint';
    import type estree from 'estree';
    import { getMainFunctionTokenLocation, report, toSecondaryLocation } from '../helpers/location.js';
    import { generateMeta } from '../helpers/generate-meta.js';

    type FunctionNode = estree.FunctionDeclaration | estree.FunctionExpression | estree.ArrowFunctionExpression;
    type Point = { complexity: number; loc: AST.SourceLocation };

    const message = 'Refactor this function to reduce its Cognitive Complexity from {{complexityAmount}} to the {{threshold}} allowed.';

    export const rule: Rule.RuleModule = {
      meta: generateMeta({ sonarKey: 'S3776', hasSecondaries: true }, { messages: { refactorFunction: message }, schema: [{ type: 'number' }] }),
      create(context) {
        const threshold = typeof context.options[0] === 'number' ? context.options[0] : 15;
        const sourceCode = context.sourceCode;
        const functions: { points: Point[]; nesting: number }[] = [];
        const nestingNodes = new Set<estree.Node>();
        const current = () => functions[functions.length - 1];

        function structural(loc: AST.SourceLocation) {
          const f = current();
          if (f) f.points.push({ complexity: f.nesting + 1, loc });
        }
        function hybrid(loc: AST.SourceLocation) {
          current()?.points.push({ complexity: 1, loc });
        }
        const firstToken = (node: estree.Node) => sourceCode.getFirstToken(node)!.loc;

        function flatten(node: estree.Node, seen: Set<estree.Node>): estree.LogicalExpression[] {
          if (node.type !== 'LogicalExpression') return [];
          seen.add(node);
          return [...flatten(node.left, seen), node, ...flatten(node.right, seen)];
        }
        const counted = new Set<estree.Node>();

        return {
          ':function'() {
            functions.push({ points: [], nesting: 0 });
          },
          ':function:exit'(node: estree.Node) {
            const f = functions.pop()!;
            const total = f.points.reduce((n, p) => n + p.complexity, 0);
            if (total <= threshold) return;
            const loc = getMainFunctionTokenLocation(node as FunctionNode, (node as estree.Node & { parent?: estree.Node }).parent, context);
            report(
              context,
              { messageId: 'refactorFunction', message, data: { complexityAmount: String(total), threshold: String(threshold) }, loc: loc ?? node.loc! },
              f.points.map((p) => toSecondaryLocation({ loc: p.loc }, p.complexity === 1 ? '+1' : `+${p.complexity} (incl. ${p.complexity - 1} for nesting)`)),
              total - threshold,
            );
          },
          '*'(node: estree.Node) {
            if (nestingNodes.has(node) && current()) current()!.nesting++;
          },
          '*:exit'(node: estree.Node) {
            if (nestingNodes.has(node)) {
              if (current()) current()!.nesting--;
              nestingNodes.delete(node);
            }
          },
          IfStatement(node: estree.IfStatement) {
            const parent = (node as estree.IfStatement & { parent?: estree.Node }).parent;
            if (parent?.type === 'IfStatement' && parent.alternate === node) hybrid(firstToken(node));
            else structural(firstToken(node));
            nestingNodes.add(node.consequent);
            if (node.alternate && node.alternate.type !== 'IfStatement') {
              nestingNodes.add(node.alternate);
              hybrid(sourceCode.getTokenAfter(node.consequent)!.loc);
            }
          },
          'ForStatement, ForInStatement, ForOfStatement, WhileStatement, DoWhileStatement'(node: estree.ForStatement | estree.ForInStatement | estree.ForOfStatement | estree.WhileStatement | estree.DoWhileStatement) {
            structural(firstToken(node));
            nestingNodes.add(node.body);
          },
          SwitchStatement(node: estree.SwitchStatement) {
            structural(firstToken(node));
            for (const c of node.cases) nestingNodes.add(c);
          },
          CatchClause(node: estree.CatchClause) {
            structural(firstToken(node));
            nestingNodes.add(node.body);
          },
          ConditionalExpression(node: estree.ConditionalExpression) {
            structural(sourceCode.getTokenAfter(node.test)!.loc);
            nestingNodes.add(node.consequent);
            nestingNodes.add(node.alternate);
          },
          'BreakStatement, ContinueStatement'(node: estree.BreakStatement | estree.ContinueStatement) {
            if (node.label) hybrid(firstToken(node));
          },
          LogicalExpression(node: estree.LogicalExpression) {
            if (counted.has(node)) return;
            let previous: estree.LogicalExpression | undefined;
            for (const e of flatten(node, counted)) {
              if (e.operator !== '||' && e.operator !== '??' && previous?.operator !== e.operator) hybrid(sourceCode.getTokenAfter(e.left)!.loc);
              previous = e;
            }
          },
        } as Rule.RuleListener;
      },
    };
hints:
  - "A selector can list several node types: `'ForStatement, ForInStatement, ForOfStatement, WhileStatement, DoWhileStatement'(node) { … }`."
  - "An `else if` is an `IfStatement` that is the `alternate` of its parent `IfStatement`. The `else` token is the token after the `consequent`."
  - "For `&&` runs, flatten a `LogicalExpression` tree into the list of its operators from left to right (left subtree, the node, right subtree), remember which nodes you flattened so that you do not count them again when the walk reaches them, and add 1 for each `&&` whose predecessor in the list is a different operator."
solution: |
  The reference is the course's implementation of S3776's per-function part, which the annotator in figure 6.1 runs. Compare it with SonarJS's rule: the same listeners and the same nesting-node technique, plus the per-file aggregation of nested functions, the React component exception and the JSX short-circuit exception. `withCallback` shows the per-function nesting: the callback's `if` is +1 for the callback's own issue, although it sits inside the outer function's `if`.
```

## What comes next

Part I is complete: rules that read the tree, its tokens, and its shape. Part II gives rules more to know: what a name refers to, where an imported value comes from, and what TypeScript knows about the types of values.
