import { createContext } from 'svelte';

/** Shared by a hint ladder and its hints. */
export interface StepperCtx {
  /** Claim the next index (items call this once, in document order). */
  claim(): number;
  /** Number of revealed hints. */
  readonly current: number;
}

export const [getHints, setHints] = createContext<StepperCtx>();
