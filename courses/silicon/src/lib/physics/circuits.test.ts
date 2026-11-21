import { describe, expect, test } from 'vitest';
import {
  INVERTER,
  bestStages,
  chainDelay,
  conducts,
  dual,
  fallingTransient,
  gateTable,
  inverterDelay,
  latchSettle,
  netToString,
  noiseMargins,
  parseNet,
  scaled,
  seriesDepth,
  sram,
  switchingThreshold,
  transistorCount,
  vout,
} from './circuits';
import { PFET } from './devices';

describe('the inverter', () => {
  test('rails: a 0 in gives V_DD out, and V_DD in gives 0', () => {
    expect(vout(INVERTER, 0)).toBeGreaterThan(0.999);
    expect(vout(INVERTER, 1)).toBeLessThan(0.001);
  });
  test('a balanced inverter switches at V_DD/2, with symmetric noise margins and gain', () => {
    expect(switchingThreshold(INVERTER)).toBeCloseTo(0.5, 3);
    const nm = noiseMargins(INVERTER);
    expect(nm.nmh).toBeCloseTo(nm.nml, 2);
    expect(nm.nml).toBeGreaterThan(0.3);
    expect(nm.gain).toBeGreaterThan(5);
  });
  test('a stronger pMOS raises the switching threshold', () => {
    expect(switchingThreshold({ ...INVERTER, p: scaled(PFET, 6) })).toBeGreaterThan(0.52);
    expect(switchingThreshold({ ...INVERTER, p: scaled(PFET, 1) })).toBeLessThan(0.48);
  });
});

describe('switch networks', () => {
  test('parsing series and parallel', () => {
    expect(netToString(parseNet('A(B+C)'))).toBe('A·(B + C)');
    expect(netToString(parseNet('a & b | c'))).toBe('A·B + C');
    expect(() => parseNet('A+')).toThrow();
    expect(() => parseNet('(A')).toThrow();
  });
  test('a NAND pull-down is two in series; its pull-up is two in parallel', () => {
    const pdn = parseNet('AB');
    expect(gateTable(pdn).map((r) => r.out)).toEqual([1, 1, 1, 0]);
    expect(netToString(dual(pdn))).toBe('A + B');
  });
  test('the pull-up (dual, pMOS) conducts exactly when the pull-down does not', () => {
    const pdn = parseNet('A(B+C)+D');
    for (const r of gateTable(pdn)) expect(conducts(dual(pdn), r.env, true)).toBe(!conducts(pdn, r.env));
  });
  test('counts', () => {
    expect(transistorCount(parseNet('AB+C')) * 2).toBe(6);
    expect(seriesDepth(parseNet('ABC'))).toBe(3);
    expect(seriesDepth(dual(parseNet('ABC')))).toBe(1);
  });
});

describe('delay', () => {
  test('a gate driving more load is slower, roughly in proportion', () => {
    const d1 = inverterDelay(1);
    const d4 = inverterDelay(4);
    const d8 = inverterDelay(8);
    expect(d1).toBeGreaterThan(0);
    expect(d4).toBeGreaterThan(2 * d1);
    expect((d8 - d4) / (d4 - d1)).toBeGreaterThan(1.1);
    expect((d8 - d4) / (d4 - d1)).toBeLessThan(1.6);
  });
  test('lowering the supply slows the gate, steeply near threshold', () => {
    expect(inverterDelay(4, 0.7)).toBeGreaterThan(1.5 * inverterDelay(4, 1.0));
    expect(inverterDelay(4, 0.5)).toBeGreaterThan(2 * inverterDelay(4, 0.7));
  });
  test('the energy drawn is about C V² for a full swing', () => {
    const r = fallingTransient({ ...INVERTER }, 10e-15, 5e-12);
    // The falling edge draws only short-circuit current; it is small next to C V².
    expect(r.energy).toBeLessThan(0.3 * 10e-15);
  });
  test('a chain driving 256 times its input is fastest with four stages', () => {
    expect(bestStages(256)).toBe(4);
    expect(chainDelay(256, 4)).toBe(20);
  });
});

describe('SRAM and latches', () => {
  const ok = { pullDown: 2, pullUp: 1 };
  test('a well-sized cell reads without flipping and pulls one bitline down', () => {
    const r = sram('read', ok, 0);
    expect(r.stored).toBe(0);
    expect(r.bl.at(-1)!).toBeLessThan(0.9);
    expect(r.blb.at(-1)!).toBeGreaterThan(0.99);
  });
  test('with variation, a weak pull-down lets a read flip the cell; a strong one holds', () => {
    expect(sram('read', { pullDown: 0.3, pullUp: 1 }, 0, 0, 1, 0.25).stored).toBe(1);
    expect(sram('read', { pullDown: 2, pullUp: 1 }, 0, 0, 1, 0.25).stored).toBe(0);
    expect(sram('read', { pullDown: 0.3, pullUp: 1 }, 1, 0, 1, 0.25).stored).toBe(0);
  });
  test('writes succeed when the pull-up is weak, and fail when it is too strong', () => {
    expect(sram('write', ok, 1, 0).stored).toBe(0);
    expect(sram('write', ok, 0, 1).stored).toBe(1);
    expect(sram('write', { pullDown: 2, pullUp: 8 }, 1, 0).stored).toBe(1);
  });
  test('two inverters in a loop settle; each factor of ten closer to the middle adds τ ln 10 / (g − 1)', () => {
    const g = 5;
    const a = latchSettle(g, 0.5 + 1e-3, 0.5 - 1e-3);
    const b = latchSettle(g, 0.5 + 1e-5, 0.5 - 1e-5);
    expect(a.path.at(-1)![0]).toBeGreaterThan(0.9);
    expect((b.settle - a.settle) / 2).toBeCloseTo(Math.LN10 / (g - 1), 1);
  });
});
