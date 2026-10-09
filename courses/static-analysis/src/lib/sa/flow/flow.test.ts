import { describe, expect, test } from 'vitest';
import { buildCfg } from './cfg.js';
import { solve } from './dataflow.js';
import { constants, liveness, reachingDefinitions } from './analyses.js';

const lineOf = (cfg: ReturnType<typeof buildCfg>, text: string) => cfg.nodes.find((n) => n.text.startsWith(text))!.id;

describe('cfg', () => {
  test('if, loops, break, continue, return', () => {
    const cfg = buildCfg(`function f(a, xs) {
      let s = 0;
      for (const x of xs) {
        if (x < 0) continue;
        if (x > 9) break;
        s += x;
      }
      while (a) { a--; }
      do { s++; } while (s < 3);
      return s;
    }`);
    expect(cfg.variables).toEqual(['a', 'xs', 's', 'x']);
    const head = lineOf(cfg, 'for (const x of xs)');
    expect(cfg.nodes[lineOf(cfg, 'if (x < 0)')]!.succ).toContain(head);
    expect(cfg.backEdges.length).toBe(4);
    expect(cfg.nodes[lineOf(cfg, 's += x')]!.uses).toEqual(['s', 'x']);
    expect(cfg.nodes[lineOf(cfg, 'return s')]!.succ).toEqual([cfg.exit]);
    const doCond = cfg.nodes.find((n) => n.text === 'while (s < 3)')!;
    expect(doCond.succ).toContain(lineOf(cfg, 's++'));
  });
});

describe('analyses', () => {
  const src = `function f(n) {
    let x = 1;
    let y = 2;
    let z;
    while (n > 0) {
      y = y + 1;
      n = n - 1;
    }
    z = x + 10;
    return z + y;
  }`;
  const cfg = buildCfg(src);
  test('constant propagation reaches a fixpoint with ⊤ for loop-modified variables', () => {
    const r = solve(cfg, constants);
    const ret = lineOf(cfg, 'return');
    expect(r.input[ret]).toMatchObject({ x: '1', y: '⊤', z: '11', n: '⊤' });
    expect(r.truncated).toBe(false);
  });
  test('liveness', () => {
    const r = solve(cfg, liveness);
    // Facts flowing into a node in a backward analysis are live-out; outputs are live-in.
    expect(r.output[lineOf(cfg, 'let x')]).toEqual(['n']);
    expect(r.output[lineOf(cfg, 'let y')]).toEqual(['n', 'x']);
    expect(r.input[lineOf(cfg, 'let z')]).toEqual(['n', 'x', 'y']);
  });
  test('reaching definitions', () => {
    const r = solve(cfg, reachingDefinitions);
    expect(r.input[lineOf(cfg, 'return')]).toEqual(['n@7', 'n@param', 'x@2', 'y@3', 'y@6', 'z@9']);
  });
});
