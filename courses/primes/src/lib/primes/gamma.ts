/**
 * The Gamma function for complex arguments: log Γ by recurrence + Stirling's series, Γ by
 * exponentiation (with the reflection formula on the left half-plane).
 */
import { add, c, div, exp, log, mul, scale, sin, sub, type Complex } from './complex';

/** B_{2k} for k = 1..8. */
const B2K = [1 / 6, -1 / 30, 1 / 42, -1 / 30, 5 / 66, -691 / 2730, 7 / 6, -3617 / 510];
const HALF_LOG_2PI = 0.9189385332046727;

/**
 * log Γ(z) for Re z > 0, on the branch that is continuous in z and real on the positive real axis
 * (so Im log Γ(1/4 + it/2) is the continuous argument used in the Riemann–Siegel θ function).
 */
export function lnGamma(z: Complex): Complex {
  if (z.re <= 0) throw new RangeError('lnGamma: Re z must be positive');
  // Shift to |z| large: log Γ(z) = log Γ(z + n) − Σ_{k<n} log(z + k).
  let shift = c(0);
  let w = z;
  while (w.re < 12) {
    shift = add(shift, log(w));
    w = add(w, c(1));
  }
  // Stirling: (w − ½) log w − w + ½ log 2π + Σ B_2k / (2k(2k−1) w^(2k−1)).
  const lw = log(w);
  let s = add(sub(mul(sub(w, c(0.5)), lw), w), c(HALF_LOG_2PI));
  const w2 = mul(w, w);
  let wp = w; // w^(2k−1)
  for (let k = 1; k <= B2K.length; k++) {
    s = add(s, scale(div(c(1), wp), B2K[k - 1]! / (2 * k * (2 * k - 1))));
    wp = mul(wp, w2);
  }
  return sub(s, shift);
}

/** Γ(z) for any complex z that is not a pole (0, −1, −2, …). */
export function gamma(z: Complex): Complex {
  if (z.re < 0.5) {
    // Reflection: Γ(z) = π / (sin(πz) Γ(1 − z)).
    const s = sin(scale(z, Math.PI));
    return div(c(Math.PI), mul(s, gamma(sub(c(1), z))));
  }
  return exp(lnGamma(z));
}

/** Γ(x) for real x (not a pole). */
export function gammaReal(x: number): number {
  return gamma(c(x)).re;
}
