/**
 * Chemical-mechanical polishing of an insulator deposited over a layer of wires, with a pattern-density model
 * in the style of Stine and colleagues: the pad presses on the raised areas over the wires, which polish faster
 * the fewer of them there are (the same pressure on less area), until the local steps are gone; then everything
 * polishes at the blanket rate. The pad is stiff, so "how many raised areas" means the density of wires
 * averaged over a planarisation length. All heights in nm, positions in µm.
 */

export interface Region {
  from: number; // µm
  to: number; // µm
  density: number; // fraction of the area covered by wires
  name: string;
}

/** A 24 mm strip across a large die: a memory array, empty space, sparse logic, dense logic. */
export const REGIONS: Region[] = [
  { from: 0, to: 6000, density: 0.5, name: 'memory array' },
  { from: 6000, to: 11000, density: 0, name: 'empty' },
  { from: 11000, to: 17000, density: 0.15, name: 'sparse logic' },
  { from: 17000, to: 24000, density: 0.35, name: 'dense logic' },
];

export const STRIP = 24000; // µm
export const STEP = 400; // nm: the wires' height, and so the step in the insulator deposited over them
export const COVER = 700; // nm of insulator deposited over the wires
export const PLANARISATION = 2000; // µm: the width of the pad's averaging (illustrative)
/** Dummy fill: shapes added to empty and sparse areas to bring every region up to this density. */
export const FILL_DENSITY = 0.4;

/** Wires drawn at `period` µm (far coarser than real ones), real and dummy, as [from, to] in µm. */
export function pattern(regions: Region[], fill: boolean, period: number): { from: number; to: number; dummy: boolean }[] {
  const out: { from: number; to: number; dummy: boolean }[] = [];
  for (const r of regions) {
    for (let x = r.from; x + period <= r.to + 1e-9; x += period) {
      const real = r.density * period;
      if (real > 0) out.push({ from: x + (period - real) / 2, to: x + (period + real) / 2, dummy: false });
      const extra = fill ? Math.max(0, FILL_DENSITY - r.density) * period : 0;
      if (extra > 0) {
        // Split the dummy shapes either side of the real wire.
        const gap = (period - real - extra) / 4;
        out.push({ from: x + gap, to: x + gap + extra / 2, dummy: true });
        out.push({ from: x + period - gap - extra / 2, to: x + period - gap, dummy: true });
      }
    }
  }
  return out;
}

export function densityAt(regions: Region[], x: number, fill: boolean): number {
  const r = regions.find((g) => x >= g.from && x < g.to) ?? regions.at(-1)!;
  return fill ? Math.max(r.density, FILL_DENSITY) : r.density;
}

/** The density seen by the pad: the local density averaged with a Gaussian of width `length` µm. */
export function effectiveDensity(regions: Region[], fill: boolean, length = PLANARISATION, samples = 240): { x: number; d: number; rho: number }[] {
  const xs = Array.from({ length: samples }, (_, i) => ((i + 0.5) * STRIP) / samples);
  const d = xs.map((x) => densityAt(regions, x, fill));
  return xs.map((x) => {
    let w = 0;
    let s = 0;
    xs.forEach((x2, j) => {
      const k = Math.exp(-(((x2 - x) / length) ** 2) / 2);
      w += k;
      s += k * d[j]!;
    });
    return { x, rho: s / w };
  }).map((p, i) => ({ ...p, d: d[i]! }));
}

/**
 * Heights of the insulator's surface after removing `removed` nm of blanket-equivalent material, relative to
 * the top of the insulator over the wires before polishing. `up` is over a wire, `down` between wires.
 */
export function polished(rho: number, removed: number, step = STEP): { up: number; down: number } {
  if (rho <= 1e-9) return { up: -step - removed, down: -step - removed };
  if (removed < rho * step) return { up: -removed / rho, down: -step };
  const h = -removed - step * (1 - rho);
  return { up: h, down: h };
}

/** The range of surface heights across the strip (the highest point minus the lowest). */
export function heightRange(profile: { d: number; rho: number }[], removed: number, step = STEP): number {
  let hi = -Infinity;
  let lo = Infinity;
  for (const { d, rho } of profile) {
    const { up, down } = polished(rho, removed, step);
    // Where there are no wires there is no raised area, only the level between wires.
    const top = d > 0 ? up : down;
    hi = Math.max(hi, top, d < 1 ? down : top);
    lo = Math.min(lo, top, d < 1 ? down : top);
  }
  return hi - lo;
}
