# Term Rewriting Systems

*From your first rule to completion, e-graphs and the λ-calculus.* An interactive course in 34 chapters
and four appendices. The reader builds a rewriting engine in TypeScript as they go, and every rule file in the course
(written in [Girafe](https://github.com/nathsou/girafe) syntax) runs in a workbench in the page.

Plan, decisions and status: [docs/PLAN.md](docs/PLAN.md).

## Contents

| Part | Chapters |
|---|---|
| Prologue | 0 Rewriting by hand |
| I Terms and rewriting | 1 Terms · 2 Substitution and matching · 3 Rewriting · 4 Abstract reduction |
| II Programs and strategies | 5 Strategies · 6 Programming with rules |
| III Making it fast | 7 Sharing and memoisation · 8 Term indexing · 9 Compiling rewrite rules |
| IV Termination | 10 Well-founded orders · 11 Polynomial interpretations · 12 Path orders · 13 Why path orders terminate ◇ · 14 Dependency pairs ◇ |
| V Confluence | 15 Unification · 16 Critical pairs · 17 Orthogonality |
| VI Completion | 18 Equational reasoning · 19 Knuth–Bendix completion · 20 Unfailing completion · 21 Completion elsewhere ◇ |
| VII Rewriting modulo | 22 Rewriting modulo AC · 23 E-graphs · 24 Equality saturation |
| VIII Transformation | 25 Strategy combinators · 26 Program transformation |
| IX Semantics | 27 Reduction semantics · 28 λ-calculus and combinators · 29 Higher-order rewriting ◇ · 30 Rewriting logic |
| X Computability | 31 Rewriting computes everything · 32 Decidable islands ◇ |
| Epilogue | 33 Where rewriting lives |

Appendices: A. The mathematics toolbox · B. The rule language · C. The engine · D. Glossary, timeline and bibliography.

## Development

```sh
npm ci
npm run dev        # http://localhost:5173
npm test           # engine, exercise contracts (reference passes, starter fails, carried-forward engine works), content
npm run check      # svelte-check
NODE_OPTIONS=--experimental-strip-types npm run build   # static site in dist/
```

- `src/lib/trs/`: the reference rewriting engine (pure TypeScript) and its tests.
- `src/lib/components/workbench/`: the workbench behind every ```` ```girafe ```` block.
- `src/lib/widgets/`: the shared interactive figures.
- `src/lib/code/`: the exercise runner and the reader's carried-forward engine (`engine-modules.ts` lists the modules).
- `content/`: chapters, appendices, outline, glossary, timeline and bibliography.
