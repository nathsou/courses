/**
 * Two ways to finish an addition's carries, digit by digit.
 *
 * Ripple (as in the Pascaline, or Difference Engine No. 2's spiral): carries are made one place at a time
 * from the bottom, so the time grows with the longest run of carries.
 *
 * Anticipating (Babbage's anticipating carriage for the Analytical Engine's mill): after the digits are
 * added, each place knows whether it *made* a carry (a warning: its sum reached 10) and whether it would
 * *pass one on* (its digit is now 9). A place receives a carry exactly when, somewhere below it, there is a
 * warning followed only by 9s. Rods that look down the line for that pattern make every carry at once.
 * In modern terms: warning = generate, nine = propagate.
 */

export interface CarryTrace {
  /** Digits after the simultaneous addition, before any carry (low place first). */
  added: number[];
  /** Place made a carry during the addition (sum ≥ 10): "generate". */
  warnings: boolean[];
  /** Place shows 9 after the addition, so a carry into it would pass through: "propagate". */
  nines: boolean[];
  /** Places that receive a carry. */
  receives: boolean[];
  result: number[];
  /** Carry steps for a ripple: one per place in the longest run (0 if no carries). */
  rippleSteps: number;
}

export function carries(a: number[], b: number[]): CarryTrace {
  const n = Math.max(a.length, b.length);
  const added: number[] = [], warnings: boolean[] = [];
  for (let i = 0; i < n; i++) {
    const s = (a[i] ?? 0) + (b[i] ?? 0);
    added.push(s % 10);
    warnings.push(s >= 10);
  }
  const nines = added.map((d) => d === 9);
  // Lookahead: place i receives a carry if some j < i has a warning and every place strictly between is a 9.
  const receives = added.map(() => false);
  for (let i = 1; i < n; i++) {
    for (let j = i - 1; j >= 0; j--) {
      if (warnings[j]) {
        receives[i] = true;
        break;
      }
      if (!nines[j]) break;
    }
  }
  const result = added.map((d, i) => (d + (receives[i] ? 1 : 0)) % 10);
  // Ripple steps: the longest chain = a warning followed by a run of 9s that it passes through.
  let longest = 0;
  for (let j = 0; j < n; j++) {
    if (!warnings[j]) continue;
    let len = 1;
    for (let i = j + 1; i < n && nines[i]; i++) len++;
    longest = Math.max(longest, len);
  }
  return { added, warnings, nines, receives, result, rippleSteps: longest };
}

export const digitsOf = (v: bigint | number, n: number): number[] => {
  let x = BigInt(v);
  return Array.from({ length: n }, () => {
    const d = Number(x % 10n);
    x /= 10n;
    return d;
  });
};

/** The barrel: rows of studs; each stud lifts one lever, and each lever starts one action in the mill. */
export const LEVERS = [
  'Store → ingress axis 1',
  'Store → ingress axis 2',
  'Add ingress axes into the egress',
  'Anticipating carriage: make every carry',
  'Form the table of multiples',
  'Add a multiple; step the egress one place',
  'Egress → store',
  'Advance the operation cards',
] as const;

export interface BarrelRow {
  levers: number[];
  note: string;
  /** If set, the barrel steps back to this row unless the condition is met (a loop in the microprogram). */
  repeatTo?: number;
}

export const MICROPROGRAMS: Record<string, { label: string; rows: BarrelRow[] }> = {
  add: {
    label: 'Addition',
    rows: [
      { levers: [0], note: 'The first number travels from its column in the store, along the racks, to ingress axis 1.' },
      { levers: [1], note: 'The second number goes to ingress axis 2.' },
      { levers: [2], note: 'Every digit of axis 1 is added to axis 2’s, all at once; places that pass 9 raise warnings.' },
      { levers: [3], note: 'The anticipating carriage makes all the carries in one motion.' },
      { levers: [6], note: 'The result travels back along the racks to the column named by the next variable card.' },
      { levers: [7], note: 'The cards move on; the barrel returns to its start.' },
    ],
  },
  multiply: {
    label: 'Multiplication',
    rows: [
      { levers: [0], note: 'The multiplicand goes to ingress axis 1.' },
      { levers: [1], note: 'The multiplier goes to ingress axis 2.' },
      { levers: [4], note: 'The mill forms the multiples 1×, 2×, … 9× of the multiplicand, by repeated additions, on its table axes.' },
      { levers: [5, 3], note: 'For the next digit of the multiplier, the matching multiple is added into the egress, with its carries, and the egress steps one place.' },
      { levers: [], note: 'If digits of the multiplier remain, the barrel steps back one row: a loop in the microprogram.', repeatTo: 3 },
      { levers: [6], note: 'The product goes to the store.' },
      { levers: [7], note: 'The cards move on.' },
    ],
  },
};
