/**
 * The method of differences and Babbage's Difference Engine No. 2.
 *
 * A polynomial of degree n has constant n-th differences, so its table can be continued by additions alone:
 * each column adds the column to its right. Done naively, the additions in one step must happen in order
 * (each uses the old value of the column beyond). Babbage's engine instead does them in two half-cycles:
 * first every odd-numbered column adds into the even one on its left (columns 2→1, 4→3, 6→5, 8→7, all at once),
 * then every even-numbered column into the odd one on its left (3→2, 5→4, 7→6). Twice the additions happen at
 * once, but the columns are then a step or two out of phase, so the starting values must be staggered:
 * column i starts with the i-th difference taken at x = −⌊i/2⌋ rather than at x = 0.
 *
 * Columns here are numbered from 0 (the tabular value) to n (the constant difference).
 */

/** Forward differences of a table: rows[i][x] = Δ^i f(x). */
export function differenceTable(values: bigint[], order: number): bigint[][] {
  const rows: bigint[][] = [values];
  for (let i = 1; i <= order; i++) {
    const prev = rows[i - 1]!;
    rows.push(prev.slice(1).map((v, k) => v - prev[k]!));
  }
  return rows;
}

export type Poly = bigint[]; // coefficients, constant first

export function evalPoly(p: Poly, x: bigint): bigint {
  return p.reduceRight((acc, c) => acc * x + c, 0n);
}

/** The i-th forward difference of p at x. */
export function delta(p: Poly, i: number, x: bigint): bigint {
  // Δ^i f(x) = Σ_k (−1)^(i−k) C(i, k) f(x + k)
  let s = 0n;
  let c = 1n;
  for (let k = 0; k <= i; k++) {
    if (k > 0) c = (c * BigInt(i - k + 1)) / BigInt(k);
    const term = c * evalPoly(p, x + BigInt(k));
    s += (i - k) % 2 === 0 ? term : -term;
  }
  return s;
}

/** Starting columns for the naive (sequential) method at x0. */
export function initialColumns(p: Poly, x0 = 0n): bigint[] {
  const n = Math.max(1, p.length - 1);
  return Array.from({ length: n + 1 }, (_, i) => delta(p, i, x0));
}

/** Starting columns for the engine's two half-cycles: column i holds Δ^i f(x0 − ⌊i/2⌋). */
export function staggeredColumns(p: Poly, x0 = 0n): bigint[] {
  const n = Math.max(1, p.length - 1);
  return Array.from({ length: n + 1 }, (_, i) => delta(p, i, x0 - BigInt(Math.floor(i / 2))));
}

/** One step of the naive method: from the left, each column adds the (old) column on its right. */
export function naiveStep(cols: bigint[]): void {
  for (let i = 0; i < cols.length - 1; i++) cols[i]! += cols[i + 1]!;
}

/** Half-cycle A: odd columns add into the even column on their left (1→0, 3→2, 5→4, 7→6). */
export function halfCycleA(cols: bigint[]): void {
  for (let i = 0; i + 1 < cols.length; i += 2) cols[i]! += cols[i + 1]!;
}
/** Half-cycle B: even columns (from 2) add into the odd column on their left (2→1, 4→3, 6→5). */
export function halfCycleB(cols: bigint[]): void {
  for (let i = 1; i + 1 < cols.length; i += 2) cols[i]! += cols[i + 1]!;
}

/** A full engine cycle: A then B. After it, column 0 holds the next tabular value. */
export function engineCycle(cols: bigint[]): void {
  halfCycleA(cols);
  halfCycleB(cols);
}

/**
 * Digit-level addition as the engine does it: every figure wheel of the receiving column turns forward by the
 * matching digit of the giving column, all at once, and any wheel that passes 9 → 0 sets its carry warning.
 * Then the carries are made in sequence from the lowest digit up (the spiral of carry arms), so a carry into
 * a 9 sets that wheel's warning in time to be carried in its turn.
 */
export interface AddTrace {
  /** Digits of the receiving column after the simultaneous addition, before carries. */
  afterAdd: number[];
  /** Which wheels set their warning during the addition. */
  warnings: boolean[];
  /** Order in which carries were made (digit index that carried). */
  carries: number[];
  result: number[];
}

export function addColumns(receive: number[], give: number[]): AddTrace {
  const n = receive.length;
  const afterAdd = receive.map((d, i) => (d + (give[i] ?? 0)) % 10);
  const warnings = receive.map((d, i) => d + (give[i] ?? 0) >= 10);
  const result = [...afterAdd];
  const warn = [...warnings];
  const carries: number[] = [];
  for (let i = 0; i < n; i++) {
    if (!warn[i]) continue;
    carries.push(i);
    if (i + 1 < n) {
      result[i + 1]!++;
      if (result[i + 1]! === 10) {
        result[i + 1] = 0;
        warn[i + 1] = true;
      }
    }
  }
  return { afterAdd, warnings, carries, result };
}

export function toDigits(v: bigint, n: number): number[] {
  const out: number[] = [];
  let x = v < 0n ? -v : v;
  for (let i = 0; i < n; i++) {
    out.push(Number(x % 10n));
    x /= 10n;
  }
  return out;
}

export function fromDigits(d: number[]): bigint {
  return d.reduceRight((a, x) => a * 10n + BigInt(x), 0n);
}

/** Polynomials offered in the widgets. */
export const POLYS: Record<string, { label: string; p: Poly }> = {
  euler: { label: 'x² + x + 41', p: [41n, 1n, 1n] },
  squares: { label: 'x²', p: [0n, 0n, 1n] },
  cubes: { label: 'x³', p: [0n, 0n, 0n, 1n] },
  pyramid: { label: 'x(x+1)(2x+1)/6 · 6 = 2x³ + 3x² + x', p: [0n, 1n, 3n, 2n] },
  seventh: { label: 'x⁷', p: [0n, 0n, 0n, 0n, 0n, 0n, 0n, 1n] },
};
