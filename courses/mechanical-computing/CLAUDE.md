# Project notes for Claude

Interactive course "Mechanical Computing: how machines computed before electronics, and why electronics won". Plan,
decisions and progress: docs/PLAN.md. Read it first. Lives in `courses/mechanical-computing/` of the Interactive
Courses monorepo.

- Reader: a software engineer; explain mechanisms from scratch. Each chapter: problem → algorithm → mechanism, history
  as a core part, an "In your computer" callout (`:::modern`), a "How do we know?" callout (`:::know`) and a limits
  ledger entry (`:::ledger`). The course is self-contained: never refer to other courses in content.
- Single npm package: SvelteKit 2 + Svelte 5 static site. Output in `dist/`. Base path: BASE_PATH, or
  COURSES_BASE_PATH + /mechanical-computing when built from the monorepo root.
- Chapters: `content/chapters/<nn>-<slug>/index.md` + `widgets/*.svelte`. Navigation: `content/outline.ts` (slugs fixed).
  Glossary, timeline and bibliography are YAML in `content/`.
- Markdown compiler: `tools/markdown/compile.ts`. Callouts: `:::note`, `:::key`, `:::question`, `:::modern`, `:::know`,
  `:::ledger`, `:::source`, `:::history`, `:::bio`, `::::hints`. Widgets: `::widget-name{props}` (JSON props in single
  quotes). Fenced blocks: `answer`, `order`, `quiz`, `cards` (an Analytical Engine exercise: `deck` or `deckFrom`,
  `tests`, `solutionDeck`), `deck` (a runnable deck).
- Machines: logical models in `src/lib/mech/` (pure TS, tested); 3D models in `src/lib/models/` (a `ModelDef`: meshes,
  nodes, camera, and a `pose` that writes matrices with no allocation); `MachineView.svelte` renders them. Meshes are
  procedural (`src/lib/gl/mesh.ts`): involute gears, pin wheels, lathes, extrusions, glyph decals.
- Renderer rules: render on demand (call `wake()` after a state change; `animate(dt)` returns true while moving); no
  allocation per frame; at most 4 live WebGL contexts (`src/lib/gl/pool.ts`); every view has a text readout.
- In `$derived`, use `after(tick, value)` (`src/lib/util/after.ts`) to recompute values read from plain machine objects.
- Card language: `src/lib/mech/analytical.ts` and Appendix A. Long decks by name: `src/lib/mech/decks.ts`.
- Feedback says what was established ("Answer checked", "Tests passed", …); content tests check every solution deck.
- Checks before finishing: `npm test`, `npm run check`, `NODE_OPTIONS=--experimental-strip-types npm run build`. Look at
  every changed machine in a screenshot (desktop and phone widths, Brass and Drawing, both themes).
- British English. Design "Cyanotype": tokens in src/app.css. Fonts: Playfair Display (display), Source Serif 4 (prose),
  IBM Plex Sans (UI), IBM Plex Mono (card decks and numbers).
