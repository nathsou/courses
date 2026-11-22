# Project notes for Claude

Interactive course "Sand to Silicon: how a chip is made, from the physics of the transistor to the packaged die".
Plan, decisions and progress: docs/PLAN.md. Read it first. Lives in `courses/silicon/` of the Interactive Courses
monorepo.

- Reader: a software engineer with school physics and no electronics; explain every device from scratch. Each
  chapter opens on a working simulation, then physics → device → engineering. Recurring callouts: `:::fab` ("In the
  fab": how it is done in production today), `:::know` ("How do we know?": how the quantity is measured),
  `:::scale` ("Sense of scale"), `:::software` ("In software terms"). Self-contained: never refer to other courses.
- Through-lines: the CMOS inverter (ch. 4 → 5 → 12 → 14 → 16) and the decade counter, one digit of a clock
  (ch. 8 → 9 → 10 → 11 → 12 → 17).
- Single npm package: SvelteKit 2 + Svelte 5 static site. Output in `dist/`. Base path: BASE_PATH, or
  COURSES_BASE_PATH + /silicon when built from the monorepo root.
- Chapters: `content/chapters/<nn>-<slug>/index.md` + `widgets/*.svelte`. Navigation: `content/outline.ts` (slugs
  fixed). Glossary, timeline and bibliography are YAML in `content/`.
- Markdown compiler: `tools/markdown/compile.ts`, maths with `$…$`/`$$…$$` (KaTeX at build time; macros in
  `tools/markdown/render.ts`). Callouts as above plus `:::note`, `:::key`, `:::question`, `:::warning`, `:::source`,
  `:::history{year title people}`, `:::bio{name born died}`, `::::hints`. Widgets: `::widget-name{props}` (JSON
  props in single quotes). Fenced blocks: `answer`, `order`, `quiz`, `rtl` (an HDL exercise: `code`, `reference` or
  `tests`, `solution`; checked by simulation) and `hdl` (a design shown with highlighting).
- Libraries (pure TypeScript, tested, no DOM): `src/lib/physics/` (carriers, junction, MOSFET, inverter, delay),
  `src/lib/eda/` (HDL parser and simulator, model checking, synthesis, technology mapping, placement, routing,
  timing, faults, layout and DRC), `src/lib/fab/` (crystal growth, lithography imaging, oxidation, implantation,
  etching, the process-flow cross-section, yield).
- Feedback says what was established ("Answer checked", "Tests passed", "DRC clean", …); content tests compile every
  chapter and check every exercise (every `rtl` solution passes its check and every starting design fails it).
- Facts: every date and number must be right; cite it in `content/bibliography.yaml` or compute it in a test. If
  unsure, say less. Approximate values say so.
- Checks before finishing: `npm test`, `npm run check`, `NODE_OPTIONS=--experimental-strip-types npm run build`.
  Look at every changed widget in a screenshot (390 px and 1440 px, both themes).
- British English. Design "Yellow Room": tokens in src/app.css (carriers `--electron`/`--hole`, materials `--m-*`).
  Fonts: Space Grotesk (display), Source Serif 4 (prose), IBM Plex Sans (UI), IBM Plex Mono (code and numbers).
