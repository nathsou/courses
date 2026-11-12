/**
 * The typed interface to synth (Weft compiler, simulator, iCE40 flow): the requests the course makes and
 * the shapes of their answers, as synth's playground API defines them (synth: crates/synth-playground/src/
 * lib.rs, tb.rs, chip.rs, graph.rs). The same code runs in the pages (`client.ts`, in a worker) and in the
 * tests (`node.ts`).
 */

/** Anything that answers synth requests. */
export interface Synth {
  call(method: string, body: unknown): Promise<unknown>;
}

/** A source file of a design. */
export interface SourceFile {
  name: string;
  text: string;
}

export interface DiagnosticAt {
  file: string;
  /** Byte offsets into the file. */
  start: number;
  end: number;
  /** 1-based line and column of the start and end. */
  line: number;
  col: number;
  eline: number;
  ecol: number;
}

export interface Diagnostic {
  severity: 'error' | 'warning' | 'note' | string;
  message: string;
  at?: DiagnosticAt;
  label?: string;
  notes?: { message: string; at?: DiagnosticAt }[];
  helps?: string[];
  /** The diagnostic as synth prints it, with the source excerpt. */
  rendered: string;
}

/** A name in a source: what it refers to, for hover and go-to-definition. */
export interface SourceRef {
  file: string;
  start: number;
  end: number;
  kind: string;
  hover: string;
  decl?: { file: string; start: number; end: number };
  members?: unknown;
}

export interface Analysis {
  diagnostics: Diagnostic[];
  refs: SourceRef[];
}

/** A graph of a design at one step: nodes with ports, edges between them (synth: graph.rs). */
export interface DesignGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphNode {
  /** Kind: `port`, `cell`, `const`, `inst`, `ff`, `and`, `lut`, … */
  k: string;
  /** Type, such as `Add`, `Dff`, `SB_LUT4`. */
  t: string;
  label: string;
  name: string;
  /** Instance path, `a.b` for `a.b.x`. */
  path: string;
  ins: [string, number][];
  outs: [string, number][];
  info?: [string, string][];
}

export interface GraphEdge {
  s: number;
  sp: number;
  d: number;
  dp: number;
  w: number;
  n?: string;
  inv?: boolean;
}

export interface Stage {
  id: string;
  title: string;
  kind: 'rtl' | 'aig' | 'netlist';
  stats: Record<string, number>;
  graph?: DesignGraph;
  text: string;
}

/** A placed cell on the die (synth: chip.rs). */
export interface ChipCell {
  name: string;
  t: string;
  bel: string;
  x: number;
  y: number;
  z: number;
  info: [string, string][];
  /** `[pin, net index, is output, net name]`. */
  pins: [string, number, boolean, string][];
  pin?: string;
  lut?: number;
  /** An iCE40 logic cell: the tile bit (row × width + column) of each entry of its truth table, entry 0 first. */
  lut_bits?: number[];
  /** The tile bits that enable its carry and its flip-flop. */
  carry_bit?: number;
  dff_bit?: number;
  /** The net on each physical LUT input I0…I3 (null when unconnected: such an input reads 0). */
  lut_inputs?: (string | null)[];
}

export interface ChipNet {
  name: string;
  /** `[from node, to node, x, y]`: the wires (nodes) a route uses and the switches between them. */
  pips: [number, number, number, number][];
  driver: number;
  sinks: number[];
  crit: number;
}

export interface Chip {
  part: string;
  package: string;
  die: string;
  /** Grid width and height in tiles. */
  gw: number;
  gh: number;
  /** Tile kinds, row-major (0 corner, 1 IO, 2 logic, 3 RAM bottom, 4 RAM top). */
  tiles: number[];
  /** `[package pin, x, y, z]`. */
  pins: [string, number, number, number][];
  cells: ChipCell[];
  /** Routing nodes: `[name, type, ...geometry]`. */
  nodes: (string | number)[][];
  nets: ChipNet[];
  usage: { lc: number; lc_total: number; io: number; io_total: number; ram: number; ram_total: number };
}

export interface TimingStep {
  cell: string;
  pin: string;
  /** Arrival time in ns. */
  t: number;
  ci?: number;
  net?: number;
}

export interface ClockTiming {
  clock: string;
  period_ns: number;
  fmax_mhz: number;
  target_mhz: number | null;
  met: boolean;
  path: TimingStep[];
}

export interface BitstreamTile {
  x: number;
  y: number;
  k: number;
  /** Configuration bits per row of the tile. */
  w: number;
  t: string;
  /** Indices of the set bits. */
  set: number[];
  /** Fields: name, kind and the bits they use. */
  f: { n: string; k: string; b: number[] }[];
}

export interface Bitstream {
  tiles: BitstreamTile[];
  bram: unknown;
  set_bits: number;
  tile_bits: number;
  cram: unknown;
  bytes: number;
}

export interface RunResult {
  ok: boolean;
  error?: string;
  diagnostics: Diagnostic[];
  log: string[];
  stages: Stage[];
  /** `[step, milliseconds]`. */
  times: [string, number][];
  top?: string;
  chip?: Chip;
  timing?: { clocks: ClockTiming[]; met: boolean };
  bitstream?: Bitstream;
  /** The bitstream, base64. */
  bin?: string;
  bin_name?: string;
  /** How placement and routing went (with `trace: true`). */
  trace?: FlowTrace;
}

/** A temperature step of the annealer; `xy[k]` is chip cell k's position, in the snapshots that keep it. */
export interface PlaceStep {
  step: number;
  temperature: number;
  cost: number;
  accepted: number;
  range: number;
  xy?: [number, number][];
}

/** An iteration of the router: the nets it routed, and the routing nodes still used by more than one net. */
export interface RouteStep {
  iteration: number;
  nets: number;
  overused: number;
}

export interface FlowTrace {
  place: PlaceStep[];
  route: RouteStep[];
}

export interface RunRequest {
  files: SourceFile[];
  top?: string;
  params?: Record<string, number | string | boolean>;
  /** iCE40 part (`hx1k`, `hx8k`) and package (`vq100`, `cb132`, …). */
  part?: string;
  package?: string;
  /** PCF pin constraints. */
  pins?: string;
  /** Clock target in MHz. */
  freq?: number;
  seed?: number;
  /** Placement effort (1 = normal). */
  effort?: number;
  /** `synth`: stop after synthesis (no place and route). */
  stop?: 'synth';
  clock_hz?: number;
  /** Elaborate the top as a testbench drives it: inputs synchronous to its clock (for drawing a module). */
  testbench?: boolean;
  /** Return the placer's and router's traces (`RunResult.trace`). */
  trace?: boolean;
}

export interface TbPort {
  name: string;
  dir: 'in' | 'out' | 'inout';
  width: number;
  signed: boolean;
  clock: boolean;
  /** A clock the testbench elaboration added (a Weft top without a clock port). */
  added?: boolean;
}

export interface TbStarted {
  ok: true;
  id: number;
  ports: TbPort[];
  clocks: string[];
  memories: { name: string; width: number; depth: number; start: number }[];
  /** Whether the design has registers or memories. */
  state: boolean;
  signals?: { name: string; width: number; signed: boolean }[];
  warnings: string[];
  diagnostics: Diagnostic[];
}

export interface TbFailed {
  ok: false;
  error: string;
  diagnostics?: Diagnostic[];
}

/** A value read from the simulator: a number below 2⁵³, `"0x…"` above. */
export type TbValue = number | string;

export type TbOp =
  | { restart: true }
  | { set: Record<string, TbValue | boolean> }
  | { step: number; clock?: string; trace?: string[] }
  | { read: string[] }
  | { load: { mem: string; start?: number; words: TbValue[] } }
  | { dump: { mem: string; start?: number; count?: number } };

export interface TbRead {
  cycle: number;
  values?: Record<string, TbValue>;
  mem?: string;
  start?: number;
  words?: TbValue[];
}

export interface TbRan {
  ok: boolean;
  error?: string;
  cycle: number;
  reads: TbRead[];
}

export function analyze(s: Synth, files: SourceFile[], opts: { top?: string; testbench?: boolean } = {}): Promise<Analysis> {
  return s.call('analyze', { files, top: opts.top, testbench: opts.testbench ?? true }) as Promise<Analysis>;
}

export async function format(s: Synth, text: string): Promise<string> {
  return ((await s.call('format', { text })) as { text: string }).text;
}

export function run(s: Synth, req: RunRequest): Promise<RunResult> {
  return s.call('run', req) as Promise<RunResult>;
}

export function tbStart(
  s: Synth,
  req: { files: SourceFile[]; top?: string; params?: Record<string, number | string | boolean>; signals?: boolean },
): Promise<TbStarted | TbFailed>;
/** A session on what an iCE40 bitstream implements, decoded back to its cells (with bits flipped first). */
export function tbStart(
  s: Synth,
  req: { bitstream: string; part: string; package: string; pins: string; flips?: [number, number, number][]; signals?: boolean },
): Promise<TbStarted | TbFailed>;
export function tbStart(
  s: Synth,
  req: { files?: SourceFile[]; top?: string; params?: Record<string, number | string | boolean>; signals?: boolean; bitstream?: string },
): Promise<TbStarted | TbFailed> {
  const params = req.params ? Object.fromEntries(Object.entries(req.params).map(([k, v]) => [k, String(v)])) : undefined;
  return s.call('tb_start', { ...req, params }) as Promise<TbStarted | TbFailed>;
}

export function tbRun(s: Synth, id: number, ops: TbOp[]): Promise<TbRan> {
  return s.call('tb_run', { id, ops }) as Promise<TbRan>;
}

export async function tbStop(s: Synth, id: number): Promise<void> {
  await s.call('tb_stop', { id });
}

/** A simulator value as a bigint, read as signed when `signed` (two's complement in `width` bits). */
export function toBigInt(v: TbValue, width: number, signed = false): bigint {
  let n = typeof v === 'number' ? BigInt(v) : BigInt(v);
  if (signed && width > 0 && n >> BigInt(width - 1) & 1n) n -= 1n << BigInt(width);
  return n;
}

/** A simulator value as a number (exact up to 2⁵³). */
export function toNumber(v: TbValue, width: number, signed = false): number {
  return Number(toBigInt(v, width, signed));
}
