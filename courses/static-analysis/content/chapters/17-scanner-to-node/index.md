---
title: From scanner to Node
summary: The journey of one issue through SonarJS's architecture. A Java plugin in the scanner, a Node.js process it starts and leases, a gRPC stream between them, and the conversions at every boundary.
number: 17
duration: 50 minutes
prerequisites: [anatomy-of-a-rule, reporting]
---

In chapter 0, an issue appeared on `Math.random()` in Corkboard's session-token function. So far the course has looked at the rule that raised it. This part looks at everything else: how the file reached the rule, and how the rule's report became an issue in SonarQube or in the editor. The answer involves two languages, two processes and half a dozen data formats, and knowing it is what lets you answer the questions users actually ask: why a file was not analysed, why an issue has no type information, why the IDE and the server disagree.

## Two halves

SonarQube's analysers are **plugins** written in Java, run by the **scanner**, the program that analyses a project on a developer's machine or in CI (SonarScanner for the command line, Maven, Gradle, .NET, npm, and the CI integrations that wrap them). The scanner downloads the plugins and the project's quality profile from the server, indexes the project's files, and calls each plugin's **sensors**. A sensor receives the indexed files (`InputFile`s, each with a language decided by its suffix and a type, main or test, decided by `sonar.sources` and `sonar.tests`) and reports issues, metrics, highlighting and duplication tokens through the plugin API.

ESLint, typescript-eslint and the TypeScript compiler are JavaScript. So SonarJS's Java plugin is a bridge: its sensor, `WebSensor`, starts a Node.js process that runs the actual analysis, sends it the files and the active rules, and converts what comes back into the plugin API's objects. One sensor handles every language that needs that process: JavaScript, TypeScript, CSS (with stylelint), and the JavaScript embedded in HTML, Vue and YAML files.

::source{path="sonar-plugin/sonar-javascript-plugin/src/main/java/org/sonar/plugins/javascript/analysis/WebSensor.java" symbol="public void execute(SensorContext sensorContext)"}

## Finding Node.js

Before anything is analysed, the plugin needs a Node.js runtime. It looks, in order, for:

1. the executable named by the property `sonar.nodejs.executable`;
2. an **embedded runtime** that the plugin ships for the common platforms, unpacked into the scanner's user cache on first use;
3. the `node` of the host, from the `PATH` (on macOS through a small script that loads the user's shell environment, so that a Node installed with a version manager is found even when the scanner is launched from an IDE).

The properties `sonar.nodejs.forceHost` and `sonar.scanner.skipNodeProvisioning` skip the embedded runtime. Whatever runtime is chosen, its version is checked against the minimum the analyser supports, and the analysis fails with an explicit message if it is too old or missing. The heap size of the process can be raised with `sonar.javascript.node.maxspace`, which becomes Node's `--max-old-space-size`: TypeScript programs for large projects need it.

::source{path="sonar-plugin/bridge/src/main/java/org/sonar/plugins/javascript/nodejs/NodeCommandBuilderImpl.java" symbol="private String retrieveNodeExecutable"}

## Starting the bridge

The Node.js half of SonarJS ships inside the plugin's jar as a bundle. The plugin deploys it to a temporary directory and starts `node` on its server script. The server starts a **gRPC** server on a free port and prints the port on its standard output, where the Java side reads it; Java then opens a gRPC channel to it.

The first call on that channel is a **lease**: a bidirectional stream that stays open for the life of the analysis. It ties the two processes together. If the stream ends, because the analysis finished, the scanner crashed or the machine is shutting down, the Node.js process shuts itself down rather than linger; and if no lease arrives within a timeout after startup, it shuts down too. (A developer debugging SonarJS can instead point the plugin at a Node.js server they started themselves, through an environment variable; then nobody leases it.)

::source{path="packages/grpc/src/analyze-project-server.ts" symbol="function createLeaseHandler" title="The lease, on the Node side"}

## One request per project

The service has four calls:

| RPC | What it does |
|---|---|
| `AnalyzeProject` | Analyses a whole project: one request, a **stream** of responses, one per file as soon as it is done, then a final message with warnings and telemetry. |
| `AnalyzeProjectUnary` | The same, with all the results in one response. |
| `CancelAnalysis` | Cancels the analysis in progress, for example when the user cancels in the IDE. |
| `Lease` | Keeps the server alive, as above. |

::source{path="packages/grpc/src/proto/analyze-project.proto" symbol="service AnalyzeProjectService" title="The contract between Java and Node.js"}

The request carries the project's **configuration** (its base directory, whether this is an IDE analysis, the analysis mode, the environments and globals, the suffixes of each language, the tsconfig paths, exclusions and a dozen flags), the **files** (paths, types, and change status; their contents only when Node.js cannot read them from disk itself, such as unsaved editor buffers or files with a non-UTF-8 encoding), and the **active rules**, each with its key, its parameters, the file types it targets (main, test), its language and the analysis modes it runs in. It can also name **bundles**: rules contributed by other Sonar plugins, which the Node.js side loads at startup (chapter 20).

Analyses run one at a time. The server keeps a queue of at most four pending requests and refuses more with gRPC's `RESOURCE_EXHAUSTED`; cancelling a request's transport removes it from the queue, or asks the worker to stop if it is the one running. The analysis itself runs in a **worker thread**, not on Node's main thread: the main thread stays free to answer the lease and a cancellation while a big TypeScript program is being type-checked.

::source{path="packages/grpc/src/analyze-project-server-queue.ts" symbol="MAX_PENDING_ANALYSIS_REQUESTS"}

## Follow the issue

Follow the `Math.random()` call in Corkboard's `routes/auth.ts`, line 17, from the scanner to the issue. Each stage shows where it runs, where its code is, and the shape of the data it passes on. The shapes are simplified, but every field shown exists.

:::follow-issue{n="17.1"}
```yaml
subtitle: One call to Math.random, from the scanner to SonarQube.
stages:
  - lane: Scanner (Java)
    title: The scanner indexes the project
    text: The scanner reads the project's settings, downloads the plugins and the quality profile, and indexes every file under `sonar.sources` and `sonar.tests`. Each file gets a language from its suffix and a type. Then it runs the sensors.
    shape: |
      InputFile {
        uri: file:///work/corkboard/src/routes/auth.ts
        language: "ts"          // from sonar.typescript.file.suffixes
        type: MAIN              // under sonar.sources, not sonar.tests
        status: CHANGED         // compared with the base branch, in a pull request
        charset: UTF-8
      }
  - lane: Scanner (Java)
    title: WebSensor builds the request
    text: The sensor keeps the files it handles, decides for each JS/TS file whether a cached result can be reused, collects the active rules of the quality profile with their parameters, and builds one request for the whole project.
    path: sonar-plugin/sonar-javascript-plugin/src/main/java/org/sonar/plugins/javascript/analysis/WebSensor.java
    symbol: getRequest
    lang: protobuf, shown as JSON
    shape: |
      AnalyzeProjectRequest {
        configuration: { baseDir: "/work/corkboard", sonarlint: false,
                         analysisMode: DEFAULT, environments: [...], globals: [...],
                         tsSuffixes: [".ts", ".tsx", ".cts", ".mts"], tsConfigPaths: [], ... },
        files: { "/work/corkboard/src/routes/auth.ts": { fileType: MAIN, fileStatus: CHANGED },
                 ... },
        rules: [ { key: "S2245", configurations: [], fileTypeTargets: [MAIN],
                   language: TS, analysisModes: [DEFAULT] },
                 ... ]
      }
  - lane: Scanner (Java)
    title: The bridge starts Node.js and leases it
    text: '`BridgeServerImpl` deploys the Node.js bundle, chooses a runtime (property, embedded, host), starts the server script, reads the port it prints, opens a gRPC channel and acquires the lease. Then it calls `AnalyzeProject` and starts consuming the stream.'
    path: sonar-plugin/bridge/src/main/java/org/sonar/plugins/javascript/bridge/BridgeServerImpl.java
    symbol: void startServer
    shape: |
      $ ~/.sonar/js/node-runtime/.../bin/node --max-old-space-size=4096 \
          .../bridge-bundle/package/bin/server.cjs ...
      gRPC analyze-project server listening on 127.0.0.1:43715
  - lane: Node.js main thread
    title: The server queues the request
    text: The gRPC handler admits the request into the queue (one active, at most four pending), normalises it into the analyser's own configuration types, and posts it to the worker thread.
    path: packages/grpc/src/analyze-project-server.ts
    symbol: createAnalyzeProjectImplementation
  - lane: Node.js worker thread
    title: The analyser plans the project
    text: '`analyzeProject` initialises the linter with the active rules, then chooses how to give files types: one TypeScript program per tsconfig found (`auth.ts` belongs to Corkboard''s), then programs for orphan files, then no program at all for whatever is left (chapter 9).'
    path: packages/analysis/src/analyzeProject.ts
    symbol: analyzeWithProgram
  - lane: Node.js worker thread
    title: One file is parsed
    text: '`analyzeFile` dispatches by language. For a TypeScript file, the parser router parses it with typescript-eslint, inside the program, and builds an ESLint `SourceCode` (chapter 2).'
    path: packages/analysis/src/analyzeFile.ts
    symbol: export async function analyzeFile
  - lane: ESLint
    title: ESLint runs the rules
    text: The linter picks the rules for this file (by file type, language, ECMAScript version, dependencies…), adds S3776 silently for the metrics, and calls ESLint's `verify`. S2245's listener sees the call, computes its FQN and reports.
    path: packages/analysis/src/jsts/linter/linter.ts
    symbol: static lint(
    lang: ESLint LintMessage
    shape: |
      {
        ruleId: "sonarjs/S2245",
        severity: 2,
        message: "Make sure that using this pseudorandom number generator is safe here.",
        messageId: "safeGenerator",
        line: 17, column: 10, endLine: 17, endColumn: 23,   // 1-based columns
        nodeType: "CallExpression"
      }
  - lane: Node.js worker thread
    title: The message becomes an issue
    text: '`transformMessages` keeps only SonarJS''s rules, strips the `sonarjs/` prefix, decodes secondary locations from the message when the rule encoded them (chapter 5), converts fixes into quick fixes, and makes columns 0-based. It records the rule''s ESLint names too, for suppression comments.'
    path: packages/analysis/src/jsts/linter/issues/transform.ts
    symbol: function transformMessage
    lang: JsTsIssue
    shape: |
      {
        ruleId: "S2245",
        language: "ts",
        filePath: "/work/corkboard/src/routes/auth.ts",
        line: 17, column: 9, endLine: 17, endColumn: 22,     // 0-based columns
        message: "Make sure that using this pseudorandom number generator is safe here.",
        secondaryLocations: [],
        ruleESLintKeys: ["pseudo-random"]
      }
  - lane: Node.js worker thread
    title: The file's result is complete
    text: Beside the issues, the file's result has its metrics (lines of code, comment lines, complexity, cognitive complexity), syntax highlighting, symbol references, duplication tokens and, unless disabled, its syntax tree serialised in protobuf. It is streamed to Java as soon as the file is done.
    path: packages/grpc/src/proto/analyze-project.proto
    symbol: message ProjectAnalysisFileResult
    lang: protobuf
    shape: |
      FileResultMessage {
        file_path: "/work/corkboard/src/routes/auth.ts"
        result: {
          issues: [ { rule_id: "S2245", line: 17, column: 9, end_line: 17, end_column: 22,
                      message: "...", language: ANALYSIS_LANGUAGE_TS,
                      rule_eslint_keys: ["pseudo-random"] } ]
          metrics: { ncloc: [1, 2, 3, ...], functions: 3, complexity: 4, cognitive_complexity: 2, ... }
          highlights: [...], highlighted_symbols: [...], cpd_tokens: [...], ast: <bytes>
        }
      }
  - lane: Scanner (Java)
    title: The plugin saves the results
    text: '`AnalysisProcessor` turns each issue into the plugin API''s `NewIssue`, in the repository of the file''s language (`typescript:S2245`), with its primary and secondary locations and, when the rule has a linear remediation, its cost as the issue''s gap. It saves the metrics, the highlighting and the duplication tokens, and hands the syntax tree to other plugins that asked for it.'
    path: sonar-plugin/sonar-javascript-plugin/src/main/java/org/sonar/plugins/javascript/analysis/AnalysisProcessor.java
    symbol: private void saveIssues
  - lane: SonarQube
    title: The server computes the issue's place in the project
    text: The scanner uploads the report. The server matches the issue with those of the previous analysis (to know whether it is new), computes its effort from the rule's remediation function, and applies the quality gate. In a pull request, it shows the issue only if it is on a changed line.
```
:::

## The other direction: the tree as an export

The last Java stage has a detail that matters beyond SonarJS. The file's result can carry its whole syntax tree, serialised in protobuf by the Node.js side (the format is defined in `estree.proto`, a protobuf description of ESTree). On the Java side, the plugin decodes it into Java objects and offers it, with the file, to any implementation of the `JsAnalysisConsumer` interface that another installed plugin provides. Other Sonar analysers can thus work on JavaScript and TypeScript syntax trees without parsing JavaScript themselves.

::source{path="sonar-plugin/api/src/main/java/org/sonar/plugins/javascript/api/JsAnalysisConsumer.java" symbol="void accept(JsFile jsFile)"}

What the consumers do is outside SonarJS's repository, but its documentation names two of them. Sonar's architecture analysis reads the trees of every file, unchanged ones included, to build import and dependency graphs. And Sonar's security analysis used to run its taint-analysis rules inside SonarJS, through the hook API of chapter 20, producing an intermediate representation (files called UCFGs) that SonarJS cached between analyses; the repository records that this integration and its cache were removed in November 2025. How Sonar's products analyse taint in JavaScript today is not something the repository shows, and this course does not guess. Part VII explains taint analysis on its own terms.

::source{path="docs/sonar-cache.md" title="The cache's history" note="The section on analysis modes lists the external plugins that registered hooks for unchanged files; the history table dates the removal of the security analysis's UCFG caching."}

## What can go wrong

```quiz
q: "A project is analysed on a CI agent that has no `node` on its `PATH`, and no `sonar.nodejs.executable` property. What happens?"
options:
  - text: "The analysis fails: Node.js is required."
    why: "Not necessarily: there is an option before the host's runtime."
  - text: "The plugin uses the embedded Node.js runtime it ships, if one exists for the agent's platform."
    correct: true
    why: "The embedded runtime comes second, before the host. Only if there is none for the platform (or `sonar.nodejs.forceHost` or `sonar.scanner.skipNodeProvisioning` is set) does the plugin look for `node` on the `PATH`, and then fail with a message explaining how to configure one."
  - text: "JavaScript files are skipped silently, and the other languages are analysed."
    why: "SonarJS reports a missing runtime as an error, with instructions, rather than silently skipping files."
```

```quiz
q: "The scanner process is killed in the middle of an analysis. What happens to the Node.js process it started?"
options:
  - text: "It keeps running until the next analysis reuses it."
    why: "Nothing would reuse it: each scanner run starts its own."
  - text: "It shuts down, because its lease stream ends."
    correct: true
    why: "The lease is a stream held open by the Java side. When it ends, for whatever reason, the server cancels any analysis in progress and stops."
  - text: "It finishes the analysis and writes the results to a file."
    why: "Results are streamed to the Java side; with no one to receive them, the server stops."
```

```quiz
q: "Five IDE analyses are requested in quick succession while a sixth is running. What does the server do with the fifth pending request?"
options:
  - text: "It runs all of them in parallel in several worker threads."
    why: "There is one worker thread and one active analysis at a time."
  - text: "It refuses it with RESOURCE_EXHAUSTED: four requests are already pending."
    correct: true
    why: "The queue admits at most four pending requests behind the active one. In practice, the IDE cancels outdated requests long before that, so the queue is a guard rather than a bottleneck."
  - text: "It drops the oldest pending request."
    why: "It does not drop admitted requests; it refuses new ones when the queue is full."
```

## What comes next

The next chapter opens the worker thread and looks at one analysis in detail: the stores that hold the files, the decisions about programs, the filters that choose rules, and every transformation an issue goes through before it leaves Node.js.
