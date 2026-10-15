---
title: The reactive lab
summary: Every module an exercise can import, with the signatures that matter. The lab is the course’s own code; each chapter builds a small part of it.
number: C
---

The reactive lab (`src/lib/rx/`) is a set of small TypeScript modules, each implementing one strategy from the course on [MiniDom](/appendix/minidom/). In an exercise they are imported by name, and the tests import the reader’s solution as `./solution.ts` and the harness as `@rx/test`.

```ts
import { createDocument } from '@rx/dom';
import { test, expect } from '@rx/test';
import { createEngine } from '@rx/signals';
```

`@rx/test` is a small subset of Vitest (`test`, `describe`, `expect` with `toBe`, `toEqual`, `toMatchObject`, `toBeCloseTo`, comparisons, `toContain`, `toHaveLength`, `toThrow` and `.not`), so that exercise tests run both in the browser sandbox and in the course’s own test suite.

| Module | Chapter | What it provides |
|---|---|---|
| `@rx/dom` | 0, all | `createDocument()`, `MElement`, `MText`, `MComment`, `parseHTML`, `toHTML`, `outline`, `statsOf`, `describeStats`. |
| `@rx/keyed` | 5 | `lis(seq)`, `reconcile(oldKeys, newKeys, 'index' \| 'lastIndex' \| 'lis')`, `planStats`, `applyPlan`. |
| `@rx/vdom` | 4–7, 20 | `h`, `memo`, `createRoot(doc, container, options)`, `Renderer`, `useState`, `useReducer`, `useRef`, `useMemo`, `useCallback`, `useEffect`, `useLayoutEffect`, `HooksOrderError`; `Renderer#hydrate`. |
| `@rx/scheduler` | 8 | `toFibers`, `bigList`, `simulate`, `typingScenario`: the fiber structure and the time-slicing simulation. |
| `@rx/signals` | 9–11 | `createEngine('eager' \| 'topological' \| 'colour')` with `signal`, `computed`, `effect`, `batch`, `untracked`, `createRoot`, `onCleanup`, `trace`, `graph()`; and the default engine’s functions exported directly. |
| `@rx/reactive` | 13 | `new Reactivity()` with `reactive`, `ref`, `computed`, `effect`, `watchEffect`, `flush`, `snapshot`. |
| `@rx/template` | 12 | `compileTemplate(source, { name, scope })`, `createTemplateRuntime(doc, engine)`, `instantiate`, `compileAndLoad`. |
| `@rx/lit` | 16 | `html`, `render`, `repeat`: tagged templates with parts. |
| `@rx/svelte4` | 17 | `createSvelte4(doc)`: the Svelte 3/4 runtime, and two components compiled by hand. |
| `@rx/digest` | 3 | `Scope` with `$watch`, `$digest`, `$apply`, `$evalAsync`. |
| `@rx/cd` | 14 | The change-detection model: `buildViews`, `handle`, `tick`, `markForCheck`, `notifySignal`. |
| `@rx/ssr` | 20 | `renderToString`. |
| `@rx/flight` | 21 | `serialize`, `deserialize`, `clientComponent`: the server-component stream. |
| `@rx/resume` | 22 | `renderResumable`, `resume`, `qrl`, `bind`. |
| `@rx/morph` | 23 | `morph(parent, html)`. |

Two further modules are used by figures but not exported to exercises: `rx/pipeline.ts` (chapter 1’s cost model) and `rx/bench.ts` with `rx/notes.ts` (the benchmark’s seven adapters and the Notes app in six strategies).

## Using a module on its own

Each module is plain TypeScript with no dependency on Svelte or the browser. The tests that ship with them (`src/lib/rx/*.test.ts`) are the most precise documentation of what each one guarantees. For example, the three signal engines are all tested against the same cases, and the cases they fail (the eager engine on a diamond, in `signals.test.ts`) are tests that state the failure.
