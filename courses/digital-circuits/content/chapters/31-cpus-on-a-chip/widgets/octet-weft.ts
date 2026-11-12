/**
 * Octet written in Weft (`designs/octet.weft`, with Chapter 21's ALU and Chapter 22's control logic in their own
 * files), and what it takes to run it: putting a program into the source, and a harness that runs the design in
 * synth's simulator (a testbench session) and reads its state back in the shape of the reference interpreter's
 * `OctetState`, so that the two can be compared instruction by instruction.
 */
import type { SourceFile, Synth, TbOp, TbRead } from '$lib/synth/api';
import { tbRun, tbStart, tbStop, toNumber } from '$lib/synth/api';
import { OCTET_MEMORY, type OctetProgram, type OctetState } from '$lib/sim/cpu/octet';
import aluSource from '../../21-datapath/designs/octet-alu.weft?raw';
import decodeSource from '../../22-control/designs/octet-decode.weft?raw';
import octetSource from '../designs/octet.weft?raw';

export { octetSource, aluSource, decodeSource };

/** Where the program starts: the doc comment of `program()`, the last item of the file. */
const PROGRAM_AT = /^\/\/\/ The RAM's initial contents/m;

/** `program()`, the RAM's 256 initial bytes as Weft, sixteen to a line (the top 16 are the devices' addresses). */
export function programFunction(image: ArrayLike<number>): string {
  const bytes = Array.from({ length: 256 }, (_, i) => (i < OCTET_MEMORY.ramSize ? (image[i] ?? 0) & 0xff : 0));
  const rows: string[] = [];
  for (let i = 0; i < bytes.length; i += 16) rows.push('        ' + bytes.slice(i, i + 16).map((b) => '0x' + b.toString(16).padStart(2, '0')).join(', ') + ',');
  return `/// The RAM's initial contents: the program, as the assembler made it.\nfn program() -> [uint<8>; 256] {\n    [\n${rows.join('\n')}\n    ]\n}\n`;
}

/** The design's source with a program as the initial contents of its RAM. */
export function withProgram(source: string, program: OctetProgram | ArrayLike<number>): string {
  const image = 'image' in program ? program.image : program;
  const at = source.search(PROGRAM_AT);
  if (at < 0) throw new Error('octet.weft has no `program()` to replace');
  return source.slice(0, at) + programFunction(image);
}

/** The files of the design, in order: the ALU, the control logic, and the machine (with `program`, if given). */
export function octetFiles(program?: OctetProgram | ArrayLike<number>): SourceFile[] {
  return [
    { name: 'octet-alu.weft', text: aluSource },
    { name: 'octet-decode.weft', text: decodeSource },
    { name: 'octet.weft', text: program ? withProgram(octetSource, program) : octetSource },
  ];
}

/** The registers that make up the programmer's model, and the devices'. */
const STATE = ['pc', 'sp', 'r', 'z', 'c', 'n', 'v', 'halted', 'lfsr', 'leds', 'hex', 'stage'] as const;

export interface Run {
  /** The state after each group of cycles. */
  states: Record<(typeof STATE)[number], number>[];
  /** The RAM after each group. */
  rams: number[][];
  /** The bytes written to CONSOLE during each group. */
  console: number[][];
  /** Traced signals during every cycle (before its clock edge), if asked for. */
  during: Record<string, number>[];
}

/** Octet in Weft in synth's simulator, with the board's inputs, run in groups of cycles. */
export class WeftOctet {
  private constructor(
    private readonly synth: Synth,
    readonly id: number,
  ) {}

  static async start(synth: Synth, files: SourceFile[] = octetFiles()): Promise<WeftOctet> {
    const s = await tbStart(synth, { files, top: 'octet' });
    if (!s.ok) throw new Error(s.error);
    return new WeftOctet(synth, s.id);
  }

  stop(): Promise<void> {
    return tbStop(this.synth, this.id);
  }

  /**
   * Back to power-up with a program in RAM and the switches and buttons set, then the cycles of `groups`, reading
   * the state after each group. (The switches reach the machine through two flip-flops, two cycles later than they
   * reach the interpreter; no instruction reads a device in its first two cycles.)
   */
  async run(program: ArrayLike<number>, groups: number[], opts: { switches?: number; buttons?: number; trace?: string[] } = {}): Promise<Run> {
    const words = Array.from({ length: 256 }, (_, i) => (i < OCTET_MEMORY.ramSize ? (program[i] ?? 0) & 0xff : 0));
    const trace = ['console', 'console_write', ...(opts.trace ?? [])];
    const ops: TbOp[] = [{ restart: true }, { load: { mem: 'ram', start: 0, words } }, { set: { sw: opts.switches ?? 0, btn: opts.buttons ?? 0, rst_button: 0 } }];
    ops.push({ read: trace });
    for (const n of groups) ops.push({ step: n, trace }, { read: [...STATE] }, { dump: { mem: 'ram', start: 0, count: OCTET_MEMORY.ramSize } });
    const r = await tbRun(this.synth, this.id, ops);
    if (!r.ok) throw new Error(r.error ?? 'simulation failed');
    return collect(r.reads, groups, trace);
  }
}

function num(v: unknown): number {
  return typeof v === 'number' ? v : toNumber(v as string, 64);
}

function collect(reads: TbRead[], groups: number[], trace: string[]): Run {
  const out: Run = { states: [], rams: [], console: [], during: [] };
  let k = 0;
  const initial = reads[k++]!.values!;
  let before = Object.fromEntries(trace.map((t) => [t, num(initial[t])]));
  for (const n of groups) {
    const said: number[] = [];
    for (let i = 0; i < n; i++) {
      const v = reads[k++]!.values!;
      out.during.push(before);
      before = Object.fromEntries(trace.map((t) => [t, num(v[t])]));
      if (before.console_write) said.push(before.console!);
    }
    out.console.push(said);
    const s = reads[k++]!.values!;
    out.states.push(Object.fromEntries(STATE.map((name) => [name, num(s[name])])) as Run['states'][number]);
    out.rams.push(reads[k++]!.words!.map(num));
  }
  return out;
}

/** The machine's state after a group, as the interpreter reports it. Devices the board lacks are copied from `like`. */
export function snapshot(run: Run, i: number, cycles: number, steps: number, like: OctetState): OctetState {
  const s = run.states[i]!;
  return {
    pc: s.pc,
    sp: s.sp,
    r: [0, 1, 2, 3].map((k) => (s.r >> (8 * k)) & 0xff),
    flags: { z: !!s.z, c: !!s.c, n: !!s.n, v: !!s.v },
    halted: !!s.halted,
    cycles,
    steps,
    ram: run.rams[i]!,
    lfsr: s.lfsr,
    board: { ...like.board, leds: s.leds, hex: s.hex, console: run.console.slice(0, i + 1).flat() },
  };
}
