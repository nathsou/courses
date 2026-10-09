---
title: One issue, end to end
summary: An issue in your editor, the rule that raised it, and your first rule, ten lines that find Math.random wherever it hides.
number: 0
duration: 35 minutes
---

Here is a line from Corkboard, the small noticeboard web application this course keeps coming back to. It handles a request for one page of a board's posts:

```typescript title="corkboard/src/routes/posts.ts"
postsRouter.get('/boards/:board', async (req, res) => {
  const page = Number(req.query.page ?? 1);
  if (page > 0 && page > 0) {
    const posts = await postsOnBoard(req.params.board, PAGE_SIZE, (page - 1) * PAGE_SIZE);
    // …
```

Open this file in an editor with SonarQube for IDE, and the second `page > 0` is underlined. Hover over it and you get a message: *Correct one of the identical sub-expressions on both sides of operator "&&"*. The first `page > 0` is highlighted as well, more faintly. Next to the message is a code, **S1764**.

That underline is an :term[issue]. It was raised by a :term[rule], and S1764 is the rule's :term[rule key]. The rule's specification, its title, its explanation and its examples, lives in RSPEC, Sonar's repository of rule specifications, under the same key: *Identical expressions should not be used on both sides of a binary operator*. The programmer probably meant `page > 0 && page <= pageCount`, and a check that should reject page 9,000 of a 3-page board does nothing.

Nobody ran this code to find the bug. No test failed. A program read the source and noticed that the two sides of `&&` are the same expression. That program is a **static analyser**, and this course is about how such programs work, how to write the rules they run, and how far the idea of "reading the code instead of running it" can be pushed.

## What raised the issue

The JavaScript and TypeScript analyser behind SonarQube is called **SonarJS**. Its source is public, and its rules are written in TypeScript, one folder per rule. S1764 lives here:

::source{path="packages/analysis/src/jsts/rules/S1764/rule.ts" symbol="rule" note="About ninety lines with its comments and licence header. Every SonarJS reference in this course points at the same commit of the repository, so the code you read there is the code the course describes."}

If you open it, you will find that the rule is an object with a `create` function. ESLint, the JavaScript linter that SonarJS builds on, calls `create` once per file. `create` returns *listeners*, functions keyed by the kind of syntax they want to see: one for `LogicalExpression` (`&&`, `||`), one for `BinaryExpression` (`-`, `/`, `<`, …). ESLint walks the file's syntax tree and calls each listener on every matching node. The listener asks a helper, `areEquivalent`, whether the left and right operands are the same expression, ignoring spaces and comments, and if they are, reports an issue on the right operand with the left operand as a *secondary location*. That is the faint highlight.

The rule has a few refinements you would not guess at first. It ignores `x === x` when both sides are plain identifiers, because comparing a variable with itself is the classic test for `NaN` (the only value not equal to itself). It ignores `1 << 1`, a common way of writing a bit flag. Every rule you will meet is like this: a simple idea, plus the exceptions that real code taught its authors.

:::key
A rule is a small program that looks at a syntax tree and reports issues. Writing one means deciding which syntax to visit, what to check, and where to put the issue. The rest of this course adds more knowledge to "what to check": scopes, types, control flow, abstract values, data flowing between functions, and paths through the program.
:::

## How the issue got to your editor

Between your keystroke and the underline, the issue made a round trip through more machinery than the rule itself. Here is the whole journey in one paragraph; Part IV takes it apart.

SonarQube for IDE, or a scanner running on a build server, hosts SonarJS's Java plugin. The plugin starts a Node.js process (bundled with the plugin) and sends it the files to analyse over gRPC, a remote-procedure-call protocol. In Node.js, each file is parsed into a syntax tree, a TypeScript program provides type information, and ESLint runs every rule the :term[quality profile] enables. Each issue comes back to the Java side with its location, secondary locations and any quick fix, and the IDE draws it.

```text
editor ──► Java plugin ──gRPC──► Node.js: parse → TypeScript program → ESLint + rules
   ▲                                                                      │
   └────────────────────── issues (location, message, secondaries) ◄──────┘
```

## Your first rule

Corkboard creates session tokens like this:

```typescript title="corkboard/src/routes/auth.ts"
function newSessionToken(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
```

`Math.random` is not designed to be unpredictable: its output can be predicted from earlier outputs, and a session token that an attacker can predict is a session they can steal. SonarJS's rule **S2245** flags calls to `Math.random`, with the message *Make sure that using this pseudorandom number generator is safe here*. The message asks the developer to make sure rather than declaring the code wrong, because most uses of `Math.random` (shuffling a list, adding jitter to a retry delay) are fine. Sonar long classified rules like this as **Security Hotspots**: code to review rather than a confirmed vulnerability. In SonarJS's rule metadata at the commit this course follows, S2245 is a vulnerability rule carrying the tag `former-hotspot`.

Writing it seems easy: visit every call, check that the callee is `Math.random`. The workbench below holds that first attempt. It is a real ESLint rule, run by the real ESLint and typescript-eslint parser, in your browser.

The bottom editor holds a **fixture**: code the rule runs on, annotated with what it should find. A comment `// Noncompliant` says "an issue is expected on this line"; lines without one must stay clean. This is the format SonarJS's own rule tests use. Press **Run** (or Mod-Enter in an editor) and look at the results.

```rule
id: one-issue/random
title: Find every call to Math.random
key: S2245
corpus: true
prompt: |
  The starting rule matches calls written literally as `Math.random()`. Press **Run**: two calls in the fixture slip past it, and it flags one call that is not `Math.random` at all. Make the rule find every call to `Math.random`, and only those. Then press **Submit**, which also runs fixtures you cannot see.
files:
  rule.ts: |
    import type { Rule } from 'eslint';
    import type estree from 'estree';

    export const rule: Rule.RuleModule = {
      meta: {
        messages: { safeGenerator: 'Make sure that using this pseudorandom number generator is safe here.' },
      },
      create(context) {
        return {
          CallExpression(node: estree.CallExpression) {
            const callee = node.callee;
            if (
              callee.type === 'MemberExpression' &&
              callee.object.type === 'Identifier' && callee.object.name === 'Math' &&
              callee.property.type === 'Identifier' && callee.property.name === 'random'
            ) {
              context.report({ node, messageId: 'safeGenerator' });
            }
          },
        };
      },
    };
fixtures:
  cb.fixture.ts: |
    function token(): string {
      return Math.random().toString(36).slice(2); // Noncompliant {{Make sure that using this pseudorandom number generator is safe here.}}
    }

    const { random } = Math;
    const roll = random(); // Noncompliant

    const rng = Math.random;
    const jitter = rng() * 100; // Noncompliant

    const secure = crypto.getRandomValues(new Uint32Array(1)); // a different function
    const sum = Math.max(1, 2);

    function scope(Math: { random(): number }) {
      return Math.random(); // a parameter called Math, not the global
    }
hidden:
  aliases.fixture.ts: |
    const m = Math;
    m.random(); // Noncompliant
    Math['random'](); // Noncompliant
    const { random: r } = Math;
    r(); // Noncompliant
    const notMath = { random: () => 4 };
    notMath.random();
answer:
  rule.ts: |
    import type { Rule } from 'eslint';
    import type estree from 'estree';
    import { getFullyQualifiedName } from '../helpers/module.js';

    export const rule: Rule.RuleModule = {
      meta: {
        messages: { safeGenerator: 'Make sure that using this pseudorandom number generator is safe here.' },
      },
      create(context) {
        return {
          CallExpression(node: estree.CallExpression) {
            if (getFullyQualifiedName(context, node) === 'Math.random') {
              context.report({ node, messageId: 'safeGenerator' });
            }
          },
        };
      },
    };
hints:
  - "Matching the spelling of the call cannot work: `random()` and `rng()` do not mention `Math` at all. You need to know where the called value *comes from*."
  - "The course kit has the helper SonarJS uses for this: `getFullyQualifiedName(context, node)` in `../helpers/module.js`. Type `import { getFullyQualifiedName } from '../helpers/module.js';` and hover over the name to read its documentation, or press F12 on it to open its source."
  - "For a call, the fully qualified name is the name of what is called: `'Math.random'` for all three calls in the fixture, and `null` or something else for the others."
solution: |
  Replace the syntactic test with `getFullyQualifiedName(context, node) === 'Math.random'`. The helper follows `random` back to `const { random } = Math`, and `rng` back to `const rng = Math.random`, and resolves both to the global `Math.random`. It also sees that the `Math` in the last function is a parameter, not the global, and does not resolve that call to `Math.random`. This is exactly the test SonarJS's S2245 makes. Chapter 8 explains how fully qualified names are computed, and where they stop working.
```

Notice what changed between the two versions. The first rule looked at the *shape* of the code. The second asked what the code *means*: which variable a name refers to, and where that variable's value came from. Reading code for its meaning, without running it, is what this course is about.

## What this course covers

The course has two tracks.

**Track A, SonarJS as it is**, teaches static analysis the way a production analyser does it today. You will write rules that walk syntax trees (Part I), resolve names, imports and types (Part II), and reason about control flow and dataflow (Part III), each time with the SonarJS rule that does the same thing as the example. Part IV then follows one file through the whole analyser, from the scanner to the issues it reports.

**Track B, beyond SonarJS**, teaches the theory that goes further: abstract interpretation (Part V), analysis across functions and objects (Part VI), taint analysis (Part VII) and symbolic execution (Part VIII). SonarJS does not use these techniques for JavaScript today. The examples come from analysers that do, such as Astrée, Infer, FlowDroid, CodeQL and KLEE, and the course builds small versions of each engine that your rules can call.

You do not need to know any of this already. The course assumes you can read TypeScript or JavaScript and nothing else: grammars, graphs, lattices, the TypeScript compiler's API, web security and SAT solving are all explained where they are first used.

:::note
Every interactive in the course runs in your browser. The first one you use loads TypeScript, ESLint and typescript-eslint (a few megabytes) into a background worker; after that, runs take a fraction of a second. Your edits are saved in this browser as you type.
:::

The next chapter starts with a question that sounds like it should have a simple answer: could a rule that catches *every* bug of some kind, and nothing else, exist at all?
