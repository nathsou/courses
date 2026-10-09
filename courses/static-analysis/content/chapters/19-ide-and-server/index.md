---
title: The IDE and the server
summary: The same analyser in two settings, a CI pipeline that analyses a project once and an editor that analyses a file every few seconds, and the differences users notice between them.
number: 19
duration: 35 minutes
prerequisites: [inside-one-analysis]
---

SonarJS runs in two very different products. **SonarQube** (Server or Cloud) analyses a whole project, typically in CI, once per commit or pull request, and keeps the results: issues with their history, metrics, quality gates. **SonarQube for IDE** (formerly SonarLint), an extension for VS Code, the JetBrains IDEs, Eclipse and Visual Studio, analyses the files a developer is editing, every time they change, and shows the issues in the editor before the code is even committed. Both load the same plugin and start the same Node.js server. The differences are in what they ask of it.

## Two clients of one server

In the IDE there is no scanner: SonarQube for IDE's core library loads the analyser plugins itself and calls their sensors through the same plugin API. Each analysis is a request for a handful of files, and each new edit can cancel the analysis in progress and post a new one. That is the setting the Node.js server's design is for: a long-lived process, a worker thread so that cancellation is heard, a bounded queue so that a replacement request can wait for the cancelled one to finish unwinding (cancellation is cooperative: the worker notices it at checkpoints, not in the middle of building a TypeScript program).

| | SonarQube (scanner) | SonarQube for IDE |
|---|---|---|
| What triggers an analysis | a CI run, for the whole project | opening, editing or saving a file, for a few files |
| How long the Node.js process lives | one analysis | the IDE session |
| File contents | read from disk by Node.js | sent in the request for unsaved buffers |
| TypeScript programs | one per tsconfig, built once, discarded after the analysis | cached builder programs, updated incrementally, from the closest tsconfig |
| Keeping caches valid | the analysis starts from scratch | the IDE sends file-system events (created, changed, deleted) so stores and programs can invalidate what changed |
| Rules | the project's quality profile, from the server | the default profile, or the bound project's profile in connected mode |
| What a file yields | issues, metrics, highlighting, symbols, duplication tokens, syntax tree | issues with quick fixes, and `NOSONAR` lines |
| Unchanged files | skipped in pull requests when the server allows it, results taken from the cache | not analysed unless open or requested |
| Issue history | the server matches issues across analyses: new, fixed, accepted | the IDE tracks issues locally; in connected mode, it syncs statuses with the server |

::source{path="packages/analysis/src/analyzeWithIncrementalProgram.ts" symbol="export async function analyzeWithIncrementalProgram" title="The IDE's program path"}

**Connected mode** binds an IDE project to a SonarQube project. The IDE then uses the project's quality profile and rule parameters instead of its defaults, hides issues that were marked as accepted or false positive on the server, and can show issues that only a server-side analysis finds, such as those of analyses that need the whole project. Without it, the IDE and the server can legitimately disagree about which rules are active.

## Where they disagree, and why

The questions users ask most often about SonarJS are of the form "the IDE says X and SonarQube says Y". Each scenario below has an explanation in the architecture.

```quiz
q: "A type-dependent rule raises an issue in the IDE but not on SonarQube, on a file that is in no tsconfig of the project. What is the most likely reason?"
options:
  - text: "The IDE uses a newer version of TypeScript."
    why: "Both use the TypeScript bundled with the same plugin version, if they run the same version of SonarJS."
  - text: "The two built different programs: the IDE picked the closest tsconfig for the file, while SonarQube analysed it as an orphan with default, non-strict options."
    correct: true
    why: "For files outside every tsconfig, the program paths differ (chapter 9), and with them the compiler options and the types. A file in no tsconfig is the most common source of such differences; adding it to a tsconfig, or setting `sonar.typescript.tsconfigPaths`, removes it."
  - text: "SonarQube does not run type-dependent rules."
    why: "It does, whenever the file has a program."
```

```quiz
q: "A developer marks an issue as *Accepted* in SonarQube. In connected mode, what does the IDE do with the same issue?"
options:
  - text: "It still shows it: the IDE runs its own analysis."
    why: "The analysis still finds it, but the IDE hides it."
  - text: "It hides it, because connected mode synchronises issue statuses from the server."
    correct: true
    why: "The analysis is local; the decision about the issue is the team's, kept on the server and applied in the IDE."
  - text: "It shows it with a different severity."
    why: "Accepting an issue resolves it; it does not change its severity."
```

```quiz
q: "In a pull request, a developer adds a call to a deprecated API in a new file, and S1874 reports it in the IDE. The pull request's analysis on SonarQube does not show it. The rule is active in the quality profile. Which explanation fits the architecture?"
options:
  - text: "SonarQube skipped the file because it was unchanged."
    why: "It is a new file: its status is ADDED, never skipped."
  - text: "The file is a test file on SonarQube but a main file in the IDE, and the rule targets main files."
    correct: true
    why: "File types come from `sonar.sources` and `sonar.tests` on the server, and from the IDE's own test-file settings (or the bound project's) in the IDE. When they disagree, a rule's file-type filter (chapter 18) can select the rule in one and not the other."
  - text: "Deprecation rules only run in the IDE."
    why: "There is no such restriction; the rule filters are the same in both."
```

## What comes next

The analyser is the same in both places because the rules are the same: one implementation, tested once, shipped in one plugin and one npm package. The next chapter follows a rule from its specification to its release.
