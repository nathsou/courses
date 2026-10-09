---
title: Regular expressions
summary: A language inside the language. Rules that parse patterns into trees, the automata behind regular expressions, and why some patterns take exponential time to fail.
number: 11
duration: 60 minutes
prerequisites: [types]
---

A regular expression is a small program, written in its own language, stored in a literal of the host language. To a JavaScript parser, `/^(\w+\s?)*$/` is a single token. Its bugs are invisible to every rule that looks only at JavaScript's tree: a character class that lists the same character twice, a group that can never match, an alternation that should be a class, and, worst of all, a pattern that takes exponential time on some inputs, which an attacker can supply. SonarJS has a family of rules for them, which share one piece of infrastructure: they parse the pattern into a tree of its own, and visit it.

## Regular expressions as trees

SonarJS parses patterns with `@eslint-community/regexpp`, the parser ESLint's own regex rules use. It produces a tree whose nodes mirror the pattern's grammar:

| Node | Pattern syntax |
|---|---|
| `Pattern`, `Alternative` | the whole pattern, and each branch of a `|` |
| `Character` | a single character, `a`, `\n`, `é` |
| `CharacterSet` | `.`, `\d`, `\w`, `\s` and their negations, `\p{…}` |
| `CharacterClass`, `CharacterClassRange` | `[a-z_]`, `[^0-9]`, and the range `a-z` inside |
| `Group`, `CapturingGroup` | `(?:…)`, and `(…)` or `(?<name>…)` |
| `Quantifier` | `*`, `+`, `?`, `{n,m}`, greedy or lazy, with `min`, `max` and the quantified `element` |
| `Assertion` | `^`, `$`, `\b`, and the lookarounds `(?=…)`, `(?!…)`, `(?<=…)`, `(?<!…)` |
| `Backreference` | `\1`, `\k<name>` |

Every node has `start` and `end` offsets into the pattern and its `raw` text. Here is `/^(y|n)$/i`:

```text
Pattern                  ^(y|n)$
  Assertion start        ^
  CapturingGroup         (y|n)
    Alternative          y
      Character          y
    Alternative          n
      Character          n
  Assertion end          $
```

## Finding the patterns

Before a rule can parse a pattern, it must find it, and JavaScript offers several places to put one:

- a regex literal, `/a|b/g`, whose pattern and flags the JavaScript parser already extracted;
- a call to the constructor, `new RegExp('a|b', 'g')` or `RegExp(…)`, whose arguments may be strings, template literals without expressions, or variables written once with one (single-write tracking again);
- a string method that converts a string argument to a regex: `text.match('a|b')`, `matchAll` and `search`. Only when `text` is a string, which takes types: that is why RSPEC tags SonarJS's regex rules `type-dependent`. (`split` and `replace` treat a string argument as plain text, not as a pattern.)

Reporting is harder than finding. An issue about a quantifier should be placed on the quantifier, not on the whole literal, and regexpp's offsets are offsets into the *pattern*. For a regex literal, the pattern is spelled in the source exactly as regexpp saw it, and an offset converts by addition. For a string, it is not: `'\\d+'` in the source is the pattern `\d+`, one character shorter, and every escape shifts the offsets. SonarJS tokenises string literals to map each pattern offset back to a source position; the course kit places the issue precisely only when the string has no escapes, and on the whole string otherwise.

All of this is packaged as a rule template. `createRegExpRule(handlers, meta)` builds an ESLint rule that finds every pattern, parses it, and runs a regexpp visitor over its tree, with the handlers the rule supplies: `onCharacterClassEnter`, `onQuantifierEnter`, `onGroupLeave`, and so on, one pair per node type. Each handler receives a context with `context.node`, the JavaScript node holding the pattern, and `context.reportRegExpNode({ message, regexpNode })`, which reports on the regex node's location. Sixteen of SonarJS's rules are written with it.

::source{path="packages/analysis/src/jsts/rules/helpers/regex/rule-template.ts" symbol="export function createRegExpRule"}

## Exercise: alternations of single characters

S6035, *Single-character alternations in regular expressions should be replaced with character classes*, reports `a|e|i|o|u`: a class `[aeiou]` says the same thing more clearly, and a backtracking engine tries a class in one step rather than one alternative at a time.

```rule
id: regular-expressions/single-character-alternation
title: Alternations of single characters
key: S6035
types: false
prompt: |
  Report every alternation with at least two alternatives, each of which is exactly one `Character`. Alternations appear in the pattern itself, in groups, in capturing groups and in lookaround assertions (lookaheads and lookbehinds: `Assertion` nodes of kind `lookahead` or `lookbehind`). Report on the node that holds the alternatives, with `context.reportRegExpNode`.
files:
  rule.ts: |
    import type { Rule } from 'eslint';
    import type { AST } from '@eslint-community/regexpp';
    import { createRegExpRule } from '../helpers/regex.js';
    import { generateMeta } from '../helpers/generate-meta.js';

    type Alternation = AST.Pattern | AST.Group | AST.CapturingGroup | AST.LookaroundAssertion;

    export const rule: Rule.RuleModule = createRegExpRule((context) => {
      function checkAlternation(alternation: Alternation) {
        // TODO
      }
      return {
        onPatternEnter: checkAlternation,
        // TODO: the other places where alternatives appear.
      };
    }, generateMeta({ sonarKey: 'S6035' }, {}));
fixtures:
  alternation.fixture.js: |
    const vowel = /a|e|i|o|u/; // Noncompliant {{Replace this alternation with a character class.}}
    //             ^^^^^^^^^
    const answer = /^(y|n)$/i; // Noncompliant
    //               ^^^^^
    const built = new RegExp('x|y|z'); // Noncompliant
    //                        ^^^^^
    const ahead = /\d+(?=k|m)/; // Noncompliant
    const words = /(a|bc)/;
    const sets = /(\d|x)/;
    const single = /(a)/;
    const clazz = /[aeiou]/;
hidden:
  more.fixture.js: |
    const nested = /((a|b)|cd)/; // Noncompliant
    const named = /(?<sign>\+|-)/; // Noncompliant
    const nonCapturing = /(?:a|b|c)+/; // Noncompliant
    const behind = /(?<!x|y)z/; // Noncompliant
    const pattern = 'p|q';
    const viaVariable = new RegExp(pattern); // Noncompliant
    const empty = /(a|)/;
    const escaped = /\.|,/; // Noncompliant
answer:
  rule.ts: |
    import type { Rule } from 'eslint';
    import type { AST } from '@eslint-community/regexpp';
    import { createRegExpRule } from '../helpers/regex.js';
    import { generateMeta } from '../helpers/generate-meta.js';

    type Alternation = AST.Pattern | AST.Group | AST.CapturingGroup | AST.LookaroundAssertion;

    export const rule: Rule.RuleModule = createRegExpRule((context) => {
      function checkAlternation(alternation: Alternation) {
        const { alternatives } = alternation;
        if (alternatives.length < 2) return;
        if (alternatives.every((alt) => alt.elements.length === 1 && alt.elements[0]!.type === 'Character')) {
          context.reportRegExpNode({ message: 'Replace this alternation with a character class.', regexpNode: alternation });
        }
      }
      return {
        onPatternEnter: checkAlternation,
        onGroupEnter: checkAlternation,
        onCapturingGroupEnter: checkAlternation,
        onAssertionEnter(node: AST.Assertion) {
          if (node.kind === 'lookahead' || node.kind === 'lookbehind') checkAlternation(node);
        },
      };
    }, generateMeta({ sonarKey: 'S6035' }, {}));
hints:
  - "Four handlers: `onPatternEnter`, `onGroupEnter`, `onCapturingGroupEnter`, and `onAssertionEnter`, where you keep only lookarounds."
  - "An alternative is \"exactly one character\" when `alt.elements.length === 1` and that element's `type` is `'Character'`. `\\d` is a `CharacterSet`, and `(a|)` has an empty alternative."
solution: |
  Visiting the regex tree is like visiting JavaScript's: a handler per node type, and the same "where can this structure appear?" question as for any rule. The location is what the template adds: `reportRegExpNode` puts the issue on `y|n` inside `/^(y|n)$/i`, or on `x|y|z` inside the string passed to `RegExp`. For `new RegExp(pattern)`, the pattern comes from a variable through single-write tracking, and the issue is placed on the argument, the only place the rule can point to. `/\.|,/` is reported: `\.` is an escaped `Character`, which a class can hold as `[.,]`.
```

## Automata, and why engines backtrack

The patterns of formal language theory, with only characters, concatenation, alternation and repetition, describe the **regular languages**, and every regular expression can be converted into a **finite automaton** that recognises the same strings. Ken Thompson's construction (1968) builds a non-deterministic automaton (NFA) with a number of states proportional to the pattern's length, and simulates it by keeping the *set* of states the automaton can be in after each character: every character of the input is processed once, against at most every state, so matching takes time proportional to the input's length times the pattern's. :cite[thompson1968] Converting the NFA to a deterministic automaton (DFA) by the subset construction makes each character cost one step, at the price of possibly exponentially many states, which engines build lazily. Go's `regexp`, Google's RE2 and Rust's `regex` crate work this way, and their matching time is linear in the input, whatever the pattern. :cite[cox2007]

JavaScript's engines do not, because JavaScript's regular expressions are not regular. A backreference, `^(\w+)\1$`, matches strings made of a word repeated twice, a language no finite automaton recognises; lookarounds and capturing semantics are awkward for automata too. So V8, SpiderMonkey and JavaScriptCore use **backtracking**: they walk the pattern as a program, try the first alternative or the longest repetition first, and when the rest of the pattern fails, go back to the last choice and try the next option. On most patterns, backtracking is fast. On some, the number of choices to go back to explodes. (V8 has an experimental linear-time engine for patterns without backreferences and lookarounds, behind a flag. :cite[v8nonbacktracking])

Here is a backtracking matcher, instrumented to count its steps, running the pattern on longer and longer inputs that almost match: `a`, `aa`, `aaa`… each followed by `!`. Try `^a+$`, then `^(a+)+$`.

:::backtrack-view{n="11.1" pump="a" suffix="!"}
```text
^(a+)+$
```
:::

With `^a+$`, the steps grow linearly. With `^(a+)+$`, they double with each extra `a`: at thirty characters, a real engine would take minutes. The reason is **ambiguity**. The string `aaaa` can be split into iterations of the outer `+` in eight ways (`aaaa`, `aaa·a`, `aa·aa`, `a·a·a·a`…), each iteration matched by the inner `a+`, and when the `!` makes every split fail at the `$`, the engine tries all of them before giving up. A pattern whose number of ways to match a string can grow exponentially with the string's length has **exponential ambiguity**; one whose number of ways grows like a polynomial, such as `\d+\d+` (where the split between the two runs of digits can be anywhere), has polynomial ambiguity, and backtracks in polynomial time, quadratic for `\d+\d+`. :cite[weideman2016]

Try `^(\w+\s?)*$` with `a` repeated, which looks innocent and is common in input validation, or `^(a|a)*$`, whose alternation is ambiguous on every character.

This is a security problem, **ReDoS** (regular expression denial of service), because the input is often attacker-controlled: a server that validates a field with an ambiguous pattern can be stalled by a single request with a few dozen carefully chosen characters, and in Node.js, a stalled regex stalls the whole process. It is also an availability problem without any attacker: in 2016, a post with 20,000 consecutive whitespace characters took Stack Overflow down for 34 minutes because of a regex with quadratic backtracking, and in 2019 a rule in Cloudflare's web application firewall with a pattern like `.*(?:.*=.*)` exhausted the CPU of its servers worldwide. :cite[stackoverflow2016,cloudflare2019] A study of the npm ecosystem found thousands of modules with super-linear patterns. :cite[davis2018]

## S5852 and scslre

S5852, *Regular expressions should not cause catastrophic backtracking*, is a vulnerability in SonarJS. Its implementation is short, because the analysis is a library: `scslre`, an open-source library that builds an automaton-like model of the pattern (with the `refa` library) and searches it for the shapes of super-linear backtracking. It returns reports of three kinds, and flags the exponential ones. :cite[scslre]

::source{path="packages/analysis/src/jsts/rules/S5852/rule.ts" symbol="reports.some(r => r.exponential)" title="S5852 keeps the exponential reports"}

S5852 reports only exponential backtracking. Polynomial patterns like `\d+\d+` are everywhere, and on inputs of bounded length they rarely matter; reporting them would bury the dangerous patterns in noise. The rule also catches exceptions from `scslre`, which does not understand every pattern JavaScript accepts, and skips those patterns rather than abort the file's analysis.

The figure shows `scslre`'s verdict under the chart. Compare it with the step counts: `scslre` does not report `^(a|a)*$` or `^(a{1,3})+$`, and both are exponential. Like every analysis in this course, S5852 approximates, here on the side of missing some dangerous patterns rather than raising issues on safe ones.

## Exercise: nested quantifiers

You can catch the most common exponential patterns without an automaton. The classic shape is a repetition of something that can itself be matched in several ways: an unbounded quantifier whose element contains another unbounded quantifier, `(a+)+`, `(\w+\s?)*`. The inner run can be split across iterations of the outer one, and the splits multiply. Not every nesting is ambiguous, though. In `(a+b)*`, each iteration must end with a `b`, so there is only one way to split a string into iterations, and the pattern is safe.

```rule
id: regular-expressions/nested-quantifiers
title: Nested unbounded quantifiers
key: S5852
corpus: true
types: false
prompt: |
  Implement a heuristic version of S5852. Report a quantifier with `max === Infinity` whose element is a group (capturing or not) with an alternative containing an unbounded quantified element (`max === Infinity`) such that every *other* element of that alternative is optional (a quantifier with `min === 0`). Report on the outer quantifier.
files:
  rule.ts: |
    import type { Rule } from 'eslint';
    import type { AST } from '@eslint-community/regexpp';
    import { createRegExpRule } from '../helpers/regex.js';
    import { generateMeta } from '../helpers/generate-meta.js';

    const message = 'Fix this regular expression that is vulnerable to exponential backtracking, as it can lead to denial of service.';

    export const rule: Rule.RuleModule = createRegExpRule((context) => {
      return {
        onQuantifierEnter(quantifier: AST.Quantifier) {
          // TODO
        },
      };
    }, generateMeta({ sonarKey: 'S5852' }, {}));
fixtures:
  redos.fixture.js: |
    const nested = /^(a+)+$/; // Noncompliant {{Fix this regular expression that is vulnerable to exponential backtracking, as it can lead to denial of service.}}
    //               ^^^^^
    const words = /^(\w+\s?)*$/; // Noncompliant
    //              ^^^^^^^^^
    const digits = new RegExp('^(\\d+[a-z]?)*$'); // Noncompliant
    const stars = /^(?:a*)*$/; // Noncompliant
    const separated = /^(a+b)*$/;
    const csv = /^(\s*,\s*\w+)*$/;
    const domain = /^([a-z]+\.)+[a-z]+$/;
    const flat = /^a+$/;
    const bounded = /^(a+){2}$/;
hidden:
  more.fixture.js: |
    const lazy = /^(a+?)+?$/; // Noncompliant
    const twoInner = /^(\d+|\w+)+$/; // Noncompliant
    const tail = /^(x?a*)+$/; // Noncompliant
    const required = /^(x a*)+$/;
    const classes = /^([a-z]+)$/;
answer:
  rule.ts: |
    import type { Rule } from 'eslint';
    import type { AST } from '@eslint-community/regexpp';
    import { createRegExpRule } from '../helpers/regex.js';
    import { generateMeta } from '../helpers/generate-meta.js';

    const message = 'Fix this regular expression that is vulnerable to exponential backtracking, as it can lead to denial of service.';

    const unbounded = (e: AST.Element): e is AST.Quantifier => e.type === 'Quantifier' && e.max === Infinity;
    const optional = (e: AST.Element) => e.type === 'Quantifier' && e.min === 0;

    /** Can one iteration be split into several: an unbounded run with only optional elements around it? */
    function splittable(alternative: AST.Alternative): boolean {
      return alternative.elements.some((e, i) => unbounded(e) && alternative.elements.every((other, j) => j === i || optional(other)));
    }

    export const rule: Rule.RuleModule = createRegExpRule((context) => {
      return {
        onQuantifierEnter(quantifier: AST.Quantifier) {
          if (quantifier.max !== Infinity) return;
          const element = quantifier.element;
          if (element.type !== 'Group' && element.type !== 'CapturingGroup') return;
          if (element.alternatives.some(splittable)) context.reportRegExpNode({ message, regexpNode: quantifier });
        },
      };
    }, generateMeta({ sonarKey: 'S5852' }, {}));
hints:
  - "Start from `onQuantifierEnter`: keep quantifiers with `max === Infinity` whose `element.type` is `'Group'` or `'CapturingGroup'`."
  - "For each alternative of the group, look for an element that is a quantifier with `max === Infinity` such that every other element of the alternative is a quantifier with `min === 0`."
  - "`(\\d+|\\w+)+` has two alternatives, each a single unbounded quantifier: one is enough."
solution: |
  The heuristic recognises the shape of the most common exponential patterns, and the fixture's safe cases show its reasoning: a required element (`b` in `(a+b)*`, `,` in the CSV pattern, `\.` in the domain pattern) fixes where each iteration ends, so the splits cannot multiply. It is still a heuristic, wrong in both directions. It misses ambiguity that comes from alternation, `(a|a)*` or `(a|aa)+`, and from bounded repetition, `(a{1,3})+`. And it reports `/(a+)+/` without anchors, which never backtracks: an unanchored pattern succeeds as soon as it matches one `a`, so a failure can never force the engine to try every split. `scslre` gets that last case right, because it reasons about what must follow the quantifier for the match to fail. That is the difference between matching shapes in a tree and analysing the automaton the tree denotes.
```

## What comes next

Part II is complete. Rules can now know what a name refers to, where a value comes from, what TypeScript knows about it, and what a pattern inside a string means. All of it is either flow-insensitive or borrowed from the compiler. Part III builds flow analysis from first principles: control-flow graphs, lattices, fixpoints, and the dataflow analyses SonarJS implements on top of ESLint's code paths.
