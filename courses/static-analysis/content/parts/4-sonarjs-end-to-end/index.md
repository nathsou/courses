---
number: IV
title: 'How we got here: analysers as products'
summary: Analysis became a product when it moved from the laboratory into teams' daily work. Coverity's lessons, Google's Tricorder, Sonar's platform, and what SonarJS's own repository records about how it has changed.
duration: About 10 minutes
---

Part IV looks at SonarJS as a product: a plugin, a Node.js process, two settings (CI and the editor), and a release process. Static analysis became a product late, and the lessons that shaped products like it were learned the hard way.

## Lessons from the field

In the early 2000s, a group at Stanford led by Dawson Engler built checkers that found thousands of bugs in the Linux kernel and other systems code. They founded Coverity to sell them. In 2010 they described what happened when the checkers met customers: builds that their tool could not reproduce, code that their parser could not read, developers who rejected true positives they did not understand, and a ceiling of false positives above which nobody read the results at all. :cite[bessey2010] The paper's title, *A few billion lines of code later*, became shorthand for the gap between an analysis that works and a product that people use.

Google drew similar conclusions at a larger scale. Its **Tricorder** platform ran analyses on every code review, and kept only those whose results developers found useful: each result had a *Not useful* button, and analyses that drew too many clicks were fixed or removed. :cite[sadowski2015tricorder] A later retrospective summarised the lessons: integrate analysis into the workflow developers already have, report during code review rather than afterwards, and measure false positives as developers perceive them. :cite[sadowski2018] Chapter 21 is built on these.

## Sonar

SonarSource was founded in Geneva in 2008, around an open-source platform for measuring code quality. The platform, renamed **SonarQube** in 2013, collected issues and metrics from analysers for many languages, and put them in front of teams, with history, quality gates and, later, pull-request decoration. **SonarLint**, an IDE extension, brought the same analysers into the editor in 2015, and **SonarCloud** offered the platform as a service. In 2024 the products were renamed SonarQube for IDE, SonarQube Server and SonarQube Cloud. Their methodology, **Clean as You Code**, asks teams to keep new code clean rather than fix old code first (chapter 21).

## What the repository records

The SonarJS repository at the commit this course pins documents some of its own recent history, and only that is told here.

- Its analysis cache, which lets pull-request analyses skip unchanged files, was introduced in September 2022 for the needs of the security plugin, extended to duplication tokens in January 2023 and to syntax trees in May 2025, and relieved of the security plugin's data in November 2025. :cite[sonarjs]
- The communication between the Java plugin and the Node.js process, which chapter 17 follows, moved from HTTP and WebSockets to a typed **gRPC** contract in April 2026, keeping the single-analysis-at-a-time model and cancellation that the editor needs.
- Its documentation maps each version of SonarQube to the version of SonarJS it bundles, and records that SonarQube 25.9 was the first to ship SonarJS 11.

::source{path="docs/grpc-analyze-project-migration.md" title="The move to gRPC" note="Dated 2026-04-20: goals, the clarifications captured, and the final protocol."}

::source{path="docs/sonar-cache.md" symbol="### History" title="The cache's history"}

The repository's design documents are a good place to continue after this part: they record decisions with their reasons, as chapter 21's research log did for one rule.

::timeline{part="IV"}
