---
title: Standing on other rules
summary: How SonarJS runs rules from ESLint's ecosystem, and how it adapts them by intercepting their reports, merging them, and removing whole classes of false positives.
number: 10
duration: 50 minutes
prerequisites: [types]
---

Half of SonarJS's rules were not written for SonarJS. Of the 582 rule folders at the pinned commit, 165 are **external** rules, run as they are from ESLint or one of its plugins, and 121 are **decorated** rules, which run an existing rule and change what it reports. ESLint's ecosystem has thousands of rules, many of them carefully maintained, and reimplementing one that already exists would be wasted work. But a rule written for a linter that a team configures for itself is not always fit to be on by default in a quality profile that thousands of projects use. This chapter is about the code in between.

## External rules

An external rule is the simplest case. Its `meta.ts` names the plugin and the rule, and its `index.ts` exports the plugin's rule object unchanged. S1117, the shadowing rule of chapter 7, is typescript-eslint's `no-shadow`:

::source{path="packages/analysis/src/jsts/rules/S1117/index.ts" symbol="rules['no-shadow']"}

At the pinned commit, the 165 external rules come from these plugins:

| Plugin | Rules |
|---|---|
| `eslint-plugin-unicorn` | 51 |
| ESLint's core rules | 43 |
| `eslint-plugin-jsx-a11y` | 19 |
| typescript-eslint | 16 |
| `eslint-plugin-react` | 15 |
| `@angular-eslint` | 10 |
| `@stylistic/eslint-plugin` | 6 |
| `eslint-plugin-vue`, `eslint-plugin-import` | 2 each |
| `eslint-plugin-testing-library` | 1 |

What SonarJS adds to an external rule is everything around it: a rule key and an RSPEC description, a place in quality profiles, and a configuration. A rule's options are declared once, in its `config.ts`, as a list of **fields**. Each field gives the option's name, its default, and, when it has a description, becomes a parameter that SonarQube shows in the rule's settings. The same declaration produces the ESLint options passed to the rule, so the SonarQube parameter and the ESLint option cannot drift apart. The defaults are SonarJS's, not the plugin's: S1117 runs `no-shadow` with `hoist: 'all'`, which also reports a variable shadowing one declared later in the outer scope.

::source{path="packages/analysis/src/jsts/rules/helpers/configs.ts" symbol="export type ESLintConfigurationSQProperty" title="Fields" note="A field with a description shows up in SonarQube's interface; customForConfiguration converts the value SonarQube stores into the option ESLint expects."}

Do not confuse external *rules* with external *issues*. A project can also run ESLint itself, with its own configuration, and give SonarQube the report (`sonar.eslint.reportPaths`); SonarQube then imports those issues as they are, without running anything. External rules run inside SonarJS's analysis, on SonarJS's parser, with SonarJS's configuration.

## Decorated rules

A decorated rule runs another rule with a different `context.report`. The helper is `interceptReport(rule, onReport)`: it returns a rule whose `create(context)` calls the original rule's `create` with a context whose `report` calls `onReport(context, descriptor)` instead of reporting. The interceptor then decides: report the descriptor as it is, change it and report it, report something else, or report nothing.

::source{path="packages/analysis/src/jsts/rules/helpers/decorators/interceptor.ts" symbol="export function interceptReport"}

ESLint freezes the context it gives rules, so the wrapper cannot simply replace `report` on it. SonarJS builds a fresh context object that copies the original's properties and methods, with its own `report`. That has a cost: a plugin rule that calls a context method the copy lacks breaks, which is why SonarJS has a second variant, `interceptReportForReact`, that makes the new context *inherit* from the original instead, for the React plugin's rules. The course kit uses the inheriting form for all rules.

What decorators do with reports falls into a few patterns, each visible in SonarJS's rules:

- **Reword.** S6660 decorates ESLint's `no-lonely-if`: same detection, Sonar's message, a smaller location.
- **Add a quick fix.** S1186 decorates `no-empty-function` and S6647 decorates `no-useless-constructor`, both with a suggestion the upstream rule lacks.
- **Drop a class of false positives.** S107 decorates `max-params` and ignores functions whose parameters nobody wrote by hand. This chapter's main exercise.
- **Combine.** S3854, *"super()" should be invoked appropriately*, runs both `constructor-super` and `no-this-before-super`, with `mergeRules`, which merges the listeners of several rules into one set: when two rules listen to the same event, both run.
- **Change the scope.** S3504, `no-var`, intercepts every report, keeps them aside, and at the end of the file decides whether to report them at all: in a file that uses `var` deliberately (at least three `var` declarations, and more than half of all its declarations), it reports nothing, rather than raise dozens of issues on a style choice.

::source{path="packages/analysis/src/jsts/rules/S3854/rule.ts" symbol="mergeRules(constructorSuperListener, notThisBeforeSuperListener)" title="S3854, two rules as one"}

A decorated rule also needs metadata: the upstream rule's messages and schema, plus SonarJS's. `generateMeta(meta, rule.meta)` builds it from the rule's generated Sonar metadata and the upstream meta, as for an original rule. And because a decorated rule produces the upstream rule's messages, a decorator that rewords must replace the message, not add a message id the upstream rule does not know.

The course gives your rules ESLint's real core rules, the way SonarJS gets them: `builtinRules` from `eslint/use-at-your-own-risk`, a `Map` from rule name to rule module.

## Exercise: reword a report

```rule
id: standing-on-other-rules/lonely-if
title: A more direct "else if"
key: S6660
types: false
prompt: |
  Decorate ESLint's `no-lonely-if` as S6660 does. Keep every report, but replace its message with `Replace this nested "if" with a more direct "else if".` and its location with the two characters of the `if` keyword of the nested statement (the reported node is that `IfStatement`). Keep the rest of the descriptor, in particular the fix.
files:
  rule.ts: |
    import type { Rule } from 'eslint';
    import { builtinRules } from 'eslint/use-at-your-own-risk';
    import { generateMeta } from '../helpers/generate-meta.js';
    import { interceptReport } from '../helpers/decorators.js';

    const noLonelyIf = builtinRules.get('no-lonely-if')!;

    export const rule: Rule.RuleModule = interceptReport(
      { ...noLonelyIf, meta: generateMeta({ sonarKey: 'S6660', quickFixMessage: "Replace with 'else if'" }, noLonelyIf.meta!) },
      (context, descriptor) => {
        // TODO: reword and relocate.
        context.report(descriptor);
      },
    );
fixtures:
  lonely.fixture.js: |
    function route(user, page) {
      if (!user) {
        return 'login';
      } else {
        if (page === 'admin') { // Noncompliant {{Replace this nested "if" with a more direct "else if".}}
      //^^
          return user.admin ? 'admin' : 'denied';
        }
      }
      if (page) {
        return page;
      } else if (user.home) {
        return user.home;
      }
      if (user.banned) {
        return 'banned';
      } else {
        if (user.muted) return 'muted';
        return 'home';
      }
    }
answer:
  rule.ts: |
    import type { Rule } from 'eslint';
    import { builtinRules } from 'eslint/use-at-your-own-risk';
    import { generateMeta } from '../helpers/generate-meta.js';
    import { interceptReport } from '../helpers/decorators.js';

    const noLonelyIf = builtinRules.get('no-lonely-if')!;

    export const rule: Rule.RuleModule = interceptReport(
      { ...noLonelyIf, meta: generateMeta({ sonarKey: 'S6660', quickFixMessage: "Replace with 'else if'" }, noLonelyIf.meta!) },
      (context, descriptor) => {
        if (!('node' in descriptor) || descriptor.node.type !== 'IfStatement' || !descriptor.node.loc) return;
        const { node, messageId, ...rest } = descriptor as Rule.ReportDescriptor & { node: Rule.Node; messageId?: string };
        const { start } = node.loc!;
        context.report({
          ...rest,
          message: 'Replace this nested "if" with a more direct "else if".',
          loc: { start, end: { line: start.line, column: start.column + 2 } },
        });
      },
    );
hints:
  - "The descriptor has `node` (the nested `IfStatement`), `messageId: 'unexpectedLonelyIf'` and `fix`. Destructure it: `const { node, messageId, ...rest } = descriptor`."
  - "Report `{ ...rest, message, loc }`: with a `loc`, ESLint does not need the node, and without the `messageId`, it uses your `message`."
solution: |
  The upstream rule does the detection, including the subtle part: an `else` block whose *only* statement is an `if`. The last `if` in the fixture has a second statement after it, so it is not lonely, and the decorator never sees it. What the decorator changes is presentation, which matters more than it seems: SonarQube shows the message to people who did not choose the rule, and a two-character location keeps the highlighted code readable when the nested `if` spans twenty lines. Keeping `...rest` keeps the upstream fix, which SonarJS turns into a quick fix titled with the rule's `quickFixMessage` (chapter 5).
```

## Removing a class of false positives

S107, *Functions should not have too many parameters*, decorates ESLint's `max-params`. The upstream rule counts parameters and reports a function that has more than the maximum (7 by default in SonarJS). The count is never wrong. But some functions have many parameters for reasons the rule's advice, *group them into an object*, does not apply to, and reporting them would teach users to ignore the rule. S107 drops three such classes:

- **TypeScript parameter properties.** `constructor(private readonly db: Db, private readonly log: Logger)` declares class fields, not ordinary parameters. A class with many dependencies may be a problem, but not one about this function's signature. Parameter properties do not count towards the maximum.
- **Angular constructors.** In a class decorated with `@Component`, the constructor's parameters are dependencies injected by the framework. (S107 recognises the decorator by its FQN, `@angular.core.Component`.)
- **AMD factory callbacks.** In `define(['db', 'log', 'cache'], function (db, log, cache) { … })`, the format of the AMD module loader used by RequireJS and SAP's UI5, the callback receives one parameter per entry of the dependency array before it. Its parameter list is dictated by the dependencies, not designed. Parameters beyond the number of dependencies are hand-written, and still count.

::source{path="packages/analysis/src/jsts/rules/S107/rule.ts" symbol="function isAmdFactoryCallback"}

Each exception is a **false-positive class**: a pattern, recognisable in the code, where the rule's check is literally satisfied and its issue is still not worth raising. Finding such classes is most of the work of maintaining a rule. They come from user reports, from the ruling (chapter 4), and from reviewing a rule's issues on real projects; chapter 21 is about that process. Once found, a class is removed with a precise condition, and a fixture that pins it.

S107 also *extends* the upstream rule: `max-params` does not look at TypeScript overload declarations without a body, `function f(a: A, b: B): R;`, so S107 adds its own listener for them and merges it with the decorated rule.

## Exercise: max-params without the false positives

```rule
id: standing-on-other-rules/max-params
title: Too many parameters, minus the ones nobody wrote
key: S107
options: [{ max: 3 }]
types: false
prompt: |
  Decorate `max-params` to drop two classes of reports. (1) Parameter properties (`TSParameterProperty` nodes in `params`) do not count: drop the report when the other parameters are within the maximum. (2) AMD factory callbacks: a function passed as an argument to a call of `define` or `require`, or of `sap.ui.define` or `sap.ui.require`, right after an array literal with at least as many elements as the function has parameters. The rule runs with the option `{ max: 3 }`, which reaches the interceptor as `context.options[0]`.
files:
  rule.ts: |
    import type { Rule } from 'eslint';
    import type estree from 'estree';
    import { builtinRules } from 'eslint/use-at-your-own-risk';
    import { generateMeta } from '../helpers/generate-meta.js';
    import { interceptReport } from '../helpers/decorators.js';
    import { isIdentifier } from '../helpers/ast.js';

    const maxParams = builtinRules.get('max-params')!;

    type FunctionLike = estree.Function & { parent?: estree.Node; params: (estree.Pattern | { type: 'TSParameterProperty' })[] };

    function getMax(option: unknown): number {
      if (typeof option === 'number') return option;
      if (option && typeof option === 'object' && typeof (option as { max?: unknown }).max === 'number') return (option as { max: number }).max;
      return 7;
    }

    export const rule: Rule.RuleModule = interceptReport(
      { ...maxParams, meta: generateMeta({ sonarKey: 'S107' }, maxParams.meta!) },
      (context, descriptor) => {
        if (!('node' in descriptor)) return;
        const fn = descriptor.node as unknown as FunctionLike;
        const max = getMax(context.options[0]);
        // TODO: drop the two classes of false positives.
        context.report(descriptor);
      },
    );
fixtures:
  services.fixture.ts: |
    interface Db {}
    interface Log {}
    interface Cache {}
    interface Clock {}

    export function connect(host: string, port: number, user: string, password: string) {} // Noncompliant {{Function 'connect' has too many parameters (4). Maximum allowed is 3.}}

    export class Service {
      constructor(private readonly db: Db, private readonly log: Log, private readonly cache: Cache, private readonly clock: Clock) {}
      move(x: number, y: number, z: number, t: number) {} // Noncompliant {{Method 'move' has too many parameters (4). Maximum allowed is 3.}}
    }

    export class Mixed {
      constructor(private readonly db: Db, log: Log, cache: Cache, clock: Clock) {}
    }
  amd.fixture.js: |
    define(['db', 'log', 'cache', 'clock'], function (db, log, cache, clock) {
      return { db, log, cache, clock };
    });

    require(['db'], function (db, log, cache, clock) {}); // Noncompliant {{Function has too many parameters (4). Maximum allowed is 3.}}

    sap.ui.define(['m/a', 'm/b', 'm/c', 'm/d'], function (a, b, c, d) {});

    run(['a', 'b', 'c', 'd'], function (a, b, c, d) {}); // Noncompliant
hidden:
  more.fixture.ts: |
    interface A {}
    export class Two {
      constructor(private a: A, b: A, c: A, d: A, e: A) {} // Noncompliant
    }
    declare function define(deps: string[], factory: Function): void;
    define(['x', 'y', 'z', 'w', 'v'], function (x: A, y: A, z: A, w: A) {});
    define(['x'], (x: A, y: A, z: A, w: A) => {}); // Noncompliant
    define((x: A, y: A, z: A, w: A) => {}); // Noncompliant
    export const arrow = (a: A, b: A, c: A, d: A) => a; // Noncompliant
answer:
  rule.ts: |
    import type { Rule } from 'eslint';
    import type estree from 'estree';
    import { builtinRules } from 'eslint/use-at-your-own-risk';
    import { generateMeta } from '../helpers/generate-meta.js';
    import { interceptReport } from '../helpers/decorators.js';
    import { isIdentifier } from '../helpers/ast.js';

    const maxParams = builtinRules.get('max-params')!;

    type FunctionLike = estree.Function & { parent?: estree.Node; params: (estree.Pattern | { type: 'TSParameterProperty' })[] };

    function getMax(option: unknown): number {
      if (typeof option === 'number') return option;
      if (option && typeof option === 'object' && typeof (option as { max?: unknown }).max === 'number') return (option as { max: number }).max;
      return 7;
    }

    function isAmdCall(node: estree.Node | undefined): node is estree.CallExpression {
      if (node?.type !== 'CallExpression') return false;
      const callee = node.callee;
      if (isIdentifier(callee, 'define', 'require')) return true;
      return (
        callee.type === 'MemberExpression' &&
        isIdentifier(callee.property, 'define', 'require') &&
        callee.object.type === 'MemberExpression' &&
        isIdentifier(callee.object.object, 'sap') &&
        isIdentifier(callee.object.property, 'ui')
      );
    }

    function isAmdFactoryCallback(fn: FunctionLike): boolean {
      const call = fn.parent;
      if (!isAmdCall(call)) return false;
      const index = call.arguments.indexOf(fn as unknown as estree.Expression);
      const dependencies = index > 0 ? call.arguments[index - 1] : undefined;
      return dependencies?.type === 'ArrayExpression' && fn.params.length <= dependencies.elements.length;
    }

    export const rule: Rule.RuleModule = interceptReport(
      { ...maxParams, meta: generateMeta({ sonarKey: 'S107' }, maxParams.meta!) },
      (context, descriptor) => {
        if (!('node' in descriptor)) return;
        const fn = descriptor.node as unknown as FunctionLike;
        const max = getMax(context.options[0]);
        const ordinary = fn.params.filter((p) => p.type !== 'TSParameterProperty').length;
        if (ordinary <= max || isAmdFactoryCallback(fn)) return;
        context.report(descriptor);
      },
    );
hints:
  - "The reported node is the function. Its `params` include `TSParameterProperty` nodes for `private readonly db: Db`: count the others, and drop the report if they are within `max`."
  - "For AMD, `fn.parent` is the call. Find the function's index among `call.arguments`; the argument just before it must be an `ArrayExpression` whose `elements.length` is at least `fn.params.length`."
  - "`sap.ui.define` is a `MemberExpression` whose `object` is the `MemberExpression` `sap.ui`."
solution: |
  The interceptor never decides that a function has too many parameters; `max-params` already did. It only decides that, for this function, the issue is not worth raising. That division of labour is what makes decorating safe: when `max-params` gains support for a new syntax, S107 gains it too. The AMD check is precise on purpose: it requires the array *right before* the function, and only exempts the parameters the array accounts for, so `require(['db'], function (db, log, cache, clock) {})` is still reported, and so is a lookalike `run([...], fn)` from some other library. SonarJS's version also makes sure that `define`, `require` or `sap` is the global and not a local variable that happens to share the name (`isGlobalShadowed`), and handles Angular constructors with an FQN check on the decorator.
```

## Suppressions and other users

Two details show how deeply SonarJS integrates the rules it borrows.

**Suppression comments.** A team migrating from ESLint has `// eslint-disable-next-line no-shadow` comments in its code. When SonarJS runs typescript-eslint's `no-shadow` as S1117, that comment should still silence the issue. SonarJS registers, for every rule, the names it is known by, its Sonar key, its `eslintId`, and the names of the upstream rules it decorates, and maps directives that use any of them to the SonarJS rule.

::source{path="packages/analysis/src/jsts/linter/pragmas.ts" symbol="registerRuleAlias(" title="Directive aliases"}

**eslint-plugin-sonarjs.** The same rules ship as an ESLint plugin, for teams that use ESLint directly. The plugin contains only the original rules: users of ESLint can install the upstream plugins themselves, and configure them as they wish.

The cost of standing on other rules is that their behaviour can change under you. A new version of a plugin may report more, or less, or differently, and a decorator may depend on a detail of a report descriptor that a refactoring upstream changes. The ruling, which runs every rule on a corpus of real projects and compares the issues with the expected ones, is what catches such changes when SonarJS updates a dependency.

## What comes next

Part II's last chapter is about a language inside the language: regular expressions, which rules can parse into trees of their own, and analyse for a kind of bug that only shows up under load.
