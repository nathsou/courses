import { describe, expect, test } from 'vitest';
import { D, NETS, buildGraph, defaultDelays, timing } from './slack';

/** The numbers of Figure 30.5's caption and of the lab that uses it. */
describe('slack and the critical path (Figure 30.5)', () => {
  const d = defaultDelays();

  test('the cells have the iCE40’s delays: a LUT 0.45 ns, clock to output 0.54 ns, set-up 0.47 ns', () => {
    expect([D.lut, D.ffClkToQ, D.ffSetup]).toEqual([0.45, 0.54, 0.47]);
  });

  test('the graph is acyclic, has nine nets, and starts and ends at flip-flops', () => {
    const g = buildGraph();
    expect(g.cyclic).toBe(false);
    expect(NETS).toHaveLength(9);
    expect(g.connections).toHaveLength(9);
  });

  test('with the default delays the critical path is FF2 → L2 → L3 → L4 → FF4 and takes 4.76 ns: 210 MHz', () => {
    const t = timing(d, 5);
    // 0.54 launch + 0.4 (n2) + 0.45 + 1.1 (n4) + 0.45 + 0.5 (n7) + 0.45 + 0.4 (n8) + 0.47 set-up
    expect(t.period).toBeCloseTo(4.76, 9);
    expect(t.critical).toEqual(['n2', 'n4', 'n7', 'n8']);
    expect(Math.round(t.fmax)).toBe(210);
  });

  test('slack is zero along the critical path, positive elsewhere; n1 and n3 have the least, 0.2 ns', () => {
    const t = timing(d, 5);
    expect(t.onCritical.filter(Boolean)).toHaveLength(4);
    NETS.forEach((n, i) => {
      if (!t.critical.includes(n.id)) expect(t.slackWorst[i]!).toBeGreaterThan(0);
      expect(t.slack[i]!).toBeCloseTo(t.slackWorst[i]! + 0.24, 9);
    });
    const positive = t.slackWorst.filter((s) => s > 1e-9);
    expect(Math.min(...positive)).toBeCloseTo(0.2, 9);
    expect(t.slackWorst[1]).toBeCloseTo(0.2, 9);
    expect(t.slackWorst[3]).toBeCloseTo(0.2, 9);
  });

  test('a target of 4.5 ns is not met: the worst slack is −0.26 ns', () => {
    expect(timing(d, 5).met).toBe(true);
    const t = timing(d, 4.5);
    expect(t.met).toBe(false);
    expect(Math.min(...t.slack)).toBeCloseTo(-0.26, 9);
  });

  test('speeding up a net that is not critical does nothing', () => {
    const fast = d.slice();
    fast[5] = 0.1;
    fast[6] = 0.1;
    expect(timing(fast, 5).period).toBeCloseTo(4.76, 9);
  });

  test('speeding up a critical net helps only until another path takes over: n4 from 1.1 to 0.1 gains 0.2 ns, not 1.0', () => {
    const e = d.slice();
    e[4] = 0.1;
    const t = timing(e, 5);
    expect(t.period).toBeCloseTo(4.56, 9);
    expect(t.critical).toEqual(['n1', 'n3', 'n7', 'n8']);
    // Then n1 as well: the critical path moves to the branch from FF1.
    e[1] = 0.1;
    const u = timing(e, 5);
    expect(u.period).toBeCloseTo(4.06, 9);
    expect(u.critical).toEqual(['n0', 'n3', 'n7', 'n8']);
  });

  test('slowing n0 to 2.5 ns makes FF1 → L1 → L3 → L4 → FF4 critical, 6.16 ns', () => {
    const e = d.slice();
    e[0] = 2.5;
    const t = timing(e, 5);
    expect(t.period).toBeCloseTo(6.16, 9);
    expect(t.critical).toEqual(['n0', 'n3', 'n7', 'n8']);
  });

  test('two paths of equal length are both critical', () => {
    const e = d.slice();
    e[4] = 0.9;
    const t = timing(e, 5);
    expect(t.onCritical.filter(Boolean).length).toBeGreaterThanOrEqual(6);
    expect(t.period).toBeCloseTo(4.56, 9);
  });
});
