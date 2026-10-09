---
title: Scopes and references
summary: What a name refers to, how ESLint's scope manager records it, and the cheapest dataflow analysis there is, following a variable to the one place it is written.
number: 7
duration: 60 minutes
prerequisites: [anatomy-of-a-rule, testing-rules]
---

The rules of Part I looked at the shape of the code. An `Identifier` node told them a name, and nothing more. Most rules need more: in `exec(command)`, is `exec` the function from `child_process` or a local helper that happens to have the same name? Is `command` a constant string or something a user typed? This part of the course gives rules three kinds of knowledge the tree does not carry by itself: what a name refers to (this chapter), where an imported value comes from (chapter 8), and what TypeScript knows about types (chapter 9).

## Names and variables

A **declaration** introduces a variable into a **scope**, a region of the program where that variable can be referred to by its name. A use of the name somewhere else is a **reference**, and **resolving** it means finding the declaration it refers to. JavaScript resolves names **lexically**: from the reference, look in the innermost scope that encloses it, then in the scope around that, and so on outwards. The first declaration found wins. Because the answer depends only on where the code is written, not on how it runs, an analyser can compute it without running anything.

```ts
const limit = 10;

function page(items: string[], limit: number) {
  // This `limit` is the parameter: it shadows the constant above.
  return items.slice(0, limit);
}
```

When an inner declaration has the same name as an outer one, it **shadows** it: the outer variable cannot be named inside the inner scope. Shadowing is legal and often confusing, and the rule S1117 reports it. SonarJS does not implement S1117 itself: it is an *external* rule, typescript-eslint's `no-shadow` run with SonarJS's configuration (chapter 10 shows how).

JavaScript has more kinds of scope than most languages, because of its history:

- The **global** scope, shared by every script on a page. A `var` or a function declared at the top level of a script becomes a property of the global object.
- A **module** scope for each ES module: top-level declarations of a module are private to it unless exported.
- A **function** scope for each function. A `var` declaration belongs to the nearest enclosing function, wherever it appears in the function's body: it is **hoisted**.
- A **block** scope for each block, for `let`, `const` and `class`. A block-scoped variable exists from the start of its block, but reading it before its declaration has run throws: the region between the two is its **temporal dead zone**.
- Smaller ones: `for` loops with `let` get a scope of their own, a `catch` clause gets one for its parameter, a class gets one, and a named function expression gets a tiny scope holding only its own name.

Two constructs defeat lexical resolution. Inside `with (obj) { x }`, `x` may be a property of `obj` or a variable, depending on `obj` at run time. And a direct call to `eval` can declare new variables in the calling function. Modules and strict mode forbid `with` and confine `eval`, which is one reason static analysis of modern JavaScript is easier than of the JavaScript of 2005. The scope manager marks scopes containing such constructs as dynamic, and rules that depend on precise resolution are wary of them.

```quiz
q: "In `function f() { if (ok) { var a = 1; let b = 2; } return [a, b]; }`, which names resolve to the declarations inside the `if`?"
options:
  - text: "Both `a` and `b`"
    why: "`b` is block-scoped: outside the block it is not declared, so the `b` in the `return` resolves outwards, possibly to a global."
  - text: "Only `a`"
    correct: true
    why: "`var` is function-scoped and hoisted, so `a` is visible throughout `f` (and `undefined` when `ok` is false). `let b` is visible only inside the block."
  - text: "Only `b`"
    why: "It is the other way round: `let` is confined to its block, `var` is not."
```

## The scope manager

ESLint computes scopes once per file, after parsing and before any rule runs, with a **scope manager**: `eslint-scope` for JavaScript, or `@typescript-eslint/scope-manager` when typescript-eslint is the parser, which is the case for almost every file SonarJS analyses (chapter 2). Both produce the same model, of three kinds of object.

| Object | What it is | Main properties |
|---|---|---|
| `Scope` | a region: the global scope, a module, a function, a block… | `type`, `block` (the node that creates it), `variables` and `set` (by name), `references`, `through`, `upper`, `childScopes`, `variableScope` |
| `Variable` | one declared name in one scope | `name`, `defs` (its declarations), `identifiers`, `references` |
| `Reference` | one occurrence of a name in an expression | `identifier`, `from` (its scope), `resolved` (a `Variable` or `null`), `isRead()`, `isWrite()`, `writeExpr`, `init` |

Each `Definition` in `defs` has a `type` that says how the variable was declared: `Variable` (`var`, `let`, `const`), `FunctionName`, `Parameter`, `ClassName`, `ImportBinding`, `CatchClause`, `ImplicitGlobalVariable`, and, with typescript-eslint, `Type`, `TSEnumName` and others for names that exist only in the type system.

A rule reaches this model through its context. `context.sourceCode.getScope(node)` returns the innermost scope containing `node`; `context.sourceCode.getDeclaredVariables(node)` returns the variables a declaration node declares; and `context.sourceCode.scopeManager` is the whole thing.

Explore the scopes of the code below. Each variable lists its references, marked `r` for a read and `w` for a write, with their line; click one to see it in the code.

:::ast-explorer{n="7.1" title="Scopes, variables, references" tabs="scopes,tree" subtitle="Where each name is declared, and every place it is used."}
```ts
import { exec } from 'child_process';

const prefix = 'ls ';
let runs = 0;

export function list(dir: string, verbose = false) {
  runs++;
  for (const entry of [dir]) {
    const command = prefix + entry;
    if (verbose) {
      log = command;
    }
    exec(command);
  }
}
```
:::

A few things to notice. The module scope holds `exec`, `prefix`, `runs` and `list`; the function scope holds `dir` and `verbose`; the `for` loop has a scope of its own for `entry`, and its body block one for `command`. The reference `runs++` is both a read and a write. The parameter `verbose` has a write as well as a read: a default value counts as a write, and `false` is its `writeExpr`. And `log` is declared nowhere.

## References that go through

A reference that a scope cannot resolve with its own variables is passed to the enclosing scope, and recorded in the inner scope's **`through`** list on the way. At the global scope, `through` holds whatever nobody declared: built-in globals like `console` or `JSON`, unless the configuration declares them (SonarJS declares the globals of the environments listed in the `sonar.javascript.environments` property, and the names in `sonar.javascript.globals`), and names the code uses without declaring.

Writing to an undeclared name is a classic JavaScript mistake. Outside strict mode, `log = command` does not throw: it silently creates a property of the global object, an **implicit global**, visible to every other script on the page. In strict mode and in modules it throws a `ReferenceError`, but only when the line runs. The rule S2703 reports such writes; its implementation is the shortest scope-based rule in SonarJS. At the end of the program, it looks at the global scope's `through` list for write references, skips names that are known globals of some environment, and reports each remaining name once.

::source{path="packages/analysis/src/jsts/rules/S2703/rule.ts" symbol="globalScope.through" title="S2703, implicit globals" note="Known globals come from the globals package, which lists the global names of browsers, Node.js, test frameworks and other environments."}

```rule
id: scopes/implicit-globals
title: Implicit globals
key: S2703
types: false
inspector: [scopes, tree]
prompt: |
  Report every write to an undeclared variable, once per name, on its first write. Names in `knownGlobals` are deliberate writes to a host's global and are not reported. Open the inspector's **scopes** tab on the fixture: the names that go through the global scope are listed at the bottom of each scope.
files:
  rule.ts: |
    import type { Rule } from 'eslint';
    import type estree from 'estree';
    import { generateMeta } from '../helpers/generate-meta.js';

    // A few names of the browser's and Node.js's globals. SonarJS uses the complete lists of the `globals` package.
    const knownGlobals = new Set(['window', 'document', 'location', 'name', 'status', 'onload', 'module', 'exports', 'process', 'global', 'globalThis']);

    export const rule: Rule.RuleModule = {
      meta: generateMeta(
        { sonarKey: 'S2703' },
        { messages: { explicitModifier: 'Add the "let", "const" or "var" keyword to this declaration of "{{variable}}" to make it explicit.' } },
      ),
      create(context) {
        return {
          'Program:exit'(node: estree.Node) {
            const globalScope = context.sourceCode.getScope(node);
            // TODO: the write references in globalScope.through, one report per name.
          },
        };
      },
    };
fixtures:
  globals.fixture.js: |
    function init(items) {
      counter = 0; // Noncompliant {{Add the "let", "const" or "var" keyword to this declaration of "counter" to make it explicit.}}
    //^^^^^^^
      for (i = 0; i < items.length; i++) { // Noncompliant {{Add the "let", "const" or "var" keyword to this declaration of "i" to make it explicit.}}
        counter++;
      }
      let total = 0;
      total = counter;
      console.log(total, undeclared);
      window.title = 'Corkboard';
      name = 'corkboard';
      return total;
    }
hidden:
  more.fixture.js: |
    var declared;
    declared = 1;
    function later() {
      result = compute(); // Noncompliant {{Add the "let", "const" or "var" keyword to this declaration of "result" to make it explicit.}}
      ({ a, b: limit } = settings); // Noncompliant {{Add the "let", "const" or "var" keyword to this declaration of "a" to make it explicit.}} {{Add the "let", "const" or "var" keyword to this declaration of "limit" to make it explicit.}}
      module.exports = result;
      exports.limit = limit;
      try {} catch (e) { e = null; }
    }
    function compute() { return 1; }
answer:
  rule.ts: |
    import type { Rule } from 'eslint';
    import type estree from 'estree';
    import { generateMeta } from '../helpers/generate-meta.js';

    const knownGlobals = new Set(['window', 'document', 'location', 'name', 'status', 'onload', 'module', 'exports', 'process', 'global', 'globalThis']);

    export const rule: Rule.RuleModule = {
      meta: generateMeta(
        { sonarKey: 'S2703' },
        { messages: { explicitModifier: 'Add the "let", "const" or "var" keyword to this declaration of "{{variable}}" to make it explicit.' } },
      ),
      create(context) {
        return {
          'Program:exit'(node: estree.Node) {
            const globalScope = context.sourceCode.getScope(node);
            const reported = new Set<string>();
            for (const reference of globalScope.through) {
              const { name } = reference.identifier;
              if (!reference.isWrite() || knownGlobals.has(name) || reported.has(name)) continue;
              reported.add(name);
              context.report({ node: reference.identifier, messageId: 'explicitModifier', data: { variable: name } });
            }
          },
        };
      },
    };
hints:
  - "`reference.isWrite()` is true for `x = …`, `x++`, `x += …`, and for each name in a destructuring assignment `({ a } = obj)`."
  - "References in `through` come in source order, so the first write to a name is the first one you meet."
solution: |
  `through` does the work: the scope manager has already resolved every reference it could, and what reaches the global scope unresolved is, by definition, undeclared. Note what is *not* reported: `window.title = …` writes a property, and its only reference to a name is a read of `window`; `console.log(total, undeclared)` reads undeclared names, which is a different problem (S3827, *Variables should be defined before being used*, not in the default quality profile). The `for (i = 0; …)` loop is the case this rule exists for: a missing `let` turns `i` into a global, shared with every other loop in every other script that forgot it too.
```

## Read, written, used

The `Reference` model makes a distinction that many rules need: reading a variable and writing it. What counts as a *use*, though, depends on the question a rule asks, and SonarJS's rules answer it differently.

The rule S1481, *Unused local variables and functions should be removed*, reports a variable when every one of its references is one of its own declarations: `const count = items.length` is a write reference, at the declaration, and if nothing else mentions `count`, it is unused. A variable that is written again later but never read is *not* reported:

```ts
function sum(items: number[]) {
  let total = 0;
  total = items.length; // a write, not a read
  return 0;
}
```

`total` has a reference outside its declaration, so for S1481 it is used. That the value written there is never read is another rule's business: S1854, *Unused assignments should be removed*, which needs to know the order in which assignments and reads can run, and therefore a control-flow graph. Chapter 14 builds it. Splitting the work this way keeps S1481 simple and silent where it might be wrong, and gives each issue a message that says exactly what to do: remove the declaration, or remove the assignment.

S1481 also chooses which scopes to look at:

- In a function, every `var`, `let`, `const` and function declaration is checked: nothing outside the function can use them.
- In a block outside any function, only `let`, `const` and functions are checked: a `var` in such a block belongs to the module or the global scope.
- At the top level of a script or a module, nothing is checked. In a script, top-level declarations are globals that another script may use.
- Parameters, imports (S1128 has those), classes and catch parameters are not checked.

One more exception comes from an idiom. `const { password, ...safe } = user` declares `password` only to leave it out of `safe`; it is never read, and it is not a mistake. S1481 ignores the shorthand properties of an object pattern with a rest element.

::source{path="packages/analysis/src/jsts/rules/S1481/rule.ts" symbol="checkScope" title="S1481, which scopes it checks"}

```rule
id: scopes/unused-variables
title: Unused local variables and functions
key: S1481
corpus: true
types: false
inspector: [scopes, tree]
prompt: |
  Implement `checkVariable` and `checkScope`. A variable is unused when all its references are identifiers of its own definitions (`variable.defs[i].name`). Report each definition of an unused variable, with `unusedFunction` for a function declaration and `unusedVariable` otherwise. Follow the scope policy above: everything in functions, only `let`, `const` and functions in top-level blocks, nothing at the top level; skip variables whose first definition is not of type `Variable` or `FunctionName`, and the names in `toIgnore`.
files:
  rule.ts: |
    import type { Rule, Scope } from 'eslint';
    import type estree from 'estree';
    import { generateMeta } from '../helpers/generate-meta.js';

    type Policy = 'nothing' | 'let-const-function' | 'all';

    export const rule: Rule.RuleModule = {
      meta: generateMeta(
        { sonarKey: 'S1481' },
        {
          messages: {
            unusedFunction: "Remove unused function '{{symbol}}'.",
            unusedVariable: "Remove the declaration of the unused '{{symbol}}' variable.",
          },
        },
      ),
      create(context) {
        // Identifiers declared only to be left out of a rest element: `const { password, ...safe } = user`.
        const toIgnore = new Set<estree.Node>();

        function checkVariable(variable: Scope.Variable, policy: Policy) {
          // TODO
        }

        function checkScope(scope: Scope.Scope, policy: Policy) {
          // TODO: decide the policy for this scope, check its variables, recurse into its children.
        }

        return {
          ObjectPattern(node: estree.ObjectPattern) {
            if (!node.properties.some((p) => p.type === 'RestElement')) return;
            for (const p of node.properties) {
              if (p.type === 'Property' && p.shorthand && p.value.type === 'Identifier') toIgnore.add(p.value);
            }
          },
          'Program:exit'(node: estree.Node) {
            checkScope(context.sourceCode.getScope(node), 'nothing');
          },
        };
      },
    };
fixtures:
  unused.fixture.ts: |
    export function summary(items: string[]) {
      const count = items.length; // Noncompliant {{Remove the declaration of the unused 'count' variable.}}
    //      ^^^^^
      const label = items.join(', ');
      return label;
    }

    export function helpers(n: number, unusedParameter: string) {
      function format(x: number) { // Noncompliant {{Remove unused function 'format'.}}
    //         ^^^^^^
        return x.toFixed(2);
      }
      let total = 0;
      total = n;
      return 0;
    }

    export function withoutPassword(user: { name: string; password: string }) {
      const { password, ...safe } = user;
      return safe;
    }

    const topLevel = 1;
    var alsoTopLevel = 2;
hidden:
  scopes.fixture.ts: |
    if (Math.random() > 0.5) {
      var hoisted = 1;
      let local = 2; // Noncompliant {{Remove the declaration of the unused 'local' variable.}}
      const used = 3;
      console.log(used);
    }
    export const handler = () => {
      var a = 1, b = 2; // Noncompliant {{Remove the declaration of the unused 'a' variable.}}
      try {
        return b;
      } catch (e) {
        return null;
      }
    };
    export function loop(xs: number[]) {
      for (const x of xs) { // Noncompliant {{Remove the declaration of the unused 'x' variable.}}
        console.log('again');
      }
      class Unused {}
      const named = function inner() { return 1; };
      return named;
    }
answer:
  rule.ts: |
    import type { Rule, Scope } from 'eslint';
    import type estree from 'estree';
    import { generateMeta } from '../helpers/generate-meta.js';

    type Policy = 'nothing' | 'let-const-function' | 'all';

    export const rule: Rule.RuleModule = {
      meta: generateMeta(
        { sonarKey: 'S1481' },
        {
          messages: {
            unusedFunction: "Remove unused function '{{symbol}}'.",
            unusedVariable: "Remove the declaration of the unused '{{symbol}}' variable.",
          },
        },
      ),
      create(context) {
        const toIgnore = new Set<estree.Node>();

        function checkVariable(variable: Scope.Variable, policy: Policy) {
          const first = variable.defs[0];
          if (!first || (first.type !== 'Variable' && first.type !== 'FunctionName')) return;
          if (policy === 'let-const-function' && first.parent?.type === 'VariableDeclaration' && first.parent.kind === 'var') return;
          const names: estree.Node[] = variable.defs.map((d) => d.name);
          if (toIgnore.has(names[0]!)) return;
          if (!variable.references.every((r) => names.includes(r.identifier))) return;
          for (const name of names) {
            context.report({
              node: name,
              messageId: first.type === 'FunctionName' ? 'unusedFunction' : 'unusedVariable',
              data: { symbol: variable.name },
            });
          }
        }

        function checkScope(scope: Scope.Scope, inherited: Policy) {
          let policy = inherited;
          if (scope.type === 'function' && !scope.childScopes.some((s) => s.type === 'module')) policy = 'all';
          else if (inherited === 'nothing' && scope.type === 'block') policy = 'let-const-function';
          if (policy !== 'nothing' && scope.type !== 'function-expression-name') {
            for (const variable of scope.variables) checkVariable(variable, policy);
          }
          for (const child of scope.childScopes) checkScope(child, policy);
        }

        return {
          ObjectPattern(node: estree.ObjectPattern) {
            if (!node.properties.some((p) => p.type === 'RestElement')) return;
            for (const p of node.properties) {
              if (p.type === 'Property' && p.shorthand && p.value.type === 'Identifier') toIgnore.add(p.value);
            }
          },
          'Program:exit'(node: estree.Node) {
            checkScope(context.sourceCode.getScope(node), 'nothing');
          },
        };
      },
    };
hints:
  - "The policy only ever widens on the way down: a function scope switches to `'all'`, a block switches `'nothing'` to `'let-const-function'`, and everything else inherits. Don't forget to recurse into `scope.childScopes`."
  - "`def.parent` is the `VariableDeclaration` of a `Variable` definition; its `kind` is `'var'`, `'let'` or `'const'`."
  - "A named function expression creates a scope of type `'function-expression-name'` holding just its own name: skip it, or `inner` in `function inner() {}` would be reported."
solution: |
  The rule is a walk over the scope tree, not over the syntax tree: the only listeners on nodes collect the identifiers to ignore. The one subtle line is the definition of "unused", `references.every(r => names.includes(r.identifier))`. A declaration with an initialiser has a write reference whose identifier *is* the declared name, which is why the initialiser alone does not make a variable used; any other reference, read or write, does. One detail of the reference implementation exists for CommonJS: when a file is parsed with a function scope around the whole module (Node.js's `globalReturn`), that function scope is not treated as a function, so top-level declarations stay unchecked there too.
```

## Following a name to its value

Many rules need not only the declaration of a name but its *value*. S4830 must decide whether the options in `https.request(options)` contain `rejectUnauthorized: false`; S2068 whether a variable called `password` holds a string literal; S5332 whether a URL starts with `http://`. The value is often not at the call: it was put in a variable a few lines earlier.

```ts
const options = { hostname: 'api.example.com', rejectUnauthorized: false };
https.request(options);
```

In general, the value of a variable at a given point depends on which assignments can run before that point, which is a question about the program's control flow and the subject of Part III. SonarJS's rules mostly use a much cheaper approximation, which the kit calls **single-write tracking**:

> If a variable is written exactly once in the whole program, its value is the expression written.

The `Reference` model makes this a few lines. Take the variable's references, keep the writes, and if there is exactly one, its `writeExpr` is the expression written. SonarJS's helpers come in three layers:

| Helper | Answers |
|---|---|
| `getVariableFromName(context, name, node)` | the variable `name` visible from `node`, found by walking up the scopes |
| `getUniqueWriteUsage(context, name, node)` | the expression written to it, if it is written exactly once |
| `getValueOfExpression(context, node, type)` | `node` itself if it is a node of `type`; else, if `node` is an identifier written exactly once with a node of `type`, that node; else `undefined` |

The last is the one rules call: `getValueOfExpression(context, arg, 'ObjectExpression')` answers "is this argument an object literal, directly or through a variable, and which one?". About forty of SonarJS's rules use it.

::source{path="packages/analysis/src/jsts/rules/helpers/ast.ts" symbol="getUniqueWriteReference"}

Single-write tracking is **flow-insensitive**: it ignores the order of statements. It is right for a `const`, which is written exactly once before any read can run. For other variables, its answer is a guess, and a rule should know where it guesses wrong:

- `let x; use(x); x = { k: 1 };`: `let x;` without an initialiser is not a write, so `x` has one write and its "value" is `{ k: 1 }`, although `use(x)` sees `undefined`.
- `function f(retries = 3)`: a default value is a write, so the value of `retries` is `3`, whatever the callers pass.
- `for (const item of items)`: the single write to `item` has `items`, the collection, as its `writeExpr`, not an element of it.
- `const { url } = req.body`: for destructuring, `writeExpr` is the whole right-hand side, `req.body`, not the property.
- `const options = {}; options.rejectUnauthorized = false;`: the variable is written once, but the object is changed afterwards. Single-write tracking follows names, not objects, and sees an empty object.

The first three can make a rule report something that is not there; the last can make it miss something that is. In practice the shortcut is good enough because code that defines a value and uses it nearby is mostly written with `const`. Chapter 15 replaces it, where it matters, with reaching definitions, which knows the order of statements; Part VI's points-to analysis follows objects as well as names.

```quiz
q: "With `function connect(port = 443) { let host; if (port === 80) { host = 'plain'; } else { host = 'secure'; } return open(host, port); }`, what does `getValueOfExpression(context, hostArgument, 'Literal')` return for the `host` in `open(host, port)`?"
options:
  - text: "`'plain'`"
    why: "There are two writes to `host`. Single-write tracking gives up rather than pick one."
  - text: "`'secure'`"
    why: "The last write in the text is not the value: on the other path, `'plain'` is."
  - text: "`undefined`"
    correct: true
    why: "Two writes, so no unique write. The helper answers \"I don't know\", which is what a rule should then assume."
  - text: "`443`"
    why: "That is the value single-write tracking gives for `port`, not `host`."
```

## Properties of object literals

Once a rule has an object literal, it usually wants one property. The helper `getProperty(objectExpression, key, context)` finds it. Its interesting part is its return type, `Property | null | undefined`, three answers rather than two:

- the `Property`, when the literal defines `key`;
- `null`, when the literal certainly does not define `key` (or the expression is not an object literal at all);
- `undefined`, when it cannot tell.

It cannot tell because of spread elements. In `{ ...defaults, timeout: 5 }`, `defaults` may or may not define `rejectUnauthorized`. If `defaults` is itself, by single-write tracking, an object literal, `getProperty` looks inside it; otherwise the answer is unknown. And since a later property overrides an earlier one, it searches from the last property to the first: in `{ rejectUnauthorized: false, ...secure }`, if `secure` resolves to an object literal that defines `rejectUnauthorized`, that definition wins.

The distinction between `null` and `undefined` is what lets a rule choose its side of the approximation. A rule reporting a *missing* safety option must only report when the option is certainly absent. S6303 reports an AWS CDK database cluster created without `storageEncrypted` (*Omitting storageEncrypted disables RDS encryption. Make sure it is safe here.*): it reports on `null`, and when the properties have an unknown spread, `undefined`, the option may be in it and the rule stays silent. A rule reporting a *present* dangerous option, such as S4830 and its `rejectUnauthorized: false`, only cares about the first answer. SonarJS's AWS rules wrap the three answers in a small `Result` class, with statuses `found`, `missing` and `unknown`, so that a rule can chain lookups (`argument 2, property "encryption", property "enabled"`) and decide only at the end.

::source{path="packages/analysis/src/jsts/rules/helpers/ast.ts" symbol="getPropertyFromSpreadElement"}

::source{path="packages/analysis/src/jsts/rules/helpers/result.ts" symbol="getProperty(propertyName" title="Result: found, missing, unknown"}

```helper
id: scopes/get-property
title: A property, through spreads
prompt: |
  Implement `getProperty` in `helpers/ast.ts` with its three answers. Look at the properties from last to first. A plain property with the right key (an identifier, or a string literal, not computed) is the answer. A spread element whose argument is, through single writes, an object literal is searched recursively; any other spread is unknown: keep looking at the earlier properties, and if no property is found at all, the answer is `undefined` rather than `null`. Guard against cycles such as `const a = { ...b }; const b = { ...a };` with the `seen` set. `getValueOfExpression` is already in the file.
files:
  helpers/ast.ts: |
    import type { Rule } from 'eslint';
    import type estree from 'estree';
    import { getValueOfExpression } from './ast-values.js';

    export { getValueOfExpression };

    /**
     * The property `key` of an object literal: the `Property` if found; null if `expr` is not an object literal or
     * certainly has no such property; undefined if it cannot tell, because of a spread it could not resolve.
     */
    export function getProperty(expr: estree.Node | undefined | null, key: string, context: Rule.RuleContext, seen = new Set<estree.Node>()): estree.Property | null | undefined {
      if (expr?.type !== 'ObjectExpression') return null;
      // TODO
      return null;
    }
  helpers/ast-values.ts: |
    import type { Rule } from 'eslint';
    import type estree from 'estree';

    /** `node` if it is of `type`; else, if `node` is an identifier written exactly once with a node of `type`, that node. */
    export function getValueOfExpression<T extends estree.Node['type']>(context: Rule.RuleContext, node: estree.Node | undefined | null, type: T): Extract<estree.Node, { type: T }> | undefined {
      if (!node) return undefined;
      if (node.type === type) return node as Extract<estree.Node, { type: T }>;
      if (node.type !== 'Identifier') return undefined;
      let scope: ReturnType<typeof context.sourceCode.getScope> | null = context.sourceCode.getScope(node);
      while (scope && !scope.set.has(node.name)) scope = scope.upper;
      const writes = scope?.set.get(node.name)?.references.filter((r) => r.isWrite()) ?? [];
      const value = writes.length === 1 ? (writes[0]!.writeExpr as estree.Node | null) : null;
      return value?.type === type ? (value as Extract<estree.Node, { type: T }>) : undefined;
    }
readonly: [helpers/ast-values.ts]
tests:
  get-property.test.ts: |
    import type { Rule } from 'eslint';
    import type estree from 'estree';
    import { test, expect, lintCode } from 'workbench:test';
    import { getProperty } from '../rules/helpers/ast.js';

    // Reports, for each call f(arg), what getProperty(arg, 'k') answers: the property's value, 'null' or 'undefined'.
    const rule: Rule.RuleModule = {
      create: (context) => ({
        CallExpression(node) {
          const p = getProperty(node.arguments[0] as estree.Node, 'k', context);
          context.report({ node, message: p === null ? 'null' : p === undefined ? 'undefined' : context.sourceCode.getText(p.value as estree.Node) });
        },
      }),
    };
    const answer = (code: string) => lintCode(`declare function f(x: unknown): void; declare const ext: object;\n${code}`, rule, undefined, false).map((i) => i.message);

    test('a plain property', () => expect(answer('f({ k: 1 });')).toEqual(['1']));
    test('a string key', () => expect(answer("f({ 'k': 2 });")).toEqual(['2']));
    test('absent', () => expect(answer('f({ j: 1 });')).toEqual(['null']));
    test('not an object literal', () => expect(answer('f(42);')).toEqual(['null']));
    test('the last definition wins', () => expect(answer('f({ k: 1, k: 2 });')).toEqual(['2']));
    test('an unknown spread', () => expect(answer('f({ ...ext });')).toEqual(['undefined']));
hiddenTests:
  more.test.ts: |
    import type { Rule } from 'eslint';
    import type estree from 'estree';
    import { test, expect, lintCode } from 'workbench:test';
    import { getProperty } from '../rules/helpers/ast.js';

    const rule: Rule.RuleModule = {
      create: (context) => ({
        CallExpression(node) {
          const p = getProperty(node.arguments[0] as estree.Node, 'k', context);
          context.report({ node, message: p === null ? 'null' : p === undefined ? 'undefined' : context.sourceCode.getText(p.value as estree.Node) });
        },
      }),
    };
    const answer = (code: string) => lintCode(`declare function f(x: unknown): void; declare const ext: object;\n${code}`, rule, undefined, false).map((i) => i.message);

    test('a known spread', () => expect(answer('const base = { k: 1 }; f({ ...base });')).toEqual(['1']));
    test('a property after a spread overrides it', () => expect(answer('const base = { k: 1 }; f({ ...base, k: 2 });')).toEqual(['2']));
    test('a spread after a property overrides it', () => expect(answer('const base = { k: 1 }; f({ k: 2, ...base });')).toEqual(['1']));
    test('a known spread without the key', () => expect(answer('const base = { j: 1 }; f({ ...base });')).toEqual(['null']));
    test('an unknown spread, then a decisive property', () => expect(answer('f({ ...ext, k: 3 });')).toEqual(['3']));
    test('a property, then an unknown spread', () => expect(answer('f({ k: 3, ...ext });')).toEqual(['3']));
    test('an unknown spread in a known spread', () => expect(answer('const base = { ...ext }; f({ ...base });')).toEqual(['undefined']));
    test('nested spreads', () => expect(answer('const a = { k: 4 }; const b = { ...a }; f({ ...b });')).toEqual(['4']));
    test('a computed key is not the key', () => expect(answer("const key = 'k'; f({ [key]: 5 });")).toEqual(['null']));
    test('cycles terminate', () => expect(answer('const a: any = { ...b }; const b: any = { ...a }; f({ ...a });')).toEqual(['undefined']));
answer:
  helpers/ast.ts: |
    import type { Rule } from 'eslint';
    import type estree from 'estree';
    import { getValueOfExpression } from './ast-values.js';

    export { getValueOfExpression };

    export function getProperty(expr: estree.Node | undefined | null, key: string, context: Rule.RuleContext, seen = new Set<estree.Node>()): estree.Property | null | undefined {
      if (expr?.type !== 'ObjectExpression') return null;
      let unknown = false;
      for (let i = expr.properties.length - 1; i >= 0; i--) {
        const property = expr.properties[i]!;
        if (property.type === 'Property') {
          const k = property.key;
          if (!property.computed && ((k.type === 'Identifier' && k.name === key) || (k.type === 'Literal' && k.value === key))) return property;
          continue;
        }
        const spread = getValueOfExpression(context, property.argument, 'ObjectExpression');
        if (!spread || spread === expr || seen.has(spread)) {
          unknown = true;
          continue;
        }
        seen.add(spread);
        const found = getProperty(spread, key, context, seen);
        seen.delete(spread);
        if (found === undefined) unknown = true;
        else if (found !== null) return found;
      }
      return unknown ? undefined : null;
    }
hints:
  - "Keep a flag `unknown`, set when a spread cannot be resolved (or its own search answers `undefined`), and keep looking at earlier properties. Return a property as soon as you find one; at the end, return `undefined` if the flag is set, `null` otherwise."
  - "`seen` holds the object literals on the current chain of spreads. Add the spread's object before searching it and remove it afterwards."
solution: |
  The search order is the run-time order reversed: at run time, the properties are applied from first to last and the last write wins, so searching from the end finds the winner first. In `{ ...ext, k: 3 }`, `k: 3` comes last and decides, whatever `ext` holds. In `{ k: 3, ...ext }`, the answer is less certain than it looks: the search meets `...ext` first, cannot tell whether `ext` has a `k`, moves on, and returns `k: 3`, which `ext` may override at run time. A stricter helper would answer `undefined` there. SonarJS's helper makes the same bet as this one: an object spread *after* an explicit property rarely overrides it in practice, and answering "unknown" would silence every rule that looks at such objects. The `unknown` flag only matters when no property is found at all. SonarJS's version has the same shape and the same three answers; it detects cycles by checking whether the spread's object is an ancestor of the spread as well as with a set of the objects on the chain.
```

## Rules that ask "is this the same variable?"

Scopes also let rules compare names properly. Two identifiers with the same name are the same variable only if they resolve to the same `Variable`; two different variables can share a name in different scopes, and a rule comparing names as strings would confuse them. SonarJS's rules mostly do the comparison through references: `reference.resolved === variable`. The kit's `getVariableFromName` does the lookup by name from a node, walking up from `context.sourceCode.getScope(node)` through `upper` until a scope's `set` has the name.

The TypeScript scope manager adds a twist: a name can denote a type and a value at the same time.

```ts
interface Post { title: string }
const Post = { create: (title: string): Post => ({ title }) };
```

Here there is one `Variable` called `Post` with two definitions, one of type `Type` and one of type `Variable`. Its references know which meaning they use: `reference.isTypeReference` and `reference.isValueReference`. Whether a type-only use should count is the rule's decision. S1481 counts every reference, so a constant `Post` that nothing reads is not reported as long as the interface `Post` is used somewhere: the rule chooses silence over a false positive on a name with two meanings.

## What the model gives, and what it does not

The scope manager is a complete, exact answer to a narrow question: for each occurrence of a name, which declaration it refers to. It says nothing about *values*, which is where single-write tracking comes in, and nothing about names that cross files: an imported `exec` is an `ImportBinding` in this module, and the scope manager does not know or care what module it came from. The next chapter gives rules that knowledge, with fully qualified names.
