import { describe, expect, test } from 'vitest';
import { buildCfg } from '../flow/cfg.js';
import { controlDependence } from '../flow/dominators.js';
import { interpret } from '../flow/interpret.js';
import { analyseIfc } from './ifc.js';

const both = (src: string) => [analyseIfc(src, { implicit: false }).output, analyseIfc(src, { implicit: true }).output];

describe('control dependence', () => {
  test('the branches of an if, not what follows', () => {
    const cfg = buildCfg(`function f(a) { let x = 0; if (a) { x = 1; } else { x = 2; } return x; }`);
    const deps = controlDependence(cfg);
    const at = (t: string) => cfg.nodes.find((n) => n.text.startsWith(t))!.id;
    expect([...deps[at('x = 1')]!]).toEqual([at('if (a)')]);
    expect([...deps[at('x = 2')]!]).toEqual([at('if (a)')]);
    expect([...deps[at('return x')]!]).toEqual([]);
  });
  test('a loop body depends on the loop condition', () => {
    const cfg = buildCfg(`function f(n) { let i = 0; while (i < n) { i = i + 1; } return i; }`);
    const deps = controlDependence(cfg);
    const at = (t: string) => cfg.nodes.find((n) => n.text.startsWith(t))!.id;
    expect([...deps[at('i = i + 1')]!]).toEqual([at('while')]);
    expect([...deps[at('while')]!]).toEqual([at('while')]);
  });
});

describe('information flow', () => {
  test('explicit copy: both catch it', () => {
    expect(both(`function leak(secret) { const out = secret; return out; }`)).toEqual(['H', 'H']);
  });
  test('bit by bit: only the implicit mode catches it', () => {
    const src = `function leak(secret) {
  let out = 0;
  let bit = 1;
  while (bit < 256) {
    if ((secret & bit) !== 0) {
      out = out | bit;
    }
    bit = bit * 2;
  }
  return out;
}`;
    expect(both(src)).toEqual(['L', 'H']);
    const cfg = buildCfg(src);
    for (const s of [0, 1, 77, 255]) expect(interpret(cfg, { secret: s }).value).toBe(s);
  });
  test('after the branch, the pc is public again', () => {
    expect(both(`function f(secret) { let x = 0; if (secret > 0) { x = 1; } x = 5; return x; }`)).toEqual(['L', 'L']);
  });
  test('declassification', () => {
    expect(both(`function f(secret) { const big = declassify(secret > 100); let x = 0; if (big) { x = 1; } return x; }`)).toEqual(['L', 'L']);
  });
  test('a return inside a secret branch leaks', () => {
    expect(both(`function f(secret) { if (secret === 42) { return 1; } return 0; }`)).toEqual(['L', 'H']);
  });
});
