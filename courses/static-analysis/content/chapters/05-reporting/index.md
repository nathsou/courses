---
title: Reporting
summary: Messages, primary and secondary locations, cost, the sonarRuntime encoding, and quick fixes.
number: 5
duration: 50 minutes
prerequisites: [testing-rules]
---

Finding a problem is half of a rule's job. The other half is telling a developer about it in a way that makes it quick to understand and quick to fix: a message that says what to do, a location that points at the exact problem, other locations that show why, an estimate of the effort, and where possible a fix. An issue that takes five minutes to decode costs as much as a false positive.

## What a SonarQube issue holds

An ESLint message has one location and one string. A SonarQube issue has more. At the boundary between SonarJS's Node.js process and its Java plugin, each issue carries:

- the **rule key** and the **message**;
- the **primary location**: start line and column, end line and column;
- a list of **secondary locations**, each a range with an optional message;
- an optional **cost**, which SonarQube calls the issue's *gap*;
- a list of **quick fixes**, each a message and a list of text edits.

::source{path="packages/grpc/src/proto/analyze-project.proto" symbol="secondary_locations" title="The issue as SonarJS's Java plugin receives it" note="Chapter 17 follows the whole message; here, look for the Issue message and its fields."}

Columns are 0-based on the Java side; ESLint's are 1-based, and SonarJS converts them. The course's results use 0-based columns too.

## Messages

Look at the messages of the rules you have met:

- *Correct one of the identical sub-expressions on both sides of operator "&&"*
- *Remove these redundant parentheses.*
- *Make sure that using this pseudorandom number generator is safe here.*
- *Replace this "for" loop with a "while" loop.*

Each is a sentence addressed to the developer, saying what to do about *this* code, with the specific detail filled in (`"&&"`). The rule's title in RSPEC states the principle (*Identical expressions should not be used on both sides of a binary operator*); the message applies it. ESLint's `messages` and `data` exist for exactly this: the text is declared once in `meta.messages` with `{{placeholders}}`, and each report fills them in.

## The primary location

The primary location should be the smallest range that identifies the problem. Underlining a whole 40-line function to say "this function is too complex" hides the code behind a wall of squiggles; underlining its name says the same thing. Rules choose their primary location deliberately:

| Rule | Reports on |
|---|---|
| S1764 identical sub-expressions | the right operand |
| S1110 redundant parentheses | the opening parenthesis |
| S1264 `for` that should be `while` | the `for` keyword |
| S1444 public static fields should be read-only | the field's name |
| S3776 Cognitive Complexity, S3516 invariant returns | the function's name, or its `function` keyword or `=>` if it has none |

The last row is common enough that SonarJS has a helper for it, `getMainFunctionTokenLocation`; the kit has a simplified version.

## Secondary locations

Often one location is not enough to explain an issue. "These two expressions are identical" needs both expressions; "this function always returns the same value" is convincing only if each `return` is shown. **Secondary locations** are extra ranges, each with an optional message, that the IDE highlights with the issue.

ESLint has no notion of secondary locations, so SonarJS smuggles them through ESLint's message. When a rule runs inside the analyser, ESLint's settings contain `sonarRuntime: true`. The `report` helper then does not report the message directly: it packs the message, the secondary locations and the cost into a JSON string, and reports *that* under the special message id `sonarRuntime`, whose text is just `{{sonarRuntimeData}}`. `generateMeta` adds that message id to every rule whose `meta.ts` says `hasSecondaries`. On the other side, the analyser's linter wrapper decodes the JSON back into an issue with its secondary locations, for every rule with `hasSecondaries`.

::source{path="packages/analysis/src/jsts/rules/helpers/location.ts" symbol="toEncodedMessage" title="Encoding" note="report() encodes when context.settings.sonarRuntime is true; otherwise it falls back to a plain ESLint report, so the same rule works in eslint-plugin-sonarjs."}

::source{path="packages/analysis/src/jsts/linter/issues/decode.ts" symbol="decodeSecondaryLocations" title="Decoding"}

When the same rule runs as part of `eslint-plugin-sonarjs`, in an ordinary ESLint setup, `sonarRuntime` is not set and `report` falls back to a normal ESLint report: one location, one message, secondary locations dropped. Some rules also change their primary location in that case; S1764 reports on the whole expression when it cannot show the left operand separately.

You can see both forms in the workbench. Run the S1764 exercise of chapter 3 again, then open **Issue anatomy** under any result: the first box is the message as ESLint produced it, the second the issue after decoding.

```quiz
q: "A rule reports with `report(context, { message, node }, [toSecondaryLocation(other)])` but its `meta.ts` does not set `hasSecondaries`. What happens inside the analyser?"
options:
  - text: "The issue is shown with its secondary location."
    why: "Without `hasSecondaries`, `generateMeta` does not add the `sonarRuntime` message, and the analyser does not try to decode."
  - text: "ESLint rejects the report, because the message id `sonarRuntime` is not declared in the rule's messages."
    correct: true
    why: "`report` uses the message id `sonarRuntime` whenever `settings.sonarRuntime` is true, and ESLint refuses a `messageId` that `meta.messages` does not declare. `hasSecondaries` is what declares it."
  - text: "The issue is shown, with the JSON as its message."
    why: "It never gets that far: ESLint throws on the undeclared message id."
```

## Cost

Some issues are more work to fix than others. A function that always returns the same value through two `return` statements is a smaller refactoring than one with eight. SonarQube estimates the effort to fix each issue with the rule's **remediation function**, declared in RSPEC:

| Rule | Remediation function |
|---|---|
| S1264 | constant: 5 minutes per issue |
| S3516 invariant returns | linear: 2 minutes per return statement |
| S3776 Cognitive Complexity | linear with offset: 5 minutes, plus 1 minute per point over the threshold |

For linear functions, the rule supplies the number to multiply: the issue's **cost** (SonarQube's *gap*). S3516 passes the number of returned values as the fourth argument of `report`; S3776 passes how far the function's complexity exceeds the threshold. The Java plugin copies the cost into the issue's gap, and SonarQube computes the effort, which adds up into a project's technical-debt figures.

::source{path="packages/analysis/src/jsts/rules/S3516/rule.ts" symbol="returnedValues.length" title="S3516 reports its cost" note="Each returned value is a secondary location with the message “Returned value.”, and their number is the cost."}

## Fixes and suggestions

ESLint distinguishes two kinds of automatic change:

- A **fix** (`fix` in the report, `fixable: 'code'` in the rule's meta) is applied by `eslint --fix` without asking anyone. It must never change what the program does, only how it is written.
- A **suggestion** (`suggest: [{ desc, fix }]`, `hasSuggestions: true`) is offered to the developer, who decides. It may change behaviour, and a report may offer several.

A fixer is a function that receives a `fixer` object and returns one or more text edits: `fixer.replaceText(nodeOrToken, text)`, `fixer.insertTextAfter(…)`, `fixer.remove(…)`, `fixer.replaceTextRange([start, end], text)`. Edits are computed against the original text; ESLint applies them.

SonarQube for IDE turns both kinds into **quick fixes**. A suggestion becomes a quick fix titled with its `desc`. A fix becomes a quick fix titled with the rule's `quickFixMessage`, declared in its `meta.ts`; `generateMeta` refuses a fixable rule without one. SonarQube Server and Cloud do not apply fixes: they only record that an issue has a quick fix available.

::source{path="packages/analysis/src/jsts/linter/quickfixes/transform.ts" symbol="transformFixes"}

:::warning
A fix that is wrong is worse than no fix: it is applied without review, possibly across a whole code base by `eslint --fix`. Rewriting `for (; i < n;)` as `while (i < n)` is always safe. Adding `readonly` to a static field is not: if some code assigns the field later, the program stops compiling. That is why S1264 offers a fix and S1444 only a suggestion.
:::

## Exercise: a fix

S1264 flags a `for` loop with neither an initialiser nor an update, which is a `while` loop in disguise, and fixes it. Its RSPEC entry says it has a quick fix, so its generated metadata marks it fixable, and its `meta.ts` declares the quick fix message.

The fixture uses the comment-based syntax for fixes: `[[qf1!]]` after `Noncompliant` declares an automatic fix named `qf1` (the `!` makes it a fix rather than a suggestion), and `// edit@qf1 {{…}}` gives the text of the line after the fix.

```rule
id: reporting/prefer-while
title: Replace a for loop with a while loop
key: S1264
inspector: [tree, tokens]
prompt: |
  Report every `for` loop that has a test but no initialiser and no update, on its `for` keyword, with an automatic fix that replaces everything from `for` to the closing parenthesis with `while (test)`. The rule must declare `fixable: 'code'`. `meta.ts` declares `quickFixMessage`, the title of the quick fix in the IDE; without it, `generateMeta` would refuse a fixable rule.
readonly: [meta.ts]
files:
  rule.ts: |
    import type { Rule } from 'eslint';
    import type estree from 'estree';
    import { generateMeta } from '../helpers/generate-meta.js';
    import * as meta from './meta.js';

    export const rule: Rule.RuleModule = {
      meta: generateMeta(meta, {
        messages: { replaceForWithWhileLoop: 'Replace this "for" loop with a "while" loop.' },
      }),
      create(context) {
        return {
          ForStatement(forLoop: estree.ForStatement) {
            // TODO: when there is no init and no update but a test, report on the `for` keyword
            // (context.sourceCode.getFirstToken(forLoop)) with a fix.
          },
        };
      },
    };
  meta.ts: |
    export const implementation = 'original';
    export const eslintId = 'prefer-while';
    export const sonarKey = 'S1264';
    export const quickFixMessage = "Replace with 'while' loop";
fixtures:
  cb.fixture.ts: |
    declare let i: number, n: number;
    declare function more(): boolean;

    function loops() {
      for (; i < n;) i++; // Noncompliant [[qf1!]] {{Replace this "for" loop with a "while" loop.}}
    //^^^
    // edit@qf1 {{  while (i < n) i++;}}
      for (;more();) i--; // Noncompliant [[qf2!]]
    // edit@qf2 {{  while (more()) i--;}}
      for (let j = 0; j < n; j++) {}
      for (; i < n; i++) {}
      for (;;) {}
    }
hidden:
  more.fixture.ts: |
    declare let a: number, b: number;
    for ( ; a < b ; ) a++; // Noncompliant [[qf1!]]
    // edit@qf1 {{while (a < b) a++;}}
    for (a = 0; a < b;) a++;
    for (;a !== b && a > 0;) { a--; } // Noncompliant
answer:
  rule.ts: |
    import type { Rule } from 'eslint';
    import type estree from 'estree';
    import { generateMeta } from '../helpers/generate-meta.js';
    import * as meta from './meta.js';

    export const rule: Rule.RuleModule = {
      meta: generateMeta(meta, {
        messages: { replaceForWithWhileLoop: 'Replace this "for" loop with a "while" loop.' },
        fixable: 'code',
      }),
      create(context) {
        return {
          ForStatement(forLoop: estree.ForStatement) {
            const forKeyword = context.sourceCode.getFirstToken(forLoop);
            const closingParenthesis = context.sourceCode.getTokenBefore(forLoop.body);
            const test = forLoop.test;
            if (forLoop.init || forLoop.update || !test || !forKeyword || !closingParenthesis) return;
            context.report({
              messageId: 'replaceForWithWhileLoop',
              loc: forKeyword.loc,
              fix: (fixer) => fixer.replaceTextRange([forLoop.range![0], closingParenthesis.range[1]], `while (${context.sourceCode.getText(test)})`),
            });
          },
        };
      },
    };
hints:
  - "`context.sourceCode.getTokenBefore(forLoop.body)` is the `)` that closes the loop's header."
  - "`fixer.replaceTextRange([start, end], text)` replaces the characters from `start` to `end` (the `for` keyword's start, the parenthesis's end) and `context.sourceCode.getText(forLoop.test)` is the condition's source."
  - "Without `fixable: 'code'` in the rule's meta, ESLint throws when a report carries a fix."
solution: |
  This is S1264's implementation. Two points: the fix copies the condition's source text instead of regenerating it, so comments and formatting inside the condition survive; and the report's location is the `for` keyword alone, which is what the `^^` under the second loop checks.
```

## Exercise: a suggestion

S1444 flags public static fields of a class that are not `readonly`: anyone can change them, from anywhere. Adding `readonly` may break code that assigns them, so the rule offers it as a suggestion. It is also a rule for TypeScript only, since JavaScript has no `readonly`; SonarJS's version checks the file name and does nothing on `.js` files.

The comment-based syntax for a suggestion is `[[qf1]]` (no `!`), with `// fix@qf1 {{…}}` for its description and `// edit@qf1 [[sc=…;ec=…]] {{…}}` for the change: the characters from column `sc` to column `ec` of the line become the text in braces.

```rule
id: reporting/static-readonly
title: Public static fields should be read-only
key: S1444
inspector: [tree]
prompt: |
  Report every `static` class field that is not `readonly` and not `private` or `protected`, on the field's key, with a suggestion that inserts ` readonly` after the `static` keyword. One selector with attribute conditions can do all the filtering: look at a `PropertyDefinition` in the **Tree** tab to see the attributes it has.
files:
  rule.ts: |
    import type { Rule } from 'eslint';
    import type estree from 'estree';
    import { generateMeta } from '../helpers/generate-meta.js';

    export const rule: Rule.RuleModule = {
      meta: generateMeta(
        { sonarKey: 'S1444' },
        {
          hasSuggestions: true,
          messages: { message: 'Make this public static property readonly.', fix: 'Add "readonly" keyword' },
        },
      ),
      create(context) {
        return {
          // TODO: a selector for public, static, non-readonly fields.
          PropertyDefinition(node: estree.PropertyDefinition) {
            context.report({ messageId: 'message', node: node.key });
          },
        };
      },
    };
fixtures:
  cb.fixture.ts: |
    class Settings {
        public static retries = 3; // Noncompliant [[qf1]] {{Make this public static property readonly.}}
    //                ^^^^^^^
    // fix@qf1 {{Add "readonly" keyword}}
    // edit@qf1 [[sc=4;ec=30]] {{public static readonly retries = 3;}}
        static timeout = 1000; // Noncompliant [[qf2]]
    // fix@qf2 {{Add "readonly" keyword}}
    // edit@qf2 [[sc=4;ec=26]] {{static readonly timeout = 1000;}}
        static readonly version = 2;
        private static cache = new Map<string, string>();
        protected static parent = null;
        public port = 8080;
    }
hidden:
  more.fixture.ts: |
    class A {
      static #secret = 1;
      public static readonly ok = 1;
      static list: string[] = []; // Noncompliant
    }
answer:
  rule.ts: |
    import type { Rule } from 'eslint';
    import type estree from 'estree';
    import { generateMeta } from '../helpers/generate-meta.js';

    export const rule: Rule.RuleModule = {
      meta: generateMeta(
        { sonarKey: 'S1444' },
        {
          hasSuggestions: true,
          messages: { message: 'Make this public static property readonly.', fix: 'Add "readonly" keyword' },
        },
      ),
      create(context) {
        if (!/\.tsx?$/i.test(context.filename)) return {};
        return {
          'PropertyDefinition[readonly!=true][static=true][accessibility!="private"][accessibility!="protected"]'(node: estree.PropertyDefinition) {
            if (node.key.type === 'PrivateIdentifier') return;
            context.report({
              messageId: 'message',
              node: node.key,
              suggest: [
                {
                  messageId: 'fix',
                  fix: (fixer) => {
                    const staticToken = context.sourceCode.getTokens(node).find((t) => t.value === 'static');
                    return fixer.insertTextAfter(staticToken!, ' readonly');
                  },
                },
              ],
            });
          },
        };
      },
    };
hints:
  - "TSESTree's `PropertyDefinition` has `static`, `readonly` and `accessibility` (`'public'`, `'private'`, `'protected'` or absent). Attribute selectors can test them: `PropertyDefinition[static=true]`."
  - "A suggestion is `suggest: [{ messageId: 'fix', fix: (fixer) => … }]`; the `fix` message id is declared in `messages`."
  - "`static #secret` is private through its name, not through `accessibility`: its key is a `PrivateIdentifier`."
solution: |
  The selector does the filtering, as in SonarJS's S1444; `[readonly!=true]` matches both `readonly: false` and an absent attribute. The reference also skips `#private` fields, which are private through their name rather than through a modifier. SonarJS's selector does not exclude them: a `static #secret` field has no `accessibility` attribute, so S1444 at the pinned commit reports it. Whether that is a false positive is a judgement call, and exactly the kind a fixture records once it is made. The suggestion inserts text after the `static` token rather than rebuilding the declaration, so types, initialisers and comments are untouched.
```

## What comes next

Part I has one more chapter: a metric. Cognitive Complexity is a number SonarJS computes for every function, a rule that enforces a limit on it, and an unusual piece of plumbing, since the analyser borrows the rule to compute the metric.
