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
  /** Year of the chapter's key machine, for the home page's timeline. */
  year?: number;
}

export interface OutlinePart {
  id: string;
  title: string;
  blurb: string;
  chapters: OutlineEntry[];
}

export const COURSE_TITLE = 'Mechanical Computing';
export const COURSE_SUBTITLE = 'How machines computed before electronics, and why electronics won';

export const PARTS: OutlinePart[] = [
  {
    id: 'I',
    title: 'Calculators',
    blurb: 'Wheels that count, a carry that ripples, and a drum that multiplies.',
    chapters: [
      { slug: 'pascaline', number: '1', title: 'Counting and the carry: the Pascaline', summary: 'Counting wheels, a gravity-driven carry, and subtraction by nines’ complement.', milestone: 'M1', year: 1642 },
      { slug: 'stepped-drum', number: '2', title: 'The stepped drum: Leibniz to the Curta', summary: 'A variable gear, shift-and-add multiplication, Leibniz’s unfinished carry and the calculator in a pepper mill.', milestone: 'M2', year: 1694 },
    ],
  },
  {
    id: 'II',
    title: 'Babbage',
    blurb: 'Tables without errors, then a machine that can be told what to compute.',
    chapters: [
      { slug: 'difference-engine', number: '3', title: 'Differences: Difference Engine No. 2', summary: 'Errors in printed tables, Prony’s human computers, finite differences and a pipelined engine of 4,000 parts.', milestone: 'M3', year: 1849 },
      { slug: 'analytical-engine', number: '4', title: 'The Analytical Engine: store, mill and barrels', summary: 'Memory and processor in brass, the anticipating carriage and the studded barrels that were microcode.', milestone: 'M3', year: 1837 },
      { slug: 'note-g', number: '5', title: 'The Analytical Engine: cards and Note G', summary: 'Operation and variable cards, loops and branches, and Lovelace’s program for the Bernoulli numbers.', milestone: 'M3', year: 1843 },
    ],
  },
  {
    id: 'III',
    title: 'Analog',
    blurb: 'Numbers held as angles and lengths: gears that model the sky and wheels that integrate.',
    chapters: [
      { slug: 'antikythera', number: '6', title: 'Numbers as angles: Antikythera and the slide rule', summary: 'Gear ratios as arithmetic, a pin-and-slot that models the Moon, and logarithms as lengths.', milestone: 'M4', year: -150 },
      { slug: 'integrators', number: '7', title: 'Integrating with a wheel', summary: 'The planimeter, the disc integrator, Kelvin’s harmonic analyser and his tide predictor.', milestone: 'M4', year: 1876 },
      { slug: 'differential-analyser', number: '8', title: 'The differential analyser', summary: 'Integrators wired in a loop solve differential equations: Bush’s machine, and Hartree’s built from Meccano.', milestone: 'M4', year: 1931 },
    ],
  },
  {
    id: 'IV',
    title: 'Beyond gears',
    blurb: 'Binary logic in sheet metal, computers made of anything, and why we build them from electrons.',
    chapters: [
      { slug: 'z1', number: '9', title: 'Zuse’s Z1: binary in sheet metal', summary: 'Logic gates made of sliding plates and pins, binary floating point, and a program on punched film.', milestone: 'M5', year: 1938 },
      { slug: 'computing-with-anything', number: '10', title: 'Computing with anything', summary: 'Marbles, water, air and rods: what any material needs in order to compute.', milestone: 'M5', year: 1949 },
      { slug: 'why-electronic', number: '11', title: 'Why computers are electronic', summary: 'Inertia, friction, gain, wiring and manufacture: the limits ledger, settled.', milestone: 'M5', year: 1941 },
    ],
  },
];

export const APPENDICES: OutlineEntry[] = [
  { slug: 'card-reference', number: 'A', title: 'The card language', summary: 'Every card the course’s Analytical Engine reads, with its timing.', milestone: 'M3' },
  { slug: 'simulations', number: 'B', title: 'How the simulations work', summary: 'Kinematics without physics, a small WebGL2 renderer, and the performance budget.', milestone: 'M5' },
  { slug: 'reference', number: 'C', title: 'Glossary, timeline and bibliography', summary: 'Terms, dates and sources.', milestone: 'M5' },
];
