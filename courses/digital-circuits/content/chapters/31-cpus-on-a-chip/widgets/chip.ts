/**
 * The two CPUs on a real iCE40 (an HX8K in its 256-ball package, whose pins the placer chooses): fitting them with
 * synth, putting a new Octet program into the block RAMs of a bitstream without fitting again (synth's `bram_load`,
 * what IceStorm's `icebram` does), and running the chip decoded from its bits on the board.
 */
import type { RunResult, Synth } from '$lib/synth/api';
import { bramLoad, run, tbRun, tbStart, tbStop } from '$lib/synth/api';
import { pinsOf } from '$lib/studio/ice40/board';
import { HX8K_CT256 } from '$lib/studio/ice40/designs';
import type { Rv32Program } from '$lib/sim/cpu/rv32i';
import { OCTET_MEMORY } from '$lib/sim/cpu/octet';
import { octetFiles } from './octet-weft';
import { rv32BoardFiles, rv32Params, type Registers } from './rv32-board';

export const TARGET = HX8K_CT256;

export interface Fit {
  result: RunResult;
  /** The pins the placer chose, as constraints, to name the decoded design's ports. */
  pins: string;
  /** The bitstream (base64): the fit's, or one with a program loaded into it. */
  bin: string;
  ms: number;
}

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

async function fit(synth: Synth, req: Parameters<typeof run>[1]): Promise<Fit> {
  const t0 = now();
  const result = await run(synth, req);
  if (!result.ok || !result.chip || !result.bin) {
    const e = result.diagnostics?.find((d) => d.severity === 'error');
    throw new Error(e?.message ?? result.error ?? 'synth failed');
  }
  return { result, pins: pinsOf(result.chip), bin: result.bin, ms: now() - t0 };
}

/** Octet with a program in its RAM, fitted. */
export function fitOctet(synth: Synth, image: ArrayLike<number>): Promise<Fit> {
  return fit(synth, { files: octetFiles(image), top: 'octet', part: TARGET.part, package: TARGET.package, pins: TARGET.pcf });
}

/** The RV32I core on the board, with a program in its ROM and the register file of `registers`, fitted. */
export function fitRv32(synth: Synth, program: Rv32Program | ArrayLike<number>, registers: Registers): Promise<Fit> {
  return fit(synth, { files: rv32BoardFiles(program), top: 'rv32_board', params: rv32Params(registers), part: TARGET.part, package: TARGET.package, pins: TARGET.pcf });
}

/** The block RAMs that hold Octet's memory: one per read port, each with the whole memory, 512 words of 8 bits. */
export function octetRams(f: Fit): { x: number; y: number }[] {
  return f.result.chip!.cells.filter((c) => c.bel === 'ram' && c.name.startsWith('ram$')).map((c) => ({ x: c.x, y: c.y }));
}

/** Octet's memory as the words of its block RAMs: 240 bytes of RAM, then the 16 device addresses, which read 0. */
export function octetWords(image: ArrayLike<number>): number[] {
  return Array.from({ length: 256 }, (_, i) => (i < OCTET_MEMORY.ramSize ? (image[i] ?? 0) & 0xff : 0));
}

/**
 * A new program in a fitted Octet: the words of its block RAMs are rewritten in the bitstream and nothing else is,
 * so the placement, the routes and the timing stay as they were.
 */
export async function loadOctet(synth: Synth, f: Fit, image: ArrayLike<number>): Promise<{ fit: Fit; changed: number; ms: number }> {
  const t0 = now();
  const words = octetWords(image);
  const r = await bramLoad(synth, f.bin, octetRams(f).map((at) => ({ ...at, width: 8 as const, words })));
  if (!r.ok) throw new Error(r.error);
  return { fit: { ...f, bin: r.bin }, changed: r.changed, ms: now() - t0 };
}

export interface Outputs {
  values: Record<string, number>;
  /** Bytes written to the console during the cycles (Octet). */
  console: number[];
  cycle: number;
}

/** The chip decoded from its bits, on the board: the switches and buttons drive its pins, and the clock is stepped. */
export class Chip {
  private constructor(
    private readonly synth: Synth,
    readonly id: number,
    readonly outputs: string[],
    readonly inputs: string[],
  ) {}

  static async start(synth: Synth, f: Fit): Promise<Chip> {
    const s = await tbStart(synth, { bitstream: f.bin, part: TARGET.part, package: TARGET.package, pins: f.pins });
    if (!s.ok) throw new Error(s.error);
    const names = (dir: string) => [...new Set(s.ports.filter((p) => p.dir === dir && !p.clock).map((p) => p.name.replace(/\[\d+\]$/, '')))];
    return new Chip(synth, s.id, names('out'), names('in'));
  }

  stop(): Promise<void> {
    return tbStop(this.synth, this.id);
  }

  /** Drive the inputs, run `cycles` clock cycles, and read the outputs (with the console's writes on the way). */
  async run(cycles: number, inputs: Record<string, number>, console = false): Promise<Outputs> {
    const set = Object.fromEntries(Object.entries(inputs).filter(([k]) => this.inputs.includes(k)));
    const trace = console && this.outputs.includes('console_write') ? ['console_write', 'console'] : undefined;
    const r = await tbRun(this.synth, this.id, [{ set }, ...(cycles > 0 ? [{ step: cycles, ...(trace ? { trace } : {}) }] : []), { read: this.outputs }]);
    if (!r.ok) throw new Error(r.error ?? 'the chip did not run');
    const last = r.reads.at(-1)!;
    const said = trace ? r.reads.slice(0, -1).filter((x) => Number(x.values!.console_write)).map((x) => Number(x.values!.console)) : [];
    return { values: Object.fromEntries(Object.entries(last.values!).map(([k, v]) => [k, Number(v)])), console: said, cycle: r.cycle };
  }

  /** Back to power-up: every register at its initial value, the RAM at the contents of the bits. */
  async restart(): Promise<void> {
    await tbRun(this.synth, this.id, [{ restart: true }]);
  }
}
