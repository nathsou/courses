---
title: Types
summary: The TypeScript compiler as an oracle for rules, the flow-sensitive types it computes for free, and the TypeScript programs SonarJS builds to get them.
number: 9
duration: 60 minutes
prerequisites: [modules-and-fqns]
---

`scores.sort()` is a bug when `scores` holds numbers: without a compare function, JavaScript sorts by converting the elements to strings, so `[10, 9, 1]` becomes `[1, 10, 9]`. The same call on an array of strings is fine, and on a user's own class with a `sort` method it is none of the rule's business. Neither the tree, nor the scopes, nor a fully qualified name says which case a call is: the rule needs the *type* of `scores`. For TypeScript code, and with less precision for JavaScript, the TypeScript compiler can give it.

## The compiler as an oracle

The TypeScript compiler is organised around a few objects, which rules reach through its public API.

| Object | What it is |
|---|---|
| `Program` | A set of root files, the compiler options, and everything they import, transitively, including the standard library's declaration files. Types are computed for a program as a whole: the type of an imported function comes from the file that declares it. |
| `SourceFile` | One file, parsed into TypeScript's own syntax tree. It is not ESTree: its nodes have `kind`s (`ts.SyntaxKind.CallExpression`), different shapes and different positions. |
| `TypeChecker` | Answers questions about the program, lazily: `getTypeAtLocation(node)`, `getSymbolAtLocation(node)`, `typeToString(type)`, `getTypeArguments(type)`… Each answer may force the checker to type-check part of the program. |
| `Symbol` | A named entity: a variable, a function, a class, a property, a module. It has `flags` (`SymbolFlags.Function`, `SymbolFlags.Property`…) and `declarations`, the nodes that declare it, possibly in other files. |
| `Type` | What a value can be. Its `flags` say which kind of type it is (`TypeFlags.String`, `TypeFlags.Number`, `TypeFlags.Union`, `TypeFlags.Object`…); a union has `types`; an object type has properties and signatures; `number[]` is a reference to the generic `Array` with the type argument `number`. |

Type flags are bit sets, and rules test them with `&`: `(type.flags & ts.TypeFlags.NumberLike) !== 0` holds for `number`, for the literal type `42` and for a numeric enum. Many questions come in pairs, one about a node and one about a type, because a rule often needs both: SonarJS's `type.ts` has `isString(node, services)` and `isStringType(type)`.

## Parser services

typescript-eslint, the parser SonarJS tries first for every JavaScript and TypeScript file (chapter 2), can parse a file as part of a TypeScript program. When it does, it converts TypeScript's tree into ESTree and keeps the correspondence. Rules find the result in `context.sourceCode.parserServices`:

- `program`, the TypeScript program, from which `program.getTypeChecker()` gives the checker;
- `esTreeNodeToTSNodeMap`, from each ESTree node to the TypeScript node it came from;
- `tsNodeToESTreeNodeMap`, the other way.

The type of an ESTree node is then two steps away: map the node, ask the checker. SonarJS's `getTypeFromTreeNode(node, services)` does exactly that.

A file is not always parsed with a program (this chapter's last section explains when), and the services object exists either way, without a program. So every rule that needs types starts with the same guard, and stays silent rather than guess:

```ts
create(context) {
  const services = context.sourceCode.parserServices;
  if (!isRequiredParserServices(services)) {
    return {};
  }
  …
}
```

::source{path="packages/analysis/src/jsts/rules/helpers/parser-services.ts" symbol="isRequiredParserServices"}

A rule that returns `{}` without types does nothing on files analysed without a program, so whether a rule needs types is part of its specification: RSPEC tags such rules `type-dependent` (94 JavaScript rules at the pinned commit, S2259 and S2871 among them), and SonarJS's generated metadata turns the tag into `docs.requiresTypeChecking`, which eslint-plugin-sonarjs's documentation shows to its users.

## Types at a point

Look at the types TypeScript gives the names below. Move between the occurrences of `user`: its type changes.

:::type-view{n="9.1" names="user,cache,count"}
```ts
interface User { name: string; admin: boolean }
declare function find(id: number): User | undefined;

function greet(id: number) {
  const user = find(id);
  if (user) {
    console.log(user.name);
  }
  if (user === undefined) {
    return user;
  }
  return user.admin;
}

function warm() {
  let cache = null;
  cache;
  cache = new Map<string, number>();
  cache;
  let count;
  count = 0;
  return count;
}
```
:::

`user` is declared once, with the type `User | undefined`, but inside `if (user)` its type is `User`, inside `if (user === undefined)` it is `undefined`, and after that `if` returns, it is `User` again. TypeScript computes a type for each *occurrence* of a variable, by following the control flow to it and applying what each condition and assignment on the way says. This is **narrowing**, and it makes the types a rule gets **flow-sensitive**: they depend on where in the code the question is asked. That is new in this course. Everything rules have used so far, including single-write tracking, ignored the order of statements; the types come with the order built in, computed by the compiler's own data-flow analysis, which Part III will build from scratch.

`warm` shows the same thing for assignments. A `let` declared without a type annotation gets an *evolving* type: its declaration says `any`, and each use has the type of the last assignment that reaches it, `null`, then `Map<string, number>`.

Now turn `strict` off. Without `strictNullChecks`, TypeScript's types do not include `null` and `undefined` at all: `User | undefined` becomes `User`, and every narrowing on `undefined` disappears. The same code gives a rule different facts depending on the project's compiler options, which SonarJS takes from the project's `tsconfig.json` when there is one.

## Exercise: a property of null

The rule S2259, *Properties of variables with "null" or "undefined" values should not be accessed*, builds directly on narrowing. Accessing a property of `null` or `undefined` throws a `TypeError`. When TypeScript says that a variable's type *at the access* is exactly `null` or `undefined`, the access will throw, if it runs. SonarJS's rule asks precisely that: it does not report a variable whose type merely *includes* `undefined`, like `User | undefined`. In a strict TypeScript project, the compiler already rejects such accesses; outside one, a type that includes `undefined` says little about whether the value can be `undefined` there.

So S2259 is mostly useful in JavaScript, where nothing else checks, and where TypeScript still computes types: from initialisers, from assignments, from declaration files. In the figure, `let cache = null` gives `cache` the type `null` until the assignment.

TypeScript's analysis has one blind spot that the rule must work around. Narrowing does not look inside functions defined elsewhere, so it does not see an assignment in a callback:

```js
let socket = null;
onReady(() => { socket = connect(); });
socket.send('hello'); // TypeScript: `socket` is `null` here
```

When `onReady` calls its callback before the last line runs, `socket` is not `null`. TypeScript cannot know, so the rule refuses to report a variable that is written in a function other than the one where the access is.

::source{path="packages/analysis/src/jsts/rules/S2259/rule.ts" symbol="isWrittenInInnerFunction"}

```rule
id: types/null-dereference
title: Properties of null and undefined
key: S2259
corpus: true
inspector: [types, tree]
prompt: |
  Report a non-optional member access `x.p` whose object is an identifier with a type, at that point, of exactly `null` or `undefined` (the kit's `isUndefinedOrNull(node, services)`). Report each variable at most once per file. Skip variables written in a function other than the one containing the access. The inspector's **types** tab shows the type at the cursor.
files:
  rule.ts: |
    import type { Rule, Scope } from 'eslint';
    import type estree from 'estree';
    import { generateMeta } from '../helpers/generate-meta.js';
    import { isRequiredParserServices } from '../helpers/parser-services.js';
    import { isUndefinedOrNull } from '../helpers/type.js';
    import { findFirstMatchingAncestor } from '../helpers/ancestor.js';
    import { isFunctionNode } from '../helpers/ast.js';

    export const rule: Rule.RuleModule = {
      meta: generateMeta(
        { sonarKey: 'S2259' },
        { messages: { nullDereference: 'TypeError can be thrown as "{{symbol}}" might be null or undefined here.' } },
      ),
      create(context) {
        const services = context.sourceCode.parserServices;
        if (!isRequiredParserServices(services)) return {};
        const reported = new Set<Scope.Variable>();

        return {
          MemberExpression(node: estree.MemberExpression) {
            // TODO
          },
        };
      },
    };
fixtures:
  connections.fixture.js: |
    function early(open) {
      let conn = null;
      conn.send('hello'); // Noncompliant {{TypeError can be thrown as "conn" might be null or undefined here.}}
    //^^^^
      conn.send('twice');
      conn = open();
      conn.send('again');
    }

    function optional() {
      let cache = undefined;
      cache?.clear();
    }

    function unknown(user) {
      if (user === null) {
        return user.name;
      }
      return user.name;
    }

    function callback(onReady, connect) {
      let socket = null;
      onReady(() => {
        socket = connect();
      });
      socket.send('hello');
    }
hidden:
  typed.fixture.ts: |
    interface Post { title: string; draft?: boolean }

    export function title(post: Post | undefined) {
      if (post === undefined) {
        return post.title; // Noncompliant
      }
      return post.title;
    }

    export function maybe(post: Post | undefined) {
      return post?.title;
    }

    export function computed() {
      let row: string[] | null = null;
      return row[0]; // Noncompliant
    }
answer:
  rule.ts: |
    import type { Rule, Scope } from 'eslint';
    import type estree from 'estree';
    import { generateMeta } from '../helpers/generate-meta.js';
    import { isRequiredParserServices } from '../helpers/parser-services.js';
    import { isUndefinedOrNull } from '../helpers/type.js';
    import { findFirstMatchingAncestor } from '../helpers/ancestor.js';
    import { isFunctionNode } from '../helpers/ast.js';

    export const rule: Rule.RuleModule = {
      meta: generateMeta(
        { sonarKey: 'S2259' },
        { messages: { nullDereference: 'TypeError can be thrown as "{{symbol}}" might be null or undefined here.' } },
      ),
      create(context) {
        const services = context.sourceCode.parserServices;
        if (!isRequiredParserServices(services)) return {};
        const reported = new Set<Scope.Variable>();
        const enclosingFunction = (node: estree.Node) => findFirstMatchingAncestor(node, isFunctionNode);

        function isWrittenInInnerFunction(variable: Scope.Variable, fn: estree.Node | undefined) {
          return variable.references.some((ref) => {
            if (!ref.isWrite()) return false;
            const writer = enclosingFunction(ref.identifier as estree.Node);
            return writer !== undefined && writer !== fn;
          });
        }

        return {
          MemberExpression(node: estree.MemberExpression) {
            const object = node.object as estree.Node;
            if (node.optional || object.type !== 'Identifier') return;
            const variable = context.sourceCode.getScope(object).references.find((r) => r.identifier === object)?.resolved;
            if (!variable || reported.has(variable)) return;
            if (isWrittenInInnerFunction(variable, enclosingFunction(object))) return;
            if (!isUndefinedOrNull(object, services)) return;
            reported.add(variable);
            context.report({ node: object, messageId: 'nullDereference', data: { symbol: object.name } });
          },
        };
      },
    };
hints:
  - "The variable of an identifier: `context.sourceCode.getScope(object).references.find((r) => r.identifier === object)?.resolved`."
  - "The function containing a node: `findFirstMatchingAncestor(node, isFunctionNode)`, `undefined` at the top level."
  - "A write in a function other than the access's: some write reference whose enclosing function exists and differs from the access's enclosing function. The declaration `let socket = null` is a write in the same function, so it does not count."
solution: |
  The rule is a dozen lines because TypeScript does the analysis: the type at `conn.send('hello')` is `null` only because the compiler followed the control flow from `let conn = null` and saw no assignment in between. Two details show what the rule adds on top. The once-per-variable set keeps the issue on the first access, the one to fix. And the inner-function check removes a whole class of false positives, `socket` in `callback`, which come from the compiler's decision not to look into callbacks. The parameter `user` in `unknown` has the type `any` in JavaScript, and `any` is not narrowed by `=== null`, so the rule stays silent there: types only help where there are types. SonarJS's rule also checks `for…of` over a null variable and a short-circuit mistake, `x === null && x.p`.
```

## Exercise: sorting numbers

The rule S2871, *"Array.prototype.sort()" and "Array.prototype.toSorted()" should use a compare function*, needs a type for a different reason: not to find a value, but to decide whether a call is the one the rule is about. It reports `sort()` and `toSorted()` called without a compare function on an array, and its message and quick fix depend on what the array holds:

- an array of strings sorts correctly by code unit, but not by any human language's alphabet: *Provide a compare function that depends on "String.localeCompare", to reliably sort elements alphabetically.*, with the suggestion `(a, b) => a.localeCompare(b)`;
- an array of numbers: *Provide a compare function to avoid sorting elements alphabetically.*, with the suggestion `(a, b) => (a - b)`;
- any other array: the same message, and no suggestion, since the right order is not obvious.

"An array" includes a union of arrays and a type parameter whose constraint is an array, which the kit's `isArrayLikeType(type, services)` handles. `isStringArray`, `isNumberArray` and `isBigIntArray` look at the element type.

::source{path="packages/analysis/src/jsts/rules/S2871/rule.ts" symbol="getSuggestions"}

```rule
id: types/alphabetical-sort
title: Sorting without a compare function
key: S2871
prompt: |
  Implement S2871 for `sort` and `toSorted` called without arguments. Report on the method name (the callee's property). Offer the suggestions described above, inserting the compare function before the call's closing parenthesis; for arrays of `bigint`, offer no suggestion in this exercise. The listener's selector already restricts the calls to member calls without arguments.
files:
  rule.ts: |
    import type { Rule } from 'eslint';
    import type estree from 'estree';
    import { generateMeta } from '../helpers/generate-meta.js';
    import { isRequiredParserServices } from '../helpers/parser-services.js';
    import { getTypeFromTreeNode, isArrayLikeType, isNumberArray, isStringArray } from '../helpers/type.js';

    export const rule: Rule.RuleModule = {
      meta: generateMeta(
        { sonarKey: 'S2871' },
        {
          hasSuggestions: true,
          messages: {
            provideCompareFunction: 'Provide a compare function to avoid sorting elements alphabetically.',
            provideCompareFunctionForArrayOfStrings: 'Provide a compare function that depends on "String.localeCompare", to reliably sort elements alphabetically.',
            suggestNumericOrder: 'Add a comparator function to sort in ascending order',
            suggestLanguageSensitiveOrder: 'Add a comparator function to sort in ascending language-sensitive order',
          },
        },
      ),
      create(context) {
        const services = context.sourceCode.parserServices;
        if (!isRequiredParserServices(services)) return {};

        return {
          'CallExpression[arguments.length=0][callee.type="MemberExpression"]'(call: estree.CallExpression) {
            const { object, property } = call.callee as estree.MemberExpression;
            // TODO
          },
        };
      },
    };
fixtures:
  sort.fixture.ts: |
    export function sorting(scores: number[], names: string[], posts: { title: string }[], mixed: (string | number)[]) {
      scores.sort(); // Noncompliant [[qf1]] {{Provide a compare function to avoid sorting elements alphabetically.}}
    //       ^^^^
    // fix@qf1 {{Add a comparator function to sort in ascending order}}
    // edit@qf1 {{  scores.sort((a, b) => (a - b));}}
      names.sort(); // Noncompliant [[qf2]] {{Provide a compare function that depends on "String.localeCompare", to reliably sort elements alphabetically.}}
    // fix@qf2 {{Add a comparator function to sort in ascending language-sensitive order}}
    // edit@qf2 {{  names.sort((a, b) => a.localeCompare(b));}}
      posts.sort(); // Noncompliant {{Provide a compare function to avoid sorting elements alphabetically.}}
      mixed.sort(); // Noncompliant {{Provide a compare function to avoid sorting elements alphabetically.}}
      scores.sort((a, b) => b - a);
      names.sort((a, b) => a.localeCompare(b));
    }

    export function lookAlikes(table: { sort(): void }, text: string) {
      table.sort();
      text.split(',').sort(); // Noncompliant
    }
hidden:
  more.fixture.ts: |
    export function generic<T extends number[]>(values: T, either: number[] | string[], ids: bigint[]) {
      values.sort(); // Noncompliant {{Provide a compare function to avoid sorting elements alphabetically.}}
      either.sort(); // Noncompliant {{Provide a compare function to avoid sorting elements alphabetically.}}
      ids.sort(); // Noncompliant
      [3, 1, 2].sort(); // Noncompliant
      return values;
    }
    export function maybe(values: number[] | undefined) {
      values?.sort();
    }
answer:
  rule.ts: |
    import type { Rule } from 'eslint';
    import type estree from 'estree';
    import { generateMeta } from '../helpers/generate-meta.js';
    import { isRequiredParserServices } from '../helpers/parser-services.js';
    import { getTypeFromTreeNode, isArrayLikeType, isNumberArray, isStringArray } from '../helpers/type.js';

    const SORT_LIKE = new Set(['sort', 'toSorted']);

    export const rule: Rule.RuleModule = {
      meta: generateMeta(
        { sonarKey: 'S2871' },
        {
          hasSuggestions: true,
          messages: {
            provideCompareFunction: 'Provide a compare function to avoid sorting elements alphabetically.',
            provideCompareFunctionForArrayOfStrings: 'Provide a compare function that depends on "String.localeCompare", to reliably sort elements alphabetically.',
            suggestNumericOrder: 'Add a comparator function to sort in ascending order',
            suggestLanguageSensitiveOrder: 'Add a comparator function to sort in ascending language-sensitive order',
          },
        },
      ),
      create(context) {
        const services = context.sourceCode.parserServices;
        if (!isRequiredParserServices(services)) return {};
        const sourceCode = context.sourceCode;

        function insertComparator(call: estree.CallExpression, text: string): Rule.ReportFixer {
          const closing = sourceCode.getLastToken(call, (token) => token.value === ')')!;
          return (fixer) => fixer.insertTextBefore(closing, text);
        }

        return {
          'CallExpression[arguments.length=0][callee.type="MemberExpression"]'(call: estree.CallExpression) {
            const { object, property } = call.callee as estree.MemberExpression;
            if (property.type !== 'Identifier' || !SORT_LIKE.has(property.name)) return;
            const type = getTypeFromTreeNode(object as estree.Node, services);
            if (!isArrayLikeType(type, services)) return;
            const suggest: Rule.SuggestionReportDescriptor[] = [];
            if (isNumberArray(type, services)) suggest.push({ messageId: 'suggestNumericOrder', fix: insertComparator(call, '(a, b) => (a - b)') });
            else if (isStringArray(type, services)) suggest.push({ messageId: 'suggestLanguageSensitiveOrder', fix: insertComparator(call, '(a, b) => a.localeCompare(b)') });
            context.report({
              node: property,
              messageId: isStringArray(type, services) ? 'provideCompareFunctionForArrayOfStrings' : 'provideCompareFunction',
              suggest,
            });
          },
        };
      },
    };
hints:
  - "The method name: `property.type === 'Identifier'` and `property.name` is `sort` or `toSorted`. Then `const type = getTypeFromTreeNode(object, services)`."
  - "A suggestion's fix inserts text before the call's closing parenthesis: `sourceCode.getLastToken(call, (t) => t.value === ')')`, then `fixer.insertTextBefore(token, text)`."
  - "`values?.sort()` has an object of type `number[] | undefined`, which is not array-like: one member of the union is not an array, and the rule stays silent."
solution: |
  The type answers the question the syntax could not: `table.sort()` and `scores.sort()` are the same shape, and only one sorts an array. The element type then picks the message and the suggestion, which is what makes the issue actionable rather than merely correct. Two cases show the helpers' design. `values` is a type parameter: its type is `T`, and only its constraint, `number[]`, is an array, so `isArrayLikeType` asks the checker for the base constraint first; `isNumberArray(T)` is false, so there is no suggestion. `either` is a union of two arrays, array-like, but neither an array of numbers nor an array of strings. SonarJS's rule adds a bigint comparator, and two exceptions for code that sorts only to compare, `JSON.stringify(a.sort()) === JSON.stringify(b.sort())`, where the order does not matter.
```

## Where the types come from

Everything above assumes a `Program`. Building one is the most expensive thing SonarJS does: the compiler must read and parse every file the program includes, with their imports and the standard library's declaration files, and type-checking is lazy only up to a point. How SonarJS builds programs is therefore a trade-off between precision and time, and it differs between SonarQube and the IDE.

**In a SonarQube analysis**, the analyser looks for the project's `tsconfig.json` files (or uses those listed in the property `sonar.typescript.tsconfigPaths`), and follows their project references. It creates one program per tsconfig, with that tsconfig's compiler options, and analyses the files of the program with it, each file once. Files that no tsconfig includes, **orphan files**, such as scripts, configuration files, or JavaScript in a project without a tsconfig, are then grouped and analysed with programs created from default options (or, if the project has tsconfigs, from their merged options), so that they get types too. The setting `sonar.javascript.createTSProgramForOrphanFiles` turns this off, and `sonar.javascript.disableTypeChecking` turns off programs entirely, for projects where they cost too much. A file analysed without a program gets no types, and type-aware rules stay silent on it; the analysis log says so.

::source{path="packages/analysis/src/analyzeWithProgram.ts" symbol="async function analyzeFilesFromEntryPoint" title="Programs for orphan files" note="Orphan files are partitioned by the standard library they resolve to, so that files of different packages in a monorepo do not share one set of Node.js or browser globals."}

The default options for orphan programs are deliberately lenient, `allowJs` on and `strict` off, since they apply to code whose author never chose any. As figure 9.1 showed, that changes the types rules see.

::source{path="packages/analysis/src/jsts/program/tsconfig/options.ts" symbol="defaultCompilerOptions"}

**In the IDE**, SonarQube for IDE analyses one file at a time, each time it changes. Building a program from scratch for every keystroke would be far too slow, so SonarJS keeps programs in a cache and updates them **incrementally**, with TypeScript's builder programs, which reuse the parsed files and the checking results of the previous version of the program for everything that did not change. For each file, it reuses a cached program that already contains the file, or creates one from the closest tsconfig.

::source{path="packages/analysis/src/jsts/program/factory.ts" symbol="export function createOrGetCachedProgramForFile"}

Chapter 18 follows one file through an analysis, program included; chapter 19 looks at the IDE side. For a rule writer, the lesson is the guard at the top of every type-aware rule: types are a bonus that may be absent, and a rule must be correct, and quiet, without them.

## What comes next

Rules now know the tree, the names, the modules and the types. Part II has one more chapter about what rules can know, from an unusual source: other rules. SonarJS runs and adapts rules from ESLint's ecosystem, and the next chapter shows how.
