/**
 * Devices for Part I: the abrupt p–n junction (depletion approximation, Shockley diode) and the MOS structure
 * (exact charge–potential relation of the MOS capacitor, threshold voltage, and a MOSFET current model that is
 * continuous from subthreshold to strong inversion). Units: cm, V, A, F.
 */
import { EPS_OX, EPS_SI, NI_SI, Q, carriers, diffusivity, kT, mobility } from './semiconductor';

// ───────────────────────── p–n junction ─────────────────────────

/** Built-in potential of an abrupt junction, V: (kT/q) ln(N_A N_D / n_i²). */
export function builtIn(na: number, nd: number, T = 300, ni = NI_SI): number {
  return kT(T) * Math.log((na * nd) / (ni * ni));
}

export interface Depletion {
  vbi: number;
  /** Total width and its parts on the p and n sides, cm. */
  w: number;
  xp: number;
  xn: number;
  /** Peak field at the metallurgical junction, V/cm. */
  emax: number;
}

/** The depletion region at applied voltage V (forward positive). Valid for V below the built-in potential. */
export function depletion(na: number, nd: number, v = 0, T = 300): Depletion {
  const vbi = builtIn(na, nd, T);
  const across = Math.max(vbi - v, 1e-3);
  const w = Math.sqrt(((2 * EPS_SI * across) / Q) * ((na + nd) / (na * nd)));
  const xp = (w * nd) / (na + nd);
  const xn = (w * na) / (na + nd);
  return { vbi, w, xp, xn, emax: (Q * na * xp) / EPS_SI };
}

/**
 * Charge density (in units of q, cm⁻³), field (V/cm, positive pointing from n to p is reported as a magnitude)
 * and potential (V, zero in the neutral p region) at position x (cm; the junction is at 0, p on the left).
 */
export function junctionAt(na: number, nd: number, v: number, x: number): { rho: number; e: number; phi: number } {
  const d = depletion(na, nd, v);
  const total = Math.max(d.vbi - v, 1e-3);
  if (x <= -d.xp) return { rho: 0, e: 0, phi: 0 };
  if (x >= d.xn) return { rho: 0, e: 0, phi: total };
  if (x < 0) {
    const s = x + d.xp;
    return { rho: -na, e: (Q * na * s) / EPS_SI, phi: (Q * na * s * s) / (2 * EPS_SI) };
  }
  const s = d.xn - x;
  return { rho: nd, e: (Q * nd * s) / EPS_SI, phi: total - (Q * nd * s * s) / (2 * EPS_SI) };
}

/** Minority-carrier lifetime used for diffusion lengths, s (a typical value for good silicon). */
export const LIFETIME = 1e-6;

/** Saturation current of a long-base diode of area A (cm²): q A n_i² (D_n/(L_n N_A) + D_p/(L_p N_D)). */
export function saturationCurrent(na: number, nd: number, area = 1e-4, T = 300, tau = LIFETIME): number {
  const dn = diffusivity(mobility('n', na), T);
  const dp = diffusivity(mobility('p', nd), T);
  const ln = Math.sqrt(dn * tau);
  const lp = Math.sqrt(dp * tau);
  return Q * area * NI_SI * NI_SI * (dn / (ln * na) + dp / (lp * nd));
}

/** Shockley's diode equation, A. */
export function diodeCurrent(is: number, v: number, T = 300, ideality = 1): number {
  return is * Math.expm1(v / (ideality * kT(T)));
}

// ───────────────────────── MOS capacitor ─────────────────────────

export type GateMaterial = 'n+poly' | 'p+poly' | 'midgap';

export interface MosParams {
  /** Substrate acceptor concentration, cm⁻³ (p-type substrate: an nMOS structure). */
  na: number;
  /** Oxide thickness, cm. */
  tox: number;
  gate: GateMaterial;
  T?: number;
}

export const GATES: Record<GateMaterial, string> = {
  'n+poly': 'n⁺ polysilicon',
  'p+poly': 'p⁺ polysilicon',
  midgap: 'a metal with a mid-gap work function',
};

export interface MosStatic {
  cox: number;
  phiF: number;
  phiMS: number;
  vfb: number;
  vt: number;
  /** Depletion charge at threshold, C/cm² (negative: ionised acceptors). */
  qdepT: number;
}

/** Flat-band and threshold voltages of an ideal MOS structure on p-type silicon (no oxide charge). */
export function mosStatic(p: MosParams): MosStatic {
  const T = p.T ?? 300;
  const ut = kT(T);
  const phiF = ut * Math.log(p.na / NI_SI);
  const half = 1.12 / 2;
  const phiMS = p.gate === 'n+poly' ? -(half + phiF) : p.gate === 'p+poly' ? half - phiF : -phiF;
  const cox = EPS_OX / p.tox;
  const qdepT = -Math.sqrt(2 * EPS_SI * Q * p.na * 2 * phiF);
  return { cox, phiF, phiMS, vfb: phiMS, vt: phiMS + 2 * phiF - qdepT / cox, qdepT };
}

/**
 * Total semiconductor charge per area (C/cm²) for surface potential ψ (V), from Poisson's equation. With
 * `electrons` false, the minority electrons are left out (holes and ionised acceptors only).
 */
export function surfaceCharge(p: MosParams, psi: number, electrons = true): number {
  const ut = kT(p.T ?? 300);
  const u = psi / ut;
  const ratio = electrons ? (NI_SI / p.na) ** 2 : 0;
  const f = Math.sqrt(Math.max(0, Math.exp(-u) + u - 1 + ratio * (Math.exp(u) - u - 1)));
  return -Math.sign(psi) * Math.sqrt(2 * EPS_SI * Q * p.na * ut) * f;
}

export interface MosState {
  vg: number;
  /** Surface potential, V (band bending at the silicon surface). */
  psi: number;
  regime: 'accumulation' | 'depletion' | 'weak inversion' | 'strong inversion';
  /** Charges per area, C/cm²: total in the silicon, ionised acceptors (depletion), and mobile electrons. */
  qs: number;
  qdep: number;
  qinv: number;
  /** Depletion width, cm. */
  w: number;
  /** Electron concentration at the surface, cm⁻³. */
  nSurface: number;
}

/** Solve V_G = V_FB + ψ − Q_s(ψ)/C_ox for the surface potential, and split the charge. */
export function mosState(p: MosParams, vg: number): MosState {
  const s = mosStatic(p);
  const g = (psi: number) => s.vfb + psi - surfaceCharge(p, psi) / s.cox - vg;
  let lo = -1.5;
  let hi = 2.5;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (g(mid) > 0) hi = mid;
    else lo = mid;
  }
  const psi = (lo + hi) / 2;
  const qs = surfaceCharge(p, psi);
  const w = psi > 0 ? Math.sqrt((2 * EPS_SI * psi) / (Q * p.na)) : 0;
  const qdep = -Q * p.na * w;
  // The electrons' share: the exact charge minus the exact charge without electrons.
  const qinv = psi > 0 ? Math.min(0, qs - surfaceCharge(p, psi, false)) : 0;
  const ut = kT(p.T ?? 300);
  const nSurface = ((NI_SI * NI_SI) / p.na) * Math.exp(psi / ut);
  const regime = psi < 0 ? 'accumulation' : psi < s.phiF ? 'depletion' : psi < 2 * s.phiF ? 'weak inversion' : 'strong inversion';
  return { vg, psi, regime, qs, qdep, qinv, w, nSurface };
}

/** Low-frequency capacitance per area (F/cm²): the oxide in series with the silicon's dQ/dψ. */
export function mosCapacitance(p: MosParams, vg: number): number {
  const s = mosStatic(p);
  const h = 1e-4;
  const a = mosState(p, vg - h);
  const b = mosState(p, vg + h);
  const cs = Math.abs((b.qs - a.qs) / (b.psi - a.psi || 1e-12));
  return (s.cox * cs) / (s.cox + cs);
}

// ───────────────────────── MOSFET ─────────────────────────

export interface Fet {
  /** Threshold voltage magnitude, V. */
  vt: number;
  /** β = μ C_ox W/L, A/V². */
  beta: number;
  /** Slope factor (1 for an ideal gate; 1.2–1.5 for planar transistors, closer to 1 for FinFETs). */
  n: number;
  /** Channel-length modulation, 1/V. */
  lambda: number;
}

const softplus = (x: number) => (x > 30 ? x : Math.log1p(Math.exp(x)));

/**
 * Drain current (A) of an n-channel transistor for V_GS and V_DS (V_DS ≥ 0), continuous from subthreshold to
 * strong inversion (the interpolation of the EKV model). For a p-channel transistor pass V_SG and V_SD.
 * In strong inversion and saturation it reduces to the square law β(V_GS − V_T)²/2n.
 */
export function drainCurrent(f: Fet, vgs: number, vds: number, T = 300): number {
  if (vds < 0) return -drainCurrent(f, vgs - vds, -vds, T);
  const ut = kT(T);
  const vp = (vgs - f.vt) / f.n;
  const fwd = softplus(vp / (2 * ut)) ** 2;
  const rev = softplus((vp - vds) / (2 * ut)) ** 2;
  return 2 * f.n * f.beta * ut * ut * (fwd - rev) * (1 + f.lambda * vds);
}

/** Saturation voltage in strong inversion, V: where the channel pinches off at the drain. */
export const vdsat = (f: Fet, vgs: number): number => Math.max(0, (vgs - f.vt) / f.n);

/** Subthreshold swing, mV per decade of current: n (kT/q) ln 10. */
export const swing = (f: Fet, T = 300): number => f.n * kT(T) * Math.LN10 * 1000;

/** The course's illustrative transistors (orders of magnitude of a mature planar process; Appendix B). */
export const NFET: Fet = { vt: 0.4, beta: 600e-6, n: 1.3, lambda: 0.08 };
export const PFET: Fet = { vt: 0.4, beta: 240e-6, n: 1.3, lambda: 0.08 };

export { carriers };
