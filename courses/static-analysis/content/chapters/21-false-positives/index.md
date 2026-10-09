---
title: False positives and trust
summary: Why a rule that is right most of the time can still fail, how Sonar's products are designed around developers' attention, and how SonarJS's developers find, classify and remove false positives.
number: 21
duration: 45 minutes
prerequisites: [shipping-a-rule]
---

Chapter 1 argued that every rule approximates, and that it must choose which way to be wrong. Twenty chapters later, you have seen the choice made dozens of times: S2589 drops facts at the first write it cannot reason about, S4165 stays silent when a value set is unknown, S2259 ignores variables written in callbacks, S107 forgives AMD callbacks. This last chapter of Track A is about why the choice is so often silence, and about the practice that keeps rules honest.

## Attention is the budget

A rule's issue costs a developer something: reading it, understanding the rule, looking at the code, deciding. When the issue is right, the cost buys a fix. When it is wrong, the cost is wasted, and worse, it teaches the developer that the analyser's issues can be ignored. Engineers who built analysers at Coverity and at Google reached the same conclusion from very different settings: past a fairly low rate of false positives, developers stop reading the issues, and the true positives are ignored with the rest. :cite[bessey2010,sadowski2018] Google's Tricorder platform made this measurable: every analysis result had a *Not useful* button, and analyses whose results were judged not useful too often were fixed or turned off, against a target of an "effective false-positive rate" (as developers perceive it, not as the analysis's authors define it) below 10%. :cite[sadowski2015tricorder]

The consequence for rule design is the asymmetry this course has kept meeting: a missed bug costs nothing visible, a false positive costs trust. Rules on by default must be precise first, and find what they can within that constraint.

## Clean as You Code

Sonar's products add a second constraint through how they present issues. Their methodology, **Clean as You Code**, asks teams to keep *new* code clean rather than fix all the old code first: the quality gate that decides whether a pull request or a release passes looks at the issues on new code, and pull request decoration shows only the issues on changed lines. Old issues remain visible, but they do not block anyone.

This changes where false positives hurt. A false positive on new code blocks a pull request, in front of the developer who wrote it, at the moment they want to merge. It is the most expensive kind. A rule that fires on a common idiom will fire on every new instance of it, in every team that uses the idiom, forever. That is why the exceptions in SonarJS's rules are often about idioms: `x !== x` as a NaN test (S1764), `let count = 0` as a defensive initialisation (S1854), `// falls through` (S128), `const { password, ...safe } = user` (S1481).

## Triage

When an issue is wrong, or right but not worth fixing, the reviewer has two answers in SonarQube:

- **False positive**: the rule is wrong here; the code does not have the problem the rule describes.
- **Accepted**: the rule is right, but the team decides not to fix it now, or ever (a dev-only script, a deliberate trade-off).

Both remove the issue from the quality gate's count, and both are kept with their author and comment, so the decision can be reviewed later; an `eslint-disable` directive with a justification becomes an accepted issue too (chapter 18). For a rule writer, issues marked as false positives in many projects are the most valuable feedback there is.

Try it on six issues. For each, decide what a careful reviewer should do.

:::triage-board{n="21.1"}
```yaml
issues:
  - rule: S1764
    message: Correct one of the identical sub-expressions on both sides of operator "===".
    file: src/editor/range.ts
    code: |
      export function sameRange(start: Pos, end: Pos, other: Range): boolean {
        return start.line === start.line && start.column === other.start.column
          && end.line === other.end.line && end.column === other.end.column;
      }
    line: 2
    verdict: true positive
    why: '`start.line === start.line` is always true: the author meant `start.line === other.start.line`. Identical operands of a comparison are a classic copy-paste slip, and the function returns true for ranges that start on different lines.'
  - rule: S6747
    message: Unknown property 'css' found.
    file: src/components/Card.tsx
    code: |
      /** @jsxImportSource @emotion/react */
      import { css } from '@emotion/react';

      export const Card = ({ title }: { title: string }) => (
        <div css={css`padding: 1rem;`}>{title}</div>
      );
    line: 5
    verdict: false positive
    why: 'The rule wraps eslint-plugin-react''s `no-unknown-property`, whose premise is that `css` is not a DOM attribute. With Emotion''s JSX runtime it is not passed to the DOM at all: Emotion turns it into a class name. The code is correct.'
    fix: 'SonarJS''s S6747 ignores `css` when the project depends on `@emotion/react` or the file imports it at run time. If the issue appears anyway, the detection missed the dependency (a manifest it could not see, an import it does not recognise): exactly the kind of case its research log tracks.'
  - rule: S2245
    message: Make sure that using this pseudorandom number generator is safe here.
    file: src/net/retry.ts
    code: |
      export function backoff(attempt: number): number {
        const base = 100 * 2 ** attempt;
        return base + Math.random() * base;
      }
    line: 3
    verdict: accept
    why: 'Jitter for retry delays needs no unpredictability: an attacker who predicts it gains nothing. The rule is right that `Math.random` is not a secure generator, and the reviewer decides it does not matter here. Accept it, with a comment saying why.'
  - rule: S1854
    message: The value assigned to "label" is never read. Use it or remove this assignment.
    file: src/views/header.ts
    code: |
      export function headerLabel(user: User): string {
        let label = user.name;
        label = user.displayName ?? user.name;
        return label.toUpperCase();
      }
    line: 2
    verdict: true positive
    why: 'The first assignment is overwritten on every path before it is read. It is harmless at run time, but it is dead code that misleads the next reader into thinking `user.name` matters on its own.'
  - rule: S107
    message: Function has too many parameters (9). Maximum allowed is 7.
    file: src/legacy/dashboard.js
    code: |
      sap.ui.define(['./a', './b', './c', './d', './e', './f', './g', './h', './i'],
        function (a, b, c, d, e, f, g, h, i) {
          return { start: () => a.run(b, c) };
        });
    line: 2
    verdict: false positive
    why: 'The callback''s parameters are the modules listed just before it, injected by UI5''s loader. Grouping them into an object, the rule''s advice, is impossible.'
    fix: 'This is the AMD factory class of chapter 10. SonarJS''s S107 exempts such callbacks when it recognises the loader call, including `sap.ui.define`.'
  - rule: S4830
    message: Enable server certificate validation on this SSL/TLS connection.
    file: scripts/dev-proxy.js
    code: |
      // Development proxy for the local HTTPS backend, which uses a self-signed certificate.
      const options = { host: 'localhost', port: 8443, rejectUnauthorized: false };
      https.request(options, forward);
    line: 3
    verdict: accept
    why: 'The finding is correct: the connection does not verify the certificate. In a development script that only talks to localhost, the team can accept it. The better long-term answer is to trust the development certificate instead, so the script cannot be copied into production code with the flag still set.'
```
:::

## Where false positives come from

Classifying false positives by cause tells a rule writer what kind of fix to look for:

- **Approximation in the analysis**: the rule's question is right, but its answer is imprecise. A missing type, a flow-insensitive fact, a call it cannot see into. The fix is more analysis, or more caution where the analysis is weak (S2259's callback check).
- **A premise that does not hold in some context**: the rule's reasoning is sound for most code, and wrong for a framework, a loader, a library (S6747 and CSS-in-JS libraries, S107 and AMD). The fix is an exception class, ideally detected from a narrow, observable signal: a dependency, an import, a call shape.
- **An idiom**: the code says something the rule considers suspicious, deliberately (`x !== x`). The fix is to recognise the idiom.
- **Code nobody maintains by hand**: bundles, minified files, generated sources. The fix is upstream of rules: don't analyse it, or let rules opt out (chapter 18).

The second kind is the hardest, because every exception has a cost: code to maintain, a chance to hide a true positive, and a list that can grow without end. SonarJS's developers keep **research logs** for such decisions. The one for S6747 surveys the React ecosystem for libraries that make otherwise unknown JSX properties valid. It records, for each candidate, what the library does, which properties it makes valid, and how the rule detects it (a dependency in the manifest, a run-time import in the file, or both), with the tests that cover it. It also records the libraries deliberately *not* supported, each with a reason and a condition for revisiting: three.js renderers, because their valid properties are a large, generated, version-dependent list; UI kits whose special properties apply to their own components rather than DOM elements; libraries whose support depends on a Babel configuration the analyser cannot observe. Its rule of thumb: prefer small, explicit exceptions, and treat a candidate that needs a large or open-ended list as a red flag.

::source{path="docs/rule-research/S6747-jsx-property-exception-survey.md" title="S6747's research log" note="A model for deciding exceptions: what each candidate does, how it is detected, how it is tested, and why some were rejected."}

## Reading a ruling diff

The ruling (chapter 4) turns every change into a diff of issues on real projects, and reading one well is a skill. For a change meant to remove false positives, the questions are:

1. Are the **lost** issues all false positives? A lost true positive is a regression: the exception is too broad.
2. Do the lost issues share the shape the change targets, or did something else change (a helper, a parser)?
3. Are there **new** issues, and why? A change in a shared helper can affect other rules.

For a new rule or a change meant to find more, the questions are reversed: sample the new issues, classify each as true or false positive, group the false positives into classes, and decide for each class whether to handle it, with what signal, or to accept the rate. Chapter 16's corpus experiment was a tiny version: two new issues, both true positives, one pattern each.

## What comes next

Track A ends here: you have seen SonarJS from the tree to the issue, and from the rule to its release. Track B leaves SonarJS's code and asks what lies beyond it: analyses that are sound by construction, that follow values across functions and objects, that track tainted data from a request to a query, and that reason about paths with a solver. SonarJS and other analysers remain the examples; the theory is now the subject.
