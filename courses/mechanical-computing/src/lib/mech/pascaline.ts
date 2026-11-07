/**
 * The Pascaline as a timed state machine.
 *
 * Each wheel holds a digit in its own radix (10 for a decimal machine; Pascal's accounting machines had
 * wheels of 12 deniers and 20 sols). Turning a wheel one step past its last digit releases its sautoir: a
 * weighted lever that the wheel has been lifting, little by little, through the whole revolution. The
 * sautoir falls and pushes the next wheel one step. Because each sautoir's energy was stored while it was
 * lifted, a carry through any number of 9s costs the operator no more effort than a single one: the
 * sautoirs fall one after another, each releasing the next.
 *
 * The same class runs instantly (for tests and for exercises) or animated (for the 3D view): actions are
 * queued, and `update(dt)` advances the current one.
 */

export type PascalineEvent = { kind: 'step'; wheel: number } | { kind: 'carry'; from: number } | { kind: 'overflow' };

interface Step {
  kind: 'step';
  wheel: number;
  /** Progress 0..1 through the step. */
  t: number;
  /** Caused by a carry (rather than the stylus). */
  carried: boolean;
}
interface Fall {
  kind: 'fall';
  wheel: number;
  t: number;
}
type Action = Step | Fall;

export const STEP_MS = 140;
export const FALL_MS = 110;

export class Pascaline {
  readonly radices: number[];
  digits: number[];
  /** Fall animation of each sautoir, 0 (resting on its lifter) .. 1 (just fallen). */
  falling: number[];
  private queue: Action[] = [];
  private current: Action | null = null;
  /** Everything that has happened, oldest first (the readout shows the tail). */
  events: PascalineEvent[] = [];
  carries = 0;
  /** 1 = real time; larger is faster. */
  speed = 1;

  constructor(radices: number[] = [10, 10, 10, 10, 10, 10]) {
    this.radices = radices;
    this.digits = radices.map(() => 0);
    this.falling = radices.map(() => 0);
  }

  get size(): number {
    return this.radices.length;
  }

  get busy(): boolean {
    return this.current !== null || this.queue.length > 0;
  }

  /** The number on the wheels, wheel 0 being the least significant. */
  value(): number {
    let v = 0, place = 1;
    for (let k = 0; k < this.size; k++) {
      v += this.digits[k]! * place;
      place *= this.radices[k]!;
    }
    return v;
  }

  /** Largest number the wheels hold (all wheels at their last digit). */
  get capacity(): number {
    return this.radices.reduce((a, r) => a * r, 1) - 1;
  }

  /** The complement row: what the upper windows show (capacity − value; for decimal wheels, 9 − d each). */
  complement(): number {
    return this.capacity - this.value();
  }

  complementDigits(): number[] {
    return this.digits.map((d, k) => this.radices[k]! - 1 - d);
  }

  /** Continuous position of a wheel in steps (digit + progress of an animated step), for the 3D pose. */
  position(k: number): number {
    const c = this.current;
    return this.digits[k]! + (c && c.kind === 'step' && c.wheel === k ? ease(c.t) : 0);
  }

  /** How far the sautoir of wheel k is lifted, 0..1: it rises with the wheel and drops at the carry. */
  lift(k: number): number {
    const r = this.radices[k]!;
    const p = this.position(k);
    // The lifter takes it up over the turn from 0 to the last digit; it is released past the last digit.
    const raw = p >= r - 1 ? 1 - (p - (r - 1)) : p / (r - 1);
    return Math.max(0, Math.min(1, raw)) * (1 - this.falling[k]!);
  }

  /** Set the wheels directly (as an operator setting up a problem; no carries). */
  set(value: number): void {
    this.queue = [];
    this.current = null;
    let v = Math.max(0, Math.floor(value));
    for (let k = 0; k < this.size; k++) {
      this.digits[k] = v % this.radices[k]!;
      v = Math.floor(v / this.radices[k]!);
    }
    this.falling.fill(0);
  }

  setDigits(digits: number[]): void {
    this.queue = [];
    this.current = null;
    digits.forEach((d, k) => (this.digits[k] = ((d % this.radices[k]!) + this.radices[k]!) % this.radices[k]!));
    this.falling.fill(0);
  }

  /** Turn wheel k forward by n steps with the stylus (queued). */
  dial(k: number, n: number): void {
    for (let i = 0; i < n; i++) this.queue.push({ kind: 'step', wheel: k, t: 0, carried: false });
  }

  /** Enter a whole number, wheel by wheel from the units up, as a clerk would. */
  add(value: number): void {
    let v = Math.max(0, Math.floor(value));
    for (let k = 0; k < this.size && v > 0; k++) {
      const d = v % this.radices[k]!;
      v = Math.floor(v / this.radices[k]!);
      if (d) this.dial(k, d);
    }
  }

  /** Run everything queued to completion, instantly. */
  flush(): void {
    while (this.busy) this.update(1e9);
  }

  /** Advance the animation by dt ms. Returns true while anything is still moving. */
  update(dt: number): boolean {
    let budget = dt * this.speed;
    while (budget > 0) {
      if (!this.current) {
        this.current = this.queue.shift() ?? null;
        if (!this.current) break;
      }
      const a = this.current;
      const len = a.kind === 'step' ? STEP_MS : FALL_MS;
      const need = (1 - a.t) * len;
      if (budget < need) {
        a.t += budget / len;
        if (a.kind === 'fall') this.falling[a.wheel] = a.t;
        budget = 0;
        break;
      }
      budget -= need;
      a.t = 1;
      this.finish(a);
    }
    return this.busy || this.falling.some((f) => f > 0);
  }

  private finish(a: Action): void {
    this.current = null;
    if (a.kind === 'step') {
      const k = a.wheel;
      this.events.push({ kind: 'step', wheel: k });
      if (this.digits[k]! + 1 >= this.radices[k]!) {
        this.digits[k] = 0;
        // The sautoir falls first, then its push turns the next wheel: these go to the front of the queue.
        this.queue.unshift({ kind: 'fall', wheel: k, t: 0 });
      } else this.digits[k]!++;
    } else {
      const k = a.wheel;
      this.falling[k] = 0;
      this.carries++;
      this.events.push({ kind: 'carry', from: k });
      if (k + 1 < this.size) this.queue.unshift({ kind: 'step', wheel: k + 1, t: 0, carried: true });
      else this.events.push({ kind: 'overflow' });
    }
  }
}

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/**
 * Subtraction on a machine whose wheels only turn forwards: set the complement row to show the minuend a
 * (the wheels then hold capacity − a), add the subtrahend b, and read a − b in the complement row.
 */
export function subtractByComplement(a: number, b: number, radices?: number[]): { machine: Pascaline; result: number } {
  const m = new Pascaline(radices);
  m.set(m.capacity - a);
  m.add(b);
  m.flush();
  return { machine: m, result: m.complement() };
}

/** Pascal's accounting radices, least significant first: 12 deniers to the sol, 20 sols to the livre. */
export const ACCOUNTING = [12, 20, 10, 10, 10, 10];

/** Format a value on accounting wheels as "L livres S sols D deniers". */
export function livres(value: number): { l: number; s: number; d: number } {
  return { d: value % 12, s: Math.floor(value / 12) % 20, l: Math.floor(value / 240) };
}
