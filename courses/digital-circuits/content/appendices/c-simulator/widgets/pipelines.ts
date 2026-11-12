/**
 * The pipelines of Appendix C as data: what each stage is, and the source file that implements it (every path is
 * checked by a test, so a diagram cannot point at a file that has moved).
 */
export type Kind = 'data' | 'stage' | 'engine';

export interface Step {
  label: string;
  note: string;
  /** Path of the implementing file (or directory), relative to the course package, e.g. `src/lib/sim/netlist/connect.ts`. */
  path?: string;
  kind: Kind;
}

export interface Lane {
  title: string;
  /** A step, or several alternatives that receive the same input (drawn as a column). */
  steps: (Step | Step[])[];
}

export interface Pipeline {
  id: 'simulator' | 'toolchain' | 'plds';
  title: string;
  caption: string;
  lanes: Lane[];
}

const data = (label: string, note: string, path?: string): Step => ({ label, note, path, kind: 'data' });
const stage = (label: string, note: string, path?: string): Step => ({ label, note, path, kind: 'stage' });
const engine = (label: string, note: string, path?: string): Step => ({ label, note, path, kind: 'engine' });

export const PIPELINES: Pipeline[] = [
  {
    id: 'simulator',
    title: 'From a drawing to a waveform',
    caption: 'What the bench does with a circuit. Dashed boxes are data, coloured boxes are code. The three engines share one interface (engine.ts), so the bench, the instruments and every live figure work with whichever one runs.',
    lanes: [
      {
        title: 'The circuit',
        steps: [
          data('Circuit', 'placed parts and wires on a grid, subcircuits and parts; the JSON of every figure', 'src/lib/sim/netlist/types.ts'),
          stage('connect', 'wires and pins to nets: T-junctions, labels, ground, rails', 'src/lib/sim/netlist/connect.ts'),
          stage('flatten', 'subcircuits inlined, ports merged, hierarchical ids', 'src/lib/sim/netlist/flatten.ts'),
          data('FlatNetlist', 'elements with pins on numbered nets', 'src/lib/sim/netlist/types.ts'),
          [
            engine('Digital engine', 'events, 0 1 X Z, delays, setup and hold', 'src/lib/sim/digital/engine.ts'),
            engine('Switch-level engine', 'transistors as switches, strengths, charge', 'src/lib/sim/switch/engine.ts'),
            engine('Analog engine', 'nodal analysis, Newton–Raphson, adaptive steps', 'src/lib/sim/analog/engine.ts'),
          ],
          stage('Engine interface', 'advance, settle, logic, voltage, current, state, setParam, watch', 'src/lib/sim/engine.ts'),
          stage('Bench and figures', 'schematic, instruments, timing diagrams, exercises', 'src/lib/bench/engines.ts'),
        ],
      },
      {
        title: 'The abstraction dial',
        steps: [
          data('Circuit of gates', 'the figure as drawn', 'src/lib/sim/netlist/types.ts'),
          stage('expand', 'each gate becomes its CMOS transistors; at analog level, with capacitances', 'src/lib/sim/expand/expand.ts'),
          data('Circuit of transistors', 'drawn inside dashed outlines where the gates were', 'src/lib/sim/expand/expand.ts'),
          stage('connect, flatten', 'as above', 'src/lib/sim/netlist/flatten.ts'),
          [engine('Switch-level engine', 'one stage per unit delay', 'src/lib/sim/switch/engine.ts'), engine('Analog engine', 'nanosecond steps', 'src/lib/sim/analog/engine.ts')],
        ],
      },
      {
        title: 'Checking a reader’s circuit',
        steps: [
          data('Reader’s circuit', 'ports named as the part’s pins', 'src/lib/partsbin/verify.ts'),
          stage('Bench harness', 'finds toggles and indicators, sets inputs, settles, reads outputs', 'src/lib/sim/check/circuit.ts'),
          [
            stage('Combinational checker', 'every input row, or corners and random rows', 'src/lib/sim/check/combinational.ts'),
            stage('Sequential checker', 'lock-step with a reference, then product-machine search', 'src/lib/sim/check/sequential.ts'),
          ],
          data('Verdict', 'pass, counterexample, gate and transistor cost', 'src/lib/sim/check/cost.ts'),
        ],
      },
    ],
  },
  {
    id: 'toolchain',
    title: 'From Weft to gates and to a chip',
    caption: 'Weft is compiled by synth, the toolchain, built to WebAssembly and run in a worker of the page. One elaboration feeds synth’s simulator (the tests and the playgrounds), the gate view of the course’s digital engine, and the flow to an iCE40.',
    lanes: [
      {
        title: 'In the page',
        steps: [
          data('Source', 'Weft files: a chapter’s designs, or the reader’s', 'src/lib/widgets/weft/designs.ts'),
          stage('Editor', 'CodeMirror, with synth’s diagnostics, hover and formatting', 'src/lib/weft/editor/index.ts'),
          stage('synth, in a worker', 'the WebAssembly build of synth’s playground crate, pinned in synth.json', 'src/lib/synth/worker.ts'),
          data('Requests and answers', 'analyze, format, run, testbench sessions; JSON', 'src/lib/synth/api.ts'),
        ],
      },
      {
        title: 'Inside synth',
        steps: [
          stage('Elaboration', 'Weft to word-level RTL: types, widths, clock domains (synth-weft)'),
          stage('RTL optimisation', 'merging, sharing, memories mapped to block RAM or flip-flops (synth-rtl)'),
          stage('Lowering and logic synthesis', 'an and-inverter graph: hashing, rewriting, SAT sweeping, balancing (synth-logic)'),
          stage('LUT mapping', 'priority cuts, depth first, then area (synth-logic)'),
          data('iCE40 primitives', 'SB_LUT4, SB_DFF…, SB_CARRY, SB_RAM40_4K (arch-ice40)'),
        ],
      },
      {
        title: 'What uses those',
        steps: [
          [
            stage('Testbench', 'the course’s test blocks, run by synth’s simulator', 'src/lib/weft/testbench.ts'),
            engine('Gate view', 'the optimised gates on the course’s digital engine', 'src/lib/weft/gatesim.ts'),
            stage('Flow to the chip', 'pack, place, route, time, bitstream (next figure)', 'src/lib/studio/ice40/run.ts'),
          ],
        ],
      },
    ],
  },
  {
    id: 'plds',
    title: 'Programming the devices',
    caption: 'How a design becomes fuses, configuration bits or a bitstream, and how the configured device is simulated from those bits alone. PROM, PLA, GAL and CPLD take equations or truth tables, and the course’s own fitters program them; the iCE40 takes Weft, through synth.',
    lanes: [
      {
        title: 'PROM, PLA and GAL22V10',
        steps: [
          data('Truth table or equations', 'with # @pragma lines in the Studio', 'src/lib/studio/source.ts'),
          stage('Parse and minimise', 'Quine–McCluskey for few variables, Espresso beyond; both output polarities', 'src/lib/pld/twolevel/minimise.ts'),
          [
            stage('PROM', 'a word per address: blow the fuses of the ones', 'src/lib/pld/devices/prom.ts'),
            stage('PLA', 'multi-output terms shared across outputs', 'src/lib/pld/devices/pla.ts'),
            stage('GAL fitter', 'pins, macrocells, product-term limits, then fuses', 'src/lib/pld/devices/gal22v10-fit.ts'),
          ],
          data('Fuse map', 'JSON for the PROM and PLA; JEDEC file for the GAL', 'src/lib/pld/devices/gal22v10-jedec.ts'),
          engine('Simulation from the fuses', 'the device model reads only the fuses', 'src/lib/pld/devices/gal22v10.ts'),
        ],
      },
      {
        title: 'vCPLD-32',
        steps: [
          data('Equations', 'names are pin levels; feedback allowed', 'src/lib/pld/cpld/fit.ts'),
          stage('Minimise', 'both polarities, and a T flip-flop form for registers', 'src/lib/pld/twolevel/minimise.ts'),
          stage('Partition', 'greedy, then Kernighan–Lin: at most 24 signals a block', 'src/lib/pld/cpld/partition.ts'),
          stage('Allocate terms', 'borrow from neighbours with least total borrowing', 'src/lib/pld/cpld/allocator.ts'),
          data('Configuration bits', '9,024 bits: interconnect, arrays, macrocells', 'src/lib/pld/devices/vcpld32-arch.ts'),
          stage('JTAG programming', 'erase, program 141 rows, verify, restart', 'src/lib/pld/cpld/jtag.ts'),
          engine('Simulation from the bits', 'instant-on, non-volatile', 'src/lib/pld/devices/vcpld32.ts'),
        ],
      },
      {
        title: 'iCE40 (synth)',
        steps: [
          data('Weft design', 'and a board’s pins, or pins the placer chooses', 'src/lib/studio/ice40/boards.ts'),
          stage('Synthesis and mapping', 'previous figure: iCE40 primitives'),
          stage('Packing', 'LUT, flip-flop and carry into logic cells; clocks onto global networks (arch-ice40)'),
          stage('Placement', 'simulated annealing in the manner of VPR, legal for each tile’s shared controls (arch-ice40)'),
          stage('Routing', 'PathFinder with A*: negotiated congestion on the chip’s routing graph (synth-route)'),
          stage('Static timing', 'Project IceStorm’s delay model; critical path and fmax (arch-ice40)'),
          data('Bitstream', 'four banks of configuration memory, block RAM contents, a CRC; as icepack writes it'),
          stage('Decode', 'bits back to logic cells, block RAMs and pads (arch-ice40)'),
          engine('Simulation from the bits', 'synth’s simulator, on the board', 'src/lib/studio/ice40/BoardPane.svelte'),
        ],
      },
    ],
  },
];

/** Every path the diagrams mention. */
export const PATHS: string[] = [...new Set(PIPELINES.flatMap((p) => p.lanes.flatMap((l) => l.steps.flat().flatMap((s) => (s.path ? [s.path] : [])))))];
