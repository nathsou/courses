# Project notes for Claude

Interactive course "Term Rewriting Systems: from your first rule to completion, e-graphs and the λ-calculus".
Plan, decisions and progress: docs/PLAN.md. Read it first. Lives in `courses/term-rewriting/` of the Interactive Courses monorepo.

- Reader: a programmer with school algebra; four reading paths (engine builder, theory, applied, semantics).
  Self-contained: background lives in Appendix A; a `:::bridge` may link to other courses.
- Proofs: theorems carry `status=proved|sketched|stated`; long proofs use `::::zoom{levels="Idea, Sketch, Proof"}`.
- Single npm package: SvelteKit 2 + Svelte 5 static site. Output in `dist/`. Base path: BASE_PATH, or
  COURSES_BASE_PATH + /term-rewriting when built from the monorepo root.
- Chapters: `content/chapters/<nn>-<slug>/index.md` (+ optional `widgets/*.svelte`). Navigation: `content/outline.ts` (slugs fixed).
  Glossary/timeline/bibliography/terms are YAML in `content/`.
- Rule files: a ```girafe fence is a runnable Workbench (`tools="run,trace,termination,confluence,completion,strategy,saturate"`,
  `query="…"`, `strategy="outermost|manual|…"`, `title`, `caption`, `readonly`, `order="kbo"`); `static` makes a plain listing.
  Syntax: Girafe (prefix terms, lower-case variables, `_`, `--` comments, `t?`, `@add`, `if`) plus `==` equations,
  `#infixl/#infixr/#infix`, `#priority`, `#ac`, `#precedence`, `#strategy`, `[Label]` rules, `if s ->* t` conditions,
  `? term` queries and `? s == t` goals. Infix operators need spaces around them.
- Exercises are fenced YAML blocks: `code` (id/title/prompt/starter/tests/solution/hints; tests import the reader's module
  from `solution`, the harness from `test`, the reference engine from `trs`, the reader's engine from `engine`).
  A `code` exercise with `provides: [names]` is an engine module and must be listed in `src/lib/code/engine-modules.ts`
  (in course order). Also `numeric`, `quiz`, `parsons`, `blanks`, `bug`, `prove`.
  Quote YAML strings that contain `: ` or start with `$`/`{`; single quotes for LaTeX backslashes.
- Engine: `src/lib/trs` (term, parse, match, unify, rewrite, ars, orders, poly, termination, confluence, completion, ac,
  egraph, strategy, share, indexing, compile, lambda, machines, automata). Pure TypeScript, no DOM. Tests in `src/lib/trs/*.test.ts`.
- Shared widgets: `src/lib/widgets/` (register in `index.ts`). Wrap figures in `$lib/components/ui/Widget.svelte`.
  Colours only through tokens (`--redex`, `--nf`, `--accent`, `--series-*`, …).
- Checks before finishing: `npm test`, `npm run check`, `NODE_OPTIONS=--experimental-strip-types npm run build`.
- British English. Design "Redex": tokens in src/app.css. Fonts: Fraunces (display), IBM Plex Sans (UI),
  Source Serif 4 (prose), JetBrains Mono (terms, code).
- Facts: every date and attribution must be right; cite it in `content/bibliography.yaml`. If unsure, say less.
