# Course plan: *Mechanical Computing*

The working plan for the course: decisions, through-lines, curriculum, the simulations, exercises, milestones and
risks. Update it when a decision changes or a chapter lands.

The course explains how mechanical, and more generally non-electronic, computing devices work at the fundamental
level, and why computers became electronic. It is written for software engineers. Every machine is simulated in
the browser from the course's own models, most of them in 3D, and every chapter follows the same order:
**problem → algorithm → mechanism**, with history as a core part rather than decoration, and a mapping from each
mechanism to its counterpart in a modern computer.

## Status (6 November 2026)

**Done: M0–M5.** Eleven chapters in four parts; appendices A–C; home page; collection integration (build script,
index card, README, CI workflow, deploy workflow, navigation check).

- Libraries (`src/lib/mech/`): Pascaline, stepped drum (Leibniz, arithmometer, Curta), method of differences and
  Difference Engine No. 2 (two half-cycles, staggered set-up, spiral carry), carry lookahead and barrels, the
  Analytical Engine emulator and Note G, gear trains and pin-and-slot, integrators, planimeter and tides,
  differential analyser, Z1 logic and floating point. All pure TypeScript and tested (129 tests at the time of
  writing, including machine-checked exercises).
- 3D models (`src/lib/models/`): Pascaline, stepped drum, Difference Engine slice, barrel, Antikythera lunar
  gearing, wheel-and-disc integrator, Z1 switching elements.
- Renderer (`src/lib/gl/`): WebGL2, instanced batches, shadow map with filtered soft shadows, a fading floor,
  brass/steel/wood materials, ink-outline "drawing" look, glyph decals, CPU picking, context pool, render on
  demand, adaptive resolution, stats on `window.__mcStats`.
- Checks run: `npm test`, `npm run check` (0 errors, 0 warnings), `npm run build`; the collection's link audit on a
  prefixed build (no problems in the course's 15 pages); every page at 390, 768 and 1440 px in both themes (no
  horizontal overflow, no console errors); WebGL contexts released off-screen (at most 2 live while scrolling).

**Not yet done:** testing on a real iPhone 17 (the frame-rate target); so far only Chromium with software WebGL
(SwiftShader) and Playwright's iPhone emulation have been used. Measured on that setup: the busiest view (the
accounting Pascaline) issues 45 draw calls per frame including its shadow pass and draws about 47 000 triangles; the
slowest mesh builds in about 8 ms once the code is warm. A page's first builds also pay for JIT warm-up (20–30 ms),
so every view builds its meshes in idle time while it is still 1 500 px off-screen.

Where the course differs from the plan below, the difference is recorded here:

- **Mesh building in a Worker** was planned for meshes slower than 10 ms. After lowering the tooth sampling of very
  large gears no warm build exceeds 10 ms, so meshes are pre-built in idle time instead (`prebuild` in
  `src/lib/gl/cache.ts`) and there is no Worker.
- **Card language:** one chain of cards, not Babbage's separate operation, variable and number chains (Appendix A
  says so).
- **Z1 word format:** the widget follows Rojas's description of the reconstruction (sign, 7-bit exponent, 16-bit
  fraction with a hidden bit); the chapter notes that sources differ.

## 1. Decisions

| Topic | Decision | Status | Notes |
|---|---|---|---|
| Title | **Mechanical Computing** | agreed | Subtitle: *How machines computed before electronics, and why electronics won*. Slug `mechanical-computing`. |
| Reader | **A software engineer** | agreed | Comfortable with code, binary and complexity; no mechanical-engineering background: gears, ratchets, cams are explained from scratch. |
| Scope | Digital calculators, Babbage, analog machines, other substrates; only the most interesting representatives | agreed | Relays and valves appear only as the bridge in chapter 11. |
| Order | Problem → algorithm → mechanism; history core | agreed | Every chapter opens on a working machine before the history (CONTRIBUTING). |
| Activities | Operate machines, "be the machine" exercises, design puzzles | agreed | No free-form mechanism builder. |
| Fidelity | Idealised principle first, then the real machine as faithfully as sources allow | agreed | Simplifications and conjectures are named in "How do we know?" callouts. |
| Modern analogies | A recurring "In your computer" callout | agreed | Ripple carry, complements, Booth, pipelining, carry lookahead, store/mill/bus, microcode, flags and branches, floating point, Fourier, gain. |
| Limits ledger | Every chapter ends with a ledger entry; chapter 11 collects them | agreed | Data in `src/lib/ledger.ts`. |
| Running computations | Euler's x² + x + 41 (digital chapters); the Moon (analog chapters) | agreed | |
| Code exercises | Analytical Engine card programs only, run on the course's emulator | agreed | No general-purpose code runner; no CodeMirror (plain textarea editor). |
| Rendering | WebGL2 only, own renderer, no 3D library | agreed | WebGPU not needed: no compute. |
| Simulation | Kinematic, driven by pure logical models; no physics engine | agreed | |
| Large machines | Hand calculators part for part; for big machines one faithful slice | agreed | DE2: three columns of five wheels; Analytical Engine: one barrel; analyser: one integrator (chapter 7). |
| Performance | 60 fps on an iPhone 17; render on demand; ≤ 4 live contexts; no per-frame allocation; DPR ≤ 2, adaptive; 3D code ≤ 150 kB gzipped | agreed | The engine's shared chunk is about 13 kB gzipped. |
| Self-contained | No content references to other courses | agreed | The collection's "All courses" header link stays (site chrome). |
| Design | **"Cyanotype"** | agreed | Day: Victorian drawing office (cream, blue-black ink, brass). Night: cyanotype (white on Prussian blue). Fonts: Playfair Display, Source Serif 4, IBM Plex Sans, IBM Plex Mono. |
| Language | British English | agreed | |
| Site | SvelteKit 2 + Svelte 5, adapter-static, the Markdown-with-directives compiler from the collection | agreed | |

## 2. Through-lines

1. **The carry.** Pascal's sautoir (ripple, constant effort), Leibniz's unfinished carry, the difference engine's
   spiral, Babbage's anticipating carriage (lookahead), the marble counter, the Z1's binary adder.
2. **x² + x + 41.** Additions of differences on the Pascaline (ch. 1), direct multiplication on a Curta, failing at
   x = 40 (ch. 2), printed by Difference Engine No. 2 (ch. 3), programmed with a loop on the Analytical Engine
   (ch. 5).
3. **The Moon.** The Antikythera mechanism's lunar train and pin-and-slot (ch. 6), the lunar tides (ch. 7), the
   orbit from Binet's equation on the differential analyser (ch. 8).
4. **In your computer.** One callout per mechanism (§1).
5. **The limits ledger.** Precision, speed, size, failure modes; collected in ch. 11.

## 3. Curriculum

### Part I: Calculators
1. **Counting and the carry: the Pascaline** (1642). 3D Pascaline (decimal and accounting), carry race (geared vs
   sautoir), nines' complement subtraction, livres/sols/deniers, a table by differences.
2. **The stepped drum: Leibniz to the Curta.** 3D stepped drum; registers of Leibniz's reckoner (pending carries),
   arithmometer and Curta; multiplication by turns and shifts, 198 = 200 − 2, restoring division.

### Part II: Babbage
3. **Differences: Difference Engine No. 2.** Prony, the method of differences, a misprint hunt, DE1 and Clement,
   the Scheutz engine, DE2's two half-cycles and staggered set-up (pipelining), the spiral carry. 3D slice; the
   eight columns at the level of numbers.
4. **The Analytical Engine: store, mill and barrels.** Store/mill/racks animated on a small deck; the anticipating
   carriage against ripple; a 3D barrel running the addition and multiplication microprograms.
5. **The Analytical Engine: cards and Note G.** The card language; programs (Euler, a table by a loop, Euclid);
   Lovelace and the Notes; Note G run, and its operation-4 slip found and fixed.

### Part III: Analog
6. **Numbers as angles: Antikythera and the slide rule.** 3D lunar gearing with pin-and-slot; gear-train
   design puzzle (235/19); slide rule.
7. **Integrating with a wheel.** 3D wheel-and-disc integrator; polar planimeter; Kelvin's harmonic analyser and
   tide predictor.
8. **The differential analyser.** Integrators in a loop (oscillator, damped spring, the Moon's orbit), slip and
   analog error, the torque amplifier, wiring puzzle, Hartree's Meccano, Shannon's GPAC.

### Part IV: Beyond gears
9. **Zuse's Z1: binary in sheet metal.** 3D plate-and-pin elements (AND, AND NOT), XOR puzzle, binary addition,
   floating point with a hidden bit.
10. **Computing with anything.** Marble counter, the ingredients of computation (state, switching, composition,
    gain, repeatability), water (MONIAC), fluidics, rod logic, billiard balls, dominoes.
11. **Why computers are electronic.** Relays and valves; inertia (t = √(2md/F) ∝ size), friction and Landauer,
    gain, wiring, manufacture by printing; the switch race; the collected ledger; what survived.

### Appendices
A. The card language. B. How the simulations work. C. Glossary, timeline and bibliography.

## 4. Exercises

Feedback says what was established ("Answer checked", "Order checked", "Tests passed", "Registers checked",
"Ratio checked", "Wiring checked", "Truth table checked"), never "correct" for anything not checked.

- `answer` (typed number or word, with tolerance and per-answer feedback), `order` (put steps in order), `quiz`.
- `cards`: a deck run against tests on the emulator; the content tests check that every solution deck passes and
  every starting deck fails.
- Widget exercises: the Reckoner (registers goals), the misprint hunt, the gear-train designer, the wiring puzzle,
  the gate chooser.

## 5. Risks

1. **Historical accuracy.** Mitigation: claims cited; contested points called contested (the Antikythera
   differential, Note G authorship, the Z1's word length); unverified numbers left out (e.g. tooth counts not in
   the sources consulted).
2. **3D performance on phones.** Mitigation: render on demand, context pool, instancing, shadow map of 1536²,
   adaptive resolution. Still to test on a real iPhone 17.
3. **Legibility of the models.** Mitigation: every model reviewed in screenshots at desktop and phone widths, both
   looks, both themes; every view has a text readout.
