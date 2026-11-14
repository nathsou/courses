/**
 * What the chapter's three fits cost on an iCE40 HX8K (7,680 logic cells, 32 block RAMs): Octet, and the RV32I core
 * with its register file in flip-flops and in block RAM. The numbers are recorded in `budget.json` by
 * `budget.test.ts`, which fits the three designs with synth and fails when they move (UPDATE_BUDGET=1 records
 * them again).
 */
import recorded from './budget.json';

export type FitId = 'octet' | 'rv32-flip-flops' | 'rv32-block-ram';

export interface FitNumbers {
  /** Logic cells in use. */
  cells: number;
  /** Of which, cells whose flip-flop is used. */
  flipFlopCells: number;
  rams: number;
  mhz: number;
}

export interface Budget {
  capacity: number;
  rams: number;
  fits: Record<FitId, FitNumbers>;
}

export const BUDGET = recorded as Budget;

export const FIT_TITLES: Record<FitId, string> = {
  octet: 'Octet',
  'rv32-flip-flops': 'RV32I, registers in flip-flops',
  'rv32-block-ram': 'RV32I, registers in block RAM',
};
