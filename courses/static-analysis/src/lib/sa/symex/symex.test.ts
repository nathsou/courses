import { describe, expect, test } from 'vitest';
import { buildCfg } from '../flow/cfg.js';
import { interpret } from '../flow/interpret.js';
import { execute, type PathTree } from './symex.js';

const leaves = (t: PathTree): PathTree[] => (t.kind === 'branch' ? [...leaves(t.then), ...leaves(t.else)] : [t]);

describe('symbolic execution', () => {
  test('correlated branches: no null dereference', () => {
    const r = execute(`function greet(flag) {
  let user = null;
  if (flag > 0) {
    user = { name: 'Ada' };
  }
  if (flag > 0) {
    return user.name;
  }
  return 'anonymous';
}`);
    expect(r.findings).toEqual([]);
    const ls = leaves(r.tree);
    expect(ls.filter((l) => l.kind === 'infeasible').length).toBe(2);
    expect(ls.filter((l) => l.kind === 'return').length).toBe(2);
  });
  test('the bug, with an input that triggers it', () => {
    const r = execute(`function greet(flag) {
  let user = null;
  if (flag > 0) {
    user = { name: 'Ada' };
  }
  if (flag < 10) {
    return user.name;
  }
  return 'anonymous';
}`);
    expect(r.findings.map((f) => [f.kind, f.line])).toEqual([['null', 7]]);
    expect(r.findings[0]!.model.flag).toBeLessThanOrEqual(0);
  });
  test('magic numbers: each path gets a concrete input that follows it', () => {
    const src = `function check(x, y) {
  if (x * 3 + 1 === 4000) {
    if (y === x - 7) {
      assert(false);
    }
    return 1;
  }
  return 0;
}`;
    const r = execute(src);
    expect(r.findings.map((f) => f.kind)).toEqual(['assertion']);
    expect(r.findings[0]!.model).toEqual({ x: 1333, y: 1326 });
    const cfg = buildCfg(src);
    for (const l of leaves(r.tree)) if (l.kind === 'return') expect(String(interpret(cfg, l.model as Record<string, number>).value)).toBe(l.value);
  });
  test('loops are unrolled up to a bound', () => {
    const r = execute(`function count(n) {
  let i = 0;
  while (i < n) {
    i = i + 1;
  }
  return i;
}`, { loopBound: 4 });
    const ls = leaves(r.tree);
    expect(ls.filter((l) => l.kind === 'return').map((l) => (l as { value: string }).value)).toEqual(['4', '3', '2', '1', '0']);
    expect(ls.some((l) => l.kind === 'bound')).toBe(true);
  });
  test('division by zero', () => {
    const r = execute(`function ratio(a, b) {
  if (a > 10) {
    return 100 / (b - a);
  }
  return 0;
}`);
    expect(r.findings.map((f) => [f.kind, f.model.a === f.model.b && (f.model.a as number) > 10])).toEqual([['division', true]]);
  });
});
