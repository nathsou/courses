# Music Theory: at the piano, from the first note to jazz harmony

An interactive course in music theory for adults learning the piano, from the layout of the keyboard to voice
leading, chromatic harmony, form, jazz voicings and post-tonal music. The reader's MIDI keyboard (or the
on-screen keyboard, or the computer keyboard) is the instrument the course listens to. Plan, decisions and
progress: [docs/PLAN.md](docs/PLAN.md).

## Develop

```sh
npm ci
npm run dev        # http://localhost:5173
npm test           # music library, engraver, MIDI decoding, exercise checkers, content compilation
npm run check      # svelte-check
NODE_OPTIONS=--experimental-strip-types npm run build   # static site in dist/
```

The site is SvelteKit 2 with Svelte 5 and `adapter-static`. The base path comes from `BASE_PATH`, or from
`COURSES_BASE_PATH` + `/music-theory` when the collection builds it.

## What lives where

- `content/chapters/<nn>-<slug>/index.md`: chapters in Markdown with directives (see `tools/markdown/compile.ts`).
  Navigation is `content/outline.ts`.
- `src/lib/music`: the music library (pitch and spelling, note names, intervals, scales and keys, chords and
  Roman numerals, rhythm). Pure TypeScript, no DOM.
- `src/lib/notation`: the course's own engraver: the score text format (`parse.ts`), layout (`layout.ts`) and the
  `Score` component. No third-party notation code.
- `src/lib/midi`, `src/lib/audio`: Web MIDI, computer-keyboard and on-screen input; the sampled piano and the
  scheduler.
- `static/piano/`: the course piano, built by `scripts/piano-samples.sh` from the Salamander Grand Piano V3
  (Alexander Holm, CC BY 3.0). `src/lib/fonts/`: Bravura (Steinberg, SIL OFL 1.1).
