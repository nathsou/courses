# Project notes for Claude

Interactive course "The Prime Staircase: from the sieve to the Riemann Hypothesis". Plan, decisions and progress:
docs/PLAN.md. Read it first. Lives in `courses/primes/` of the Interactive Courses monorepo.

- Reader: a software engineer who took complex analysis long ago. Background lives in appendices A–E.
  Self-contained: topics shared with Proofcraft or Euclid's Elements are taught in full here (a `:::bridge` may link out).
- Proofs: sketch first, then the full proof. Theorems carry `status=proved|sketched|stated|open` (conjectures default to open).
- Single npm package: SvelteKit 2 + Svelte 5 static site. Output in `dist/`. Base path: BASE_PATH, or
  COURSES_BASE_PATH + /primes when built from the monorepo root.
- Chapters: `content/chapters/<nn>-<slug>/index.md` + `widgets/*.svelte`. Navigation: `content/outline.ts` (slugs fixed).
  Glossary/timeline/bibliography/terms are YAML in `content/`.
- Markdown compiler: `tools/markdown/compile.ts` (from Proofcraft). Directives: `:::theorem{name who year status}`
  (also lemma/corollary/proposition/conjecture/claim), `:::proof[Title]`, `:::bio{name born died place}`,
  `::::zoom{levels="Idea, Sketch, Proof"}` + `:::level[…]`, `::::hints` + `:::hint[…]`, callouts (`:::key`,
  `:::question`, `:::warning`, `:::definition`, `:::bridge`, `:::algorithm`, `:::note`, `:::challenge`, …),
  `:::history{year title people}`, `::widget-name{props}`. TeX macros: `\Z \N \Q \R \C \F \Re \Im \li \Li \ord \lcm \leg{a}{p}`.
- Exercises are fenced YAML blocks: `code` (id/title/prompt/starter/tests/solution/hints; tests import the reader's
  module from `solution` and the harness from `test`; the course library is importable as `primes`), `numeric`
  (answer, tolerance relative, 0 for exact), `quiz`, `step` (CAS-checked chains), `blanks`, `parsons`, `bug`, `prove`.
  Quote YAML strings that contain `: ` or start with `$`/`{`; single quotes for LaTeX backslashes. Front-matter lists
  must quote items that contain commas.
- Library: `src/lib/primes` (arith, sieve, primality, factor, count, complex, gamma, zeta, dirichlet, gaussian, curves,
  explicit, random, zeros). Pure TypeScript, no DOM. Tests: `src/lib/primes/primes.test.ts`.
  Zeros: `npm run zeros -- 10000` regenerates `static/data/zeros.json` and `src/lib/primes/zeros.ts`.
- Shared widgets: `src/lib/widgets/` (register in `index.ts`). Chapter widgets in the chapter's `widgets/` folder.
  Wrap figures in `$lib/components/ui/Widget.svelte`. Colours only through tokens (`--prime`, `--ruling`, `--series-*`, …).
- Checks before finishing: `npm test`, `npm run check`, `NODE_OPTIONS=--experimental-strip-types npm run build`.
- British English. Design "Ledger": tokens in src/app.css. Fonts: Fraunces (display), IBM Plex Sans (UI),
  Source Serif 4 (prose), JetBrains Mono (numbers, code).
- Facts: every date, record and number must be right; cite it in `content/bibliography.yaml` or compute it in a test.
  If unsure, say less.
