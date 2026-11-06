/**
 * Mechanical binary logic and binary floating point, after Zuse's Z1.
 *
 * The Z1's switching element: in each phase of the clock a driving plate moves; a control plate, set to 0 or 1
 * by another element, puts a pin either in the driver's path or out of it; an output plate moves only if the
 * pin couples it to the driver. Whether the output moves is the element's output bit. With the pin placed so
 * that 1 couples, the element passes its driver's motion when its control is 1 (a switch); with the pin
 * placed so that 0 couples, when its control is 0 (an inverter). Chains and parallel arrangements of such
 * elements make AND, OR and every other function.
 */

export type Gate = 'AND' | 'OR' | 'NAND' | 'NOR' | 'XOR' | 'NOT';

export function gate(g: Gate, a: boolean, b = false): boolean {
  switch (g) {
    case 'AND': return a && b;
    case 'OR': return a || b;
    case 'NAND': return !(a && b);
    case 'NOR': return !(a || b);
    case 'XOR': return a !== b;
    case 'NOT': return !a;
  }
}

/** The switching element: does the output plate move, given the driver moves and the control is set? */
export function element(driverMoves: boolean, control: boolean, invert = false): boolean {
  return driverMoves && (invert ? !control : control);
}

/** Two elements in series (the first's output plate drives the second): AND. */
export const series = (a: boolean, b: boolean) => element(element(true, a), b);
/** Two elements side by side pushing the same output plate: OR. */
export const parallel = (a: boolean, b: boolean) => element(true, a) || element(true, b);

/** Truth table of f over two inputs, as four booleans for (0,0), (0,1), (1,0), (1,1). */
export const table = (f: (a: boolean, b: boolean) => boolean) => [f(false, false), f(false, true), f(true, false), f(true, true)];

/**
 * A Z1-style floating-point word: a sign bit, a 7-bit exponent in two's complement, and a 16-bit mantissa
 * whose leading 1 (before the binary point) is not stored. Value = (−1)^s · 1.f · 2^e.
 */
export interface Float {
  sign: number;
  exponent: number;
  fraction: number[]; // 16 bits after the point
}

export const FRACTION_BITS = 16;

export function encode(x: number): Float | null {
  if (x === 0 || !Number.isFinite(x)) return null;
  const sign = x < 0 ? 1 : 0;
  let m = Math.abs(x);
  let e = Math.floor(Math.log2(m));
  m = m / 2 ** e; // 1 ≤ m < 2
  // Round the mantissa to 16 fraction bits.
  let f = Math.round((m - 1) * 2 ** FRACTION_BITS);
  if (f === 2 ** FRACTION_BITS) {
    f = 0;
    e++;
  }
  if (e < -64 || e > 63) return null;
  const fraction = Array.from({ length: FRACTION_BITS }, (_, i) => (f >> (FRACTION_BITS - 1 - i)) & 1);
  return { sign, exponent: e, fraction };
}

export function decode(v: Float): number {
  const f = v.fraction.reduce((a, b) => a * 2 + b, 0);
  return (v.sign ? -1 : 1) * (1 + f / 2 ** FRACTION_BITS) * 2 ** v.exponent;
}

/** The exponent's 7 bits in two's complement. */
export function exponentBits(e: number): number[] {
  const u = (e + 128) % 128;
  return Array.from({ length: 7 }, (_, i) => (u >> (6 - i)) & 1);
}
