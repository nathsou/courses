import { describe, expect, test } from 'vitest';
import { SEGREGATION, dieGrid, diesPerWaferFormula, etch, implantProfile, implantRange, junctionDepth, oxideThickness, scheil, yieldMurphy, yieldNegBinomial, yieldPoisson } from './fab';
import { gratingImage, maskImage, minPitch, printedLine } from './litho';

describe('crystal growth', () => {
  test('Scheil: the first solid has k times the melt’s doping; it rises along the ingot when k < 1', () => {
    expect(scheil(SEGREGATION.B!.k, 0)).toBeCloseTo(0.8, 9);
    expect(scheil(SEGREGATION.P!.k, 0.9)).toBeCloseTo(0.35 * 0.1 ** -0.65, 9);
    expect(scheil(1, 0.5)).toBe(1);
  });
});

describe('wafers and yield', () => {
  test('whole dies on a 300 mm wafer agree with the usual formula within a few per cent', () => {
    const g = dieGrid(300, 10, 10);
    const f = diesPerWaferFormula(300, 100);
    expect(Math.abs(g.whole - f) / f).toBeLessThan(0.06);
  });
  test('yield models: Poisson is the most pessimistic; clustering helps', () => {
    expect(yieldPoisson(1, 0.1)).toBeCloseTo(0.905, 3);
    expect(yieldMurphy(1, 1)).toBeGreaterThan(yieldPoisson(1, 1));
    expect(yieldNegBinomial(1, 1, 1e6)).toBeCloseTo(yieldPoisson(1, 1), 4);
    expect(yieldNegBinomial(1, 1, 0.5)).toBeGreaterThan(yieldMurphy(1, 1));
  });
});

describe('oxidation', () => {
  test('an hour at 1000 °C: about 60 nm dry, about 0.4 µm wet', () => {
    const dry = oxideThickness('dry', 1000, 1);
    const wet = oxideThickness('wet', 1000, 1);
    expect(dry).toBeGreaterThan(0.04);
    expect(dry).toBeLessThan(0.07);
    expect(wet).toBeGreaterThan(0.35);
    expect(wet).toBeLessThan(0.45);
  });
  test('thick oxides grow as the square root of time', () => {
    const a = oxideThickness('wet', 1100, 16);
    const b = oxideThickness('wet', 1100, 64);
    expect(b / a).toBeGreaterThan(1.8);
    expect(b / a).toBeLessThan(2.05);
  });
});

describe('implantation', () => {
  test('ranges interpolate the table; heavier ions stop sooner', () => {
    expect(implantRange('B', 50).rp).toBeCloseTo(160.8, 1);
    expect(implantRange('As', 50).rp).toBeLessThan(implantRange('P', 50).rp);
  });
  test('the profile integrates to the dose; annealing deepens the junction', () => {
    const f = implantProfile('B', 30, 1e15);
    let sum = 0;
    for (let x = 0; x < 2000; x += 0.5) sum += f(x) * 0.5e-7;
    expect(sum / 1e15).toBeCloseTo(1, 2);
    const j0 = junctionDepth(f, 1e16)!;
    const j1 = junctionDepth(implantProfile('B', 30, 1e15, { tC: 1000, seconds: 1800 }), 1e16)!;
    expect(j1).toBeGreaterThan(j0 + 50);
  });
});

describe('etching', () => {
  test('anisotropic etches go straight down; isotropic ones undercut by their depth', () => {
    const a = etch(100, 200, 1, 0, 150, 5, 20);
    expect(a.depthAt(0)).toBe(150);
    expect(a.depthAt(60)).toBe(0);
    const i = etch(100, 200, 1, 1, 150, 5, 20);
    expect(i.undercut).toBe(150);
    expect(i.depthAt(50 + 75)).toBeCloseTo(150 * Math.sqrt(1 - 0.25), 9);
    expect(etch(100, 200, 1, 0, 250, 5, 20).stopLoss).toBeCloseTo(2.5, 9);
  });
});

describe('lithography', () => {
  const arf = { lambda: 193, NA: 1.35, sigma: 0.5 };
  test('the smallest pitch is λ / (NA (1 + σ))', () => {
    expect(minPitch({ ...arf, sigma: 1 })).toBeCloseTo(71.5, 1);
  });
  test('a coarse grating prints close to its mask size with a threshold near the edge intensity', () => {
    const img = gratingImage(arf, 600, 300);
    expect(Math.abs(printedLine(img, 600, 0.3) - 300)).toBeLessThan(25);
  });
  test('below the smallest pitch only the zeroth order passes and the image is flat', () => {
    const img = gratingImage(arf, 0.9 * minPitch(arf), 0.45 * minPitch(arf));
    expect(Math.max(...img) - Math.min(...img)).toBeLessThan(1e-9);
  });
  test('defocus lowers the contrast of a fine grating', () => {
    const c = (img: Float64Array) => (Math.max(...img) - Math.min(...img)) / (Math.max(...img) + Math.min(...img));
    expect(c(gratingImage({ ...arf, defocus: 100 }, 120, 60))).toBeLessThan(c(gratingImage(arf, 120, 60)));
  });
  test('a clear 2-D mask images to intensity 1', () => {
    const n = 32;
    const img = maskImage(new Float64Array(n * n).fill(1), n, 10, arf);
    expect(img[100]).toBeCloseTo(1, 6);
  });
});
