import { describe, expect, it } from 'vitest';
import { nodeSynth } from '../synth/node';
import { run, type SourceFile } from '../synth/api';
import { layoutNetlist } from '../sim/layout/gates';
import { gatesFromGraph, GatesError } from './gates';
import { createGateSim } from './gatesim';

async function gatesOf(file: SourceFile) {
  const r = await run(nodeSynth(), { files: [file], stop: 'synth', testbench: true } as never);
  if (!r.ok) throw new Error(r.error + JSON.stringify(r.diagnostics));
  const g = r.stages.find((s) => s.id === 'gates_optimised')!.graph!;
  return gatesFromGraph(g);
}

const counter: SourceFile = {
  name: 'c.weft',
  text: `module counter(in clk: clock, in enable: bool, in clear: bool, out count: uint<4>) {
    reg v: uint<4> = 0;
    if clear { v := 0; } else if enable { v := v +% 1; }
    count = v;
}
`,
};

describe('gates from synth', () => {
  it('turns a counter into gates that count', async () => {
    const g = await gatesOf(counter);
    expect(g.stats.flipFlops).toBe(4);
    expect(g.ports.map((p) => [p.name, p.dir, p.width, p.clock])).toEqual([
      ['clk', 'in', 1, true],
      ['enable', 'in', 1, false],
      ['clear', 'in', 1, false],
      ['count', 'out', 4, false],
    ]);
    expect(g.byName.v).toHaveLength(4);
    const sim = createGateSim(g);
    sim.set('enable', 1);
    sim.step(5);
    expect(sim.get('count')).toBe(5n);
    sim.set('clear', 1);
    sim.step();
    expect(sim.get('count')).toBe(0n);
    sim.set('clear', 0);
    sim.step(17);
    expect(sim.get('count')).toBe(1n);
    const layout = layoutNetlist(g.netlist, 'counter');
    expect(layout.circuit.components.length).toBeGreaterThanOrEqual(g.netlist.elements.length);
  });

  it('adds through carry chains as ripple adders', async () => {
    const add: SourceFile = { name: 'a.weft', text: 'module add(in a: uint<6>, in b: uint<6>, out s: uint<7>) {\n    s = a + b;\n}\n' };
    const g = await gatesOf(add);
    const sim = createGateSim(g);
    for (const [a, b] of [[0, 0], [17, 25], [63, 63], [40, 1]] as const) {
      sim.set('a', a);
      sim.set('b', b);
      expect(sim.get('s')).toBe(BigInt(a + b));
    }
  });

  it('refuses designs with instances', async () => {
    const mem: SourceFile = { name: 'm.weft', text: 'module m(in clk: clock, in a: uint<8>, out q: uint<8>) {\n    mem r: [uint<8>; 256];\n    reg o: uint<8> init 0;\n    o := r[a];\n    r[a] := o +% 1;\n    q = o;\n}\n' };
    await expect(gatesOf(mem)).rejects.toThrow(GatesError);
  });
});
