---
title: Inside one analysis
summary: What happens to a file inside the Node.js worker. The filters that skip files, the stores and programs, the filters that choose rules, suppressions, and everything a file yields besides issues.
number: 18
duration: 50 minutes
prerequisites: [scanner-to-node, types]
---

The previous chapter followed one issue across the boundary between Java and Node.js. This one stays inside the worker thread, where a project request becomes a set of file results. Most of what happens there is decisions: which files to analyse, with which program, by which rules, and what to report besides issues. Each decision is a place where a user's question ("why is this file not analysed?", "why does this rule not run here?") finds its answer.

## Which files

The Java side sends the files the scanner indexed for SonarJS's languages, minus those matching the exclusions. By default, the JavaScript and TypeScript exclusions skip `node_modules`, `bower_components`, `dist`, `vendor`, `external` and `contrib` directories, and declaration files (`*.d.ts`); a project can change the list with `sonar.javascript.exclusions` and `sonar.typescript.exclusions`. Then the Node.js side applies three filters of its own to each JavaScript and TypeScript file, all of them aimed at code nobody wrote by hand:

- **Bundles**: a file whose first two kilobytes look like the output of a bundler (a comment followed by `!function(` or a similar wrapper) is skipped, with a log line explaining how to turn the detection off (`sonar.javascript.detectBundles=false`).
- **Minified files**: a file named `*.min.js` or `*-min.js`, or a `.js` file whose lines average more than 200 characters, is skipped.
- **Large files**: a file larger than `sonar.javascript.maxFileSize`, 1000 KB by default, is skipped.

::source{path="packages/analysis/src/common/filter/filter.ts" symbol="export function accept"}

The worker keeps long-lived **file stores** for what it learns about the project: the source files, the tsconfigs, the dependency manifests (chapter 8), and the files that project-local code generators produced. Each store decides for itself when it is out of date, so that the IDE, which sends a request every time a file changes, does not rediscover the project each time.

## Which program

Chapter 9 described the choices: in SonarQube, one TypeScript program per tsconfig, then programs for orphan files, then no types; in the IDE, cached incremental programs from the closest tsconfig. Whichever path a file takes, it ends in the same function, `analyzeFile`, with or without a program. That function dispatches by language: CSS to stylelint, HTML and YAML to the embedded-JavaScript extractors (below), JavaScript and TypeScript to the JS/TS analyser, which parses the file with the parser router of chapter 2.

A file that does not parse produces no issues from rules, since rules need a tree. It produces a parsing error instead, which the Java side logs and, when the rule S2260 is active, reports as an issue on the line of the error, so that unparsable files are visible in SonarQube rather than silently unanalysed.

## Which rules

The quality profile says which rules are active for the project. Not all of them run on every file. Before linting a file, the linter computes the file's rules by passing each active rule through a sequence of **rule filters**, cheapest first:

| Filter | A rule runs only if… |
|---|---|
| file type | the file's type (main or test) is among the rule's targets (most rules target main code; some, about tests, target test code) |
| analysis mode | the rule runs in the current mode (see *unchanged files* below) |
| language | the rule supports the file's language (some rules are JavaScript-only or TypeScript-only) |
| blacklisted extensions | the file's extension is not one the rule excludes |
| generated source | the rule does not skip generated files, or the file is hand-written |
| ECMAScript version | the project targets a version recent enough for the rule's advice (no point recommending `Object.hasOwn` to code that must run where it does not exist) |
| module type | the rule's required module system (ES modules or CommonJS) matches the file's |
| React, Vue, dependencies | the project depends on the libraries the rule is about (chapter 8) |

::source{path="packages/analysis/src/jsts/linter/filters/index.ts" symbol="DEPENDENCY_INDEPENDENT_RULE_FILTERS"}

Each selected rule then gets its **options**, merged from three sources in order: the upstream rule's own defaults (for decorated and external rules), the defaults of SonarJS's `fields` (chapter 10), and the parameters set in the quality profile. The configuration ESLint receives for the file holds the globals of the project's environments, the parser and its options, the `sonarjs` plugin with every rule, the selected rules with their options, and a few **settings** that rules read: `sonarRuntime: true` (chapter 5), the file's type, its detected module type, and, for main files, the metrics sink of S3776 (chapter 6).

## Suppressions

ESLint honours its directive comments: `// eslint-disable-next-line no-shadow` silences the next line. SonarJS maps the names in such directives to its own rules (chapter 10), so the directive also silences S1117. The silenced messages are not simply dropped: ESLint returns them separately as **suppressed messages**, and SonarJS sends them to Java as suppressed issues. With a recent enough plugin API and the feature enabled, the Java side records them in SonarQube as *accepted* issues, with the directive's justification as the resolution comment: ESLint lets a directive carry one after `--`, as in `// eslint-disable-next-line no-shadow -- the outer value is intentionally hidden`. Without a justification, the resolution comment is a default, *Accepted via ESLint directive*. Silencing an issue in the code thus remains visible to whoever reviews the project's accepted issues.

::source{path="packages/analysis/src/jsts/linter/issues/transform.ts" symbol="DEFAULT_SUPPRESSED_ISSUE_RESOLUTION_COMMENT"}

SonarQube's own suppression comment, `// NOSONAR` on a line, works differently: it silences every issue on that line, whatever the rule. The Node.js side only finds the lines that carry it and sends them with the file's metrics; the Java side passes them to the platform's `NoSonarFilter`, which drops the issues on those lines.

## Everything else a file yields

Issues are one of several things a main file produces. The rest feed SonarQube's other features:

- **Metrics**: the lines of code (lines with at least one token that is not a comment), comment lines, `NOSONAR` lines, executable lines (for coverage), and the numbers of functions, statements and classes, cyclomatic complexity, and Cognitive Complexity from S3776's sink. One walk over the tree and the tokens computes all but the last.
- **Syntax highlighting**: keywords, strings, comments, structured (JSDoc) comments and constants, by token range, for SonarQube's code viewer.
- **Symbol highlighting**: for each variable, its declaration and its references, from the scope manager, so that clicking a name in the code viewer highlights its other occurrences.
- **Duplication tokens**: the token stream SonarQube's copy-paste detector compares across files. String literals are replaced by the placeholder `LITERAL`, so that two functions differing only in their messages still count as duplicates, and import declarations and `require` calls are left out, since every file has similar ones.
- **The syntax tree**, serialised in protobuf, for other plugins (chapter 17), unless the request asked to skip it.

::source{path="packages/analysis/src/jsts/analysis/file-artifacts.ts" symbol="function collectCpdToken"}

Test files yield less (highlighting, symbol highlighting and their lines of code, but no other metrics and no duplication tokens), and in SonarQube for IDE, files yield issues and little else: the editor has its own highlighting, and metrics are a server concern.

## JavaScript inside other files

JavaScript does not only live in `.js` files. SonarJS analyses three kinds of embedded code:

- **Vue single-file components**, which the parser router parses whole with `vue-eslint-parser`: the `<script>` block becomes an ESTree program, with the template alongside for the Vue rules.
- **HTML files**, whose `<script>` elements are extracted and analysed as snippets.
- **YAML files** that define AWS functions with inline code: a CloudFormation `AWS::Lambda::Function` with `Code.ZipFile`, or a SAM `AWS::Serverless::Function` with `InlineCode`. Each function's code is analysed as a snippet, under a synthetic file name made of the YAML file's name and the function's resource name.

A snippet is parsed on its own, and its tree's locations are shifted to the snippet's position in the enclosing file before rules run, so that issues land on the right line of the HTML or YAML file. Bundle detection does not apply to snippets (an inline script that starts with a comment and an immediately invoked function is ordinary), but the minification check does.

::source{path="packages/analysis/src/jsts/embedded/builder/build.ts" symbol="export function build("}

## Unchanged files

In a pull request analysis, SonarQube only shows issues on changed code, and SonarQube Server can tell the scanner that it may skip unchanged files. The plugin then works in the analysis mode `SKIP_UNCHANGED`. For an unchanged file with a usable entry in SonarQube's analysis cache, nothing is sent to Node.js at all: the Java side replays the cached duplication tokens and syntax tree, which other features still need, and SonarQube takes the file's issues from the analysis of the target branch. For an unchanged file without a cache entry, Node.js analyses it, but the rule filter for analysis modes keeps only the rules that declared that they must run on unchanged files too; by default, a rule only runs in the default mode. The cache is keyed by the file and by the plugin's version, so that a new version of SonarJS, with new or changed rules, analyses everything again.

::source{path="sonar-plugin/sonar-javascript-plugin/src/main/java/org/sonar/plugins/javascript/analysis/cache/CacheStrategies.java" symbol="static CacheStrategy getStrategyFor("}

## What happens if…

```quiz
q: "A project commits its webpack output, `public/app.bundle.js`, which starts with `/*! For license information… */ !function(e){…`. What happens to it?"
options:
  - text: "It is analysed like any other file, and raises hundreds of issues."
    why: "Not by default: bundle detection skips it."
  - text: "It is skipped as a bundle, with an info line in the log saying how to disable the detection."
    correct: true
    why: "A comment followed by `!function(` at the start of the file is the shape bundle detection looks for. The log explains `sonar.javascript.detectBundles=false` for projects that really want it analysed."
  - text: "It is analysed, but every issue is marked as generated code."
    why: "Generated-source detection is a different mechanism, about files produced by project-local generators, and it only affects rules that opt out of generated files."
```

```quiz
q: "A TypeScript file has a syntax error on line 40. Rule S2260 is active. What does SonarQube show for that file?"
options:
  - text: "The issues of every rule on lines 1 to 39."
    why: "Rules need a complete tree; a file that does not parse is not linted at all."
  - text: "One issue from S2260 on line 40, and no other issue from SonarJS's rules."
    correct: true
    why: "The parsing error is sent back instead of issues; the Java side logs it and reports it as an S2260 issue when that rule is in the quality profile."
  - text: "Nothing: the file is silently skipped."
    why: "Parsing errors are logged, and S2260 makes them visible as issues."
```

```quiz
q: "Rule S2699 (*Tests should include assertions*) targets test files. A developer writes a test helper in `src/` that has a function `testLogin()` with no assertions. Does S2699 run on it?"
options:
  - text: "Yes: the function's name looks like a test."
    why: "The rule filter does not look at names; it looks at the file's type."
  - text: "No: the file is under `sonar.sources`, so it is a main file, and the rule's targets are test files."
    correct: true
    why: "File type comes from the scanner's configuration. A rule that targets test files never sees main files, whatever they contain."
  - text: "Only in SonarQube for IDE."
    why: "File types work the same way in the IDE, which gets them from the connected project's configuration or its own detection of test files."
```

```quiz
q: "A line carries `// eslint-disable-next-line @typescript-eslint/no-shadow -- legacy API` above a shadowing declaration. S1117 is active. What happens?"
options:
  - text: "S1117 raises an issue: the directive names typescript-eslint's rule, not S1117."
    why: "SonarJS maps the names of the rules it runs, including the upstream rule behind an external rule, to its own rules."
  - text: "Nothing is reported, and the silenced issue may be recorded as accepted, with the comment “legacy API”."
    correct: true
    why: "The directive silences the message, ESLint returns it as suppressed, and with the issue-resolution feature available the Java side records it as accepted with the directive's justification."
  - text: "The directive is ignored: SonarJS does not honour ESLint directives."
    why: "It does, so that projects migrating from ESLint keep their suppressions."
```

## What comes next

The same analyser runs in two very different settings: a CI pipeline analysing a whole project once, and an editor analysing one file at a time, every few seconds. The next chapter compares them.
