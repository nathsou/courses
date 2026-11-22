# Course plan: *Sand to Silicon*

The working plan for the course: decisions, through-lines, curriculum, the simulations, exercises and risks. Update
it when a decision changes or a chapter lands.

The course explains how a chip is made, from first principles: the physics that makes silicon a switch, the
circuits that make switches logic, the flow that turns a description of a design into a layout, and the process
steps that turn a layout into working dies. It is written for software engineers with school physics and no
electronics. Every device, circuit, design tool and process step is simulated in the browser from the course's own
models, and every chapter opens on a working simulation before the explanation.

## Status (22 November 2026)

**Done.** Seventeen chapters in four parts; appendices A–C; home page (with a zoom from the wafer to the atoms);
collection integration (build script, index card, README, CI workflow, deploy workflow, navigation check).

- Libraries, all pure TypeScript and tested: `src/lib/physics/` (band gaps, carriers, mobility, the junction, the
  exact MOS charge, an EKV-style MOSFET, the inverter's transfer curve, switching transients, logical effort,
  SRAM, latches), `src/lib/eda/` (the HDL, cycle simulation, explicit-state model checking and sequential
  equivalence, bit-blasting, technology mapping, Karnaugh maps, placement by annealing, maze routing, static timing,
  stuck-at faults and ATPG, layout rules, DRC and LVS), `src/lib/fab/` (Scheil segregation, dies per wafer and
  yield, Deal–Grove, implant profiles, etch fronts, one- and two-dimensional imaging, the process-flow
  cross-section).
- Checks run: `npm test`, `npm run check` (0 errors, 0 warnings), `npm run build`; every page at 390 and 1440 px in
  both themes (no horizontal overflow, no console errors).

## 1. Decisions

| Topic | Decision | Notes |
|---|---|---|
| Title | **Sand to Silicon** | Subtitle: *How a chip is made, from the physics of the transistor to the packaged die*. Slug `silicon`. |
| Reader | **A software engineer** | Comfortable with code and binary; school physics; no electronics. Every device is explained from scratch. |
| Scope | Physics → devices → circuits → design flow → fab → test and packaging | Only what is needed to follow one inverter and one small design all the way through. |
| Order | Simulation first, then physics → device → engineering | CONTRIBUTING: each chapter opens on a working model. |
| Callouts | `:::fab` (In the fab), `:::know` (How do we know?), `:::scale` (Sense of scale), `:::software` (In software terms) | Plus the collection's `:::history`, `:::key`, `:::note`, `:::check`. |
| Maths | KaTeX at build time | Equations are shown when they carry the idea (Boltzmann factor, square law, Deal–Grove, Poisson yield); every one is also simulated. |
| HDL | A small Verilog-like language of the course's own | Registers, wires, outputs, `assert` and `assume`; widths up to 32 bits; one clock. Appendix A. No CodeMirror: a textarea over a highlighted copy. |
| Verification | Exhaustive model checking of small designs | Explicit-state search with shortest counterexamples; equivalence against a reference by product machine. |
| Cell library | Illustrative, round numbers | Transistor counts real; delays in the right proportions, not any foundry's. |
| Fab models | First-order, named simplifications | Appendix B lists every model and what it leaves out. |
| Self-contained | No content references to other courses | The collection's "All courses" header link stays (site chrome). |
| Design | **"Yellow Room"** | The lithography bay's yellow light by day; a dark clean room by night. Material tokens `--m-*` shared by every cross-section and layout; carriers `--electron`/`--hole`. Fonts: Space Grotesk, Source Serif 4, IBM Plex Sans, IBM Plex Mono. |
| Language | British English | |
| Site | SvelteKit 2 + Svelte 5, adapter-static, the Markdown-with-directives compiler from the collection | |

## 2. Through-lines

1. **The inverter.** Two transistors (ch. 4) become a gate with a transfer curve (ch. 5) and a delay (ch. 6); its
   layout is checked against the design rules and extracted (ch. 12); its gate is printed (ch. 14); its whole
   process flow runs in cross-section (ch. 16). The home page zooms into the same cell.
2. **One digit of a clock.** A decade counter written in RTL (ch. 8), verified by tests and by proof (ch. 9),
   synthesised to 25 cells and 4 flip-flops (ch. 10), placed and routed (ch. 11), timed (ch. 12) and tested for
   manufacturing faults with scan (ch. 17).
3. **How small?** `:::scale` callouts: wavelengths against line widths, atoms per channel, impurities per million.
4. **In software terms.** Synthesis as compilation, verification as testing with a proof attached, DRC as a linter
   that can stop a release, fault coverage as mutation testing.

## 3. Curriculum

### Part I: The physics of a switch
1. **Why silicon: atoms, bonds and bands.** Bond lattice with thermal carriers; levels to bands; band gaps of Ge,
   Si, GaAs and SiO₂ against temperature.
2. **Doping: electrons and holes to order.** Bond lattice with donors and acceptors; the doping lab (mass action,
   Fermi level, mobility, resistivity); drift and diffusion.
3. **The p–n junction.** Junction lab (depletion, built-in field, bands, bias); the diode's exponential curve.
4. **The MOSFET: a switch made of a field.** MOS capacitor from accumulation to inversion (exact charge); the
   MOSFET lab (output and transfer curves, subthreshold slope; planar and FinFET-like).

### Part II: From switches to logic
5. **CMOS logic: the inverter and its family.** Inverter lab (transfer curve, noise margins); gate builder (series
   and parallel networks, duals, truth tables).
6. **Delay, power and scaling.** Switching transient; sizing a chain (logical effort); Dennard scaling and its end.
7. **Memory: latches, flip-flops and SRAM.** Latch loop and metastability; flip-flop setup and hold; the 6T SRAM
   cell (read, write, read upset with mismatch); DRAM charge sharing.

### Part III: Designing a chip
8. **From a specification to RTL.** RTL blocks; the HDL playground; exercises (the tens of seconds, seconds from
   00 to 59, seeing a button go down).
9. **Verification.** Bug hunt (tests and random stimulus against a buggy counter); state space and proof;
   exercises (an assertion that catches the bug; fix the counter).
10. **Synthesis.** Karnaugh maps with don't-cares; synthesis lab (bit-blasting, mapping for area or delay).
11. **Place and route.** Annealing placer; clock distribution (least wire, spine, H-tree; skew by Elmore delay);
    maze router (order matters on one layer; two layers and vias).
12. **Timing and sign-off.** Static timing (critical path, clock period, skew, hold, upsizing); layout editor
    (DRC, LVS) on the inverter.

### Part IV: Making a chip
13. **From sand to wafer.** Reduction and purification; Czochralski pull and segregation (ingot lab); wafer map
    (dies per wafer).
14. **Lithography.** Aerial image of a grating (wavelength, NA, illumination, focus); OPC lab (2D imaging,
    proximity correction); EUV multilayer mirrors (transfer-matrix reflectivity, light left after a dozen mirrors).
15. **Adding and removing.** Oxidation (Deal–Grove), deposition (sputter, CVD, ALD conformality), etching
    (isotropic and anisotropic), implantation and annealing, polishing flat (pattern density, dummy fill, depth of
    focus).
16. **Building the inverter, step by step.** 28-step process flow in cross-section through both transistors;
    self-alignment (aluminium gate placed after the source and drain against a self-aligned silicon gate).
17. **Yield, test and packaging.** Yield models and the cost of a good die; scan test and ATPG; packaging and
    connection density.

### Appendices
A. The HDL reference (with a playground). B. Models, constants and simplifications. C. Glossary, timeline and
bibliography.

## 4. Exercises

Feedback says what was established ("Answer checked", "Order checked", "Checked" for a design proved or shown
equivalent, "DRC clean", "Coverage checked"), never "correct" for anything not checked.

- `answer` (typed number or word, with tolerance), `order` (put steps in order), `quiz`.
- `rtl`: an HDL design checked by simulation and exhaustive proof against a reference, tests or its own
  assertions; the content tests check that every solution passes and every starting design fails.
- Widget goals, recorded in progress: the gate builder (NAND2 to AOI22), minimal covers on the Karnaugh map, placing
  by hand, the router's ordering puzzle, timing closure, fixing the layout's design-rule errors, proximity
  correction, polishing within the depth of focus, the process-flow walk-through, full fault coverage by hand.

## 5. Risks

1. **Numerical accuracy.** Mitigation: models tested against textbook values; illustrative parameters say so;
   Appendix B lists every simplification.
2. **Depth for the reader.** The course spans a whole industry. Mitigation: one inverter and one small design
   carried all the way through; every chapter states what it leaves out.
3. **Performance on phones.** Mitigation: models run on demand, when a slider or button changes; the slowest
   (proximity correction, annealing) run one step per frame rather than blocking the page.
