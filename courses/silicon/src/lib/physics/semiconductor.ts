/**
 * Semiconductor physics for Part I: materials, intrinsic carriers, doping, mobility, resistivity. Units are the
 * device physicist's: centimetres, electronvolts, volts, kelvin. Sources and simplifications: Appendix B.
 */

export const Q = 1.602176634e-19; // C
export const KB = 8.617333262e-5; // eV/K
export const EPS0 = 8.8541878128e-14; // F/cm
export const EPS_SI = 11.7 * EPS0;
export const EPS_OX = 3.9 * EPS0;
/** Silicon atoms per cm³ (8 atoms per cubic cell of side 0.5431 nm). */
export const SI_ATOMS = 8 / (0.5431e-7) ** 3;

export const kT = (T = 300): number => KB * T;

export interface Material {
  id: string;
  name: string;
  /** Band gap at 0 K and the Varshni coefficients: Eg(T) = Eg0 − αT²/(T + β). */
  eg0: number;
  alpha: number;
  beta: number;
  /** Effective densities of states at 300 K (cm⁻³), scaling as T^3/2. */
  nc: number;
  nv: number;
  note: string;
}

/** Values from Sze & Ng (2007), appendix tables; the oxide's are rough (see Appendix B). */
export const MATERIALS: Material[] = [
  { id: 'ge', name: 'Germanium', eg0: 0.7437, alpha: 4.774e-4, beta: 235, nc: 1.04e19, nv: 6.0e18, note: 'The first transistors were germanium.' },
  { id: 'si', name: 'Silicon', eg0: 1.17, alpha: 4.73e-4, beta: 636, nc: 2.86e19, nv: 2.66e19, note: 'Nearly every chip.' },
  { id: 'gaas', name: 'Gallium arsenide', eg0: 1.519, alpha: 5.405e-4, beta: 204, nc: 4.7e17, nv: 9.0e18, note: 'Radio amplifiers, lasers, LEDs.' },
  { id: 'sio2', name: 'Silicon dioxide (an insulator)', eg0: 9.0, alpha: 0, beta: 1, nc: 1e19, nv: 1e19, note: 'The glass that insulates every gate.' },
];

export const material = (id: string): Material => MATERIALS.find((m) => m.id === id) ?? MATERIALS[1]!;

export function bandGap(m: Material, T = 300): number {
  return m.eg0 - (m.alpha * T * T) / (T + m.beta);
}

/** Intrinsic carrier concentration, cm⁻³: √(Nc Nv) e^(−Eg/2kT). */
export function intrinsic(m: Material, T = 300): number {
  const s = (T / 300) ** 1.5;
  return Math.sqrt(m.nc * s * m.nv * s) * Math.exp(-bandGap(m, T) / (2 * kT(T)));
}

export const SILICON = material('si');
/** n_i of silicon at 300 K, about 1.0 × 10¹⁰ cm⁻³. */
export const NI_SI = intrinsic(SILICON, 300);

/**
 * Electron and hole concentrations for donor and acceptor concentrations (all ionised) at temperature T:
 * charge neutrality n + N_A = p + N_D with the mass-action law n p = n_i².
 */
export function carriers(nd: number, na: number, T = 300, ni = intrinsic(SILICON, T)): { n: number; p: number } {
  const net = nd - na;
  const root = Math.sqrt((net / 2) ** 2 + ni * ni);
  if (net >= 0) {
    const n = net / 2 + root;
    return { n, p: (ni * ni) / n };
  }
  const p = -net / 2 + root;
  return { n: (ni * ni) / p, p };
}

/** Fermi level relative to the intrinsic level, eV: E_F − E_i = kT ln(n/n_i). */
export function fermiOffset(n: number, ni = NI_SI, T = 300): number {
  return kT(T) * Math.log(n / ni);
}

/**
 * Low-field mobility in silicon at 300 K (cm²/V·s) against total ionised impurity concentration: the
 * Caughey–Thomas fit, μ = μmin + (μmax − μmin) / (1 + (N/Nref)^α).
 */
export function mobility(carrier: 'n' | 'p', nTotal: number): number {
  const [min, max, ref, a] = carrier === 'n' ? [68.5, 1414, 9.2e16, 0.711] : [44.9, 470.5, 2.23e17, 0.719];
  return min + (max - min) / (1 + (nTotal / ref) ** a);
}

/** Resistivity of doped silicon at 300 K, Ω·cm. */
export function resistivity(nd: number, na: number): number {
  const { n, p } = carriers(nd, na);
  const total = nd + na;
  return 1 / (Q * (n * mobility('n', total) + p * mobility('p', total)));
}

/** Diffusion coefficient from mobility (Einstein relation), cm²/s. */
export const diffusivity = (mu: number, T = 300): number => mu * kT(T);

/** Format a number as m × 10ⁿ with Unicode superscripts. */
export function sci(v: number, digits = 2): string {
  if (v === 0) return '0';
  if (!Number.isFinite(v)) return '∞';
  const e = Math.floor(Math.log10(Math.abs(v)));
  if (e >= -2 && e <= 3) return v.toPrecision(digits + 1).replace(/\.?0+$/, '');
  const m = v / 10 ** e;
  const sup = String(e)
    .split('')
    .map((c) => (c === '-' ? '⁻' : '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(c)]))
    .join('');
  const ms = m.toFixed(digits - 1).replace(/\.?0+$/, '');
  return ms === '1' ? `10${sup}` : `${ms} × 10${sup}`;
}
