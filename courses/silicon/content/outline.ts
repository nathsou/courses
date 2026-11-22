/**
 * The course outline: single source of truth for navigation (docs/PLAN.md §3). A chapter becomes readable
 * when a matching `chapters/<nn>-<slug>/index.md` exists; until then it is listed as planned. Slugs are fixed.
 */

export interface OutlineEntry {
  slug: string;
  number: string;
  title: string;
  summary: string;
  milestone: string;
}

export interface OutlinePart {
  id: string;
  title: string;
  blurb: string;
  chapters: OutlineEntry[];
}

export const COURSE_TITLE = 'Sand to Silicon';
export const COURSE_SUBTITLE = 'How a chip is made, from the physics of the transistor to the packaged die';

export const PARTS: OutlinePart[] = [
  {
    id: 'I',
    title: 'The physics of a switch',
    blurb: 'Why silicon, how a few impurity atoms make it useful, and how a field turns a current on and off.',
    chapters: [
      { slug: 'bands', number: '1', title: 'Why silicon: atoms, bonds and bands', summary: 'A crystal held together by shared electrons, the band gap, and why a semiconductor conducts a little, and more when warm.', milestone: 'M1' },
      { slug: 'doping', number: '2', title: 'Doping: electrons and holes to order', summary: 'One impurity atom in a million changes everything: donors, acceptors, the mass-action law, drift and diffusion.', milestone: 'M1' },
      { slug: 'junction', number: '3', title: 'The p–n junction', summary: 'Where p-type meets n-type: a depletion region, a built-in field, and the diode’s exponential current.', milestone: 'M1' },
      { slug: 'mosfet', number: '4', title: 'The MOSFET: a switch made of a field', summary: 'A gate over a thin oxide draws a channel of electrons out of p-type silicon: threshold, square law and subthreshold slope.', milestone: 'M1' },
    ],
  },
  {
    id: 'II',
    title: 'From switches to logic',
    blurb: 'Pairs of transistors become gates, gates become memory, and every one of them charges a capacitor.',
    chapters: [
      { slug: 'cmos', number: '5', title: 'CMOS logic: the inverter and its family', summary: 'Complementary pairs, the voltage transfer curve, noise margins, and gates built from switches in series and parallel.', milestone: 'M2' },
      { slug: 'speed-power', number: '6', title: 'Delay, power and scaling', summary: 'RC delay, sizing a chain of gates, dynamic and leakage power, and the end of Dennard scaling.', milestone: 'M2' },
      { slug: 'memory', number: '7', title: 'Memory: latches, flip-flops and SRAM', summary: 'Two inverters in a loop hold a bit; a clock keeps state orderly; six transistors make a cache cell, and one makes DRAM.', milestone: 'M2' },
    ],
  },
  {
    id: 'III',
    title: 'Designing a chip',
    blurb: 'One small design, a digit of a clock, followed from its description through verification, gates and layout.',
    chapters: [
      { slug: 'rtl', number: '8', title: 'From a specification to RTL', summary: 'Hardware described as registers and the logic between them, simulated cycle by cycle.', milestone: 'M3' },
      { slug: 'verification', number: '9', title: 'Verification: finding the bugs before silicon does', summary: 'Tests, random stimulus, coverage, assertions and exhaustive proof, and why a respin costs millions.', milestone: 'M3' },
      { slug: 'synthesis', number: '10', title: 'Synthesis: from RTL to gates', summary: 'Bit-blasting, Boolean minimisation and technology mapping onto a library of standard cells.', milestone: 'M3' },
      { slug: 'physical-design', number: '11', title: 'Place and route', summary: 'Rows of cells, wirelength, simulated annealing, and maze routing on layers of metal.', milestone: 'M3' },
      { slug: 'signoff', number: '12', title: 'Timing and sign-off', summary: 'Static timing analysis, setup and hold, and checking the layout against the design rules and the netlist before tape-out.', milestone: 'M3' },
    ],
  },
  {
    id: 'IV',
    title: 'Making a chip',
    blurb: 'From quartz to a packaged die: purifying, printing, etching, implanting, testing and sealing.',
    chapters: [
      { slug: 'wafer', number: '13', title: 'From sand to wafer', summary: 'Reducing quartz, purifying silicon to eleven nines, growing a single crystal and slicing it into wafers.', milestone: 'M4' },
      { slug: 'lithography', number: '14', title: 'Lithography: printing with light', summary: 'Masks, photoresist and projection optics; diffraction, the Rayleigh limit, optical proximity correction and extreme ultraviolet.', milestone: 'M4' },
      { slug: 'etch-deposit-dope', number: '15', title: 'Adding and removing: deposition, etching and doping', summary: 'Oxidation, CVD and ALD, wet and plasma etching, ion implantation and annealing, and polishing flat.', milestone: 'M4' },
      { slug: 'process-flow', number: '16', title: 'Building the inverter, step by step', summary: 'From bare wafer to first metal in cross-section: isolation, wells, gates, sources and drains, contacts and copper.', milestone: 'M4' },
      { slug: 'yield-test-package', number: '17', title: 'Yield, test and packaging', summary: 'Defects and yield, the cost of a good die, scan test for stuck-at faults, and the package that connects a die to the world.', milestone: 'M4' },
    ],
  },
];

export const APPENDICES: OutlineEntry[] = [
  { slug: 'hdl-reference', number: 'A', title: 'The course’s hardware description language', summary: 'Every construct of the small HDL used in Part III, and how it maps to hardware.', milestone: 'M3' },
  { slug: 'models', number: 'B', title: 'Models, constants and simplifications', summary: 'The physical constants, the equations behind every simulation, and where each one is simplified.', milestone: 'M5' },
  { slug: 'reference', number: 'C', title: 'Glossary, timeline and bibliography', summary: 'Terms, dates and sources.', milestone: 'M5' },
];
