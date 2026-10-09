import { describe, expect, test } from 'vitest';
import { buildCfg } from '../flow/cfg.js';
import { solve } from '../flow/dataflow.js';
import { intervals, formatInterval, times, iv, widenInterval, narrowInterval } from './intervals.js';

const at = (cfg: ReturnType<typeof buildCfg>, prefix: string) => cfg.nodes.find((n) => n.text.startsWith(prefix))!.id;

describe('interval arithmetic', () => {
  test('multiplication takes the extreme products', () => {
    expect(formatInterval(times(iv(-2, 3), iv(4, 5)))).toBe('[-10, 15]');
    expect(formatInterval(times(iv(0, Infinity), iv(2, 2)))).toBe('[0, +∞]');
  });
  test('widening and narrowing', () => {
    expect(formatInterval(widenInterval(iv(0, 1), iv(0, 2)))).toBe('[0, +∞]');
    expect(formatInterval(narrowInterval(iv(0, Infinity), iv(0, 10)))).toBe('[0, 10]');
  });
});

describe('interval analysis', () => {
  const src = `function count(n) {
    let i = 0;
    while (i < 10) {
      i = i + 1;
    }
    assert(i <= 10);
    return 100 / i;
  }`;
  const cfg = buildCfg(src);
  test('without widening, the loop does not converge in reasonable time', () => {
    // i grows by one per round: [0,0], [0,1], … The bound 10 makes it converge eventually; here it is slow.
    const r = solve(cfg, intervals, { widening: false });
    expect(r.steps.length).toBeGreaterThan(30);
  });
  test('widening jumps to +∞, the exit condition brings it back', () => {
    const r = solve(cfg, intervals);
    const head = at(cfg, 'while');
    expect(formatInterval(r.output[head]!.i!)).toBe('[0, +∞]');
    const assertNode = at(cfg, 'assert');
    // On the exit edge, i >= 10: [10, +∞]. The assertion may fail: a false alarm.
    expect(formatInterval(r.input[assertNode]!.i!)).toBe('[10, +∞]');
    expect(intervals.alarms!(cfg.nodes[assertNode]!, r.input[assertNode]!, cfg)).toEqual(['assertion may fail']);
  });
  test('narrowing removes the false alarm', () => {
    const r = solve(cfg, intervals, { narrowRounds: 2 });
    const assertNode = at(cfg, 'assert');
    expect(formatInterval(r.input[assertNode]!.i!)).toBe('10');
    expect(intervals.alarms!(cfg.nodes[assertNode]!, r.input[assertNode]!, cfg)).toEqual([]);
    const ret = at(cfg, 'return');
    expect(intervals.alarms!(cfg.nodes[ret]!, r.input[ret]!, cfg)).toEqual([]);
  });
  test('division by an interval containing zero is an alarm', () => {
    const c = buildCfg(`function f(x) { let d = x % 3; return 10 / d; }`);
    const r = solve(c, intervals);
    const ret = at(c, 'return');
    expect(intervals.alarms!(c.nodes[ret]!, r.input[ret]!, c)).toEqual(['possible division by zero: the divisor is in [-2, 2]']);
  });
  test('infeasible branches are unreachable', () => {
    const c = buildCfg(`function f(x) { let y = 5; if (y > 10) { x = 1; } return x; }`);
    const r = solve(c, intervals);
    const inner = at(c, 'x = 1');
    expect(intervals.lattice.format(r.input[inner]!, c)).toBe('⊥ (unreachable)');
  });
});
