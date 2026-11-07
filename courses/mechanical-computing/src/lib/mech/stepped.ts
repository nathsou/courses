/**
 * Stepped-drum calculators: Leibniz's reckoner (1694), the Thomas arithmometer (1851) and the Curta (1948)
 * share one mechanism. A drum carries nine teeth of increasing length; a pinion slid along it to position s
 * meets s of them, so one turn of the crank turns the pinion by s tenths: it adds s to the result digit above.
 *
 * The machine: a setting register S (the number to add), a result register A on a carriage that can be
 * shifted (so S is added to A × 10^shift), and a counter of crank turns at each shift. Multiplication is
 * repeated turns and shifts; division is repeated subtraction.
 *
 * Carry modes:
 *  - 'complete': every carry ripples to completion (the arithmometer and the Curta);
 *  - 'leibniz': a carry made by the addition itself moves the next wheel on, but a carry *caused by a carry*
 *    (a 9 pushed to 0) is left pending, flagged for the operator to complete by hand — the limitation of
 *    Leibniz's machine as it was built.
 */

export type CarryMode = 'complete' | 'leibniz';

export class SteppedReckoner {
  setting: number[];
  result: number[];
  counter: number[];
  shift = 0;
  /** Places with a carry waiting to be completed by hand (Leibniz mode). */
  pending: Set<number> = new Set();
  /** Set when a subtraction passed below zero (the Curta's result wraps; the operator hears it go "through"). */
  wrapped = false;
  turns = 0;

  constructor(
    readonly settingDigits = 8,
    readonly resultDigits = 11,
    readonly counterDigits = 6,
    readonly mode: CarryMode = 'complete',
  ) {
    this.setting = Array(settingDigits).fill(0);
    this.result = Array(resultDigits).fill(0);
    this.counter = Array(counterDigits).fill(0);
  }

  static toDigits(v: number, n: number): number[] {
    const out: number[] = [];
    let x = Math.max(0, Math.floor(v));
    for (let i = 0; i < n; i++) {
      out.push(x % 10);
      x = Math.floor(x / 10);
    }
    return out;
  }

  static value(d: number[]): number {
    return d.reduceRight((a, x) => a * 10 + x, 0);
  }

  get resultValue(): number {
    return SteppedReckoner.value(this.result);
  }
  get counterValue(): number {
    return SteppedReckoner.value(this.counter);
  }
  get settingValue(): number {
    return SteppedReckoner.value(this.setting);
  }

  set(v: number): void {
    this.setting = SteppedReckoner.toDigits(v, this.settingDigits);
  }

  clear(): void {
    this.result.fill(0);
    this.counter.fill(0);
    this.pending.clear();
    this.wrapped = false;
    this.shift = 0;
  }

  /** Move the carriage: the setting then lines up with result digit `shift`. */
  moveTo(shift: number): void {
    this.shift = Math.max(0, Math.min(this.counterDigits - 1, this.resultDigits - this.settingDigits, shift));
  }

  /**
   * One turn of the crank. `subtract` uses the complementary teeth: the drum adds 9 − s at every place, and a
   * 1 is fed into the lowest place, which is the same as adding the tens' complement — that is, subtracting.
   * `countUp` says which way the counter turns (normally up for additions and down for subtractions; the
   * Curta's counter-reversing lever flips it for division, so that subtractions count up).
   * Returns the places at which a carry was made.
   */
  turn(subtract = false, countUp = !subtract): number[] {
    this.turns++;
    const n = this.resultDigits;
    // The digits each result wheel receives from the drums in this turn.
    const add = Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      const j = i - this.shift;
      const s = j >= 0 && j < this.settingDigits ? this.setting[j]! : 0;
      add[i] = subtract ? (i >= this.shift ? 9 - s : 0) : s;
    }
    if (subtract) add[this.shift] += 1;
    // Turn every wheel; note which passed 9 → 0.
    const carryOut = Array(n).fill(false);
    for (let i = 0; i < n; i++) {
      const v = this.result[i]! + add[i]!;
      carryOut[i] = v >= 10;
      this.result[i] = v % 10;
    }
    // Carries.
    const carried: number[] = [];
    if (this.mode === 'complete') {
      let c = 0;
      for (let i = 0; i < n; i++) {
        const v = this.result[i]! + c + (i > 0 && carryOut[i - 1] ? 1 : 0);
        c = v >= 10 ? 1 : 0;
        if (i > 0 && carryOut[i - 1]) carried.push(i - 1);
        this.result[i] = v % 10;
        if (c) carried.push(i);
      }
      // A carry out of the top: for a subtraction this means "no borrow" (the normal case); for an addition, overflow.
      const top = c === 1 || carryOut[n - 1];
      this.wrapped = subtract ? !top : top;
    } else {
      // Leibniz: each primary carry advances the next wheel once; if that makes it pass 9 → 0, the next carry waits.
      for (let i = 0; i < n - 1; i++) {
        if (!carryOut[i]) continue;
        carried.push(i);
        const v = this.result[i + 1]! + 1;
        this.result[i + 1] = v % 10;
        if (v >= 10 && i + 2 < n) this.pending.add(i + 2);
      }
    }
    // The counter records the turn at the current shift (+1, or −1 when subtracting).
    const k = this.shift;
    if (!countUp) {
      for (let i = k; i < this.counterDigits; i++) {
        if (this.counter[i]! > 0) {
          this.counter[i]!--;
          break;
        }
        this.counter[i] = 9;
      }
    } else {
      for (let i = k; i < this.counterDigits; i++) {
        if (this.counter[i]! < 9) {
          this.counter[i]!++;
          break;
        }
        this.counter[i] = 0;
      }
    }
    return [...new Set(carried)];
  }

  /** The operator completes a pending carry by hand: the wheel at `place` moves on by one (which may leave another pending). */
  completeCarry(place: number): void {
    if (!this.pending.has(place)) return;
    this.pending.delete(place);
    const v = this.result[place]! + 1;
    this.result[place] = v % 10;
    if (v >= 10 && place + 1 < this.resultDigits) this.pending.add(place + 1);
  }

  /** Multiply the setting by m: turns and shifts, digit by digit of m, from the lowest. Returns the number of turns. */
  multiply(m: number): number {
    let turns = 0;
    SteppedReckoner.toDigits(m, this.counterDigits).forEach((d, place) => {
      if (place > this.resultDigits - this.settingDigits) return;
      this.moveTo(place);
      for (let t = 0; t < d; t++) {
        this.turn();
        turns++;
      }
    });
    this.moveTo(0);
    return turns;
  }

  /**
   * Restoring division, as on a Curta: put the dividend in the result register, set the divisor, and at each
   * shift from the highest down subtract until the result goes through zero, then add back once. The counter
   * ends holding the quotient and the result register the remainder. Returns the number of turns.
   */
  divide(dividend: number, divisor: number): number {
    this.clear();
    this.result = SteppedReckoner.toDigits(dividend, this.resultDigits);
    this.set(divisor);
    let turns = 0;
    const top = Math.min(this.counterDigits - 1, this.resultDigits - this.settingDigits);
    for (let place = top; place >= 0; place--) {
      this.moveTo(place);
      for (;;) {
        this.turn(true, true);
        turns++;
        if (this.wrapped) {
          this.turn(false, false);
          turns++;
          break;
        }
      }
    }
    this.moveTo(0);
    return turns;
  }
}

/**
 * Which teeth of a stepped drum a pinion at setting s meets: the s longest of the nine. Tooth j (1..9) has
 * length (j + ½) tenths of the drum, measured from the long end.
 */
export function engagedTeeth(s: number): number[] {
  return Array.from({ length: 9 }, (_, i) => i + 1).filter((j) => j > 9 - s);
}
