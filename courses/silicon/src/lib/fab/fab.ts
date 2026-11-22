/**
 * Models for Part IV: crystal growth, oxidation, implantation, etching, wafers and yield. Each is the textbook
 * model in its simplest useful form; Appendix B lists the sources and simplifications.
 */

const KB = 8.617333262e-5; // eV/K

// ───────────────────────── Crystal growth ─────────────────────────

/** Equilibrium segregation coefficients in silicon: dopant in the solid ÷ dopant in the melt (Sze & Ng). */
export const SEGREGATION: Record<string, { k: number; type: 'p' | 'n'; name: string }> = {
  B: { k: 0.8, type: 'p', name: 'Boron' },
  P: { k: 0.35, type: 'n', name: 'Phosphorus' },
  As: { k: 0.3, type: 'n', name: 'Arsenic' },
  Sb: { k: 0.023, type: 'n', name: 'Antimony' },
};

/** Scheil's equation: dopant in the crystal, relative to the melt's starting concentration, at fraction solidified fs. */
export const scheil = (k: number, fs: number) => k * Math.pow(Math.max(1e-9, 1 - fs), k - 1);

// ───────────────────────── Wafers and dies ─────────────────────────

export interface DieGrid {
  dies: { x: number; y: number; whole: boolean }[];
  whole: number;
}

/**
 * Lay a grid of dies (mm) over a wafer of diameter d (mm), excluding an edge ring; a die counts if all four
 * corners are within the usable radius. The grid is offset by (ox, oy) die widths.
 */
export function dieGrid(d: number, w: number, h: number, edge = 3, ox = 0.5, oy = 0.5): DieGrid {
  const R = d / 2;
  const r = R - edge;
  const dies: DieGrid['dies'] = [];
  const nx = Math.ceil(R / w) + 1;
  const ny = Math.ceil(R / h) + 1;
  for (let i = -nx; i <= nx; i++)
    for (let j = -ny; j <= ny; j++) {
      const x0 = (i - ox) * w;
      const y0 = (j - oy) * h;
      const corners = [
        [x0, y0],
        [x0 + w, y0],
        [x0, y0 + h],
        [x0 + w, y0 + h],
      ];
      const inR = corners.filter(([x, y]) => Math.hypot(x!, y!) <= R).length;
      if (inR === 0) continue;
      dies.push({ x: x0, y: y0, whole: corners.every(([x, y]) => Math.hypot(x!, y!) <= r) });
    }
  return { dies, whole: dies.filter((x) => x.whole).length };
}

/** The usual estimate of whole dies per wafer: wafer area over die area, less a term for the edge. */
export const diesPerWaferFormula = (d: number, area: number) => (Math.PI * (d / 2) ** 2) / area - (Math.PI * d) / Math.sqrt(2 * area);

// ───────────────────────── Yield ─────────────────────────

/** Fraction of good dies for die area A (cm²) and defect density D (per cm²). */
export const yieldPoisson = (a: number, d: number) => Math.exp(-a * d);
export const yieldMurphy = (a: number, d: number) => (a * d === 0 ? 1 : ((1 - Math.exp(-a * d)) / (a * d)) ** 2);
/** Negative binomial (clustered defects), cluster parameter α: small α means strongly clustered. */
export const yieldNegBinomial = (a: number, d: number, alpha: number) => Math.pow(1 + (a * d) / alpha, -alpha);

// ───────────────────────── Oxidation ─────────────────────────

export type Ambient = 'dry' | 'wet';

/**
 * Deal–Grove coefficients at temperature T (°C): B (µm²/h) and B/A (µm/h), for (100) silicon (B/A divided by
 * 1.68 from the (111) values), and τ (h) for an initial oxide (25 nm for dry oxidation, none for wet).
 */
export function dealGrove(ambient: Ambient, tC: number): { B: number; BA: number; A: number; tau: number } {
  const T = tC + 273.15;
  const kT = KB * T;
  const [c1, e1, c2, e2] = ambient === 'dry' ? [772, 1.23, 6.23e6, 2.0] : [386, 0.78, 1.63e8, 2.05];
  const B = c1 * Math.exp(-e1 / kT);
  const BA = (c2 * Math.exp(-e2 / kT)) / 1.68;
  const A = B / BA;
  const x0 = ambient === 'dry' ? 0.025 : 0;
  return { B, BA, A, tau: (x0 * x0 + A * x0) / B };
}

/** Oxide thickness (µm) after t hours: the root of x² + A x = B (t + τ). */
export function oxideThickness(ambient: Ambient, tC: number, hours: number): number {
  const { A, B, tau } = dealGrove(ambient, tC);
  return (A / 2) * (Math.sqrt(1 + (4 * B * (hours + tau)) / (A * A)) - 1);
}

/** Thickness of silicon consumed to grow an oxide of thickness x: about 44 % of it. */
export const SILICON_CONSUMED = 0.44;

// ───────────────────────── Ion implantation ─────────────────────────

/** Projected range and straggle in silicon (nm) at 10, 20, 50 and 100 keV, from LSS-theory tables (approximate). */
const RANGE: Record<'B' | 'P' | 'As', { e: number[]; rp: number[]; drp: number[] }> = {
  B: { e: [10, 20, 50, 100], rp: [33.3, 66.2, 160.8, 299.4], drp: [17.1, 28.3, 50.4, 71.0] },
  P: { e: [10, 20, 50, 100], rp: [13.9, 25.3, 60.7, 123.8], drp: [6.9, 11.9, 25.6, 45.6] },
  As: { e: [10, 20, 50, 100], rp: [9.7, 15.9, 32.2, 58.2], drp: [3.6, 5.9, 11.8, 20.7] },
};

function loglog(xs: number[], ys: number[], x: number): number {
  const lx = Math.log(x);
  let i = 0;
  while (i < xs.length - 2 && x > xs[i + 1]!) i++;
  const [x0, x1, y0, y1] = [Math.log(xs[i]!), Math.log(xs[i + 1]!), Math.log(ys[i]!), Math.log(ys[i + 1]!)];
  return Math.exp(y0 + ((y1 - y0) * (lx - x0)) / (x1 - x0));
}

export function implantRange(ion: 'B' | 'P' | 'As', keV: number): { rp: number; drp: number } {
  const t = RANGE[ion];
  return { rp: loglog(t.e, t.rp, keV), drp: loglog(t.e, t.drp, keV) };
}

/** Intrinsic diffusivity (cm²/s) at T (°C): D₀ exp(−Eₐ/kT). */
const DIFF: Record<'B' | 'P' | 'As', [number, number]> = { B: [0.76, 3.46], P: [3.85, 3.66], As: [22.9, 4.1] };
export const diffusivity = (ion: 'B' | 'P' | 'As', tC: number) => DIFF[ion][0] * Math.exp(-DIFF[ion][1] / (KB * (tC + 273.15)));

/**
 * The implanted profile (cm⁻³ against depth in nm): a Gaussian of dose Q (cm⁻²) at the projected range,
 * broadened by an anneal of t seconds at T °C (its variance grows by 2Dt). Diffusion past the surface is ignored.
 */
export function implantProfile(ion: 'B' | 'P' | 'As', keV: number, dose: number, anneal?: { tC: number; seconds: number }): (xNm: number) => number {
  const { rp, drp } = implantRange(ion, keV);
  const spread = anneal ? 2 * diffusivity(ion, anneal.tC) * anneal.seconds * 1e14 : 0; // cm² → nm²
  const s = Math.sqrt(drp * drp + spread);
  const peak = dose / (Math.sqrt(2 * Math.PI) * s * 1e-7);
  return (x: number) => peak * Math.exp(-((x - rp) ** 2) / (2 * s * s));
}

/** Depth (nm) where the profile falls to the background concentration (the junction), searching beyond the peak. */
export function junctionDepth(profile: (x: number) => number, background: number, maxNm = 2000): number | null {
  let prev = profile(0);
  let peakPassed = false;
  for (let x = 0.5; x <= maxNm; x += 0.5) {
    const v = profile(x);
    if (v < prev) peakPassed = true;
    if (peakPassed && v < background) return x;
    prev = v;
  }
  return null;
}

// ───────────────────────── Etching ─────────────────────────

export interface EtchResult {
  /** Depth etched (nm) at lateral position x (nm, 0 at the centre of the opening), clipped at the film thickness. */
  depthAt: (x: number) => number;
  /** Undercut beneath the mask edge at the top of the film (nm). */
  undercut: number;
  /** Whether the film has been cleared at the centre. */
  cleared: boolean;
  /** Thickness lost from the mask and from the layer underneath (nm). */
  maskLoss: number;
  stopLoss: number;
}

/**
 * A simple etch-front model: material etches vertically at rate r and laterally at a·r (a = 0: perfectly
 * anisotropic; a = 1: isotropic). After time t the etched region is every point within the ellipse of semi-axes
 * (a·r·t, r·t) of the mask opening at the film's top surface, limited to the film.
 */
export function etch(opening: number, film: number, rate: number, a: number, t: number, maskSelectivity: number, stopSelectivity: number): EtchResult {
  const d = rate * t;
  const half = opening / 2;
  const depthAt = (x: number) => {
    const u = Math.abs(x) - half;
    if (u <= 0) return Math.min(film, d);
    if (a === 0 || u >= a * d) return 0;
    return Math.min(film, d * Math.sqrt(1 - (u / (a * d)) ** 2));
  };
  const tClear = film / rate;
  return { depthAt, undercut: a * d, cleared: d >= film, maskLoss: d / maskSelectivity, stopLoss: t > tClear ? (rate * (t - tClear)) / stopSelectivity : 0 };
}
