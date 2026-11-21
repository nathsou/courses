import { describe, expect, test } from 'vitest';
import { MATERIALS, NI_SI, SI_ATOMS, bandGap, carriers, fermiOffset, intrinsic, kT, material, mobility, resistivity, sci } from './semiconductor';
import { NFET, builtIn, depletion, diodeCurrent, drainCurrent, junctionAt, mosState, mosStatic, saturationCurrent, swing, vdsat } from './devices';

const rel = (a: number, b: number) => Math.abs(a - b) / Math.abs(b);

describe('materials and intrinsic carriers', () => {
  test('kT at room temperature is about 25.9 meV', () => expect(kT(300)).toBeCloseTo(0.02585, 4));
  test('band gaps at 300 K match the textbook values', () => {
    expect(bandGap(material('si'))).toBeCloseTo(1.12, 2);
    expect(bandGap(material('ge'))).toBeCloseTo(0.66, 2);
    expect(bandGap(material('gaas'))).toBeCloseTo(1.42, 2);
  });
  test('n_i: about 1e10 for silicon, 2e13 for germanium, 2e6 for gallium arsenide', () => {
    expect(rel(NI_SI, 1.0e10)).toBeLessThan(0.1);
    expect(rel(intrinsic(material('ge')), 2.0e13)).toBeLessThan(0.2);
    expect(rel(intrinsic(material('gaas')), 2.1e6)).toBeLessThan(0.25);
  });
  test('n_i of silicon roughly doubles every 8 K near room temperature', () => {
    const r = intrinsic(material('si'), 308) / intrinsic(material('si'), 300);
    expect(r).toBeGreaterThan(1.7);
    expect(r).toBeLessThan(2.3);
  });
  test('the materials are listed by gap', () => {
    const gaps = MATERIALS.map((m) => bandGap(m));
    expect([...gaps].sort((a, b) => a - b)).toEqual(gaps);
  });
  test('silicon has 5.0 × 10²² atoms per cm³', () => expect(rel(SI_ATOMS, 5.0e22)).toBeLessThan(0.01));
});

describe('doping', () => {
  test('mass-action law and neutrality', () => {
    const { n, p } = carriers(1e16, 0);
    expect(rel(n, 1e16)).toBeLessThan(1e-6);
    expect(rel(n * p, NI_SI * NI_SI)).toBeLessThan(1e-9);
    const c = carriers(1e16, 3e16);
    expect(rel(c.p, 2e16)).toBeLessThan(1e-6);
  });
  test('the Fermi level of 1e16 n-type silicon is about 0.35 eV above mid-gap', () => {
    expect(fermiOffset(1e16)).toBeCloseTo(0.357, 2);
  });
  test('mobilities: 1414 and 471 when pure, falling with doping', () => {
    expect(mobility('n', 1e12)).toBeCloseTo(1414, -1);
    expect(mobility('p', 1e12)).toBeCloseTo(470, -1);
    expect(mobility('n', 1e19)).toBeLessThan(150);
  });
  test('resistivities: pure silicon is a few × 10⁵ Ω·cm; 1e16 n-type about 0.5 Ω·cm', () => {
    expect(resistivity(0, 0)).toBeGreaterThan(2e5);
    expect(resistivity(0, 0)).toBeLessThan(5e5);
    expect(resistivity(1e16, 0)).toBeCloseTo(0.53, 1);
    expect(resistivity(0, 1e16)).toBeCloseTo(1.45, 1);
  });
});

describe('the p–n junction', () => {
  test('built-in potential of a 1e16/1e16 junction is about 0.71 V', () => expect(builtIn(1e16, 1e16)).toBeCloseTo(0.71, 1));
  test('its depletion width at zero bias is about 0.43 µm, split evenly', () => {
    const d = depletion(1e16, 1e16);
    expect(d.w * 1e4).toBeCloseTo(0.43, 1);
    expect(d.xp).toBeCloseTo(d.xn, 12);
  });
  test('a one-sided junction depletes into its lightly doped side', () => {
    const d = depletion(1e18, 1e15);
    expect(d.xn / d.xp).toBeCloseTo(1000, 0);
  });
  test('reverse bias widens the depletion region as √(V_bi − V)', () => {
    const a = depletion(1e16, 1e16, 0);
    const b = depletion(1e16, 1e16, -3 * a.vbi);
    expect(b.w / a.w).toBeCloseTo(2, 5);
  });
  test('the potential is continuous and reaches V_bi − V', () => {
    const d = depletion(1e16, 2e16, 0.2);
    expect(junctionAt(1e16, 2e16, 0.2, -1e-12).phi).toBeCloseTo(junctionAt(1e16, 2e16, 0.2, 1e-12).phi, 6);
    expect(junctionAt(1e16, 2e16, 0.2, d.xn * 2).phi).toBeCloseTo(d.vbi - 0.2, 9);
  });
  test('diode: 60 mV per decade, and a saturation current around 1e-15 A for a 100 µm square', () => {
    const is = saturationCurrent(1e16, 1e16);
    expect(is).toBeGreaterThan(3e-16);
    expect(is).toBeLessThan(5e-15);
    const r = diodeCurrent(is, 0.6595) / diodeCurrent(is, 0.6);
    expect(r).toBeCloseTo(10, 0);
    expect(diodeCurrent(is, -5)).toBeCloseTo(-is, 20);
  });
});

describe('the MOS structure', () => {
  const p = { na: 1e17, tox: 5e-7, gate: 'midgap' as const };
  test('threshold: 2φF plus the depletion charge over C_ox, shifted by the work functions', () => {
    const s = mosStatic(p);
    expect(s.phiF).toBeCloseTo(0.417, 2);
    expect(s.vt - s.vfb).toBeCloseTo(0.834 + 0.241, 2);
  });
  test('regimes follow the gate voltage', () => {
    const s = mosStatic(p);
    expect(mosState(p, s.vfb - 1).regime).toBe('accumulation');
    expect(mosState(p, (s.vfb + s.vt) / 2).regime).toBe('depletion');
    expect(mosState(p, s.vt + 1).regime).toBe('strong inversion');
  });
  test('above threshold the depletion width stops growing and electrons take the extra charge', () => {
    const s = mosStatic(p);
    const a = mosState(p, s.vt + 0.5);
    const b = mosState(p, s.vt + 1.5);
    expect(b.w / a.w).toBeLessThan(1.05);
    expect(Math.abs(b.qinv - a.qinv)).toBeCloseTo(s.cox * 1.0, 7);
  });
  test('the flat-band surface is flat', () => {
    expect(mosState(p, mosStatic(p).vfb).psi).toBeCloseTo(0, 6);
  });
});

describe('the MOSFET', () => {
  test('square law in saturation, with the slope factor', () => {
    const f = { ...NFET, lambda: 0 };
    const id = drainCurrent(f, 1.4, 1.8);
    expect(rel(id, (f.beta * 1.0 ** 2) / (2 * f.n))).toBeLessThan(0.02);
  });
  test('linear region at small V_DS: a resistor', () => {
    const f = { ...NFET, lambda: 0 };
    const a = drainCurrent(f, 1.4, 0.01);
    expect(rel(a, f.beta * 1.0 * 0.01)).toBeLessThan(0.02);
    expect(vdsat(f, 1.4)).toBeCloseTo(1 / f.n, 9);
  });
  test('subthreshold: one decade per n·60 mV', () => {
    const a = drainCurrent(NFET, -0.2, 1);
    const b = drainCurrent(NFET, -0.2 + swing(NFET) / 1000, 1);
    expect(b / a).toBeCloseTo(10, 1);
  });
  test('no current at V_DS = 0, and symmetry when V_DS is negative', () => {
    expect(drainCurrent(NFET, 1, 0)).toBeCloseTo(0, 15);
    expect(drainCurrent(NFET, 1, -0.2)).toBeLessThan(0);
  });
});

test('scientific formatting', () => {
  expect(sci(1.0e10)).toBe('10¹⁰');
  expect(sci(2.4e13)).toBe('2.4 × 10¹³');
  expect(sci(0.0259)).toBe('0.0259');
  expect(sci(3.2e-15)).toBe('3.2 × 10⁻¹⁵');
  expect(sci(9.99999e15)).toBe('10¹⁶');
  expect(sci(9776)).toBe('9776');
  expect(sci(0.5273, 3)).toBe('0.5273');
});
