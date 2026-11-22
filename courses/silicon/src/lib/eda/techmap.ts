/**
 * Logic synthesis, part 2: technology mapping. The logic graph is rewritten as a subject graph of NAND2,
 * inverters, XOR2 and MUX2 nodes, cut into trees at every node with more than one fan-out, and each tree is
 * covered with cells of the library by dynamic programming (Keutzer's tree covering): for every node, the
 * cheapest cell whose pattern matches there, plus the cheapest covers of the nodes beneath the pattern's
 * leaves. "Cheapest" is area (transistors) or arrival time.
 */
import { blast, type Blasted, type LNode } from './synth';
import type { Design } from './hdl';

// ───────────────────────── The cell library ─────────────────────────

type Pat = { v: string } | { op: 'inv' | 'nand' | 'xor' | 'mux'; k: Pat[] };
const v = (name: string): Pat => ({ v: name });
const inv = (a: Pat): Pat => ({ op: 'inv', k: [a] });
const nand = (a: Pat, b: Pat): Pat => ({ op: 'nand', k: [a, b] });

export interface Cell {
  name: string;
  pins: string[];
  /** Transistor count (the course's measure of area). */
  transistors: number;
  /** Width in placement sites. */
  width: number;
  /** Intrinsic delay, ps; each unit of load adds LOAD_DELAY. */
  delay: number;
  /** Input capacitance of each pin, in units of an inverter's input. */
  cin: number;
  fn: (x: number[]) => number;
  pattern?: Pat;
  description: string;
}

export const LOAD_DELAY = 4;

export const LIBRARY: Cell[] = [
  { name: 'INV', pins: ['A'], transistors: 2, width: 1, delay: 10, cin: 1, fn: ([a]) => a! ^ 1, pattern: inv(v('A')), description: 'Y = ¬A' },
  { name: 'NAND2', pins: ['A', 'B'], transistors: 4, width: 2, delay: 14, cin: 1, fn: ([a, b]) => (a! & b!) ^ 1, pattern: nand(v('A'), v('B')), description: 'Y = ¬(A·B)' },
  { name: 'NOR2', pins: ['A', 'B'], transistors: 4, width: 2, delay: 18, cin: 1, fn: ([a, b]) => (a! | b!) ^ 1, pattern: inv(nand(inv(v('A')), inv(v('B')))), description: 'Y = ¬(A + B)' },
  { name: 'AND2', pins: ['A', 'B'], transistors: 6, width: 3, delay: 22, cin: 1, fn: ([a, b]) => a! & b!, pattern: inv(nand(v('A'), v('B'))), description: 'Y = A·B' },
  { name: 'OR2', pins: ['A', 'B'], transistors: 6, width: 3, delay: 26, cin: 1, fn: ([a, b]) => a! | b!, pattern: nand(inv(v('A')), inv(v('B'))), description: 'Y = A + B' },
  { name: 'NAND3', pins: ['A', 'B', 'C'], transistors: 6, width: 3, delay: 18, cin: 1, fn: ([a, b, c]) => (a! & b! & c!) ^ 1, pattern: nand(inv(nand(v('A'), v('B'))), v('C')), description: 'Y = ¬(A·B·C)' },
  { name: 'AOI21', pins: ['A', 'B', 'C'], transistors: 6, width: 3, delay: 20, cin: 1, fn: ([a, b, c]) => ((a! & b!) | c!) ^ 1, pattern: inv(nand(nand(v('A'), v('B')), inv(v('C')))), description: 'Y = ¬(A·B + C)' },
  { name: 'OAI21', pins: ['A', 'B', 'C'], transistors: 6, width: 3, delay: 20, cin: 1, fn: ([a, b, c]) => ((a! | b!) & c!) ^ 1, pattern: nand(nand(inv(v('A')), inv(v('B'))), v('C')), description: 'Y = ¬((A + B)·C)' },
  { name: 'XOR2', pins: ['A', 'B'], transistors: 10, width: 4, delay: 28, cin: 2, fn: ([a, b]) => a! ^ b!, pattern: { op: 'xor', k: [v('A'), v('B')] }, description: 'Y = A ⊕ B' },
  { name: 'XNOR2', pins: ['A', 'B'], transistors: 10, width: 4, delay: 28, cin: 2, fn: ([a, b]) => a! ^ b! ^ 1, pattern: inv({ op: 'xor', k: [v('A'), v('B')] }), description: 'Y = ¬(A ⊕ B)' },
  { name: 'MUX2', pins: ['S', 'A', 'B'], transistors: 12, width: 5, delay: 26, cin: 2, fn: ([s, a, b]) => (s ? a! : b!), pattern: { op: 'mux', k: [v('S'), v('A'), v('B')] }, description: 'Y = S ? A : B' },
];

export const DFF = { name: 'DFF', transistors: 24, width: 8, clkToQ: 40, setup: 25, hold: 5, cin: 1, description: 'Q ← D at each rising clock edge' };

export const cellByName = (name: string): Cell | undefined => LIBRARY.find((c) => c.name === name);

// ───────────────────────── The subject graph ─────────────────────────

type SNode = { op: 'leaf'; net: string } | { op: 'inv'; k: [number] } | { op: 'nand'; k: [number, number] } | { op: 'xor'; k: [number, number] } | { op: 'mux'; k: [number, number, number] };

export const bitNet = (name: string, bit: number, width: number) => (width === 1 ? name : `${name}[${bit}]`);

class Subject {
  nodes: SNode[] = [];
  private hash = new Map<string, number>();
  add(n: SNode): number {
    if (n.op === 'inv') {
      const inner = this.nodes[n.k[0]]!;
      if (inner.op === 'inv') return inner.k[0];
    }
    if (n.op === 'nand' || n.op === 'xor') n = { ...n, k: [Math.min(...n.k), Math.max(...n.k)] as [number, number] };
    const key = JSON.stringify(n);
    const hit = this.hash.get(key);
    if (hit !== undefined) return hit;
    this.nodes.push(n);
    this.hash.set(key, this.nodes.length - 1);
    return this.nodes.length - 1;
  }
}

// ───────────────────────── Netlists ─────────────────────────

export interface Instance {
  id: string;
  cell: string;
  ins: string[];
  out: string;
}

export interface Flop {
  id: string;
  d: string;
  q: string;
}

export interface Netlist {
  design: Design;
  instances: Instance[];
  flops: Flop[];
  /** Primary input nets, one per input bit. */
  inputs: string[];
  /** Output bits and the nets that drive them. */
  outputs: { name: string; net: string }[];
}

export type MapGoal = 'area' | 'delay';

/** Synthesise a design: bit-blast, then map onto the library. */
export function synthesize(d: Design, goal: MapGoal = 'area'): Netlist {
  return mapLogic(blast(d), goal);
}

export function mapLogic(b: Blasted, goal: MapGoal = 'area'): Netlist {
  const L = b.logic;
  const S = new Subject();
  const memo = new Map<number, number>();
  const widthOf = (name: string) => b.design.signals.get(name)!.width;
  const cnst = new Map<number, number>();
  const toSubject = (i: number): number => {
    const hit = memo.get(i);
    if (hit !== undefined) return hit;
    const n: LNode = L.nodes[i]!;
    let r: number;
    switch (n.op) {
      case 'const':
        r = S.add({ op: 'leaf', net: String(n.v) });
        cnst.set(r, n.v);
        break;
      case 'input':
      case 'reg':
        r = S.add({ op: 'leaf', net: bitNet(n.name, n.bit, widthOf(n.name)) });
        break;
      case 'not':
        r = S.add({ op: 'inv', k: [toSubject(n.a)] });
        break;
      case 'and':
        r = S.add({ op: 'inv', k: [S.add({ op: 'nand', k: [toSubject(n.a), toSubject(n.b)] })] });
        break;
      case 'or':
        r = S.add({ op: 'nand', k: [S.add({ op: 'inv', k: [toSubject(n.a)] }), S.add({ op: 'inv', k: [toSubject(n.b)] })] });
        break;
      case 'xor':
        r = S.add({ op: 'xor', k: [toSubject(n.a), toSubject(n.b)] });
        break;
      case 'mux':
        r = S.add({ op: 'mux', k: [toSubject(n.s), toSubject(n.a), toSubject(n.b)] });
        break;
    }
    memo.set(i, r);
    return r;
  };

  const outRoots: { name: string; node: number }[] = [];
  for (const [name, bits] of Object.entries(b.outputs)) bits.forEach((x, i) => outRoots.push({ name: bitNet(name, i, bits.length), node: toSubject(x) }));
  const flopRoots: { reg: string; bit: number; node: number }[] = [];
  for (const [name, bits] of Object.entries(b.next)) bits.forEach((x, i) => flopRoots.push({ reg: name, bit: i, node: toSubject(x) }));

  // Fan-out in the subject graph, counting each root as one use.
  const fanout = new Array<number>(S.nodes.length).fill(0);
  const seen = new Set<number>();
  const visit = (i: number) => {
    if (seen.has(i)) return;
    seen.add(i);
    const n = S.nodes[i]!;
    if (n.op !== 'leaf')
      for (const k of n.k) {
        fanout[k]!++;
        visit(k);
      }
  };
  for (const r of [...outRoots, ...flopRoots]) {
    fanout[r.node]!++;
    visit(r.node);
  }
  const isRoot = new Set([...outRoots, ...flopRoots].map((r) => r.node));
  const boundary = (i: number) => S.nodes[i]!.op === 'leaf' || fanout[i]! > 1 || isRoot.has(i);

  // Tree covering by dynamic programming, in index order (children always precede parents).
  interface Best {
    cell: Cell;
    leaves: number[];
    cost: number;
    arrival: number;
  }
  const best = new Map<number, Best>();
  const costOf = (i: number) => (S.nodes[i]!.op === 'leaf' || boundary(i) ? 0 : best.get(i)!.cost);
  const arrivalOf = (i: number) => (S.nodes[i]!.op === 'leaf' ? 0 : best.get(i)!.arrival);

  function match(p: Pat, i: number, root: boolean, bind: Map<string, number>): boolean {
    if ('v' in p) {
      const prev = bind.get(p.v);
      if (prev !== undefined) return prev === i;
      bind.set(p.v, i);
      return true;
    }
    const n = S.nodes[i]!;
    if (n.op !== p.op) return false;
    if (!root && boundary(i)) return false;
    if (p.op === 'nand' || p.op === 'xor') {
      for (const order of [[0, 1], [1, 0]]) {
        const trial = new Map(bind);
        if (match(p.k[0]!, n.k[order[0]!]!, false, trial) && match(p.k[1]!, n.k[order[1]!]!, false, trial)) {
          for (const [k, x] of trial) bind.set(k, x);
          return true;
        }
      }
      return false;
    }
    return p.k.every((c, j) => match(c, (n as { k: number[] }).k[j]!, false, bind));
  }

  for (const i of [...seen].sort((a, z) => a - z)) {
    if (S.nodes[i]!.op === 'leaf') continue;
    let chosen: Best | undefined;
    for (const cell of LIBRARY) {
      const bind = new Map<string, number>();
      if (!match(cell.pattern!, i, true, bind)) continue;
      const leaves = cell.pins.map((p) => bind.get(p)!);
      const cost = cell.transistors + leaves.reduce((s, l) => s + costOf(l), 0);
      const arrival = cell.delay + Math.max(0, ...leaves.map(arrivalOf));
      const better = !chosen || (goal === 'area' ? cost < chosen.cost || (cost === chosen.cost && arrival < chosen.arrival) : arrival < chosen.arrival || (arrival === chosen.arrival && cost < chosen.cost));
      if (better) chosen = { cell, leaves, cost, arrival };
    }
    best.set(i, chosen!);
  }

  // Emit cells from the roots down.
  const instances: Instance[] = [];
  const netOf = new Map<number, string>();
  let count = 0;
  const emit = (i: number): string => {
    const n = S.nodes[i]!;
    if (n.op === 'leaf') return n.net;
    const hit = netOf.get(i);
    if (hit) return hit;
    const bst = best.get(i)!;
    const ins = bst.leaves.map(emit);
    const id = `U${++count}`;
    const out = `n${count}`;
    instances.push({ id, cell: bst.cell.name, ins, out });
    netOf.set(i, out);
    return out;
  };
  const outputs = outRoots.map((r) => ({ name: r.name, net: emit(r.node) }));
  const flops = flopRoots.map((r) => ({ id: `R_${bitNet(r.reg, r.bit, widthOf(r.reg))}`, d: emit(r.node), q: bitNet(r.reg, r.bit, widthOf(r.reg)) }));
  const inputs = b.design.inputs.flatMap((s) => Array.from({ length: s.width }, (_, i) => bitNet(s.name, i, s.width)));
  void cnst;
  return { design: b.design, instances, flops, inputs, outputs };
}

// ───────────────────────── Using a netlist ─────────────────────────

/** Evaluate every net for given input-net and flop-output values (missing nets read as 0). */
export function evalNetlist(nl: Netlist, values: Record<string, number>, force?: { net: string; value: number }): Record<string, number> {
  const v: Record<string, number> = { '0': 0, '1': 1, ...values };
  if (force) v[force.net] = force.value;
  for (const inst of nl.instances) {
    const cell = cellByName(inst.cell)!;
    v[inst.out] = cell.fn(inst.ins.map((n) => v[n] ?? 0));
    if (force && inst.out === force.net) v[inst.out] = force.value;
  }
  return v;
}

/** Leaf values for a netlist from word-level input and register values. */
export function leafValues(nl: Netlist, words: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of [...nl.design.inputs, ...nl.design.regs]) for (let i = 0; i < s.width; i++) out[bitNet(s.name, i, s.width)] = ((words[s.name] ?? 0) >>> i) & 1;
  return out;
}

export interface NetlistStats {
  cells: number;
  flops: number;
  transistors: number;
  byCell: Record<string, number>;
}

export function stats(nl: Netlist): NetlistStats {
  const byCell: Record<string, number> = {};
  for (const i of nl.instances) byCell[i.cell] = (byCell[i.cell] ?? 0) + 1;
  if (nl.flops.length) byCell.DFF = nl.flops.length;
  const transistors = nl.instances.reduce((s, i) => s + cellByName(i.cell)!.transistors, 0) + nl.flops.length * DFF.transistors;
  return { cells: nl.instances.length, flops: nl.flops.length, transistors, byCell };
}

/** Logic depth (cells on the longest path) to each net. */
export function levels(nl: Netlist): Map<string, number> {
  const lv = new Map<string, number>();
  for (const n of [...nl.inputs, ...nl.flops.map((f) => f.q), '0', '1']) lv.set(n, 0);
  for (const i of nl.instances) lv.set(i.out, 1 + Math.max(0, ...i.ins.map((n) => lv.get(n) ?? 0)));
  return lv;
}
