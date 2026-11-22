/**
 * Multilayer mirrors for extreme ultraviolet light: the reflectivity of a stack of molybdenum and silicon layers
 * at normal incidence, by the characteristic-matrix (transfer-matrix) method of thin-film optics. Every interface
 * reflects a fraction of a per cent; with the period set to half a wavelength, the reflections add in phase.
 */

/** Complex numbers, as [re, im]. */
type C = [number, number];
const add = (a: C, b: C): C => [a[0] + b[0], a[1] + b[1]];
const sub = (a: C, b: C): C => [a[0] - b[0], a[1] - b[1]];
const mul = (a: C, b: C): C => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const div = (a: C, b: C): C => {
  const d = b[0] * b[0] + b[1] * b[1];
  return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d];
};
const cexp = (a: C): C => {
  const m = Math.exp(a[0]);
  return [m * Math.cos(a[1]), m * Math.sin(a[1])];
};
const cos = (z: C): C => {
  // cos z = (e^{iz} + e^{-iz}) / 2
  const e1 = cexp([-z[1], z[0]]);
  const e2 = cexp([z[1], -z[0]]);
  return [(e1[0] + e2[0]) / 2, (e1[1] + e2[1]) / 2];
};
const sin = (z: C): C => {
  // sin z = (e^{iz} − e^{-iz}) / 2i
  const e1 = cexp([-z[1], z[0]]);
  const e2 = cexp([z[1], -z[0]]);
  const d: C = [e1[0] - e2[0], e1[1] - e2[1]];
  return [d[1] / 2, -d[0] / 2];
};
const abs2 = (a: C) => a[0] * a[0] + a[1] * a[1];

/** Complex refractive indices n + ik at 13.5 nm (Henke, Gullikson and Davis's tables), taken as constant nearby. */
export const INDEX = {
  mo: [0.92108, 0.0064247] as C,
  si: [0.99888, 0.0018265] as C,
};

export interface Stack {
  pairs: number;
  /** Thickness of one Mo + Si pair, nm. */
  period: number;
  /** Fraction of the period that is molybdenum. */
  gamma: number;
}

export const DEFAULT_STACK: Stack = { pairs: 40, period: 6.92, gamma: 0.4 };

/**
 * Reflectivity (fraction of power) of a stack at normal incidence, from vacuum, at `wavelength` nm. The stack
 * is (Si on Mo) × pairs, silicon on top, on a silicon substrate.
 */
export function reflectivity(stack: Stack, wavelength: number): number {
  const layers: { n: C; d: number }[] = [];
  for (let i = 0; i < stack.pairs; i++) {
    layers.push({ n: INDEX.si, d: stack.period * (1 - stack.gamma) });
    layers.push({ n: INDEX.mo, d: stack.period * stack.gamma });
  }
  // Characteristic matrix of each layer: [[cos δ, −i sin δ / N], [−i N sin δ, cos δ]], δ = 2π N d / λ, with
  // N = n + ik so that the field decays in an absorbing layer.
  let m11: C = [1, 0];
  let m12: C = [0, 0];
  let m21: C = [0, 0];
  let m22: C = [1, 0];
  const minusI: C = [0, -1];
  for (const { n, d } of layers) {
    const delta: C = [(2 * Math.PI * n[0] * d) / wavelength, (2 * Math.PI * n[1] * d) / wavelength];
    const c = cos(delta);
    const s = sin(delta);
    const a12 = div(mul(minusI, s), n);
    const a21 = mul(mul(minusI, n), s);
    const n11 = add(mul(m11, c), mul(m12, a21));
    const n12 = add(mul(m11, a12), mul(m12, c));
    const n21 = add(mul(m21, c), mul(m22, a21));
    const n22 = add(mul(m21, a12), mul(m22, c));
    m11 = n11;
    m12 = n12;
    m21 = n21;
    m22 = n22;
  }
  const n0: C = [1, 0];
  const ns = INDEX.si;
  const top = sub(add(mul(n0, m11), mul(mul(n0, ns), m12)), add(m21, mul(ns, m22)));
  const bottom = add(add(mul(n0, m11), mul(mul(n0, ns), m12)), add(m21, mul(ns, m22)));
  return abs2(div(top, bottom));
}

/** Reflectivity of a single polished surface of a material, at normal incidence: |(1 − N)/(1 + N)|². */
export function surfaceReflectivity(n: C): number {
  return abs2(div(sub([1, 0], n), add([1, 0], n)));
}

/** The wavelength of peak reflectivity in [lo, hi] nm, and the peak. */
export function peak(stack: Stack, lo = 12.8, hi = 14.4): { wavelength: number; r: number } {
  let best = { wavelength: lo, r: 0 };
  for (let i = 0; i <= 320; i++) {
    const w = lo + ((hi - lo) * i) / 320;
    const r = reflectivity(stack, w);
    if (r > best.r) best = { wavelength: w, r };
  }
  return best;
}
