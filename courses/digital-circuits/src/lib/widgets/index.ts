// Widgets shared across chapters (chapter-specific ones live in content/chapters/<ch>/widgets/).

/** A live circuit: `::circuit{src="<chapter>/circuits/<name>.json" title="…" mode="logic" speed=1 current=true traces="A,B,Y"}`. */
export { default as Circuit } from '$lib/bench/CircuitWidget.svelte';

/** A Weft design to edit, simulate, test and look inside, on synth: `::weft-playground{src="designs/counter.weft"}`. */
export { default as WeftPlayground } from './weft/WeftPlayground.svelte';

// ── Device Studio (src/lib/studio) ────────────────────────────────────────────────────────────

/** A compact Device Studio: `::device-studio{device="gal22v10" example="traffic-light" views="source,chip,logic"}` (devices: prom, pla, gal22v10, cpld32). */
export { default as DeviceStudio } from '../studio/widgets/DeviceStudio.svelte';
/** Blow the fuses of a small PROM to program a 7-segment decoder: `::prom-fuses{example="seven-segment"}`. */
export { default as PromFuses } from '../studio/widgets/PromFuses.svelte';
/** Program a PLA by hand, crossing by crossing, against a goal truth table: `::pla-planes{example="full-adder"}`. */
export { default as PlaPlanes } from '../studio/widgets/PlaPlanes.svelte';
/** The JTAG TAP controller: drive it by hand, or watch a programming run: `::jtag-tap{}`. */
export { default as JtagTap } from '../studio/widgets/JtagTap.svelte';

// ── The iCE40, through synth (src/lib/studio/ice40) ──────────────────────────────────────────────

/** A design through synth's whole flow to an iCE40: `::fpga-studio{design="counter" views="source,steps,chip,timing,bits,board,place,route"}`. */
export { default as FpgaStudio } from '../studio/ice40/Ice40Studio.svelte';
/** A single LUT4: 16 bits and the multiplexer tree; type a function or click bits: `::lut-explorer{}`. */
export { default as LutExplorer } from './lut/LutExplorer.svelte';
/** The live figure a history card's "Run the original" button opens: `::::run-original{title="<card title>"}` around a `::circuit`. */
export { default as RunOriginal } from './RunOriginal.svelte';
