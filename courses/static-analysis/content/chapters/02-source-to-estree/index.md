---
title: Source to ESTree
summary: Tokens, grammars and abstract syntax trees; ESTree and its TypeScript extension; the three parsers SonarJS tries, in order.
number: 2
duration: 45 minutes
prerequisites: [one-issue]
---

The first rule you wrote in chapter 0 never looked at characters. It received `CallExpression` nodes, read their `callee`, and asked questions about their parts. Something had turned the text of the file into a tree before the rule ran. This chapter is about that step: how source text becomes a **syntax tree**, what the tree looks like in the JavaScript world, and which parser SonarJS uses for which file.

## Why not search the text?

A rule could look for problems in the raw text, the way `grep` does. Search Corkboard for `Math.random` and you find the call in `auth.ts`. But a text search also finds `Math.random` in comments and in strings, finds `Math.randomize` if someone defined one, and misses `Math['random']` and `Math .random`. Worse, text has no structure: to check that the two sides of an `&&` are the same, you would have to find where each side starts and stops, which means understanding operator precedence, parentheses, strings that contain `&&`, and so on. In other words, you would have to write a parser.

Every analyser therefore starts the same way: it **parses** the file once into a tree, and every rule works on the tree.

## Tokens

Parsing has two stages. The first, the **lexer** (or tokenizer), groups characters into **tokens**, the words of the language: keywords (`if`, `const`), identifiers (`page`), punctuators (`&&`, `(`, `=>`), string, number, template and regular-expression literals. Whitespace disappears. Comments are kept aside, because tools need them even though the language ignores them (the `// Noncompliant` comments of a fixture are an example).

Put the cursor anywhere in the code below and look at the **Tokens** tab: the token under the cursor is highlighted.

:::ast-explorer{n="2.1" title="Tokens" tabs="tokens,tree" subtitle="The lexer's output: what is left of the text once it is cut into words."}
```ts
// Is this page in range?
if (page > 0 && page > 0) {
  const label = `page ${page}`;
  const pattern = /^\d+$/;
}
```
:::

The lexer cannot always work alone. In `a / b / c` the slashes are division operators; in `x = /b/g` the slash starts a regular expression. Which one it is depends on what came before, so JavaScript lexers ask the parser whether an expression or an operator is expected next. This is one of several places where the language's design makes "just split the text" impossible.

## Grammar and precedence

The second stage, the **parser**, groups tokens into phrases according to the language's **grammar**: a set of rules saying, for example, that an `if` statement is the keyword `if`, a parenthesised expression, and a statement; or that an additive expression is two expressions joined by `+` or `-`. The ECMAScript specification is the grammar of JavaScript, a few hundred such rules.

The grammar also fixes **precedence** and **associativity**. In `a + b * c`, multiplication binds tighter, so the tree has `+` at the root and `b * c` as its right child. In `a - b - c`, subtraction is left-associative: the tree is `(a - b) - c`, not `a - (b - c)`, and the two have different values. Change the code below and watch the tree change shape.

:::ast-explorer{n="2.2" title="Precedence in the tree" tabs="tree,tokens" subtitle="Which operator ends up at the root?"}
```ts
const x = a + b * c;
const y = a - b - c;
const z = (a + b) * c;
const w = a || b && c;
```
:::

Notice what happened to the parentheses in `(a + b) * c`. They decided the shape of the tree and then vanished: there is no "parenthesised expression" node, only a `BinaryExpression` whose left child is another `BinaryExpression`. That is the difference between a **parse tree**, which records every token the grammar matched, and an **abstract syntax tree** (AST), which keeps only what matters for the meaning. Rules work on ASTs. When a rule does care about something the AST dropped, such as parentheses, semicolons or comments, it asks for the tokens, as you will in this chapter's exercise.

## ESTree

There are many JavaScript parsers, and in principle each could produce its own kind of tree. In practice almost all of them produce the same one. Mozilla's SpiderMonkey engine exposed its parser's trees to JavaScript code through what it called the Parser API; other parsers such as Esprima and Acorn adopted the same shape, and the community now maintains it as the **ESTree** specification. ESLint's rules, and therefore SonarJS's, are written against ESTree. :cite[estree]

An ESTree node is a plain object:

- `type` says what kind of node it is: `Identifier`, `CallExpression`, `IfStatement`, and about seventy more.
- The other properties depend on the type. A `BinaryExpression` has `operator`, `left` and `right`; an `IfStatement` has `test`, `consequent` and `alternate` (which may be `null`).
- `loc` gives the start and end line and column, and `range` the start and end offsets in the file. Issues are reported at these positions.
- ESLint adds `parent` to every node while it walks the tree, so a rule can look upwards as well as down.

A node's children are reached through its **visitor keys**: the properties that hold child nodes, in source order. ESLint uses them to walk the tree, and the kit's `childrenOf` uses them to list a node's children without knowing its type.

:::tip
The **Tree** tab of every inspector in this course shows the real ESTree that typescript-eslint produced, with each child labelled by the key its parent holds it under. Clicking a node selects its source range. When you write a rule and do not know what a piece of code looks like as a tree, paste it into an explorer and look.
:::

## TypeScript's extra nodes

TypeScript adds syntax that plain JavaScript does not have: type annotations, interfaces, enums, `as` casts, the non-null assertion `x!`, generics. The **typescript-eslint** project parses TypeScript with the TypeScript compiler itself, then converts TypeScript's own syntax tree into ESTree, extended with nodes for the TypeScript-only syntax. The extension is called **TSESTree**, and its extra node types start with `TS`: `TSTypeAnnotation`, `TSInterfaceDeclaration`, `TSAsExpression`, `TSNonNullExpression`. :cite[typescripteslint]

:::ast-explorer{n="2.3" title="TypeScript in ESTree" tabs="tree" subtitle="Types are just more nodes."}
```ts
interface Post {
  title: string;
  pinned?: boolean;
}

const post = load() as Post;
const title = post!.title;
```
:::

A JavaScript rule that knows nothing about TypeScript still works on TypeScript code: it sees the ESTree nodes it knows and ignores the `TS…` ones. But it can be fooled. `x as Foo` wraps `x` in a `TSAsExpression`, so a rule that expects an `Identifier` finds something else. This is why SonarJS's helpers include `unwrapTypeScriptExpression`, which strips `as`, `!` and `satisfies` off an expression before a rule looks at it. The course kit has the same helper.

typescript-eslint keeps something else that matters later: two maps between its ESTree nodes and the TypeScript compiler's nodes. Through them, a rule holding an ESTree node can ask the TypeScript type checker what the type of that expression is. Chapter 9 is about that.

## The three parsers SonarJS tries

SonarJS analyses JavaScript, TypeScript and Vue files, and no single parser accepts all of them. Its parser router tries up to three, in order:

1. **typescript-eslint**, for TypeScript files, and also for JavaScript files when the option `allowTsParserJsFiles` is on (its default). TypeScript's parser accepts all of modern JavaScript, and it gives JavaScript files type information too.
2. If that fails on a JavaScript file, **Babel**'s ESLint parser (`@babel/eslint-parser`), configured with the `flow` and `decorators` plugins, so it accepts code with Flow type annotations, which TypeScript's parser rejects. It first parses the file as a module.
3. If that fails too, Babel again, as a *script*. Some old JavaScript is valid as a script and not as a module (a variable called `yield` or `await`, `with` statements), so this last attempt rescues it. If it also fails, SonarJS reports the error from the module attempt, as the more likely intention.

`.vue` files go through **vue-eslint-parser**, which parses the template itself and hands the `<script>` part to typescript-eslint or Babel. Whatever parser succeeds, ESLint wraps its output in a `SourceCode` object, which every rule receives as `context.sourceCode`: the text, the AST, the tokens, the comments and the scope analysis.

::source{path="packages/analysis/src/jsts/builders/build.ts" symbol="parseAsJavascript" title="The parser router" note="build() tries typescript-eslint first, then Babel as a module, then as a script; .vue files go through vue-eslint-parser. The parsers themselves are listed in packages/analysis/src/jsts/parsers/eslint.ts as parsersMap."}

When every attempt fails, the file has no tree and no rule can run on it. SonarJS then reports the parse error itself, as an issue of a special rule, S2260, so that a file nobody can analyse does not silently look clean.

```quiz
q: "A JavaScript file contains a Flow type annotation, `function f(x: ?string) {}`. With SonarJS's default settings, which parser produces its tree?"
options:
  - text: "typescript-eslint"
    why: "It is tried first, but `?string` is not TypeScript syntax, so it fails."
  - text: "Babel, parsing the file as a module"
    correct: true
    why: "typescript-eslint rejects the Flow annotation; Babel's parser, configured with the `flow` plugin, accepts it on the next attempt."
  - text: "Babel, parsing the file as a script"
    why: "The script attempt only happens if the module attempt fails, and the module attempt succeeds here."
  - text: "None: SonarJS reports S2260"
    why: "Babel accepts Flow annotations, so the file parses."
```

## Exercise: parentheses the tree forgot

The AST drops parentheses, so a rule that wants to flag redundant ones has to go back to the tokens. SonarJS's S1110 does exactly that: *Redundant pairs of parentheses should be removed*. It lets each expression keep one pair for readability, and does not count the parentheses that belong to the surrounding syntax, such as those of an `if` condition or of a call with a single argument.

`context.sourceCode` gives you `getTokenBefore(nodeOrToken)` and `getTokenAfter(nodeOrToken)`. If the token before a node is `(` and the token after it is `)`, the node sits in a pair of parentheses; repeat from those two tokens to find the next pair out.

```rule
id: source-to-estree/parentheses
title: Redundant parentheses
key: S1110
prompt: |
  Complete `pairsAround` and the listener so that the rule reports every pair of parentheses beyond the first around an expression, ignoring the pair that belongs to an `if`, `while`, `do … while` or `switch` condition, or to a call or `new` with exactly one argument. Report on the opening parenthesis, with the closing one as a secondary location. Use the **Tokens** tab of the inspector to see what `getTokenBefore` will return.
files:
  rule.ts: |
    import type { AST, Rule, SourceCode } from 'eslint';
    import type estree from 'estree';
    import { generateMeta } from '../helpers/generate-meta.js';
    import { getParent } from '../helpers/ancestor.js';
    import { report, toSecondaryLocation } from '../helpers/location.js';

    interface ParenthesesPair {
      open: AST.Token;
      close: AST.Token;
    }

    /** The pairs of parentheses directly around `start`…`end`, innermost first. */
    function pairsAround(sourceCode: SourceCode, start: estree.Node | AST.Token, end: estree.Node | AST.Token): ParenthesesPair[] {
      // TODO: if the token before `start` is '(' and the token after `end` is ')', that is one pair;
      // then look for the next pair around those two tokens.
      return [];
    }

    /** The parent's own syntax puts these parentheses around `node` (if (…), while (…), f(…), …). */
    function parenthesesBelongToParent(node: estree.Node, parent: estree.Node | undefined): boolean {
      // TODO
      return false;
    }

    export const rule: Rule.RuleModule = {
      meta: generateMeta({ sonarKey: 'S1110', hasSecondaries: true }),
      create(context) {
        return {
          '*'(node: estree.Node) {
            const pairs = pairsAround(context.sourceCode, node, node);
            // TODO: drop the parent's pair if any, keep one pair for readability, report the rest.
          },
        };
      },
    };
fixtures:
  cb.fixture.ts: |
    declare const a: number, b: number;
    declare function f(x: unknown, y?: unknown): void;

    const one = (a + b);
    const two = ((a + b)); // Noncompliant {{Remove these redundant parentheses.}}
    //          ^       ^<
    const three = (((a))); // Noncompliant {{Remove these redundant parentheses.}} {{Remove these redundant parentheses.}}

    if ((a > b)) {}
    if (((a > b))) {} // Noncompliant
    f((a));
    f(((a))); // Noncompliant
    f((a), b);
    f(((a)), b); // Noncompliant
    const sum = ((a) + (b));
    const mixed = ((a)) + b; // Noncompliant
hidden:
  statements.fixture.ts: |
    declare const a: number;
    declare class Box { constructor(x: unknown) }
    while (((a))) {} // Noncompliant
    do {} while ((a));
    do {} while (((a))); // Noncompliant
    switch (((a))) { default: } // Noncompliant
    new Box((a));
    new Box(((a))); // Noncompliant
    const arrow = () => ((a)); // Noncompliant
    ((a)); // Noncompliant
answer:
  rule.ts: |
    import type { AST, Rule, SourceCode } from 'eslint';
    import type estree from 'estree';
    import { generateMeta } from '../helpers/generate-meta.js';
    import { getParent } from '../helpers/ancestor.js';
    import { report, toSecondaryLocation } from '../helpers/location.js';

    interface ParenthesesPair {
      open: AST.Token;
      close: AST.Token;
    }

    /** The pairs of parentheses directly around `start`…`end`, innermost first. */
    function pairsAround(sourceCode: SourceCode, start: estree.Node | AST.Token, end: estree.Node | AST.Token): ParenthesesPair[] {
      const before = sourceCode.getTokenBefore(start);
      const after = sourceCode.getTokenAfter(end);
      if (before?.value === '(' && after?.value === ')') {
        return [{ open: before, close: after }, ...pairsAround(sourceCode, before, after)];
      }
      return [];
    }

    const CONDITIONS: Record<string, string> = { IfStatement: 'test', WhileStatement: 'test', DoWhileStatement: 'test', SwitchStatement: 'discriminant' };

    /** The parent's own syntax puts these parentheses around `node` (if (…), while (…), f(…), …). */
    function parenthesesBelongToParent(node: estree.Node, parent: estree.Node | undefined): boolean {
      if (!parent) return false;
      const key = CONDITIONS[parent.type];
      if (key && (parent as unknown as Record<string, unknown>)[key] === node) return true;
      return (parent.type === 'CallExpression' || parent.type === 'NewExpression') && parent.arguments.length === 1 && parent.arguments[0] === node;
    }

    export const rule: Rule.RuleModule = {
      meta: generateMeta({ sonarKey: 'S1110', hasSecondaries: true }),
      create(context) {
        return {
          '*'(node: estree.Node) {
            const pairs = pairsAround(context.sourceCode, node, node);
            if (parenthesesBelongToParent(node, getParent(context, node))) pairs.pop();
            pairs.shift();
            for (const p of pairs) {
              report(context, { message: 'Remove these redundant parentheses.', loc: p.open.loc }, [toSecondaryLocation(p.close)]);
            }
          },
        };
      },
    };
hints:
  - "`pairsAround` is recursive: after finding the pair `before`/`after`, call `pairsAround(sourceCode, before, after)` to find the pairs around *those* tokens, and put the inner pair first."
  - "In `if ((a > b))`, the outermost pair around `a > b` is the `if`'s own. `getParent(context, node)` gives you the `IfStatement`; its `test` property is `node`."
  - "The order of the operations matters: first remove the parent's pair (the last, outermost one, with `pop()`), then keep one pair for readability (the first, innermost one, with `shift()`), and report what is left."
solution: |
  The reference follows S1110's structure. `pairsAround` walks outwards through the tokens. The listener runs on every node (`'*'`), drops the outermost pair when it belongs to the parent's syntax, drops the innermost as the one pair allowed for readability, and reports the rest, each on its opening parenthesis with the closing one as a secondary location. SonarJS's version also offers a suggestion that removes the pair (chapter 5) and treats a few more parents, such as arrow-function bodies and dynamic `import(…)`, the same way. Note that `if ((a > b))` raises nothing: one pair is the `if`'s, the other is the one allowed pair.
```

Two details of the exercise are worth keeping. First, the AST was enough to find *where* to look (each node) and *what surrounds it syntactically* (its parent); the tokens were needed only for what the AST had thrown away. Most rules mix the two the same way. Second, the decision "one extra pair is fine" is not syntax at all: it is a judgement about readability, written into the rule to keep its false positives down, the trade-off of chapter 1 again.

## What comes next

You now know what a rule is given: a tree, its tokens and its comments, wrapped in `context.sourceCode`. Chapter 3 looks at the rule itself: how ESLint calls it, how selectors pick nodes, and how a rule is laid out as a folder in SonarJS.
