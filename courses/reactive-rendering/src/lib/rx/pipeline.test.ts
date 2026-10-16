import { describe, expect, test } from 'vitest';
import { simulate, steps } from './pipeline';

const run = (s: Parameters<typeof steps>[0], n = 100, nodes = 2000) => simulate(steps(s, n), { nodes });

describe('the rendering pipeline model', () => {
  test('interleaving reads and writes forces a style and a layout for every item after the first write', () => {
    const r = run('interleaved');
    expect(r.forcedLayouts).toBe(99); // the first read finds nothing pending
    expect(r.forcedStyles).toBe(99);
  });

  test('batching the reads first forces at most one layout', () => {
    const r = run('batched');
    expect(r.forcedLayouts).toBe(0);
    expect(r.stages.filter((s) => s.kind === 'layout')).toHaveLength(1); // once, at the end of the frame
  });

  test('the same work costs far more when interleaved', () => {
    expect(run('interleaved').totalMs).toBeGreaterThan(run('batched').totalMs * 20);
  });

  test('building off the page invalidates nothing until the one attach', () => {
    const r = run('fragment');
    expect(r.forcedLayouts).toBe(0);
    expect(r.stages.filter((s) => s.kind === 'layout')).toHaveLength(1);
  });

  test('transform skips layout entirely', () => {
    const r = run('transform');
    expect(r.stages.map((s) => s.kind)).toEqual(['script', 'paint', 'composite']);
  });

  test('reads with nothing pending are cheap', () => {
    expect(run('reads-only').stages.map((s) => s.kind)).toEqual(['script']);
  });

  test('layout cost grows with the page', () => {
    expect(simulate(steps('interleaved', 20), { nodes: 10000 }).totalMs).toBeGreaterThan(simulate(steps('interleaved', 20), { nodes: 100 }).totalMs * 3);
  });
});
