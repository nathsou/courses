---
number: C
title: The course kit
summary: Every helper the workbench provides under helpers/, what it does, the chapter that introduces it, and its counterpart in SonarJS.
---

The kit is the course's own code, written for the course, with the same module names, function names and signatures as SonarJS's helpers where they correspond, so that what you write against the kit reads like SonarJS's rules. A rule imports a helper by its path, as SonarJS's rules do: `import { isIdentifier } from '../helpers/ast.js'`. In the workbench, the kit's sources are visible, read-only, under `helpers/`, and the editor offers completion and documentation for them.

A helper you write in an exercise, under the same name, replaces the kit's for that exercise.

## ast.ts: predicates and single writes

Chapters 3 and 7. Counterpart: SonarJS's `rules/helpers/ast.ts`.

| Helper | What it does |
|---|---|
| `isIdentifier(node, ...names)` | an identifier, optionally with one of the names |
| `isMemberWithProperty(node, ...names)` | `object.property`, non-computed, with one of the names |
| `isMethodCall(node)` | a call `receiver.name(…)` |
| `isCallingMethod(call, arity, ...names)` | a method call with one of the names and exactly `arity` arguments |
| `isFunctionNode(node)` | a function declaration, function expression or arrow function |
| `isLiteral`, `isStringLiteral`, `isNumberLiteral`, `isNullLiteral`, `isUndefined` | literal tests |
| `unwrapTypeScriptExpression(node)` | strips `as`, `!`, `<T>` and `satisfies` |
| `getVariableFromName(context, name, node)`, `getVariableFromScope(scope, name)` | the variable a name refers to, searching outwards |
| `getUniqueWriteReference(variable)` | the expression written to a variable written exactly once |
| `getUniqueWriteUsage(context, name, node)`, `getUniqueWriteUsageOrNode(context, node)` | the same, from a name or an identifier |
| `getValueOfExpression(context, node, type)` | the node, or what it resolves to through single writes, if it has the given type |
| `getProperty(object, key, context)`, `getPropertyWithValue(context, object, key, value)` | a property of an object literal, through spreads and single writes |
| `getStaticExpressionValue(expression)` | the string of a literal or of a template literal without expressions |
| `getConstantValue(context, node)` | the course's own: the value of a constant expression, through single writes |

::source{path="packages/analysis/src/jsts/rules/helpers/ast.ts" title="SonarJS's ast.ts"}

## ancestor.ts: walking the tree

Chapter 3. Counterpart: SonarJS's `rules/helpers/ancestor.ts`.

| Helper | What it does |
|---|---|
| `getParent(context, node)`, `getNodeParent(node)` | the parent during the traversal |
| `ancestorsChain(node)` | the ancestors, nearest first |
| `findFirstMatchingAncestor(node, predicate)` | the nearest ancestor that matches |
| `childrenOf(node, visitorKeys)` | the direct children, using the parser's visitor keys |

## equivalence.ts

Chapter 3. Counterpart: SonarJS's `rules/helpers/equivalence.ts`.

| Helper | What it does |
|---|---|
| `areEquivalent(a, b, sourceCode)` | the same node type and the same tokens: syntactic equivalence, behind S1764 |

## location.ts: reporting

Chapter 5. Counterpart: SonarJS's `rules/helpers/location.ts`.

| Helper | What it does |
|---|---|
| `report(context, descriptor, secondaryLocations, cost)` | reports an issue, encoding secondary locations and cost when `sonarRuntime` is set |
| `toSecondaryLocation(start, end?, message?)` | a secondary location over one node or a span |
| `getMainFunctionTokenLocation(fn, parent, context)` | where to report about a function without underlining its body |
| `encodeContents`, `decodeMessage`, `expandMessage` | the `sonarRuntime` message encoding and its inverse |

::source{path="packages/analysis/src/jsts/rules/helpers/location.ts" title="SonarJS's location.ts"}

## generate-meta.ts

Chapters 3 and 20. Counterpart: SonarJS's `rules/helpers/generate-meta.ts`.

| Helper | What it does |
|---|---|
| `generateMeta(sonarMeta, ruleMeta)` | merges what RSPEC says about a rule with what its implementation declares |

## module.ts: fully qualified names

Chapter 8. Counterpart: SonarJS's `rules/helpers/module.ts`.

| Helper | What it does |
|---|---|
| `getFullyQualifiedName(context, node)` | the module a value comes from, followed by the properties accessed on it, whatever the file calls it |
| `getModuleNameFromRequire(node)` | the module of `require('…')` |
| `removeNodePrefix(name)` | `node:fs` and `fs` are the same module |
| `reduceToIdentifier(node, fqn)` | peels accesses and calls off an expression, collecting property names |
| `getImportDeclarations(context)`, `getRequireCalls(context)` | the file's imports and `require` calls |
| `getCurrentFileImports(context)`, `importsModule(context, moduleNames)` | which modules the file imports |

::source{path="packages/analysis/src/jsts/rules/helpers/module.ts" title="SonarJS's module.ts"}

## parser-services.ts and type.ts: types

Chapter 9. Counterparts: SonarJS's `rules/helpers/parser-services.ts` and `rules/helpers/type.ts`.

| Helper | What it does |
|---|---|
| `isRequiredParserServices(services)` | whether the file has a TypeScript program |
| `getTypeFromTreeNode(node, services)` | the type of an ESTree node, after narrowing |
| `typeToString`, `getSymbolAtLocation` | the checker's views of a type and a symbol |
| `getUnionTypes`, `isUnion`, `isAny` | union types |
| `isStringType`, `isNumberType`, `isBigIntType`, `isString` | primitive types |
| `isArray`, `isArrayType`, `isArrayLikeType`, `isStringArray`, `isNumberArray`, `isBigIntArray` | arrays and tuples |
| `isNullOrUndefinedType`, `isNullableType`, `isUndefinedOrNull` | nullness: exactly null, possibly null |
| `isThenable` | promises and other thenables |

::source{path="packages/analysis/src/jsts/rules/helpers/parser-services.ts" title="SonarJS's parser-services.ts"}

## collection.ts

Chapter 9. Counterpart: SonarJS's `rules/helpers/collection.ts`.

| Helper | What it does |
|---|---|
| `last(array)`, `flatMap(array, f)` | small collection utilities |
| `sortLike`, `copyingSortLike` | the names of mutating and copying sort methods, as S2871 matches them |

## decorators.ts: reusing rules

Chapter 10. Counterpart: SonarJS's `rules/helpers/decorators/` (`interceptor.ts` and its relatives).

| Helper | What it does |
|---|---|
| `interceptReport(rule, onReport)` | wraps a rule so that each report goes through a filter first |
| `mergeRules(...listeners)` | runs several sets of listeners as one |

::source{path="packages/analysis/src/jsts/rules/helpers/decorators/interceptor.ts" title="SonarJS's interceptor"}

## regex.ts: regular expressions as trees

Chapter 11. Counterpart: SonarJS's `rules/helpers/regex/` (`rule-template.ts` and its relatives), on the same parser, regexpp.

| Helper | What it does |
|---|---|
| `createRegExpRule(handlers)` | a rule that receives each regular expression of the file, literal or built with `RegExp`, parsed into a tree |
| `getParsedRegex(pattern, flags?)` | parses a pattern |
| `getRegexpRange(node, regexpNode)` | where a part of a pattern is in the source |

::source{path="packages/analysis/src/jsts/rules/helpers/regex/rule-template.ts" title="SonarJS's regex rule template"}

## lva.ts and reaching-definitions.ts: dataflow

Chapters 14 and 15. Counterparts: SonarJS's `rules/helpers/lva.ts` and `rules/helpers/reaching-definitions.ts`.

| Helper | What it does |
|---|---|
| `lva(liveVariablesBySegment)`, `LiveVariables` | live variable analysis over code-path segments, behind S1854 |
| `reachingDefinitions(definitionsBySegment)`, `ReachingDefinitions` | reaching definitions with value sets, behind S4165 |
| `joinValues`, `resolveAssignedValues`, `UNKNOWN` | the value-set lattice and its transfer |

::source{path="packages/analysis/src/jsts/rules/helpers/lva.ts" title="SonarJS's lva.ts"}

::source{path="packages/analysis/src/jsts/rules/helpers/reaching-definitions.ts" title="SonarJS's reaching-definitions.ts"}
