import { describe, expect, test } from 'vitest';
import { buildCfg, type Cfg, type CfgNode } from '../flow/cfg.js';
import { solve } from '../flow/dataflow.js';
import { interpret } from '../flow/interpret.js';
import { intervals, formatInterval, type IntervalEnv, times, iv, widenInterval, narrowInterval } from './intervals.js';

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
    expect(intervals.alarms!(cfg.nodes[assertNode]!, r.input[assertNode]!, cfg)).toEqual(['assertion may fail (before it, i∈[10, +∞])']);
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

/** The first concrete state outside the analysis's facts, or null if every run stays inside them. */
function findUnsound(cfg: ReturnType<typeof buildCfg>, analysis: typeof intervals, options: object): string | null {
  const r = solve(cfg, analysis, options);
  if (r.truncated) return 'no fixpoint';
  for (let seed = 0; seed < 200; seed++) {
    const args = Object.fromEntries(cfg.params.map((p, i) => [p, ((seed * 7919 + i * 104729) % 41) - 20]));
    for (const { node, state } of interpret(cfg, args).visits) {
      const env = r.input[node]!;
      const where = `at ${cfg.nodes[node]!.text} with ${JSON.stringify(args)}`;
      if (env === analysis.lattice.bottom) return `reached, but the analysis says unreachable, ${where}`;
      for (const [v, value] of Object.entries(state)) {
        if (typeof value !== 'number' || !(v in env)) continue;
        const fact = env[v]!;
        if (!fact || value < fact.lo || value > fact.hi) return `${v} = ${value} ∉ ${formatInterval(fact)} ${where}`;
      }
    }
  }
  return null;
}

describe('soundness against the concrete interpreter', () => {
  const programs = [
    `function scale(x) { let y; if (x > 100) { y = 100; } else if (x < 0) { y = 0; } else { y = x; } return 1000 / (y + 1); }`,
    `function count(n) { let i = 0; while (i < n) { i = i + 1; } return 100 / (i + 1); }`,
    `function pairs(n) { let i = 0; let j = 0; while (i < n) { i = i + 1; j = j + 1; } assert(i === j); }`,
    `function mix(a, b) { let s = 0; let k = a; while (k > b) { s = s + k * 2; k = k - 3; } if (s >= 10 && k !== 0) { s = s % 7; } return s - k; }`,
    `function nested(n) { let t = 0; for (let i = 0; i < n; i++) { for (let j = i; j < 5; j++) { t = t + j; } } return t; }`,
    `function down(x) { let y = x * x; while (y > 3) { y = y - 4; } return y; }`,
  ];
  for (const src of programs) {
    const cfg = buildCfg(src);
    for (const options of [{ widening: true }, { widening: true, narrowRounds: 2 }]) {
      test(`${cfg.name} ${JSON.stringify(options)}`, () => expect(findUnsound(cfg, intervals, options)).toBe(null));
    }
  }
  test('the check catches an unsound refinement', () => {
    const swapped = { ...intervals, edge: (from: CfgNode, to: number, env: IntervalEnv, cfg: Cfg) => intervals.edge!(from, from.succ[0] === to ? from.succ[1]! : from.succ[0]!, env, cfg) };
    expect(findUnsound(buildCfg(programs[0]!), swapped, {})).toMatch(/∉|unreachable/);
  });
  test('the check catches an unsound multiplication', () => {
    const src = `function sq(x) { let y = x * x; return y; }`;
    const cfg = buildCfg(src);
    const wrong = { ...intervals, transfer: (node: CfgNode, env: IntervalEnv, c: Cfg) => (node.kind === 'assign' && node.defs[0] === 'y' && 'x' in env ? { ...env, y: env.x && { lo: env.x.lo * env.x.lo, hi: env.x.hi * env.x.hi } } : intervals.transfer(node, env, c)) };
    expect(findUnsound(cfg, intervals, {})).toBe(null);
    expect(findUnsound(cfg, wrong, {})).toMatch(/∉/);
  });
});
