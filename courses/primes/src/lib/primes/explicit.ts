/**
 * Riemann's explicit formula, numerically.
 *
 *   ψ₀(x) = x − Σ_ρ x^ρ/ρ − log 2π − ½ log(1 − x^{−2})          (x > 1)
 *
 * where ψ₀ is ψ averaged at its jumps and the sum over non-trivial zeros ρ = ½ ± iγ is taken in order
 * of |γ| (assuming RH for the zeros used, which is verified far beyond any table the course ships).
 * Pairing ρ with its conjugate, each pair contributes 2 Re(x^ρ / ρ).
 */
import { primesUpTo } from './sieve';
import { li } from './count';

/** The contribution 2 Re(x^ρ/ρ) of the pair ρ = ½ ± iγ. */
export function zeroPairTerm(x: number, gamma: number): number {
  const L = Math.log(x);
  const r = Math.sqrt(x);
  // x^ρ = √x · e^{iγ log x}; 1/ρ = (½ − iγ)/(¼ + γ²).
  const cr = Math.cos(gamma * L);
  const sr = Math.sin(gamma * L);
  const d = 0.25 + gamma * gamma;
  return (2 * r * (0.5 * cr + gamma * sr)) / d;
}

/** ψ₀(x) approximated with the first `zeros.length` zero pairs. */
export function psiExplicit(x: number, zeros: readonly number[]): number {
  let s = x - Math.log(2 * Math.PI) - 0.5 * Math.log(1 - 1 / (x * x));
  for (const g of zeros) s -= zeroPairTerm(x, g);
  return s;
}

/** The exact ψ(x) (step function) at many points: returns breakpoints for plotting. */
export function psiSteps(xMax: number): { x: number; psi: number }[] {
  const out: { x: number; psi: number }[] = [{ x: 0, psi: 0 }];
  const ps = primesUpTo(Math.floor(xMax));
  const events: { x: number; v: number }[] = [];
  for (const p of ps) {
    const lp = Math.log(p);
    for (let q = p; q <= xMax; q *= p) events.push({ x: q, v: lp });
  }
  events.sort((a, b) => a.x - b.x);
  let psi = 0;
  for (const e of events) {
    psi += e.v;
    out.push({ x: e.x, psi });
  }
  return out;
}

/** ψ(x) exactly, for a single x (by sieving). */
export function psiExact(x: number): number {
  let s = 0;
  for (const p of primesUpTo(Math.floor(x))) {
    const lp = Math.log(p);
    for (let q = p; q <= x; q *= p) s += lp;
  }
  return s;
}

/**
 * Riemann's formula for π(x) through J(x) = Σ π(x^{1/n})/n:
 *   J(x) ≈ li(x) − Σ_ρ li(x^ρ) − log 2 + ∫_x^∞ dt / (t (t² − 1) log t),
 * then π(x) = Σ μ(n)/n · J(x^{1/n}). Here li(x^ρ) for the pair ρ, ρ̄ is evaluated as 2 Re Ei(ρ log x),
 * approximated by its asymptotic expansion (good once |γ log x| is moderately large).
 */
export function piExplicit(x: number, zeros: readonly number[]): number {
  const MU = [0, 1, -1, -1, 0, -1, 1, -1, 0, 0, 1, -1, 0, -1, 1, 1, 0, -1, 0, -1, 0];
  let s = 0;
  for (let n = 1; n < MU.length; n++) {
    const m = MU[n]!;
    if (!m) continue;
    const y = Math.pow(x, 1 / n);
    if (y < 2) break;
    s += (m / n) * jExplicit(y, zeros);
  }
  return s;
}

function jExplicit(x: number, zeros: readonly number[]): number {
  let s = li(x) - Math.LN2 + tailIntegral(x);
  const L = Math.log(x);
  for (const g of zeros) s -= 2 * eiRe(0.5 * L, g * L);
  return s;
}

/** Re Ei(a + ib) for b ≠ 0 via the continued fraction for E₁ (Ei(z) = −E₁(−z) ± iπ; the real part is unaffected). */
function eiRe(a: number, b: number): number {
  // E1(w) with w = −z, by the Lentz continued fraction, valid away from the negative real axis.
  const wr = -a;
  const wi = -b;
  // E1(w) = e^{−w} / (w + 1/(1 + 1/(w + 2/(1 + 2/(w + …))))) — use the even form:
  // E1(w) = e^{−w} · 1/(w + 1 − 1²/(w + 3 − 2²/(w + 5 − …)))
  let fr = 0;
  let fi = 0;
  for (let k = 60; k >= 1; k--) {
    // f = k² / (w + 2k + 1 − f)
    const dr = wr + 2 * k + 1 - fr;
    const di = wi - fi;
    const den = dr * dr + di * di;
    fr = (k * k * dr) / den;
    fi = (-k * k * di) / den;
  }
  const dr = wr + 1 - fr;
  const di = wi - fi;
  const den = dr * dr + di * di;
  const invr = dr / den;
  const invi = -di / den;
  const er = Math.exp(-wr) * Math.cos(-wi);
  const ei = Math.exp(-wr) * Math.sin(-wi);
  const e1r = er * invr - ei * invi;
  return -e1r;
}

/** ∫_x^∞ dt / (t (t² − 1) log t), by a substitution and Simpson's rule (tiny for x ≥ 2). */
function tailIntegral(x: number): number {
  // t = x e^u, u ∈ [0, ∞): dt/t = du.
  const f = (u: number) => {
    const t = x * Math.exp(u);
    return 1 / ((t * t - 1) * Math.log(t));
  };
  const n = 200;
  const U = 20;
  const h = U / n;
  let s = f(0) + f(U);
  for (let i = 1; i < n; i++) s += (i % 2 ? 4 : 2) * f(i * h);
  return (s * h) / 3;
}
