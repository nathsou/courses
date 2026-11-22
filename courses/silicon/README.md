# Sand to Silicon

*How a chip is made, from the physics of the transistor to the packaged die.* An interactive course for software
engineers: why silicon, doping, the p–n junction and the MOSFET; CMOS logic, delay, power, scaling and memory; a
small design (one digit of a clock) taken from RTL through verification, synthesis, placement, routing, timing and
sign-off; then the fab: crystal growth, lithography, oxidation, implantation, etching and deposition, the full
process flow of an inverter, yield, test and packaging. Every device, circuit, design tool and process step runs in
the browser from the course's own models.

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

`npm test` runs the libraries' tests (device physics, circuits, the design tools, the process models), the
compiler's tests and the content tests, which compile every chapter and check every exercise (every HDL solution
passes its check and every starting design fails it).

## Layout

| Path | What |
|---|---|
| `content/` | Chapters, appendices, outline, glossary, timeline, bibliography |
| `src/lib/physics/` | Carriers, the junction, the MOS capacitor and transistor, the inverter, delay, memory cells |
| `src/lib/eda/` | The HDL, simulator and model checker, synthesis and technology mapping, placement, routing, timing, faults, layout rules and extraction |
| `src/lib/fab/` | Crystal growth, yield, oxidation, implantation, etching, lithography imaging, the process-flow cross-section |
| `src/lib/widgets/` | Widgets shared by several chapters (bond lattice, MOSFET lab, HDL playground, wafer map, the home page's zoom) |
| `src/lib/components/` | Exercise frames, the HDL editor and waveform viewer, the netlist view, plots, content components |
| `tools/markdown/` | The Markdown-with-directives compiler (maths rendered with KaTeX at build time) |
