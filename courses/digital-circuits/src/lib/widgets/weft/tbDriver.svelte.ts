/**
 * Drives a Weft design on synth's simulator for a widget: the inputs the reader sets, the outputs and
 * registers after every change, the clock cycle, and a history of what was done, so that the gates of the
 * Circuit tab can replay it. Requests go to synth's `sim` worker lane one after another; the values shown
 * are those of the last answer.
 */
import type { SourceFile, Synth, TbPort } from '$lib/synth/api';
import { tbRun, tbStart, tbStop, toBigInt, type TbOp } from '$lib/synth/api';

export interface PortView {
  name: string;
  width: number;
  clock: boolean;
  signed?: boolean;
}

export type Op = { op: 'set'; name: string; value: bigint } | { op: 'tick' } | { op: 'reset' };

const MAX_HISTORY = 20000;

export class TbDriver {
  inputs: PortView[] = $state.raw([]);
  outputs: PortView[] = $state.raw([]);
  registers: PortView[] = $state.raw([]);
  values: Record<string, bigint> = $state.raw({});
  cycle = $state(0);
  error = $state('');
  ready = $state(false);
  busy = $state(false);
  history: Op[] = [];

  private synth: Synth | undefined;
  private id: number | undefined;
  private files: SourceFile[] = [];
  private top: string | undefined;
  private params: Record<string, string | number> | undefined;
  private wanted: string[] = [];
  private inputValues = new Map<string, bigint>();
  private queue: Promise<void> = Promise.resolve();
  private generation = 0;

  constructor(private readonly getSynth: () => Promise<Synth>) {}

  private enqueue(f: () => Promise<void>): Promise<void> {
    this.queue = this.queue.then(f).catch((e) => {
      this.error = e instanceof Error ? e.message : String(e);
      this.ready = false;
    });
    return this.queue;
  }

  /**
   * (Re)starts the simulator on a design; inputs of the same name and width keep their values.
   * `registers` names the registers to show (from the analysis), when they exist in the simulation.
   */
  load(files: SourceFile[], top: string | undefined, registers: string[] = [], params?: Record<string, string | number>): Promise<void> {
    const gen = ++this.generation;
    this.files = files;
    this.top = top;
    this.params = params;
    this.wanted = registers;
    return this.enqueue(async () => {
      if (gen !== this.generation) return;
      await this.start(true);
    });
  }

  private async start(keepInputs: boolean): Promise<void> {
    this.synth ??= await this.getSynth();
    this.busy = true;
    if (this.id !== undefined) await tbStop(this.synth, this.id).catch(() => {});
    this.id = undefined;
    const s = await tbStart(this.synth, { files: this.files, top: this.top, params: this.params, signals: true });
    this.busy = false;
    if (!s.ok) {
      this.ready = false;
      this.error = s.diagnostics?.find((d) => d.severity === 'error')?.message ?? s.error;
      return;
    }
    this.id = s.id;
    const view = (p: TbPort): PortView => ({ name: p.name, width: p.width, clock: p.clock, signed: p.signed });
    this.inputs = s.ports.filter((p) => p.dir === 'in').map(view);
    this.outputs = s.ports.filter((p) => p.dir === 'out').map(view);
    const sigs = new Map((s.signals ?? []).map((x) => [x.name, x]));
    const portNames = new Set(s.ports.map((p) => p.name));
    this.registers = this.wanted.filter((n) => sigs.has(n) && !portNames.has(n)).map((n) => ({ name: n, width: sigs.get(n)!.width, clock: false, signed: sigs.get(n)!.signed }));
    const old = this.inputValues;
    this.inputValues = new Map();
    const set: Record<string, string> = {};
    this.history = [];
    for (const p of this.inputs) {
      if (p.clock) continue;
      const v = keepInputs ? old.get(p.name) : undefined;
      const keep = v !== undefined && v >= 0n && v < 1n << BigInt(p.width) ? v : 0n;
      this.inputValues.set(p.name, keep);
      if (keep !== 0n) {
        set[p.name] = keep.toString();
        this.history.push({ op: 'set', name: p.name, value: keep });
      }
    }
    this.cycle = 0;
    this.error = '';
    await this.apply(Object.keys(set).length ? [{ set }] : []);
    this.ready = true;
  }

  private names(): string[] {
    return [...this.outputs.map((p) => p.name), ...this.registers.map((r) => r.name)];
  }

  private async apply(ops: TbOp[]): Promise<void> {
    if (!this.synth || this.id === undefined) return;
    const r = await tbRun(this.synth, this.id, [...ops, { read: this.names() }]);
    if (!r.ok) throw new Error(r.error ?? 'the simulation failed');
    const read = r.reads[r.reads.length - 1]?.values ?? {};
    const v: Record<string, bigint> = {};
    for (const p of this.inputs) if (!p.clock) v[p.name] = this.inputValues.get(p.name) ?? 0n;
    for (const p of [...this.outputs, ...this.registers]) {
      const x = read[p.name];
      if (x !== undefined) v[p.name] = toBigInt(x, p.width, false);
    }
    this.values = v;
    this.cycle = r.cycle;
  }

  private push(op: Op): void {
    this.history.push(op);
    if (this.history.length > MAX_HISTORY) this.history.splice(0, this.history.length - MAX_HISTORY / 2);
  }

  set(name: string, value: bigint | number): void {
    const p = this.inputs.find((x) => x.name === name);
    if (!p || p.clock) return;
    const v = BigInt(value) & ((1n << BigInt(p.width)) - 1n);
    this.inputValues.set(name, v);
    this.values = { ...this.values, [name]: v };
    this.push({ op: 'set', name, value: v });
    void this.enqueue(() => this.apply([{ set: { [name]: v.toString() } }]));
  }

  tick(n = 1): void {
    if (!this.ready) return;
    for (let i = 0; i < n; i++) this.push({ op: 'tick' });
    void this.enqueue(() => this.apply([{ step: n }]));
  }

  reset(): void {
    void this.enqueue(() => this.start(true));
  }

  dispose(): void {
    const id = this.id;
    this.id = undefined;
    if (id !== undefined && this.synth) void tbStop(this.synth, id).catch(() => {});
  }
}

/** A value as hexadecimal with the digits its width needs: `0x0f`. */
export function hex(v: bigint, width: number): string {
  return `0x${v.toString(16).padStart(Math.max(1, Math.ceil(width / 4)), '0')}`;
}

export function bin(v: bigint, width: number): string {
  return v.toString(2).padStart(width, '0');
}

/** A signed reading of a value, for ports declared `sint`. */
export function signedOf(v: bigint, width: number): bigint {
  return v >> BigInt(width - 1) & 1n ? v - (1n << BigInt(width)) : v;
}
