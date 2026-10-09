---
title: How far without a control-flow graph?
summary: A SonarJS rule that reasons about conditions branch by branch, an extension that understands guard clauses, a flow-sensitive analysis that understands everything, and what a corpus says about the difference.
number: 16
duration: 55 minutes
prerequisites: [reaching-definitions]
---

The analyses of this part were built on control-flow graphs, and they cost something: segment bookkeeping, evaluation order, a fixpoint per file. Not every rule pays it. This chapter takes one rule that reasons about conditions without a CFG, extends it as far as a little flow information allows, compares it with a flow-sensitive analysis, and uses the corpus to see what each step buys.

## Gratuitous conditions

S2589, *Boolean expressions should not be gratuitous*, reports a condition whose value is known where it is evaluated:

```ts
if (board && sticky) {
  if (board) {   // This always evaluates to truthy. Consider refactoring this code.
    …
  }
}
```

Inside the outer `if`, `board` is truthy, so the inner test is always true. Such code is rarely a bug in itself, but it is often the trace of one: a condition that was meant to test something else, or a refactoring that left a check behind. The issue has a secondary location on the test that made the value known, *Evaluated here to be truthy*.

SonarJS implements S2589 without a control-flow graph. When the walk enters the `then` branch of an `if`, the rule collects the identifiers the test makes truthy (`x`, each operand of an `&&` chain, `!!x`) and falsy (`!x`); when it enters the `else` branch of `if (x)`, `x` is falsy. Those facts hold for the branch, which the walk then visits in full, until it leaves the branch. Within it, the rule reports an identifier with a known value that appears as a condition: the test of an `if`, an operand of `&&`, the left operand of `||`, the operand of `!`.

One check keeps the facts true: a variable that **might be written** in the branch, or in any other function, is dropped. That check is flow-insensitive and cautious: a write anywhere in the branch, even after the last use, discards the fact.

::source{path="packages/analysis/src/jsts/rules/S2589/rule.ts" symbol="function collectKnownIdentifiers"}

These are **branch-local facts**: true in a subtree of the syntax, because the syntax of `if` guarantees that the subtree only runs after the test. No graph is needed, because the tree's nesting *is* the control flow, as long as nothing inside the branch jumps around.

## Exercise: branch-local facts

```rule
id: without-a-cfg/gratuitous-branch-local
title: Gratuitous conditions, branch by branch
key: S2589
corpus: true
inspector: [tree, scopes]
prompt: |
  The starter keeps a stack of known facts, one entry per branch being visited, and calls `enterBranch` when the walk enters the `then` or `else` branch of an `if`. Implement `known(test, outcome)`, which lists the identifiers a test makes truthy and falsy when it evaluates to `outcome` (for `false`, only a lone identifier: `else` of `if (x)`), and the `Identifier` listener, which reports an identifier in a condition position whose variable is known, with the secondary location on the identifier that made it known. `mightBeWritten` is provided.
files:
  rule.ts: |
    import type { Rule, Scope } from 'eslint';
    import type estree from 'estree';
    import { generateMeta } from '../helpers/generate-meta.js';
    import { report, toSecondaryLocation } from '../helpers/location.js';
    import { findFirstMatchingAncestor } from '../helpers/ancestor.js';
    import { isFunctionNode } from '../helpers/ast.js';

    type Node = estree.Node & { parent?: Node; range: [number, number] };
    type Fact = { variable: Scope.Variable; truthy: boolean; origin: estree.Identifier };

    const message = 'This always evaluates to {{value}}. Consider refactoring this code.';

    export const rule: Rule.RuleModule = {
      meta: generateMeta({ sonarKey: 'S2589', hasSecondaries: true }, { messages: { refactorBooleanExpression: message } }),
      create(context) {
        const branches = new Map<estree.Node, Fact[]>();

        /** A write inside `region`, or in a function other than the one containing `region`. */
        function mightBeWritten(variable: Scope.Variable, region: Node): boolean {
          const fn = findFirstMatchingAncestor(region, isFunctionNode);
          return variable.references.some((r) => {
            if (!r.isWrite()) return false;
            const id = r.identifier as Node;
            const inside = id.range[0] >= region.range[0] && id.range[1] <= region.range[1];
            return inside || findFirstMatchingAncestor(id, isFunctionNode) !== fn;
          });
        }

        /** The identifiers that `test` makes truthy and falsy when it evaluates to `outcome`. */
        function known(test: estree.Expression, outcome: boolean): { truthy: estree.Identifier[]; falsy: estree.Identifier[] } {
          // TODO
          return { truthy: [], falsy: [] };
        }

        function enterBranch(ifStatement: estree.IfStatement, branch: Node, outcome: boolean) {
          const { truthy, falsy } = known(ifStatement.test, outcome);
          const scope = context.sourceCode.getScope(ifStatement);
          const facts: Fact[] = [];
          for (const [ids, value] of [[truthy, true], [falsy, false]] as const) {
            for (const id of ids) {
              const variable = scope.references.find((r) => r.identifier === id)?.resolved;
              if (variable && !mightBeWritten(variable, branch)) facts.push({ variable, truthy: value, origin: id });
            }
          }
          branches.set(branch, facts);
        }

        return {
          'IfStatement > .consequent'(node: Node) {
            enterBranch(node.parent as estree.IfStatement, node, true);
          },
          'IfStatement > .alternate'(node: Node) {
            enterBranch(node.parent as estree.IfStatement, node, false);
          },
          'IfStatement > .consequent:exit'(node: estree.Node) {
            branches.delete(node);
          },
          'IfStatement > .alternate:exit'(node: estree.Node) {
            branches.delete(node);
          },
          Identifier(node: Node & estree.Identifier) {
            // TODO: is it in a condition position? Is its variable known in an enclosing branch?
          },
        } as Rule.RuleListener;
      },
    };
fixtures:
  conditions.fixture.ts: |
    declare function start(): void;

    export function label(board: string | undefined, sticky: boolean): string {
      if (board && sticky) {
    //    ^^^^^> {{Evaluated here to be truthy}}
        if (board) { // Noncompliant {{This always evaluates to truthy. Consider refactoring this code.}}
    //      ^^^^^
          return sticky ? board.toUpperCase() : board;
        }
      }
      return 'ALL';
    }

    export function anonymous(user: string | undefined): string {
      if (!user) {
        return user || 'anonymous'; // Noncompliant {{This always evaluates to falsy. Consider refactoring this code.}}
      }
      return user;
    }

    export function toggle(ready: boolean): void {
      if (ready) {
        start();
      } else if (!ready) { // Noncompliant
        start();
      }
    }

    export function written(count: number): number {
      if (count) {
        count = count - 1;
        if (count) {
          return count;
        }
      }
      return 0;
    }

    export function different(a: boolean, b: boolean): void {
      if (a) {
        if (b) {
          start();
        }
      }
    }
hidden:
  more.fixture.ts: |
    declare function start(): void;
    declare function run(f: () => void): void;

    export function chain(a: boolean, b: boolean, c: boolean): void {
      if (a && b && c) {
        if (b && !c) { // Noncompliant {{This always evaluates to truthy. Consider refactoring this code.}} {{This always evaluates to truthy. Consider refactoring this code.}}
          start();
        }
      }
    }

    export function doubleNegation(flag: boolean): void {
      if (!!flag) {
        if (flag) start(); // Noncompliant
      }
    }

    export function callback(flag: boolean): void {
      if (flag) {
        run(() => {
          flag = false;
        });
        if (flag) start();
      }
    }

    export function notACondition(value: string | undefined): string {
      if (value) {
        return value;
      }
      return '';
    }
answer:
  rule.ts: |
    import type { Rule, Scope } from 'eslint';
    import type estree from 'estree';
    import { generateMeta } from '../helpers/generate-meta.js';
    import { report, toSecondaryLocation } from '../helpers/location.js';
    import { findFirstMatchingAncestor } from '../helpers/ancestor.js';
    import { isFunctionNode } from '../helpers/ast.js';

    type Node = estree.Node & { parent?: Node; range: [number, number] };
    type Fact = { variable: Scope.Variable; truthy: boolean; origin: estree.Identifier };

    const message = 'This always evaluates to {{value}}. Consider refactoring this code.';

    export const rule: Rule.RuleModule = {
      meta: generateMeta({ sonarKey: 'S2589', hasSecondaries: true }, { messages: { refactorBooleanExpression: message } }),
      create(context) {
        const branches = new Map<estree.Node, Fact[]>();

        function mightBeWritten(variable: Scope.Variable, region: Node): boolean {
          const fn = findFirstMatchingAncestor(region, isFunctionNode);
          return variable.references.some((r) => {
            if (!r.isWrite()) return false;
            const id = r.identifier as Node;
            const inside = id.range[0] >= region.range[0] && id.range[1] <= region.range[1];
            return inside || findFirstMatchingAncestor(id, isFunctionNode) !== fn;
          });
        }

        function known(test: estree.Expression, outcome: boolean): { truthy: estree.Identifier[]; falsy: estree.Identifier[] } {
          const truthy: estree.Identifier[] = [];
          const falsy: estree.Identifier[] = [];
          if (!outcome) {
            if (test.type === 'Identifier') falsy.push(test);
            return { truthy, falsy };
          }
          const operand = (e: estree.Expression) => {
            if (e.type === 'Identifier') truthy.push(e);
            else if (e.type === 'UnaryExpression' && e.operator === '!') {
              if (e.argument.type === 'Identifier') falsy.push(e.argument);
              else if (e.argument.type === 'UnaryExpression' && e.argument.operator === '!' && e.argument.argument.type === 'Identifier') truthy.push(e.argument.argument);
            }
          };
          let current: estree.Expression = test;
          while (current.type === 'LogicalExpression' && current.operator === '&&') {
            operand(current.right);
            current = current.left;
          }
          operand(current);
          return { truthy, falsy };
        }

        function enterBranch(ifStatement: estree.IfStatement, branch: Node, outcome: boolean) {
          const { truthy, falsy } = known(ifStatement.test, outcome);
          const scope = context.sourceCode.getScope(ifStatement);
          const facts: Fact[] = [];
          for (const [ids, value] of [[truthy, true], [falsy, false]] as const) {
            for (const id of ids) {
              const variable = scope.references.find((r) => r.identifier === id)?.resolved;
              if (variable && !mightBeWritten(variable, branch)) facts.push({ variable, truthy: value, origin: id });
            }
          }
          branches.set(branch, facts);
        }

        function isCondition(node: Node): boolean {
          const parent = node.parent;
          if (!parent) return false;
          if (parent.type === 'IfStatement') return parent.test === node;
          if (parent.type === 'LogicalExpression') return parent.operator === '&&' || (parent.operator === '||' && parent.left === node);
          return parent.type === 'UnaryExpression' && parent.operator === '!';
        }

        return {
          'IfStatement > .consequent'(node: Node) {
            enterBranch(node.parent as estree.IfStatement, node, true);
          },
          'IfStatement > .alternate'(node: Node) {
            enterBranch(node.parent as estree.IfStatement, node, false);
          },
          'IfStatement > .consequent:exit'(node: estree.Node) {
            branches.delete(node);
          },
          'IfStatement > .alternate:exit'(node: estree.Node) {
            branches.delete(node);
          },
          Identifier(node: Node & estree.Identifier) {
            if (!isCondition(node)) return;
            const variable = context.sourceCode.getScope(node).references.find((r) => r.identifier === node)?.resolved;
            if (!variable) return;
            for (const facts of branches.values()) {
              const fact = facts.find((f) => f.variable === variable);
              if (!fact) continue;
              const value = fact.truthy ? 'truthy' : 'falsy';
              report(context, { message, data: { value }, node }, [toSecondaryLocation(fact.origin, `Evaluated here to be ${value}`)]);
            }
          },
        } as Rule.RuleListener;
      },
    };
hints:
  - "For `outcome === true`, walk down the left spine of an `&&` chain: `a && b && c` is `(a && b) && c`. Each operand is an identifier (truthy), `!x` (x falsy) or `!!x` (x truthy)."
  - "An identifier is in a condition position when its parent is an `if` whose `test` it is, an `&&` expression, an `||` expression whose `left` it is, or a `!`."
  - "Only branches currently being visited are in the map, because each is removed when the walk leaves it: any fact you find there holds at this identifier."
solution: |
  Two maps keyed by branch, filled when the walk enters a branch and emptied when it leaves, are all the "flow analysis" the rule needs: the syntax tree guarantees that the branch runs after its test. The cautious `mightBeWritten` makes `written` and `callback` quiet. In `written`, the fact would be wrong (count was decremented); in `callback`, it would be right on any path where the callback has not run yet, but the rule cannot know when it runs. In `chain`, `b && !c` raises two issues: `b` is known truthy and `c` known truthy, so `!c` is always false, and S2589 reports the identifiers, not the expression. SonarJS's version also reports `if (true)`, and skips the right operand of a top-level `&&` inside JSX, the idiom for conditional rendering. Run it on the corpus: it finds the nested `if (board)` in Corkboard's notices.
```

## Guard clauses

The commonest way to make a variable's value known is not nesting but an early exit:

```ts
export function digest(user: Account | undefined, posts: Post[]): string {
  if (!user) {
    return '';
  }
  …
  if (user && post.author === user.name) {   // user is always truthy here
```

After `if (!user) return '';`, `user` is truthy for the rest of the block, but the rest of the block is not inside any branch, and the branch-local rule sees nothing. Recognising this needs one bit of flow information: whether the `then` branch can complete normally, or always leaves (`return`, `throw`, `break`, `continue`). That is exactly the code path question of chapter 12: at the end of the branch, is any current segment reachable?

## Exercise: guard clauses

```rule
id: without-a-cfg/gratuitous-guards
title: Gratuitous conditions after guard clauses
key: S2589
corpus: true
inspector: [paths, tree]
prompt: |
  Extend the branch-local rule (the starter is its reference solution, plus segment tracking). When an `if` without `else` has a `then` branch that cannot complete normally, what its test says when *false* holds for the statements after it, until the end of its enclosing block: add those facts in `IfStatement:exit`, keyed by the enclosing block, and remove them when the walk leaves the block. A guard's test `!x` makes `x` truthy afterwards, `x` makes it falsy, `a || b` makes both falsy. Drop a fact when its variable is written later in the block, or in another function.
files:
  rule.ts: |
    import type { Rule, Scope } from 'eslint';
    import type estree from 'estree';
    import { generateMeta } from '../helpers/generate-meta.js';
    import { report, toSecondaryLocation } from '../helpers/location.js';
    import { findFirstMatchingAncestor } from '../helpers/ancestor.js';
    import { isFunctionNode } from '../helpers/ast.js';

    type Node = estree.Node & { parent?: Node; range: [number, number] };
    type Fact = { variable: Scope.Variable; truthy: boolean; origin: estree.Identifier };

    const message = 'This always evaluates to {{value}}. Consider refactoring this code.';

    export const rule: Rule.RuleModule = {
      meta: generateMeta({ sonarKey: 'S2589', hasSecondaries: true }, { messages: { refactorBooleanExpression: message } }),
      create(context) {
        const branches = new Map<estree.Node, Fact[]>();
        let currentSegments = new Set<Rule.CodePathSegment>();
        const segmentStack: Set<Rule.CodePathSegment>[] = [];
        /** If statements whose `then` branch cannot complete normally. */
        const guards = new Set<estree.Node>();

        function mightBeWritten(variable: Scope.Variable, region: Node): boolean {
          const fn = findFirstMatchingAncestor(region, isFunctionNode);
          return variable.references.some((r) => {
            if (!r.isWrite()) return false;
            const id = r.identifier as Node;
            const inside = id.range[0] >= region.range[0] && id.range[1] <= region.range[1];
            return inside || findFirstMatchingAncestor(id, isFunctionNode) !== fn;
          });
        }

        function known(test: estree.Expression, outcome: boolean): { truthy: estree.Identifier[]; falsy: estree.Identifier[] } {
          const truthy: estree.Identifier[] = [];
          const falsy: estree.Identifier[] = [];
          if (!outcome) {
            if (test.type === 'Identifier') falsy.push(test);
            return { truthy, falsy };
          }
          const operand = (e: estree.Expression) => {
            if (e.type === 'Identifier') truthy.push(e);
            else if (e.type === 'UnaryExpression' && e.operator === '!') {
              if (e.argument.type === 'Identifier') falsy.push(e.argument);
              else if (e.argument.type === 'UnaryExpression' && e.argument.operator === '!' && e.argument.argument.type === 'Identifier') truthy.push(e.argument.argument);
            }
          };
          let current: estree.Expression = test;
          while (current.type === 'LogicalExpression' && current.operator === '&&') {
            operand(current.right);
            current = current.left;
          }
          operand(current);
          return { truthy, falsy };
        }

        function enterBranch(ifStatement: estree.IfStatement, branch: Node, outcome: boolean) {
          const { truthy, falsy } = known(ifStatement.test, outcome);
          const scope = context.sourceCode.getScope(ifStatement);
          const facts: Fact[] = [];
          for (const [ids, value] of [[truthy, true], [falsy, false]] as const) {
            for (const id of ids) {
              const variable = scope.references.find((r) => r.identifier === id)?.resolved;
              if (variable && !mightBeWritten(variable, branch)) facts.push({ variable, truthy: value, origin: id });
            }
          }
          branches.set(branch, facts);
        }

        function isCondition(node: Node): boolean {
          const parent = node.parent;
          if (!parent) return false;
          if (parent.type === 'IfStatement') return parent.test === node;
          if (parent.type === 'LogicalExpression') return parent.operator === '&&' || (parent.operator === '||' && parent.left === node);
          return parent.type === 'UnaryExpression' && parent.operator === '!';
        }

        return {
          onCodePathStart() {
            segmentStack.push(currentSegments);
            currentSegments = new Set();
          },
          onCodePathEnd() {
            currentSegments = segmentStack.pop()!;
          },
          onCodePathSegmentStart(s: Rule.CodePathSegment) {
            currentSegments.add(s);
          },
          onCodePathSegmentEnd(s: Rule.CodePathSegment) {
            currentSegments.delete(s);
          },
          onUnreachableCodePathSegmentStart(s: Rule.CodePathSegment) {
            currentSegments.add(s);
          },
          onUnreachableCodePathSegmentEnd(s: Rule.CodePathSegment) {
            currentSegments.delete(s);
          },
          'IfStatement > .consequent'(node: Node) {
            enterBranch(node.parent as estree.IfStatement, node, true);
          },
          'IfStatement > .alternate'(node: Node) {
            enterBranch(node.parent as estree.IfStatement, node, false);
          },
          'IfStatement > .consequent:exit'(node: Node) {
            branches.delete(node);
            if (![...currentSegments].some((s) => s.reachable)) guards.add(node.parent!);
          },
          'IfStatement > .alternate:exit'(node: estree.Node) {
            branches.delete(node);
          },
          'IfStatement:exit'(node: Node & estree.IfStatement) {
            // TODO: a guard clause makes facts for the rest of its block.
          },
          ':matches(BlockStatement, Program):exit'(node: estree.Node) {
            // TODO
          },
          Identifier(node: Node & estree.Identifier) {
            if (!isCondition(node)) return;
            const variable = context.sourceCode.getScope(node).references.find((r) => r.identifier === node)?.resolved;
            if (!variable) return;
            for (const facts of branches.values()) {
              const fact = facts.find((f) => f.variable === variable);
              if (!fact) continue;
              const value = fact.truthy ? 'truthy' : 'falsy';
              report(context, { message, data: { value }, node }, [toSecondaryLocation(fact.origin, `Evaluated here to be ${value}`)]);
            }
          },
        } as Rule.RuleListener;
      },
    };
fixtures:
  guards.fixture.ts: |
    declare function start(): void;

    export function digest(user: string | undefined, posts: string[]): string[] {
      if (!user) {
        return [];
      }
      return posts.filter((p) => user && p.startsWith(user)); // Noncompliant {{This always evaluates to truthy. Consider refactoring this code.}}
    }

    export function greet(user: string | undefined): string {
      if (!user) {
        console.warn('anonymous');
      }
      if (user) {
        return user;
      }
      return 'hello';
    }

    export function banned(isBanned: boolean, list: string[]): string[] {
      if (isBanned) {
        throw new Error('banned');
      }
      return list.filter(() => !isBanned); // Noncompliant {{This always evaluates to falsy. Consider refactoring this code.}}
    }

    export function refreshed(token: string | undefined, refresh: () => string): string {
      if (!token) {
        return '';
      }
      token = refresh();
      if (token) {
        return token;
      }
      return '';
    }

    export function loop(items: string[]): number {
      let n = 0;
      for (const item of items) {
        if (!item) {
          continue;
        }
        if (item && item.length > 2) { // Noncompliant
          n++;
        }
      }
      return n;
    }
hidden:
  more.fixture.ts: |
    declare function start(): void;

    export function nested(board: string | undefined, sticky: boolean): void {
      if (board && sticky) {
        if (board) start(); // Noncompliant
      }
    }

    export function either(a: boolean, b: boolean): void {
      if (a || b) {
        return;
      }
      if (a) start(); // Noncompliant
      if (b) start(); // Noncompliant
    }

    export function scoped(user: string | undefined): void {
      {
        if (!user) {
          return;
        }
      }
      if (user) start();
    }

    export function elseGuard(x: boolean): void {
      if (x) {
        return;
      } else {
        start();
      }
      if (x) start();
    }
answer:
  rule.ts: |
    import type { Rule, Scope } from 'eslint';
    import type estree from 'estree';
    import { generateMeta } from '../helpers/generate-meta.js';
    import { report, toSecondaryLocation } from '../helpers/location.js';
    import { findFirstMatchingAncestor } from '../helpers/ancestor.js';
    import { isFunctionNode } from '../helpers/ast.js';

    type Node = estree.Node & { parent?: Node; range: [number, number] };
    type Fact = { variable: Scope.Variable; truthy: boolean; origin: estree.Identifier };

    const message = 'This always evaluates to {{value}}. Consider refactoring this code.';

    export const rule: Rule.RuleModule = {
      meta: generateMeta({ sonarKey: 'S2589', hasSecondaries: true }, { messages: { refactorBooleanExpression: message } }),
      create(context) {
        const branches = new Map<estree.Node, Fact[]>();
        let currentSegments = new Set<Rule.CodePathSegment>();
        const segmentStack: Set<Rule.CodePathSegment>[] = [];
        const guards = new Set<estree.Node>();

        function mightBeWritten(variable: Scope.Variable, region: Node): boolean {
          const fn = findFirstMatchingAncestor(region, isFunctionNode);
          return variable.references.some((r) => {
            if (!r.isWrite()) return false;
            const id = r.identifier as Node;
            const inside = id.range[0] >= region.range[0] && id.range[1] <= region.range[1];
            return inside || findFirstMatchingAncestor(id, isFunctionNode) !== fn;
          });
        }

        function known(test: estree.Expression, outcome: boolean): { truthy: estree.Identifier[]; falsy: estree.Identifier[] } {
          const truthy: estree.Identifier[] = [];
          const falsy: estree.Identifier[] = [];
          if (!outcome) {
            if (test.type === 'Identifier') falsy.push(test);
            return { truthy, falsy };
          }
          const operand = (e: estree.Expression) => {
            if (e.type === 'Identifier') truthy.push(e);
            else if (e.type === 'UnaryExpression' && e.operator === '!') {
              if (e.argument.type === 'Identifier') falsy.push(e.argument);
              else if (e.argument.type === 'UnaryExpression' && e.argument.operator === '!' && e.argument.argument.type === 'Identifier') truthy.push(e.argument.argument);
            }
          };
          let current: estree.Expression = test;
          while (current.type === 'LogicalExpression' && current.operator === '&&') {
            operand(current.right);
            current = current.left;
          }
          operand(current);
          return { truthy, falsy };
        }

        /** What a test says when it is false, for a guard: the negation of a lone identifier or of `!x`, or every operand of `||`. */
        function knownWhenFalse(test: estree.Expression): { truthy: estree.Identifier[]; falsy: estree.Identifier[] } {
          const truthy: estree.Identifier[] = [];
          const falsy: estree.Identifier[] = [];
          const operand = (e: estree.Expression) => {
            if (e.type === 'Identifier') falsy.push(e);
            else if (e.type === 'UnaryExpression' && e.operator === '!' && e.argument.type === 'Identifier') truthy.push(e.argument);
          };
          let current: estree.Expression = test;
          while (current.type === 'LogicalExpression' && current.operator === '||') {
            operand(current.right);
            current = current.left;
          }
          operand(current);
          return { truthy, falsy };
        }

        function addFacts(ids: { truthy: estree.Identifier[]; falsy: estree.Identifier[] }, scope: Scope.Scope, region: Node, key: estree.Node, after: number) {
          const facts = branches.get(key) ?? [];
          for (const [list, value] of [[ids.truthy, true], [ids.falsy, false]] as const) {
            for (const id of list) {
              const variable = scope.references.find((r) => r.identifier === id)?.resolved;
              if (!variable) continue;
              const fn = findFirstMatchingAncestor(region, isFunctionNode);
              const written = variable.references.some((r) => {
                if (!r.isWrite()) return false;
                const w = r.identifier as Node;
                return (w.range[0] >= after && w.range[1] <= region.range[1]) || findFirstMatchingAncestor(w, isFunctionNode) !== fn;
              });
              if (!written) facts.push({ variable, truthy: value, origin: id });
            }
          }
          branches.set(key, facts);
        }

        function enterBranch(ifStatement: estree.IfStatement, branch: Node, outcome: boolean) {
          const { truthy, falsy } = known(ifStatement.test, outcome);
          const scope = context.sourceCode.getScope(ifStatement);
          const facts: Fact[] = [];
          for (const [ids, value] of [[truthy, true], [falsy, false]] as const) {
            for (const id of ids) {
              const variable = scope.references.find((r) => r.identifier === id)?.resolved;
              if (variable && !mightBeWritten(variable, branch)) facts.push({ variable, truthy: value, origin: id });
            }
          }
          branches.set(branch, facts);
        }

        function isCondition(node: Node): boolean {
          const parent = node.parent;
          if (!parent) return false;
          if (parent.type === 'IfStatement') return parent.test === node;
          if (parent.type === 'LogicalExpression') return parent.operator === '&&' || (parent.operator === '||' && parent.left === node);
          return parent.type === 'UnaryExpression' && parent.operator === '!';
        }

        return {
          onCodePathStart() {
            segmentStack.push(currentSegments);
            currentSegments = new Set();
          },
          onCodePathEnd() {
            currentSegments = segmentStack.pop()!;
          },
          onCodePathSegmentStart(s: Rule.CodePathSegment) {
            currentSegments.add(s);
          },
          onCodePathSegmentEnd(s: Rule.CodePathSegment) {
            currentSegments.delete(s);
          },
          onUnreachableCodePathSegmentStart(s: Rule.CodePathSegment) {
            currentSegments.add(s);
          },
          onUnreachableCodePathSegmentEnd(s: Rule.CodePathSegment) {
            currentSegments.delete(s);
          },
          'IfStatement > .consequent'(node: Node) {
            enterBranch(node.parent as estree.IfStatement, node, true);
          },
          'IfStatement > .alternate'(node: Node) {
            enterBranch(node.parent as estree.IfStatement, node, false);
          },
          'IfStatement > .consequent:exit'(node: Node) {
            branches.delete(node);
            if (![...currentSegments].some((s) => s.reachable)) guards.add(node.parent!);
          },
          'IfStatement > .alternate:exit'(node: estree.Node) {
            branches.delete(node);
          },
          'IfStatement:exit'(node: Node & estree.IfStatement) {
            const block = node.parent;
            if (!guards.has(node) || node.alternate || !block || (block.type !== 'BlockStatement' && block.type !== 'Program')) return;
            addFacts(knownWhenFalse(node.test), context.sourceCode.getScope(node), block, block, node.range[1]);
          },
          ':matches(BlockStatement, Program):exit'(node: estree.Node) {
            branches.delete(node);
          },
          Identifier(node: Node & estree.Identifier) {
            if (!isCondition(node)) return;
            const variable = context.sourceCode.getScope(node).references.find((r) => r.identifier === node)?.resolved;
            if (!variable) return;
            for (const facts of branches.values()) {
              const fact = facts.find((f) => f.variable === variable);
              if (!fact) continue;
              const value = fact.truthy ? 'truthy' : 'falsy';
              report(context, { message, data: { value }, node }, [toSecondaryLocation(fact.origin, `Evaluated here to be ${value}`)]);
            }
          },
        } as Rule.RuleListener;
      },
    };
hints:
  - "A guard's test is false for the rest of the block: write `knownWhenFalse(test)`, the dual of `known(test, true)`: `x` gives falsy, `!x` gives truthy, and `a || b || c` gives each operand's fact."
  - "Store the facts in the same `branches` map, keyed by the enclosing `BlockStatement` (or `Program`), and delete them in `':matches(BlockStatement, Program):exit'`. The walk visits the statements after the guard while the block is still open."
  - "The write check differs from the branch's: a write before the guard (a `for…of` head, a declaration) does not matter, a write after it in the block does."
solution: |
  The extension uses exactly one bit of flow information, whether the guard's branch can complete, and gets it from the code path at the right moment, as S3801 did in chapter 12. With it, the rule understands the guard-clause style that most code uses, and the corpus shows the difference: a ruling diff with new issues in Corkboard's `digest.ts`, where `user` is tested again after a guard, and in `editable`, where `!banned` is tested in a callback after `if (banned) return []`. `greet` stays quiet because its `if` does not exit. Each refinement is still a pattern: `scoped` puts the guard in an inner block and loses it (correctly, the facts are cleared at the block's end, but the inner block cannot complete either, so a smarter rule could keep them); `elseGuard` exits in the `then` branch of an `if` with an `else`, which this version ignores. A flow-sensitive analysis handles every such shape at once, at the cost of the machinery of chapters 12 to 15.
```

## The flow-sensitive version

A dataflow analysis can track what is known about each variable's truthiness at every point: a flat lattice per variable, `truthy`, `falsy`, unknown (⊤), with assignments as transfer functions. What makes it learn from conditions is a refinement on the *edges* of the graph rather than its nodes: the edge out of `if (!user)` taken when the test is false carries `user: truthy`, the other edge `user: falsy`. At the join after the `if`, the branch that returned contributes nothing, and the fact survives. Every shape of the previous exercise falls out of the same equations, including guards in inner blocks, `else` branches that exit, and loops.

:::fixpoint-stepper{n="16.1" analysis="truthiness" title="Truthiness, refined along branches" subtitle="Each edge out of a condition carries what the condition says on that side."}
```js
function digest(user, posts) {
  if (!user) {
    return '';
  }
  let lines = '';
  for (const post of posts) {
    if (user && post) {
      lines = lines + post;
    }
  }
  if (lines) {
    log(lines);
  }
  return lines;
}
```
:::

Run it to the fixpoint and look at the node `if (user && post)`: `user` is truthy there, on every path. A rule built on this analysis would report it, wherever the guard is.

ESLint's code paths make this harder than it sounds. Their segments say which segment follows which, but not which edge corresponds to a condition being true: a rule must reconstruct that from the order of events (the segment that starts in an `if`'s consequent is its true branch), which is fragile for loops, `&&` and `||` chains, and `switch`. The course's statement-level graph records the true edge of each condition explicitly. This is one reason analysers that do serious flow-sensitive reasoning build their own intermediate representation instead of working on the syntax tree, as Part V's engines will.

## What a corpus says

Which version should a product ship? The corpus experiment answers part of the question. On Corkboard, the branch-local rule raises one issue; the guard-clause version raises the same one plus two more, both true positives; the flow-sensitive analysis would raise the same three. On a few hundred lines that proves little, but SonarJS's ruling runs every rule on millions of lines of open-source code, and the same comparison there says how many new issues a change brings, and the review of a sample of them says how many are worth it.

What the experiment cannot show is the cost: each refinement adds code to maintain, and a flow-sensitive rule adds analysis time to every file. The branch-local rule is the version that has shipped in SonarJS for years, which says something about where its authors found the balance for this rule. Chapter 21 is about how that balance is found.

## What comes next

Part III is complete: control flow, the dataflow framework, and the two classic analyses SonarJS runs, with their limits. Part IV leaves individual rules and follows an issue through SonarJS's whole architecture, from the scanner that finds the files to the IDE that shows the issue.
