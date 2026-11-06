# Mechanical Computing

*How machines computed before electronics, and why electronics won.* An interactive course for software engineers:
the Pascaline, stepped drums from Leibniz to the Curta, Babbage's Difference Engine No. 2 and Analytical Engine,
Lovelace's Note G, the Antikythera mechanism, the slide rule, integrators, tide predictors, the differential
analyser, Zuse's Z1, computers of marbles, water and air, and why computers are electronic. Every machine runs in the
browser, most of them in 3D, on the course's own WebGL2 renderer.

Plan and status: [docs/PLAN.md](docs/PLAN.md).

## Develop

```sh
npm ci
npm run dev
```

## Check

```sh
npm test
npm run check
NODE_OPTIONS=--experimental-strip-types npm run build
```

`npm test` runs the machine libraries' tests, the 3D models' pose tests, the compiler's tests and the content
tests, which compile every chapter and check every exercise (solution decks must pass their tests; starting decks
must not).

## Layout

| Path | What |
|---|---|
| `content/` | Chapters, appendices, outline, glossary, timeline, bibliography |
| `src/lib/mech/` | The machines as logical models (pure TypeScript, tested) |
| `src/lib/models/` | The machines as 3D models (meshes, parts, pose functions) |
| `src/lib/gl/` | The WebGL2 renderer, procedural meshes, picking, context pool, `MachineView` |
| `src/lib/components/` | Exercise frames, the card editor, content components |
| `tools/markdown/` | The Markdown-with-directives compiler |
