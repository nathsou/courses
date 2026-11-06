/**
 * The differential analyser at the level of its shafts. Every integrator is driven by the independent
 * variable's shaft (its disc) and by some other shaft (its wheel's displacement, the integrand); its output
 * shaft turns by the integral. Wire outputs back into integrands and the machine solves differential
 * equations: y'' = −y needs two integrators in a loop with a sign-reversing gear between them.
 *
 * Numerically: the integrator outputs form a state vector s, and each integrator i obeys ds_i/dt = f_i(s).
 * `slip` models the machine's imperfection: each integrator delivers (1 − slip) of the ideal increment.
 */

export type Source = 't' | 'one' | `out${number}` | `neg${number}` | `scaled${number}`;

export interface Setup {
  /** Initial values of each integrator's output. */
  init: number[];
  /** Integrand of each integrator as a function of time and the outputs. */
  integrand: (t: number, s: number[]) => number[];
}

/** Integrate with RK4, returning samples [t, ...s] every `every` steps. */
export function solve(setup: Setup, t1: number, dt = 0.002, slip = 0, every = 10): number[][] {
  let s = [...setup.init];
  let t = 0;
  const out: number[][] = [[t, ...s]];
  const f = (tt: number, ss: number[]) => setup.integrand(tt, ss).map((v) => v * (1 - slip));
  let k = 0;
  while (t < t1 - 1e-12) {
    const h = Math.min(dt, t1 - t);
    const k1 = f(t, s);
    const k2 = f(t + h / 2, s.map((v, i) => v + (h / 2) * k1[i]!));
    const k3 = f(t + h / 2, s.map((v, i) => v + (h / 2) * k2[i]!));
    const k4 = f(t + h, s.map((v, i) => v + h * k3[i]!));
    s = s.map((v, i) => v + (h / 6) * (k1[i]! + 2 * k2[i]! + 2 * k3[i]! + k4[i]!));
    t += h;
    if (++k % every === 0) out.push([t, ...s]);
  }
  return out;
}

/** Presets. Integrator outputs are named in `names`. */
export const SETUPS = {
  oscillator: {
    label: 'Simple harmonic motion: y″ = −y',
    names: ['y′', 'y'],
    make: (_p: number) => ({ init: [0, 1], integrand: (_t: number, [v, y]: number[]) => [-y!, v!] }),
    param: null as null | { label: string; min: number; max: number; value: number },
  },
  damped: {
    label: 'A damped spring: y″ = −k y′ − y',
    names: ['y′', 'y'],
    make: (k: number) => ({ init: [0, 1], integrand: (_t: number, [v, y]: number[]) => [-k * v! - y!, v!] }),
    param: { label: 'damping k', min: 0, max: 1.5, value: 0.25 },
  },
  orbit: {
    // Binet's equation for an orbit under an inverse-square force, with θ as the independent variable:
    // u″ + u = 1 (in units where GM/h² = 1); r = 1/u. u(0) = 1 + e, u′(0) = 0 gives an ellipse of eccentricity e.
    label: 'The Moon’s orbit: u″ + u = 1, with r = 1/u',
    names: ['u′', 'u'],
    make: (e: number) => ({ init: [0, 1 + e], integrand: (_t: number, [du, u]: number[]) => [1 - u!, du!] }),
    param: { label: 'eccentricity e', min: 0, max: 0.6, value: 0.0549 },
  },
} as const;

export type SetupId = keyof typeof SETUPS;

/** Capstan (torque amplifier) gain: a rope wrapped θ radians round a turning drum with friction μ. */
export const capstan = (mu: number, theta: number) => Math.exp(mu * theta);
