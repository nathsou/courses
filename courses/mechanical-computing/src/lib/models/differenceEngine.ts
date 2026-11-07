/**
 * A slice of Difference Engine No. 2: three columns of five figure wheels (the engine has eight columns of
 * thirty-one). Column 0 holds the tabular value, column 1 the first difference, column 2 the constant second
 * difference. Each cycle has two halves; in each half, a giving column's digits are added into the wheels of
 * the column on its left all at once, and every wheel that passes 9 → 0 raises its red warning. Then a shaft
 * beside the receiving column turns once: its arms, set in a spiral, pass the wheels from the bottom up and
 * make the warned carries in order, so a carry into a 9 is caught by the next arm up.
 */
import { box, Builder, cylinderY, disc, merge, rimDigits } from '$lib/gl/mesh';
import { TAU } from '$lib/gl/math';
import { nodeIndex, part, type ModelDef, type NodeDef } from '$lib/gl/model';
import { addColumns, fromDigits, toDigits } from '$lib/mech/difference';
import { fixed, onAxis, Z_TO_Y } from './util';

export const COLS = 3;
export const DIGITS = 5;
const DX = 3.4;
const DY = 0.85;
const colX = (c: number) => (c - 1) * DX;
const SHAFT_DX = 1.45;
const SHAFT_DZ = -0.55;
/** Direction from a carry shaft to its column's wheels, as an angle about y (x towards −z). */
const PHI_W = Math.atan2(SHAFT_DZ, -SHAFT_DX);

type Phase = { kind: 'add'; receive: number; give: number } | { kind: 'carry'; receive: number };

/** The slice as a timed state machine. */
export class DESlice {
  digits: number[][];
  /** Continuous wheel positions (in digits) for the pose. */
  pos: number[][];
  warn: number[][];
  shaft: number[] = [0, 0];
  printed: bigint[] = [];
  phaseName = 'idle';
  private queue: Phase[] = [];
  private t = 0;
  private trace: ReturnType<typeof addColumns> | null = null;
  private from: number[] = [];
  speed = 1;
  static ADD_MS = 900;
  static CARRY_MS = 1400;

  constructor(cols: bigint[]) {
    this.digits = cols.map((v) => toDigits(v, DIGITS));
    this.pos = this.digits.map((d) => [...d]);
    this.warn = this.digits.map((d) => d.map(() => 0));
  }

  values(): bigint[] {
    return this.digits.map(fromDigits);
  }

  set(cols: bigint[]): void {
    this.queue = [];
    this.trace = null;
    this.digits = cols.map((v) => toDigits(v, DIGITS));
    this.pos = this.digits.map((d) => [...d]);
    this.warn = this.digits.map((d) => d.map(() => 0));
    this.printed = [];
    this.phaseName = 'idle';
  }

  get busy(): boolean {
    return this.queue.length > 0 || this.trace !== null;
  }

  /** Queue one full cycle: half A (column 1 into 0), carries; half B (column 2 into 1), carries; print. */
  cycle(): void {
    this.queue.push({ kind: 'add', receive: 0, give: 1 }, { kind: 'carry', receive: 0 }, { kind: 'add', receive: 1, give: 2 }, { kind: 'carry', receive: 1 });
  }

  /** Run everything queued instantly. */
  flush(): void {
    while (this.busy) this.update(1e9);
  }

  update(dt: number): boolean {
    let budget = dt * this.speed;
    while (budget > 0 && (this.trace || this.queue.length)) {
      const ph = this.queue[0]!;
      if (!this.trace) {
        // Start the phase.
        const r = ph.receive;
        if (ph.kind === 'add') {
          this.trace = addColumns(this.digits[r]!, this.digits[ph.give]!);
          this.from = [...this.digits[r]!];
          this.phaseName = `half-cycle ${r === 0 ? 'A' : 'B'}: column ${ph.give} is added into column ${r}`;
        } else {
          // The carries come from the warnings the add left raised.
          this.trace = this.carryTrace(r);
          this.from = [...this.digits[r]!];
          this.phaseName = `the carry shaft beside column ${r} turns`;
        }
        this.t = 0;
      }
      const len = ph.kind === 'add' ? DESlice.ADD_MS : DESlice.CARRY_MS;
      const step = Math.min(budget, (1 - this.t) * len);
      this.t += step / len;
      budget -= step;
      this.apply(ph, Math.min(1, this.t));
      if (this.t >= 1 - 1e-9) {
        this.finish(ph);
        this.queue.shift();
        this.trace = null;
        if (!this.queue.length) this.phaseName = 'idle';
      }
    }
    return this.busy;
  }

  private carryTrace(r: number) {
    // Warnings were raised by the add; carries run in order from the bottom.
    const d = [...this.digits[r]!];
    const warn = this.warn[r]!.map((w) => w > 0.5);
    const carries: number[] = [];
    for (let i = 0; i < DIGITS; i++) {
      if (!warn[i]) continue;
      carries.push(i);
      if (i + 1 < DIGITS) {
        d[i + 1]!++;
        if (d[i + 1]! === 10) {
          d[i + 1] = 0;
          warn[i + 1] = true;
        }
      }
    }
    return { afterAdd: [...this.digits[r]!], warnings: warn, carries, result: d };
  }

  private apply(ph: Phase, t: number) {
    const r = ph.receive;
    const e = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x));
    if (ph.kind === 'add') {
      const give = this.digits[ph.give]!;
      for (let i = 0; i < DIGITS; i++) {
        this.pos[r]![i] = this.from[i]! + give[i]! * e(t);
        if (this.from[i]! + give[i]! * e(t) >= 9.999) this.warn[r]![i] = Math.max(this.warn[r]![i]!, e((this.from[i]! + give[i]! * e(t) - 9.999) * 4));
      }
    } else {
      this.shaft[r] = t * TAU;
      // Arm i passes wheel i at shaft angle (i + 0.5)/DIGITS · 2π; the carry moves wheel i+1 one step then.
      const carries = this.trace!.carries;
      const extra = this.digits[r]!.map(() => 0);
      for (const i of carries) {
        const at = (i + 0.6) / (DIGITS + 0.5);
        const p = e((t - at) * 9);
        if (i + 1 < DIGITS) extra[i + 1]! += p;
        // The warning is reset once its carry is made.
        this.warn[r]![i] = 1 - p;
      }
      for (let i = 0; i < DIGITS; i++) this.pos[r]![i] = this.from[i]! + extra[i]!;
    }
  }

  private finish(ph: Phase) {
    const r = ph.receive;
    if (ph.kind === 'add') {
      this.digits[r] = [...this.trace!.afterAdd];
      this.warn[r] = this.trace!.warnings.map((w) => (w ? 1 : 0));
    } else {
      this.digits[r] = [...this.trace!.result];
      this.warn[r] = this.digits[r]!.map(() => 0);
      this.shaft[r] = 0;
      if (r === 1) this.printed.push(fromDigits(this.digits[0]!));
    }
    this.pos[r] = this.digits[r]!.map((d) => d);
  }
}

export function differenceEngineModel(): ModelDef<DESlice> {
  const labels = Array.from({ length: 10 }, (_, d) => String(d));
  const meshes: ModelDef['meshes'] = {
    wheel: () => merge(disc(0.95, 0.34, 0.14, 48)),
    wheelDigits: () => rimDigits(labels, 0.952, 0.3, -Math.PI / 2, -1, 'upright'),
    axis: () => cylinderY(0.12, -0.6, DIGITS * DY + 0.3, 16),
    warn: () => box(0.5, 0.12, 0.12, 0, 0, 0).done(),
    shaft: () => {
      const b = new Builder();
      b.append(cylinderY(0.09, -0.5, DIGITS * DY + 0.2, 12));
      for (let i = 0; i < DIGITS; i++) {
        const a = PHI_W - ((i + 0.6) / (DIGITS + 0.5)) * TAU;
        const arm = box(0.55, 0.1, 0.12, 0.27, 0, 0).done();
        // Rotate the arm about y by angle a, at height i·DY.
        for (let k = 0; k < arm.positions.length; k += 3) {
          const x = arm.positions[k]!, z = arm.positions[k + 2]!;
          const nx = arm.normals[k]!, nz = arm.normals[k + 2]!;
          b.vertex(x * Math.cos(a) + z * Math.sin(a), arm.positions[k + 1]! + i * DY, -x * Math.sin(a) + z * Math.cos(a), nx * Math.cos(a) + nz * Math.sin(a), arm.normals[k + 1]!, -nx * Math.sin(a) + nz * Math.cos(a));
        }
        const base = b.count - arm.positions.length / 3;
        for (const idx of arm.indices) b.i.push(idx + base);
      }
      return b.done();
    },
    frame: () => merge(box(COLS * DX + 1.6, 0.3, 3.2, 0, -0.9, 0).done(), box(COLS * DX + 1.6, 0.25, 3.2, 0, DIGITS * DY + 0.1, 0).done(), box(0.25, DIGITS * DY + 1.25, 3.2, -(COLS * DX + 1.35) / 2, DIGITS * DY / 2 - 0.4, 0).done(), box(0.25, DIGITS * DY + 1.25, 3.2, (COLS * DX + 1.35) / 2, DIGITS * DY / 2 - 0.4, 0).done()),
  };
  const nodes: NodeDef[] = [{ name: 'frame', parts: [part('frame', 'iron')] }];
  const colName = ['Tabular value', 'First difference', 'Second difference (constant)'];
  for (let c = 0; c < COLS; c++) {
    nodes.push({ name: `axis${c}`, parts: [part('axis', 'steel')] });
    for (let i = 0; i < DIGITS; i++) {
      nodes.push({ name: `w${c}-${i}`, label: `${colName[c]}: figure wheel for the ${['units', 'tens', 'hundreds', 'thousands', 'ten thousands'][i]}`, info: 'Each figure wheel holds one decimal digit, engraved round its rim.', parts: [part('wheel', 'darkBrass'), part('wheelDigits', 'decalLight')] });
      if (c < 2) nodes.push({ name: `warn${c}-${i}`, label: 'Carry warning', info: 'Raised when this wheel passes 9 → 0 during an addition; the carry shaft’s arm then carries one into the wheel above.', parts: [part('warn', 'red')] });
    }
    if (c < 2) nodes.push({ name: `shaft${c}`, label: 'Carry shaft', info: 'Its arms are set in a spiral: as it turns, they pass the wheels from the bottom up and make the warned carries one after another.', parts: [part('shaft', 'steel')] });
  }
  const ix = nodeIndex(nodes);
  const iFrame = ix.frame!;
  return {
    key: 'difference-engine-slice',
    meshes,
    nodes,
    camera: { target: [0, 1.7, 0], distance: 11.5, yaw: 0.22, pitch: 0.18, fov: 0.6, aspect: 1.4 },
    pose(m, s) {
      fixed(m, iFrame, 0, 0, 0);
      for (let c = 0; c < COLS; c++) {
        const x = colX(c);
        fixed(m, ix[`axis${c}`]!, x, 0, 0);
        for (let i = 0; i < DIGITS; i++) {
          onAxis(m, ix[`w${c}-${i}`]!, Z_TO_Y, x, i * DY, 0, (s.pos[c]![i]! / 10) * TAU);
          if (c < 2) fixed(m, ix[`warn${c}-${i}`]!, x + 1.0 + 0.25 * s.warn[c]![i]!, i * DY + 0.3, 0.85);
        }
        if (c < 2) fixed(m, ix[`shaft${c}`]!, x + SHAFT_DX, 0, SHAFT_DZ, 0, 1, 0, s.shaft[c]!);
      }
    },
  };
}
