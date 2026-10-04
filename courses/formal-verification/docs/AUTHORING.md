# Authoring guide

How a chapter of *For All Inputs* is written: files, Markdown directives, widgets, exercises, data files, and the
checks a chapter must pass. Read docs/PLAN.md for what the course is; this is how it is put together.

## Files

```
content/
  outline.ts                      navigation: parts, chapters, appendices, reading paths (slugs are fixed)
  chapters/<nn>-<slug>/index.md   a chapter
  chapters/<nn>-<slug>/widgets/   its own widgets (*.svelte) and their logic (*.ts, with *.test.ts)
  parts/<n>-<slug>/index.md       a part's "How we got here" essay
  appendices/<a>-<slug>/index.md  an appendix
  <kind>.yaml + <kind>.d/*.yaml   data: bibliography, glossary, terms, timeline, lineage, museum, bios
```

Front matter: `number`, `title`, `summary` (one paragraph, shown on cards and in search), `duration`.

Chapter shape, by convention: an opening that connects to the previous chapter; sections; exercises and quizzes
where the ideas are; then the closing boxes in this order: `:::history`, `:::hood`, `:::proved`; then *What comes
next* and *Further reading*.

## Markdown

GitHub-flavoured Markdown with `$…$` mathematics, plus directives (`tools/markdown/compile.ts`):

| Directive | Use |
|---|---|
| `:cite[key1,key2]` | citation after the claim it supports, keys from the bibliography |
| `:term[word]{id=…}` | a glossary term |
| `:::history` … `:::` | a dated historical card; every date and attribution cited |
| `:::hood` … `:::` | *Under the hood*: how the course's own engine does it, with file paths |
| `:::proved` … `:::` | *What did we prove?*: the result's scope and assumptions; every chapter has one |
| `:::industry` … `:::` | *In industry*: real use, cited, and how the course's version is simpler |
| `:::programmer` … `:::` | an aside for programmers |
| `:::bridge{course=… chapter=…}` … `:::` | a link to a sibling course; `tools/markdown/bridges.ts` checks the target exists |
| `::timeline{part="IV"}`, `::museum{id=…}`, `::bio-card{…}` | history widgets fed by the data files |
| `::name{props}` | a widget without code: `./widgets/Name.svelte` (kebab-case to PascalCase) or an export of `src/lib/widgets/*.ts` |
| `:::name{props}` + a ```` ```vouch ```` block + `:::` | a code widget: the block becomes its `code` prop (the name must be in `CODE_WIDGETS` in compile.ts) |

Attribute values are strings unless written as JSON (`n=3`, `plane='{"a": 1}'`). In YAML blocks, a value that
contains `: ` must be quoted.

Links inside the course are written from the site root: `/chapters/<slug>/`, `/parts/<slug>/`,
`/appendix/<slug>/`, `/workbench/`. `tools/markdown/links.test.ts` fails on any that does not exist.

## Exercises and questions

Fenced YAML blocks:

- ```` ```quiz ```` and ```` ```predict ````: `q`, `options` (each `text`, `why`, and `correct: true` on the right one).
- ```` ```verify ````: `id`, `title`, `prompt`, `starter`, `locked` (1-based inclusive line ranges the reader cannot
  edit), `solution` (a whole program, or a body starting with `{`), `hints`, `success`, `lines` (editor height).
  The reader's code must verify, keep the locked lines and use no `assume`.
- ```` ```spec ````: the reader writes a contract; `reference` and `adversaries` (wrong implementations that must
  fail against it).
- ```` ```invariant ````, ```` ```model ````, ```` ```ltl ````, ```` ```encode ````, ```` ```rewrite ````, ```` ```bug ````:
  the other Vouch exercise kinds (see `src/lib/components/exercise/vouch/`).

`tools/markdown/exercises.test.ts` runs every exercise as a reader's answer would be run: the starter must not
already pass, and the reference solution must. For `spec` exercises, the solution must let the correct
implementation verify and reject every adversary, and the starter must let at least one adversary through.

## Widgets

- A widget is a Svelte 5 component (runes). Its logic goes in a `.ts` file next to it, with Vitest tests. Tests are
  deterministic: random inputs come from the seeded `rng` in `src/lib/fv/util/random.ts`, never `Math.random`.
- Heavy work runs in a Web Worker started in `onMount` (see `src/lib/components/induction/client.ts` for the
  pattern), or on the main thread in small steps behind `setTimeout`, so the page stays responsive.
- Style with the theme tokens (`--pn`, `--panel`, `--line`, `--ink-blue`, `--seal` for verified, `--pencil` for
  counterexamples, `--maybe` or `--gold` for unknown) so both themes work. Colour is never the only cue: verified
  is ✓, a counterexample ✗, unknown ?.
- Use `minmax(0, 1fr)` for grid columns and collapse to one column below about 860 px; set `code { all: unset }`
  inside a widget that styles its own code; check the widget at 360 px.
- Results shown to the reader come from the engines, with their badges and certificates. A widget never claims
  more than the verdict it shows.

## Data files

Write to your own file in `content/<kind>.d/` (for example `bibliography.d/ch28.yaml`); the compiler merges them.

- **Bibliography**: `key: { authors, year, title, venue }`. Verify every entry against the source (author list,
  year, venue, pages). Never cite from memory.
- **Timeline**: `year`, `lane`, `title`, `people`, `chapter`, `text`, `cite`; `parts: [VII]` places an event in a part
  essay's timeline when its lane does not.
- **Lineage**: tools and ideas as nodes, `descends` or `influenced` edges, each edge cited.
- **Museum**: exhibits with `chapter`, `reenacted`, `summary`, `simplification` and `cite`.

## Facts

Every date, attribution, number and quotation is cited, and checked against the source before it is written.
Quotations are verbatim. A re-enactment of a real bug says what it simplifies. When a fact cannot be confirmed,
leave it out.

## Before committing

```sh
npm run check                                   # svelte-check: 0 errors
npx vitest run tools/markdown <your test paths>  # content, links, exercises, your widgets
NODE_OPTIONS=--experimental-strip-types npm run build
```

Then look at the page in both themes, at full width and at 360 px.
