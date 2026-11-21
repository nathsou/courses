/**
 * Cycle simulation of a design in the course's HDL, and the stimulus generators used by testbenches.
 */
import { initialState, mask, nextState, settle, evaluate, type Check, type Design, type Env } from './hdl';

export interface Cycle {
  /** Every signal's value during the cycle: inputs, registers (before the edge), wires and outputs. */
  values: Env;
  /** Assertions that failed in this cycle. */
  failed: Check[];
  /** Assumptions the stimulus broke in this cycle. */
  broken: Check[];
}

export interface Trace {
  cycles: Cycle[];
  /** First failing assertion, if any. */
  failure?: { cycle: number; check: Check };
}

export function simulate(d: Design, stimulus: Env[], start: Env = initialState(d)): Trace {
  let state = { ...start };
  const cycles: Cycle[] = [];
  let failure: Trace['failure'];
  for (const [i, inp] of stimulus.entries()) {
    const env: Env = { ...state };
    for (const s of d.inputs) env[s.name] = ((inp[s.name] ?? 0) & mask(s.width)) >>> 0;
    settle(d, env);
    const failed = d.asserts.filter((c) => evaluate(c.expr, env) === 0);
    const broken = d.assumes.filter((c) => evaluate(c.expr, env) === 0);
    if (failed.length && !failure) failure = { cycle: i, check: failed[0]! };
    cycles.push({ values: env, failed, broken });
    state = nextState(d, env);
  }
  return { cycles, failure };
}

/** A small, fast, seeded random number generator (mulberry32), so random tests are repeatable. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Random input vectors. `ones` gives, for 1-bit inputs, the probability of a 1 (default 0.5): a reset that is
 * high half the time would keep a counter from ever counting far.
 */
export function randomStimulus(d: Design, cycles: number, seed = 1, ones: Record<string, number> = {}): Env[] {
  const r = rng(seed);
  const out: Env[] = [];
  for (let i = 0; i < cycles; i++) {
    const v: Env = {};
    for (const s of d.inputs) v[s.name] = s.width === 1 ? (r() < (ones[s.name] ?? 0.5) ? 1 : 0) : Math.floor(r() * 2 ** s.width) >>> 0;
    out.push(v);
  }
  return out;
}
