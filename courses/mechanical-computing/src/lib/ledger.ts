/**
 * The limits ledger: every machine in the course, with orders of magnitude for comparison in chapter 11.
 * Figures are approximate and meant for comparison across many powers of ten; the chapters give the details
 * and their sources. `addsPerSecond` is the rate of whole-number additions (or the nearest equivalent).
 */
export interface LedgerEntry {
  machine: string;
  year: number;
  chapter: string;
  kind: 'digital' | 'analog' | 'electronic';
  /** Precision in decimal digits (analog: equivalent significant figures). */
  digits: number;
  addsPerSecond: number;
  driven: string;
  note: string;
}

export const LEDGER: LedgerEntry[] = [
  { machine: 'Antikythera mechanism', year: -150, chapter: 'antikythera', kind: 'analog', digits: 2.5, addsPerSecond: 0, driven: 'hand', note: 'Positions to a degree or two; one fixed calculation.' },
  { machine: 'Pascaline', year: 1642, chapter: 'pascaline', kind: 'digital', digits: 6, addsPerSecond: 0.2, driven: 'hand (stylus)', note: 'About five seconds to dial in a six-digit number.' },
  { machine: 'Slide rule', year: 1630, chapter: 'antikythera', kind: 'analog', digits: 3, addsPerSecond: 0, driven: 'hand', note: 'Multiplies in a few seconds; three figures.' },
  { machine: 'Stepped reckoner / arithmometer', year: 1851, chapter: 'stepped-drum', kind: 'digital', digits: 12, addsPerSecond: 1, driven: 'hand (crank)', note: 'One addition of the setting per crank turn.' },
  { machine: 'Difference Engine No. 2', year: 1849, chapter: 'difference-engine', kind: 'digital', digits: 31, addsPerSecond: 1.5, driven: 'hand (crank)', note: 'Seven 31-digit additions per cycle, a cycle every few seconds.' },
  { machine: 'Analytical Engine (design)', year: 1837, chapter: 'analytical-engine', kind: 'digital', digits: 50, addsPerSecond: 1, driven: 'steam (planned)', note: 'Babbage’s estimate: about one addition a second, a multiplication a minute.' },
  { machine: 'Tide predictor', year: 1873, chapter: 'integrators', kind: 'analog', digits: 2.5, addsPerSecond: 0, driven: 'hand or motor', note: 'A year of tides in a few hours.' },
  { machine: 'Differential analyser', year: 1931, chapter: 'differential-analyser', kind: 'analog', digits: 3, addsPerSecond: 0, driven: 'electric motors', note: 'One part in a thousand; continuous integration.' },
  { machine: 'Zuse Z1', year: 1938, chapter: 'z1', kind: 'digital', digits: 5, addsPerSecond: 0.3, driven: 'electric motor', note: 'Binary floating point; a few seconds per addition.' },
  { machine: 'Zuse Z3 (relays)', year: 1941, chapter: 'why-electronic', kind: 'digital', digits: 6, addsPerSecond: 1.25, driven: 'electric', note: 'About 0.8 s per addition, 3 s per multiplication.' },
  { machine: 'ENIAC (valves)', year: 1945, chapter: 'why-electronic', kind: 'electronic', digits: 10, addsPerSecond: 5000, driven: 'electric', note: '5 000 ten-digit additions a second.' },
  { machine: 'A processor core today', year: 2025, chapter: 'why-electronic', kind: 'electronic', digits: 19, addsPerSecond: 1e10, driven: 'electric', note: 'Several 64-bit additions per clock cycle, billions of cycles a second.' },
];

/** One switching element in each technology, for the switch race: approximate orders of magnitude. */
export interface SwitchEntry {
  name: string;
  year: number;
  /** Seconds per switching event. */
  time: number;
  /** Joules per switching event. */
  energy: number;
  /** Size in metres. */
  size: number;
  how: string;
}

export const SWITCHES: SwitchEntry[] = [
  { name: 'Pascaline wheel and sautoir', year: 1642, time: 0.1, energy: 4e-3, size: 0.03, how: 'Lifting a weighted lever of about 20 g by 2 cm, then letting it fall.' },
  { name: 'Difference Engine figure wheel', year: 1991, time: 0.5, energy: 1, size: 0.05, how: 'A share of the work of four crank turns, spread over hundreds of wheels.' },
  { name: 'Z1 plate and pin', year: 1938, time: 0.25, energy: 1e-2, size: 0.02, how: 'A steel plate pushed a few millimetres in one clock phase.' },
  { name: 'Telephone relay', year: 1941, time: 1e-2, energy: 1e-2, size: 0.03, how: 'An electromagnet pulls a contact; about a watt for ten milliseconds.' },
  { name: 'Vacuum valve', year: 1945, time: 1e-6, energy: 1e-5, size: 0.05, how: 'Electrons in a vacuum, steered by a grid; the heater burns watts all the time.' },
  { name: 'Discrete transistor', year: 1958, time: 1e-7, energy: 1e-9, size: 5e-3, how: 'A germanium or silicon junction, soldered to a circuit board.' },
  { name: 'Transistor in a chip today', year: 2025, time: 1e-11, energy: 1e-16, size: 5e-8, how: 'A few hundred thousand electrons moved over tens of nanometres.' },
];

/** Landauer's limit at room temperature: the least energy to erase one bit, kT ln 2. */
export const LANDAUER = 1.380649e-23 * 300 * Math.LN2;
