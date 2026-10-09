import { describe, expect, test } from 'vitest';
import { buildCfg, type Cfg } from '../flow/cfg.js';
import { solve } from '../flow/dataflow.js';
import { interpret, type State } from '../flow/interpret.js';
import type { CheckingAnalysis } from './checks.js';
import { intervalsPartitioned, intervalsReducedParity, intervalsTimesParity, parityAnalysis, type Pair, type ParityEnv } from './combine.js';
import { parity } from './domains.js';
import { intervals, type IntervalEnv } from './intervals.js';
import { close, zones, type Zone } from './zones.js';

const verdicts = <T>(src: string, a: CheckingAnalysis<T>) => {
  const cfg = buildCfg(src);
  const r = solve(cfg, a, { narrowRounds: 2 });
  expect(r.truncated).toBe(false);
  return Object.fromEntries(cfg.nodes.flatMap((n) => a.checks(n, r.input[n.id]!, cfg)).map((c) => [c.label, c.proven]));
};

const stepByTwo = `function evens() {
  let i = 0;
  while (i < 10) {
    i = i + 2;
  }
  assert(i === 10);
}`;
const signFlip = `function unit(x) {
  let s;
  if (x >= 0) {
    s = 1;
  } else {
    s = -1;
  }
  return 100 / s;
}`;
const pairs = `function pairs(n) {
  let i = 0;
  let j = 0;
  while (i < n) {
    i = i + 1;
    j = j + 1;
  }
  assert(i === j);
  return 1 / (i - j + 1);
}`;
const oddDivisor = `function halves(k) {
  const d = 2 * k + 1;
  return 10 / d;
}`;

describe('what each combination proves', () => {
  test('a reduced product proves what neither component can', () => {
    expect(verdicts(stepByTwo, intervals)).toEqual({ 'i === 10': false });
    expect(verdicts(stepByTwo, parityAnalysis)).toEqual({ 'i === 10': false });
    expect(verdicts(stepByTwo, intervalsTimesParity)).toEqual({ 'i === 10': false });
    expect(verdicts(stepByTwo, intervalsReducedParity)).toEqual({ 'i === 10': true });
  });
  test('parity proves an odd divisor non-zero', () => {
    expect(verdicts(oddDivisor, intervals)).toEqual({ d: false });
    expect(verdicts(oddDivisor, parityAnalysis)).toEqual({ d: true });
    expect(verdicts(oddDivisor, intervalsTimesParity)).toEqual({ d: true });
  });
  test('partitioning keeps the branches apart', () => {
    expect(verdicts(signFlip, intervals)).toEqual({ s: false });
    expect(verdicts(signFlip, intervalsPartitioned)).toEqual({ s: true });
  });
  test('zones relate variables', () => {
    expect(verdicts(pairs, intervals)).toEqual({ 'i === j': false, 'i - j + 1': false });
    expect(verdicts(pairs, zones)).toEqual({ 'i === j': true, 'i - j + 1': true });
  });
  test('zones keep bounds too', () => {
    const cfg = buildCfg(`function f() { let i = 0; while (i < 10) { i = i + 1; } assert(i === 10); }`);
    const r = solve(cfg, zones, { narrowRounds: 2 });
    const node = cfg.nodes.find((n) => n.text.startsWith('assert'))!;
    expect(zones.lattice.format(r.input[node.id]!, cfg)).toBe('i∈10');
  });
});

// Does a fact admit a concrete state? One function per analysis, for the soundness tests.
const intervalAdmits = (f: IntervalEnv, s: State) =>
  f !== intervals.lattice.bottom && Object.entries(s).every(([v, x]) => typeof x !== 'number' || !(v in f) || (!!f[v] && f[v]!.lo <= x && x <= f[v]!.hi));
const parityAdmits = (f: ParityEnv, s: State) =>
  f !== parityAnalysis.lattice.bottom && Object.entries(s).every(([v, x]) => typeof x !== 'number' || !(v in f) || parity.has(f[v]!, x));
const pairAdmits = (f: Pair<IntervalEnv, ParityEnv>, s: State) => !!f && intervalAdmits(f.a, s) && parityAdmits(f.b, s);
const zoneAdmits = (z: Zone, s: State) => {
  const c = close(z);
  if (!c) return false;
  const val = (i: number) => (i === 0 ? 0 : s[c.vars[i - 1]!]);
  for (let i = 0; i < c.m.length; i++)
    for (let j = 0; j < c.m.length; j++) {
      const a = val(i);
      const b = val(j);
      if (typeof a === 'number' && typeof b === 'number' && a - b > c.m[i]![j]!) return false;
    }
  return true;
};

const programs = [
  stepByTwo, signFlip, pairs, oddDivisor,
  `function mix(a, b) { let s = 0; let k = a; while (k > b) { s = s + k * 2; k = k - 3; } if (s >= 10 && k !== 0) { s = s % 8; } return s - k; }`,
  `function walk(n) { let x = 0; let y = n; while (x < y) { x = x + 1; y = y - 1; } assert(x >= y); return x - y; }`,
  `function par(n) { let t = n * 2; if (t % 2 === 0) { t = t + 1; } else { t = 0; } return 3 / t; }`,
];

function checkSound<T>(a: CheckingAnalysis<T>, admits: (f: T, s: State) => boolean) {
  for (const src of programs) {
    const cfg: Cfg = buildCfg(src);
    const r = solve(cfg, a, { narrowRounds: 2 });
    expect(r.truncated, cfg.name).toBe(false);
    for (let seed = 0; seed < 150; seed++) {
      const args = Object.fromEntries(cfg.params.map((p, i) => [p, ((seed * 7919 + i * 104729) % 41) - 20]));
      for (const { node, state } of interpret(cfg, args).visits) {
        expect(admits(r.input[node]!, state), `${a.name}: ${cfg.name}(${JSON.stringify(args)}) at ${cfg.nodes[node]!.text}: ${JSON.stringify(state)} vs ${a.lattice.format(r.input[node]!, cfg)}`).toBe(true);
      }
    }
  }
}

describe('soundness against the interpreter', () => {
  test('parity', () => checkSound(parityAnalysis, parityAdmits));
  test('product', () => checkSound(intervalsTimesParity, pairAdmits));
  test('reduced product', () => checkSound(intervalsReducedParity, pairAdmits));
  test('partitioned intervals', () => checkSound(intervalsPartitioned, (f, s) => f.some((x) => intervalAdmits(x, s))));
  test('zones', () => checkSound(zones, zoneAdmits));
});
