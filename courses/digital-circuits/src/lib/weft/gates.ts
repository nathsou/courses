/**
 * A Weft design as gates the course can draw and run: synth's gate-level network (the and-inverter graph,
 * flip-flops and carry chains after gate optimisation, synth: crates/synth-playground/src/graph.rs,
 * `aig_graph`) converted to the course's netlist model, so the Schematic renderer draws it
 * (`sim/layout/gates.ts` lays it out) and the digital engine runs it — the same gates, the same bench.
 *
 * - Every AND of the graph is a two-input `and`; an inverted edge is a `not` (one per inverted signal).
 * - A flip-flop is a `dff`, or a `dffe` with an enable; a synchronous reset becomes logic in front of D (and
 *   of the enable), as the reset wins over the enable; an asynchronous reset to 0 is a `dffr`.
 * - A carry chain is a ripple of full adders (XOR, AND and OR gates), as Chapter 14 builds them.
 * - Ports are switches (`toggle`) and LEDs (`indicator`), one per bit, so the netlist runs as it is.
 *
 * Instances (block RAMs, PLLs) have no gate-level drawing: a design with one is refused with a reason.
 */
import { NetlistBuilder } from '../sim/digital/builder';
import type { FlatNetlist } from '../sim/netlist/types';
import type { DesignGraph, GraphNode } from '../synth/api';

export interface GatePort {
  name: string;
  dir: 'in' | 'out';
  width: number;
  clock: boolean;
  /** The net of each bit, least significant first. */
  nets: number[];
  /** The `toggle` (input) or `indicator` (output) of each bit. */
  elements: string[];
}

export interface GateInfo {
  /** What the element implements: `and`, `not`, `ff`, `carry`, `port`, `const`, `reset`. */
  role: string;
  /** The synth name: the register a flip-flop holds (`count`), the port, `and14`. */
  name: string;
  /** The instance path (`uart` for `uart.state`). */
  path: string;
  /** The bit of a register or port. */
  bit?: number;
}

export interface GateStats {
  ands: number;
  nots: number;
  flipFlops: number;
  /** Full adders of the carry chains. */
  adders: number;
  elements: number;
}

export interface GateNetlist {
  netlist: FlatNetlist;
  ports: GatePort[];
  elements: Record<string, GateInfo>;
  /** Register and port names → the ids of their elements. */
  byName: Record<string, string[]>;
  stats: GateStats;
}

export class GatesError extends Error {}

/** Splits `name[3]` into `name` and 3. */
function bitName(label: string): { base: string; bit: number | undefined } {
  const m = /^(.*)\[(\d+)\]$/.exec(label);
  return m ? { base: m[1]!, bit: Number(m[2]) } : { base: label, bit: undefined };
}

export function gatesFromGraph(graph: DesignGraph, opts: { clocks?: string[]; delayNs?: number } = {}): GateNetlist {
  const nb = new NetlistBuilder();
  const elements: Record<string, GateInfo> = {};
  const byName: Record<string, string[]> = {};
  const stats: GateStats = { ands: 0, nots: 0, flipFlops: 0, adders: 0, elements: 0 };
  const gateParams: Record<string, number> = opts.delayNs !== undefined ? { delay: opts.delayNs } : {};
  const inst = graph.nodes.find((n) => n.k === 'inst');
  if (inst) throw new GatesError(`it uses ${inst.t === inst.label ? `a ${inst.t}` : inst.label} (${inst.name}), which has no drawing as gates`);

  const note = (id: string, info: GateInfo) => {
    elements[id] = info;
    if (info.role === 'ff' || info.role === 'port') (byName[info.name] ??= []).push(id);
  };

  // The bit of its register each flip-flop holds (they come in order), and the width of each register.
  const ffBit = new Map<number, number>();
  const regWidth = new Map<string, number>();
  graph.nodes.forEach((n, i) => {
    if (n.k !== 'ff') return;
    const k = regWidth.get(n.name) ?? 0;
    ffBit.set(i, k);
    regWidth.set(n.name, k + 1);
  });
  const ffLabel = (i: number) => {
    const n = graph.nodes[i]!;
    return (regWidth.get(n.name) ?? 1) > 1 ? `${n.name}[${ffBit.get(i)}]` : n.name;
  };
  // The net driven by each output port of each node.
  const nets = graph.nodes.map((n, i) => n.outs.map(() => nb.net(n.k === 'in' ? n.name : n.k === 'ff' ? ffLabel(i) : undefined)));
  const net = (node: number, port: number): number => {
    const x = nets[node]?.[port];
    if (x === undefined) throw new GatesError(`synth's graph has no output ${port} on node ${node}`);
    return x;
  };
  // Inputs: which net feeds input port p of node d, and whether it is inverted.
  const feeds = new Map<string, { net: number; inv: boolean; name?: string }>();
  for (const e of graph.edges) feeds.set(`${e.d}:${e.dp}`, { net: net(e.s, e.sp), inv: !!e.inv, name: e.n });

  let constNet: number | undefined;
  const zero = () => {
    if (constNet === undefined) {
      constNet = nb.net('0');
      nb.add('const', 'const0', { Y: constNet }, { value: 0 });
      note('const0', { role: 'const', name: '0', path: '' });
    }
    return constNet;
  };
  const inverted = new Map<number, number>();
  const not = (net: number, path: string) => {
    let o = inverted.get(net);
    if (o === undefined) {
      o = nb.net();
      const id = `not${inverted.size}`;
      nb.add('not', id, { A: net, Y: o }, gateParams);
      note(id, { role: 'not', name: id, path });
      stats.nots++;
      inverted.set(net, o);
    }
    return o;
  };
  const input = (d: number, p: number, path: string): number => {
    const f = feeds.get(`${d}:${p}`);
    if (!f) return zero();
    return f.inv ? not(f.net, path) : f.net;
  };
  let gateId = 0;
  const gate = (type: 'and' | 'or' | 'xor', a: number, b: number, path: string, role: string): number => {
    const y = nb.net();
    const id = `${type}${gateId++}`;
    nb.add(type, id, { A: a, B: b, Y: y }, { inputs: 2, ...gateParams });
    note(id, { role, name: id, path });
    if (type === 'and') stats.ands++;
    return y;
  };

  const ports = new Map<string, GatePort>();
  const portOf = (n: GraphNode, dir: 'in' | 'out') => {
    const { base, bit } = bitName(n.name);
    let p = ports.get(base);
    if (!p) ports.set(base, (p = { name: base, dir, width: 0, clock: false, nets: [], elements: [] }));
    return { p, bit: bit ?? 0 };
  };

  // Clock inputs are the nets that reach a flip-flop's clock.
  const clockNodes = new Set<number>();
  graph.nodes.forEach((n, i) => {
    if (n.k !== 'ff') return;
    const f = graph.edges.find((e) => e.d === i && e.dp === 1);
    if (f) clockNodes.add(f.s);
  });

  graph.nodes.forEach((n, i) => {
    switch (n.k) {
      case 'in': {
        const { p, bit } = portOf(n, 'in');
        const id = `in/${n.name}`;
        nb.add('toggle', id, { Y: net(i, 0) }, { on: false });
        p.nets[bit] = net(i, 0);
        p.elements[bit] = id;
        p.width = Math.max(p.width, bit + 1);
        p.clock ||= clockNodes.has(i) || (opts.clocks?.includes(p.name) ?? false);
        note(id, { role: 'port', name: p.name, path: '', bit });
        break;
      }
      case 'const':
        nb.add('const', `const/${i}`, { Y: net(i, 0) }, { value: n.label === '1' ? 1 : 0 });
        note(`const/${i}`, { role: 'const', name: n.label, path: '' });
        break;
      default:
        break;
    }
  });

  graph.nodes.forEach((n, i) => {
    if (n.k === 'and') {
      const y = net(i, 0);
      const id = n.name;
      nb.add('and', id, { A: input(i, 0, n.path), B: input(i, 1, n.path), Y: y }, { inputs: 2, ...gateParams });
      note(id, { role: 'and', name: n.name, path: n.path });
      stats.ands++;
    } else if (n.k === 'out') {
      const { p, bit } = portOf(n, 'out');
      const id = `out/${n.name}`;
      const a = input(i, 0, '');
      nb.add('indicator', id, { A: a }, {});
      p.nets[bit] = a;
      p.elements[bit] = id;
      p.width = Math.max(p.width, bit + 1);
      note(id, { role: 'port', name: p.name, path: '', bit });
    } else if (n.k === 'ff') {
      const names = n.ins.map(([pn]) => pn);
      const at = (pn: string) => names.indexOf(pn);
      const info = new Map(n.info ?? []);
      let d = input(i, at('d'), n.path);
      const clk = input(i, at('clk'), n.path);
      let en = at('en') >= 0 ? input(i, at('en'), n.path) : undefined;
      if (at('srst') >= 0) {
        const r = input(i, at('srst'), n.path);
        const to = info.get('sync reset to') === '1';
        // D' = r ? to : D, and the reset loads even when the enable is low.
        d = to ? gate('or', d, r, n.path, 'reset') : gate('and', d, not(r, n.path), n.path, 'reset');
        if (en !== undefined) en = gate('or', en, r, n.path, 'reset');
      }
      const count = ffBit.get(i) ?? 0;
      const id = `ff/${ffLabel(i)}`;
      const init = (info.get('init') ?? '0').toUpperCase() === '1' ? '1' : (info.get('init') ?? '0').toLowerCase() === 'x' ? 'X' : '0';
      const q = net(i, 0);
      const ar = at('arst') >= 0 && info.get('async reset to') !== '1' ? input(i, at('arst'), n.path) : undefined;
      if (en !== undefined) nb.add('dffe', id, { D: d, EN: en, CLK: clk, Q: q }, { init });
      else if (ar !== undefined) nb.add('dffr', id, { D: d, CLK: clk, CLR: ar, Q: q }, { init });
      else nb.add('dff', id, { D: d, CLK: clk, Q: q }, { init });
      note(id, { role: 'ff', name: n.name, path: n.path, bit: count });
      stats.flipFlops++;
    } else if (n.k === 'carry') {
      const w = n.outs.filter(([pn]) => pn.startsWith('s')).length;
      let c = input(i, 2 * w, n.path);
      for (let k = 0; k < w; k++) {
        const a = input(i, k, n.path);
        const b = input(i, w + k, n.path);
        const ab = gate('xor', a, b, n.path, 'carry');
        const s = net(i, k);
        const sid = `carry${i}/s${k}`;
        nb.add('xor', sid, { A: ab, B: c, Y: s }, { inputs: 2, ...gateParams });
        note(sid, { role: 'carry', name: n.name, path: n.path, bit: k });
        const g1 = gate('and', a, b, n.path, 'carry');
        const g2 = gate('and', ab, c, n.path, 'carry');
        c = k === w - 1 && n.outs.length > w ? net(i, w) : nb.net();
        const cid = `carry${i}/c${k + 1}`;
        nb.add('or', cid, { A: g1, B: g2, Y: c }, { inputs: 2, ...gateParams });
        note(cid, { role: 'carry', name: n.name, path: n.path, bit: k });
        stats.adders++;
      }
    }
  });
  const netlist = nb.build();
  stats.elements = netlist.elements.length;
  return { netlist, ports: [...ports.values()], elements, byName, stats };
}
