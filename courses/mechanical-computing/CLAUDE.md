# Project notes for Claude

Interactive course "Music Theory: at the piano, from the first note to jazz harmony". Plan, decisions and progress:
docs/PLAN.md. Read it first. Lives in `courses/music-theory/` of the Interactive Courses monorepo.

- Reader: an adult learning the piano who can play a little; explain the basics properly. No code exercises.
- Input: Web MIDI first (`src/lib/midi/instrument.svelte.ts`), with the on-screen `Keyboard` widget and the computer
  keyboard as fallbacks; every exercise must work without MIDI (Safari and iOS have none).
- Single npm package: SvelteKit 2 + Svelte 5 static site. Output in `dist/`. Base path: BASE_PATH, or
  COURSES_BASE_PATH + /music-theory when built from the monorepo root.
- Chapters: `content/chapters/<nn>-<slug>/index.md` + `widgets/*.svelte`. Navigation: `content/outline.ts` (slugs fixed).
  Glossary, timeline and bibliography are YAML in `content/`.
- Markdown compiler: `tools/markdown/compile.ts`. Directives: callouts (`:::note`, `:::key`, `:::question`, `:::bridge`,
  `:::listen`, `:::atthekeys`, …), `:::history`, `:::bio`, `::::hints` + `:::hint`, `::widget-name{props}`.
  Text: `:n[C4]` note names, `:c[Am]` chord symbols and `:t[crotchet]{both}` terms all follow the reader's settings;
  write them this way, never as bare text, wherever a note, chord or British/American term appears.
- Scores: fenced ` ```score ` blocks in the format documented in `src/lib/notation/parse.ts` (absolute pitches: `c'` is
  C4; `f'` is F natural whatever the key). Attributes: caption, label, play="false", tempo.
- Scores explain themselves: hovering or tapping a note shows its name, value, interval and harmony (`src/lib/notation/explain.ts`).
  Pass `reveal={false}` to `Score` wherever that would give an exercise's answer away.
- Exercises: ` ```play ` blocks (steps of `chord:` or `notes:`), ` ```perform `, ` ```ear `, ` ```spell `, ` ```read `,
  ` ```analyse `, ` ```realise ` (four-part or two-part writing checked by `src/lib/music/voicelead.ts`; give an
  `example` realisation, which the content tests check for faults), ` ```quiz `. Feedback says what was established:
  "Played and checked", "answer checked"; never "correct" for anything a checker did not check.
- Library: `src/lib/music` (pitch, names, interval, scale, chord, rhythm). Pure TypeScript, no DOM, tested.
- Repertoire: only public-domain music, music written for the course, and chord progressions (PLAN §1 Copyright).
- Checks before finishing: `npm test`, `npm run check`, `NODE_OPTIONS=--experimental-strip-types npm run build`.
- British English. Design "Fallboard": tokens in src/app.css. Fonts: Cormorant Garamond (display), Source Serif 4
  (prose), IBM Plex Sans (UI), Bravura (music).
