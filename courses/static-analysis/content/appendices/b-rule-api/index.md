---
number: B
title: The rule API
summary: ESLint rules at a glance, as SonarJS writes them. The rule module, the context, selectors, reporting and fixes, code-path events, parser services, and the comment-based test format.
---

A quick reference for writing rules in the workbench, with the chapter that explains each part. The API is ESLint's (version 9), as SonarJS uses it.

## The rule module

```ts
import type { Rule } from 'eslint';
import { generateMeta } from '../helpers/generate-meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(
    { sonarKey: 'S1764' },                       // what RSPEC and meta.ts say (chapters 3, 20)
    { messages: { identical: 'Correct one of the identical sub-expressions on both sides of operator "{{operator}}"' } },
  ),
  create(context) {
    return {
      BinaryExpression(node) { /* … */ },        // one listener per selector
      'Program:exit'() { /* … */ },
    };
  },
};
```

## The context

| Member | What it gives |
|---|---|
| `context.sourceCode` | the file: `text`, `ast`, `getText(node)`, `getTokens(node)`, `getFirstToken(node)`, `getCommentsBefore(node)`, `getScope(node)`, `getDeclaredVariables(node)`, `getLocFromIndex(i)` (chapters 2, 7) |
| `context.report(descriptor)` | reports an issue (below) |
| `context.options` | the rule's options from the configuration (chapter 10) |
| `context.settings` | shared settings; SonarJS sets `sonarRuntime`, the file type and others (chapters 5, 18) |
| `context.filename` | the file's path |
| `context.sourceCode.parserServices` | the TypeScript program and node maps, when there are types (chapter 9) |

## Selectors

Listener keys are esquery selectors (chapter 3):

| Selector | Matches |
|---|---|
| `CallExpression` | every node of that type |
| `CallExpression:exit` | the same, after its children |
| `CallExpression > MemberExpression.callee` | a member expression that is the callee of a call |
| `IfStatement BlockStatement` | a block anywhere inside an `if` |
| `BinaryExpression[operator='===']` | an attribute test |
| `Identifier[name=/^is/]` | a regular-expression test |
| `:matches(FunctionDeclaration, ArrowFunctionExpression)` | either |
| `VariableDeclarator:not([init])` | a negation |

## Reporting

```ts
context.report({
  node,                                  // or loc: { start, end }
  messageId: 'identical',                // or message: '…'
  data: { operator: node.operator },     // fills {{operator}}
  fix: (fixer) => fixer.replaceText(node, 'x'),               // automatic fix (meta.fixable)
  suggest: [{ desc: 'Use x', fix: (fixer) => fixer.replaceText(node, 'x') }], // suggestions (meta.hasSuggestions)
});
```

The fixer offers `replaceText`, `replaceTextRange`, `insertTextBefore`, `insertTextAfter`, `remove` and `removeRange`. For secondary locations and a cost, use the kit's `report` and `toSecondaryLocation` (chapter 5), which encode them in the message when `sonarRuntime` is set.

## Code-path events

| Listener | Called |
|---|---|
| `onCodePathStart(codePath, node)` | when a function (or the program) begins |
| `onCodePathEnd(codePath, node)` | when it ends: `codePath.returnedSegments`, `thrownSegments`, `finalSegments` are known |
| `onCodePathSegmentStart(segment, node)` | when a segment begins; `segment.reachable`, `prevSegments`, `nextSegments` |
| `onCodePathSegmentEnd(segment, node)` | when it ends |
| `onCodePathSegmentLoop(from, to, node)` | for a back edge of a loop |
| `onUnreachableCodePathSegmentStart` / `End` | the same, for unreachable segments |

Chapter 12 explains segments and how rules track the current ones.

## Parser services

```ts
import { isRequiredParserServices } from '../helpers/parser-services.js';

const services = context.sourceCode.parserServices;
if (isRequiredParserServices(services)) {
  const checker = services.program.getTypeChecker();
  const tsNode = services.esTreeNodeToTSNodeMap.get(node);
  const type = checker.getTypeAtLocation(tsNode);
}
```

Without a program (plain JavaScript without a tsconfig, or the IDE before the program is ready), type-dependent rules must stay silent (chapter 9).

## Comment-based tests

Fixtures name the issues they expect in comments (chapter 4):

| Comment | Meaning |
|---|---|
| `// Noncompliant` at the end of a line | one issue on this line, any message |
| `// Noncompliant {{message}}` | one issue, with this message |
| `// Noncompliant {{one}} {{two}}` | two issues on this line |
| `// Noncompliant@+1`, `@-2`, `@12` | the issue is on another line |
| `//   ^^^^` on the next line | the primary location's columns |
| `//   ^^^<  {{message}}` | a secondary location after the primary one |
| `//   ^^^>` | a secondary location before the primary one |
| `// Noncompliant [[qf1]]`, then `// fix@qf1 {{description}}` and `// edit@qf1 {{new line}}` | a suggestion and its result |
| `[[qf1!]]` | an automatic fix instead of a suggestion |

Every line without a `Noncompliant` comment must produce no issue.

## Workbench modules

Besides the kit (appendix C), rules and tests in the workbench can import two modules of the course:

- `workbench:test` in helper exercises' tests: `test`, `expect` and `lintCode`.
- `workbench:taint` in rules: `findTaintFlows(sourceCode, config)`, `isRequestSource` and `allowlistValidates`, the taint analysis of chapter 29.
