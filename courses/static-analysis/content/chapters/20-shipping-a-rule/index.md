---
title: Shipping a rule
summary: From a specification in RSPEC to a rule in three products. Generated metadata and Java classes, the tests a rule must pass, the ESLint plugin, and the API other Sonar analysers use to add their own rules.
number: 20
duration: 50 minutes
prerequisites: [testing-rules, inside-one-analysis]
---

A rule is not finished when its fixture passes. It needs a specification that a user can read, metadata that the plugin and the server agree on, a Java class that SonarQube can activate, tests on real code, and a release in three products: SonarQube, SonarQube for IDE and `eslint-plugin-sonarjs`. This chapter follows that path, and ends with the API through which other Sonar analysers add JavaScript rules of their own.

## The specification

Every Sonar rule, for every language, is specified in **RSPEC**, SonarSource's rule specification repository. A rule has a key shared by all languages (S1940 is *Boolean checks should not be inverted* in Java, Python and JavaScript alike) and, per language, two files: an HTML description (why the code is a problem, how to fix it, references) and a metadata file. For S1940 in JavaScript, the metadata says, among other things:

```json
{
  "title": "Boolean checks should not be inverted",
  "type": "CODE_SMELL",
  "status": "ready",
  "remediation": { "func": "Constant/Issue", "constantCost": "2min" },
  "tags": ["pitfall"],
  "scope": "Main",
  "quickfix": "covered",
  "compatibleLanguages": ["js", "ts"],
  "defaultQualityProfiles": ["Sonar way"]
}
```

These fields drive the implementation more than they appear to. `scope` decides whether the rule targets main or test files (chapter 18's file-type filter). `defaultQualityProfiles` decides whether the rule is on by default, in *Sonar way*. Tags do more than classify: `type-dependent` marks rules that need types (chapter 9), a tag such as `es2022` declares the ECMAScript version a rule's advice requires, and `esm-only` or `cjs-only` restricts a rule to one module system. A rule is first written in RSPEC, reviewed there, and implemented second.

## Scaffolding and generated files

`npm run new-rule` asks for the key, the ESLint name, the scope and the kind of rule (original, decorated, external), and creates the rule's folder: `rule.ts`, `meta.ts` (the hand-written metadata: `implementation`, `eslintId`, and for some rules `quickFixMessage`, `hasSecondaries`, `externalRules`), `index.ts`, an empty comment-based fixture and its test launcher.

Other files are **generated**, and not committed. `npm run generate-meta` reads the RSPEC metadata and writes each rule's `generated-meta.ts`: the ESLint `meta` (type, description, documentation URL, `recommended` when the rule is in Sonar way, `requiresTypeChecking` from the tag, `fixable` when RSPEC says the quick fix is covered) and the Sonar fields (scope, languages, required dependencies, ECMAScript version, module type). Then a Java class is generated for each rule:

```java
@Rule(key = "S1940")
@JavaScriptRule
@TypeScriptRule
public class S1940 extends MainFileCheck { … }
```

`MainFileCheck` or `TestFileCheck` gives the file types the rule targets, the annotations give its languages, and a rule with parameters overrides `configurations()` to turn the quality profile's parameters into the ESLint options. At analysis time, SonarQube's `CheckFactory` instantiates the classes of the active rules only, and their keys, configurations and targets become the `rules` of the request of chapter 17.

::source{path="tools/generate-eslint-meta.ts" symbol="___TYPE_CHECKING___" title="From RSPEC to generated-meta.ts"}

## Tests

Three layers of tests guard a rule:

- **Comment-based fixtures** (chapter 4): the cases the rule exists for, the look-alikes, the shapes, the boundaries.
- **Unit tests** with ESLint's `RuleTester`, for what fixtures express badly: options, the exact output of fixes, settings.
- **The ruling** (chapter 4): every rule runs on 59 open-source projects pinned as Git submodules (Angular, TypeScript's own compiler, Ghost, ag-grid and many others), and its issues are compared with an expected set, one JSON file per project and rule. A change to a rule, a helper, a parser or an upstream plugin shows up as a diff of the expected issues, which a developer reviews issue by issue and either accepts (`npm run ruling-sync`) or fixes. A new rule that raises nothing on the corpus gets a source file of its own in the corpus, so that it is exercised at all.

The ruling is where most false positives are caught before release: a fixture contains the cases its author thought of, the ruling contains the cases thousands of other developers wrote.

## Exercise: ship S1940

S1940 reports a negated comparison, `!(a === b)`, which reads better as `a !== b`, and offers to invert the operator. It offers a **suggestion**, not an automatic fix, and the reason is a classic: for the relational operators, the inversion is not equivalent when a value can be `NaN`. `!(x < y)` is `true` when `x` is `NaN`, but `x >= y` is `false`. The suggestion's title warns about it.

```rule
id: shipping-a-rule/inverted-boolean-check
title: Boolean checks should not be inverted
key: S1940
corpus: true
types: false
prompt: |
  Report `!` applied to a comparison (`==`, `!=`, `===`, `!==`, `<`, `>`, `<=`, `>=`) on the whole `!` expression, with the message `Use the opposite operator ({{invertedOperator}}) instead.` and one suggestion, `Invert inner operation (apply if NaN is not expected)`, that replaces the expression by `left op right` with the opposite operator, keeping the text of both operands. When the `!` is itself the operand of another `!` (as in `!!(a > b)`), wrap the replacement in parentheses. Then run it on the corpus.
files:
  rule.ts: |
    import type { Rule } from 'eslint';
    import type estree from 'estree';
    import { generateMeta } from '../helpers/generate-meta.js';

    const inverted: Record<string, string> = {
      '==': '!=',
      '!=': '==',
      '===': '!==',
      '!==': '===',
      '>': '<=',
      '<': '>=',
      '>=': '<',
      '<=': '>',
    };

    export const rule: Rule.RuleModule = {
      meta: generateMeta(
        { sonarKey: 'S1940' },
        {
          hasSuggestions: true,
          messages: {
            useOppositeOperator: 'Use the opposite operator ({{invertedOperator}}) instead.',
            suggestOperationInversion: 'Invert inner operation (apply if NaN is not expected)',
          },
        },
      ),
      create(context) {
        return {
          // TODO
        };
      },
    };
fixtures:
  inverted.fixture.js: |
    export function checks(a, b, items) {
      const same = !(a === b); // Noncompliant [[qf1]] {{Use the opposite operator (!==) instead.}}
      //           ^^^^^^^^^^
      // fix@qf1 {{Invert inner operation (apply if NaN is not expected)}}
      // edit@qf1 {{  const same = a !== b;}}
      const enough = !(items.length < 3); // Noncompliant [[qf2]] {{Use the opposite operator (>=) instead.}}
      // edit@qf2 {{  const enough = items.length >= 3;}}
      const twice = !!(a > b); // Noncompliant [[qf3]]
      // edit@qf3 {{  const twice = !(a <= b);}}
      const both = !(a && b);
      const kind = !(a instanceof Array);
      const empty = !items.length;
      return [same, enough, twice, both, kind, empty];
    }
hidden:
  more.fixture.ts: |
    export function more(x: number | null, y: number, flag: boolean): boolean[] {
      const present = !(x == null); // Noncompliant [[qf1]] {{Use the opposite operator (!=) instead.}}
      // edit@qf1 {{  const present = x != null;}}
      const equal = !(y !== 3); // Noncompliant {{Use the opposite operator (===) instead.}}
      const small = !(y >= 10); // Noncompliant {{Use the opposite operator (<) instead.}}
      const big = !(y <= 10); // Noncompliant {{Use the opposite operator (>) instead.}}
      const not = !flag;
      const sum = !(y + 1);
      return [present, equal, small, big, not, sum];
    }
answer:
  rule.ts: |
    import type { Rule } from 'eslint';
    import type estree from 'estree';
    import { generateMeta } from '../helpers/generate-meta.js';

    const inverted: Record<string, string> = {
      '==': '!=',
      '!=': '==',
      '===': '!==',
      '!==': '===',
      '>': '<=',
      '<': '>=',
      '>=': '<',
      '<=': '>',
    };

    export const rule: Rule.RuleModule = {
      meta: generateMeta(
        { sonarKey: 'S1940' },
        {
          hasSuggestions: true,
          messages: {
            useOppositeOperator: 'Use the opposite operator ({{invertedOperator}}) instead.',
            suggestOperationInversion: 'Invert inner operation (apply if NaN is not expected)',
          },
        },
      ),
      create(context) {
        return {
          UnaryExpression(node: estree.UnaryExpression & { parent?: estree.Node }) {
            if (node.operator !== '!' || node.argument.type !== 'BinaryExpression') return;
            const condition = node.argument;
            const invertedOperator = inverted[condition.operator];
            if (!invertedOperator) return;
            const left = context.sourceCode.getText(condition.left as estree.Node);
            const right = context.sourceCode.getText(condition.right);
            const nested = node.parent?.type === 'UnaryExpression';
            const replacement = `${left} ${invertedOperator} ${right}`;
            context.report({
              node,
              messageId: 'useOppositeOperator',
              data: { invertedOperator },
              suggest: [
                {
                  messageId: 'suggestOperationInversion',
                  fix: (fixer) => fixer.replaceText(node, nested ? `(${replacement})` : replacement),
                },
              ],
            });
          },
        };
      },
    };
hints:
  - "Listen to `UnaryExpression`; keep `!` whose `argument` is a `BinaryExpression` with an operator in the map."
  - "Rebuild the expression from the operands' source text, `context.sourceCode.getText(condition.left)`, so that comments and formatting inside them survive."
  - "In the suggestion, use `messageId: 'suggestOperationInversion'` and `fix: (fixer) => fixer.replaceText(node, …)`."
solution: |
  The rule is small; what makes it shippable is everything around it. The suggestion rather than an automatic fix is a correctness decision: `!(items.length < 3)` and `items.length >= 3` agree for every number except `NaN`, which an automatic fix applied across a code base would eventually meet. The parentheses for `!!(a > b)` keep the suggestion from producing `!a <= b`, which parses as `(!a) <= b`. `!(a instanceof Array)` is not reported: `instanceof` has no inverse operator. On the corpus, the rule finds the two negated comparisons in ledger-lite's report module; the second, `!(balance >= -limit)`, is exactly the case where the warning about `NaN` matters.
```

## Three products

A rule that is merged ships in the next release of the plugin, which reaches users in three ways:

- **SonarQube Server and Cloud** embed the plugin; a server upgrade brings new rules, and an administrator can activate a rule that is not in Sonar way in their own quality profile.
- **SonarQube for IDE** embeds the same plugin, and in connected mode uses the server's profile.
- **`eslint-plugin-sonarjs`** on npm contains the original rules (not the decorated and external ones, chapter 10), named by their ESLint names (`sonarjs/no-inverted-boolean-check`), with a `recommended` configuration that enables exactly the rules that are in Sonar way.

::source{path="packages/analysis/src/jsts/rules/plugin.ts" symbol="recommendedConfig.rules![`sonarjs/${key}`]" title="eslint-plugin-sonarjs's recommended configuration"}

## Rules from other plugins

SonarJS is also a platform. Other Sonar analysers that need JavaScript rules do not reimplement the bridge: they ship an ESLint plugin of their own, packed as a `.tgz` inside their jar, and register it through SonarJS's Java API:

- a **`RulesBundle`** gives the path of the bundle in the jar; SonarJS deploys it and the Node.js side loads its rules at startup, alongside its own;
- a **`CustomRuleRepository`** declares a rule repository and its check classes, each implementing **`EslintHook`**: the rule's ESLint key, its configurations, the file types it targets, the analysis modes it runs in, the extensions it skips. Activated by quality profiles, they raise issues like any SonarJS rule;
- an **`EslintHook`** registered directly, without a repository, runs on every file whatever the quality profile, and cannot raise issues: it collects data for an analyser that works across files. Such hooks are typically the ones that declare the `SKIP_UNCHANGED` analysis mode, because a cross-file analysis needs to see unchanged files too.

::source{path="sonar-plugin/api/src/main/java/org/sonar/plugins/javascript/api/EslintHook.java" symbol="public interface EslintHook"}

Together with `JsAnalysisConsumer` (chapter 17), this is how SonarJS's syntax trees and ESLint infrastructure serve analyses beyond its own rules.

## The checklist

A rule is ready to ship when:

1. its RSPEC is reviewed: title, description with compliant and noncompliant examples, type and impacts, tags (including `type-dependent` if it uses types), scope, languages, quick-fix status, default profiles;
2. its implementation reports on the smallest meaningful location, with a message that says what to do, secondary locations where they help, and a quick fix or suggestion only when the change is safe (or says when it is not);
3. its fixture covers the four groups of chapter 4, and catches broken versions of the rule;
4. it handles the absence of types, if it uses them, by staying silent;
5. its ruling diff has been reviewed issue by issue, and its false positives removed or accepted knowingly;
6. its options, if any, are declared once in `config.ts`, with defaults and descriptions.

## What comes next

Step 5 is the subject of the last chapter of this part: how SonarJS decides which issues are worth raising, and what happens when a rule gets it wrong.
