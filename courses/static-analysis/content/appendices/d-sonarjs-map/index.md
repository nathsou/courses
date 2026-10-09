---
number: D
title: A map of SonarJS
summary: The SonarJS repository at the commit the course pins, component by component, with the files each chapter cites.
---

Every reference to SonarJS in the course points to one commit, `da2c402`, and every path below exists there (the course's build checks them). The repository has two halves, a Java plugin and a Node.js analyser, plus the tools and tests that hold them together.

## The Java side: `sonar-plugin/`

| Directory | What it holds | Chapters |
|---|---|---|
| `sonar-javascript-plugin` | the plugin SonarQube loads: sensors, profiles, the analysis cache, settings | 17, 18, 20, 28 |
| `bridge` | starting and talking to the Node.js process | 17 |
| `api` | the extension points other plugins use: `EslintHook`, `CustomRuleRepository`, `RulesBundle`, `JsAnalysisConsumer`, `JsFile` | 17, 20 |
| `javascript-checks` | the rules' metadata, generated from RSPEC, and the Java classes that declare them | 1, 20 |
| `css`, `standalone` | CSS analysis, and a way to run the analyser outside a scanner | 18 |

::source{path="sonar-plugin/sonar-javascript-plugin/src/main/java/org/sonar/plugins/javascript/analysis/WebSensor.java" title="The sensor" note="Where a SonarQube analysis enters the plugin (chapter 17)."}

::source{path="sonar-plugin/bridge/src/main/java/org/sonar/plugins/javascript/nodejs/NodeCommandBuilderImpl.java" title="Finding Node.js" note="The setting, the embedded runtime, the host's node (chapter 17)."}

::source{path="sonar-plugin/sonar-javascript-plugin/src/main/java/org/sonar/plugins/javascript/JavaScriptProfilesDefinition.java" title="Quality profiles" note="Built-in profiles from the rules' metadata, and security rules from another plugin (chapters 20, 28, 33)."}

::source{path="sonar-plugin/sonar-javascript-plugin/src/main/java/org/sonar/plugins/javascript/analysis/cache/CacheStrategies.java" title="The analysis cache" note="When an unchanged file can be skipped (chapter 18)."}

::source{path="sonar-plugin/api/src/main/java/org/sonar/plugins/javascript/api/EslintHook.java" title="EslintHook" note="How other plugins run their own ESLint-based rules (chapter 20)."}

## The Node.js side: `packages/`

| Directory | What it holds | Chapters |
|---|---|---|
| `grpc` | the gRPC server the Java side talks to, and its queue | 17 |
| `analysis/src` | project and file analysis: file stores, program selection, filters, `analyzeFile` | 9, 18, 19 |
| `analysis/src/jsts/parsers` | the parser router and ESTree serialisation | 2, 17 |
| `analysis/src/jsts/program` | building TypeScript programs from tsconfigs | 9 |
| `analysis/src/jsts/linter` | configuring ESLint per file: rule filters, options, pragmas, issue and quick-fix transformation | 5, 10, 18 |
| `analysis/src/jsts/analysis` | running the linter and collecting a file's artifacts (metrics, highlighting, CPD tokens) | 6, 18 |
| `analysis/src/jsts/embedded` | JavaScript in HTML and YAML | 18 |
| `analysis/src/jsts/rules` | one folder per rule (`S1764/` with `rule.ts`, `meta.ts`, tests and fixtures), `helpers/`, and the ESLint plugin | throughout |
| `ruling` | the ruling tests: real projects and expected issues | 4, 16, 21 |
| `shared` | code shared by the packages | |

::source{path="packages/grpc/src/proto/analyze-project.proto" title="The gRPC contract" note="AnalyzeProject, CancelAnalysis, Lease (chapter 17)."}

::source{path="packages/analysis/src/analyzeWithProgram.ts" title="Programs from tsconfigs" note="Chapter 9."}

::source{path="packages/analysis/src/common/filter/filter.ts" symbol="export function accept" title="Which files are analysed" note="Bundles, minified and large files (chapter 18)."}

::source{path="packages/analysis/src/jsts/linter/filters/index.ts" title="Which rules run" note="The rule filters, cheapest first (chapter 18)."}

::source{path="packages/analysis/src/jsts/analysis/file-artifacts.ts" title="Everything else a file yields" note="Metrics, highlighting, symbols, CPD tokens (chapter 18)."}

::source{path="packages/analysis/src/jsts/rules/plugin.ts" title="The ESLint plugin" note="Every rule, by its ESLint name (chapters 3, 20)."}

::source{path="packages/analysis/src/jsts/rules/S1764/rule.ts" title="A rule folder" note="S1764, the course's first rule (chapters 0, 3)."}

## Tools, tests and documentation

| Directory | What it holds | Chapters |
|---|---|---|
| `tools` | metadata generation from RSPEC, rule boilerplate, Java rule classes | 20 |
| `its` | integration tests: the plugin in SonarQube and SonarQube for IDE, and the ruling | 4, 20 |
| `docs` | design documents: caches, file stores, program creation, the gRPC migration, rule research logs, custom rules | 17–21, 29, Part IV |

::source{path="tools/generate-eslint-meta.ts" title="Generated metadata" note="From RSPEC to each rule's generated meta (chapter 20)."}

::source{path="docs/rule-research/S6747-jsx-property-exception-survey.md" title="A rule research log" note="How exceptions are decided (chapter 21)."}

::source{path="docs/sonar-cache.md" title="The analysis cache, documented" note="Including its history (Part IV, chapter 29)."}
