---
title: Testing rules
summary: Comment-based fixtures, RuleTester, hidden cases, and writing fixtures that catch broken rules.
number: 4
duration: 50 minutes
prerequisites: [anatomy-of-a-rule]
---

A rule is a program that judges other programs, so it needs tests like any program, and its tests matter more than most. A bug in a rule does not crash anything: it silently raises issues on correct code, or stops raising them on broken code, across every project that runs it. The fixtures you have been running against are those tests. This chapter is about how SonarJS writes them, and about writing them well.

## RuleTester

ESLint ships a test harness for rules, `RuleTester`. A test lists **valid** cases, code on which the rule must stay silent, and **invalid** cases, code with the issues it must raise, described by message, position or both:

```typescript
ruleTester.run('no-identical-expressions', rule, {
  valid: [
    { code: '1 << 1;' },
    { code: 'a !== a;' },
    { code: 'a == b || a == c;' },
  ],
  invalid: [
    {
      code: 'a == b && a == b',
      errors: [{ messageId: 'correctIdenticalSubExpressions', data: { operator: '&&' }, column: 1, endColumn: 17 }],
    },
  ],
});
```

This is the shape of SonarJS's `unit.test.ts` files: 335 rule folders have one at the pinned commit. SonarJS wraps `RuleTester` in three classes that differ in how the code is parsed: `DefaultParserRuleTester` (ESLint's own parser, for plain JavaScript), `NoTypeCheckingRuleTester` (typescript-eslint without type information) and `RuleTester` (typescript-eslint with a real TypeScript project, for rules that need types). The tests run on Node.js's built-in test runner.

::source{path="packages/analysis/tests/jsts/tools/testers/rule-tester.ts" symbol="NoTypeCheckingRuleTester" title="SonarJS's RuleTester wrappers"}

The valid cases of S1764's unit test at the pinned commit are worth reading as a list of the code its authors decided must *not* raise an issue: `a !== a`, `1 << 1`, `if (+a !== +b)`, comparisons of `node.text === "eval" || node.text === "arguments"`. Each one is a false positive that the rule once raised or could have, written down so that it never comes back.

::source{path="packages/analysis/src/jsts/rules/S1764/unit.test.ts" symbol="valid"}

## Comment-based tests

RuleTester cases are strings inside a test file, which is fine for one-liners and awkward for anything longer. The second style, which this course uses everywhere, writes the test as a normal source file whose comments say what the rule must find. The format comes from Sonar's analyzers for other languages, and SonarJS has a TypeScript implementation of it; 116 rule folders have a `cb.test.ts` at the pinned commit. :cite[sonarjs]

| Comment | Meaning |
|---|---|
| `// Noncompliant` at the end of a line | one issue is expected on this line, with any message |
| `// Noncompliant {{message}}` | one issue, with exactly this message |
| `// Noncompliant {{one}} {{two}}` | two issues on this line |
| `// Noncompliant@+1`, `@-2`, `@12` | the issue is one line below, two lines above, on line 12 |
| `//   ^^^^` on the next line | the issue's primary location: exactly the characters above the carets |
| `//   ^^^<  {{message}}` | a secondary location, after the primary one, with an optional message |
| `//   ^^^>` | a secondary location *before* the primary one (the arrow points at the primary) |
| `// Noncompliant [[qf1]]`, then `// fix@qf1 {{description}}` and `// edit@qf1 [[sc=4;ec=9]] {{text}}` | a suggestion: what it is called and what it changes |
| `[[qf1!]]` | an automatic fix rather than a suggestion |

Lines without a `Noncompliant` comment must produce no issue: every issue the rule raises must be expected somewhere. In SonarJS, the fixture files of a rule are named `*.fixture.js`, `*.fixture.ts` and so on, options for the rule go in `cb.options.json`, and a three-line `cb.test.ts` runs every fixture in the folder through the rule:

::source{path="packages/analysis/src/jsts/rules/S3415/cb.test.ts" symbol="test(meta, rule, import.meta.dirname)"}

The format has two strengths. Fixtures are real code, with the real file extension, so they can be as long and as realistic as the case needs and they get type-checked in a TypeScript project. And the expectations sit next to the code they are about, which is where a reader looks.

:::note
The course's checker implements the same syntax with one simplification: it compares an issue's secondary locations only when the expectation gives a primary range or lists secondaries. SonarJS's checker is stricter: for a rule with secondary locations it compares them on every issue. Results are also reported differently: SonarJS's checker turns the comments into RuleTester cases, and the course's reports each expectation as matched, missing, unexpected or mismatched.
:::

## What to put in a fixture

A fixture is a set of claims about the rule, and a good one makes each claim on purpose. For any rule, think in four groups:

1. **The cases the rule exists for**, in their usual shapes, with exact messages and locations for at least some of them.
2. **Look-alikes that are fine**: the code that resembles the bug but is not one. For S1764, `x !== x`, `1 << 1`, `a + a`. This is where precision is defended.
3. **Shapes the pattern can take**: aliases, parentheses, `as` casts, optional chaining, TypeScript syntax, nesting. This is where recall is defended.
4. **The boundaries of the rule's design**: the operators it checks and the ones it deliberately does not. A fixture that only has `===` cannot tell whether the rule also handles `<=`.

Then, for each claim, ask what a broken implementation would do with it. A fixture that a broken rule also passes is not testing anything.

```quiz
q: "A fixture for S1764 contains only `if (a.b === a.b) {} // Noncompliant`. Which broken version of the rule would it fail to catch?"
options:
  - text: "A version that never reports anything."
    why: "That version misses the expected issue: the fixture catches it."
  - text: "A version that also reports `x !== x`."
    correct: true
    why: "The fixture has no `x !== x`, so a version without the NaN exception passes it. Only a look-alike in the fixture can catch a false positive."
  - text: "A version that reports `a.b === a.b` with the wrong message."
    why: "Only if the expectation gives no message. With `{{…}}`, a wrong message fails."
```

## Exercise: catch the broken rules

The rule below is S1764 as you wrote it in chapter 3, and it is read-only. Hidden behind **Check against broken rules** are six broken versions of it, each with one plausible mistake. Your job is the opposite of the usual one: write fixtures that the correct rule passes and every broken version fails.

```fixtures
id: testing-rules/catch-the-mutants
title: Fixtures that catch broken rules
key: S1764
prompt: |
  **Run** checks your fixtures against the correct rule: they must pass. **Check against broken rules** then runs each broken version on them: each must fail at least one expectation. The starting fixture catches none of them. You may edit `cb.fixture.ts` and add cases until all six are caught.
readonly: [rule.ts]
files:
  rule.ts: |
    import type { Rule } from 'eslint';
    import type estree from 'estree';
    import { areEquivalent } from '../helpers/equivalence.js';
    import { generateMeta } from '../helpers/generate-meta.js';
    import { isIdentifier, isLiteral } from '../helpers/ast.js';
    import { report, toSecondaryLocation } from '../helpers/location.js';

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
      meta: generateMeta({ sonarKey: 'S1764', hasSecondaries: true }, { messages: { identical: message } }),
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
fixtures:
  cb.fixture.ts: |
    declare let a: number, b: number;

    if (a.toFixed() === a.toFixed()) {} // Noncompliant
    if (a === b) {}
mutants:
  forgets && and ||: |
    import type { Rule } from 'eslint';
    import type estree from 'estree';
    import { areEquivalent } from '../helpers/equivalence.js';
    import { isIdentifier, isLiteral } from '../helpers/ast.js';
    import { report, toSecondaryLocation } from '../helpers/location.js';
    const message = 'Correct one of the identical sub-expressions on both sides of operator "{{operator}}"';
    const EQUALITY = new Set(['==', '===', '!=', '!==']);
    const RELEVANT = new Set(['/', '-', '<<', '>>', '<', '<=', '>', '>=']);
    export const rule: Rule.RuleModule = {
      meta: { messages: { identical: message, sonarRuntime: '{{sonarRuntimeData}}' } },
      create(context) {
        return {
          BinaryExpression(node: estree.BinaryExpression) {
            const left = node.left as estree.Node;
            const relevant = RELEVANT.has(node.operator) || (EQUALITY.has(node.operator) && !(isIdentifier(left) && isIdentifier(node.right)));
            const shift = node.operator === '<<' && isLiteral(left) && (left as estree.Literal).value === 1;
            if (relevant && !shift && areEquivalent(left, node.right, context.sourceCode)) {
              report(context, { message, messageId: 'identical', data: { operator: node.operator }, node: node.right }, [toSecondaryLocation(left)]);
            }
          },
        };
      },
    };
  skips NaN checks for every operator: |
    import type { Rule } from 'eslint';
    import type estree from 'estree';
    import { areEquivalent } from '../helpers/equivalence.js';
    import { isIdentifier, isLiteral } from '../helpers/ast.js';
    import { report, toSecondaryLocation } from '../helpers/location.js';
    const message = 'Correct one of the identical sub-expressions on both sides of operator "{{operator}}"';
    const RELEVANT = new Set(['&&', '||', '/', '-', '<<', '>>', '<', '<=', '>', '>=', '==', '===', '!=', '!==']);
    type Binary = estree.BinaryExpression | estree.LogicalExpression;
    export const rule: Rule.RuleModule = {
      meta: { messages: { identical: message, sonarRuntime: '{{sonarRuntimeData}}' } },
      create(context) {
        function check(node: Binary) {
          const left = node.left as estree.Node;
          if (isIdentifier(left) && isIdentifier(node.right)) return;
          const shift = node.operator === '<<' && isLiteral(left) && (left as estree.Literal).value === 1;
          if (RELEVANT.has(node.operator) && !shift && areEquivalent(left, node.right, context.sourceCode)) {
            report(context, { message, messageId: 'identical', data: { operator: node.operator }, node: node.right }, [toSecondaryLocation(left)]);
          }
        }
        return { BinaryExpression: check, LogicalExpression: check };
      },
    };
  has no NaN exception: |
    import type { Rule } from 'eslint';
    import type estree from 'estree';
    import { areEquivalent } from '../helpers/equivalence.js';
    import { isLiteral } from '../helpers/ast.js';
    import { report, toSecondaryLocation } from '../helpers/location.js';
    const message = 'Correct one of the identical sub-expressions on both sides of operator "{{operator}}"';
    const RELEVANT = new Set(['&&', '||', '/', '-', '<<', '>>', '<', '<=', '>', '>=', '==', '===', '!=', '!==']);
    type Binary = estree.BinaryExpression | estree.LogicalExpression;
    export const rule: Rule.RuleModule = {
      meta: { messages: { identical: message, sonarRuntime: '{{sonarRuntimeData}}' } },
      create(context) {
        function check(node: Binary) {
          const left = node.left as estree.Node;
          const shift = node.operator === '<<' && isLiteral(left) && (left as estree.Literal).value === 1;
          if (RELEVANT.has(node.operator) && !shift && areEquivalent(left, node.right, context.sourceCode)) {
            report(context, { message, messageId: 'identical', data: { operator: node.operator }, node: node.right }, [toSecondaryLocation(left)]);
          }
        }
        return { BinaryExpression: check, LogicalExpression: check };
      },
    };
  also checks + and *: |
    import type { Rule } from 'eslint';
    import type estree from 'estree';
    import { areEquivalent } from '../helpers/equivalence.js';
    import { isIdentifier, isLiteral } from '../helpers/ast.js';
    import { report, toSecondaryLocation } from '../helpers/location.js';
    const message = 'Correct one of the identical sub-expressions on both sides of operator "{{operator}}"';
    const EQUALITY = new Set(['==', '===', '!=', '!==']);
    const RELEVANT = new Set(['&&', '||', '/', '-', '<<', '>>', '<', '<=', '>', '>=', '+', '*']);
    type Binary = estree.BinaryExpression | estree.LogicalExpression;
    export const rule: Rule.RuleModule = {
      meta: { messages: { identical: message, sonarRuntime: '{{sonarRuntimeData}}' } },
      create(context) {
        function check(node: Binary) {
          const left = node.left as estree.Node;
          const relevant = RELEVANT.has(node.operator) || (EQUALITY.has(node.operator) && !(isIdentifier(left) && isIdentifier(node.right)));
          const shift = node.operator === '<<' && isLiteral(left) && (left as estree.Literal).value === 1;
          if (relevant && !shift && areEquivalent(left, node.right, context.sourceCode)) {
            report(context, { message, messageId: 'identical', data: { operator: node.operator }, node: node.right }, [toSecondaryLocation(left)]);
          }
        }
        return { BinaryExpression: check, LogicalExpression: check };
      },
    };
  reports on the whole expression: |
    import type { Rule } from 'eslint';
    import type estree from 'estree';
    import { areEquivalent } from '../helpers/equivalence.js';
    import { isIdentifier, isLiteral } from '../helpers/ast.js';
    import { report, toSecondaryLocation } from '../helpers/location.js';
    const message = 'Correct one of the identical sub-expressions on both sides of operator "{{operator}}"';
    const EQUALITY = new Set(['==', '===', '!=', '!==']);
    const RELEVANT = new Set(['&&', '||', '/', '-', '<<', '>>', '<', '<=', '>', '>=']);
    type Binary = estree.BinaryExpression | estree.LogicalExpression;
    export const rule: Rule.RuleModule = {
      meta: { messages: { identical: message, sonarRuntime: '{{sonarRuntimeData}}' } },
      create(context) {
        function check(node: Binary) {
          const left = node.left as estree.Node;
          const relevant = RELEVANT.has(node.operator) || (EQUALITY.has(node.operator) && !(isIdentifier(left) && isIdentifier(node.right)));
          const shift = node.operator === '<<' && isLiteral(left) && (left as estree.Literal).value === 1;
          if (relevant && !shift && areEquivalent(left, node.right, context.sourceCode)) {
            report(context, { message, messageId: 'identical', data: { operator: node.operator }, node }, [toSecondaryLocation(left)]);
          }
        }
        return { BinaryExpression: check, LogicalExpression: check };
      },
    };
  flags every shift: |
    import type { Rule } from 'eslint';
    import type estree from 'estree';
    import { areEquivalent } from '../helpers/equivalence.js';
    import { isIdentifier } from '../helpers/ast.js';
    import { report, toSecondaryLocation } from '../helpers/location.js';
    const message = 'Correct one of the identical sub-expressions on both sides of operator "{{operator}}"';
    const EQUALITY = new Set(['==', '===', '!=', '!==']);
    const RELEVANT = new Set(['&&', '||', '/', '-', '<<', '>>', '<', '<=', '>', '>=']);
    type Binary = estree.BinaryExpression | estree.LogicalExpression;
    export const rule: Rule.RuleModule = {
      meta: { messages: { identical: message, sonarRuntime: '{{sonarRuntimeData}}' } },
      create(context) {
        function check(node: Binary) {
          const left = node.left as estree.Node;
          const relevant = RELEVANT.has(node.operator) || (EQUALITY.has(node.operator) && !(isIdentifier(left) && isIdentifier(node.right)));
          if (relevant && areEquivalent(left, node.right, context.sourceCode)) {
            report(context, { message, messageId: 'identical', data: { operator: node.operator }, node: node.right }, [toSecondaryLocation(left)]);
          }
        }
        return { BinaryExpression: check, LogicalExpression: check };
      },
    };
answerFixtures:
  cb.fixture.ts: |
    declare let a: number, b: number, x: number;
    declare const box: { size: number };

    if (box.size === box.size) {} // Noncompliant {{Correct one of the identical sub-expressions on both sides of operator "==="}}
    //  ^^^^^^^^>    ^^^^^^^^
    if (a > 0 && a > 0) {} // Noncompliant
    const difference = a - a; // Noncompliant
    if (x !== x) {}
    const square = a * a;
    const double = a + a;
    const flag = 1 << 1;
    const shifted = 2 << 2; // Noncompliant
    if (a === b) {}
hints:
  - "Each broken version is named after its mistake. For each one, write the smallest piece of code on which it and the correct rule disagree."
  - "Two kinds of case are needed: code where the broken rule *misses* an issue (mark it `// Noncompliant`), and code where it raises one too many (leave it unmarked)."
  - "One broken version reports in the right places with the right message, but on a different range. Only a `^^^^` line can catch it."
solution: |
  Every case in the reference fixture is there to catch something: `&&` for the version without `LogicalExpression`, `a - a` (two identifiers, not an equality) for the over-broad NaN exception, `x !== x` for the missing one, `a * a` and `a + a` for the extra operators, `1 << 1` and `2 << 2` for the shift exception, and a `^^^^` line for the wrong location. This is **mutation testing** applied to rules: a test suite is as good as the broken programs it can tell apart from the correct one.
```

Writing fixtures against broken rules is a technique with a name: **mutation testing**. Tools such as Stryker for JavaScript change a program in small ways (an operator, a condition, a constant) and check that some test fails for each change. A change that no test notices points at code whose behaviour nothing checks. :cite[jia2011mutation]

## Hidden fixtures, and real code

Every exercise in this course has hidden fixtures, run on **Submit**. They play the role that new code plays for a real rule: cases its author did not think of. A rule that passes its own fixtures and fails the hidden ones is a rule tuned to its tests, and the hidden fixtures exist to catch that.

SonarJS has a stronger version of the same idea. Its **ruling** tests run every rule on several dozen real open-source JavaScript and TypeScript projects and compare the issues with a stored list of expected ones, file and line. A change to a rule that adds or removes issues on real code shows up as a diff in that list, and someone has to look at every added issue and decide whether it is a true positive. Chapters 16 and 20 use the course's small version of it, the corpus.

## What comes next

All the fixtures so far checked an issue's message and location. Issues carry more: secondary locations with their own messages, a cost, and fixes. Chapter 5 is about reporting.
