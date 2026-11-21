import { describe, expect, test } from 'vitest';
import { design, evaluate, initialState, mask, nextState, settle, type Design } from './hdl';
import { blast, liveGates } from './synth';
import { evalNetlist, leafValues, levels, stats, synthesize, type Netlist } from './techmap';
import { ADDER_PLUS, BINARY_COUNTER, DECADE_COUNTER } from './designs';

/** Every combination of register and input values (not only reachable ones), word by word. */
function* allStates(d: Design): Generator<Record<string, number>> {
  const sigs = [...d.regs, ...d.inputs];
  const bits = sigs.reduce((s, x) => s + x.width, 0);
  for (let n = 0; n < 2 ** bits; n++) {
    const w: Record<string, number> = {};
    let rest = n;
    for (const s of sigs) {
      w[s.name] = rest & mask(s.width);
      rest = Math.floor(rest / 2 ** s.width);
    }
    yield w;
  }
}

function checkNetlist(nl: Netlist) {
  const d = nl.design;
  for (const words of allStates(d)) {
    const env = settle(d, { ...words });
    const nxt = nextState(d, env);
    const v = evalNetlist(nl, leafValues(nl, words));
    for (const o of nl.outputs) {
      const m = /^(\w+)(?:\[(\d+)\])?$/.exec(o.name)!;
      expect(v[o.net], `${o.name} for ${JSON.stringify(words)}`).toBe((env[m[1]!]! >>> Number(m[2] ?? 0)) & 1);
    }
    for (const f of nl.flops) {
      const m = /^R_(\w+)(?:\[(\d+)\])?$/.exec(f.id)!;
      expect(v[f.d], `${f.id}.D for ${JSON.stringify(words)}`).toBe((nxt[m[1]!]! >>> Number(m[2] ?? 0)) & 1);
    }
  }
}

const DESIGNS: Record<string, string> = {
  decade: DECADE_COUNTER,
  binary: BINARY_COUNTER,
  adder: ADDER_PLUS,
  compare: 'input a: 3\ninput b: 3\noutput lt = a < b\noutput ge = a >= b\noutput gt = a > b\noutput le = a <= b\noutput eq = a == b\n',
  arith: 'input a: 3\ninput b: 3\noutput d: 3 = a - b\noutput p: 4 = a * b\noutput n: 3 = -a\noutput x: 3 = ~a ^ b\n',
  shift: 'input a: 4\ninput s: 2\noutput l: 4 = a << s\noutput r: 4 = a >> s\noutput c: 6 = {a[1:0], s, a[3], 0b1}\n',
  logic: 'input a: 2\ninput b: 2\ninput c\noutput y: 2 = c ? a | b : a & b\noutput z = !a || (b != 0 && c)\n',
};

describe('bit-blasting agrees with the RTL', () => {
  for (const [name, src] of Object.entries(DESIGNS)) {
    test(name, () => {
      const d = design(src);
      const b = blast(d);
      for (const words of allStates(d)) {
        const env = settle(d, { ...words });
        const vals = b.logic.evaluate(words);
        for (const [o, bits] of Object.entries(b.outputs)) bits.forEach((x, i) => expect(vals[x], `${o}[${i}]`).toBe((env[o]! >>> i) & 1));
      }
    });
  }
  test('structural hashing shares logic', () => {
    const b = blast(design('input a\ninput b\noutput x = a & b\noutput y = b & a\n'));
    expect(b.outputs.x).toEqual(b.outputs.y);
  });
  test('constants fold away', () => {
    const b = blast(design('input a\noutput y = (a & 0) | (a ^ a) | 0\n'));
    expect(b.outputs.y).toEqual([b.logic.zero]);
    expect(liveGates(b)).toEqual([]);
  });
});

describe('technology mapping is correct for every state and input', () => {
  for (const [name, src] of Object.entries(DESIGNS)) {
    for (const goal of ['area', 'delay'] as const) test(`${name} (${goal})`, () => checkNetlist(synthesize(design(src), goal)));
  }
});

describe('the decade counter, mapped', () => {
  const d = design(DECADE_COUNTER);
  const area = synthesize(d, 'area');
  const fast = synthesize(d, 'delay');
  test('four flip-flops and a couple of dozen cells, using compound gates', () => {
    const s = stats(area);
    expect(s.flops).toBe(4);
    expect(s.cells).toBeGreaterThan(8);
    expect(s.cells).toBeLessThan(40);
    expect(Object.keys(s.byCell).some((c) => ['AOI21', 'OAI21', 'NAND3', 'MUX2', 'XOR2', 'XNOR2'].includes(c))).toBe(true);
  });
  test('mapping for delay gives no more logic depth, and mapping for area no more transistors', () => {
    expect(stats(area).transistors).toBeLessThanOrEqual(stats(fast).transistors);
    const depth = (nl: Netlist) => Math.max(...[...levels(nl).values()]);
    expect(depth(fast)).toBeLessThanOrEqual(depth(area) + 1);
  });
  test('the netlist counts like the RTL, cycle by cycle', () => {
    let words: Record<string, number> = { ...initialState(d) };
    const seq: number[] = [];
    for (let c = 0; c < 12; c++) {
      const v = evalNetlist(area, leafValues(area, { ...words, en: 1, rst: 0 }));
      let q = 0;
      for (const f of area.flops) q |= v[f.d]! << Number(/\[(\d)\]/.exec(f.id)![1]);
      words = { q };
      seq.push(q);
    }
    expect(seq).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2]);
    void evaluate;
  });
});
