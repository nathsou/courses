---
title: Anatomy of a rule
summary: Visitors and selectors, the rule context, a SonarJS rule folder, and your own areEquivalent behind S1764.
number: 3
duration: 60 minutes
prerequisites: [source-to-estree]
---

You have written two rules already, mostly by filling in blanks. This chapter takes a rule apart: what ESLint does with the object you export, in what order it calls your code, what the `context` argument offers, and how SonarJS lays a rule out on disk. At the end you rebuild S1764, the rule from chapter 0, including the helper it stands on.

## A rule is an object with a `create` function

An ESLint rule is a module that exports an object with two parts:

```typescript
import type { Rule } from 'eslint';

export const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    messages: { identical: 'Correct one of the identical sub-expressions on both sides of operator "{{operator}}"' },
    schema: [],
  },
  create(context) {
    return {
      BinaryExpression(node) {
        /* … */
      },
    };
  },
};
```

`meta` describes the rule: its kind (`problem`, `suggestion` or `layout`), its documentation, its **messages** (keyed by a message id, with `{{placeholders}}`), the **schema** of the options it accepts, and whether it can fix code (`fixable`) or offer suggestions (`hasSuggestions`).

`create` is called **once per file**. It receives the rule's `context` and returns an object of **listeners**: functions keyed by the syntax they want to see. ESLint then walks the file's tree once, for all rules together, and calls each listener whose key matches the node it is visiting. Anything `create` sets up before returning, such as a counter, a stack or a map, lives exactly as long as the analysis of that one file. That is where rules keep state.

## The traversal

ESLint walks the tree depth first, from the `Program` down, children in source order, following the visitor keys of chapter 2. Each node is **entered** before its children and **exited** after them. A listener keyed by a node type is called on entry; adding `:exit` to the key calls it on exit instead.

The two events are what make many rules possible. A rule counting the nesting depth of functions increments a counter on `FunctionDeclaration` and decrements it on `FunctionDeclaration:exit`. A rule that needs to see a whole function before deciding anything collects facts while the function's body is visited and reports in the `:exit` listener, when all the facts are in. Chapter 6's Cognitive Complexity rule works exactly like that.

Because the walk is a single pass for all rules, rules cannot ask ESLint to visit a node twice, or to visit nodes in another order. A rule that needs another order, for example to look at a variable's later uses, uses the scope analysis (chapter 7) or collects what it needs and decides at `Program:exit`.

## Selectors

The key of a listener is not just a node type: it is a **selector**, a small query language modelled on CSS selectors and implemented by the `esquery` library. A selector can say which node to match, and also where it must sit in the tree:

| Selector | Matches |
|---|---|
| `CallExpression` | every call |
| `CallExpression > MemberExpression.callee` | a member expression that is the callee of a call (`a.b` in `a.b()`) |
| `BinaryExpression[operator="==="]` | strict equality comparisons |
| `IfStatement > BlockStatement.alternate` | the `else { … }` block of an `if` |
| `:matches(FunctionDeclaration, ArrowFunctionExpression)` | either kind of function |
| `Literal[value=null]` | the literal `null` |
| `CallExpression:not([arguments.length=0])` | calls with arguments |
| `Program:exit` | the end of the file |

`>` means "child of", a space means "descendant of", and `.key` after a type restricts the match to a node held under that key by its parent. Try them in the lab below, or write your own. The list on the right is in the order a listener with that selector would be called.

:::selector-lab{n="3.1" selector="CallExpression > MemberExpression.callee" presets="CallExpression|CallExpression > MemberExpression.callee|BinaryExpression[operator='===']|IfStatement > BlockStatement.alternate|:matches(FunctionDeclaration, ArrowFunctionExpression)|Identifier[name=/^is/]|CallExpression:exit"}
```ts
function isPinned(post: { pinned: boolean }) {
  return post.pinned === true;
}

if (isPinned(post)) {
  logger.info(post.title.toUpperCase());
} else {
  const count = posts.filter((p) => isPinned(p)).length;
  console.log(count);
}
```
:::

Notice the order for `CallExpression:exit` compared with `CallExpression`: on exit, an inner call such as `post.title.toUpperCase()` comes before the call that contains it.

Selectors are convenient, but a rule can do the same filtering in its listener with ordinary code, and most SonarJS rules do: they listen to a node type and check the node's properties in TypeScript. Both styles appear in this course.

## The context

The `context` passed to `create` is the rule's whole view of the world:

- `context.sourceCode` is the parsed file: `text`, `ast`, the tokens and comments (`getTokens`, `getTokenBefore`, `getTokenAfter`, `getCommentsInside`, …), `getText(node)` for a node's source text, `getAncestors(node)` for the path up to the root, `getScope(node)` for the scope analysis (chapter 7), and `parserServices` for type information (chapter 9).
- `context.report(descriptor)` raises an issue.
- `context.options` holds the rule's options, as configured (for SonarJS, from the rule's parameters in the quality profile).
- `context.settings` holds settings shared by all rules. SonarJS uses it to tell its rules they are running inside the analyser (`settings.sonarRuntime`, chapter 5).
- `context.filename` and `context.languageOptions` say which file this is and how it was parsed.

A report needs a location and a message. The location is a `node` (the issue covers the node's source range) or an explicit `loc`. The message is either the text itself (`message`) or a `messageId` from `meta.messages`, with `data` for the placeholders. A report can also carry a `fix` or `suggest`ions, which chapter 5 covers.

```quiz
q: "A rule wants to report a function whose body contains more than three `return` statements. Where should it report?"
options:
  - text: "In the `ReturnStatement` listener, as soon as the fourth one is seen."
    why: "That works, but the rule would report once per extra return instead of once per function, and it needs a counter per function anyway."
  - text: "In a `FunctionDeclaration:exit` listener (and the same for the other function kinds), after counting the returns seen since the function was entered."
    correct: true
    why: "The count is complete only when the whole body has been visited. A stack of counters, pushed on entry and popped on exit, handles nested functions."
  - text: "In the `FunctionDeclaration` listener."
    why: "On entry, none of the body has been visited yet: there is nothing to count."
```

## A rule in SonarJS

In SonarJS, each rule is a folder under `packages/analysis/src/jsts/rules/`, named after its rule key. S1764's folder holds:

| File | What it holds |
|---|---|
| `index.ts` | `export { rule } from './rule.js'` (for reused rules, the code that builds the rule, chapter 10) |
| `meta.ts` | how the rule is implemented: `implementation = 'original'`, its ESLint name `eslintId = 'no-identical-expressions'`, `hasSecondaries = true` |
| `generated-meta.ts` | what RSPEC says about the rule: its type, description, whether it is in the Sonar way profile, whether it needs type information, its scope and languages; generated by `npm run generate-meta` and not committed |
| `rule.ts` | the rule itself |
| `unit.test.ts` | tests with ESLint's RuleTester |

Other folders add `cb.fixture.*` files and a `cb.test.ts` for comment-based tests (chapter 4), and `config.ts` for rules with parameters.

::source{path="packages/analysis/src/jsts/rules/S1764/meta.ts" symbol="hasSecondaries" title="S1764's meta.ts" note="Three lines: implementation, eslintId and hasSecondaries."}

The rule's `meta` is built by `generateMeta(meta, { messages: … })`, where `meta` is the whole `generated-meta.ts` module. `generateMeta` merges the RSPEC side with what the rule declares, checks that a rule RSPEC marks as having a quick fix really has one, and adds the special message `sonarRuntime` used to carry secondary locations when `hasSecondaries` is set.

::source{path="packages/analysis/src/jsts/rules/helpers/generate-meta.ts" symbol="generateMeta"}

At the pinned commit, SonarJS has 582 rule folders. `implementation` says what kind of rule each is: 296 are **original** rules written for SonarJS, 121 are **decorated** rules that wrap an existing ESLint rule and adjust its reports, and 165 are **external** rules taken as they are from ESLint or one of its plugins under a Sonar key. Chapter 10 is about the last two kinds.

Inside SonarQube, every rule is registered under its Sonar key (ESLint sees S1764 as `sonarjs/S1764`). The same original rules are also published to npm as **eslint-plugin-sonarjs**, under their `eslintId` (`sonarjs/no-identical-expressions`), so they can run in any ESLint setup; the plugin's `recommended` configuration turns on the rules that are in the Sonar way profile. Chapter 20 follows how a rule gets from its folder into both.

## Exercise: rebuild `areEquivalent`

S1764 stands on one helper: `areEquivalent(first, second, sourceCode)`, which decides whether two subtrees are "the same expression". SonarJS's version compares the nodes' types, then their tokens: same number of tokens, and each pair with the same value. Spaces and comments are not tokens, so they do not count; `a.b` and `a['b']` have different tokens, so they are different.

```helper
id: anatomy-of-a-rule/are-equivalent
title: Two expressions are the same expression
prompt: |
  Implement `areEquivalent` in `helpers/equivalence.ts`. Two arrays of nodes are equivalent when they have the same length and are equivalent pairwise. Two nodes are equivalent when they have the same `type` and the same tokens, compared by `type` and `value`. Run the tests with **Run**; **Submit** adds hidden ones.
files:
  helpers/equivalence.ts: |
    import type { SourceCode } from 'eslint';
    import type estree from 'estree';

    export function areEquivalent(first: estree.Node | estree.Node[], second: estree.Node | estree.Node[], sourceCode: SourceCode): boolean {
      // TODO: arrays, then node types, then tokens (sourceCode.getTokens(node)).
      return false;
    }
tests:
  equivalence.test.ts: |
    import type { Rule } from 'eslint';
    import { test, expect, lintCode } from 'workbench:test';
    import { areEquivalent } from '../rules/helpers/equivalence.js';

    // A rule that reports every binary expression whose two sides are equivalent.
    const rule: Rule.RuleModule = {
      create: (context) => ({
        BinaryExpression(node) {
          if (areEquivalent(node.left, node.right, context.sourceCode)) context.report({ node, message: 'same' });
        },
      }),
    };
    const same = (code: string) => lintCode(code, rule, undefined, false).length === 1;

    test('identical text', () => expect(same('a.b + a.b')).toBe(true));
    test('spaces and comments do not count', () => expect(same('a . b + a/* note */.b')).toBe(true));
    test('different names', () => expect(same('a + b')).toBe(false));
    test('dot and bracket access differ', () => expect(same("a.b + a['b']")).toBe(false));
    test('calls with the same arguments', () => expect(same('f(x, y) - f(x, y)')).toBe(true));
hiddenTests:
  more.test.ts: |
    import type { Rule } from 'eslint';
    import type estree from 'estree';
    import { test, expect, lintCode } from 'workbench:test';
    import { areEquivalent } from '../rules/helpers/equivalence.js';

    const rule: Rule.RuleModule = {
      create: (context) => ({
        BinaryExpression(node) {
          if (areEquivalent(node.left, node.right, context.sourceCode)) context.report({ node, message: 'same' });
        },
        CallExpression(node) {
          const args = node.arguments as estree.Node[];
          if (args.length === 4 && areEquivalent(args.slice(0, 2), args.slice(2), context.sourceCode)) context.report({ node, message: 'pairs' });
        },
      }),
    };
    const issues = (code: string) => lintCode(code, rule, undefined, false).map((i) => i.message);

    test('different literals', () => expect(issues('1 - 2')).toEqual([]));
    test('a prefix is not the same', () => expect(issues('a.b.c - a.b')).toEqual([]));
    test('quotes are part of a string token', () => expect(issues(`'x' + "x"`)).toEqual([]));
    test('arrays, pairwise', () => expect(issues('f(a, b, a, b)')).toEqual(['pairs']));
    test('arrays, different', () => expect(issues('f(a, b, b, a)')).toEqual([]));
    test('nested structure', () => expect(issues('(a + b) * c - (a + b) * c')).toEqual(['same']));
answer:
  helpers/equivalence.ts: |
    import type { SourceCode } from 'eslint';
    import type estree from 'estree';

    export function areEquivalent(first: estree.Node | estree.Node[], second: estree.Node | estree.Node[], sourceCode: SourceCode): boolean {
      if (Array.isArray(first) && Array.isArray(second)) {
        return first.length === second.length && first.every((node, i) => areEquivalent(node, second[i]!, sourceCode));
      }
      if (Array.isArray(first) || Array.isArray(second)) return false;
      if (first.type !== second.type) return false;
      const a = sourceCode.getTokens(first);
      const b = sourceCode.getTokens(second);
      return a.length === b.length && a.every((token, i) => token.type === b[i]!.type && token.value === b[i]!.value);
    }
hints:
  - "`sourceCode.getTokens(node)` returns the node's tokens in order, comments excluded. Hover over `getTokens` in the editor to see its signature."
  - "Handle the arrays first, then the case where only one argument is an array (not equivalent), then single nodes."
solution: |
  Comparing tokens rather than walking both trees in parallel is short and catches what matters for S1764: same operators, same names, same literals, same nesting. Its blind spots are deliberate. `'x'` and `"x"` are the same string written with different quotes, but their tokens differ, so they are not equivalent; and `a + b` is not equivalent to `b + a`, though for numbers they are equal. An equivalence that knew about such cases would be a semantic one, and much harder to get right. SonarJS's own version also accepts a custom token comparison, which some rules use.
```

## Exercise: S1764

Now the rule itself. The folder below has the three files of a SonarJS rule. `meta.ts` and `generated-meta.ts` are read-only: in SonarJS the second one is generated from RSPEC, here it is written out. You edit `rule.ts`, which uses the kit's `areEquivalent` (the same as the one you just wrote).

S1764's details, as SonarJS implements them:

- It checks `&&`, `||`, `/`, `-`, `<<`, `>>`, `<`, `<=`, `>` and `>=`, and the equality operators `==`, `===`, `!=`, `!==`, but not `+` or `*` (`a + a` and `a * a` are normal ways to double and square).
- For equality operators, it skips the case where **both** operands are plain identifiers: `x !== x` is how JavaScript tests for `NaN`.
- It skips `1 << 1`, a common way of writing a bit flag.
- The issue goes on the right operand, with the left operand as a secondary location.

```rule
id: anatomy-of-a-rule/s1764
title: Identical sub-expressions
key: S1764
corpus: true
inspector: [tree, tokens]
prompt: |
  The starter rule flags every binary expression whose sides are equivalent, on the whole expression. Make it match the behaviour described above. Report with the kit's `report` (from `../helpers/location.js`), passing `message`, `messageId`, `data` and `node`, and a secondary location built with `toSecondaryLocation(left)`.
readonly: [meta.ts, generated-meta.ts]
files:
  rule.ts: |
    import type { Rule } from 'eslint';
    import type estree from 'estree';
    import { areEquivalent } from '../helpers/equivalence.js';
    import { generateMeta } from '../helpers/generate-meta.js';
    import * as meta from './generated-meta.js';

    const message = 'Correct one of the identical sub-expressions on both sides of operator "{{operator}}"';

    export const rule: Rule.RuleModule = {
      meta: generateMeta(meta, { messages: { identical: message } }),
      create(context) {
        return {
          BinaryExpression(node: estree.BinaryExpression) {
            if (areEquivalent(node.left as estree.Node, node.right, context.sourceCode)) {
              context.report({ node, messageId: 'identical', data: { operator: node.operator } });
            }
          },
        };
      },
    };
  meta.ts: |
    export const implementation = 'original';
    export const eslintId = 'no-identical-expressions';
    export const hasSecondaries = true;
  generated-meta.ts: |
    // In SonarJS this file is generated from the rule's RSPEC entry by `npm run generate-meta`.
    export * from './meta.js';

    export const meta = {
      type: 'problem' as const,
      docs: {
        description: 'Identical expressions should not be used on both sides of a binary operator',
        recommended: true,
        url: 'https://sonarsource.github.io/rspec/#/rspec/S1764/javascript',
        requiresTypeChecking: false,
      },
    };
    export const sonarKey = 'S1764';
    export const scope = 'Main';
    export const languages: ('js' | 'ts')[] = ['js', 'ts'];
fixtures:
  cb.fixture.ts: |
    declare let a: number, b: number, x: number;
    declare const box: { size: number };

    if (a == b) {}
    if (box.size === box.size) {} // Noncompliant {{Correct one of the identical sub-expressions on both sides of operator "==="}}
    //  ^^^^^^^^>    ^^^^^^^^
    if (x !== x) {} // a NaN check: two identifiers
    if (a > 0 && a > 0) {} // Noncompliant {{Correct one of the identical sub-expressions on both sides of operator "&&"}}
    const difference = a - a; // Noncompliant
    const square = a * a;
    const double = a + a;
    const flag = 1 << 1;
    const shifted = 2 << 2; // Noncompliant
hidden:
  more.fixture.ts: |
    declare let a: number, b: number;
    declare const user: { name?: string; isAdmin(): boolean };
    const ratio = (a + b) / (a + b); // Noncompliant
    if (user.isAdmin() || user.isAdmin()) {} // Noncompliant
    if (a === a) {}
    if (a.toFixed() === a.toFixed()) {} // Noncompliant
    const name = user.name ?? user.name;
    if (a <= a) {} // Noncompliant
    const masked = a & a;
answer:
  rule.ts: |
    import type { Rule } from 'eslint';
    import type estree from 'estree';
    import { areEquivalent } from '../helpers/equivalence.js';
    import { generateMeta } from '../helpers/generate-meta.js';
    import { isIdentifier, isLiteral } from '../helpers/ast.js';
    import { report, toSecondaryLocation } from '../helpers/location.js';
    import * as meta from './generated-meta.js';

    const message = 'Correct one of the identical sub-expressions on both sides of operator "{{operator}}"';
    const EQUALITY = new Set(['==', '===', '!=', '!==']);
    const RELEVANT = new Set(['&&', '||', '/', '-', '<<', '>>', '<', '<=', '>', '>=']);

    type Binary = estree.BinaryExpression | estree.LogicalExpression;

    function hasRelevantOperator(node: Binary): boolean {
      return RELEVANT.has(node.operator) || (EQUALITY.has(node.operator) && !(isIdentifier(node.left as estree.Node) && isIdentifier(node.right)));
    }

    function isOneOntoOneShifting(node: Binary): boolean {
      return node.operator === '<<' && isLiteral(node.left as estree.Node) && (node.left as estree.Literal).value === 1;
    }

    export const rule: Rule.RuleModule = {
      meta: generateMeta(meta, { messages: { identical: message } }),
      create(context) {
        function check(node: Binary) {
          const left = node.left as estree.Node;
          if (hasRelevantOperator(node) && !isOneOntoOneShifting(node) && areEquivalent(left, node.right, context.sourceCode)) {
            report(context, { message, messageId: 'identical', data: { operator: node.operator }, node: node.right }, [toSecondaryLocation(left)]);
          }
        }
        return { BinaryExpression: check, LogicalExpression: check };
      },
    };
hints:
  - "`&&` and `||` are not `BinaryExpression`s: ESTree calls them `LogicalExpression`. Use one `check` function for both listeners."
  - "Import `isIdentifier` and `isLiteral` from `../helpers/ast.js`. The NaN exception applies only to equality operators, and only when *both* sides are identifiers."
  - "With `report(context, descriptor, secondaryLocations)`, the descriptor needs `message` (the raw text, used to build the encoded message) as well as `messageId`; the primary location is `node: node.right`."
solution: |
  The reference is SonarJS's S1764 almost line for line. Two lessons sit in it. The operator list and the exceptions are what keeps the rule's precision high; each exception is a false positive somebody reported once. And the location matters: putting the issue on the right operand, with the left as a secondary location, tells the reader exactly which two things the rule found identical. (In SonarJS, the primary location is the right operand only when the rule runs inside the analyser, where secondary locations can be shown; as a plain ESLint rule it reports on the whole expression.)
```

## What comes next

You have now written rules against fixtures someone else wrote. Writing the fixtures is half of a rule engineer's work, and the half that decides whether a rule can be trusted. Chapter 4 is about testing rules.
