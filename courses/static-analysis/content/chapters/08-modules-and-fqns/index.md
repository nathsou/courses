---
title: Modules and fully qualified names
summary: How a rule recognises `child_process.exec` however the file spells it, where that stops working, and how SonarJS decides from a project's dependencies which rules to run at all.
number: 8
duration: 55 minutes
prerequisites: [scopes]
---

In chapter 0, you fixed S2245 by replacing a test on the spelling of a call with a test on its **fully qualified name**: `getFullyQualifiedName(context, node) === 'Math.random'`. That one change made the rule find `random()` after `const { random } = Math`, and stop finding `Math.random()` when `Math` was a parameter. Some seventy of SonarJS's rules recognise the APIs they care about this way. This chapter takes the helper apart.

## One function, many spellings

A security rule about running shell commands cares about one function, `exec` from Node.js's `child_process` module. Here are some of the ways a file can call it:

```ts
import { exec } from 'child_process';                exec(cmd);
import { exec as run } from 'node:child_process';    run(cmd);
import * as cp from 'child_process';                 cp.exec(cmd);
const cp = require('child_process');                 cp.exec(cmd);
const { exec } = require('child_process');           exec(cmd);
require('child_process').exec(cmd);
```

A rule that looks for an identifier called `exec` would miss half of them, and would report every local function that happens to be called `exec`. What all six have in common is the *path* to the function: the module `child_process`, then its property `exec`. Written with dots, `child_process.exec` is its fully qualified name, or FQN.

## How JavaScript names modules

JavaScript has two module systems, and real projects mix them.

- **ES modules** use `import` and `export`. An import is a declaration: `import { exec } from 'child_process'` declares a local variable `exec`, which the scope manager records with a definition of type `ImportBinding` (chapter 7). There are named imports (`{ exec }`, `{ exec as run }`), default imports (`import express from 'express'`, which names the module's `default` export), and namespace imports (`import * as cp`, the whole module as an object). TypeScript adds `import type`, which imports nothing at run time, and `import cp = require('child_process')`.
- **CommonJS**, Node.js's original system, uses an ordinary function call, `require('child_process')`, which returns the module's exports object. Nothing in the language makes `require` special: it is a variable like any other, which a file could even redefine.

Both name a module with a string, its **specifier**: a package name (`express`), a path inside a package (`aws-cdk-lib/aws-s3`, `fs/promises`), a Node.js built-in with or without the `node:` prefix (`node:fs` is `fs`), or a relative path to another file of the project (`./db`).

An FQN, as SonarJS computes it, is built from this specifier and nothing else: the specifier split at its slashes, then the properties accessed. `aws-cdk-lib/aws-s3`'s `Bucket` is `aws-cdk-lib.aws-s3.Bucket`. The analyser does not open `node_modules` to see what the package really exports, and does not follow `./db` into the project's other file. An FQN is a *name* for an access path, computed from one file.

## The algorithm

Edit the code below. Every call and `new` is labelled with the FQN the course kit computes for it, which follows SonarJS's algorithm; `?` marks the calls that have none.

:::fqn-view{n="8.1"}
```ts
import { exec as run } from 'node:child_process';
import * as https from 'https';
import express from 'express';
const { createHash } = require('crypto');
const fs = require('fs');
const { Bucket } = require('aws-cdk-lib/aws-s3');

const app = express();
const read = fs.readFileSync;

run('ls -la');
https.request({ hostname: 'corkboard.dev' });
createHash('md5').update('secret');
read('/etc/hosts');
new Bucket(app, 'uploads');
app.use(express.static('public'));
Math.random();

function wrapper(command: string) {
  return run(command);
}
wrapper('ls');
```
:::

`getFullyQualifiedName(context, node)` works in two steps.

**1. Reduce to an identifier.** Starting from `node`, peel off what surrounds the name at the root: member accesses, whose property names are collected; calls (`f(…)` becomes `f`); `new`; tagged templates; optional chains; TypeScript's `!`. `createHash('md5').update('secret')` reduces to the identifier `createHash`, with the qualifiers `['update']`. If peeling reaches a `require('…')` call instead, the FQN is the module followed by the qualifiers, and the work is done.

**2. Resolve the identifier.** Look up its variable, from the node's scope outwards, and look at how it was defined:

- **An import**: the FQN is the module's specifier, then the imported name (unless it is `default`, or a namespace import), then the qualifiers. A type-only import has no FQN.
- **A variable written exactly once** (the single-write tracking of chapter 7): resolve the expression written to it, recursively, and append the qualifiers. With destructuring, `const { createHash } = require('crypto')`, the property name is put in front of the qualifiers first. `const read = fs.readFileSync` resolves `fs.readFileSync`, which resolves `fs`, which is `require('fs')`.
- **No variable declared in the file**: a global. If ESLint knows the name as a global of the project's environments, `Math.random` is its own FQN. SonarJS declares the globals of the ECMAScript version, those of the environments in `sonar.javascript.environments`, and the names in `sonar.javascript.globals`; the kit simplifies and treats any undeclared name as a global.
- **Anything else**, a parameter, a function, a class, a variable written twice, a name defined twice: no FQN, `null`.

::source{path="packages/analysis/src/jsts/rules/helpers/module.ts" symbol="function getFullyQualifiedNameRaw" title="getFullyQualifiedName" note="reduceToIdentifier and reduceTo do step 1; checkFqnFromImport and checkFqnFromRequire do step 2."}

Some consequences are worth noticing in the figure. The result of a call has the FQN of the function: `app` is `express()`, so `app.use` is `express.use`, which is what S5122 looks for when it checks the CORS middleware of an Express application. Likewise `createHash('md5').update` is `crypto.createHash.update`. An FQN describes how a value was reached, not what type it has, and that is usually what a rule about a library's API wants. And `wrapper('ls')` has no FQN: `wrapper` is a function declared in the file, and the helper does not look inside it.

```quiz
q: "What does `getFullyQualifiedName` return for the call in `const lib = require('node:fs/promises'); const { readFile: load } = lib; load('a.txt');`?"
options:
  - text: "`node:fs/promises.readFile`"
    why: "The `node:` prefix is removed, and the slash in the specifier becomes a dot."
  - text: "`fs.promises.readFile`"
    correct: true
    why: "`load` is destructured from `lib` with the key `readFile`; `lib` is `require('node:fs/promises')`. The specifier is split at its slash and loses its `node:` prefix."
  - text: "`lib.readFile`"
    why: "`lib` is a local name. The FQN replaces it with what it was assigned."
  - text: "`null`"
    why: "Every step here is supported: a single write, a destructuring with a renamed key, and a `require`."
```

## Exercise: rebuild getFullyQualifiedName

```helper
id: modules-and-fqns/get-fully-qualified-name
title: Fully qualified names
prompt: |
  Implement step 2 of `getFullyQualifiedName` in `helpers/module.ts`. Step 1, `reduceToIdentifier`, is done for you in `helpers/module-parts.ts`, with `getModuleNameFromRequire` and `removeNodePrefix`. From `./ast.js`, the kit gives you `getVariableFromScope` and `getUniqueWriteReference` from chapter 7. Recursive calls should pass the scope of the variable they come from, `variable.scope`, and the variables already followed, so that `const a = a.b` cannot loop forever.
files:
  helpers/module.ts: |
    import type { Rule, Scope } from 'eslint';
    import type estree from 'estree';
    import { getUniqueWriteReference, getVariableFromScope } from './ast.js';
    import { getModuleNameFromRequire, reduceToIdentifier, removeNodePrefix } from './module-parts.js';

    /**
     * The fully qualified name of `node`: the module it comes from, then the properties accessed on it.
     * Null when it cannot be determined.
     */
    export function getFullyQualifiedName(
      context: Rule.RuleContext,
      node: estree.Node,
      fqn: string[] = [],
      scope?: Scope.Scope,
      visited: Scope.Variable[] = [],
    ): string | null {
      const parts = [...fqn];
      const base = reduceToIdentifier(node, parts);
      // TODO: a require() call; then an identifier: a global, an import, or a variable written once.
      return null;
    }
  helpers/module-parts.ts: |
    import type estree from 'estree';

    /** The module name of `require('name')`, or undefined if `node` is not such a call. */
    export function getModuleNameFromRequire(node: estree.Node): string | undefined {
      if (node.type !== 'CallExpression' || node.callee.type !== 'Identifier' || node.callee.name !== 'require') return undefined;
      const arg = node.arguments[0];
      return node.arguments.length === 1 && arg?.type === 'Literal' && typeof arg.value === 'string' ? arg.value : undefined;
    }

    /** `node:fs` and `fs` name the same module. */
    export function removeNodePrefix(name: string): string {
      return name.startsWith('node:') ? name.slice('node:'.length) : name;
    }

    /**
     * Step 1. Peels member accesses, calls (other than `require`), `new`, tagged templates, optional chains and
     * TypeScript wrappers off `node`, putting the property names in front of `fqn`. Returns what is left: an
     * identifier, a `require('…')` call, or something else (then there is no FQN).
     */
    export function reduceToIdentifier(node: estree.Node, fqn: string[]): estree.Node {
      let n: estree.Node = node;
      for (;;) {
        const type = n.type as string;
        if (n.type === 'MemberExpression') {
          if (!n.computed && n.property.type === 'Identifier') fqn.unshift(n.property.name);
          else if (n.computed && n.property.type === 'Literal' && typeof n.property.value === 'string') fqn.unshift(n.property.value);
          else return n; // a computed, non-constant key
          n = n.object as estree.Node;
        } else if (n.type === 'CallExpression' && getModuleNameFromRequire(n) === undefined) n = n.callee as estree.Node;
        else if (n.type === 'NewExpression') n = n.callee as estree.Node;
        else if (n.type === 'TaggedTemplateExpression') n = n.tag;
        else if (n.type === 'ChainExpression') n = n.expression;
        else if (type === 'TSNonNullExpression' || type === 'TSAsExpression') n = (n as unknown as { expression: estree.Node }).expression;
        else return n;
      }
    }
readonly: [helpers/module-parts.ts]
tests:
  fqn.test.ts: |
    import type { Rule } from 'eslint';
    import type estree from 'estree';
    import { test, expect, lintCode } from 'workbench:test';
    import { getFullyQualifiedName } from '../rules/helpers/module.js';

    // Reports the FQN of every call and `new`, except calls of `require` itself.
    const rule: Rule.RuleModule = {
      create: (context) => ({
        'CallExpression, NewExpression'(node: estree.CallExpression | estree.NewExpression) {
          if (node.callee.type === 'Identifier' && node.callee.name === 'require') return;
          context.report({ node, message: String(getFullyQualifiedName(context, node)) });
        },
      }),
    };
    const fqns = (code: string) => lintCode(code, rule, undefined, false).map((i) => i.message);

    test('a named import, renamed', () => expect(fqns("import { exec as run } from 'child_process'; run('ls');")).toEqual(['child_process.exec']));
    test('a namespace import', () => expect(fqns("import * as cp from 'child_process'; cp.exec('ls');")).toEqual(['child_process.exec']));
    test('a default import', () => expect(fqns("import express from 'express'; express();")).toEqual(['express']));
    test('require, with the node: prefix', () => expect(fqns("const cp = require('node:child_process'); cp.exec('ls');")).toEqual(['child_process.exec']));
    test('a destructured require', () => expect(fqns("const { createHash } = require('crypto'); createHash('md5');")).toEqual(['crypto.createHash']));
    test('a global', () => expect(fqns('Math.random();')).toEqual(['Math.random']));
    test('a parameter has none', () => expect(fqns('function f(Math: { random(): number }) { return Math.random(); }')).toEqual(['null']));
hiddenTests:
  more.test.ts: |
    import type { Rule } from 'eslint';
    import type estree from 'estree';
    import { test, expect, lintCode } from 'workbench:test';
    import { getFullyQualifiedName } from '../rules/helpers/module.js';

    const rule: Rule.RuleModule = {
      create: (context) => ({
        'CallExpression, NewExpression'(node: estree.CallExpression | estree.NewExpression) {
          if (node.callee.type === 'Identifier' && node.callee.name === 'require') return;
          context.report({ node, message: String(getFullyQualifiedName(context, node)) });
        },
      }),
    };
    const fqns = (code: string) => lintCode(code, rule, undefined, false).map((i) => i.message);

    test('a path in a package, with new', () => expect(fqns("const { Bucket } = require('aws-cdk-lib/aws-s3'); new Bucket();")).toEqual(['aws-cdk-lib.aws-s3.Bucket']));
    test('an alias of a property', () => expect(fqns("const cp = require('child_process'); const run = cp.exec; run('ls');")).toEqual(['child_process.exec']));
    test('a destructuring with a renamed key', () => expect(fqns("const cp = require('child_process'); const { exec: run } = cp; run('ls');")).toEqual(['child_process.exec']));
    test('a require called directly', () => expect(fqns("require('fs').readFileSync('a');")).toEqual(['fs.readFileSync']));
    test('the result of a call', () => expect(fqns("import express from 'express'; const app = express(); app.use(1);")).toEqual(['express', 'express.use']));
    test('{ default as x }', () => expect(fqns("import { default as exp } from 'express'; exp();")).toEqual(['express']));
    test('written twice: none', () => expect(fqns("let cp = require('child_process'); cp = { exec() {} }; cp.exec('ls');")).toEqual(['null']));
    test('declared, then written once', () => expect(fqns("let fs; fs = require('fs'); fs.readFileSync('a');")).toEqual(['fs.readFileSync']));
    test('a computed key: none', () => expect(fqns("const fs = require('fs'); declare const m: string; fs[m]('a');")).toEqual(['null']));
    test('a local function: none', () => expect(fqns('function run() {} run();')).toEqual(['null']));
    test('a cycle terminates', () => expect(fqns('const a: any = a.b; a.c();')).toEqual(['null']));
answer:
  helpers/module.ts: |
    import type { Rule, Scope } from 'eslint';
    import type estree from 'estree';
    import { getUniqueWriteReference, getVariableFromScope } from './ast.js';
    import { getModuleNameFromRequire, reduceToIdentifier, removeNodePrefix } from './module-parts.js';

    export function getFullyQualifiedName(
      context: Rule.RuleContext,
      node: estree.Node,
      fqn: string[] = [],
      scope?: Scope.Scope,
      visited: Scope.Variable[] = [],
    ): string | null {
      const parts = [...fqn];
      const base = reduceToIdentifier(node, parts);
      const module = getModuleNameFromRequire(base);
      if (module !== undefined) return removeNodePrefix([...module.split('/'), ...parts].join('.'));
      if (base.type !== 'Identifier') return null;

      const variable = getVariableFromScope(scope ?? context.sourceCode.getScope(node), base.name);
      if (!variable || variable.defs.length === 0) return [base.name, ...parts].join('.');
      if (variable.defs.length > 1 || visited.includes(variable)) return null;
      const def = variable.defs[0]!;

      if (def.type === 'ImportBinding') {
        const declaration = def.parent as estree.Node;
        if (declaration.type !== 'ImportDeclaration') return null;
        const specifier = def.node as estree.ImportSpecifier | estree.ImportDefaultSpecifier | estree.ImportNamespaceSpecifier;
        if (specifier.type === 'ImportSpecifier') {
          const imported = specifier.imported.type === 'Identifier' ? specifier.imported.name : String(specifier.imported.value);
          if (imported !== 'default') parts.unshift(imported);
        }
        return removeNodePrefix([...String(declaration.source.value).split('/'), ...parts].join('.'));
      }

      if (def.type !== 'Variable') return null;
      const value = getUniqueWriteReference(variable);
      if (!value) return null;
      const id = (def.node as estree.VariableDeclarator).id;
      if (id.type === 'ObjectPattern') {
        const property = id.properties.find((p) => p.type === 'Property' && p.value === def.name);
        if (property?.type !== 'Property' || property.computed || property.key.type !== 'Identifier') return null;
        parts.unshift(property.key.name);
      } else if (id.type !== 'Identifier') {
        return null;
      }
      return getFullyQualifiedName(context, value, parts, variable.scope, [...visited, variable]);
    }
hints:
  - "Order the cases: a `require('…')` returned by `reduceToIdentifier`; then not an identifier (null); then the variable lookup with `getVariableFromScope(scope ?? context.sourceCode.getScope(node), base.name)`."
  - "A variable with no definitions (`defs.length === 0`) or no variable at all means a global: `[base.name, ...parts].join('.')`."
  - "For an `ImportBinding` definition, `def.parent` is the `ImportDeclaration` and `def.node` the specifier. For a `Variable` definition, `def.node` is the `VariableDeclarator`; with a destructuring, find the property whose `value` is `def.name`."
solution: |
  The function is short because the scope manager and single-write tracking do the hard work. What it adds is the bookkeeping of qualifiers: each step of the resolution puts names in *front* of the list, since the resolution goes from the use back to the definition while the FQN reads from the module to the use. The recursion is on expressions, not variables, which is why `const read = fs.readFileSync` works without a special case: the expression `fs.readFileSync` is reduced to `fs` with the qualifier `readFileSync`, and `fs` is resolved in turn. SonarJS's version handles a few more shapes (TypeScript's `import x = require()` and `import x = A.B`, `require('lib')()`), and treats an identifier as a global only when ESLint knows it as one.
```

## Exercise: certificate validation

Rules about libraries are where FQNs pay off. S4830, *Server certificates should be verified during SSL/TLS connections*, reports a TLS connection made with certificate validation turned off. In Node.js, that is the option `rejectUnauthorized: false`, passed to `https.request`, to `tls.connect`, or to the popular `request` package's `request.get`. Turning it off is tempting when a test server has a self-signed certificate, and it makes the connection open to anyone who can intercept it.

The rule combines this chapter's helper with chapter 7's: the FQN of the call, then the value of the options argument through single writes, then the property, through spreads.

::source{path="packages/analysis/src/jsts/rules/S4830/rule.ts" symbol="checkSensitiveArgument"}

```rule
id: modules-and-fqns/unverified-certificate
title: Server certificates should be verified
key: S4830
types: false
prompt: |
  Report calls of `https.request` and `request.get` whose first argument, and calls of `tls.connect` whose third argument, is an object literal (directly or through a variable written once) with `rejectUnauthorized: false`. Put the issue on the callee. Secondary locations: the object literal, when the argument is a variable that leads to it; then the property, with the message `Set "rejectUnauthorized" to "true".`. The kit's `getPropertyWithValue(context, object, key, value)` finds a property whose value is, through single writes, the literal `value`.
files:
  rule.ts: |
    import type { Rule } from 'eslint';
    import type estree from 'estree';
    import { generateMeta } from '../helpers/generate-meta.js';
    import { getFullyQualifiedName } from '../helpers/module.js';
    import { getPropertyWithValue, getValueOfExpression } from '../helpers/ast.js';
    import { type IssueLocation, report, toSecondaryLocation } from '../helpers/location.js';

    const MESSAGE = 'Enable server certificate validation on this SSL/TLS connection.';
    const SECONDARY_MESSAGE = 'Set "rejectUnauthorized" to "true".';

    export const rule: Rule.RuleModule = {
      meta: generateMeta({ sonarKey: 'S4830', hasSecondaries: true }, {}),
      create(context) {
        return {
          CallExpression(node: estree.CallExpression) {
            // TODO
          },
        };
      },
    };
fixtures:
  tls.fixture.ts: |
    import * as https from 'node:https';
    import { connect } from 'tls';
    import { request as send } from 'https';
    const request = require('request');

    export function fetchFeed() {
      https.request({ hostname: 'corkboard.dev', rejectUnauthorized: false }); // Noncompliant {{Enable server certificate validation on this SSL/TLS connection.}}
    //^^^^^^^^^^^^^                              ^^^^^^^^^^^^^^^^^^^^^^^^^< {{Set "rejectUnauthorized" to "true".}}
      https.request({ hostname: 'corkboard.dev', rejectUnauthorized: true });
      https.request({ hostname: 'corkboard.dev' });
      send({ rejectUnauthorized: false }); // Noncompliant
      connect(443, 'corkboard.dev', { rejectUnauthorized: false }); // Noncompliant
      connect({ rejectUnauthorized: false });
      request.get({ url: 'https://corkboard.dev', rejectUnauthorized: false }); // Noncompliant
    }

    export function throughVariables() {
      const options = { hostname: 'corkboard.dev', rejectUnauthorized: false };
      https.request(options); // Noncompliant
    }

    export function lookAlikes(client: { request(o: object): void }) {
      client.request({ rejectUnauthorized: false });
      https.get({ rejectUnauthorized: false }); // S4830 only checks https.request at the pinned commit
    }
hidden:
  more.fixture.ts: |
    import * as https from 'https';
    const tls = require('node:tls');

    const base = { rejectUnauthorized: false };
    const off = false;

    export function spreads() {
      https.request({ ...base, hostname: 'corkboard.dev' }); // Noncompliant
      https.request({ ...base, rejectUnauthorized: true });
      https.request({ rejectUnauthorized: off }); // Noncompliant
      tls.connect(443, 'corkboard.dev', base); // Noncompliant
    }

    export function changing(flag: boolean) {
      let options = { rejectUnauthorized: false };
      options = { rejectUnauthorized: true };
      https.request(options);
      https.request({ rejectUnauthorized: flag });
    }
answer:
  rule.ts: |
    import type { Rule } from 'eslint';
    import type estree from 'estree';
    import { generateMeta } from '../helpers/generate-meta.js';
    import { getFullyQualifiedName } from '../helpers/module.js';
    import { getPropertyWithValue, getValueOfExpression } from '../helpers/ast.js';
    import { type IssueLocation, report, toSecondaryLocation } from '../helpers/location.js';

    const MESSAGE = 'Enable server certificate validation on this SSL/TLS connection.';
    const SECONDARY_MESSAGE = 'Set "rejectUnauthorized" to "true".';

    const SENSITIVE_ARGUMENT: Record<string, number> = { 'https.request': 0, 'request.get': 0, 'tls.connect': 2 };

    export const rule: Rule.RuleModule = {
      meta: generateMeta({ sonarKey: 'S4830', hasSecondaries: true }, {}),
      create(context) {
        return {
          CallExpression(node: estree.CallExpression) {
            const fqn = getFullyQualifiedName(context, node);
            const index = fqn === null ? undefined : SENSITIVE_ARGUMENT[fqn];
            if (index === undefined) return;
            const argument = node.arguments[index];
            const options = getValueOfExpression(context, argument, 'ObjectExpression');
            if (!argument || !options) return;
            const unsafe = getPropertyWithValue(context, options, 'rejectUnauthorized', false);
            if (!unsafe) return;
            const secondaries: IssueLocation[] = [];
            if (argument !== options) secondaries.push(toSecondaryLocation(options));
            secondaries.push(toSecondaryLocation(unsafe, SECONDARY_MESSAGE));
            report(context, { node: node.callee, message: MESSAGE }, secondaries);
          },
        };
      },
    };
hints:
  - "A map from FQN to the index of the sensitive argument keeps the listener short: `{ 'https.request': 0, 'request.get': 0, 'tls.connect': 2 }`."
  - "`getValueOfExpression(context, argument, 'ObjectExpression')` returns the argument itself when it is an object literal, so `argument !== options` tells you whether the object was reached through a variable."
  - "`report(context, { node: node.callee, message: MESSAGE }, secondaries)` from `../helpers/location.js` encodes the secondary locations, as in chapter 5."
solution: |
  Each helper answers one question. `getFullyQualifiedName` decides *which function* is called, independently of how the file imports it: `send` and `https.request` are the same function, and `client.request` is not. `getValueOfExpression` decides *which object* is passed, when it is visible in the file. `getPropertyWithValue`, through `getProperty`, decides *what the object says*, through spreads and single writes. In `changing`, `options` is written twice and the rule says nothing: single-write tracking cannot tell which object reaches the call, and silence is the cautious answer. A taint-style analysis that tracks values along paths (Part VII) would see that the second object wins. The `https.get` look-alike is a real false negative of S4830 at the pinned commit: `https.get` takes the same options. A fixture that documents a known gap is better than one that hides it.
```

## Where FQNs stop

An FQN is computed from one file, with single-write tracking, so it stops wherever those stop.

- **Wrappers.** `function run(c) { return exec(c); }` hides `exec` behind a local function: calls of `run` have no FQN, and a rule about `exec` sees only the one call inside `run`. Whether that call is a problem depends on what callers pass, which is the question of Part VI and Part VII.
- **Other files.** If `src/util/shell.ts` re-exports `exec`, a file that imports it from `../util/shell` gets the FQN `...util.shell.exec`, a name that no rule looks for. Relative imports are resolved to nothing more than their specifier.
- **Objects.** `const tools = { exec }; tools.exec(cmd)` has no FQN: `tools` is written once, but with an object literal, and the helper does not look inside objects. Nor does it follow values stored in class fields, passed as arguments, or injected by a framework.
- **Names that were never imported.** Some rules have no API to anchor to at all. S2068, *Hard-coded passwords are security-sensitive*, looks at variable and property names containing words like `password` or `passwd`, and at the string assigned to them: its length, its characters and its Shannon entropy, to tell `password = 'Xq7#vL2p'` from `password = 'password_field'`. When there is no FQN to match, a rule falls back on heuristics like these, and its precision depends on choosing them well.

None of these are bugs. They are the boundary of a fast, local, flow-insensitive approximation, and SonarJS's rules mostly accept them: the alternative, analysing the whole program, is slower, and its own approximations bring their own false positives. Chapter 21 looks at how SonarJS decides where the boundary should be.

## Which rules run at all

An FQN tells a rule whether a call is to a library's function. A coarser question comes first: does the project use the library? A rule about React components has nothing to say in a project without React, and running it on every file wastes time and invites false positives on code that merely looks like React.

SonarJS answers it with **dependency manifests**. For each file, it finds the closest `package.json` above it, and unions its dependencies with those of every `package.json` further up, as far as the project's base directory, so that a monorepo whose root declares React counts as a React project in every package. A rule's metadata can declare `requiredDependency`; before linting a file, the analyser filters out rules whose required dependencies are absent. Seven rules declare one at the pinned commit: four for Vue, two for Testing Library, one for React. Rules can also ask during analysis, with `importsOrDependsOnModule(context, imports, dependencies)`: does this file import the module, or does the project depend on the package?

::source{path="packages/analysis/src/jsts/linter/filters/filter-dependency.ts" symbol="filterDependency" title="The dependency filter" note="One of several filters a rule must pass before it runs on a file; the others check the file type, the language, the ECMAScript version and whether the file is generated."}

::source{path="packages/analysis/src/jsts/rules/helpers/dependency-manifests/dependencies.ts" symbol="export function getDependencies" title="Finding the manifests"}

The versions matter too. Some rules adapt to the version of React a project declares, and the analyser can detect, from `npm:` specifiers in a file's imports, dependencies that no manifest declares (Deno-style code). This is configuration more than analysis, but it is a large part of why a rule's issues are relevant: the cheapest way to avoid a false positive is not to run the rule where it cannot apply.

## What comes next

Names now resolve to declarations, and declarations to modules. What neither tells a rule is what kind of value an expression holds: whether `items` is an array or a string, whether `user` may be `undefined`. For TypeScript code, and with some help for JavaScript, the TypeScript compiler knows. The next chapter puts it to work.
