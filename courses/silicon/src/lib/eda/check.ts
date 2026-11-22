/**
 * Exhaustive checking by exploring every reachable state: proving assertions (a tiny explicit-state model
 * checker) and proving that two designs behave identically (sequential equivalence on the product machine).
 * Both run breadth-first from power-on, so a counterexample is a shortest one.
 */
import { evaluate, initialState, mask, nextState, settle, type Check, type Design, type Env, type Signal } from './hdl';

export const MAX_INPUT_BITS = 12;
export const DEFAULT_MAX_STATES = 200_000;

const keyOf = (regs: Signal[], env: Env) => regs.map((r) => env[r.name]).join(',');

/** Every combination of input values (inputs of at most MAX_INPUT_BITS bits in all). */
export function inputSpace(inputs: Signal[]): Env[] {
  const bits = inputs.reduce((s, i) => s + i.width, 0);
  if (bits > MAX_INPUT_BITS) throw new Error(`too many input bits to try every combination (${bits} > ${MAX_INPUT_BITS})`);
  const out: Env[] = [];
  for (let n = 0; n < 2 ** bits; n++) {
    const v: Env = {};
    let rest = n;
    for (const s of inputs) {
      v[s.name] = (rest & mask(s.width)) >>> 0;
      rest = Math.floor(rest / 2 ** s.width);
    }
    out.push(v);
  }
  return out;
}

export interface Counterexample {
  /** The inputs, cycle by cycle, from power-on to the failing cycle (inclusive). */
  stimulus: Env[];
}

export type ProveResult =
  | { ok: true; states: number; complete: boolean }
  | { ok: false; states: number; check: Check; counterexample: Counterexample };

function path(parents: Map<string, { prev: string; inputs: Env } | null>, key: string, last: Env): Env[] {
  const out = [last];
  for (let p = parents.get(key); p; p = parents.get(p.prev)) out.unshift(p.inputs);
  return out;
}

/** Prove every assertion of a design in every reachable state, for every input the assumptions allow. */
export function prove(d: Design, maxStates = DEFAULT_MAX_STATES): ProveResult {
  const inputs = inputSpace(d.inputs);
  const start = initialState(d);
  const parents = new Map<string, { prev: string; inputs: Env } | null>([[keyOf(d.regs, start), null]]);
  const queue: Env[] = [start];
  for (let qi = 0; qi < queue.length; qi++) {
    const state = queue[qi]!;
    const key = keyOf(d.regs, state);
    for (const inp of inputs) {
      const env = settle(d, { ...state, ...inp });
      if (d.assumes.some((c) => evaluate(c.expr, env) === 0)) continue;
      const bad = d.asserts.find((c) => evaluate(c.expr, env) === 0);
      if (bad) return { ok: false, states: parents.size, check: bad, counterexample: { stimulus: path(parents, key, inp) } };
      const next = nextState(d, env);
      const nk = keyOf(d.regs, next);
      if (parents.has(nk)) continue;
      if (parents.size >= maxStates) return { ok: true, states: parents.size, complete: false };
      parents.set(nk, { prev: key, inputs: inp });
      queue.push(next);
    }
  }
  return { ok: true, states: parents.size, complete: true };
}

/** The reachable states of a design (register valuations), in breadth-first order. */
export function reachable(d: Design, maxStates = DEFAULT_MAX_STATES): Env[] {
  const inputs = inputSpace(d.inputs);
  const start = initialState(d);
  const seen = new Set([keyOf(d.regs, start)]);
  const queue: Env[] = [start];
  for (let qi = 0; qi < queue.length && seen.size < maxStates; qi++) {
    for (const inp of inputs) {
      const env = settle(d, { ...queue[qi]!, ...inp });
      if (d.assumes.some((c) => evaluate(c.expr, env) === 0)) continue;
      const next = nextState(d, env);
      const k = keyOf(d.regs, next);
      if (!seen.has(k)) {
        seen.add(k);
        queue.push(next);
      }
    }
  }
  return queue;
}

export type EquivalenceResult =
  | { ok: true; states: number; complete: boolean }
  | { ok: false; states: number; signal: string; got: number; expected: number; counterexample: Counterexample };

/**
 * Prove that `impl` and `spec` give the same value on every signal in `compare`, in every cycle, for every input
 * sequence (that `spec`'s assumptions allow). Both designs get the same inputs by name.
 */
export function equivalent(impl: Design, spec: Design, compare: string[], maxStates = DEFAULT_MAX_STATES): EquivalenceResult {
  const names = new Map<string, Signal>();
  for (const s of [...spec.inputs, ...impl.inputs]) if (!names.has(s.name)) names.set(s.name, s);
  const inputs = inputSpace([...names.values()]);
  const sa = initialState(impl);
  const sb = initialState(spec);
  const key = (a: Env, b: Env) => `${keyOf(impl.regs, a)}|${keyOf(spec.regs, b)}`;
  const parents = new Map<string, { prev: string; inputs: Env } | null>([[key(sa, sb), null]]);
  const queue: [Env, Env][] = [[sa, sb]];
  for (let qi = 0; qi < queue.length; qi++) {
    const [a, b] = queue[qi]!;
    const k = key(a, b);
    for (const inp of inputs) {
      const eb = settle(spec, { ...b, ...pick(inp, spec.inputs) });
      if (spec.assumes.some((c) => evaluate(c.expr, eb) === 0)) continue;
      const ea = settle(impl, { ...a, ...pick(inp, impl.inputs) });
      for (const name of compare) {
        if (ea[name] !== eb[name]) {
          return { ok: false, states: parents.size, signal: name, got: ea[name] ?? 0, expected: eb[name] ?? 0, counterexample: { stimulus: path(parents, k, inp) } };
        }
      }
      const na = nextState(impl, ea);
      const nb = nextState(spec, eb);
      const nk = key(na, nb);
      if (parents.has(nk)) continue;
      if (parents.size >= maxStates) return { ok: true, states: parents.size, complete: false };
      parents.set(nk, { prev: k, inputs: inp });
      queue.push([na, nb]);
    }
  }
  return { ok: true, states: parents.size, complete: true };
}

function pick(inp: Env, inputs: Signal[]): Env {
  const out: Env = {};
  for (const s of inputs) out[s.name] = ((inp[s.name] ?? 0) & mask(s.width)) >>> 0;
  return out;
}

/** "en=1, rst=0" for a vector of inputs. */
export function describeInputs(inp: Env): string {
  const parts = Object.entries(inp).map(([k, v]) => `${k}=${v}`);
  return parts.length ? parts.join(', ') : 'no inputs';
}
